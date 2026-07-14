import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentReference,
  type Unsubscribe,
} from "firebase/firestore";
import { getSyncFirebaseClient } from "./firebase";

type SpikeRole = "creator" | "joiner";
type SpikeEvent = {
  message: string;
  at: number;
};
type SpikeMetrics = {
  bytesSent: number;
  bytesReceived: number;
  startedAt: number | null;
  finishedAt: number | null;
  selectedCandidatePair: string | null;
  maxBufferedAmount: number;
};

export type SpikeState = {
  role: SpikeRole | null;
  sessionId: string | null;
  status: string;
  events: SpikeEvent[];
  metrics: SpikeMetrics;
};

type Listener = (state: SpikeState) => void;

const chunkSize = 32 * 1024;
const highWaterMark = 4 * 1024 * 1024;

const initialMetrics: SpikeMetrics = {
  bytesSent: 0,
  bytesReceived: 0,
  startedAt: null,
  finishedAt: null,
  selectedCandidatePair: null,
  maxBufferedAmount: 0,
};

function makePeerConnection() {
  return new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    iceTransportPolicy: "all",
  });
}

async function selectedCandidatePair(pc: RTCPeerConnection) {
  const stats = await pc.getStats();
  let selectedPairId: string | undefined;

  stats.forEach((report) => {
    if (report.type === "transport" && typeof report.selectedCandidatePairId === "string") {
      selectedPairId = report.selectedCandidatePairId;
    }
  });

  if (!selectedPairId) return null;

  const pair = stats.get(selectedPairId);
  if (!pair) return null;

  const local = stats.get(pair.localCandidateId);
  const remote = stats.get(pair.remoteCandidateId);
  if (local?.candidateType === "relay" || remote?.candidateType === "relay") {
    throw new Error("Relay candidate selected");
  }

  return `${local?.candidateType ?? "unknown"} -> ${remote?.candidateType ?? "unknown"}`;
}

export class TransportSpikeSession {
  private state: SpikeState = {
    role: null,
    sessionId: null,
    status: "idle",
    events: [],
    metrics: initialMetrics,
  };
  private listeners = new Set<Listener>();
  private pc: RTCPeerConnection | null = null;
  private control: RTCDataChannel | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private sessionRef: DocumentReference | null = null;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async create() {
    const client = await getSyncFirebaseClient();
    this.startPeer("creator");

    const sessionRef = await addDoc(collection(client.db, "syncTransportSpikes"), {
      createdAt: serverTimestamp(),
      expiresAt: Date.now() + 5 * 60 * 1000,
      status: "created",
      creatorUid: client.auth.currentUser?.uid,
    });
    this.sessionRef = sessionRef;
    this.patch({ role: "creator", sessionId: sessionRef.id, status: "waiting" });
    this.log("session created");

    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    await setDoc(sessionRef, { offer: this.pc!.localDescription?.toJSON(), status: "offer" }, { merge: true });

    this.unsubscribers.push(
      onSnapshot(sessionRef, async (snap) => {
        const data = snap.data();
        if (!data?.answer || this.pc?.remoteDescription) return;
        await this.pc!.setRemoteDescription(data.answer);
        this.log("answer received");
      })
    );
  }

  async join(sessionId: string) {
    const client = await getSyncFirebaseClient();
    const sessionRef = doc(client.db, "syncTransportSpikes", sessionId.trim());
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) throw new Error("Session not found");
    const data = snap.data();
    if (!data.offer) throw new Error("Session has no offer");

    this.sessionRef = sessionRef;
    this.startPeer("joiner");
    this.patch({ role: "joiner", sessionId: sessionRef.id, status: "joining" });
    await this.pc!.setRemoteDescription(data.offer);
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    await updateDoc(sessionRef, {
      answer: this.pc!.localDescription?.toJSON(),
      status: "answered",
      joinerUid: client.auth.currentUser?.uid,
    });
    this.log("answer sent");
  }

  async sendSyntheticFile(sizeBytes: number) {
    if (!this.control || this.control.readyState !== "open") {
      throw new Error("Data channel not open");
    }

    const payload = new Uint8Array(chunkSize);
    crypto.getRandomValues(payload);
    const totalChunks = Math.ceil(sizeBytes / chunkSize);
    this.patch({
      status: "transferring",
      metrics: { ...this.state.metrics, startedAt: performance.now(), finishedAt: null },
    });
    this.control.send(JSON.stringify({ type: "file-start", sizeBytes, chunkSize, totalChunks }));

    for (let index = 0; index < totalChunks; index += 1) {
      while (this.control.bufferedAmount > highWaterMark) {
        await new Promise<void>((resolve) => {
          this.control!.bufferedAmountLowThreshold = highWaterMark / 2;
          this.control!.onbufferedamountlow = () => resolve();
        });
      }
      const remaining = sizeBytes - index * chunkSize;
      const slice = payload.slice(0, Math.min(chunkSize, remaining));
      this.control.send(slice);
      this.patch({
        metrics: {
          ...this.state.metrics,
          bytesSent: this.state.metrics.bytesSent + slice.byteLength,
          maxBufferedAmount: Math.max(this.state.metrics.maxBufferedAmount, this.control.bufferedAmount),
        },
      });
    }

    this.control.send(JSON.stringify({ type: "file-end" }));
    this.log("send complete");
  }

  async close() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.control?.close();
    this.pc?.close();
    if (this.sessionRef) {
      await deleteDoc(this.sessionRef).catch(() => undefined);
    }
    this.patch({ status: "closed" });
  }

  private startPeer(role: SpikeRole) {
    this.pc = makePeerConnection();
    this.pc.onicecandidate = async (event) => {
      if (!event.candidate || !this.sessionRef) return;
      await addDoc(collection(this.sessionRef, `${role}Candidates`), event.candidate.toJSON());
    };
    this.pc.onconnectionstatechange = async () => {
      const status = this.pc?.connectionState ?? "unknown";
      this.patch({ status });
      if (status === "connected" && this.pc) {
        const pair = await selectedCandidatePair(this.pc);
        this.patch({ metrics: { ...this.state.metrics, selectedCandidatePair: pair } });
      }
    };
    this.pc.ondatachannel = (event) => this.attachChannel(event.channel);

    if (role === "creator") {
      this.attachChannel(this.pc.createDataChannel("control", { ordered: true }));
    }

    const remoteRole = role === "creator" ? "joiner" : "creator";
    const waitForSession = window.setInterval(() => {
      if (!this.sessionRef) return;
      window.clearInterval(waitForSession);
      this.unsubscribers.push(
        onSnapshot(collection(this.sessionRef, `${remoteRole}Candidates`), (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              this.pc?.addIceCandidate(change.doc.data()).catch((error) => this.log(error.message));
            }
          });
        })
      );
    }, 50);
  }

  private attachChannel(channel: RTCDataChannel) {
    this.control = channel;
    channel.binaryType = "arraybuffer";
    channel.onopen = () => this.log("data channel open");
    channel.onmessage = (event) => {
      if (typeof event.data === "string") {
        const message = JSON.parse(event.data);
        if (message.type === "file-start") {
          this.patch({
            status: "receiving",
            metrics: { ...this.state.metrics, startedAt: performance.now(), bytesReceived: 0 },
          });
        }
        if (message.type === "file-end") {
          this.patch({
            status: "received",
            metrics: { ...this.state.metrics, finishedAt: performance.now() },
          });
          this.log("receive complete");
        }
        return;
      }

      const bytes = event.data instanceof ArrayBuffer ? event.data.byteLength : event.data.size;
      this.patch({ metrics: { ...this.state.metrics, bytesReceived: this.state.metrics.bytesReceived + bytes } });
    };
  }

  private log(message: string) {
    this.patch({ events: [{ message, at: Date.now() }, ...this.state.events].slice(0, 12) });
  }

  private patch(next: Partial<SpikeState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener(this.state));
  }
}

import {
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
import { getOrCreateDevice } from "./storage";

export type PairingRole = "creator" | "joiner";
export type PairingStatus =
  | "idle"
  | "unsupported"
  | "waiting"
  | "joined"
  | "confirming"
  | "connecting"
  | "connected"
  | "closed"
  | "failed";

export type PairingState = {
  role: PairingRole | null;
  status: PairingStatus;
  sessionId: string | null;
  pairingCode: string | null;
  pairingSecret: string | null;
  peerName: string | null;
  localConfirmed: boolean;
  peerConfirmed: boolean;
  controlOpen: boolean;
  binaryOpen: boolean;
  selectedCandidatePair: string | null;
  error: string | null;
};

type SessionDoc = {
  creatorUid?: string;
  joinerUid?: string;
  creatorDeviceId?: string;
  joinerDeviceId?: string;
  creatorName?: string;
  joinerName?: string;
  creatorConfirmed?: boolean;
  joinerConfirmed?: boolean;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  status?: string;
  secret?: string;
  expiresAt?: number;
};

type Listener = (state: PairingState) => void;

const sessionTtlMs = 5 * 60 * 1000;

export function getBrowserPairingSupport() {
  const missing: string[] = [];
  if (!window.isSecureContext) missing.push("HTTPS or localhost");
  if (!("RTCPeerConnection" in window)) missing.push("RTCPeerConnection");
  if (!("RTCDataChannel" in window)) missing.push("RTCDataChannel");
  if (!("indexedDB" in window)) missing.push("IndexedDB");
  if (!crypto.subtle) missing.push("Web Crypto");

  return {
    supported: missing.length === 0,
    missing,
  };
}

function makePeerConnection() {
  return new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    iceTransportPolicy: "all",
  });
}

function randomPairingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function randomSecret() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
  const local = pair && stats.get(pair.localCandidateId);
  const remote = pair && stats.get(pair.remoteCandidateId);
  if (local?.candidateType === "relay" || remote?.candidateType === "relay") {
    throw new Error("Relay candidate selected");
  }

  return `${local?.candidateType ?? "unknown"} -> ${remote?.candidateType ?? "unknown"}`;
}

export class PairingConnection {
  private state: PairingState = {
    role: null,
    status: "idle",
    sessionId: null,
    pairingCode: null,
    pairingSecret: null,
    peerName: null,
    localConfirmed: false,
    peerConfirmed: false,
    controlOpen: false,
    binaryOpen: false,
    selectedCandidatePair: null,
    error: null,
  };
  private listeners = new Set<Listener>();
  private pc: RTCPeerConnection | null = null;
  private control: RTCDataChannel | null = null;
  private binary: RTCDataChannel | null = null;
  private sessionRef: DocumentReference | null = null;
  private codeRef: DocumentReference | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private hasStartedConnection = false;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async create() {
    this.assertSupported();
    const client = await getSyncFirebaseClient();
    const device = await getOrCreateDevice();
    const code = randomPairingCode();
    const secret = randomSecret();
    const sessionRef = doc(collection(client.db, "syncSessions"));
    const codeRef = doc(client.db, "syncPairingCodes", code);
    const expiresAt = Date.now() + sessionTtlMs;

    await setDoc(sessionRef, {
      createdAt: serverTimestamp(),
      expiresAt,
      status: "waiting",
      code,
      secret,
      creatorUid: client.auth.currentUser?.uid,
      creatorDeviceId: device.deviceId,
      creatorName: device.displayName,
      creatorConfirmed: false,
      joinerConfirmed: false,
    });
    await setDoc(codeRef, {
      sessionId: sessionRef.id,
      secret,
      expiresAt,
      creatorUid: client.auth.currentUser?.uid,
    });

    this.sessionRef = sessionRef;
    this.codeRef = codeRef;
    this.patch({
      role: "creator",
      status: "waiting",
      sessionId: sessionRef.id,
      pairingCode: code,
      pairingSecret: secret,
      error: null,
    });
    this.watchSession();
  }

  async join(pairingCode: string, pairingSecret: string) {
    this.assertSupported();
    const client = await getSyncFirebaseClient();
    const device = await getOrCreateDevice();
    const code = pairingCode.trim().toUpperCase();
    const secret = pairingSecret.trim();
    const codeRef = doc(client.db, "syncPairingCodes", code);
    const codeSnap = await getDoc(codeRef);
    if (!codeSnap.exists()) throw new Error("Pairing code not found");
    const codeData = codeSnap.data();
    if (codeData.secret !== secret) throw new Error("Pairing secret mismatch");
    if (typeof codeData.expiresAt === "number" && codeData.expiresAt < Date.now()) {
      throw new Error("Pairing code expired");
    }

    const sessionRef = doc(client.db, "syncSessions", codeData.sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) throw new Error("Session not found");
    const session = sessionSnap.data() as SessionDoc;
    if (session.secret !== secret) throw new Error("Session secret mismatch");

    await updateDoc(sessionRef, {
      status: "joined",
      joinerUid: client.auth.currentUser?.uid,
      joinerDeviceId: device.deviceId,
      joinerName: device.displayName,
      joinerConfirmed: false,
    });

    this.sessionRef = sessionRef;
    this.codeRef = codeRef;
    this.patch({
      role: "joiner",
      status: "joined",
      sessionId: sessionRef.id,
      pairingCode: code,
      pairingSecret: secret,
      peerName: session.creatorName ?? "Peer browser",
      error: null,
    });
    this.watchSession();
  }

  async confirm() {
    if (!this.sessionRef || !this.state.role) throw new Error("No pairing session");
    await updateDoc(this.sessionRef, {
      [`${this.state.role}Confirmed`]: true,
      status: "confirming",
    });
    this.patch({ localConfirmed: true, status: "confirming" });
  }

  async cancel() {
    await this.close("closed");
  }

  private watchSession() {
    if (!this.sessionRef || !this.state.role) return;
    this.unsubscribers.push(
      onSnapshot(this.sessionRef, (snapshot) => {
        const data = snapshot.data() as SessionDoc | undefined;
        if (!data) return;

        const isCreator = this.state.role === "creator";
        const peerName = isCreator ? data.joinerName : data.creatorName;
        const localConfirmed = isCreator ? !!data.creatorConfirmed : !!data.joinerConfirmed;
        const peerConfirmed = isCreator ? !!data.joinerConfirmed : !!data.creatorConfirmed;
        this.patch({
          peerName: peerName ?? this.state.peerName,
          localConfirmed,
          peerConfirmed,
          status: data.status === "joined" && isCreator ? "joined" : this.state.status,
        });

        if (localConfirmed && peerConfirmed && !this.hasStartedConnection) {
          this.hasStartedConnection = true;
          void this.startConnection(data).catch((error) => this.fail(error));
        }

        if (!isCreator && data.offer && !this.pc?.remoteDescription) {
          void this.answerOffer(data.offer).catch((error) => this.fail(error));
        }

        if (isCreator && data.answer && this.pc && !this.pc.remoteDescription) {
          void this.pc.setRemoteDescription(data.answer).catch((error) => this.fail(error));
        }
      })
    );
  }

  private async startConnection(data: SessionDoc) {
    this.patch({ status: "connecting" });
    this.startPeer();
    if (this.state.role === "creator") {
      this.attachChannel(this.pc!.createDataChannel("control", { ordered: true }));
      this.attachChannel(this.pc!.createDataChannel("binary", { ordered: true }));
      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);
      await updateDoc(this.sessionRef!, {
        offer: this.pc!.localDescription?.toJSON(),
        status: "connecting",
      });
    } else if (data.offer) {
      await this.answerOffer(data.offer);
    }
  }

  private async answerOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) {
      this.patch({ status: "connecting" });
      this.startPeer();
    }
    await this.pc!.setRemoteDescription(offer);
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    await updateDoc(this.sessionRef!, {
      answer: this.pc!.localDescription?.toJSON(),
      status: "connecting",
    });
  }

  private startPeer() {
    this.pc = makePeerConnection();
    this.pc.onicecandidate = async (event) => {
      if (!event.candidate || !this.sessionRef || !this.state.role) return;
      if (event.candidate.candidate.includes(" typ relay ")) return;
      await setDoc(
        doc(collection(this.sessionRef, `${this.state.role}Candidates`)),
        event.candidate.toJSON()
      );
    };
    this.pc.onconnectionstatechange = async () => {
      const status = this.pc?.connectionState;
      if (status === "connected" && this.pc) {
        const pair = await selectedCandidatePair(this.pc);
        this.patch({ status: "connected", selectedCandidatePair: pair });
        await deleteDoc(this.codeRef!).catch(() => undefined);
      } else if (status === "failed" || status === "disconnected") {
        this.patch({ status: "failed" });
      }
    };
    this.pc.ondatachannel = (event) => this.attachChannel(event.channel);

    const remoteRole = this.state.role === "creator" ? "joiner" : "creator";
    this.unsubscribers.push(
      onSnapshot(collection(this.sessionRef!, `${remoteRole}Candidates`), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            this.pc?.addIceCandidate(change.doc.data()).catch((error) => this.fail(error));
          }
        });
      })
    );
  }

  private attachChannel(channel: RTCDataChannel) {
    if (channel.label === "control") this.control = channel;
    if (channel.label === "binary") this.binary = channel;
    channel.binaryType = "arraybuffer";
    channel.onopen = () => {
      this.patch({
        controlOpen: this.control?.readyState === "open",
        binaryOpen: this.binary?.readyState === "open",
      });
      if (this.control?.readyState === "open") {
        this.control.send(JSON.stringify({ type: "hello", protocolVersion: 1 }));
      }
    };
    channel.onclose = () => {
      this.patch({
        controlOpen: this.control?.readyState === "open",
        binaryOpen: this.binary?.readyState === "open",
      });
    };
  }

  private async close(status: PairingStatus) {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.control?.close();
    this.binary?.close();
    this.pc?.close();
    if (this.codeRef) await deleteDoc(this.codeRef).catch(() => undefined);
    if (this.sessionRef) await deleteDoc(this.sessionRef).catch(() => undefined);
    this.patch({ status });
  }

  private assertSupported() {
    const support = getBrowserPairingSupport();
    if (!support.supported) {
      this.patch({ status: "unsupported", error: `Missing ${support.missing.join(", ")}` });
      throw new Error(`Missing ${support.missing.join(", ")}`);
    }
  }

  private fail(error: unknown) {
    this.patch({
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private patch(next: Partial<PairingState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener(this.state));
  }
}

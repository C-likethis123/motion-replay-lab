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
import { SYNC_PROTOCOL_VERSION, type SyncControlMessage } from "./types";

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
  connectionAttempt?: string;
  reconnectRequestedAt?: number;
  status?: string;
  secret?: string;
  expiresAt?: number;
};

type Listener = (state: PairingState) => void;
type ControlListener = (message: SyncControlMessage) => void;
type BinaryListener = (data: ArrayBuffer) => void;

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
  private controlListeners = new Set<ControlListener>();
  private binaryListeners = new Set<BinaryListener>();
  private deviceId: string | null = null;
  private deviceName: string | null = null;
  private pc: RTCPeerConnection | null = null;
  private control: RTCDataChannel | null = null;
  private binary: RTCDataChannel | null = null;
  private sessionRef: DocumentReference | null = null;
  private codeRef: DocumentReference | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private peerUnsubscribers: Unsubscribe[] = [];
  private hasStartedConnection = false;
  private hasAnsweredOffer = false;
  private connectionAttempt: string | null = null;
  private lastReconnectRequest: number | null = null;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  onControlMessage(listener: ControlListener) {
    this.controlListeners.add(listener);
    return () => {
      this.controlListeners.delete(listener);
    };
  }

  sendControl(message: SyncControlMessage) {
    if (this.control?.readyState !== "open") throw new Error("Control channel is not open");
    this.control.send(JSON.stringify(message));
  }

  onBinaryMessage(listener: BinaryListener) {
    this.binaryListeners.add(listener);
    return () => {
      this.binaryListeners.delete(listener);
    };
  }

  sendBinary(data: ArrayBuffer) {
    if (this.binary?.readyState !== "open") throw new Error("Binary channel is not open");
    this.binary.send(data);
  }

  get binaryBufferedAmount() {
    return this.binary?.bufferedAmount ?? 0;
  }

  waitForBinaryDrain(maxBufferedAmount: number) {
    if (!this.binary || this.binary.bufferedAmount <= maxBufferedAmount) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.binary!.bufferedAmountLowThreshold = maxBufferedAmount;
      this.binary!.onbufferedamountlow = () => resolve();
    });
  }

  async create() {
    this.assertSupported();
    const client = await getSyncFirebaseClient();
    const device = await getOrCreateDevice();
    this.deviceId = device.deviceId;
    this.deviceName = device.displayName;
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
      creatorConfirmed: true,
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
      localConfirmed: true,
      error: null,
    });
    this.watchSession();
  }

  async join(pairingCode: string, pairingSecret: string) {
    this.assertSupported();
    const client = await getSyncFirebaseClient();
    const device = await getOrCreateDevice();
    this.deviceId = device.deviceId;
    this.deviceName = device.displayName;
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
      joinerConfirmed: true,
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
      localConfirmed: true,
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

  async reconnect() {
    if (!this.sessionRef || !this.state.role) throw new Error("No pairing session");
    if (this.state.role === "creator") {
      const snapshot = await getDoc(this.sessionRef);
      if (!snapshot.exists()) throw new Error("Pairing session expired");
      await this.beginReconnect(snapshot.data() as SessionDoc);
      return;
    }
    this.resetPeer();
    this.patch({ status: "connecting", controlOpen: false, binaryOpen: false });
    await updateDoc(this.sessionRef, { reconnectRequestedAt: Date.now() });
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

        if (isCreator && data.reconnectRequestedAt && data.reconnectRequestedAt !== this.lastReconnectRequest) {
          this.lastReconnectRequest = data.reconnectRequestedAt;
          void this.beginReconnect(data).catch((error) => this.fail(error));
          return;
        }

        if (
          data.connectionAttempt
          && data.connectionAttempt !== this.connectionAttempt
          && localConfirmed
          && peerConfirmed
        ) {
          this.connectionAttempt = data.connectionAttempt;
          this.resetPeer();
          this.hasAnsweredOffer = false;
          this.hasStartedConnection = true;
          void this.startConnection(data, data.connectionAttempt).catch((error) => this.fail(error));
          return;
        }

        if (localConfirmed && peerConfirmed && !this.hasStartedConnection) {
          this.hasStartedConnection = true;
          void this.startConnection(data).catch((error) => this.fail(error));
        }

        if (!isCreator && data.offer && !this.hasAnsweredOffer) {
          void this.answerOffer(data.offer).catch((error) => this.fail(error));
        }

        if (
          isCreator &&
          data.answer &&
          this.pc &&
          !this.pc.remoteDescription &&
          this.pc.signalingState === "have-local-offer"
        ) {
          void this.pc.setRemoteDescription(data.answer).catch((error) => this.fail(error));
        }
      })
    );
  }

  private async startConnection(data: SessionDoc, requestedAttempt?: string) {
    this.patch({ status: "connecting" });
    if (this.state.role === "creator") {
      const connectionAttempt = requestedAttempt ?? randomSecret();
      this.connectionAttempt = connectionAttempt;
      await updateDoc(this.sessionRef!, { connectionAttempt, offer: null, answer: null, status: "connecting" });
      this.startPeer(connectionAttempt);
      this.attachChannel(this.pc!.createDataChannel("control", { ordered: true }));
      this.attachChannel(this.pc!.createDataChannel("binary", { ordered: true }));
      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);
      await updateDoc(this.sessionRef!, {
        offer: this.pc!.localDescription?.toJSON(),
        status: "connecting",
      });
    } else {
      this.connectionAttempt = requestedAttempt ?? data.connectionAttempt ?? "initial";
      this.startPeer(this.connectionAttempt);
    }
    if (this.state.role === "joiner" && data.offer) {
      await this.answerOffer(data.offer);
    }
  }

  private async answerOffer(offer: RTCSessionDescriptionInit) {
    if (this.hasAnsweredOffer) return;
    this.hasAnsweredOffer = true;
    if (!this.pc) {
      this.patch({ status: "connecting" });
      this.startPeer(this.connectionAttempt ?? "initial");
    }
    if (this.pc!.signalingState !== "stable") return;
    await this.pc!.setRemoteDescription(offer);
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    await updateDoc(this.sessionRef!, {
      answer: this.pc!.localDescription?.toJSON(),
      status: "connecting",
    });
  }

  private startPeer(connectionAttempt: string) {
    this.pc = makePeerConnection();
    this.pc.onicecandidate = async (event) => {
      if (!event.candidate || !this.sessionRef || !this.state.role) return;
      if (event.candidate.candidate.includes(" typ relay ")) return;
      await setDoc(
        doc(collection(this.sessionRef, `${this.state.role}Candidates_${connectionAttempt}`)),
        event.candidate.toJSON()
      );
    };
    this.pc.onconnectionstatechange = async () => {
      const status = this.pc?.connectionState;
      if (status === "connected" && this.pc) {
        const pair = await selectedCandidatePair(this.pc);
        this.patch({ status: "connected", selectedCandidatePair: pair, error: null });
      } else if (status === "failed" || status === "disconnected") {
        this.patch({ status: "failed" });
      }
    };
    this.pc.ondatachannel = (event) => this.attachChannel(event.channel);

    const remoteRole = this.state.role === "creator" ? "joiner" : "creator";
    this.peerUnsubscribers.push(
      onSnapshot(collection(this.sessionRef!, `${remoteRole}Candidates_${connectionAttempt}`), (snapshot) => {
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
        this.sendControl({
          type: "hello",
          protocolVersion: SYNC_PROTOCOL_VERSION,
          deviceId: this.deviceId ?? "unknown",
          deviceName: this.deviceName ?? "Browser",
          capabilities: { manifests: true, metadata: true, binary: true },
        });
      }
    };
    channel.onmessage = (event) => this.handleControlMessage(channel, event);
    if (channel.label === "binary") {
      channel.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) this.binaryListeners.forEach((listener) => listener(event.data));
      };
    }
    channel.onclose = () => {
      this.patch({
        controlOpen: this.control?.readyState === "open",
        binaryOpen: this.binary?.readyState === "open",
      });
    };
  }

  private handleControlMessage(channel: RTCDataChannel, event: MessageEvent) {
    if (channel.label !== "control" || typeof event.data !== "string") return;
    try {
      const message = JSON.parse(event.data) as SyncControlMessage;
      if (message.protocolVersion !== SYNC_PROTOCOL_VERSION) {
        throw new Error("Sync protocol version mismatch");
      }
      this.controlListeners.forEach((listener) => listener(message));
    } catch (error) {
      this.fail(error);
    }
  }

  private async close(status: PairingStatus) {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.resetPeer();
    if (this.codeRef) await deleteDoc(this.codeRef).catch(() => undefined);
    if (this.sessionRef) await deleteDoc(this.sessionRef).catch(() => undefined);
    this.patch({ status });
  }

  private async beginReconnect(data: SessionDoc) {
    this.resetPeer();
    this.hasStartedConnection = false;
    this.hasAnsweredOffer = false;
    this.connectionAttempt = randomSecret();
    await this.startConnection(data, this.connectionAttempt);
  }

  private resetPeer() {
    this.peerUnsubscribers.forEach((unsubscribe) => unsubscribe());
    this.peerUnsubscribers = [];
    this.control?.close();
    this.binary?.close();
    this.pc?.close();
    this.control = null;
    this.binary = null;
    this.pc = null;
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

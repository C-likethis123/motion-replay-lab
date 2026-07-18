import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { toDataURL } from "qrcode";
import { Camera, Check, Link2, Plus, X } from "lucide-react";
import {
  getBrowserPairingSupport,
  PairingConnection,
  type PairingState,
} from "../lib/sync/pairing";
import "./Sync.css";

const initialState: PairingState = {
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

function pairingFromValue(value: string) {
  try {
    const url = new URL(value);
    return {
      code: url.searchParams.get("syncCode") ?? "",
      secret: url.searchParams.get("syncSecret") ?? "",
    };
  } catch {
    const [code, secret] = value.split(":");
    return { code: code ?? "", secret: secret ?? "" };
  }
}

function isIpadLike() {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes("ipad") || (platform === "macintel" && navigator.maxTouchPoints > 1);
}

function getPairingDeviceMode() {
  if (isIpadLike()) return "create";
  if (window.matchMedia("(max-width: 767px)").matches && navigator.maxTouchPoints > 0) return "join";
  return "create";
}

function usePairingDeviceMode() {
  const [mode, setMode] = useState<"create" | "join">(() => getPairingDeviceMode());

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const updateMode = () => setMode(getPairingDeviceMode());
    query.addEventListener("change", updateMode);
    return () => query.removeEventListener("change", updateMode);
  }, []);

  return mode;
}

function PairingQr({ code, secret }: { code: string; secret: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.hash = "#/sync";
    url.searchParams.set("syncCode", code);
    url.searchParams.set("syncSecret", secret);
    toDataURL(url.toString(), { margin: 1, width: 220 }).then(setQrDataUrl);
  }, [code, secret]);

  return (
    <div className="sync-qr-wrap">
      {qrDataUrl && <img src={qrDataUrl} alt="Sync pairing QR code" className="sync-qr" />}
      <code className="sync-code">{code}</code>
    </div>
  );
}

function QrScanner({ onScan, onError }: { onScan: (value: string) => void; onError: (message: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const canUseCamera = !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!isScanning) return;

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const scan = () => {
          if (stopped) return;
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d");
          if (canvas && context && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const qr = jsQR(imageData.data, imageData.width, imageData.height);
            if (qr?.data) {
              onScan(qr.data);
              setIsScanning(false);
              return;
            }
          }
          frame = window.requestAnimationFrame(scan);
        };

        scan();
      } catch (caught) {
        onError(caught instanceof Error ? caught.message : String(caught));
        setIsScanning(false);
      }
    }

    void start();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [isScanning, onError, onScan]);

  return (
    <div className="sync-scanner">
      <button
        className="btn"
        onClick={() => {
          if (!canUseCamera) {
            onError("Camera unavailable. Enter pairing code instead.");
            return;
          }
          setIsScanning((current) => !current);
        }}
      >
        <Camera size={18} />
        <span>{isScanning ? "Stop Scan" : "Scan QR"}</span>
      </button>
      {isScanning && <video ref={videoRef} className="sync-video" muted playsInline />}
      <canvas ref={canvasRef} hidden />
    </div>
  );
}

export default function Sync() {
  const connection = useRef(new PairingConnection());
  const autoJoinAttempted = useRef(false);
  const [state, setState] = useState<PairingState>(initialState);
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get("syncCode") ?? "");
  const [secret, setSecret] = useState(() => new URLSearchParams(window.location.search).get("syncSecret") ?? "");
  const [error, setError] = useState<string | null>(null);
  const support = useMemo(() => getBrowserPairingSupport(), []);
  const pairingMode = usePairingDeviceMode();

  useEffect(() => {
    const unsubscribe = connection.current.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (autoJoinAttempted.current || !code || !secret) return;
    autoJoinAttempted.current = true;
    void run(() => connection.current.join(code, secret));
  }, [code, secret]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  const handleQrScan = useCallback((value: string) => {
    const pairing = pairingFromValue(value);
    setCode(pairing.code);
    setSecret(pairing.secret);
    void run(() => connection.current.join(pairing.code, pairing.secret));
  }, []);

  return (
    <div className="sync-page">
      <div className="sync-header">
        <div>
          <p className="sync-kicker">Phase 2</p>
          <h1>Local Sync Pairing</h1>
        </div>
        <span className="sync-status">{state.status}</span>
      </div>

      {!support.supported && (
        <section className="sync-panel">
          <h2>Unsupported</h2>
          <p className="sync-error">Missing {support.missing.join(", ")}</p>
        </section>
      )}

      <div className="sync-grid">
        {pairingMode === "create" && (
          <section className="sync-panel">
            <h2>Create QR</h2>
            <button className="btn btn-primary" disabled={!support.supported} onClick={() => run(() => connection.current.create())}>
              <Plus size={18} />
              <span>Create Session</span>
            </button>
            {state.pairingCode && state.pairingSecret && (
              <PairingQr code={state.pairingCode} secret={state.pairingSecret} />
            )}
          </section>
        )}

        {pairingMode === "join" && (
          <section className="sync-panel">
            <h2>Join Session</h2>
            <div className="sync-actions">
              <QrScanner onScan={handleQrScan} onError={setError} />
            </div>
            <input className="sync-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Pairing code" />
            <input className="sync-input" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="Pairing secret" />
            <button className="btn btn-primary" disabled={!support.supported || !code || !secret} onClick={() => run(() => connection.current.join(code, secret))}>
              <Link2 size={18} />
              <span>Join Session</span>
            </button>
          </section>
        )}

      </div>

      {state.role && (
        <section className="sync-panel">
          <h2>Confirm Peer</h2>
          <div className="sync-metrics">
            <span>Peer: {state.peerName ?? "-"}</span>
            <span>You: {state.localConfirmed ? "confirmed" : "waiting"}</span>
            <span>Peer: {state.peerConfirmed ? "confirmed" : "waiting"}</span>
            <span>Control: {state.controlOpen ? "open" : "closed"}</span>
            <span>Binary: {state.binaryOpen ? "open" : "closed"}</span>
            <span>ICE: {state.selectedCandidatePair ?? "-"}</span>
          </div>
          <div className="sync-actions">
            <button className="btn btn-primary" disabled={!state.peerName || state.localConfirmed} onClick={() => run(() => connection.current.confirm())}>
              <Check size={18} />
              <span>Confirm</span>
            </button>
            <button className="btn btn-danger" onClick={() => run(() => connection.current.cancel())}>
              <X size={18} />
              <span>Cancel</span>
            </button>
          </div>
        </section>
        )}

      {(error || state.error) && <p className="sync-error">{error || state.error}</p>}
    </div>
  );
}

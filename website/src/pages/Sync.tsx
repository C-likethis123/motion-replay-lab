import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { toDataURL } from "qrcode";
import { Camera, Plus, RefreshCw, X } from "lucide-react";
import {
  getBrowserPairingSupport,
  PairingConnection,
  type PairingState,
} from "../lib/sync/pairing";
import { compareSyncManifests, createSyncManifest } from "../lib/sync/manifest";
import { SyncTransferEngine } from "../lib/sync/transfer";
import type { SyncComparisonItem, SyncManifestEntry, SyncTransferProgress } from "../lib/sync/types";
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
  const autoManifestAttempted = useRef(false);
  const autoSyncKey = useRef<string | null>(null);
  const manifestSent = useRef(false);
  const transferEngine = useRef<SyncTransferEngine | null>(null);
  const [state, setState] = useState<PairingState>(initialState);
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get("syncCode") ?? "");
  const [secret, setSecret] = useState(() => new URLSearchParams(window.location.search).get("syncSecret") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [localManifest, setLocalManifest] = useState<SyncManifestEntry[] | null>(null);
  const [remoteManifest, setRemoteManifest] = useState<SyncManifestEntry[] | null>(null);
  const [progress, setProgress] = useState<SyncTransferProgress[]>([]);
  const support = useMemo(() => getBrowserPairingSupport(), []);
  const pairingMode = usePairingDeviceMode();

  useEffect(() => {
    const unsubscribe = connection.current.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  const sendManifest = useCallback(async () => {
    const manifest = await createSyncManifest();
    setLocalManifest(manifest);
    connection.current.sendControl({
      type: "manifest",
      protocolVersion: 1,
      entries: manifest,
    });
    manifestSent.current = true;
  }, []);

  useEffect(() => {
    return connection.current.onControlMessage((message) => {
      if (message.type !== "manifest") return;
      setRemoteManifest(message.entries);
      if (!manifestSent.current) {
        void sendManifest().catch((caught) => {
          setError(caught instanceof Error ? caught.message : String(caught));
        });
      }
    });
  }, [sendManifest]);

  useEffect(() => {
    const engine = new SyncTransferEngine(connection.current, {
      onProgress: setProgress,
      onComplete: () => {
        manifestSent.current = false;
        setLocalManifest(null);
        setRemoteManifest(null);
      },
      onError: (message) => setError(message),
    });
    transferEngine.current = engine;
    return () => {
      engine.close();
      transferEngine.current = null;
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

  const comparison = useMemo<SyncComparisonItem[]>(() => {
    if (!localManifest || !remoteManifest) return [];
    return compareSyncManifests(localManifest, remoteManifest);
  }, [localManifest, remoteManifest]);
  const otherDeviceConnected = state.status === "connected";

  const requestChanges = useCallback(() => {
    const ids = comparison.filter((item) => item.direction === "pull").map((item) => item.id);
    if (ids.length === 0) return;
    setError(null);
    transferEngine.current?.requestVideos(ids);
  }, [comparison]);

  const resolveConflict = useCallback((videoId: string, keepThisDevice: boolean) => {
    setError(null);
    const action = keepThisDevice
      ? transferEngine.current?.sendVideos([videoId])
      : Promise.resolve(transferEngine.current?.requestVideos([videoId]));
    void action?.catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, []);

  useEffect(() => {
    if (!state.controlOpen || autoManifestAttempted.current) return;
    autoManifestAttempted.current = true;
    void sendManifest().catch((caught) => {
      setError(caught instanceof Error ? caught.message : String(caught));
    });
  }, [sendManifest, state.controlOpen]);

  useEffect(() => {
    const ids = comparison.filter((item) => item.direction === "pull").map((item) => item.id);
    if (ids.length === 0) return;
    const syncKey = ids.sort().join(":");
    if (autoSyncKey.current === syncKey) return;
    autoSyncKey.current = syncKey;
    requestChanges();
  }, [comparison, requestChanges]);

  return (
    <div className="sync-page">
      <div className="sync-header">
        <div>
          <h1>Local Library Sync</h1>
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
          <section className="sync-panel sync-pairing-panel">
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
          <section className="sync-panel sync-pairing-panel">
            <h2>Join Session</h2>
            <div className="sync-actions">
              <QrScanner onScan={handleQrScan} onError={setError} />
            </div>
          </section>
        )}

      </div>

      {state.role && (
        <section className="sync-panel">
          <h2>Connection</h2>
          <p className={`sync-connection-status ${otherDeviceConnected ? "is-connected" : ""}`}>
            {otherDeviceConnected ? "Other device connected" : "Other device not connected"}
          </p>
          <div className="sync-actions">
            <button className="btn" disabled={otherDeviceConnected} onClick={() => run(() => connection.current.reconnect())}>
              <RefreshCw size={18} />
              <span>Reconnect</span>
            </button>
            <button className="btn btn-danger" onClick={() => run(() => connection.current.cancel())}>
              <X size={18} />
              <span>Cancel</span>
            </button>
          </div>
        </section>
        )}

      {state.controlOpen && (
        <section className="sync-panel">
          <div className="sync-section-heading">
            <div>
              <h2>Library Sync</h2>
              <p>{localManifest && remoteManifest ? "Libraries compared." : "Checking peer library."}</p>
            </div>
          </div>

          {localManifest && !remoteManifest && <p>Waiting for peer library.</p>}
          {comparison.length > 0 && (
            <div className="sync-comparison-list">
              {comparison.map((item) => (
                <div key={item.id} className="sync-comparison-item">
                  <div className="sync-comparison-main">
                    <span>{item.title}</span>
                    <span className={`sync-comparison-kind sync-comparison-${item.kind}`}>{item.kind}</span>
                    {item.kind === "conflict" ? (
                      <div className="sync-conflict-actions">
                        <button className="btn" onClick={() => resolveConflict(item.id, true)}>Keep This Device</button>
                        <button className="btn" onClick={() => resolveConflict(item.id, false)}>Use Other Device</button>
                      </div>
                    ) : <span>{item.direction}</span>}
                  </div>
                  {progress.filter((transfer) => transfer.videoId === item.id).map((transfer) => (
                    <div key={`${transfer.direction}-${transfer.kind}`} className="sync-row-progress">
                      <span>{transfer.direction} {transfer.kind}</span>
                      <progress value={transfer.completedBytes} max={transfer.totalBytes} />
                      <span>{Math.round((transfer.completedBytes / transfer.totalBytes) * 100)}%</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {localManifest && remoteManifest && comparison.length === 0 && <p>Both libraries are empty.</p>}
        </section>
      )}

      {(error || state.error) && <p className="sync-error">{error || state.error}</p>}
    </div>
  );
}

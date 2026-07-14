import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { toDataURL } from "qrcode";
import { Camera, Play, Plus, X } from "lucide-react";
import { TransportSpikeSession, type SpikeState } from "../lib/sync/transportSpike";
import "./SyncSpike.css";

const sizes = [
  { label: "10 MB", value: 10 * 1024 * 1024 },
  { label: "250 MB", value: 250 * 1024 * 1024 },
  { label: "1 GB", value: 1024 * 1024 * 1024 },
];

const initialState: SpikeState = {
  role: null,
  sessionId: null,
  status: "idle",
  events: [],
  metrics: {
    bytesSent: 0,
    bytesReceived: 0,
    startedAt: null,
    finishedAt: null,
    selectedCandidatePair: null,
    maxBufferedAmount: 0,
  },
};

const cameraUnavailableMessage =
  "Camera unavailable. Use localhost, HTTPS, or a Tailscale Serve HTTPS hostname, then allow camera access.";

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function sessionFromQrValue(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("syncSession") ?? value;
  } catch {
    return value;
  }
}

function PairingQr({ sessionId }: { sessionId: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("syncSession", sessionId);
    toDataURL(url.toString(), { margin: 1, width: 220 }).then(setQrDataUrl);
  }, [sessionId]);

  if (!qrDataUrl) return null;

  return (
    <div className="sync-qr-wrap">
      <img src={qrDataUrl} alt="Sync pairing QR code" className="sync-qr" />
      <code className="sync-code">{sessionId}</code>
    </div>
  );
}

function QrScanner({ onScan, onError }: { onScan: (value: string) => void; onError: (message: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const canUseCamera =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  useEffect(() => {
    if (!isScanning) return;

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;

    async function start() {
      try {
        if (!canUseCamera) {
          throw new Error(cameraUnavailableMessage);
        }

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
              onScan(sessionFromQrValue(qr.data));
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

    start();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [canUseCamera, isScanning, onError, onScan]);

  return (
    <div className="sync-scanner">
      <button
        className="btn"
        onClick={() => {
          if (!canUseCamera) {
            onError(cameraUnavailableMessage);
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

export default function SyncSpike() {
  const session = useRef(new TransportSpikeSession());
  const [state, setState] = useState<SpikeState>(initialState);
  const [selectedSize, setSelectedSize] = useState(sizes[0].value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = session.current.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  const elapsed = useMemo(() => {
    const { startedAt, finishedAt } = state.metrics;
    if (!startedAt || !finishedAt) return null;
    return Math.max(0, (finishedAt - startedAt) / 1000);
  }, [state.metrics]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  const handleQrScan = useCallback((value: string) => {
    void run(() => session.current.join(value));
  }, []);

  return (
    <div className="sync-spike">
      <div className="sync-spike-header">
        <div>
          <p className="sync-kicker">Phase 0</p>
          <h1>Transport Spike</h1>
        </div>
        <span className="sync-status">{state.status}</span>
      </div>

      <div className="sync-grid">
        <section className="sync-panel">
          <h2>Pair</h2>
          <div className="sync-actions">
            <button className="btn btn-primary" onClick={() => run(() => session.current.create())}>
              <Plus size={18} />
              <span>Create</span>
            </button>
            <QrScanner onScan={handleQrScan} onError={setError} />
          </div>
          {state.sessionId && <PairingQr sessionId={state.sessionId} />}
          {error && <p className="sync-error">{error}</p>}
        </section>

        <section className="sync-panel">
          <h2>Transfer</h2>
          <div className="sync-size-row">
            {sizes.map((size) => (
              <button
                key={size.value}
                className={selectedSize === size.value ? "sync-size sync-size-active" : "sync-size"}
                onClick={() => setSelectedSize(size.value)}
              >
                {size.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => run(() => session.current.sendSyntheticFile(selectedSize))}>
            <Play size={18} />
            <span>Send Synthetic File</span>
          </button>
          <button className="btn btn-danger" onClick={() => run(() => session.current.close())}>
            <X size={18} />
            <span>Close</span>
          </button>
        </section>
      </div>

      <section className="sync-panel">
        <h2>Metrics</h2>
        <div className="sync-metrics">
          <span>Sent: {formatBytes(state.metrics.bytesSent)}</span>
          <span>Received: {formatBytes(state.metrics.bytesReceived)}</span>
          <span>Elapsed: {elapsed ? `${elapsed.toFixed(1)}s` : "-"}</span>
          <span>Buffered peak: {formatBytes(state.metrics.maxBufferedAmount)}</span>
          <span>ICE: {state.metrics.selectedCandidatePair ?? "-"}</span>
        </div>
      </section>

      <section className="sync-panel">
        <h2>Events</h2>
        <div className="sync-events">
          {state.events.map((event) => (
            <div key={`${event.at}-${event.message}`}>
              <time>{new Date(event.at).toLocaleTimeString()}</time>
              <span>{event.message}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

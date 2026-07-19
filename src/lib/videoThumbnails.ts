export function generateVideoThumbnail(file: Blob | File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    function finish(value: string | null) {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(value);
    }

    function captureFrame() {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.7));
      } catch (error) {
        console.error("Failed to generate thumbnail:", error);
        finish(null);
      }
    }

    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      const seekTime = Number.isFinite(video.duration) && video.duration > 0.2 ? 0.1 : 0;
      if (seekTime === 0) {
        captureFrame();
        return;
      }
      video.currentTime = seekTime;
    };

    video.onseeked = captureFrame;

    video.onerror = () => {
      console.error("Error loading video for thumbnail generation");
      finish(null);
    };
  });
}

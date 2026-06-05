import { useState, useEffect, type RefObject } from "react";

export function useWebVideoPlayer(videoRef: RefObject<HTMLVideoElement | null>) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onRateChange = () => setPlaybackRate(video.playbackRate);

    // Initial state
    setIsPlaying(!video.paused);
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);
    setPlaybackRate(video.playbackRate);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("ratechange", onRateChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("ratechange", onRateChange);
    };
  }, [videoRef]);

  const play = () => {
    videoRef.current?.play().catch((e) => console.error("Playback failed:", e));
  };

  const pause = () => {
    videoRef.current?.pause();
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
    }
  };

  const seekBy = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(videoRef.current.currentTime + seconds, duration)
      );
    }
  };

  const setRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  return {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    play,
    pause,
    seekTo,
    seekBy,
    setRate,
  };
}

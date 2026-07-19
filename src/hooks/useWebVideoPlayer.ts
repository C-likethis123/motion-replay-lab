import { useState, useEffect, useCallback, useRef } from "react";

export type WebVideoPlayer = {
  setVideoNode: (node: HTMLVideoElement | null) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  seekBy: (seconds: number) => void;
  setRate: (rate: number) => void;
};

export function useWebVideoPlayer(): WebVideoPlayer {
  const elementRef = useRef<HTMLVideoElement | null>(null);
  const [version, setVersion] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const setVideoNode = useCallback((node: HTMLVideoElement | null) => {
    elementRef.current = node;
    if (node) {
      setIsPlaying(!node.paused);
      setCurrentTime(node.currentTime);
      setDuration(node.duration || 0);
      setPlaybackRate(node.playbackRate);
    }
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let rafId: number;
    let lastTime = -1;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      // Throttle updates using requestAnimationFrame
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const time = el.currentTime;
        if (Math.abs(time - lastTime) > 0.05) {
          setCurrentTime(time);
          lastTime = time;
        }
      });
    };
    const onDurationChange = () => setDuration(el.duration);
    const onRateChange = () => setPlaybackRate(el.playbackRate);

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("ratechange", onRateChange);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("ratechange", onRateChange);
    };
  }, [version]);

  const play = () => {
    elementRef.current?.play().catch((e) => console.error("Playback failed:", e));
  };

  const pause = () => {
    elementRef.current?.pause();
  };

  const seekTo = (time: number) => {
    const el = elementRef.current;
    if (!el) return;
    const clampedTime = Math.max(0, Math.min(time, duration || el.duration || 0));
    el.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  };

  const seekBy = (seconds: number) => {
    const el = elementRef.current;
    if (!el) return;
    const newTime = Math.max(
      0,
      Math.min(el.currentTime + seconds, duration || el.duration || 0)
    );
    el.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const setRate = (rate: number) => {
    const el = elementRef.current;
    if (el) {
      el.playbackRate = rate;
    }
  };

  return {
    setVideoNode,
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



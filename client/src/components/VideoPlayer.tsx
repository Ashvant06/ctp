import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { supabase } from "../lib/supabase";
import { API_URL } from "../lib/api";


interface VideoPlayerProps {
  hlsUrl: string;
  lessonId: string;
}

export default function VideoPlayer({ hlsUrl, lessonId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;
    let lastTime: number | null = null;
    let pendingSeconds = 0;
    let flushing = false;
    let flushAgain = false;

    const flushWatchTime = async () => {
      if (flushing) {
        flushAgain = true;
        return;
      }
      if (pendingSeconds < 1) return;
      flushing = true;
      const seconds = Math.min(30, Math.floor(pendingSeconds));
      pendingSeconds -= seconds;

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) throw new Error("No active session for watch-time tracking.");

        const response = await fetch(`${API_URL}/lessons/watch-time`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ lesson_id: lessonId, seconds }),
        });
        if (!response.ok) {
          throw new Error(await response.text() || "Failed to record video watch time.");
        }
      } catch (err: unknown) {
        pendingSeconds += seconds;
        console.error("Watch-time tracking failed:", err);
      } finally {
        flushing = false;
        if (flushAgain) {
          flushAgain = false;
          setTimeout(() => void flushWatchTime(), 0);
        }
      }
    };

    const handleTimeUpdate = () => {
      const previousTime = lastTime;
      lastTime = video.currentTime;
      if (video.paused || video.seeking || previousTime === null) return;

      const elapsed = video.currentTime - previousTime;
      if (elapsed <= 0 || elapsed > 10) return;
      pendingSeconds += elapsed;
      if (pendingSeconds >= 15) void flushWatchTime();
    };
    const handleSeeking = () => { lastTime = video.currentTime; };
    const handlePlay = () => { lastTime = video.currentTime; };
    const handlePause = () => {
      lastTime = null;
      void flushWatchTime();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handlePause);

    const isHls = hlsUrl.includes(".m3u8");

    if (!isHls) {
      video.src = hlsUrl;
      return () => {
        void flushWatchTime();
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("seeking", handleSeeking);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("ended", handlePause);
        video.removeAttribute("src");
        video.load();
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      return () => {
        void flushWatchTime();
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("seeking", handleSeeking);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("ended", handlePause);
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
    }
    return () => {
      void flushWatchTime();
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handlePause);
    };
  }, [hlsUrl, lessonId]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      style={{
        width: "100%",
        height: "100%",
        maxHeight: "calc(100vh - 160px)",
        background: "#000",
        outline: "none",
      }}
      playsInline
    />
  );
}
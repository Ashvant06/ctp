import { useEffect, useRef } from "react";
import Hls from "hls.js";


interface VideoPlayerProps {
  hlsUrl: string;
}

export default function VideoPlayer({ hlsUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    const isHls = hlsUrl.includes(".m3u8");

    if (!isHls) {
      video.src = hlsUrl;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
    }
  }, [hlsUrl]);

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
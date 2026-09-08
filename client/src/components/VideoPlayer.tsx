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

    if (Hls.isSupported()) {
      const hls = new Hls();
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
      style={styles.video}
      playsInline
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  video: {
    width: "100%",
    height: "100%",
    background: "#000",
    borderRadius: "8px",
  },
};
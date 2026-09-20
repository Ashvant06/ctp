import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase, videoBucket } from "../../lib/supabase";
import VideoPlayer from "../../components/VideoPlayer";

interface Video {
  id: string;
  title: string;
  video_path: string;
  status: string;
  order_index: number;
}

interface Playlist {
  id: string;
  title: string;
  description: string;
  lessons: Video[];
}

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [activeUrl, setActiveUrl] = useState<string>("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    supabase
      .from("courses")
      .select("*, lessons(*)")
      .eq("id", id!)
      .single()
      .then(({ data }) => {
        if (data) {
          data.lessons = (data.lessons as Video[])
            .sort((a, b) => a.order_index - b.order_index);
          setPlaylist(data);
          const first = data.lessons.find((v: Video) => v.status === "ready");
          if (first) handleSelectVideo(first);
        }
        setLoading(false);
      });
  }, [id]);

  // Realtime status updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel("video-status")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "lessons",
        filter: `course_id=eq.${id}`,
      }, payload => {
        setPlaylist(prev => !prev ? prev : {
          ...prev,
          lessons: prev.lessons.map(v =>
            v.id === payload.new.id ? { ...v, ...payload.new } : v
          ),
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchVideoUrl = async (video: Video): Promise<string> => {
    if (video.video_path) {
      const { data } = await supabase.storage
        .from(videoBucket)
        .getPublicUrl(video.video_path);
      if (!data?.publicUrl) throw new Error("Failed to get video URL");
      return data.publicUrl;
    }
    throw new Error("No video available");
  };

  const handleSelectVideo = async (video: Video) => {
    if (video.status !== "ready") return;
    setActiveVideo(video);
    setActiveUrl("");
    setUrlLoading(true);
    try {
      const url = await fetchVideoUrl(video);
      setActiveUrl(url);
    } catch (err) {
      console.error("Failed to get video URL:", err);
    } finally {
      setUrlLoading(false);
    }
  };

  const allVideos = playlist?.lessons ?? [];
  const activeIndex = allVideos.findIndex(v => v.id === activeVideo?.id);
  const nextVideo = allVideos[activeIndex + 1];
  const prevVideo = allVideos[activeIndex - 1];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
      Loading playlist...
    </div>
  );

  if (!playlist) return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
      Playlist not found.
    </div>
  );

  return (
    <div style={s.layout}>
      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button onClick={() => navigate("/home")} style={s.backBtn}>← Back</button>
          <div style={s.logo}>
            <span style={s.logoIcon}>▶</span>
            <span style={s.logoText}>LearnHub</span>
          </div>
          <span style={s.topSep}>|</span>
          <span style={s.playlistTitle}>{playlist.title}</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={s.toggleBtn}>
          {sidebarOpen ? "Hide playlist" : "Show playlist"}
        </button>
      </div>

      <div style={s.body}>
        {/* Player */}
        <div style={s.playerArea}>
          {activeVideo ? (
            activeVideo.status === "ready" ? (
              urlLoading ? (
                <div style={s.stateBox}>
                  <div style={{ fontSize: "36px", animation: "spin 1s linear infinite" }}>⟳</div>
                  <p style={s.stateText}>Loading video...</p>
                </div>
              ) : activeUrl ? (
                <div style={s.videoWrap}>
                  <VideoPlayer hlsUrl={activeUrl} />
                </div>
              ) : (
                <div style={s.stateBox}>
                  <div style={{ fontSize: "36px" }}>⚠</div>
                  <p style={s.stateText}>Failed to load video</p>
                  <button onClick={() => handleSelectVideo(activeVideo)} style={s.retryBtn}>Retry</button>
                </div>
              )
            ) : (
              <div style={s.stateBox}>
                <div style={{ fontSize: "36px" }}>⏳</div>
                <p style={s.stateText}>Video is {activeVideo.status}...</p>
                <p style={s.stateSub}>Page will update automatically.</p>
              </div>
            )
          ) : (
            <div style={s.stateBox}>
              <div style={{ fontSize: "36px" }}>▶</div>
              <p style={s.stateText}>Select a video to start watching</p>
            </div>
          )}

          {/* Info bar */}
          {activeVideo && (
            <div style={s.infoBar}>
              <div>
                <h2 style={s.videoTitle}>{activeVideo.title}</h2>
                <p style={s.videoMeta}>
                  Video {activeIndex + 1} of {allVideos.length} · {playlist.title}
                </p>
              </div>
              <div style={s.navBtns}>
                <button
                  onClick={() => prevVideo?.status === "ready" && handleSelectVideo(prevVideo)}
                  disabled={!prevVideo || prevVideo.status !== "ready"}
                  style={{ ...s.navBtn, opacity: !prevVideo ? 0.3 : 1 }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => nextVideo?.status === "ready" && handleSelectVideo(nextVideo)}
                  disabled={!nextVideo || nextVideo.status !== "ready"}
                  style={{ ...s.navBtn, opacity: !nextVideo ? 0.3 : 1 }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={s.sidebar}>
            <div style={s.sidebarHead}>
              <div>
                <h3 style={s.sidebarTitle}>{playlist.title}</h3>
                <p style={s.sidebarCount}>{allVideos.length} videos</p>
              </div>
            </div>
            <div style={s.videoList}>
              {allVideos.map((video, i) => {
                const isActive = activeVideo?.id === video.id;
                const isReady = video.status === "ready";
                return (
                  <div
                    key={video.id}
                    onClick={() => handleSelectVideo(video)}
                    style={{
                      ...s.videoItem,
                      background: isActive ? "rgba(164,53,240,0.15)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                      opacity: isReady ? 1 : 0.5,
                      cursor: isReady ? "pointer" : "not-allowed",
                    }}
                  >
                    <div style={{ ...s.videoItemNum, background: isActive ? "var(--accent)" : "var(--bg-elevated)", color: isActive ? "#fff" : "var(--text-muted)" }}>
                      {isReady ? i + 1 : "⏳"}
                    </div>
                    <div style={s.videoItemContent}>
                      <span style={{ ...s.videoItemTitle, color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {video.title}
                      </span>
                      {isActive && <span style={s.nowPlaying}>Now playing</span>}
                      {!isReady && <span style={s.processingTag}>{video.status}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  layout: { minHeight: "100vh", background: "#0f0f0f", display: "flex", flexDirection: "column" },
  topbar: { background: "#161616", borderBottom: "1px solid #2a2a2a", padding: "0 20px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "sticky", top: 0, zIndex: 100 },
  topLeft: { display: "flex", alignItems: "center", gap: "14px" },
  backBtn: { padding: "5px 12px", background: "transparent", border: "1px solid #3f3f3f", borderRadius: "6px", color: "#aaa", fontSize: "12px", cursor: "pointer" },
  logo: { display: "flex", alignItems: "center", gap: "7px" },
  logoIcon: { width: "24px", height: "24px", background: "var(--accent)", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff" },
  logoText: { fontSize: "14px", fontWeight: 700, color: "#f1f1f1" },
  topSep: { color: "#3f3f3f", fontSize: "18px" },
  playlistTitle: { fontSize: "13px", color: "#aaa", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  toggleBtn: { padding: "5px 14px", background: "transparent", border: "1px solid #3f3f3f", borderRadius: "6px", color: "#aaa", fontSize: "12px", cursor: "pointer" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  playerArea: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  videoWrap: { flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" },
  stateBox: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#111", gap: "12px", minHeight: "400px" },
  stateText: { fontSize: "16px", fontWeight: 600, color: "#aaa" },
  stateSub: { fontSize: "13px", color: "#717171" },
  retryBtn: { padding: "8px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", cursor: "pointer" },
  infoBar: { background: "#161616", borderTop: "1px solid #2a2a2a", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  videoTitle: { fontSize: "15px", fontWeight: 600, color: "#f1f1f1" },
  videoMeta: { fontSize: "12px", color: "#717171", marginTop: "2px" },
  navBtns: { display: "flex", gap: "8px" },
  navBtn: { padding: "7px 16px", background: "#212121", border: "1px solid #3f3f3f", borderRadius: "6px", color: "#aaa", fontSize: "13px", cursor: "pointer" },
  sidebar: { width: "320px", background: "#161616", borderLeft: "1px solid #2a2a2a", display: "flex", flexDirection: "column", flexShrink: 0 },
  sidebarHead: { padding: "16px", borderBottom: "1px solid #2a2a2a", flexShrink: 0 },
  sidebarTitle: { fontSize: "14px", fontWeight: 600, color: "#f1f1f1", marginBottom: "2px" },
  sidebarCount: { fontSize: "12px", color: "var(--accent)", fontWeight: 600 },
  videoList: { overflowY: "auto", flex: 1 },
  videoItem: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", transition: "background 0.15s" },
  videoItemNum: { width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 },
  videoItemContent: { display: "flex", flexDirection: "column", gap: "3px", flex: 1 },
  videoItemTitle: { fontSize: "13px", lineHeight: 1.4 },
  nowPlaying: { fontSize: "10px", color: "var(--accent)", fontWeight: 600 },
  processingTag: { fontSize: "10px", color: "var(--warning)", background: "var(--warning-soft)", padding: "2px 6px", borderRadius: "8px", width: "fit-content" },
};
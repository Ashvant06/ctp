import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, videoBucket } from "../../lib/supabase";
import { API_URL } from "../../lib/api";

interface Video {
  title: string;
  file: File | null;
  status: "idle" | "uploading" | "confirming" | "ready" | "error";
}

export default function CreatePlaylist() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videos, setVideos] = useState<Video[]>([
    { title: "", file: null, status: "idle" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addVideo = () => {
    setVideos([...videos, { title: "", file: null, status: "idle" }]);
  };

  const updateVideoTitle = (i: number, title: string) => {
    const u = [...videos];
    u[i].title = title;
    setVideos(u);
  };

  const updateVideoFile = (i: number, file: File) => {
    const u = [...videos];
    u[i].file = file;
    setVideos(u);
  };

  const removeVideo = (i: number) => {
    setVideos(videos.filter((_, idx) => idx !== i));
  };

  const updateVideo = (i: number, patch: Partial<Video>) => {
    setVideos(prev => {
      const u = [...prev];
      u[i] = { ...u[i], ...patch };
      return [...u];
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError("Playlist title is required"); return; }
    for (const v of videos) {
      if (!v.title.trim() || !v.file) { setError("All videos need a title and file"); return; }
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError("Not authenticated."); setSaving(false); return; }

      // 1. Create playlist
      const playlistRes = await fetch(`${API_URL}/admin/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description }),
      });
      if (!playlistRes.ok) throw new Error(await playlistRes.text());
      const playlistData = await playlistRes.json();
      const playlistId = playlistData[0]?.id;

      // 2. Upload videos
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        updateVideo(i, { status: "uploading" });

        const urlRes = await fetch(`${API_URL}/admin/videos/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            course_id: playlistId,
            section_id: null,
            title: video.title,
            order_index: i,
          }),
        });
        if (!urlRes.ok) throw new Error(await urlRes.text());
        const { token: uploadToken, path, lesson_id } = await urlRes.json();

        const { error: uploadError } = await supabase.storage
          .from(videoBucket)
          .uploadToSignedUrl(path, uploadToken, video.file!, { contentType: "video/mp4" });

        if (uploadError) {
          updateVideo(i, { status: "error" });
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        updateVideo(i, { status: "confirming" });

        const confirmRes = await fetch(`${API_URL}/admin/videos/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lesson_id, video_path: path }),
        });
        if (!confirmRes.ok) throw new Error(await confirmRes.text());

        updateVideo(i, { status: "ready" });
      }

      navigate("/admin/playlists");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const statusMap = {
    idle: { label: "Pending", color: "var(--text-muted)", bg: "var(--bg-elevated)" },
    uploading: { label: "Uploading...", color: "var(--warning)", bg: "var(--warning-soft)" },
    confirming: { label: "Confirming...", color: "#378ADD", bg: "rgba(55,138,221,0.15)" },
    ready: { label: "Ready ✓", color: "var(--success)", bg: "var(--success-soft)" },
    error: { label: "Error ✗", color: "var(--error)", bg: "var(--error-soft)" },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button onClick={() => navigate("/admin/playlists")} style={s.backBtn}>← Back</button>
        <div>
          <h1 style={s.title}>Create new playlist</h1>
          <p style={s.subtitle}>Add videos to build your playlist</p>
        </div>
      </div>

      <div style={s.form}>
        {/* Playlist info */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Playlist information</h2>
          <label style={s.label}>Title *</label>
          <input style={s.input} placeholder="e.g. React Complete Guide"
            value={title} onChange={e => setTitle(e.target.value)}
            onFocus={e => e.target.style.borderColor = "var(--accent)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"} />
          <label style={s.label}>Description</label>
          <textarea style={s.textarea} placeholder="What will viewers learn?"
            value={description} onChange={e => setDescription(e.target.value)} rows={3}
            onFocus={(e: any) => e.target.style.borderColor = "var(--accent)"}
            onBlur={(e: any) => e.target.style.borderColor = "var(--border)"} />
        </div>

        {/* Videos */}
        <div style={s.card}>
          <div style={s.sectionHead}>
            <h2 style={s.cardTitle}>Videos</h2>
            <span style={s.countBadge}>{videos.length} video{videos.length !== 1 ? "s" : ""}</span>
          </div>

          {videos.map((video, i) => {
            const st = statusMap[video.status];
            return (
              <div key={i} style={s.videoCard}>
                <div style={s.videoHead}>
                  <span style={s.videoNum}>Video {i + 1}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ ...s.badge, color: st.color, background: st.bg }}>{st.label}</span>
                    {videos.length > 1 && video.status === "idle" && (
                      <button onClick={() => removeVideo(i)} style={s.removeBtn}>✕</button>
                    )}
                  </div>
                </div>
                <label style={s.label}>Title *</label>
                <input style={s.input} placeholder="e.g. Introduction"
                  value={video.title} onChange={e => updateVideoTitle(i, e.target.value)}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
                <label style={s.label}>Video file *</label>
                <label style={s.fileLabel}>
                  <input type="file" accept="video/mp4,video/*" style={{ display: "none" }}
                    onChange={e => { if (e.target.files?.[0]) updateVideoFile(i, e.target.files[0]); }} />
                  <span style={s.fileBtn}>Choose file</span>
                  <span style={s.fileName}>{video.file ? video.file.name : "No file chosen"}</span>
                </label>
              </div>
            );
          })}

          <button onClick={addVideo} style={s.addVideoBtn}>+ Add another video</button>
        </div>

        {error && <div style={s.error}>{error}</div>}
        <button onClick={handleSubmit} disabled={saving} style={s.submitBtn}>
          {saving ? "Creating playlist..." : "Create playlist"}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "var(--bg-primary)", padding: "28px" },
  header: { display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px", maxWidth: "760px", margin: "0 auto 28px" },
  backBtn: { padding: "8px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer", flexShrink: 0 },
  title: { fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" },
  subtitle: { fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" },
  form: { maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" },
  card: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "24px" },
  cardTitle: { fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "20px" },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" },
  countBadge: { fontSize: "12px", color: "var(--accent)", background: "var(--accent-soft)", padding: "3px 10px", borderRadius: "20px" },
  label: { display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" },
  input: { width: "100%", padding: "10px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "14px", marginBottom: "16px", outline: "none", transition: "border-color 0.2s" },
  textarea: { width: "100%", padding: "10px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "14px", marginBottom: "16px", outline: "none", resize: "vertical", transition: "border-color 0.2s" },
  videoCard: { background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "16px", marginBottom: "12px" },
  videoHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" },
  videoNum: { fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" },
  badge: { fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px" },
  removeBtn: { padding: "3px 8px", background: "var(--error-soft)", border: "1px solid var(--error)", borderRadius: "4px", color: "var(--error)", fontSize: "12px", cursor: "pointer" },
  fileLabel: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  fileBtn: { padding: "7px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-secondary)", flexShrink: 0 },
  fileName: { fontSize: "13px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  addVideoBtn: { width: "100%", padding: "10px", background: "transparent", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", marginTop: "4px" },
  submitBtn: { padding: "14px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius-md)", fontSize: "15px", fontWeight: 700, cursor: "pointer", border: "none" },
  error: { background: "var(--error-soft)", border: "1px solid var(--error)", color: "var(--error)", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: "13px" },
};
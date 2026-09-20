import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, videoBucket } from "../../lib/supabase";
import { API_URL } from "../../lib/api";

interface Video {
  id: string;
  title: string;
  status: string;
  order_index: number;
  video_path: string;
}

interface NewVideo {
  title: string;
  file: File | null;
  status: "idle" | "uploading" | "confirming" | "ready" | "error";
}

export default function EditPlaylist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [newVideos, setNewVideos] = useState<NewVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const fetchPlaylist = async () => {
    const { data } = await supabase
      .from("courses")
      .select("*, lessons(*)")
      .eq("id", id!)
      .single();

    if (data) {
      setPlaylistTitle(data.title);
      setPlaylistDescription(data.description ?? "");
      setVideos(
        (data.lessons as Video[]).sort((a, b) => a.order_index - b.order_index)
      );
    }
    setLoading(false);
  };

  const addNewVideo = () => {
    setNewVideos([...newVideos, { title: "", file: null, status: "idle" }]);
  };

  const updateNewVideo = (i: number, patch: Partial<NewVideo>) => {
    setNewVideos(prev => {
      const u = [...prev];
      u[i] = { ...u[i], ...patch };
      return [...u];
    });
  };

  const removeNewVideo = (i: number) => {
    setNewVideos(newVideos.filter((_, idx) => idx !== i));
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Delete this video permanently?")) return;
    setDeleting(videoId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/admin/lessons/delete?lesson_id=${videoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveInfo = async () => {
    const { error } = await supabase
      .from("courses")
      .update({ title: playlistTitle, description: playlistDescription })
      .eq("id", id!);

    if (error) setError(error.message);
  };

  const handleUploadNewVideos = async () => {
    if (newVideos.length === 0) return;

    for (const v of newVideos) {
      if (!v.title.trim() || !v.file) { setError("All new videos need a title and file"); return; }
    }

    setSaving(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError("Not authenticated."); return; }

      const startIndex = videos.length;

      for (let i = 0; i < newVideos.length; i++) {
        const video = newVideos[i];
        updateNewVideo(i, { status: "uploading" });

        const urlRes = await fetch(`${API_URL}/admin/videos/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            course_id: id,
            section_id: null,
            title: video.title,
            order_index: startIndex + i,
          }),
        });
        if (!urlRes.ok) throw new Error(await urlRes.text());
        const { token: uploadToken, path, lesson_id } = await urlRes.json();

        const { error: uploadError } = await supabase.storage
          .from(videoBucket)
          .uploadToSignedUrl(path, uploadToken, video.file!, { contentType: "video/mp4" });

        if (uploadError) {
          updateNewVideo(i, { status: "error" });
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        updateNewVideo(i, { status: "confirming" });

        const confirmRes = await fetch(`${API_URL}/admin/videos/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lesson_id, video_path: path }),
        });
        if (!confirmRes.ok) throw new Error(await confirmRes.text());

        updateNewVideo(i, { status: "ready" });
      }

      // Refresh video list
      await fetchPlaylist();
      setNewVideos([]);
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

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
      Loading...
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button onClick={() => navigate("/admin/playlists")} style={s.backBtn}>← Back</button>
        <div>
          <h1 style={s.title}>Edit playlist</h1>
          <p style={s.subtitle}>{videos.length} video{videos.length !== 1 ? "s" : ""} in playlist</p>
        </div>
      </div>

      <div style={s.form}>
        {/* Playlist info */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Playlist information</h2>
          <label style={s.label}>Title</label>
          <input style={s.input} value={playlistTitle}
            onChange={e => setPlaylistTitle(e.target.value)}
            onFocus={e => e.target.style.borderColor = "var(--accent)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"} />
          <label style={s.label}>Description</label>
          <textarea style={s.textarea} value={playlistDescription}
            onChange={e => setPlaylistDescription(e.target.value)} rows={3}
            onFocus={(e: any) => e.target.style.borderColor = "var(--accent)"}
            onBlur={(e: any) => e.target.style.borderColor = "var(--border)"} />
          <button onClick={handleSaveInfo} style={s.saveInfoBtn}>Save info</button>
        </div>

        {/* Existing videos */}
        <div style={s.card}>
          <div style={s.sectionHead}>
            <h2 style={s.cardTitle}>Current videos</h2>
            <span style={s.countBadge}>{videos.length} videos</span>
          </div>

          {videos.length === 0 ? (
            <div style={s.emptyVideos}>No videos yet. Add some below.</div>
          ) : (
            videos.map((video, i) => (
              <div key={video.id} style={s.videoRow}>
                <div style={s.videoLeft}>
                  <span style={s.videoNum}>{i + 1}</span>
                  <span style={s.videoTitle}>{video.title}</span>
                  <span style={{
                    ...s.badge,
                    color: video.status === "ready" ? "var(--success)" : "var(--warning)",
                    background: video.status === "ready" ? "var(--success-soft)" : "var(--warning-soft)",
                  }}>
                    {video.status}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteVideo(video.id)}
                  disabled={deleting === video.id}
                  style={s.deleteBtn}
                >
                  {deleting === video.id ? "..." : "🗑 Delete"}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new videos */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Add new videos</h2>

          {newVideos.map((video, i) => {
            const st = statusMap[video.status];
            return (
              <div key={i} style={s.videoCard}>
                <div style={s.videoHead}>
                  <span style={s.videoNum}>New video {i + 1}</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ ...s.badge, color: st.color, background: st.bg }}>{st.label}</span>
                    <button onClick={() => removeNewVideo(i)} style={s.removeBtn}>✕</button>
                  </div>
                </div>
                <label style={s.label}>Title *</label>
                <input style={s.input} placeholder="Video title"
                  value={video.title} onChange={e => updateNewVideo(i, { title: e.target.value })}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
                <label style={s.label}>Video file *</label>
                <label style={s.fileLabel}>
                  <input type="file" accept="video/mp4,video/*" style={{ display: "none" }}
                    onChange={e => { if (e.target.files?.[0]) updateNewVideo(i, { file: e.target.files[0] }); }} />
                  <span style={s.fileBtn}>Choose file</span>
                  <span style={s.fileName}>{video.file ? video.file.name : "No file chosen"}</span>
                </label>
              </div>
            );
          })}

          <button onClick={addNewVideo} style={s.addVideoBtn}>+ Add video</button>

          {newVideos.length > 0 && (
            <button onClick={handleUploadNewVideos} disabled={saving} style={{ ...s.submitBtn, marginTop: "16px" }}>
              {saving ? "Uploading..." : `Upload ${newVideos.length} new video${newVideos.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        {error && <div style={s.error}>{error}</div>}
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
  saveInfoBtn: { padding: "9px 20px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  emptyVideos: { textAlign: "center", padding: "32px", color: "var(--text-muted)", fontSize: "14px" },
  videoRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", marginBottom: "8px" },
  videoLeft: { display: "flex", alignItems: "center", gap: "10px" },
  videoNum: { fontSize: "12px", color: "var(--text-muted)", width: "24px" },
  videoTitle: { fontSize: "14px", color: "var(--text-primary)" },
  badge: { fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px" },
  deleteBtn: { padding: "5px 12px", background: "var(--error-soft)", border: "1px solid var(--error)", borderRadius: "var(--radius-sm)", color: "var(--error)", fontSize: "12px", cursor: "pointer" },
  videoCard: { background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "16px", marginBottom: "12px" },
  videoHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" },
  removeBtn: { padding: "3px 8px", background: "var(--error-soft)", border: "1px solid var(--error)", borderRadius: "4px", color: "var(--error)", fontSize: "12px", cursor: "pointer" },
  fileLabel: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  fileBtn: { padding: "7px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-secondary)", flexShrink: 0 },
  fileName: { fontSize: "13px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  addVideoBtn: { width: "100%", padding: "10px", background: "transparent", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" },
  submitBtn: { width: "100%", padding: "14px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius-md)", fontSize: "15px", fontWeight: 700, cursor: "pointer", border: "none" },
  error: { background: "var(--error-soft)", border: "1px solid var(--error)", color: "var(--error)", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: "13px" },
};
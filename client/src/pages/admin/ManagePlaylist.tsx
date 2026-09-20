import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { API_URL } from "../../lib/api";

interface Playlist {
  id: string;
  title: string;
  description: string;
  created_at: string;
  lessons: { id: string }[];
}

export default function ManagePlaylists() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    const { data } = await supabase
      .from("courses")
      .select("*, lessons(id)")
      .order("created_at", { ascending: false });
    if (data) setPlaylists(data);
    setLoading(false);
  };

  const handleDelete = async (playlistId: string) => {
    if (!confirm("Delete this playlist and all its videos permanently?")) return;
    setDeleting(playlistId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist) {
        for (const lesson of playlist.lessons) {
          await fetch(`${API_URL}/admin/lessons/delete?lesson_id=${lesson.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      await supabase.from("courses").delete().eq("id", playlistId);
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button onClick={() => navigate("/admin")} style={s.backBtn}>← Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={s.title}>Manage playlists</h1>
          <p style={s.subtitle}>{playlists.length} playlist{playlists.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => navigate("/admin/playlists/create")} style={s.createBtn}>
          + New playlist
        </button>
      </div>

      {loading ? (
        <div style={s.loading}>Loading...</div>
      ) : playlists.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyTitle}>No playlists yet</p>
          <p style={s.emptyText}>Create your first playlist to get started</p>
          <button onClick={() => navigate("/admin/playlists/create")} style={s.createBtn}>
            Create playlist
          </button>
        </div>
      ) : (
        <div style={s.list}>
          {playlists.map(playlist => (
            <div key={playlist.id} style={s.card}>
              <div style={s.cardThumb}>
                <span style={s.thumbIcon}>▶</span>
              </div>
              <div style={s.cardBody}>
                <div style={s.cardTop}>
                  <div>
                    <h2 style={s.cardTitle}>{playlist.title}</h2>
                    <div style={s.cardMeta}>
                      <span style={s.videoBadge}>
                        🎬 {playlist.lessons.length} video{playlist.lessons.length !== 1 ? "s" : ""}
                      </span>
                      <span style={s.dateBadge}>
                        {new Date(playlist.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {playlist.description && (
                      <p style={s.cardDesc}>{playlist.description}</p>
                    )}
                  </div>
                  <div style={s.actions}>
                    <button
                      onClick={() => navigate(`/admin/playlists/${playlist.id}/edit`)}
                      style={s.editBtn}
                    >
                      ✏ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(playlist.id)}
                      disabled={deleting === playlist.id}
                      style={s.deleteBtn}
                    >
                      {deleting === playlist.id ? "Deleting..." : "🗑 Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "var(--bg-primary)", padding: "28px" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px", maxWidth: "900px", margin: "0 auto 28px" },
  backBtn: { padding: "8px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer", flexShrink: 0 },
  title: { fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" },
  subtitle: { fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" },
  createBtn: { padding: "10px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  loading: { textAlign: "center", color: "var(--text-muted)", padding: "48px" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px", gap: "10px" },
  emptyTitle: { fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" },
  emptyText: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" },
  list: { maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" },
  card: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden", display: "flex" },
  cardThumb: { width: "140px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  thumbIcon: { fontSize: "32px", color: "var(--accent)", opacity: 0.6 },
  cardBody: { flex: 1, padding: "20px 24px" },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" },
  cardTitle: { fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" },
  cardMeta: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" },
  videoBadge: { fontSize: "13px", color: "var(--accent)", background: "var(--accent-soft)", padding: "3px 10px", borderRadius: "20px", fontWeight: 600 },
  dateBadge: { fontSize: "12px", color: "var(--text-muted)" },
  cardDesc: { fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 },
  actions: { display: "flex", gap: "8px", flexShrink: 0 },
  editBtn: { padding: "7px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer", fontWeight: 500 },
  deleteBtn: { padding: "7px 14px", background: "var(--error-soft)", border: "1px solid var(--error)", borderRadius: "var(--radius-sm)", color: "var(--error)", fontSize: "12px", cursor: "pointer", fontWeight: 600 },
};
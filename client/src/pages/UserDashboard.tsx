import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { API_URL } from "../lib/api";
import "./UserDashboard.css";

interface Playlist {
  id: string;
  title: string;
  description: string;
  created_at: string;
  lessons: { id: string }[];
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [watchSeconds, setWatchSeconds] = useState<number | null>(null);
  const [watchTimeError, setWatchTimeError] = useState("");

  useEffect(() => {
    supabase
      .from("courses")
      .select("*, lessons(id)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPlaylists(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;

    const loadWatchTime = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) throw new Error("Please sign in again to view your watch time.");

        const response = await fetch(`${API_URL}/lessons/watch-time`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok) {
          throw new Error(await response.text() || "Failed to load your watch time.");
        }
        const data = await response.json() as { watch_seconds: number };
        if (!Number.isFinite(data.watch_seconds) || data.watch_seconds < 0) {
          throw new Error("The watch-time response was invalid.");
        }
        if (active) setWatchSeconds(data.watch_seconds);
      } catch (err: unknown) {
        if (active) setWatchTimeError(err instanceof Error ? err.message : String(err));
      }
    };

    void loadWatchTime();
    return () => { active = false; };
  }, []);

  const filtered = playlists.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="user-dashboard" style={s.page}>
      <nav className="user-navbar" style={s.navbar}>
        <div className="user-nav-left" style={s.navLeft}>
          <div style={s.logo}>
            <span style={s.logoIcon}>▶</span>
            <span style={s.logoText}>LearnHub</span>
          </div>
          <div className="user-search-wrap" style={s.searchWrap}>
            <span style={s.searchIcon}>⌕</span>
            <input
              className="user-search"
              style={s.search}
              placeholder="Search playlists..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="user-nav-right" style={s.navRight}>
          <div style={s.avatar}>
            {user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <button
            onClick={logout}
            style={s.logoutBtn}
            title="Log out"
            aria-label="Log out"
          >
            <span aria-hidden="true">⎋</span>
            <span>Log out</span>
          </button>
        </div>
      </nav>

      <div className="user-hero" style={s.hero}>
        <div style={s.heroBg} />
        <h1 style={s.heroTitle}>
          Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p style={s.heroSub}>Continue your learning journey</p>
      </div>

      <div className="user-watch-summary" style={s.watchSummary}>
        <span style={s.watchSummaryIcon} aria-hidden="true">◷</span>
        <div>
          <div style={s.watchSummaryLabel}>Your watch time</div>
          {watchTimeError ? (
            <div style={s.watchSummaryError} role="status">{watchTimeError}</div>
          ) : (
            <div style={s.watchSummaryValue}>
              {watchSeconds === null ? "Loading..." : `${(watchSeconds / 3600).toFixed(1)} hours`}
            </div>
          )}
        </div>
      </div>

      <div className="user-container" style={s.container}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Available Playlists</h2>
          <span style={s.count}>{filtered.length} playlist{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="user-playlist-grid" style={s.loadingGrid}>
            {[1, 2, 3].map(i => <div key={i} style={s.skeleton} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyText}>No playlists found</p>
          </div>
        ) : (
          <div className="user-playlist-grid" style={s.grid}>
            {filtered.map(playlist => (
              <div
                key={playlist.id}
                style={s.card}
                onClick={() => navigate(`/playlist/${playlist.id}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-light)")}
              >
                <div style={s.thumb}>
                  <span style={s.thumbIcon}>▶</span>
                  <span style={s.thumbCount}>
                    🎬 {playlist.lessons.length} video{playlist.lessons.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={s.cardBody}>
                  <h3 style={s.cardTitle}>{playlist.title}</h3>
                  <p style={s.cardDesc}>
                    {playlist.description || "No description available"}
                  </p>
                  <button style={s.watchBtn}>Watch now →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "var(--bg-primary)" },
  navbar: { background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)", padding: "0 24px", minHeight: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 },
  navLeft: { display: "flex", alignItems: "center", gap: "24px", minWidth: 0 },
  logo: { display: "flex", alignItems: "center", gap: "8px" },
  logoIcon: { width: "28px", height: "28px", background: "var(--accent)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#fff" },
  logoText: { fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" },
  searchWrap: { position: "relative", display: "flex", alignItems: "center", minWidth: 0 },
  searchIcon: { position: "absolute", left: "12px", fontSize: "16px", color: "var(--text-muted)" },
  search: { background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 14px 7px 36px", color: "var(--text-primary)", fontSize: "13px", width: "240px", maxWidth: "100%", outline: "none" },
  navRight: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 },
  logoutBtn: { background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "13px", fontWeight: 600, padding: "8px 12px", border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer", flexShrink: 0 },
  hero: { padding: "48px 24px", position: "relative", overflow: "hidden" },
  heroBg: { position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 100%, rgba(164,53,240,0.1) 0%, transparent 60%)", pointerEvents: "none" },
  heroTitle: { fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" },
  heroSub: { fontSize: "15px", color: "var(--text-secondary)" },
  watchSummary: { maxWidth: "1152px", margin: "-16px auto 32px", padding: "16px 20px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "14px", background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)" },
  watchSummaryIcon: { width: "40px", height: "40px", borderRadius: "10px", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 },
  watchSummaryLabel: { color: "var(--text-muted)", fontSize: "13px" },
  watchSummaryValue: { color: "var(--text-primary)", fontSize: "20px", fontWeight: 700, marginTop: "2px" },
  watchSummaryError: { color: "var(--error)", fontSize: "13px", marginTop: "2px" },
  container: { maxWidth: "1200px", margin: "0 auto", padding: "0 24px 48px" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" },
  sectionTitle: { fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" },
  count: { fontSize: "13px", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "4px 10px", borderRadius: "20px", border: "1px solid var(--border)" },
  loadingGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "20px" },
  skeleton: { height: "240px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" },
  empty: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "64px", textAlign: "center" },
  emptyText: { color: "var(--text-muted)", fontSize: "15px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "20px" },
  card: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s" },
  thumb: { height: "160px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexDirection: "column", gap: "8px" },
  thumbIcon: { fontSize: "40px", color: "var(--accent)", opacity: 0.6 },
  thumbCount: { fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", background: "rgba(0,0,0,0.6)", padding: "4px 12px", borderRadius: "20px" },
  cardBody: { padding: "16px" },
  cardTitle: { fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" },
  cardDesc: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  watchBtn: { padding: "8px 16px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
};
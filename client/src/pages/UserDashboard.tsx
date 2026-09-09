import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface Course {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("courses").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setCourses(data); setLoading(false); });
  }, []);

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      <nav style={s.navbar}>
        <div style={s.navLeft}>
          <div style={s.logo}>
            <span style={s.logoIcon}>▶</span>
            <span style={s.logoText}>CTP Learner</span>
          </div>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>⌕</span>
            <input
              style={s.search}
              placeholder="Search courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={s.navRight}>
          <div style={s.avatar}>
            {user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <button onClick={logout} style={s.logoutBtn}>Sign out</button>
        </div>
      </nav>

      <div style={s.hero}>
        <div style={s.heroBg} />
        <h1 style={s.heroTitle}>
          Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p style={s.heroSub}>Continue your learning journey</p>
      </div>

      <div style={s.container}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Available Courses</h2>
          <span style={s.courseCount}>{filtered.length} courses</span>
        </div>

        {loading ? (
          <div style={s.loadingGrid}>
            {[1, 2, 3].map(i => <div key={i} style={s.skeleton} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyText}>No courses found</p>
          </div>
        ) : (
          <div style={s.grid}>
            {filtered.map(course => (
              <div
                key={course.id}
                style={s.card}
                onClick={() => navigate(`/course/${course.id}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-light)")}
              >
                <div style={s.thumb}>
                  <span style={s.thumbIcon}>▶</span>
                </div>
                <div style={s.cardBody}>
                  <h3 style={s.cardTitle}>{course.title}</h3>
                  <p style={s.cardDesc}>{course.description || "No description available"}</p>
                  <div style={s.cardFooter}>
                    <span style={s.cardDate}>
                      {new Date(course.created_at).toLocaleDateString()}
                    </span>
                    <button style={s.watchBtn}>Watch now →</button>
                  </div>
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
  navbar: { background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 },
  navLeft: { display: "flex", alignItems: "center", gap: "24px" },
  logo: { display: "flex", alignItems: "center", gap: "8px" },
  logoIcon: { width: "28px", height: "28px", background: "var(--accent)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#fff" },
  logoText: { fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" },
  searchWrap: { position: "relative", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: "12px", fontSize: "16px", color: "var(--text-muted)" },
  search: { background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 14px 7px 36px", color: "var(--text-primary)", fontSize: "13px", width: "240px", outline: "none" },
  navRight: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 },
  logoutBtn: { background: "transparent", color: "var(--text-muted)", fontSize: "13px", padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" },
  hero: { padding: "48px 24px", position: "relative", overflow: "hidden" },
  heroBg: { position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 100%, rgba(164,53,240,0.1) 0%, transparent 60%)", pointerEvents: "none" },
  heroTitle: { fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" },
  heroSub: { fontSize: "15px", color: "var(--text-secondary)" },
  container: { maxWidth: "1200px", margin: "0 auto", padding: "0 24px 48px" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" },
  sectionTitle: { fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" },
  courseCount: { fontSize: "13px", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "4px 10px", borderRadius: "20px", border: "1px solid var(--border)" },
  loadingGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
  skeleton: { height: "240px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" },
  empty: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "64px", textAlign: "center" },
  emptyText: { color: "var(--text-muted)", fontSize: "15px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
  card: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s, transform 0.2s", display: "flex", flexDirection: "column" },
  thumb: { height: "160px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  thumbIcon: { fontSize: "40px", color: "var(--accent)", opacity: 0.6 },
  cardBody: { padding: "16px", flex: 1, display: "flex", flexDirection: "column" },
  cardTitle: { fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px", lineHeight: 1.4 },
  cardDesc: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", flex: 1, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardDate: { fontSize: "12px", color: "var(--text-muted)" },
  watchBtn: { padding: "6px 14px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer" },
};
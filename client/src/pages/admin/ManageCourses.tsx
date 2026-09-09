import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface Course {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export default function ManageCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("courses").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setCourses(data); setLoading(false); });
  }, []);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button onClick={() => navigate("/admin")} style={s.backBtn}>← Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={s.title}>Manage courses</h1>
          <p style={s.subtitle}>{courses.length} course{courses.length !== 1 ? "s" : ""} total</p>
        </div>
        <button onClick={() => navigate("/admin/courses/create")} style={s.createBtn}>
          + New course
        </button>
      </div>

      {loading ? (
        <div style={s.grid}>
          {[1, 2, 3].map(i => <div key={i} style={s.skeleton} />)}
        </div>
      ) : courses.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>▶</div>
          <p style={s.emptyTitle}>No courses yet</p>
          <p style={s.emptyText}>Create your first course to get started</p>
          <button onClick={() => navigate("/admin/courses/create")} style={s.createBtn}>
            Create course
          </button>
        </div>
      ) : (
        <div style={s.grid}>
          {courses.map(course => (
            <div key={course.id} style={s.card}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-light)")}>
              <div style={s.thumb}><span style={s.thumbIcon}>▶</span></div>
              <div style={s.cardBody}>
                <h3 style={s.cardTitle}>{course.title}</h3>
                <p style={s.cardDesc}>{course.description || "No description"}</p>
                <div style={s.cardFooter}>
                  <span style={s.cardDate}>{new Date(course.created_at).toLocaleDateString()}</span>
                  <div style={s.actions}>
                    <button style={s.editBtn}>Edit</button>
                    <button style={s.deleteBtn}>Delete</button>
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
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px", maxWidth: "1100px", margin: "0 auto 28px" },
  backBtn: { padding: "8px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer", flexShrink: 0 },
  title: { fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" },
  subtitle: { fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" },
  createBtn: { padding: "10px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", maxWidth: "1100px", margin: "0 auto" },
  skeleton: { height: "220px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px", gap: "10px" },
  emptyIcon: { fontSize: "40px", color: "var(--text-muted)", marginBottom: "8px" },
  emptyTitle: { fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" },
  emptyText: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" },
  card: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden", transition: "border-color 0.2s" },
  thumb: { height: "140px", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" },
  thumbIcon: { fontSize: "36px", color: "var(--accent)", opacity: 0.6 },
  cardBody: { padding: "16px" },
  cardTitle: { fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" },
  cardDesc: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardDate: { fontSize: "12px", color: "var(--text-muted)" },
  actions: { display: "flex", gap: "8px" },
  editBtn: { padding: "5px 12px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" },
  deleteBtn: { padding: "5px 12px", background: "var(--error-soft)", border: "1px solid var(--error)", borderRadius: "var(--radius-sm)", color: "var(--error)", fontSize: "12px", cursor: "pointer" },
};
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

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) setCourses(data);
      setLoading(false);
    };

    fetchCourses();
  }, []);

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <div style={styles.logo}>📚 Crack The Pattern</div>
        <div style={styles.navRight}>
          <span style={styles.userName}>
            {user?.user_metadata?.full_name ?? user?.email}
          </span>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.heading}>
            Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p style={styles.subheading}>Continue your learning journey.</p>
        </div>

        <h2 style={styles.sectionTitle}>Available Courses</h2>

        {loading ? (
          <p style={styles.loading}>Loading courses...</p>
        ) : courses.length === 0 ? (
          <div style={styles.emptyState}>No courses available yet.</div>
        ) : (
          <div style={styles.grid}>
            {courses.map((course) => (
              <div
                key={course.id}
                style={styles.card}
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div style={styles.cardThumb}>🎓</div>
                <div style={styles.cardBody}>
                  <h3 style={styles.cardTitle}>{course.title}</h3>
                  <p style={styles.cardDesc}>
                    {course.description || "No description"}
                  </p>
                  <button style={styles.watchBtn}>Watch Now →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f5f7fb" },
  navbar: { background: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "0 32px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
  logo: { fontSize: "20px", fontWeight: 700, color: "#111827" },
  navRight: { display: "flex", alignItems: "center", gap: "16px" },
  userName: { fontSize: "14px", color: "#6b7280" },
  logoutBtn: { padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#ffffff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  container: { maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" },
  header: { marginBottom: "36px" },
  heading: { fontSize: "26px", fontWeight: 700, color: "#111827", margin: 0 },
  subheading: { color: "#6b7280", marginTop: "8px" },
  sectionTitle: { fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "20px" },
  loading: { color: "#6b7280", textAlign: "center" },
  emptyState: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "60px", textAlign: "center", color: "#9ca3af", fontSize: "15px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" },
  card: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s" },
  cardThumb: { background: "#f3f4f6", height: "140px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" },
  cardBody: { padding: "20px" },
  cardTitle: { fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "8px", marginTop: 0 },
  cardDesc: { fontSize: "13px", color: "#6b7280", marginBottom: "16px" },
  watchBtn: { padding: "8px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
};
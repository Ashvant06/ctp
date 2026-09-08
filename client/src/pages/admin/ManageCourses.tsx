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
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setCourses(data);
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate("/admin")} style={styles.backBtn}>
          ← Back
        </button>
        <h1 style={styles.title}>Manage Courses</h1>
        <button onClick={() => navigate("/admin/courses/create")} style={styles.createBtn}>
          + New Course
        </button>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading courses...</p>
      ) : courses.length === 0 ? (
        <div style={styles.empty}>
          <p>No courses yet.</p>
          <button onClick={() => navigate("/admin/courses/create")} style={styles.createBtn}>
            Create your first course
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {courses.map((course) => (
            <div key={course.id} style={styles.card}>
              <h2 style={styles.courseTitle}>{course.title}</h2>
              <p style={styles.courseDesc}>
                {course.description || "No description"}
              </p>
              <p style={styles.courseDate}>
                Created: {new Date(course.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f5f7fb", padding: "32px" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" },
  backBtn: { padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "14px" },
  title: { fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0, flex: 1 },
  createBtn: { padding: "10px 20px", background: "#111827", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
  loading: { textAlign: "center", color: "#6b7280" },
  empty: { textAlign: "center", padding: "60px", color: "#6b7280" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px", maxWidth: "1100px", margin: "0 auto" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" },
  courseTitle: { fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "8px", marginTop: 0 },
  courseDesc: { fontSize: "14px", color: "#6b7280", marginBottom: "12px" },
  courseDate: { fontSize: "12px", color: "#9ca3af" },
};
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { API_URL } from "../../lib/api";

interface Lesson {
  id: string;
  title: string;
  status: string;
  order_index: number;
}

interface Section {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  created_at: string;
  sections: Section[];
}

export default function ManageCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("*, sections(*, lessons(*))")
      .order("created_at", { ascending: false });
    if (data) setCourses(data);
    setLoading(false);
  };

  const handleDeleteLesson = async (lessonId: string, courseId: string) => {
    if (!confirm("Delete this lesson and its video permanently?")) return;

    setDeleting(lessonId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/admin/lessons/delete?lesson_id=${lessonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());

      // Update local state
      setCourses(prev => prev.map(course => {
        if (course.id !== courseId) return course;
        return {
          ...course,
          sections: course.sections.map(section => ({
            ...section,
            lessons: section.lessons.filter(l => l.id !== lessonId),
          })),
        };
      }));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Delete this entire course and all its videos permanently?")) return;

    setDeleting(courseId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Get all lessons first and delete their videos
      const course = courses.find(c => c.id === courseId);
      if (course) {
        for (const section of course.sections) {
          for (const lesson of section.lessons) {
            await fetch(`${API_URL}/admin/lessons/delete?lesson_id=${lesson.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
      }

      // Delete course from DB
      await supabase.from("courses").delete().eq("id", courseId);

      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err: any) {
      alert(`Failed to delete course: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

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
        <div style={s.loading}>Loading courses...</div>
      ) : courses.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyTitle}>No courses yet</p>
          <p style={s.emptyText}>Create your first course to get started</p>
          <button onClick={() => navigate("/admin/courses/create")} style={s.createBtn}>
            Create course
          </button>
        </div>
      ) : (
        <div style={s.list}>
          {courses.map(course => (
            <div key={course.id} style={s.courseCard}>
              {/* Course header */}
              <div style={s.courseHeader}>
                <div style={s.courseInfo}>
                  <h2 style={s.courseName}>{course.title}</h2>
                  <p style={s.courseMeta}>
                    {course.sections.length} section{course.sections.length !== 1 ? "s" : ""} ·{" "}
                    {course.sections.reduce((acc, s) => acc + s.lessons.length, 0)} lessons ·{" "}
                    {new Date(course.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={s.courseActions}>
                  <button
                    onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                    style={s.expandBtn}
                  >
                    {expandedCourse === course.id ? "Hide lessons ▲" : "View lessons ▼"}
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    disabled={deleting === course.id}
                    style={s.deleteBtn}
                  >
                    {deleting === course.id ? "Deleting..." : "Delete course"}
                  </button>
                </div>
              </div>

              {/* Expanded lessons */}
              {expandedCourse === course.id && (
                <div style={s.sectionsWrap}>
                  {course.sections
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((section, si) => (
                      <div key={section.id} style={s.sectionBlock}>
                        <div style={s.sectionTitle}>
                          Section {si + 1}: {section.title}
                        </div>
                        {section.lessons
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((lesson, li) => (
                            <div key={lesson.id} style={s.lessonRow}>
                              <div style={s.lessonLeft}>
                                <span style={s.lessonNum}>{li + 1}.</span>
                                <span style={s.lessonName}>{lesson.title}</span>
                                <span style={{
                                  ...s.statusBadge,
                                  color: lesson.status === "ready" ? "var(--success)" : "var(--warning)",
                                  background: lesson.status === "ready" ? "var(--success-soft)" : "var(--warning-soft)",
                                }}>
                                  {lesson.status}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id, course.id)}
                                disabled={deleting === lesson.id}
                                style={s.deleteLessonBtn}
                              >
                                {deleting === lesson.id ? "..." : "🗑 Delete"}
                              </button>
                            </div>
                          ))}
                        {section.lessons.length === 0 && (
                          <div style={s.emptySection}>No lessons in this section</div>
                        )}
                      </div>
                    ))}
                </div>
              )}
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
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px", gap: "10px" },
  emptyTitle: { fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" },
  emptyText: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" },
  list: { maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" },
  courseCard: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" },
  courseHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" },
  courseInfo: { flex: 1 },
  courseName: { fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" },
  courseMeta: { fontSize: "12px", color: "var(--text-muted)" },
  courseActions: { display: "flex", gap: "10px", alignItems: "center" },
  expandBtn: { padding: "7px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" },
  deleteBtn: { padding: "7px 14px", background: "var(--error-soft)", border: "1px solid var(--error)", borderRadius: "var(--radius-sm)", color: "var(--error)", fontSize: "12px", cursor: "pointer", fontWeight: 600 },
  sectionsWrap: { borderTop: "1px solid var(--border-light)", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "16px" },
  sectionBlock: { background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", overflow: "hidden" },
  sectionTitle: { padding: "10px 16px", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--bg-elevated)" },
  lessonRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border-light)" },
  lessonLeft: { display: "flex", alignItems: "center", gap: "10px" },
  lessonNum: { fontSize: "12px", color: "var(--text-muted)", width: "20px" },
  lessonName: { fontSize: "14px", color: "var(--text-primary)" },
  statusBadge: { fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px" },
  deleteLessonBtn: { padding: "5px 12px", background: "var(--error-soft)", border: "1px solid var(--error)", borderRadius: "var(--radius-sm)", color: "var(--error)", fontSize: "12px", cursor: "pointer" },
  emptySection: { padding: "12px 16px", fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" },
};
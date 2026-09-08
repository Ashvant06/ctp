import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import VideoPlayer from "../../components/VideoPlayer";

interface Lesson {
  id: string;
  title: string;
  hls_url: string;
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
  sections: Section[];
}

export default function CoursePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*, sections(*, lessons(*))")
      .eq("id", id)
      .single();

    if (!error && data) {
      // Sort sections and lessons by order_index
      data.sections = data.sections
        .sort((a: Section, b: Section) => a.order_index - b.order_index)
        .map((section: Section) => ({
          ...section,
          lessons: section.lessons.sort(
            (a: Lesson, b: Lesson) => a.order_index - b.order_index
          ),
        }));

      setCourse(data);

      // Auto-select first ready lesson
      const firstLesson = data.sections[0]?.lessons?.find(
        (l: Lesson) => l.status === "ready"
      );
      if (firstLesson) setActiveLesson(firstLesson);
    }
    setLoading(false);
  };

  // Subscribe to lesson status changes via Supabase Realtime
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel("lesson-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lessons",
          filter: `course_id=eq.${id}`,
        },
        (payload) => {
          setCourse((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              sections: prev.sections.map((section) => ({
                ...section,
                lessons: section.lessons.map((lesson) =>
                  lesson.id === payload.new.id
                    ? { ...lesson, ...payload.new }
                    : lesson
                ),
              })),
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return <div style={styles.loading}>Loading course...</div>;
  }

  if (!course) {
    return <div style={styles.loading}>Course not found.</div>;
  }

  return (
    <div style={styles.layout}>
      {/* Topbar */}
      <div style={styles.topbar}>
        <button onClick={() => navigate("/home")} style={styles.backBtn}>
          ← Back to Courses
        </button>
        <h1 style={styles.courseTitle}>{course.title}</h1>
      </div>

      <div style={styles.body}>
        {/* Video Player */}
        <div style={styles.playerArea}>
          {activeLesson ? (
            activeLesson.status === "ready" ? (
              <VideoPlayer hlsUrl={activeLesson.hls_url} />
            ) : (
              <div style={styles.processingBox}>
                <p>⏳ Video is {activeLesson.status}... Please wait.</p>
              </div>
            )
          ) : (
            <div style={styles.processingBox}>
              <p>Select a lesson to start watching.</p>
            </div>
          )}

          {activeLesson && (
            <div style={styles.lessonInfo}>
              <h2 style={styles.lessonTitle}>{activeLesson.title}</h2>
            </div>
          )}
        </div>

        {/* Sidebar Playlist */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Course Content</h3>
          {course.sections.map((section) => (
            <div key={section.id} style={styles.sectionBlock}>
              <h4 style={styles.sectionTitle}>{section.title}</h4>
              {section.lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => lesson.status === "ready" && setActiveLesson(lesson)}
                  style={{
                    ...styles.lessonBtn,
                    ...(activeLesson?.id === lesson.id ? styles.lessonBtnActive : {}),
                    opacity: lesson.status !== "ready" ? 0.5 : 1,
                    cursor: lesson.status !== "ready" ? "not-allowed" : "pointer",
                  }}
                >
                  <span style={styles.lessonIcon}>
                    {lesson.status === "ready" ? "▶" : "⏳"}
                  </span>
                  <span style={styles.lessonBtnTitle}>{lesson.title}</span>
                  {lesson.status !== "ready" && (
                    <span style={styles.processingTag}>{lesson.status}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: { minHeight: "100vh", background: "#111827", display: "flex", flexDirection: "column" },
  topbar: { background: "#1f2937", padding: "12px 24px", display: "flex", alignItems: "center", gap: "16px", borderBottom: "1px solid #374151" },
  backBtn: { padding: "7px 14px", border: "1px solid #374151", borderRadius: "6px", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: "13px" },
  courseTitle: { fontSize: "16px", fontWeight: 600, color: "#f9fafb", margin: 0 },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  playerArea: { flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" },
  processingBox: { flex: 1, background: "#1f2937", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "16px", minHeight: "400px" },
  lessonInfo: { background: "#1f2937", borderRadius: "8px", padding: "16px" },
  lessonTitle: { fontSize: "18px", fontWeight: 600, color: "#f9fafb", margin: 0 },
  sidebar: { width: "320px", background: "#1f2937", borderLeft: "1px solid #374151", overflowY: "auto", padding: "16px" },
  sidebarTitle: { fontSize: "15px", fontWeight: 700, color: "#f9fafb", marginBottom: "16px", marginTop: 0 },
  sectionBlock: { marginBottom: "20px" },
  sectionTitle: { fontSize: "13px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", marginTop: 0 },
  lessonBtn: { width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "transparent", border: "none", borderRadius: "6px", color: "#d1d5db", fontSize: "14px", textAlign: "left", marginBottom: "4px" },
  lessonBtnActive: { background: "#374151", color: "#f9fafb" },
  lessonIcon: { fontSize: "12px", flexShrink: 0 },
  lessonBtnTitle: { flex: 1 },
  processingTag: { fontSize: "11px", color: "#f59e0b", background: "#451a03", padding: "2px 8px", borderRadius: "10px" },
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: "16px" },
};
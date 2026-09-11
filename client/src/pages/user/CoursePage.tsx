import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import VideoPlayer from "../../components/VideoPlayer";
import { API_URL } from "../../lib/api";

interface Lesson {
  id: string;
  title: string;
  hls_url: string;
  video_path: string;
  video_provider: string;
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
  const [activeUrl, setActiveUrl] = useState<string>("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    supabase
      .from("courses")
      .select("*, sections(*, lessons(*))")
      .eq("id", id!)
      .single()
      .then(({ data }) => {
        if (data) {
          data.sections = data.sections
            .sort((a: Section, b: Section) => a.order_index - b.order_index)
            .map((s: Section) => ({
              ...s,
              lessons: s.lessons.sort(
                (a: Lesson, b: Lesson) => a.order_index - b.order_index,
              ),
            }));
          setCourse(data);
          const first = data.sections[0]?.lessons?.find(
            (l: Lesson) => l.status === "ready",
          );
          if (first) handleSelectLesson(first);
        }
        setLoading(false);
      });
  }, [id]);

  // Supabase Realtime — live lesson status updates
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
          setCourse((prev) =>
            !prev
              ? prev
              : {
                  ...prev,
                  sections: prev.sections.map((s) => ({
                    ...s,
                    lessons: s.lessons.map((l) =>
                      l.id === payload.new.id ? { ...l, ...payload.new } : l,
                    ),
                  })),
                },
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchPlayUrl = async (lesson: Lesson): Promise<string> => {
    // If lesson has video_path → use Go signed URL endpoint
    if (lesson.video_path) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${API_URL}/lessons/play?lesson_id=${lesson.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error("Failed to get play URL");
      const data = await res.json();
      return data.url;
    }

    if (lesson.hls_url) {
      const legacyUrl = new URL(lesson.hls_url, API_URL);
      if (legacyUrl.hostname === "localhost" || legacyUrl.hostname === "127.0.0.1") {
        return `${API_URL}${legacyUrl.pathname}${legacyUrl.search}`;
      }
      return legacyUrl.toString();
    }

    throw new Error("No video available for this lesson");
  };

  const handleSelectLesson = async (lesson: Lesson) => {
    if (lesson.status !== "ready") return;
    setActiveLesson(lesson);
    setActiveUrl("");
    setUrlLoading(true);
    try {
      const url = await fetchPlayUrl(lesson);
      setActiveUrl(url);
    } catch (err) {
      console.error("Failed to get play URL:", err);
    } finally {
      setUrlLoading(false);
    }
  };

  const allLessons = course?.sections.flatMap((s) => s.lessons) ?? [];
  const activeIndex = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const nextLesson = allLessons[activeIndex + 1];
  const prevLesson = allLessons[activeIndex - 1];

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f0f0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "15px",
        }}
      >
        Loading course...
      </div>
    );

  if (!course)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f0f0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
        }}
      >
        Course not found.
      </div>
    );

  return (
    <div style={s.layout}>
      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <button onClick={() => navigate("/home")} style={s.backBtn}>
            ← Back
          </button>
          <div style={s.logo}>
            <span style={s.logoIcon}>▶</span>
            <span style={s.logoText}>LearnHub</span>
          </div>
          <span style={s.topSep}>|</span>
          <span style={s.courseTitle}>{course.title}</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={s.toggleBtn}
        >
          {sidebarOpen ? "Hide playlist" : "Show playlist"}
        </button>
      </div>

      <div style={s.body}>
        {/* Player area */}
        <div style={s.playerArea}>
          {activeLesson ? (
            activeLesson.status === "ready" ? (
              urlLoading ? (
                <div style={s.processingBox}>
                  <div
                    style={{
                      ...s.processingIcon,
                      animation: "spin 1s linear infinite",
                    }}
                  >
                    ⟳
                  </div>
                  <p style={s.processingText}>Loading video...</p>
                </div>
              ) : activeUrl ? (
                <div style={s.videoWrap}>
                  <VideoPlayer hlsUrl={activeUrl} />
                </div>
              ) : (
                <div style={s.processingBox}>
                  <div style={s.processingIcon}>⚠</div>
                  <p style={s.processingText}>Failed to load video</p>
                  <button
                    onClick={() => handleSelectLesson(activeLesson)}
                    style={s.retryBtn}
                  >
                    Retry
                  </button>
                </div>
              )
            ) : (
              <div style={s.processingBox}>
                <div style={s.processingIcon}>⏳</div>
                <p style={s.processingText}>
                  Video is {activeLesson.status}...
                </p>
                <p style={s.processingSubText}>
                  This may take a few minutes. The page will update
                  automatically.
                </p>
              </div>
            )
          ) : (
            <div style={s.processingBox}>
              <div style={s.processingIcon}>▶</div>
              <p style={s.processingText}>Select a lesson to start watching</p>
            </div>
          )}

          {/* Lesson info bar */}
          {activeLesson && (
            <div style={s.infoBar}>
              <div>
                <h2 style={s.lessonTitle}>{activeLesson.title}</h2>
                <p style={s.lessonMeta}>
                  {
                    course.sections.find((sec) =>
                      sec.lessons.some((l) => l.id === activeLesson.id),
                    )?.title
                  }
                </p>
              </div>
              <div style={s.navBtns}>
                <button
                  onClick={() =>
                    prevLesson?.status === "ready" &&
                    handleSelectLesson(prevLesson)
                  }
                  disabled={!prevLesson || prevLesson.status !== "ready"}
                  style={{
                    ...s.navBtn,
                    opacity:
                      !prevLesson || prevLesson.status !== "ready" ? 0.3 : 1,
                  }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() =>
                    nextLesson?.status === "ready" &&
                    handleSelectLesson(nextLesson)
                  }
                  disabled={!nextLesson || nextLesson.status !== "ready"}
                  style={{
                    ...s.navBtn,
                    opacity:
                      !nextLesson || nextLesson.status !== "ready" ? 0.3 : 1,
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={s.sidebar}>
            <div style={s.sidebarHead}>
              <h3 style={s.sidebarTitle}>Course content</h3>
              <span style={s.lessonCount}>{allLessons.length} lessons</span>
            </div>
            <div style={s.playlist}>
              {course.sections.map((section, si) => (
                <div key={section.id}>
                  <div style={s.sectionLabel}>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Section {si + 1}
                    </span>
                    <span style={s.sectionTitle}>{section.title}</span>
                  </div>
                  {section.lessons.map((lesson, li) => {
                    const isActive = activeLesson?.id === lesson.id;
                    const isReady = lesson.status === "ready";
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson)}
                        style={{
                          ...s.lessonItem,
                          background: isActive
                            ? "rgba(164,53,240,0.15)"
                            : "transparent",
                          borderLeft: isActive
                            ? "3px solid var(--accent)"
                            : "3px solid transparent",
                          opacity: isReady ? 1 : 0.5,
                          cursor: isReady ? "pointer" : "not-allowed",
                        }}
                      >
                        <span
                          style={{
                            ...s.lessonItemIcon,
                            color: isActive
                              ? "var(--accent)"
                              : "var(--text-muted)",
                          }}
                        >
                          {isReady ? "▶" : "⏳"}
                        </span>
                        <div style={s.lessonItemContent}>
                          <span
                            style={{
                              ...s.lessonItemTitle,
                              color: isActive
                                ? "var(--text-primary)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {li + 1}. {lesson.title}
                          </span>
                          {!isReady && (
                            <span style={s.processingTag}>{lesson.status}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: "100vh",
    background: "#0f0f0f",
    display: "flex",
    flexDirection: "column",
  },
  topbar: {
    background: "#161616",
    borderBottom: "1px solid #2a2a2a",
    padding: "0 20px",
    height: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  topLeft: { display: "flex", alignItems: "center", gap: "14px" },
  backBtn: {
    padding: "5px 12px",
    background: "transparent",
    border: "1px solid #3f3f3f",
    borderRadius: "6px",
    color: "#aaa",
    fontSize: "12px",
    cursor: "pointer",
  },
  logo: { display: "flex", alignItems: "center", gap: "7px" },
  logoIcon: {
    width: "24px",
    height: "24px",
    background: "var(--accent)",
    borderRadius: "5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    color: "#fff",
  },
  logoText: { fontSize: "14px", fontWeight: 700, color: "#f1f1f1" },
  topSep: { color: "#3f3f3f", fontSize: "18px" },
  courseTitle: {
    fontSize: "13px",
    color: "#aaa",
    maxWidth: "300px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  toggleBtn: {
    padding: "5px 14px",
    background: "transparent",
    border: "1px solid #3f3f3f",
    borderRadius: "6px",
    color: "#aaa",
    fontSize: "12px",
    cursor: "pointer",
  },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  playerArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  videoWrap: {
    flex: 1,
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  processingBox: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#111",
    gap: "12px",
    minHeight: "400px",
  },
  processingIcon: { fontSize: "48px" },
  processingText: { fontSize: "16px", fontWeight: 600, color: "#aaa" },
  processingSubText: {
    fontSize: "13px",
    color: "#717171",
    textAlign: "center",
    maxWidth: "320px",
  },
  retryBtn: {
    padding: "8px 20px",
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "8px",
  },
  infoBar: {
    background: "#161616",
    borderTop: "1px solid #2a2a2a",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  lessonTitle: { fontSize: "15px", fontWeight: 600, color: "#f1f1f1" },
  lessonMeta: { fontSize: "12px", color: "#717171", marginTop: "2px" },
  navBtns: { display: "flex", gap: "8px" },
  navBtn: {
    padding: "7px 16px",
    background: "#212121",
    border: "1px solid #3f3f3f",
    borderRadius: "6px",
    color: "#aaa",
    fontSize: "13px",
    cursor: "pointer",
  },
  sidebar: {
    width: "320px",
    background: "#161616",
    borderLeft: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  sidebarHead: {
    padding: "16px",
    borderBottom: "1px solid #2a2a2a",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  sidebarTitle: { fontSize: "14px", fontWeight: 600, color: "#f1f1f1" },
  lessonCount: {
    fontSize: "12px",
    color: "#717171",
    background: "#212121",
    padding: "2px 8px",
    borderRadius: "10px",
  },
  playlist: { overflowY: "auto", flex: 1 },
  sectionLabel: {
    padding: "12px 16px 6px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    background: "#111",
  },
  sectionTitle: { fontSize: "13px", fontWeight: 600, color: "#aaa" },
  lessonItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "10px 14px",
    transition: "background 0.15s",
  },
  lessonItemIcon: { fontSize: "11px", marginTop: "2px", flexShrink: 0 },
  lessonItemContent: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  },
  lessonItemTitle: { fontSize: "13px", lineHeight: 1.4 },
  processingTag: {
    fontSize: "10px",
    color: "var(--warning)",
    background: "var(--warning-soft)",
    padding: "2px 6px",
    borderRadius: "8px",
    width: "fit-content",
  },
};

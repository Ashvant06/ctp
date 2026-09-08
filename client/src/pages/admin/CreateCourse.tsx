import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface Lesson {
  title: string;
  file: File | null;
  status: "idle" | "uploading" | "processing" | "ready" | "error";
}

interface Section {
  title: string;
  lessons: Lesson[];
}

export default function CreateCourse() {
  const navigate = useNavigate();
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [sections, setSections] = useState<Section[]>([
    { title: "", lessons: [{ title: "", file: null, status: "idle" }] },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addSection = () => {
    setSections([...sections, { title: "", lessons: [{ title: "", file: null, status: "idle" }] }]);
  };

  const addLesson = (sectionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].lessons.push({ title: "", file: null, status: "idle" });
    setSections(updated);
  };

  const updateSectionTitle = (index: number, title: string) => {
    const updated = [...sections];
    updated[index].title = title;
    setSections(updated);
  };

  const updateLessonTitle = (sectionIndex: number, lessonIndex: number, title: string) => {
    const updated = [...sections];
    updated[sectionIndex].lessons[lessonIndex].title = title;
    setSections(updated);
  };

  const updateLessonFile = (sectionIndex: number, lessonIndex: number, file: File) => {
    const updated = [...sections];
    updated[sectionIndex].lessons[lessonIndex].file = file;
    setSections(updated);
  };

  const updateLessonStatus = (sectionIndex: number, lessonIndex: number, status: Lesson["status"]) => {
    const updated = [...sections];
    updated[sectionIndex].lessons[lessonIndex].status = status;
    setSections([...updated]);
  };

  const handleSubmit = async () => {
    setError("");

    if (!courseTitle.trim()) {
      setError("Course title is required");
      return;
    }

    for (const section of sections) {
      if (!section.title.trim()) {
        setError("All section titles are required");
        return;
      }
      for (const lesson of section.lessons) {
        if (!lesson.title.trim() || !lesson.file) {
          setError("All lessons need a title and video file");
          return;
        }
      }
    }

    setSaving(true);

    try {
      // Get session and token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Debug logs
      console.log("Session:", session);
      console.log("Token:", token);

      if (!token) {
        setError("Not authenticated. Please log in again.");
        setSaving(false);
        return;
      }

      // Test debug endpoint first
      const debugRes = await fetch("http://localhost:8080/debug/token", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const debugText = await debugRes.text();
      console.log("Debug response:", debugText);

      // 1. Create course
      const courseRes = await fetch("http://localhost:8080/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDescription,
        }),
      });

      console.log("Course response status:", courseRes.status);

      if (!courseRes.ok) {
        const errText = await courseRes.text();
        console.error("Course error:", errText);
        throw new Error(`Failed to create course: ${errText}`);
      }

      const courseData = await courseRes.json();
      console.log("Course data:", courseData);
      const courseId = courseData[0]?.id;

      // 2. Create sections and upload lessons
      for (let si = 0; si < sections.length; si++) {
        const section = sections[si];

        const sectionRes = await fetch("http://localhost:8080/admin/sections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            course_id: courseId,
            title: section.title,
            order_index: si,
          }),
        });

        console.log("Section response status:", sectionRes.status);

        if (!sectionRes.ok) {
          const errText = await sectionRes.text();
          console.error("Section error:", errText);
          throw new Error(`Failed to create section: ${errText}`);
        }

        const sectionData = await sectionRes.json();
        const sectionId = sectionData[0]?.id;

        // 3. Upload lessons
        for (let li = 0; li < section.lessons.length; li++) {
          const lesson = section.lessons[li];
          updateLessonStatus(si, li, "uploading");

          const formData = new FormData();
          formData.append("title", lesson.title);
          formData.append("course_id", courseId);
          formData.append("section_id", sectionId);
          formData.append("order_index", String(li));
          formData.append("video", lesson.file!);

          const lessonRes = await fetch("http://localhost:8080/admin/lessons/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          console.log("Lesson response status:", lessonRes.status);

          if (!lessonRes.ok) {
            const errText = await lessonRes.text();
            console.error("Lesson error:", errText);
            updateLessonStatus(si, li, "error");
            throw new Error(`Failed to upload lesson: ${errText}`);
          }

          updateLessonStatus(si, li, "processing");
        }
      }

      navigate("/admin");
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate("/admin")} style={styles.backBtn}>
          ← Back
        </button>
        <h1 style={styles.title}>Create New Course</h1>
      </div>

      <div style={styles.form}>
        {/* Course Info */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Course Information</h2>

          <label style={styles.label}>Course Title *</label>
          <input
            style={styles.input}
            placeholder="e.g. Complete React Developer Course"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
          />

          <label style={styles.label}>Description</label>
          <textarea
            style={styles.textarea}
            placeholder="What will students learn?"
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            rows={4}
          />
        </div>

        {/* Sections */}
        {sections.map((section, si) => (
          <div key={si} style={styles.card}>
            <h2 style={styles.cardTitle}>Section {si + 1}</h2>

            <label style={styles.label}>Section Title *</label>
            <input
              style={styles.input}
              placeholder="e.g. Getting Started"
              value={section.title}
              onChange={(e) => updateSectionTitle(si, e.target.value)}
            />

            <h3 style={styles.lessonsTitle}>Lessons</h3>

            {section.lessons.map((lesson, li) => (
              <div key={li} style={styles.lessonRow}>
                <div style={styles.lessonHeader}>
                  <span style={styles.lessonNumber}>Lesson {li + 1}</span>
                  <StatusBadge status={lesson.status} />
                </div>

                <label style={styles.label}>Lesson Title *</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Introduction to React"
                  value={lesson.title}
                  onChange={(e) => updateLessonTitle(si, li, e.target.value)}
                />

                <label style={styles.label}>Video File *</label>
                <input
                  type="file"
                  accept="video/*"
                  style={styles.fileInput}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      updateLessonFile(si, li, e.target.files[0]);
                    }
                  }}
                />
                {lesson.file && (
                  <p style={styles.fileName}>📹 {lesson.file.name}</p>
                )}
              </div>
            ))}

            <button onClick={() => addLesson(si)} style={styles.addLessonBtn}>
              + Add Lesson
            </button>
          </div>
        ))}

        <button onClick={addSection} style={styles.addSectionBtn}>
          + Add Section
        </button>

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={styles.submitBtn}
        >
          {saving ? "Creating Course..." : "Create Course"}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Lesson["status"] }) {
  const map: Record<Lesson["status"], { label: string; color: string; bg: string }> = {
    idle: { label: "Pending", color: "#6b7280", bg: "#f3f4f6" },
    uploading: { label: "Uploading...", color: "#d97706", bg: "#fef3c7" },
    processing: { label: "Processing...", color: "#2563eb", bg: "#dbeafe" },
    ready: { label: "Ready", color: "#16a34a", bg: "#dcfce7" },
    error: { label: "Error", color: "#dc2626", bg: "#fee2e2" },
  };

  const s = map[status];
  return (
    <span style={{ ...styles.badge, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f5f7fb", padding: "32px" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" },
  backBtn: { padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "14px" },
  title: { fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0 },
  form: { maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" },
  cardTitle: { fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "20px", marginTop: 0 },
  label: { display: "block", fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "6px" },
  input: { width: "100%", boxSizing: "border-box", padding: "11px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" },
  textarea: { width: "100%", boxSizing: "border-box", padding: "11px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", marginBottom: "16px", resize: "vertical" },
  fileInput: { display: "block", marginBottom: "8px" },
  fileName: { fontSize: "13px", color: "#6b7280", marginBottom: "16px" },
  lessonsTitle: { fontSize: "15px", fontWeight: 600, color: "#374151", marginBottom: "16px" },
  lessonRow: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", marginBottom: "12px" },
  lessonHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" },
  lessonNumber: { fontSize: "14px", fontWeight: 600, color: "#111827" },
  badge: { fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px" },
  addLessonBtn: { padding: "9px 16px", border: "1px dashed #d1d5db", borderRadius: "8px", background: "#fff", cursor: "pointer", fontSize: "14px", color: "#374151", marginTop: "8px" },
  addSectionBtn: { padding: "12px", border: "2px dashed #d1d5db", borderRadius: "10px", background: "#fff", cursor: "pointer", fontSize: "15px", fontWeight: 600, color: "#374151" },
  submitBtn: { padding: "14px", background: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: 700, cursor: "pointer" },
  error: { color: "#dc2626", fontSize: "14px", textAlign: "center" },
};
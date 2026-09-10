import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, videoBucket } from "../../lib/supabase";

interface Lesson {
  title: string;
  file: File | null;
  status: "idle" | "uploading" | "confirming" | "ready" | "error";
  progress: number;
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
    { title: "", lessons: [{ title: "", file: null, status: "idle", progress: 0 }] },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addSection = () => setSections([...sections, { title: "", lessons: [{ title: "", file: null, status: "idle", progress: 0 }] }]);

  const addLesson = (si: number) => {
    const u = [...sections];
    u[si].lessons.push({ title: "", file: null, status: "idle", progress: 0 });
    setSections(u);
  };

  const updateSection = (i: number, title: string) => {
    const u = [...sections]; u[i].title = title; setSections(u);
  };

  const updateLessonTitle = (si: number, li: number, title: string) => {
    const u = [...sections]; u[si].lessons[li].title = title; setSections(u);
  };

  const updateLessonFile = (si: number, li: number, file: File) => {
    const u = [...sections]; u[si].lessons[li].file = file; setSections(u);
  };

  const updateLesson = (si: number, li: number, patch: Partial<Lesson>) => {
    setSections(prev => {
      const u = [...prev];
      u[si].lessons[li] = { ...u[si].lessons[li], ...patch };
      return [...u];
    });
  };

  const handleSubmit = async () => {
    setError("");

    if (!courseTitle.trim()) { setError("Course title is required"); return; }
    for (const s of sections) {
      if (!s.title.trim()) { setError("All section titles are required"); return; }
      for (const l of s.lessons) {
        if (!l.title.trim() || !l.file) { setError("All lessons need a title and video"); return; }
      }
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError("Not authenticated."); setSaving(false); return; }

      // 1. Create course
      const courseRes = await fetch("http://localhost:8080/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: courseTitle, description: courseDescription }),
      });
      if (!courseRes.ok) throw new Error(await courseRes.text());
      const courseData = await courseRes.json();
      const courseId = courseData[0]?.id;

      // 2. Create sections + upload lessons
      for (let si = 0; si < sections.length; si++) {
        const section = sections[si];

        const sectionRes = await fetch("http://localhost:8080/admin/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ course_id: courseId, title: section.title, order_index: si }),
        });
        if (!sectionRes.ok) throw new Error(await sectionRes.text());
        const sectionData = await sectionRes.json();
        const sectionId = sectionData[0]?.id;

        for (let li = 0; li < section.lessons.length; li++) {
          const lesson = section.lessons[li];

          // Step A: Get signed upload URL from Go
          updateLesson(si, li, { status: "uploading", progress: 0 });

          const urlRes = await fetch("http://localhost:8080/admin/videos/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              course_id: courseId,
              section_id: sectionId,
              title: lesson.title,
              order_index: li,
            }),
          });
          if (!urlRes.ok) throw new Error(await urlRes.text());
          const { token: uploadToken, path, lesson_id } = await urlRes.json();

          // Step B: Upload directly to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from(videoBucket)
            .uploadToSignedUrl(path, uploadToken, lesson.file!, {
              contentType: "video/mp4",
            });

          if (uploadError) {
            updateLesson(si, li, { status: "error" });
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          updateLesson(si, li, { status: "confirming", progress: 100 });

          // Step C: Confirm upload to Go → updates lesson status to "ready"
          const confirmRes = await fetch("http://localhost:8080/admin/videos/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lesson_id, video_path: path }),
          });
          if (!confirmRes.ok) throw new Error(await confirmRes.text());

          updateLesson(si, li, { status: "ready" });
        }
      }

      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const statusMap = {
    idle: { label: "Pending", color: "var(--text-muted)", bg: "var(--bg-elevated)" },
    uploading: { label: "Uploading...", color: "var(--warning)", bg: "var(--warning-soft)" },
    confirming: { label: "Confirming...", color: "#378ADD", bg: "rgba(55,138,221,0.15)" },
    ready: { label: "Ready ✓", color: "var(--success)", bg: "var(--success-soft)" },
    error: { label: "Error ✗", color: "var(--error)", bg: "var(--error-soft)" },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button onClick={() => navigate("/admin")} style={s.backBtn}>← Back</button>
        <div>
          <h1 style={s.title}>Create new course</h1>
          <p style={s.subtitle}>Videos upload directly to secure cloud storage</p>
        </div>
      </div>

      <div style={s.form}>
        <div style={s.card}>
          <h2 style={s.cardTitle}>Course information</h2>
          <label style={s.label}>Title *</label>
          <input style={s.input} placeholder="e.g. Complete React Developer Course"
            value={courseTitle} onChange={e => setCourseTitle(e.target.value)}
            onFocus={e => e.target.style.borderColor = "var(--accent)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"} />
          <label style={s.label}>Description</label>
          <textarea style={s.textarea} placeholder="What will students learn?"
            value={courseDescription} onChange={e => setCourseDescription(e.target.value)} rows={3}
            onFocus={(e: any) => e.target.style.borderColor = "var(--accent)"}
            onBlur={(e: any) => e.target.style.borderColor = "var(--border)"} />
        </div>

        {sections.map((section, si) => (
          <div key={si} style={s.card}>
            <div style={s.sectionHead}>
              <h2 style={s.cardTitle}>Section {si + 1}</h2>
              <span style={s.sectionBadge}>{section.lessons.length} lesson{section.lessons.length !== 1 ? "s" : ""}</span>
            </div>
            <label style={s.label}>Section title *</label>
            <input style={s.input} placeholder="e.g. Getting Started"
              value={section.title} onChange={e => updateSection(si, e.target.value)}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"} />

            <div style={s.lessonsWrap}>
              {section.lessons.map((lesson, li) => {
                const st = statusMap[lesson.status];
                return (
                  <div key={li} style={s.lessonCard}>
                    <div style={s.lessonHead}>
                      <span style={s.lessonNum}>Lesson {li + 1}</span>
                      <span style={{ ...s.badge, color: st.color, background: st.bg }}>{st.label}</span>
                    </div>
                    {lesson.status === "uploading" && (
                      <div style={s.progressBar}>
                        <div style={{ ...s.progressFill, width: `${lesson.progress}%` }} />
                      </div>
                    )}
                    <label style={s.label}>Lesson title *</label>
                    <input style={s.input} placeholder="e.g. Introduction"
                      value={lesson.title} onChange={e => updateLessonTitle(si, li, e.target.value)}
                      onFocus={e => e.target.style.borderColor = "var(--accent)"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"} />
                    <label style={s.label}>Video file *</label>
                    <label style={s.fileLabel}>
                      <input type="file" accept="video/mp4,video/*" style={{ display: "none" }}
                        onChange={e => { if (e.target.files?.[0]) updateLessonFile(si, li, e.target.files[0]); }} />
                      <span style={s.fileBtn}>Choose file</span>
                      <span style={s.fileName}>{lesson.file ? lesson.file.name : "No file chosen"}</span>
                    </label>
                  </div>
                );
              })}
            </div>
            <button onClick={() => addLesson(si)} style={s.addLessonBtn}>+ Add lesson</button>
          </div>
        ))}

        <button onClick={addSection} style={s.addSectionBtn}>+ Add section</button>
        {error && <div style={s.error}>{error}</div>}
        <button onClick={handleSubmit} disabled={saving} style={s.submitBtn}>
          {saving ? "Creating course..." : "Create course"}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "var(--bg-primary)", padding: "28px" },
  header: { display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px", maxWidth: "760px", margin: "0 auto 28px" },
  backBtn: { padding: "8px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer", flexShrink: 0 },
  title: { fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" },
  subtitle: { fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" },
  form: { maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" },
  card: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "24px" },
  cardTitle: { fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "20px" },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" },
  sectionBadge: { fontSize: "12px", color: "var(--accent)", background: "var(--accent-soft)", padding: "3px 10px", borderRadius: "20px" },
  label: { display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" },
  input: { width: "100%", padding: "10px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "14px", marginBottom: "16px", outline: "none", transition: "border-color 0.2s" },
  textarea: { width: "100%", padding: "10px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "14px", marginBottom: "16px", outline: "none", resize: "vertical", transition: "border-color 0.2s" },
  lessonsWrap: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" },
  lessonCard: { background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "16px" },
  lessonHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" },
  lessonNum: { fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" },
  badge: { fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px" },
  progressBar: { height: "4px", background: "var(--bg-elevated)", borderRadius: "2px", marginBottom: "14px", overflow: "hidden" },
  progressFill: { height: "100%", background: "var(--accent)", borderRadius: "2px", transition: "width 0.3s" },
  fileLabel: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  fileBtn: { padding: "7px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-secondary)", flexShrink: 0 },
  fileName: { fontSize: "13px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  addLessonBtn: { padding: "9px 16px", background: "transparent", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", width: "100%" },
  addSectionBtn: { padding: "14px", background: "transparent", border: "2px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-muted)", fontSize: "14px", fontWeight: 500, cursor: "pointer" },
  error: { background: "var(--error-soft)", border: "1px solid var(--error)", color: "var(--error)", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: "13px" },
  submitBtn: { padding: "14px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius-md)", fontSize: "15px", fontWeight: 700, cursor: "pointer", border: "none" },
};
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      navigate("/dashboard");
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) setError(error.message);
    } catch { setError("Google login failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.bg} />
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoIcon}>▶</span>
          <span style={s.logoText}>LearnHub</span>
        </div>

        <h1 style={s.title}>Welcome back</h1>
        <p style={s.subtitle}>Sign in to continue your learning journey</p>

        <button onClick={handleGoogleLogin} disabled={loading} style={s.googleBtn}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14z"/>
            <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.56-2.56A8 8 0 0 0 1.83 5.43L4.5 7.5a4.77 4.77 0 0 1 4.48-3.92z"/>
          </svg>
          Continue with Google
        </button>

        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>or</span>
          <div style={s.dividerLine} />
        </div>

        <form onSubmit={handleLogin}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={s.input}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={s.input}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={loading} style={s.submitBtn}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={s.footer}>
          Don't have an account?{" "}
          <Link to="/signup" style={s.link}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", padding: "20px", position: "relative", overflow: "hidden" },
  bg: { position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(164,53,240,0.15) 0%, transparent 60%)", pointerEvents: "none" },
  card: { width: "100%", maxWidth: "400px", background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-lg)", padding: "40px", boxShadow: "var(--shadow-lg)", animation: "fadeIn 0.4s ease", position: "relative", zIndex: 1 },
  logo: { display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "28px" },
  logoIcon: { width: "32px", height: "32px", background: "var(--accent)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff" },
  logoText: { fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" },
  title: { fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", textAlign: "center", marginBottom: "8px" },
  subtitle: { fontSize: "14px", color: "var(--text-secondary)", textAlign: "center", marginBottom: "28px" },
  googleBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "11px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "14px", fontWeight: 500, transition: "all 0.2s", marginBottom: "20px" },
  divider: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" },
  dividerLine: { flex: 1, height: "1px", background: "var(--border)" },
  dividerText: { fontSize: "12px", color: "var(--text-muted)" },
  field: { marginBottom: "16px" },
  label: { display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" },
  input: { width: "100%", padding: "11px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "14px", transition: "border-color 0.2s", outline: "none" },
  error: { background: "var(--error-soft)", border: "1px solid var(--error)", color: "var(--error)", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: "13px", marginBottom: "16px" },
  submitBtn: { width: "100%", padding: "12px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: 600, transition: "background 0.2s", marginTop: "4px" },
  footer: { textAlign: "center", marginTop: "24px", fontSize: "13px", color: "var(--text-muted)" },
  link: { color: "var(--accent)", fontWeight: 500 },
};
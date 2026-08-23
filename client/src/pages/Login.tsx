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
      if (error) {
        setError(error.message);
        return;
      }
      navigate("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
    } catch {
      setError("Google login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>📚 LearnHub</div>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to continue learning.</p>

        <form onSubmit={handleLogin}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          <button type="submit" disabled={loading} style={styles.loginButton}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={styles.divider}><span>OR</span></div>

        <button onClick={handleGoogleLogin} disabled={loading} style={styles.googleButton}>
          <span style={styles.googleIcon}>G</span>
          Continue with Google
        </button>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.footer}>
          Don't have an account?{" "}
          <Link to="/signup" style={styles.link}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f5f7fb", padding: "20px" },
  card: { width: "100%", maxWidth: "420px", background: "#ffffff", padding: "40px", borderRadius: "14px", boxShadow: "0 10px 35px rgba(0,0,0,0.08)" },
  logo: { textAlign: "center", fontSize: "26px", fontWeight: 700, marginBottom: "24px" },
  title: { textAlign: "center", margin: 0, fontSize: "28px", fontWeight: 700, color: "#111827" },
  subtitle: { textAlign: "center", color: "#6b7280", marginBottom: "28px", marginTop: "8px" },
  label: { display: "block", marginBottom: "7px", fontSize: "14px", fontWeight: 600, color: "#374151" },
  input: { width: "100%", boxSizing: "border-box", padding: "13px", marginBottom: "18px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px" },
  loginButton: { width: "100%", padding: "13px", border: "none", borderRadius: "8px", background: "#111827", color: "#ffffff", fontSize: "15px", fontWeight: 600, cursor: "pointer" },
  divider: { textAlign: "center", margin: "24px 0", color: "#9ca3af", fontSize: "13px" },
  googleButton: { width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#ffffff", fontSize: "15px", fontWeight: 600, cursor: "pointer" },
  googleIcon: { marginRight: "10px", fontWeight: 700 },
  error: { color: "#dc2626", textAlign: "center", marginTop: "16px", fontSize: "14px" },
  footer: { textAlign: "center", marginTop: "24px", fontSize: "14px", color: "#6b7280" },
  link: { color: "#2563eb", textDecoration: "none", fontWeight: 600 },
};
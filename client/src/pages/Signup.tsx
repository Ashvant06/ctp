import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      console.log("Signup user:", data.user);

      /*
       * If email confirmation is enabled in Supabase,
       * the user needs to verify their email before logging in.
       */
      if (!data.session) {
        setMessage(
          "Account created. Please check your email to verify your account."
        );
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      console.error("Google signup error:", err);
      setError("Google sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logo}>LearnHub</div>

        {/* Heading */}
        <h1 style={styles.title}>Create your account</h1>

        <p style={styles.subtitle}>
          Start your learning journey today.
        </p>

        {/* Form */}
        <form onSubmit={handleSignup}>

          {/* Name */}
          <label style={styles.label}>Full name</label>

          <input
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={styles.input}
          />

          {/* Email */}
          <label style={styles.label}>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          {/* Password */}
          <label style={styles.label}>Password</label>

          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          {/* Confirm Password */}
          <label style={styles.label}>Confirm password</label>

          <input
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={styles.input}
          />

          {/* Signup */}
          <button
            type="submit"
            disabled={loading}
            style={styles.signupButton}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <span>OR</span>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          style={styles.googleButton}
        >
          <span style={styles.googleIcon}>G</span>
          Continue with Google
        </button>

        {/* Error */}
        {error && (
          <p style={styles.error}>
            {error}
          </p>
        )}

        {/* Success */}
        {message && (
          <p style={styles.success}>
            {message}
          </p>
        )}

        {/* Login */}
        <p style={styles.footer}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>

        {/* Terms */}
        <p style={styles.terms}>
          By creating an account, you agree to our{" "}
          <span style={styles.termsLink}>Terms of Service</span>{" "}
          and{" "}
          <span style={styles.termsLink}>Privacy Policy</span>.
        </p>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fb",
    padding: "20px",
  },

  card: {
    width: "100%",
    maxWidth: "430px",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "14px",
    boxShadow: "0 10px 35px rgba(0, 0, 0, 0.08)",
  },

  logo: {
    textAlign: "center",
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "25px",
  },

  title: {
    textAlign: "center",
    margin: 0,
    fontSize: "30px",
    fontWeight: 700,
    color: "#111827",
  },

  subtitle: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: "10px",
    marginBottom: "30px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#374151",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    marginBottom: "18px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    outline: "none",
  },

  signupButton: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#111827",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },

  divider: {
    textAlign: "center",
    margin: "24px 0",
    color: "#9ca3af",
    fontSize: "13px",
  },

  googleButton: {
    width: "100%",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#111827",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },

  googleIcon: {
    display: "inline-block",
    marginRight: "10px",
    fontWeight: 700,
    fontSize: "17px",
  },

  error: {
    color: "#dc2626",
    textAlign: "center",
    marginTop: "20px",
    fontSize: "14px",
  },

  success: {
    color: "#16a34a",
    textAlign: "center",
    marginTop: "20px",
    fontSize: "14px",
  },

  footer: {
    textAlign: "center",
    marginTop: "25px",
    fontSize: "14px",
    color: "#6b7280",
  },

  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 600,
  },

  terms: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "12px",
    lineHeight: 1.5,
    color: "#9ca3af",
  },

  termsLink: {
    color: "#6b7280",
  },
};
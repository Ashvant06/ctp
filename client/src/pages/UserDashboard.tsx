import { useAuth } from "../context/AuthContext";

export default function UserDashboard() {
  const { user, logout } = useAuth();

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
        <div style={styles.emptyState}>
          No courses available yet. Check back soon!
        </div>
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
  sectionTitle: { fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "16px" },
  emptyState: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "60px", textAlign: "center", color: "#9ca3af", fontSize: "15px" },
};
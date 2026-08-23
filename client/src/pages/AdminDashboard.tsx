import { useState } from "react";
import { useAuth } from "../context/AuthContext";

type NavItem = "overview" | "courses" | "users";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState<NavItem>("overview");

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>📚 Crack The Pattern</div>

        <nav style={styles.nav}>
          {(["overview", "courses", "users"] as NavItem[]).map((item) => (
            <button
              key={item}
              onClick={() => setActiveNav(item)}
              style={{
                ...styles.navItem,
                ...(activeNav === item ? styles.navItemActive : {}),
              }}
            >
              {item === "overview" && "📊 "}
              {item === "courses" && "🎓 "}
              {item === "users" && "👥 "}
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </nav>

        <button onClick={logout} style={styles.logoutBtn}>
          🚪 Logout
        </button>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <h1 style={styles.pageTitle}>
            {activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}
          </h1>
          <div style={styles.topbarRight}>
            <span style={styles.adminBadge}>Admin</span>
            <span style={styles.userName}>
              {user?.user_metadata?.full_name ?? user?.email}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeNav === "overview" && <Overview />}
          {activeNav === "courses" && <Courses />}
          {activeNav === "users" && <Users />}
        </div>
      </main>
    </div>
  );
}

function Overview() {
  const stats = [
    { label: "Total Courses", value: "0", icon: "🎓" },
    { label: "Total Users", value: "0", icon: "👥" },
    { label: "Total Lessons", value: "0", icon: "📹" },
  ];

  return (
    <div>
      <div style={styles.statsGrid}>
        {stats.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <span style={styles.statIcon}>{s.icon}</span>
            <span style={styles.statValue}>{s.value}</span>
            <span style={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Activity</h2>
        <div style={styles.emptyState}>
          No recent activity yet.
        </div>
      </div>
    </div>
  );
}

function Courses() {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Courses</h2>
        <button style={styles.primaryBtn}>+ New Course</button>
      </div>
      <div style={styles.emptyState}>
        No courses yet. Create your first course.
      </div>
    </div>
  );
}

function Users() {
  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Users</h2>
      <div style={styles.emptyState}>
        No users found.
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: { display: "flex", minHeight: "100vh", background: "#f5f7fb" },

  // Sidebar
  sidebar: { width: "240px", background: "#111827", display: "flex", flexDirection: "column", padding: "24px 16px", position: "fixed", top: 0, left: 0, height: "100vh" },
  sidebarLogo: { color: "#ffffff", fontSize: "20px", fontWeight: 700, marginBottom: "36px", paddingLeft: "8px" },
  nav: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
  navItem: { textAlign: "left", padding: "10px 12px", borderRadius: "8px", border: "none", background: "transparent", color: "#9ca3af", fontSize: "14px", fontWeight: 500, cursor: "pointer" },
  navItemActive: { background: "#1f2937", color: "#ffffff" },
  logoutBtn: { textAlign: "left", padding: "10px 12px", borderRadius: "8px", border: "none", background: "transparent", color: "#6b7280", fontSize: "14px", cursor: "pointer" },

  // Main
  main: { marginLeft: "240px", flex: 1, display: "flex", flexDirection: "column" },
  topbar: { background: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
  pageTitle: { fontSize: "20px", fontWeight: 700, color: "#111827", margin: 0 },
  topbarRight: { display: "flex", alignItems: "center", gap: "12px" },
  adminBadge: { background: "#111827", color: "#ffffff", fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px" },
  userName: { fontSize: "14px", color: "#6b7280", fontWeight: 500 },

  // Content
  content: { padding: "32px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "32px" },
  statCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
  statIcon: { fontSize: "28px" },
  statValue: { fontSize: "32px", fontWeight: 700, color: "#111827" },
  statLabel: { fontSize: "13px", color: "#6b7280" },

  // Section
  section: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" },
  sectionTitle: { fontSize: "17px", fontWeight: 700, color: "#111827", margin: 0 },
  primaryBtn: { padding: "9px 18px", background: "#111827", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
  emptyState: { textAlign: "center", padding: "48px", color: "#9ca3af", fontSize: "15px" },
};
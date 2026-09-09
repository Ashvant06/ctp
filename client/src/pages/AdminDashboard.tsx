import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type NavItem = "overview" | "courses" | "users";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<NavItem>("overview");
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: "overview", label: "Overview", icon: "⊞" },
    { id: "courses", label: "Courses", icon: "▶" },
    { id: "users", label: "Users", icon: "◎" },
  ];

  return (
    <div style={s.layout}>
      {/* Sidebar */}
      <aside style={{ ...s.sidebar, width: collapsed ? "64px" : "220px" }}>
        <div style={s.sidebarHeader}>
          {!collapsed && (
            <div style={s.logo}>
              <span style={s.logoIcon}>▶</span>
              <span style={s.logoText}>CTP Learner</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={s.collapseBtn}>
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav style={s.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id as NavItem)}
              style={{
                ...s.navItem,
                background: activeNav === item.id ? "var(--accent-soft)" : "transparent",
                color: activeNav === item.id ? "var(--accent)" : "var(--text-secondary)",
                borderLeft: activeNav === item.id ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.userInfo}>
            <div style={s.avatar}>
              {user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? "A"}
            </div>
            {!collapsed && (
              <div style={s.userMeta}>
                <div style={s.userName}>{user?.user_metadata?.full_name ?? "Admin"}</div>
                <div style={s.userRole}>Administrator</div>
              </div>
            )}
          </div>
          <button onClick={logout} style={s.logoutBtn} title="Logout">⎋</button>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <h1 style={s.pageTitle}>
              {navItems.find(n => n.id === activeNav)?.label}
            </h1>
            <p style={s.pageSub}>
              {activeNav === "overview" && "Platform statistics and recent activity"}
              {activeNav === "courses" && "Manage your course catalog"}
              {activeNav === "users" && "Manage registered users"}
            </p>
          </div>
          <span style={s.adminBadge}>Admin</span>
        </div>

        <div style={s.content}>
          {activeNav === "overview" && <Overview />}
          {activeNav === "courses" && <Courses navigate={navigate} />}
          {activeNav === "users" && <Users />}
        </div>
      </main>
    </div>
  );
}

function Overview() {
  const stats = [
    { label: "Total Courses", value: "0", icon: "▶", color: "#a435f0" },
    { label: "Total Users", value: "0", icon: "◎", color: "#00b894" },
    { label: "Total Lessons", value: "0", icon: "⊞", color: "#f39c12" },
    { label: "Hours Watched", value: "0", icon: "◷", color: "#e55039" },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={os.grid}>
        {stats.map(s => (
          <div key={s.label} style={os.card}>
            <div style={{ ...os.icon, background: s.color + "20", color: s.color }}>{s.icon}</div>
            <div style={os.value}>{s.value}</div>
            <div style={os.label}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={os.section}>
        <h2 style={os.sectionTitle}>Recent activity</h2>
        <div style={os.empty}>
          <div style={os.emptyIcon}>◎</div>
          <p style={os.emptyText}>No activity yet</p>
          <p style={os.emptySubText}>Activity will appear here once users start engaging</p>
        </div>
      </div>
    </div>
  );
}

function Courses({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={os.section}>
        <div style={os.sectionHeader}>
          <h2 style={os.sectionTitle}>Your courses</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => navigate("/admin/courses")} style={os.secondaryBtn}>
              Manage all
            </button>
            <button onClick={() => navigate("/admin/courses/create")} style={os.primaryBtn}>
              + New course
            </button>
          </div>
        </div>
        <div style={os.empty}>
          <div style={os.emptyIcon}>▶</div>
          <p style={os.emptyText}>No courses yet</p>
          <p style={os.emptySubText}>Create your first course to get started</p>
          <button onClick={() => navigate("/admin/courses/create")} style={{ ...os.primaryBtn, marginTop: "16px" }}>
            Create course
          </button>
        </div>
      </div>
    </div>
  );
}

function Users() {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={os.section}>
        <h2 style={os.sectionTitle}>Registered users</h2>
        <div style={os.empty}>
          <div style={os.emptyIcon}>◎</div>
          <p style={os.emptyText}>No users yet</p>
          <p style={os.emptySubText}>Users will appear here after they sign up</p>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  layout: { display: "flex", minHeight: "100vh", background: "var(--bg-primary)" },
  sidebar: { background: "var(--bg-secondary)", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column", transition: "width 0.2s ease", flexShrink: 0, overflow: "hidden" },
  sidebarHeader: { padding: "20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-light)" },
  logo: { display: "flex", alignItems: "center", gap: "10px" },
  logoIcon: { width: "28px", height: "28px", background: "var(--accent)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#fff", flexShrink: 0 },
  logoText: { fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" },
  collapseBtn: { background: "transparent", color: "var(--text-muted)", fontSize: "16px", padding: "4px", borderRadius: "4px", flexShrink: 0 },
  nav: { flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: "2px" },
  navItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: 500, transition: "all 0.15s", textAlign: "left", whiteSpace: "nowrap", overflow: "hidden" },
  navIcon: { fontSize: "16px", flexShrink: 0 },
  sidebarFooter: { padding: "16px", borderTop: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: "10px" },
  userInfo: { display: "flex", alignItems: "center", gap: "10px", flex: 1, overflow: "hidden" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0 },
  userMeta: { overflow: "hidden" },
  userName: { fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { fontSize: "11px", color: "var(--accent)" },
  logoutBtn: { background: "transparent", color: "var(--text-muted)", fontSize: "18px", padding: "4px", flexShrink: 0 },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar: { background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" },
  pageSub: { fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" },
  adminBadge: { background: "var(--accent-soft)", color: "var(--accent)", fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(164,53,240,0.3)" },
  content: { flex: 1, padding: "28px", overflowY: "auto" },
};

const os: Record<string, React.CSSProperties> = {
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" },
  card: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" },
  icon: { width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" },
  value: { fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" },
  label: { fontSize: "13px", color: "var(--text-muted)" },
  section: { background: "var(--bg-secondary)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "24px" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" },
  sectionTitle: { fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: "8px" },
  emptyIcon: { fontSize: "32px", color: "var(--text-muted)", marginBottom: "8px" },
  emptyText: { fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)" },
  emptySubText: { fontSize: "13px", color: "var(--text-muted)", textAlign: "center" },
  primaryBtn: { padding: "9px 18px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer" },
  secondaryBtn: { padding: "9px 18px", background: "transparent", color: "var(--text-secondary)", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: 500, border: "1px solid var(--border)", cursor: "pointer" },
};
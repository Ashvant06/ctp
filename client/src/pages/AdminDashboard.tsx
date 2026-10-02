import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { API_URL } from "../lib/api";
import "./AdminDashboard.css";

type NavItem = "overview" | "courses" | "playlists" | "users";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<NavItem>("overview");
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: "overview", label: "Overview", icon: "⊞" },
    { id: "courses", label: "Courses", icon: "▶" },
    { id: "playlists", label: "Playlists", icon: "▣" },
    { id: "users", label: "Users", icon: "◎" },
  ] as const;

  return (
    <div className="admin-dashboard" style={s.layout}>
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ ...s.sidebar, width: collapsed ? "64px" : "220px" }}>
        <div className="admin-sidebar-header" style={s.sidebarHeader}>
          {!collapsed && (
            <div style={s.logo}>
              <span style={s.logoIcon}>▶</span>
              <span style={s.logoText}>CTP Learner</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={s.collapseBtn}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="admin-nav" style={s.nav}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id as NavItem)}
              style={{
                ...s.navItem,
                background:
                  activeNav === item.id ? "var(--accent-soft)" : "transparent",
                color:
                  activeNav === item.id
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                borderLeft:
                  activeNav === item.id
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
              }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer" style={s.sidebarFooter}>
          <div style={s.userInfo}>
            <div style={s.avatar}>
              {user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? "A"}
            </div>
            {!collapsed && (
              <div style={s.userMeta}>
                <div style={s.userName}>
                  {user?.user_metadata?.full_name ?? "Admin"}
                </div>
                <div style={s.userRole}>Administrator</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main" style={s.main}>
        <div className="admin-topbar" style={s.topbar}>
          <div style={s.pageHeading}>
            <h1 style={s.pageTitle}>
              {navItems.find((n) => n.id === activeNav)?.label}
            </h1>
            <p style={s.pageSub}>
              {activeNav === "overview" &&
                "Platform statistics and recent activity"}
              {activeNav === "courses" && "Manage your course catalog"}
              {activeNav === "playlists" && "Manage your content library"}
              {activeNav === "users" && "Manage registered users"}
            </p>
          </div>
          <div style={s.topbarActions}>
            <span style={s.adminBadge}>Admin</span>
            <button
              onClick={logout}
              style={s.logoutBtn}
              title="Log out"
              aria-label="Log out"
            >
              <span aria-hidden="true">⎋</span>
              <span>Log out</span>
            </button>
          </div>
        </div>

        <div className="admin-content" style={s.content}>
          {activeNav === "overview" && <Overview navigate={navigate} />}
          {activeNav === "courses" && <Courses navigate={navigate} />}
          {activeNav === "playlists" && <Playlists navigate={navigate} />}
          {activeNav === "users" && <Users />}
        </div>
      </main>
    </div>
  );
}

interface DashboardData {
  course_count: number;
  lesson_count: number;
  user_count: number;
  watch_seconds: number | null;
  recent_courses: { id: string; title: string; created_at: string }[];
}

function Overview({ navigate }: { navigate: (path: string) => void }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Not authenticated.");

        const response = await fetch(`${API_URL}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load dashboard data.");
        }
        const data = await response.json() as DashboardData;
        if (active) setDashboard(data);
      } catch (err: unknown) {
        if (active) {
          setStatsError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const stats = [
    { label: "Total Courses", value: dashboard?.course_count ?? "—", icon: "▶", color: "#a435f0" },
    { label: "Total Users", value: dashboard?.user_count ?? "—", icon: "◎", color: "#00b894" },
    { label: "Total Lessons", value: dashboard?.lesson_count ?? "—", icon: "⊞", color: "#f39c12" },
    {
      label: "Hours Watched",
      value: dashboard?.watch_seconds == null
        ? "—"
        : (dashboard.watch_seconds / 3600).toFixed(1),
      icon: "◷",
      color: "#e55039",
    },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div className="dashboard-stats" style={os.grid}>
        {stats.map((s) => (
          <div key={s.label} style={os.card}>
            <div
              style={{ ...os.icon, background: s.color + "20", color: s.color }}
            >
              {s.icon}
            </div>
            <div style={os.value}>{s.value}</div>
            <div style={os.label}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="dashboard-section" style={os.section}>
        <div style={os.sectionHeader}>
          <h2 style={os.sectionTitle}>Recently added courses</h2>
          <button onClick={() => navigate("/admin/courses")} style={os.secondaryBtn}>Manage courses</button>
        </div>
        {statsError ? (
          <p role="alert" style={os.statsError}>Could not load dashboard data: {statsError}</p>
        ) : dashboard?.recent_courses.length ? (
          <div style={os.recentList}>
            {dashboard.recent_courses.map(course => (
              <div key={course.id} style={os.recentRow}>
                <span style={os.recentTitle}>{course.title}</span>
                <span style={os.recentDate}>{new Date(course.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={os.empty}>
            <div style={os.emptyIcon}>▶</div>
            <p style={os.emptyText}>{dashboard ? "No courses have been added yet" : "Loading courses..."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Courses({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={os.section}>
        <div style={os.sectionHeader}>
          <h2 style={os.sectionTitle}>Courses</h2>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => navigate("/admin/courses")}
              style={os.secondaryBtn}
            >
              Manage courses
            </button>
            <button
              onClick={() => navigate("/admin/courses/create")}
              style={os.primaryBtn}
            >
              + New course
            </button>
          </div>
        </div>
        <div style={os.empty}>
          <div style={os.emptyIcon}>▶</div>
          <p style={os.emptyText}>
            Click "Manage courses" to view and manage your curriculum
          </p>
        </div>
      </div>
    </div>
  );
}

function Playlists({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={os.section}>
        <div style={os.sectionHeader}>
          <h2 style={os.sectionTitle}>Playlists</h2>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => navigate("/admin/playlists")}
              style={os.secondaryBtn}
            >
              Manage playlists
            </button>
            <button
              onClick={() => navigate("/admin/playlists/create")}
              style={os.primaryBtn}
            >
              + New playlist
            </button>
          </div>
        </div>
        <div style={os.empty}>
          <div style={os.emptyIcon}>▣</div>
          <p style={os.emptyText}>
            Click "Manage playlists" to view and manage your content
          </p>
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
          <p style={os.emptySubText}>
            Users will appear here after they sign up
          </p>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "var(--bg-primary)",
  },
  sidebar: {
    background: "var(--bg-secondary)",
    borderRight: "1px solid var(--border-light)",
    display: "flex",
    flexDirection: "column",
    transition: "width 0.2s ease",
    flexShrink: 0,
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "20px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid var(--border-light)",
  },
  logo: { display: "flex", alignItems: "center", gap: "10px" },
  logoIcon: {
    width: "28px",
    height: "28px",
    background: "var(--accent)",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    color: "#fff",
    flexShrink: 0,
  },
  logoText: {
    fontSize: "16px",
    fontWeight: 700,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
  },
  collapseBtn: {
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: "16px",
    padding: "4px",
    borderRadius: "4px",
    flexShrink: 0,
  },
  nav: {
    flex: 1,
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.15s",
    textAlign: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  navIcon: { fontSize: "16px", flexShrink: 0 },
  sidebarFooter: {
    padding: "16px",
    borderTop: "1px solid var(--border-light)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    overflow: "hidden",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "var(--accent)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    flexShrink: 0,
  },
  userMeta: { overflow: "hidden" },
  userName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userRole: { fontSize: "11px", color: "var(--accent)" },
  logoutBtn: {
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 600,
    padding: "8px 12px",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-sm)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    flexShrink: 0,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topbar: {
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border-light)",
    padding: "20px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  pageHeading: { flex: "1 1 180px", minWidth: 0 },
  topbarActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    flex: "0 0 auto",
  },
  pageTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  pageSub: { fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" },
  adminBadge: {
    background: "var(--accent-soft)",
    color: "var(--accent)",
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: "20px",
    border: "1px solid rgba(164,53,240,0.3)",
  },
  content: { flex: 1, padding: "28px", overflowY: "auto" },
};

const os: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  card: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  icon: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },
  value: { fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" },
  label: { fontSize: "13px", color: "var(--text-muted)" },
  statsError: { color: "var(--error)", fontSize: "13px", marginBottom: "20px" },
  section: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    padding: "24px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  recentList: { display: "flex", flexDirection: "column" },
  recentRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "14px 0",
    borderTop: "1px solid var(--border-light)",
  },
  recentTitle: { color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 },
  recentDate: { color: "var(--text-muted)", fontSize: "12px", flexShrink: 0 },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 24px",
    gap: "8px",
  },
  emptyIcon: {
    fontSize: "32px",
    color: "var(--text-muted)",
    marginBottom: "8px",
  },
  emptyText: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  emptySubText: {
    fontSize: "13px",
    color: "var(--text-muted)",
    textAlign: "center",
  },
  primaryBtn: {
    padding: "9px 18px",
    background: "var(--accent)",
    color: "#fff",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "9px 18px",
    background: "transparent",
    color: "var(--text-secondary)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontWeight: 500,
    border: "1px solid var(--border)",
    cursor: "pointer",
  },
};

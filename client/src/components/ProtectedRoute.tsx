import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: string;
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fb",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #111827",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
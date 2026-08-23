import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) return null;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/home" replace />;
}
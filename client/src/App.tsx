import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import CreateCourse from "./pages/admin/CreateCourse";
import ManageCourses from "./pages/admin/ManageCourses";
import ManagePlaylists from "./pages/admin/ManagePlaylist";
import CreatePlaylist from "./pages/admin/CreatePlaylist";
import EditPlaylist from "./pages/admin/EditPlaylist";
import CoursePage from "./pages/user/CoursePage";
import PlaylistPage from "./pages/user/PlaylistPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute allowedRole="admin"><ManageCourses /></ProtectedRoute>} />
          <Route path="/admin/courses/create" element={<ProtectedRoute allowedRole="admin"><CreateCourse /></ProtectedRoute>} />
          <Route path="/admin/playlists" element={<ProtectedRoute allowedRole="admin"><ManagePlaylists /></ProtectedRoute>} />
          <Route path="/admin/playlists/create" element={<ProtectedRoute allowedRole="admin"><CreatePlaylist /></ProtectedRoute>} />
          <Route path="/admin/playlists/:id/edit" element={<ProtectedRoute allowedRole="admin"><EditPlaylist /></ProtectedRoute>} />

          {/* User */}
          <Route path="/home" element={<ProtectedRoute allowedRole="user"><UserDashboard /></ProtectedRoute>} />
          <Route path="/course/:id" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />
          <Route path="/playlist/:id" element={<ProtectedRoute><PlaylistPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
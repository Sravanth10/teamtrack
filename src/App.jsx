import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import AdminDashboard from './pages/AdminDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import TeamSpace from './pages/TeamSpace'
import VerifyOTP from './pages/VerifyOTP'
import TasksArchive from './pages/TasksArchive'
import SelectTeamView from './pages/SelectTeamView'
import NoTeamView from './pages/NoTeamView'
import PendingApprovalView from './pages/PendingApprovalView'
import RejectedView from './pages/RejectedView'
import RootRedirector from './routes/RootRedirector'
import BasicProtectedRoute from './routes/BasicProtectedRoute'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'
import SupervisorRoute from './routes/SupervisorRoute'
import UpdatePopup from './components/UpdatePopup'
import InstructionsPopup from './components/InstructionsPopup'

function App() {
  return (
    <AuthProvider>
      <Router>
        <InstructionsPopup />
        <UpdatePopup />
        <Routes>
          {/* Public login/register page */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Secure TOTP screen */}
          <Route path="/verify-otp" element={<VerifyOTP />} />

          {/* Special view for pending and rejected registrations */}
          <Route
            path="/pending-approval"
            element={
              <BasicProtectedRoute>
                <PendingApprovalView />
              </BasicProtectedRoute>
            }
          />
          <Route
            path="/rejected"
            element={
              <BasicProtectedRoute>
                <RejectedView />
              </BasicProtectedRoute>
            }
          />

          {/* Special view for unassigned members */}
          <Route
            path="/no-team"
            element={
              <ProtectedRoute>
                <NoTeamView />
              </ProtectedRoute>
            }
          />

          {/* Team Selection for users assigned to multiple teams */}
          <Route
            path="/select-team"
            element={
              <ProtectedRoute>
                <SelectTeamView />
              </ProtectedRoute>
            }
          />

          {/* Supervisor Dashboard */}
          <Route
            path="/supervisor"
            element={
              <SupervisorRoute>
                <SupervisorDashboard />
              </SupervisorRoute>
            }
          />

          {/* Supervisor entering a specific lab (renders AdminDashboard in lab context) */}
          <Route
            path="/supervisor/lab/:labId"
            element={
              <SupervisorRoute>
                <AdminDashboard />
              </SupervisorRoute>
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Team Workspace Board */}
          <Route
            path="/team/:teamId"
            element={
              <ProtectedRoute>
                <TeamSpace />
              </ProtectedRoute>
            }
          />

          {/* Tasks Category Archive */}
          <Route
            path="/team/:teamId/archive/:category"
            element={
              <ProtectedRoute>
                <TasksArchive />
              </ProtectedRoute>
            }
          />

          {/* Root Redirect handler */}
          <Route path="/" element={<RootRedirector />} />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

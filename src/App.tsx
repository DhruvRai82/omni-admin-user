import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import Chat from "./pages/Chat";
import AdminApps from "./pages/admin/Apps";
import UserDashboard from "./pages/user/UserDashboard";
import Projects from "./pages/user/Projects";
import ProjectDetail from "./pages/user/ProjectDetail";
import TestPlans from "./pages/user/TestPlans";
import TestSuites from "./pages/user/TestSuites";
import TestCases from "./pages/user/TestCases";
import TestCaseDetail from "./pages/user/TestCaseDetail";
import UserApps from "./pages/user/UserApps";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="chat" element={<Chat />} />
              <Route path="apps" element={<AdminApps />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* User Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireRole="user">
                  <UserLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserDashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="projects/:id/test-plans" element={<TestPlans />} />
              <Route path="projects/:id/test-plans/:planId" element={<TestSuites />} />
              <Route path="projects/:id/test-plans/:planId/suites/:suiteId" element={<TestCases />} />
              <Route path="projects/:id/test-plans/:planId/suites/:suiteId/cases/:caseId" element={<TestCaseDetail />} />
              <Route path="chat" element={<Chat />} />
              <Route path="apps" element={<UserApps />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

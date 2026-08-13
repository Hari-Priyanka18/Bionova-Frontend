import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/colors.css";
import "./styles/mobile-responsive.css"; // Added global mobile responsive styles

const ScrollToTop = () => {
  const { pathname, search, state } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const scrollContainers = document.querySelectorAll('.cc-shell, .cc-main, .proj-shell, .proj-main, .main-content, .ud-main, .cit-container, .cit-card');
    scrollContainers.forEach(el => { if (el) el.scrollTop = 0; });
  }, [pathname, search, state]);
  return null;
};

import Login from "./components/Login";
import AdminDashboard from "./components/Projectmanager/AdminDashboard";
import UserDashboard from "./components/Projectmanager/UserDashboard"; // New User Dashboard
import ProjectManagerDashboard from "./components/Projectmanager/ProjectManagerDashboard";
import CompanyCreation from "./components/Admin/CompanyMaster";
import PlantCreation from "./components/Admin/PlantMaster";
import AgriLandAllocation from "./components/Admin/LandMaster";
import DepartmentMapping from "./components/Admin/DepartmentMapping";
import DesignationCreation from "./components/Admin/DesignationMaster";
import Projects from "./components/User/Projects";
import Calendar from "./components/User/Calendar";
import UserTaskBoard from "./components/User/UserTaskBoard";
import ProjectCreation from "./components/Projectmanager/ProjectCreation";
import MilestoneCreation from "./components/Projectmanager/MilestoneCreation";
import EmployeeCreation from "./components/Projectmanager/EmployeeMaster";
import DepartmentCreation from "./components/Projectmanager/DepartmentMaster";
import TaskBoard from "./components/Projectmanager/TaskBoard";
import MyTasks from "./components/User/My Tasks";
import Profile from "./components/User/Profile";
import PublicHoliday from "./components/User/PublicHoliday";
import ProjectDetails from "./components/User/ProjectDetails";
import ProjectList from "./components/Projectmanager/ProjectList";
import AssignAccess from "./components/Projectmanager/AssignAccess";
import ProjectAccess from "./components/Projectmanager/ProjectAccess";
import Assignment from "./components/Assignment";
import ResetPassword from "./components/ResetPassword";
import AllProjectGanttChart from "./components/Projectmanager/AllProjectGanttChart";

const AppContent = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true" || sessionStorage.getItem("isLoggedIn") === "true";
  });
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem("userRole") || sessionStorage.getItem("userRole") || "user";
  });

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true" || sessionStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("userRole") || sessionStorage.getItem("userRole") || "user";
    setIsLoggedIn(loggedIn);
    setUserRole(role);
    setLoading(false);
  }, []);

  const getDashboardRoute = (role) => {
    const lowerRole = role?.toLowerCase() || '';
    if (lowerRole === 'admin' || lowerRole === 'full_access') {
      return '/dashboard';
    } else if (lowerRole === 'project_manager' || lowerRole === 'pm' || lowerRole === 'manager') {
      return '/pm-dashboard';
    } else {
      return '/user-dashboard';
    }
  };

  const handleLogin = (status, role) => {
    setIsLoggedIn(status);
    setUserRole(role);
    navigate(getDashboardRoute(role), { replace: true });
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setIsLoggedIn(false);
    setUserRole("user");
    navigate("/", { replace: true });
  };

  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={!isLoggedIn ? <Login onLogin={handleLogin} /> : <Navigate to={getDashboardRoute(userRole)} replace />} />

      {/* Dashboards */}
      <Route path="/dashboard" element={isLoggedIn ? <AdminDashboard userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/user-dashboard" element={isLoggedIn ? <UserDashboard userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/pm-dashboard" element={isLoggedIn ? <ProjectManagerDashboard userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />

      {/* Common Routes */}
      <Route path="/projects" element={isLoggedIn ? <Projects userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/project-list" element={isLoggedIn ? <ProjectList userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/project-details/:id" element={isLoggedIn ? <ProjectDetails userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/calendar" element={isLoggedIn ? <Calendar userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />

      {/* Admin Features */}
      <Route path="/company-creation" element={isLoggedIn ? <CompanyCreation onLogout={handleLogout} userRole={userRole} /> : <Navigate to="/" replace />} />
      <Route path="/plant-creation" element={isLoggedIn ? <PlantCreation userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/agriland-allocation" element={isLoggedIn ? <AgriLandAllocation userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/department-mapping" element={isLoggedIn ? <DepartmentMapping userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/designation-creation" element={isLoggedIn ? <DesignationCreation userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />

      {/* Project Manager Features */}
      <Route path="/project-creation" element={isLoggedIn ? <ProjectCreation userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/milestone-creation" element={isLoggedIn ? <MilestoneCreation userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/task-board" element={isLoggedIn ? <TaskBoard userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/my-tasks" element={isLoggedIn ? <MyTasks userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/user-task-board" element={isLoggedIn ? <UserTaskBoard userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/all-project-gantt-chart" element={isLoggedIn ? <AllProjectGanttChart userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/employee-creation" element={isLoggedIn ? <EmployeeCreation userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/department-creation" element={isLoggedIn ? <DepartmentCreation userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/profile" element={isLoggedIn ? <Profile userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/public-holidays" element={isLoggedIn ? <PublicHoliday userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/assign-access" element={isLoggedIn ? <AssignAccess userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route
        path="/project-access"
        element={
          isLoggedIn
            ? <ProjectAccess userRole={userRole} onLogout={handleLogout} />
            : <Navigate to="/" replace />
        }
      />
      <Route path="/assignment" element={isLoggedIn ? <Assignment userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/external-task/:token" element={<MyTasks />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppContent />
    </BrowserRouter>
  );
}
export default App;
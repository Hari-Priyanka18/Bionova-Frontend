// UserDashboard.jsx - Complete Updated Version
// ============================================================
// SECTION 1: IMPORTS
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FolderKanban,
  ListTodo,
  Plus,
  Settings,
  Target,
  TrendingUp,
  Users,
  User,
  BarChart3,
  CalendarDays,
  ChevronDown,
  MoreHorizontal,
  MessageSquare,
  Bell,
  Search,
  Filter,
  Menu,
  X,
  Check,
  Eye,
  Play,
  RotateCw,
  Briefcase,
  MapPin,
  Building,
  Heart,
  ShieldCheck,
  Mail,
  Phone,
  Home,
  Star,
  CircleDot,
  Sparkles,
  PieChart,
  Award,
  Zap,
  Clock as ClockIcon,
  FileText,
  CornerUpLeft,
  Download,
  Flag,
  Hash
} from "lucide-react";

import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import AlertModal from "../AlertModal";
import "../../styles/userDashboard.css";

// ============================================================
// SECTION 2: API & CONFIGURATION
// ============================================================

const API_BASE = import.meta.env?.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : "http://localhost:8080/api";

const getAuthToken = () => sessionStorage.getItem("authToken") || localStorage.getItem("authToken") || "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

// ============================================================
// SECTION 3: UTILITY FUNCTIONS
// ============================================================

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getInitials = (name = "") => {
  if (!name) return "U";
  let strName = "";
  if (typeof name === "string") {
    strName = name;
  } else if (typeof name === "object") {
    strName = name.name || name.employeeName || name.fullName || `${name.fstNm || ''} ${name.lstNm || ''}`.trim() || "U";
  } else {
    strName = String(name);
  }
  if (!strName || typeof strName !== "string") return "U";
  const parts = strName.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0] ? parts[0].substring(0, 2).toUpperCase() : "U";
};

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateValue);
  }
};

const getStatusColor = (status) => {
  const s = status?.toUpperCase() || "";
  if (s === 'COMPLETED' || s === 'DONE' || s === 'CLOSED') return '#16a34a';
  if (s === 'IN_PROGRESS' || s === 'WIP' || s === 'ACTIVE') return '#f59e0b';
  if (s === 'HOLD' || s === 'ON_HOLD') return '#7c3aed';
  if (s === 'DRAFT') return '#9ca3af';
  if (s === 'OPEN' || s === 'PENDING' || s === 'NOT_STARTED') return '#2563eb';
  return '#94a3b8';
};

const getStatusLabel = (status) => {
  const s = status?.toUpperCase() || "";
  if (s === 'COMPLETED' || s === 'DONE' || s === 'CLOSED') return 'Closed';
  if (s === 'IN_PROGRESS' || s === 'WIP' || s === 'ACTIVE') return 'In Progress';
  if (s === 'HOLD' || s === 'ON_HOLD') return 'Hold';
  if (s === 'DRAFT') return 'Draft';
  if (s === 'OPEN' || s === 'PENDING' || s === 'NOT_STARTED') return 'Open';
  return 'Open';
};

const getProcessStatusBadge = (processStatus) => {
  const s = processStatus?.toUpperCase() || "";
  if (s === 'UNDER_REVIEW' || s === 'REVIEW' || s === 'SUBMIT_REVIEW') {
    return <Eye size={14} color="#8b5cf6" title="Under Review" />;
  }
  if (s === 'REWORK') {
    return <RotateCw size={14} color="#f97316" title="Rework" />;
  }
  if (s === 'REASSIGN' || s === 'REASSIGNED') {
    return <CornerUpLeft size={14} color="#4f46e5" title="Reassigned" />;
  }
  return null;
};

const getTimeStatusBadge = (timeStatus, isOverdue, isClosed) => {
  const s = timeStatus?.toUpperCase();
  if (isClosed) {
    if (s === 'LEAD') {
      return <ClockIcon size={14} color="#22c55e" title="Lead" />;
    }
    if (s === 'ON_TIME' || s === 'ON TIME' || s === 'ONTIME') {
      return <ClockIcon size={14} color="#3b82f6" title="On Time" />;
    }
    if (s === 'LAG') {
      return <ClockIcon size={14} color="#dc2626" title="Lag" />;
    }
    return <ClockIcon size={14} color="#3b82f6" title="On Time" />;
  }

  if (s === 'DUE_TODAY' || s === 'DUE TODAY' || s === 'DUETODAY') {
    return <ClockIcon size={14} color="#f59e0b" title="Due Today" />;
  }
  if (s === 'OVERDUE' || s === 'DELAYED' || isOverdue) {
    return <ClockIcon size={14} color="#ef4444" title="Overdue" />;
  }
  return null;
};

const extractProgress = (obj) => {
  if (!obj) return 0;
  if (obj.status && (obj.status.toUpperCase() === 'COMPLETED' || obj.status.toUpperCase() === 'CLOSED')) return 100;
  const keys = ['progress', 'completionPercentage', 'completion', 'percentage', 'progressPercent', 'percentComplete', 'prjPrgrs', 'prjprgrs'];
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      let val = obj[key];
      if (typeof val === 'string') val = parseFloat(val.replace('%', ''));
      if (!isNaN(val) && val >= 0) {
        if (val > 0 && val <= 1) val = val * 100;
        return Math.min(100, Math.round(val));
      }
    }
  }
  return 0;
};

// ============================================================
// SECTION 4: DONUT CHART COMPONENT
// ============================================================

const buildGradient = (items, total) => {
  let angle = 0;
  const parts = items.map(item => {
    const pct = (item.count / total) * 100;
    const start = angle;
    angle += pct;
    return `${item.color} ${start.toFixed(1)}% ${angle.toFixed(1)}%`;
  });
  return `conic-gradient(${parts.join(", ")})`;
};

const DonutChart = ({ data, total, centerValue, centerLabel, size = 140 }) => {
  const gradient = buildGradient(data, total);
  return (
    <div className="ud-donut-wrap">
      <div
        className="ud-donut"
        style={{ width: size, height: size, background: gradient }}
      >
        <div className="ud-donut-inner">
          <span className="ud-donut-value">{centerValue}</span>
          <span className="ud-donut-label">{centerLabel}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SECTION 5: PIE CHART COMPONENT
// ============================================================

const PieChartComponent = ({ data, size = 120 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = 0;
  const filteredData = data.filter(item => item.value > 0);

  if (filteredData.length === 0) {
    return (
      <div className="ud-pie-chart-wrapper">
        <div className="ud-empty-state">
          <PieChart size={40} />
          <strong>No data available</strong>
          <span>No tasks to display</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ud-pie-chart-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {filteredData.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const dashLength = (percentage / 100) * circumference;
          const offset = -currentAngle * circumference / 100;
          currentAngle += percentage;

          return percentage > 0 ? (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={stroke}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ) : null;
        })}
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="ud-pie-center-value"
        >
          {total}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="ud-pie-center-label"
        >
          Total Tasks
        </text>
      </svg>
      <div className="ud-pie-legend">
        {filteredData.map((item, index) => (
          <div className="ud-pie-legend-item" key={index}>
            <span className="ud-pie-legend-dot" style={{ background: item.color }} />
            <span className="ud-pie-legend-label">{item.label}</span>
            <span className="ud-pie-legend-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// SECTION 7: MAIN COMPONENT
// ============================================================

const UserDashboard = ({ userRole, onLogout }) => {
  const navigate = useNavigate();

  // 7.1: State Management
  const [dashboardData, setDashboardData] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_user_dashboard");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_user_dashboard");
      return cached ? JSON.parse(cached).fullName || "" : "";
    } catch {
      return "";
    }
  });
  const [userRoleState, setUserRoleState] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_user_dashboard");
      return cached ? JSON.parse(cached).role || "" : "";
    } catch {
      return "";
    }
  });
  const [empId, setEmpId] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_user_dashboard");
      return cached ? JSON.parse(cached).empId || null : null;
    } catch {
      return null;
    }
  });

  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ type: "success", title: "", message: "" });
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const renderStars = (score) => {
    const stars = [];
    const fullStars = Math.floor(score);
    const hasHalf = score % 1 >= 0.4;
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} size={16} className="ud-star-filled" />);
      } else if (i === fullStars + 1 && hasHalf) {
        stars.push(<Star key={i} size={16} className="ud-star-half" />);
      } else {
        stars.push(<Star key={i} size={16} style={{ color: '#cbd5e1' }} />);
      }
    }
    return stars;
  };

  // 7.2: Data Fetching
  const fetchDashboardData = async () => {
    if (!dashboardData) setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const [response, taskRes, msRes, profRes] = await Promise.all([
        fetch(`${API_BASE}/user-dashboard`, { headers: authHeaders() }),
        fetch(`${API_BASE}/task-live`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/milestone-live`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/profile`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      if (!response.ok) {
        const errMsg = await response.text().catch(() => "Failed to fetch dashboard data");
        throw new Error(`Server responded with ${response.status}: ${errMsg}`);
      }

      const data = await response.json();
      const allTasksList = Array.isArray(taskRes) ? taskRes : (taskRes?.data || []);
      const allMilestonesList = Array.isArray(msRes) ? msRes : (msRes?.data || []);
      const currentEmpId = profRes?.empId || data.empId;

      const sc = data.taskStatusCounts || {};
      const completedCount = sc["Closed"] || sc["CLOSED"] || sc["Completed"] || sc["COMPLETED"] || 0;
      const wipCount = sc["In Progress"] || 0;
      const overdueCount = sc["Overdue"] || 0;
      const openCount = sc["Open"] || 0;
      const draftCount = sc["Draft"] || 0;
      const underReviewCount = sc["Under Review"] || 0;

      const totalAssignedTasks = data.assignedTasksCard?.currentCount || data.myTasksCount || 0;

      const taskCounts = {
        assigned: totalAssignedTasks,
        open: openCount,
        inProgress: wipCount,
        overdue: overdueCount,
        completed: completedCount,
      };

      const formatRelativeTime = (dtStr) => {
        if (!dtStr) return "Just now";
        try {
          const diffMs = new Date() - new Date(dtStr);
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 1) return "Just now";
          if (diffMins < 60) return `${diffMins}m ago`;
          const diffHours = Math.floor(diffMins / 60);
          if (diffHours < 24) return `${diffHours}h ago`;
          const diffDays = Math.floor(diffHours / 24);
          return `${diffDays}d ago`;
        } catch {
          return "Recent";
        }
      };

      const todoList = (data.todoList || []).map((t, index) => ({
        id: t.taskId || index + 100,
        code: t.taskCode || t.taskCd || (t.taskSource === "INDIVIDUAL" ? `IND-${t.taskId || index + 100}` : `TSK-${t.taskId || index + 100}`),
        name: t.taskName || "",
        project: t.projectCodeName || t.projectName || "",
        milestone: "",
        endDate: t.dueDate,
        startDate: null,
        status: (t.status || "OPEN").toUpperCase(),
        processStatus: (t.processStatus || t.subStatus || "").toUpperCase(),
        timeStatus: (t.timeStatus || "").toUpperCase(),
        isOverdue: t.overdue || false,
        employees: (t.employees || []).map(e => {
          let rawRole = e.participantType || e.stepType || e.taskRole || e.type || e.role || e.designation || "";
          let cleanRole = rawRole;
          if (rawRole.toUpperCase() === 'REVIEWER') cleanRole = 'Reviewer';
          else if (rawRole.toUpperCase() === 'APPROVER') cleanRole = 'Approver';
          else if (rawRole.toUpperCase() === 'ASSIGNEE') cleanRole = 'Assignee';
          return { name: e.fullName || "", photoUrl: e.photoUrl || "", role: cleanRole };
        }),
        priority: t.priority || "",
        description: "",
        rawTask: t,
        isIndividual: t.taskSource === "INDIVIDUAL"
      }));

      const upcomingTasks = (data.upcomingTasks || []).map((t, index) => ({
        id: t.taskId || index + 100,
        code: t.taskCode || t.taskCd || `TSK-${t.taskId || index + 100}`,
        name: t.taskName || "",
        project: t.projectCodeName || t.projectName || "",
        startDate: t.startDate,
        endDate: t.dueDate,
        status: "UPCOMING",
        isUpcoming: true,
        processStatus: (t.processStatus || t.subStatus || "").toUpperCase(),
        timeStatus: (t.timeStatus || "").toUpperCase(),
        employees: (t.employees || []).map(e => {
          let rawRole = e.participantType || e.stepType || e.taskRole || e.type || e.role || e.designation || "";
          let cleanRole = rawRole;
          if (rawRole.toUpperCase() === 'REVIEWER') cleanRole = 'Reviewer';
          else if (rawRole.toUpperCase() === 'APPROVER') cleanRole = 'Approver';
          else if (rawRole.toUpperCase() === 'ASSIGNEE') cleanRole = 'Assignee';
          return { name: e.fullName || "", photoUrl: e.photoUrl || "", role: cleanRole };
        }),
        priority: t.priority || ""
      }));

      upcomingTasks.sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(a.startDate) - new Date(b.startDate);
      });

      // Filter tasks & milestones matching Projects.jsx calculation
      const userTasks = allTasksList.filter(t =>
        (t.empId || t.empid) === currentEmpId ||
        (t.reviewer) === currentEmpId ||
        (t.approver) === currentEmpId
      );

      const userMilestones = allMilestonesList.filter(m => {
        const mId = String(m.mId || m.mid || m.id);
        return userTasks.some(t => String(t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id) === mId);
      });

      // ============================================================
      // MY PROJECTS - CALCULATE PROGRESS MATCHING PROJECTS.JSX
      // ============================================================
      const myProjects = (data.myProjects || []).map(p => {
        const dashId = String(p.projectId || p.id);
        const projMilestones = (allMilestonesList || []).filter(m => String(m.prjId || m.prjid || m.projectId || m.prj_id) === dashId);
        const projTasks = (userTasks || []).filter(t => {
          const tPrjId = String(t.prjId || t.prjid || t.projectId || t.prj_id || "");
          if (tPrjId && tPrjId === dashId) return true;
          const tMId = String(t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id || "");
          return projMilestones.some(m => String(m.mId || m.mid || m.id) === tMId);
        });

        const totalTasksCount = projTasks.length;
        const completedTasksCount = projTasks.filter(t => {
          const s = (t.taskSts || t.tasksts || t.status || "").toUpperCase();
          return s === 'COMPLETED' || s === 'CLOSED' || s === 'DONE';
        }).length;

        let progressPct = 0;
        if (totalTasksCount > 0) {
          progressPct = Math.round((completedTasksCount / totalTasksCount) * 100);
        } else {
          progressPct = extractProgress(p);
        }

        return {
          id: dashId,
          projectId: dashId,
          name: p.projectName || p.name || "",
          status: p.status || "Active",
          progress: progressPct,
          quality: p.quality || "",
          employees: totalTasksCount || p.tasksAssigned || p.totalTasks || 0,
          tasksCount: totalTasksCount || p.tasksAssigned || p.totalTasks || 0,
          client: p.clientName || "",
          location: p.location || "",
          logo: p.logo
        };
      });

      const recentActivities = (data.recentActivity || []).map(log => ({
        id: log.logId || Math.random(),
        user: log.user || "",
        action: log.message || `Updated ${log.entityTyp} #${log.entityId}`,
        time: formatRelativeTime(log.logDt),
        type: (log.entityTyp || '').toLowerCase() === 'task' ? 'task' : 'project'
      }));

      // ============================================================
      // Performance Data Calculation
      // ============================================================
      const totalAssigned = taskCounts.assigned || 0;
      const compCount = taskCounts.completed || 0;
      const overDueCount = taskCounts.overdue || 0;
      const inProgressCount = taskCounts.inProgress || 0;

      let calcEfficiency = 0;
      if (totalAssigned > 0) {
        calcEfficiency = Math.round((compCount / totalAssigned) * 100);
      }

      let calcOnTime = 0;
      if (totalAssigned > 0) {
        calcOnTime = Math.round(((totalAssigned - overDueCount) / totalAssigned) * 100);
      }

      let calcQuality = 0;
      if (totalAssigned > 0) {
        calcQuality = (compCount / totalAssigned) * 5;
        calcQuality = Math.min(5, Math.round(calcQuality * 10) / 10);
      } else {
        calcQuality = 0;
      }

      const performanceData = {
        tasksCompleted: compCount,
        tasksInProgress: inProgressCount,
        tasksOverdue: overDueCount,
        efficiency: calcEfficiency,
        onTimeDelivery: calcOnTime,
        qualityScore: calcQuality,
      };

      // ============================================================
      // Calculate Chart Data
      // ============================================================

      const projectCount = myProjects.length;

      let totalProgress = 0;
      myProjects.forEach(p => {
        let prog = p.progress || 0;
        if (prog > 0 && prog <= 1) prog = prog * 100;
        totalProgress += prog;
      });
      const overallProgress = projectCount > 0 ? (totalProgress / projectCount) : 0;

      const completedProjects = myProjects.filter(p => p.status?.toUpperCase() === 'COMPLETED' || p.status?.toUpperCase() === 'CLOSED').length;
      const inProgressProjects = myProjects.filter(p => p.status?.toUpperCase() === 'IN_PROGRESS' || p.status?.toUpperCase() === 'WIP' || p.status?.toUpperCase() === 'ACTIVE').length;
      const notStartedProjects = myProjects.filter(p => p.status?.toUpperCase() === 'NOT_STARTED' || p.status?.toUpperCase() === 'OPEN' || p.status?.toUpperCase() === 'DRAFT').length;
      const delayedProjects = myProjects.filter(p => p.status?.toUpperCase() === 'DELAYED' || p.status?.toUpperCase() === 'OVERDUE' || p.status?.toUpperCase() === 'HOLD').length;

      const portfolioItems = [
        { label: "Closed", count: completedProjects, pct: projectCount > 0 ? ((completedProjects / projectCount) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
        { label: "In Progress", count: inProgressProjects, pct: projectCount > 0 ? ((inProgressProjects / projectCount) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
        { label: "Not Started", count: notStartedProjects, pct: projectCount > 0 ? ((notStartedProjects / projectCount) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
        { label: "Delayed", count: delayedProjects, pct: projectCount > 0 ? ((delayedProjects / projectCount) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
      ];

      let milestoneTotal = 0;
      let milestoneCompleted = 0;
      let milestoneInProgress = 0;
      let milestoneNotStarted = 0;
      let milestoneDelayed = 0;

      if (data.milestoneStatus) {
        milestoneTotal = data.milestoneStatus.total || 0;
        milestoneCompleted = data.milestoneStatus.completed || 0;
        milestoneInProgress = data.milestoneStatus.inProgress || 0;
        milestoneNotStarted = data.milestoneStatus.notStarted || 0;
        milestoneDelayed = data.milestoneStatus.delayed || 0;
      } else {
        myProjects.forEach(project => {
          const status = project.status?.toUpperCase() || '';
          if (status === 'COMPLETED' || status === 'CLOSED') {
            milestoneCompleted += 1;
          } else if (status === 'IN_PROGRESS' || status === 'WIP' || status === 'ACTIVE') {
            milestoneInProgress += 1;
          } else if (status === 'NOT_STARTED' || status === 'OPEN' || status === 'DRAFT') {
            milestoneNotStarted += 1;
          } else if (status === 'DELAYED' || status === 'OVERDUE' || status === 'HOLD') {
            milestoneDelayed += 1;
          }
          milestoneTotal += 1;
        });
      }

      const milestoneItems = [
        { label: "Closed", count: milestoneCompleted, pct: milestoneTotal > 0 ? ((milestoneCompleted / milestoneTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
        { label: "In Progress", count: milestoneInProgress, pct: milestoneTotal > 0 ? ((milestoneInProgress / milestoneTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
        { label: "Not Started", count: milestoneNotStarted, pct: milestoneTotal > 0 ? ((milestoneNotStarted / milestoneTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
        { label: "Delayed", count: milestoneDelayed, pct: milestoneTotal > 0 ? ((milestoneDelayed / milestoneTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
      ];

      const taskTotal = taskCounts.assigned || 0;
      const taskStatusItems = [
        { label: "Closed", count: taskCounts.completed || 0, pct: taskTotal > 0 ? ((taskCounts.completed / taskTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
        { label: "In Progress", count: taskCounts.inProgress || 0, pct: taskTotal > 0 ? ((taskCounts.inProgress / taskTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
        { label: "Under Review", count: underReviewCount || 0, pct: taskTotal > 0 ? ((underReviewCount / taskTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#8b5cf6" },
        { label: "Not Started", count: taskCounts.open || 0, pct: taskTotal > 0 ? ((taskCounts.open / taskTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
        { label: "Overdue", count: taskCounts.overdue || 0, pct: taskTotal > 0 ? ((taskCounts.overdue / taskTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
      ];

      const dashboard = {
        fullName: data.fullName || "",
        role: data.role || "",
        empId: data.empId || null,
        taskCounts,
        completionRate: Math.round(data.overallCompletionPercentage || 0),
        todoList,
        upcomingTasks,
        myProjects,
        totalProjects: projectCount,
        recentActivities,
        performanceData,
        portfolioItems,
        portfolioTotal: projectCount,
        portfolioPercentage: overallProgress.toFixed(2) + "%",
        milestoneItems,
        milestoneTotal,
        taskStatusItems,
        taskTotal,
      };

      setDashboardData(dashboard);
      try {
        localStorage.setItem("cached_user_dashboard", JSON.stringify(dashboard));
      } catch (e) {
        console.warn("Failed to save dashboard to cache", e);
      }
      setUserName(dashboard.fullName);
      setUserRoleState(dashboard.role);
      setEmpId(dashboard.empId);

    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 7.3: Event Handlers
  const triggerAlert = (type, title, message) => {
    setAlertConfig({ type, title, message });
    setAlertOpen(true);
  };

  const handleTaskClick = (task) => {
    const taskId = task?.taskId || task?.rawTask?.taskId || task?.rawTask?.empTaskId || task?.id || task?.code;
    navigate('/my-tasks', { state: { selectedTaskId: taskId, selectedStatus: "All Tasks" } });
  };

  const handleProjectClick = (project) => {
    const projId = project?.id || project?.projectId || project?.prjId;
    navigate('/projects', { state: { selectedProjectId: projId } });
  };

  const handleStartTask = async (task) => {
    if (updatingTaskId) return;

    setUpdatingTaskId(task.id);

    try {
      const payload = { taskSts: "WIP" };
      const endpoint = task.isIndividual
        ? `/assignments/${task.id}/status`
        : `/task-live/${task.id}/status`;
      const url = `${API_BASE}${endpoint}`;

      const response = await fetch(url, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText || "Unknown error"}`);
      }

      setDashboardData(prevData => {
        if (!prevData) return prevData;

        const updatedTodoList = prevData.todoList.map(t => {
          if (t.id === task.id) {
            return {
              ...t,
              status: "IN_PROGRESS",
              rawTask: { ...t.rawTask, taskSts: "WIP", status: "IN_PROGRESS" },
              isOverdue: false
            };
          }
          return t;
        });

        const newTaskCounts = { ...prevData.taskCounts };
        newTaskCounts.open = Math.max(0, (newTaskCounts.open || 0) - 1);
        newTaskCounts.inProgress = (newTaskCounts.inProgress || 0) + 1;

        return {
          ...prevData,
          todoList: updatedTodoList,
          taskCounts: newTaskCounts,
        };
      });

      triggerAlert("success", "Started", "Task moved to In Progress.");

      setTimeout(() => {
        fetchDashboardData();
      }, 500);

    } catch (err) {
      console.error("Error starting task:", err);
      triggerAlert("danger", "Error", `Failed to start task: ${err.message}`);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleGreetingClose = () => {
    setShowGreeting(false);
  };

  const handleExportData = () => {
    if (!dashboardData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `User Dashboard Export\n\n`;
    csvContent += `User,${dashboardData.fullName}\n`;
    csvContent += `Role,${dashboardData.role}\n\n`;

    csvContent += "Task Summary\nTask Type,Count\n";
    csvContent += `Assigned Tasks,${dashboardData.taskCounts.assigned || 0}\n`;
    csvContent += `Open Tasks,${dashboardData.taskCounts.open || 0}\n`;
    csvContent += `In Progress,${dashboardData.taskCounts.inProgress || 0}\n`;
    csvContent += `Overdue Tasks,${dashboardData.taskCounts.overdue || 0}\n`;
    csvContent += `Closed Tasks,${dashboardData.taskCounts.completed || 0}\n\n`;

    csvContent += "My To-Do List\nTask Name,Project,Due Date,Status\n";
    dashboardData.todoList.forEach(t => {
      csvContent += `"${t.name}","${t.project}","${formatDate(t.endDate)}","${getStatusLabel(t.status)}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `User_Dashboard_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================
  // 7.4: Loading & Error States
  // ============================================================

  if (loading) {
    return (
      <div className="ud-container">
        <Sidebar userRole={userRoleState} onLogout={onLogout} />
        <div className="ud-shell">
          <Header
            title="User Dashboard"
            showSearch={false}
            userName={userName}
            userRole={userRoleState}
            initials={getInitials(userName)}
          />
          <main className="ud-main">
            <div className="ud-loading-container">
              <div className="ud-loading-spinner" />
              <p>Loading dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ud-container">
        <Sidebar userRole={userRoleState} onLogout={onLogout} />
        <div className="ud-shell">
          <Header
            title="User Dashboard"
            showSearch={false}
            userName={userName}
            userRole={userRoleState}
            initials={getInitials(userName)}
          />
          <main className="ud-main">
            <div className="ud-error-container">
              <AlertTriangle size={48} color="#ef4444" />
              <h2>Something went wrong</h2>
              <p>{error}</p>
              <button className="ud-retry-btn" onClick={fetchDashboardData}>
                <RotateCw size={16} /> Retry
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="ud-container">
        <Sidebar userRole={userRoleState} onLogout={onLogout} />
        <div className="ud-shell">
          <Header
            title="User Dashboard"
            showSearch={false}
            userName={userName}
            userRole={userRoleState}
            initials={getInitials(userName)}
          />

        </div>
      </div>
    );
  }

  // ============================================================
  // 7.5: Render – 4 Row Layout
  // ============================================================

  const data = dashboardData;
  const taskCounts = data.taskCounts;
  const todoList = data.todoList || [];
  const upcomingTasks = data.upcomingTasks || [];
  const projects = data.myProjects || [];
  const totalProjects = data.totalProjects || projects.length;
  const recentActivities = data.recentActivities || [];
  const performanceData = data.performanceData || {
    tasksCompleted: 0,
    tasksInProgress: 0,
    tasksOverdue: 0,
    efficiency: 0,
    onTimeDelivery: 0,
    qualityScore: 0,
  };

  const portfolioItems = data.portfolioItems || [];
  const portfolioTotal = data.portfolioTotal || 0;
  const portfolioPercentage = data.portfolioPercentage || "0.00%";
  const milestoneItems = data.milestoneItems || [];
  const milestoneTotal = data.milestoneTotal || 0;
  const taskStatusItems = data.taskStatusItems || [];
  const taskTotal = data.taskTotal || 0;

  const sortedUpcomingTasks = [...upcomingTasks].sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate) - new Date(b.startDate);
  });

  const activeTodoList = todoList.filter(t => {
    const s = t.status?.toUpperCase() || "";
    return s !== "COMPLETED" && s !== "CLOSED" && s !== "DONE";
  });
  const displayedTasks = showAllTasks ? activeTodoList : activeTodoList.slice(0, 3);
  const displayedUpcoming = showAllUpcoming ? sortedUpcomingTasks : sortedUpcomingTasks.slice(0, 4);
  const totalTasks = taskCounts.assigned || 0;

  const pieData = [
    { label: "Closed", value: taskCounts.completed || 0, color: "#16a34a" },
    { label: "In Progress", value: taskCounts.inProgress || 0, color: "#f59e0b" },
    { label: "Open", value: taskCounts.open || 0, color: "#2563eb" },
  ];

  const pieDataDetails = [
    ...pieData,
    { label: "Overdue", value: taskCounts.overdue || 0, color: "#ef4444" },
  ];

  return (
    <div className="ud-container">
      <Sidebar userRole={userRoleState} onLogout={onLogout} />

      <div className="ud-shell">
        <Header
          title="User Dashboard"
          showSearch={false}
          userName={userName}
          userRole={userRoleState}
          initials={getInitials(userName)}
        />

        <main className="ud-main">
          {/* ==========================================================
              FILTER BAR - Only User Name & Export
          ========================================================== */}
          <div className="ud-filter-bar">
            <div className="ud-filter-group">
              <div className="ud-user-greeting">
                <span className="ud-user-greeting-text">
                  <strong>{userName}</strong>
                </span>
                <span className="ud-user-role-badge">{userRoleState || 'User'}</span>
              </div>
            </div>
            <button className="ud-export-btn" onClick={handleExportData}>
              <Download size={14} /> Export
            </button>
          </div>

          {/* ==========================================================
              ROW 1: KPI CARDS (6 Cards - Single Row)
          ========================================================== */}
          <div className="ud-stats-container">
            <div className="ud-stat-item ud-stat-blue">
              <div className="ud-stat-icon-box filled">
                <ListTodo size={24} color="white" />
              </div>
              <div className="ud-stat-info">
                <div className="ud-stat-value">{taskCounts.assigned || 0}</div>
                <div className="ud-stat-label">Assigned Tasks</div>
                <div className="ud-stat-sub">All Tasks</div>
              </div>
            </div>

            <div className="ud-stat-item ud-stat-purple">
              <div className="ud-stat-icon-box filled">
                <CircleDot size={24} color="white" />
              </div>
              <div className="ud-stat-info">
                <div className="ud-stat-value">{taskCounts.open || 0}</div>
                <div className="ud-stat-label">Open Tasks</div>
                <div className="ud-stat-sub">Need attention</div>
              </div>
            </div>

            <div className="ud-stat-item ud-stat-orange">
              <div className="ud-stat-icon-box filled">
                <Activity size={24} color="white" />
              </div>
              <div className="ud-stat-info">
                <div className="ud-stat-value">{taskCounts.inProgress || 0}</div>
                <div className="ud-stat-label">In Progress</div>
                <div className="ud-stat-sub">Active tasks</div>
              </div>
            </div>

            <div className="ud-stat-item ud-stat-red">
              <div className="ud-stat-icon-box filled">
                <AlertTriangle size={24} color="white" />
              </div>
              <div className="ud-stat-info">
                <div className="ud-stat-value">{taskCounts.overdue || 0}</div>
                <div className="ud-stat-label">Overdue Tasks</div>
                <div className="ud-stat-sub">Need action</div>
              </div>
            </div>

            <div className="ud-stat-item ud-stat-green">
              <div className="ud-stat-icon-box filled">
                <CheckCircle2 size={24} color="white" />
              </div>
              <div className="ud-stat-info">
                <div className="ud-stat-value">{taskCounts.completed || 0}</div>
                <div className="ud-stat-label">Closed Tasks</div>
                <div className="ud-stat-sub">Well done!</div>
              </div>
            </div>

            <div className="ud-stat-item ud-stat-teal">
              <div className="ud-stat-icon-box filled">
                <FolderKanban size={24} color="white" />
              </div>
              <div className="ud-stat-info">
                <div className="ud-stat-value">{totalProjects || 0}</div>
                <div className="ud-stat-label">My Projects</div>
                <div className="ud-stat-sub">Active projects</div>
              </div>
            </div>
          </div>

          {/* ==========================================================
              ROW 2: To Do List (5 Tasks), Milestone Progress, Task Progress
          ========================================================== */}
          <div className="ud-row-2-grid">

            {/* Tile 1: My To-Do List - 5 Tasks */}
            <div className="ud-card ud-todo-panel">
              <div className="ud-card-header">
                <span className="ud-card-title">My To-Do List</span>
                <button className="ud-view-all-btn" onClick={() => navigate("/my-tasks", { state: { selectedStatus: "To Do" } })}>
                  View All <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="ud-todo-list-container">
                {displayedTasks && displayedTasks.length > 0 ? (
                  displayedTasks.map((task, index) => {
                    const isCompleted = task.status === "COMPLETED" || task.status === "DONE" || task.status === "CLOSED";

                    return (
                      <div key={task.id || index} className="ud-todo-card" onClick={() => handleTaskClick(task)}>
                        <div className="ud-todo-card-left">
                          <div className={`ud-todo-status-dot ${task.isOverdue ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}`} />
                          <div className="ud-todo-card-info">
                            <div className="ud-todo-card-title">{task.name || 'Task'}</div>
                            <div className="ud-todo-card-meta">
                              <span className="ud-todo-card-project">{task.project || 'Project'}</span>
                              <span className="ud-todo-card-code">
                                <Hash size={10} />
                                {task.code || 'TSK-001'}
                              </span>
                              <span className="ud-todo-card-date">
                                <ClockIcon size={10} />
                                {formatDate(task.endDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ud-todo-card-right-compact">
                          <span className="ud-status-badge-small" style={{ backgroundColor: getStatusColor(task.status) }}>
                            {getStatusLabel(task.status)}
                          </span>
                          <div className="ud-todo-card-badges">
                            {getProcessStatusBadge(task.processStatus)}
                            {getTimeStatusBadge(task.timeStatus, task.isOverdue, task.status === "CLOSED" || task.status === "COMPLETED")}
                          </div>
                          <div className="ud-todo-card-employees-compact">
                            {task.employees && task.employees.length > 0 ? (
                              <>
                                {task.employees.slice(0, 2).map((emp, i) => {
                                  const empName = typeof emp === 'string' ? emp : (emp.name || `${emp.fstNm || ''} ${emp.lstNm || ''}`.trim() || 'User');
                                  return (
                                    <span key={i} className="ud-avatar-tiny" title={emp.role ? `${empName} - ${emp.role}` : empName}>
                                      {emp.photoUrl ? (
                                        <img src={emp.photoUrl} alt={empName} />
                                      ) : (
                                        getInitials(empName)
                                      )}
                                    </span>
                                  );
                                })}
                                {task.employees.length > 2 && (
                                  <span className="ud-avatar-tiny-more">+{task.employees.length - 2}</span>
                                )}
                              </>
                            ) : (
                              <span className="ud-no-employees-tiny">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="ud-empty-state-todo">
                    <CheckCircle2 size={32} />
                    <strong>All caught up!</strong>
                    <span>No pending tasks</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tile 2: Milestone Progress - Chart Top, Data Bottom */}
            <div className="ud-card ud-milestone-progress-panel">
              <div className="ud-card-header">
                <span className="ud-card-title">Milestone Progress</span>
              </div>
              <div className="ud-milestone-content-vertical">
                <div className="ud-milestone-chart-top">
                  <DonutChart
                    data={milestoneItems}
                    total={milestoneItems.reduce((a, b) => a + b.count, 0)}
                    centerValue={milestoneTotal}
                    centerLabel="Total Milestones"
                    size={120}
                  />
                </div>
                <div className="ud-milestone-data-bottom">
                  {milestoneItems.map((item, index) => (
                    <div key={index} className="ud-milestone-data-row">
                      <span className="ud-milestone-data-dot" style={{ background: item.color }} />
                      <span className="ud-milestone-data-label">{item.label}</span>
                      <span className="ud-milestone-data-value">{item.count}</span>
                      <span className="ud-milestone-data-pct">{item.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tile 3: Task Progress - Chart Top, Data Bottom */}
            <div className="ud-card ud-progress-pie-panel">
              <div className="ud-card-header">
                <span className="ud-card-title">Task Progress</span>
              </div>
              <div className="ud-pie-content-vertical">
                <div className="ud-pie-chart-top">
                  <PieChartComponent data={pieData} size={120} />
                </div>
                <div className="ud-pie-data-bottom">
                  {pieDataDetails.map((item, index) => (
                    <div key={index} className="ud-pie-data-row">
                      <span className="ud-pie-data-dot" style={{ background: item.color }} />
                      <span className="ud-pie-data-label">{item.label}</span>
                      <span className="ud-pie-data-value">{item.value}</span>
                      <span className="ud-pie-data-pct">
                        {totalTasks > 0 ? ((item.value / totalTasks) * 100).toFixed(1) + '%' : '0.0%'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ==========================================================
              ROW 3: Upcoming Tasks (5 Tasks), My Active Projects (3 Projects), My Performance
          ========================================================== */}
          <div className="ud-row-3-grid">

            {/* Tile 1: Upcoming Tasks - 5 Tasks */}
            <div className="ud-card ud-upcoming-panel">
              <div className="ud-card-header">
                <span className="ud-card-title">Upcoming Tasks</span>
                <button className="ud-view-all-btn" onClick={() => navigate("/my-tasks", { state: { selectedStatus: "Upcoming" } })}>
                  View All <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="ud-upcoming-list">
                {displayedUpcoming && displayedUpcoming.length > 0 ? (
                  displayedUpcoming.map((task, index) => (
                    <div className="ud-upcoming-item" key={task.id || index} onClick={() => {
                      const taskId = task?.taskId || task?.rawTask?.taskId || task?.rawTask?.empTaskId || task?.id || task?.code;
                      navigate("/my-tasks", { state: { selectedStatus: "Upcoming", selectedTaskId: taskId } });
                    }} style={{ cursor: 'pointer' }}>
                      <div className="ud-upcoming-date">
                        <span className="ud-upcoming-day">
                          {task.startDate ? new Date(task.startDate).getDate() : '--'}
                        </span>
                        <span className="ud-upcoming-month">
                          {task.startDate ? new Date(task.startDate).toLocaleString('en', { month: 'short' }) : 'N/A'}
                        </span>
                      </div>
                      <div className="ud-upcoming-info">
                        <div className="ud-upcoming-name">{task.name || 'Task'}</div>
                        <div className="ud-upcoming-project-name">{task.project || 'Project'}</div>
                        <div className="ud-upcoming-code">
                          <Hash size={10} />
                          {task.code || 'TSK-001'}
                        </div>
                      </div>
                      <div className="ud-upcoming-status">
                        <span className="ud-status-badge-small" style={{ backgroundColor: getStatusColor(task.status) }}>
                          {getStatusLabel(task.status)}
                        </span>
                      </div>
                      <div className="ud-upcoming-employees">
                        {task.employees && task.employees.length > 0 ? (
                          <>
                            {task.employees.slice(0, 2).map((emp, i) => {
                              const empName = typeof emp === 'string' ? emp : (emp.name || `${emp.fstNm || ''} ${emp.lstNm || ''}`.trim() || 'User');
                              return (
                                <span key={i} className="ud-avatar-tiny" title={empName}>
                                  {emp.photoUrl ? (
                                    <img src={emp.photoUrl} alt={empName} />
                                  ) : (
                                    getInitials(empName)
                                  )}
                                </span>
                              );
                            })}
                            {task.employees.length > 2 && (
                              <span className="ud-avatar-tiny-more">+{task.employees.length - 2}</span>
                            )}
                          </>
                        ) : (
                          <span className="ud-no-employees-tiny">—</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="ud-empty-state">
                    <Calendar size={28} />
                    <strong>No upcoming tasks</strong>
                    <span>Your schedule is clear.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tile 2: My Active Projects - 3 Projects */}
            <div className="ud-card ud-projects-panel">
              <div className="ud-card-header">
                <span className="ud-card-title">My Active Projects</span>
                <button className="ud-view-all-btn" onClick={() => navigate("/projects")}>
                  View All <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="ud-projects-list">
                {projects && projects.length > 0 ? (
                  projects.slice(0, 4).map((project, index) => {
                    let progressValue = project.progress || 0;
                    if (progressValue > 0 && progressValue <= 1) {
                      progressValue = progressValue * 100;
                    }
                    progressValue = Math.min(100, Math.max(0, progressValue));

                    const progressColor = progressValue >= 80 ? '#16a34a' :
                      progressValue >= 50 ? '#f59e0b' :
                        progressValue >= 30 ? '#ea580c' : '#ef4444';

                    return (
                      <div className="ud-project-card" key={project.id || index} onClick={() => handleProjectClick(project)}>
                        <div className="ud-project-card-left">
                          {project.logo ? (
                            <img src={project.logo} alt={project.name} className="ud-project-card-logo" />
                          ) : (
                            <div className="ud-project-card-logo-fallback">
                              <FolderKanban size={20} />
                            </div>
                          )}
                          <div className="ud-project-card-info">
                            <div className="ud-project-card-name">{project.name || 'Project'}</div>
                            <div className="ud-project-card-meta">
                              <span className="ud-project-card-status" style={{ color: getStatusColor(project.status) }}>
                                {project.status || 'Active'}
                              </span>
                              <span className="ud-project-card-employees" title="Tasks Assigned">
                                <FileText size={12} /> {project.tasksCount || project.employees || 0} Tasks
                              </span>
                              {project.quality && (
                                <span className="ud-project-card-quality">{project.quality}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ud-project-card-right">
                          <div className="ud-project-card-progress">
                            <div className="ud-project-card-progress-ring">
                              {(() => {
                                const radius = 19;
                                const circumference = 2 * Math.PI * radius;
                                const dashArray = (progressValue / 100) * circumference;
                                const gapArray = circumference - dashArray;
                                return (
                                  <svg viewBox="0 0 44 44" className="ud-card-ring-svg">
                                    <circle cx="22" cy="22" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
                                    <circle
                                      cx="22" cy="22" r={radius} fill="none"
                                      stroke={progressColor}
                                      strokeWidth="4"
                                      strokeDasharray={`${dashArray} ${gapArray}`}
                                      strokeDashoffset="0"
                                      strokeLinecap="round"
                                      transform="rotate(-90 22 22)"
                                    />
                                  </svg>
                                );
                              })()}
                              <span className="ud-card-ring-value">{Math.round(progressValue)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="ud-empty-state">
                    <FolderKanban size={28} />
                    <strong>No projects</strong>
                    <span>You are not assigned to any projects yet.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tile 3: My Performance */}
            <div className="ud-card ud-performance-panel">
              <div className="ud-card-header">
                <span className="ud-card-title">My Performance</span>
                <div className="ud-performance-rating">
                  {renderStars(performanceData.qualityScore || 0)}
                  <span className="ud-rating-text">{performanceData.qualityScore || 0}</span>
                </div>
              </div>
              <div className="ud-performance-content">
                <div className="ud-performance-stats">
                  <div className="ud-performance-stat">
                    <div className="ud-stat-icon green"><CheckCircle2 size={18} /></div>
                    <div className="ud-stat-info">
                      <span className="ud-stat-value">{performanceData.tasksCompleted || 0}</span>
                      <span className="ud-stat-label">Closed</span>
                    </div>
                  </div>
                  <div className="ud-performance-stat">
                    <div className="ud-stat-icon blue"><Activity size={18} /></div>
                    <div className="ud-stat-info">
                      <span className="ud-stat-value">{performanceData.tasksInProgress || 0}</span>
                      <span className="ud-stat-label">In Progress</span>
                    </div>
                  </div>
                  <div className="ud-performance-stat">
                    <div className="ud-stat-icon red"><AlertTriangle size={18} /></div>
                    <div className="ud-stat-info">
                      <span className="ud-stat-value">{performanceData.tasksOverdue || 0}</span>
                      <span className="ud-stat-label">Overdue</span>
                    </div>
                  </div>
                </div>

                <div className="ud-performance-metrics">
                  <div className="ud-metric-item">
                    <div className="ud-metric-header">
                      <span className="ud-metric-label">Efficiency</span>
                      <span className="ud-metric-value">{performanceData.efficiency || 0}%</span>
                    </div>
                    <div className="ud-metric-bar">
                      <div className="ud-metric-fill" style={{ width: `${Math.min(performanceData.efficiency || 0, 100)}%`, background: '#3b82f6' }} />
                    </div>
                  </div>
                  <div className="ud-metric-item">
                    <div className="ud-metric-header">
                      <span className="ud-metric-label">On-Time Delivery</span>
                      <span className="ud-metric-value">{performanceData.onTimeDelivery || 0}%</span>
                    </div>
                    <div className="ud-metric-bar">
                      <div className="ud-metric-fill" style={{ width: `${Math.min(performanceData.onTimeDelivery || 0, 100)}%`, background: '#16a34a' }} />
                    </div>
                  </div>
                  <div className="ud-metric-item">
                    <div className="ud-metric-header">
                      <span className="ud-metric-label">Quality Score</span>
                      <span className="ud-metric-value">{performanceData.qualityScore || 0}/5</span>
                    </div>
                    <div className="ud-metric-bar">
                      <div className="ud-metric-fill" style={{
                        width: `${Math.min(((performanceData.qualityScore || 0) / 5) * 100, 100)}%`,
                        background: '#8b5cf6'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==========================================================
              ROW 4: QUICK ACTIONS
          ========================================================== */}
          <div className="ud-card ud-quick-actions-card">
            <div className="ud-card-header">
              <span className="ud-card-title">Quick Actions</span>
            </div>
            <div className="ud-quick-grid">
              <button className="ud-action-btn ud-action-blue" onClick={() => navigate("/my-tasks")}>
                <ListTodo size={18} /> My Tasks
              </button>
              <button className="ud-action-btn ud-action-green" onClick={() => navigate("/projects")}>
                <FolderKanban size={18} /> My Projects
              </button>
              <button className="ud-action-btn ud-action-purple" onClick={() => navigate("/calendar")}>
                <CalendarDays size={18} /> Calendar
              </button>
              <button className="ud-action-btn ud-action-orange" onClick={() => navigate("/assignment", { state: { openForm: true } })}>
                <Plus size={18} /> Assign Task
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* ==========================================================
          TASK DETAIL MODAL
      ========================================================== */}
      {showTaskDetail && selectedTask && (
        <div className="ud-modal-overlay" onClick={() => setShowTaskDetail(false)}>
          <div className="ud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ud-modal-header">
              <h3>Task Details: {selectedTask.code || selectedTask.id}</h3>
              <button className="ud-modal-close" onClick={() => setShowTaskDetail(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="ud-modal-body">
              <div className="ud-detail-row">
                <span className="ud-detail-label">Task Name</span>
                <span className="ud-detail-value">{selectedTask.name || 'Task'}</span>
              </div>
              <div className="ud-detail-row">
                <span className="ud-detail-label">Task Code</span>
                <span className="ud-detail-value">{selectedTask.code || 'TSK-001'}</span>
              </div>
              <div className="ud-detail-row">
                <span className="ud-detail-label">Project</span>
                <span className="ud-detail-value">{selectedTask.project || 'Project'}</span>
              </div>
              <div className="ud-detail-row">
                <span className="ud-detail-label">Milestone</span>
                <span className="ud-detail-value">{selectedTask.milestone || '—'}</span>
              </div>
              <div className="ud-detail-row">
                <span className="ud-detail-label">Status</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                  <span className="ud-status-badge" style={{ backgroundColor: getStatusColor(selectedTask.status) }}>
                    {getStatusLabel(selectedTask.status)}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center' }}>
                    {getProcessStatusBadge(selectedTask.processStatus)}
                    {getTimeStatusBadge(selectedTask.timeStatus, selectedTask.isOverdue, selectedTask.status === "CLOSED" || selectedTask.status === "COMPLETED")}
                  </div>
                </div>
              </div>
              <div className="ud-detail-row">
                <span className="ud-detail-label">Due Date</span>
                <span className={`ud-detail-value ${selectedTask.isOverdue ? 'ud-date-overdue' : ''}`}>
                  {formatDate(selectedTask.endDate)}
                </span>
              </div>
              {selectedTask.description && (
                <div className="ud-detail-row ud-detail-description">
                  <span className="ud-detail-label">Description</span>
                  <span className="ud-detail-value">{selectedTask.description}</span>
                </div>
              )}
            </div>
            <div className="ud-modal-footer">
              {!selectedTask.isUpcoming && selectedTask.status !== "UPCOMING" && selectedTask.status !== "Upcoming" && (selectedTask.status === "OPEN" || selectedTask.status === "PENDING" || selectedTask.status === "NOT_STARTED") && (
                <button
                  className="ud-btn-primary"
                  onClick={() => {
                    handleStartTask(selectedTask);
                    setShowTaskDetail(false);
                  }}
                  disabled={updatingTaskId === selectedTask.id}
                >
                  <Play size={16} /> {updatingTaskId === selectedTask.id ? 'Starting...' : 'Start Task'}
                </button>
              )}
              <button className="ud-btn-secondary" onClick={() => setShowTaskDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
};

export default UserDashboard;
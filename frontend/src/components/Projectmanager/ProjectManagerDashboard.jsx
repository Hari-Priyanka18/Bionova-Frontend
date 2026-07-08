import React, { useState, useEffect, useRef } from "react";
import {
  FolderOpen, Play, BarChart2, Clock, CalendarCheck, AlertTriangle,
  Download, Filter, ChevronDown, Plus, Flag, CheckSquare,
  TrendingUp, TrendingDown, ArrowRight, Shield, AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import Header from "../Header";
import "../../styles/projectManagerDashboard.css";

// ===== REUSABLE CUSTOM DROPDOWN =====
const CustomDropdown = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '6px 12px', fontSize: '13px', fontWeight: '500',
          color: '#475569', background: '#fff', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', minWidth: '130px',
          justifyContent: 'space-between'
        }}
      >
        {value} <ChevronDown size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 999, minWidth: '160px', overflow: 'hidden'
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: '10px 16px', fontSize: '13px', fontWeight: '500',
                cursor: 'pointer', color: opt === value ? '#fff' : '#374151',
                background: opt === value ? '#2563eb' : 'transparent',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ====== END OF REUSABLE CUSTOM DROPDOWN ======

// Donut chart gradient builder
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
    <div className="pm-donut-wrap">
      <div
        className="pm-donut"
        style={{ width: size, height: size, background: gradient }}
      >
        <div className="pm-donut-inner">
          <span className="pm-donut-value">{centerValue}</span>
          <span className="pm-donut-label">{centerLabel}</span>
        </div>
      </div>
    </div>
  );
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";

const authHeaders = () => {
  const token = sessionStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  };
};

const ProjectManagerDashboard = ({ userRole, onLogout }) => {
  const [userName, setUserName] = useState("Ravi Kumar");
  const [currentProject, setCurrentProject] = useState("All Projects");
  const [currentDept, setCurrentDept] = useState("All Departments");
  const [currentStatus, setCurrentStatus] = useState("All Status");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  
  // Dynamic lists from DB
  const [projectsList, setProjectsList] = useState([]);
  const [milestonesList, setMilestonesList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);

  useEffect(() => {
    const email = sessionStorage.getItem("userEmail");
    if (email) {
      const namePart = email.split("@")[0];
      setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
    }
    
    const loadAllDashboardData = async () => {
      const headers = authHeaders();
      
      try {
        const res = await fetch(`${API_BASE}/dashboard/project-manager-metrics`, { headers });
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        }
      } catch (e) {
        console.error("Error loading PM metrics:", e);
      }

      try {
        const [resPrj, resMs, resT, resDept, resEmp] = await Promise.all([
          fetch(`${API_BASE}/project-live`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API_BASE}/milestone-live`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API_BASE}/task-live`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API_BASE}/departments`, { headers }).then(r => r.ok ? r.json() : []),
          fetch(`${API_BASE}/employees`, { headers }).then(r => r.ok ? r.json() : [])
        ]);
        setProjectsList(resPrj);
        setMilestonesList(resMs);
        setTasksList(resT);
        setDepartmentsList(resDept);
        setEmployeesList(resEmp);
      } catch (e) {
        console.error("Error loading ancillary lists:", e);
      } finally {
        setLoading(false);
      }
    };

    loadAllDashboardData();
  }, []);

  const handleProjectChange = (val) => setCurrentProject(val);
  const handleDeptChange    = (val) => setCurrentDept(val);
  const handleStatusChange  = (val) => setCurrentStatus(val);

  const handleActionClick = (actionName) => {
    if (actionName === 'Create Project') navigate('/project-creation');
    else if (actionName === 'Add Milestone') navigate('/milestone-creation');
    else if (actionName === 'Create Task') navigate('/task-board');
    else if (actionName === 'Open Gantt Chart') navigate('/all-project-gantt-chart');
    else if (actionName === 'Run Forecast') navigate('/project-list');
    else alert(`${actionName} functionality will be implemented here.`);
  };

  const getActiveMetrics = () => {
    const isFiltered = currentProject !== "All Projects" || currentDept !== "All Departments" || currentStatus !== "All Status";
    
    if (!isFiltered && dashboardData) {
      const minDate = projectsList.reduce((min, p) => !min || (p.stDt && new Date(p.stDt) < new Date(min)) ? p.stDt : min, null);
      const maxDate = projectsList.reduce((max, p) => !max || (p.endDt && new Date(p.endDt) > new Date(max)) ? p.endDt : max, null);
      
      const formatDateStr = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
      };

      const dateRangeStr = minDate && maxDate ? `${formatDateStr(minDate)} ~ ${formatDateStr(maxDate)}` : "All Dates";

      return {
        dateRange: dateRangeStr,
        stats: [
          { label: "Total Projects", value: dashboardData.summary?.totalProjects || 0, sub: "All Status", icon: FolderOpen, color: "pm-blue" },
          { label: "Live Projects", value: dashboardData.summary?.liveProjects || 0, sub: (dashboardData.summary?.liveProjectsPercentage || 0).toFixed(2) + "%", icon: Play, color: "pm-green" },
          { label: "Overall Progress", value: (dashboardData.summary?.overallProgress || 0).toFixed(2) + "%", sub: "Avg. Project Progress", icon: BarChart2, color: "pm-purple" },
          { label: "Delayed Projects", value: dashboardData.summary?.delayedProjects || 0, sub: (dashboardData.summary?.delayedProjectsPercentage || 0).toFixed(2) + "%", icon: Clock, color: "pm-orange" },
          { label: "Upcoming Milestones", value: dashboardData.summary?.upcomingMilestonesCount || 0, sub: "Next 30 Days", icon: CalendarCheck, color: "pm-teal" },
          { label: "Overdue Tasks", value: dashboardData.summary?.overdueTasksCount || 0, sub: (dashboardData.summary?.overdueTasksPercentage || 0).toFixed(2) + "%", icon: AlertTriangle, color: "pm-red" },
        ],
        portfolio: {
          total: dashboardData.summary?.totalProjects || 0,
          percentage: (dashboardData.summary?.overallProgress || 0).toFixed(2) + "%",
          items: [
            { label: "Completed", count: dashboardData.portfolioProgress?.completed || 0, pct: dashboardData.portfolioProgress?.total ? ((dashboardData.portfolioProgress.completed / dashboardData.portfolioProgress.total) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
            { label: "In Progress", count: dashboardData.portfolioProgress?.inProgress || 0, pct: dashboardData.portfolioProgress?.total ? ((dashboardData.portfolioProgress.inProgress / dashboardData.portfolioProgress.total) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
            { label: "Not Started", count: dashboardData.portfolioProgress?.notStarted || 0, pct: dashboardData.portfolioProgress?.total ? ((dashboardData.portfolioProgress.notStarted / dashboardData.portfolioProgress.total) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
            { label: "Delayed", count: dashboardData.portfolioProgress?.delayed || 0, pct: dashboardData.portfolioProgress?.total ? ((dashboardData.portfolioProgress.delayed / dashboardData.portfolioProgress.total) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
          ]
        },
        milestone: {
          total: dashboardData.milestoneStatus?.total || 0,
          items: [
            { label: "Completed", count: dashboardData.milestoneStatus?.completed || 0, pct: dashboardData.milestoneStatus?.total ? ((dashboardData.milestoneStatus.completed / dashboardData.milestoneStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
            { label: "In Progress", count: dashboardData.milestoneStatus?.inProgress || 0, pct: dashboardData.milestoneStatus?.total ? ((dashboardData.milestoneStatus.inProgress / dashboardData.milestoneStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
            { label: "Not Started", count: dashboardData.milestoneStatus?.notStarted || 0, pct: dashboardData.milestoneStatus?.total ? ((dashboardData.milestoneStatus.notStarted / dashboardData.milestoneStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
            { label: "Delayed", count: dashboardData.milestoneStatus?.delayed || 0, pct: dashboardData.milestoneStatus?.total ? ((dashboardData.milestoneStatus.delayed / dashboardData.milestoneStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
          ]
        },
        task: {
          total: dashboardData.taskStatus?.total || 0,
          items: [
            { label: "Completed", count: dashboardData.taskStatus?.completed || 0, pct: dashboardData.taskStatus?.total ? ((dashboardData.taskStatus.completed / dashboardData.taskStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
            { label: "In Progress", count: dashboardData.taskStatus?.inProgress || 0, pct: dashboardData.taskStatus?.total ? ((dashboardData.taskStatus.inProgress / dashboardData.taskStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
            { label: "Under Review", count: dashboardData.taskStatus?.underReview || 0, pct: dashboardData.taskStatus?.total ? ((dashboardData.taskStatus.underReview / dashboardData.taskStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#8b5cf6" },
            { label: "Not Started", count: dashboardData.taskStatus?.notStarted || 0, pct: dashboardData.taskStatus?.total ? ((dashboardData.taskStatus.notStarted / dashboardData.taskStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
            { label: "Overdue", count: dashboardData.taskStatus?.overdue || 0, pct: dashboardData.taskStatus?.total ? ((dashboardData.taskStatus.overdue / dashboardData.taskStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
          ]
        },
        delayedMilestones: (dashboardData.delayedMilestones || []).map(m => ({
          name: m.milestoneTitle,
          project: m.projectCd,
          delay: m.delayDays
        })),
        upcomingMilestones: (dashboardData.upcomingMilestones || []).map(m => ({
          name: m.milestoneTitle,
          project: m.projectCd,
          date: m.dueDate,
          status: m.status
        })),
        highPriorityTasks: (dashboardData.highPriorityTasks || []).map(t => ({
          task: t.taskNm,
          project: t.projectCd,
          assignee: t.assigneeNm,
          due: t.dueDate,
          urgent: true
        })),
        forecast: {
          current: (dashboardData.forecastSummary?.currentProgress || 0).toFixed(2) + "%",
          planned: (dashboardData.forecastSummary?.plannedProgress || 0).toFixed(2) + "%",
          variance: (dashboardData.forecastSummary?.variance || 0).toFixed(2) + "%",
          expected: dashboardData.forecastSummary?.expectedCompletionDate || "—",
          daysAhead: dashboardData.forecastSummary?.daysAhead != null
            ? `${dashboardData.forecastSummary.daysAhead} Days Remaining`
            : "—",
          atRisk: dashboardData.forecastSummary?.projectsAtRiskCount || 0,
          atRiskPct: (dashboardData.forecastSummary?.projectsAtRiskPercentage || 0).toFixed(2) + "%",
          onTrack: {
            count: dashboardData.forecastSummary?.onTrackProjectsCount || 0,
            pct: (dashboardData.forecastSummary?.onTrackProjectsPercentage || 0).toFixed(2) + "%"
          },
          mayDelay: {
            count: dashboardData.forecastSummary?.mayDelayProjectsCount || 0,
            pct: (dashboardData.forecastSummary?.mayDelayProjectsPercentage || 0).toFixed(2) + "%"
          },
          atRiskProjects: {
            count: dashboardData.forecastSummary?.atRiskProjectsCount || 0,
            pct: (dashboardData.forecastSummary?.atRiskProjectsPercentage || 0).toFixed(2) + "%"
          }
        }
      };
    }

    const now = new Date();
    
    let filteredProjects = [...projectsList];
    if (currentProject !== "All Projects") {
      filteredProjects = filteredProjects.filter(p => (p.prjNm || p.prjnm) === currentProject);
    }
    if (currentDept !== "All Departments") {
      const targetDept = departmentsList.find(d => (d.deptNm || d.deptnm) === currentDept);
      if (targetDept) {
        filteredProjects = filteredProjects.filter(p => (p.deptId || p.deptid) === (targetDept.deptId || targetDept.deptid));
      } else {
        filteredProjects = [];
      }
    }
    if (currentStatus !== "All Status") {
      filteredProjects = filteredProjects.filter(p => (p.prjSts || p.prjsts) === currentStatus);
    }

    const projectIds = filteredProjects.map(p => p.prjId || p.prjid || p.id);
    const filteredMilestones = milestonesList.filter(m => projectIds.includes(m.prjId || m.prjid));
    const milestoneIds = filteredMilestones.map(m => m.mId || m.mid || m.id);
    const filteredTasks = tasksList.filter(t => milestoneIds.includes(t.milestoneId || t.mid || t.mId || t.drftMId || t.drft_m_id));

    const getProjectProgress = (p) => {
      const pId = p.prjId || p.prjid || p.id;
      const ms = milestonesList.filter(m => (m.prjId || m.prjid) === pId);
      const msIds = ms.map(m => m.mId || m.mid || m.id);
      const t = tasksList.filter(task => msIds.includes(task.milestoneId || task.mid || task.mId || task.drftMId || task.drft_m_id));
      
      if (t.length > 0) {
        const completed = t.filter(task => (task.taskSts || task.tasksts || "").toUpperCase() === "COMPLETED").length;
        return (completed / t.length) * 100;
      } else if (ms.length > 0) {
        const completed = ms.filter(m => {
          const status = (m.mlstnSts || m.mlstnsts || "").toUpperCase();
          return status === "COMPLETED" || status === "CLOSED";
        }).length;
        return (completed / ms.length) * 100;
      }
      return 0;
    };

    const avgProgress = filteredProjects.length > 0
      ? (filteredProjects.reduce((sum, p) => sum + getProjectProgress(p), 0) / filteredProjects.length)
      : 0;

    const liveProjectsCount = filteredProjects.filter(p => (p.prjSts || p.prjsts) === "LIVE").length;
    const delayedProjectsCount = filteredProjects.filter(p => {
      const progress = getProjectProgress(p);
      const end = p.endDt || p.enddt;
      return end && new Date(end) < now && progress < 100;
    }).length;

    const next30Days = new Date();
    next30Days.setDate(now.getDate() + 30);

    const upcomingMs = filteredMilestones.filter(m => {
      const status = (m.mlstnSts || m.mlstnsts || "").toUpperCase();
      if (status === "COMPLETED" || status === "CLOSED") return false;
      const start = m.stDt || m.stdt ? new Date(m.stDt || m.stdt) : null;
      return start && start >= now && start <= next30Days;
    }).sort((a, b) => {
      const dateA = new Date(a.stDt || a.stdt || 0);
      const dateB = new Date(b.stDt || b.stdt || 0);
      return dateA - dateB;
    });

    const overdueT = filteredTasks.filter(t => {
      const status = (t.taskSts || t.tasksts || "").toUpperCase();
      if (status === "COMPLETED") return false;
      const end = t.endDt || t.enddt ? new Date(t.endDt || t.enddt) : null;
      return end && end < now;
    });

    const msTotal = filteredMilestones.length;
    const msCompleted = filteredMilestones.filter(m => {
      const status = (m.mlstnSts || m.mlstnsts || "").toUpperCase();
      return status === "COMPLETED" || status === "CLOSED";
    }).length;
    const msDelayed = filteredMilestones.filter(m => {
      const status = (m.mlstnSts || m.mlstnsts || "").toUpperCase();
      if (status === "COMPLETED" || status === "CLOSED") return false;
      const end = m.endDt || m.enddt ? new Date(m.endDt || m.enddt) : null;
      return end && end < now;
    }).length;
    const msInProgress = filteredMilestones.filter(m => {
      const status = (m.mlstnSts || m.mlstnsts || "").toUpperCase();
      if (status === "COMPLETED" || status === "CLOSED") return false;
      const end = m.endDt || m.enddt ? new Date(m.endDt || m.enddt) : null;
      return (!end || end >= now) && status === "WIP";
    }).length;
    const msNotStarted = Math.max(0, msTotal - msCompleted - msDelayed - msInProgress);

    const tTotal = filteredTasks.length;
    const tCompleted = filteredTasks.filter(t => (t.taskSts || t.tasksts || "").toUpperCase() === "COMPLETED").length;
    const tInProgress = filteredTasks.filter(t => {
      const s = (t.taskSts || t.tasksts || "").toUpperCase();
      return s === "WIP" || s === "IN_PROGRESS";
    }).length;
    const tUnderReview = filteredTasks.filter(t => {
      const s = (t.taskSts || t.tasksts || "").toUpperCase();
      return s === "UNDER_REVIEW" || s === "SUBMIT_REVIEW";
    }).length;
    const tOverdue = overdueT.length;
    const tNotStarted = Math.max(0, tTotal - tCompleted - tInProgress - tUnderReview - tOverdue);

    const formatDateStr = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
    };

    const minDate = filteredProjects.reduce((min, p) => !min || ((p.stDt || p.stdt) && new Date(p.stDt || p.stdt) < new Date(min)) ? (p.stDt || p.stdt) : min, null);
    const maxDate = filteredProjects.reduce((max, p) => !max || ((p.endDt || p.enddt) && new Date(p.endDt || p.enddt) > new Date(max)) ? (p.endDt || p.enddt) : max, null);
    const dateRangeStr = minDate && maxDate ? `${formatDateStr(minDate)} ~ ${formatDateStr(maxDate)}` : "All Dates";

    return {
      dateRange: dateRangeStr,
      stats: [
        { label: "Total Projects", value: filteredProjects.length, sub: "All Status", icon: FolderOpen, color: "pm-blue" },
        { label: "Live Projects", value: liveProjectsCount, sub: filteredProjects.length > 0 ? ((liveProjectsCount / filteredProjects.length) * 100).toFixed(1) + "%" : "0.0%", icon: Play, color: "pm-green" },
        { label: "Overall Progress", value: avgProgress.toFixed(2) + "%", sub: "Avg. Project Progress", icon: BarChart2, color: "pm-purple" },
        { label: "Delayed Projects", value: delayedProjectsCount, sub: filteredProjects.length > 0 ? ((delayedProjectsCount / filteredProjects.length) * 100).toFixed(1) + "%" : "0.0%", icon: Clock, color: "pm-orange" },
        { label: "Upcoming Milestones", value: upcomingMs.length, sub: "Next 30 Days", icon: CalendarCheck, color: "pm-teal" },
        { label: "Overdue Tasks", value: overdueT.length, sub: tTotal > 0 ? ((overdueT.length / tTotal) * 100).toFixed(1) + "%" : "0.0%", icon: AlertTriangle, color: "pm-red" },
      ],
      portfolio: {
        total: filteredProjects.length,
        percentage: avgProgress.toFixed(2) + "%",
        items: [
          { label: "Completed", count: msCompleted, pct: msTotal ? ((msCompleted / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
          { label: "In Progress", count: msInProgress, pct: msTotal ? ((msInProgress / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
          { label: "Not Started", count: msNotStarted, pct: msTotal ? ((msNotStarted / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
          { label: "Delayed", count: msDelayed, pct: msTotal ? ((msDelayed / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
        ]
      },
      milestone: {
        total: msTotal,
        items: [
          { label: "Completed", count: msCompleted, pct: msTotal ? ((msCompleted / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
          { label: "In Progress", count: msInProgress, pct: msTotal ? ((msInProgress / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
          { label: "Not Started", count: msNotStarted, pct: msTotal ? ((msNotStarted / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
          { label: "Delayed", count: msDelayed, pct: msTotal ? ((msDelayed / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
        ]
      },
      task: {
        total: tTotal,
        items: [
          { label: "Completed", count: tCompleted, pct: tTotal ? ((tCompleted / tTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
          { label: "In Progress", count: tInProgress, pct: tTotal ? ((tInProgress / tTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
          { label: "Under Review", count: tUnderReview, pct: tTotal ? ((tUnderReview / tTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#8b5cf6" },
          { label: "Not Started", count: tNotStarted, pct: tTotal ? ((tNotStarted / tTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
          { label: "Overdue", count: tOverdue, pct: tTotal ? ((tOverdue / tTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
        ]
      },
      delayedMilestones: filteredMilestones.filter(m => {
        const status = (m.mlstnSts || m.mlstnsts || "").toUpperCase();
        if (status === "COMPLETED" || status === "CLOSED") return false;
        const end = m.endDt || m.enddt ? new Date(m.endDt || m.enddt) : null;
        return end && end < now;
      }).map(m => {
        const prjId = m.prjId || m.prjid || m.id;
        const prj = filteredProjects.find(p => (p.prjId || p.prjid || p.id) === prjId);
        const mEnd = m.endDt || m.enddt;
        const delayDays = Math.ceil((now - new Date(mEnd)) / (1000 * 60 * 60 * 24));
        return {
          name: m.mlstnTtl || m.mlstnttl,
          project: prj ? (prj.prjCd || prj.prjcd || "N/A") : "N/A",
          delay: delayDays > 0 ? delayDays : 0
        };
      }).sort((a, b) => b.delay - a.delay).slice(0, 5),
      upcomingMilestones: upcomingMs.map(m => {
        const prjId = m.prjId || m.prjid || m.id;
        const prj = filteredProjects.find(p => (p.prjId || p.prjid || p.id) === prjId);
        return {
          name: m.mlstnTtl || m.mlstnttl,
          project: prj ? (prj.prjCd || prj.prjcd || "N/A") : "N/A",
          date: formatDateStr(m.stDt || m.stdt),
          status: m.mlstnSts || m.mlstnsts || "Pending"
        };
      }).slice(0, 5),
      highPriorityTasks: filteredTasks.filter(t => (t.taskSts || t.tasksts || "").toUpperCase() !== "COMPLETED").map(t => {
        const prj = filteredProjects.find(p => {
          const mId = t.milestoneId || t.mid || t.mId || t.drftMId || t.drft_m_id;
          const ms = milestonesList.find(mil => (mil.mId || mil.mid || mil.id) === mId);
          const prjId = ms ? (ms.prjId || ms.prjid || ms.id) : null;
          return prjId && (p.prjId || p.prjid || p.id) === prjId;
        });
        const empId = t.empId || t.empid;
        const emp = employeesList.find(e => (e.empId || e.empid) === empId);
        return {
          task: t.taskNm || t.tasknm,
          project: prj ? (prj.prjCd || prj.prjcd || "N/A") : "N/A",
          assignee: emp ? `${emp.fstNm || emp.firstName || ""} ${emp.lstNm || emp.lastName || ""}`.trim() : "Unassigned",
          due: formatDateStr(t.endDt || t.enddt),
          urgent: (t.taskSts || t.tasksts || "").toUpperCase() === "WIP" || ((t.endDt || t.enddt) && new Date(t.endDt || t.enddt) < now)
        };
      }).slice(0, 5),
      forecast: (() => {
        // Expected completion = latest project end date, or today + remaining days estimate
        const latestEndDate = filteredProjects.reduce((max, p) =>
          p.endDt && (!max || new Date(p.endDt) > new Date(max)) ? p.endDt : max, null);
        const expectedDate = latestEndDate ? new Date(latestEndDate) : null;
        const daysLeft = expectedDate ? Math.ceil((expectedDate - now) / (1000 * 60 * 60 * 24)) : null;
        const daysAheadStr = daysLeft !== null
          ? (daysLeft >= 0 ? `${daysLeft} Days Remaining` : `${Math.abs(daysLeft)} Days Overdue`)
          : "—";
        // Planned progress = % of time elapsed between earliest start and latest end
        const earliestStartDate = filteredProjects.reduce((min, p) =>
          p.stDt && (!min || new Date(p.stDt) < new Date(min)) ? p.stDt : min, null);
        let plannedPct = 0;
        if (earliestStartDate && latestEndDate) {
          const totalDuration = new Date(latestEndDate) - new Date(earliestStartDate);
          const elapsed = now - new Date(earliestStartDate);
          plannedPct = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;
        }
        const atRiskPct = filteredProjects.length > 0
          ? ((delayedProjectsCount / filteredProjects.length) * 100).toFixed(2) + "%"
          : "0.00%";
        return {
          current: avgProgress.toFixed(2) + "%",
          planned: plannedPct.toFixed(2) + "%",
          variance: (avgProgress - plannedPct).toFixed(2) + "%",
          expected: expectedDate ? formatDateStr(expectedDate) : "—",
          daysAhead: daysAheadStr,
          atRisk: delayedProjectsCount,
          atRiskPct,
          onTrack: {
            count: filteredProjects.length - delayedProjectsCount,
            pct: filteredProjects.length > 0 ? (((filteredProjects.length - delayedProjectsCount) / filteredProjects.length) * 100).toFixed(1) + "%" : "0.0%"
          },
          mayDelay: {
            count: delayedProjectsCount,
            pct: filteredProjects.length > 0 ? ((delayedProjectsCount / filteredProjects.length) * 100).toFixed(1) + "%" : "0.0%"
          },
          atRiskProjects: {
            count: delayedProjectsCount,
            pct: filteredProjects.length > 0 ? ((delayedProjectsCount / filteredProjects.length) * 100).toFixed(1) + "%" : "0.0%"
          }
        };
      })()
    };
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        height: "100vh", background: "#f8fafc", fontFamily: "Inter, sans-serif"
      }}>
        <div style={{
          border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%",
          width: "40px", height: "40px", animation: "spin 1s linear infinite"
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <span style={{ marginTop: "12px", fontSize: "14px", color: "#64748b", fontWeight: "500" }}>Loading dashboard...</span>
      </div>
    );
  }

  const activeData = getActiveMetrics();
  const { stats, portfolio, milestone, task, delayedMilestones, upcomingMilestones, highPriorityTasks, forecast } = activeData;

  const handleExportData = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Dashboard Export,${currentProject},${currentDept},${currentStatus}\n\n`;
    
    csvContent += "Key Metrics\nMetric,Value\n";
    stats.forEach(s => csvContent += `"${s.label}","${s.value}"\n`);
    
    csvContent += "\nDelayed Milestones\nMilestone,Project,Delay (Days)\n";
    delayedMilestones.forEach(m => csvContent += `"${m.name}","${m.project}","${m.delay}"\n`);
    
    csvContent += "\nUpcoming Milestones\nMilestone,Project,Date,Status\n";
    upcomingMilestones.forEach(m => csvContent += `"${m.name}","${m.project}","${m.date}","${m.status}"\n`);

    csvContent += "\nHigh Priority Tasks\nTask,Project,Assignee,Due Date,Urgency\n";
    highPriorityTasks.forEach(t => csvContent += `"${t.task}","${t.project}","${t.assignee}","${t.due}","${t.urgent ? 'High' : 'Normal'}"\n`);

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentProject.replace(" ", "_")}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseDateString = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.trim().split("-");
    if (parts.length !== 3) return "";
    const months = { "Jan":"01", "Feb":"02", "Mar":"03", "Apr":"04", "May":"05", "Jun":"06", "Jul":"07", "Aug":"08", "Sep":"09", "Oct":"10", "Nov":"11", "Dec":"12" };
    return `${parts[2]}-${months[parts[1]]}-${parts[0]}`;
  };
  
  const dateParts = (activeData.dateRange || "01-May-2025 ~ 31-Dec-2025").split("~");
  const startDateStr = parseDateString(dateParts[0]);
  const endDateStr = dateParts[1] ? parseDateString(dateParts[1]) : "";

  const projectOptions = ["All Projects", ...projectsList.map(p => p.prjNm)];
  const deptOptions = ["All Departments", ...departmentsList.map(d => d.deptNm)];
  const statusOptions = ["All Status", "LIVE", "HOLD", "CLOSED"];

  return (
    <div className="pm-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="pm-shell">
        {/* Header */}
        <Header title="Project Dashboard" showSearch={false} />

        <main className="pm-main">

          {/* ===== FILTER BAR ===== */}
          <div className="pm-filter-bar">
            <div className="pm-filter-group">
              <CustomDropdown
                value={currentProject}
                options={projectOptions}
                onChange={handleProjectChange}
              />
              <CustomDropdown
                value={currentDept}
                options={deptOptions}
                onChange={handleDeptChange}
              />
              <CustomDropdown
                value={currentStatus}
                options={statusOptions}
                onChange={handleStatusChange}
              />
              <div ref={datePickerRef} style={{ position: 'relative' }}>
                <button className="pm-filter-btn" onClick={() => setShowDatePicker(!showDatePicker)}>
                  <CalendarCheck size={14}/> {activeData.dateRange || "All Dates"} <ChevronDown size={14}/>
                </button>
                {showDatePicker && (
                  <div style={{
                    position: 'absolute', top: '40px', left: 0, backgroundColor: 'white', 
                    padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 100, display: 'flex', gap: '10px', alignItems: 'center', border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>Start Date</label>
                      <input type="date" value={startDateStr} readOnly style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', color: '#334155' }}/>
                    </div>
                    <span style={{ color: '#64748b', marginTop: '16px', fontSize: '12px', fontWeight: 'bold' }}>To</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>End Date</label>
                      <input type="date" value={endDateStr} readOnly style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', color: '#334155' }}/>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button className="pm-export-btn" onClick={handleExportData}><Download size={14}/> Export</button>
          </div>

          <div className="pm-stats-container pm-card">
            {stats.map((s, i) => (
              <div key={i} className={`pm-stat-item pm-stat-${s.color}`}>
                <div className="pm-stat-icon-box filled">
                  <s.icon size={24} color="white" />
                </div>
                <div className="pm-stat-info">
                  <div className="pm-stat-value">{s.value}</div>
                  <div className="pm-stat-label">{s.label}</div>
                  <div className="pm-stat-sub">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ===== 3 DONUT CHARTS ===== */}
          <div className="pm-charts-grid">

            {/* Dynamic Title */}
            <div className="pm-card">
              <div className="pm-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {currentProject}
                {currentProject === "All Projects" && (
                  <button 
                    onClick={() => navigate('/project-list', { state: { fromDashboard: true } })}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    View All <ArrowRight size={14} />
                  </button>
                )}
              </div>
              <div className="pm-chart-content">
                <DonutChart
                  data={portfolio.items}
                  total={portfolio.items.reduce((a, b) => a + b.count, 0)}
                  centerValue={portfolio.percentage}
                  centerLabel="Overall Progress"
                />
                <div className="pm-legend">
                  {portfolio.items.map((item, i) => (
                    <div key={i} className="pm-legend-row">
                      <span className="pm-dot" style={{ background: item.color }}></span>
                      <span className="pm-legend-label">{item.label}</span>
                      <span className="pm-legend-pct">{item.pct} ({item.count})</span>
                    </div>
                  ))}
                  {currentProject === "All Projects" && (
                    <div className="pm-legend-total">Total Projects: {portfolio.total}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Milestone Status */}
            <div className="pm-card">
              <div className="pm-card-title">Milestone Status</div>
              <div className="pm-chart-content">
                <DonutChart
                  data={milestone.items}
                  total={milestone.items.reduce((a, b) => a + b.count, 0)}
                  centerValue={milestone.total}
                  centerLabel="Total Milestones"
                />
                <div className="pm-legend">
                  {milestone.items.map((item, i) => (
                    <div key={i} className="pm-legend-row">
                      <span className="pm-dot" style={{ background: item.color }}></span>
                      <span className="pm-legend-label">{item.label}</span>
                      <span className="pm-legend-pct">{item.pct} ({item.count})</span>
                    </div>
                  ))}
                  <div className="pm-legend-total">Total Milestones: {milestone.total}</div>
                </div>
              </div>
            </div>

            {/* Task Status Overview */}
            <div className="pm-card">
              <div className="pm-card-title">Task Status Overview</div>
              <div className="pm-chart-content">
                <DonutChart
                  data={task.items}
                  total={task.items.reduce((a, b) => a + b.count, 0)}
                  centerValue={task.total}
                  centerLabel="Total Tasks"
                />
                <div className="pm-legend">
                  {task.items.map((item, i) => (
                    <div key={i} className="pm-legend-row">
                      <span className="pm-dot" style={{ background: item.color }}></span>
                      <span className="pm-legend-label">{item.label}</span>
                      <span className="pm-legend-pct">{item.pct}</span>
                    </div>
                  ))}
                  <div className="pm-legend-total">Total Tasks: {task.total}</div>
                </div>
              </div>
            </div>

          </div>

          {/* ===== 3 TABLES SECTION ===== */}
          <div className="pm-tables-grid">

            {/* Delayed Milestones */}
            <div className="pm-card pm-table-card">
              <div className="pm-table-header">
                <span className="pm-card-title">Delayed Milestones</span>
                <button onClick={() => navigate('/project-list')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }} className="pm-view-all">View All</button>
              </div>
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>Project</th>
                    <th>Delay (Days)</th>
                  </tr>
                </thead>
                <tbody>
                  {delayedMilestones.map((row, i) => (
                    <tr key={i}>
                      <td>{row.name}</td>
                      <td className="pm-text-muted">{row.project}</td>
                      <td><span className="pm-badge pm-badge-red">{row.delay}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Upcoming Milestones */}
            <div className="pm-card pm-table-card">
              <div className="pm-table-header">
                <span className="pm-card-title">Upcoming Milestones <span className="pm-card-sub">(Next 30 Days)</span></span>
                <button onClick={() => navigate('/project-list')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }} className="pm-view-all">View All</button>
              </div>
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>Project</th>
                    <th>Start Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMilestones.map((row, i) => (
                    <tr key={i}>
                      <td>{row.name}</td>
                      <td className="pm-text-muted">{row.project}</td>
                      <td className="pm-text-muted">{row.date}</td>
                      <td>
                        <span className={`pm-badge ${row.status === "In Progress" ? "pm-badge-blue" : "pm-badge-orange"}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* High Priority Tasks */}
            <div className="pm-card pm-table-card">
              <div className="pm-table-header">
                <span className="pm-card-title">High Priority Tasks</span>
                <button onClick={() => navigate('/project-list')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }} className="pm-view-all">View All</button>
              </div>
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {highPriorityTasks.map((row, i) => (
                    <tr key={i}>
                      <td>{row.task}</td>
                      <td className="pm-text-muted">{row.project}</td>
                      <td>{row.assignee}</td>
                      <td>
                        <span className={`pm-due-date ${row.urgent ? "pm-due-urgent" : "pm-due-normal"}`}>
                          {row.due}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* ===== FORECAST SUMMARY ===== */}
          <div className="pm-card pm-forecast-card">
            <div className="pm-card-title">Forecast Summary</div>
            <div className="pm-forecast-container">

              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-blue">
                  <BarChart2 size={18} strokeWidth={2}/>
                </div>
                <div>
                  <div className="pm-forecast-sub">Current Progress</div>
                  <div className="pm-forecast-val">{forecast.current}</div>
                  <div className="pm-forecast-note">As on {new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-purple">
                  <CheckSquare size={18} strokeWidth={2}/>
                </div>
                <div>
                  <div className="pm-forecast-sub">Planned Progress</div>
                  <div className="pm-forecast-val">{forecast.planned}</div>
                  <div className="pm-forecast-note">(Baseline Plan)</div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-red">
                  <TrendingDown size={18} strokeWidth={2}/>
                </div>
                <div>
                  <div className="pm-forecast-sub">Variance</div>
                  <div className="pm-forecast-val pm-text-red">{forecast.variance}</div>
                  <div className="pm-forecast-note">(Behind Plan)</div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-teal">
                  <CalendarCheck size={18} strokeWidth={2}/>
                </div>
                <div>
                  <div className="pm-forecast-sub">Expected Completion</div>
                  <div className="pm-forecast-val pm-text-teal">{forecast.expected}</div>
                  <div className="pm-forecast-note pm-text-teal">{forecast.daysAhead}</div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-orange">
                  <AlertTriangle size={18} strokeWidth={2}/>
                </div>
                <div>
                  <div className="pm-forecast-sub">Projects At Risk</div>
                  <div className="pm-forecast-val pm-text-orange">{forecast.atRisk}</div>
                  <div className="pm-forecast-note">{forecast.atRiskPct} of Total</div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              {/* Risk Summary */}
              <div className="pm-risk-summary">
                <div className="pm-risk-row">
                  <span className="pm-risk-dot pm-risk-green">▲</span>
                  <span className="pm-risk-label">On Track Projects</span>
                  <span className="pm-risk-val">{forecast.onTrack.count}</span>
                  <span className="pm-risk-pct">({forecast.onTrack.pct})</span>
                </div>
                <div className="pm-risk-row">
                  <span className="pm-risk-dot pm-risk-orange">●</span>
                  <span className="pm-risk-label">May Delay</span>
                  <span className="pm-risk-val">{forecast.mayDelay.count}</span>
                  <span className="pm-risk-pct">({forecast.mayDelay.pct})</span>
                </div>
                <div className="pm-risk-row">
                  <span className="pm-risk-dot pm-risk-red">▼</span>
                  <span className="pm-risk-label">At Risk Projects</span>
                  <span className="pm-risk-val">{forecast.atRiskProjects.count}</span>
                  <span className="pm-risk-pct">({forecast.atRiskProjects.pct})</span>
                </div>
              </div>

            </div>
          </div>

          {/* ===== QUICK ACTIONS ===== */}
          <div className="pm-card pm-quick-actions-card">
            <div className="pm-card-title">Quick Actions</div>
            <div className="pm-quick-grid">
              <button className="pm-action-btn pm-action-blue" onClick={() => handleActionClick("Create Project")}>
                <Plus size={18}/> Create Project
              </button>
              <button className="pm-action-btn pm-action-green" onClick={() => handleActionClick("Add Milestone")}>
                <Flag size={18}/> Add Milestone
              </button>
              <button className="pm-action-btn pm-action-purple" onClick={() => handleActionClick("Create Task")}>
                <CheckSquare size={18}/> Create Task
              </button>
              <button className="pm-action-btn pm-action-teal" onClick={() => handleActionClick("Open Gantt Chart")}>
                <BarChart2 size={18}/> Open Gantt Chart
              </button>
              <button className="pm-action-btn pm-action-orange" onClick={() => handleActionClick("Run Forecast")}>
                <TrendingUp size={18}/> Run Forecast
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default ProjectManagerDashboard;

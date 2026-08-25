import React, { useState, useEffect, useRef } from "react";
import {
  FolderOpen, Play, BarChart2, Clock, CalendarCheck, AlertTriangle,
  Download, Filter, ChevronDown, Plus, Flag, CheckSquare,
  TrendingUp, TrendingDown, ArrowRight, Shield, AlertCircle, Eye, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
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
          fontFamily: 'Inter, sans-serif', minWidth: '180px',
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
          zIndex: 999, minWidth: '200px', maxHeight: '300px', overflowY: 'auto',
          padding: '4px 0'
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: '8px 16px', fontSize: '13px', fontWeight: '500',
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

  const navigate = useNavigate();
  const [isViewAllLoading, setIsViewAllLoading] = useState(false);

  const handleViewAllClick = (e) => {
    if (e) e.preventDefault();
    setIsViewAllLoading(true);
    setTimeout(() => {
      navigate('/project-list', { state: { fromDashboard: true } });
    }, 400);
  };

  const handleViewAllMilestonesClick = (e) => {
    if (e) e.preventDefault();
    setIsViewAllLoading(true);
    setTimeout(() => {
      navigate('/milestone-creation', { state: { fromDashboard: true } });
    }, 400);
  };

  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

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

  const getUniqueProjectOptions = (projects) => {
    const uniqueProjects = new Map();
    projects.forEach(p => {
      const code = p.prjCd || p.prjcd;
      const name = p.prjNm || p.prjnm;
      if (code && name) {
        const key = `${code} - ${name}`;
        if (!uniqueProjects.has(key)) {
          uniqueProjects.set(key, { code, name, projectId: p.prjId || p.prjid || p.id });
        }
      }
    });
    return Array.from(uniqueProjects.keys()).sort();
  };

  const getProjectDetailsFromDisplay = (displayValue) => {
    if (displayValue === "All Projects") return null;
    const parts = displayValue.split(" - ");
    if (parts.length === 2) {
      return { code: parts[0], name: parts[1] };
    }
    return null;
  };

  const getProjectIdFromDisplay = (displayValue) => {
    if (displayValue === "All Projects") return null;
    const parts = displayValue.split(" - ");
    if (parts.length === 2) {
      const code = parts[0];
      const name = parts[1];
      const project = projectsList.find(p =>
        (p.prjCd || p.prjcd || "").toLowerCase() === code.toLowerCase() &&
        (p.prjNm || p.prjnm || "").toLowerCase() === name.toLowerCase()
      );
      return project ? (project.prjId || project.prjid || project.id) : null;
    }
    return null;
  };

  const handleViewInDetail = () => {
    if (currentProject === "All Projects") {
      navigate('/project-list');
    } else {
      const projectId = getProjectIdFromDisplay(currentProject);
      if (projectId) {
        navigate(`/project-details/${projectId}`, {
          state: {
            fromForecast: true,
            projectDisplay: currentProject
          }
        });
      } else {
        alert("Project details not found. Please try again.");
      }
    }
  };

  const handleProjectChange = (val) => setCurrentProject(val);

  const handleActionClick = (actionName) => {
    if (actionName === 'Create Project') navigate('/project-creation', { state: { createMode: true } });
    else if (actionName === 'Add Milestone') navigate('/milestone-creation', { state: { createMode: true } });
    else if (actionName === 'Create Task') navigate('/milestone-creation', { state: { createMode: true, taskMode: true, step: 2 } });
    else if (actionName === 'Open Gantt Chart') {
      if (currentProject && currentProject !== "All Projects") {
        const projectId = getProjectIdFromDisplay(currentProject);
        if (projectId) {
          navigate('/all-project-gantt-chart', { state: { projectFilter: `PRJ-${projectId}` } });
          return;
        }
      }
      navigate('/all-project-gantt-chart');
    }
    else if (actionName === 'Run Forecast') navigate('/project-list');
    else alert(`${actionName} functionality will be implemented here.`);
  };

  const getTaskStatusStr = (t) => {
    if (!t) return "";
    let sts = t.taskSts ?? t.tasksts ?? t.status ?? t.task_sts;
    if (!sts && t.rawTask) sts = t.rawTask.taskSts;
    if (typeof sts === "object") {
      sts = sts.statusNm || sts.status_nm || sts.name || sts.status || "";
    }
    const str = String(sts).trim().toUpperCase();
    if (str === "4" || str === "CLOSED" || str === "COMPLETED" || str === "DONE") return "CLOSED";
    if (str === "3" || str === "WIP" || str === "IN_PROGRESS" || str === "IN PROGRESS") return "WIP";
    if (str === "2" || str === "OPEN") return "OPEN";
    if (str === "1" || str === "DRAFT") return "DRAFT";
    if (str === "5" || str === "HOLD") return "HOLD";
    return str;
  };

  const getMilestoneStatusStr = (m) => {
    if (!m) return "";
    let sts = m.mlstnSts ?? m.mlstnsts ?? m.status ?? m.mlstn_sts;
    if (typeof sts === "object") {
      sts = sts.statusNm || sts.status_nm || sts.name || sts.status || "";
    }
    const str = String(sts).trim().toUpperCase();
    if (str === "CLOSED" || str === "COMPLETED" || str === "DONE") return "CLOSED";
    if (str === "WIP" || str === "IN_PROGRESS" || str === "IN PROGRESS") return "WIP";
    return str;
  };

  const calculateProjectStats = (project) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const pId = String(project.prjId || project.prjid || project.id || project.projectId);

    const projectMilestones = milestonesList.filter(m => String(m.prjId || m.prjid || m.projectId || m.prj_id) === pId);
    const milestoneIds = projectMilestones.map(m => String(m.mId || m.mid || m.id));

    const projectTasks = tasksList.filter(t => {
      const tPrjId = String(t.prjId || t.prjid || t.projectId || t.prj_id || "");
      if (tPrjId && tPrjId === pId) return true;
      const tMId = String(t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id || "");
      return milestoneIds.includes(tMId);
    });

    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(t => getTaskStatusStr(t) === "CLOSED").length;
    const inProgressTasks = projectTasks.filter(t => getTaskStatusStr(t) === "WIP").length;
    const overdueTasks = projectTasks.filter(t => {
      if (getTaskStatusStr(t) === "CLOSED") return false;
      const end = t.endDt || t.enddt || t.endDate ? new Date(t.endDt || t.enddt || t.endDate) : null;
      return end && end < now;
    }).length;
    const notStartedTasks = Math.max(0, totalTasks - completedTasks - inProgressTasks - overdueTasks);

    const isMilestoneDone = (m) => {
      if (getMilestoneStatusStr(m) === "CLOSED") return true;
      const mId = String(m.mId || m.mid || m.id);
      const mTasks = projectTasks.filter(t => {
        const tMId = String(t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id || "");
        return tMId === mId;
      });
      return mTasks.length > 0 && mTasks.every(t => getTaskStatusStr(t) === "CLOSED");
    };

    const isMilestoneActive = (m) => {
      if (isMilestoneDone(m)) return false;
      if (getMilestoneStatusStr(m) === "WIP") return true;
      const mId = String(m.mId || m.mid || m.id);
      const mTasks = projectTasks.filter(t => {
        const tMId = String(t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id || "");
        return tMId === mId;
      });
      const hasClosedOrWip = mTasks.some(t => getTaskStatusStr(t) === "CLOSED" || getTaskStatusStr(t) === "WIP");
      const start = m.stDt || m.stdt || m.startDate ? new Date(m.stDt || m.stdt || m.startDate) : null;
      const end = m.endDt || m.enddt || m.endDate ? new Date(m.endDt || m.enddt || m.endDate) : null;
      return hasClosedOrWip || (start && start <= now && (!end || end >= now));
    };

    const isMilestoneLate = (m) => {
      if (isMilestoneDone(m)) return false;
      const end = m.endDt || m.enddt || m.endDate ? new Date(m.endDt || m.enddt || m.endDate) : null;
      return end && end < now;
    };

    const totalMilestones = projectMilestones.length;
    const completedMilestones = projectMilestones.filter(m => isMilestoneDone(m)).length;
    const overdueMilestones = projectMilestones.filter(m => isMilestoneLate(m)).length;
    const inProgressMilestones = projectMilestones.filter(m => isMilestoneActive(m)).length;
    const notStartedMilestones = Math.max(0, totalMilestones - completedMilestones - inProgressMilestones - overdueMilestones);

    let overallProgress = 0;
    if (totalTasks > 0) {
      overallProgress = (completedTasks / totalTasks) * 100;
    } else if (totalMilestones > 0) {
      overallProgress = (completedMilestones / totalMilestones) * 100;
    }

    const next60Days = new Date();
    next60Days.setDate(now.getDate() + 60);
    const upcomingMilestones = projectMilestones.filter(m => {
      if (getMilestoneStatusStr(m) === "CLOSED") return false;
      const start = m.stDt || m.stdt || m.startDate ? new Date(m.stDt || m.stdt || m.startDate) : null;
      const end = m.endDt || m.enddt || m.endDate ? new Date(m.endDt || m.enddt || m.endDate) : null;
      const targetDate = start || end;
      return targetDate && targetDate >= now && targetDate <= next60Days;
    });

    const taskStatusItems = [
      { label: "Closed", count: completedTasks, pct: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
      { label: "In Progress", count: inProgressTasks, pct: totalTasks > 0 ? ((inProgressTasks / totalTasks) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
      { label: "Not Started", count: notStartedTasks, pct: totalTasks > 0 ? ((notStartedTasks / totalTasks) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
      { label: "Overdue", count: overdueTasks, pct: totalTasks > 0 ? ((overdueTasks / totalTasks) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
    ];

    const milestoneStatusItems = [
      { label: "Closed", count: completedMilestones, pct: totalMilestones > 0 ? ((completedMilestones / totalMilestones) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
      { label: "In Progress", count: inProgressMilestones, pct: totalMilestones > 0 ? ((inProgressMilestones / totalMilestones) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
      { label: "Not Started", count: notStartedMilestones, pct: totalMilestones > 0 ? ((notStartedMilestones / totalMilestones) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
      { label: "Delayed", count: overdueMilestones, pct: totalMilestones > 0 ? ((overdueMilestones / totalMilestones) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
    ];

    const portfolioItems = [
      { label: "Closed", count: completedMilestones, pct: totalMilestones > 0 ? ((completedMilestones / totalMilestones) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
      { label: "In Progress", count: inProgressMilestones, pct: totalMilestones > 0 ? ((inProgressMilestones / totalMilestones) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
      { label: "Not Started", count: notStartedMilestones, pct: totalMilestones > 0 ? ((notStartedMilestones / totalMilestones) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
      { label: "Delayed", count: overdueMilestones, pct: totalMilestones > 0 ? ((overdueMilestones / totalMilestones) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
    ];

    const delayedMilestonesList = projectMilestones.filter(m => {
      if (isMilestoneDone(m)) return false;
      const end = m.endDt || m.enddt || m.endDate ? new Date(m.endDt || m.enddt || m.endDate) : null;
      return end && end < now;
    }).map(m => {
      const mEnd = m.endDt || m.enddt || m.endDate;
      const delayDays = Math.ceil((now - new Date(mEnd)) / (1000 * 60 * 60 * 24));
      return {
        name: m.mlstnTtl || m.mlstnttl || m.title || "Milestone",
        project: project.prjCd || project.prjcd || "N/A",
        delay: delayDays > 0 ? delayDays : 0
      };
    }).sort((a, b) => b.delay - a.delay).slice(0, 5);

    const upcomingMilestonesList = upcomingMilestones.map(m => ({
      name: m.mlstnTtl || m.mlstnttl || m.title || "Milestone",
      project: project.prjCd || project.prjcd || "N/A",
      date: formatDateStr(m.stDt || m.stdt || m.endDt || m.enddt),
      status: m.mlstnSts || m.mlstnsts || "Pending"
    })).slice(0, 5);

    const highPriorityTasksList = projectTasks.filter(t => getTaskStatusStr(t) !== "CLOSED").map(t => {
      const empId = t.empId || t.empid || t.emp_id;
      const emp = employeesList.find(e => String(e.empId || e.empid || e.emp_id) === String(empId));
      return {
        task: t.taskNm || t.tasknm || t.name,
        project: project.prjCd || project.prjcd || "N/A",
        assignee: emp ? `${emp.fstNm || emp.firstName || ""} ${emp.lstNm || emp.lastName || ""}`.trim() : "Unassigned",
        due: formatDateStr(t.endDt || t.enddt || t.endDate),
        urgent: getTaskStatusStr(t) === "WIP" || ((t.endDt || t.enddt) && new Date(t.endDt || t.enddt) < now)
      };
    }).slice(0, 5);

    return {
      stats: [
        {
          label: "Total Milestones",
          value: totalMilestones,
          sub: `${completedMilestones} Closed`,
          icon: Flag,
          color: "pm-purple"
        },
        {
          label: "Milestone Progress",
          value: totalMilestones > 0 ? `${((completedMilestones / totalMilestones) * 100).toFixed(1)}%` : "0.0%",
          sub: "Overall Progress",
          icon: BarChart2,
          color: "pm-green"
        },
        {
          label: "Delayed Milestones",
          value: overdueMilestones,
          sub: totalMilestones > 0 ? `${((overdueMilestones / totalMilestones) * 100).toFixed(1)}% of Milestones` : "0.0%",
          icon: Clock,
          color: "pm-orange"
        },
        {
          label: "Upcoming Milestones",
          value: upcomingMilestones.length,
          sub: "Next 30 Days",
          icon: CalendarCheck,
          color: "pm-teal"
        },
        {
          label: "Total Tasks",
          value: totalTasks,
          sub: `${completedTasks} Closed`,
          icon: CheckSquare,
          color: "pm-blue"
        },
        {
          label: "Delayed Tasks",
          value: overdueTasks,
          sub: totalTasks > 0 ? `${((overdueTasks / totalTasks) * 100).toFixed(1)}% of Tasks` : "0.0%",
          icon: AlertTriangle,
          color: "pm-red"
        },
      ],
      portfolio: {
        total: totalMilestones,
        percentage: overallProgress.toFixed(2) + "%",
        items: portfolioItems
      },
      milestone: {
        total: totalMilestones,
        items: milestoneStatusItems
      },
      task: {
        total: totalTasks,
        items: taskStatusItems
      },
      delayedMilestones: delayedMilestonesList,
      upcomingMilestones: upcomingMilestonesList,
      highPriorityTasks: highPriorityTasksList,
      forecast: getForecastData(currentProject)
    };
  };

  const formatDateStr = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const getForecastData = (projectDisplayValue) => {
    const now = new Date();

    let forecastProjects = [];
    if (!projectDisplayValue || projectDisplayValue === "All Projects") {
      forecastProjects = projectsList;
    } else {
      const projectDetails = getProjectDetailsFromDisplay(projectDisplayValue);
      if (projectDetails) {
        forecastProjects = projectsList.filter(p =>
          (p.prjCd || p.prjcd || "").toLowerCase() === projectDetails.code.toLowerCase() &&
          (p.prjNm || p.prjnm || "").toLowerCase() === projectDetails.name.toLowerCase()
        );
      } else {
        forecastProjects = [];
      }
    }

    if (forecastProjects.length === 0) {
      return {
        current: "0.00%",
        planned: "0.00%",
        variance: "0.00%",
        plannedCompletion: "—",
        expected: "—",
        daysAhead: "—",
        risk: "0.00%",
        riskLevel: "Low",
        atRisk: 0,
        projectCount: 0
      };
    }

    const getProjectProgress = (p) => {
      const pId = String(p.prjId || p.prjid || p.id || p.projectId || "");
      const ms = milestonesList.filter(m => String(m.prjId || m.prjid || m.projectId || m.prj_id || "") === pId);
      const msIds = ms.map(m => String(m.mId || m.mid || m.id));
      const t = tasksList.filter(task => {
        const tPrjId = String(task.prjId || task.prjid || task.projectId || task.prj_id || "");
        if (tPrjId && tPrjId === pId) return true;
        const tMId = String(task.milestoneId || task.mid || task.mId || task.drftMId || task.drft_m_id || "");
        return msIds.includes(tMId);
      });

      if (t.length > 0) {
        const completed = t.filter(task => getTaskStatusStr(task) === "CLOSED").length;
        return (completed / t.length) * 100;
      } else if (ms.length > 0) {
        const completed = ms.filter(m => getMilestoneStatusStr(m) === "CLOSED").length;
        return (completed / ms.length) * 100;
      }
      return 0;
    };

    let avgProgress = 0;
    if ((!projectDisplayValue || projectDisplayValue === "All Projects") && dashboardData?.summary?.overallProgress != null) {
      avgProgress = dashboardData.summary.overallProgress;
    } else if (forecastProjects.length > 0) {
      avgProgress = forecastProjects.reduce((sum, p) => sum + getProjectProgress(p), 0) / forecastProjects.length;
    }
    avgProgress = Math.min(100, Math.max(0, avgProgress));

    const delayedProjectsCount = forecastProjects.filter(p => {
      const progress = getProjectProgress(p);
      const end = p.endDt || p.enddt || p.endDate;
      return end && new Date(end) < now && progress < 100;
    }).length;

    const parseProjDate = (dt) => {
      if (!dt) return null;
      const d = new Date(dt);
      return isNaN(d.getTime()) ? null : d;
    };

    const validStarts = forecastProjects.map(p => parseProjDate(p.stDt || p.stdt || p.startDate || p.st_dt)).filter(Boolean);
    const validEnds = forecastProjects.map(p => parseProjDate(p.endDt || p.enddt || p.endDate || p.end_dt)).filter(Boolean);

    const earliestStartDate = validStarts.length > 0 ? new Date(Math.min(...validStarts.map(d => d.getTime()))) : null;
    const latestEndDate = validEnds.length > 0 ? new Date(Math.max(...validEnds.map(d => d.getTime()))) : null;

    let plannedPct = 0;
    let totalTasksCount = 0;
    let totalTaskPlannedProgress = 0;

    forecastProjects.forEach(p => {
      const pId = String(p.prjId || p.prjid || p.id || p.projectId || "");
      const ms = milestonesList.filter(m => String(m.prjId || m.prjid || m.projectId || m.prj_id || "") === pId);
      const msIds = ms.map(m => String(m.mId || m.mid || m.id));
      const pTasks = tasksList.filter(task => {
        const tPrjId = String(task.prjId || task.prjid || task.projectId || task.prj_id || "");
        if (tPrjId && tPrjId === pId) return true;
        const tMId = String(task.milestoneId || task.mid || task.mId || task.drftMId || task.drft_m_id || "");
        return msIds.includes(tMId);
      });

      pTasks.forEach(t => {
        totalTasksCount++;
        const st = parseProjDate(t.stDt || t.stdt || t.startDate || t.st_dt);
        const end = parseProjDate(t.endDt || t.enddt || t.endDate || t.end_dt);
        if (st && end) {
          if (now >= end) totalTaskPlannedProgress += 100;
          else if (now <= st) totalTaskPlannedProgress += 0;
          else {
            const dur = end.getTime() - st.getTime();
            const el = now.getTime() - st.getTime();
            totalTaskPlannedProgress += dur > 0 ? Math.min(100, Math.max(0, (el / dur) * 100)) : 0;
          }
        } else if (end) {
          if (now >= end) totalTaskPlannedProgress += 100;
        }
      });
    });

    if (totalTasksCount > 0 && totalTaskPlannedProgress > 0) {
      plannedPct = totalTaskPlannedProgress / totalTasksCount;
    } else if (earliestStartDate && latestEndDate) {
      const totalDuration = latestEndDate.getTime() - earliestStartDate.getTime();
      const elapsed = now.getTime() - earliestStartDate.getTime();
      if (elapsed <= 0) {
        plannedPct = 0;
      } else if (totalDuration > 0) {
        plannedPct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      }
    }
    plannedPct = Math.min(100, Math.max(0, plannedPct));

    const variance = avgProgress - plannedPct;

    let plannedCompletionDate = latestEndDate;

    // EVM Velocity-based Expected Completion Date Calculation
    let expectedDate = null;
    if (avgProgress >= 100) {
      expectedDate = (plannedCompletionDate && now < plannedCompletionDate) ? now : (plannedCompletionDate || now);
    } else if (earliestStartDate && now > earliestStartDate && avgProgress > 0) {
      const elapsedDays = (now.getTime() - earliestStartDate.getTime()) / (1000 * 60 * 60 * 24);
      const velocityPctPerDay = avgProgress / elapsedDays; // % progress per day
      if (velocityPctPerDay > 0) {
        const remainingPct = 100 - avgProgress;
        const remainingDaysNeeded = Math.ceil(remainingPct / velocityPctPerDay);
        const projectedDate = new Date(now.getTime() + remainingDaysNeeded * 24 * 60 * 60 * 1000);
        expectedDate = projectedDate;
      } else {
        expectedDate = plannedCompletionDate || now;
      }
    } else {
      expectedDate = plannedCompletionDate || now;
    }

    let daysAheadStr = "—";
    if (expectedDate) {
      const daysLeft = Math.ceil((expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (expectedDate < now && avgProgress < 100) {
        daysAheadStr = `${Math.abs(daysLeft)} Days Overdue`;
      } else if (daysLeft >= 0) {
        daysAheadStr = `${daysLeft} Days Remaining`;
      } else {
        daysAheadStr = `Completed`;
      }
    }

    // Risk Calculation
    let riskScore = 0;

    if (variance < -10) {
      riskScore += 30;
    } else if (variance < -5) {
      riskScore += 20;
    } else if (variance < -2) {
      riskScore += 10;
    } else if (variance > 5) {
      riskScore -= 10;
    }

    let totalOverdueTasks = 0;
    let totalTasks = 0;
    forecastProjects.forEach(p => {
      const pId = String(p.prjId || p.prjid || p.id || p.projectId || "");
      const ms = milestonesList.filter(m => String(m.prjId || m.prjid || m.projectId || m.prj_id || "") === pId);
      const msIds = ms.map(m => String(m.mId || m.mid || m.id));
      const t = tasksList.filter(task => {
        const tPrjId = String(task.prjId || task.prjid || task.projectId || task.prj_id || "");
        if (tPrjId && tPrjId === pId) return true;
        const tMId = String(task.milestoneId || task.mid || task.mId || task.drftMId || task.drft_m_id || "");
        return msIds.includes(tMId);
      });

      totalTasks += t.length;
      totalOverdueTasks += t.filter(task => {
        if (getTaskStatusStr(task) === "CLOSED") return false;
        const end = task.endDt || task.enddt || task.endDate ? new Date(task.endDt || task.enddt || task.endDate) : null;
        return end && end < now;
      }).length;
    });

    const overdueTaskPct = totalTasks > 0 ? (totalOverdueTasks / totalTasks) * 100 : 0;
    if (overdueTaskPct > 30) {
      riskScore += 30;
    } else if (overdueTaskPct > 15) {
      riskScore += 20;
    } else if (overdueTaskPct > 5) {
      riskScore += 10;
    }

    const delayedPct = forecastProjects.length > 0 ? (delayedProjectsCount / forecastProjects.length) * 100 : 0;
    if (delayedPct > 50) {
      riskScore += 20;
    } else if (delayedPct > 25) {
      riskScore += 15;
    } else if (delayedPct > 10) {
      riskScore += 10;
    }

    if (plannedCompletionDate && expectedDate && expectedDate > plannedCompletionDate) {
      const delayDays = Math.ceil((expectedDate.getTime() - plannedCompletionDate.getTime()) / (1000 * 60 * 60 * 24));
      if (delayDays > 30) {
        riskScore += 20;
      } else if (delayDays > 15) {
        riskScore += 15;
      } else if (delayDays > 5) {
        riskScore += 10;
      }
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    let riskLevel = "Low";
    let riskColor = "#10b981";
    if (riskScore >= 70) {
      riskLevel = "Critical";
      riskColor = "#dc2626";
    } else if (riskScore >= 50) {
      riskLevel = "High";
      riskColor = "#ea580c";
    } else if (riskScore >= 30) {
      riskLevel = "Medium";
      riskColor = "#f59e0b";
    }

    const riskPct = riskScore.toFixed(0) + "%";

    return {
      current: avgProgress.toFixed(2) + "%",
      planned: plannedPct.toFixed(2) + "%",
      variance: variance.toFixed(2) + "%",
      plannedCompletion: plannedCompletionDate ? formatDateStr(plannedCompletionDate) : "—",
      expected: expectedDate ? formatDateStr(expectedDate) : "—",
      daysAhead: daysAheadStr,
      risk: riskPct,
      riskLevel: riskLevel,
      riskColor: riskColor,
      atRisk: delayedProjectsCount,
      projectCount: forecastProjects.length,
      projectName: projectDisplayValue
    };
  };

  const getActiveMetrics = () => {
    const isFiltered = currentProject !== "All Projects";

    const uniqueProjectOptions = getUniqueProjectOptions(projectsList);

    // ===== CHECK IF A SPECIFIC PROJECT IS SELECTED =====
    if (currentProject !== "All Projects" && !isFiltered) {
      const projectDetails = getProjectDetailsFromDisplay(currentProject);
      if (projectDetails) {
        const selectedProject = projectsList.find(p =>
          (p.prjCd || p.prjcd || "").toLowerCase() === projectDetails.code.toLowerCase() &&
          (p.prjNm || p.prjnm || "").toLowerCase() === projectDetails.name.toLowerCase()
        );
        if (selectedProject) {
          const projectStats = calculateProjectStats(selectedProject);

          const minDate = selectedProject.stDt || selectedProject.stdt;
          const maxDate = selectedProject.endDt || selectedProject.enddt;
          const dateRangeStr = minDate && maxDate ? `${formatDateStr(minDate)} ~ ${formatDateStr(maxDate)}` : "All Dates";

          return {
            dateRange: dateRangeStr,
            ...projectStats
          };
        }
      }
    }

    // ===== IF ALL PROJECTS SELECTED =====
    if (!isFiltered && dashboardData) {
      const minDate = projectsList.reduce((min, p) => !min || (p.stDt && new Date(p.stDt) < new Date(min)) ? p.stDt : min, null);
      const maxDate = projectsList.reduce((max, p) => !max || (p.endDt && new Date(p.endDt) > new Date(max)) ? p.endDt : max, null);

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
            { label: "Closed", count: dashboardData.portfolioProgress?.completed || 0, pct: dashboardData.portfolioProgress?.total ? ((dashboardData.portfolioProgress.completed / dashboardData.portfolioProgress.total) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
            { label: "In Progress", count: dashboardData.portfolioProgress?.inProgress || 0, pct: dashboardData.portfolioProgress?.total ? ((dashboardData.portfolioProgress.inProgress / dashboardData.portfolioProgress.total) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
            { label: "Not Started", count: dashboardData.portfolioProgress?.notStarted || 0, pct: dashboardData.portfolioProgress?.total ? ((dashboardData.portfolioProgress.notStarted / dashboardData.portfolioProgress.total) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
            { label: "Delayed", count: dashboardData.portfolioProgress?.delayed || 0, pct: dashboardData.portfolioProgress?.total ? ((dashboardData.portfolioProgress.delayed / dashboardData.portfolioProgress.total) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
          ]
        },
        milestone: {
          total: dashboardData.milestoneStatus?.total || 0,
          items: [
            { label: "Closed", count: dashboardData.milestoneStatus?.completed || 0, pct: dashboardData.milestoneStatus?.total ? ((dashboardData.milestoneStatus.completed / dashboardData.milestoneStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
            { label: "In Progress", count: dashboardData.milestoneStatus?.inProgress || 0, pct: dashboardData.milestoneStatus?.total ? ((dashboardData.milestoneStatus.inProgress / dashboardData.milestoneStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
            { label: "Not Started", count: dashboardData.milestoneStatus?.notStarted || 0, pct: dashboardData.milestoneStatus?.total ? ((dashboardData.milestoneStatus.notStarted / dashboardData.milestoneStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
            { label: "Delayed", count: dashboardData.milestoneStatus?.delayed || 0, pct: dashboardData.milestoneStatus?.total ? ((dashboardData.milestoneStatus.delayed / dashboardData.milestoneStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
          ]
        },
        task: {
          total: dashboardData.taskStatus?.total || 0,
          items: [
            { label: "Closed", count: dashboardData.taskStatus?.completed || 0, pct: dashboardData.taskStatus?.total ? ((dashboardData.taskStatus.completed / dashboardData.taskStatus.total) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
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
        forecast: getForecastData(currentProject)
      };
    }

    // ===== FILTERED VIEW - SINGLE PROJECT =====
    const now = new Date();

    let filteredProjects = [...projectsList];
    if (currentProject !== "All Projects") {
      const projectDetails = getProjectDetailsFromDisplay(currentProject);
      if (projectDetails) {
        filteredProjects = filteredProjects.filter(p =>
          (p.prjCd || p.prjcd || "").toLowerCase() === projectDetails.code.toLowerCase() &&
          (p.prjNm || p.prjnm || "").toLowerCase() === projectDetails.name.toLowerCase()
        );
      } else {
        filteredProjects = [];
      }
    }

    if (filteredProjects.length === 1) {
      const selectedProject = filteredProjects[0];
      const projectStats = calculateProjectStats(selectedProject);

      const minDate = selectedProject.stDt || selectedProject.stdt;
      const maxDate = selectedProject.endDt || selectedProject.enddt;
      const dateRangeStr = minDate && maxDate ? `${formatDateStr(minDate)} ~ ${formatDateStr(maxDate)}` : "All Dates";

      return {
        dateRange: dateRangeStr,
        ...projectStats
      };
    }

    // ===== FILTERED VIEW - MULTIPLE PROJECTS (should not happen with only project filter) =====
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
    const tCompleted = filteredTasks.filter(t => {
      const s = (t.taskSts || t.tasksts || "").toUpperCase();
      return s === "COMPLETED" || s === "CLOSED";
    }).length;
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
          { label: "Closed", count: msCompleted, pct: msTotal ? ((msCompleted / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
          { label: "In Progress", count: msInProgress, pct: msTotal ? ((msInProgress / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
          { label: "Not Started", count: msNotStarted, pct: msTotal ? ((msNotStarted / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
          { label: "Delayed", count: msDelayed, pct: msTotal ? ((msDelayed / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
        ]
      },
      milestone: {
        total: msTotal,
        items: [
          { label: "Closed", count: msCompleted, pct: msTotal ? ((msCompleted / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
          { label: "In Progress", count: msInProgress, pct: msTotal ? ((msInProgress / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#3b82f6" },
          { label: "Not Started", count: msNotStarted, pct: msTotal ? ((msNotStarted / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#f59e0b" },
          { label: "Delayed", count: msDelayed, pct: msTotal ? ((msDelayed / msTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#ef4444" },
        ]
      },
      task: {
        total: tTotal,
        items: [
          { label: "Closed", count: tCompleted, pct: tTotal ? ((tCompleted / tTotal) * 100).toFixed(1) + "%" : "0.0%", color: "#10b981" },
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
      forecast: getForecastData(currentProject)
    };
  };

  if (loading) {
    return (
      <div className="pm-loading">
        <div className="pm-loading-spinner" />
        <span className="pm-loading-text">Loading dashboard...</span>
      </div>
    );
  }

  const activeData = getActiveMetrics();
  const { stats, portfolio, milestone, task, delayedMilestones, upcomingMilestones, highPriorityTasks, forecast, dateRange } = activeData;

  const handleExportData = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Dashboard Export,${currentProject}\n\n`;

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
    const months = { "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06", "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12" };
    return `${parts[2]}-${months[parts[1]]}-${parts[0]}`;
  };

  const dateParts = (dateRange || "01-May-2025 ~ 31-Dec-2025").split("~");
  const startDateStr = parseDateString(dateParts[0]);
  const endDateStr = dateParts[1] ? parseDateString(dateParts[1]) : "";

  const uniqueProjectOptions = getUniqueProjectOptions(projectsList);
  const projectOptions = ["All Projects", ...uniqueProjectOptions];

  return (
    <div className="pm-shell-container">
      {isViewAllLoading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(4px)",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px"
        }}>
          <Loader2 size={38} className="pm-spin" style={{ color: "#2563eb", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", fontFamily: "Inter, sans-serif" }}>
            Loading project...
          </span>
        </div>
      )}
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="pm-shell">
        <Header title="Project Dashboard" showSearch={false} />

        <main className="pm-main">

          {/* ===== FILTER BAR - ONLY PROJECTS FILTER ===== */}
          <div className="pm-filter-bar">
            <div className="pm-filter-group">
              <CustomDropdown
                value={currentProject}
                options={projectOptions}
                onChange={handleProjectChange}
              />
              <span style={{
                fontSize: '12px',
                color: '#94a3b8',
                fontWeight: '500',
                padding: '4px 8px',
                background: '#f1f5f9',
                borderRadius: '4px'
              }}>
                {dateRange || "All Dates"}
              </span>
            </div>
            <button className="pm-export-btn" onClick={handleExportData}>
              <Download size={14} /> Export
            </button>
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
            <div className="pm-card">
              <div className="pm-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{currentProject === "All Projects" ? "Project Portfolio Progress" : `${currentProject} - Progress`}</span>
                {currentProject === "All Projects" && (
                  <button
                    onClick={handleViewAllClick}
                    disabled={isViewAllLoading}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    {isViewAllLoading ? (
                      <>
                        <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Loading...
                      </>
                    ) : (
                      <>
                        View All <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="pm-chart-content">
                <DonutChart
                  data={portfolio.items}
                  total={portfolio.items.reduce((a, b) => a + b.count, 0)}
                  centerValue={portfolio.percentage}
                  centerLabel={currentProject === "All Projects" ? "Overall Progress" : "Project Progress"}
                />
                <div className="pm-legend">
                  {portfolio.items.map((item, i) => (
                    <div key={i} className="pm-legend-row">
                      <span className="pm-dot" style={{ background: item.color }}></span>
                      <span className="pm-legend-label">{item.label}</span>
                      <span className="pm-legend-pct">{item.pct} ({item.count})</span>
                    </div>
                  ))}
                  <div className="pm-legend-total">
                    {currentProject === "All Projects"
                      ? `Total Projects: ${portfolio.total}`
                      : `Total Milestones: ${portfolio.total}`}
                  </div>
                </div>
              </div>
            </div>

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
            <div className="pm-card pm-table-card">
              <div className="pm-table-header">
                <span className="pm-card-title">Delayed Milestones</span>
                <button
                  onClick={handleViewAllMilestonesClick}
                  disabled={isViewAllLoading}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  className="pm-view-all"
                >
                  {isViewAllLoading ? (
                    <>
                      <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Loading...
                    </>
                  ) : (
                    "View All"
                  )}
                </button>
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
                  {delayedMilestones && delayedMilestones.length > 0 ? (
                    delayedMilestones.map((row, i) => (
                      <tr key={i}>
                        <td>{row.name}</td>
                        <td className="pm-text-muted">{row.project}</td>
                        <td><span className="pm-badge pm-badge-red">{row.delay}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                        No delayed milestones
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pm-card pm-table-card">
              <div className="pm-table-header">
                <span className="pm-card-title">Upcoming Milestones <span className="pm-card-sub">(Next 30 Days)</span></span>
                <button
                  onClick={handleViewAllMilestonesClick}
                  disabled={isViewAllLoading}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  className="pm-view-all"
                >
                  {isViewAllLoading ? (
                    <>
                      <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Loading...
                    </>
                  ) : (
                    "View All"
                  )}
                </button>
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
                  {upcomingMilestones && upcomingMilestones.length > 0 ? (
                    upcomingMilestones.map((row, i) => (
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                        No upcoming milestones
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pm-card pm-table-card">
              <div className="pm-table-header">
                <span className="pm-card-title">High Priority Tasks</span>
                <button
                  onClick={handleViewAllClick}
                  disabled={isViewAllLoading}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  className="pm-view-all"
                >
                  {isViewAllLoading ? (
                    <>
                      <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Loading...
                    </>
                  ) : (
                    "View All"
                  )}
                </button>
              </div>
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>EXECUTOR</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {highPriorityTasks && highPriorityTasks.length > 0 ? (
                    highPriorityTasks.map((row, i) => (
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                        No high priority tasks
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== FORECAST SUMMARY ===== */}
          <div className="pm-card pm-forecast-card">
            <div className="pm-card-title">
              <span>Forecast Summary</span>
            </div>

            {currentProject !== "All Projects" && (
              <div style={{
                marginBottom: '12px',
                padding: '8px 14px',
                backgroundColor: '#eff6ff',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#1e40af',
                  fontWeight: '500'
                }}>
                  Showing forecast for: <strong>{currentProject}</strong>
                  {forecast.projectCount > 1 && ` (${forecast.projectCount} projects found)`}
                </span>
                <button
                  onClick={handleViewInDetail}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 16px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'Inter, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Eye size={16} />
                  View in Detail
                </button>
              </div>
            )}

            <div className="pm-forecast-container">
              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-blue">
                  <BarChart2 size={18} strokeWidth={2} />
                </div>
                <div>
                  <div className="pm-forecast-sub">Current Progress</div>
                  <div className="pm-forecast-val">{forecast.current}</div>
                  <div className="pm-forecast-note">As on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-purple">
                  <Flag size={18} strokeWidth={2} />
                </div>
                <div>
                  <div className="pm-forecast-sub">Planned Progress</div>
                  <div className="pm-forecast-val">{forecast.planned}</div>
                  <div className="pm-forecast-note">(Baseline Plan)</div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              <div className="pm-forecast-item">
                <div className={`pm-forecast-icon-box outlined ${parseFloat(forecast.variance) < 0 ? "pm-icon-red" : "pm-icon-green"}`}>
                  {parseFloat(forecast.variance) < 0 ? <TrendingDown size={18} strokeWidth={2} /> : <TrendingUp size={18} strokeWidth={2} />}
                </div>
                <div>
                  <div className="pm-forecast-sub">Variance</div>
                  <div className={`pm-forecast-val ${parseFloat(forecast.variance) < 0 ? "pm-text-red" : "pm-text-green"}`}>
                    {parseFloat(forecast.variance) > 0 ? `+${forecast.variance}` : forecast.variance}
                  </div>
                  <div className="pm-forecast-note">
                    {parseFloat(forecast.variance) < 0 ? "(Behind Plan)" : parseFloat(forecast.variance) > 0 ? "(Ahead of Plan)" : "(On Track)"}
                  </div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-green">
                  <CalendarCheck size={18} strokeWidth={2} />
                </div>
                <div>
                  <div className="pm-forecast-sub">Planned Completion</div>
                  <div className="pm-forecast-val pm-text-green">{forecast.plannedCompletion}</div>
                  <div className="pm-forecast-note">(Project End Date)</div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-teal">
                  <CalendarCheck size={18} strokeWidth={2} />
                </div>
                <div>
                  <div className="pm-forecast-sub">Expected Completion</div>
                  <div className="pm-forecast-val pm-text-teal">{forecast.expected}</div>
                  <div className="pm-forecast-note pm-text-teal">
                    {forecast.daysAhead}
                    {parseFloat(forecast.variance) < 0 && " (Adjusted for Delay)"}
                    {parseFloat(forecast.variance) > 0 && " (Adjusted for Early Completion)"}
                  </div>
                </div>
              </div>

              <div className="pm-forecast-divider" />

              <div className="pm-forecast-item">
                <div className="pm-forecast-icon-box outlined pm-icon-orange">
                  <AlertTriangle size={18} strokeWidth={2} />
                </div>
                <div>
                  <div className="pm-forecast-sub">Risk</div>
                  <div className="pm-forecast-val" style={{ color: forecast.riskColor }}>
                    {forecast.risk}
                  </div>
                  <div className="pm-forecast-note" style={{ color: forecast.riskColor, fontWeight: '600' }}>
                    {forecast.riskLevel} Risk {forecast.atRisk > 0 && `• ${forecast.atRisk} Projects at Risk`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== QUICK ACTIONS ===== */}
          <div className="pm-card pm-quick-actions-card">
            <div className="pm-card-title">Quick Actions</div>
            <div className="pm-quick-grid">
              <button className="pm-action-btn pm-action-blue" onClick={() => handleActionClick("Create Project")}>
                <Plus size={18} /> Create Project
              </button>
              <button className="pm-action-btn pm-action-green" onClick={() => handleActionClick("Add Milestone")}>
                <Flag size={18} /> Add Milestone
              </button>
              <button className="pm-action-btn pm-action-purple" onClick={() => handleActionClick("Create Task")}>
                <CheckSquare size={18} /> Create Task
              </button>
              <button className="pm-action-btn pm-action-teal" onClick={() => handleActionClick("Open Gantt Chart")}>
                <BarChart2 size={18} /> Open Gantt Chart
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default ProjectManagerDashboard;
import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, Factory, FolderOpen, Users, 
  ClipboardList, Hourglass, Flag, CheckSquare, 
  FileText, Briefcase, Activity, TrendingUp, AlertCircle,
  ChevronRight, ChevronDown
} from "lucide-react";
import Sidebar from "../Sidebar.jsx"; 
import Header from "../Header.jsx";
import "../../styles/admin.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";
const getAuthToken = () => sessionStorage.getItem("authToken") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getAuthToken()}`
});

// ===== CUSTOM DROPDOWN COMPONENT =====
const CustomDropdown = ({ value, options, onChange, label }) => {
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
          fontFamily: 'Inter, sans-serif', minWidth: '120px',
          justifyContent: 'space-between'
        }}
      >
        {value} <ChevronDown size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 999, minWidth: '140px', overflow: 'hidden'
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

const AdminDashboard = ({ userRole, onLogout }) => {

  // ===== DYNAMIC DATA & STATES =====
  const [projFilter, setProjFilter] = useState("All Projects");
  const [mileFilter, setMileFilter] = useState("All Time");
  const [taskFilter, setTaskFilter] = useState("All Tasks");
  
  // Real-time counts fetched from DB
  const [companyCount, setCompanyCount] = useState(0);
  const [plantCount, setPlantCount] = useState(0);
  
  // Real-time lists fetched from DB for dynamic filtering
  const [projectsList, setProjectsList] = useState([]);
  const [milestonesList, setMilestonesList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  
  // Backend metrics state
  const [metrics, setMetrics] = useState(null);
  
  // User Name State
  const [userName, setUserName] = useState("Syed Mohammad Johny Basha");

  const fetchMetrics = async () => {
    try {
      const headers = authHeaders();
      const [resMetrics, resCompanies, resPlants, resProjLive, resMileLive, resTaskLive] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard/metrics`, { headers }),
        fetch(`${API_BASE}/companies`, { headers }),
        fetch(`${API_BASE}/plants`, { headers }),
        fetch(`${API_BASE}/project-live`, { headers }),
        fetch(`${API_BASE}/milestone-live`, { headers }),
        fetch(`${API_BASE}/task-live`, { headers })
      ]);

      if (resMetrics.ok) {
        const data = await resMetrics.json();
        setMetrics(data);
        console.log("Admin Dashboard Metrics:", data);
      }
      if (resCompanies.ok) {
        const companies = await resCompanies.json();
        setCompanyCount(companies.length);
      }
      if (resPlants.ok) {
        const plants = await resPlants.json();
        setPlantCount(plants.length);
      }
      if (resProjLive.ok) {
        const projData = await resProjLive.json();
        setProjectsList(projData);
      }
      if (resMileLive.ok) {
        const mileData = await resMileLive.json();
        setMilestonesList(mileData);
      }
      if (resTaskLive.ok) {
        const taskData = await resTaskLive.json();
        setTasksList(taskData);
      }
    } catch (err) {
      console.error("Error fetching dashboard metrics:", err);
    }
  };

  useEffect(() => {
    // 1. Fetch user info from Login Session
    const email = sessionStorage.getItem("userEmail");
    if (email) {
      let namePart = email.split("@")[0];
      namePart = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      
      if(email === "admin@example.com" || email === "admin@atirath.com") {
         setUserName("Syed Mohammad Johny Basha");
      } else {
         setUserName(namePart);
      }
    }

    // 2. Fetch from real backend API
    fetchMetrics();
  }, []);

  // Dropdown Options Map (Keys only, values unused)
  const projectDataMap = { "All Projects": {}, "This Month": {}, "This Year": {} };
  const milestoneDataMap = { "This Month": {}, "Last Month": {}, "All Time": {} };
  const taskDataMap = { "All Tasks": {}, "This Week": {}, "This Month": {} };

  // Helper date boundary functions
  const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day;
    const sunday = new Date(date.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  };

  const getEndOfWeek = (d) => {
    const start = getStartOfWeek(d);
    const saturday = new Date(start.setDate(start.getDate() + 6));
    saturday.setHours(23, 59, 59, 999);
    return saturday;
  };

  const getStartOfMonth = (d) => {
    const date = new Date(d.getFullYear(), d.getMonth(), 1);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getEndOfMonth = (d) => {
    const date = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const getStartOfYear = (d) => {
    const date = new Date(d.getFullYear(), 0, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getEndOfYear = (d) => {
    const date = new Date(d.getFullYear(), 11, 31);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  // Helper matching functions for dynamic filters
  const projectMatchesFilter = (prj, filter) => {
    if (filter === "All Projects") return true;
    const now = new Date();
    let st = prj.stDt ? new Date(prj.stDt) : null;
    let end = prj.endDt ? new Date(prj.endDt) : null;
    if (!st && !end) return false;
    if (!st) st = end;
    if (!end) end = st;

    if (filter === "This Month") {
      const startOfMonth = getStartOfMonth(now);
      const endOfMonth = getEndOfMonth(now);
      return st <= endOfMonth && end >= startOfMonth;
    }
    if (filter === "This Year") {
      const startOfYear = getStartOfYear(now);
      const endOfYear = getEndOfYear(now);
      return st <= endOfYear && end >= startOfYear;
    }
    return true;
  };

  const milestoneMatchesFilter = (ms, filter) => {
    if (filter === "All Time") return true;
    const now = new Date();
    let st = ms.stDt ? new Date(ms.stDt) : null;
    let end = ms.endDt ? new Date(ms.endDt) : null;
    if (!st && !end) return false;
    if (!st) st = end;
    if (!end) end = st;

    if (filter === "This Month") {
      const startOfMonth = getStartOfMonth(now);
      const endOfMonth = getEndOfMonth(now);
      return st <= endOfMonth && end >= startOfMonth;
    }
    if (filter === "Last Month") {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfPrevMonth = getStartOfMonth(prevMonthDate);
      const endOfPrevMonth = getEndOfMonth(prevMonthDate);
      return st <= endOfPrevMonth && end >= startOfPrevMonth;
    }
    return true;
  };

  const taskMatchesFilter = (t, filter) => {
    if (filter === "All Tasks") return true;
    const now = new Date();
    let st = t.stDt ? new Date(t.stDt) : null;
    let end = t.endDt ? new Date(t.endDt) : null;
    if (!st && !end) return false;
    if (!st) st = end;
    if (!end) end = st;

    if (filter === "This Week") {
      const startOfWeek = getStartOfWeek(now);
      const endOfWeek = getEndOfWeek(now);
      return st <= endOfWeek && end >= startOfWeek;
    }
    if (filter === "This Month") {
      const startOfMonth = getStartOfMonth(now);
      const endOfMonth = getEndOfMonth(now);
      return st <= endOfMonth && end >= startOfMonth;
    }
    return true;
  };

  const now = new Date();

  const filteredProjects = projectsList.filter(p => projectMatchesFilter(p, projFilter));
  const filteredMilestones = milestonesList.filter(m => milestoneMatchesFilter(m, mileFilter));
  const filteredTasks = tasksList.filter(t => taskMatchesFilter(t, taskFilter));

  const pd = {
    total: filteredProjects.length,
    track: filteredProjects.filter(p => {
      if (p.prjSts === "CLOSED") return false;
      if (!p.endDt) return true;
      const end = new Date(p.endDt);
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 7;
    }).length,
    risk: filteredProjects.filter(p => {
      if (p.prjSts === "CLOSED") return false;
      if (!p.endDt) return false;
      const end = new Date(p.endDt);
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7;
    }).length,
    delayed: filteredProjects.filter(p => p.prjSts !== "CLOSED" && p.endDt && new Date(p.endDt) < now).length,
    completed: filteredProjects.filter(p => p.prjSts === "CLOSED").length
  };

  const md = {
    total: filteredMilestones.length,
    completed: filteredMilestones.filter(m => m.mlstnSts === "COMPLETED" || m.mlstnSts === "CLOSED").length,
    progress: filteredMilestones.filter(m => m.mlstnSts !== "COMPLETED" && m.mlstnSts !== "CLOSED").length,
    overdue: filteredMilestones.filter(m => m.mlstnSts !== "COMPLETED" && m.mlstnSts !== "CLOSED" && m.endDt && new Date(m.endDt) < now).length
  };

  const wipStatuses = ["WIP", "IN_PROGRESS", "IN PROGRESS", "SUBMIT_REVIEW", "UNDER_REVIEW", "UNDER REVIEW"];
  
  const td = {
    total: filteredTasks.length,
    completed: filteredTasks.filter(t => { const s = (t.taskSts || "").toUpperCase(); return s === "COMPLETED" || s === "CLOSED"; }).length,
    progress: filteredTasks.filter(t => wipStatuses.includes((t.taskSts || "").toUpperCase())).length,
    todo: filteredTasks.filter(t => !["COMPLETED", "CLOSED", ...wipStatuses].includes((t.taskSts || "").toUpperCase())).length,
    overdue: filteredTasks.filter(t => { const s = (t.taskSts || "").toUpperCase(); return s !== "COMPLETED" && s !== "CLOSED" && t.endDt && new Date(t.endDt) < now; }).length
  };

  const overdueWip = filteredTasks.filter(t => wipStatuses.includes((t.taskSts || "").toUpperCase()) && t.endDt && new Date(t.endDt) < now).length;
  const overdueTodo = filteredTasks.filter(t => !["COMPLETED", "CLOSED", ...wipStatuses].includes((t.taskSts || "").toUpperCase()) && t.endDt && new Date(t.endDt) < now).length;
  const progressOnTime = Math.max(0, td.progress - overdueWip);
  const todoOnTime = Math.max(0, td.todo - overdueTodo);

  // Calculate milestone progress based on milestone status to remain consistent with backend and legend
  const getMilestoneProgressPercentage = () => {
    if (filteredMilestones.length === 0) return 0;
    
    let totalProgress = 0;
    filteredMilestones.forEach(m => {
      const mStatus = (m.mlstnSts || "").toUpperCase();
      if (mStatus === "COMPLETED" || mStatus === "CLOSED") {
        totalProgress += 100;
      } else {
        const mId = m.mid || m.mId || m.id || m.mlstnId;
        const mTasks = filteredTasks.filter(t => 
          t.mid === mId || t.mId === mId || t.m_id === mId || 
          t.drftMId === mId || t.drft_m_id === mId
        );
        if (mTasks.length > 0) {
          let mTaskProgress = 0;
          mTasks.forEach(t => {
            if ((t.taskSts || "").toUpperCase() === "COMPLETED") {
              mTaskProgress += 100;
            } else {
              // Capture partial progress from the task object if available
              const partial = parseFloat(t.progress || t.progressPercent || t.pctComplete || 0);
              mTaskProgress += isNaN(partial) ? 0 : partial;
            }
          });
          totalProgress += (mTaskProgress / mTasks.length);
        } else {
           // If a milestone has no tasks, consider it 0% (or maybe 10% if it's 'WIP'?)
           // We'll leave it at 0 to be strictly real-time task-based.
        }
      }
    });
    
    return Math.round(totalProgress / filteredMilestones.length);
  };

  const getProjGradient = () => {
    const total = pd.total || 1;
    let p1 = (pd.track / total) * 100;
    let p2 = p1 + (pd.completed / total) * 100;
    let p3 = p2 + (pd.risk / total) * 100;
    let p4 = p3 + (pd.delayed / total) * 100;
    return `conic-gradient(#10b981 0% ${p1}%, #3b82f6 ${p1}% ${p2}%, #f59e0b ${p2}% ${p3}%, #ef4444 ${p3}% 100%)`;
  };

  const getMileGradient = () => {
    const total = md.total || 1;
    let p1 = (md.completed / total) * 100;
    let p2 = p1 + ((md.progress - md.overdue) / total) * 100;
    let p3 = p2 + (md.overdue / total) * 100;
    return `conic-gradient(#10b981 0% ${p1}%, #3b82f6 ${p1}% ${p2}%, #ef4444 ${p2}% 100%)`;
  };

  const getTaskGradient = () => {
    const total = td.total || 1;
    let p1 = (td.completed / total) * 100;
    let p2 = p1 + (progressOnTime / total) * 100;
    let p3 = p2 + (todoOnTime / total) * 100;
    return `conic-gradient(#10b981 0% ${p1}%, #3b82f6 ${p1}% ${p2}%, #f59e0b ${p2}% ${p3}%, #ef4444 ${p3}% 100%)`;
  };

  const activitiesToRender = React.useMemo(() => {
    const rawList = metrics?.systemActivities || [];
    
    const hasDetailed = rawList.some(a => a.description && a.description.length > 15 && !a.description.toLowerCase().includes("status changed"));
    if (hasDetailed) {
      return rawList;
    }

    const generated = [];

    if (tasksList && tasksList.length > 0) {
      tasksList.slice(0, 4).forEach((t, i) => {
        const code = t.taskCd || t.taskcd || `TSK-${t.taskId || t.id || (100 + i)}`;
        const name = t.taskNm || t.tasknm || t.title || "Task";
        const stsRaw = (t.taskSts || t.tasksts || t.status || "OPEN").toUpperCase();
        
        let stsLabel = "Not Started";
        if (stsRaw === "COMPLETED" || stsRaw === "CLOSED") stsLabel = "Closed";
        else if (stsRaw === "WIP" || stsRaw === "IN_PROGRESS") stsLabel = "In Progress";
        else if (stsRaw === "SUBMIT_REVIEW" || stsRaw === "UNDER_REVIEW") stsLabel = "Under Review";
        else if (stsRaw === "REWORK") stsLabel = "Rework";
        else if (stsRaw === "OPEN") stsLabel = "Pending";

        const actorName = t.assignedByNm || t.createdByName || t.executorNm || (rawList[i]?.actor || "System Admin");
        const timeStr = rawList[i]?.timestamp || "15:45";

        generated.push({
          description: `Task ${code} (${name}) status updated to ${stsLabel}`,
          actor: actorName,
          timestamp: timeStr,
          type: "task"
        });
      });
    }

    if (projectsList && projectsList.length > 0) {
      projectsList.slice(0, 1).forEach((p, i) => {
        const code = p.prjCd || p.prjcd || `PRJ-${p.prjId || p.id || (10 + i)}`;
        const name = p.prjNm || p.prjnm || p.name || "Project";
        const stsRaw = (p.prjSts || p.prjsts || p.status || "LIVE").toUpperCase();

        let stsLabel = "On Track";
        if (stsRaw === "COMPLETED" || stsRaw === "CLOSED") stsLabel = "Closed";
        else if (stsRaw === "DELAYED" || stsRaw === "OVERDUE") stsLabel = "Delayed";
        else if (stsRaw === "AT_RISK" || stsRaw === "HOLD") stsLabel = "At Risk";

        generated.push({
          description: `Project ${code} (${name}) status set to ${stsLabel}`,
          actor: "Project Manager",
          timestamp: "15:40",
          type: "project"
        });
      });
    }

    return generated.length > 0 ? generated.slice(0, 5) : rawList;
  }, [metrics?.systemActivities, tasksList, projectsList]);

  const deadlinesToRender = metrics?.upcomingDeadlines || [];
  const topProjectsToRender = metrics?.topProjects || [];

  return (
    <div className="db-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="db-shell">
        
        {/* ===== INTEGRATED HEADER COMPONENT ===== */}
        <Header 
          title="Dashboard" 
          showSearch={false} 
          userName={userName} 
          userRole="Web Developer" 
          initials="SB" 
        />

        <main className="db-main">
          
          {/* ===== ERP ENTERPRISE KPI GRID ===== */}
          <div className="erp-kpi-grid">
            
            <div className="erp-kpi-card">
              <div className="kpi-icon-box bg-green"><Building2 size={26} color="#ffffff"/></div>
              <div className="kpi-content">
                <span className="kpi-title">Total Companies</span>
                <h2>{companyCount}</h2>
              </div>
            </div>

            <div className="erp-kpi-card">
              <div className="kpi-icon-box bg-blue"><Factory size={26} color="#ffffff"/></div>
              <div className="kpi-content">
                <span className="kpi-title">Total Plants</span>
                <h2>{plantCount}</h2>
              </div>
            </div>

            <div className="erp-kpi-card">
              <div className="kpi-icon-box bg-purple"><FolderOpen size={26} color="#ffffff"/></div>
              <div className="kpi-content">
                <span className="kpi-title">Total Projects</span>
                <h2>{metrics ? metrics.activeProjectsCount : 0}</h2>
              </div>
            </div>

            <div className="erp-kpi-card">
              <div className="kpi-icon-box bg-orange"><Users size={26} color="#ffffff"/></div>
              <div className="kpi-content">
                <span className="kpi-title">Total Employees</span>
                <h2>{metrics ? metrics.employeeCount : 0}</h2>
              </div>
            </div>

            <div className="erp-kpi-card">
              <div className="kpi-icon-box bg-cyan"><ClipboardList size={26} color="#ffffff"/></div>
              <div className="kpi-content">
                <span className="kpi-title">Active Tasks</span>
                <h2>{td.total}</h2>
              </div>
            </div>

            <div className="erp-kpi-card">
              <div className="kpi-icon-box bg-red"><Hourglass size={26} color="#ffffff"/></div>
              <div className="kpi-content">
                <span className="kpi-title">Delayed Tasks</span>
                <h2>{td.overdue}</h2>
              </div>
            </div>

          </div>

          {/* ===== DYNAMIC CHARTS SECTION ===== */}
          <div className="db-charts-grid">
            <div className="db-card">
              <div className="db-card-header">
                <h3>Project Status Overview</h3>
                <CustomDropdown
                  value={projFilter}
                  options={Object.keys(projectDataMap)}
                  onChange={setProjFilter}
                />
              </div>
              <div className="db-chart-content">
                <div className="db-donut-chart" style={{ background: getProjGradient() }}>
                  <div className="donut-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <h3 className="mb-0 fw-bold" style={{ lineHeight: 1 }}>{pd.total}</h3>
                    <p className="mb-0 mt-1" style={{ lineHeight: 1, fontSize: '14px' }}>Total</p>
                  </div>
                </div>
                <div className="db-chart-legend">
                  <div className="legend-item"><span className="dot dot-green"></span> On Track <b>{pd.track}</b></div>
                  <div className="legend-item"><span className="dot dot-blue"></span> Closed <b>{pd.completed}</b></div>
                  <div className="legend-item"><span className="dot dot-orange"></span> At Risk <b>{pd.risk}</b></div>
                  <div className="legend-item"><span className="dot dot-red"></span> Delayed <b>{pd.delayed}</b></div>
                </div>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-header">
                <h3>Milestone Progress</h3>
                <CustomDropdown
                  value={mileFilter}
                  options={Object.keys(milestoneDataMap)}
                  onChange={setMileFilter}
                />
              </div>
              <div className="db-chart-content">
                <div className="db-donut-chart" style={{ background: getMileGradient() }}>
                  <div className="donut-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <h3 className="mb-0 fw-bold" style={{ lineHeight: 1 }}>{md.total}</h3>
                    <p className="mb-0 mt-1" style={{ lineHeight: 1, fontSize: '14px' }}>Milestones</p>
                  </div>
                </div>
                <div className="db-chart-legend">
                  <div className="legend-item"><span className="dot" style={{backgroundColor: '#9ca3af'}}></span> Total <b>{md.total}</b></div>
                  <div className="legend-item"><span className="dot dot-green"></span> Closed <b>{md.completed}</b></div>
                  <div className="legend-item"><span className="dot dot-blue"></span> In Progress <b>{Math.max(0, md.progress - md.overdue)}</b></div>
                  <div className="legend-item"><span className="dot dot-red"></span> Overdue <b>{md.overdue}</b></div>
                </div>
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-header">
                <h3>Task Status Overview</h3>
                <CustomDropdown
                  value={taskFilter}
                  options={Object.keys(taskDataMap)}
                  onChange={setTaskFilter}
                />
              </div>
              <div className="db-chart-content">
                <div className="db-donut-chart" style={{ background: getTaskGradient() }}>
                  <div className="donut-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <h3 className="mb-0 fw-bold" style={{ lineHeight: 1 }}>{td.total}</h3>
                    <p className="mb-0 mt-1" style={{ lineHeight: 1, fontSize: '14px' }}>Tasks</p>
                  </div>
                </div>
                <div className="db-chart-legend">
                  <div className="legend-item"><span className="dot dot-green"></span> Closed <b>{td.completed}</b></div>
                  <div className="legend-item"><span className="dot dot-blue"></span> In Progress <b>{progressOnTime}</b></div>
                  <div className="legend-item"><span className="dot dot-orange"></span> To Do <b>{todoOnTime}</b></div>
                  <div className="legend-item"><span className="dot dot-red"></span> Overdue <b>{td.overdue}</b></div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== LISTS SECTION ===== */}
          <div className="db-lists-grid">
            <div className="db-card list-card">
              <div className="db-card-header">
                <h3>Recent Activities</h3>
                <a href="#" className="view-all"></a>
              </div>
              <div className="db-list">
                {activitiesToRender.map((act, idx) => {
                  let icon = <Activity size={14} />;
                  let iconClass = "bg-orange-light text-orange";
                  const descLower = (act.description || "").toLowerCase();
                  if (descLower.includes("project")) {
                    icon = <Briefcase size={14} />;
                    iconClass = "bg-green-light text-green";
                  } else if (descLower.includes("milestone")) {
                    icon = <CheckSquare size={14} />;
                    iconClass = "bg-blue-light text-blue";
                  } else if (descLower.includes("employee")) {
                    icon = <Users size={14} />;
                    iconClass = "bg-purple-light text-purple";
                  }
                  return (
                    <div key={idx} className="list-item">
                      <div className={`list-icon ${iconClass}`}>{icon}</div>
                      <div className="list-text">
                        <p>{act.description}</p>
                        <span>{act.actor} • {act.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="db-card list-card">
              <div className="db-card-header">
                <h3>Upcoming Deadlines</h3>
                <a href="#" className="view-all"></a>
              </div>
              <div className="db-list">
                {deadlinesToRender.map((dl, idx) => {
                  const critical = dl.critical || dl.isCritical;
                  let formattedDate = "";
                  if (dl.dueDate) {
                    try {
                      const d = new Date(dl.dueDate);
                      formattedDate = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                    } catch (_) {
                      formattedDate = dl.dueDate;
                    }
                  }
                  return (
                    <div key={idx} className="list-item deadline-item">
                      <div className={`list-icon-clear ${critical ? "text-red" : "text-blue"}`}>
                        {critical ? <Flag size={16} fill="currentColor" /> : <CheckSquare size={16} />}
                      </div>
                      <div className="list-text">
                        <p>{dl.title}</p>
                        <span>{dl.projectName}</span>
                      </div>
                      <div className="deadline-date">
                        <strong>{formattedDate}</strong>
                        <span className={critical ? "text-red" : "text-orange"}>{dl.timeLeft}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="db-card list-card">
              <div className="db-card-header">
                <h3>Top Projects by Progress</h3>
                <a href="#" className="view-all"></a>
              </div>
              <div className="db-list project-progress-list">
                {topProjectsToRender.map((p, idx) => (
                  <div key={p.projectId || idx} className="progress-item">
                    <div className="progress-header">
                      <span>{p.projectName}{p.projectCode ? ` (${p.projectCode})` : ""}</span>
                      <strong>{Math.round(p.progressPercent)}%</strong>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-fill" style={{ width: `${p.progressPercent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
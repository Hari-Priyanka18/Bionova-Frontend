import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, Factory, FolderOpen, Users, 
  ClipboardList, Hourglass, Flag, CheckSquare, 
  FileText, Briefcase, Activity, TrendingUp, AlertCircle,
  ChevronRight, ChevronDown, Search
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

const formatDateDDMMYYYY = (dateVal) => {
  if (!dateVal) return 'No Deadline';
  try {
    const str = String(dateVal).trim();
    const cleanStr = str.split('T')[0];
    const ymdMatch = cleanStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    const dmyMatch = cleanStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    const dateObj = new Date(dateVal);
    if (!isNaN(dateObj.getTime())) {
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return str;
  } catch (e) {
    return String(dateVal);
  }
};

// ===== CUSTOM DROPDOWN COMPONENT =====
const CustomDropdown = ({ value, options, onChange, label, enableSearch = true }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredOptions = (options || []).filter(opt =>
    String(opt).toLowerCase().includes(search.toLowerCase())
  );

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
          zIndex: 999, minWidth: '180px', maxWidth: '250px', overflow: 'hidden'
        }}>
          {enableSearch && options.length > 3 && (
            <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#ffffff', border: '1px solid #cbd5e1',
                borderRadius: '6px', padding: '4px 8px'
              }}>
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    border: 'none', outline: 'none', background: 'transparent',
                    width: '100%', fontSize: '12px', color: '#0f172a'
                  }}
                  autoFocus
                />
              </div>
            </div>
          )}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                  style={{
                    padding: '8px 14px', fontSize: '13px', fontWeight: '500',
                    cursor: 'pointer', color: opt === value ? '#fff' : '#374151',
                    background: opt === value ? '#2563eb' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div style={{ padding: '10px 14px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                No results found
              </div>
            )}
          </div>
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

  // Selected Member Performance Modal State
  const [selectedMemberModal, setSelectedMemberModal] = useState(null);

  useEffect(() => {
    if (selectedMemberModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedMemberModal]);

  // Employees & Person Filter State
  const [employeesList, setEmployeesList] = useState([]);
  const [personFilter, setPersonFilter] = useState("All Persons");

  const fetchMetrics = async () => {
    try {
      const headers = authHeaders();
      const [resMetrics, resCompanies, resPlants, resProjLive, resMileLive, resTaskLive, resEmp] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard/metrics`, { headers }),
        fetch(`${API_BASE}/companies`, { headers }),
        fetch(`${API_BASE}/plants`, { headers }),
        fetch(`${API_BASE}/project-live`, { headers }),
        fetch(`${API_BASE}/milestone-live`, { headers }),
        fetch(`${API_BASE}/task-live`, { headers }),
        fetch(`${API_BASE}/employees`, { headers })
      ]);

      if (resMetrics.ok) {
        const data = await resMetrics.json();
        setMetrics(data);
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
      if (resEmp.ok) {
        const empData = await resEmp.json();
        setEmployeesList(empData);
      }
    } catch (err) {
      console.error("Error fetching dashboard metrics:", err);
    }
  };

  useEffect(() => {
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
    fetchMetrics();
  }, []);

  const projectDataMap = { "All Projects": {}, "This Month": {}, "This Year": {} };
  const milestoneDataMap = { "This Month": {}, "Last Month": {}, "All Time": {} };
  const taskDataMap = { "All Tasks": {}, "This Week": {}, "This Month": {} };

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
    completed: filteredProjects.filter(p => {
      const s = (p.prjSts || "").toUpperCase();
      return s === "CLOSED" || s === "COMPLETED";
    }).length,
    delayed: filteredProjects.filter(p => {
      const s = (p.prjSts || "").toUpperCase();
      if (s === "CLOSED" || s === "COMPLETED") return false;
      if (!p.endDt) return false;
      const end = new Date(p.endDt);
      end.setHours(23, 59, 59, 999);
      return end.getTime() < now.getTime();
    }).length,
    risk: filteredProjects.filter(p => {
      const s = (p.prjSts || "").toUpperCase();
      if (s === "CLOSED" || s === "COMPLETED") return false;
      if (!p.endDt) return false;
      const end = new Date(p.endDt);
      end.setHours(23, 59, 59, 999);
      if (end.getTime() < now.getTime()) return false;
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7;
    }).length,
    track: filteredProjects.filter(p => {
      const s = (p.prjSts || "").toUpperCase();
      if (s === "CLOSED" || s === "COMPLETED") return false;
      if (!p.endDt) return true;
      const end = new Date(p.endDt);
      end.setHours(23, 59, 59, 999);
      if (end.getTime() < now.getTime()) return false;
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 7;
    }).length
  };

  const isMilestoneClosed = (m) => {
    const s = (m.mlstnSts || "").toUpperCase();
    if (s === "COMPLETED" || s === "CLOSED") return true;

    const mId = m.mid || m.mId || m.id || m.mlstnId;
    const mTasks = filteredTasks.filter(t => 
      t.mid === mId || t.mId === mId || t.m_id === mId || 
      t.drftMId === mId || t.drft_m_id === mId
    );
    if (mTasks.length > 0) {
      const closedTasks = mTasks.filter(t => {
        const ts = (t.taskSts || "").toUpperCase();
        return ts === "CLOSED" || ts === "COMPLETED";
      }).length;
      return closedTasks === mTasks.length;
    }
    return false;
  };

  const md = {
    total: filteredMilestones.length,
    completed: filteredMilestones.filter(m => isMilestoneClosed(m)).length,
    progress: filteredMilestones.filter(m => !isMilestoneClosed(m)).length,
    overdue: filteredMilestones.filter(m => {
      if (isMilestoneClosed(m)) return false;
      if (!m.endDt) return false;
      const end = new Date(m.endDt);
      end.setHours(23, 59, 59, 999);
      return end < now;
    }).length
  };

  const wipStatuses = ["WIP", "IN_PROGRESS", "IN PROGRESS", "SUBMIT_REVIEW", "UNDER_REVIEW", "UNDER REVIEW"];
  
  const td = {
    total: filteredTasks.length,
    completed: filteredTasks.filter(t => { const s = (t.taskSts || "").toUpperCase(); return s === "COMPLETED" || s === "CLOSED"; }).length,
    progress: filteredTasks.filter(t => wipStatuses.includes((t.taskSts || "").toUpperCase())).length,
    todo: filteredTasks.filter(t => !["COMPLETED", "CLOSED", ...wipStatuses].includes((t.taskSts || "").toUpperCase())).length,
    overdue: filteredTasks.filter(t => { 
      const s = (t.taskSts || "").toUpperCase(); 
      if (s === "COMPLETED" || s === "CLOSED") return false;
      if (!t.endDt) return false;
      const end = new Date(t.endDt);
      end.setHours(23, 59, 59, 999);
      return end < now;
    }).length
  };

  const overdueWip = filteredTasks.filter(t => {
    const s = (t.taskSts || "").toUpperCase();
    if (!wipStatuses.includes(s) || !t.endDt) return false;
    const end = new Date(t.endDt);
    end.setHours(23, 59, 59, 999);
    return end < now;
  }).length;

  const overdueTodo = filteredTasks.filter(t => {
    const s = (t.taskSts || "").toUpperCase();
    if (["COMPLETED", "CLOSED", ...wipStatuses].includes(s) || !t.endDt) return false;
    const end = new Date(t.endDt);
    end.setHours(23, 59, 59, 999);
    return end < now;
  }).length;

  const progressOnTime = Math.max(0, td.progress - overdueWip);
  const todoOnTime = Math.max(0, td.todo - overdueTodo);

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
    const onTimeProgress = Math.max(0, md.progress - md.overdue);
    let p1 = (md.completed / total) * 100;
    let p2 = p1 + (onTimeProgress / total) * 100;
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

  const topProjectsToRender = React.useMemo(() => {
    if (metrics?.topProjects && metrics.topProjects.length >= 3) {
      return metrics.topProjects;
    }
    if (!projectsList || projectsList.length === 0) return [];

    return projectsList.map(p => {
      const pId = p.prjId || p.id;
      const pTasks = tasksList.filter(t => 
        t.prjId === pId || t.prj_id === pId || t.drftPrjId === pId
      );
      let progressPercent = 0;
      if (pTasks.length > 0) {
        const closedTasks = pTasks.filter(t => {
          const s = (t.taskSts || "").toUpperCase();
          return s === "CLOSED" || s === "COMPLETED";
        }).length;
        progressPercent = Math.round((closedTasks / pTasks.length) * 100);
      } else if ((p.prjSts || "").toUpperCase() === "CLOSED" || (p.prjSts || "").toUpperCase() === "COMPLETED") {
        progressPercent = 100;
      }
      return {
        projectId: pId,
        projectName: p.prjNm || p.name || "Project",
        projectCode: p.prjCd || p.code || "",
        progressPercent: progressPercent
      };
    }).sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 4);
  }, [metrics?.topProjects, projectsList, tasksList]);

  const empMapById = React.useMemo(() => {
    const map = {};
    (employeesList || []).forEach(e => {
      const name = `${e.fstNm || ''} ${e.lstNm || ''}`.trim() || e.empCode || `Employee #${e.empId}`;
      map[String(e.empId)] = name;
    });
    return map;
  }, [employeesList]);

  const allPersonNames = React.useMemo(() => {
    const names = new Set();
    (employeesList || []).forEach(e => {
      const name = `${e.fstNm || ''} ${e.lstNm || ''}`.trim();
      if (name) names.add(name);
    });
    tasksList.forEach(t => {
      if (t.empId && empMapById[String(t.empId)]) {
        names.add(empMapById[String(t.empId)]);
      }
    });
    return Array.from(names).sort();
  }, [employeesList, tasksList, empMapById]);

  const teamPerformanceToRender = React.useMemo(() => {
    if (!tasksList || tasksList.length === 0) return [];

    const empMap = {};

    tasksList.forEach(t => {
      let empName = null;
      if (t.empId && empMapById[String(t.empId)]) {
        empName = empMapById[String(t.empId)];
      } else if (t.executorNm && t.executorNm.trim()) {
        empName = t.executorNm.trim();
      } else if (t.assignedTo && t.assignedTo.trim()) {
        empName = t.assignedTo.trim();
      } else if (t.createdByName && t.createdByName.trim()) {
        empName = t.createdByName.trim();
      } else if (t.assignedByNm && t.assignedByNm.trim()) {
        empName = t.assignedByNm.trim();
      }

      if (!empName || empName.trim() === "" || empName.toLowerCase().includes("unassigned")) {
        const empMatch = (employeesList || []).find(e => String(e.empId || e.id) === String(t.empId || t.executorId || ''));
        if (empMatch) {
          empName = `${empMatch.fstNm || ''} ${empMatch.lstNm || ''}`.trim() || empMatch.empCode || `Employee #${empMatch.empId}`;
        } else {
          empName = t.empCode ? `Employee (${t.empCode})` : (t.empId ? `Employee #${t.empId}` : "Team Member");
        }
      }

      if (!empMap[empName]) {
        empMap[empName] = {
          name: empName,
          empId: t.empId || null,
          totalTasks: 0,
          completed: 0,
          overdue: 0,
          onTime: 0,
          taskList: []
        };
      }
      empMap[empName].totalTasks += 1;
      empMap[empName].taskList.push(t);

      const s = (t.taskSts || "").toUpperCase();
      if (s === "CLOSED" || s === "COMPLETED") {
        empMap[empName].completed += 1;
      } else {
        if (t.endDt && new Date(t.endDt).setHours(23, 59, 59, 999) < now.getTime()) {
          empMap[empName].overdue += 1;
        } else {
          empMap[empName].onTime += 1;
        }
      }
    });

    let list = Object.values(empMap).map(e => {
      let statusLabel = "On Track";
      let statusColor = "#2563eb";
      let statusBg = "#eff6ff";

      if (e.overdue > 0) {
        statusLabel = `Lagging (${e.overdue} Overdue)`;
        statusColor = "#dc2626";
        statusBg = "#fef2f2";
      } else if (e.completed > 0 && e.overdue === 0) {
        statusLabel = "Lead (Ahead)";
        statusColor = "#16a34a";
        statusBg = "#f0fdf4";
      }

      const scorePct = e.totalTasks > 0 ? Math.round((e.completed / e.totalTasks) * 100) : 0;
      return { ...e, statusLabel, statusColor, statusBg, scorePct };
    });

    if (personFilter !== "All Persons") {
      list = list.filter(e => e.name === personFilter);
    }

    return list.sort((a, b) => b.overdue - a.overdue);
  }, [tasksList, empMapById, personFilter, now]);

  return (
    <div className="db-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="db-shell">
        
        <Header 
          title="Dashboard" 
          showSearch={false} 
          userName={userName} 
          userRole="Web Developer" 
          initials="SB" 
        />

        <main className="db-main">
          
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

          <div className="db-lists-grid">
            <div className="db-card list-card">
              <div className="db-card-header">
                <h3>Recent Activities</h3>
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

            <div className="db-card list-card" style={{ gridColumn: 'span 3 / span 3' }}>
              <div className="db-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Team Performance & Bottlenecks</h3>
                </div>
                <CustomDropdown
                  value={personFilter}
                  options={["All Persons", ...allPersonNames]}
                  onChange={setPersonFilter}
                />
              </div>
              <div className="db-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', padding: '16px' }}>
                {teamPerformanceToRender.map((member, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedMemberModal(member)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{member.name}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Click to view details</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '12px', background: member.statusBg, color: member.statusColor }}>
                        {member.statusLabel}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span>Total Tasks: <strong>{member.totalTasks}</strong></span>
                      <span>Done: <strong style={{ color: '#16a34a' }}>{member.completed}</strong></span>
                      <span>Lag: <strong style={{ color: member.overdue > 0 ? '#dc2626' : '#64748b' }}>{member.overdue}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedMemberModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              width: '100%',
              boxSizing: 'border-box',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', flexShrink: 0 }}>
                  {(selectedMemberModal.name || "T").charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMemberModal.name || "Unassigned"}</h3>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Team Member Performance & Schedule Health</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMemberModal(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginLeft: 'auto'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{
                background: selectedMemberModal.statusBg,
                border: `1px solid ${selectedMemberModal.statusColor}33`,
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Current Health Status</span>
                  <h4 style={{ margin: '4px 0 0 0', color: selectedMemberModal.statusColor, fontSize: '18px', fontWeight: '700' }}>
                    {selectedMemberModal.statusLabel}
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Completion Rate</span>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{selectedMemberModal.scorePct}%</div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Total Assigned</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#1e293b' }}>{selectedMemberModal.totalTasks}</h3>
                </div>
                <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#166534' }}>Completed</span>
                  <h3 style={{ margin: '4px 0 0 0', color: '#15803d' }}>{selectedMemberModal.completed}</h3>
                </div>
                <div style={{ background: selectedMemberModal.overdue > 0 ? '#fef2f2' : '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: selectedMemberModal.overdue > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: selectedMemberModal.overdue > 0 ? '#991b1b' : '#64748b' }}>Lagging (Overdue)</span>
                  <h3 style={{ margin: '4px 0 0 0', color: selectedMemberModal.overdue > 0 ? '#dc2626' : '#1e293b' }}>{selectedMemberModal.overdue}</h3>
                </div>
              </div>

              {/* Task Breakdown List */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>Assigned Tasks Breakdown ({selectedMemberModal.taskList?.length || 0})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {selectedMemberModal.taskList && selectedMemberModal.taskList.length > 0 ? (
                    selectedMemberModal.taskList.map((t, idx) => {
                      const sts = (t.taskSts || "").toUpperCase();
                      const isDone = sts === "CLOSED" || sts === "COMPLETED";
                      const isLate = !isDone && t.endDt && new Date(t.endDt).setHours(23, 59, 59, 999) < now.getTime();

                      return (
                        <div key={idx} style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: isLate ? '#fef2f2' : isDone ? '#f0fdf4' : '#f8fafc',
                          border: isLate ? '1px solid #fecaca' : isDone ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block' }}>{t.taskNm || t.name || 'Task'}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Due: {t.endDt ? formatDateDDMMYYYY(t.endDt) : 'No Deadline'}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: isLate ? '#fee2e2' : isDone ? '#dcfce7' : '#e2e8f0',
                            color: isLate ? '#991b1b' : isDone ? '#166534' : '#475569'
                          }}>
                            {isLate ? 'OVERDUE (LAG)' : isDone ? 'COMPLETED' : 'IN PROGRESS'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: '13px', color: '#64748b' }}>No tasks assigned.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
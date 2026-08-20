import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Search, ArrowLeft, ChevronLeft, ChevronRight,
  ChevronDown, Calendar, Clock, CheckCircle2, BarChart2,
  PlayCircle, Users, Menu, AlertCircle
} from "lucide-react";
import Sidebar from "../Sidebar";
import Header from "../Header";
import UserOverview from "./UserOverview";
import UserMilestone from "./UserMilestone";
import UserMyTask from "./UserMyTask";
import ProjectGanttChart from "./ProjectGanttChart";
import DocsAndReports from "../Projectmanager/DocsAndReports";
import "../../styles/my-project.css";

// Pipeline Progress Bar
const PipelineProgress = ({ pct, color = "#10b981" }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px', height: '19px' }}>
      <div style={{ flex: 1, height: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0d1126', minWidth: '32px' }}>{pct}%</span>
    </div>
  );
};

// Circular Progress Bar
const CircularProgress = ({ pct, color = "#10b981", size = 44, strokeWidth = 4 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle stroke="#e9ecef" fill="transparent" strokeWidth={strokeWidth} r={radius} cx={size/2} cy={size/2} />
        <circle 
          stroke={color} 
          fill="transparent" 
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference + ' ' + circumference} 
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease-in-out' }} 
          r={radius} 
          cx={size/2} 
          cy={size/2} 
          strokeLinecap="round" 
          transform={`rotate(-90 ${size/2} ${size/2})`} 
        />
      </svg>
      <div style={{ position: 'absolute', fontSize: '11px', fontWeight: 700, color: '#0d1126' }}>
        {pct}%
      </div>
    </div>
  );
};

import { safeFetch } from "../../utils/api";
import { calculateDynamicPriority, getPriorityMetadata } from "../../utils/priority";

const getLoggedInUser = () => {
  const storedName = sessionStorage.getItem("userName");
  if (storedName) return storedName;
  const email = sessionStorage.getItem("userEmail") || "";
  if (email) {
    const namePart = email.split("@")[0];
    return namePart.split(/[._]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return "Admin";
};

const TABS = ["Overview", "Milestones & Tasks", "Gantt Chart", "Documents"];

const MyProjects = ({ userRole, onLogout }) => {
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Projects");
  const [showFilterDrop, setShowFilterDrop] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const projectsPerPage = 6;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profRes, projRes, msRes, taskRes, coyRes, pltRes, deptRes, empRes, dashRes] = await Promise.all([
          safeFetch('/api/profile'),
          safeFetch('/api/project-live', []),
          safeFetch('/api/milestone-live', []),
          safeFetch('/api/task-live', []),
          safeFetch('/api/companies', []),
          safeFetch('/api/plants', []),
          safeFetch('/api/departments', []),
          safeFetch('/api/employees', []),
          safeFetch('/api/user-dashboard')
        ]);

        setProfile(profRes);
        const allProjects = projRes.data || projRes;
        const projMilestones = msRes.data || msRes;
        const allSystemTasks = taskRes.data || taskRes;
        
        setEmployees(empRes || []);
        const empId = profRes?.empId || profRes?.empid || profRes?.id;
        const userEmp = (empRes || []).find(e => String(e.empId || e.empid || e.id) === String(empId));
        const userDeptId = profRes?.deptId || profRes?.deptid || profRes?.departmentId || userEmp?.deptId || userEmp?.deptid;
        const userDeptName = profRes?.deptNm || profRes?.deptnm || profRes?.departmentName || (typeof profRes?.department === 'string' ? profRes?.department : (typeof profRes?.department === 'object' && profRes?.department ? profRes?.department?.deptNm : null)) || userEmp?.deptNm || userEmp?.deptnm || (deptRes || []).find(d => String(d.deptId || d.deptid) === String(userDeptId))?.deptNm || "N/A";

        // Filter tasks to only those assigned to the logged-in user (Executor, Reviewer, or Approver)
        const userAssignedTasks = (taskRes || []).filter(t => 
          (t.empId || t.empid) === empId || 
          (t.reviewer) === empId || 
          (t.approver) === empId
        );
        setTasks(userAssignedTasks);
        setMilestones(msRes || []);
        setAllTasks(taskRes || []);

        // Filter projects: show all the projects that are shown on user dashboard
        const dashboardProjects = dashRes?.myProjects || [];

        const formatDisplayDate = (d) => {
          if (!d || d === "No Start Date" || d === "No Target Date" || d === "N/A") return null;
          try {
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return String(d);
            return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
          } catch (e) {
            return String(d);
          }
        };

        // Map projects directly from dashboard projects to match exactly what is on the dashboard
        const mapped = dashboardProjects.map(dashP => {
          const dashId = String(dashP.projectId || dashP.id);
          const allProjs = Array.isArray(projRes) ? projRes : (projRes?.data || []);
          const proj = allProjs.find(p => String(p.prjId || p.prjid || p.id) === dashId) || {};

          const coyId = proj.coyId || proj.coyid;
          const pltId = proj.pltId || proj.pltid;
          const deptId = proj.deptId || proj.deptid;

          const companyName = coyRes?.find(c => String(c.coyId || c.coyid) === String(coyId))?.coyNm || (proj.coyNm || proj.coynm) || dashP.clientName || dashP.companyName || `Company`;
          const plantName = pltRes?.find(pl => String(pl.pltId || pl.pltid) === String(pltId))?.pltNm || (proj.pltNm || proj.pltnm) || dashP.location || `Plant`;
          const deptName = deptRes?.find(d => String(d.deptId || d.deptid) === String(deptId))?.deptNm || (proj.deptNm || proj.deptnm) || `Dept`;

          // All milestones for this project
          const projMilestones = (msRes || []).filter(m => String(m.prjId || m.prjid || m.projectId || m.prj_id) === dashId);
          
          // All tasks for this project
          const projTasksAll = (taskRes || []).filter(t => {
            const tPrjId = String(t.prjId || t.prjid || t.projectId || t.prj_id || "");
            if (tPrjId && tPrjId === dashId) return true;
            const tMId = String(t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id || "");
            return projMilestones.some(m => String(m.mId || m.mid || m.id) === tMId);
          });

          // Tasks specifically assigned to user
          const projUserTasks = projTasksAll.filter(t => 
            (t.empId || t.empid) === empId || 
            (t.reviewer) === empId || 
            (t.approver) === empId
          );

          // Effective tasks to display (Only tasks assigned to user)
          const projTasks = projUserTasks;

          // User-specific / Project counts
          const totalTasksCount = projTasks.length;
          const completedTasksCount = projTasks.filter(t => {
            const s = (t.taskSts || t.tasksts || t.status || "").toUpperCase();
            return s === 'COMPLETED' || s === 'CLOSED' || s === 'DONE' || s === '4' || t.progress === 100 || Boolean(t.actCmpDt || t.actcmpdt);
          }).length;
          const wipTasksCount = projTasks.filter(t => {
            const s = (t.taskSts || t.tasksts || t.status || "").toUpperCase();
            return s === 'WIP' || s === 'IN_PROGRESS';
          }).length;
          const openTasksCount = projTasks.filter(t => {
            const s = (t.taskSts || t.tasksts || t.status || "").toUpperCase();
            return s === 'OPEN' || s === 'REWORK' || s === 'OVER_DUE' || s === 'OVERDUE' || s === 'DRAFT' || s === 'REASSIGN';
          }).length;
          const reviewTasksCount = projTasks.filter(t => {
            const s = (t.taskSts || t.tasksts || t.status || "").toUpperCase();
            return s === 'SUBMIT_REVIEW' || s === 'UNDER_REVIEW';
          }).length;

          // Calculate progress from effective tasks
          let progressPct = 0;
          if (totalTasksCount > 0) {
            progressPct = Math.round((completedTasksCount / totalTasksCount) * 100);
          } else {
            const extractProgress = (obj) => {
              if (obj.status && (obj.status.toUpperCase() === 'COMPLETED' || obj.status.toUpperCase() === 'CLOSED')) return 100;
              const keys = ['progress', 'completionPercentage', 'completion', 'percentage', 'progressPercent', 'percentComplete'];
              for (const key of keys) {
                if (obj[key] !== undefined && obj[key] !== null) {
                  let val = obj[key];
                  if (typeof val === 'string') val = parseFloat(val.replace('%', ''));
                  if (!isNaN(val) && val >= 0 && val <= 100) return Number(val);
                }
              }
              return 0;
            };
            progressPct = extractProgress(dashP);
          }

          const actualManager = proj.createdByName || proj.createdBy || getLoggedInUser();

          const rawStart = proj.stDt || proj.stdt || proj.startDate || proj.st_dt || dashP.stDt || dashP.startDate || dashP.st_dt;
          const rawEnd = proj.endDt || proj.enddt || proj.endDate || proj.end_dt || proj.targetDate || dashP.endDt || dashP.dueDate || dashP.end_dt;

          // Check if all assigned tasks for this user in this project are closed
          const isUserClosed = totalTasksCount > 0 && completedTasksCount === totalTasksCount;
          const userProjectStatus = isUserClosed ? "CLOSED" : (proj.prjSts || proj.prjsts || dashP.status || "LIVE").toUpperCase();

          // Calculate Lead / Lag / On Time schedule status for user's completed tasks
          let userLeadLagLabel = null;
          let userLeadLagColor = null;

          if (isUserClosed && projTasks.length > 0) {
            let maxTargetEnd = null;
            let maxActualEnd = null;

            for (const t of projTasks) {
              const endStr = t.endDt || t.enddt || t.endDate || t.end_dt;
              const actStr = t.actCmpDt || t.actcmpdt || t.act_cmp_dt || endStr;
              if (endStr) {
                const d = new Date(endStr);
                if (!isNaN(d.getTime()) && (!maxTargetEnd || d > maxTargetEnd)) {
                  maxTargetEnd = d;
                }
              }
              if (actStr) {
                const d = new Date(actStr);
                if (!isNaN(d.getTime()) && (!maxActualEnd || d > maxActualEnd)) {
                  maxActualEnd = d;
                }
              }
            }

            if (!maxTargetEnd && rawEnd) {
              const d = new Date(rawEnd);
              if (!isNaN(d.getTime())) maxTargetEnd = d;
            }

            if (maxTargetEnd && maxActualEnd) {
              const diffMs = maxTargetEnd.getTime() - maxActualEnd.getTime();
              const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

              if (diffDays > 0) {
                userLeadLagLabel = `LEAD (${diffDays} DAYS)`;
                userLeadLagColor = "#10b981";
              } else if (diffDays < 0) {
                userLeadLagLabel = `LAG (${Math.abs(diffDays)} DAYS)`;
                userLeadLagColor = "#ef4444";
              } else {
                userLeadLagLabel = "ON TIME";
                userLeadLagColor = "#3b82f6";
              }
            } else {
              userLeadLagLabel = "ON TIME";
              userLeadLagColor = "#3b82f6";
            }
          }

          const rawBasePriority = typeof proj.prjPrty === 'string' ? proj.prjPrty : (proj.prjPrty?.priorityNm || proj.prjprty || dashP.priority || dashP.prjPrty || "LOW");
          const dynamicPrio = calculateDynamicPriority(
            rawBasePriority,
            rawStart,
            rawEnd,
            proj.totalProjectDays || proj.total_project_days || proj.noOfDays || proj.no_of_days || dashP.totalDays || dashP.noOfDays
          );

          return {
            id: dashId,
            prjId: dashId,
            name: dashP.projectName || proj.prjNm || proj.prjnm || dashP.name || `Project ${dashId}`,
            company: companyName,
            plant: plantName,
            priority: dynamicPrio.priority,
            priorityMeta: dynamicPrio,
            role: profRes?.firstName ? `${profRes.firstName} ${profRes.lastName || ''}` : "Team Member",
            userDepartment: userDeptName,
            tasksAssigned: totalTasksCount > 0 ? totalTasksCount : (dashP.tasksAssigned || 0),
            openTasks: openTasksCount,
            closedTasks: completedTasksCount,
            status: userProjectStatus,
            isUserClosed: isUserClosed,
            userLeadLagLabel: userLeadLagLabel,
            userLeadLagColor: userLeadLagColor,
            progress: isUserClosed ? 100 : progressPct,
            image: dashP.logo || proj.logo || null,
            manager: actualManager,
            startDate: formatDisplayDate(rawStart) || "No Start Date",
            targetDate: formatDisplayDate(rawEnd) || "No Target Date",
            code: proj.prjCd || proj.prjcd || `PRJ-${dashId}`,
            type: "Construction",
            location: dashP.location || proj.location || "Not Specified",
            client: companyName,
            department: deptName,
            reportingTo: actualManager,
            description: proj.prjDesc || proj.prjdesc || "",
            milestones: projMilestones.filter(m => {
              const mId = String(m.mId || m.mid || m.id);
              return projUserTasks.some(t => String(t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id) === mId);
            }).map(m => {
              const mId = m.mId || m.mid || m.id;
              const rawMStart = m.stDt || m.stdt || m.startDate || m.st_dt;
              const rawMEnd = m.endDt || m.enddt || m.endDate || m.end_dt;
              return {
                id: mId,
                mId: mId,
                name: m.mlstnTtl || m.mlstnttl,
                date: formatDisplayDate(rawMEnd) || "No End Date",
                start: formatDisplayDate(rawMStart) || "No Start Date",
                desc: m.mlstnDesc || m.mlstndesc || "",
                status: m.mlstnSts || m.mlstnsts || "Not Started",
                days: m.mlstnDays || m.mlstndays || 0,
                code: m.mlstnCd || m.mlstncd || ""
              };
            }),
            taskSummary: {
              assigned: totalTasksCount,
              inProgress: wipTasksCount,
              openTasks: openTasksCount,
              completed: completedTasksCount
            }
          };
        });

        setProjects(mapped);
        if (location.state && location.state.selectedProjectId) {
          const targetId = String(location.state.selectedProjectId);
          const targetProject = mapped.find(p => String(p.id) === targetId || String(p.prjId) === targetId);
          if (targetProject) {
            setSelectedProject(targetProject);
          }
        }
      } catch (err) {
        console.error("Error fetching projects data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = projects.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || 
      p.name.toLowerCase().includes(q) || 
      (p.code && p.code.toLowerCase().includes(q)) || 
      (p.company && p.company.toLowerCase().includes(q)) || 
      (p.plant && p.plant.toLowerCase().includes(q)) ||
      (p.priority && p.priority.toLowerCase().includes(q));

    const sFilter = statusFilter.toUpperCase().trim();
    const pSts = String(p.status || '').toUpperCase().trim();
    const matchFilter = statusFilter === "All Projects" || pSts === sFilter || (sFilter === "CLOSED" && p.isUserClosed);
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / projectsPerPage);
  const paged = filtered.slice((currentPage - 1) * projectsPerPage, currentPage * projectsPerPage);

  const progressColor = (pct) => pct >= 70 ? "#10b981" : pct >= 40 ? "#3b82f6" : "#f59e0b";
  
  const priorityColor = (p) => {
    switch (p?.toUpperCase()) {
      case "ATMOST CRITICAL":
      case "ATMOST_CRITICAL": return "#7F1D1D";
      case "CRITICAL": return "#B91C1C";
      case "HIGH": return "#EF4444";
      case "MEDIUM": return "#F59E0B";
      case "NORMAL": return "#3B82F6";
      case "LOW": return "#22C55E";
      default: return "#64748b";
    }
  };

  const statusColor = (s) => {
    switch (s?.toUpperCase()) {
      case "LIVE": return "#10b981"; // Green
      case "HOLD": return "#f59e0b"; // Orange
      case "CLOSED": return "#6b7280"; // Gray
      case "COMPLETED": return "#10b981";
      case "IN PROGRESS": return "#3b82f6";
      default: return "#3b82f6";
    }
  };

  if (loading) {
    return (
      <div className="mp-shell-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>
        Loading projects...
      </div>
    );
  }

  return (
    <div className="mp-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="mp-shell">
        <Header title="MY PROJECTS" showSearch={false} />

        <div className="mp-body">
          {/* ========== FULL PAGE: Project List ========== */}
          {!selectedProject && (
            <div className="mp-left-panel full-width">
              {/* Search + Filter */}
              <div className="mp-list-toolbar">
                <div className="mp-search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    maxLength={25}
                    onChange={e => setSearchQuery(e.target.value.slice(0, 25))}
                  />
                </div>
                <div className="mp-filter-wrap">
                  <button className="mp-filter-btn" onClick={() => setShowFilterDrop(!showFilterDrop)}>
                    {statusFilter} <ChevronDown size={14} />
                  </button>
                  {showFilterDrop && (
                    <div className="mp-filter-dropdown">
                      {["All Projects", "LIVE", "HOLD", "CLOSED"].map(s => (
                        <div key={s} className={`mp-filter-item ${statusFilter === s ? "active" : ""}`}
                          onClick={() => { setStatusFilter(s); setShowFilterDrop(false); setCurrentPage(1); }}>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Project Cards */}
              <div className="mp-card-list">
                {paged.length === 0 ? (
                  <div style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 24px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    textAlign: 'center',
                    margin: '12px 0'
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                      {statusFilter.toUpperCase() === "HOLD" ? "No projects are currently on hold" : 
                       statusFilter.toUpperCase() === "LIVE" ? "No live projects found" :
                       statusFilter.toUpperCase() === "CLOSED" ? "No closed projects found" :
                       "No projects found"}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {statusFilter !== "All Projects" 
                        ? `There are no projects under the "${statusFilter}" filter.` 
                        : "No projects match your search query."}
                    </div>
                  </div>
                ) : (
                  paged.map(proj => (
                    <div
                      key={proj.id}
                      className={`mp-project-card ${selectedProject?.id === proj.id ? "selected" : ""}`}
                      onClick={() => { setSelectedProject(proj); setActiveTab("Overview"); setShowFilterDrop(false); }}
                    >
                      {proj.image ? (
                        <img src={proj.image} alt={proj.name} className="mp-card-img" style={{ objectFit: 'contain', alignSelf: 'flex-start', height: 'auto', maxHeight: '140px', background: 'transparent', borderRadius: '8px' }} />
                      ) : (
                        <div className="mp-card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '110px', minWidth: '110px', height: '80px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', flexShrink: 0, alignSelf: 'flex-start' }}>
                          <span style={{ fontSize: '32px', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '-1px' }}>{(proj.name || 'P').charAt(0)}</span>
                        </div>
                      )}
                      <div className="mp-card-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', flex: 1 }}>
                        <div className="mp-card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div style={{ flex: 1, paddingRight: '12px' }}>
                            <div className="mp-card-name" style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{proj.name}</div>
                            <div className="mp-card-sub" style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', lineHeight: '1.4' }}>{proj.company} | {proj.plant}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {proj.isUserClosed && proj.userLeadLagLabel ? (
                                <>
                                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Schedule:</span>
                                  <span style={{ 
                                    backgroundColor: proj.userLeadLagColor + '15', 
                                    color: proj.userLeadLagColor,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    textTransform: 'uppercase'
                                  }}>{proj.userLeadLagLabel}</span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Priority:</span>
                                  <span style={{ 
                                    backgroundColor: proj.priorityMeta?.bgColor || (priorityColor(proj.priority) + '15'), 
                                    color: proj.priorityMeta?.color || priorityColor(proj.priority),
                                    border: proj.priorityMeta?.borderColor ? `1px solid ${proj.priorityMeta.borderColor}` : 'none',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    textTransform: 'uppercase'
                                  }}>{proj.priority}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="mp-card-circle" style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', width: '100px' }}>
                            <CircularProgress pct={proj.progress} color={progressColor(proj.progress)} />
                          </div>
                        </div>
                        
                        <div className="mp-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: 'auto' }}>
                          <div style={{ display: 'flex', gap: '20px' }}>
                            <div className="mp-card-stat" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="mp-stat-label" style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tasks</span>
                              <span className="mp-stat-value" style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{proj.tasksAssigned}</span>
                            </div>
                            <div className="mp-card-stat" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="mp-stat-label" style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Open</span>
                              <span className="mp-stat-value" style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{proj.openTasks}</span>
                            </div>
                            <div className="mp-card-stat" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="mp-stat-label" style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Closed</span>
                              <span className="mp-stat-value" style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{proj.closedTasks}</span>
                            </div>
                          </div>
                          <span style={{
                            backgroundColor: statusColor(proj.status) + '15',
                            color: statusColor(proj.status),
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                            display: 'inline-block'
                          }}>
                            {proj.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div className="mp-pagination">
                <span>{filtered.length === 0 ? "Showing 0 of 0 projects" : `Showing 1 to ${filtered.length} of ${filtered.length} projects`}</span>
                <div className="mp-pag-controls">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={14} /></button>
                  <span className="mp-pag-page">{currentPage}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={14} /></button>
                </div>
              </div>
            </div>
          )}

          {/* ========== FULL PAGE: Project Detail ========== */}
          {selectedProject && (
            <div className="mp-right-panel full-width">
              {/* Back + Download */}
              <div className="mp-detail-topbar">
                <button 
                  className="mp-back-btn" 
                  onClick={() => setSelectedProject(null)}
                  style={{
                    backgroundColor: '#195dfa',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(25, 93, 250, 0.15)',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <ArrowLeft size={16} /> Back to Projects
                </button>
              </div>

              {/* Project Hero */}
              <div className="mp-detail-hero">
                {selectedProject.image ? (
                  <img src={selectedProject.image} alt={selectedProject.name} className="mp-detail-img" style={{ objectFit: 'contain', alignSelf: 'flex-start', height: 'auto', maxHeight: '200px', background: 'transparent', borderRadius: '12px' }} />
                ) : (
                  <div className="mp-detail-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '120px', minWidth: '120px', height: '120px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', flexShrink: 0, alignSelf: 'flex-start' }}>
                    <span style={{ fontSize: '48px', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '-2px' }}>{(selectedProject.name || 'P').charAt(0)}</span>
                  </div>
                )}
                <div className="mp-detail-hero-info">
                  <div className="mp-detail-hero-row">
                    <div>
                      <h2 className="mp-detail-name">{selectedProject.name}</h2>
                      <div className="mp-detail-sub">
                        {selectedProject.company} &nbsp;|&nbsp; {selectedProject.plant}
                      </div>
                    </div>
                    <span style={{
                      backgroundColor: statusColor(selectedProject.status) + '15',
                      color: statusColor(selectedProject.status),
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      display: 'inline-block'
                    }}>
                      {selectedProject.status}
                    </span>
                  </div>
                  <div className="mp-detail-meta">
                    <div className="mp-meta-item">
                      {selectedProject.isUserClosed && selectedProject.userLeadLagLabel ? (
                        <>
                          <Clock size={14} style={{ color: selectedProject.userLeadLagColor }} />
                          <div>
                            <span className="mp-meta-label">Schedule Status</span>
                            <span className="mp-meta-value bold" style={{ 
                              color: selectedProject.userLeadLagColor, 
                              backgroundColor: selectedProject.userLeadLagColor + '15',
                              padding: '5px 14px',
                              borderRadius: '14px',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              display: 'inline-block',
                              marginTop: '3px'
                            }}>
                              {selectedProject.userLeadLagLabel}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={14} style={{ color: selectedProject.priorityMeta?.bgColor || priorityColor(selectedProject.priority) }} />
                          <div>
                            <span className="mp-meta-label">Priority</span>
                            <span className="mp-meta-value bold" style={{ 
                              color: selectedProject.priorityMeta?.color || priorityColor(selectedProject.priority), 
                              backgroundColor: selectedProject.priorityMeta?.bgColor || (priorityColor(selectedProject.priority) + '15'),
                              border: selectedProject.priorityMeta?.borderColor ? `1px solid ${selectedProject.priorityMeta.borderColor}` : 'none',
                              padding: '5px 14px',
                              borderRadius: '14px',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              display: 'inline-block',
                              marginTop: '3px'
                            }}>
                              {selectedProject.priority}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mp-meta-item">
                      <Calendar size={14} style={{ color: "#3b82f6" }} />
                      <div>
                        <span className="mp-meta-label">Start Date</span>
                        <span className="mp-meta-value">{selectedProject.startDate}</span>
                      </div>
                    </div>
                    <div className="mp-meta-item">
                      <Clock size={14} style={{ color: "#f59e0b" }} />
                      <div>
                        <span className="mp-meta-label">End Date</span>
                        <span className="mp-meta-value">{selectedProject.targetDate}</span>
                      </div>
                    </div>
                    <div className="mp-meta-item">
                      <div style={{ width: '160px' }}>
                        <span className="mp-meta-label">Task Progress</span>
                        <div>
                          <PipelineProgress pct={selectedProject.progress} color={progressColor(selectedProject.progress)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mp-tabs">
                {TABS.map(tab => (
                  <button key={tab} className={`mp-tab ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content: Overview */}
              {activeTab === "Overview" && (
                <UserOverview selectedProject={selectedProject} />
              )}

              {activeTab === "Milestones & Tasks" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <UserMilestone selectedProject={selectedProject} userTasks={tasks} allTasks={allTasks} employees={employees} profile={profile} />
                  <UserMyTask selectedProject={selectedProject} userTasks={tasks} />
                </div>
              )}
              {activeTab === "Gantt Chart" && (
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  background: '#fff',
                  width: '100%',
                  boxSizing: 'border-box',
                }}>
                  <ProjectGanttChart project={selectedProject} userRole="user" />
                </div>
              )}
              {activeTab === "Documents" && (
                <DocsAndReports isTab={true} project={selectedProject} userRole={userRole} onLogout={onLogout} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProjects;
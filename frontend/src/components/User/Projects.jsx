import React, { useState, useEffect } from "react";
import {
  Search, Download, ArrowLeft, ChevronLeft, ChevronRight,
  ChevronDown, Calendar, Clock, CheckCircle2, BarChart2,
  PlayCircle, Users, Menu
} from "lucide-react";
import Sidebar from "../Sidebar";
import Header from "../Header";
import UserOverview from "./UserOverview";
import UserMilestone from "./UserMilestone";
import UserMyTask from "./UserMyTask";
import ProjectGanttChart from "./ProjectGanttChart";
import "../../styles/my-project.css";

// Circular Progress SVG
const CircularProgress = ({ pct, color = "#10b981", size = 52, stroke = 5 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e9ecef" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fontSize: size < 56 ? "11px" : "14px", fontWeight: 700, fill: "#0d1126" }}>
        {pct}%
      </text>
    </svg>
  );
};

import { safeFetch } from "../../utils/api";

const TABS = ["Overview", "Milestones", "My Tasks", "Gantt Chart", "Documents"];

const MyProjects = ({ userRole, onLogout }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Projects");
  const [showFilterDrop, setShowFilterDrop] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const projectsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profRes, projRes, msRes, taskRes, coyRes, pltRes, deptRes] = await Promise.all([
          safeFetch('/api/profile'),
          safeFetch('/api/project-live', []),
          safeFetch('/api/milestone-live', []),
          safeFetch('/api/task-live', []),
          safeFetch('/api/companies', []),
          safeFetch('/api/plants', []),
          safeFetch('/api/departments', [])
        ]);

        setProfile(profRes);
        const empId = profRes?.empId;
        const isAdmin = profRes?.email === 'vsv.vempati@gmail.com';

        // Filter tasks to only user tasks (personal view filters by employee ID)
        const userTasks = (taskRes || []).filter(t => (t.empId || t.empid) === empId);
        setTasks(userTasks);

        // Filter milestones: keep milestones that have at least one task assigned to the user
        const userMilestones = (msRes || []).filter(m => {
          const mId = m.mId || m.mid || m.id;
          return userTasks.some(t => (t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id) === mId);
        });
        setMilestones(userMilestones);

        // Filter projects: keep projects that have at least one milestone in userMilestones
        const userProjects = (projRes || []).filter(p => {
          const prjId = p.prjId || p.prjid || p.id;
          return userMilestones.some(m => (m.prjId || m.prjid) === prjId);
        });

        // Map projects to match the page expectations
        const mapped = userProjects.map(proj => {
          const companyName = coyRes?.find(c => (c.coyId || c.coyid) === (proj.coyId || proj.coyid))?.coyNm || (proj.coyNm || proj.coynm) || `Company ${proj.coyId || proj.coyid}`;
          const plantName = pltRes?.find(pl => (pl.pltId || pl.pltid) === (proj.pltId || proj.pltid))?.pltNm || (proj.pltNm || proj.pltnm) || `Plant ${proj.pltId || proj.pltid}`;
          const deptName = deptRes?.find(d => (d.deptId || d.deptid) === (proj.deptId || proj.deptid))?.deptNm || (proj.deptNm || proj.deptnm) || `Dept ${proj.deptId || proj.deptid}`;

          const projId = proj.prjId || proj.prjid || proj.id;
          const projMilestones = userMilestones.filter(m => (m.prjId || m.prjid) === projId);
          const projTasks = userTasks.filter(t => {
            const tMId = t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id;
            return projMilestones.some(m => (m.mId || m.mid || m.id) === tMId);
          });

          const totalTasksCount = projTasks.length;
          const completedTasksCount = projTasks.filter(t => (t.taskSts || t.tasksts || "").toUpperCase() === 'COMPLETED').length;
          const wipTasksCount = projTasks.filter(t => {
            const s = (t.taskSts || t.tasksts || "").toUpperCase();
            return s === 'WIP' || s === 'IN_PROGRESS';
          }).length;
          const openTasksCount = projTasks.filter(t => {
            const s = (t.taskSts || t.tasksts || "").toUpperCase();
            return s === 'OPEN' || s === 'REWORK';
          }).length;
          const reviewTasksCount = projTasks.filter(t => {
            const s = (t.taskSts || t.tasksts || "").toUpperCase();
            return s === 'SUBMIT_REVIEW' || s === 'UNDER_REVIEW';
          }).length;

          let progressPct = 0;
          if (totalTasksCount > 0) {
            progressPct = Math.round(((completedTasksCount + reviewTasksCount * 0.8 + wipTasksCount * 0.5) / totalTasksCount) * 100);
          }

          return {
            id: projId,
            prjId: projId,
            name: proj.prjNm || proj.prjnm,
            company: companyName,
            plant: plantName,
            role: profRes?.firstName ? `${profRes.firstName} ${profRes.lastName || ''}` : "Team Member",
            tasksAssigned: totalTasksCount,
            openTasks: openTasksCount + wipTasksCount + reviewTasksCount,
            status: proj.prjSts || proj.prjsts || "In Progress",
            progress: progressPct,
            image: proj.logo || "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=200&h=120&fit=crop",
            manager: "Siva Kumar",
            startDate: proj.stDt || proj.stdt || "N/A",
            targetDate: proj.endDt || proj.enddt || "N/A",
            code: proj.prjCd || proj.prjcd || `PRJ-${projId}`,
            type: "Construction",
            location: "N/A",
            client: companyName,
            department: deptName,
            reportingTo: "Siva Kumar",
            description: proj.prjDesc || proj.prjdesc || "",
            milestones: projMilestones.map(m => {
              const mId = m.mId || m.mid || m.id;
              return {
                id: mId,
                mId: mId,
                name: m.mlstnTtl || m.mlstnttl,
                date: m.endDt || m.enddt || "N/A",
                start: m.stDt || m.stdt || "N/A",
                desc: m.mlstnDesc || m.mlstndesc || "",
                status: m.mlstnSts || m.mlstnsts || "Not Started",
                days: m.mlstnDays || m.mlstndays || 0
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
      } catch (err) {
        console.error("Error fetching projects data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = statusFilter === "All Projects" || p.status === statusFilter;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / projectsPerPage);
  const paged = filtered.slice((currentPage - 1) * projectsPerPage, currentPage * projectsPerPage);

  const progressColor = (pct) => pct >= 70 ? "#10b981" : pct >= 40 ? "#3b82f6" : "#f59e0b";

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
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="mp-filter-wrap">
                  <button className="mp-filter-btn" onClick={() => setShowFilterDrop(!showFilterDrop)}>
                    {statusFilter} <ChevronDown size={14} />
                  </button>
                  {showFilterDrop && (
                    <div className="mp-filter-dropdown">
                      {["All Projects", "In Progress", "Completed", "On Hold"].map(s => (
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
                {paged.map(proj => (
                  <div
                    key={proj.id}
                    className={`mp-project-card ${selectedProject?.id === proj.id ? "selected" : ""}`}
                    onClick={() => { setSelectedProject(proj); setActiveTab("Overview"); }}
                  >
                    <img src={proj.image} alt={proj.name} className="mp-card-img" />
                    <div className="mp-card-info">
                      <div className="mp-card-header-row">
                        <div>
                          <div className="mp-card-name">{proj.name}</div>
                          <div className="mp-card-sub">{proj.company} | {proj.plant}</div>
                          <div className="mp-card-role">Role: <strong>{proj.role}</strong></div>
                        </div>
                        <div className="mp-card-circle">
                          <CircularProgress pct={proj.progress} color={progressColor(proj.progress)} />
                        </div>
                      </div>
                      <div className="mp-card-footer">
                        <div className="mp-card-stat">
                          <span className="mp-stat-label">Tasks Assigned</span>
                          <span className="mp-stat-value">{proj.tasksAssigned}</span>
                        </div>
                        <div className="mp-card-stat">
                          <span className="mp-stat-label">Open Tasks</span>
                          <span className="mp-stat-value">{proj.openTasks}</span>
                        </div>
                        <span className={`mp-status-badge mp-status-${proj.status.toLowerCase().replace(/ /g, "-")}`}>
                          {proj.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mp-pagination">
                <span>Showing 1 to {filtered.length} of {filtered.length} projects</span>
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
                <button className="mp-back-btn" onClick={() => setSelectedProject(null)}>
                  <ArrowLeft size={16} /> Back to Projects
                </button>
                <button className="mp-download-btn">
                  <Download size={14} /> Download Report
                </button>
              </div>

              {/* Project Hero */}
              <div className="mp-detail-hero">
                <img src={selectedProject.image} alt={selectedProject.name} className="mp-detail-img" />
                <div className="mp-detail-hero-info">
                  <div className="mp-detail-hero-row">
                    <div>
                      <h2 className="mp-detail-name">{selectedProject.name}</h2>
                      <div className="mp-detail-sub">
                        {selectedProject.company} &nbsp;|&nbsp; {selectedProject.plant}
                      </div>
                    </div>
                    <span className={`mp-status-badge mp-status-${selectedProject.status.toLowerCase().replace(/ /g, "-")}`}>
                      {selectedProject.status}
                    </span>
                  </div>
                  <div className="mp-detail-meta">
                    <div className="mp-meta-item">
                      <Users size={14} style={{ color: "#10b981" }} />
                      <div>
                        <span className="mp-meta-label">Project Manager</span>
                        <span className="mp-meta-value bold">{selectedProject.manager}</span>
                      </div>
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
                        <span className="mp-meta-label">Target Date</span>
                        <span className="mp-meta-value">{selectedProject.targetDate}</span>
                      </div>
                    </div>
                    <div className="mp-meta-item">
                      <div>
                        <span className="mp-meta-label">Overall Progress</span>
                        <div style={{ marginTop: 4 }}>
                          <CircularProgress pct={selectedProject.progress} color={progressColor(selectedProject.progress)} size={64} stroke={6} />
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

              {activeTab === "Milestones" && (
                <UserMilestone selectedProject={selectedProject} userTasks={tasks} />
              )}
              {activeTab === "My Tasks" && (
                <UserMyTask selectedProject={selectedProject} userTasks={tasks} />
              )}
              {activeTab === "Gantt Chart" && (
                <ProjectGanttChart project={selectedProject} userRole="user" />
              )}
              {activeTab === "Documents" && (
                <div className="mp-tab-placeholder">
                  <Download size={40} color="#e2e8f0" />
                  <p>Documents section coming soon.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProjects;
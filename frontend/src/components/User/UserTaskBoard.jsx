// UserTaskBoard.jsx
import React, { useState, useEffect } from 'react';
import {
  Calendar, ListTodo, AlertCircle, PieChart, Eye, Layers, CheckCircle2,
  Search, Filter, Plus, ChevronDown, User, Info, Folder, FileText, ClipboardList, Loader, X
} from 'lucide-react';
import Sidebar from '../Sidebar.jsx';
import Header from '../Header.jsx';
import { apiGet } from '../../utils/api';
import { getScreenPermission } from '../../utils/permissions';
import '../../styles/user-task-board.css';

// Helper for auth headers (used if apiGet doesn't already handle auth)
const getAuthToken = () => sessionStorage.getItem("authToken") || localStorage.getItem("authToken") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr || '';
  const cleanStr = dateStr.trim().split('T')[0].split(' ')[0];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanStr)) return cleanStr;
  const parts = cleanStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
};

// ------------------- Helper: Determine display status from raw task -------------------
const getTaskDisplayStatus = (t) => {
  const rawSts = (t.taskSts || t.tasksts || t.status || "DRAFT").toString().toUpperCase().trim();
  const subSts = (t.subStatus || t.substatus || "").toString().toUpperCase().trim();
  const prcsActn = (t.prcsYesActn || t.prcsyesactn || "").toString().toUpperCase().trim();

  if (rawSts === "COMPLETED" || rawSts === "CLOSED" || rawSts === "4") {
    return "Closed";
  }
  if (rawSts === "HOLD") {
    return "Open";
  }
  if (
    subSts === "UNDER REVIEW" ||
    subSts === "UNDER_REVIEW" ||
    rawSts === "UNDER_REVIEW" ||
    rawSts === "SUBMIT_REVIEW" ||
    prcsActn === "PENDING_REVIEWER" ||
    prcsActn === "PENDING_APPROVER"
  ) {
    return "Under Review";
  }
  if (subSts === "REASSIGN" || rawSts === "REASSIGN") {
    return "Open";
  }
  if (rawSts === "WIP" || rawSts === "IN_PROGRESS" || rawSts === "WORK_IN_PROGRESS" || rawSts === "ASSIGNED" || rawSts === "3" || subSts === "REWORK" || rawSts === "REWORK") {
    return "In Progress";
  }
  if (subSts === "OVERDUE" || rawSts === "OVERDUE" || rawSts === "OVER_DUE") {
    return "Overdue";
  }

  const today = new Date().toISOString().split("T")[0];
  const endDt = t.endDt || t.enddt;
  if (endDt && endDt < today) {
    return "Overdue";
  }
  return "Open";
};

const checkIsUpcoming = (task) => {
  const rawSts = (task.rawStatus || "").toUpperCase();
  if (rawSts === "COMPLETED" || rawSts === "CLOSED" || rawSts === "WIP" || rawSts === "IN_PROGRESS" || rawSts === "WORK_IN_PROGRESS" || rawSts === "REWORK" || rawSts === "REASSIGN") {
    return false;
  }
  const stDtStr = task.rawTask?.stDt || task.rawTask?.stdt || task.rawTask?.st_dt || task.rawTask?.startDate || task.stDt || task.startDate;
  if (stDtStr) {
    try {
      const todayObj = new Date();
      todayObj.setHours(0, 0, 0, 0);

      const dateOnly = String(stDtStr).split('T')[0].split(' ')[0];
      const parts = dateOnly.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const startDateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        startDateObj.setHours(0, 0, 0, 0);

        if (startDateObj > todayObj) {
          return true;
        }
      }
    } catch (e) {}
  }
  return false;
};

const getScheduleStatusInfo = (task) => {
  if (!task) return { status: 'ON TIME', bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' };
  
  const refDate = task.completedOn || task.submittedOn;
  let status = 'ON TIME';

  if (refDate && task.due) {
    if (refDate < task.due) status = 'LEAD';
    else if (refDate > task.due) status = 'LAG';
    else status = 'ON TIME';
  } else if (task.due) {
    const today = new Date().toISOString().split('T')[0];
    if (today > task.due || task.isOverdue) status = 'LAG';
    else status = 'ON TIME';
  }

  if (status === 'LEAD') {
    return { status: 'LEAD', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  } else if (status === 'LAG') {
    return { status: 'LAG', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  }
  return { status: 'ON TIME', bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' };
};

// ------------------- Main Component -------------------
const UserTaskBoard = ({ userRole, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all', 'todo', 'overdue', 'inProgress', 'underReview', 'completed'
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalTasksCount, setTotalTasksCount] = useState(0);

  // State for tasks – grouped by status
  const [tasks, setTasks] = useState({
    todo: [],
    overdue: [],
    inProgress: [],
    completed: []
  });

  // Sidebar toggle and responsive handling
  useEffect(() => {
    const handleToggle = () => setSidebarOpen(prev => !prev);
    window.addEventListener('toggleSidebar', handleToggle);

    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    } else if (localStorage.getItem("sidebarCollapsed") === "true") {
      setSidebarOpen(false);
    }

    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  // ---------- Data fetching logic ----------
  const loadTasks = async () => {
    try {
      // Fetch all required data in parallel
      const [projectsData, milestonesData, tasksData, indTasksData, profileRes, employeesData, myTasksSpData] = await Promise.all([
        apiGet("/api/project-live").catch(() => []),
        apiGet("/api/milestone-live").catch(() => []),
        apiGet("/api/task-live").catch(() => []),
        apiGet("/api/assignments").catch(() => []),
        apiGet("/api/profile").catch(() => ({})),
        apiGet("/api/employees").catch(() => []),
        apiGet("/api/user-dashboard/my-tasks").catch(() => [])
      ]);

      const empId = profileRes?.empId;
      const isAdmin = profileRes?.email === 'vsv.vempati@gmail.com';

      const hasSpData = Array.isArray(myTasksSpData) && myTasksSpData.length > 0;
      const spProjectTaskIds = new Set();
      const spIndTaskIds = new Set();

      if (hasSpData) {
        myTasksSpData.forEach(item => {
          if (item.isIndividual || item.is_individual) {
            spIndTaskIds.add(String(item.taskId || item.task_id));
          } else {
            spProjectTaskIds.add(String(item.taskId || item.task_id));
          }
        });
      }

      // Filter tasks assigned to this user (or all if admin) using stored procedure alignment
      const userTasks = (tasksData || []).filter(t => {
        if (hasSpData && !isAdmin) {
          return spProjectTaskIds.has(String(t.taskId || t.taskid || t.task_id));
        }
        return (
          isAdmin ||
          String(t.empId) === String(empId) ||
          String(t.empid) === String(empId) ||
          String(t.reviewerId) === String(empId) ||
          String(t.approverId) === String(empId) ||
          (Array.isArray(t.teamMembers) && t.teamMembers.some(tm => String(tm.empId) === String(empId)))
        );
      });

      const userIndTasks = (indTasksData || []).filter(t => {
        if (hasSpData && !isAdmin) {
          return spIndTaskIds.has(String(t.empTaskId || t.emptaskid || t.taskId || t.task_id));
        }
        return (
          isAdmin ||
          String(t.empId) === String(empId) ||
          String(t.empid) === String(empId) ||
          String(t.reviewerId) === String(empId) ||
          String(t.approverId) === String(empId) ||
          (Array.isArray(t.teamMembers) && t.teamMembers.some(tm => String(tm.empId) === String(empId)))
        );
      });

      // Helper: map a project task
      const mapProjectTask = (t) => {
        const status = getTaskDisplayStatus(t);
        const rawSts = (t.taskSts || t.tasksts || "DRAFT").toUpperCase().trim();

        // Compute priority based on due date
        let priority = t.priority || "Medium";
        const endDt = t.endDt || t.enddt;
        if (endDt) {
          const [year, month, day] = endDt.split('-');
          const endDtObj = new Date(year, month - 1, day);
          endDtObj.setHours(0, 0, 0, 0);
          const todayObj = new Date();
          todayObj.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((todayObj.getTime() - endDtObj.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) priority = "High";
          else if (diffDays === 1) priority = "Critical";
          else if (diffDays >= 2) priority = "Atmost Critical";
        }

        // Find project and milestone
        const project = (projectsData || []).find(p =>
          (p.prjId === t.prjId) || (p.prjid === t.prjid) ||
          (p.prjId === t.prjid) || (p.prjid === t.prjId)
        );
        const milestone = (milestonesData || []).find(m =>
          (m.mId === t.mId) || (m.mid === t.mid) ||
          (m.mId === t.mid) || (m.mid === t.mId)
        );

        // Find assignee name
        const assigneeEmp = employeesData?.find(e => String(e.empId) === String(t.empId));
        const assigneeName = assigneeEmp ? `${assigneeEmp.fstNm || ''} ${assigneeEmp.lstNm || ''}`.trim() : "Unassigned";

        return {
          id: t.taskCd || t.taskcd || `TSK-${t.taskId}`,
          taskId: t.taskId,
          isIndividual: false,
          title: t.taskNm || t.tasknm || "Untitled",
          project: project ? (project.prjNm || project.prjnm) : "Unknown Project",
          milestone: milestone ? (milestone.mlstnTtl || milestone.mlstnttl) : "Unknown Milestone",
          priority: priority,
          due: endDt || "",
          submittedOn: t.sbmtDt || t.sbmtdt || "",
          completedOn: t.actCmpDt || t.actcmpdt || "",
          status: status,
          rawStatus: rawSts,
          rawTask: t,
          description: t.taskDesc || t.taskdesc || "",
          assigned: assigneeName,
          submittedTo: employeesData?.find(e => String(e.empId) === String(t.reviewerId))?.fstNm || "",
          isOverdue: status === "Overdue"
        };
      };

      // Helper: map an individual task
      const mapIndividualTask = (t) => {
        const status = getTaskDisplayStatus(t);
        const rawSts = (t.taskSts || t.tasksts || "DRAFT").toUpperCase().trim();

        let priority = t.priority || "Medium";
        const endDt = t.endDt || t.enddt;
        if (endDt) {
          const [year, month, day] = endDt.split('-');
          const endDtObj = new Date(year, month - 1, day);
          endDtObj.setHours(0, 0, 0, 0);
          const todayObj = new Date();
          todayObj.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((todayObj.getTime() - endDtObj.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) priority = "High";
          else if (diffDays === 1) priority = "Critical";
          else if (diffDays >= 2) priority = "Atmost Critical";
        }

        const assigneeEmp = employeesData?.find(e => String(e.empId) === String(t.empId));
        const assigneeName = assigneeEmp ? `${assigneeEmp.fstNm || ''} ${assigneeEmp.lstNm || ''}`.trim() : "Unassigned";

        return {
          id: t.taskCd || t.taskcd || `IND-${t.empTaskId}`,
          taskId: t.empTaskId,
          isIndividual: true,
          title: t.taskNm || t.tasknm || "Untitled",
          project: "Individual Task",
          milestone: "-",
          priority: priority,
          due: endDt || "",
          submittedOn: t.sbmtDt || t.sbmtdt || "",
          completedOn: t.actCmpDt || t.actcmpdt || "",
          status: status,
          rawStatus: rawSts,
          rawTask: t,
          description: t.taskDesc || t.taskdesc || "",
          assigned: assigneeName,
          submittedTo: employeesData?.find(e => String(e.empId) === String(t.reviewerId))?.fstNm || "",
          isOverdue: status === "Overdue"
        };
      };

      // Map all tasks
      const mappedProjectTasks = userTasks.map(mapProjectTask);
      const mappedIndTasks = userIndTasks.map(mapIndividualTask);
      const allMapped = [...mappedProjectTasks, ...mappedIndTasks];

      // Group by status
      const today = new Date().toISOString().split("T")[0];
      const todo = [], overdue = [], inProgress = [], completed = [];

      allMapped.forEach(task => {
        const rawSts = (task.rawStatus || "").toUpperCase();
        const prcsActn = (task.rawTask?.prcsYesActn || task.prcsYesActn || "").toUpperCase();
        const subSts = (task.rawTask?.subStatus || task.subStatus || "").toUpperCase();
        const isClosed = task.status === "Closed" || task.status === "Completed" || rawSts === "CLOSED" || rawSts === "COMPLETED";
        const isPastDue = task.due && task.due < today && !isClosed;
        task.isOverdue = isPastDue || task.status === "Overdue";

        const isUnderReview = !isClosed && (
          task.status === "Under Review" ||
          subSts.includes("REVIEW") ||
          prcsActn.includes("REVIEW") ||
          prcsActn.includes("APPROVER")
        );

        const isUpcoming = checkIsUpcoming(task);

        if (isClosed) {
          completed.push(task);
        } else {
          if (isUnderReview || task.status === "In Progress" || rawSts === "WIP" || rawSts === "IN_PROGRESS" || rawSts === "WORK_IN_PROGRESS") {
            inProgress.push(task);
          } else if (!isUpcoming) {
            todo.push(task);
          }

          if (task.isOverdue || task.status === "Overdue") {
            overdue.push(task);
          }
        }
      });

      setTotalTasksCount(allMapped.length);
      setTasks({ todo, overdue, inProgress, completed });
    } catch (err) {
      console.error("Error fetching task board data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and refresh
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Handle stat card click to filter columns
  const handleStatClick = (status) => {
    setSelectedStatusFilter(status);
  };

  // Filter tasks by search and project
  const filterTasks = (taskList) => {
    let result = taskList || [];
    if (selectedProject !== 'All') {
      result = result.filter(task => task.project === selectedProject);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(task =>
        (task.title && task.title.toLowerCase().includes(lower)) ||
        (task.id && task.id.toLowerCase().includes(lower)) ||
        (task.project && task.project.toLowerCase().includes(lower)) ||
        (task.assigned && task.assigned.toLowerCase().includes(lower)) ||
        (task.milestone && task.milestone.toLowerCase().includes(lower))
      );
    }
    return result;
  };

  // Calculate stats
  const stats = {
    todo: tasks.todo.length,
    overdue: tasks.overdue.length,
    inProgress: tasks.inProgress.length,
    completed: tasks.completed.length,
    open: tasks.todo.length,
    total: (tasks.todo.length + tasks.inProgress.length + tasks.completed.length)
  };

  // Render a task card
  const renderCard = (task, type) => {
    const isCompleted = task.status === "Closed" || task.status === "Completed";
    return (
      <div className="utb-card" key={task.id}>
        <div className="utb-card-top">
          <span className="utb-card-id">{task.id}</span>
          {!isCompleted && task.priority && (
            <span className={`utb-badge ${task.priority.toLowerCase().replace(/\s+/g, '-')}`}>
              {task.priority}
            </span>
          )}
          {isCompleted && (() => {
            const info = getScheduleStatusInfo(task);
            return (
              <span className="utb-badge" style={{ 
                  backgroundColor: info.bg,
                  color: info.color,
                  border: `1px solid ${info.border}`
              }}>
                {info.status}
              </span>
            );
          })()}
        </div>
        <h4 className="utb-card-title">{task.title}</h4>
        <div className="utb-card-details">
          <div className="utb-card-detail-item">Project: <span>{task.project}</span></div>
          <div className="utb-card-detail-item">Milestone: <span>{task.milestone}</span></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
          {!isCompleted && task.due && (
            <div className={`utb-card-meta ${task.isOverdue ? 'overdue-text' : ''}`} style={{ marginBottom: 0, fontWeight: task.isOverdue ? 'bold' : 'normal', color: task.isOverdue ? '#ef4444' : 'inherit' }}>
              <Calendar size={14} /> {task.isOverdue ? 'Overdue:' : 'Due:'} {formatDate(task.due)}
            </div>
          )}
          {task.submittedOn && !isCompleted && (
            <div className="utb-card-meta" style={{ marginBottom: 0 }}>
              <Calendar size={14} /> Submitted on: {formatDate(task.submittedOn)}
            </div>
          )}

          <div className="utb-assignee" style={{ marginBottom: 0 }}>
            <User size={14} /> Assigned by: {task.assigned}
          </div>
          {task.submittedTo && !isCompleted && (
            <div className="utb-assignee" style={{ marginBottom: 0 }}>
              <FileText size={14} /> Submitted to: {task.submittedTo}
            </div>
          )}
        </div>

        <div className="utb-card-actions">
          <button className="utb-card-btn outline full" onClick={() => setSelectedTask(task)}>View Details</button>
        </div>
      </div>
    );
  };

  // Determine which columns to show based on filter
  const shouldShowColumn = (columnKey) => {
    if (selectedStatusFilter === 'all') return true;
    return columnKey === selectedStatusFilter;
  };

  // Unique projects for dropdown
  const allTasksForDropdown = [...tasks.todo, ...tasks.overdue, ...tasks.inProgress, ...tasks.completed];
  const uniqueProjects = ["All", ...new Set(allTasksForDropdown.map(t => t.project).filter(Boolean))];

  return (
    <div className="utb-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className={`utb-shell ${!sidebarOpen ? 'expanded' : ''}`}>
        <Header title="Task Board" subtitle="Track and manage your assigned tasks across projects." onLogout={onLogout} userRole={userRole} />

        <main className="utb-main" style={{ paddingTop: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '55vh', flexDirection: 'column', gap: '16px' }}>
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
              <span style={{ color: '#64748b', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px' }}>Loading Tasks...</span>
            </div>
          ) : (
            <>
              {/* ===== STATS ROW – perfectly equal & aligned ===== */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '16px',
                  width: '100%',
                }}
              >
                {[
                  { key: 'all', label: 'My Tasks', icon: ClipboardList, color: '#3b82f6', count: stats.total, bg: '#f5f8ff', activeBg: '#e5edff', border: '#e5edff', activeBorder: '#3b82f6' },
                  { key: 'todo', label: 'Open', icon: ListTodo, color: '#3b82f6', count: stats.todo, bg: '#f5f8ff', activeBg: '#e5edff', border: '#e5edff', activeBorder: '#3b82f6' },
                  { key: 'overdue', label: 'Overdue', icon: AlertCircle, color: '#ef4444', count: stats.overdue, bg: '#fef2f2', activeBg: '#fee2e2', border: '#fee2e2', activeBorder: '#ef4444' },
                  { key: 'inProgress', label: 'In Progress', icon: Loader, color: '#f59e0b', count: stats.inProgress, bg: '#fffbeb', activeBg: '#fef3c7', border: '#fef3c7', activeBorder: '#f59e0b' },
                  { key: 'completed', label: 'Closed', icon: CheckCircle2, color: '#22c55e', count: stats.completed, bg: '#f0fdf4', activeBg: '#bbf7d0', border: '#bbf7d0', activeBorder: '#22c55e' },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      flex: '1 1 0',
                      minWidth: '120px',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleStatClick(item.key)}
                  >
                    <div
                      className="utb-stat-card"
                      style={{
                        background: selectedStatusFilter === item.key ? item.activeBg : item.bg,
                        border: selectedStatusFilter === item.key ? `2px solid ${item.activeBorder}` : `1px solid ${item.border}`,
                        transition: 'all 0.2s',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 14px',
                        width: '100%',
                        boxSizing: 'border-box',
                        gap: '10px',
                      }}
                    >
                      <div className="utb-stat-icon-wrap" style={{ background: item.color, color: '#ffffff', flexShrink: 0 }}>
                        <item.icon size={16} />
                      </div>
                      <div className="utb-stat-info" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span className="utb-stat-label" style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                          {item.label}
                        </span>
                        <span className="utb-stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Board Columns */}
              <div className="utb-board">
                {shouldShowColumn('todo') && (
                  <div className="utb-column todo">
                    <div className="utb-col-header">
                      <h3 className="utb-col-title">open</h3>
                      <span className="utb-col-count">{filterTasks(tasks.todo).length}</span>
                    </div>
                    <div className="utb-col-content">
                      {filterTasks(tasks.todo).map(t => renderCard(t, 'todo'))}
                      <button className="utb-view-more"><Plus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> View More</button>
                    </div>
                  </div>
                )}

                {shouldShowColumn('overdue') && (
                  <div className="utb-column overdue">
                    <div className="utb-col-header">
                      <h3 className="utb-col-title">Overdue</h3>
                      <span className="utb-col-count">{filterTasks(tasks.overdue).length}</span>
                    </div>
                    <div className="utb-col-content">
                      {filterTasks(tasks.overdue).map(t => renderCard(t, 'overdue'))}
                    </div>
                  </div>
                )}

                {shouldShowColumn('inProgress') && (
                  <div className="utb-column inprogress">
                    <div className="utb-col-header">
                      <h3 className="utb-col-title">In Progress</h3>
                      <span className="utb-col-count">{filterTasks(tasks.inProgress).length}</span>
                    </div>
                    <div className="utb-col-content">
                      {filterTasks(tasks.inProgress).map(t => renderCard(t, 'inprogress'))}
                    </div>
                  </div>
                )}



                {shouldShowColumn('completed') && (
                  <div className="utb-column completed">
                    <div className="utb-col-header">
                      <h3 className="utb-col-title">Closed</h3>
                      <span className="utb-col-count">{filterTasks(tasks.completed).length}</span>
                    </div>
                    <div className="utb-col-content">
                      {filterTasks(tasks.completed).map(t => renderCard(t, 'completed'))}
                    </div>
                  </div>
                )}
              </div>

              {selectedStatusFilter !== 'all' && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    className="utb-btn"
                    onClick={() => setSelectedStatusFilter('all')}
                    style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
                  >
                    Show All Columns
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="utb-modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="utb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="utb-modal-header">
              <h3>Task Details: {selectedTask.id}</h3>
              <button className="utb-modal-close" onClick={() => setSelectedTask(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="utb-modal-body">
              <div className="utb-modal-field">
                <label>Title</label>
                <p>{selectedTask.title}</p>
              </div>
              <div className="utb-modal-row">
                <div className="utb-modal-field">
                  <label>Project</label>
                  <p>{selectedTask.project}</p>
                </div>
                <div className="utb-modal-field">
                  <label>Milestone</label>
                  <p>{selectedTask.milestone}</p>
                </div>
              </div>
              <div className="utb-modal-row">
                <div className="utb-modal-field">
                  {(() => {
                    const isClosedTask = selectedTask.status === "Closed" || selectedTask.status === "Completed" || selectedTask.rawStatus === "CLOSED" || selectedTask.rawStatus === "COMPLETED";
                    if (isClosedTask) {
                      const info = getScheduleStatusInfo(selectedTask);
                      return (
                        <>
                          <label>Schedule Status</label>
                          <p>
                            <span className="utb-badge" style={{
                              backgroundColor: info.bg,
                              color: info.color,
                              border: `1px solid ${info.border}`
                            }}>
                              {info.status}
                            </span>
                          </p>
                        </>
                      );
                    }
                    return (
                      <>
                        <label>Priority</label>
                        <p>
                          <span className={`utb-badge ${(selectedTask.priority || 'medium').toLowerCase().replace(/\s+/g, '-')}`}>
                            {selectedTask.priority}
                          </span>
                        </p>
                      </>
                    );
                  })()}
                </div>
                <div className="utb-modal-field">
                  <label>Assigned To</label>
                  <p>{selectedTask.assigned}</p>
                </div>
              </div>
              {(selectedTask.due || selectedTask.submittedOn || selectedTask.completedOn) && (
                <div className="utb-modal-field">
                  <label>Relevant Dates</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedTask.due && <div>Due: {formatDate(selectedTask.due)}</div>}
                    {selectedTask.submittedOn && <div>Submitted: {formatDate(selectedTask.submittedOn)}</div>}
                    {selectedTask.completedOn && <div>Closed: {formatDate(selectedTask.completedOn)}</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="utb-modal-footer">
              <button className="utb-btn outline" onClick={() => setSelectedTask(null)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTaskBoard;
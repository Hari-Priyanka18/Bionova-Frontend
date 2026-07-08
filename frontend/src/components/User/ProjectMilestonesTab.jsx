import React, { useState, useEffect } from 'react';
import { Flag, ListTodo, CheckSquare, RefreshCcw, HelpCircle, Clock, Plus, Filter, Search, Eye, Edit2, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import '../../styles/project-milestones-tab.css';
import ProjectGanttChart from './ProjectGanttChart';

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";
const getAuthToken = () => sessionStorage.getItem("authToken") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getAuthToken()}`
});

const ProjectMilestonesTab = ({ project, userRole }) => {
  const [milestones, setMilestones] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapseAll, setCollapseAll] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTaskModal, setViewTaskModal] = useState(null);
  const [editTaskModal, setEditTaskModal] = useState(null);

  const isDraftProject = project?.status === 'DRAFT' || project?.status === 'Draft';

  // Unified ID helpers: correctly read milestone/task IDs for both draft and live
  const getMilestoneId = (m) => {
    if (!m) return null;
    return isDraftProject
      ? (m.drftMId || m.drft_m_id || m.id)
      : (m.mId || m.mid || m.id);
  };

  const getTaskMilestoneId = (t) => {
    if (!t) return null;
    return isDraftProject
      ? (t.drftMId || t.drft_m_id || t.mId || t.mid)
      : (t.mId || t.mid || t.mlstm_id);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const isDraft = project?.status === "DRAFT" || project?.status === "Draft";
        const mlUrl = isDraft
          ? `${API_BASE}/milestone-drafts/by-project/${project.id}`
          : `${API_BASE}/milestone-live/by-project/${project.id}`;
        const taskUrl = isDraft
          ? `${API_BASE}/task-drafts`
          : `${API_BASE}/task-live`;

        const [mlRes, taskRes, profileRes, empRes] = await Promise.all([
          fetch(mlUrl, { headers: authHeaders() }),
          fetch(taskUrl, { headers: authHeaders() }),
          fetch(`${API_BASE}/profile`, { headers: authHeaders() }),
          fetch(`${API_BASE}/employees`, { headers: authHeaders() })
        ]);

        const mlData = mlRes.ok ? await mlRes.json() : [];
        const taskData = taskRes.ok ? await taskRes.json() : [];
        const profile = profileRes.ok ? await profileRes.json() : null;
        const empData = empRes.ok ? await empRes.json() : [];

        setEmployees(empData);

        // Filter milestones by project id
        const projectId = project?.id;
        let filteredMilestones = mlData || [];
        let filteredTasks = taskData || [];

        const isAdmin = profile?.email === 'vsv.vempati@gmail.com';
        if (userRole === 'user' && !isAdmin && profile) {
          filteredTasks = filteredTasks.filter(t => t.empId === profile.empId);
          filteredMilestones = filteredMilestones.filter(m => {
            const mId = getMilestoneId(m);
            return filteredTasks.some(t => String(getTaskMilestoneId(t)) === String(mId));
          });
        }

        setMilestones(filteredMilestones);
        setTasks(filteredTasks);

        if (filteredMilestones.length > 0) {
          const firstId = isDraftProject
            ? (filteredMilestones[0].drftMId || filteredMilestones[0].drft_m_id || filteredMilestones[0].id)
            : (filteredMilestones[0].mId || filteredMilestones[0].mid || filteredMilestones[0].id);
          setSelectedMilestone(firstId);
        }

      } catch (err) {
        console.error("Error fetching milestones:", err);
      } finally {
        setLoading(false);
      }
    };
    if (project?.id) fetchData();
  }, [project, userRole]);

  const getTasksForMilestone = (milestoneId) => {
    return tasks.filter(t => String(getTaskMilestoneId(t)) === String(milestoneId));
  };

  const getStatusClass = (status) => {
    if (!status) return 'st-default';
    const s = status.toUpperCase().replace(/_/g, ' ');
    switch (s) {
      case 'COMPLETED': return 'st-completed';
      case 'IN PROGRESS':
      case 'WIP': return 'st-in-progress';
      case 'NOT STARTED':
      case 'OPEN': return 'st-not-started';
      case 'OVERDUE': return 'st-overdue';
      case 'DRAFT': return 'st-default';
      default: return 'st-default';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleViewTask = (task) => {
    setViewTaskModal(task);
  };

  const handleEditTask = (task) => {
    setEditTaskModal(task);
  };

  const handleDeleteTask = async (task) => {
    if (window.confirm(`Are you sure you want to delete task "${task.taskNm || task.task_nm}"?`)) {
      try {
        const isDraft = project?.status === "DRAFT" || project?.status === "Draft";
        const taskId = isDraftProject
          ? (task.drftTaskId || task.drft_task_id)
          : (task.taskId || task.task_id);
        const url = isDraft
          ? `${API_BASE}/task-drafts/${taskId}`
          : `${API_BASE}/task-live/${taskId}`;

        const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });
        if (res.ok) {
          setTasks(prev =>
            prev.filter(t => {
              const id = isDraftProject
                ? (t.drftTaskId || t.drft_task_id)
                : (t.taskId || t.task_id);

              return id !== taskId;
            })
          );
          alert("Task deleted successfully");
        } else {
          alert("Failed to delete task");
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("An error occurred while deleting the task.");
      }
    }
  };

  const getAssigneeInfo = (empId) => {
    if (!empId) return { name: 'Unassigned', role: '' };
    const emp = employees.find(e => e.empId === empId);
    if (emp) {
      return {
        name: `${emp.fstNm || ''} ${emp.lstNm || ''}`.trim(),
        role: emp.jobTtl || 'Employee'
      };
    }
    return { name: 'Unknown', role: '' };
  };

  const calculateTaskProgress = (tStatus) => {
    const s = (tStatus || '').toUpperCase();
    if (s === 'COMPLETED') return 100;
    if (s === 'WIP' || s === 'IN PROGRESS') return 50;
    return 0;
  };

  // Stats
  const totalMilestones = milestones.length;

  // Calculate total relevant tasks (assigned to milestones of this project)
  const relevantTasks = tasks.filter(t => {
    const tMid = getTaskMilestoneId(t);
    return milestones.some(m => String(getMilestoneId(m)) === String(tMid));
  });

  const totalTasks = relevantTasks.length;

  const completedTasks = relevantTasks.filter(t => (t.taskSts || '').toUpperCase() === 'COMPLETED').length;
  const inProgressTasks = relevantTasks.filter(t => {
    const s = (t.taskSts || '').toUpperCase();
    return s === 'WIP' || s === 'IN PROGRESS';
  }).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = relevantTasks.filter(t => {
    const s = (t.taskSts || '').toUpperCase();
    if (s === 'COMPLETED') return false;
    const endDtStr = t.tentEndDt || t.tent_end_dt || t.endDt || t.end_dt;
    if (!endDtStr) return false;
    const endDt = new Date(endDtStr);
    return endDt < today;
  }).length;

  const notStartedTasks = totalTasks - completedTasks - inProgressTasks - overdueTasks;

  const getPercentage = (count, total) => {
    if (total === 0) return 0;
    return ((count / total) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading milestones & tasks...
      </div>
    );
  }

  const selectedMilestoneData = milestones.find(m => String(getMilestoneId(m)) === String(selectedMilestone));
  const selectedMilestoneTasks = selectedMilestone ? getTasksForMilestone(selectedMilestone) : [];

  const filteredTasks = selectedMilestoneTasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (t.taskNm || t.task_nm || '').toLowerCase();
    const code = (t.taskCd || t.task_cd || '').toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const totalProjectDuration = milestones.reduce((sum, m) => sum + parseInt(m.mlstnDays || m.mlstn_days || m.mlstm_days || m.mlstmDays || 0, 10), 0);

  return (
    <div className="mt-layout">
      {/* Header */}
      <div className="mt-header">
        <h2>Milestones & Tasks</h2>
        <div className="mt-header-actions">
          <button className="mt-btn-outline" onClick={() => setCollapseAll(prev => !prev)}>
            {collapseAll ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {collapseAll ? 'Expand All' : 'Collapse All'}
          </button>
          <button className="mt-btn-primary" onClick={() => window.open('/milestone-creation', '_self')}>
            <Plus size={14} /> Add Milestone
          </button>
        </div>
      </div>

      {/* Stats Cards - hidden when collapsed */}
      {!collapseAll && (
        <div className="mt-stats-grid">
          <div className="mt-stat-card">
            <div className="mt-stat-icon-wrap bg-purple">
              <Flag size={20} color="#8b5cf6" />
            </div>
            <div className="mt-stat-info">
              <span className="mt-stat-value">{totalMilestones}</span>
              <span className="mt-stat-label">Total Milestones</span>
            </div>
          </div>

          <div className="mt-stat-card">
            <div className="mt-stat-icon-wrap bg-blue">
              <ListTodo size={20} color="#3b82f6" />
            </div>
            <div className="mt-stat-info">
              <span className="mt-stat-value">{totalTasks}</span>
              <span className="mt-stat-label">Total Tasks</span>
            </div>
          </div>

          <div className="mt-stat-card">
            <div className="mt-stat-icon-wrap bg-green">
              <CheckSquare size={20} color="#10b981" />
            </div>
            <div className="mt-stat-info">
              <span className="mt-stat-value">{completedTasks}</span>
              <span className="mt-stat-label">Completed Tasks</span>
              <span className="mt-stat-percent">{getPercentage(completedTasks, totalTasks)}%</span>
            </div>
          </div>

          <div className="mt-stat-card">
            <div className="mt-stat-icon-wrap bg-orange">
              <RefreshCcw size={20} color="#f97316" />
            </div>
            <div className="mt-stat-info">
              <span className="mt-stat-value">{inProgressTasks}</span>
              <span className="mt-stat-label">In Progress Tasks</span>
              <span className="mt-stat-percent">{getPercentage(inProgressTasks, totalTasks)}%</span>
            </div>
          </div>

          <div className="mt-stat-card">
            <div className="mt-stat-icon-wrap bg-yellow">
              <HelpCircle size={20} color="#eab308" />
            </div>
            <div className="mt-stat-info">
              <span className="mt-stat-value">{notStartedTasks}</span>
              <span className="mt-stat-label">Not Started Tasks</span>
              <span className="mt-stat-percent">{getPercentage(notStartedTasks, totalTasks)}%</span>
            </div>
          </div>

          <div className="mt-stat-card">
            <div className="mt-stat-icon-wrap bg-red">
              <Clock size={20} color="#ef4444" />
            </div>
            <div className="mt-stat-info">
              <span className="mt-stat-value">{overdueTasks}</span>
              <span className="mt-stat-label">Overdue Tasks</span>
              <span className="mt-stat-percent">{getPercentage(overdueTasks, totalTasks)}%</span>
            </div>
          </div>
        </div>
      )}

      {collapseAll ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', margin: '16px 0' }}>
          <Flag size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>All milestones and tasks are collapsed.</p>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8' }}>Click <strong>Expand All</strong> to view milestones, tasks, and project timeline.</p>
        </div>
      ) : milestones.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <Flag size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '14px' }}>No milestones found for this project.</p>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Go to Milestone Creation to add milestones.
          </p>
        </div>
      ) : (
        <div className="mt-main-container">
          {/* Left Column: Milestone List */}
          {sidebarOpen && (
            <div className="mt-sidebar">
              <div className="mt-sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Milestone List</h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                  title="Hide Milestone List"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>
              <div className="mt-milestone-list">
                {milestones.map((m, idx) => {
                  const mId = getMilestoneId(m);
                  const isActive = String(selectedMilestone) === String(mId);
                  const mTasks = getTasksForMilestone(mId);
                  const st = (m.mlstnSts || m.mlstn_sts || m.mlstmSts || m.mlstm_sts || 'DRAFT').toUpperCase();
                  const mDur = m.mlstnDays || m.mlstn_days || m.mlstm_days || m.mlstmDays || 0;
                  const sDt = formatDate(m.stDt || m.st_dt || m.tent_st_dt || m.tentStDt);
                  const eDt = formatDate(m.endDt || m.end_dt || m.tent_end_dt || m.tentEndDt);

                  return (
                    <div
                      key={mId}
                      className={`mt-milestone-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedMilestone(mId)}
                    >
                      <div className="mt-milestone-index-wrap">
                        <div className={`mt-milestone-index ${isActive ? 'active' : `c-${(idx % 5) + 1}`}`}>
                          {idx + 1}
                        </div>
                      </div>
                      <div className="mt-milestone-content">
                        <div className="mt-milestone-title-row">
                          <h4>{m.mlstnTtl || m.mlstn_ttl || m.mlstm_ttl || m.mlstmTtl || 'Untitled Milestone'}</h4>
                          {isActive && <ChevronDown size={14} className="mt-chevron" />}
                        </div>
                        <div className="mt-milestone-dates">
                          {sDt} to {eDt} • <span style={{ color: isActive ? '#3b82f6' : 'inherit' }}>{mDur} Days</span>
                        </div>
                        <div className="mt-milestone-meta">
                          <span className={`mt-status-badge ${getStatusClass(st)}`}>{st}</span>
                          <span className="mt-task-count">Tasks: {mTasks.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-sidebar-footer">
                Total Duration: {totalProjectDuration} Days
              </div>
            </div>
          )}

          {/* Right Column: Tasks & Gantt */}
          <div className="mt-content" style={{ position: 'relative' }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  position: 'absolute',
                  left: '-14px',
                  top: '18px',
                  zIndex: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: '1px solid #2563eb',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
                title="Show Milestone List"
              >
                <ChevronRight size={18} />
              </button>
            )}

            {/* Top: Tasks Table */}
            <div className="mt-tasks-section">
              <div className="mt-tasks-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0 }}>Tasks for Milestone: <span className="highlight">{selectedMilestoneData?.mlstnTtl || selectedMilestoneData?.mlstn_ttl || selectedMilestoneData?.mlstmTtl || selectedMilestoneData?.mlstm_ttl || '...'}</span></h3>
                </div>
                <div className="mt-tasks-filters">
                  <div className="mt-filter-btn">
                    <Filter size={14} /> Filter
                  </div>
                  <select className="mt-filter-select">
                    <option>All Tasks</option>
                  </select>
                  <div className="mt-search-box">
                    <input
                      type="text"
                      placeholder="Search Task..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search size={14} color="#94a3b8" />
                  </div>
                </div>
              </div>

              <div className="mt-table-container">
                <table className="mt-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Task Code</th>
                      <th>Task Name</th>
                      <th>Task Type</th>
                      <th>Assigned To</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Duration<br />(Days)</th>
                      <th>Dependency</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length > 0 ? filteredTasks.map((t, idx) => {
                      const tId = t.drftTaskId || t.drft_task_id || t.taskId || t.id;
                      const sDt = formatDate(t.tentStDt || t.tent_st_dt || t.stDt || t.st_dt);
                      const eDt = formatDate(t.tentEndDt || t.tent_end_dt || t.endDt || t.end_dt);
                      const st = t.taskSts || t.task_sts || 'DRAFT';
                      const assignee = getAssigneeInfo(t.empId);
                      const prog = calculateTaskProgress(st);

                      return (
                        <tr key={tId}>
                          <td>{idx + 1}</td>
                          <td className="mt-task-code">{t.taskCd || t.task_cd || `TSK-${String(idx + 1).padStart(3, '0')}`}</td>
                          <td>{t.taskNm || t.task_nm || 'Task'}</td>
                          <td>
                            <span className="mt-type-badge">{isDraftProject
                              ? (t.taskTyp || t.task_typ || 'Internal')
                              : (t.taskAsgnTo || t.task_asgn_to || 'Internal')}</span>
                          </td>
                          <td>
                            <div className="mt-assignee">
                              <div className="mt-avatar">
                                {assignee.name.charAt(0)}
                              </div>
                              <div className="mt-assignee-info">
                                <span className="mt-assignee-name">{assignee.name}</span>
                                <span className="mt-assignee-role">{assignee.role}</span>
                              </div>
                            </div>
                          </td>
                          <td>{sDt}</td>
                          <td>{eDt}</td>
                          <td style={{ textAlign: 'center' }}>{t.noOfDays || t.no_of_days || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{t.depTaskId || t.dep_task_id ? `TSK-${t.depTaskId || t.dep_task_id}` : '-'}</td>
                          <td>
                            <span className={`mt-status-badge ${getStatusClass(st)}`}>{st}</span>
                          </td>
                          <td>
                            <div className="mt-progress-cell">
                              <span className="mt-prog-text">{prog}%</span>
                              <div className="mt-progress-bar">
                                <div className="mt-progress-fill" style={{ width: `${prog}%`, background: prog === 100 ? '#10b981' : '#3b82f6' }}></div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="mt-actions">
                              <button onClick={() => handleViewTask(t)} title="View Task"><Eye size={14} /></button>
                              <button onClick={() => handleEditTask(t)} title="Edit Task"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteTask(t)} className="text-red" title="Delete Task"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="12" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No tasks available for this milestone.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-table-footer">
                Showing {selectedMilestoneTasks.length > 0 ? 1 : 0} to {selectedMilestoneTasks.length} of {selectedMilestoneTasks.length} tasks
              </div>
            </div>

            {/* Bottom: Gantt Chart */}
            <div className="mt-gantt-section">
              <div className="mt-gantt-header">
                <h3>Gantt View (Project Timeline)</h3>
              </div>
              <div className="mt-gantt-body">
                <ProjectGanttChart project={project} userRole={userRole} compact={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TASK MODAL */}
      {viewTaskModal && (
        <div className="mt-modal-overlay" onClick={() => setViewTaskModal(null)}>
          <div className="mt-modal" onClick={e => e.stopPropagation()}>
            <div className="mt-modal-header">
              <h3>Task Details: {viewTaskModal.taskCd || viewTaskModal.task_cd || 'N/A'}</h3>
              <button className="mt-modal-close-btn" onClick={() => setViewTaskModal(null)}><X size={18} /></button>
            </div>
            <div className="mt-modal-body">
              <div className="mt-view-row">
                <span className="mt-view-label">Task Name</span>
                <span className="mt-view-value">{viewTaskModal.taskNm || viewTaskModal.task_nm}</span>
              </div>
              <div className="mt-view-row">
                <span className="mt-view-label">Status</span>
                <span className={`mt-status-badge ${getStatusClass(viewTaskModal.taskSts || viewTaskModal.task_sts)}`}>
                  {viewTaskModal.taskSts || viewTaskModal.task_sts || 'DRAFT'}
                </span>
              </div>
              <div className="mt-view-row">
                <span className="mt-view-label">Start Date</span>
                <span className="mt-view-value">{formatDate(viewTaskModal.tentStDt || viewTaskModal.tent_st_dt || viewTaskModal.stDt || viewTaskModal.st_dt)}</span>
              </div>
              <div className="mt-view-row">
                <span className="mt-view-label">End Date</span>
                <span className="mt-view-value">{formatDate(viewTaskModal.tentEndDt || viewTaskModal.tent_end_dt || viewTaskModal.endDt || viewTaskModal.end_dt)}</span>
              </div>
              <div className="mt-view-row">
                <span className="mt-view-label">Duration</span>
                <span className="mt-view-value">{viewTaskModal.noOfDays || viewTaskModal.no_of_days || '-'} Days</span>
              </div>
              <div className="mt-view-row">
                <span className="mt-view-label">Assignee</span>
                <span className="mt-view-value">{getAssigneeInfo(viewTaskModal.empId).name}</span>
              </div>
              <div className="mt-view-row">
                <span className="mt-view-label">Description</span>
                <span className="mt-view-value">{viewTaskModal.taskDesc || viewTaskModal.task_desc || '-'}</span>
              </div>
            </div>
            <div className="mt-modal-footer">
              <button className="mt-btn mt-btn-secondary" onClick={() => setViewTaskModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editTaskModal && (
        <div className="mt-modal-overlay" onClick={() => setEditTaskModal(null)}>
          <form className="mt-modal" onClick={e => e.stopPropagation()} onSubmit={async (e) => {
            e.preventDefault();
            try {
              const isDraft = project?.status === "DRAFT" || project?.status === "Draft";
              const taskId = isDraft
                ? (editTaskModal.drftTaskId || editTaskModal.drft_task_id)
                : (editTaskModal.taskId || editTaskModal.task_id);
              const url = isDraft
                ? `${API_BASE}/task-drafts/${taskId}`
                : `${API_BASE}/task-live/${taskId}`;

              const res = await fetch(url, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(editTaskModal)
              });
              if (res.ok) {
                setTasks(prev =>
                  prev.map(t => {

                    const id = isDraftProject
                      ?
                      (t.drftTaskId || t.drft_task_id)
                      :
                      (t.taskId || t.task_id)

                    return id === taskId
                      ?
                      editTaskModal
                      :
                      t

                  })
                );
                setEditTaskModal(null);
                alert("Task updated successfully!");
              } else {
                alert("Failed to update task");
              }
            } catch (err) {
              console.error("Update error:", err);
              alert("An error occurred while updating the task.");
            }
          }}>
            <div className="mt-modal-header">
              <h3>Edit Task: {editTaskModal.taskCd || editTaskModal.task_cd || 'N/A'}</h3>
              <button type="button" className="mt-modal-close-btn" onClick={() => setEditTaskModal(null)}><X size={18} /></button>
            </div>
            <div className="mt-modal-body">
              <div className="mt-form-group">
                <label>Task Name</label>
                <input
                  type="text"
                  value={editTaskModal.taskNm || editTaskModal.task_nm || ''}
                  onChange={e => setEditTaskModal({ ...editTaskModal, taskNm: e.target.value, task_nm: e.target.value })}
                  required
                />
              </div>
              <div className="mt-form-group">
                <label>Status</label>
                <select
                  value={editTaskModal.taskSts || editTaskModal.task_sts || 'DRAFT'}
                  onChange={e => setEditTaskModal({ ...editTaskModal, taskSts: e.target.value, task_sts: e.target.value })}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="NOT STARTED">NOT STARTED</option>
                  <option value="IN PROGRESS">IN PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="OVERDUE">OVERDUE</option>
                </select>
              </div>
              <div className="mt-form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={editTaskModal.taskDesc || editTaskModal.task_desc || ''}
                  onChange={e => setEditTaskModal({ ...editTaskModal, taskDesc: e.target.value, task_desc: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-modal-footer">
              <button type="button" className="mt-btn mt-btn-secondary" onClick={() => setEditTaskModal(null)}>Cancel</button>
              <button type="submit" className="mt-btn mt-btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default ProjectMilestonesTab;

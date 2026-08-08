import { useState, useEffect } from 'react';
import { Flag, FileText, CheckCircle, Clock, AlertCircle, AlertTriangle, Plus, Eye } from 'lucide-react';
import '../../styles/project-overview.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";
const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

const ProjectOverview = ({ project }) => {
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!project?.id) return;
      try {
        const isDraft = project._type === "draft" || project.status === "DRAFT" || project.status === "Draft";
        const milestonesUrl = isDraft
          ? `${API_BASE}/milestone-drafts/by-project/${project.id}`
          : `${API_BASE}/milestone-live/by-project/${project.id}`;

        const tasksUrl = isDraft
          ? `${API_BASE}/task-drafts`
          : `${API_BASE}/task-live`;

        const [mlRes, taskRes, empRes] = await Promise.all([
          fetch(milestonesUrl, { headers: getAuthHeaders() }),
          fetch(tasksUrl, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() })
        ]);

        const mlData = mlRes.ok ? await mlRes.json() : [];
        const allTasks = taskRes.ok ? await taskRes.json() : [];
        console.log(JSON.stringify(mlData[0], null, 2));
        console.log("Tasks =", allTasks);

        if (allTasks.length > 0) {
          console.log(JSON.stringify(allTasks[0], null, 2));
        }
        const empData = empRes.ok ? await empRes.json() : [];
        setEmployees(empData);

        const getMilestoneId = (obj) => {
          if (!obj) return null;
          return (
            obj.mid ??
            obj.mId ??
            obj.m_id ??
            obj.drftMId ??
            obj.drft_m_id ??
            obj.milestoneId ??
            obj.milestone_id ??
            obj.mlstnId ??
            obj.mlstn_id ??
            obj.mlstmId ??
            obj.mlstm_id ??
            obj.id
          );
        };

        const getTaskStatusStr = (t) => {
          if (!t) return '';
          let sts = t.taskSts ?? t.task_sts ?? t.status ?? t.tasksts;
          if (!sts) return '';
          if (typeof sts === 'object') {
            sts = sts.statusNm || sts.status_nm || sts.name || sts.status || '';
          }
          return String(sts).trim().toUpperCase();
        };

        const isTaskDone = (t) => {
          const s = getTaskStatusStr(t);
          return s === 'COMPLETED' || s === 'CLOSED' || s === 'DONE' || s === 'COMPLETE';
        };

        const milestoneIds = mlData.map(getMilestoneId);

        const filteredTasks = allTasks.filter(task =>
          milestoneIds.some(id => String(id) === String(getMilestoneId(task)))
        );

        // Map Milestones for display
        const mappedMilestones = mlData.map((m, idx) => {
          const mId = getMilestoneId(m);
          const mTasks = filteredTasks.filter(t => {
            const taskMid = getMilestoneId(t);
            return String(taskMid) === String(mId);
          });
          const completedTasksCount = mTasks.filter(isTaskDone).length;

          let progressPct = 0;
          if (mTasks.length > 0) {
            progressPct = Math.round((completedTasksCount / mTasks.length) * 100);
          } else {
            const statusUpper = (m.mlstnSts || m.mlstn_sts || m.mlstmSts || m.mlstm_sts || '').toUpperCase();
            if (statusUpper === 'COMPLETED' || statusUpper === 'CLOSED') progressPct = 100;
            else if (statusUpper === 'IN_PROGRESS' || statusUpper === 'WIP' || statusUpper === 'LIVE') progressPct = 50;
          }

          return {
            id: mId,
            code: m.mlstnCd || m.mlstn_cd || m.mlstmCd || m.mlstm_cd || `ML-${String(idx + 1).padStart(3, '0')}`,
            title: m.mlstnTtl || m.mlstn_ttl || m.mlstmTtl || m.mlstm_ttl || 'N/A',
            duration: m.mlstnDays || m.mlstn_days || m.mlstmDays || m.mlstm_days || 0,
            start: m.stDt || m.st_dt || m.tentStDt || m.tent_st_dt || 'N/A',
            end: m.endDt || m.end_dt || m.tentEndDt || m.tent_end_dt || 'N/A',
            status: (m.mlstnSts || m.mlstn_sts || m.mlstmSts || m.mlstm_sts || 'DRAFT').toUpperCase().replace(/_/g, ' '),
            progress: progressPct
          };
        });

        // Map Tasks for display
        const mappedTasks = filteredTasks.map((t, idx) => {
          const mId = getMilestoneId(t);
          const milestoneObj = mappedMilestones.find(m => String(m.id) === String(mId));
          const milestoneCode = milestoneObj ? milestoneObj.code : 'N/A';

          const emp = empData.find(e => e.empId === t.empId);
          const assigneeName = emp ? `${emp.fstNm || ''} ${emp.lstNm || ''}`.trim() : (t.taskAsgnTo || 'Unassigned');

          const rawSts = getTaskStatusStr(t);
          let progressPct = 0;
          if (isTaskDone(t)) {
            progressPct = 100;
          } else if (rawSts === 'IN PROGRESS' || rawSts === 'WIP' || rawSts === 'IN_PROGRESS') {
            progressPct = 50;
          }

          const displayStatus = isTaskDone(t) ? 'CLOSED' : (rawSts.replace(/_/g, ' ') || 'DRAFT');

          return {
            rawTask: t,
            code: t.taskCd || t.task_cd || `TSK-${String(idx + 1).padStart(3, '0')}`,
            name: t.taskNm || t.task_nm || 'N/A',
            milestone: milestoneCode,
            assignee: assigneeName,
            start: t.stDt || t.st_dt || t.tentStDt || t.tent_st_dt || 'N/A',
            end: t.endDt || t.end_dt || t.tentEndDt || t.tent_end_dt || 'N/A',
            status: displayStatus,
            progress: progressPct
          };
        });

        setMilestones(mappedMilestones);
        setTasks(mappedTasks);
      } catch (err) {
        console.error("Error loading project overview data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [project]);

  const getStatusClass = (status) => {
    if (!status) return 'st-default';
    const s = status.toUpperCase();
    switch (s) {
      case 'CLOSED':
      case 'COMPLETED': return 'st-completed';
      case 'IN PROGRESS':
      case 'WIP':
        return 'st-in-progress';
      case 'NOT STARTED':
      case 'OPEN':
      case 'DRAFT':
        return 'st-not-started';
      default: return 'st-default';
    }
  };

  const getProgressColor = (progress) => {
    if (progress === 100) return '#10b981';
    if (progress > 0) return '#1d4ed8';
    return '#e2e8f0';
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        Loading project overview data...
      </div>
    );
  }

  const today = new Date();
  const totalMilestones = milestones.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'CLOSED').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN PROGRESS' || t.status === 'WIP').length;
  const notStartedTasks = tasks.filter(t => t.status === 'DRAFT' || t.status === 'OPEN' || t.status === 'NOT STARTED').length;

  const overdueTasks = tasks.filter(t => {
    if (t.status === 'COMPLETED' || t.status === 'CLOSED') return false;
    if (!t.end || t.end === 'N/A') return false;
    const endD = new Date(t.end);
    return endD < today;
  }).length;

  const stats = [
    { label: "Milestones", value: String(totalMilestones), subtitle: "Total Milestones", icon: <Flag size={20} color="#7c3aed" />, bg: "rgba(124, 58, 237, 0.1)" },
    { label: "Tasks", value: String(totalTasks), subtitle: "Total Tasks", icon: <FileText size={20} color="#1d4ed8" />, bg: "rgba(29, 78, 216, 0.1)" },
    { label: "Not Started Tasks", value: String(notStartedTasks), subtitle: totalTasks > 0 ? `${((notStartedTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <AlertCircle size={20} color="#f59e0b" />, bg: "rgba(245, 158, 11, 0.1)" },
    { label: "In Progress Tasks", value: String(inProgressTasks), subtitle: totalTasks > 0 ? `${((inProgressTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <Clock size={20} color="#f97316" />, bg: "rgba(249, 115, 22, 0.1)" },
    { label: "Overdue Tasks", value: String(overdueTasks), subtitle: totalTasks > 0 ? `${((overdueTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <AlertTriangle size={20} color="#14b8a6" />, bg: "rgba(20, 184, 166, 0.1)" },
    { label: "Closed Tasks", value: String(completedTasks), subtitle: totalTasks > 0 ? `${((completedTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <CheckCircle size={20} color="#10b981" />, bg: "rgba(16, 185, 129, 0.1)" },
  ];

  const [employees, setEmployees] = useState([]);

  const teamMemberPerformance = () => {
    if (!tasks || tasks.length === 0) return [];
    const nowMs = new Date().getTime();
    const empMap = {};

    const empIdToNameMap = {};
    (employees || []).forEach(e => {
      const name = `${e.fstNm || ''} ${e.lstNm || ''}`.trim();
      if (name) empIdToNameMap[String(e.empId)] = name;
    });

    tasks.forEach(t => {
      const tEmpId = t.empId ?? t.emp_id;
      let empName = null;
      if (tEmpId && empIdToNameMap[String(tEmpId)]) {
        empName = empIdToNameMap[String(tEmpId)];
      } else {
        empName = t.assignee || t.executorNm || t.assignedByNm || t.createdByName;
      }
      if (!empName || empName.trim() === "" || empName === "—") empName = "Unassigned / Team";

      if (!empMap[empName]) {
        empMap[empName] = {
          name: empName,
          total: 0,
          done: 0,
          overdue: 0,
          onTime: 0
        };
      }
      empMap[empName].total += 1;
      const s = (t.status || "").toUpperCase();
      if (s === "COMPLETED" || s === "CLOSED" || s === "DONE") {
        empMap[empName].done += 1;
      } else {
        if (t.end && new Date(t.end).setHours(23, 59, 59, 999) < nowMs) {
          empMap[empName].overdue += 1;
        } else {
          empMap[empName].onTime += 1;
        }
      }
    });

    return Object.values(empMap).map(e => {
      let label = "On Schedule";
      let badgeColor = "#2563eb";
      let badgeBg = "#eff6ff";

      if (e.overdue > 0) {
        label = `Lagging (${e.overdue} Overdue)`;
        badgeColor = "#dc2626";
        badgeBg = "#fef2f2";
      } else if (e.done > 0 && e.overdue === 0) {
        label = "Ahead of Schedule (Lead)";
        badgeColor = "#16a34a";
        badgeBg = "#f0fdf4";
      }
      return { ...e, label, badgeColor, badgeBg };
    }).sort((a, b) => b.overdue - a.overdue);
  };

  const memberPerfList = teamMemberPerformance();

  return (
    <div className="pd-overview-container">
      {/* Stats Cards */}
      <div className="pd-stats-grid">
        {stats.map((stat, idx) => (
          <div className="pd-stat-card" key={idx}>
            <div className="pd-stat-icon-wrap" style={{ backgroundColor: stat.bg }}>
              {stat.icon}
            </div>
            <div className="pd-stat-info">
              <span className="pd-stat-label">{stat.label}</span>
              <div className="pd-stat-value-row">
                <span className="pd-stat-value">{stat.value}</span>
                <span className="pd-stat-subtitle">{stat.subtitle}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Milestones Section */}
      <div className="pd-section-card">
        <div className="pd-section-header">
          <h3>Milestones</h3>
          <button
            className="pd-add-btn"
            onClick={() => window.open('/milestone-creation', '_self')}
          >
            <Plus size={14} /> Add Milestone
          </button>
        </div>
        <div className="pd-table-responsive">
          <table className="pd-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Milestone Code</th>
                <th>Milestone Title</th>
                <th>Duration (Days)</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {milestones.length > 0 ? milestones.map((m, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td className="pd-code-col">{m.code}</td>
                  <td>{m.title}</td>
                  <td>{m.duration}</td>
                  <td>{m.start}</td>
                  <td>{m.end}</td>
                  <td><span className={`pd-status-badge ${getStatusClass(m.status)}`}>{m.status}</span></td>
                  <td>
                    <div className="pd-progress-wrap">
                      <div className="pd-progress-bar">
                        <div className="pd-progress-fill" style={{ width: `${m.progress}%`, backgroundColor: getProgressColor(m.progress) }}></div>
                      </div>
                      <span>{m.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <button
                      className="pd-action-btn"
                      onClick={() => window.open('/milestone-creation', '_self')}
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No milestones found for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Member Performance & Bottlenecks Section */}

      {/* Team Member Performance & Bottlenecks Section */}
      <div className="pd-section-card" style={{ overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)' }}>
        <div className="pd-section-header" style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Team Performance & Schedule Health (Lead / Lag)</h3>
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'block' }}>Monitor individual contribution, velocity, and task delay bottlenecks</span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            {memberPerfList.length} Team Members Active
          </span>
        </div>
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', background: '#ffffff' }}>
          {memberPerfList.length > 0 ? memberPerfList.map((m, idx) => {
            const completionRate = Math.round((m.done / (m.total || 1)) * 100);
            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: m.overdue > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.25s ease',
                  boxShadow: m.overdue > 0 ? '0 4px 12px rgba(220, 38, 38, 0.06)' : '0 2px 8px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = m.overdue > 0 ? '0 4px 12px rgba(220, 38, 38, 0.06)' : '0 2px 8px rgba(0,0,0,0.03)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: m.overdue > 0 ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: '700',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', lineHeight: 1.2 }}>{m.name}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Assigned Executor</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: m.badgeBg, padding: '6px 12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: m.badgeColor }}>{m.label}</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>{completionRate}% Done</span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${completionRate}%`,
                    height: '100%',
                    background: m.overdue > 0 ? '#ef4444' : '#10b981',
                    borderRadius: '3px',
                    transition: 'width 0.4s ease'
                  }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <span>Tasks: <strong style={{ color: '#0f172a' }}>{m.total}</strong></span>
                  <span>Done: <strong style={{ color: '#16a34a' }}>{m.done}</strong></span>
                  <span>Lagging: <strong style={{ color: m.overdue > 0 ? '#dc2626' : '#64748b' }}>{m.overdue}</strong></span>
                </div>
              </div>
            );
          }) : (
            <div style={{ color: '#64748b', fontSize: '13px', padding: '16px' }}>No team performance data available for this project.</div>
          )}
        </div>
      </div>
      <div className="pd-section-card">
        <div className="pd-section-header">
          <h3>Recent Tasks</h3>
        </div>
        <div className="pd-table-responsive">
          <table className="pd-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Task Code</th>
                <th>Task Name</th>
                <th>Milestone</th>
                <th>Assigned To</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length > 0 ? tasks.slice(0, 10).map((t, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td className="pd-code-col">{t.code}</td>
                  <td>{t.name}</td>
                  <td>{t.milestone}</td>
                  <td>{t.assignee}</td>
                  <td>{t.start}</td>
                  <td>{t.end}</td>
                  <td><span className={`pd-status-badge ${getStatusClass(t.status)}`}>{t.status}</span></td>
                  <td>
                    <div className="pd-progress-wrap">
                      <div className="pd-progress-bar">
                        <div className="pd-progress-fill" style={{ width: `${t.progress}%`, backgroundColor: getProgressColor(t.progress) }}></div>
                      </div>
                      <span>{t.progress}%</span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No tasks found for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ProjectOverview;

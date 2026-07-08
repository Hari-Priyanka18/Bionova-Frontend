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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!project?.id) return;
      setLoading(true);
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

        const getMilestoneId = (obj) =>
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
          obj.id;

        const milestoneIds = mlData.map(getMilestoneId);

        const filteredTasks = allTasks.filter(task =>
          milestoneIds.some(id => String(id) === String(getMilestoneId(task)))
        );

        // Map Milestones for display
        const mappedMilestones = mlData.map((m, idx) => {
          const mId =
            m.mid ??
            m.mId ??
            m.m_id ??
            m.drftMId ??
            m.drft_m_id ??
            m.id;
          const mTasks = filteredTasks.filter(t => {
            const taskMid =
              t.mid ??
              t.mId ??
              t.m_id ??
              t.drftMId ??
              t.drft_m_id ??
              t.milestoneId ??
              t.mlstm_id;

            return String(taskMid) === String(mId);
          });
          const completedTasksCount = mTasks.filter(t => (t.taskSts || t.task_sts || '').toUpperCase() === 'COMPLETED').length;

          let progressPct = 0;
          if (mTasks.length > 0) {
            progressPct = Math.round((completedTasksCount / mTasks.length) * 100);
          } else {
            const statusUpper = (m.mlstnSts || m.mlstn_sts || m.mlstmSts || m.mlstm_sts || '').toUpperCase();
            if (statusUpper === 'COMPLETED') progressPct = 100;
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
          const mId =
            t.mid ??
            t.mId ??
            t.m_id ??
            t.drftMId ??
            t.drft_m_id ??
            t.milestoneId ??
            t.mlstm_id;
          const milestoneObj = mappedMilestones.find(m => m.id === mId);
          const milestoneCode = milestoneObj ? milestoneObj.code : 'N/A';

          const emp = empData.find(e => e.empId === t.empId);
          const assigneeName = emp ? `${emp.fstNm || ''} ${emp.lstNm || ''}`.trim() : (t.taskAsgnTo || 'Unassigned');

          const statusUpper = (t.taskSts || t.task_sts || 'DRAFT').toUpperCase().replace(/_/g, ' ');
          let progressPct = 0;
          if (statusUpper === 'COMPLETED') progressPct = 100;
          else if (statusUpper === 'IN_PROGRESS' || statusUpper === 'WIP') progressPct = 50;

          return {
            code: t.taskCd || t.task_cd || `TSK-${String(idx + 1).padStart(3, '0')}`,
            name: t.taskNm || t.task_nm || 'N/A',
            milestone: milestoneCode,
            assignee: assigneeName,
            start: t.stDt || t.st_dt || t.tentStDt || t.tent_st_dt || 'N/A',
            end: t.endDt || t.end_dt || t.tentEndDt || t.tent_end_dt || 'N/A',
            status: statusUpper,
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
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN PROGRESS' || t.status === 'WIP').length;
  const notStartedTasks = tasks.filter(t => t.status === 'DRAFT' || t.status === 'OPEN' || t.status === 'NOT STARTED').length;

  const overdueTasks = tasks.filter(t => {
    if (t.status === 'COMPLETED') return false;
    if (!t.end || t.end === 'N/A') return false;
    const endD = new Date(t.end);
    return endD < today;
  }).length;

  const stats = [
    { label: "Milestones", value: String(totalMilestones), subtitle: "Total Milestones", icon: <Flag size={20} color="#7c3aed" />, bg: "rgba(124, 58, 237, 0.1)" },
    { label: "Tasks", value: String(totalTasks), subtitle: "Total Tasks", icon: <FileText size={20} color="#1d4ed8" />, bg: "rgba(29, 78, 216, 0.1)" },
    { label: "Completed Tasks", value: String(completedTasks), subtitle: totalTasks > 0 ? `${((completedTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <CheckCircle size={20} color="#10b981" />, bg: "rgba(16, 185, 129, 0.1)" },
    { label: "In Progress Tasks", value: String(inProgressTasks), subtitle: totalTasks > 0 ? `${((inProgressTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <Clock size={20} color="#f97316" />, bg: "rgba(249, 115, 22, 0.1)" },
    { label: "Not Started Tasks", value: String(notStartedTasks), subtitle: totalTasks > 0 ? `${((notStartedTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <AlertCircle size={20} color="#f59e0b" />, bg: "rgba(245, 158, 11, 0.1)" },
    { label: "Overdue Tasks", value: String(overdueTasks), subtitle: totalTasks > 0 ? `${((overdueTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <AlertTriangle size={20} color="#14b8a6" />, bg: "rgba(20, 184, 166, 0.1)" },
  ];

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

      {/* Recent Tasks Section */}
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

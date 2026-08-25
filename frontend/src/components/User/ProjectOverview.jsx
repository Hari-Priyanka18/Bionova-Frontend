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
  const [employees, setEmployees] = useState([]);
  const [extEmployees, setExtEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAssigneeName = (t, empList, extEmpList) => {
    if (!t) return 'Unassigned';
    const raw = t.rawTask || t;
    const isExt = (raw.taskAsgnTo || raw.task_asgn_to || raw.task_typ || '').toUpperCase() === 'EXTERNAL' || raw.extEmpId != null || raw.ext_emp_id != null;

    if (isExt) {
      const extId = raw.extEmpId ?? raw.ext_emp_id ?? raw.empId ?? raw.emp_id;
      if (extId != null && extEmpList && extEmpList.length > 0) {
        const extMatch = extEmpList.find(e => String(e.extEmpId ?? e.ext_emp_id ?? e.id) === String(extId));
        if (extMatch) {
          const name = extMatch.extEmpNm || extMatch.ext_emp_nm || extMatch.companyNm || extMatch.company_nm;
          if (name && name.trim()) return name.trim();
        }
      }

      const extDirectName = raw.extEmpNm || raw.ext_emp_nm || raw.extEmpName || raw.ext_emp_name || raw.executorNm || raw.executorName;
      if (extDirectName && extDirectName.trim() && extDirectName.toUpperCase() !== 'EXTERNAL') {
        return extDirectName.trim();
      }

      if (extId != null && empList && empList.length > 0) {
        const empMatch = empList.find(e => String(e.empId) === String(extId));
        if (empMatch) {
          const name = `${empMatch.fstNm || ''} ${empMatch.lstNm || ''}`.trim();
          if (name) return name;
        }
      }

      if (t.assignee && typeof t.assignee === 'string' && t.assignee.toUpperCase() !== 'EXTERNAL' && t.assignee.trim()) {
        return t.assignee.trim();
      }

      return 'External Associate';
    } else {
      const empId = raw.empId ?? raw.emp_id;
      if (empId != null && empList && empList.length > 0) {
        const empMatch = empList.find(e => String(e.empId) === String(empId));
        if (empMatch) {
          const name = `${empMatch.fstNm || ''} ${empMatch.lstNm || ''}`.trim();
          if (name) return name;
        }
      }

      const internalDirectName = raw.executorNm || raw.executorName || raw.empNm || raw.empName || raw.assignedByNm || raw.createdByName;
      if (internalDirectName && internalDirectName.trim() && internalDirectName.toUpperCase() !== 'EXTERNAL') {
        return internalDirectName.trim();
      }

      if (t.assignee && typeof t.assignee === 'string' && t.assignee.toUpperCase() !== 'EXTERNAL' && t.assignee.trim()) {
        return t.assignee.trim();
      }

      return (raw.taskAsgnTo && raw.taskAsgnTo.toUpperCase() !== 'EXTERNAL') ? raw.taskAsgnTo : 'Unassigned';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!project?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const isDraft = project._type === "draft" || project.status === "DRAFT" || project.status === "Draft";
        const milestonesUrl = isDraft
          ? `${API_BASE}/milestone-drafts/by-project/${project.id}`
          : `${API_BASE}/milestone-live/by-project/${project.id}`;

        const tasksUrl = isDraft
          ? `${API_BASE}/task-drafts`
          : `${API_BASE}/task-live`;

        const [mlRes, taskRes, empRes, extEmpRes] = await Promise.all([
          fetch(milestonesUrl, { headers: getAuthHeaders() }),
          fetch(tasksUrl, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/employees`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/external-employees`, { headers: getAuthHeaders() }).catch(() => ({ ok: false }))
        ]);

        const mlData = mlRes.ok ? await mlRes.json() : [];
        const allTasks = taskRes.ok ? await taskRes.json() : [];
        console.log(JSON.stringify(mlData[0], null, 2));
        console.log("Tasks =", allTasks);

        if (allTasks.length > 0) {
          console.log(JSON.stringify(allTasks[0], null, 2));
        }
        const empData = empRes.ok ? await empRes.json() : [];
        const extEmpData = (extEmpRes && extEmpRes.ok) ? await extEmpRes.json() : [];
        setEmployees(empData);
        setExtEmployees(extEmpData);

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
        const rawMappedMilestones = mlData.map((m, idx) => {
          const mId = getMilestoneId(m);
          const mTasks = filteredTasks.filter(t => {
            const taskMid = getMilestoneId(t);
            return String(taskMid) === String(mId);
          });
          const completedTasksCount = mTasks.filter(isTaskDone).length;

          let rawProgressPct = 0;
          if (mTasks.length > 0) {
            rawProgressPct = Math.round((completedTasksCount / mTasks.length) * 100);
          } else {
            const statusUpper = (m.mlstnSts || m.mlstn_sts || m.mlstmSts || m.mlstm_sts || '').toUpperCase();
            if (statusUpper === 'COMPLETED' || statusUpper === 'CLOSED') rawProgressPct = 100;
            else if (statusUpper === 'IN_PROGRESS' || statusUpper === 'WIP' || statusUpper === 'LIVE') rawProgressPct = 50;
          }

          const rawDepId = m.mlstnDepMId ?? m.mlstn_dep_m_id ?? m.mlstmDepMId ?? m.mlstm_dep_m_id ?? m.depMId ?? m.dep_m_id;
          const depMId = (rawDepId != null && rawDepId !== "" && rawDepId !== 0) ? String(rawDepId) : null;
          const hasDepFlg = m.mlstnDepFlg === true || m.mlstn_dep_flg === true || m.mlstmDepFlg === true || m.mlstm_dep_flg === true || !!depMId;

          return {
            rawMilestone: m,
            id: mId,
            idx: idx,
            code: m.mlstnCd || m.mlstn_cd || m.mlstmCd || m.mlstm_cd || `ML-${String(idx + 1).padStart(3, '0')}`,
            title: m.mlstnTtl || m.mlstn_ttl || m.mlstmTtl || m.mlstm_ttl || 'N/A',
            duration: m.mlstnDays || m.mlstn_days || m.mlstmDays || m.mlstm_days || 0,
            start: m.stDt || m.st_dt || m.tentStDt || m.tent_st_dt || 'N/A',
            end: m.endDt || m.end_dt || m.tentEndDt || m.tent_end_dt || 'N/A',
            rawStatus: (m.mlstnSts || m.mlstn_sts || m.mlstmSts || m.mlstm_sts || 'DRAFT').toUpperCase().replace(/_/g, ' '),
            rawProgress: rawProgressPct,
            depMId: depMId,
            hasDepFlg: hasDepFlg,
            mTasksCount: mTasks.length,
            completedTasksCount: completedTasksCount
          };
        });

        // Enforce sequential dependency locking across milestones
        const mappedMilestones = rawMappedMilestones.map((m, idx) => {
          let isLocked = false;
          let lockReason = "";

          // 1. Check explicit predecessor milestone ID if configured
          if (m.depMId) {
            const predM = rawMappedMilestones.find(pm => String(pm.id) === String(m.depMId));
            if (predM && (predM.rawProgress < 100 || (predM.rawStatus !== "CLOSED" && predM.rawStatus !== "COMPLETED"))) {
              isLocked = true;
              lockReason = `Waiting for predecessor milestone "${predM.title}" (${predM.code}) to complete.`;
            }
          } 
          // 2. Check sequential order dependency: if previous milestone in list is incomplete
          else if (idx > 0) {
            const prevM = rawMappedMilestones[idx - 1];
            if (prevM && (prevM.rawProgress < 100 && (prevM.rawStatus !== "CLOSED" && prevM.rawStatus !== "COMPLETED"))) {
              isLocked = true;
              lockReason = `Waiting for predecessor milestone "${prevM.title}" (${prevM.code}) to complete.`;
            }
          }

          if (isLocked) {
            return {
              ...m,
              status: "LOCKED",
              progress: 0,
              isLocked: true,
              lockReason: lockReason
            };
          }

          return {
            ...m,
            status: m.rawStatus,
            progress: m.rawProgress,
            isLocked: false
          };
        });

        // Map Tasks for display
        const mappedTasks = filteredTasks.map((t, idx) => {
          const mId = getMilestoneId(t);
          const milestoneObj = mappedMilestones.find(m => String(m.id) === String(mId));
          const milestoneCode = milestoneObj ? milestoneObj.code : 'N/A';
          const isMilestoneLocked = milestoneObj?.isLocked === true;

          const assigneeName = getAssigneeName(t, empData, extEmpData);

          const rawSts = getTaskStatusStr(t);
          let progressPct = 0;
          let displayStatus = 'DRAFT';

          if (isMilestoneLocked) {
            displayStatus = 'LOCKED';
            progressPct = 0;
          } else if (isTaskDone(t)) {
            progressPct = 100;
            displayStatus = 'CLOSED';
          } else if (rawSts === 'IN PROGRESS' || rawSts === 'WIP' || rawSts === 'IN_PROGRESS') {
            progressPct = 50;
            displayStatus = 'IN PROGRESS';
          } else {
            displayStatus = rawSts.replace(/_/g, ' ') || 'DRAFT';
          }

          return {
            rawTask: t,
            code: t.taskCd || t.task_cd || `TSK-${String(idx + 1).padStart(3, '0')}`,
            name: t.taskNm || t.task_nm || 'N/A',
            milestone: milestoneCode,
            assignee: assigneeName,
            start: t.stDt || t.st_dt || t.tentStDt || t.tent_st_dt || 'N/A',
            end: t.endDt || t.end_dt || t.tentEndDt || t.tent_end_dt || 'N/A',
            status: displayStatus,
            progress: progressPct,
            isLocked: isMilestoneLocked
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

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === '—') return dateStr || 'N/A';
    try {
      const cleanStr = String(dateStr).split('T')[0].trim();
      const parts = cleanStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const [year, month, day] = parts;
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const getStatusClass = (status, isTaskOverdue = false) => {
    if (isTaskOverdue) return 'st-overdue';
    if (!status) return 'st-default';
    const s = status.toUpperCase();
    switch (s) {
      case 'OVERDUE':
      case 'OVER_DUE':
        return 'st-overdue';
      case 'HOLD':
      case 'ON HOLD':
      case 'ON_HOLD':
        return 'st-hold';
      case 'CLOSED':
      case 'COMPLETED':
        return 'st-completed';
      case 'IN PROGRESS':
      case 'WIP':
        return 'st-in-progress';
      case 'LIVE':
        return 'st-live';
      case 'LOCKED':
        return 'st-locked';
      case 'NOT STARTED':
      case 'OPEN':
      case 'DRAFT':
        return 'st-not-started';
      default:
        return 'st-default';
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
    { label: "Overdue Tasks", value: String(overdueTasks), subtitle: totalTasks > 0 ? `${((overdueTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <AlertTriangle size={20} color="#ef4444" />, bg: "rgba(239, 68, 68, 0.1)" },
    { label: "Closed Tasks", value: String(completedTasks), subtitle: totalTasks > 0 ? `${((completedTasks / totalTasks) * 100).toFixed(1)}%` : "0.0%", icon: <CheckCircle size={20} color="#10b981" />, bg: "rgba(16, 185, 129, 0.1)" },
  ];

  const teamMemberPerformance = () => {
    if (!tasks || tasks.length === 0) return [];
    const nowMs = new Date().getTime();
    const empMap = {};

    const addMemberContribution = (empId, extEmpId, rawName, task) => {
      let isExternal = false;
      let memberIdStr = "";
      let memberName = "";
      let empCode = "";

      const raw = task?.rawTask || task || {};
      const taskAsgnTo = (raw.taskAsgnTo || raw.task_asgn_to || raw.task_typ || '').toUpperCase();

      if (extEmpId != null || taskAsgnTo === 'EXTERNAL' || (rawName && extEmployees.some(e => e.extEmpNm === rawName || e.ext_emp_nm === rawName))) {
        isExternal = true;
      }

      if (isExternal) {
        const extId = extEmpId ?? empId ?? raw.extEmpId ?? raw.ext_emp_id;
        const extMatch = extEmployees.find(e => String(e.extEmpId ?? e.ext_emp_id ?? e.id) === String(extId)) ||
                         extEmployees.find(e => (e.extEmpNm || e.ext_emp_nm) === rawName);

        memberName = extMatch?.extEmpNm || extMatch?.ext_emp_nm || rawName || "External Associate";
        const codeNum = extMatch?.extEmpCd || extMatch?.ext_emp_cd || extMatch?.extEmpId || extMatch?.ext_emp_id || extId;
        empCode = codeNum ? `EXT-${codeNum}` : (memberName !== "External Associate" ? `EXT` : `EXT-EMP`);
        memberIdStr = extMatch ? `EXT_${extMatch.extEmpId || extMatch.id}` : `EXT_${memberName}`;
      } else {
        const intId = empId ?? raw.empId ?? raw.emp_id;
        const empMatch = employees.find(e => String(e.empId ?? e.id) === String(intId)) ||
                         employees.find(e => `${e.fstNm || ''} ${e.lstNm || ''}`.trim() === rawName || e.empNm === rawName);

        if (empMatch) {
          memberName = `${empMatch.fstNm || ''} ${empMatch.lstNm || ''}`.trim() || empMatch.empNm;
          const codeNum = empMatch.empCd || empMatch.emp_cd || empMatch.empId || empMatch.id;
          empCode = codeNum ? `EMP-${codeNum}` : `EMP`;
          memberIdStr = `EMP_${empMatch.empId || empMatch.id}`;
        } else if (rawName && rawName !== "Unassigned" && rawName !== "—") {
          memberName = rawName;
          empCode = "EMP";
          memberIdStr = `EMP_${rawName}`;
        } else {
          return;
        }
      }

      const key = memberIdStr;
      if (!empMap[key]) {
        empMap[key] = {
          key: key,
          name: memberName,
          empCode: empCode,
          isExternal: isExternal,
          total: 0,
          done: 0,
          overdue: 0,
          onTime: 0,
          taskIds: new Set()
        };
      }

      const taskId = task.code || task.id || JSON.stringify(task);
      if (!empMap[key].taskIds.has(taskId)) {
        empMap[key].taskIds.add(taskId);
        empMap[key].total += 1;
        const s = (task.status || "").toUpperCase();
        if (s === "COMPLETED" || s === "CLOSED" || s === "DONE") {
          empMap[key].done += 1;
        } else {
          if (task.end && task.end !== 'N/A' && new Date(task.end).setHours(23, 59, 59, 999) < nowMs) {
            empMap[key].overdue += 1;
          } else {
            empMap[key].onTime += 1;
          }
        }
      }
    };

    tasks.forEach(t => {
      const raw = t.rawTask || t;

      // A) Executor
      const execName = getAssigneeName(t, employees, extEmployees);
      const execEmpId = raw.empId ?? raw.emp_id ?? raw.assignedTo;
      const execExtId = raw.extEmpId ?? raw.ext_emp_id;
      if (execName && execName !== "Unassigned" && execName !== "—") {
        addMemberContribution(execEmpId, execExtId, execName, t);
      }

      // B) Reviewer
      const reviewerId = raw.reviewerId ?? raw.reviewer_id ?? raw.reviewer;
      const reviewerNm = raw.reviewerNm ?? raw.reviewer_nm ?? raw.reviewerName;
      if (reviewerId || reviewerNm) {
        addMemberContribution(reviewerId, null, reviewerNm, t);
      }

      // C) Approver
      const approverId = raw.approverId ?? raw.approver_id ?? raw.approver;
      const approverNm = raw.approverNm ?? raw.approver_nm ?? raw.approverName;
      if (approverId || approverNm) {
        addMemberContribution(approverId, null, approverNm, t);
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
                  <td>{formatDate(m.start)}</td>
                  <td>{formatDate(m.end)}</td>
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

      {/* Team Performance & Schedule Health */}
      <div className="pd-section-card" style={{ marginTop: '24px' }}>
        <div className="pd-section-header" style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '18px 20px',
          borderBottom: '1px solid #f1f5f9'
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
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                        {m.empCode ? `(${m.empCode})` : ''}
                      </span>
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
              {tasks.length > 0 ? tasks.slice(0, 10).map((t, idx) => {
                const isOverdue = !['COMPLETED', 'CLOSED', 'DONE', 'COMPLETE'].includes(t.status?.toUpperCase()) && 
                  t.end && t.end !== 'N/A' && new Date(t.end) < today;
                const displayStatus = isOverdue ? (t.status === 'IN PROGRESS' ? 'OVERDUE' : `${t.status} (OVERDUE)`) : t.status;
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td className="pd-code-col">{t.code}</td>
                    <td>{t.name}</td>
                    <td>{t.milestone}</td>
                    <td>{t.assignee}</td>
                    <td>{formatDate(t.start)}</td>
                    <td style={{ color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? '600' : 'normal' }}>{formatDate(t.end)}</td>
                    <td><span className={`pd-status-badge ${getStatusClass(t.status, isOverdue)}`}>{displayStatus}</span></td>
                    <td>
                      <div className="pd-progress-wrap">
                        <div className="pd-progress-bar">
                          <div className="pd-progress-fill" style={{ width: `${t.progress}%`, backgroundColor: isOverdue ? '#ef4444' : getProgressColor(t.progress) }}></div>
                        </div>
                        <span style={{ color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? '600' : 'normal' }}>{t.progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
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

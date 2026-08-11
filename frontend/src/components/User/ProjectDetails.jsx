import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit3, X, Star } from 'lucide-react';
import { safeFetch } from "../../utils/api";
import { calculateDynamicPriority } from "../../utils/priority";
import Sidebar from '../Sidebar.jsx';
import Header from '../Header.jsx';
import ProjectOverview from './ProjectOverview.jsx';
import ProjectMilestonesTab from './ProjectMilestonesTab.jsx';
import ProjectGanttChart from './ProjectGanttChart.jsx';
import ProjectForecasting from './ProjectForecasting.jsx';
import ProjectChangeLogs from './ProjectChangeLogs.jsx';
import DocsAndReports from '../Projectmanager/DocsAndReports.jsx';
import '../../styles/project-details.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

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

const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr || dateStr === "N/A" || dateStr === "Not Specified") return "Not Specified";
  const parts = dateStr.split('-');
  if (parts.length >= 3 && parts[0].length === 4) {
    return `${parts[2].substring(0, 2)}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  return dateStr;
};
const formatDate = formatDateToDDMMYYYY;

const extractProgress = (obj) => {
  if (!obj) return 0;
  if (obj.status && obj.status.toUpperCase() === 'COMPLETED') return 100;
  const knownKeys = ['progress', 'completionPercentage', 'completion', 'percentage', 'progressPercent', 'percentComplete', 'completionPercent', 'projectProgress', 'progressValue', 'pctComplete'];
  for (const key of knownKeys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      let val = obj[key];
      if (typeof val === 'string') val = parseFloat(val.replace('%', ''));
      if (!isNaN(val) && val >= 0 && val <= 100) return Number(val);
    }
  }
  const allKeys = Object.keys(obj);
  for (const key of allKeys) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('id') || lowerKey.includes('count') || lowerKey.includes('number') || lowerKey.includes('total')) continue;
    if (lowerKey.includes('progress') || lowerKey.includes('completion') || lowerKey.includes('percent') || lowerKey.includes('pct')) {
      let val = obj[key];
      if (typeof val === 'string') val = parseFloat(val.replace('%', ''));
      if (typeof val === 'number' && val >= 0 && val <= 100) return val;
    }
  }
  return 0;
};

const ProjectDetails = ({ userRole, onLogout }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const viewMode = location.state?.viewMode || 'full';

  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || (viewMode === 'milestones_only' ? 'Milestones & Tasks' : 'Overview')
  );
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leadLagDetail, setLeadLagDetail] = useState(null);

  let tabs = ['Overview', 'Milestones & Tasks', 'Gantt Chart', 'Forecasting', 'Documents', 'Change Logs'];
  if (viewMode === 'milestones_only') {
    tabs = ['Milestones & Tasks'];
  }

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const [draftsRes, liveRes, coyRes, pltRes, deptRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/project-drafts`, { headers: getAuthHeaders() }),
          fetch(`${apiBaseUrl}/api/project-live`, { headers: getAuthHeaders() }),
          fetch(`${apiBaseUrl}/api/companies`, { headers: getAuthHeaders() }),
          fetch(`${apiBaseUrl}/api/plants`, { headers: getAuthHeaders() }),
          fetch(`${apiBaseUrl}/api/departments`, { headers: getAuthHeaders() })
        ]);
        const drafts = draftsRes.ok ? await draftsRes.json() : [];
        const live = liveRes.ok ? await liveRes.json() : [];
        const coyData = coyRes.ok ? await coyRes.json() : [];
        const pltData = pltRes.ok ? await pltRes.json() : [];
        const deptData = deptRes.ok ? await deptRes.json() : [];

        let targetRaw = null;
        let isDraft = false;

        const stateType = location.state?.projectType;
        if (stateType === "live") {
          targetRaw = live.find(l => String(l.prjId) === String(id));
        } else if (stateType === "draft") {
          targetRaw = drafts.find(d => String(d.drftPrjId) === String(id));
          isDraft = true;
        }

        if (!targetRaw) {
          // Fallback check prioritizing live projects first
          targetRaw = live.find(l => String(l.prjId) === String(id));
          if (targetRaw) {
            isDraft = false;
          } else {
            targetRaw = drafts.find(d => String(d.drftPrjId) === String(id));
            isDraft = true;
          }
        }

        if (targetRaw) {
          const p = {
            id: isDraft ? targetRaw.drftPrjId : targetRaw.prjId,
            projectCode: targetRaw.prjCd || "",
            projectName: targetRaw.prjNm || "",
            projectDescription: targetRaw.prjDesc || "",
            projectObjective: targetRaw.prjObjtv || "",
            expectedDeliverables: targetRaw.expDlvbls || "",
            priority: targetRaw.prjPrty || "MEDIUM",
            status: isDraft ? "DRAFT" : (targetRaw.prjSts || "LIVE"),
            startDate: isDraft ? targetRaw.tentStDt : targetRaw.stDt,
            endDate: isDraft ? targetRaw.tentEndDt : targetRaw.endDt,
            actCmpDt: targetRaw.actCmpDt || targetRaw.act_cmp_dt || null,
            leadLagSts: targetRaw.leadLagSts || targetRaw.lead_lag_sts || null,
            totalProjectDays: targetRaw.noOfDays || "",
            companyName: coyData.find(c => c.coyId === targetRaw.coyId)?.coyNm || "",
            plantName: pltData.find(pl => pl.pltId === targetRaw.pltId)?.pltNm || "",
            department: deptData.find(dep => dep.deptId === targetRaw.deptId)?.deptNm || "",
            budget: targetRaw.budget || "Not Specified",
            remarks: targetRaw.addlRem || "",
            logo: targetRaw.logo || null,
            createdBy: targetRaw.createdByName ||
              targetRaw.createdBy ||
              getLoggedInUser(),
            progress: location.state?.projectProgress ?? extractProgress(targetRaw),
            _type: isDraft ? "draft" : "live"
          };

          // Fetch milestones, tasks, and lead-lag status for this specific project
          const mlUrl = isDraft
            ? `${apiBaseUrl}/api/milestone-drafts/by-project/${p.id}`
            : `${apiBaseUrl}/api/milestone-live/by-project/${p.id}`;
          const taskUrl = isDraft
            ? `${apiBaseUrl}/api/task-drafts`
            : `${apiBaseUrl}/api/task-live`;
          const llUrl = !isDraft && p.id
            ? `${apiBaseUrl}/api/project-live/${p.id}/lead-lag-status`
            : null;

          const fetchPromises = [
            fetch(mlUrl, { headers: getAuthHeaders() }),
            fetch(taskUrl, { headers: getAuthHeaders() })
          ];
          if (llUrl) {
            fetchPromises.push(fetch(llUrl, { headers: getAuthHeaders() }).catch(() => null));
          }

          const [mlRes, taskRes, llRes] = await Promise.all(fetchPromises);

          const mlData = mlRes?.ok ? await mlRes.json() : [];
          const taskDataRaw = taskRes?.ok ? await taskRes.json() : [];
          const llData = llRes?.ok ? await llRes.json() : null;

          const getMilestoneId = (m) => isDraft ? (m.drftMId || m.drft_m_id || m.id) : (m.mId || m.mid || m.id);
          const getTaskMilestoneId = (t) => isDraft ? (t.drftMId || t.drft_m_id || t.mId || t.mid) : (t.mId || t.mid || t.mlstm_id);

          const milestoneIds = mlData.map(m => String(getMilestoneId(m)));
          const projectTasks = taskDataRaw.filter(t => {
            const tMid = String(getTaskMilestoneId(t));
            return milestoneIds.includes(tMid);
          });

          setMilestones(mlData);
          setTasks(projectTasks);
          setLeadLagDetail(llData);
          setProject(p);
        }
      } catch (err) {
        console.error("Error fetching project:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProject();
  }, [id, location.state]);

  if (loading) {
    return (
      <div className="proj-shell-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: '#475569', fontSize: '15px', fontWeight: '500' }}>Loading Project Details...</span>
      </div>
    );
  }

  if (!project) {
    return <div className="proj-shell-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#64748b', fontSize: '16px' }}>Project Not Found.</div>;
  }

  const getTaskStatusStr = (t) => {
    if (!t) return '';
    let sts = t.taskSts ?? t.task_sts ?? t.status ?? t.tasksts;
    if (!sts) return '';
    if (typeof sts === 'object') {
      sts = sts.statusNm || sts.status_nm || sts.name || sts.status || '';
    }
    return String(sts).trim().toUpperCase();
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toUpperCase().trim();
    if (s === 'LIVE' || s === 'ACTIVE') return 'live';
    if (s === 'DRAFT') return 'draft';
    if (s === 'HOLD' || s === 'ON HOLD' || s === 'ON_HOLD') return 'hold';
    if (s === 'CLOSED' || s === 'COMPLETED') return 'closed';
    return '';
  };

  // Progress = completed tasks / total tasks × 100 (only COMPLETED/CLOSED count)
  const calculateProgress = (p, taskList) => {
    if (!p) return { overall: 0, completed: 0, inProgress: 0, notStarted: 0, overdue: 0, total: 0 };

    const total = taskList.length;
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const isDone = (t) => {
      const s = getTaskStatusStr(t);
      return s === 'COMPLETED' || s === 'CLOSED' || s === 'DONE' || s === 'COMPLETE';
    };

    const isOverdue = (t) => {
      if (isDone(t)) return false;
      const endDtStr = t.tentEndDt || t.tent_end_dt || t.endDt || t.end_dt;
      if (!endDtStr) return false;
      const endDt = new Date(endDtStr);
      return !isNaN(endDt.getTime()) && endDt < todayObj;
    };

    const completed = taskList.filter(isDone).length;
    const overdue = taskList.filter(isOverdue).length;

    const inProgress = taskList.filter(t => {
      if (isDone(t) || isOverdue(t)) return false;
      const s = getTaskStatusStr(t);
      return s === 'WIP' || s === 'IN PROGRESS' || s === 'IN_PROGRESS' || s === 'LIVE';
    }).length;

    const notStarted = Math.max(0, total - completed - inProgress - overdue);

    // Overall % = completed tasks / total tasks only
    const overall = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

    return { overall, completed, inProgress, notStarted, overdue, total };
  };

  const progressData = calculateProgress(project, tasks);

  const getProjectLeadLag = (proj, llDetail, taskList) => {
    if (!proj) return { label: 'ON TIME', color: '#3b82f6', bgColor: '#dbeafe', borderColor: '#bfdbfe' };

    const status = (llDetail?.leadLagStatus || proj?.leadLagSts || '').toUpperCase();
    const daysVariance = llDetail?.daysVariance;

    // Check dates: actual completion date vs planned end date
    let actDateStr = llDetail?.actualCompletionDate || proj?.actCmpDt;
    let endDateStr = proj?.endDate;

    if (!actDateStr && taskList && taskList.length > 0) {
      let maxAct = null;
      let maxEnd = null;
      taskList.forEach(t => {
        const act = t.actCmpDt || t.actcmpdt || t.act_cmp_dt;
        const end = t.endDt || t.enddt || t.endDate || t.end_dt;
        if (act) {
          const d = new Date(act);
          if (!isNaN(d.getTime()) && (!maxAct || d > maxAct)) maxAct = d;
        }
        if (end) {
          const d = new Date(end);
          if (!isNaN(d.getTime()) && (!maxEnd || d > maxEnd)) maxEnd = d;
        }
      });
      if (maxAct) actDateStr = maxAct.toISOString().split('T')[0];
      if (!endDateStr && maxEnd) endDateStr = maxEnd.toISOString().split('T')[0];
    }

    if (actDateStr && endDateStr) {
      const actD = new Date(actDateStr);
      const endD = new Date(endDateStr);
      if (!isNaN(actD.getTime()) && !isNaN(endD.getTime())) {
        actD.setHours(0, 0, 0, 0);
        endD.setHours(0, 0, 0, 0);
        const diffMs = endD.getTime() - actD.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          return {
            status: 'LEAD',
            label: `LEAD (${diffDays} DAYS)`,
            color: '#10b981',
            bgColor: '#dcfce7',
            borderColor: '#bbf7d0'
          };
        } else if (diffDays < 0) {
          return {
            status: 'LAG',
            label: `LAG (${Math.abs(diffDays)} DAYS)`,
            color: '#ef4444',
            bgColor: '#fee2e2',
            borderColor: '#fecaca'
          };
        } else {
          return {
            status: 'ON_TIME',
            label: 'ON TIME',
            color: '#3b82f6',
            bgColor: '#dbeafe',
            borderColor: '#bfdbfe'
          };
        }
      }
    }

    if (status === 'LEAD') {
      return {
        status: 'LEAD',
        label: daysVariance && daysVariance > 0 ? `LEAD (${daysVariance} DAYS)` : 'LEAD',
        color: '#10b981',
        bgColor: '#dcfce7',
        borderColor: '#bbf7d0'
      };
    } else if (status === 'LAG') {
      return {
        status: 'LAG',
        label: daysVariance && daysVariance > 0 ? `LAG (${daysVariance} DAYS)` : 'LAG',
        color: '#ef4444',
        bgColor: '#fee2e2',
        borderColor: '#fecaca'
      };
    } else {
      return {
        status: 'ON_TIME',
        label: 'ON TIME',
        color: '#3b82f6',
        bgColor: '#dbeafe',
        borderColor: '#bfdbfe'
      };
    }
  };

  const isClosed = Boolean(
    project?.status && ['CLOSED', 'COMPLETED'].includes(project.status.toUpperCase().trim())
  );
  const leadLag = getProjectLeadLag(project, leadLagDetail, tasks);

  const dynamicPriorityInfo = calculateDynamicPriority(
    project?.priority,
    project?.startDate || project?.stDt || project?.stdt,
    project?.targetDate || project?.endDate || project?.endDt || project?.enddt,
    project?.totalProjectDays
  );

  const getPercentage = (val, total) => total > 0 ? ((val / total) * 100).toFixed(2) : 0;

  const ang1 = progressData.total > 0 ? (progressData.completed / progressData.total) * 360 : 0;
  const ang2 = ang1 + (progressData.total > 0 ? (progressData.inProgress / progressData.total) * 360 : 0);
  const ang3 = ang2 + (progressData.total > 0 ? (progressData.notStarted / progressData.total) * 360 : 0);

  const dynamicGradient = progressData.total === 0 
    ? '#e2e8f0' 
    : `conic-gradient(
        #10b981 0deg ${ang1}deg,
        #3b82f6 ${ang1}deg ${ang2}deg,
        #f59e0b ${ang2}deg ${ang3}deg,
        #ef4444 ${ang3}deg 360deg
      )`;

  const formatBulletedText = (text, fallback) => {
    if (!text) return fallback;
    const parts = text
      .split(/•|\r?\n/)
      .map(p => p.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      return (
        <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', lineHeight: '1.6', listStyleType: 'disc' }}>
          {parts.map((p, i) => (
            <li key={i} style={{ color: '#1e293b', marginBottom: '6px', fontSize: '14px' }}>
              {p}
            </li>
          ))}
        </ul>
      );
    }
    return <span style={{ display: 'block', marginTop: '4px', fontSize: '14px' }}>{text}</span>;
  };

  return (
    <div className="proj-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="proj-shell" style={{ paddingBottom: '24px', minHeight: 'auto' }}>
        <Header
          title="Project Details"
          showSearch={false}
          userName={sessionStorage.getItem("userName")}
          userRole={sessionStorage.getItem("userRole")}
          initials={sessionStorage.getItem("userInitials")}
        />

        <main className="pd-main-content">
          {/* Top Actions */}
          <div className="pd-top-actions" style={{ justifyContent: 'flex-start' }}>
            <button
              className="pd-back-btn"
              onClick={() => navigate(-1)}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '500' }}
            >
              <ArrowLeft size={16} /> Back to Project List
            </button>
          </div>

          {/* Project Header Info:
               - DRAFT: always show full header card on all tabs
               - LIVE: show full card on Overview only, minimal bar on other tabs */}
          {(project.status === 'DRAFT' || activeTab === 'Overview') ? (
            <div className="pd-header-card">
              <div className="pd-image-wrapper">
                <img src={project.logo || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80"} alt="Project Logo" />
              </div>

              <div className="pd-info-wrapper">
                <div className="pd-title-row">
                  <h2>{project.projectName}</h2>
                  <span className={`pd-badge ${getStatusBadgeClass(project.status)}`}>{project.status}</span>
                </div>

                <div className="pd-meta-tags">
                  <span className="pd-tag blue">{project.projectCode}</span>
                  {isClosed ? (
                    <span 
                      className="pd-tag" 
                      style={{
                        backgroundColor: leadLag.bgColor,
                        color: leadLag.color,
                        border: `1px solid ${leadLag.borderColor}`,
                        fontWeight: '600',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {leadLag.label}
                    </span>
                  ) : (
                    <span 
                      className="pd-tag"
                      style={{
                        backgroundColor: dynamicPriorityInfo.bgColor,
                        color: dynamicPriorityInfo.color,
                        border: `1px solid ${dynamicPriorityInfo.borderColor}`,
                        fontWeight: '700',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {dynamicPriorityInfo.priority} PRIORITY
                    </span>
                  )}
                </div>

                <p className="pd-description">{project.projectDescription || "No description provided."}</p>

                <div className="pd-details-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div className="pd-detail-item">
                    <span className="pd-label">Company</span>
                    <span className="pd-value">{project.companyName || "Not Specified"}</span>
                  </div>
                  <div className="pd-detail-item">
                    <span className="pd-label">Plant</span>
                    <span className="pd-value">{project.plantName || "Not Specified"}</span>
                  </div>
                  <div className="pd-detail-item">
                    <span className="pd-label">Department</span>
                    <span className="pd-value">{project.department || "Not Specified"}</span>
                  </div>
                </div>

                <div className="pd-details-grid mt-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div className="pd-detail-item">
                    <span className="pd-label">Total Project Days</span>
                    <span className="pd-value">{project.totalProjectDays ? `${project.totalProjectDays} Days` : "Not Specified"}</span>
                  </div>
                  <div className="pd-detail-item">
                    <span className="pd-label">Tentative Start Date</span>
                    <span className="pd-value">{formatDateToDDMMYYYY(project.startDate)}</span>
                  </div>
                  <div className="pd-detail-item">
                    <span className="pd-label">Tentative End Date</span>
                    <span className="pd-value">{formatDateToDDMMYYYY(project.endDate)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <div className="pd-detail-item" style={{ width: '100%' }}>
                    <span className="pd-label">Remarks</span>
                    <span className="pd-value">{project.remarks || "No Remarks"}</span>
                  </div>

                  <div className="pd-detail-item" style={{ width: '100%' }}>
                    <span className="pd-label">Project Objective</span>
                    <span className="pd-value">{formatBulletedText(project.projectObjective, "No objective defined.")}</span>
                  </div>

                  <div className="pd-detail-item" style={{ width: '100%' }}>
                    <span className="pd-label">Expected Deliverables</span>
                    <span className="pd-value">{formatBulletedText(project.expectedDeliverables, "Not Specified")}</span>
                  </div>
                </div>
              </div>

              {/* Project Progress Right Sidebar */}
              <div className="pd-progress-wrapper">
                <h3 className="pd-progress-title">Project Progress</h3>

                <div className="pd-doughnut-chart" style={{ background: dynamicGradient }}>
                  <div className="pd-doughnut-inner">
                    <span className="pd-percentage">{progressData.overall}%</span>
                    <span className="pd-progress-label">Overall Progress</span>
                  </div>
                </div>

                <div className="pd-progress-legend">
                  <div className="pd-legend-item">
                    <div className="pd-legend-left"><span className="pd-dot completed"></span> Completed</div>
                    <div className="pd-legend-right">{progressData.completed} ({getPercentage(progressData.completed, progressData.total)}%)</div>
                  </div>
                  <div className="pd-legend-item">
                    <div className="pd-legend-left"><span className="pd-dot in-progress"></span> In Progress</div>
                    <div className="pd-legend-right">{progressData.inProgress} ({getPercentage(progressData.inProgress, progressData.total)}%)</div>
                  </div>
                  <div className="pd-legend-item">
                    <div className="pd-legend-left"><span className="pd-dot not-started"></span> Not Started</div>
                    <div className="pd-legend-right">{progressData.notStarted} ({getPercentage(progressData.notStarted, progressData.total)}%)</div>
                  </div>
                  <div className="pd-legend-item">
                    <div className="pd-legend-left"><span className="pd-dot overdue"></span> Overdue</div>
                    <div className="pd-legend-right">{progressData.overdue} ({getPercentage(progressData.overdue, progressData.total)}%)</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pd-mini-header" style={{ marginBottom: '20px', padding: '16px 20px', background: 'white', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>{project.projectName}</h2>
                <span className="pd-tag blue" style={{ margin: 0 }}>{project.projectCode}</span>
                <span className={`pd-badge ${getStatusBadgeClass(project.status)}`} style={{ margin: 0, padding: '2px 8px', fontSize: '11px' }}>{project.status}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                {isClosed ? (
                  <span>Schedule: <strong style={{ color: leadLag.color }}>{leadLag.label}</strong></span>
                ) : (
                  <span>Priority: <strong style={{ color: dynamicPriorityInfo.color }}>{dynamicPriorityInfo.priority}</strong></span>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="pd-tabs-container">
            {tabs.map(tab => (
              <button
                key={tab}
                className={`pd-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="pd-tab-content">
            {activeTab === 'Overview' && <ProjectOverview project={project} />}
            {activeTab === 'Milestones & Tasks' && <ProjectMilestonesTab project={project} userRole={userRole} />}
            {activeTab === 'Gantt Chart' && <ProjectGanttChart project={project} userRole={userRole} />}
            {activeTab === 'Documents' && <DocsAndReports isTab={true} project={project} />}
            {activeTab === 'Forecasting' && <ProjectForecasting project={project} progressData={progressData} />}
            {activeTab === 'Change Logs' && <ProjectChangeLogs project={project} progressData={progressData} />}
          </div>

        </main>
      </div>
    </div>
  );
};

export default ProjectDetails;

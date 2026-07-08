import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Building2, CheckCircle2, AlertCircle, ClipboardCheck, CheckSquare, ArrowRight, Undo2 } from 'lucide-react';
import Sidebar from '../Sidebar'; 
import Header from '../Header';
import '../../styles/userDashboard.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";
const getAuthToken = () => sessionStorage.getItem("authToken") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getAuthToken()}`
});

// Cache for Object URLs to prevent memory leaks and lag
const objectUrlCache = new Map();

const formatStatusDisplay = (status) => {
  if (!status) return "";
  const s = status.toUpperCase();
  if (s === "WIP") return "In Progress";
  if (s === "SUBMIT_REVIEW") return "Submit Review";
  if (s === "UNDER_REVIEW") return "Under Review";
  if (s === "REWORK") return "Rework";
  if (s === "ASSIGNED") return "Assigned";
  if (s === "COMPLETED") return "Completed";
  if (s === "OPEN") return "Open";
  if (s === "REASSIGN") return "Reassigned";
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const UserDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        let empId = null;
        let profileData = {};
        
        try {
          const profileRes = await fetch(`${API_BASE}/profile`, { headers: authHeaders() });
          if (profileRes.ok) {
            profileData = await profileRes.json();
            empId = profileData.empId || profileData.id;
          }
        } catch (e) {
          console.error("Failed to fetch profile", e);
        }

        let baseDashData = {};
        try {
          const dashRes = await fetch(`${API_BASE}/user-dashboard`, { headers: authHeaders() });
          if (dashRes.ok) {
            baseDashData = await dashRes.json();
          }
        } catch (e) {
          console.error("Failed to fetch user-dashboard base data", e);
        }

        let employees = [];
        try {
          const empRes = await fetch(`${API_BASE}/employees`, { headers: authHeaders() });
          if (empRes.ok) employees = await empRes.json();
        } catch (e) {
          console.error("Failed to fetch employees", e);
        }

        let userTasks = [];
        try {
          const tasksRes = await fetch(`${API_BASE}/individual-tasks`, { headers: authHeaders() });
          if (tasksRes.ok) {
            let allTasks = await tasksRes.json();
            
            allTasks = await Promise.all(allTasks.map(async (t) => {
               try {
                 const pcRes = await fetch(`${API_BASE}/process-config/individual-task/${t.empTaskId || t.id}`, { headers: authHeaders() });
                 if (pcRes.ok) {
                    const pcs = await pcRes.json();
                    const rev = pcs.find(p => p.stepType === 'REVIEWER' || p.ordrId === 1);
                    if (rev) t.reviewerId = rev.empId;
                    const app = pcs.find(p => p.stepType === 'APPROVER' || p.ordrId === 2);
                    if (app) t.approverId = app.empId;
                 }
               } catch (e) {}
               return t;
            }));

            if (empId) {
              userTasks = allTasks.filter(t => {
                const isDoer = String(t.empId) === String(empId);
                const isReviewer = String(t.reviewerId) === String(empId);
                const isApprover = String(t.approverId) === String(empId);
                
                if (isDoer || isReviewer || isApprover) return true;
                return false;
              });
            } else {
              userTasks = allTasks;
            }
          }
        } catch (e) {
          console.error("Failed to fetch individual tasks", e);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todoList = [];
        const upcomingTasks = [];
        
        let completedCount = 0;
        let inProgressCount = 0;
        let underReviewCount = 0;
        let pendingCount = 0;
        let overdueCount = 0;
        let dueTodayCount = 0;
        
        userTasks.forEach(task => {
          const status = (task.taskSts || "").toUpperCase();
          const priority = task.priority || task.Priority || "Medium";
          
          let stDt = task.stDt ? new Date(task.stDt) : null;
          let endDt = task.endDt ? new Date(task.endDt) : null;
          
          if (stDt) stDt.setHours(0,0,0,0);
          if (endDt) endDt.setHours(0,0,0,0);
          
          let isOverdue = false;
          let isDueToday = false;
          
          if (endDt) {
            if (endDt < today && status !== 'COMPLETED') isOverdue = true;
            if (endDt.getTime() === today.getTime() && status !== 'COMPLETED') isDueToday = true;
          }

          if (status === 'COMPLETED') completedCount++;
          else if (status === 'WIP' || status === 'IN_PROGRESS' || status === 'IN PROGRESS') inProgressCount++;
          else if (status === 'SUBMIT_REVIEW' || status === 'UNDER_REVIEW' || status === 'UNDER REVIEW') underReviewCount++;
          else pendingCount++;
          
          if (isOverdue) overdueCount++;
          if (isDueToday) dueTodayCount++;

          const assignee = employees.find(e => String(e.empId) === String(task.empId));
          const reviewer = task.reviewerId ? employees.find(e => String(e.empId) === String(task.reviewerId)) : null;
          const approver = task.approverId ? employees.find(e => String(e.empId) === String(task.approverId)) : null;

          const taskItem = {
            taskId: task.empTaskId || task.id,
            taskCode: task.taskCd || task.taskcd || `IND-${task.empTaskId || task.id}`,
            taskName: task.taskNm,
            projectCodeName: task.projectCode || "Internal",
            priority: priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase(),
            status: task.taskSts || "To-Do",
            startDate: task.stDt,
            dueDate: task.endDt,
            isOverdue,
            isDueToday,
            assigneePic: assignee?.photoUrl || null,
            reviewerPic: reviewer?.photoUrl || null,
            approverPic: approver?.photoUrl || null,
            assigneeName: assignee ? `${assignee.fstNm || assignee.firstName || ""} ${assignee.lstNm || assignee.lastName || ""}`.trim() : "Assignee",
            reviewerName: reviewer ? `${reviewer.fstNm || reviewer.firstName || ""} ${reviewer.lstNm || reviewer.lastName || ""}`.trim() : "Reviewer",
            approverName: approver ? `${approver.fstNm || approver.firstName || ""} ${approver.lstNm || approver.lastName || ""}`.trim() : "Approver",
            assigneeDesig: assignee?.designation || "Member",
            reviewerDesig: reviewer?.designation || "Reviewer",
            approverDesig: approver?.designation || "Approver"
          };

          if (status !== 'COMPLETED') {
            if (!stDt || stDt <= today) {
              todoList.push(taskItem);
            } else if (stDt > today) {
              upcomingTasks.push(taskItem);
            }
          }
        });

        todoList.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        upcomingTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        let liveProjects = [];
        try {
            const lpRes = await fetch(`${API_BASE}/project-live`, { headers: authHeaders() });
            if (lpRes.ok) {
                liveProjects = await lpRes.json();
            }
        } catch (e) {
            console.error("Failed to fetch project-live for images", e);
        }

        let calculatedProjects = baseDashData.myProjects || [];
        if (calculatedProjects.length > 0) {
          calculatedProjects = calculatedProjects.map(prj => {
            const pTasks = userTasks.filter(t => (t.projectId && String(t.projectId) === String(prj.projectId)) || (t.projectCodeName && t.projectCodeName === prj.projectCode) || (t.projectCode && t.projectCode === prj.projectCode));
            const livePrj = liveProjects.find(lp => String(lp.prjId) === String(prj.projectId) || String(lp.id) === String(prj.projectId) || (lp.prjNm && lp.prjNm === prj.projectName));
            
            let pAssigned = 0;
            let pCompleted = 0;
            let pWip = 0;
            let pReview = 0;
            let pOpen = 0;
            if (pTasks.length > 0) {
              pAssigned = pTasks.length;
              pTasks.forEach(t => {
                 const st = (t.taskSts || "").toUpperCase();
                 if (st === 'COMPLETED') pCompleted++;
                 else if (st === 'WIP' || st === 'IN_PROGRESS' || st === 'IN PROGRESS') pWip++;
                 else if (st === 'SUBMIT_REVIEW' || st === 'UNDER_REVIEW' || st === 'UNDER REVIEW') pReview++;
                 else pOpen++;
              });
            }
            let pProgress = prj.progress || 0;
            if (pAssigned > 0) {
              pProgress = Math.round(((pCompleted + pReview * 0.8 + pWip * 0.5) / pAssigned) * 100);
            }
            return {
              ...prj,
              role: profileData.designation || prj.role || "Team Member",
              projectImage: prj.projectImage || prj.logo || (livePrj ? livePrj.logo : null),
              tasksAssigned: pAssigned > 0 ? pAssigned : (prj.tasksAssigned || 0),
              openTasks: pAssigned > 0 ? pOpen + pWip + pReview : (prj.openTasks || 0),
              progress: pAssigned > 0 ? pProgress : (prj.progress || 0)
            };
          });
        }

        setDashboardData({
          ...baseDashData,
          myProjects: calculatedProjects,
          fullName: profileData.fstNm ? `${profileData.fstNm} ${profileData.lstNm}` : (baseDashData.fullName || "User"),
          role: profileData.designation || baseDashData.role || "Site Engineer",
          todoList: todoList,
          upcomingTasks: upcomingTasks,
          taskStatusCounts: baseDashData.taskStatusCounts || {
            "Completed": completedCount,
            "In Progress": inProgressCount,
            "Under Review": underReviewCount,
            "Pending": pendingCount,
            "Overdue": overdueCount
          },
          myTasksCount: userTasks.length,
          dueTodayCount: dueTodayCount,
          overdueTasksCount: overdueCount,
          completedTasksCount: completedCount,
          overallCompletionPercentage: typeof baseDashData.overallCompletionPercentage !== 'undefined' ? baseDashData.overallCompletionPercentage : (userTasks.length > 0 ? (completedCount / userTasks.length) * 100 : 0)
        });

      } catch (err) {
        console.error("Error loading user dashboard:", err);
        setError("Network error loading dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getImageUrl = (url) => {
    if (!url) return `https://images.unsplash.com/photo-1541888081638-76508920bc8b?w=400&q=80`;
    let cleanUrl = typeof url === 'string' ? url : String(url);
    if (cleanUrl.startsWith('http')) return cleanUrl;

    const isData = cleanUrl.startsWith('data:');
    // If it's a data URI or a large raw base64 string
    if (isData || (cleanUrl.length > 500 && !cleanUrl.startsWith('/'))) {
        if (objectUrlCache.has(cleanUrl)) return objectUrlCache.get(cleanUrl);

        let b64 = cleanUrl;
        let mimeType = 'image/png';
        if (isData) {
            const parts = cleanUrl.split(',');
            mimeType = parts[0].split(':')[1]?.split(';')[0] || 'image/png';
            b64 = parts[1] || '';
        }
        b64 = b64.replace(/[\r\n\s]+/g, '');

        try {
            // If the base64 string is large (e.g. > 1.5MB), Chrome throws ERR_INVALID_URL
            // Converting to a Blob and ObjectURL bypasses URL length limits entirely.
            if (b64.length > 1000000) {
                // Ensure padding is correct for atob
                while (b64.length % 4 !== 0) b64 += '=';
                const byteCharacters = atob(b64);
                const byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
                    const slice = byteCharacters.slice(offset, offset + 1024);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    byteArrays.push(new Uint8Array(byteNumbers));
                }
                const blob = new Blob(byteArrays, { type: mimeType });
                const objUrl = URL.createObjectURL(blob);
                objectUrlCache.set(cleanUrl, objUrl);
                return objUrl;
            } else {
                return `data:${mimeType};base64,${b64}`;
            }
        } catch (e) {
            // If it's invalid base64 (e.g. truncated by backend), return placeholder
            return `https://images.unsplash.com/photo-1541888081638-76508920bc8b?w=400&q=80`;
        }
    }

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    return `${baseUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getPriorityColor = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === 'high') return 'danger';
    if (p === 'medium') return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
        <div style={{ textAlign: 'center' }}>
          <h4>Loading Dashboard...</h4>
          <p>Please wait while we fetch your assigned tasks and projects.</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#ef4444' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
          <h4>Access Error</h4>
          <p>{error || "No dashboard data available. Please verify your login session."}</p>
          <button className="btn btn-primary btn-sm mt-3" onClick={() => navigate("/")}>Go to Login</button>
        </div>
      </div>
    );
  }

  // Calculate percentages for donut chart
  const completedCount = dashboardData.taskStatusCounts?.["Completed"] || 0;
  const inProgressCount = dashboardData.taskStatusCounts?.["In Progress"] || 0;
  const underReviewCount = dashboardData.taskStatusCounts?.["Under Review"] || 0;
  const pendingCount = dashboardData.taskStatusCounts?.["Pending"] || 0;
  const overdueCount = dashboardData.taskStatusCounts?.["Overdue"] || 0;

  const totalTasks = completedCount + inProgressCount + underReviewCount + pendingCount + overdueCount;

  const completedPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const inProgressPercent = totalTasks > 0 ? Math.round((inProgressCount / totalTasks) * 100) : 0;
  const underReviewPercent = totalTasks > 0 ? Math.round((underReviewCount / totalTasks) * 100) : 0;
  const pendingPercent = totalTasks > 0 ? Math.round((pendingCount / totalTasks) * 100) : 0;
  const overduePercent = totalTasks > 0 ? Math.round((overdueCount / totalTasks) * 100) : 0;

  const getDynamicGradient = () => {
    const c = completedPercent;
    const i = c + inProgressPercent;
    const u = i + underReviewPercent;
    const p = u + pendingPercent;
    
    return `conic-gradient(
      #198754 0% ${c}%, 
      #0d6efd ${c}% ${i}%, 
      #ffc107 ${i}% ${u}%, 
      #6f42c1 ${u}% ${p}%, 
      #dc3545 ${p}% 100%
    )`;
  };

  return (
    <>
    <style>{`
      .avatar-wrapper {
        position: relative;
        display: inline-block;
      }
      .avatar-tooltip {
        visibility: hidden;
        width: max-content;
        background-color: #ffffff;
        color: #1e293b;
        text-align: center;
        border-radius: 8px;
        padding: 8px 12px;
        position: absolute;
        z-index: 999;
        bottom: 130%;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.2s, transform 0.2s;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
      }
      .avatar-tooltip::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -6px;
        border-width: 6px;
        border-style: solid;
        border-color: #ffffff transparent transparent transparent;
      }
      .avatar-wrapper:hover .avatar-tooltip {
        visibility: visible;
        opacity: 1;
        transform: translateX(-50%) translateY(-2px);
      }
    `}</style>
    <div className="dashboard-shell-container">
      {/* Sidebar Navigation */}
      <Sidebar userRole={dashboardData.role || "Site Engineer"} onLogout={onLogout} />

      {/* Main Container Viewport (Fixes Layout Shift) */}
      <div className="dashboard-shell">
        
        {/* ======================= DYNAMIC HEADER ======================= */}
        <Header 
          title="User Dashboard" 
          showSearch={false} 
          userName={dashboardData.fullName || "User"} 
          userRole={dashboardData.role || "Site Engineer"} 
          initials={getInitials(dashboardData.fullName)} 
        />

        <main className="dashboard-main">
          <div className="row g-4 mt-1">
            {/* TO-DO List */}
            <div className="col-md-6">
              <div className="ud-card h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold d-flex align-items-center gap-2 m-0 text-uppercase">
                    <CheckSquare size={18} className="text-success" /> To-Do List
                  </h6>
                  <span onClick={() => navigate("/my-tasks")} style={{ cursor: 'pointer' }} className="text-primary text-decoration-none small fw-semibold">View all</span>
                </div>
                <div className="todo-list flex-grow-1">
                  {(!dashboardData.todoList || dashboardData.todoList.length === 0) ? (
                    <div className="text-center py-5 text-muted">No pending to-do tasks. All caught up!</div>
                  ) : (
                    dashboardData.todoList.map((item, index) => {
                      const getStatusColor = (status) => {
                        const s = (status || '').toUpperCase();
                        if(s === 'COMPLETED') return 'success';
                        if(['WIP', 'IN_PROGRESS', 'IN PROGRESS', 'ASSIGNED'].includes(s)) return 'primary';
                        if(['SUBMIT_REVIEW', 'UNDER_REVIEW', 'UNDER REVIEW'].includes(s)) return 'warning';
                        if(s === 'REASSIGN') return 'danger';
                        return 'secondary';
                      };
                      const sColor = getStatusColor(item.status);
                      return (
                        <div key={item.taskId || index} className="todo-item d-flex align-items-center justify-content-between gap-2">
                          <div className="d-flex align-items-start gap-3" style={{ minWidth: 0 }}>
                            <div style={{ minWidth: 0 }}>
                              <p className="mb-0 fw-semibold text-truncate" title={item.taskName}>{item.taskName}</p>
                              <div className="d-flex align-items-center gap-2 mt-1 flex-nowrap" style={{ minWidth: 0 }}>
                                <small className="text-muted m-0 text-truncate">{item.taskCode}</small>
                                <span className={`badge bg-${sColor}-subtle text-${sColor} rounded-pill flex-shrink-0 d-flex align-items-center gap-1`} style={{fontSize: "0.65rem", padding: "0.2rem 0.5rem", whiteSpace: "nowrap"}}>
                                  {(item.status || '').toUpperCase() === 'REASSIGN' && <Undo2 size={10} />}
                                  {formatStatusDisplay(item.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-3 flex-shrink-0 text-end" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <div className="d-flex align-items-center" style={{ gap: '-8px' }}>
                              <div className="avatar-wrapper" style={{ zIndex: 3 }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#475569', border: '2px solid #fff', overflow: 'hidden' }}>
                                  {item.assigneePic ? <img src={getImageUrl(item.assigneePic)} alt="A" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : getInitials(item.assigneeName)}
                                </div>
                                <div className="avatar-tooltip">
                                  <div className="fw-bold" style={{ fontSize: '12px' }}>{item.assigneeName}</div>
                                  <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{item.assigneeDesig} (Assignee)</div>
                                </div>
                              </div>
                              {item.reviewerName !== "Reviewer" && (
                                <div className="avatar-wrapper" style={{ zIndex: 2, marginLeft: '-8px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#475569', border: '2px solid #fff', overflow: 'hidden' }}>
                                    {item.reviewerPic ? <img src={getImageUrl(item.reviewerPic)} alt="R" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : getInitials(item.reviewerName)}
                                  </div>
                                  <div className="avatar-tooltip">
                                    <div className="fw-bold" style={{ fontSize: '12px' }}>{item.reviewerName}</div>
                                    <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{item.reviewerDesig} (Reviewer)</div>
                                  </div>
                                </div>
                              )}
                              {item.approverName !== "Approver" && (
                                <div className="avatar-wrapper" style={{ zIndex: 1, marginLeft: '-8px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#475569', border: '2px solid #fff', overflow: 'hidden' }}>
                                    {item.approverPic ? <img src={getImageUrl(item.approverPic)} alt="AP" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : getInitials(item.approverName)}
                                  </div>
                                  <div className="avatar-tooltip">
                                    <div className="fw-bold" style={{ fontSize: '12px' }}>{item.approverName}</div>
                                    <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{item.approverDesig} (Approver)</div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <small className="text-muted d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                              <Calendar size={14} /> {formatDate(item.startDate)}
                            </small>
                            <small className="text-muted d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                              <Calendar size={14} /> {item.isOverdue ? "Overdue" : (item.isDueToday ? "Today" : formatDate(item.dueDate))}
                            </small>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="col-md-6">
              <div className="ud-card h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold d-flex align-items-center gap-2 m-0 text-uppercase">
                    <Calendar size={18} className="text-primary" /> Upcoming Tasks
                  </h6>
                  <span onClick={() => navigate("/my-tasks")} style={{ cursor: 'pointer' }} className="text-primary text-decoration-none small fw-semibold">View all</span>
                </div>
                <div className="todo-list flex-grow-1">
                  {(!dashboardData.upcomingTasks || dashboardData.upcomingTasks.length === 0) ? (
                    <div className="text-center py-5 text-muted">No upcoming tasks scheduled.</div>
                  ) : (
                    dashboardData.upcomingTasks.map((item, index) => {
                      const getStatusColor = (status) => {
                        const s = (status || '').toUpperCase();
                        if(s === 'COMPLETED') return 'success';
                        if(['WIP', 'IN_PROGRESS', 'IN PROGRESS', 'ASSIGNED'].includes(s)) return 'primary';
                        if(['SUBMIT_REVIEW', 'UNDER_REVIEW', 'UNDER REVIEW'].includes(s)) return 'warning';
                        return 'secondary';
                      };
                      const sColor = getStatusColor(item.status);
                      return (
                        <div key={item.taskId || index} className="todo-item d-flex align-items-center justify-content-between gap-2">
                          <div className="d-flex align-items-start gap-3" style={{ minWidth: 0 }}>
                            <div style={{ minWidth: 0 }}>
                              <p className="mb-0 fw-semibold text-truncate" title={item.taskName}>{item.taskName}</p>
                              <div className="d-flex align-items-center gap-2 mt-1 flex-nowrap" style={{ minWidth: 0 }}>
                                <small className="text-muted m-0 text-truncate">{item.taskCode}</small>
                                <span className={`badge bg-${sColor}-subtle text-${sColor} rounded-pill flex-shrink-0 d-flex align-items-center gap-1`} style={{fontSize: "0.65rem", padding: "0.2rem 0.5rem", whiteSpace: "nowrap"}}>
                                  {(item.status || '').toUpperCase() === 'REASSIGN' && <Undo2 size={10} />}
                                  {formatStatusDisplay(item.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-3 flex-shrink-0 text-end" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <div className="d-flex align-items-center" style={{ gap: '-8px' }}>
                              <div className="avatar-wrapper" style={{ zIndex: 3 }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#475569', border: '2px solid #fff', overflow: 'hidden' }}>
                                  {item.assigneePic ? <img src={getImageUrl(item.assigneePic)} alt="A" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : getInitials(item.assigneeName)}
                                </div>
                                <div className="avatar-tooltip">
                                  <div className="fw-bold" style={{ fontSize: '12px' }}>{item.assigneeName}</div>
                                  <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{item.assigneeDesig} (Assignee)</div>
                                </div>
                              </div>
                              {item.reviewerName !== "Reviewer" && (
                                <div className="avatar-wrapper" style={{ zIndex: 2, marginLeft: '-8px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#475569', border: '2px solid #fff', overflow: 'hidden' }}>
                                    {item.reviewerPic ? <img src={getImageUrl(item.reviewerPic)} alt="R" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : getInitials(item.reviewerName)}
                                  </div>
                                  <div className="avatar-tooltip">
                                    <div className="fw-bold" style={{ fontSize: '12px' }}>{item.reviewerName}</div>
                                    <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{item.reviewerDesig} (Reviewer)</div>
                                  </div>
                                </div>
                              )}
                              {item.approverName !== "Approver" && (
                                <div className="avatar-wrapper" style={{ zIndex: 1, marginLeft: '-8px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#475569', border: '2px solid #fff', overflow: 'hidden' }}>
                                    {item.approverPic ? <img src={getImageUrl(item.approverPic)} alt="AP" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : getInitials(item.approverName)}
                                  </div>
                                  <div className="avatar-tooltip">
                                    <div className="fw-bold" style={{ fontSize: '12px' }}>{item.approverName}</div>
                                    <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{item.approverDesig} (Approver)</div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <small className="text-muted d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                              <Calendar size={14} /> {formatDate(item.startDate)}
                            </small>
                            <small className="text-muted d-flex align-items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                              <Calendar size={14} /> {item.isOverdue ? "Overdue" : (item.isDueToday ? "Today" : formatDate(item.dueDate))}
                            </small>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* My Projects */}
            <div className="col-md-6">
              <div className="ud-card h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold d-flex align-items-center gap-2 m-0 text-uppercase">
                    <Building2 size={18} className="text-primary" /> My Projects
                  </h6>
                  <span onClick={() => navigate("/projects")} style={{ cursor: 'pointer' }} className="text-primary text-decoration-none small fw-semibold">View all</span>
                </div>
                <div className="projects-list flex-grow-1">
                  {(!dashboardData.myProjects || dashboardData.myProjects.length === 0) ? (
                    <div className="text-center py-5 text-muted">No projects assigned yet.</div>
                  ) : (
                    dashboardData.myProjects.map((prj, i) => {
                      const pColors = ["success", "primary", "purple", "warning"];
                      const pColor = pColors[i % pColors.length];
                      return (
                        <div key={prj.projectId || i} className="project-item d-flex align-items-center py-3 border-bottom" style={{ cursor: 'pointer', flexWrap: 'nowrap' }} onClick={() => navigate(`/projects/${prj.projectId}`)}>
                          <div className="prj-img me-3" style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#e9ecef' }}>
                            <img src={getImageUrl(prj.projectImage || prj.logo)} alt={prj.projectName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1541888081638-76508920bc8b?w=400&q=80'; }} />
                          </div>
                          <div className="flex-grow-1 pe-2" style={{ minWidth: 0 }}>
                            <h6 className="mb-1 fw-bold text-truncate" style={{ fontSize: '15px', color: '#1e293b' }}>{prj.projectName}</h6>
                            <small className="d-block mb-1 text-truncate" style={{ color: '#64748b', fontSize: '12px' }}>{prj.clientName || 'N/A'} | {prj.plantName || 'N/A'}</small>
                            <small className="d-block text-truncate" style={{ color: '#475569', fontSize: '12px' }}>Role: <strong>{prj.role}</strong></small>
                          </div>
                          <div className="d-flex align-items-start justify-content-end text-center" style={{ gap: '15px', flexShrink: 0 }}>
                            <div className="d-flex flex-column align-items-center">
                              <small className="mb-2 text-truncate" style={{fontSize: '11px', color: '#64748b', fontWeight: '600'}}>Progress</small>
                              <div className={`circular-progress text-${pColor}`} style={{ width: '42px', height: '42px', borderRadius: '50%', border: `3px solid currentColor`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                                {prj.progress}%
                              </div>
                            </div>
                            <div className="d-flex flex-column align-items-center">
                              <small className="mb-2 text-truncate" style={{fontSize: '11px', color: '#64748b', fontWeight: '600'}}>Assigned</small>
                              <h5 className="mb-0 fw-bold mt-1" style={{ fontSize: '17px', color: '#0f172a' }}>{prj.tasksAssigned}</h5>
                            </div>
                            <div className="d-flex flex-column align-items-center">
                              <small className="mb-2 text-truncate" style={{fontSize: '11px', color: '#64748b', fontWeight: '600'}}>Open</small>
                              <h5 className="mb-1 fw-bold mt-1" style={{ fontSize: '17px', color: '#0f172a' }}>{prj.openTasks || 0}</h5>
                              <span className="badge bg-success-subtle text-success rounded-pill px-2 text-truncate" style={{fontSize: '10px', maxWidth: '65px', display: 'inline-block'}}>{prj.status || 'Active'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Task Completion Overview */}
            <div className="col-md-6">
              <div className="ud-card h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h6 className="fw-bold d-flex align-items-center gap-2 m-0 text-uppercase">
                    <CheckCircle2 size={18} className="text-secondary" /> Task Completion Overview
                  </h6>
                </div>
                
                <div className="d-flex align-items-center justify-content-around my-auto py-3">
                  <div className="donut-chart-container">
                    <div className="donut-chart" style={{ background: getDynamicGradient() }}>
                      <div className="donut-inner">
                        <h2 className="fw-bold mb-0 fs-1">{Math.round(dashboardData.overallCompletionPercentage)}%</h2>
                        <small className="text-muted text-center" style={{fontSize: '13px'}}>Overall<br/>Completion</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="chart-legend">
                    <div className="legend-item"><span className="dot bg-success"></span><span className="l-text">Completed</span><span className="l-val text-success fw-bold" style={{ whiteSpace: 'nowrap' }}>{completedCount} ({completedPercent}%)</span></div>
                    <div className="legend-item"><span className="dot bg-primary"></span><span className="l-text">In Progress</span><span className="l-val text-primary fw-bold" style={{ whiteSpace: 'nowrap' }}>{inProgressCount} ({inProgressPercent}%)</span></div>
                    <div className="legend-item"><span className="dot bg-warning"></span><span className="l-text">Under Review</span><span className="l-val text-warning fw-bold" style={{ whiteSpace: 'nowrap' }}>{underReviewCount} ({underReviewPercent}%)</span></div>
                    <div className="legend-item"><span className="dot bg-purple"></span><span className="l-text">Pending</span><span className="l-val text-purple fw-bold" style={{ whiteSpace: 'nowrap' }}>{pendingCount} ({pendingPercent}%)</span></div>
                    <div className="legend-item"><span className="dot bg-danger"></span><span className="l-text">Overdue</span><span className="l-val text-danger fw-bold" style={{ whiteSpace: 'nowrap' }}>{overdueCount} ({overduePercent}%)</span></div>
                  </div>
                </div>
                
                <div className="text-center mt-auto pt-3 border-top">
                  <span onClick={() => navigate("/my-tasks")} style={{ cursor: 'pointer' }} className="text-primary text-decoration-none fw-semibold small">View detailed report <ArrowRight size={14}/></span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Summary Cards */}
          <div className="row row-cols-1 row-cols-md-3 row-cols-xl-5 g-3 mt-3 mb-4">
            {[
              { icon: Building2, val: dashboardData.myProjectsCount || 0, label: "My Projects", link: "View projects", path: "/projects", cardBg: "ud-card-green", iconColor: "text-success bg-success-subtle" },
              { icon: ClipboardCheck, val: dashboardData.myTasksCount || 0, label: "My Tasks", link: "View tasks", path: "/my-tasks", cardBg: "ud-card-blue", iconColor: "text-primary bg-primary-subtle" },
              { icon: Calendar, val: dashboardData.dueTodayCount || 0, label: "Due Today", link: "View today's tasks", path: "/calendar", cardBg: "ud-card-orange", iconColor: "text-warning bg-warning-subtle" },
              { icon: AlertCircle, val: dashboardData.overdueTasksCount || 0, label: "Overdue Tasks", link: "View overdue", path: "/my-tasks", cardBg: "ud-card-red", iconColor: "text-danger bg-danger-subtle" },
              { icon: CheckCircle2, val: dashboardData.completedTasksCount || 0, label: "Completed Tasks", link: "View completed", path: "/my-tasks", cardBg: "ud-card-purple", iconColor: "text-purple bg-purple-subtle" }
            ].map((card, i) => (
              <div key={i} className="col">
                <div className={`ud-summary-card h-100 d-flex align-items-center gap-3 px-3 py-3 ${card.cardBg}`}>
                  <div className={`icon-box ${card.iconColor}`}>
                    <card.icon size={26} strokeWidth={2.2} />
                  </div>
                  <div className="d-flex flex-column justify-content-center text-start">
                    <h4 className="fw-bolder mb-0 text-dark lh-1">{card.val}</h4>
                    <span className="text-secondary small fw-medium mt-1 mb-2" style={{fontSize: '13px'}}>{card.label}</span>
                    <span onClick={() => navigate(card.path)} className="text-primary text-decoration-none fw-semibold d-flex align-items-center gap-1" style={{fontSize: '12px', letterSpacing: '0.3px', cursor: 'pointer'}}>
                      {card.link} <ArrowRight size={13}/>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
    </>
  );
};

export default UserDashboard;
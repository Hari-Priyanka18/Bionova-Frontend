import React, { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import Sidebar from "../Sidebar";
import Header from "../Header";
import AlertModal from "../AlertModal";
import { getScreenPermission } from "../../utils/permissions";
import {
  Calendar as CalendarIcon,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Play,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Check,
  Undo,
  Undo2,
  Redo2,
  ClipboardList,
  Layers,
  Clock,
  RefreshCcw,
  RefreshCw,
  Loader2,
  Filter,
  User,
  Users,
  Calendar,
  Flag,
  FileText,
  CheckSquare,
  Clock as ClockIcon,
  AlertTriangle,
  ArrowLeft,
  UserX,
  UserPlus,
  Briefcase,
  ListChecks,
  MessageSquare,
  Paperclip,
  History,
  MoreVertical
} from "lucide-react";
import "../../styles/MyTasks.css";
import { apiGet, apiPut, apiPatch, apiPost, apiPostMultipart, apiDelete } from "../../utils/api";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

// ============================================
// CONSTANTS - COLORS & STATUS
// ============================================

const ReassignIcon = ({ size = 16, color = "#4F46E5", className = "", style = {}, strokeWidth = 2.5 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: "inline-block", verticalAlign: "middle", ...style }}
  >
    <polyline points="9 14 4 18 9 22" />
    <path d="M4 18h11a5 5 0 0 0 0-10H8" />
  </svg>
);

const PROGRESS_COLORS = {
  "OPEN": { bg: "#DBEAFE", color: "#2563EB", label: "OPEN" },
  "DRAFT": { bg: "#F3F4F6", color: "#9CA3AF", label: "DRAFT" },
  "WIP": { bg: "#FEF3C7", color: "#F59E0B", label: "WORK IN PROGRESS" },
  "HOLD": { bg: "#EDE9FE", color: "#7C3AED", label: "HOLD" },
  "COMPLETED": { bg: "#DCFCE7", color: "#16A34A", label: "CLOSED" },
  "CLOSED": { bg: "#DCFCE7", color: "#16A34A", label: "CLOSED" }
};

const PRIORITY_COLORS = {
  "Low": { bg: "#DCFCE7", color: "#22C55E" },
  "Normal": { bg: "#DBEAFE", color: "#3B82F6" },
  "Medium": { bg: "#FEF3C7", color: "#F59E0B" },
  "High": { bg: "#FEE2E2", color: "#EF4444" },
  "Critical": { bg: "#FEE2E2", color: "#B91C1C" },
  "Atmost Critical": { bg: "#FEE2E2", color: "#7F1D1D" },
  "Rework": { bg: "#FFF7ED", color: "#F97316" },
  "REWORK": { bg: "#FFF7ED", color: "#F97316" },
  "Reassigned": { bg: "#EEF2FF", color: "#4F46E5" },
  "REASSIGN": { bg: "#EEF2FF", color: "#4F46E5" }
};

const PROCESS_COLORS = {
  "PENDING_REVIEWER": { color: "#8B5CF6", icon: Eye, title: "Under Review" },
  "PENDING_APPROVER": { color: "#8B5CF6", icon: Eye, title: "Under Review" },
  "REWORK": { color: "#F97316", icon: RefreshCw, title: "Rework" },
  "REASSIGN": { color: "#4F46E5", icon: ReassignIcon, title: "Reassign" }
};

const TIME_COLORS = {
  "Lead": { color: "#22C55E", icon: Clock, title: "Lead" },
  "On Time": { color: "#3B82F6", icon: Clock, title: "On Time" },
  "Due Today": { color: "#F59E0B", icon: Clock, title: "Due Today" },
  "Overdue": { color: "#EF4444", icon: Clock, title: "Overdue" },
  "Lag": { color: "#DC2626", icon: Clock, title: "Lag" }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateTimeStatus = (task) => {
  if (!task) return { status: "On Time", color: "#3B82F6", icon: Clock, title: "On Time" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = task.endDt ? new Date(task.endDt) : null;
  const completedDate = task.actCmpDt ? new Date(task.actCmpDt) : null;

  if (!dueDate) return { status: "On Time", color: "#3B82F6", icon: Clock, title: "On Time" };

  dueDate.setHours(0, 0, 0, 0);

  // For closed/completed tasks — only show Lead / Lag / On Time
  const rawSts = (task.taskSts || task.status || "").toString().toUpperCase();
  const isClosed = rawSts === "COMPLETED" || rawSts === "CLOSED" || rawSts === "DONE";
  if (isClosed) {
    const refDate = completedDate ? new Date(completedDate) : today;
    refDate.setHours(0, 0, 0, 0);
    if (refDate < dueDate) return { status: "Lead", color: "#22C55E", icon: Clock, title: "Lead" };
    if (refDate.getTime() === dueDate.getTime()) return { status: "On Time", color: "#3B82F6", icon: Clock, title: "On Time" };
    return { status: "Lag", color: "#DC2626", icon: Clock, title: "Lag" };
  }

  if (today < dueDate) return { status: "On Track", color: "#8B5CF6", icon: Clock, title: "On Track" };
  if (today.getTime() === dueDate.getTime()) return { status: "Due Today", color: "#F59E0B", icon: Clock, title: "Due Today" };
  if (today > dueDate) return { status: "Overdue", color: "#EF4444", icon: Clock, title: "Overdue" };

  return { status: "On Track", color: "#8B5CF6", icon: Clock, title: "On Track" };
};

// ============================================
// GET EMPLOYEE DETAILS
// ============================================

const getEmployeeName = (empId, employeesList) => {
  if (!empId) return "Unknown";
  if (!employeesList || employeesList.length === 0) {
    return `User ${empId}`;
  }

  const emp = employeesList.find(e => {
    const target = String(empId).trim();
    return String(e.empId).trim() === target ||
      String(e.employeeId).trim() === target ||
      String(e.employeeCode).trim() === target ||
      String(e.id).trim() === target ||
      String(e._id).trim() === target ||
      String(e.employee_code).trim() === target ||
      String(e.empCode).trim() === target ||
      String(e.userId).trim() === target;
  });

  if (!emp) return `User ${empId}`;

  if (emp.employeeName) return emp.employeeName;
  if (emp.fullName) return emp.fullName;
  if (emp.name) return emp.name;
  if (emp.employee_name) return emp.employee_name;
  if (emp.empName) return emp.empName;
  if (emp.fstNm && emp.lstNm) return `${emp.fstNm} ${emp.lstNm}`.trim();
  if (emp.firstName && emp.lastName) return `${emp.firstName} ${emp.lastName}`.trim();
  if (emp.first_name && emp.last_name) return `${emp.first_name} ${emp.last_name}`.trim();
  if (emp.fstNm) return emp.fstNm;
  if (emp.firstName) return emp.firstName;
  if (emp.first_name) return emp.first_name;
  if (emp.displayName) return emp.displayName;
  if (emp.username) return emp.username;
  if (emp.email) return emp.email.split('@')[0];

  return emp.empCode || emp.employee_code || `User ${empId}`;
};

const getEmployeeInitials = (empId, employeesList) => {
  const name = getEmployeeName(empId, employeesList);
  if (!name || name === "Unknown" || name.startsWith('User ')) {
    const idStr = String(empId);
    return idStr.substring(0, 2).toUpperCase();
  }
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

const getEmployeePhoto = (empId, employeesList) => {
  if (!empId) return null;
  if (!employeesList || employeesList.length === 0) return null;

  const emp = employeesList.find(e => {
    const target = String(empId).trim();
    return String(e.empId).trim() === target ||
      String(e.employeeId).trim() === target ||
      String(e.employeeCode).trim() === target ||
      String(e.id).trim() === target ||
      String(e._id).trim() === target ||
      String(e.employee_code).trim() === target ||
      String(e.empCode).trim() === target ||
      String(e.userId).trim() === target;
  });
  if (!emp) return null;

  if (emp.photoUrl) return emp.photoUrl;
  if (emp.profileImageBase64) return emp.profileImageBase64;
  if (emp.profileImage) return emp.profileImage;
  if (emp.photo) return emp.photo;
  if (emp.imageUrl) return emp.imageUrl;
  if (emp.avatar) return emp.avatar;
  if (emp.picture) return emp.picture;

  return null;
};

// ============================================
// FORMAT DATE FUNCTION
// ============================================
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${months[parseInt(parts[1], 10) - 1]}-${parts[0]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

// ============================================
// ACTION BUTTON - DYNAMIC BASED ON PROGRESS, PROCESS, PRIORITY, TIME
// ============================================

const getActionButton = (task, currentUserEmpId, isExternal = false) => {
  if (!task) return { label: "View", action: "view", variant: "secondary" };

  const rawTask = task.rawTask || task;
  const isExternalTask = isExternal || task.isExternal || rawTask.isExternal;

  // Get user roles
  const executorId = rawTask.empId || rawTask.assignedTo || rawTask.executorId || rawTask.doerId;
  const reviewerId = rawTask.reviewerId || rawTask.reviewer || rawTask.reviewerEmpId;
  const approverId = rawTask.approverId || rawTask.approver || rawTask.approverEmpId;

  const isTeamMember = (Array.isArray(rawTask?.teamMembers) && rawTask.teamMembers.some(tm => String(tm.empId) === String(currentUserEmpId))) || (Array.isArray(task?.teamMembers) && task.teamMembers.some(tm => String(tm.empId) === String(currentUserEmpId)));
  const isDoer = isExternalTask || String(executorId) === String(currentUserEmpId) || isTeamMember;
  const isReviewer = !isExternalTask && String(reviewerId) === String(currentUserEmpId);
  const isApprover = !isExternalTask && String(approverId) === String(currentUserEmpId);

  // Get progress (status)
  const progress = (rawTask.taskSts || rawTask.status || rawTask.taskStatus || task.status || "OPEN").toUpperCase();

  // Get process
  const process = (rawTask.prcsYesActn || rawTask.processAction || rawTask.process || "NONE").toUpperCase();

  // Calculate time status
  const timeStatus = calculateTimeStatus(rawTask);

  // Calculate priority
  let calculatedPriority = "Normal";
  const endDt = rawTask.endDt || rawTask.dueDate;
  if (progress === "REASSIGN" || progress === "REWORK") {
    calculatedPriority = progress;
  } else if (endDt) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(endDt);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) calculatedPriority = "High";
      else if (diffDays === 1) calculatedPriority = "Critical";
      else if (diffDays >= 2) calculatedPriority = "Atmost Critical";
    } catch (e) { }
  }

  // Normalize progress
  let normalizedProgress = progress;
  if (progress === "WIP" || progress === "IN_PROGRESS" || progress === "INPROGRESS") {
    normalizedProgress = "WORK_IN_PROGRESS";
  }
  if (progress === "OPEN") normalizedProgress = "OPEN";
  if (progress === "COMPLETED" || progress === "CLOSED") normalizedProgress = "COMPLETED";
  if (progress === "HOLD") normalizedProgress = "HOLD";
  if (progress === "DRAFT") normalizedProgress = "OPEN";

  // Normalize process
  let normalizedProcess = process;
  if (process === "NONE" || !process || process === "NULL" || process === "YES") normalizedProcess = "NONE";
  if (process === "PENDING_REVIEWER" || process === "UNDER_REVIEW") normalizedProcess = "UNDER_REVIEW";
  if (process === "PENDING_APPROVER") normalizedProcess = "UNDER_REVIEW";
  if (process === "REWORK") normalizedProcess = "REWORK";
  if (process === "REASSIGN") normalizedProcess = "REASSIGN";

  // Log for debugging
  console.log(`🔍 Dynamic Action Check - Task: ${task.id || task.taskId}`);
  console.log(`   Progress: ${normalizedProgress}, Process: ${normalizedProcess}`);
  console.log(`   Time Status: ${timeStatus.status}, Priority: ${calculatedPriority}`);
  console.log(`   IsDoer: ${isDoer}, IsReviewer: ${isReviewer}, IsApprover: ${isApprover}`);

  // If user has no role in this task, show View
  if (!isDoer && !isReviewer && !isApprover) {
    return { label: "View", action: "view", variant: "secondary" };
  }

  // ============================================
  // EXECUTOR (DOER) ACTIONS - DYNAMIC
  // ============================================
  if (isDoer) {
    // OPEN / DRAFT -> Start
    if (normalizedProgress === "OPEN") {
      return { label: "Start", action: "start", variant: "primary" };
    }

    // WORK_IN_PROGRESS with NONE -> Update
    if (normalizedProgress === "WORK_IN_PROGRESS" && normalizedProcess === "NONE") {
      return { label: "Update", action: "update", variant: "warning" };
    }

    // WORK_IN_PROGRESS with UNDER_REVIEW -> View
    if (normalizedProgress === "WORK_IN_PROGRESS" && normalizedProcess === "UNDER_REVIEW") {
      return { label: "View", action: "view", variant: "secondary" };
    }

    // WORK_IN_PROGRESS with REWORK -> Update
    if (normalizedProgress === "WORK_IN_PROGRESS" && normalizedProcess === "REWORK") {
      return { label: "Update", action: "update", variant: "warning" };
    }

    // WORK_IN_PROGRESS with REASSIGN -> Update
    if (normalizedProgress === "WORK_IN_PROGRESS" && normalizedProcess === "REASSIGN") {
      return { label: "Update", action: "update", variant: "warning" };
    }

    // HOLD -> View
    if (normalizedProgress === "HOLD") {
      return { label: "View", action: "view", variant: "secondary" };
    }

    // COMPLETED -> View
    if (normalizedProgress === "COMPLETED") {
      return { label: "View", action: "view", variant: "secondary" };
    }

    // Default fallback for executor
    return { label: "Update", action: "update", variant: "warning" };
  }

  // ============================================
  // REVIEWER ACTIONS - DYNAMIC
  // ============================================
  if (isReviewer) {
    // WORK_IN_PROGRESS with PENDING_REVIEWER or UNDER_REVIEW -> Review
    if (normalizedProgress === "WORK_IN_PROGRESS" && (process === "PENDING_REVIEWER" || process === "UNDER_REVIEW")) {
      return { label: "Review", action: "review", variant: "review" };
    }

    // All other cases -> View
    return { label: "View", action: "view", variant: "secondary" };
  }

  // ============================================
  // APPROVER ACTIONS - DYNAMIC
  // ============================================
  if (isApprover) {
    // WORK_IN_PROGRESS with PENDING_APPROVER -> Approve
    if (normalizedProgress === "WORK_IN_PROGRESS" && process === "PENDING_APPROVER") {
      return { label: "Approve", action: "approve", variant: "success" };
    }

    // All other cases -> View
    return { label: "View", action: "view", variant: "secondary" };
  }

  return { label: "View", action: "view", variant: "secondary" };
};

const getProcessIcon = (process) => {
  if (!process || process === "NONE" || process === "REJECTED") return null;
  const processData = PROCESS_COLORS[process];
  if (!processData) return null;
  return {
    icon: processData.icon,
    color: processData.color,
    title: processData.title
  };
};

const getProgressBadge = (status) => {
  let normalizedStatus = "OPEN";
  if (typeof status === 'object' && status !== null) {
    normalizedStatus = String(status.statusNm || status.status_nm || status.statusId || "OPEN").toUpperCase();
    if (status.statusId === 4 || status.status_id === 4) normalizedStatus = "CLOSED";
  } else if (typeof status === 'string') {
    normalizedStatus = status.toUpperCase();
  } else if (typeof status === 'number') {
    if (status === 4) normalizedStatus = "CLOSED";
    if (status === 3) normalizedStatus = "WIP";
    if (status === 2) normalizedStatus = "OPEN";
    if (status === 1) normalizedStatus = "DRAFT";
  }
  const progressData = PROGRESS_COLORS[normalizedStatus] || PROGRESS_COLORS["OPEN"];
  return progressData;
};

const getPriorityBadge = (priority) => {
  const normalizedPriority = priority || "Normal";
  const priorityData = PRIORITY_COLORS[normalizedPriority];
  if (!priorityData) return { bg: "#F3F4F6", color: "#6B7280" };
  return priorityData;
};

// ============================================
// MAIN COMPONENT
// ============================================
const MyTasks = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('MY_TASK');
  const { token: routeToken } = useParams();
  const location = useLocation();
  const queryToken = new URLSearchParams(location.search).get("token");
  const externalToken = routeToken || queryToken;
  const isExternalMode = !!externalToken;

  const [isExpired, setIsExpired] = useState(false);
  const [expiredReason, setExpiredReason] = useState(null);
  const [expiredMessage, setExpiredMessage] = useState(null);
  const [isExternalProfileHovered, setIsExternalProfileHovered] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserEmpId, setCurrentUserEmpId] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [userName, setUserName] = useState("");
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [updateProgressVal, setUpdateProgressVal] = useState(0);
  const [updateChecklist, setUpdateChecklist] = useState([]);
  const [updateRemarks, setUpdateRemarks] = useState("");
  const [updateAttachments, setUpdateAttachments] = useState([]);
  const [processHistory, setProcessHistory] = useState([]);
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [isRaiseRequest, setIsRaiseRequest] = useState(false);
  const [denyData, setDenyData] = useState({ type: "", reason: "", milestone: "", deliverable: "", targetTaskId: "", targetEmpId: "", impact: "Medium", attachments: [] });
  const [reworkMilestones, setReworkMilestones] = useState([]);
  const [reworkTasks, setReworkTasks] = useState([]);
  const [reworkProjectTasks, setReworkProjectTasks] = useState([]);
  const [loadingReworkMilestones, setLoadingReworkMilestones] = useState(false);
  const [loadingReworkTasks, setLoadingReworkTasks] = useState(false);

  const [allProjectTasks, setAllProjectTasks] = useState([]);
  const [taskTeamMembers, setTaskTeamMembers] = useState([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState("");
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [teamMemberError, setTeamMemberError] = useState("");

  const fetchExternalTask = async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      const res = await fetch(`${apiBaseUrl}/api/external-tasks/${externalToken}`);
      const data = await res.json();

      if (res.status === 410 || data.isExpired) {
        setIsExpired(true);
        setExpiredReason(data.expiredReason || "EXPIRED");
        setExpiredMessage(data.message || "This task access link has expired.");
        const taskObj = data.task || data;
        setSelectedTask({
          id: taskObj.taskCd || `TSK-${taskObj.taskId}`,
          taskCode: taskObj.taskCd || `TSK-${taskObj.taskId}`,
          taskId: taskObj.taskId,
          title: taskObj.taskNm,
          dueDate: taskObj.endDt,
          project: taskObj.prjNm || "Project",
          milestone: taskObj.mlstnTtl || "—",
          rawTask: taskObj
        });
        setShowDetailView(true);
      } else if (!res.ok) {
        setApiError(data.message || "Unable to load task details.");
      } else {
        const taskObj = {
          id: data.taskCd || `TSK-${data.taskId}`,
          taskCode: data.taskCd || `TSK-${data.taskId}`,
          taskId: data.taskId,
          title: data.taskNm,
          description: data.taskDesc,
          status: data.taskSts || "OPEN",
          rawStatus: data.taskSts || "OPEN",
          priority: data.priority || "Normal",
          dueDate: data.endDt,
          stDt: data.stDt,
          endDt: data.endDt,
          progress: data.taskSts === "COMPLETED" || data.taskSts === "CLOSED" ? 100 : (data.checklists?.length ? Math.round((data.checklists.filter(c => c.chkSts).length / data.checklists.length) * 100) : 0),
          project: data.prjNm || "Assignment",
          projectId: data.prjId,
          milestone: data.mlstnTtl || "—",
          milestoneId: data.mId,
          rawTask: {
            ...data,
            empId: data.extEmpId,
            assignedTo: data.extEmpId,
            extEmpNm: data.extEmpNm,
            companyNm: data.companyNm,
            taskSts: data.taskSts,
            priority: data.priority,
            stDt: data.stDt,
            endDt: data.endDt,
            taskDesc: data.taskDesc,
            addlRem: data.addlRem,
            isExternal: true,
            prcsYesActn: "NONE"
          },
          isExternal: true
        };

        const chks = (data.checklists || []).map(c => ({
          id: c.chkId,
          text: (c.chkCd ? `[${c.chkCd}] ` : "") + (c.chkNm || c.chkDesc || ""),
          completed: !!c.chkSts
        }));

        const atts = (data.attachments || []).map(a => ({
          fileId: a.fileId,
          fileNm: a.fileNm,
          fileName: a.fileNm,
          atPath: a.atPath,
          url: a.atPath
        }));

        setSelectedTask(taskObj);
        setShowDetailView(true);
        setUpdateChecklist(chks);
        setTaskAttachments(atts);
        setUpdateRemarks(data.addlRem || "");
        setUpdateProgressVal(taskObj.progress);
      }
    } catch (e) {
      console.error("Failed to fetch external task", e);
      setApiError("Network error while connecting to server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Ref for deny form — used to auto-scroll when Denied is clicked
  const denyFormRef = useRef(null);
  useEffect(() => {
    if (showDenyForm && denyFormRef.current) {
      setTimeout(() => {
        denyFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [showDenyForm]);

  // Load project-specific milestones & all project tasks when showDenyForm is opened
  useEffect(() => {
    if (!showDenyForm || !selectedTask) {
      setReworkMilestones([]);
      setReworkTasks([]);
      setReworkProjectTasks([]);
      return;
    }

    const loadProjectMilestones = async () => {
      const rawT = selectedTask.rawTask || selectedTask || {};
      let projId = rawT.prjId || rawT.projectId || rawT.prj_id || selectedTask.projectId || selectedTask.prjId;
      const mId = rawT.mId || rawT.mid || rawT.milestoneId || selectedTask.milestoneId;

      if (!projId && mId && Array.isArray(milestonesList)) {
        const foundM = milestonesList.find(m => String(m.mId || m.id || m.mid || "") === String(mId));
        if (foundM) projId = foundM.prjId || foundM.projectId || foundM.prj_id;
      }

      if (!projId) return;

      try {
        setLoadingReworkMilestones(true);
        const [milesRes, tasksRes] = await Promise.allSettled([
          apiGet(`/api/milestone-live/by-project/${projId}`),
          apiGet(`/api/task-live/by-project/${projId}`)
        ]);

        let pMiles = milesRes.status === 'fulfilled' && Array.isArray(milesRes.value) ? milesRes.value : [];
        if (pMiles.length === 0 && Array.isArray(milestonesList)) {
          pMiles = milestonesList.filter(m => String(m.prjId || m.projectId || m.prj_id) === String(projId));
        }

        let pTasks = tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value) ? tasksRes.value : [];
        setReworkProjectTasks(pTasks);

        pMiles.sort((a, b) => {
          const cdA = String(a.mlstnCd || a.code || a.id || "").trim();
          const cdB = String(b.mlstnCd || b.code || b.id || "").trim();
          if (cdA && cdB) {
            const cmp = cdA.localeCompare(cdB, undefined, { numeric: true, sensitivity: 'base' });
            if (cmp !== 0) return cmp;
          }
          if (a.stDt && b.stDt) {
            const cmp = String(a.stDt).localeCompare(String(b.stDt));
            if (cmp !== 0) return cmp;
          }
          return Number(a.mId || a.mid || a.id || 0) - Number(b.mId || b.mid || b.id || 0);
        });

        setReworkMilestones(pMiles);

        // Find available previous milestones for current task
        const mCode = String(rawT.mlstnCd || selectedTask?.mlstnCd || "").toUpperCase().trim();
        const mCodeMatch = mCode.match(/MLS-0*([0-9]+)/i);
        const extractedMNum = mCodeMatch ? parseInt(mCodeMatch[1], 10) : 0;

        let curIndex = pMiles.findIndex(m => {
          const id = String(m.mId || m.mid || m.id || m.drftMId || "").trim();
          const cd = String(m.mlstnCd || "").trim().toUpperCase();
          if (mId && id && String(mId) === id) return true;
          if (mCode && cd && mCode === cd) return true;
          return false;
        });

        const curNum = extractedMNum > 0 ? extractedMNum : (curIndex >= 0 ? curIndex + 1 : 1);
        let prevMiles = [];
        if (curIndex > 0) {
          prevMiles = pMiles.slice(0, curIndex);
        } else {
          prevMiles = pMiles.filter(m => {
            const cd = String(m.mlstnCd || "").toUpperCase().trim();
            const match = cd.match(/MLS-0*([0-9]+)/i);
            const num = match ? parseInt(match[1], 10) : 0;
            return num > 0 && num < curNum;
          });
        }
        if (prevMiles.length === 0 && pMiles.length > 0) {
          prevMiles = pMiles.filter(m => String(m.mlstnCd || "").toUpperCase().trim() !== mCode);
        }

        // Auto-select the first previous milestone and immediately load its tasks
        if (prevMiles.length > 0) {
          const firstTargetM = prevMiles[0];
          const targetMId = String(firstTargetM.mId || firstTargetM.mid || firstTargetM.id || firstTargetM.drftMId || "");
          setDenyData(prev => ({
            ...prev,
            type: "REWORK",
            milestone: targetMId,
            deliverable: "",
            targetTaskId: "",
            targetEmpId: ""
          }));

          // Filter tasks belonging to target milestone
          const targetMTasks = pTasks.filter(t => {
            const r = t.rawTask || t;
            const tmId = String(r.mId || r.mid || r.milestoneId || t.milestoneId || r.drftMId || "").trim();
            if (tmId === targetMId) return true;
            if (firstTargetM.drftMId && String(firstTargetM.drftMId) === tmId) return true;
            const tCd = String(r.mlstnCd || t.mlstnCd || "").toUpperCase().trim();
            const mCd = String(firstTargetM.mlstnCd || "").toUpperCase().trim();
            if (mCd && tCd && mCd === tCd) return true;
            return false;
          });

          if (targetMTasks.length > 0) {
            setReworkTasks(targetMTasks);
          } else {
            try {
              setLoadingReworkTasks(true);
              const tasksRes = await apiGet(`/api/task-live/by-milestone/${targetMId}`);
              if (Array.isArray(tasksRes) && tasksRes.length > 0) {
                setReworkTasks(tasksRes);
              }
            } catch (tErr) {
              console.error("Failed to load target milestone tasks", tErr);
            } finally {
              setLoadingReworkTasks(false);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load project milestones for rework", err);
      } finally {
        setLoadingReworkMilestones(false);
      }
    };

    loadProjectMilestones();
  }, [showDenyForm, selectedTask?.id, selectedTask?.taskId]);

  // Load tasks dynamically when a target milestone is changed in deny form
  useEffect(() => {
    if (!denyData.milestone) {
      setReworkTasks([]);
      return;
    }

    // If already loaded in reworkProjectTasks, pick from there
    if (reworkProjectTasks && reworkProjectTasks.length > 0) {
      const selMidStr = String(denyData.milestone).trim();
      const filtered = reworkProjectTasks.filter(t => {
        const r = t.rawTask || t;
        const tmId = String(r.mId || r.mid || r.milestoneId || t.milestoneId || r.drftMId || "").trim();
        return tmId === selMidStr;
      });
      if (filtered.length > 0) {
        setReworkTasks(filtered);
        return;
      }
    }

    const loadMilestoneTasks = async () => {
      try {
        setLoadingReworkTasks(true);
        const res = await apiGet(`/api/task-live/by-milestone/${denyData.milestone}`);
        const mTasks = Array.isArray(res) ? res : [];
        setReworkTasks(mTasks);
      } catch (err) {
        console.error("Failed to load tasks for rework milestone", err);
        setReworkTasks([]);
      } finally {
        setLoadingReworkTasks(false);
      }
    };

    loadMilestoneTasks();
  }, [denyData.milestone]);

  // ============================================
  // FETCH TASKS
  // ============================================
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setApiError(null);

      console.log("🔄 ===== FETCHING REAL TIME TASKS FROM BACKEND =====");
      const startTime = Date.now();

      let empId = null;
      let userEmail = null;
      let adminCheck = false;

      let employeesData = employeesList;
      let projectsData = [];
      let milestonesData = [];
      let tasksData = [];
      let indTasksData = [];

      // Always fetch fresh data but use parallel requests for maximum speed
      console.log("📡 Fetching bulk data in parallel (including profile and employees)...");
      const [profileRes, empRes, projRes, mileRes, mileDraftRes, taskRes, indTaskRes, dashRes] = await Promise.allSettled([
        apiGet("/api/profile"),
        apiGet("/api/employees/directory").catch(() => apiGet("/api/employees")),
        apiGet("/api/project-live"),
        apiGet("/api/milestone-live"),
        apiGet("/api/milestone-drafts"),
        apiGet("/api/task-live"),
        apiGet("/api/assignments"),
        apiGet("/api/user-dashboard")
      ]);

      // Handle Profile
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        empId = profileRes.value.empId;
        userEmail = profileRes.value.email;
        const profileName = profileRes.value.name || profileRes.value.employeeName || profileRes.value.fullName;
        if (profileName) {
          setUserName(profileName);
          sessionStorage.setItem("userName", profileName);
        }
        adminCheck = userEmail === 'vsv.vempati@gmail.com' || userEmail === 'admin@example.com' || userRole === 'admin';
      } else {
        empId = sessionStorage.getItem("empId");
        userEmail = sessionStorage.getItem("userEmail");
        const storedName = sessionStorage.getItem("userName");
        if (storedName) setUserName(storedName);
        adminCheck = userEmail === 'vsv.vempati@gmail.com' || userRole === 'admin';
      }

      setCurrentUserEmpId(empId);
      setCurrentUserEmail(userEmail);
      setIsAdmin(adminCheck);

      // Handle Employees
      if (empRes.status === 'fulfilled' && empRes.value) {
        employeesData = empRes.value;
        setEmployeesList(employeesData);
      }

      if (!empId && !adminCheck) {
        console.log("📱 No user logged in - showing demo tasks");
        const demoTasks = getDemoTasks(empId, employeesData);
        setTasks(demoTasks);
        setIsLoading(false);
        return;
      }

      projectsData = projRes.status === 'fulfilled' && projRes.value ? projRes.value : [];
      setProjectsList(projectsData);
      if (projRes.status === 'rejected') console.warn("⚠️ Projects API Error:", projRes.reason);
      else console.log("✅ Projects loaded:", projectsData.length);

      const liveMiles = mileRes.status === 'fulfilled' && mileRes.value ? mileRes.value : [];
      const draftMiles = mileDraftRes.status === 'fulfilled' && mileDraftRes.value ? mileDraftRes.value : [];
      milestonesData = [...liveMiles, ...draftMiles];
      setMilestonesList(milestonesData);
      console.log("✅ Milestones loaded:", milestonesData.length);

      tasksData = taskRes.status === 'fulfilled' && taskRes.value ? taskRes.value : [];
      setAllProjectTasks(tasksData);
      if (taskRes.status === 'rejected') console.error("❌ Tasks API Error:", taskRes.reason);
      else console.log("✅ Tasks loaded:", tasksData.length);

      indTasksData = indTaskRes.status === 'fulfilled' && indTaskRes.value ? indTaskRes.value : [];
      if (indTaskRes.status === 'rejected') console.warn("⚠️ Assignments API Error:", indTaskRes.reason);
      else console.log("✅ Individual tasks loaded:", indTasksData.length);

      if (dashRes.status === 'fulfilled' && dashRes.value?.upcomingTasks) {
        setUpcomingTaskIds(dashRes.value.upcomingTasks.map(t => String(t.taskId || t.id)));
      } else {
        setUpcomingTaskIds([]);
      }

      // Extract employees from all tasks to populate missing profiles (for restricted users)
      try {
        const extractedEmployees = new Map();

        const allTasksSource = [
          ...(dashRes.status === 'fulfilled' && dashRes.value ? [
            ...(dashRes.value.todoList || []),
            ...(dashRes.value.upcomingTasks || []),
            ...(dashRes.value.completedTasks || []),
            ...(dashRes.value.closedTasks || [])
          ] : []),
          ...tasksData,
          ...indTasksData
        ];

        allTasksSource.forEach(t => {
          // Extract from embedded employees array
          if (t.employees && Array.isArray(t.employees)) {
            t.employees.forEach(e => {
              const id = String(e.empId || e.employeeId || e.id || "");
              if (id) {
                extractedEmployees.set(id, {
                  empId: id,
                  empNm: e.fullName || e.empName || e.name || e.employeeName,
                  profileImage: e.photoUrl || e.photo || e.profileImage || null
                });
              }
            });
          }
          // Extract from flat fields
          if (t.empId || t.assignedTo || t.executorId) {
            const id = String(t.empId || t.assignedTo || t.executorId);
            const name = t.executorName || t.empNm || t.empName || t.assignedToName || t.executorNm;
            if (name && !extractedEmployees.has(id)) {
              extractedEmployees.set(id, { empId: id, empNm: name, profileImage: t.executorPhoto || t.empPhoto });
            }
          }
          if (t.reviewerId || t.reviewer) {
            const id = String(t.reviewerId || t.reviewer);
            const name = t.reviewerName || t.reviewerNm || t.revNm || t.revName;
            if (name && !extractedEmployees.has(id)) {
              extractedEmployees.set(id, { empId: id, empNm: name, profileImage: t.reviewerPhoto || t.revPhoto });
            }
          }
          if (t.approverId || t.approver) {
            const id = String(t.approverId || t.approver);
            const name = t.approverName || t.approverNm || t.appNm || t.appName;
            if (name && !extractedEmployees.has(id)) {
              extractedEmployees.set(id, { empId: id, empNm: name, profileImage: t.approverPhoto || t.appPhoto });
            }
          }
        });

        const existingEmpIds = new Set(employeesData.map(e => String(e.empId)));
        const newEmployees = Array.from(extractedEmployees.values()).filter(e => !existingEmpIds.has(e.empId));

        if (newEmployees.length > 0) {
          console.log(`➕ Extracted ${newEmployees.length} employees from tasks (Fallback)`);
          employeesData = [...employeesData, ...newEmployees];
          setEmployeesList(employeesData);
        }
      } catch (e) {
        console.error("Error extracting employees", e);
      }

      if ((!tasksData || tasksData.length === 0) && (!indTasksData || indTasksData.length === 0)) {
        console.log("📡 No tasks found, trying alternative endpoint /api/tasks...");
        try {
          const altTasks = await apiGet("/api/tasks");
          if (altTasks && altTasks.length > 0) {
            tasksData = altTasks;
            console.log("✅ Found tasks from /api/tasks:", tasksData.length);
          }
        } catch (altErr) {
          console.warn("⚠️ Alternative tasks API also failed");
        }

        if ((!tasksData || tasksData.length === 0) && (!indTasksData || indTasksData.length === 0)) {
          console.log("📱 No tasks - showing demo tasks");
          const demo = getDemoTasks(empId, employeesData || []);
          setTasks(demo);
          setIsLoading(false);
          return;
        }
      }

      let filteredLiveTasks = [];
      let filteredIndTasks = [];

      if (adminCheck) {
        filteredLiveTasks = tasksData || [];
        filteredIndTasks = indTasksData || [];
        console.log(`✅ Admin: Showing all ${filteredLiveTasks.length} live tasks and ${filteredIndTasks.length} individual tasks`);
      } else {
        const userEmpId = String(empId);
        console.log(`🔍 Filtering tasks for user ID: ${userEmpId}`);

        const isUserInTask = (task) => {
          const taskEmpId = String(task.empId || task.assignedTo || task.executorId || '');
          const taskReviewerId = String(task.reviewerId || task.reviewer || '');
          const taskApproverId = String(task.approverId || task.approver || '');
          const taskAssignedById = String(task.assignedBy || task.assigned_by || task.createdBy || '');
          if (taskEmpId === userEmpId || taskReviewerId === userEmpId || taskApproverId === userEmpId || taskAssignedById === userEmpId) return true;
          if (Array.isArray(task.employees)) {
            if (task.employees.some(e => String(e.empId || e.id || e.employeeId || '') === userEmpId)) return true;
          }
          if (Array.isArray(task.teamMembers)) {
            if (task.teamMembers.some(tm => String(tm.empId || tm.id || '') === userEmpId)) return true;
          }
          return false;
        };

        filteredLiveTasks = (tasksData || []).filter(isUserInTask);
        filteredIndTasks = (indTasksData || []).filter(isUserInTask);

        console.log(`✅ User tasks (Live): ${filteredLiveTasks.length} (out of ${(tasksData || []).length})`);
        console.log(`✅ User tasks (Individual): ${filteredIndTasks.length} (out of ${(indTasksData || []).length})`);
      }

      let mapped = filteredLiveTasks.map(t => mapBackendTask(t, projectsData || [], milestonesData || [], employeesData || []));
      let mappedInd = filteredIndTasks.map(t => mapIndividualTask(t, employeesData || []));
      mapped = [...mapped, ...mappedInd];

      // Final strict deduplication by unique database primary ID
      const uniqueMapped = [];
      const seenKeys = new Set();
      mapped.forEach(t => {
        const idVal = t.taskId || t.id || t.empTaskId;
        const idKey = `${t.isIndividual ? 'IND' : 'LIVE'}_${idVal}`;
        if (idVal && !seenKeys.has(idKey)) {
          seenKeys.add(idKey);
          uniqueMapped.push(t);
        }
      });
      mapped = uniqueMapped;

      mapped = mapped.map(task => {
        let progress = 0;
        const taskSts = String(task.rawStatus || task.status || "").toUpperCase();

        if (taskSts === 'COMPLETED' || taskSts === 'CLOSED') {
          progress = 100;
        } else if (taskSts === 'WIP' || taskSts === 'IN_PROGRESS' || taskSts === 'UNDER_REVIEW') {
          progress = 50;
        } else if (taskSts === 'OPEN' || taskSts === 'DRAFT') {
          progress = 0;
        }

        return {
          ...task,
          progress: progress,
          status: getDisplayStatus(progress, task.status, false)
        };
      });

      mapped = mapped.filter(task => {
        const s = String(task.rawStatus || task.status || "").toUpperCase();
        return s !== "DRAFT";
      });

      console.log(`✅ Final tasks loaded: ${mapped.length} (Loaded in ${Date.now() - startTime}ms)`);
      setTasks(mapped);
      return mapped;

    } catch (err) {
      console.error("❌ Error loading tasks:", err);
      setApiError(err.message || "Failed to load tasks. Please try again.");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getDemoTasks = (empId, employees) => {
    const userId = empId || "1";
    return [
      {
        id: "DEMO-001",
        taskId: 1,
        title: "Design Homepage (Demo)",
        project: "Website Redesign",
        milestone: "Design Phase",
        priority: "High",
        dueDate: "2026-07-20",
        status: "WIP",
        progress: 50,
        rawStatus: "WIP",
        rawTask: {
          taskId: 1,
          taskNm: "Design Homepage",
          empId: userId,
          reviewerId: "2",
          approverId: "3",
          taskSts: "WIP",
          prcsYesActn: "NONE",
          endDt: "2026-07-20"
        },
        description: "Create the main homepage design with hero section"
      },
      {
        id: "DEMO-002",
        taskId: 2,
        title: "API Integration (Demo)",
        project: "Mobile App",
        milestone: "Backend",
        priority: "Critical",
        dueDate: "2026-07-15",
        status: "OPEN",
        progress: 0,
        rawStatus: "OPEN",
        rawTask: {
          taskId: 2,
          taskNm: "API Integration",
          empId: userId,
          reviewerId: "4",
          approverId: "5",
          taskSts: "OPEN",
          prcsYesActn: "NONE",
          endDt: "2026-07-15"
        },
        description: "Integrate REST APIs for mobile app"
      },
      {
        id: "DEMO-003",
        taskId: 3,
        title: "Testing and QA (Demo)",
        project: "Website Redesign",
        milestone: "Testing",
        priority: "Normal",
        dueDate: "2026-07-25",
        status: "COMPLETED",
        progress: 100,
        rawStatus: "COMPLETED",
        rawTask: {
          taskId: 3,
          taskNm: "Testing and QA",
          empId: userId,
          reviewerId: "2",
          approverId: "3",
          taskSts: "COMPLETED",
          prcsYesActn: "NONE",
          endDt: "2026-07-25",
          actCmpDt: "2026-07-24"
        },
        description: "Complete testing and quality assurance"
      }
    ];
  };

  const getDisplayStatus = (progress, originalStatus, prcsFlg) => {
    if (progress === 100) return "COMPLETED";
    if (progress > 0) return "WIP";
    return "OPEN";
  };

  const formatTaskCode = (code, taskId, isIndividual) => {
    if (code && typeof code === 'string' && code.trim() !== '') {
      const raw = code.trim();
      const match = raw.match(/^(TSK|INDTSK|INDKTSK|IND|INDTASK|TST|T)-?(\d+)$/i);
      if (match) {
        const p = match[1].toUpperCase();
        const num = parseInt(match[2], 10);
        if (p.startsWith('IND')) {
          return `INDTSK-${String(num).padStart(3, '0')}`;
        } else {
          return `TSK-${String(num).padStart(3, '0')}`;
        }
      }
      return raw.toUpperCase();
    }
    const prefix = isIndividual ? 'INDTSK' : 'TSK';
    const num = parseInt(taskId, 10);
    return `${prefix}-${String(isNaN(num) ? 1 : num).padStart(3, '0')}`;
  };

  const mapBackendTask = (t, projects, milestones, employees) => {
    const targetMId = t.mId || t.m_id || t.drftMId || t.milestoneId || t.mid;
    const milestoneObj = milestones?.find(m =>
      String(m.mId || m.id || m.m_id || m.milestoneId || '') === String(targetMId || '')
    );

    const targetPrjId = milestoneObj
      ? (milestoneObj.prjId || milestoneObj.projectId || milestoneObj.prj_id)
      : (t.prjId || t.projectId || t.prj_id);
    const projectObj = projects?.find(p =>
      String(p.prjId || p.id || p.prj_id || '') === String(targetPrjId || '')
    );

    const milestoneName =
      (milestoneObj ? (milestoneObj.mlstnTtl || milestoneObj.title || milestoneObj.name || milestoneObj.mlstn_ttl || milestoneObj.mlstnNm) : null) ||
      t.milestoneName || t.mlstnTtl || t.milestoneTitle || t.milestone || t.mlstnNm || t.mlstn_ttl ||
      "—";

    const projectName =
      (projectObj ? (projectObj.prjNm || projectObj.name || projectObj.prj_nm) : null) ||
      t.projectName || t.projectCodeName || t.prjNm || t.project ||
      "Internal";

    const taskCodeFormatted = formatTaskCode(t.taskCd || t.taskCode || t.task_cd || t.code, t.taskId || t.id, false);

    let status = "OPEN";
    const rawSts = t.taskSts || t.status;
    const taskStsStr = typeof rawSts === 'object' && rawSts !== null
      ? (rawSts.statusNm || rawSts.status_nm || rawSts.name || "OPEN")
      : (rawSts || "OPEN");
    const taskSts = String(taskStsStr).toUpperCase();
    if (taskSts === "COMPLETED" || taskSts === "CLOSED") status = "COMPLETED";
    else if (taskSts === "WIP" || taskSts === "IN_PROGRESS") status = "WIP";
    else if (taskSts === "OPEN") status = "OPEN";
    else if (taskSts === "DRAFT") status = "DRAFT";
    else if (taskSts === "HOLD") status = "HOLD";
    else status = "WIP";

    let calculatedPriority = "Normal";
    const endDt = t.endDt || t.dueDate || t.endDate;
    if (taskSts === "REASSIGN" || taskSts === "REWORK") {
      calculatedPriority = taskSts;
    } else if (endDt) {
      try {
        const dateStr = endDt.split('T')[0];
        const [year, month, day] = dateStr.split('-');
        const endDtObj = new Date(year, month - 1, day);
        endDtObj.setHours(0, 0, 0, 0);

        let compareDateObj = new Date();
        compareDateObj.setHours(0, 0, 0, 0);

        const actCmpDt = t.actCmpDt || t.actualCompletionDate || t.completedDate;
        if (taskSts === "COMPLETED" || taskSts === "CLOSED" || taskSts === "UNDER_REVIEW") {
          if (actCmpDt) {
            const cmpDateStr = actCmpDt.split('T')[0];
            const [cYear, cMonth, cDay] = cmpDateStr.split('-');
            compareDateObj = new Date(cYear, cMonth - 1, cDay);
            compareDateObj.setHours(0, 0, 0, 0);
          } else if (compareDateObj > endDtObj) {
            compareDateObj = endDtObj;
          }
        }

        const diffTime = compareDateObj.getTime() - endDtObj.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) calculatedPriority = "High";
        else if (diffDays === 1) calculatedPriority = "Critical";
        else if (diffDays >= 2) calculatedPriority = "Atmost Critical";
      } catch (e) { }
    }

    const mlstnCode = milestoneObj?.mlstnCd || t.mlstnCd || "";
    const prjIdVal = targetPrjId || t.prjId;
    const mIdVal = targetMId || t.mId;

    return {
      id: taskCodeFormatted,
      taskCode: taskCodeFormatted,
      taskId: t.taskId || t.task_id || t.id,
      title: t.taskNm || t.taskName || t.name || "Untitled Task",
      project: projectName,
      projectId: prjIdVal,
      prjId: prjIdVal,
      milestone: milestoneName,
      milestoneId: mIdVal,
      mId: mIdVal,
      mlstnCd: mlstnCode,
      mlstnTtl: milestoneName,
      priority: calculatedPriority,
      dueDate: endDt ? endDt.split('T')[0] : "",
      status: status,
      progress: 0,
      rawStatus: taskSts,
      rawTask: {
        ...t,
        projectId: prjIdVal,
        prjId: prjIdVal,
        milestoneId: mIdVal,
        mId: mIdVal,
        mlstnCd: mlstnCode,
        mlstnTtl: milestoneName,
        empId: t.empId || t.assignedTo || t.executorId,
        assignedBy: t.assignedBy || t.assigned_by || t.createdBy || t.creBy,
        assignedByName: t.assignedByNm || t.assignedByName || t.createdByName,
        reviewerId: t.reviewerId || t.reviewer,
        approverId: t.approverId || t.approver,
      },
      description: t.taskDesc || t.description || ""
    };
  };

  const mapIndividualTask = (t, employees) => {
    const taskCodeFormatted = formatTaskCode(t.taskCd || t.taskCode || t.task_cd || t.code, t.empTaskId || t.id, true);

    let status = "OPEN";
    const rawSts = t.taskSts || t.status;
    const taskStsStr = typeof rawSts === 'object' && rawSts !== null
      ? (rawSts.statusNm || rawSts.status_nm || rawSts.name || "OPEN")
      : (rawSts || "OPEN");
    const taskSts = String(taskStsStr).toUpperCase();
    if (taskSts === "COMPLETED" || taskSts === "CLOSED") status = "COMPLETED";
    else if (taskSts === "WIP" || taskSts === "IN_PROGRESS") status = "WIP";
    else if (taskSts === "OPEN") status = "OPEN";
    else if (taskSts === "DRAFT") status = "DRAFT";
    else if (taskSts === "HOLD") status = "HOLD";
    else status = "WIP";

    let calculatedPriority = "Normal";
    const endDt = t.endDt || t.dueDate || t.endDate;
    if (taskSts === "REASSIGN" || taskSts === "REWORK") {
      calculatedPriority = taskSts;
    } else if (endDt) {
      try {
        const dateStr = endDt.split('T')[0];
        const [year, month, day] = dateStr.split('-');
        const endDtObj = new Date(year, month - 1, day);
        endDtObj.setHours(0, 0, 0, 0);

        let compareDateObj = new Date();
        compareDateObj.setHours(0, 0, 0, 0);

        const actCmpDt = t.actCmpDt || t.actualCompletionDate || t.completedDate;
        if (taskSts === "COMPLETED" || taskSts === "UNDER_REVIEW") {
          if (actCmpDt) {
            const cmpDateStr = actCmpDt.split('T')[0];
            const [cYear, cMonth, cDay] = cmpDateStr.split('-');
            compareDateObj = new Date(cYear, cMonth - 1, cDay);
            compareDateObj.setHours(0, 0, 0, 0);
          } else if (compareDateObj > endDtObj) {
            compareDateObj = endDtObj;
          }
        }

        const diffTime = compareDateObj.getTime() - endDtObj.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) calculatedPriority = "High";
        else if (diffDays === 1) calculatedPriority = "Critical";
        else if (diffDays >= 2) calculatedPriority = "Atmost Critical";
      } catch (e) { }
    }

    return {
      id: taskCodeFormatted,
      taskCode: taskCodeFormatted,
      taskId: t.empTaskId || t.emp_task_id || t.taskId || t.task_id || t.id,
      isIndividual: true,
      title: t.taskNm || t.taskName || t.name || "Untitled Task",
      project: "Individual Task",
      milestone: "—",
      priority: calculatedPriority,
      dueDate: endDt ? endDt.split('T')[0] : "",
      status: status,
      progress: 0,
      rawStatus: taskSts,
      rawTask: {
        ...t,
        empId: t.empId || t.assignedTo || t.executorId,
        assignedBy: t.assignedBy || t.assigned_by || t.createdBy || t.creBy,
        assignedByName: t.assignedByNm || t.assignedByName || t.createdByName,
        reviewerId: t.reviewerId || t.reviewer,
        approverId: t.approverId || t.approver,
      },
      description: t.taskDesc || t.description || ""
    };
  };

  useEffect(() => {
    if (isExternalMode) {
      fetchExternalTask();
    } else {
      fetchTasks();
    }
  }, [externalToken]);

  // ============================================
  // SIDEBAR COLLAPSE LISTENER
  // ============================================
  useEffect(() => {
    const handleSidebarToggle = (event) => {
      const collapsed = event.detail?.collapsed || false;
      setIsSidebarCollapsed(collapsed);
      document.body.classList.toggle('sidebar-collapsed', collapsed);
    };

    window.addEventListener('sidebarToggle', handleSidebarToggle);

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      const collapsed = sidebar.classList.contains('collapsed');
      setIsSidebarCollapsed(collapsed);
      document.body.classList.toggle('sidebar-collapsed', collapsed);
    }

    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
      document.body.classList.remove('sidebar-collapsed');
    };
  }, []);

  // ============================================
  // STATE
  // ============================================
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [selectedMilestone, setSelectedMilestone] = useState("All Milestones");
  const [selectedPriority, setSelectedPriority] = useState("All Priorities");
  const [selectedStatus, setSelectedStatus] = useState(location.state?.selectedStatus || "To Do");

  useEffect(() => {
    if (location.state?.selectedStatus) {
      setSelectedStatus(location.state.selectedStatus);
      setCurrentPage(1);
    }
  }, [location.state]);

  useEffect(() => {
    if (tasks && tasks.length > 0 && location.state?.selectedTaskId) {
      const targetId = String(location.state.selectedTaskId).toLowerCase().trim();
      const matched = tasks.find(t => {
        const id1 = String(t.taskId || '').toLowerCase().trim();
        const id2 = String(t.id || '').toLowerCase().trim();
        const id3 = String(t.code || '').toLowerCase().trim();
        const id4 = String(t.empTaskId || '').toLowerCase().trim();
        const id5 = String(t.rawTask?.taskId || '').toLowerCase().trim();
        const id6 = String(t.rawTask?.empTaskId || '').toLowerCase().trim();
        const id7 = String(t.rawTask?.taskCd || t.rawTask?.taskCode || '').toLowerCase().trim();

        return targetId === id1 || targetId === id2 || targetId === id3 ||
          targetId === id4 || targetId === id5 || targetId === id6 || targetId === id7;
      });

      if (matched) {
        openTaskDetail(matched);
        window.history.replaceState({}, document.title);
      }
    }
  }, [tasks, location.state]);

  const [projectsList, setProjectsList] = useState([]);
  const [milestonesList, setMilestonesList] = useState([]);
  const [upcomingTaskIds, setUpcomingTaskIds] = useState([]);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [previewModalFile, setPreviewModalFile] = useState(null);
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [taskFilter, setTaskFilter] = useState("All");

  const handleStatusFilterChange = (statusVal) => {
    if (selectedStatus === statusVal) {
      setSelectedStatus("All Statuses");
    } else {
      setSelectedStatus(statusVal);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ type: "success", title: "", message: "" });

  // Lock body scroll
  useEffect(() => {
    if (alertOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [alertOpen]);

  // ============================================
  // WORKFLOW ACTIONS - DYNAMIC
  // ============================================

  const sendNotification = async (empId, message, taskContext = null) => {
    if (!empId) return;
    try {
      const payload = {
        empId: parseInt(empId, 10),
        title: "Task Update",
        message
      };
      if (taskContext) {
        payload.entityTyp = taskContext.isIndividual ? "INDIVIDUAL_TASK" : "TASK";
        payload.entityId = parseInt(taskContext.taskId, 10);
      }
      await apiPost("/api/notifications", payload);
    } catch (e) {
      console.warn("Failed to send notification:", e);
    }
  };

  const handleStartTask = async (task, skipAlert = false) => {
    if (!task) return task;
    if (isExternalMode) {
      try {
        setLoadingAction(task.id || task.taskId);
        await fetch(`${apiBaseUrl}/api/external-tasks/${externalToken}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskSts: "WIP", remarks: updateRemarks })
        });
        setSelectedTask(prev => ({
          ...prev,
          status: "WIP",
          rawStatus: "WIP",
          rawTask: { ...prev.rawTask, taskSts: "WIP" }
        }));
        if (!skipAlert) triggerAlert("success", "Started", "Task moved to Work In Progress.");
      } catch (e) {
        console.error("External start error:", e);
      } finally {
        setLoadingAction(null);
      }
      return task;
    }
    try {
      setLoadingAction(task.id || task.taskId);
      const taskId = task.taskId || task.id;

      console.log(`🚀 Starting task ${taskId} via ProcessController`);
      await apiPost(`/api/process/task/${taskId}/start`, { empId: currentUserEmpId, isIndividual: task.isIndividual });

      const latestTasks = await fetchTasks();
      if (!skipAlert) triggerAlert("success", "Started", "Task moved to Work In Progress.");

      let returnedTask = task;
      if (latestTasks) {
        const found = latestTasks.find(t => t.id === task.id);
        if (found) {
          returnedTask = found;
          if (selectedTask && selectedTask.id === task.id) {
            setSelectedTask(found);
          }
        }
      }
      return returnedTask;
    } catch (err) {
      console.error("Error starting task:", err);
      if (!skipAlert) triggerAlert("danger", "Error", "Failed to start task: " + (err.response?.data?.message || err.message));
      return task;
    } finally {
      setLoadingAction(null);
    }
  };

  const processExecutorAttachments = async (baseRemarks, taskId, isIndividual) => {
    let finalRemarks = baseRemarks || "";
    if (updateAttachments && updateAttachments.length > 0) {
      let uploadedUrls = [];
      for (let i = 0; i < updateAttachments.length; i++) {
        const file = updateAttachments[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('refType', isIndividual ? 'TASK_ASSIGNMENT' : 'TASK_LIVE');
        formData.append('refId', taskId);
        try {
          const res = await apiPostMultipart('/api/storage/upload/attachment/task', formData);
          if (res && res.url) {
            uploadedUrls.push({ name: file.name, url: res.url });

            // Also save directly to attachment table in DB
            const attachPayload = { fileNm: file.name, atPath: res.url };
            const attachEndpoint = isIndividual
              ? `/api/attachments/assignment/${taskId}`
              : `/api/attachments/live-task/${taskId}`;
            try {
              await apiPost(attachEndpoint, attachPayload);
            } catch (dbErr) {
              console.error("Failed to save attachment to DB", dbErr);
            }
          }
        } catch (uploadErr) {
          console.error("Failed to upload attachment", uploadErr);
        }
      }
      if (uploadedUrls.length > 0) {
        finalRemarks += "\n\n||ATTACHMENTS: " + JSON.stringify(uploadedUrls) + "||";
      }
    }
    return finalRemarks;
  };

  const saveExecutorRemarksToTask = async (task, finalRemarks) => {
    if (!finalRemarks) return;
    const taskId = task.taskId || task.id;
    const originalTask = task.rawTask || task;
    const existingRem = task.isIndividual ? originalTask.remarks : originalTask.addlRem;

    // Prevent double appending if finalRemarks already starts with a bracket
    let newRem = finalRemarks;
    if (!finalRemarks.startsWith("[")) {
      newRem = existingRem ? `${existingRem}\n---\n[Executor]: ${finalRemarks}` : `[Executor]: ${finalRemarks}`;
    } else {
      newRem = existingRem ? `${existingRem}\n---\n${finalRemarks}` : finalRemarks;
    }

    const updatedTaskObj = { ...originalTask };
    if (task.isIndividual) {
      updatedTaskObj.remarks = newRem;
    } else {
      updatedTaskObj.addlRem = newRem;
    }
    const updatePath = task.isIndividual
      ? `/api/assignments/${taskId}`
      : `/api/task-live/${taskId}`;
    await apiPut(`${updatePath}?_t=${Date.now()}`, updatedTaskObj);
  };

  const handleSubmitReview = async (task) => {
    if (!task) return;
    if (isExternalMode) {
      try {
        setLoadingAction(task.id || task.taskId);
        await fetch(`${apiBaseUrl}/api/external-tasks/${externalToken}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskSts: "SUBMIT_REVIEW", subStatus: "Under Review", remarks: updateRemarks })
        });
        setSelectedTask(prev => ({
          ...prev,
          status: "UNDER_REVIEW",
          rawStatus: "UNDER_REVIEW",
          rawTask: { ...prev.rawTask, taskSts: "UNDER_REVIEW" }
        }));
        triggerAlert("success", "Submitted", "Task submitted for review.");
      } catch (err) {
        console.error("Error submitting for review:", err);
        triggerAlert("danger", "Error", "Failed to submit for review.");
      } finally {
        setLoadingAction(null);
      }
      return;
    }
    try {
      setLoadingAction(task.id || task.taskId);
      const taskId = task.taskId || task.id;
      const originalTask = task.rawTask || task;
      const isResubmit = originalTask.prcsYesActn === 'REWORK' || originalTask.prcsYesActn === 'REASSIGN';
      const endpoint = isResubmit ? 'resubmit' : 'submit';

      console.log(`📤 Submitting task ${taskId} for review via ProcessController`);
      const targetProcess = originalTask.reviewerId ? 'PENDING_REVIEWER' : 'PENDING_APPROVER';
      const finalRemarks = await processExecutorAttachments(updateRemarks, taskId, task.isIndividual);

      // Explicitly save the newly appended remarks to TaskLive/Assignment before hitting ProcessController
      await saveExecutorRemarksToTask(task, finalRemarks);

      await apiPost(`/api/process/task/${taskId}/${endpoint}`, {
        empId: currentUserEmpId,
        remarks: finalRemarks,
        prcsYesActn: targetProcess,
        isIndividual: task.isIndividual
      });

      const targetId = originalTask.reviewerId || originalTask.approverId;
      if (targetId) {
        await sendNotification(targetId, `Task submitted for review: ${task.id}`, task);
      }

      const latestTasks = await fetchTasks();
      triggerAlert("success", "Submitted", "Task submitted for review.");
      if (selectedTask && latestTasks) {
        const updatedTask = latestTasks.find(t => t.id === task.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error submitting for review:", err);
      triggerAlert("danger", "Error", "Failed to submit: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCompleteTask = async (task) => {
    if (!task) return;
    if (isExternalMode) {
      try {
        setLoadingAction(task.id || task.taskId);
        await fetch(`${apiBaseUrl}/api/external-tasks/${externalToken}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskSts: "COMPLETED", remarks: updateRemarks })
        });
        setSelectedTask(prev => ({
          ...prev,
          status: "COMPLETED",
          rawStatus: "COMPLETED",
          rawTask: { ...prev.rawTask, taskSts: "COMPLETED" }
        }));
        triggerAlert("success", "Completed", "Task completed successfully.");
      } catch (err) {
        console.error("Error completing task:", err);
        triggerAlert("danger", "Error", "Failed to complete task.");
      } finally {
        setLoadingAction(null);
      }
      return;
    }
    try {
      setLoadingAction(task.id || task.taskId);
      const taskId = task.taskId || task.id;

      // 1. Complete all checklists
      if (updateChecklist && updateChecklist.length > 0) {
        await Promise.all(updateChecklist
          .filter(item => item.id != null)
          .map(item => apiPatch(`/api/checklists/${item.id}/complete?_t=${Date.now()}`, {}))
        );
      }

      console.log(`✅ Completing task ${taskId} via ProcessController`);
      const finalRemarks = await processExecutorAttachments(updateRemarks || 'Task completed', taskId, task.isIndividual);

      // Explicitly save the newly appended remarks to TaskLive/Assignment before hitting ProcessController
      await saveExecutorRemarksToTask(task, finalRemarks);

      await apiPost(`/api/process/task/${taskId}/submit`, { empId: currentUserEmpId, remarks: finalRemarks, isIndividual: task.isIndividual });

      const latestTasks = await fetchTasks();
      triggerAlert("success", "Completed", "Task completed successfully.");
      if (selectedTask && latestTasks) {
        const updatedTask = latestTasks.find(t => t.id === task.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error completing task:", err);
      triggerAlert("danger", "Error", "Failed to complete: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReviewerApprove = async (task) => {
    if (!task) return;
    try {
      setLoadingAction(task.id || task.taskId);
      const taskId = task.taskId || task.id;
      const originalTask = task.rawTask || task;

      console.log(`✅ Reviewer approving task ${taskId} via ProcessController`);
      await apiPost(`/api/process/task/${taskId}/checker-action`, { decision: "YES", empId: currentUserEmpId, remarks: "", isIndividual: task.isIndividual });

      const isCompleted = !originalTask.approverId;
      if (isCompleted) {
        await sendNotification(originalTask.empId, `Task Closed: ${task.id}`, task);
      } else if (originalTask.approverId) {
        await sendNotification(originalTask.approverId, `Task ready for approval: ${task.id}`, task);
      }

      const latestTasks = await fetchTasks();
      triggerAlert("success", "Approved", "Task approved successfully.");
      if (selectedTask && latestTasks) {
        const updatedTask = latestTasks.find(t => t.id === task.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error approving task:", err);
      triggerAlert("danger", "Error", "Failed to approve: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApproverApprove = async (task) => {
    if (!task) return;
    try {
      setLoadingAction(task.id || task.taskId);
      const taskId = task.taskId || task.id;
      const originalTask = task.rawTask || task;

      console.log(`✅ Approver approving task ${taskId} via ProcessController`);
      await apiPost(`/api/process/task/${taskId}/reviewer-action`, { decision: "YES", empId: currentUserEmpId, remarks: "", isIndividual: task.isIndividual });

      await sendNotification(originalTask.empId, `Task Closed: ${task.id}`, task);
      if (originalTask.reviewerId) {
        await sendNotification(originalTask.reviewerId, `Task Closed: ${task.id}`, task);
      }

      const latestTasks = await fetchTasks();
      triggerAlert("success", "Closed", "Task closed successfully.");
      if (selectedTask && latestTasks) {
        const updatedTask = latestTasks.find(t => t.id === task.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error closing task:", err);
      triggerAlert("danger", "Error", "Failed to close: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReviewerReject = async (task, reason) => {
    if (!task) return;
    try {
      setLoadingAction(task.id || task.taskId);
      const taskId = task.taskId || task.id;
      const originalTask = task.rawTask || task;

      console.log(`❌ Reviewer rejecting task ${taskId} via ProcessController`);
      await apiPost(`/api/process/task/${taskId}/checker-action`, { decision: "NO", rejectionType: "REWORK", empId: currentUserEmpId, remarks: reason, isIndividual: task.isIndividual });
      await sendNotification(originalTask.empId, `Task rejected, needs rework: ${task.id}`, task);

      await fetchTasks();
      triggerAlert("warning", "Rejected", "Task sent back for rework.");
      if (selectedTask) {
        const updatedTask = tasks.find(t => t.id === task.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error rejecting task:", err);
      triggerAlert("danger", "Error", "Failed to reject: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReviewerReassign = async (task, reason, newExecutorId) => {
    if (!task) return;
    try {
      setLoadingAction(task.id || task.taskId);
      const taskId = task.taskId || task.id;

      console.log(`🔄 Reviewer reassigning task ${taskId} via ProcessController`);
      await apiPost(`/api/process/task/${taskId}/checker-action`, { decision: "NO", rejectionType: "REASSIGN", targetEmpId: newExecutorId, empId: currentUserEmpId, remarks: reason, isIndividual: task.isIndividual });

      if (newExecutorId) {
        await sendNotification(newExecutorId, `Task reassigned to you: ${task.id}`, task);
      }

      await fetchTasks();
      triggerAlert("info", "Reassigned", "Task reassigned successfully.");
      if (selectedTask) {
        const updatedTask = tasks.find(t => t.id === task.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error reassigning task:", err);
      triggerAlert("danger", "Error", "Failed to reassign: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApproverReject = async (task, reason) => {
    if (!task) return;
    try {
      setLoadingAction(task.id || task.taskId);
      const taskId = task.taskId || task.id;
      const originalTask = task.rawTask || task;

      console.log(`❌ Approver rejecting task ${taskId} via ProcessController`);
      await apiPost(`/api/process/task/${taskId}/reviewer-action`, { decision: "NO", rejectionType: "REWORK", empId: currentUserEmpId, remarks: reason, isIndividual: task.isIndividual });
      await sendNotification(originalTask.empId, `Task rejected by approver, needs rework: ${task.id}`, task);

      await fetchTasks();
      triggerAlert("warning", "Rejected", "Task sent back for rework.");
      if (selectedTask) {
        const updatedTask = tasks.find(t => t.id === task.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error rejecting task:", err);
      triggerAlert("danger", "Error", "Failed to reject: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResumeTask = async (task) => {
    if (!task) return;
    try {
      setLoadingAction(task.id || task.taskId);
      const originalTask = task.rawTask || task;

      // HOLD + NONE -> WORK_IN_PROGRESS + NONE
      const updatedTaskObj = {
        ...originalTask,
        taskSts: "WIP",
        prcsYesActn: "NONE"
      };

      const taskId = task.taskId || task.id;
      const updatePath = task.isIndividual
        ? `/api/assignments/${taskId}`
        : `/api/task-live/${taskId}`;

      console.log(`▶️ Resuming task ${taskId}`);
      await apiPut(`${updatePath}?_t=${Date.now()}`, updatedTaskObj);
      await fetchTasks();
      triggerAlert("success", "Resumed", "Task resumed.");
      if (selectedTask) {
        const updatedTask = tasks.find(t => t.id === task.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error resuming task:", err);
      triggerAlert("danger", "Error", "Failed to resume: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedTask) return;
    try {
      setLoadingAction(selectedTask.id || selectedTask.taskId);
      const originalTask = selectedTask.rawTask || selectedTask;

      await Promise.all(updateChecklist
        .filter(item => item.id != null)
        .map(item => {
          const path = `/api/checklists/${item.id}/${item.completed ? 'complete' : 'reopen'}?_t=${Date.now()}`;
          return apiPatch(path, {});
        })
      );

      const taskId = selectedTask.taskId || selectedTask.id;
      const finalRemarks = await processExecutorAttachments(updateRemarks, taskId, selectedTask.isIndividual);

      if (finalRemarks) {
        const existingRem = selectedTask.isIndividual ? originalTask.remarks : originalTask.addlRem;
        const newRem = existingRem ? `${existingRem}\n---\n[Executor]: ${finalRemarks}` : `[Executor]: ${finalRemarks}`;
        const updatedTaskObj = {
          ...originalTask
        };
        if (selectedTask.isIndividual) {
          updatedTaskObj.remarks = newRem;
        } else {
          updatedTaskObj.addlRem = newRem;
        }
        const updatePath = selectedTask.isIndividual
          ? `/api/assignments/${taskId}`
          : `/api/task-live/${taskId}`;
        await apiPut(`${updatePath}?_t=${Date.now()}`, updatedTaskObj);

        // Log to ProcessMaster for Remarks History
        try {
          await apiPost(`/api/process/task/${taskId}/update-progress`, {
            remarks: finalRemarks,
            isIndividual: selectedTask.isIndividual
          });
        } catch (e) {
          console.error("Failed to log progress to ProcessMaster", e);
        }
      }

      await fetchTasks();
      triggerAlert("success", "Updated", "Progress updated successfully.");
      if (selectedTask) {
        const updatedTask = tasks.find(t => t.id === selectedTask.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error updating progress:", err);
      triggerAlert("danger", "Error", "Failed to update: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveProgress = async () => {
    if (!selectedTask) return;
    if (isExternalMode) {
      try {
        setLoadingAction(selectedTask.id || selectedTask.taskId);
        await fetch(`${apiBaseUrl}/api/external-tasks/${externalToken}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskSts: selectedTask.rawStatus || "WIP", remarks: updateRemarks })
        });
        triggerAlert("success", "Success", "Task progress updated successfully.");
      } catch (err) {
        console.error("Error saving progress:", err);
        triggerAlert("danger", "Error", "Failed to update task progress.");
      } finally {
        setLoadingAction(null);
      }
      return;
    }
    try {
      setLoadingAction(selectedTask.id || selectedTask.taskId);
      const originalTask = selectedTask.rawTask || selectedTask;

      if (updateChecklist.length > 0) {
        await Promise.all(updateChecklist
          .filter(item => item.id != null)
          .map(item => {
            const path = `/api/checklists/${item.id}/${item.completed ? 'complete' : 'reopen'}?_t=${Date.now()}`;
            return apiPatch(path, {});
          })
        );
      }

      if (updateRemarks || (updateAttachments && updateAttachments.length > 0)) {
        const taskId = selectedTask.taskId || selectedTask.id;
        const finalRemarks = await processExecutorAttachments(updateRemarks, taskId, selectedTask.isIndividual);
        await saveExecutorRemarksToTask(selectedTask, finalRemarks);
      }

      const latestTasks = await fetchTasks();
      triggerAlert("success", "Success", "Task progress updated successfully.");

      if (originalTask?.reviewerId) {
        await sendNotification(originalTask.reviewerId, `${sessionStorage.getItem("userName") || "Executor"} updated progress for task: ${originalTask.taskNm || originalTask.task_nm || "Task"}`, selectedTask);
      }
      if (originalTask?.approverId) {
        await sendNotification(originalTask.approverId, `${sessionStorage.getItem("userName") || "Executor"} updated progress for task: ${originalTask.taskNm || originalTask.task_nm || "Task"}`, selectedTask);
      }

      if (selectedTask && latestTasks) {
        const updatedTask = latestTasks.find(t => t.id === selectedTask.id);
        if (updatedTask) setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error saving progress:", err);
      triggerAlert("danger", "Error", "Failed to update task: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleChecklist = async (id) => {
    if (!id) return;
    if (isExternalMode) {
      if (isExpired || selectedTask?.rawStatus === "COMPLETED" || selectedTask?.rawStatus === "CLOSED") return;
      const targetItem = updateChecklist.find(c => c.id === id);
      const nextCompleted = !targetItem?.completed;

      setUpdateChecklist(prev => {
        const newList = prev.map(item =>
          item.id === id ? { ...item, completed: nextCompleted } : item
        );
        const progress = computeProgress(newList, selectedTask);
        setUpdateProgressVal(progress);
        return newList;
      });

      try {
        await fetch(`${apiBaseUrl}/api/external-tasks/${externalToken}/checklist/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chkSts: nextCompleted })
        });
      } catch (e) {
        console.error("Failed to update external checklist item", e);
      }
      return;
    }

    if (selectedTask?.status === "WIP" && selectedTask?.rawTask?.prcsYesActn === "PENDING_APPROVER") return;
    if (selectedTask?.status === "COMPLETED") return;
    const executorId = selectedTask?.rawTask?.empId || selectedTask?.rawTask?.assignedTo;
    if (String(executorId) !== String(currentUserEmpId)) return;

    setUpdateChecklist(prev => {
      const newList = prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      const progress = computeProgress(newList, selectedTask);
      setUpdateProgressVal(progress);
      return newList;
    });
  };

  const handleSendReminder = async (targetId, role) => {
    if (!targetId) return;
    try {
      await sendNotification(targetId, `Reminder: Task "${selectedTask.title}" (${selectedTask.id}) is pending for your action.`, selectedTask);
      triggerAlert("success", "Sent", `Reminder sent to ${role}!`);
      setShowDetailView(false);
    } catch (err) {
      console.error("Failed to send reminder:", err);
      triggerAlert("danger", "Error", "Failed to send reminder.");
    }
  };

  const handleSubmitDeny = async (actionType) => {
    if (!selectedTask) return;
    try {
      const originalTask = selectedTask.rawTask || selectedTask;
      const newStatus = actionType || denyData.type || "REASSIGN";
      const taskId = selectedTask.taskId || (originalTask && originalTask.taskId) || (typeof selectedTask.id === 'number' ? selectedTask.id : Number(String(selectedTask.id).replace(/\D/g, '')));

      console.log(`📝 Processing denial for task ${taskId} (${newStatus}) via ProcessController`);

      let finalRemarks = denyData.reason || "";

      // Upload attachments FIRST so we can include them in the remarks history
      if (denyData.attachments && denyData.attachments.length > 0) {
        let uploadedUrls = [];
        for (let i = 0; i < denyData.attachments.length; i++) {
          const file = denyData.attachments[i];
          const formData = new FormData();
          formData.append('file', file);
          formData.append('refType', selectedTask.isIndividual ? 'TASK_ASSIGNMENT' : 'TASK_LIVE');
          formData.append('refId', taskId);
          try {
            const res = await apiPostMultipart('/api/storage/upload/attachment/task', formData);
            if (res && res.url) {
              uploadedUrls.push({ name: file.name, url: res.url });

              // Also save directly to attachment table in DB
              const attachPayload = {
                fileNm: file.name,
                atPath: res.url
              };
              const attachEndpoint = selectedTask.isIndividual
                ? `/api/attachments/assignment/${taskId}`
                : `/api/attachments/live-task/${taskId}`;

              try {
                await apiPost(attachEndpoint, attachPayload);
              } catch (dbErr) {
                console.error("Failed to save attachment to DB", dbErr);
              }
            }
          } catch (uploadErr) {
            console.error("Failed to upload attachment", uploadErr);
          }
        }

        if (uploadedUrls.length > 0) {
          finalRemarks += "\n\n||ATTACHMENTS: " + JSON.stringify(uploadedUrls) + "||";
        }
      }
      const targetMilestoneObj = reworkMilestones.find(m => String(m.mId || m.mid || m.id || m.drftMId) === String(denyData.milestone));
      const poolTasks = (reworkProjectTasks && reworkProjectTasks.length > 0) ? reworkProjectTasks : reworkTasks;
      const targetTaskObj = poolTasks.find(t => String(t.taskId || t.id) === String(denyData.targetTaskId || denyData.deliverable));

      // Include selected target milestone and task details in remarks if present
      let targetDetails = [];
      const mDisplayTitle = targetMilestoneObj ? `${targetMilestoneObj.mlstnCd || ''} ${targetMilestoneObj.mlstnTtl || targetMilestoneObj.title || ''}`.trim() : denyData.milestone;
      const tDisplayTitle = targetTaskObj ? `${targetTaskObj.taskCd || ''} ${targetTaskObj.taskNm || targetTaskObj.title || ''}`.trim() : denyData.deliverable;
      if (mDisplayTitle) targetDetails.push(`Target Milestone: ${mDisplayTitle}`);
      if (tDisplayTitle) targetDetails.push(`Target Task: ${tDisplayTitle}`);
      if (targetDetails.length > 0) {
        finalRemarks = `[${targetDetails.join(" | ")}]\n${finalRemarks}`;
      }

      const isApprover = (originalTask.prcsYesActn === "PENDING_APPROVER") || (originalTask.approverId && String(originalTask.approverId) === String(currentUserEmpId)) || (originalTask.approver && String(originalTask.approver) === String(currentUserEmpId));
      const endpoint = isApprover ? 'reviewer-action' : 'checker-action';

      const targetEmpIdVal = (newStatus === "REASSIGN" && denyData.targetEmpId)
        ? Number(denyData.targetEmpId)
        : (originalTask.empId || originalTask.assignedTo || originalTask.extEmpId || null);

      const payload = {
        decision: "NO",
        rejectionType: newStatus === "REWORK" ? "REWORK" : "REASSIGN",
        empId: currentUserEmpId,
        remarks: finalRemarks,
        isIndividual: selectedTask.isIndividual === true,
        targetMId: denyData.milestone ? Number(denyData.milestone) : null,
        targetTaskId: denyData.targetTaskId ? Number(denyData.targetTaskId) : (targetTaskObj ? Number(targetTaskObj.taskId || targetTaskObj.id) : null),
        targetEmpId: targetEmpIdVal ? Number(targetEmpIdVal) : null,
        targetMilestone: mDisplayTitle || denyData.milestone,
        targetDeliverable: tDisplayTitle || denyData.deliverable,
        impact: denyData.impact || "Medium"
      };

      await apiPost(`/api/process/task/${taskId}/${endpoint}`, payload);

      // Uncheck all checklists in local state
      setUpdateChecklist(prev => prev.map(c => ({ ...c, completed: false })));

      // If a Target Deliverable / Task was selected for Rework (e.g. TSK-001 in Milestone 1), append remark to target task as well
      const realTargetId = denyData.targetTaskId || (targetTaskObj ? (targetTaskObj.taskId || targetTaskObj.id) : null);
      if (realTargetId && String(realTargetId) !== String(taskId)) {
        const targetRaw = targetTaskObj ? (targetTaskObj.rawTask || targetTaskObj) : null;
        const isTargetInd = targetTaskObj ? (targetTaskObj.isIndividual || targetRaw?.taskSource === "INDIVIDUAL") : false;
        const senderName = sessionStorage.getItem("userName") || (isApprover ? "Approver" : "Reviewer");
        const targetRemHeader = `[Rework - ${senderName}]: ${finalRemarks}`;

        // Save to target task's DB record (addlRem/remarks)
        try {
          const existingTargetRem = targetRaw ? (isTargetInd ? targetRaw.remarks : targetRaw.addlRem) : "";
          const newTargetRem = existingTargetRem ? `${existingTargetRem}\n---\n${targetRemHeader}` : targetRemHeader;
          const targetUpdatePath = isTargetInd ? `/api/assignments/${realTargetId}` : `/api/task-live/${realTargetId}`;
          const targetPayload = targetRaw ? {
            ...targetRaw,
            taskSts: "WIP",
            prcsYesActn: "NONE",
            [isTargetInd ? "remarks" : "addlRem"]: newTargetRem
          } : null;
          if (targetPayload) {
            await apiPut(`${targetUpdatePath}?_t=${Date.now()}`, targetPayload);
          }
        } catch (errTargetRem) {
          console.error("Failed to update target task remarks in DB", errTargetRem);
        }

        // Log progress entry to ProcessMaster for target task so it shows in Process History
        try {
          await apiPost(`/api/process/task/${realTargetId}/update-progress`, {
            remarks: targetRemHeader,
            isIndividual: isTargetInd
          });
        } catch (errProcessMaster) {
          console.error("Failed to log progress to ProcessMaster for target task", errProcessMaster);
        }
      }

      if (newStatus === "REASSIGN") {
        const executorId = targetEmpIdVal || originalTask.empId || originalTask.assignedTo;
        if (executorId) {
          await sendNotification(executorId, `Task reassigned to you: ${selectedTask.id}`, selectedTask);
        }
      } else {
        const reworkExecutorId = denyData.targetEmpId || targetTaskObj?.empId || originalTask.empId || originalTask.assignedTo;
        if (reworkExecutorId) {
          await sendNotification(reworkExecutorId, `Task rejected, needs rework: ${selectedTask.id}`, selectedTask);
        }
      }

      setShowDenyForm(false);
      triggerAlert("success", "Success", `Task ${newStatus === "REWORK" ? 'sent back for rework' : 'reassigned'}.`);

      const latestTasks = await fetchTasks();
      try {
        const historyData = await apiGet(`/api/process/task/${taskId}?isIndividual=${selectedTask.isIndividual === true}`);
        setProcessHistory(Array.isArray(historyData) ? historyData : []);
      } catch (hErr) { }

      if (latestTasks && selectedTask) {
        const updatedTask = latestTasks.find(t => String(t.taskId || t.id) === String(taskId) || t.id === selectedTask.id);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        } else {
          setShowDetailView(false);
        }
      }
    } catch (err) {
      console.error("Error processing denial:", err);
      triggerAlert("danger", "Error", "Failed to process: " + (err.response?.data?.message || err.message));
    }
  };

  const computeProgress = (checklist, task) => {
    const rawTask = task?.rawTask || task || {};
    const rawSts = rawTask.taskSts || rawTask.status || task?.rawStatus || task?.status;
    const stsStr = typeof rawSts === 'object' && rawSts !== null
      ? (rawSts.statusNm || rawSts.status_nm || "OPEN")
      : (rawSts || "OPEN");
    const taskSts = String(stsStr).toUpperCase();

    // Always 100 for closed tasks
    if (taskSts === 'COMPLETED' || taskSts === 'CLOSED') return 100;

    const hasReviewer = !!(rawTask.reviewerId || rawTask.reviewer);
    const hasApprover = !!(rawTask.approverId || rawTask.approver);
    const hasDependency = hasReviewer || hasApprover;

    // ─── No dependency: executor checklist fills 0–100% ───
    if (!hasDependency) {
      if (!checklist || checklist.length === 0) return 0;
      return Math.round((checklist.filter(i => i.completed).length / checklist.length) * 100);
    }

    // ─── Has dependency: executor fills 0–80%, reviewer +10%, approver +10% ───
    const currentProcess = (rawTask.prcsYesActn || "NONE").toUpperCase();

    // Approver stage done → 100%
    if (taskSts === 'COMPLETED' || taskSts === 'CLOSED') return 100;

    // Under approver review → 90%
    if (currentProcess === 'PENDING_APPROVER') return 90;

    // Under reviewer review → 80% (submitted, waiting for reviewer)
    if (currentProcess === 'PENDING_REVIEWER' || taskSts === 'UNDER_REVIEW' || taskSts === 'SUBMIT_REVIEW') return 80;

    // Executor working: checklist contributes to 0–80%
    if (!checklist || checklist.length === 0) return 0;
    const completed = checklist.filter(i => i.completed).length;
    // Scale to max 79% (so hitting 100% checklist shows 79, not 80 — 80 means submitted)
    const executorPct = Math.round((completed / checklist.length) * 79);
    return executorPct;
  };


  const triggerAlert = (type, title, message) => {
    setAlertConfig({ type, title, message });
    setAlertOpen(true);
  };

  // ============================================
  // FILTERING & PAGINATION
  // ============================================

  const visibleTasks = tasks;

  const isCompletedTab = (task) => {
    const rawTask = task.rawTask || task;
    const rawSts = rawTask.taskSts || rawTask.status || task.rawStatus || task.status;
    const stsStr = typeof rawSts === 'object' && rawSts !== null
      ? (rawSts.statusNm || rawSts.status_nm || "OPEN")
      : (rawSts || "OPEN");
    const sts = String(stsStr).toUpperCase();
    return sts === "COMPLETED" || sts === "CLOSED" || sts === "DONE" || task.progress === 100;
  };

  const isUpcomingTab = (task) => {
    if (isCompletedTab(task)) return false;

    const rawTask = task.rawTask || task;
    const sts = String(rawTask.taskSts || rawTask.status || task.rawStatus || task.status || "").toUpperCase();
    if (sts === "WIP" || sts === "IN_PROGRESS" || sts.includes("PROGRESS") || sts === "UNDER_REVIEW" || sts === "REWORK" || sts === "REASSIGN" || sts === "DRAFT") {
      return false;
    }

    const startDtStr = rawTask.stDt || rawTask.startDate || rawTask.start_dt || task.startDate || task.startDt;
    if (startDtStr) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dateOnly = String(startDtStr).split('T')[0];
        const [year, month, day] = dateOnly.split('-');
        const startDateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        startDateObj.setHours(0, 0, 0, 0);

        if (startDateObj > today) {
          return true;
        } else {
          return false;
        }
      } catch (e) { }
    }

    if (sts === "UPCOMING" || task.status === "UPCOMING" || task.status === "Upcoming" || task.isUpcoming === true) {
      return true;
    }

    return false;
  };

  const isToDo = (task) => {
    if (isCompletedTab(task)) return false;
    if (isUpcomingTab(task)) return false;
    return true;
  };

  const getTaskStatusFilter = (task) => {
    const rawTask = task.rawTask || task;
    const rawSts = rawTask.taskSts || rawTask.status || task.status;
    const stsStr = typeof rawSts === 'object' && rawSts !== null
      ? (rawSts.statusNm || rawSts.status_nm || "OPEN")
      : (rawSts || "OPEN");
    const sts = String(stsStr).toUpperCase();

    const process = (rawTask.prcsYesActn || "NONE").toUpperCase();

    if (sts === "OPEN" || sts === "DRAFT") {
      return "OPEN";
    }

    if (sts === "COMPLETED" || sts === "CLOSED") {
      return "COMPLETED";
    }

    if (sts === "WIP" || sts === "IN_PROGRESS") {
      if (process === "PENDING_REVIEWER" || process === "PENDING_APPROVER" || process === "UNDER_REVIEW") {
        return "UNDER_REVIEW";
      }
      if (process === "REASSIGN") {
        return "REASSIGNED";
      }
      return "IN_PROGRESS";
    }

    if (sts === "HOLD") {
      return "HOLD";
    }

    return sts;
  };

  const isTaskOverdue = (task) => {
    const rawTask = task.rawTask || task;
    if (!rawTask.endDt) return false;
    const rawSts = rawTask.taskSts || rawTask.status || task.status;
    const stsStr = typeof rawSts === 'object' && rawSts !== null
      ? (rawSts.statusNm || rawSts.status_nm || "OPEN")
      : (rawSts || "OPEN");
    const sts = String(stsStr).toUpperCase();
    if (sts === "COMPLETED" || sts === "CLOSED") return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(rawTask.endDt);
    dueDate.setHours(0, 0, 0, 0);

    return today > dueDate;
  };

  const filteredTasks = tasks.filter(task => {
    // 1. Basic filters
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!task.title?.toLowerCase().includes(q) &&
        !task.id?.toLowerCase().includes(q) &&
        !task.taskCode?.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (selectedProject !== "All Projects" && task.project !== selectedProject) return false;
    if (selectedMilestone !== "All Milestones" && task.milestone !== selectedMilestone) return false;
    if (selectedPriority !== "All Priorities" && task.priority !== selectedPriority) return false;

    if (taskFilter !== "All" && selectedStatus !== "Completed") {
      const statusFilter = getTaskStatusFilter(task);
      if (taskFilter === "OVERDUE") {
        if (!isTaskOverdue(task)) return false;
      } else if (taskFilter === "IN_PROGRESS" && statusFilter === "REASSIGNED") {
        // allow Reassigned tasks in IN_PROGRESS pill filter
      } else if (statusFilter !== taskFilter) {
        return false;
      }
    }

    // 2. Status card filter (To Do, Upcoming, Completed, All)
    if (selectedStatus !== "All Statuses" && selectedStatus !== "All Tasks") {
      if (selectedStatus === "To Do") {
        if (!isToDo(task)) return false;
      } else if (selectedStatus === "Upcoming") {
        if (!isUpcomingTab(task)) return false;
      } else if (selectedStatus === "Completed" || selectedStatus === "Closed") {
        if (!isCompletedTab(task)) return false;
      }
    }

    if (selectedDueDate && task.dueDate !== selectedDueDate) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aOverdue = isTaskOverdue(a);
    const bOverdue = isTaskOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = sortedTasks.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleResetFilters = (e) => {
    if (e) e.preventDefault();
    setSearchInput("");
    setSearchQuery("");
    setSelectedProject("All Projects");
    setSelectedMilestone("All Milestones");
    setSelectedPriority("All Priorities");
    setSelectedStatus("All Statuses");
    setSelectedDueDate("");
    setTaskFilter("All");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedProject, selectedMilestone, selectedPriority, selectedStatus, selectedDueDate, taskFilter]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const getCurrentStatusDisplay = () => {
    if (!selectedTask) return "OPEN";
    const prcsFlg = selectedTask.rawTask?.prcsFlg || false;
    return getDisplayStatus(updateProgressVal, selectedTask.status, prcsFlg);
  };

  // ============================================
  // OPEN TASK DETAIL SCREEN
  // ============================================
  const openTaskDetail = async (task) => {
    if (!task) return;
    setSelectedTask(task);
    setUpdateRemarks("");
    setUpdateAttachments([]);
    setShowDenyForm(false);
    setDenyData({ type: "REWORK", reason: "", milestone: "", deliverable: "", targetTaskId: "", targetEmpId: "", impact: "Medium" });

    // Pre-load project milestones for rework
    const rawT = task.rawTask || task;
    let pId = task.projectId || task.prjId || rawT.prjId || rawT.projectId;
    const mId = task.milestoneId || task.mId || rawT.mId || rawT.mid;
    if (!pId && mId && Array.isArray(milestonesList)) {
      const foundM = milestonesList.find(m => String(m.mId || m.id || m.mid || "") === String(mId));
      if (foundM) pId = foundM.prjId || foundM.projectId || foundM.prj_id;
    }
    if (pId) {
      apiGet(`/api/milestone-live/by-project/${pId}`).then(pMiles => {
        if (Array.isArray(pMiles) && pMiles.length > 0) {
          pMiles.sort((a, b) => {
            const cdA = String(a.mlstnCd || a.code || a.id || "").trim();
            const cdB = String(b.mlstnCd || b.code || b.id || "").trim();
            if (cdA && cdB) {
              const cmp = cdA.localeCompare(cdB, undefined, { numeric: true, sensitivity: 'base' });
              if (cmp !== 0) return cmp;
            }
            if (a.stDt && b.stDt) {
              const cmp = String(a.stDt).localeCompare(String(b.stDt));
              if (cmp !== 0) return cmp;
            }
            return Number(a.mId || a.id || 0) - Number(b.mId || b.id || 0);
          });
          setReworkMilestones(pMiles);
        }
      }).catch(() => {});
    }

    try {
      const taskId = task.taskId || task.id;
      const path = task.isIndividual
        ? `/api/checklists/assignments/${taskId}`
        : `/api/checklists/live-task/${taskId}`;

      const items = await apiGet(path);
      const mapped = (items || []).map(item => ({
        id: item.chkId || item.id,
        text: item.chkNm || item.name || item.text,
        completed: item.chkSts || item.completed || false
      }));
      setUpdateChecklist(mapped);
      const progress = computeProgress(mapped, task);
      setUpdateProgressVal(progress);
    } catch (err) {
      console.error("Failed to load checklist:", err);
      setUpdateChecklist([]);
      setUpdateProgressVal(0);
    }

    // Load Process History
    try {
      const taskId = task.taskId || task.id;
      const historyData = await apiGet(`/api/process/task/${taskId}?isIndividual=${task.isIndividual === true}`);
      let procList = Array.isArray(historyData) ? historyData : [];

      // Failsafe for cross-task rework: search project tasks process history for events mentioning this task code or title
      const taskCodeStr = String(task.taskCode || task.id || "").toLowerCase();
      const taskTitleStr = String(task.title || task.taskNm || "").toLowerCase();

      const allTasksSource = (tasks && tasks.length > 0) ? tasks : allProjectTasks;
      if (allTasksSource && allTasksSource.length > 0) {
        const otherProjectTasks = allTasksSource.filter(t => {
          const r = t.rawTask || t;
          const id = String(t.id || t.taskId || r.taskId || r.id || "");
          return id && id !== String(taskId);
        });

        const extraResults = await Promise.allSettled(
          otherProjectTasks.slice(0, 10).map(t => {
            const r = t.rawTask || t;
            const id = r.taskId || r.id || t.taskId || t.id;
            return apiGet(`/api/process/task/${id}?isIndividual=${t.isIndividual === true}`);
          })
        );

        extraResults.forEach(res => {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            res.value.forEach(evt => {
              const remText = String(evt.remarks || "").toLowerCase();
              if (remText.includes("target milestone") || remText.includes("target task")) {
                if (remText.includes(taskCodeStr) || (taskTitleStr && (remText.includes(taskTitleStr) || (taskTitleStr.includes("m1") && remText.includes("m1"))))) {
                  if (!procList.some(p => p.prId === evt.prId || (p.remarks === evt.remarks && p.empId === evt.empId))) {
                    procList.push(evt);
                  }
                }
              }
            });
          }
        });
      }

      setProcessHistory(procList);
    } catch (err) {
      console.error("Failed to load process history:", err);
      setProcessHistory([]);
    }

    // Load attachments
    setLoadingAttachments(true);
    setTaskAttachments([]);
    try {
      const rawT = task.rawTask || task;
      const tId = rawT.taskId || rawT.empTaskId || rawT.id || task.taskId || task.id;

      let attList = [];
      const isInd = task.isIndividual || rawT.taskSource === "INDIVIDUAL";
      const primaryPath = isInd
        ? `/api/attachments/assignment/${tId}`
        : `/api/attachments/live-task/${tId}`;
      const fallbackPath = isInd
        ? `/api/attachments/live-task/${tId}`
        : `/api/attachments/draft-task/${tId}`;

      try {
        const res = await apiGet(primaryPath);
        if (Array.isArray(res) && res.length > 0) attList = res;
      } catch (e1) { }

      if (attList.length === 0) {
        try {
          const res2 = await apiGet(fallbackPath);
          if (Array.isArray(res2) && res2.length > 0) attList = res2;
        } catch (e2) { }
      }

      // Also check if rawTask or task has direct attachment url/path
      const directPath = rawT.atPath || rawT.attachmentUrl || rawT.filePath || rawT.photoUrl || task.atPath;
      if (directPath) {
        const fileName = rawT.fileNm || rawT.fileName || "Task Attachment";
        if (!attList.some(a => a.atPath === directPath)) {
          attList.push({ fileId: 'raw_1', fileNm: fileName, atPath: directPath });
        }
      }

      setTaskAttachments(attList);
    } catch (err) {
      console.error("Failed to load attachments:", err);
      setTaskAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }

    // Load team members
    setLoadingTeamMembers(true);
    setTaskTeamMembers([]);
    try {
      const tId = task.rawTask?.taskId || task.rawTask?.empTaskId || task.rawTask?.id || task.taskId || task.id;
      const isInd = task.isIndividual || task.rawTask?.taskSource === "INDIVIDUAL";
      const path = isInd
        ? `/api/assignments/${tId}/contributors`
        : `/api/task-live/${tId}/contributors`;
      const res = await apiGet(path);
      if (Array.isArray(res)) {
        setTaskTeamMembers(res);
      }
    } catch (err) {
      console.error("Failed to load team members:", err);
      setTaskTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }

    setShowDetailView(true);
  };

  const parseRemarksHistory = (rawStr, task, employeesList) => {
    if (!rawStr || typeof rawStr !== 'string') return [];

    const rawBlocks = rawStr.split(/\n---\n|\n(?=\[[^\]]+\]:)/).map(s => s.trim()).filter(Boolean);
    const parsed = [];

    rawBlocks.forEach((block, idx) => {
      let name = "";
      let role = "TEAM";
      let action = "Remark";
      let text = block;

      const bracketMatch = block.match(/^\[([^\]]+)\][:\s\n]*([\s\S]*)/);
      if (bracketMatch) {
        const header = bracketMatch[1].trim();
        text = bracketMatch[2].trim();

        if (header.includes('Target Milestone') || header.includes('Target Task')) {
          action = "Rework";
          name = "Reviewer";
          text = `[${header}]\n${text}`;
        } else if (header.includes('-')) {
          const parts = header.split('-');
          action = parts[0].trim();
          name = parts.slice(1).join('-').trim();
        } else {
          name = header;
        }
      }

      let attachments = [];
      const attachMatch = text.match(/\|\|ATTACHMENTS:\s*(\[.*?\])\|\|/);
      if (attachMatch) {
        try {
          attachments = JSON.parse(attachMatch[1]);
        } catch (e) { }
        text = text.replace(attachMatch[0], "").trim();
      }

      const rawTask = task?.rawTask || task || {};
      const appName = getEmployeeName(rawTask.approverId || rawTask.approver, employeesList);
      const revName = getEmployeeName(rawTask.reviewerId || rawTask.reviewer, employeesList);
      const exeName = getEmployeeName(rawTask.empId || rawTask.assignedTo, employeesList);

      if (name) {
        const lowerName = name.toLowerCase();
        if (appName && appName.toLowerCase().includes(lowerName)) role = "APPROVER";
        else if (revName && revName.toLowerCase().includes(lowerName)) role = "REVIEWER";
        else if (exeName && exeName.toLowerCase().includes(lowerName)) role = "EXECUTOR";
        else if (lowerName.includes("approver")) { role = "APPROVER"; name = appName && appName !== "Unknown" ? appName : name; }
        else if (lowerName.includes("reviewer")) { role = "REVIEWER"; name = revName && revName !== "Unknown" ? revName : name; }
        else if (lowerName.includes("executor")) { role = "EXECUTOR"; name = exeName && exeName !== "Unknown" ? exeName : name; }
      } else {
        name = "Team Member";
      }

      let photo = null;
      if (name !== "Team Member") {
        const lowerName = name.toLowerCase();
        if (appName && appName.toLowerCase().includes(lowerName)) { photo = getEmployeePhoto(rawTask.approverId || rawTask.approver, employeesList); }
        else if (revName && revName.toLowerCase().includes(lowerName)) { photo = getEmployeePhoto(rawTask.reviewerId || rawTask.reviewer, employeesList); }
        else if (exeName && exeName.toLowerCase().includes(lowerName)) { photo = getEmployeePhoto(rawTask.empId || rawTask.assignedTo, employeesList); }

        if (!photo) {
          const empMatch = employeesList.find(e => getEmployeeName(e.empId || e.id, employeesList).toLowerCase().includes(lowerName));
          if (empMatch) photo = getEmployeePhoto(empMatch.empId || empMatch.id, employeesList);
        }
      }

      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || "TM";

      if (text === "Task started — moved to WIP" || text === "Task started - moved to WIP") {
        text = "";
        action = "";
      }

      let finalAction = action.charAt(0).toUpperCase() + action.slice(1);

      if (finalAction.toLowerCase().includes("reject")) {
        finalAction = (task && task.isIndividual) ? "Reassign" : "Rework";
      } else if (finalAction.toLowerCase().includes("reassign")) {
        finalAction = "Reassign";
      }

      if (role.toUpperCase() === "EXECUTOR" && (finalAction.toLowerCase().includes("approve") || finalAction.toLowerCase().includes("submit"))) {
        finalAction = "";
      }

      if (text.trim().length > 0 || attachments.length > 0 || (finalAction && (finalAction.toLowerCase().includes("reassign") || finalAction.toLowerCase().includes("rework")))) {
        parsed.push({
          id: idx,
          name,
          initials,
          photo,
          role: role.toUpperCase(),
          action: finalAction,
          text,
          attachments
        });
      }
    });

    return parsed;
  };

  const parseProcessHistory = (historyArr, task, employeesList) => {
    if (!Array.isArray(historyArr) || historyArr.length === 0) return [];

    return historyArr.map((event, idx) => {
      const empId = event.empId || event.extEmpId;
      const rawTask = task?.rawTask || task || {};

      let role = "TEAM";
      let name = "Team Member";

      if (empId) {
        const emp = employeesList.find(e => e.empId === empId || e.id === empId);
        if (emp) {
          name = getEmployeeName(emp.empId || emp.id, employeesList);
        }
      }

      const appName = getEmployeeName(rawTask.approverId || rawTask.approver, employeesList);
      const revName = getEmployeeName(rawTask.reviewerId || rawTask.reviewer, employeesList);
      const exeName = getEmployeeName(rawTask.empId || rawTask.assignedTo, employeesList);

      if (name && name !== "Team Member") {
        if (appName && appName === name) role = "APPROVER";
        else if (revName && revName === name) role = "REVIEWER";
        else if (exeName && exeName === name) role = "EXECUTOR";
      }

      let action = "Remark";
      let actionColor = "#D97706";
      let actionBg = "#FEF3C7";
      if (event.prcsSts === "YES") {
        action = role === "EXECUTOR" ? "" : "Approved";
        actionColor = "#059669";
        actionBg = "#D1FAE5";
      }
      else if (event.prcsSts === "NO") {
        action = (task && task.isIndividual) ? "Reassign" : "Rework / Reassign";
        if (task && !task.isIndividual && (task.rawTask?.addlRem || task.rawTask?.remarks)) {
          const rawStr = task.rawTask.addlRem || task.rawTask.remarks;
          if (rawStr.includes("[Rejected") && rawStr.includes(event.remarks || "")) {
            action = "Rework";
          } else if (rawStr.includes("[Reassigned") && rawStr.includes(event.remarks || "")) {
            action = "Reassign";
          }
        }
        actionColor = action === "Reassign" ? "#4F46E5" : "#F97316";
        actionBg = action === "Reassign" ? "#EEF2FF" : "#FFF7ED";
      }
      else if (event.prcsSts === "UPD") { action = "Updated Progress"; actionColor = "#2563EB"; actionBg = "#DBEAFE"; }
      else if (event.prcsSts === "REWORK") { action = "Rework"; actionColor = "#F97316"; actionBg = "#FFF7ED"; }
      else if (event.prcsSts === "REASSIGN") { action = "Reassign"; actionColor = "#4F46E5"; actionBg = "#EEF2FF"; }

      // If backend explicitly marked role via getRoleIdForRole
      if (event.rId === 1) role = "EXECUTOR"; // assuming 1 is executor if we define it, else rely on name mapping

      let text = event.remarks || "";
      let attachments = [];
      const attachMatch = text.match(/\|\|ATTACHMENTS:\s*(\[.*?\])\|\|/);
      if (attachMatch) {
        try {
          attachments = JSON.parse(attachMatch[1]);
        } catch (e) { }
        text = text.replace(attachMatch[0], "").trim();
      }

      text = text.replace(/^\[([^\]]+)\]:\s*/, "");

      // Filter out auto-generated 'Task started — moved to WIP' unless user added more
      if (text === "Task started — moved to WIP" || text === "Task started - moved to WIP") {
        text = "";
        action = "";
      }

      const photo = empId ? getEmployeePhoto(empId, employeesList) : null;
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || "TM";

      return {
        id: event.prId || idx,
        name,
        initials,
        photo,
        role: role.toUpperCase(),
        action,
        actionColor,
        actionBg,
        text,
        attachments,
        date: event.remarksTs || event.addDt
      };
    });
  };

  const handleAddTeamMember = async () => {
    if (!selectedNewMember || !selectedTask) return;
    setTeamMemberError("");

    try {
      const rawT = selectedTask.rawTask || selectedTask;
      const tId = rawT.taskId || rawT.empTaskId || rawT.id || selectedTask.taskId || selectedTask.id;
      const isInd = selectedTask.isIndividual || rawT.taskSource === "INDIVIDUAL";

      const adderRole = "Collaborator";

      const payload = taskTeamMembers.map(tm => ({
        empId: tm.empId,
        asgnRmk: tm.asgnRmk || "Collaborator"
      }));

      payload.push({
        empId: parseInt(selectedNewMember, 10),
        asgnRmk: adderRole
      });

      if (isInd) {
        payload.forEach(p => p.empTaskId = tId);
      } else {
        payload.forEach(p => p.taskId = tId);
      }

      const path = isInd
        ? `/api/assignments/${tId}/contributors`
        : `/api/task-live/${tId}/contributors`;

      await apiPost(path, payload);

      // Re-fetch to get correct DB IDs
      const res = await apiGet(path);
      if (Array.isArray(res)) {
        setTaskTeamMembers(res);
      }

      setShowAddMemberModal(false);
      setSelectedNewMember("");
    } catch (err) {
      console.error("Failed to add team member", err);
      setTeamMemberError(err.message || err.toString());
    }
  };

  const handleRemoveTeamMember = async (tmId) => {
    if (!selectedTask || !tmId) return;
    setTeamMemberError("");
    try {
      const rawT = selectedTask.rawTask || selectedTask;
      const tId = rawT.taskId || rawT.empTaskId || rawT.id || selectedTask.taskId || selectedTask.id;
      const isInd = selectedTask.isIndividual || rawT.taskSource === "INDIVIDUAL";

      const path = isInd
        ? `/api/assignments/${tId}/contributors/${tmId}`
        : `/api/task-live/${tId}/contributors/${tmId}`;

      await apiDelete(path);

      const getPath = isInd
        ? `/api/assignments/${tId}/contributors`
        : `/api/task-live/${tId}/contributors`;
      const res = await apiGet(getPath);
      if (Array.isArray(res)) {
        setTaskTeamMembers(res);
      }
    } catch (err) {
      console.error("Failed to remove team member", err);
      setTeamMemberError(err.message || err.toString());
    }
  };

  // ============================================
  // TASK DETAIL SCREEN RENDERER - DYNAMIC (INLINE HELPER)
  // ============================================
  const renderTaskDetailScreen = (task, onBack) => {
    if (!task) return null;

    const rawTask = task.rawTask || task;

    const getProjectInfo = () => {
      if (task.isIndividual || task.project === "Individual Task") {
        return { isIndividual: true };
      }

      let pName = null;
      let mName = null;

      // 1. Check if rawTask has project_info (e.g. "PRJ-01 - m1")
      if (rawTask.project_info && typeof rawTask.project_info === 'string' && rawTask.project_info.includes(' - ')) {
        const parts = rawTask.project_info.split(' - ');
        if (parts[0] && parts[0].trim()) pName = parts[0].trim();
        if (parts[1] && parts[1].trim()) mName = parts[1].trim();
      }

      // 2. Resolve Milestone via milestonesList or raw properties
      const targetMId = String(rawTask.mId || rawTask.m_id || rawTask.mid || rawTask.drftMId || rawTask.milestoneId || '');
      let targetPrjId = String(rawTask.prjId || rawTask.prj_id || rawTask.prjid || rawTask.projectId || '');

      let foundM = null;
      if (targetMId && milestonesList && milestonesList.length > 0) {
        foundM = milestonesList.find(m => {
          const idStr = String(m.mId || m.m_id || m.mid || m.id || m.milestoneId || '');
          return idStr && idStr === targetMId;
        });
        if (foundM) {
          mName = foundM.mlstnTtl || foundM.title || foundM.name || foundM.mlstn_ttl || foundM.mlstnNm || mName;
          if (!targetPrjId) {
            targetPrjId = String(foundM.prjId || foundM.prj_id || foundM.prjid || foundM.projectId || '');
          }
        }
      }

      if (!mName) {
        const mCandidates = [task.milestone, rawTask.milestoneName, rawTask.mlstnTtl, rawTask.milestoneTitle, rawTask.mlstnNm, rawTask.mlstn_ttl];
        for (const c of mCandidates) {
          if (c && typeof c === 'string' && c.trim() !== '' && c.trim() !== '—' && c.trim() !== 'Internal') {
            mName = c.trim();
            break;
          }
        }
      }

      // Title pattern fallback: "Task Name(Milestone Name)"
      if (!mName && task.title && task.title.includes('(') && task.title.includes(')')) {
        const matchM = task.title.match(/\(([^)]+)\)$/);
        if (matchM && matchM[1]) {
          mName = matchM[1].trim();
        }
      }

      // 3. Resolve Project via projectsList or raw properties
      let foundP = null;
      if (targetPrjId && projectsList && projectsList.length > 0) {
        foundP = projectsList.find(p => {
          const idStr = String(p.prjId || p.prj_id || p.prjid || p.id || p.projectId || '');
          return idStr && idStr === targetPrjId;
        });
        if (foundP) {
          pName = foundP.prjNm || foundP.name || foundP.prj_nm || foundP.prjCd || pName;
        }
      }

      if (pName && projectsList && projectsList.length > 0) {
        // If pName is code like "PRJ-01", try finding full name in projectsList
        const codeMatch = projectsList.find(p =>
          String(p.prjCd || '').toUpperCase() === pName.toUpperCase() ||
          String(p.prjNm || '').toUpperCase() === pName.toUpperCase()
        );
        if (codeMatch) {
          pName = codeMatch.prjNm || codeMatch.name || codeMatch.prj_nm || pName;
        }
      }

      if (!pName || pName === "Internal") {
        const pCandidates = [task.project, rawTask.projectName, rawTask.prjNm, rawTask.prj_nm, rawTask.projectCodeName, rawTask.prjCd];
        for (const c of pCandidates) {
          if (c && typeof c === 'string' && c.trim() !== '' && c.trim() !== 'Internal') {
            pName = c.trim();
            break;
          }
        }
      }

      return {
        isIndividual: false,
        projectName: pName || "Internal",
        milestoneName: mName || "—"
      };
    };

    const projectInfo = getProjectInfo();
    const timeStatus = calculateTimeStatus(rawTask);
    const progressBadge = getProgressBadge(task.status || task.rawStatus);
    const priorityBadge = getPriorityBadge(task.priority);

    // Get dynamic action based on current state
    const action = getActionButton(rawTask, currentUserEmpId, isExternalMode);

    const isOverdue = (() => {
      if (!rawTask?.endDt) return false;
      if (rawTask?.taskSts === "COMPLETED" || rawTask?.taskSts === "CLOSED") return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(rawTask.endDt);
      dueDate.setHours(0, 0, 0, 0);
      return today > dueDate;
    })();

    const isCompleted = task.rawStatus === "COMPLETED" || task.rawStatus === "CLOSED";
    const isTeamMember = taskTeamMembers.some(tm => String(tm.empId) === String(currentUserEmpId)) || (Array.isArray(rawTask?.teamMembers) && rawTask.teamMembers.some(tm => String(tm.empId) === String(currentUserEmpId)));
    const isDoer = isExternalMode || String(rawTask.empId || rawTask.assignedTo) === String(currentUserEmpId) || isTeamMember;
    const isReviewer = !isExternalMode && String(rawTask.reviewerId || rawTask.reviewer) === String(currentUserEmpId);
    const isApprover = !isExternalMode && String(rawTask.approverId || rawTask.approver) === String(currentUserEmpId);

    // Get current progress and process for display
    const currentProgress = (rawTask.taskSts || task.rawStatus || task.status || "OPEN").toUpperCase();
    const currentProcess = rawTask.prcsYesActn || "NONE";

    // Determine if task is in review
    const isUnderReview = currentProcess === "PENDING_REVIEWER" || currentProcess === "PENDING_APPROVER" || currentProcess === "UNDER_REVIEW";

    const renderTeamMember = (empId, role, label, fallbackName = null) => {
      if (!empId && !fallbackName) return null;
      let name = getEmployeeName(empId, employeesList);
      if ((!name || name === "Unknown" || name.startsWith("User ")) && fallbackName) {
        name = fallbackName;
      }
      let initials = null;
      if (empId) {
        initials = getEmployeeInitials(empId, employeesList);
      }
      if ((!initials || initials === "UN" || initials === "NU" || initials === "TM" || initials === "null") && name && name !== "Unknown") {
        const parts = name.trim().split(" ");
        initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
      }
      if (!initials) initials = "TM";
      const photo = getEmployeePhoto(empId, employeesList);

      const roleColors = {
        "Assigned By": { bg: "#6366F1", light: "#EEF2FF" },
        "Executor": { bg: "#3B82F6", light: "#DBEAFE" },
        "Reviewer": { bg: "#8B5CF6", light: "#EDE9FE" },
        "Approver": { bg: "#F59E0B", light: "#FEF3C7" }
      };
      const color = roleColors[role] || { bg: "#64748B", light: "#F1F5F9" };

      return (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 12px",
          borderRadius: "8px",
          backgroundColor: color.light,
          border: `1px solid ${color.bg}33`
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: color.bg,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "700",
            overflow: "hidden",
            flexShrink: 0
          }}>
            {photo ? (
              <img
                src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `data:image/jpeg;base64,${photo}`}
                alt={name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.textContent = initials || "UN";
                }}
              />
            ) : initials || "UN"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "600", fontSize: "14px", color: "#0f172a" }}>{name}</div>
            <div style={{ fontSize: "12px", color: color.bg, fontWeight: "500" }}>{role}</div>
          </div>
          <span style={{
            fontSize: "10px",
            fontWeight: "700",
            color: color.bg,
            backgroundColor: `${color.bg}22`,
            padding: "2px 10px",
            borderRadius: "12px"
          }}>
            {label}
          </span>
        </div>
      );
    };

    const getCurrentStatusDisplay = () => {
      const rawSts = String(rawTask?.taskSts?.statusNm || rawTask?.taskSts || task.rawStatus || task.status || "").toUpperCase();
      const taskStsId = rawTask?.taskSts?.statusId || rawTask?.taskSts;
      if (rawSts === "CLOSED" || rawSts === "COMPLETED" || taskStsId === 4 || isCompleted) {
        return "CLOSED";
      }
      if (currentProcess === "PENDING_REVIEWER" || currentProcess === "PENDING_APPROVER" || currentProcess === "UNDER_REVIEW") {
        return "UNDER_REVIEW";
      }
      if (isOverdue) return "OVERDUE";
      if (currentProgress === "HOLD") return "HOLD";
      if (currentProgress === "OPEN" || currentProgress === "DRAFT") return "OPEN";
      return "WIP";
    };

    const getStatusColor = (status) => {
      if (status === "CLOSED" || status === "COMPLETED") return "#16a34a";
      if (status === "OVERDUE") return "#ef4444";
      if (status === "UNDER_REVIEW") return "#8b5cf6";
      return "#3b82f6";
    };

    const getStatusBgColor = (status) => {
      if (status === "CLOSED" || status === "COMPLETED") return "#dcfce7";
      if (status === "OVERDUE") return "#fee2e2";
      if (status === "UNDER_REVIEW") return "#f3e8ff";
      if (status === "IN_PROGRESS" || status === "WIP") return "#fef3c7";
      return "#f1f5f9";
    };

    // Render action buttons based on dynamic state
    const renderActionButtons = () => {
      if (isCompleted) {
        return null;
      }

      // REVIEWER ACTIONS
      if (isReviewer && (currentProcess === "PENDING_REVIEWER" || currentProcess === "UNDER_REVIEW")) {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
            <button
              className="cc-btn danger"
              onClick={() => {
                setShowDenyForm(true);
                setIsRaiseRequest(true);
                setDenyData({ type: "REWORK", reason: "", milestone: "", deliverable: "", targetTaskId: "", targetEmpId: "", impact: "Medium", attachments: [] });
              }}
              style={{ borderRadius: "6px", backgroundColor: "#ef4444", color: "white", border: "none", width: "100%" }}
            >
              Denied
            </button>
            <button
              className="cc-btn primary"
              onClick={async () => {
                await handleReviewerApprove(task);
                onBack();
              }}
              style={{ borderRadius: "6px", backgroundColor: "#10b981", border: "none", color: "white", width: "100%" }}
            >
              Approve
            </button>
          </div>
        );
      }

      // APPROVER ACTIONS
      if (isApprover && currentProcess === "PENDING_APPROVER") {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
            <button
              className="cc-btn danger"
              onClick={() => {
                setShowDenyForm(true);
                setIsRaiseRequest(true);
                setDenyData({ type: "REWORK", reason: "", milestone: "", deliverable: "", targetTaskId: "", targetEmpId: "", impact: "Medium", attachments: [] });
              }}
              style={{ borderRadius: "6px", backgroundColor: "#ef4444", color: "white", border: "none", width: "100%" }}
            >
              Denied
            </button>
            <button
              className="cc-btn primary"
              onClick={async () => {
                await handleApproverApprove(task);
                onBack();
              }}
              style={{ borderRadius: "6px", backgroundColor: "#10b981", border: "none", color: "white", width: "100%" }}
            >
              Approve
            </button>
          </div>
        );
      }

      // EXECUTOR ACTIONS - DYNAMIC BASED ON PROGRESS & PROCESS
      if (isDoer) {
        // OPEN / DRAFT -> Start
        if (currentProgress === "OPEN" || currentProgress === "DRAFT") {
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              <button
                className="cc-btn primary"
                onClick={async () => {
                  await handleStartTask(task);
                }}
                style={{ borderRadius: "6px", backgroundColor: "#3b82f6", border: "none", color: "white", width: "100%", padding: "10px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <Play size={16} fill="white" /> Start
              </button>
            </div>
          );
        }

        // WORK_IN_PROGRESS with NONE or YES or REWORK or REASSIGN -> Update / Submit Review / Mark as Complete
        if ((currentProgress === "WIP" || currentProgress === "IN_PROGRESS" || currentProgress === "WORK_IN_PROGRESS") &&
          (currentProcess === "NONE" || currentProcess === "YES" || currentProcess === "REWORK" || currentProcess === "REASSIGN" || !currentProcess)) {
          const allChecked = updateChecklist.length > 0 && updateChecklist.every(c => c.completed);
          const noChecklist = updateChecklist.length === 0;
          const hasWorkflow = rawTask?.prcsFlg === true || rawTask?.prcsFlg === 'YES' || rawTask?.prcsFlg === 1 || rawTask?.prcsFlg === 'true';
          const hasReviewer = !!(rawTask?.reviewerId || rawTask?.reviewer || rawTask?.approverId || rawTask?.approver);

          // Determine label:
          // - Not all checked -> Save Updated Progress
          // - All checked + (has reviewer OR workflow flag) -> Send to Reviewer
          // - All checked + no reviewer + no workflow -> Mark as Completed
          let label = "Save Updated Progress";
          if (allChecked || noChecklist) {
            if (hasWorkflow || hasReviewer) {
              label = "Send to Reviewer";
            } else {
              label = "Mark as Completed";
            }
          }

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              <button
                className="cc-btn primary"
                onClick={async () => {
                  if (label === "Mark as Completed") {
                    await handleCompleteTask(task);
                  } else if (label === "Send to Reviewer") {
                    // Save checklist silently then submit - single flow, no double alert
                    try {
                      setLoadingAction(selectedTask.id || selectedTask.taskId);
                      if (updateChecklist.length > 0) {
                        if (isExternalMode) {
                          await Promise.all(updateChecklist
                            .filter(item => item.id != null)
                            .map(item => {
                              return apiPatch(`/api/external-tasks/${externalToken}/checklist/${item.id}?completed=${item.completed}`);
                            })
                          );
                        } else {
                          await Promise.all(updateChecklist
                            .filter(item => item.id != null)
                            .map(item => {
                              const path = `/api/checklists/${item.id}/${item.completed ? 'complete' : 'reopen'}?_t=${Date.now()}`;
                              return apiPatch(path, {});
                            })
                          );
                        }
                      }
                    } catch (e) {
                      console.error("Checklist save error:", e);
                    } finally {
                      setLoadingAction(null);
                    }
                    await handleSubmitReview(task);
                  } else {
                    await handleSaveProgress();
                  }
                }}
                style={{
                  borderRadius: "6px",
                  backgroundColor: label === "Mark as Completed" ? "#16a34a" : label === "Send to Reviewer" ? "#8B5CF6" : "#0F172A",
                  border: "none",
                  color: "white",
                  width: "100%",
                  fontWeight: "600",
                  padding: "10px"
                }}
              >
                {label}
              </button>
            </div>
          );
        }

        // WORK_IN_PROGRESS with UNDER_REVIEW -> Send Reminder
        if ((currentProgress === "WIP" || currentProgress === "IN_PROGRESS" || currentProgress === "UNDER_REVIEW") &&
          (currentProcess === "PENDING_REVIEWER" || currentProcess === "PENDING_APPROVER")) {
          const targetId = rawTask.reviewerId || rawTask.approverId;
          const role = rawTask.reviewerId ? "Reviewer" : "Approver";

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              <button
                className="cc-btn primary"
                onClick={() => handleSendReminder(targetId, role)}
                style={{ borderRadius: "6px", backgroundColor: "#0F172A", border: "none", color: "white", width: "100%" }}
              >
                Send Reminder
              </button>
            </div>
          );
        }

        // HOLD -> Resume
        if (currentProgress === "HOLD") {
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              <button
                className="cc-btn primary"
                onClick={async () => {
                  await handleResumeTask(task);
                }}
                style={{ borderRadius: "6px", backgroundColor: "#3b82f6", border: "none", color: "white", width: "100%" }}
              >
                Resume
              </button>
            </div>
          );
        }
      }

      return null;
    };

    return (
      <div style={{
        width: "100%",
        background: "#f8fafc",
        borderRadius: "12px",
        padding: "0",
        marginTop: "0",
        maxHeight: "calc(100vh - 180px)",
        overflowY: "auto"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "white",
          borderBottom: "1px solid #e2e8f0",
          borderRadius: "12px 12px 0 0",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
          position: "sticky",
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {!isExternalMode && (
              <button
                onClick={onBack}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  color: "#475569",
                  fontWeight: 500,
                  fontSize: "14px"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            <div>
              <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>{task.id}</div>
              <div style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a" }}>{task.title}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="cc-status-badge" style={{
              backgroundColor: progressBadge.bg,
              color: progressBadge.color,
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600"
            }}>
              {progressBadge.label}
            </span>
            {(() => {
              const pIcon = getProcessIcon(task.rawTask?.prcsYesActn);
              return pIcon && !isCompleted ? (
                <div className="myt-custom-tooltip-wrap" title={pIcon.title} style={{ color: pIcon.color, display: "flex", alignItems: "center", cursor: "help", padding: "4px", backgroundColor: `${pIcon.color}15`, borderRadius: "50%" }}>
                  <pIcon.icon size={18} strokeWidth={2.5} />
                </div>
              ) : null;
            })()}
            {action && action.action !== "view" && !isCompleted && (
              <button
                onClick={async () => {
                  if (action.action === "start") {
                    await handleStartTask(task);
                  } else if (action.action === "update") {
                    if (isExternalMode) {
                      await handleSaveProgress();
                    }
                  } else if (action.action === "review") {
                    if (isExternalMode) {
                      await handleSubmitReview(task);
                    }
                  } else if (action.action === "approve") {
                    // Already in detail view
                  }
                }}
                style={{
                  backgroundColor: action.variant === "primary" ? "#3B82F6" :
                    action.variant === "warning" ? "#F59E0B" :
                      action.variant === "success" ? "#10B981" :
                        action.variant === "review" ? "#8B5CF6" : "#64748B",
                  color: "white",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {action.action === "start" && <Play size={16} fill="white" />}
                {action.action === "update" && <RotateCw size={16} />}
                {action.action === "review" && <RotateCw size={16} />}
                {action.action === "approve" && <Check size={16} />}
                {action.label}
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "24px",
          padding: "0 24px 24px 24px"
        }}>
          {/* Left Column */}
          <div>
            {/* Task Details Card - Shows Progress, Process, Priority, Time */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "24px",
              marginBottom: "24px"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                    <Flag size={14} style={{ display: "inline", marginRight: "4px" }} /> Priority
                  </div>
                  <span className="cc-status-badge" style={{
                    backgroundColor: priorityBadge.bg,
                    color: priorityBadge.color,
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}>
                    {task.priority || "Normal"}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                    <Calendar size={14} style={{ display: "inline", marginRight: "4px" }} /> Due Date
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: isOverdue ? "#EF4444" : "#0f172a" }}>
                    {formatDate(task.dueDate) || "—"}
                    {isOverdue && <span style={{ fontSize: "12px", color: "#EF4444", marginLeft: "8px" }}>⚠️ Overdue</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                    <ClockIcon size={14} style={{ display: "inline", marginRight: "4px" }} /> Time Status
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: timeStatus.color }}>
                    {timeStatus.title}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                    <CheckSquare size={14} style={{ display: "inline", marginRight: "4px" }} /> Progress
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ flex: 1, height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        width: `${updateProgressVal || 0}%`,
                        height: "100%",
                        backgroundColor: getStatusColor(getCurrentStatusDisplay()),
                        borderRadius: "3px",
                        transition: "width 0.3s ease"
                      }} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{updateProgressVal || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Project / Milestone or Individual Task Badge */}
              <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                {projectInfo.isIndividual ? (
                  <span style={{
                    backgroundColor: "#dbeafe",
                    color: "#2563eb",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "inline-block"
                  }}>
                    Assignment
                  </span>
                ) : (
                  <div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                      <span style={{ fontWeight: "600", color: "#0f172a" }}>Project:</span> {projectInfo.projectName}
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                      <span style={{ fontWeight: "600", color: "#0f172a" }}>Milestone:</span> {projectInfo.milestoneName}
                    </div>
                  </div>
                )}
              </div>

              {/* Process Status Details */}
              {rawTask?.prcsYesActn && rawTask?.prcsYesActn !== "NONE" && (
                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                    <RefreshCw size={14} style={{ display: "inline", marginRight: "4px" }} /> Process Status
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {rawTask.prcsYesActn === "PENDING_REVIEWER" && "⏳ Under Review (Reviewer)"}
                    {rawTask.prcsYesActn === "PENDING_APPROVER" && "⏳ Under Review (Approver)"}
                    {rawTask.prcsYesActn === "REWORK" && <><RefreshCw size={16} color="#F97316" style={{ display: "inline", marginRight: "6px" }} /><span style={{ color: "#F97316" }}>Rework Required</span></>}
                    {rawTask.prcsYesActn === "REASSIGN" && <><ReassignIcon size={16} color="#4F46E5" style={{ display: "inline", marginRight: "6px" }} /><span style={{ color: "#4F46E5" }}>Reassigned</span></>}

                    {(() => {
                      const parsed = parseRemarksHistory(rawTask.addlRem || rawTask.remarks, task, employeesList);
                      const isPrevReassigned = parsed.some(r => r.action?.toLowerCase().includes("reassign"));
                      if (isPrevReassigned && rawTask.prcsYesActn !== "REASSIGN") {
                        return (
                          <span style={{ backgroundColor: "#EEF2FF", color: "#4F46E5", fontSize: "11px", padding: "2px 6px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <ReassignIcon size={12} color="#4F46E5" /> Reassigned Task
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Checklist Section */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "24px",
              marginBottom: "24px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>
                  <ListChecks size={18} style={{ display: "inline", marginRight: "8px" }} />
                  Checklist
                </div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>
                  {updateChecklist.filter(c => c.completed).length}/{updateChecklist.length}
                </div>
              </div>
              {updateChecklist.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                  No checklist items defined for this task.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {updateChecklist.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklist(item.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 12px",
                        backgroundColor: item.completed ? "#f0fdf4" : "#f8fafc",
                        borderRadius: "8px",
                        border: `1px solid ${item.completed ? "#bbf7d0" : "#e2e8f0"}`,
                        cursor: isCompleted || isUnderReview ? "not-allowed" : "pointer",
                        opacity: isCompleted || isUnderReview ? 0.7 : 1
                      }}
                    >
                      <div style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "4px",
                        backgroundColor: item.completed ? "#22c55e" : "white",
                        border: `2px solid ${item.completed ? "#22c55e" : "#cbd5e1"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        {item.completed && <Check size={12} color="white" strokeWidth={3} />}
                      </div>
                      <span style={{
                        fontSize: "14px",
                        color: item.completed ? "#166534" : "#0f172a",
                        textDecoration: item.completed ? "line-through" : "none",
                        flex: 1
                      }}>
                        {item.text}
                      </span>
                      <span className={`myt-chk-status ${item.completed ? 'completed' : 'pending'}`}>
                        {item.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div style={{
                backgroundColor: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "24px",
                marginBottom: "24px"
              }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "8px" }}>
                  <FileText size={18} style={{ display: "inline", marginRight: "8px" }} />
                  Description
                </div>
                <div style={{ fontSize: "14px", color: "#475569", lineHeight: "1.6" }}>
                  {task.description}
                </div>
              </div>
            )}

            {/* Team Members / Contributors Card */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "24px",
              marginBottom: "24px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={18} color="#475569" />
                  Team Members {taskTeamMembers.length > 0 ? `(${taskTeamMembers.length})` : ''}
                </div>
                {!isCompleted && !showAddMemberModal && (
                  String(rawTask.empId || rawTask.executorId) === String(currentUserEmpId) && !isReviewer && !isApprover
                ) && (
                    <button onClick={() => setShowAddMemberModal(true)} style={{ padding: "6px 12px", fontSize: "13px", fontWeight: "600", color: "#3B82F6", backgroundColor: "#DBEAFE", border: "none", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                      <UserPlus size={14} /> Add Member
                    </button>
                  )}
              </div>

              {loadingTeamMembers ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                  <Loader2 size={20} className="spinning" color="#64748b" />
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {taskTeamMembers.map((tm, idx) => {
                    const empName = getEmployeeName(tm.empId, employeesList);
                    const empInitials = getEmployeeInitials(tm.empId, employeesList);
                    const empPhoto = getEmployeePhoto(tm.empId, employeesList);
                    const isPrimaryExec = String(rawTask.empId || rawTask.executorId) === String(currentUserEmpId);
                    const canManageTeam = !isCompleted && isPrimaryExec && !isReviewer && !isApprover;
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f8fafc", padding: "6px 12px", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
                        {empPhoto ? (
                          <img src={empPhoto.startsWith('http') ? empPhoto : `${apiBaseUrl}${empPhoto}`} alt={empName} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700", color: "#64748b" }}>
                            {empInitials}
                          </div>
                        )}
                        <span style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{empName}</span>
                        <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b", backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "10px" }}>
                          {tm.asgnRmk && tm.asgnRmk !== "Added from process UI" && tm.asgnRmk !== "Executor" && tm.asgnRmk !== "Reviewer" && tm.asgnRmk !== "Approver" ? tm.asgnRmk : "Collaborator"}
                        </span>
                        {canManageTeam && (
                          <button
                            onClick={() => handleRemoveTeamMember(tm.tmId || tm.id)}
                            title="Remove Member"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              justifyInhead: "center",
                              padding: "2px",
                              marginLeft: "2px",
                              borderRadius: "50%"
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {taskTeamMembers.length === 0 && <span style={{ fontSize: "13px", color: "#64748b" }}>No additional team members assigned.</span>}
                </div>
              )}

              {/* Add Member Form */}
              {showAddMemberModal && (
                <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", animation: "fadeIn 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>Select Employee</span>
                    <button onClick={() => setShowAddMemberModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={16} /></button>
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <select
                      className="myt-input"
                      value={selectedNewMember}
                      onChange={(e) => setSelectedNewMember(e.target.value)}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    >
                      <option value="">-- Select an Employee --</option>
                      {employeesList
                        .filter(emp => {
                          const empIdStr = String(emp.empId || emp.id);
                          const isAlreadyAdded = taskTeamMembers.some(tm => String(tm.empId) === empIdStr);
                          const isExecutor = String(rawTask.empId || rawTask.executorId || rawTask.assignedTo) === empIdStr;
                          const isReviewer = String(rawTask.reviewerId || rawTask.reviewer || rawTask.reviewerEmpId) === empIdStr;
                          const isApprover = String(rawTask.approverId || rawTask.approver || rawTask.approverEmpId) === empIdStr;
                          return !isAlreadyAdded && !isExecutor && !isReviewer && !isApprover;
                        })
                        .map(emp => (
                          <option key={emp.empId || emp.id} value={emp.empId || emp.id}>
                            {getEmployeeName(emp.empId || emp.id, [emp])} {emp.deptNm ? `- (${emp.deptNm})` : ''}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={handleAddTeamMember}
                      disabled={!selectedNewMember}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: selectedNewMember ? "#3B82F6" : "#94a3b8",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "600",
                        cursor: selectedNewMember ? "pointer" : "not-allowed"
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {teamMemberError && (
                    <div style={{ marginTop: "12px", color: "#ef4444", fontSize: "13px", padding: "8px 12px", backgroundColor: "#fee2e2", borderRadius: "6px" }}>
                      <strong>Error:</strong> {teamMemberError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Task Attachments Card */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "24px",
              marginBottom: "24px"
            }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Paperclip size={18} color="#0f172a" />
                Task Attachments {taskAttachments.length > 0 ? `(${taskAttachments.length})` : ''}
              </div>

              {loadingAttachments ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                  <Loader2 size={16} className="spinning" style={{ display: "inline", marginRight: "8px" }} /> Loading attachments...
                </div>
              ) : taskAttachments.length === 0 ? (
                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#64748b" }}>
                  No attachments uploaded for this task.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                  {taskAttachments.map((att, idx) => {
                    const fileName = att.fileNm || att.fileName || `Attachment ${idx + 1}`;
                    let rawUrl = att.atPath || att.url || att.filePath || "#";
                    if (typeof rawUrl === "string" && rawUrl.trim().startsWith("{")) {
                      try {
                        const parsed = JSON.parse(rawUrl);
                        if (parsed && parsed.url) rawUrl = parsed.url;
                      } catch (e) { }
                    }
                    let url = rawUrl;
                    if (typeof rawUrl === "string" && rawUrl.startsWith("http") && (rawUrl.includes("supabase.co") || rawUrl.includes("/storage/v1/object/"))) {
                      url = `${apiBaseUrl}/api/storage/view?url=${encodeURIComponent(rawUrl)}`;
                    }
                    const isImage = /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(fileName) || /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(url) || (url && url.startsWith('data:image'));
                    const isPdf = /\.pdf($|\?)/i.test(fileName) || /\.pdf($|\?)/i.test(url);
                    const isZip = /\.(zip|rar|7z|tar|gz)($|\?)/i.test(fileName) || /\.(zip|rar|7z|tar|gz)($|\?)/i.test(url);

                    const downloadUrl = `${apiBaseUrl}/api/storage/download?url=${encodeURIComponent(rawUrl)}&name=${encodeURIComponent(fileName)}`;

                    return (
                      <div key={att.fileId || idx} style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        overflow: "hidden",
                        backgroundColor: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 0.2s ease"
                      }}>
                        {/* Preview Thumbnail for Image or File Header */}
                        {isImage ? (
                          <div style={{ height: "130px", backgroundColor: "#0f172a", position: "relative", overflow: "hidden" }}>
                            <img
                              src={url.startsWith('http') || url.startsWith('data:') ? url : `data:image/jpeg;base64,${url}`}
                              alt={fileName}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        ) : (
                          <div style={{ height: "90px", backgroundColor: isPdf ? "#fee2e2" : isZip ? "#f3e8ff" : "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "4px" }}>
                            <FileText size={32} color={isPdf ? "#ef4444" : isZip ? "#9333ea" : "#0284c7"} />
                            {isZip && <span style={{ fontSize: "10px", fontWeight: "700", color: "#9333ea", backgroundColor: "#e9d5ff", padding: "1px 6px", borderRadius: "4px" }}>ZIP ARCHIVE</span>}
                          </div>
                        )}

                        {/* File details & view/download button */}
                        <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "8px" }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fileName}>
                            {fileName}
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewModalFile({ name: fileName, url: url, downloadUrl: downloadUrl, isImage: isImage, isPdf: isPdf })}
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#2563eb",
                              border: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: "#dbeafe",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              width: "fit-content"
                            }}
                          >
                            <Eye size={13} /> View / Open File
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attachment Preview Modal */}
            {previewModalFile && (
              <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                backdropFilter: "blur(4px)",
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
              }}>
                <div style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  width: "90%",
                  maxWidth: "900px",
                  maxHeight: "90vh",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
                  overflow: "hidden"
                }}>
                  {/* Modal Header */}
                  <div style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#fafbfc"
                  }}>
                    <div style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileText size={18} color="#2563eb" />
                      {previewModalFile.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <a
                        href={previewModalFile.downloadUrl}
                        download={previewModalFile.name}
                        style={{
                          padding: "6px 14px",
                          backgroundColor: "#16a34a",
                          color: "white",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "600",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        📥 Download File
                      </a>
                      <a
                        href={previewModalFile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "6px 14px",
                          backgroundColor: "#2563eb",
                          color: "white",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "600",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        🔗 Open View
                      </a>
                      <button
                        onClick={() => setPreviewModalFile(null)}
                        style={{
                          background: "#f1f5f9",
                          border: "none",
                          borderRadius: "50%",
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#64748b"
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div style={{
                    padding: "24px",
                    overflowY: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0f172a",
                    minHeight: "350px"
                  }}>
                    {previewModalFile.isImage ? (
                      <img
                        src={previewModalFile.url}
                        alt={previewModalFile.name}
                        style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "8px" }}
                      />
                    ) : previewModalFile.isPdf ? (
                      <iframe
                        src={previewModalFile.url}
                        title={previewModalFile.name}
                        style={{ width: "100%", height: "70vh", border: "none", borderRadius: "8px", backgroundColor: "white" }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", color: "white", padding: "40px" }}>
                        <FileText size={64} color="#94a3b8" style={{ marginBottom: "16px" }} />
                        <div style={{ fontSize: "16px", fontWeight: "600" }}>{previewModalFile.name}</div>
                        <a
                          href={previewModalFile.url}
                          download={previewModalFile.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginTop: "16px",
                            display: "inline-block",
                            padding: "10px 20px",
                            backgroundColor: "#2563eb",
                            color: "white",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontWeight: "600"
                          }}
                        >
                          Download File
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Remarks History */}
            {(() => {
              const list1 = processHistory ? parseProcessHistory(processHistory, task, employeesList) : [];
              const rawRem = task.rawTask?.addlRem || task.rawTask?.remarks || "";
              const list2 = parseRemarksHistory(rawRem, task, employeesList);

              const combinedMap = new Map();
              [...list1, ...list2].forEach((item, idx) => {
                const textClean = (item.text || "").trim();
                const key = `${item.action}_${textClean}`;
                if (!combinedMap.has(key) && (textClean.length > 0 || (item.attachments && item.attachments.length > 0) || (item.action && (item.action.toLowerCase().includes("reassign") || item.action.toLowerCase().includes("rework"))))) {
                  combinedMap.set(key, { ...item, id: idx });
                }
              });

              const validRemarks = Array.from(combinedMap.values()).slice().reverse();

              if (validRemarks.length === 0) return null;

              const reassignCount = validRemarks.filter(r => r.action?.toLowerCase().includes("reassign")).length;

              return (
                <div style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  marginBottom: "24px"
                }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <MessageSquare size={18} color="#0f172a" />
                      Remarks History
                    </div>
                    {reassignCount > 0 ? (
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "#ef4444", backgroundColor: "#fee2e2", padding: "4px 10px", borderRadius: "12px" }}>
                        Reassigned {reassignCount} {reassignCount === 1 ? 'Time' : 'Times'}
                      </div>
                    ) : null}
                  </div>

                  <div style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}>
                    {validRemarks.map((rem) => (
                      <div key={rem.id} style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "16px"
                      }}>
                        {/* Avatar Circle */}
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          backgroundColor: "#3b82f6",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "13px",
                          flexShrink: 0
                        }}>
                          {rem.photo ? (
                            <img
                              src={rem.photo.startsWith('data:') || rem.photo.startsWith('http') ? rem.photo : `data:image/jpeg;base64,${rem.photo}`}
                              alt={rem.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.parentElement.textContent = rem.initials || "TM";
                              }}
                            />
                          ) : rem.initials || "TM"}
                        </div>

                        {/* Main Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                            <span style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>{rem.name}</span>
                            <span style={{
                              backgroundColor: "#fef3c7",
                              color: "#d97706",
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              letterSpacing: "0.5px"
                            }}>
                              {rem.role}
                            </span>
                            <span style={{
                              backgroundColor: rem.actionBg || "#FEF3C7",
                              color: rem.actionColor || "#D97706",
                              fontSize: "12px",
                              fontWeight: "600",
                              padding: "2px 10px",
                              borderRadius: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}>
                              {rem.action?.toLowerCase().includes("rework") && <RefreshCw size={13} color={rem.actionColor} />}
                              {rem.action?.toLowerCase().includes("reassign") && <ReassignIcon size={13} color={rem.actionColor} />}
                              {rem.action}
                            </span>
                          </div>
                          <div style={{ fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
                            {rem.text}
                          </div>
                          {rem.date && (
                            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
                              {new Date(rem.date).toLocaleString()}
                            </div>
                          )}

                          {/* Inline Attachments for this remark */}
                          {rem.attachments && rem.attachments.length > 0 && (
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                              {rem.attachments.map((att, attIdx) => {
                                const rawUrl = att.url;
                                let displayUrl = rawUrl;
                                if (typeof rawUrl === "string" && rawUrl.startsWith("http") && (rawUrl.includes("supabase.co") || rawUrl.includes("/storage/v1/object/"))) {
                                  displayUrl = `${apiBaseUrl}/api/storage/view?url=${encodeURIComponent(rawUrl)}`;
                                }
                                return (
                                  <button
                                    key={attIdx}
                                    onClick={() => {
                                      const isImage = /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(att.name) || /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(rawUrl);
                                      const isPdf = /\.pdf($|\?)/i.test(att.name) || /\.pdf($|\?)/i.test(rawUrl);
                                      const downloadUrl = `${apiBaseUrl}/api/storage/download?url=${encodeURIComponent(rawUrl)}&name=${encodeURIComponent(att.name)}`;
                                      setPreviewModalFile({ name: att.name, url: displayUrl, downloadUrl: downloadUrl, isImage: isImage, isPdf: isPdf });
                                    }}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      padding: "6px 12px",
                                      backgroundColor: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "16px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      color: "#0f172a",
                                      cursor: "pointer",
                                      transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#e2e8f0"; e.currentTarget.style.borderColor = "#94a3b8"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                                  >
                                    <Paperclip size={14} color="#64748b" />
                                    {att.name || `Attachment ${attIdx + 1}`}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Add Remarks & Evidence */}
            {!isCompleted && isDoer && !isUnderReview && (
              <div style={{
                backgroundColor: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "24px"
              }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "12px" }}>
                  <MessageSquare size={18} style={{ display: "inline", marginRight: "8px" }} />
                  Add Remarks <span style={{ fontWeight: "400", color: "#64748b" }}>(Optional)</span>
                </div>
                <textarea
                  className="myt-remarks-input"
                  placeholder="Enter remarks..."
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "13.5px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: "none",
                    background: "#fff",
                    color: "#0f172a",
                    marginBottom: "12px"
                  }}
                  disabled={isCompleted}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <label className="myt-file-upload-btn" style={{
                    padding: "8px 16px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#334155",
                    cursor: isCompleted ? "not-allowed" : "pointer",
                    opacity: isCompleted ? 0.6 : 1
                  }}>
                    Choose Files
                    <input
                      type="file"
                      multiple
                      style={{ display: "none" }}
                      disabled={isCompleted}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setUpdateAttachments(Array.from(e.target.files));
                        }
                      }}
                    />
                  </label>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    {updateAttachments && updateAttachments.length > 0
                      ? `${updateAttachments.length} file(s) selected: ${updateAttachments.map(f => f.name).join(', ')}`
                      : "No file chosen"}
                  </span>
                  {updateAttachments && updateAttachments.length > 0 && !isCompleted && (
                    <button
                      onClick={() => setUpdateAttachments([])}
                      style={{
                        background: "none", border: "none", color: "#ef4444",
                        fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center"
                      }}
                    >
                      <X size={14} style={{ marginRight: "4px" }} /> Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div>
            {/* Team Members */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "20px",
              marginBottom: "20px"
            }}>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginBottom: "14px" }}>
                <Users size={18} style={{ display: "inline", marginRight: "8px" }} />
                Team
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {isExternalMode ? (
                  <>
                    {renderTeamMember(null, "Assigned By", "AB", "Project Admin")}
                    {renderTeamMember(null, "Executor", "EX", rawTask?.extEmpNm || "External Associate")}
                  </>
                ) : (
                  <>
                    {(task.isIndividual || projectInfo.isIndividual || rawTask?.assignedBy || rawTask?.assigned_by) && (
                      renderTeamMember(
                        rawTask?.assignedBy || rawTask?.assigned_by || rawTask?.createdBy,
                        "Assigned By",
                        "AB",
                        rawTask?.assignedByNm || rawTask?.assignedByName
                      )
                    )}
                    {renderTeamMember(rawTask?.empId || rawTask?.assignedTo, "Executor", "EX")}
                    {renderTeamMember(rawTask?.reviewerId || rawTask?.reviewer, "Reviewer", "RV")}
                    {renderTeamMember(rawTask?.approverId || rawTask?.approver, "Approver", "AP")}
                  </>
                )}
              </div>
            </div>

            {/* Status Details - Dynamic */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "20px",
              marginBottom: "20px"
            }}>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginBottom: "12px" }}>
                <AlertCircle size={18} style={{ display: "inline", marginRight: "8px" }} />
                Status Details
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Progress Status</span>
                  <span className="cc-status-badge" style={{
                    backgroundColor: getStatusBgColor(getCurrentStatusDisplay()),
                    color: getStatusColor(getCurrentStatusDisplay()),
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    {getCurrentStatusDisplay()}
                  </span>
                </div>
                {!isExternalMode && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>Process</span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                      {currentProcess === "NONE" ? "None" : currentProcess}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Priority</span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                    {task.priority || "Normal"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: isExternalMode ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Assigned To</span>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>
                    {isExternalMode ? (rawTask?.extEmpNm || "External Associate") : (getEmployeeName(rawTask?.empId || rawTask?.assignedTo, employeesList) || "Unassigned")}
                  </span>
                </div>
                {isExternalMode && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>Link Expiry</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#059669" }}>
                      {rawTask?.expiryDt ? new Date(rawTask.expiryDt).toLocaleDateString() : "Active"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Dynamic */}
            {!isCompleted && renderActionButtons() && (
              <div style={{
                backgroundColor: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "20px"
              }}>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginBottom: "14px" }}>
                  <Play size={18} style={{ display: "inline", marginRight: "8px" }} />
                  Actions
                </div>
                {renderActionButtons()}
              </div>
            )}
          </div>
        </div>

        {/* Deny / Raise Request Form - Full Width at Bottom */}
        {showDenyForm && (
          <div ref={denyFormRef} style={{
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "32px",
            marginTop: "24px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            animation: "fadeInUp 0.3s ease-out"
          }}>
            {(() => {
              const currentRawT = selectedTask?.rawTask || selectedTask || {};
              const isIndividualTask = selectedTask?.isIndividual === true || currentRawT.taskSource === "INDIVIDUAL";

              // 1. Resolve project ID and milestone ID for the current task
              let currentProjId = String(currentRawT.prjId || currentRawT.projectId || currentRawT.prj_id || selectedTask?.projectId || selectedTask?.prjId || "").trim();
              const currentMId = String(currentRawT.mId || currentRawT.m_id || currentRawT.drftMId || currentRawT.milestoneId || currentRawT.mid || selectedTask?.milestoneId || "").trim();

              if (!currentProjId && currentMId && Array.isArray(milestonesList)) {
                const mMatch = milestonesList.find(m => String(m.mId || m.id || m.m_id || m.milestoneId || m.drftMId || "") === currentMId);
                if (mMatch) {
                  currentProjId = String(mMatch.prjId || mMatch.projectId || mMatch.prj_id || "").trim();
                }
              }

              // 2. Fetch project-specific milestones sorted strictly in sequence (MLS-001, MLS-002, ...)
              const rawProjMilestones = (reworkMilestones && reworkMilestones.length > 0)
                ? reworkMilestones
                : (milestonesList || []).filter(m => String(m.prjId || m.projectId || m.prj_id || "").trim() === currentProjId);

              const sortedProjMilestones = [...rawProjMilestones].sort((a, b) => {
                const cdA = String(a.mlstnCd || a.code || "").trim();
                const cdB = String(b.mlstnCd || b.code || "").trim();
                if (cdA && cdB) {
                  const cmp = cdA.localeCompare(cdB, undefined, { numeric: true, sensitivity: 'base' });
                  if (cmp !== 0) return cmp;
                }
                if (a.stDt && b.stDt) {
                  const cmp = String(a.stDt).localeCompare(String(b.stDt));
                  if (cmp !== 0) return cmp;
                }
                return Number(a.mId || a.id || 0) - Number(b.mId || b.id || 0);
              });

              // 3. Find current milestone index & code pattern (MLS-001, MLS-002, ...)
              const mCode = String(currentRawT.mlstnCd || selectedTask?.mlstnCd || "").toUpperCase().trim();
              const mCodeMatch = mCode.match(/MLS-0*([0-9]+)/i);
              const extractedMNum = mCodeMatch ? parseInt(mCodeMatch[1], 10) : 0;

              let currentMIndex = sortedProjMilestones.findIndex(m => {
                const id = String(m.mId || m.id || m.mid || m.milestoneId || "").trim();
                const cd = String(m.mlstnCd || "").trim().toUpperCase();
                if (currentMId && id && currentMId === id) return true;
                if (mCode && cd && mCode === cd) return true;
                return false;
              });

              if (currentMIndex === -1 && sortedProjMilestones.length > 0) {
                const currentMName = String(selectedTask?.milestone || currentRawT.mlstnTtl || currentRawT.milestoneName || "").toLowerCase().trim();
                currentMIndex = sortedProjMilestones.findIndex(m => {
                  const mName = String(m.mlstnTtl || m.mlstn_ttl || m.name || m.title || "").toLowerCase().trim();
                  return currentMName && mName && (currentMName === mName || mName.includes(currentMName) || currentMName.includes(mName));
                });
              }

              const mNumber = extractedMNum > 0 ? extractedMNum : (currentMIndex >= 0 ? currentMIndex + 1 : 1);

              // 4. Milestone 1 (MLS-001) cannot rework to previous milestone; 2nd+ milestones (MLS-002, etc.) can rework
              const isFirstMilestone = isIndividualTask || mNumber === 1 || (currentMIndex === 0 && mNumber <= 1);
              const canRework = !isIndividualTask && !isFirstMilestone && (mNumber > 1 || currentMIndex > 0);
              const isReassignMode = !canRework || (denyData.type === "REASSIGN");

              // 5. Only previous milestones belonging to the SAME project
              let availableMilestones = [];
              if (canRework) {
                if (currentMIndex > 0) {
                  availableMilestones = sortedProjMilestones.slice(0, currentMIndex);
                } else {
                  availableMilestones = sortedProjMilestones.filter(m => {
                    const cd = String(m.mlstnCd || "").toUpperCase().trim();
                    const match = cd.match(/MLS-0*([0-9]+)/i);
                    const num = match ? parseInt(match[1], 10) : 0;
                    return num > 0 && num < mNumber;
                  });
                }

                if (availableMilestones.length === 0 && sortedProjMilestones.length > 0) {
                  availableMilestones = sortedProjMilestones.filter(m => {
                    const cd = String(m.mlstnCd || "").toUpperCase().trim();
                    return cd !== mCode;
                  });
                }
              }

              // 6. Tasks for selected target milestone
              const effectiveMId = String(denyData.milestone || (availableMilestones.length > 0 ? (availableMilestones[0].mId || availableMilestones[0].mid || availableMilestones[0].id || availableMilestones[0].drftMId) : "")).trim();

              const displayedReworkTasks = (() => {
                if (!effectiveMId) return [];
                const selMObj = availableMilestones.find(m => String(m.mId || m.mid || m.id || m.drftMId) === effectiveMId);
                const selCd = selMObj ? String(selMObj.mlstnCd || "").toUpperCase().trim() : "";
                const selTtl = selMObj ? String(selMObj.mlstnTtl || selMObj.title || selMObj.name || "").toLowerCase().trim() : "";

                const pool = (reworkProjectTasks && reworkProjectTasks.length > 0)
                  ? reworkProjectTasks
                  : (reworkTasks && reworkTasks.length > 0)
                    ? reworkTasks
                    : (allProjectTasks || []);

                return pool.filter(t => {
                  const r = t.rawTask || t;
                  const tmId = String(r.mId || r.mid || r.milestoneId || t.milestoneId || r.drftMId || "").trim();
                  if (tmId && effectiveMId && tmId === effectiveMId) return true;

                  if (selMObj?.drftMId && String(selMObj.drftMId) === tmId) return true;

                  const tCd = String(r.mlstnCd || t.mlstnCd || "").toUpperCase().trim();
                  if (selCd && tCd && selCd === tCd) return true;

                  const tTtl = String(t.milestone || r.mlstnTtl || r.milestoneName || "").toLowerCase().trim();
                  if (selTtl && tTtl && (selTtl === tTtl || tTtl.includes(selTtl) || selTtl.includes(tTtl))) return true;

                  return false;
                }).map(t => t.rawTask || t);
              })();

              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                        {canRework ? "Raise Request / Review Action" : "Reassign Task"}
                      </span>
                    </div>
                    <button onClick={() => setShowDenyForm(false)} style={{ background: "#f1f5f9", borderRadius: "50%", padding: "8px", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={20} />
                    </button>
                  </div>

                  {/* Request Type Selector Tabs - ONLY shown if Rework is allowed (Project Task & 2nd+ Milestone) */}
                  {canRework && (
                    <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                      <button
                        type="button"
                        onClick={() => setDenyData(prev => ({ ...prev, type: "REWORK" }))}
                        style={{
                          padding: "10px 20px",
                          borderRadius: "8px",
                          fontWeight: "600",
                          fontSize: "14px",
                          border: "1.5px solid #3b82f6",
                          backgroundColor: (denyData.type === "REWORK" || !denyData.type) ? "#3b82f6" : "#f8fafc",
                          color: (denyData.type === "REWORK" || !denyData.type) ? "white" : "#475569",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <RotateCw size={16} /> Rework Request
                      </button>
                      <button
                        type="button"
                        onClick={() => setDenyData(prev => ({ ...prev, type: "REASSIGN" }))}
                        style={{
                          padding: "10px 20px",
                          borderRadius: "8px",
                          fontWeight: "600",
                          fontSize: "14px",
                          border: "1.5px solid #4f46e5",
                          backgroundColor: denyData.type === "REASSIGN" ? "#4f46e5" : "#f8fafc",
                          color: denyData.type === "REASSIGN" ? "white" : "#475569",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <ReassignIcon size={16} color={denyData.type === "REASSIGN" ? "white" : "#4f46e5"} /> Reassign Request
                      </button>
                    </div>
                  )}

                  <div style={{ paddingTop: "8px" }}>
                    {(() => {
                      // 1. REASSIGN MODE -> Target Executor selection (No Milestones)
                      if (isReassignMode) {
                        const currentExecutorId = currentRawT.empId || currentRawT.assignedTo || currentRawT.executorId;
                        const currentExecutorName = getEmployeeName(currentExecutorId, employeesList);

                        return (
                          <div key="reassign-mode-form">
                            <div className="myt-form-group" style={{ marginBottom: "20px" }}>
                              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                                Reassign Target (Executor)
                              </label>
                              <select
                                className="myt-input"
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                                value={denyData.targetEmpId || currentExecutorId || ""}
                                onChange={e => setDenyData({ ...denyData, targetEmpId: e.target.value })}
                              >
                                {currentExecutorId && (
                                  <option value={currentExecutorId}>{currentExecutorName} (Current Executor)</option>
                                )}
                                {employeesList
                                  .filter(e => String(e.empId || e.id || e.employeeId) !== String(currentExecutorId))
                                  .map(emp => {
                                    const empId = emp.empId || emp.id || emp.employeeId;
                                    return (
                                      <option key={empId} value={empId}>
                                        {getEmployeeName(empId, employeesList)}
                                      </option>
                                    );
                                  })
                                }
                              </select>
                            </div>

                            <div className="myt-form-group" style={{ marginBottom: "20px" }}>
                              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>Reason</label>
                              <textarea className="myt-input" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", minHeight: "100px", fontSize: "14px" }}
                                placeholder="Enter detailed reason for reassigning..." value={denyData.reason || ""} onChange={e => setDenyData({ ...denyData, reason: e.target.value })} />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                              <div className="myt-form-group">
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>Attachments (optional)</label>
                                <div style={{ width: "100%", padding: "16px", border: "2px dashed #cbd5e1", borderRadius: "8px", textAlign: "center", cursor: "pointer", color: "#64748b", backgroundColor: "#f8fafc", position: "relative" }}>
                                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp" multiple onChange={(e) => setDenyData({ ...denyData, attachments: e.target.files })} style={{ opacity: 0, position: "absolute", top: 0, left: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                                  <Paperclip size={18} style={{ verticalAlign: "middle", marginRight: "8px" }} /> <span style={{ fontSize: "14px" }}>Click or drag files to upload</span>
                                </div>
                                {denyData.attachments && denyData.attachments.length > 0 && (
                                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {Array.from(denyData.attachments).map((file, idx) => (
                                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569", backgroundColor: "#f1f5f9", padding: "6px 10px", borderRadius: "6px" }}>
                                        <Paperclip size={14} />
                                        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="myt-form-group">
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>Impact</label>
                                <select className="myt-input" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                                  value={denyData.impact || "Medium"} onChange={e => setDenyData({ ...denyData, impact: e.target.value })}>
                                  <option value="High">High</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Low">Low</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
                              <button className="cc-btn secondary" onClick={() => setShowDenyForm(false)} style={{ borderRadius: "8px", padding: "10px 20px" }}>Cancel</button>
                              <button className="cc-btn primary" onClick={() => handleSubmitDeny("REASSIGN")} disabled={!denyData.reason}
                                style={{ borderRadius: "8px", backgroundColor: "#4f46e5", border: "none", color: "white", padding: "10px 24px", fontSize: "15px", fontWeight: "600" }}>
                                Submit Reassign
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // 2. REWORK MODE FOR PROJECT TASKS (Milestone 2+) -> Dynamic Milestones & Tasks Dropdown
                      const effectiveMilestone = String(denyData.milestone || (availableMilestones.length > 0 ? (availableMilestones[0].mId || availableMilestones[0].mid || availableMilestones[0].id || availableMilestones[0].drftMId) : "")).trim();

                      return (
                        <div key="rework-mode-form">
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "20px" }}>
                            <div className="myt-form-group">
                              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                                Select Target Milestone (Same Project)
                              </label>
                              <select
                                className="myt-input"
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                                value={effectiveMilestone}
                                onChange={e => setDenyData({ ...denyData, milestone: e.target.value, deliverable: "", targetTaskId: "", targetEmpId: "" })}
                                disabled={loadingReworkMilestones}
                              >
                                {availableMilestones.length === 0 && (
                                  <option value="">{loadingReworkMilestones ? "Loading Milestones..." : "No Previous Milestones"}</option>
                                )}
                                {availableMilestones.map(m => {
                                  const mId = String(m.mId || m.mid || m.id || m.drftMId || "");
                                  const mCd = m.mlstnCd ? `[${m.mlstnCd}] ` : '';
                                  const mTtl = m.mlstnTtl || m.name || m.title || `Milestone ${mId}`;
                                  return (
                                    <option key={mId} value={mId}>
                                      {mCd}{mTtl}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <div className="myt-form-group">
                              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                                Select Target Task / Deliverable
                              </label>
                              <select
                                className="myt-input"
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                                value={denyData.targetTaskId || ""}
                                onChange={e => {
                                  const selTaskId = e.target.value;
                                  const selTaskObj = displayedReworkTasks.find(t => String(t.taskId || t.id || t.empTaskId) === String(selTaskId));
                                  setDenyData({
                                    ...denyData,
                                    milestone: effectiveMilestone,
                                    targetTaskId: selTaskId,
                                    deliverable: selTaskObj ? (selTaskObj.taskNm || selTaskObj.title || selTaskObj.taskCd) : "",
                                    targetEmpId: selTaskObj ? (selTaskObj.empId || selTaskObj.assignedTo || selTaskObj.executorId) : ""
                                  });
                                }}
                                disabled={!effectiveMilestone || loadingReworkTasks}
                              >
                                <option value="">
                                  {!effectiveMilestone ? "Select Milestone First" : loadingReworkTasks ? "Loading Tasks..." : (displayedReworkTasks.length === 0 ? "No Tasks in this Milestone" : "Select Task")}
                                </option>
                                {displayedReworkTasks.map(t => {
                                  const tId = t.taskId || t.id || t.empTaskId;
                                  const tCode = t.taskCd || t.taskCode || (tId ? formatTaskCode(t.taskCd, tId, false) : "");
                                  const tCd = tCode ? `[${tCode}] ` : '';
                                  const tNm = t.taskNm || t.title || t.name || `Task ${tId}`;
                                  const executorEmpId = t.empId || t.assignedTo || t.executorId;
                                  const executorName = getEmployeeName(executorEmpId, employeesList);
                                  return (
                                    <option key={tId} value={String(tId)}>
                                      {tCd}{tNm}{executorName ? ` — (${executorName})` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>

                          <div className="myt-form-group" style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>Reason</label>
                            <textarea className="myt-input" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", minHeight: "100px", fontSize: "14px" }}
                              placeholder="Enter detailed reason for rework..." value={denyData.reason || ""} onChange={e => setDenyData({ ...denyData, reason: e.target.value })} />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                            <div className="myt-form-group">
                              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>Attachments (optional)</label>
                              <div style={{ width: "100%", padding: "16px", border: "2px dashed #cbd5e1", borderRadius: "8px", textAlign: "center", cursor: "pointer", color: "#64748b", backgroundColor: "#f8fafc", position: "relative" }}>
                                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp" multiple onChange={(e) => setDenyData({ ...denyData, attachments: e.target.files })} style={{ opacity: 0, position: "absolute", top: 0, left: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                                <Paperclip size={18} style={{ verticalAlign: "middle", marginRight: "8px" }} /> <span style={{ fontSize: "14px" }}>Click or drag files to upload</span>
                              </div>
                              {denyData.attachments && denyData.attachments.length > 0 && (
                                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {Array.from(denyData.attachments).map((file, idx) => (
                                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569", backgroundColor: "#f1f5f9", padding: "6px 10px", borderRadius: "6px" }}>
                                      <Paperclip size={14} />
                                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="myt-form-group">
                              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>Impact</label>
                              <select className="myt-input" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                                value={denyData.impact || "Medium"} onChange={e => setDenyData({ ...denyData, impact: e.target.value })}>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
                            <button className="cc-btn secondary" onClick={() => setShowDenyForm(false)} style={{ borderRadius: "8px", padding: "10px 20px" }}>Cancel</button>
                            <button className="cc-btn primary" onClick={() => handleSubmitDeny("REWORK")} disabled={!denyData.reason}
                              style={{ borderRadius: "8px", backgroundColor: "#3b82f6", border: "none", color: "white", padding: "10px 24px", fontSize: "15px", fontWeight: "600" }}>
                              Submit Rework
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER TEAM MEMBERS - For List View
  // ============================================
  const renderTeamMembers = (task) => {
    const rawTask = task.rawTask || task;

    const executorId = rawTask.empId || rawTask.assignedTo || rawTask.executorId;
    const reviewerId = rawTask.reviewerId || rawTask.reviewer;
    const approverId = rawTask.approverId || rawTask.approver;
    const assignedById = rawTask.assignedBy || rawTask.assigned_by || rawTask.createdBy;

    let teamMembers = [
      ...((task.isIndividual || rawTask.taskSource === "INDIVIDUAL" || assignedById) && (assignedById || rawTask.assignedByNm) ? [{
        empId: assignedById,
        role: "Assigned By",
        label: "AB",
        fallbackName: rawTask.assignedByNm || rawTask.assignedByName,
        fallbackPhoto: null
      }] : []),
      {
        empId: executorId,
        role: "Executor",
        label: "EX",
        fallbackName: rawTask.executorName || rawTask.empNm || rawTask.empName || rawTask.assignedToName || rawTask.executorNm,
        fallbackPhoto: rawTask.executorPhoto || rawTask.empPhoto
      },
      {
        empId: reviewerId,
        role: "Reviewer",
        label: "RV",
        fallbackName: rawTask.reviewerName || rawTask.reviewerNm || rawTask.revNm || rawTask.revName,
        fallbackPhoto: rawTask.reviewerPhoto || rawTask.revPhoto
      },
      {
        empId: approverId,
        role: "Approver",
        label: "AP",
        fallbackName: rawTask.approverName || rawTask.approverNm || rawTask.appNm || rawTask.appName,
        fallbackPhoto: rawTask.approverPhoto || rawTask.appPhoto
      }
    ].filter(m => m.empId || m.fallbackName);

    if (Array.isArray(rawTask.teamMembers) && rawTask.teamMembers.length > 0) {
      rawTask.teamMembers.forEach(tm => {
        if (tm.empId && !teamMembers.some(m => String(m.empId) === String(tm.empId))) {
          teamMembers.push({
            empId: tm.empId,
            role: tm.asgnRmk || "Team Member",
            label: "TM",
            fallbackName: null,
            fallbackPhoto: null
          });
        }
      });
    }

    // Fallback for dashboard upcoming tasks which might use an employees array
    if (teamMembers.length === 0 && Array.isArray(rawTask.employees) && rawTask.employees.length > 0) {
      teamMembers = rawTask.employees.map((e, idx) => {
        let rawRole = e.participantType || e.stepType || e.taskRole || e.type || e.role || e.designation || "Executor";
        let label = "EX";
        if (rawRole.toUpperCase().includes("REVIEWER")) label = "RV";
        if (rawRole.toUpperCase().includes("APPROVER")) label = "AP";
        return {
          empId: e.empId || e.employeeId || e.id || `emp-fallback-${idx}`,
          role: rawRole,
          label: label,
          fallbackName: e.fullName || e.empName || e.name || e.employeeName,
          fallbackPhoto: e.photoUrl || e.photo || e.profileImage || null
        };
      }).filter(m => m.fallbackName || m.empId !== `emp-fallback-undefined`);
    }

    if (teamMembers.length === 0) {
      return <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>;
    }

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <style>
          {`
            .team-member-hover {
              position: relative;
            }
            .team-member-hover .member-tooltip {
              opacity: 0;
              visibility: hidden;
              transition: all 0.2s ease-in-out;
              position: absolute;
              bottom: calc(100% + 8px);
              left: 50%;
              transform: translateX(-50%) translateY(4px);
              background-color: #1e293b;
              color: white;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 500;
              white-space: nowrap;
              z-index: 50;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              pointer-events: none;
            }
            .team-member-hover:hover .member-tooltip {
              opacity: 1;
              visibility: visible;
              transform: translateX(-50%) translateY(0);
            }
            .member-tooltip::after {
              content: '';
              position: absolute;
              bottom: -4px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 5px solid #1e293b;
            }
          `}
        </style>
        {teamMembers.map((member, idx) => {
          let empName = getEmployeeName(member.empId, employeesList);
          let photo = getEmployeePhoto(member.empId, employeesList);

          // Fallback to embedded names if API list is empty or failed
          if (!empName || empName === "Unknown" || empName.startsWith("User ")) {
            // Try to find from rawTask.employees array if it exists (like in UserDashboard)
            if (rawTask.employees && Array.isArray(rawTask.employees)) {
              const embeddedEmp = rawTask.employees.find(e =>
                String(e.empId || e.id || e.employeeId) === String(member.empId) ||
                (e.taskRole && String(e.taskRole).toUpperCase().includes(member.label))
              );
              if (embeddedEmp) {
                empName = embeddedEmp.fullName || embeddedEmp.name || embeddedEmp.employeeName || empName;
                photo = embeddedEmp.photoUrl || embeddedEmp.profileImage || photo;
              }
            }
            // If still unknown, use direct fallback fields
            if ((!empName || empName === "Unknown" || empName.startsWith("User ")) && member.fallbackName) {
              empName = member.fallbackName;
            }
            if (!photo && member.fallbackPhoto) {
              photo = member.fallbackPhoto;
            }
          }

          let initials = "";
          if (empName && empName !== "Unknown" && !empName.startsWith("User ")) {
            const parts = empName.trim().split(" ");
            initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
          } else {
            initials = String(member.empId).substring(0, 2).toUpperCase();
          }

          const roleColors = {
            "Assigned By": { bg: "#6366F1", light: "#EEF2FF" },
            "Executor": { bg: "#3B82F6", light: "#DBEAFE" },
            "Reviewer": { bg: "#8B5CF6", light: "#EDE9FE" },
            "Approver": { bg: "#F59E0B", light: "#FEF3C7" }
          };
          const color = roleColors[member.role] || { bg: "#64748B", light: "#F1F5F9" };

          return (
            <div
              key={idx}
              className="team-member-hover"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 6px 2px 2px",
                borderRadius: "16px",
                backgroundColor: color.light,
                border: `1px solid ${color.bg}33`,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {/* Tooltip */}
              <div className="member-tooltip">
                <span style={{ fontWeight: "600" }}>{empName || 'Unknown'}</span>
                <span style={{ color: color.bg, opacity: 0.9, marginLeft: "4px" }}>• {member.role}</span>
              </div>

              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: color.bg,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "8px",
                fontWeight: "700",
                overflow: "hidden",
                flexShrink: 0
              }}>
                {photo ? (
                  <img
                    src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `data:image/jpeg;base64,${photo}`}
                    alt={empName || 'User'}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.textContent = initials || "UN";
                    }}
                  />
                ) : initials || "UN"}
              </div>

              <span style={{
                fontSize: "7px",
                fontWeight: "700",
                color: color.bg,
                backgroundColor: `${color.bg}22`,
                padding: "1px 5px",
                borderRadius: "8px",
                letterSpacing: "0.3px"
              }}>
                {member.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // RENDER ACTION BUTTON - List View
  // ============================================
  const renderActionButton = (task) => {
    if (!task) return null;

    const rawTask = task.rawTask || task;
    const action = getActionButton(rawTask, currentUserEmpId);
    const isDisabled = loadingAction === (task.id || task.taskId);

    if (!action) return null;

    const getButtonStyle = (variant) => {
      switch (variant) {
        case "primary": return { bg: "#3B82F6", hover: "#2563EB", color: "white" };
        case "warning": return { bg: "#F59E0B", hover: "#D97706", color: "white" };
        case "success": return { bg: "#10B981", hover: "#059669", color: "white" };
        case "review": return { bg: "#8B5CF6", hover: "#7C3AED", color: "white" };
        default: return { bg: "#F1F5F9", hover: "#E2E8F0", color: "#475569" };
      }
    };

    const style = getButtonStyle(action.variant);

    const handleClick = async (e) => {
      e.stopPropagation();
      if (isDisabled) return;

      // ALL actions open the same detail screen
      if (action.action === "view") {
        await openTaskDetail(task);
        return;
      }

      // For actions other than 'view', execute then open detail
      switch (action.action) {
        case "start":
          const startedTask = await handleStartTask(task);
          await openTaskDetail(startedTask || task);
          break;
        case "update":
          await openTaskDetail(task);
          break;
        case "review":
          await openTaskDetail(task);
          break;
        case "approve":
          await openTaskDetail(task);
          break;
        default:
          break;
      }
    };

    return (
      <button
        style={{
          backgroundColor: style.bg,
          color: style.color,
          border: action.variant === "secondary" ? "1px solid #E2E8F0" : "none",
          padding: "6px 16px",
          borderRadius: "6px",
          cursor: isDisabled ? "not-allowed" : "pointer",
          fontSize: "12px",
          fontWeight: "600",
          opacity: isDisabled ? 0.6 : 1,
          transition: "all 0.2s",
          minWidth: "60px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px"
        }}
        onClick={handleClick}
        disabled={isDisabled}
        onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.backgroundColor = style.hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = style.bg; }}
      >
        {isDisabled ? (
          <Loader2 size={12} className="spinning" />
        ) : (
          <>
            {action.action === "start" && <Play size={12} />}
            {action.action === "update" && <RotateCw size={12} />}
            {action.action === "view" && <Eye size={12} />}
            {action.action === "review" && <CheckCircle2 size={12} />}
            {action.action === "approve" && <Check size={12} />}
            {action.label}
          </>
        )}
      </button>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  const countTodo = tasks.filter(isToDo).length;
  const countUpcoming = tasks.filter(isUpcomingTab).length;
  const countCompleted = tasks.filter(isCompletedTab).length;
  const countAllTasks = tasks.length;

  // Custom check for overdue
  const countOverdue = tasks.filter(isTaskOverdue).length;

  const showTaskFilters = selectedStatus === "To Do" || selectedStatus === "All Statuses" || selectedStatus === "All Tasks";

  return (
    <div className={`cc-shell-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {!isExternalMode && <Sidebar onLogout={onLogout} />}
      <div className="cc-shell" style={isExternalMode ? { marginLeft: 0, width: "100%", maxWidth: "100vw" } : {}}>
        {!isExternalMode ? (
          <Header
            title="My Tasks"
            subtitle={showDetailView && selectedTask ? selectedTask.title : "View and manage all tasks assigned to you."}
            onLogout={onLogout}
            userRole={userRole}
          />
        ) : (
          <header style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: 0, lineHeight: "1.2" }}>My Tasks</h1>
              <span style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{selectedTask?.title || "Task Details"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{selectedTask?.rawTask?.extEmpNm || "External Associate"}</span>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: "12px" }}>
                  External
                </span>
              </div>
              <div
                style={{ position: "relative" }}
                onMouseEnter={() => setIsExternalProfileHovered(true)}
                onMouseLeave={() => setIsExternalProfileHovered(false)}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    backgroundColor: "#1e3a8a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(30, 58, 138, 0.25)",
                    overflow: "hidden"
                  }}
                >
                  {selectedTask?.rawTask?.photoPath ? (
                    <img
                      src={selectedTask.rawTask.photoPath.startsWith('data:') || selectedTask.rawTask.photoPath.startsWith('http') ? selectedTask.rawTask.photoPath : `data:image/jpeg;base64,${selectedTask.rawTask.photoPath}`}
                      alt="Avatar"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.parentElement.textContent = selectedTask?.rawTask?.extEmpNm ? selectedTask.rawTask.extEmpNm.split(" ").map(p => p[0]).join("").toUpperCase().substring(0, 2) : "KU";
                      }}
                    />
                  ) : (
                    selectedTask?.rawTask?.extEmpNm ? selectedTask.rawTask.extEmpNm.split(" ").map(p => p[0]).join("").toUpperCase().substring(0, 2) : "KU"
                  )}
                </div>

                {isExternalProfileHovered && (
                  <div
                    className="profile-hover-card"
                    style={{
                      position: "absolute",
                      top: "44px",
                      right: 0,
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                      padding: "20px",
                      minWidth: "260px",
                      zIndex: 1000,
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                    <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                        {selectedTask?.rawTask?.extEmpNm || "External Associate"}
                      </h4>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
                        {selectedTask?.rawTask?.companyNm ? `External Associate • ${selectedTask.rawTask.companyNm}` : "External Associate"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <small style={{ fontSize: "10px", textTransform: "uppercase", color: "#94a3b8", fontWeight: "600", letterSpacing: "0.5px" }}>Email</small>
                        <span style={{ fontSize: "13px", color: "#334155", wordBreak: "break-all" }}>
                          {selectedTask?.rawTask?.email || "—"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                        <span style={{
                          width: "8px",
                          height: "8px",
                          background: "#10b981",
                          borderRadius: "50%"
                        }}></span>
                        <span style={{
                          fontSize: "12px",
                          color: "#10b981",
                          fontWeight: "600"
                        }}>
                          Active Status
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <main className="cc-main" style={{ overflow: "visible", padding: isExternalMode ? "24px" : undefined }}>
          {isExternalMode && isExpired ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "65vh",
              textAlign: "center",
              padding: "40px 20px"
            }}>
              <div style={{
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                backgroundColor: expiredReason === "TASK_CLOSED" ? "#dcfce7" : "#fee2e2",
                color: expiredReason === "TASK_CLOSED" ? "#16a34a" : "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
              }}>
                {expiredReason === "TASK_CLOSED" ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
              </div>

              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
                {expiredReason === "TASK_CLOSED" ? "Task Completed & Link Expired" : "Task Link Expired"}
              </h2>

              <p style={{ fontSize: "15px", color: "#64748b", maxWidth: "520px", lineHeight: "1.6", margin: "0 auto 28px auto" }}>
                {expiredMessage || (expiredReason === "TASK_CLOSED" 
                  ? "This task has been marked as Completed / Closed. Access via this link is now expired and locked." 
                  : "The scheduled due date for this task has passed and the access link is now expired. Please contact your Project Administrator if you need an extension.")}
              </p>

              <div style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px 28px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                width: "100%",
                maxWidth: "420px",
                textAlign: "left",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#64748b" }}>Task ID:</span>
                  <span style={{ fontWeight: "600", color: "#0f172a" }}>{selectedTask?.id || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#64748b" }}>Task Name:</span>
                  <span style={{ fontWeight: "600", color: "#0f172a" }}>{selectedTask?.title || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#64748b" }}>Assigned To:</span>
                  <span style={{ fontWeight: "600", color: "#0f172a" }}>{selectedTask?.rawTask?.extEmpNm || "External Associate"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", borderTop: "1px solid #f1f5f9", paddingTop: "10px", marginTop: "2px" }}>
                  <span style={{ color: "#64748b" }}>Link Status:</span>
                  <span style={{
                    fontWeight: "700",
                    fontSize: "12px",
                    color: expiredReason === "TASK_CLOSED" ? "#16a34a" : "#dc2626",
                    backgroundColor: expiredReason === "TASK_CLOSED" ? "#f0fdf4" : "#fef2f2",
                    padding: "2px 10px",
                    borderRadius: "12px"
                  }}>
                    {expiredReason === "TASK_CLOSED" ? "CLOSED & EXPIRED" : "EXPIRED"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {apiError && (
                <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "16px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #fca5a5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><strong>⚠️ Error:</strong> {apiError}</div>
                  <button onClick={() => isExternalMode ? fetchExternalTask() : fetchTasks()} style={{ padding: "6px 16px", backgroundColor: "#b91c1c", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Retry</button>
                </div>
              )}

              {showDetailView && selectedTask ? (
                renderTaskDetailScreen(
                  selectedTask,
                  () => {
                    if (!isExternalMode) {
                      setShowDetailView(false);
                      setSelectedTask(null);
                      setShowDenyForm(false);
                      setUpdateRemarks("");
                      setUpdateAttachments([]);
                    }
                  }
                )
              ) : (
            /* Tasks List View */
            <>
              {/* Metrics Cards */}
              <div className="myt-metrics-grid" style={{ marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "nowrap", overflowX: "auto" }}>
                <div className={`myt-metric-card sketch-layout todo ${selectedStatus === "To Do" ? "active" : ""}`} onClick={() => handleStatusFilterChange("To Do")} style={{ flex: "1", minWidth: "120px" }}>
                  <div className="myt-metric-left"><div className="myt-metric-icon-box yellow-circle"><ClipboardList size={20} /></div><div className="myt-metric-text-group"><div className="myt-metric-title">To-Do</div><div className="myt-metric-subtitle">Active Tasks</div></div></div>
                  <div className="myt-metric-right"><div className="myt-metric-value">{countTodo}</div></div>
                </div>

                <div className={`myt-metric-card sketch-layout upcoming ${selectedStatus === "Upcoming" ? "active" : ""}`} onClick={() => handleStatusFilterChange("Upcoming")} style={{ flex: "1", minWidth: "120px" }}>
                  <div className="myt-metric-left"><div className="myt-metric-icon-box" style={{ backgroundColor: "#e0e7ff", color: "#4f46e5" }}><Calendar size={20} /></div><div className="myt-metric-text-group"><div className="myt-metric-title">Upcoming</div><div className="myt-metric-subtitle">Planned</div></div></div>
                  <div className="myt-metric-right"><div className="myt-metric-value">{countUpcoming}</div></div>
                </div>

                <div className={`myt-metric-card sketch-layout completed ${selectedStatus === "Completed" ? "active" : ""}`} onClick={() => handleStatusFilterChange("Completed")} style={{ flex: "1", minWidth: "120px" }}>
                  <div className="myt-metric-left"><div className="myt-metric-icon-box green-circle"><CheckCircle2 size={20} /></div><div className="myt-metric-text-group"><div className="myt-metric-title">Closed</div><div className="myt-metric-subtitle">Done</div></div></div>
                  <div className="myt-metric-right"><div className="myt-metric-value">{countCompleted}</div></div>
                </div>

                <div className={`myt-metric-card sketch-layout all ${selectedStatus === "All Tasks" ? "active" : ""}`} onClick={() => handleStatusFilterChange("All Tasks")} style={{ flex: "1", minWidth: "120px" }}>
                  <div className="myt-metric-left"><div className="myt-metric-icon-box orange-circle"><Layers size={20} /></div><div className="myt-metric-text-group"><div className="myt-metric-title">All Tasks</div><div className="myt-metric-subtitle">Total Work</div></div></div>
                  <div className="myt-metric-right"><div className="myt-metric-value">{countAllTasks}</div></div>
                </div>
              </div>

              {/* Search and Filters */}
              {showTaskFilters && (
                <div className="myt-tabs-container" style={{ marginBottom: "20px", borderBottom: "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div className="myt-tabs-left" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      className={`myt-filter-btn ${taskFilter === "All" ? "active" : ""}`}
                      onClick={() => { setTaskFilter("All"); setCurrentPage(1); }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: taskFilter === "All" ? "#3B82F6" : "white",
                        color: taskFilter === "All" ? "white" : "#475569",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "all 0.2s"
                      }}
                    >
                      All
                    </button>
                    <button
                      className={`myt-filter-btn ${taskFilter === "OPEN" ? "active" : ""}`}
                      onClick={() => { setTaskFilter("OPEN"); setCurrentPage(1); }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: taskFilter === "OPEN" ? "#3B82F6" : "white",
                        color: taskFilter === "OPEN" ? "white" : "#475569",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "all 0.2s"
                      }}
                    >
                      Open
                    </button>
                    <button
                      className={`myt-filter-btn ${taskFilter === "IN_PROGRESS" ? "active" : ""}`}
                      onClick={() => { setTaskFilter("IN_PROGRESS"); setCurrentPage(1); }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: taskFilter === "IN_PROGRESS" ? "#3B82F6" : "white",
                        color: taskFilter === "IN_PROGRESS" ? "white" : "#475569",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "all 0.2s"
                      }}
                    >
                      Work In Progress
                    </button>
                    <button
                      className={`myt-filter-btn ${taskFilter === "UNDER_REVIEW" ? "active" : ""}`}
                      onClick={() => { setTaskFilter("UNDER_REVIEW"); setCurrentPage(1); }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: taskFilter === "UNDER_REVIEW" ? "#3B82F6" : "white",
                        color: taskFilter === "UNDER_REVIEW" ? "white" : "#475569",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "all 0.2s"
                      }}
                    >
                      Under Review
                    </button>
                    <button
                      className={`myt-filter-btn ${taskFilter === "REASSIGNED" ? "active" : ""}`}
                      onClick={() => { setTaskFilter("REASSIGNED"); setCurrentPage(1); }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: taskFilter === "REASSIGNED" ? "#3B82F6" : "white",
                        color: taskFilter === "REASSIGNED" ? "white" : "#475569",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "all 0.2s"
                      }}
                    >
                      Re-Assigned
                    </button>
                    <button
                      className={`myt-filter-btn ${taskFilter === "OVERDUE" ? "active" : ""}`}
                      onClick={() => { setTaskFilter("OVERDUE"); setCurrentPage(1); }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: taskFilter === "OVERDUE" ? "#EF4444" : "white",
                        color: taskFilter === "OVERDUE" ? "white" : "#475569",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "all 0.2s"
                      }}
                    >
                      Overdue
                    </button>
                  </div>
                  <div className="myt-tabs-right" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div className="myt-search-box" style={{ position: "relative" }}>
                      <Search size={15} className="myt-search-icon" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                      <input
                        type="text"
                        placeholder="Search task..."
                        value={searchInput}
                        onChange={(e) => { setSearchInput(e.target.value); setSearchQuery(e.target.value); }}
                        style={{ padding: "8px 12px 8px 32px", border: "1px solid #e2e8f0", borderRadius: "6px", outline: "none", fontSize: "13px", width: "220px" }}
                        onKeyDown={handleSearchKeyDown}
                      />
                    </div>
                    <button onClick={handleResetFilters} style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", backgroundColor: "white", cursor: "pointer", fontSize: "12px", color: "#64748b" }}>
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="cc-table-panel" style={{ border: "none", boxShadow: "none", padding: 0 }}>
                <div className="cc-table-container">
                  <table className="cc-list-table myt-table">
                    <thead>
                      <tr>
                        <th>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", marginBottom: "2px" }}>TASK</span>
                            <span style={{ fontSize: "11px", fontWeight: "500", color: "#64748b" }}>Task Code / Name<br />Milestone</span>
                          </div>
                        </th>
                        <th>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", marginBottom: "2px" }}>TEAM</span>
                            <span style={{ fontSize: "11px", fontWeight: "500", color: "#64748b" }}>Members</span>
                          </div>
                        </th>
                        <th>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase" }}>PRIORITY</span>
                        </th>
                        <th style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", marginBottom: "2px" }}>DUE DATE</span>
                            <span style={{ fontSize: "11px", fontWeight: "500", color: "#64748b" }}>(Date Only)</span>
                          </div>
                        </th>
                        <th style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", marginBottom: "2px" }}>PROGRESS</span>
                            <span style={{ fontSize: "11px", fontWeight: "500", color: "#64748b" }}>(Status &bull; Process &bull; Time)</span>
                          </div>
                        </th>
                        <th style={{ textAlign: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase" }}>ACTION</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr><td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}><Loader2 size={24} className="spinning" /> Loading tasks...</td></tr>
                      ) : paginatedTasks.length > 0 ? (
                        paginatedTasks.map((task) => {
                          const progressBadge = getProgressBadge(task.status);
                          const processIcon = getProcessIcon(task.rawTask?.prcsYesActn);
                          const parsedRemarks = parseRemarksHistory(task.rawTask?.addlRem || task.rawTask?.remarks, task, employeesList);
                          const wasReassigned = parsedRemarks.some(r => r.action?.toLowerCase().includes("reassign"));
                          const timeStatus = calculateTimeStatus(task.rawTask || task);
                          const priorityBadge = getPriorityBadge(task.priority);
                          const isCompleted = task.rawStatus === "COMPLETED" || task.rawStatus === "CLOSED";
                          const isOverdue = isTaskOverdue(task);

                          return (
                            <tr key={task.id || task.taskId} onClick={() => { openTaskDetail(task); }} style={{ cursor: "pointer", backgroundColor: isOverdue ? "#FEF2F2" : "transparent" }}>
                              <td style={{ maxWidth: "250px" }}>
                                <div style={{ fontWeight: "600", color: "#0f172a", marginBottom: "4px" }}>{task.taskCode || task.id}</div>
                                <div style={{ fontWeight: "500", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={task.title}>{task.title}</div>
                                {!task.isIndividual && task.project !== "Individual Task" && task.milestone && task.milestone !== "—" && (
                                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>{task.milestone}</div>
                                )}
                              </td>
                              <td>
                                {renderTeamMembers(task)}
                              </td>
                              <td>
                                {!isCompleted && (
                                  <span className="cc-status-badge" style={{ backgroundColor: priorityBadge.bg, color: priorityBadge.color, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                                    {task.priority === "ATMOST CRITICAL" ? "Atmost Critical" : task.priority}
                                  </span>
                                )}
                              </td>
                              <td style={{ fontWeight: "600", color: isOverdue ? "#EF4444" : "#0f172a", textAlign: "center" }}>
                                {formatDate(task.dueDate) || "—"}
                                {isOverdue && <span style={{ display: "block", fontSize: "10px", color: "#EF4444" }}>⚠️ Overdue</span>}
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                  <span className="cc-status-badge" style={{ backgroundColor: progressBadge.bg, color: progressBadge.color, minWidth: "90px", textAlign: "center", display: "inline-block", textTransform: "uppercase", fontWeight: "700", padding: "4px 12px", borderRadius: "12px", fontSize: "11px" }}>{progressBadge.label}</span>
                                  {/* Hide process icon for closed tasks — only show Lead/Lag/On Time clock */}
                                  {!isCompleted && (
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      {processIcon && <div className="myt-custom-tooltip-wrap" title={processIcon.title} style={{ color: processIcon.color, display: "flex", alignItems: "center", cursor: "help" }}><processIcon.icon size={18} strokeWidth={2.5} /></div>}
                                      {wasReassigned && task.rawTask?.prcsYesActn !== "REASSIGN" && (
                                        <div className="myt-custom-tooltip-wrap" title="Previously Reassigned" style={{ color: "#4F46E5", display: "flex", alignItems: "center", cursor: "help" }}><ReassignIcon size={18} color="#4F46E5" strokeWidth={2.5} /></div>
                                      )}
                                    </div>
                                  )}
                                  <div className="myt-custom-tooltip-wrap" title={timeStatus.title} style={{ color: timeStatus.color, display: "flex", alignItems: "center", cursor: "help" }}><timeStatus.icon size={18} strokeWidth={2.5} /></div>
                                </div>
                              </td>
                              <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                                {renderActionButton(task)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No tasks found.</td></tr>
                      )}
                    </tbody>
                  </table>

                  {sortedTasks.length > 0 && (
                    <div className="myt-pagination-container">
                      <div className="myt-pagination-info">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedTasks.length)} of {sortedTasks.length} tasks</div>
                      <div className="myt-pagination-controls">
                        <button className="myt-page-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}><ChevronLeft size={16} /></button>
                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                          const pageNum = i + 1;
                          return <button key={i} className={`myt-page-btn ${currentPage === pageNum ? 'active' : ''}`} onClick={() => handlePageChange(pageNum)}>{pageNum}</button>;
                        })}
                        {totalPages > 5 && <span style={{ padding: "0 4px", color: "#94a3b8" }}>...</span>}
                        {totalPages > 5 && <button className="myt-page-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>}
                        <button className="myt-page-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}><ChevronRight size={16} /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
            </>
          )}
        </main>
      </div>

      <AlertModal isOpen={alertOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertOpen(false)} />
    </div>
  );
};

export default MyTasks;
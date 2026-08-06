import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import { safeFetch, apiPatch, apiPost, apiPut, apiDelete } from "../../utils/api";
import { getScreenPermission } from "../../utils/permissions";
import {
  Calendar as CalendarIcon,
  Search,
  SlidersHorizontal,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  ListTodo,
  TrendingUp,
  Layers,
  Info,
  User,
  Plus,
  Grid,
  CheckSquare,
  Trash2,
  Bell,
  Check,
  ChevronRight,
  Hand,
  Menu,
  ChevronDown
} from "lucide-react";
import "../../styles/TaskBoard.css";
import plantImage from "../../assets/cbg_plant_construction.png";

// ─── Searchable Select Component ──────────────────────────────────────────
const SearchableSelect = ({ options, value, onChange, placeholder, name, style, disabled, showSearch = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = showSearch
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;
  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: '10px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          backgroundColor: disabled ? '#f1f5f9' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          height: '38px',
          ...style
        }}
      >
        <span style={{ color: selected ? '#0f172a' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ color: '#64748b', flexShrink: 0, marginLeft: 8 }} />
      </div>
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 1000
        }}>
          {showSearch && (
            <div style={{ padding: '8px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  outline: 'none',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.length > 0 ? (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange({ target: { name, value: opt.value } });
                    setIsOpen(false);
                    setSearch("");
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: String(value) === String(opt.value) ? '#f1f5f9' : 'transparent',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = String(value) === String(opt.value) ? '#f1f5f9' : 'transparent'}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div style={{ padding: '10px 12px', color: '#64748b', fontSize: '14px', textAlign: 'center' }}>No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Helper: generate consistent color from string ──────────────────────
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

// ─── Mapping helpers ──────────────────────────────────────────────────────
const mapTaskStatus = (taskSts) => {
  if (!taskSts) return "Not Started";
  const s = taskSts.toUpperCase();
  if (s === "OPEN") return "Not Started";
  if (s === "WIP") return "In Progress";
  if (s === "SUBMIT_REVIEW" || s === "UNDER_REVIEW") return "Under Review";
  if (s === "COMPLETED" || s === "CLOSED") return "Closed";
  if (s === "REWORK") return "In Progress";
  return "Not Started";
};

const mapStatusToApi = (uiStatus) => {
  if (uiStatus === "Not Started") return "OPEN";
  if (uiStatus === "In Progress") return "WIP";
  if (uiStatus === "Under Review") return "SUBMIT_REVIEW";
  if (uiStatus === "Completed" || uiStatus === "Closed") return "CLOSED";
  if (uiStatus === "Overdue") return "OPEN";
  return "OPEN";
};

const mapPriorityFromApi = (prty) => {
  if (!prty) return "Medium";
  const p = String(prty).toUpperCase().trim();
  if (p === "CRITICAL" || p === "CRIT" || p === "1") return "Critical";
  if (p === "HIGH" || p === "H" || p === "2") return "High";
  if (p === "MEDIUM" || p === "MED" || p === "M" || p === "3") return "Medium";
  if (p === "NORMAL" || p === "NORM" || p === "N" || p === "4") return "Normal";
  if (p === "LOW" || p === "L" || p === "5") return "Low";
  return "Medium";
};

const getScheduleStatusInfo = (task) => {
  if (!task) return { status: 'On time', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };

  const refDate = task.actCmpDt || task.actcmpdt || task.completedOn || task.submittedOn || task.rawTask?.actCmpDt || task.rawTask?.actcmpdt || task.rawTask?.tentEndDt;
  const due = task.dueDate || task.due || task.rawTask?.tentEndDt || task.rawTask?.endDt || task.rawTask?.end_dt;

  let status = 'On time';

  if (refDate && due) {
    const refStr = String(refDate).split('T')[0].split(' ')[0];
    const dueStr = String(due).split('T')[0].split(' ')[0];
    if (refStr < dueStr) status = 'Lead';
    else if (refStr > dueStr) status = 'Lag';
    else status = 'On time';
  } else if (due) {
    const todayStr = new Date().toISOString().split('T')[0];
    const dueStr = String(due).split('T')[0].split(' ')[0];
    if (todayStr > dueStr) status = 'Lag';
    else status = 'On time';
  }

  if (status === 'Lead') {
    return { status: 'Lead', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  } else if (status === 'Lag') {
    return { status: 'Lag', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  }
  return { status: 'On time', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
};

const getPriorityBadgeInfo = (priorityStr) => {
  const p = String(priorityStr || 'Medium').toLowerCase().trim();
  if (p === 'critical') return { label: 'Critical', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' };
  if (p === 'high') return { label: 'High', bg: '#fee2e2', color: '#ef4444', border: '#fca5a5' };
  if (p === 'medium') return { label: 'Medium', bg: '#fff7ed', color: '#f97316', border: '#ffedd5' };
  if (p === 'normal') return { label: 'Normal', bg: '#f0f9ff', color: '#0284c7', border: '#bae6fd' };
  if (p === 'low') return { label: 'Low', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  return { label: priorityStr || 'Medium', bg: '#fff7ed', color: '#f97316', border: '#ffedd5' };
};

const mapBackendTask = (t, projects, milestones, employees) => {
  const tMId = String(t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id);
  const milestone = (milestones || []).find(m => (m.mId || m.mid || m.id) && String(m.mId || m.mid || m.id) === tMId);
  const pId = t.prjId || t.prjid || t.projectId || milestone?.prjId || milestone?.prjid || milestone?.project?.prjId || milestone?.projectId || t.project?.prjId || t.project?.id;
  const project = pId ? (projects || []).find(p => (p.prjId || p.id || p.prjid) && String(p.prjId || p.id || p.prjid) === String(pId)) : null;
  const employee = (employees || []).find(e => (e.empId || e.id) && String(e.empId || e.id) === String(t.empId));

  let status = "Not Started";
  const rawSts = (t.taskSts || t.tasksts || t.status || "").toString().toUpperCase().trim();
  const subSts = (t.subStatus || t.substatus || "").toString().toUpperCase().trim();
  const prcsActn = (t.prcsYesActn || t.prcsyesactn || "").toString().toUpperCase().trim();

  if (rawSts === "COMPLETED" || rawSts === "CLOSED" || rawSts === "4") {
    status = "Closed";
  } else if (
    subSts === "UNDER REVIEW" ||
    subSts === "UNDER_REVIEW" ||
    rawSts === "UNDER_REVIEW" ||
    rawSts === "SUBMIT_REVIEW" ||
    prcsActn === "PENDING_REVIEWER" ||
    prcsActn === "PENDING_APPROVER"
  ) {
    status = "Under Review";
  } else if (rawSts === "WIP" || rawSts === "IN_PROGRESS" || rawSts === "WORK_IN_PROGRESS" || rawSts === "ASSIGNED" || rawSts === "3" || subSts === "REWORK" || rawSts === "REWORK") {
    status = "In Progress";
  } else {
    const today = new Date().toISOString().split("T")[0];
    if (t.endDt && t.endDt < today) {
      status = "Overdue";
    } else {
      status = "Not Started";
    }
  }

  let progress = 0;
  if (t.taskSts === "COMPLETED" || t.taskSts === "CLOSED") {
    progress = 100;
  } else if (t.taskSts === "SUBMIT_REVIEW" || t.taskSts === "UNDER_REVIEW") {
    progress = 90;
  } else if (t.taskSts === "WIP") {
    progress = 50;
  } else if (t.taskSts === "REWORK") {
    progress = 30;
  } else {
    progress = 0;
  }

  const assigneeName = employee ? `${employee.fstNm || employee.firstName || ""} ${employee.lstNm || employee.lastName || ""}`.trim() || "Unassigned" : "Unassigned";

  return {
    id: t.taskCd || t.taskcd || `TSK-${t.taskId || t.taskid}`,
    taskId: t.taskId || t.taskid,
    title: t.taskNm || t.tasknm,
    project: project ? (project.prjNm || project.name || project.prjnm) : "Unknown Project",
    projectId: project ? (project.prjId || project.id || project.prjid) : null,
    milestone: milestone ? `${milestone.mlstnCd || milestone.mlstncd || "ML-???"} ${milestone.mlstnTtl || milestone.mlstnttl || ""}` : "Unknown Milestone",
    milestoneId: t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id,
    assignee: assigneeName,
    empId: t.empId || t.empid,
    progress: progress,
    dueDate: t.endDt || t.enddt || "",
    startDate: t.stDt || t.stdt || "",
    subtasksCount: t.wrkDays || t.wrkdays || 3,
    subtasksCompleted: (status === "Closed" || status === "Completed") ? (t.wrkDays || t.wrkdays || 3) : 0,
    priority: mapPriorityFromApi(t.taskPrty || t.taskprty || t.priority || t.prty || t.task_prty || project?.prjPrty || project?.prjprty || "Medium"),
    taskType: (t.taskAsgnTo || t.taskasgnto) === "EXTERNAL" ? "External" : "Internal",
    status: status,
    description: t.taskDesc || t.taskdesc || "",
    rawTask: t
  };
};

// ─── Main Component ────────────────────────────────────────────────────────
const TaskBoard = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('TASK_BOARD');
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [milestonesRaw, setMilestonesRaw] = useState([]);
  const [projectsRaw, setProjectsRaw] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [plantsList, setPlantsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [designationsList, setDesignationsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("All");

  const fetchLiveTasks = async () => {
    try {
      const [liveProjects, liveMilestones, liveTasks, liveEmployees, profileRes, companies, plants, departments, designations] = await Promise.all([
        safeFetch("/api/project-live", []),
        safeFetch("/api/milestone-live", []),
        safeFetch("/api/task-live", []),
        safeFetch("/api/employees", []),
        safeFetch("/api/profile"),
        safeFetch("/api/companies", []),
        safeFetch("/api/plants", []),
        safeFetch("/api/departments", []),
        safeFetch("/api/designations", [])
      ]);

      setProjectsRaw(liveProjects);
      setMilestonesRaw(liveMilestones);
      setEmployeesList(liveEmployees);
      setCompaniesList(companies);
      setPlantsList(plants);
      setDepartmentsList(departments);
      setDesignationsList(designations);

      const userTasks = liveTasks || [];

      const allMapped = (liveTasks || []).map(t => mapBackendTask(t, liveProjects, liveMilestones, liveEmployees));
      setAllTasks(allMapped);

      const mapped = userTasks.map(t => mapBackendTask(t, liveProjects, liveMilestones, liveEmployees));
      setTasks(mapped);
      setApiLoaded(true);
    } catch (err) {
      console.error("Failed to load tasks from API:", err);
    }
  };

  useEffect(() => {
    fetchLiveTasks();
  }, []);

  // ─── State for filters ──────────────────────────────────────────────────
  const [selectedMilestone, setSelectedMilestone] = useState("All Milestones");
  const [selectedAssignee, setSelectedAssignee] = useState("All Employees");
  const [selectedTaskType, setSelectedTaskType] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Modals state ──────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // ─── Add task form state ──────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState("");
  const [newMilestone, setNewMilestone] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newTaskType, setNewTaskType] = useState("Internal");
  const [newDueDate, setNewDueDate] = useState("");
  const [newSubtasksCount, setNewSubtasksCount] = useState(3);
  const [newDescription, setNewDescription] = useState("");
  const [targetColumn, setTargetColumn] = useState("Not Started");

  // ─── Drag & drop ──────────────────────────────────────────────────────
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedOverCol, setDraggedOverCol] = useState(null);

  // ─── Refs ──────────────────────────────────────────────────────────────
  const boardRef = useRef(null);
  const colRefs = {
    "Not Started": useRef(null),
    "In Progress": useRef(null),
    "Under Review": useRef(null),
    "Closed": useRef(null),
    "Completed": useRef(null),
    "Overdue": useRef(null),
  };

  // ─── Scroll helper ────────────────────────────────────────────────────
  const scrollToCol = (status) => {
    if (status === "All Statuses") {
      boardRef.current?.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const colEl = colRefs[status]?.current;
    if (colEl && boardRef.current) {
      const boardLeft = boardRef.current.getBoundingClientRect().left;
      const colLeft = colEl.getBoundingClientRect().left;
      boardRef.current.scrollBy({ left: colLeft - boardLeft - 12, behavior: "smooth" });
    }
  };

  // ─── Lock body scroll when modals open ──────────────────────────────
  useEffect(() => {
    if (showAddModal || showDetailModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAddModal, showDetailModal]);

  // ─── Derived data for dropdowns ──────────────────────────────────────
  const derivedMilestones = milestonesRaw
    .filter(m => {
      const mPrjId = String(m.prjId || m.prjid || m.project?.prjId || m.projectId || m.prj_id || m.drftPrjId);
      return selectedProjectId === "All" || mPrjId === String(selectedProjectId);
    })
    .map(m => ({
      value: `${m.mlstnCd || "ML-???"} ${m.mlstnTtl || ""}`,
      label: `${m.mlstnCd || "ML-???"} ${m.mlstnTtl || ""}`
    }))
    .filter(Boolean);

  // ─── Format assignee options with designation + company/plant ──────────
  const getAssigneeLabel = (emp) => {
    const name = `${emp.fstNm || emp.firstName || ""} ${emp.lstNm || emp.lastName || ""}`.trim();
    let desig = emp.designation || emp.role;
    if (!desig) {
      const desigObj = designationsList.find(d => String(d.desigId || d.id) === String(emp.desigId));
      desig = desigObj?.desigNm || "N/A";
    }
    let orgName = "";
    if (emp.coyId) {
      const coy = companiesList.find(c => String(c.coyId || c.id) === String(emp.coyId));
      orgName = coy ? coy.coyNm : "";
    } else if (emp.pltId) {
      const plt = plantsList.find(p => String(p.pltId || p.id) === String(emp.pltId));
      orgName = plt ? plt.pltNm : "";
    }
    if (!orgName) orgName = "N/A";
    return `${name} – ${desig} – ${orgName}`;
  };

  const assigneeOptions = employeesList.map(emp => ({
    value: emp.empId,
    label: getAssigneeLabel(emp)
  }));

  // ─── Filter and sorting ──────────────────────────────────────────────
  const baseFilteredTasks = tasks.filter((task) => {
    const matchProject = selectedProjectId === "All" || String(task.projectId) === String(selectedProjectId);
    const matchMilestone = selectedMilestone === "All Milestones" || task.milestone === selectedMilestone;
    const matchAssignee = selectedAssignee === "All Employees" || task.assignee === selectedAssignee;
    const matchTaskType = selectedTaskType === "All" || task.taskType === selectedTaskType;
    const matchPriority = selectedPriority === "All" || task.priority === selectedPriority;
    const matchSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchProject && matchMilestone && matchAssignee && matchTaskType && matchPriority && matchSearch;
  });

  const filteredTasks = baseFilteredTasks.filter(task => {
    return selectedStatus === "All Statuses" || task.status === selectedStatus;
  });

  const projectsToDisplay = selectedProjectId === "All" 
    ? projectsRaw 
    : projectsRaw.filter(p => String(p.prjId || p.prjid || p.id) === String(selectedProjectId));

  // ─── Drag & drop handlers ────────────────────────────────────────────
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    setDraggedOverCol(status);
  };

  const handleDragLeave = () => {
    setDraggedOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskIdVal = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskIdVal) return;

    const taskObj = tasks.find(t => t.id === taskIdVal);
    if (!taskObj || !taskObj.taskId) return;

    const backendSts = mapStatusToApi(targetStatus);

    try {
      setTasks(prev => prev.map(t => t.id === taskIdVal ? { ...t, status: targetStatus } : t));
      await apiPatch(`/api/task-live/${taskObj.taskId}/status`, { taskSts: backendSts });
      await fetchLiveTasks();
    } catch (err) {
      console.error("Failed to update status on drag drop:", err);
    }

    setDraggedTaskId(null);
    setDraggedOverCol(null);
  };

  // ─── Add Task ─────────────────────────────────────────────────────────
  const openAddTaskModal = (colStatus) => {
    setTargetColumn(colStatus);
    setNewTitle("");
    setNewDueDate("");
    setNewDescription("");
    setNewSubtasksCount(3);
    setShowAddModal(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const msObj = milestonesRaw.find(m => `${m.mlstnCd || "ML-???"} ${m.mlstnTtl || ""}` === newMilestone);
    const mId = msObj ? msObj.mId : (milestonesRaw[0]?.mId || 1);

    const empObj = employeesList.find(emp => getAssigneeLabel(emp) === newAssignee);
    const empId = empObj ? empObj.empId : null;

    const backendSts = mapStatusToApi(targetColumn);

    const taskObj = {
      taskNm: newTitle,
      mId: mId,
      empId: empId,
      taskAsgnTo: newTaskType === "External" ? "EXTERNAL" : "INTERNAL",
      taskSts: backendSts,
      taskDesc: newDescription || "",
      stDt: new Date().toISOString().split("T")[0],
      endDt: newDueDate || new Date().toISOString().split("T")[0],
      noOfDays: 5,
      wrkDays: Number(newSubtasksCount) || 5
    };

    try {
      await apiPost("/api/task-live", taskObj);
      await fetchLiveTasks();
      setShowAddModal(false);
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  // ─── View Details ────────────────────────────────────────────────────
  const handleCardClick = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  // ─── Toggle subtask ──────────────────────────────────────────────────
  const toggleSubtask = async () => {
    if (!selectedTask || !selectedTask.taskId) return;
    const completed = selectedTask.subtasksCompleted;
    const total = selectedTask.subtasksCount;
    let nextCompleted = completed;

    if (completed < total) {
      nextCompleted = completed + 1;
    } else {
      nextCompleted = 0;
    }

    const newProgress = Math.round((nextCompleted / total) * 100);
    const updatedStatus = newProgress === 100 ? "Closed" : selectedTask.status;
    const backendSts = mapStatusToApi(updatedStatus);

    try {
      const updatedDetails = {
        ...selectedTask.rawTask,
        taskSts: backendSts,
        wrkDays: total
      };

      await apiPut(`/api/task-live/${selectedTask.taskId}`, updatedDetails);
      await fetchLiveTasks();

      const freshTask = tasks.find(t => t.taskId === selectedTask.taskId);
      if (freshTask) {
        setSelectedTask(freshTask);
      } else {
        setShowDetailModal(false);
      }
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
    }
  };

  // ─── Delete Task ──────────────────────────────────────────────────────
  const handleDeleteTask = async (taskIdVal) => {
    const taskObj = tasks.find(t => t.id === taskIdVal || String(t.taskId) === String(taskIdVal));
    if (!taskObj || !taskObj.taskId) return;

    try {
      await apiDelete(`/api/task-live/${taskObj.taskId}`);
      await fetchLiveTasks();
      setShowDetailModal(false);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const day = parts[2];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthsFull = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parseInt(day, 10)}-${monthsFull[monthIndex]}-${parts[0]}`;
  };

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  const getTasksByStatus = (status) => {
    return filteredTasks.filter(t => t.status === status);
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="tb-shell-container">
      <Sidebar onLogout={onLogout} />

      <div className="tb-shell">
        <Header title="Task Board" subtitle="Visualize and manage tasks across all milestones" />

        <main className="tb-main">

          {/* ===== ROW 1: Filter Dropdowns + Search ===== */}
          <div className="tb-filter-toolbar">
            <div className="tb-filters-group">
              {/* Project */}
              <div className="tb-filter-field">
                <label>Project</label>
                <SearchableSelect
                  name="project"
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedMilestone("All Milestones");
                  }}
                  options={[
                    { value: "All", label: "All Projects" },
                    ...projectsRaw.map(p => ({
                      value: p.prjId || p.id,
                      label: `${p.prjCd || 'PRJ'} - ${p.prjNm || p.name}`
                    }))
                  ]}
                  placeholder="Select Project"
                />
              </div>

              {/* Milestone */}
              <div className="tb-filter-field">
                <label>Milestone</label>
                <SearchableSelect
                  name="milestone"
                  value={selectedMilestone}
                  onChange={(e) => setSelectedMilestone(e.target.value)}
                  options={[
                    { value: "All Milestones", label: "All Milestones" },
                    ...derivedMilestones
                  ]}
                  placeholder="Select Milestone"
                />
              </div>

              {/* Priority */}
              <div className="tb-filter-field">
                <label>Priority</label>
                <SearchableSelect
                  name="priority"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  showSearch={false}
                  options={[
                    { value: "All", label: "All" },
                    { value: "Critical", label: "Critical" },
                    { value: "High", label: "High" },
                    { value: "Medium", label: "Medium" },
                    { value: "Normal", label: "Normal" },
                    { value: "Low", label: "Low" }
                  ]}
                  placeholder="Select Priority"
                />
              </div>

              {/* Search bar */}
              <div className="tb-filter-field" style={{ minWidth: "180px", flex: "1.5" }}>
                <label style={{ opacity: 0 }}>Search</label>
                <div className="tb-search-box-wrap" style={{ width: "100%" }}>
                  <Search size={15} className="tb-search-box-icon" />
                  <input
                    type="text"
                    placeholder="Search Task..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            
          </div>

          {/* Project Summary Cards */}
          {selectedProjectId !== "All" && (
            <div className="tb-projects-wrapper" style={{ paddingBottom: '15px' }}>
              {projectsToDisplay.map((proj) => {
                const activePlant = plantsList.find(pl => pl.pltId === proj.pltId)?.pltNm || "N/A";
                const activeDept = departmentsList.find(d => d.deptId === proj.deptId)?.deptNm || "Projects";
                
                const pTasks = allTasks.filter(t => String(t.projectId) === String(proj.prjId || proj.prjid || proj.id));
                const totalTasksCount = pTasks.length;
                const notStartedCount = pTasks.filter(t => t.status === "Not Started").length;
                const inProgressCount = pTasks.filter(t => t.status === "In Progress" || t.status === "Under Review").length;
                const completedCount = pTasks.filter(t => t.status === "Completed" || t.status === "Closed").length;
                const overdueCount = pTasks.filter(t => t.status === "Overdue" || (t.dueDate && t.dueDate < new Date().toISOString().split("T")[0] && t.status !== "Closed")).length;

                const notStartedPct = totalTasksCount > 0 ? ((notStartedCount / totalTasksCount) * 100).toFixed(2) : "0.00";
                const inProgressPct = totalTasksCount > 0 ? ((inProgressCount / totalTasksCount) * 100).toFixed(2) : "0.00";
                const completedPct = totalTasksCount > 0 ? ((completedCount / totalTasksCount) * 100).toFixed(2) : "0.00";
                const overduePct = totalTasksCount > 0 ? ((overdueCount / totalTasksCount) * 100).toFixed(2) : "0.00";

                return (
                  <div key={proj.prjId} className="tb-proj-summary-card">
                    <div className="tb-proj-left">
                      <img src={plantImage} alt="Plant Construction" className="tb-proj-thumbnail" />
                      <div className="tb-proj-info">
                        <div className="tb-proj-title-row">
                          <h2 className="tb-proj-title">{proj.prjNm || "Unknown Project"}</h2>
                          <span className="tb-badge live">{proj.prjSts || "LIVE"}</span>
                          <span className="tb-badge proj-code">{proj.prjCd || "N/A"}</span>
                        </div>
                        <div className="tb-proj-meta-row">
                          <div className="tb-proj-meta-item">
                            <User size={13} />
                            <span>{activePlant}</span>
                          </div>
                          <div className="tb-proj-meta-item">
                            <Layers size={13} />
                            <span>Department: {activeDept}</span>
                          </div>
                          <div className="tb-proj-meta-item">
                            <CalendarIcon size={13} />
                            <span>{`${proj.stDt || "N/A"} to ${proj.endDt || "N/A"}`}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="tb-proj-metrics">
                      <div className="tb-proj-metric-item" onClick={() => setSelectedStatus("All Statuses")} style={{ cursor: "pointer" }}>
                        <span className="tb-proj-metric-label">Total Tasks</span>
                        <span className="tb-proj-metric-val">{totalTasksCount}</span>
                      </div>
                      <div className="tb-proj-metric-item completed" onClick={() => setSelectedStatus("Closed")} style={{ cursor: "pointer" }}>
                        <span className="tb-proj-metric-label">Closed</span>
                        <span className="tb-proj-metric-val">
                          {completedCount} <span>({completedPct}%)</span>
                        </span>
                      </div>
                      <div className="tb-proj-metric-item in-progress" onClick={() => setSelectedStatus("In Progress")} style={{ cursor: "pointer" }}>
                        <span className="tb-proj-metric-label">In Progress</span>
                        <span className="tb-proj-metric-val">
                          {inProgressCount} <span>({inProgressPct}%)</span>
                        </span>
                      </div>
                      <div className="tb-proj-metric-item not-started" onClick={() => setSelectedStatus("Not Started")} style={{ cursor: "pointer" }}>
                        <span className="tb-proj-metric-label">Not Started</span>
                        <span className="tb-proj-metric-val">
                          {notStartedCount} <span>({notStartedPct}%)</span>
                        </span>
                      </div>
                      <div className="tb-proj-metric-item overdue" onClick={() => setSelectedStatus("Overdue")} style={{ cursor: "pointer" }}>
                        <span className="tb-proj-metric-label">Overdue</span>
                        <span className="tb-proj-metric-val">
                          {overdueCount} <span>({overduePct}%)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== ROW 2: Status Tab Pills ===== */}
          <div className="tb-status-tabs">
            {[
              { label: "All", value: "All Statuses", color: "#64748b" },
              { label: "Not Started", value: "Not Started", color: "#2563eb" },
              { label: "In Progress", value: "In Progress", color: "#f97316" },
              { label: "Under Review", value: "Under Review", color: "#a855f7" },
              { label: "Closed", value: "Closed", color: "#16a34a" },
              { label: "Overdue", value: "Overdue", color: "#ef4444" },
            ].map(tab => (
              <button
                key={tab.value}
                className={`tb-status-tab ${selectedStatus === tab.value ? "active" : ""}`}
                style={selectedStatus === tab.value ? { borderColor: tab.color, color: tab.color, background: tab.color + "12" } : {}}
                onClick={() => {
                  setSelectedStatus(tab.value);
                  setTimeout(() => scrollToCol(tab.value), 30);
                }}
              >
                <span
                  className="tb-status-tab-dot"
                  style={{ background: tab.color }}
                />
                {tab.label}
                <span
                  className="tb-status-tab-count"
                  style={selectedStatus === tab.value ? { background: tab.color, color: "#fff" } : {}}
                >
                  {tab.value === "All Statuses"
                    ? baseFilteredTasks.length
                    : baseFilteredTasks.filter(t => t.status === tab.value).length}
                </span>
              </button>
            ))}
          </div>

          {/* Kanban Columns Board */}
          <div
            className={`tb-board${selectedStatus !== "All Statuses" ? " tb-board-single" : ""}`}
            ref={boardRef}
          >
            {/* Column 1: Not Started */}
            {(selectedStatus === "All Statuses" || selectedStatus === "Not Started") && (
              <div
                ref={colRefs["Not Started"]}
                className={`tb-col not-started`}
                
              >
                <div className="tb-col-header">
                  <div className="tb-col-title-wrap">
                    <h3 className="tb-col-title">Not Started</h3>
                    <span className="tb-col-badge">{getTasksByStatus("Not Started").length}</span>
                  </div>
                </div>
                <div className="tb-cards-container">
                  {getTasksByStatus("Not Started").map(task => (
                    <div
                      key={task.id}
                      className="tb-card"
                      
                      onClick={() => handleCardClick(task)}
                    >
                      <div className="tb-card-header">
                        <span className="tb-card-id">{task.id}</span>
                        <span className={`tb-card-prio ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      </div>
                      <h4 className="tb-card-title">{task.title}</h4>
                      <p className="tb-card-subtitle">{task.milestone}</p>
                      <div className="tb-card-footer">
                        <div className="tb-card-assignee">
                          <div
                            className="tb-card-avatar"
                            style={{
                              backgroundColor: stringToColor(task.assignee),
                              color: "#fff"
                            }}
                          >
                            {getInitials(task.assignee)}
                          </div>
                          <span className="tb-card-name">{task.assignee}</span>
                        </div>
                        <div className="tb-card-date-info">
                          <CalendarIcon size={12} />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                        {task.subtasksCount > 0 && (
                          <div className="tb-card-subtasks-count">
                            <CheckSquare size={11} />
                            <span>{task.subtasksCompleted}/{task.subtasksCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Column 2: In Progress */}
            {(selectedStatus === "All Statuses" || selectedStatus === "In Progress") && (
              <div
                ref={colRefs["In Progress"]}
                className={`tb-col in-progress`}
                
              >
                <div className="tb-col-header">
                  <div className="tb-col-title-wrap">
                    <h3 className="tb-col-title">In Progress</h3>
                    <span className="tb-col-badge">{getTasksByStatus("In Progress").length}</span>
                  </div>
                </div>
                <div className="tb-cards-container">
                  {getTasksByStatus("In Progress").map(task => (
                    <div
                      key={task.id}
                      className="tb-card"
                      
                      onClick={() => handleCardClick(task)}
                    >
                      <div className="tb-card-header">
                        <span className="tb-card-id">{task.id}</span>
                        <span className={`tb-card-prio ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      </div>
                      <h4 className="tb-card-title">{task.title}</h4>
                      <p className="tb-card-subtitle">{task.milestone}</p>
                      {task.progress !== undefined && (
                        <div className="tb-card-progress">
                          <div className="tb-card-progress-header">
                            <span style={{ fontSize: '10px', color: '#64748b' }}>Progress</span>
                            <span style={{ fontSize: '11px', fontWeight: '700' }}>{task.progress}%</span>
                          </div>
                          <div className="tb-card-progress-bar">
                            <div className="tb-card-progress-fill in-progress" style={{ width: `${task.progress}%` }}></div>
                          </div>
                        </div>
                      )}
                      <div className="tb-card-footer">
                        <div className="tb-card-assignee">
                          <div
                            className="tb-card-avatar"
                            style={{
                              backgroundColor: stringToColor(task.assignee),
                              color: "#fff"
                            }}
                          >
                            {getInitials(task.assignee)}
                          </div>
                          <span className="tb-card-name">{task.assignee}</span>
                        </div>
                        <div className="tb-card-date-info">
                          <CalendarIcon size={12} />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                        {task.subtasksCount > 0 && (
                          <div className="tb-card-subtasks-count">
                            <CheckSquare size={11} />
                            <span>{task.subtasksCompleted}/{task.subtasksCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Column 3: Under Review */}
            {(selectedStatus === "All Statuses" || selectedStatus === "Under Review") && (
              <div
                ref={colRefs["Under Review"]}
                className={`tb-col under-review`}
                
              >
                <div className="tb-col-header">
                  <div className="tb-col-title-wrap">
                    <h3 className="tb-col-title">Under Review</h3>
                    <span className="tb-col-badge">{getTasksByStatus("Under Review").length}</span>
                  </div>
                </div>
                <div className="tb-cards-container">
                  {getTasksByStatus("Under Review").map(task => (
                    <div
                      key={task.id}
                      className="tb-card"
                      
                      onClick={() => handleCardClick(task)}
                    >
                      <div className="tb-card-header">
                        <span className="tb-card-id">{task.id}</span>
                        <span className={`tb-card-prio ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      </div>
                      <h4 className="tb-card-title">{task.title}</h4>
                      <p className="tb-card-subtitle">{task.milestone}</p>
                      {task.progress !== undefined && (
                        <div className="tb-card-progress">
                          <div className="tb-card-progress-header">
                            <span style={{ fontSize: '10px', color: '#64748b' }}>Progress</span>
                            <span style={{ fontSize: '11px', fontWeight: '700' }}>{task.progress}%</span>
                          </div>
                          <div className="tb-card-progress-bar">
                            <div className="tb-card-progress-fill under-review" style={{ width: `${task.progress}%`, backgroundColor: '#a855f7' }}></div>
                          </div>
                        </div>
                      )}
                      <div className="tb-card-footer">
                        <div className="tb-card-assignee">
                          <div
                            className="tb-card-avatar"
                            style={{
                              backgroundColor: stringToColor(task.assignee),
                              color: "#fff"
                            }}
                          >
                            {getInitials(task.assignee)}
                          </div>
                          <span className="tb-card-name">{task.assignee}</span>
                        </div>
                        <div className="tb-card-date-info">
                          <CalendarIcon size={12} />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                        {task.subtasksCount > 0 && (
                          <div className="tb-card-subtasks-count">
                            <CheckSquare size={11} />
                            <span>{task.subtasksCompleted}/{task.subtasksCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Column 4: Closed */}
            {(selectedStatus === "All Statuses" || selectedStatus === "Closed" || selectedStatus === "Completed") && (
              <div
                ref={colRefs["Closed"] || colRefs["Completed"]}
                className={`tb-col completed`}
                
              >
                <div className="tb-col-header">
                  <div className="tb-col-title-wrap">
                    <h3 className="tb-col-title">Closed</h3>
                    <span className="tb-col-badge">{(getTasksByStatus("Closed") || []).length + (getTasksByStatus("Completed") || []).length}</span>
                  </div>
                </div>
                <div className="tb-cards-container">
                  {[...getTasksByStatus("Closed"), ...getTasksByStatus("Completed")].map(task => (
                    <div
                      key={task.id}
                      className="tb-card"
                      
                      onClick={() => handleCardClick(task)}
                    >
                      <div className="tb-card-header">
                        <span className="tb-card-id completed">{task.id}</span>
                        {(() => {
                          const info = getScheduleStatusInfo(task);
                          return (
                            <span className="tb-card-prio" style={{
                              backgroundColor: info.bg,
                              color: info.color,
                              border: `1px solid ${info.border}`,
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              textTransform: 'none'
                            }}>
                              {info.status}
                            </span>
                          );
                        })()}
                      </div>
                      <h4 className="tb-card-title">{task.title}</h4>
                      <p className="tb-card-subtitle">{task.milestone}</p>
                      {task.progress !== undefined && (
                        <div className="tb-card-progress">
                          <div className="tb-card-progress-header">
                            <span style={{ fontSize: '10px', color: '#64748b' }}>Progress</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a' }}>100%</span>
                          </div>
                          <div className="tb-card-progress-bar">
                            <div className="tb-card-progress-fill completed" style={{ width: `100%`, backgroundColor: '#16a34a' }}></div>
                          </div>
                        </div>
                      )}
                      <div className="tb-card-footer">
                        <div className="tb-card-assignee">
                          <div
                            className="tb-card-avatar"
                            style={{
                              backgroundColor: stringToColor(task.assignee),
                              color: "#fff"
                            }}
                          >
                            {getInitials(task.assignee)}
                          </div>
                          <span className="tb-card-name">{task.assignee}</span>
                        </div>
                        <div className="tb-card-date-info">
                          <CalendarIcon size={12} />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                        {task.subtasksCount > 0 && (
                          <div className="tb-card-subtasks-count">
                            <CheckSquare size={11} />
                            <span>{task.subtasksCompleted}/{task.subtasksCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Column 5: Overdue */}
            {(selectedStatus === "All Statuses" || selectedStatus === "Overdue") && (
              <div
                ref={colRefs["Overdue"]}
                className={`tb-col overdue`}
                
              >
                <div className="tb-col-header">
                  <div className="tb-col-title-wrap">
                    <h3 className="tb-col-title">Overdue</h3>
                    <span className="tb-col-badge">{getTasksByStatus("Overdue").length}</span>
                  </div>
                </div>
                <div className="tb-cards-container">
                  {getTasksByStatus("Overdue").map(task => (
                    <div
                      key={task.id}
                      className="tb-card"
                      
                      onClick={() => handleCardClick(task)}
                    >
                      <div className="tb-card-header">
                        <span className="tb-card-id overdue">{task.id}</span>
                        <span className="tb-card-prio overdue">OVERDUE</span>
                      </div>
                      <h4 className="tb-card-title">{task.title}</h4>
                      <p className="tb-card-subtitle">{task.milestone}</p>
                      {task.progress !== undefined && (
                        <div className="tb-card-progress">
                          <div className="tb-card-progress-header">
                            <span style={{ fontSize: '10px', color: '#64748b' }}>Progress</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444' }}>{task.progress}%</span>
                          </div>
                          <div className="tb-card-progress-bar">
                            <div className="tb-card-progress-fill overdue" style={{ width: `${task.progress}%`, backgroundColor: '#ef4444' }}></div>
                          </div>
                        </div>
                      )}
                      <div className="tb-card-footer">
                        <div className="tb-card-assignee">
                          <div
                            className="tb-card-avatar"
                            style={{
                              backgroundColor: stringToColor(task.assignee),
                              color: "#fff"
                            }}
                          >
                            {getInitials(task.assignee)}
                          </div>
                          <span className="tb-card-name">{task.assignee}</span>
                        </div>
                        <div className="tb-card-date-info urgent">
                          <CalendarIcon size={12} />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                        {task.subtasksCount > 0 && (
                          <div className="tb-card-subtasks-count">
                            <CheckSquare size={11} />
                            <span>{task.subtasksCompleted}/{task.subtasksCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* Bottom Legend */}
          <div className="tb-legend-bar">
            <div className="tb-legend-left">
              <div className="tb-legend-section">
                <span className="tb-legend-section-title">Priority:</span>
                <div className="tb-legend-item">
                  <span className="tb-dot high"></span>
                  <span>High</span>
                </div>
                <div className="tb-legend-item">
                  <span className="tb-dot medium"></span>
                  <span>Medium</span>
                </div>
                <div className="tb-legend-item">
                  <span className="tb-dot low"></span>
                  <span>Low</span>
                </div>
              </div>

              <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }}></div>

              <div className="tb-legend-section">
                <span className="tb-legend-section-title">Task Type:</span>
                <div className="tb-legend-item">
                  <span className="tb-dot internal"></span>
                  <span>Internal</span>
                </div>
                <div className="tb-legend-item">
                  <span className="tb-dot external"></span>
                  <span>External</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ====== ADD TASK MODAL ====== */}


      {/* ====== DETAIL MODAL ====== */}
      {showDetailModal && selectedTask && (
        <div className="tb-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="tb-modal" onClick={e => e.stopPropagation()}>
            <div className="tb-modal-header">
              <h3>Task Details: {selectedTask.id}</h3>
              <button className="tb-modal-close-btn" onClick={() => setShowDetailModal(false)}><X size={18} /></button>
            </div>
            <div className="tb-modal-body">
              <div className="tb-modal-detail-row">
                <span className="tb-modal-detail-label">Title</span>
                <span className="tb-modal-detail-value">{selectedTask.title}</span>
              </div>
              <div className="tb-modal-detail-row">
                <span className="tb-modal-detail-label">Milestone</span>
                <span className="tb-modal-detail-value">{selectedTask.milestone}</span>
              </div>
              <div className="tb-form-row">
                <div className="tb-modal-detail-row">
                  <span className="tb-modal-detail-label">Executor</span>
                  <span className="tb-modal-detail-value">{selectedTask.assignee}</span>
                </div>
                <div className="tb-modal-detail-row">
                  <span className="tb-modal-detail-label">Status</span>
                  <span className="tb-modal-detail-value" style={{
                    color: selectedTask.status === "Completed" ? "#16a34a" : selectedTask.status === "Overdue" ? "#dc2626" : "#2563eb",
                    textTransform: "uppercase"
                  }}>{selectedTask.status}</span>
                </div>
              </div>

              <div className="tb-form-row">
                {selectedTask.status === "Closed" || selectedTask.status === "Completed" ? (
                  <div className="tb-modal-detail-row">
                    <span className="tb-modal-detail-label">Schedule Status</span>
                    {(() => {
                      const info = getScheduleStatusInfo(selectedTask);
                      return (
                        <span className="tb-modal-detail-value" style={{
                          backgroundColor: info.bg,
                          color: info.color,
                          border: `1px solid ${info.border}`,
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'inline-block',
                          width: 'fit-content'
                        }}>
                          {info.status}
                        </span>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="tb-modal-detail-row">
                    <span className="tb-modal-detail-label">Priority</span>
                    {(() => {
                      const prioInfo = getPriorityBadgeInfo(selectedTask.priority);
                      return (
                        <span className="tb-modal-detail-value" style={{
                          backgroundColor: prioInfo.bg,
                          color: prioInfo.color,
                          border: `1px solid ${prioInfo.border}`,
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'inline-block',
                          width: 'fit-content'
                        }}>
                          {prioInfo.label}
                        </span>
                      );
                    })()}
                  </div>
                )}
                <div className="tb-modal-detail-row">
                  <span className="tb-modal-detail-label">Type</span>
                  <span className="tb-modal-detail-value">{selectedTask.taskType}</span>
                </div>
              </div>

              <div className="tb-modal-detail-row">
                <span className="tb-modal-detail-label">Due Date</span>
                <span className="tb-modal-detail-value">{formatDate(selectedTask.dueDate)}</span>
              </div>

              {selectedTask.description && (
                <div className="tb-modal-detail-row">
                  <span className="tb-modal-detail-label">Description</span>
                  <span className="tb-modal-detail-value" style={{ fontWeight: "normal", fontSize: "13px", color: "#475569" }}>
                    {selectedTask.description}
                  </span>
                </div>
              )}

              
            </div>
            <div className="tb-modal-footer" style={{ justifyContent: "flex-end" }}>
              <button className="tb-btn-primary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;
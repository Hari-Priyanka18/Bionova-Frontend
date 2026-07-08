import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar";
import Header from "../Header";
import AlertModal from "../AlertModal";
import {
  Calendar as CalendarIcon,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Play,
  Filter,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Check,
  Undo2,
} from "lucide-react";
import "../../styles/MyTasks.css";
import { apiGet, apiPut, apiPatch, apiPost } from "../../utils/api";

const mapBackendTask = (t, projects, milestones) => {
  const milestone = milestones.find(m => String(m.mId) === String(t.mId));
  const project = milestone ? projects.find(p => String(p.prjId) === String(milestone.prjId)) : null;

  // Compute status (without progress, will be overridden later)
  let status = "To-Do";
  if (t.taskSts === "COMPLETED") {
    status = "Completed";
  } else if (t.taskSts === "SUBMIT_REVIEW" || t.taskSts === "UNDER_REVIEW") {
    status = "Under Review";
  } else if (t.taskSts === "REASSIGN") {
    status = "Reassigned";
  } else {
    const today = new Date().toISOString().split("T")[0];
    if (t.endDt && t.endDt < today) {
      status = "Overdue";
    } else if (t.taskSts === "WIP" || t.taskSts === "REWORK") {
      status = "In Progress";
    } else {
      status = "To-Do";
    }
  }

  // Progress will be recalculated from checklist; default 0
  const progress = 0;

  let calculatedPriority = "Low";
  if (t.endDt) {
    const [year, month, day] = t.endDt.split('-');
    const endDtObj = new Date(year, month - 1, day);
    endDtObj.setHours(0, 0, 0, 0);

    let compareDateObj = new Date();
    compareDateObj.setHours(0, 0, 0, 0);

    if (t.taskSts === "COMPLETED" || t.taskSts === "UNDER_REVIEW" || t.taskSts === "SUBMIT_REVIEW") {
       if (t.actCmpDt) {
           compareDateObj = new Date(t.actCmpDt);
           compareDateObj.setHours(0,0,0,0);
       } else if (compareDateObj > endDtObj) {
           compareDateObj = endDtObj;
       }
    }

    const diffTime = compareDateObj.getTime() - endDtObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      calculatedPriority = "High";
    } else if (diffDays === 1) {
      calculatedPriority = "Critical";
    } else if (diffDays >= 2) {
      calculatedPriority = "Atmost Critical";
    }
  }

  return {
    id: t.taskCd || `TSK-${t.taskId}`,
    taskId: t.taskId,
    title: t.taskNm,
    project: project ? project.prjNm : "Unknown Project",
    milestone: milestone ? milestone.mlstnTtl : "Unknown Milestone",
    priority: calculatedPriority,
    dueDate: t.endDt || "",
    status: status,
    progress: progress,
    rawStatus: t.taskSts,
    rawTask: t,
    description: t.taskDesc || "",
    assignedBy: "Project Manager"
  };
};

const mapIndividualTask = (t) => {
  let status = "To-Do";
  if (t.taskSts === "COMPLETED") {
    status = "Completed";
  } else if (t.taskSts === "SUBMIT_REVIEW" || t.taskSts === "UNDER_REVIEW") {
    status = "Under Review";
  } else if (t.taskSts === "REASSIGN") {
    status = "Reassigned";
  } else {
    const today = new Date().toISOString().split("T")[0];
    if (t.endDt && t.endDt < today) {
      status = "Overdue";
    } else if (t.taskSts === "WIP" || t.taskSts === "REWORK") {
      status = "In Progress";
    } else {
      status = "To-Do";
    }
  }

  let calculatedPriority = "Low";
  if (t.endDt) {
    const [year, month, day] = t.endDt.split('-');
    const endDtObj = new Date(year, month - 1, day);
    endDtObj.setHours(0, 0, 0, 0);

    let compareDateObj = new Date();
    compareDateObj.setHours(0, 0, 0, 0);

    if (t.taskSts === "COMPLETED" || t.taskSts === "UNDER_REVIEW" || t.taskSts === "SUBMIT_REVIEW") {
       if (t.actCmpDt) {
           compareDateObj = new Date(t.actCmpDt);
           compareDateObj.setHours(0,0,0,0);
       } else if (compareDateObj > endDtObj) {
           compareDateObj = endDtObj;
       }
    }

    const diffTime = compareDateObj.getTime() - endDtObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      calculatedPriority = "High";
    } else if (diffDays === 1) {
      calculatedPriority = "Critical";
    } else if (diffDays >= 2) {
      calculatedPriority = "Atmost Critical";
    }
  }

  return {
    id: t.taskCd || `IND-${t.empTaskId}`,
    taskId: t.empTaskId,
    isIndividual: true,
    title: t.taskNm,
    project: "Individual Task",
    milestone: "-",
    priority: calculatedPriority,
    dueDate: t.endDt || "",
    status: status,
    progress: 0,
    rawStatus: t.taskSts,
    rawTask: t,
    description: t.taskDesc || "",
    assignedBy: "Task Manager"
  };
};

const MyTasks = ({ userRole, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserEmpId, setCurrentUserEmpId] = useState(null);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const [projectsData, milestonesData, tasksData, indTasksData, profileRes] = await Promise.all([
        apiGet("/api/project-live"),
        apiGet("/api/milestone-live"),
        apiGet("/api/task-live"),
        apiGet("/api/individual-tasks"),
        apiGet("/api/profile")
      ]);

      const empId = profileRes?.empId;
      const isAdmin = profileRes?.email === 'vsv.vempati@gmail.com';
      setCurrentUserEmpId(empId);

      const liveTasksWithConfigs = await Promise.all((tasksData || []).map(async task => {
         try {
             const pcs = await apiGet(`/api/process-config/live-task/${task.taskId}`);
             const configs = pcs || [];
             const revCfg = configs.find(pc => pc.ordrId === 1);
             const appCfg = configs.find(pc => pc.ordrId === 2);
             return {
                ...task,
                reviewerId: revCfg ? revCfg.empId : task.reviewerId,
                approverId: appCfg ? appCfg.empId : task.approverId
             };
         } catch(e) { return task; }
      }));

      const indTasksWithConfigs = await Promise.all((indTasksData || []).map(async task => {
         try {
             const pcs = await apiGet(`/api/process-config/individual-task/${task.empTaskId}`);
             const configs = pcs || [];
             const revCfg = configs.find(pc => pc.ordrId === 1);
             const appCfg = configs.find(pc => pc.ordrId === 2);
             return {
                ...task,
                reviewerId: revCfg ? revCfg.empId : task.reviewerId,
                approverId: appCfg ? appCfg.empId : task.approverId
             };
         } catch(e) { return task; }
      }));

      const userTasks = liveTasksWithConfigs.filter(t => isAdmin || t.empId === empId || t.reviewerId === empId || t.approverId === empId);
      const userIndTasks = indTasksWithConfigs.filter(t => isAdmin || t.empId === empId || t.reviewerId === empId || t.approverId === empId);

      // Map tasks
      let mapped = userTasks.map(t => mapBackendTask(t, projectsData || [], milestonesData || []));
      let mappedInd = userIndTasks.map(t => mapIndividualTask(t));
      mapped = [...mapped, ...mappedInd];

      // Fetch checklists for each task to compute progress
      const checklistPromises = mapped.map(task => {
        const path = task.isIndividual
          ? `/api/checklists/individual-task/${task.taskId}`
          : `/api/checklists/live-task/${task.taskId}`;
        
        return apiGet(path)
          .then(items => {
            const checklist = (items || []).map(item => ({
              id: item.chkId,
              completed: item.chkSts || false
            }));
            const completed = checklist.filter(item => item.completed).length;
            const total = checklist.length;
            
            let progress = 0;
            const prcsFlg = task.rawTask?.prcsFlg;
            const taskSts = task.rawStatus;

            if (!prcsFlg) {
              progress = total > 0 ? Math.round((completed / total) * 100) : 0;
              if (taskSts === 'COMPLETED') progress = 100;
            } else {
              if (taskSts === 'COMPLETED') {
                progress = 100;
              } else if (taskSts === 'UNDER_REVIEW') {
                progress = 95;
              } else if (taskSts === 'SUBMIT_REVIEW') {
                progress = 90;
              } else {
                progress = total > 0 ? Math.round((completed / total) * 100) : 0;
              }
            }
            return { taskId: task.taskId, progress };
          })
          .catch(() => ({ taskId: task.taskId, progress: 0 }));
      });

      const progressResults = await Promise.all(checklistPromises);
      const progressMap = {};
      progressResults.forEach(p => { progressMap[p.taskId] = p.progress; });

      // Update progress in mapped tasks
      mapped = mapped.map(task => ({
        ...task,
        progress: progressMap[task.taskId] !== undefined ? progressMap[task.taskId] : task.progress
      }));

      setTasks(mapped);
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Tab & filter state
  const [activeTab, setActiveTab] = useState("To-Do");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [selectedMilestone, setSelectedMilestone] = useState("All Milestones");
  const [selectedPriority, setSelectedPriority] = useState("All Priorities");
  const [selectedStatus, setSelectedStatus] = useState("To-Do (Not Started)");
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSelectedStatus("All Statuses");
  };

  const handleStatusFilterChange = (statusVal) => {
    setSelectedStatus(statusVal);
    if (statusVal === "All Statuses") {
      setActiveTab("All Tasks");
    } else if (statusVal === "To-Do (Not Started)" || statusVal === "To-Do" || statusVal === "Reassigned") {
      setActiveTab("To-Do");
    } else if (statusVal === "In Progress") {
      setActiveTab("In Progress");
    } else if (statusVal === "Under Review") {
      setActiveTab("Under Review");
    } else if (statusVal === "Completed") {
      setActiveTab("Completed");
    } else if (statusVal === "Overdue") {
      setActiveTab("Overdue");
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ type: "success", title: "", message: "" });

  // Update form state
  const [updateProgressVal, setUpdateProgressVal] = useState(0);
  const [updateChecklist, setUpdateChecklist] = useState([]);
  const [updateRemarks, setUpdateRemarks] = useState("");

  // Lock body scroll when modals open
  useEffect(() => {
    if (showDetailModal || showUpdateModal || alertOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showDetailModal, showUpdateModal, alertOpen]);

  // Counts
  const totalTasksCount = tasks.length;
  const countTodo = tasks.filter(t => {
      const isRevAct = String(t.rawTask.reviewerId) === String(currentUserEmpId) && t.rawStatus === "SUBMIT_REVIEW";
      const isAppAct = String(t.rawTask.approverId) === String(currentUserEmpId) && t.rawStatus === "UNDER_REVIEW";
      return t.status === "To-Do" || t.status === "Reassigned" || isRevAct || isAppAct;
  }).length;
  const countInProgress = tasks.filter(t => t.status === "In Progress").length;
  const countUnderReview = tasks.filter(t => t.status === "Under Review").length;
  const countCompleted = tasks.filter(t => t.status === "Completed").length;
  const countOverdue = tasks.filter(t => t.status === "Overdue").length;

  const projectsList = ["All Projects", ...new Set(tasks.map(t => t.project))];
  const milestonesList = ["All Milestones", ...new Set(tasks.map(t => t.milestone))];

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const month = months[parseInt(parts[1], 10) - 1];
      const day = parts[2];
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  const triggerAlert = (type, title, message) => {
    setAlertConfig({ type, title, message });
    setAlertOpen(true);
  };

  const openDetails = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  // Compute progress from checklist
  const computeProgress = (checklist, task) => {
    if (!checklist || checklist.length === 0) return 0;
    const completed = checklist.filter(item => item.completed).length;
    const prcsFlg = task?.rawTask?.prcsFlg;
    const taskSts = task?.rawStatus;

    if (!prcsFlg) {
      return Math.round((completed / checklist.length) * 100);
    } else {
       if (taskSts === 'COMPLETED') return 100;
       if (taskSts === 'UNDER_REVIEW') return 95;
       if (taskSts === 'SUBMIT_REVIEW') return 90;
       return Math.round((completed / checklist.length) * 100);
    }
  };

  // Determine status for display based on progress, original status, and prcsFlg
  const getDisplayStatus = (progress, originalStatus, prcsFlg) => {
    if (progress === 100 && !prcsFlg) return "Completed";
    if (progress === 100 && prcsFlg) {
      if (originalStatus === "Completed") return "Completed";
      return "In Progress";
    }
    if (prcsFlg && (progress === 90 || progress === 95)) {
      if (progress === 95) return "Under Review";
      if (progress === 90 && originalStatus === "Under Review") return "Under Review"; 
      return "In Progress";
    }
    if (progress > 0) return "In Progress";
    
    if (originalStatus === "In Progress" || originalStatus === "Under Review" || originalStatus === "Overdue" || originalStatus === "Reassigned") {
      return originalStatus;
    }
    return "To-Do";
  };

  const sendNotification = async (empId, message, taskContext = null) => {
    if (!empId) {
      console.warn("sendNotification aborted: empId is missing", { empId, message });
      return;
    }
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
      console.log("Notification sent successfully to empId:", empId);
    } catch (e) {
      console.warn("Failed to send notification (likely unauthorized)", e);
    }
  };

  // ----- Start Task (no modal) -----
  const handleStartTask = async (task) => {
    try {
      const originalTask = task.rawTask;
      const updatedTaskObj = {
        ...originalTask,
        taskSts: "WIP", // In Progress
      };
      
      const updatePath = task.isIndividual 
        ? `/api/individual-tasks/${task.taskId}`
        : `/api/task-live/${task.taskId}`;
        
      await apiPut(`${updatePath}?_t=${Date.now()}`, updatedTaskObj);

      // Notify Reviewer & Approver
      console.log("Starting task, originalTask details:", originalTask);
      if (originalTask.reviewerId) {
         await sendNotification(originalTask.reviewerId, `Task started: ${task.title} (${task.id})`, task);
      } else {
         console.warn("No reviewerId on originalTask", task.id);
      }
      
      if (originalTask.approverId) {
         await sendNotification(originalTask.approverId, `Task started: ${task.title} (${task.id})`, task);
      } else {
         console.warn("No approverId on originalTask", task.id);
      }

      await fetchTasks();
      triggerAlert("success", "Started", "Task moved to In Progress.");
    } catch (err) {
      console.error("Error starting task:", err);
      triggerAlert("danger", "Error", "Failed to start task: " + err.message);
    }
  };

  // ----- Open Update Modal (only for non-To-Do tasks) -----
  const openUpdateModal = async (task) => {
    setUpdatingTask(task);
    setUpdateRemarks(task.rawTask?.addlRem || "");

    try {
      const path = task.isIndividual
        ? `/api/checklists/individual-task/${task.taskId}`
        : `/api/checklists/live-task/${task.taskId}`;
        
      const items = await apiGet(path);
      const mapped = (items || []).map(item => ({
        id: item.chkId,
        text: item.chkNm,
        completed: item.chkSts || false
      }));
      setUpdateChecklist(mapped);
      const progress = computeProgress(mapped, task);
      setUpdateProgressVal(progress);
    } catch (err) {
      console.error("Failed to load checklist:", err);
      setUpdateChecklist([]);
      setUpdateProgressVal(0);
    }

    setShowUpdateModal(true);
  };

  const handleToggleChecklist = (id) => {
    if (updatingTask?.status === "Under Review" || updatingTask?.status === "Completed" || String(updatingTask?.rawTask?.empId) !== String(currentUserEmpId)) return; // Read-only

    setUpdateChecklist(prev => {
      const newList = prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      const progress = computeProgress(newList, updatingTask);
      setUpdateProgressVal(progress);
      return newList;
    });
  };

  const handleAction = async (newStatus) => {
    if (!updatingTask) return;
    try {
      const originalTask = updatingTask.rawTask;
      const updatedTaskObj = {
        ...originalTask,
        taskSts: newStatus,
        addlRem: updateRemarks || originalTask.addlRem
      };

      const updatePath = updatingTask.isIndividual 
        ? `/api/individual-tasks/${updatingTask.taskId}`
        : `/api/task-live/${updatingTask.taskId}`;
        
      await apiPut(`${updatePath}?_t=${Date.now()}`, updatedTaskObj);

      const taskCode = updatingTask.id;
      if (newStatus === "REASSIGN") {
          await sendNotification(originalTask.empId, `Task Reassigned: ${taskCode}`, updatingTask);
      } else if (newStatus === "UNDER_REVIEW") { 
          if (originalTask.approverId) {
             await sendNotification(originalTask.approverId, `Task ready for Approval: ${taskCode}`, updatingTask);
          }
      } else if (newStatus === "COMPLETED") { 
          await sendNotification(originalTask.empId, `Task Completed: ${taskCode}`, updatingTask);
          if (originalTask.reviewerId) {
             await sendNotification(originalTask.reviewerId, `Task Completed: ${taskCode}`, updatingTask);
          }
      }

      await fetchTasks();
      setShowUpdateModal(false);
      triggerAlert("success", "Success", `Task status updated to ${newStatus}.`);
    } catch (err) {
      console.error("Error updating task:", err);
      triggerAlert("danger", "Error", "Failed to update task: " + err.message);
    }
  };

  const handleSaveProgress = async () => {
    if (!updatingTask) return;
    let progress = updateProgressVal;
    const originalTask = updatingTask.rawTask;
    const prcsFlg = originalTask?.prcsFlg || originalTask?.prcsflg || !!originalTask?.reviewerId || !!originalTask?.approverId || false;
    const currentSts = updatingTask.rawStatus;

    if (updateChecklist.length === 0 && currentSts !== "SUBMIT_REVIEW" && currentSts !== "UNDER_REVIEW") {
       progress = 100;
    }

    let backendSts = "OPEN";
    
    if (currentSts === "SUBMIT_REVIEW") {
       backendSts = "UNDER_REVIEW";
    } else if (currentSts === "UNDER_REVIEW") {
       backendSts = "COMPLETED";
    } else {
       if (prcsFlg && progress === 100) {
           backendSts = "SUBMIT_REVIEW";
       } else if (!prcsFlg && progress === 100) {
           backendSts = "COMPLETED";
       } else if (progress > 0) {
           backendSts = "WIP";
       } else {
           backendSts = (currentSts === "WIP" || currentSts === "OPEN" || currentSts === "REASSIGN" || currentSts === "REWORK") ? "WIP" : "OPEN";
       }
    }

    try {
      // originalTask is already declared in outer scope
      const updatedTaskObj = {
        ...originalTask,
        taskSts: backendSts,
        addlRem: updateRemarks || originalTask.addlRem
      };

      // 1. Update checklist items ONLY if not under review
      if (currentSts !== "SUBMIT_REVIEW" && currentSts !== "UNDER_REVIEW") {
        await Promise.all(updateChecklist
          .filter(item => item.id != null)
          .map(item => {
            const path = `/api/checklists/${item.id}/${item.completed ? 'complete' : 'reopen'}?_t=${Date.now()}`;
            return apiPatch(path, {});
          })
        );
      }

      // 2. Update task status & progress
      const updatePath = updatingTask.isIndividual 
        ? `/api/individual-tasks/${updatingTask.taskId}`
        : `/api/task-live/${updatingTask.taskId}`;
        
      await apiPut(`${updatePath}?_t=${Date.now()}`, updatedTaskObj);

      if (backendSts === "SUBMIT_REVIEW") {
          if (originalTask.reviewerId) {
             await sendNotification(originalTask.reviewerId, `Task submitted for review: ${updatingTask.id}`, updatingTask);
          }
          if (originalTask.approverId) {
             await sendNotification(originalTask.approverId, `Task submitted for review: ${updatingTask.id}`, updatingTask);
          }
      } else if (backendSts === "COMPLETED") {
          await sendNotification(originalTask.empId, `Task Completed: ${updatingTask.id}`, updatingTask);
      } else if (backendSts === "WIP" || progress > 0) {
          const msg = `Task ${updatingTask.id} progress updated to ${progress}%`;
          if (originalTask.reviewerId) await sendNotification(originalTask.reviewerId, msg, updatingTask);
          if (originalTask.approverId) await sendNotification(originalTask.approverId, msg, updatingTask);
      }

      await fetchTasks();
      setShowUpdateModal(false);
      triggerAlert("success", "Success", "Task progress updated successfully.");
    } catch (err) {
      console.error("Error updating task:", err);
      triggerAlert("danger", "Error", "Failed to update task: " + err.message);
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
    setActiveTab("All Tasks");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedProject, selectedMilestone, selectedPriority, selectedStatus, selectedDueDate]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const filteredTasks = tasks.filter(task => {
    const isRevAct = String(task.rawTask.reviewerId) === String(currentUserEmpId) && task.rawStatus === "SUBMIT_REVIEW";
    const isAppAct = String(task.rawTask.approverId) === String(currentUserEmpId) && task.rawStatus === "UNDER_REVIEW";

    if (activeTab === "To-Do" && task.status !== "To-Do" && task.status !== "Reassigned" && !isRevAct && !isAppAct) return false;
    if (activeTab === "In Progress" && task.status !== "In Progress") return false;
    if (activeTab === "Under Review" && task.status !== "Under Review") return false;
    if (activeTab === "Completed" && task.status !== "Completed") return false;
    if (activeTab === "Overdue" && task.status !== "Overdue") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!task.id.toLowerCase().includes(q) && !task.title.toLowerCase().includes(q)) return false;
    }
    if (selectedProject !== "All Projects" && task.project !== selectedProject) return false;
    if (selectedMilestone !== "All Milestones" && task.milestone !== selectedMilestone) return false;
    if (selectedPriority !== "All Priorities" && task.priority !== selectedPriority) return false;
    if (selectedStatus !== "All Statuses") {
      let filterStatus = selectedStatus;
      if (filterStatus === "To-Do (Not Started)") filterStatus = "To-Do";
      if (filterStatus === "To-Do") {
        if (task.status !== "To-Do" && task.status !== "Reassigned" && !isRevAct && !isAppAct) return false;
      } else if (task.status !== filterStatus) {
        return false;
      }
    }
    if (selectedDueDate && task.dueDate !== selectedDueDate) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // For modal status badge
  const getCurrentStatusDisplay = () => {
    if (!updatingTask) return "To-Do";
    const prcsFlg = updatingTask.rawTask?.prcsFlg || false;
    return getDisplayStatus(updateProgressVal, updatingTask.status, prcsFlg);
  };

  return (
    <div className="cc-shell-container">
      <Sidebar onLogout={onLogout} />
      <div className="cc-shell">
        <Header title="My Tasks" subtitle="View and manage all tasks assigned to you." onLogout={onLogout} userRole={userRole} />

        <main className="cc-main">
          {/* Removed Export button */}

          {/* Metrics Cards */}
          <div className="myt-metrics-grid" style={{ marginBottom: "24px" }}>
            <div className={`myt-metric-card todo ${activeTab === "To-Do" ? "active" : ""}`} onClick={() => changeTab("To-Do")}>
              <div className="myt-metric-icon-box blue"><CalendarIcon size={20} /></div>
              <div className="myt-metric-info">
                <span className="myt-metric-label">To-Do (Not Started)</span>
                <span className="myt-metric-value">{countTodo} <small className="myt-small-label">Tasks</small></span>
              </div>
            </div>
            <div className={`myt-metric-card in-progress ${activeTab === "In Progress" ? "active" : ""}`} onClick={() => changeTab("In Progress")}>
              <div className="myt-metric-icon-box play-blue"><Play size={20} fill="currentColor" /></div>
              <div className="myt-metric-info">
                <span className="myt-metric-label">In Progress</span>
                <span className="myt-metric-value">{countInProgress} <small className="myt-small-label">Tasks</small></span>
              </div>
            </div>
            <div className={`myt-metric-card review ${activeTab === "Under Review" ? "active" : ""}`} onClick={() => changeTab("Under Review")}>
              <div className="myt-metric-icon-box eye-purple"><Eye size={20} /></div>
              <div className="myt-metric-info">
                <span className="myt-metric-label">Under Review</span>
                <span className="myt-metric-value">{countUnderReview} <small className="myt-small-label">Tasks</small></span>
              </div>
            </div>
            <div className={`myt-metric-card completed ${activeTab === "Completed" ? "active" : ""}`} onClick={() => changeTab("Completed")}>
              <div className="myt-metric-icon-box green"><CheckCircle2 size={20} /></div>
              <div className="myt-metric-info">
                <span className="myt-metric-label">Completed</span>
                <span className="myt-metric-value">{countCompleted} <small className="myt-small-label">Tasks</small></span>
              </div>
            </div>
            <div className={`myt-metric-card overdue ${activeTab === "Overdue" ? "active" : ""}`} onClick={() => changeTab("Overdue")}>
              <div className="myt-metric-icon-box red"><AlertCircle size={20} /></div>
              <div className="myt-metric-info">
                <span className="myt-metric-label">Overdue</span>
                <span className="myt-metric-value">{countOverdue} <small className="myt-small-label">Tasks</small></span>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="myt-tabs-container" style={{ marginBottom: "20px" }}>
            <div className="myt-tabs-left">
              <button className={`myt-tab-btn ${activeTab === "To-Do" ? "active" : ""}`} onClick={() => changeTab("To-Do")}>
                To-Do <span className="myt-tab-badge">{countTodo}</span>
              </button>
              <button className={`myt-tab-btn ${activeTab === "In Progress" ? "active" : ""}`} onClick={() => changeTab("In Progress")}>
                In Progress <span className="myt-tab-badge">{countInProgress}</span>
              </button>
              <button className={`myt-tab-btn ${activeTab === "Under Review" ? "active" : ""}`} onClick={() => changeTab("Under Review")}>
                Under Review <span className="myt-tab-badge">{countUnderReview}</span>
              </button>
              <button className={`myt-tab-btn ${activeTab === "Completed" ? "active" : ""}`} onClick={() => changeTab("Completed")}>
                Completed <span className="myt-tab-badge">{countCompleted}</span>
              </button>
              <button className={`myt-tab-btn ${activeTab === "Overdue" ? "active" : ""}`} onClick={() => changeTab("Overdue")}>
                Overdue <span className="myt-tab-badge">{countOverdue}</span>
              </button>
              <button className={`myt-tab-btn ${activeTab === "All Tasks" ? "active" : ""}`} onClick={() => changeTab("All Tasks")}>
                All Tasks <span className="myt-tab-badge">{totalTasksCount}</span>
              </button>
            </div>

            <div className="myt-tabs-right">
              <div className="myt-search-box" style={{ marginRight: "12px" }}>
                <Search size={15} className="myt-search-icon" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  style={{ paddingRight: "30px" }}
                />
                <RotateCw size={12} className="myt-search-reset-icon" onClick={() => { setSearchInput(""); setSearchQuery(""); }} style={{ position: "absolute", right: "10px", color: "#94a3b8", cursor: "pointer" }} />
              </div>
              <button className={`myt-filter-toggle-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
                <Filter size={15} /> Filters
              </button>
            </div>
          </div>

          {/* Filter Card – Company Master style */}
          {showFilters && (
            <div className="cc-filter-card" style={{ marginBottom: "20px", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
              <div className="cc-filter-row" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="cc-filter-item">
                  <label>Project</label>
                  <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                    {projectsList.map(proj => <option key={proj} value={proj}>{proj}</option>)}
                  </select>
                </div>
                <div className="cc-filter-item">
                  <label>Milestone</label>
                  <select value={selectedMilestone} onChange={(e) => setSelectedMilestone(e.target.value)}>
                    {milestonesList.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="cc-filter-item">
                  <label>Priority</label>
                  <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
                    <option value="All Priorities">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="cc-filter-item">
                  <label>Status</label>
                  <select value={selectedStatus} onChange={(e) => handleStatusFilterChange(e.target.value)}>
                    <option value="All Statuses">All Statuses</option>
                    <option value="To-Do (Not Started)">To-Do (Not Started)</option>
                    <option value="To-Do">To-Do</option>
                    <option value="Reassigned">Reassigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div className="cc-filter-item">
                  <label>Due Date</label>
                  <div className="myt-date-input-wrapper" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <CalendarIcon size={14} className="myt-date-icon" style={{ position: "absolute", left: "10px", color: "#64748b", pointerEvents: "none" }} />
                    <input
                      type="text"
                      placeholder="Select Date Range"
                      value={selectedDueDate ? formatDate(selectedDueDate) : ""}
                      onFocus={(e) => e.target.type = 'date'}
                      onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                      onChange={(e) => setSelectedDueDate(e.target.value)}
                      style={{ paddingLeft: "32px", width: "180px", height: "36px" }}
                    />
                  </div>
                </div>
                <div className="cc-filter-item" style={{ marginLeft: "auto" }}>
                  <button className="myt-clear-filter-btn" onClick={handleResetFilters}>
                    <RotateCw size={14} /> Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table Panel – Company Master style */}
          <div className="cc-table-panel" style={{ border: "none", boxShadow: "none", padding: 0 }}>
            <div className="cc-table-container">
              <table className="cc-list-table myt-table">
                <thead>
                  <tr>
                    <th>Task Code</th>
                    <th>Task Name</th>
                    <th>Project</th>
                    <th>Milestone</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        Loading tasks...
                      </td>
                    </tr>
                  ) : paginatedTasks.length > 0 ? (
                    paginatedTasks.map((task) => (
                      <tr key={task.id} onClick={() => openDetails(task)} style={{ cursor: "pointer" }}>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>{task.id}</td>
                        <td style={{ fontWeight: "500", color: "#1e293b" }}>{task.title}</td>
                        <td style={{ color: "#475569" }}>{task.project}</td>
                        <td style={{ color: "#475569" }}>{task.milestone}</td>
                        <td>
                          <span className={`myt-priority-badge ${task.priority.toLowerCase().replace(/\s+/g, '-')}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>{formatDate(task.dueDate || task.completedDate || task.submittedDate) || "—"}</td>
                        <td style={{ fontWeight: "600", color: task.status === "Reassigned" ? "#ef4444" : "#64748b" }}>
                          {task.status === "Reassigned" ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Undo2 size={16} /> Reassigned
                            </span>
                          ) : (
                            task.status
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="myt-table-progress-wrap">
                            <span className="myt-progress-percentage">{task.progress}%</span>
                            <div className="myt-table-progress-track">
                              <div className="myt-table-progress-fill" style={{
                                width: `${task.progress}%`,
                                backgroundColor: task.status === "Completed" ? "#16a34a"
                                  : task.status === "Overdue" ? "#ef4444"
                                    : task.status === "In Progress" ? "#3b82f6"
                                      : task.status === "Under Review" ? "#8b5cf6"
                                        : "#e2e8f0"
                              }} />
                            </div>
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                          {(() => {
                            const raw = task.rawTask;
                            const sts = task.rawStatus;
                            const isDoer = String(raw?.empId) === String(currentUserEmpId);
                            const isChecker = String(raw?.reviewerId) === String(currentUserEmpId);
                            const isApprover = String(raw?.approverId) === String(currentUserEmpId);
                            const isReviewerActionRequired = isChecker && sts === "SUBMIT_REVIEW";
                            const isApproverActionRequired = isApprover && sts === "UNDER_REVIEW";

                            if (isReviewerActionRequired || isApproverActionRequired) {
                              return (
                                <button className="myt-btn-update" style={{ backgroundColor: "#10b981" }} onClick={() => openUpdateModal(task)}>
                                  Approve
                                </button>
                              );
                            }

                            if (isDoer) {
                              if (task.status === "To-Do" || sts === "OPEN") {
                                return (
                                  <button className="myt-btn-update" onClick={() => handleStartTask(task)}>
                                    Start
                                  </button>
                                );
                              } else if (sts === "REASSIGN" || task.status === "Reassigned") {
                                return (
                                  <button className="myt-btn-update" style={{ backgroundColor: "#ef4444" }} onClick={() => openUpdateModal(task)}>
                                    Reassign
                                  </button>
                                );
                              } else if (sts === "REWORK") {
                                return (
                                  <button className="myt-btn-update" style={{ backgroundColor: "#ef4444" }} onClick={() => openUpdateModal(task)}>
                                    Rework
                                  </button>
                                );
                              } else if (task.status === "In Progress" || sts === "WIP") {
                                return (
                                  <button className="myt-btn-update" onClick={() => openUpdateModal(task)}>
                                    Update
                                  </button>
                                );
                              }
                            }

                            return (
                              <button className="myt-btn-update" onClick={() => openUpdateModal(task)}>
                                View
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        No matching tasks found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {filteredTasks.length > 0 && (
                <div className="myt-pagination-container">
                  <div className="myt-pagination-info">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                  </div>
                  <div className="myt-pagination-controls">
                    <button className="myt-page-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        className={`myt-page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button className="myt-page-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ====== DETAIL MODAL ====== */}
      {showDetailModal && selectedTask && (
        <div className="cc-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="cc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px", width: "90%" }}>
            <div className="cc-modal-header">
              <h3>Task Details: {selectedTask.id}</h3>
              <button className="cc-modal-close" onClick={() => setShowDetailModal(false)}><X size={18} /></button>
            </div>
            <div className="cc-modal-body">
              <div className="myt-detail-row"><span className="myt-detail-label">Task ID</span><span className="myt-detail-value">{selectedTask.id}</span></div>
              <div className="myt-detail-row"><span className="myt-detail-label">Title</span><span className="myt-detail-value">{selectedTask.title}</span></div>
              <div className="myt-detail-row"><span className="myt-detail-label">Project</span><span className="myt-detail-value">{selectedTask.project}</span></div>
              <div className="myt-detail-row"><span className="myt-detail-label">Milestone</span><span className="myt-detail-value">{selectedTask.milestone}</span></div>
              <div className="myt-detail-row"><span className="myt-detail-label">Assigned By</span><span className="myt-detail-value">{selectedTask.assignedBy}</span></div>
              {selectedTask.submittedTo && <div className="myt-detail-row"><span className="myt-detail-label">Submitted To</span><span className="myt-detail-value">{selectedTask.submittedTo}</span></div>}
              <div className="myt-detail-row"><span className="myt-detail-label">Priority</span><span className={`myt-priority-badge ${selectedTask.priority.toLowerCase().replace(/\s+/g, '-')}`}>{selectedTask.priority}</span></div>
              {selectedTask.dueDate && <div className="myt-detail-row"><span className="myt-detail-label">Due Date</span><span className="myt-detail-value">{formatDate(selectedTask.dueDate)}</span></div>}
              {selectedTask.submittedDate && <div className="myt-detail-row"><span className="myt-detail-label">Submitted Date</span><span className="myt-detail-value">{formatDate(selectedTask.submittedDate)}</span></div>}
              {selectedTask.completedDate && <div className="myt-detail-row"><span className="myt-detail-label">Completed Date</span><span className="myt-detail-value">{formatDate(selectedTask.completedDate)}</span></div>}
              <div className="myt-detail-row"><span className="myt-detail-label">Status</span><span className={`cc-status-badge`} style={{ backgroundColor: selectedTask.status === "Completed" ? "#dcfce7" : "#eff6ff", color: selectedTask.status === "Completed" ? "#166534" : "#1d4ed8" }}>{selectedTask.status}</span></div>
              <div className="myt-detail-row"><span className="myt-detail-label">Progress</span><span className="myt-detail-value">{selectedTask.progress}%</span></div>
              <div className="myt-detail-row"><span className="myt-detail-label">Description</span><span className="myt-detail-value myt-desc-val">{selectedTask.description}</span></div>
            </div>
            <div className="cc-modal-footer" style={{ justifyContent: "flex-end" }}>
              <button className="cc-btn primary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== UPDATE PROGRESS MODAL ====== */}
      {showUpdateModal && updatingTask && (
        <div className="cc-modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="cc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", width: "95%" }}>
            <div className="cc-modal-header">
              <h3>
                {(() => {
                  const sts = updatingTask?.rawStatus;
                  const isChecker = String(updatingTask?.rawTask?.reviewerId) === String(currentUserEmpId);
                  const isApprover = String(updatingTask?.rawTask?.approverId) === String(currentUserEmpId);
                  if ((isChecker && sts === "SUBMIT_REVIEW") || (isApprover && sts === "UNDER_REVIEW")) {
                    return "Approve Task";
                  }
                  return "Update Task Progress";
                })()}
              </h3>
              <button className="cc-modal-close" onClick={() => setShowUpdateModal(false)}><X size={18} /></button>
            </div>
            <div className="cc-modal-body" style={{ padding: "0 24px 24px 24px" }}>
              <div className="myt-modal-section">
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#0f172a" }}>Task Details</h4>
                <div className="myt-task-details-grid">
                  <div className="myt-detail-col">
                    <div className="myt-detail-item"><span className="label">Task Code</span><span className="value">: {updatingTask.id}</span></div>
                    <div className="myt-detail-item"><span className="label">Task Name</span><span className="value">: {updatingTask.title}</span></div>
                    <div className="myt-detail-item"><span className="label">Project</span><span className="value">: {updatingTask.project}</span></div>
                    <div className="myt-detail-item"><span className="label">Milestone</span><span className="value">: {updatingTask.milestone}</span></div>
                    <div className="myt-detail-item"><span className="label">Due Date</span><span className="value">: {formatDate(updatingTask.dueDate)}</span></div>
                  </div>
                  <div className="myt-detail-col">
                    <div className="myt-detail-item"><span className="label">Assigned To</span><span className="value">: {sessionStorage.getItem("userName") || "Assigned Employee"}</span></div>
                    <div className="myt-detail-item"><span className="label">Priority</span>
                      <span className="value">: <span className={`myt-priority-badge ${updatingTask.priority.toLowerCase().replace(/\s+/g, '-')}`}>{updatingTask.priority}</span></span>
                    </div>
                    <div className="myt-detail-item">
                      <span className="label">Status</span>
                      <span className="value">:
                        <span className={`cc-status-badge`} style={{
                          marginLeft: "4px",
                          backgroundColor: getCurrentStatusDisplay() === "Completed" ? "#dcfce7" :
                            getCurrentStatusDisplay() === "Under Review" ? "#f3e8ff" :
                            getCurrentStatusDisplay() === "In Progress" ? "#dbeafe" : "#f1f5f9",
                          color: getCurrentStatusDisplay() === "Completed" ? "#166534" :
                            getCurrentStatusDisplay() === "Under Review" ? "#6b21a8" :
                            getCurrentStatusDisplay() === "In Progress" ? "#1d4ed8" : "#475569",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontWeight: "500"
                        }}>
                          {getCurrentStatusDisplay()}
                        </span>
                      </span>
                    </div>
                    <div className="myt-detail-item"><span className="label">Current Progress</span><span className="value">: {updateProgressVal}%</span></div>
                  </div>
                </div>
              </div>


                  {(updatingTask?.rawStatus === "REASSIGN" || updatingTask?.rawStatus === "REWORK") && updatingTask?.rawTask?.addlRem && (
                    <div className="myt-modal-section" style={{ backgroundColor: "#fee2e2", padding: "12px", borderRadius: "8px", border: "1px solid #fca5a5" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px", color: "#b91c1c" }}>Reviewer Remarks</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#7f1d1d", whiteSpace: "pre-wrap" }}>{updatingTask.rawTask.addlRem}</p>
                    </div>
                  )}

                  <div className="myt-modal-section">
                    <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#0f172a" }}>Checklist</h4>
                    <div className="myt-checklist-table">
                      <div className="myt-checklist-header">
                        <span>Checklist Item</span>
                        <span>Status</span>
                      </div>
                      {updateChecklist.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                          No checklist items defined for this task.
                        </div>
                      ) : (
                        updateChecklist.map(item => (
                          <div className="myt-checklist-row" key={item.id} onClick={() => handleToggleChecklist(item.id)} style={{ cursor: updatingTask?.status === "Under Review" || updatingTask?.status === "Completed" ? "not-allowed" : "pointer", opacity: updatingTask?.status === "Under Review" || updatingTask?.status === "Completed" ? 0.7 : 1 }}>
                            <div className="myt-checklist-text">
                              {item.completed ? (
                                <div className="myt-checkbox-custom checked">
                                  <Check size={11} color="white" strokeWidth={4} />
                                </div>
                              ) : (
                                <div className="myt-checkbox-custom unchecked"></div>
                              )}
                              <span style={{ color: item.completed ? "#0f172a" : "#475569" }}>{item.text}</span>
                            </div>
                            <div className="myt-checklist-status">
                              <span className={`myt-chk-status ${item.completed ? 'completed' : 'pending'}`}>
                                {item.completed ? 'Completed' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="myt-modal-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "#0f172a" }}>Overall Progress</h4>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{updateProgressVal}%</span>
                    </div>
                    <div className="myt-overall-progress-track">
                      <div className="myt-overall-progress-fill" style={{ 
                          width: `${updateProgressVal}%`,
                          backgroundColor: getCurrentStatusDisplay() === "Completed" ? "#16a34a"
                            : getCurrentStatusDisplay() === "Overdue" ? "#ef4444"
                            : getCurrentStatusDisplay() === "Under Review" ? "#8b5cf6"
                            : "#3b82f6"
                      }}></div>
                    </div>
                    {(() => {
                       if (updatingTask?.rawTask?.prcsFlg) {
                           if (updatingTask?.rawStatus === 'SUBMIT_REVIEW') {
                               return <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>Note: Remaining 10% is pending with Checker and Approver.</div>;
                           } else if (updatingTask?.rawStatus === 'UNDER_REVIEW') {
                               return <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>Note: Remaining 5% is pending with Approver.</div>;
                           }
                       }
                       return null;
                    })()}
                  </div>

                  <div className="myt-modal-section">
                    <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#0f172a" }}>Remarks <span style={{ fontWeight: "400", color: "#64748b" }}>(Optional)</span></h4>
                    <textarea
                      className="myt-remarks-input"
                      placeholder="Enter remarks..."
                      value={updateRemarks}
                      onChange={(e) => setUpdateRemarks(e.target.value)}
                      disabled={updatingTask?.status === "Completed"}
                    />
                  </div>

                  <div className="myt-modal-section">
                    <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#0f172a" }}>Upload Evidence <span style={{ fontWeight: "400", color: "#64748b" }}>(Optional)</span></h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <label className="myt-file-upload-btn" style={{ opacity: updatingTask?.status === "Completed" ? 0.6 : 1, cursor: updatingTask?.status === "Completed" ? "not-allowed" : "pointer" }}>
                        Choose Files
                        <input type="file" style={{ display: "none" }} disabled={updatingTask?.status === "Completed"} />
                      </label>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>No file chosen</span>
                    </div>
                  </div>


              <div className="myt-modal-actions" style={{ borderTop: "none", marginTop: "16px", paddingTop: "0" }}>
                {(() => {
                  const sts = updatingTask?.rawStatus;
                  const isCompleted = sts === "COMPLETED";
                  const isDoer = String(updatingTask?.rawTask?.empId) === String(currentUserEmpId);
                  const isChecker = String(updatingTask?.rawTask?.reviewerId) === String(currentUserEmpId);
                  const isApprover = String(updatingTask?.rawTask?.approverId) === String(currentUserEmpId);
                  const isOther = !isDoer && !isChecker && !isApprover;

                  if (isCompleted) {
                      return <button className="cc-btn secondary" onClick={() => setShowUpdateModal(false)} style={{ borderRadius: "6px" }}>Close</button>;
                  }

                  if (sts === "SUBMIT_REVIEW") {
                      if (isDoer) {
                          return (
                              <>
                                  <button className="cc-btn secondary" onClick={() => setShowUpdateModal(false)} style={{ borderRadius: "6px" }}>Close</button>
                                  <button className="cc-btn primary" onClick={() => { triggerAlert("success", "Sent", "Reminder sent!"); setShowUpdateModal(false); }} style={{ borderRadius: "6px", backgroundColor: "#0f172a" }}>Send Reminder</button>
                              </>
                          );
                      } else if (isChecker || isOther) {
                          return (
                              <>
                                  <button className="cc-btn secondary" onClick={() => setShowUpdateModal(false)} style={{ borderRadius: "6px" }}>Close</button>
                                  <button className="cc-btn danger" onClick={() => handleAction("REASSIGN")} style={{ borderRadius: "6px", backgroundColor: "#ef4444", color: "white", border: "none" }}>Denied</button>
                                  <button className="cc-btn primary" onClick={() => handleAction("UNDER_REVIEW")} style={{ borderRadius: "6px", backgroundColor: "#10b981", border: "none" }}>Approve</button>
                              </>
                          );
                      }
                  }

                  if (sts === "UNDER_REVIEW") {
                      if (isDoer || isChecker) {
                          return (
                              <>
                                  <button className="cc-btn secondary" onClick={() => setShowUpdateModal(false)} style={{ borderRadius: "6px" }}>Close</button>
                                  <button className="cc-btn primary" onClick={() => { triggerAlert("success", "Sent", "Reminder sent!"); setShowUpdateModal(false); }} style={{ borderRadius: "6px", backgroundColor: "#0f172a" }}>Send Reminder</button>
                              </>
                          );
                      } else if (isApprover || isOther) {
                          return (
                              <>
                                  <button className="cc-btn secondary" onClick={() => setShowUpdateModal(false)} style={{ borderRadius: "6px" }}>Close</button>
                                  <button className="cc-btn danger" onClick={() => handleAction("REASSIGN")} style={{ borderRadius: "6px", backgroundColor: "#ef4444", color: "white", border: "none" }}>Denied</button>
                                  <button className="cc-btn primary" onClick={() => handleAction("COMPLETED")} style={{ borderRadius: "6px", backgroundColor: "#10b981", border: "none" }}>Approve</button>
                              </>
                          );
                      }
                  }

                  return (
                      <>
                        <button className="cc-btn secondary" onClick={() => setShowUpdateModal(false)} style={{ borderRadius: "6px" }}>Close</button>
                        <button className="cc-btn primary" onClick={handleSaveProgress} style={{ borderRadius: "6px", backgroundColor: "#0f172a" }}>
                          {updateProgressVal === 100 || updateChecklist.length === 0 
                            ? (updatingTask?.rawTask?.prcsFlg ? "Submit for Review" : "Mark as Completed") 
                            : "Update"}
                        </button>
                      </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal isOpen={alertOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertOpen(false)} />
    </div>
  );
};

export default MyTasks;
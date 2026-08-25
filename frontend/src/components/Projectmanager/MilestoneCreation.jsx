import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell, Search, X, Menu, ChevronRight, RefreshCcw, Save, Edit, Trash2, Eye,
  Plus, MoreVertical, ChevronLeft, Settings, Users, Link, CalendarDays, Clock,
  CheckSquare, File, Paperclip, Workflow, GanttChartSquare, UserPlus, UserCheck,
  ChevronDown, Image as ImageIcon, Upload, AlertCircle, CheckCircle, ArrowLeft,
  ArrowRight, User, Building2, Mail, Phone, Calendar, ClipboardList, ListChecks,
  Check, Filter, Download, Printer
} from "lucide-react";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import { getScreenPermission } from "../../utils/permissions";
import "../../styles/milestoneCreation.css";

// ============================================================
// API SERVICE – Draft & Live APIs
// ============================================================

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";

const getAuthToken = () => sessionStorage.getItem("authToken") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getAuthToken()}`
});

// ── Draft Project APIs ────────────────────────────────────────
const projectApi = {
  getAll: () =>
    fetch(`${API_BASE}/project-drafts`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch projects"); return res.json(); })
};

// ── Draft Milestone APIs ──────────────────────────────────────
const milestoneApi = {
  getAll: () =>
    fetch(`${API_BASE}/milestone-drafts`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch draft milestones"); return res.json(); }),
  getById: (id) =>
    fetch(`${API_BASE}/milestone-drafts/${id}`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch milestone"); return res.json(); }),
  create: (data) =>
    fetch(`${API_BASE}/milestone-drafts`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(data)
    }).then(async res => {
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Failed to create milestone");
      }
      return res.json();
    }),
  update: (id, data) =>
    fetch(`${API_BASE}/milestone-drafts/${id}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify(data)
    }).then(async res => {
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Failed to update milestone and task");
      }
      return res.json();
    }),
  delete: (id) =>
    fetch(`${API_BASE}/milestone-drafts/${id}`, {
      method: "DELETE", headers: authHeaders()
    }).then(async res => {
      if (!res.ok) throw new Error("Failed to delete milestone");
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    })
};

// ── Draft Task APIs ───────────────────────────────────────────
const taskApi = {
  getAll: () =>
    fetch(`${API_BASE}/task-drafts`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch all tasks"); return res.json(); }),
  create: (data) =>
    fetch(`${API_BASE}/task-drafts`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(data)
    }).then(async res => {
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Failed to create task");
      }
      return res.json();
    }),
  update: (id, data) =>
    fetch(`${API_BASE}/task-drafts/${id}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify(data)
    }).then(async res => {
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Failed to update task");
      }
      return res.json();
    }),
  delete: (id) =>
    fetch(`${API_BASE}/task-drafts/${id}`, {
      method: "DELETE", headers: authHeaders()
    }).then(res => { if (!res.ok) throw new Error("Failed to delete task"); return res.json(); }),
  getByMilestone: (mId) =>
    fetch(`${API_BASE}/task-drafts/by-milestone/${mId}`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch tasks by milestone"); return res.json(); })
};

// ── Live Project APIs ─────────────────────────────────────────
const liveProjectApi = {
  getAll: () =>
    fetch(`${API_BASE}/project-live`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch live projects"); return res.json(); })
      .catch(() => [])
};

// ── Live Milestone APIs ───────────────────────────────────────
const liveMilestoneApi = {
  getByProject: (prjId) =>
    fetch(`${API_BASE}/project-live/${prjId}/milestones`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch live milestones"); return res.json(); })
      .catch(() => [])
};

// ── Live Task APIs ────────────────────────────────────────────
const liveTaskApi = {
  getAll: () =>
    fetch(`${API_BASE}/task-live`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch live tasks"); return res.json(); })
      .catch(() => []),
  getByMilestone: (mId) =>
    fetch(`${API_BASE}/task-live/by-milestone/${mId}`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch live tasks by milestone"); return res.json(); })
};


// ── Employee / Reviewer / Approver APIs (replace with real endpoints) ──
const employeeApi = {
  getAll: () =>
    fetch(`${API_BASE}/employees`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch employees"); return res.json(); })
      .catch(() => []) // fallback to empty array if not implemented
};
const reviewerApi = {
  getAll: () =>
    fetch(`${API_BASE}/reviewers`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch reviewers"); return res.json(); })
      .catch(() => [])
};
const approverApi = {
  getAll: () =>
    fetch(`${API_BASE}/approvers`, { headers: authHeaders() })
      .then(res => { if (!res.ok) throw new Error("Failed to fetch approvers"); return res.json(); })
      .catch(() => [])
};

// Helper mappings for External Employee properties
const mapToSnakeCase = (backendEmp) => {
  if (!backendEmp) return null;
  return {
    ext_emp_id: backendEmp.extEmpId,
    ext_emp_cd: backendEmp.extEmpCode || "",
    ext_emp_nm: backendEmp.extEmpNm || "",
    email: backendEmp.email || "",
    mob_num: backendEmp.mobNum || "",
    company_nm: backendEmp.companyNm || "",
    photo_path: backendEmp.photoPath || "",
    rep_emp_id: backendEmp.repEmpId || "",
    sts: backendEmp.sts ?? true
  };
};

const mapToCamelCase = (frontendEmp) => {
  if (!frontendEmp) return null;
  return {
    extEmpId: frontendEmp.ext_emp_id || null,
    extEmpCode: frontendEmp.ext_emp_cd || "",
    extEmpNm: frontendEmp.ext_emp_nm || "",
    email: frontendEmp.email || "",
    mobNum: frontendEmp.mob_num || "",
    companyNm: frontendEmp.company_nm || "",
    photoPath: frontendEmp.photo_path || "",
    repEmpId: frontendEmp.rep_emp_id ? parseInt(frontendEmp.rep_emp_id) : null,
    sts: frontendEmp.sts ?? true
  };
};

// ── External Employee APIs ───────────────────────────────────────────
const externalEmployeeApi = {
  getAll: () =>
    fetch(`${API_BASE}/external-employees`, { headers: authHeaders() })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch external employees");
        return res.json();
      })
      .then(data => (data || []).map(mapToSnakeCase))
      .catch(() => []),
  create: (data) =>
    fetch(`${API_BASE}/external-employees`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(mapToCamelCase(data))
    }).then(async res => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create external employee");
      }
      return res.json();
    }).then(mapToSnakeCase),
  save: (list) => Promise.resolve(list) // backward compatibility fallback
};

// ── Searchable Select Component ──────────────────────────────
const SearchableSelect = ({ options, value, onChange, placeholder, style, disabled, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={className}
        style={{
          padding: '8px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          background: disabled ? '#f1f5f9' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '38px',
          fontSize: '13px',
          color: selected ? '#0f172a' : '#94a3b8',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected ? selected.label : (placeholder || "Select...")}
        </span>
        <ChevronDown size={14} style={{ color: '#64748b', flexShrink: 0, marginLeft: '6px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            marginTop: '4px',
            zIndex: 9999,
            maxHeight: '220px',
            overflowY: 'auto',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '6px 8px', position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #e2e8f0', zIndex: 2 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ padding: '4px 0' }}>
            {filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setIsOpen(false);
                  setSearch("");
                }}
                style={{
                  padding: '7px 12px',
                  cursor: 'pointer',
                  background: String(value) === String(opt.value) ? '#eff6ff' : 'white',
                  fontSize: '13px',
                  color: String(value) === String(opt.value) ? '#1d4ed8' : '#334155',
                  fontWeight: String(value) === String(opt.value) ? '600' : '400'
                }}
                onMouseOver={(e) => {
                  if (String(value) !== String(opt.value)) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseOut={(e) => {
                  if (String(value) !== String(opt.value)) e.currentTarget.style.background = 'white';
                }}
              >
                {opt.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const MilestoneCreation = ({ onLogout, userRole }) => {
  const navigate = useNavigate();
  const screenPerm = getScreenPermission('MILESTONE_CREATION');
  const STEPS = [
    { id: 1, name: "Milestone Details", icon: Settings, description: "Basic milestone information" },
    { id: 2, name: "Tasks", icon: Users, description: "Add and manage tasks with checklist, attachments, process & gantt" }
  ];

  // ── State (all initially empty) ─────────────────────────────
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [externalEmployees, setExternalEmployees] = useState([]);
  const [reviewersList, setReviewersList] = useState([]);
  const [approversList, setApproversList] = useState([]);
  const [milestoneList, setMilestoneList] = useState([]); // Combined (draft + live)
  const [projectMilestones, setProjectMilestones] = useState([]);
  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [showMilestoneDeleteModal, setShowMilestoneDeleteModal] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL, DRAFT, LIVE, CLOSED, HOLD

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: "info", title: "", message: "", onClose: null });

  const [milestone, setMilestone] = useState({
    drft_m_id: null, drft_prj_id: "", mlstm_cd: "", mlstm_ttl: "", mlstm_desc: "",
    mlstm_days: "", mlstm_dep_flg: false, mlstm_dep_typ: "INDEPENDENT", mlstm_dep_m_id: "",
    tent_st_dt: "", tent_end_dt: "", chk_id: null, file_url: "", addl_rem: "",
    mlstm_sts: "DRAFT", sts: true
  });

  const [tasks, setTasks] = useState([]);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(6);
  const [existingTaskCodes, setExistingTaskCodes] = useState(new Set());
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [activeTaskTab, setActiveTaskTab] = useState("details");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [stepValidation, setStepValidation] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showExternalEmployeeModal, setShowExternalEmployeeModal] = useState(false);
  const [externalEmployeeForm, setExternalEmployeeForm] = useState({
    ext_emp_cd: "", ext_emp_nm: "", email: "", mob_num: "", company_nm: "",
    photo_path: "", rep_emp_id: "", sts: true
  });
  const [externalEmployeeErrors, setExternalEmployeeErrors] = useState({});
  const [isSubmittingExternal, setIsSubmittingExternal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const externalPhotoInputRef = useRef(null);

  const dependencyTypes = [
    { value: "INDEPENDENT", label: "Independent" },
    { value: "SEQUENTIAL", label: "Sequential" },
    { value: "PARALLEL", label: "Parallel" }
  ];
  const taskTypes = [
    { value: "INTERNAL", label: "Internal" },
    { value: "EXTERNAL", label: "External" }
  ];
  const checklistStatuses = [
    { value: "PENDING", label: "Pending" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" }
  ];
  const taskColors = [
    "#2563eb", "#16a34a", "#d97706", "#7c3aed",
    "#dc2626", "#0891b2", "#db2777", "#4f46e5"
  ];

  // ── Utilities ────────────────────────────────────────────────
  const getTodayDate = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  };

  const formatLocalDate = (date) => {
    if (!date) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    let year, month, day;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.split("T")[0].split("-");
      year = parts[0];
      month = parts[1];
      day = parts[2];
      return `${day}/${month}/${year}`;
    } else if (/^\d{2}-\d{2}-\d{4}/.test(dateStr)) {
      const parts = dateStr.split("-");
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      day = String(d.getDate()).padStart(2, '0');
      month = String(d.getMonth() + 1).padStart(2, '0');
      year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  };

  const addDays = (dateStr, days) => {
    const d = parseLocalDate(dateStr);
    if (!d) return "";
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
  };

  const getNextWorkingDay = (dateStr, wrkDaysPerWk) => {
    if (!dateStr) return "";
    return addDays(dateStr, 1);
  };

  const calculateEndDateWithWorkingDays = (startDate, days, wrkDaysPerWk) => {
    if (!startDate || !days || parseInt(days) <= 0) return "";
    let d = parseLocalDate(startDate);
    if (!d) return "";
    const skipSat = (wrkDaysPerWk === 5);
    const skipSun = (wrkDaysPerWk === 5 || wrkDaysPerWk === 6);

    while (true) {
      const dow = d.getDay();
      if ((skipSat && dow === 6) || (skipSun && dow === 0)) {
        d.setDate(d.getDate() + 1);
      } else {
        break;
      }
    }

    let count = 1;
    while (count < days) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (!((skipSat && dow === 6) || (skipSun && dow === 0))) {
        count++;
      }
    }
    return formatLocalDate(d);
  };

  const calculateEndDate = (startDate, days) => {
    if (!startDate || !days || parseInt(days) <= 0) return "";
    return addDays(startDate, parseInt(days) - 1);
  };

  const isWeekend = (date, wrkDaysPerWk) => {
    const dow = date.getDay();
    if (wrkDaysPerWk === 5) return dow === 0 || dow === 6;
    if (wrkDaysPerWk === 6) return dow === 0;
    return false;
  };

  const getMilestoneFirstDay = () => milestone.tent_st_dt || getTodayDate();
  const generateMilestoneCode = (prjId = milestone.drft_prj_id, list = milestoneList) => {
    let maxNum = 0;
    const projectMilestonesOnly = prjId
      ? (list || []).filter(m => String(m.projectId || m.drftPrjId || m.drft_prj_id) === String(prjId))
      : (list || []);

    projectMilestonesOnly.forEach(m => {
      const code = m.code || m.mlstnCd || m.mlstm_cd || "";
      const match = code.match(/(?:MLS|MS)[-_]?(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `MLS-${String(nextNum).padStart(3, '0')}`;
  };

  const generateTaskCode = (currentTasks = tasks) => {
    let maxNum = 0;
    (currentTasks || []).forEach(t => {
      const code = t.task_cd || t.taskCd || "";
      const match = code.match(/TSK[-_]?(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    (existingTaskCodes || new Set()).forEach(code => {
      const match = (code || "").match(/TSK[-_]?(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `TSK-${String(nextNum).padStart(3, '0')}`;
  };
  const generateExternalEmployeeCode = () => {
    let maxNum = 0;
    if (Array.isArray(externalEmployees)) {
      externalEmployees.forEach(e => {
        const code = e.ext_emp_cd || e.extEmpCode || "";
        const match = code.match(/^EXT-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
    }
    return `EXT-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const calculateTaskStartDate = (task) => {
    const milestoneStart = getMilestoneFirstDay();
    if (!task.task_dep_flg || task.task_dep_typ === "INDEPENDENT" || !task.dep_task_id) {
      return milestoneStart;
    }
    const dependentTask = tasks.find(t => t.task_cd === task.dep_task_id);
    if (!dependentTask || !dependentTask.tent_st_dt || !dependentTask.tent_end_dt) {
      return milestoneStart;
    }
    if (task.task_dep_typ === "PARALLEL") return dependentTask.tent_st_dt;
    if (task.task_dep_typ === "SEQUENTIAL") return getNextWorkingDay(dependentTask.tent_end_dt, workingDaysPerWeek);
    return milestoneStart;
  };
  const autoCalculateTaskDates = (task) => {
    if (!task) return task;
    const updated = { ...task };
    const startDate = calculateTaskStartDate(updated);
    updated.tent_st_dt = startDate;
    if (updated.no_of_days && parseInt(updated.no_of_days) > 0) {
      updated.tent_end_dt = calculateEndDate(startDate, updated.no_of_days);
    }
    return updated;
  };

  const calculateMilestoneStartDate = (milestoneData) => {

    if (
      !milestoneData.mlstm_dep_flg ||
      milestoneData.mlstm_dep_typ === "INDEPENDENT" ||
      !milestoneData.mlstm_dep_m_id
    ) {
      return milestoneData.tent_st_dt;
    }

    const depMilestone = projectMilestones.find(
      m => String(m.drftMId) === String(milestoneData.mlstm_dep_m_id)
    );

    if (!depMilestone) {
      return milestoneData.tent_st_dt;
    }

    if (milestoneData.mlstm_dep_typ === "PARALLEL") {
      return depMilestone.tentStDt;
    }

    if (milestoneData.mlstm_dep_typ === "SEQUENTIAL") {
      return addDays(depMilestone.tentEndDt, 1);
    }

    return milestoneData.tent_st_dt;
  };

  const autoCalculateMilestoneDates = (milestoneData) => {

    const updated = { ...milestoneData };

    updated.tent_st_dt = calculateMilestoneStartDate(updated);

    if (updated.mlstm_days) {
      updated.tent_end_dt = calculateEndDate(
        updated.tent_st_dt,
        updated.mlstm_days
      );
    }

    return updated;
  };

  // ── Effects ──────────────────────────────────────────────────
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (milestone.drft_prj_id) {
      const selectedProject = projects.find(p => String(p.prj_id) === String(milestone.drft_prj_id));
      if (selectedProject && selectedProject.coyId) {
        fetch(`${API_BASE}/companies/${selectedProject.coyId}`, { headers: authHeaders() })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              const days = data.wrkDaysPerWk || data.workingDaysPerWeek || 6;
              setWorkingDaysPerWeek(days);
            }
          })
          .catch(err => {
            console.error("Error fetching company details:", err);
            setWorkingDaysPerWeek(6); // fallback
          });
      }
    } else {
      setWorkingDaysPerWeek(6);
    }
  }, [milestone.drft_prj_id, projects]);
  useEffect(() => {
    if (!milestone.drft_prj_id) {
      setProjectMilestones([]);
      return;
    }

    fetch(`${API_BASE}/milestone-drafts/by-project/${milestone.drft_prj_id}`, {
      headers: authHeaders(),
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch milestones");
        return res.json();
      })
      .then(data => {
        setProjectMilestones(data || []);
      })
      .catch(err => {
        console.error(err);
        setProjectMilestones([]);
      });

  }, [milestone.drft_prj_id]);

  useEffect(() => {
    if (milestone.tent_st_dt && milestone.mlstm_days) {
      const endDate = calculateEndDate(milestone.tent_st_dt, milestone.mlstm_days);
      if (endDate) setMilestone(prev => ({ ...prev, tent_end_dt: endDate }));
    }
  }, [milestone.tent_st_dt, milestone.mlstm_days]);

  useEffect(() => {
    if (!milestone.tent_st_dt || tasks.length === 0) return;

    const updatedTasks = tasks.map(task => autoCalculateTaskDates(task));

    setTasks(updatedTasks);

    if (selectedTask && editingTaskIndex !== null) {
      setSelectedTask(updatedTasks[editingTaskIndex]);
    }

  }, [milestone.tent_st_dt]);



  const location = useLocation();

  useEffect(() => {
    if (location.state?.createMode || location.state?.projectId || location.state?.taskMode) {
      if (location.state?.projectId) {
        const pId = String(location.state.projectId);
        setMilestone(prev => ({
          ...prev,
          drft_prj_id: pId,
          mlstm_cd: generateMilestoneCode(milestoneList)
        }));
      }
      setView("form");
      if (location.state?.taskMode || location.state?.step === 2) {
        setCurrentStep(2);
        setCompletedSteps(new Set([1]));
      }
      if (location.state?.showSuccessAlert) {
        const alertMsg = location.state.message || "Project created successfully! Please configure milestones and tasks.";
        navigate(location.pathname, { replace: true, state: {} });
        triggerAlert("success", "Success", alertMsg);
      }
    }
  }, [location.state]);

  // ── Alert ────────────────────────────────────────────────────
  const triggerAlert = (type, title, message, onClose = null) => {
    setAlertConfig({ isOpen: true, type, title, message, onClose });
  };

  // ── Data Loading (Draft + Live) ─────────────────────────────
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        projectsData,
        draftMilestones,
        allTasks,
        allLiveTasks,
        liveProjects,
        liveMilestonesData,
        emps,
        extEmps
      ] = await Promise.all([
        projectApi.getAll().catch(() => []),
        milestoneApi.getAll().catch(() => []),
        taskApi.getAll().catch(() => []),
        liveTaskApi.getAll().catch(() => []),
        liveProjectApi.getAll().catch(() => []),
        fetch(`${API_BASE}/milestone-live`, { headers: authHeaders() }).then(res => res.ok ? res.json() : []).catch(() => []),
        employeeApi.getAll().catch(() => []),
        externalEmployeeApi.getAll().catch(() => [])
      ]);

      // 1. Map projects
      const mappedProjects = (projectsData || []).map(p => ({
        ...p,
        prj_id: p.drftPrjId,
        prj_cd: p.prjCd,
        prj_nm: p.prjNm
      }));
      setProjects(mappedProjects);

      // 2. Draft milestones & task count
      setExistingTaskCodes(new Set((allTasks || []).map(t => t.taskCd || t.task_cd).filter(Boolean)));

      const taskCountMap = {};
      (allTasks || []).forEach(t => {
        const mId = t.drftMId || t.drft_m_id;
        if (mId) {
          taskCountMap[mId] = (taskCountMap[mId] || 0) + 1;
        }
      });

      const draftList = (draftMilestones || []).map(m => {
        const id = m.drftMId || m.drft_m_id;
        return {
          ...m,
          type: 'draft',
          id: id,
          code: m.mlstnCd || m.mlstm_cd,
          title: m.mlstnTtl || m.mlstm_ttl,
          projectId: m.drftPrjId || m.drft_prj_id,
          duration: m.mlstnDays || m.mlstm_days,
          startDate: m.tentStDt || m.tent_st_dt,
          endDate: m.tentEndDt || m.tent_end_dt,
          taskCount: taskCountMap[id] || 0,
          status: m.mlstnSts || m.mlstm_sts
        };
      });

      // 3. Live tasks count
      const liveTaskCountMap = {};
      (allLiveTasks || []).forEach(t => {
        const mId = t.mid || t.mId || t.m_id;
        if (mId) {
          liveTaskCountMap[mId] = (liveTaskCountMap[mId] || 0) + 1;
        }
      });

      // 4. Live milestones & project mapping
      const liveProjectMap = {};
      (liveProjects || []).forEach(p => {
        liveProjectMap[p.prjId] = p;
      });

      const liveList = (liveMilestonesData || []).map(m => {
        const id = m.mid || m.mId || m.id;
        const project = liveProjectMap[m.prjId] || {};
        return {
          type: 'live',
          id: id,
          code: m.mlstnCd || m.code,
          title: m.mlstnTtl || m.mlstnNm || m.title,
          projectId: m.prjId || project?.prjId,
          projectCd: project?.prjCd || '',
          projectName: project?.prjNm || '',
          duration: m.mlstnDays || m.noOfDays || m.duration,
          startDate: m.stDt || m.tentStDt || m.startDate,
          endDate: m.endDt || m.tentEndDt || m.endDate,
          taskCount: liveTaskCountMap[id] || 0,
          status: m.mlstnSts || 'LIVE',
          original: m
        };
      });

      // Combine
      setMilestoneList([...draftList, ...liveList]);

      // 5. Employees & External Employees
      const mappedEmps = (emps || []).map(emp => ({
        ...emp,
        emp_id: emp.empId,
        emp_nm: `${emp.fstNm || ""} ${emp.lstNm || ""}`.trim()
      }));
      setEmployees(mappedEmps);
      setExternalEmployees(extEmps || []);

      const empsMapped = (emps || []).map(emp => ({
        r_id: emp.empId,
        r_nm: `${emp.fstNm || ""} ${emp.lstNm || ""}`.trim()
      }));
      setReviewersList(empsMapped);
      setApproversList(empsMapped);

    } catch (err) {
      console.error("Load error:", err);
      triggerAlert("error", "Load Error", "Failed to load data from server.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step Navigation & Validation ────────────────────────────
  const goToStep = (step) => {
    if (step > currentStep) {
      if (!validateCurrentStep()) return;
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
    setCurrentStep(step);
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goToNextStep = () => {
    if (currentStep < STEPS.length) {
      if (validateCurrentStep()) {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const validateCurrentStep = (stepNum = currentStep) => {
    const errors = {};
    let isValid = true;
    if (stepNum === 1) {
      if (!milestone.drft_prj_id) { errors.drft_prj_id = "Project is required"; isValid = false; }
      if (!milestone.mlstm_cd) { errors.mlstm_cd = "Milestone code is required"; isValid = false; }
      else if (milestone.mlstm_cd.length > 10) { errors.mlstm_cd = "Max 10 characters"; isValid = false; }
      if (!milestone.mlstm_ttl) { errors.mlstm_ttl = "Title is required"; isValid = false; }
      if (!milestone.mlstm_days || parseInt(milestone.mlstm_days) <= 0) {
        errors.mlstm_days = "Valid duration is required";
        isValid = false;
      } else if (milestone.drft_prj_id) {
        const selectedProject = projects.find(p => String(p.prj_id) === String(milestone.drft_prj_id));
        if (selectedProject) {
          const projectDays = parseInt(selectedProject.noOfDays || selectedProject.totalProjectDays || 0);
          const inputDays = parseInt(milestone.mlstm_days || 0);
          if (projectDays > 0) {
            if (inputDays > projectDays) {
              const diff = inputDays - projectDays;
              errors.mlstm_days = `Single milestone duration (${inputDays} days) exceeds project days (${projectDays} days) by ${diff} day(s).`;
              isValid = false;
            } else {
              const calcMs = autoCalculateMilestoneDates(milestone);
              const pStDt = selectedProject.startDate || selectedProject.stDt || selectedProject.tentStDt || milestone.tent_st_dt;
              if (pStDt && calcMs.tent_end_dt) {
                const pEndDt = selectedProject.endDate || selectedProject.endDt || selectedProject.tentEndDt || calculateEndDate(pStDt, projectDays);
                if (pEndDt && calcMs.tent_end_dt > pEndDt) {
                  const msEnd = new Date(calcMs.tent_end_dt);
                  const prjEnd = new Date(pEndDt);
                  const diffTime = msEnd.getTime() - prjEnd.getTime();
                  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 3600 * 24)));
                  errors.mlstm_days = `Cumulative milestone end date (${calcMs.tent_end_dt}) exceeds project end date (${pEndDt}) by ${diffDays} day(s).`;
                  isValid = false;
                }
              }
            }
          }
        }
      }
      if (!milestone.tent_st_dt) {
        errors.tent_st_dt = "Start date is required";
        isValid = false;
      } else if (!isEditing) {
        const selectedProjectObj = projects.find(p => String(p.prj_id || p.id || p.drftPrjId || p.prjId || p.drft_prj_id) === String(milestone.drft_prj_id || milestone.prj_id));
        const pStDtVal = selectedProjectObj ? (selectedProjectObj.startDate || selectedProjectObj.stDt || selectedProjectObj.tentStDt || selectedProjectObj.st_dt || selectedProjectObj.start_date) : null;
        const pEndDtVal = selectedProjectObj ? (selectedProjectObj.endDate || selectedProjectObj.endDt || selectedProjectObj.tentEndDt || selectedProjectObj.end_date || selectedProjectObj.end_dt) : null;

        if (pStDtVal && milestone.tent_st_dt < pStDtVal) {
          errors.tent_st_dt = `Start date cannot be before project start date (${pStDtVal})`;
          isValid = false;
        } else if (pEndDtVal && milestone.tent_st_dt > pEndDtVal) {
          errors.tent_st_dt = `Start date cannot be after project end date (${pEndDtVal})`;
          isValid = false;
        }
      }
      if (milestone.mlstm_dep_flg && !milestone.mlstm_dep_m_id) { errors.mlstm_dep_m_id = "Dependent milestone is required"; isValid = false; }
    } else if (stepNum === 2) {
      if (selectedTask) {
        errors.tasks = "Please save or cancel your current task edits first.";
        isValid = false;
      } else if (tasks.length === 0) {
        errors.tasks = "At least one task is required";
        isValid = false;
      } else {
        const incompleteTask = tasks.find(task => {
          return !task.task_nm?.trim() ||
            (task.task_typ === "INTERNAL" && !task.emp_id) ||
            (task.task_typ === "EXTERNAL" && !task.ext_emp_id) ||
            !task.no_of_days || parseInt(task.no_of_days) <= 0;
        });
        if (incompleteTask) {
          errors.tasks = "All tasks must be fully completed with a name, executor, and valid duration.";
          isValid = false;
        } else {
          const milestoneEnd = milestone.tent_end_dt ? new Date(milestone.tent_end_dt) : null;
          if (milestoneEnd) {
            const exceedingTasks = tasks.filter(task => {
              if (!task.tent_end_dt) return false;
              return new Date(task.tent_end_dt) > milestoneEnd;
            });
            if (exceedingTasks.length > 0) {
              errors.tasks = `You are exceeding the milestone duration. You have to complete within ${milestone.mlstm_days} days only. If not, update the days.`;
              isValid = false;
            }
          }
        }
      }
    }
    setStepValidation({ ...stepValidation, [stepNum]: errors });
    setFormErrors(errors);
    if (!isValid) {
      const firstError = document.querySelector(".mc-error");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return isValid;
  };

  const isStepComplete = (step) => completedSteps.has(step);

  // ── Milestone CRUD ───────────────────────────────────────────
  const updateMilestone = (field, value) => {
    if (field === "mlstm_cd" && value.length > 10) value = value.slice(0, 10);
    if (field === "drft_prj_id" && !isEditing) {
      const newCode = generateMilestoneCode(value, milestoneList);
      setMilestone(prev => ({ ...prev, drft_prj_id: value, mlstm_cd: newCode }));
    }
    setMilestone(prev => {

      const updated = {
        ...prev,
        [field]: value
      };

      if (
        [
          "mlstm_dep_flg",
          "mlstm_dep_typ",
          "mlstm_dep_m_id",
          "mlstm_days"
        ].includes(field)
      ) {
        return autoCalculateMilestoneDates(updated);
      }

      return updated;
    });

    setFormErrors(prev => ({ ...prev, [field]: "" }));
    setStepValidation(prev => {
      if (prev[1]) return { ...prev, 1: { ...prev[1], [field]: "" } };
      return prev;
    });

    if (field === "mlstm_days" || field === "drft_prj_id") {
      const pId = field === "drft_prj_id" ? value : milestone.drft_prj_id;
      const mDays = field === "mlstm_days" ? value : milestone.mlstm_days;

      if (pId && mDays && parseInt(mDays) > 0) {
        const selectedProject = projects.find(p => String(p.prj_id) === String(pId));
        if (selectedProject && selectedProject.noOfDays) {
          const projectDays = parseInt(selectedProject.noOfDays);
          const inputDays = parseInt(mDays);
          if (inputDays > projectDays) {
            const diff = inputDays - projectDays;
            const errorMsg = `You are exceeding ${diff} days more than the project days (${projectDays} days).`;
            setFormErrors(prev => ({ ...prev, mlstm_days: errorMsg }));
            setStepValidation(prev => ({ ...prev, 1: { ...(prev[1] || {}), mlstm_days: errorMsg } }));
          }
        }
      }
    }
  };

  const resetMilestoneForm = () => {
    setMilestone({
      drft_m_id: null, drft_prj_id: "", mlstm_cd: generateMilestoneCode(), mlstm_ttl: "", mlstm_desc: "",
      mlstm_days: "", mlstm_dep_flg: false, mlstm_dep_typ: "INDEPENDENT", mlstm_dep_m_id: "",
      tent_st_dt: "", tent_end_dt: "", chk_id: null, file_url: "", addl_rem: "",
      mlstm_sts: "DRAFT", sts: true
    });
    setTasks([]);
    setSelectedTask(null);
    setEditingTaskIndex(null);
    setFormErrors({});
    setStepValidation({});
    setCompletedSteps(new Set());
    setCurrentStep(1);
    setIsEditing(false);
    setEditingId(null);
  };

  // ── Task CRUD ────────────────────────────────────────────────
  const addTask = () => {
    const milestoneStart = getMilestoneFirstDay();
    const newTask = {
      drft_task_id: null, drft_m_id: null,
      task_cd: generateTaskCode(), task_nm: "", task_desc: "", task_typ: "INTERNAL",
      emp_id: "", ext_emp_id: "",
      task_dep_flg: false, task_dep_typ: "INDEPENDENT", dep_task_id: "",
      no_of_days: "", chk_flg: false, chk_id: null, file_path: "", note_txt: "",
      tent_st_dt: milestoneStart, tent_end_dt: "",
      prcs_flg: false, prcs_yes_actn: "", task_sts: "DRAFT", addl_rem: "", sts: true,
      checklist: [], attachments: [],
      process: { enabled: false, reviewer_id: "", approver_id: "", steps: [] }
    };
    const calculated = autoCalculateTaskDates(newTask);
    setSelectedTask(calculated);
    setEditingTaskIndex(null);
    setActiveTaskTab("details");
    setStepValidation(prev => ({ ...prev, 2: { ...prev[2], tasks: "" } }));
    setTimeout(scrollToTaskForm, 50);
  };

  const scrollToTaskForm = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const targetEl = document.querySelector(".mc-task-form") || document.querySelector(".mc-form-section") || document.querySelector(".mc-card") || document.querySelector(".main-content");
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const scrollContainers = document.querySelectorAll('.main-content, .mc-container, .mc-form-container, .app-container, body, html');
    scrollContainers.forEach(el => {
      if (el && el.scrollTop !== undefined && el.scrollTop > 0) {
        el.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const editTask = (index) => {
    setSelectedTask({ ...tasks[index] });
    setEditingTaskIndex(index);
    setActiveTaskTab("details");
    setTimeout(scrollToTaskForm, 50);
  };

  const updateTask = (field, value) => {
    setSelectedTask(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      const finalTask = ["task_dep_flg", "task_dep_typ", "dep_task_id", "no_of_days", "tent_st_dt"].includes(field)
        ? autoCalculateTaskDates(updated)
        : updated;

      if (editingTaskIndex !== null && editingTaskIndex >= 0) {
        setTasks(prevTasks => {
          const ut = [...prevTasks];
          ut[editingTaskIndex] = finalTask;
          return ut;
        });
      }
      return finalTask;
    });
    if (editingTaskIndex !== null && editingTaskIndex >= 0 && formErrors[`task_${editingTaskIndex}_${field}`]) {
      setFormErrors(prev => ({ ...prev, [`task_${editingTaskIndex}_${field}`]: "" }));
    }
  };

  const toggleTaskDependency = () => {
    const current = selectedTask.task_dep_flg;
    const updated = { ...selectedTask, task_dep_flg: !current };
    if (!current) updated.task_dep_typ = "SEQUENTIAL";
    else { updated.task_dep_typ = "INDEPENDENT"; updated.dep_task_id = ""; }
    const calculated = autoCalculateTaskDates(updated);
    setSelectedTask(calculated);
    if (editingTaskIndex !== null && editingTaskIndex >= 0) {
      setTasks(prevTasks => {
        const ut = [...prevTasks];
        ut[editingTaskIndex] = calculated;
        return ut;
      });
    }
    if (editingTaskIndex !== null && editingTaskIndex >= 0 && formErrors[`task_${editingTaskIndex}_dep_missing`]) {
      setFormErrors(prev => ({ ...prev, [`task_${editingTaskIndex}_dep_missing`]: "" }));
    }
  };

  const validateTask = (task) => {
    const errors = {};
    if (!task.task_cd?.trim()) errors.task_cd = "Task code is required";
    if (!task.task_nm?.trim()) errors.task_nm = "Task name is required";
    if (task.task_typ === "INTERNAL" && !task.emp_id) errors.assignee = "Executor is required";
    if (task.task_typ === "EXTERNAL" && !task.ext_emp_id) errors.ext_assignee = "External executor is required";
    if (!task.no_of_days || parseInt(task.no_of_days) <= 0) {
      errors.duration = "Valid duration is required";
    } else if (task.tent_end_dt && milestone.tent_end_dt && !isEditing) {
      const tEnd = new Date(task.tent_end_dt);
      const mEnd = new Date(milestone.tent_end_dt);
      if (tEnd > mEnd) {
        errors.duration = `You are exceeding the milestone duration. You have to complete within ${milestone.mlstm_days} days only. If not, update the days.`;
      }
    }
    if (task.task_dep_flg && !task.dep_task_id) errors.dep_missing = "Dependent task is required";
    return errors;
  };

  const saveTaskChanges = async () => {
    const errors = validateTask(selectedTask);
    if (Object.keys(errors).length > 0) {
      const keyIndex = editingTaskIndex !== null ? editingTaskIndex : "new";
      const errorObj = {};
      Object.keys(errors).forEach(k => errorObj[`task_${keyIndex}_${k}`] = errors[k]);
      setFormErrors(prev => ({ ...prev, ...errorObj }));
      return;
    }
    if (selectedTask.process?.enabled) {
      const keyIndex = editingTaskIndex !== null ? editingTaskIndex : "new";
      if (!selectedTask.process.reviewer_id) {
        setFormErrors(prev => ({ ...prev, [`task_${keyIndex}_reviewer`]: "Reviewer is required" }));
        return;
      }
      if (!selectedTask.process.approver_id) {
        setFormErrors(prev => ({ ...prev, [`task_${keyIndex}_approver`]: "Approver is required" }));
        return;
      }
    } else {
      selectedTask.process = {
        enabled: false,
        reviewer_id: "",
        approver_id: "",
        steps: []
      };
    }
    if (!selectedTask.tent_end_dt && selectedTask.no_of_days && selectedTask.tent_st_dt) {
      selectedTask.tent_end_dt = calculateEndDate(selectedTask.tent_st_dt, selectedTask.no_of_days);
    }

    if (selectedTask.drft_task_id) {
      if (!selectedTask.process?.enabled) {
        try {
          const steps = await fetch(`${API_BASE}/process-config/draft-task/${selectedTask.drft_task_id}`, { headers: authHeaders() })
            .then(res => res.ok ? res.json() : []);
          for (const step of steps) {
            const pcId = step.pcId || step.pc_id;
            if (pcId) {
              await fetch(`${API_BASE}/process-config/${pcId}`, {
                method: "DELETE", headers: authHeaders()
              });
            }
          }
        } catch (e) {
          console.error("Failed to delete process config steps in saveTaskChanges:", e);
        }
      }

      // Sync backend immediately when editing an existing task
      let depTaskIdVal = null;
      if (selectedTask.task_dep_flg && selectedTask.dep_task_id) {
        const depTaskObj = tasks.find(t => t.task_cd === selectedTask.dep_task_id);
        if (depTaskObj) {
          depTaskIdVal = depTaskObj.drft_task_id || null;
        }
      }

      const parseEmpId = (val) => {
        if (!val) return null;
        if (typeof val === 'number') return isNaN(val) ? null : val;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? null : parsed;
      };

      const taskPayload = {
        drftMId: selectedTask.drft_m_id || milestone.drft_m_id,
        taskCd: selectedTask.task_cd,
        taskNm: selectedTask.task_nm || "",
        taskDesc: selectedTask.task_desc || "",
        taskTyp: selectedTask.task_typ || "INTERNAL",
        empId: selectedTask.task_typ === "INTERNAL" ? parseEmpId(selectedTask.emp_id) : null,
        extEmpId: selectedTask.task_typ === "EXTERNAL" ? parseEmpId(selectedTask.ext_emp_id) : null,
        taskDepFlg: selectedTask.task_dep_flg || false,
        taskDepTyp: selectedTask.task_dep_typ || "INDEPENDENT",
        depTaskId: depTaskIdVal,
        noOfDays: parseInt(selectedTask.no_of_days, 10) || 0,
        chkFlg: (selectedTask.checklist && selectedTask.checklist.length > 0) || false,
        chkId: null,
        filePath: "",
        noteTxt: selectedTask.note_txt || "",
        tentStDt: selectedTask.tent_st_dt ? selectedTask.tent_st_dt : null,
        tentEndDt: selectedTask.tent_end_dt ? selectedTask.tent_end_dt : null,
        prcsFlg: selectedTask.process?.enabled || false,
        prcsYesActn: selectedTask.process?.enabled ? "YES" : "",
        taskSts: (selectedTask.task_sts && typeof selectedTask.task_sts === 'number') ? selectedTask.task_sts : 1,
        addlRem: selectedTask.addl_rem || "",
        sts: selectedTask.sts !== undefined ? selectedTask.sts : true
      };

      try {
        await taskApi.update(selectedTask.drft_task_id, taskPayload);
      } catch (err) {
        console.error("Failed to update task in saveTaskChanges:", err);
      }
    }

    if (editingTaskIndex !== null && editingTaskIndex >= 0) {
      const updatedTasks = [...tasks];
      updatedTasks[editingTaskIndex] = selectedTask;
      setTasks(updatedTasks);
    } else {
      setTasks(prev => [...prev, selectedTask]);
    }

    setSelectedTask(null);
    setEditingTaskIndex(null);
    setActiveTaskTab("details");
    setSuccessMessage("Task saved successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const cancelEdit = () => {
    setSelectedTask(null);
    setEditingTaskIndex(null);
    setActiveTaskTab("details");
  };

  const deleteTask = async () => {
    const taskToDelete = tasks[deleteIndex];
    if (taskToDelete && taskToDelete.drft_task_id) {
      try {
        await taskApi.delete(taskToDelete.drft_task_id);
      } catch (err) {
        console.error("Delete task error:", err);
        triggerAlert("error", "Delete Error", "Failed to delete task from server.");
        setShowModal(false);
        setDeleteIndex(null);
        return;
      }
    }
    const updatedTasks = tasks.filter((_, i) => i !== deleteIndex);
    setTasks(updatedTasks);
    setShowModal(false);
    setDeleteIndex(null);
    if (selectedTask && editingTaskIndex === deleteIndex) {
      setSelectedTask(null);
      setEditingTaskIndex(null);
    }
    setSuccessMessage("Task deleted successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // ── Task Checklist / Attachments / Process ──────────────────
  const addChecklistItem = () => {
    const newItem = {
      chk_id: null, task_id: null,
      chk_cd: `CHK-${(selectedTask.checklist?.length || 0) + 1}`,
      chk_nm: "", chk_desc: "", chk_sts: false,
      seq_no: (selectedTask.checklist?.length || 0) + 1,
      completed_t: null, sts: true
    };
    const updatedTask = { ...selectedTask, checklist: [...(selectedTask.checklist || []), newItem] };
    setSelectedTask(updatedTask);
    if (editingTaskIndex !== null && editingTaskIndex >= 0) {
      const updatedTasks = [...tasks];
      updatedTasks[editingTaskIndex] = updatedTask;
      setTasks(updatedTasks);
    }
  };
  const updateChecklistItem = (index, field, value) => {
    const updatedChecklist = [...(selectedTask.checklist || [])];
    updatedChecklist[index] = { ...updatedChecklist[index], [field]: value };
    if (field === "chk_sts" && value === true) updatedChecklist[index].completed_t = new Date().toISOString();
    const updatedTask = { ...selectedTask, checklist: updatedChecklist };
    setSelectedTask(updatedTask);
    if (editingTaskIndex !== null && editingTaskIndex >= 0) {
      const updatedTasks = [...tasks];
      updatedTasks[editingTaskIndex] = updatedTask;
      setTasks(updatedTasks);
    }
  };
  const removeChecklistItem = (index) => {
    const updatedChecklist = (selectedTask.checklist || []).filter((_, i) => i !== index);
    const updatedTask = { ...selectedTask, checklist: updatedChecklist };
    setSelectedTask(updatedTask);
    if (editingTaskIndex !== null && editingTaskIndex >= 0) {
      const updatedTasks = [...tasks];
      updatedTasks[editingTaskIndex] = updatedTask;
      setTasks(updatedTasks);
    }
  };

  const handleTaskFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      setUploadProgress(0);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/storage/upload/attachment/task`);
      xhr.setRequestHeader("Authorization", authHeaders().Authorization);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        setUploading(false);
        setUploadProgress(0);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const newAttachment = {
              file_id: null, t_id: null,
              at_path: data.url,
              file_nm: file.name, at_type: "UPLOAD",
              date_timestamp: new Date().toISOString()
            };
            const updatedTask = { ...selectedTask, attachments: [...(selectedTask.attachments || []), newAttachment] };
            setSelectedTask(updatedTask);
            if (editingTaskIndex !== null && editingTaskIndex >= 0) {
              const updatedTasks = [...tasks];
              updatedTasks[editingTaskIndex] = updatedTask;
              setTasks(updatedTasks);
            }
          } catch (err) {
            console.error("Task attachment upload JSON parse error:", err);
            triggerAlert("error", "Error", "Failed to parse upload response.");
          }
        } else {
          console.error("Task attachment upload failed with status:", xhr.status);
          triggerAlert("error", "Error", "Failed to upload file.");
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setUploadProgress(0);
        console.error("Task attachment upload network error");
        triggerAlert("error", "Error", "Network error during upload.");
      };

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      xhr.send(formDataUpload);
    }
    e.target.value = "";
  };
  const removeTaskAttachment = (index) => {
    const updatedAttachments = (selectedTask.attachments || []).filter((_, i) => i !== index);
    const updatedTask = { ...selectedTask, attachments: updatedAttachments };
    setSelectedTask(updatedTask);
    if (editingTaskIndex !== null && editingTaskIndex >= 0) {
      const updatedTasks = [...tasks];
      updatedTasks[editingTaskIndex] = updatedTask;
      setTasks(updatedTasks);
    }
  };

  const toggleTaskProcess = () => {
    const current = selectedTask.process?.enabled || false;
    const nextEnabled = !current;
    const updatedTask = {
      ...selectedTask,
      process: {
        ...selectedTask.process,
        enabled: nextEnabled,
        reviewer_id: nextEnabled ? (selectedTask.process?.reviewer_id || "") : "",
        approver_id: nextEnabled ? (selectedTask.process?.approver_id || "") : "",
        steps: []
      }
    };
    setSelectedTask(updatedTask);
    if (editingTaskIndex !== null && editingTaskIndex >= 0) {
      const updatedTasks = [...tasks];
      updatedTasks[editingTaskIndex] = updatedTask;
      setTasks(updatedTasks);
    }
  };

  // ── Submit Milestone (Draft) ─────────────────────────────────
  const handleSubmit = async (status = "DRAFT") => {
    let allValid = true;
    let failedStep = null;
    for (const step of [1, 2]) {
      if (!validateCurrentStep(step)) {
        allValid = false;
        failedStep = step;
        break;
      }
    }
    if (!allValid) {
      if (failedStep) setCurrentStep(failedStep);
      return;
    }

    setIsSubmitting(true);
    try {
      const milestonePayload = {
        drftPrjId: parseInt(milestone.drft_prj_id),
        mlstnCd: milestone.mlstm_cd,
        mlstnTtl: milestone.mlstm_ttl,
        mlstnDesc: milestone.mlstm_desc || "",
        mlstnDays: parseInt(milestone.mlstm_days),
        mlstnDepFlg: milestone.mlstm_dep_flg,
        mlstnDepTyp: milestone.mlstm_dep_typ || "INDEPENDENT",
        mlstnDepMId: milestone.mlstm_dep_m_id ? parseInt(milestone.mlstm_dep_m_id) : null,
        tentStDt: milestone.tent_st_dt,
        tentEndDt: milestone.tent_end_dt,
        chkId: milestone.chk_id || null,
        fileUrl: milestone.file_url || "",
        addlRem: milestone.addl_rem || "",
        mlstnSts: status,
        sts: true
      };

      let savedResult;
      if (isEditing && editingId) {
        savedResult = await milestoneApi.update(editingId, milestonePayload);
      } else {
        savedResult = await milestoneApi.create(milestonePayload);
      }

      const savedMilestone = savedResult.data || savedResult;
      const milestoneId = savedMilestone.drftMId || savedMilestone.drft_m_id || savedMilestone.id || (isEditing ? editingId : null);

      if (isEditing && editingId) {
        setMilestoneList(prev => prev.map(m =>
          m.type === 'draft' && m.id === editingId ? {
            ...m,
            ...savedMilestone,
            type: 'draft',
            id: savedMilestone.drftMId || savedMilestone.drft_m_id || editingId,
            code: savedMilestone.mlstnCd || savedMilestone.mlstm_cd || milestone.mlstm_cd,
            title: savedMilestone.mlstnTtl || savedMilestone.mlstm_ttl || milestone.mlstm_ttl,
            projectId: savedMilestone.drftPrjId || savedMilestone.drft_prj_id || milestone.drft_prj_id,
            duration: savedMilestone.mlstnDays || savedMilestone.mlstm_days || milestone.mlstm_days,
            startDate: savedMilestone.tentStDt || savedMilestone.tent_st_dt || milestone.tent_st_dt,
            endDate: savedMilestone.tentEndDt || savedMilestone.tent_end_dt || milestone.tent_end_dt,
            status: savedMilestone.mlstnSts || savedMilestone.mlstm_sts || status
          } : m
        ));
      } else {
        const newDraft = {
          ...savedMilestone,
          type: 'draft',
          id: savedMilestone.drftMId || savedMilestone.drft_m_id || savedMilestone.id,
          code: savedMilestone.mlstnCd || savedMilestone.mlstm_cd || milestone.mlstm_cd,
          title: savedMilestone.mlstnTtl || savedMilestone.mlstm_ttl || milestone.mlstm_ttl,
          projectId: savedMilestone.drftPrjId || savedMilestone.drft_prj_id || milestone.drft_prj_id,
          duration: savedMilestone.mlstnDays || savedMilestone.mlstm_days || milestone.mlstm_days,
          startDate: savedMilestone.tentStDt || savedMilestone.tent_st_dt || milestone.tent_st_dt,
          endDate: savedMilestone.tentEndDt || savedMilestone.tent_end_dt || milestone.tent_end_dt,
          status: savedMilestone.mlstnSts || savedMilestone.mlstm_sts || status
        };
        setMilestoneList(prev => [...prev, newDraft]);
      }

      // Helper to parse integer safely or return null
      const parseEmpId = (val) => {
        if (!val) return null;
        if (typeof val === 'number') return isNaN(val) ? null : val;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? null : parsed;
      };

      // First pass: create/update tasks without dependencies
      const taskIdMap = {};
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const taskPayload = {
          drftMId: milestoneId,
          taskCd: task.task_cd,
          taskNm: task.task_nm || "",
          taskDesc: task.task_desc || "",
          taskTyp: task.task_typ || "INTERNAL",
          empId: task.task_typ === "INTERNAL" ? parseEmpId(task.emp_id) : null,
          extEmpId: task.task_typ === "EXTERNAL" ? parseEmpId(task.ext_emp_id) : null,
          taskDepFlg: task.task_dep_flg || false,
          taskDepTyp: task.task_dep_typ || "INDEPENDENT",
          depTaskId: null,
          noOfDays: parseInt(task.no_of_days, 10) || 0,
          chkFlg: (task.checklist && task.checklist.length > 0) || false,
          chkId: null,
          filePath: "",
          noteTxt: task.note_txt || "",
          tentStDt: task.tent_st_dt ? task.tent_st_dt : null,
          tentEndDt: task.tent_end_dt ? task.tent_end_dt : null,
          prcsFlg: task.process?.enabled || false,
          prcsYesActn: task.process?.enabled ? "YES" : "",
          taskSts: 1,
          addlRem: task.addl_rem || "",
          sts: true
        };

        let savedTaskResult;
        if (task.drft_task_id) {
          savedTaskResult = await taskApi.update(task.drft_task_id, taskPayload);
        } else {
          savedTaskResult = await taskApi.create(taskPayload);
        }

        const savedTask = savedTaskResult.data || savedTaskResult;
        const taskId = savedTask.drftTaskId || savedTask.drft_task_id || savedTask.id || task.drft_task_id;
        taskIdMap[task.task_cd] = taskId;
        tasks[i].drft_task_id = taskId;
      }

      // Second pass: save dependencies, checklists, attachments, and process configs
      for (const task of tasks) {
        const taskId = taskIdMap[task.task_cd] || task.drft_task_id;

        let depTaskIdVal = null;
        if (task.task_dep_flg && task.dep_task_id) {
          depTaskIdVal = taskIdMap[task.dep_task_id] || parseEmpId(task.dep_task_id) || null;
        }

        const updatePayload = {
          drftMId: milestoneId,
          taskCd: task.task_cd,
          taskNm: task.task_nm || "",
          taskDesc: task.task_desc || "",
          taskTyp: task.task_typ || "INTERNAL",
          empId: task.task_typ === "INTERNAL" ? parseEmpId(task.emp_id) : null,
          extEmpId: task.task_typ === "EXTERNAL" ? parseEmpId(task.ext_emp_id) : null,
          taskDepFlg: task.task_dep_flg || false,
          taskDepTyp: task.task_dep_typ || "INDEPENDENT",
          depTaskId: depTaskIdVal,
          noOfDays: parseInt(task.no_of_days, 10) || 0,
          chkFlg: (task.checklist && task.checklist.length > 0) || false,
          chkId: null,
          filePath: "",
          noteTxt: task.note_txt || "",
          tentStDt: task.tent_st_dt ? task.tent_st_dt : null,
          tentEndDt: task.tent_end_dt ? task.tent_end_dt : null,
          prcsFlg: task.process?.enabled || false,
          prcsYesActn: task.process?.enabled ? "YES" : "",
          taskSts: 1,
          addlRem: task.addl_rem || "",
          sts: true
        };

        if (taskId) {
          try {
            await taskApi.update(taskId, updatePayload);
          } catch (e) {
            console.error("Failed to update task payload for task:", taskId, e);
          }
        }

        // Checklist persistence
        let existingChecklist = [];
        try {
          existingChecklist = await fetch(`${API_BASE}/checklists/draft-task/${taskId}`, { headers: authHeaders() })
            .then(res => res.ok ? res.json() : []);
        } catch (e) {
          console.error("Failed to load existing checklist items:", e);
        }

        const currentChkIds = (task.checklist || []).map(item => item.chk_id).filter(Boolean);
        for (const item of existingChecklist) {
          const itemChkId = item.chkId || item.chk_id;
          if (itemChkId && !currentChkIds.includes(itemChkId)) {
            try {
              await fetch(`${API_BASE}/checklists/${itemChkId}`, {
                method: "DELETE", headers: authHeaders()
              });
            } catch (e) {
              console.error("Failed to delete checklist item:", itemChkId, e);
            }
          }
        }

        for (const item of (task.checklist || [])) {
          const itemPayload = {
            chkCd: item.chk_cd || `CHK-${item.seq_no}`,
            chkNm: item.chk_nm || "",
            chkDesc: item.chk_desc || "",
            chkSts: item.chk_sts || false,
            seqNo: item.seq_no || 0,
            sts: true
          };
          if (item.chk_id) {
            try {
              await fetch(`${API_BASE}/checklists/${item.chk_id}`, {
                method: "PUT", headers: authHeaders(), body: JSON.stringify(itemPayload)
              });
            } catch (e) {
              console.error("Failed to update checklist item:", item.chk_id, e);
            }
          } else {
            try {
              await fetch(`${API_BASE}/checklists/draft-task/${taskId}`, {
                method: "POST", headers: authHeaders(), body: JSON.stringify(itemPayload)
              });
            } catch (e) {
              console.error("Failed to create checklist item:", e);
            }
          }
        }

        // Attachments persistence
        let existingAttachments = [];
        try {
          existingAttachments = await fetch(`${API_BASE}/attachments/draft-task/${taskId}`, { headers: authHeaders() })
            .then(res => res.ok ? res.json() : []);
        } catch (e) {
          console.error("Failed to load existing attachments:", e);
        }

        const currentFileIds = (task.attachments || []).map(att => att.file_id).filter(Boolean);
        for (const att of existingAttachments) {
          const attFileId = att.fileId || att.file_id;
          if (attFileId && !currentFileIds.includes(attFileId)) {
            try {
              await fetch(`${API_BASE}/attachments/${attFileId}`, {
                method: "DELETE", headers: authHeaders()
              });
            } catch (e) {
              console.error("Failed to delete attachment:", attFileId, e);
            }
          }
        }

        for (const att of (task.attachments || [])) {
          if (!att.file_id) {
            const attPayload = {
              atPath: att.at_path || "",
              fileNm: att.file_nm || "",
              atType: att.at_type || "UPLOAD"
            };
            try {
              await fetch(`${API_BASE}/attachments/draft-task/${taskId}`, {
                method: "POST", headers: authHeaders(), body: JSON.stringify(attPayload)
              });
            } catch (e) {
              console.error("Failed to create attachment:", e);
            }
          }
        }

        // Process Config persistence
        let existingSteps = [];
        try {
          existingSteps = await fetch(`${API_BASE}/process-config/draft-task/${taskId}`, { headers: authHeaders() })
            .then(res => res.ok ? res.json() : []);
        } catch (e) {
          console.error("Failed to load existing process configs:", e);
        }

        for (const step of existingSteps) {
          const pcId = step.pcId || step.pc_id;
          if (pcId) {
            try {
              await fetch(`${API_BASE}/process-config/${pcId}`, {
                method: "DELETE", headers: authHeaders()
              });
            } catch (e) {
              console.error("Failed to delete process step:", pcId, e);
            }
          }
        }

        if (task.process?.enabled) {
          if (task.process.reviewer_id) {
            const reviewerPayload = {
              ordrId: 1,
              stepType: "REVIEWER",
              empId: parseInt(task.process.reviewer_id),
              stepLabel: "Reviewer"
            };
            try {
              await fetch(`${API_BASE}/process-config/draft-task/${taskId}`, {
                method: "POST", headers: authHeaders(), body: JSON.stringify(reviewerPayload)
              });
            } catch (e) {
              console.error("Failed to create reviewer step:", e);
            }
          }
          if (task.process.approver_id) {
            const approverPayload = {
              ordrId: 2,
              stepType: "APPROVER",
              empId: parseInt(task.process.approver_id),
              stepLabel: "Approver"
            };
            try {
              await fetch(`${API_BASE}/process-config/draft-task/${taskId}`, {
                method: "POST", headers: authHeaders(), body: JSON.stringify(approverPayload)
              });
            } catch (e) {
              console.error("Failed to create approver step:", e);
            }
          }
        }
      }

      const successMsg = isEditing
        ? "You have updated milestone and task"
        : (status === "DRAFT" ? "Milestone saved as draft!" : "You have created milestone and task");

      // Refresh draft list and immediately return to list view
      try {
        await loadAllData();
      } catch (e) {
        console.error("Failed to refresh list after update:", e);
      }
      setIsSubmitting(false);
      triggerAlert("success", "Success", successMsg, () => {
        setView("list");
        resetMilestoneForm();
      });
    } catch (err) {
      console.error("Submit error:", err);
      setIsSubmitting(false);
      triggerAlert("error", "Submission Failed", err.message || "Failed to save milestone.");
    }
  };

  // ── Load Milestone for View ──────────────────────────────────
  const loadMilestoneForView = async (m) => {
    setView("view");
    setLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    setMilestone({
      drft_m_id: m.id,
      drft_prj_id: m.projectId || "",
      mlstm_cd: m.code || "",
      mlstm_ttl: m.title || "",
      mlstm_desc: m.original?.mlstnDesc || m.original?.mlstm_desc || "",
      mlstm_days: m.duration || "",
      mlstm_dep_flg: m.original?.mlstnDepFlg || m.original?.mlstm_dep_flg || false,
      mlstm_dep_typ: m.original?.mlstnDepTyp || m.original?.mlstm_dep_typ || "INDEPENDENT",
      mlstm_dep_m_id: m.original?.mlstnDepMId || m.original?.mlstm_dep_m_id || "",
      tent_st_dt: m.startDate || "",
      tent_end_dt: m.endDate || "",
      chk_id: m.original?.chkId || m.original?.chk_id || null,
      file_url: m.original?.fileUrl || m.original?.file_url || "",
      addl_rem: m.original?.addlRem || m.original?.addl_rem || "",
      mlstm_sts: m.status || (m.type === 'live' ? "LIVE" : "DRAFT"),
      sts: true
    });
    setTasks([]);

    try {
      if (m.type === 'live') {
        let tasksData = [];
        try {
          tasksData = await liveTaskApi.getByMilestone(m.id);
        } catch (_) { }
        const sortedTasksData = [...(tasksData || [])].sort((a, b) => {
          const idA = a.taskId || a.task_id || 0;
          const idB = b.taskId || b.task_id || 0;
          return idA - idB;
        });
        const mappedTasks = await Promise.all(sortedTasksData.map(async (t) => {
          let depTaskCd = "";
          const taskId = t.taskId || t.task_id;
          if (t.depTaskId) {
            const depTask = sortedTasksData.find(dt => dt.taskId === t.depTaskId);
            if (depTask) depTaskCd = depTask.taskCd;
          }
          let checklist = [];
          try {
            checklist = await fetch(`${API_BASE}/checklists/live-task/${taskId}`, { headers: authHeaders() })
              .then(res => res.ok ? res.json() : []);
          } catch (e) {
            console.error("Failed to fetch checklist for live task:", taskId, e);
          }
          let attachments = [];
          try {
            attachments = await fetch(`${API_BASE}/attachments/live-task/${taskId}`, { headers: authHeaders() })
              .then(res => res.ok ? res.json() : []);
          } catch (e) {
            console.error("Failed to fetch attachments for live task:", taskId, e);
          }
          let processSteps = [];
          try {
            processSteps = await fetch(`${API_BASE}/process-config/live-task/${taskId}`, { headers: authHeaders() })
              .then(res => res.ok ? res.json() : []);
          } catch (e) {
            console.error("Failed to fetch process config for live task:", taskId, e);
          }
          let process = { enabled: false, reviewer_id: "", approver_id: "", steps: [] };
          const prcsEnabled = t.prcsFlg || t.prcs_flg || false;
          if (prcsEnabled) {
            const reviewerStep = processSteps.find(s => s.stepType === "REVIEWER");
            const approverStep = processSteps.find(s => s.stepType === "APPROVER");
            process = {
              enabled: true,
              reviewer_id: reviewerStep ? (reviewerStep.empId || reviewerStep.emp_id || "") : "",
              approver_id: approverStep ? (approverStep.empId || approverStep.emp_id || "") : "",
              steps: processSteps
            };
          }
          return {
            drft_task_id: taskId,
            drft_m_id: t.mid || t.mId || t.m_id,
            task_cd: t.taskCd || t.task_cd || "",
            task_nm: t.taskNm || t.task_nm || "",
            task_desc: t.taskDesc || t.task_desc || "",
            task_typ: t.taskAsgnTo || t.task_asgn_to || "INTERNAL",
            emp_id: t.empId || t.emp_id || "",
            ext_emp_id: t.extEmpId || t.ext_emp_id || "",
            task_dep_flg: t.taskDepFlg || t.task_dep_flg || false,
            task_dep_typ: t.taskDepTyp || t.task_dep_typ || "INDEPENDENT",
            dep_task_id: depTaskCd || t.depTaskId || t.dep_task_id || "",
            no_of_days: t.noOfDays || t.no_of_days || "",
            chk_flg: t.chkFlg || t.chk_flg || false,
            chk_id: t.chkId || t.chk_id || null,
            file_path: t.filePath || t.file_path || "",
            note_txt: t.noteTxt || t.note_txt || "",
            tent_st_dt: t.stDt || t.st_dt || "",
            tent_end_dt: t.endDt || t.end_dt || "",
            prcs_flg: t.prcsFlg || t.prcs_flg || false,
            prcs_yes_actn: t.prcsYesActn || t.prcs_yes_actn || "",
            task_sts: t.taskSts || "LIVE",
            addl_rem: t.addlRem || t.addl_rem || "",
            sts: t.sts !== undefined ? t.sts : true,
            checklist: checklist.map(c => ({
              chk_id: c.chkId || c.chk_id,
              task_id: c.taskId || c.task_id,
              chk_cd: c.chkCd || c.chk_cd,
              chk_nm: c.chkNm || c.chk_nm,
              chk_desc: c.chkDesc || c.chk_desc,
              chk_sts: c.chkSts || c.chk_sts,
              seq_no: c.seqNo || c.seq_no,
              completed_t: c.completedTs || c.completed_ts || null,
              sts: c.sts
            })),
            attachments: attachments.map(a => ({
              file_id: a.fileId || a.file_id,
              t_id: a.tId || a.t_id,
              at_path: a.atPath || a.at_path,
              file_nm: a.fileNm || a.file_nm,
              at_type: a.atType || a.at_type,
              date_timestamp: a.dateTimestamp || a.date_timestamp
            })),
            process: process
          };
        }));
        setTasks(mappedTasks);
      } else {
        const milestoneData = await milestoneApi.getById(m.id);
        setMilestone({
          drft_m_id: milestoneData.drftMId || milestoneData.drft_m_id,
          drft_prj_id: milestoneData.drftPrjId || milestoneData.drft_prj_id || "",
          mlstm_cd: milestoneData.mlstnCd || milestoneData.mlstm_cd || "",
          mlstm_ttl: milestoneData.mlstnTtl || milestoneData.mlstm_ttl || "",
          mlstm_desc: milestoneData.mlstnDesc || milestoneData.mlstm_desc || "",
          mlstm_days: milestoneData.mlstnDays || milestoneData.mlstm_days || "",
          mlstm_dep_flg: milestoneData.mlstnDepFlg || milestoneData.mlstm_dep_flg || false,
          mlstm_dep_typ: milestoneData.mlstnDepTyp || milestoneData.mlstnDep_typ || "INDEPENDENT",
          mlstm_dep_m_id: milestoneData.mlstnDepMId || milestoneData.mlstm_dep_m_id || "",
          tent_st_dt: milestoneData.tentStDt || milestoneData.tent_st_dt || "",
          tent_end_dt: milestoneData.tentEndDt || milestoneData.tent_end_dt || "",
          chk_id: milestoneData.chkId || milestoneData.chk_id || null,
          file_url: milestoneData.fileUrl || milestoneData.file_url || "",
          addl_rem: milestoneData.addlRem || milestoneData.addl_rem || "",
          mlstm_sts: milestoneData.mlstnSts || milestoneData.mlstm_sts || "DRAFT",
          sts: milestoneData.sts !== undefined ? milestoneData.sts : true
        });
        const tasksData = await taskApi.getByMilestone(m.id);
        const sortedTasksData = [...(tasksData || [])].sort((a, b) => {
          const idA = a.drftTaskId || a.drft_task_id || 0;
          const idB = b.drftTaskId || b.drft_task_id || 0;
          return idA - idB;
        });
        const mappedTasks = await Promise.all(sortedTasksData.map(async (t) => {
          let depTaskCd = "";
          const taskId = t.drftTaskId || t.drft_task_id;
          if (t.depTaskId) {
            const depTask = sortedTasksData.find(dt => dt.drftTaskId === t.depTaskId);
            if (depTask) depTaskCd = depTask.taskCd;
          } else if (t.dep_task_id) {
            const depTask = sortedTasksData.find(dt => dt.drft_task_id === t.dep_task_id);
            if (depTask) depTaskCd = depTask.task_cd;
          }
          let checklist = [];
          try {
            checklist = await fetch(`${API_BASE}/checklists/draft-task/${taskId}`, { headers: authHeaders() })
              .then(res => res.ok ? res.json() : []);
          } catch (e) {
            console.error("Failed to fetch checklist for task:", taskId, e);
          }
          let attachments = [];
          try {
            attachments = await fetch(`${API_BASE}/attachments/draft-task/${taskId}`, { headers: authHeaders() })
              .then(res => res.ok ? res.json() : []);
          } catch (e) {
            console.error("Failed to fetch attachments for task:", taskId, e);
          }
          let processSteps = [];
          try {
            processSteps = await fetch(`${API_BASE}/process-config/draft-task/${taskId}`, { headers: authHeaders() })
              .then(res => res.ok ? res.json() : []);
          } catch (e) {
            console.error("Failed to fetch process config for task:", taskId, e);
          }
          let process = { enabled: false, reviewer_id: "", approver_id: "", steps: [] };
          const prcsEnabled = t.prcsFlg || t.prcs_flg || false;
          if (prcsEnabled) {
            const reviewerStep = processSteps.find(s => s.stepType === "REVIEWER");
            const approverStep = processSteps.find(s => s.stepType === "APPROVER");
            process = {
              enabled: true,
              reviewer_id: reviewerStep ? (reviewerStep.empId || reviewerStep.emp_id || "") : "",
              approver_id: approverStep ? (approverStep.empId || approverStep.emp_id || "") : "",
              steps: processSteps
            };
          }
          return {
            drft_task_id: taskId,
            drft_m_id: t.drftMId || t.drft_m_id,
            task_cd: t.taskCd || t.task_cd || "",
            task_nm: t.taskNm || t.task_nm || "",
            task_desc: t.taskDesc || t.task_desc || "",
            task_typ: t.taskTyp || t.task_typ || "INTERNAL",
            emp_id: t.empId || t.emp_id || "",
            ext_emp_id: t.extEmpId || t.ext_emp_id || "",
            task_dep_flg: t.taskDepFlg || t.task_dep_flg || false,
            task_dep_typ: t.taskDepTyp || t.task_dep_typ || "INDEPENDENT",
            dep_task_id: depTaskCd || t.depTaskId || t.dep_task_id || "",
            no_of_days: t.noOfDays || t.no_of_days || "",
            chk_flg: t.chkFlg || t.chk_flg || false,
            chk_id: t.chkId || t.chk_id || null,
            file_path: t.filePath || t.file_path || "",
            note_txt: t.noteTxt || t.note_txt || "",
            tent_st_dt: t.tentStDt || t.tent_st_dt || "",
            tent_end_dt: t.tentEndDt || t.tent_end_dt || "",
            prcs_flg: t.prcsFlg || t.prcs_flg || false,
            prcs_yes_actn: t.prcsYesActn || t.prcs_yes_actn || "",
            task_sts: t.taskSts || t.task_sts || "DRAFT",
            addl_rem: t.addlRem || t.addl_rem || "",
            sts: t.sts !== undefined ? t.sts : true,
            checklist: checklist.map(c => ({
              chk_id: c.chkId || c.chk_id,
              task_id: c.taskId || c.task_id,
              chk_cd: c.chkCd || c.chk_cd,
              chk_nm: c.chkNm || c.chk_nm,
              chk_desc: c.chkDesc || c.chk_desc,
              chk_sts: c.chkSts || c.chk_sts,
              seq_no: c.seqNo || c.seq_no,
              completed_t: c.completedTs || c.completed_ts || null,
              sts: c.sts
            })),
            attachments: attachments.map(a => ({
              file_id: a.fileId || a.file_id,
              t_id: a.tId || a.t_id,
              at_path: a.atPath || a.at_path,
              file_nm: a.fileNm || a.file_nm,
              at_type: a.atType || a.at_type,
              date_timestamp: a.dateTimestamp || a.date_timestamp
            })),
            process: process
          };
        }));
        setTasks(mappedTasks);
      }
    } catch (err) {
      console.error("Error loading milestone for view:", err);
      triggerAlert("error", "Load Error", "Failed to load milestone details.");
    } finally {
      setLoading(false);
    }
  };

  // ── Load Milestone for Edit ──────────────────────────────────
  const loadMilestoneForEdit = async (m) => {
    if (m.type === 'live') {
      triggerAlert("info", "Read-only", "Live milestones cannot be edited.");
      return;
    }
    // Switch to edit mode and open milestone creation form immediately
    setIsEditing(true);
    setEditingId(m.id);
    setView("form");
    setCurrentStep(1);
    setCompletedSteps(new Set());
    setLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Immediate initial population from existing record
    setMilestone({
      drft_m_id: m.drftMId || m.drft_m_id || m.id,
      drft_prj_id: m.drftPrjId || m.drft_prj_id || m.projectId || "",
      mlstm_cd: m.mlstnCd || m.mlstm_cd || m.code || "",
      mlstm_ttl: m.mlstnTtl || m.mlstm_ttl || m.title || "",
      mlstm_desc: m.mlstnDesc || m.mlstm_desc || "",
      mlstm_days: m.mlstnDays || m.mlstm_days || m.duration || "",
      mlstm_dep_flg: m.mlstnDepFlg || m.mlstm_dep_flg || false,
      mlstm_dep_typ: m.mlstnDepTyp || m.mlstm_dep_typ || "INDEPENDENT",
      mlstm_dep_m_id: m.mlstnDepMId || m.mlstm_dep_m_id || "",
      tent_st_dt: m.tentStDt || m.tent_st_dt || m.startDate || "",
      tent_end_dt: m.tentEndDt || m.tent_end_dt || m.endDate || "",
      chk_id: m.chkId || m.chk_id || null,
      file_url: m.fileUrl || m.file_url || "",
      addl_rem: m.addlRem || m.addl_rem || "",
      mlstm_sts: m.mlstnSts || m.mlstm_sts || m.status || "DRAFT",
      sts: m.sts !== undefined ? m.sts : true
    });

    try {
      const milestoneData = await milestoneApi.getById(m.id);
      if (milestoneData) {
        setMilestone({
          drft_m_id: milestoneData.drftMId || milestoneData.drft_m_id || m.id,
          drft_prj_id: milestoneData.drftPrjId || milestoneData.drft_prj_id || m.projectId || "",
          mlstm_cd: milestoneData.mlstnCd || milestoneData.mlstm_cd || m.code || "",
          mlstm_ttl: milestoneData.mlstnTtl || milestoneData.mlstm_ttl || m.title || "",
          mlstm_desc: milestoneData.mlstnDesc || milestoneData.mlstm_desc || "",
          mlstm_days: milestoneData.mlstnDays || milestoneData.mlstm_days || m.duration || "",
          mlstm_dep_flg: milestoneData.mlstnDepFlg || milestoneData.mlstm_dep_flg || false,
          mlstm_dep_typ: milestoneData.mlstnDepTyp || milestoneData.mlstm_dep_typ || "INDEPENDENT",
          mlstm_dep_m_id: milestoneData.mlstnDepMId || milestoneData.mlstm_dep_m_id || "",
          tent_st_dt: milestoneData.tentStDt || milestoneData.tent_st_dt || m.startDate || "",
          tent_end_dt: milestoneData.tentEndDt || milestoneData.tent_end_dt || m.endDate || "",
          chk_id: milestoneData.chkId || milestoneData.chk_id || null,
          file_url: milestoneData.fileUrl || milestoneData.file_url || "",
          addl_rem: milestoneData.addlRem || milestoneData.addl_rem || "",
          mlstm_sts: milestoneData.mlstnSts || milestoneData.mlstm_sts || m.status || "DRAFT",
          sts: milestoneData.sts !== undefined ? milestoneData.sts : true
        });
      }

      const tasksData = await taskApi.getByMilestone(m.id);
      const sortedTasksData = [...(tasksData || [])].sort((a, b) => {
        const idA = a.drftTaskId || a.drft_task_id || 0;
        const idB = b.drftTaskId || b.drft_task_id || 0;
        return idA - idB;
      });
      const mappedTasks = await Promise.all(sortedTasksData.map(async (t) => {
        let depTaskCd = "";
        const taskId = t.drftTaskId || t.drft_task_id;

        if (t.depTaskId) {
          const depTask = sortedTasksData.find(dt => dt.drftTaskId === t.depTaskId);
          if (depTask) {
            depTaskCd = depTask.taskCd;
          }
        } else if (t.dep_task_id) {
          const depTask = sortedTasksData.find(dt => dt.drft_task_id === t.dep_task_id);
          if (depTask) {
            depTaskCd = depTask.task_cd;
          }
        }

        let checklist = [];
        try {
          checklist = await fetch(`${API_BASE}/checklists/draft-task/${taskId}`, { headers: authHeaders() })
            .then(res => res.ok ? res.json() : []);
        } catch (e) {
          console.error("Failed to fetch checklist for task:", taskId, e);
        }

        let attachments = [];
        try {
          attachments = await fetch(`${API_BASE}/attachments/draft-task/${taskId}`, { headers: authHeaders() })
            .then(res => res.ok ? res.json() : []);
        } catch (e) {
          console.error("Failed to fetch attachments for task:", taskId, e);
        }

        let processSteps = [];
        try {
          processSteps = await fetch(`${API_BASE}/process-config/draft-task/${taskId}`, { headers: authHeaders() })
            .then(res => res.ok ? res.json() : []);
        } catch (e) {
          console.error("Failed to fetch process config for task:", taskId, e);
        }

        let process = { enabled: false, reviewer_id: "", approver_id: "", steps: [] };
        const prcsEnabled = t.prcsFlg || t.prcs_flg || false;
        if (prcsEnabled) {
          const reviewerStep = processSteps.find(s => s.stepType === "REVIEWER");
          const approverStep = processSteps.find(s => s.stepType === "APPROVER");
          process = {
            enabled: true,
            reviewer_id: reviewerStep ? (reviewerStep.empId || reviewerStep.emp_id || "") : "",
            approver_id: approverStep ? (approverStep.empId || approverStep.emp_id || "") : "",
            steps: processSteps
          };
        }

        return {
          drft_task_id: taskId,
          drft_m_id: t.drftMId || t.drft_m_id,
          task_cd: t.taskCd || t.task_cd || "",
          task_nm: t.taskNm || t.task_nm || "",
          task_desc: t.taskDesc || t.task_desc || "",
          task_typ: t.taskTyp || t.task_typ || "INTERNAL",
          emp_id: t.empId || t.emp_id || "",
          ext_emp_id: t.extEmpId || t.ext_emp_id || "",
          task_dep_flg: t.taskDepFlg || t.task_dep_flg || false,
          task_dep_typ: t.taskDepTyp || t.task_dep_typ || "INDEPENDENT",
          dep_task_id: depTaskCd || t.depTaskId || t.dep_task_id || "",
          no_of_days: t.noOfDays || t.no_of_days || "",
          chk_flg: t.chkFlg || t.chk_flg || false,
          chk_id: t.chkId || t.chk_id || null,
          file_path: t.filePath || t.file_path || "",
          note_txt: t.noteTxt || t.note_txt || "",
          tent_st_dt: t.tentStDt || t.tent_st_dt || "",
          tent_end_dt: t.tentEndDt || t.tent_end_dt || "",
          prcs_flg: t.prcsFlg || t.prcs_flg || false,
          prcs_yes_actn: t.prcsYesActn || t.prcs_yes_actn || "",
          task_sts: t.taskSts || t.task_sts || "DRAFT",
          addl_rem: t.addlRem || t.addl_rem || "",
          sts: t.sts !== undefined ? t.sts : true,
          checklist: checklist.map(c => ({
            chk_id: c.chkId || c.chk_id,
            task_id: c.taskId || c.task_id,
            chk_cd: c.chkCd || c.chk_cd,
            chk_nm: c.chkNm || c.chk_nm,
            chk_desc: c.chkDesc || c.chk_desc,
            chk_sts: c.chkSts || c.chk_sts,
            seq_no: c.seqNo || c.seq_no,
            completed_t: c.completedTs || c.completed_ts || null,
            sts: c.sts
          })),
          attachments: attachments.map(a => ({
            file_id: a.fileId || a.file_id,
            t_id: a.tId || a.t_id,
            at_path: a.atPath || a.at_path,
            file_nm: a.fileNm || a.file_nm,
            at_type: a.atType || a.at_type,
            date_timestamp: a.dateTimestamp || a.date_timestamp
          })),
          process: process
        };
      }));
      setTasks(mappedTasks);
    } catch (err) {
      console.error("Error loading milestone:", err);
      triggerAlert("error", "Load Error", "Failed to load milestone details.");
    } finally {
      setLoading(false);
    }
  };

  // ── External Employee Modal ──────────────────────────────────
  const resetExternalEmployeeForm = () => {
    setExternalEmployeeForm({
      ext_emp_cd: "", ext_emp_nm: "", email: "", mob_num: "", company_nm: "",
      photo_path: "", rep_emp_id: "", sts: true
    });
    setExternalEmployeeErrors({});
    setPhotoPreview(null);
    if (externalPhotoInputRef.current) externalPhotoInputRef.current.value = "";
  };
  const handleExternalEmployeeChange = (field, value) => {
    setExternalEmployeeForm(prev => ({ ...prev, [field]: value }));
    if (externalEmployeeErrors[field]) setExternalEmployeeErrors(prev => ({ ...prev, [field]: "" }));
  };
  const handleExternalPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        const response = await fetch(`${API_BASE}/storage/upload/external-employee-photo`, {
          method: "POST",
          headers: { Authorization: authHeaders().Authorization },
          body: formDataUpload
        });
        if (!response.ok) throw new Error("Photo upload failed");
        const data = await response.json();
        setPhotoPreview(data.url);
        setExternalEmployeeForm(prev => ({ ...prev, photo_path: data.url }));
      } catch (err) {
        console.error("External employee photo upload error:", err);
      }
    }
  };
  const validateExternalEmployee = () => {
    const errors = {};
    if (!externalEmployeeForm.ext_emp_nm.trim()) errors.ext_emp_nm = "Name is required";
    if (!externalEmployeeForm.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(externalEmployeeForm.email)) errors.email = "Invalid email format";
    if (!externalEmployeeForm.mob_num.trim()) errors.mob_num = "Mobile number is required";
    else if (!/^[6-9]/.test(externalEmployeeForm.mob_num)) errors.mob_num = "Mobile number must start with 6, 7, 8, or 9";
    else if (!/^[6-9][0-9]{9}$/.test(externalEmployeeForm.mob_num)) errors.mob_num = "Mobile number must be exactly 10 digits";
    if (!externalEmployeeForm.company_nm.trim()) errors.company_nm = "Company name is required";
    if (!externalEmployeeForm.rep_emp_id) errors.rep_emp_id = "Reporting employee is required";
    if (!externalEmployeeForm.ext_emp_cd.trim()) externalEmployeeForm.ext_emp_cd = generateExternalEmployeeCode();
    setExternalEmployeeErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const saveExternalEmployee = async () => {
    if (!validateExternalEmployee()) return;
    setIsSubmittingExternal(true);
    try {
      const savedEmp = await externalEmployeeApi.create(externalEmployeeForm);
      setExternalEmployees(prev => [...prev, savedEmp]);
      setShowExternalEmployeeModal(false);
      resetExternalEmployeeForm();
      triggerAlert("success", "Success", "External employee added!");
    } catch (err) {
      console.error("Error saving external employee:", err);
      triggerAlert("error", "Error", err.message || "Failed to add external employee.");
    } finally {
      setIsSubmittingExternal(false);
    }
  };

  // ── Render Gantt Chart ───────────────────────────────────────
  const renderGanttChart = () => {
    if (tasks.length === 0 || !milestone.tent_st_dt || !milestone.tent_end_dt) {
      return (
        <div className="mc-gantt-empty">
          <GanttChartSquare size={48} />
          <p>{tasks.length === 0 ? "No tasks to display" : "Please set milestone dates first"}</p>
        </div>
      );
    }
    const startDate = parseLocalDate(milestone.tent_st_dt);
    const endDate = parseLocalDate(milestone.tent_end_dt);
    const totalDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const dates = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    const bars = tasks.map((task, index) => {
      const taskStart = task.tent_st_dt ? parseLocalDate(task.tent_st_dt) : startDate;
      const taskEnd = task.tent_end_dt ? parseLocalDate(task.tent_end_dt) : endDate;
      const startOffset = Math.round((taskStart - startDate) / (1000 * 60 * 60 * 24));
      const duration = Math.round((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1;
      return { ...task, startOffset: Math.max(0, startOffset), duration: Math.max(1, duration), color: taskColors[index % taskColors.length] };
    });
    const monthLabels = [];
    let currentMonth = "", monthDays = 0;
    dates.forEach((date) => {
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (monthYear !== currentMonth) {
        if (currentMonth) monthLabels.push({ label: currentMonth, days: monthDays });
        currentMonth = monthYear;
        monthDays = 1;
      } else monthDays++;
    });
    if (currentMonth) monthLabels.push({ label: currentMonth, days: monthDays });

    return (
      <div className="mc-gantt-container">
        <div className="mc-gantt-header">
          <div className="mc-gantt-title"><GanttChartSquare size={18} /> <span>Milestone Timeline: {milestone.mlstm_ttl}</span></div>
          <div className="mc-gantt-stats"><span className="mc-gantt-stat">Duration: {totalDays}d</span><span className="mc-gantt-stat">Tasks: {tasks.length}</span></div>
        </div>
        <div className="mc-gantt-body">
          <div className="mc-gantt-task-list">
            <div className="mc-gantt-task-header"><span>Task</span><span>Duration</span></div>
            {bars.map((bar, idx) => (
              <div key={idx} className="mc-gantt-task-row"><span className="mc-gantt-task-code">{bar.task_cd}</span><span className="mc-gantt-task-duration">{bar.no_of_days || bar.duration}d</span></div>
            ))}
          </div>
          <div className="mc-gantt-timeline">
            <div className="mc-gantt-month-labels">
              {monthLabels.map((month, idx) => (
                <div key={idx} className="mc-gantt-month-label" style={{ width: `${(month.days / totalDays) * 100}%` }}>{month.label}</div>
              ))}
            </div>
            <div className="mc-gantt-day-labels">
              {dates.map((date, idx) => (
                <div key={idx} className={`mc-gantt-day-label ${isWeekend(date, workingDaysPerWeek) ? 'weekend' : ''}`} style={{ width: `${(1 / totalDays) * 100}%` }}>
                  {date.getDate()}
                </div>
              ))}
            </div>
            <div className="mc-gantt-grid">
              {dates.map((date, idx) => (
                <div key={idx} className={`mc-gantt-grid-line ${isWeekend(date, workingDaysPerWeek) ? 'weekend' : ''}`} style={{ width: `${(1 / totalDays) * 100}%` }} />
              ))}
            </div>
            <div className="mc-gantt-bars">
              {bars.map((bar, idx) => (
                <div key={idx} className="mc-gantt-bar-row">
                  <div className="mc-gantt-bar" style={{ left: `${(bar.startOffset / totalDays) * 100}%`, width: `${(bar.duration / totalDays) * 100}%`, backgroundColor: bar.color, minWidth: '6px' }} title={`${bar.task_cd}: ${bar.task_nm || bar.task_cd} (${bar.no_of_days || bar.duration}d)`}>
                    <span className="mc-gantt-bar-label">{bar.task_cd} {bar.no_of_days || bar.duration}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render Task Form ─────────────────────────────────────────
  const renderTaskForm = () => {
    if (!selectedTask) return null;
    const getTaskError = (index, field) => formErrors[`task_${index}_${field}`];
    const getAssigneeName = () => {
      if (!selectedTask) return "Not assigned";
      if (selectedTask.task_typ === "INTERNAL") {
        const emp = employees.find(e => e.emp_id === parseInt(selectedTask.emp_id));
        return emp ? emp.emp_nm : "Not assigned";
      } else {
        const emp = externalEmployees.find(e => e.ext_emp_id === parseInt(selectedTask.ext_emp_id));
        return emp ? (emp.ext_emp_nm || emp.name) : "Not assigned";
      }
    };
    const assigneeName = getAssigneeName();

    return (
      <div className="mc-task-form">
        <div className="mc-form-grid two">
          <label className="mc-field">
            <span>Task Code <b>*</b></span>
            <input
              value={selectedTask.task_cd || ""}
              onChange={(e) => updateTask("task_cd", e.target.value)}
              placeholder="Enter task code"
              className={`mc-code-input ${getTaskError(editingTaskIndex, "task_cd") ? "mc-error" : ""}`}
            />
            {getTaskError(editingTaskIndex, "task_cd") && <small className="mc-error-text">{getTaskError(editingTaskIndex, "task_cd")}</small>}
          </label>
          <label className="mc-field"><span>Task Name <b>*</b></span>
            <input value={selectedTask.task_nm || ""} onChange={(e) => updateTask("task_nm", e.target.value)} placeholder="Enter task name" className={getTaskError(editingTaskIndex, "task_nm") ? "mc-error" : ""} />
            {getTaskError(editingTaskIndex, "task_nm") && <small className="mc-error-text">{getTaskError(editingTaskIndex, "task_nm")}</small>}
          </label>
        </div>
        <label className="mc-field"><span>Task Description</span>
          <textarea value={selectedTask.task_desc || ""} onChange={(e) => updateTask("task_desc", e.target.value)} placeholder="Enter task description" rows={1} />
        </label>
        <div className="mc-radio-row">
          <strong>Task Type <b>*</b></strong>
          {taskTypes.map(type => (
            <label key={type.value}><input type="radio" name={`taskType_${type.value}`} tabIndex={0} checked={selectedTask.task_typ === type.value} onChange={() => { setShowExternalEmployeeModal(false); updateTask("task_typ", type.value); if (type.value === "INTERNAL") updateTask("ext_emp_id", ""); else updateTask("emp_id", ""); }} /> {type.label}</label>
          ))}
        </div>
        <div className="mc-field">
          <span>{selectedTask.task_typ === "INTERNAL" ? "Assign Employee" : "Assign External Employee"} <b>*</b></span>
          <div className="mc-employee-select" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SearchableSelect
              options={(selectedTask.task_typ === "INTERNAL" ? employees : externalEmployees).map(emp => {
                const id = selectedTask.task_typ === "INTERNAL" ? emp.emp_id : emp.ext_emp_id;
                const name = selectedTask.task_typ === "INTERNAL"
                  ? `${emp.emp_nm} (${emp.role})`
                  : `${emp.ext_emp_nm || emp.name} (${emp.company_nm || emp.company})`;
                return { value: id, label: name };
              })}
              value={selectedTask.task_typ === "INTERNAL" ? selectedTask.emp_id : selectedTask.ext_emp_id}
              onChange={(e) => {
                const v = e.target.value;
                setShowExternalEmployeeModal(false);
                if (selectedTask.task_typ === "INTERNAL") {
                  updateTask("emp_id", v);
                } else {
                  updateTask("ext_emp_id", v);
                }
                let process = selectedTask.process ? { ...selectedTask.process } : { enabled: false, reviewer_id: "", approver_id: "", steps: [] };
                if (selectedTask.task_typ === "INTERNAL") {
                  if (String(v) === String(process.reviewer_id)) process.reviewer_id = "";
                  if (String(v) === String(process.approver_id)) process.approver_id = "";
                }
                const updated = {
                  ...selectedTask,
                  [selectedTask.task_typ === "INTERNAL" ? "emp_id" : "ext_emp_id"]: v,
                  process
                };
                setSelectedTask(updated);
                if (editingTaskIndex !== null && editingTaskIndex >= 0) {
                  const ut = [...tasks];
                  ut[editingTaskIndex] = updated;
                  setTasks(ut);
                }
              }}
              placeholder={`Select ${selectedTask.task_typ === "INTERNAL" ? "Employee" : "External Employee"}...`}
              className={getTaskError(editingTaskIndex, selectedTask.task_typ === "INTERNAL" ? "assignee" : "ext_assignee") ? "mc-error" : ""}
            />
            {selectedTask.task_typ === "EXTERNAL" && (
              <button
                type="button"
                className="mc-add-employee-btn"
                onClick={(e) => { e.stopPropagation(); setShowExternalEmployeeModal(true); }}
                title="Add External Employee"
                style={{ flexShrink: 0 }}
              >
                <UserPlus size={14} />
              </button>
            )}
          </div>
          {getTaskError(editingTaskIndex, selectedTask.task_typ === "INTERNAL" ? "assignee" : "ext_assignee") && <small className="mc-error-text">{getTaskError(editingTaskIndex, selectedTask.task_typ === "INTERNAL" ? "assignee" : "ext_assignee")}</small>}
        </div>
        <div className="mc-form-grid three">
          <label className="mc-field"><span>Duration (Days) <b>*</b></span>
            <input type="number" value={selectedTask.no_of_days || ""} onChange={(e) => updateTask("no_of_days", e.target.value)} placeholder="Enter duration" min="1" className={getTaskError(editingTaskIndex, "duration") ? "mc-error" : ""} />
            {getTaskError(editingTaskIndex, "duration") && <small className="mc-error-text">{getTaskError(editingTaskIndex, "duration")}</small>}
          </label>
          <label className="mc-field"><span>Start Date</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <input
                type="text"
                value={formatDisplayDate(selectedTask.tent_st_dt)}
                placeholder="dd/mm/yyyy"
                readOnly
                onClick={() => {
                  const el = document.getElementById(`taskStartDatePicker_${editingTaskIndex}`);
                  if (el) {
                    if (typeof el.showPicker === "function") el.showPicker();
                    else el.click();
                  }
                }}
                style={{ cursor: 'pointer', paddingRight: '36px' }}
              />
              <Calendar
                size={16}
                onClick={() => {
                  const el = document.getElementById(`taskStartDatePicker_${editingTaskIndex}`);
                  if (el) {
                    if (typeof el.showPicker === "function") el.showPicker();
                    else el.click();
                  }
                }}
                style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: '#64748b' }}
              />
              <input
                id={`taskStartDatePicker_${editingTaskIndex}`}
                type="date"
                value={selectedTask.tent_st_dt || ""}
                min={isEditing ? undefined : (milestone.tent_st_dt || (projects.find(p => String(p.prj_id || p.id || p.drftPrjId || p.prjId) === String(milestone.drft_prj_id))?.startDate || projects.find(p => String(p.prj_id || p.id || p.drftPrjId || p.prjId) === String(milestone.drft_prj_id))?.stDt || projects.find(p => String(p.prj_id || p.id || p.drftPrjId || p.prjId) === String(milestone.drft_prj_id))?.tentStDt || undefined))}
                max={milestone.tent_end_dt || (projects.find(p => String(p.prj_id || p.id || p.drftPrjId || p.prjId) === String(milestone.drft_prj_id))?.endDate || projects.find(p => String(p.prj_id || p.id || p.drftPrjId || p.prjId) === String(milestone.drft_prj_id))?.endDt || projects.find(p => String(p.prj_id || p.id || p.drftPrjId || p.prjId) === String(milestone.drft_prj_id))?.tentEndDt || undefined)}
                onChange={(e) => updateTask("tent_st_dt", e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              />
            </div>
          </label>
          <label className="mc-field"><span>End Date</span><input type="text" value={formatDisplayDate(selectedTask.tent_end_dt)} placeholder="dd/mm/yyyy" readOnly className="mc-disabled" /><small className="mc-hint">Auto-calculated</small></label>
        </div>
        <div className="mc-auto-dates">
          <div className="mc-auto-date-item"><span className="mc-auto-date-label">Auto-calculated Start:</span><span className="mc-auto-date-value">{formatDisplayDate(selectedTask.tent_st_dt) || "dd/mm/yyyy"}</span></div>
          <div className="mc-auto-date-item"><span className="mc-auto-date-label">Auto-calculated End:</span><span className="mc-auto-date-value">{formatDisplayDate(selectedTask.tent_end_dt) || "dd/mm/yyyy"}</span></div>
        </div>
        {/* Task Dependency */}
        <div className="mc-task-dependency-section">
          <div className="mc-dependency-toggle">
            <label className="mc-field toggle-line"><span>Task Dependency Available</span>
              <span className="mc-switch"><input type="checkbox" tabIndex={0} checked={selectedTask.task_dep_flg} onChange={toggleTaskDependency} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTaskDependency(); } }} /><i /></span>
            </label>
          </div>
          {selectedTask.task_dep_flg && (
            <div className="mc-dependency-fields">
              <div className="mc-form-grid two">
                <label className="mc-field"><span>Dependent Task <b>*</b></span>
                  <select value={selectedTask.dep_task_id || ""} onChange={(e) => updateTask("dep_task_id", e.target.value)} className={getTaskError(editingTaskIndex, "dep_missing") ? "mc-error" : ""}>
                    <option value="">Select Dependent Task</option>
                    {tasks.filter(t => t.task_cd !== selectedTask.task_cd && t.task_nm).map(t => <option key={t.task_cd} value={t.task_cd}>{t.task_cd} - {t.task_nm}</option>)}
                  </select>
                  {getTaskError(editingTaskIndex, "dep_missing") && <small className="mc-error-text">{getTaskError(editingTaskIndex, "dep_missing")}</small>}
                </label>
                <label className="mc-field"><span>Dependency Type <b>*</b></span>
                  <select value={selectedTask.task_dep_typ || "SEQUENTIAL"} onChange={(e) => updateTask("task_dep_typ", e.target.value)}>
                    {dependencyTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="mc-dependency-scenario">
                <strong>How dates will be calculated:</strong>
                <ul>
                  <li><span className="mc-dep-badge independent">Independent</span> Task starts on milestone first day</li>
                  <li><span className="mc-dep-badge sequential">Sequential</span> Task starts after dependent task completes</li>
                  <li><span className="mc-dep-badge parallel">Parallel</span> Task starts same day as dependent task</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="mc-task-tabs">
          <button className={`mc-task-tab ${activeTaskTab === "checklist" ? "active" : ""}`} onClick={() => setActiveTaskTab("checklist")}><ClipboardList size={14} /> Checklist</button>
          <button className={`mc-task-tab ${activeTaskTab === "attachments" ? "active" : ""}`} onClick={() => setActiveTaskTab("attachments")}><Paperclip size={14} /> Attachments</button>
          <button className={`mc-task-tab ${activeTaskTab === "process" ? "active" : ""}`} onClick={() => setActiveTaskTab("process")}><Workflow size={14} /> Process</button>
        </div>
        <div className="mc-task-tab-content">
          {activeTaskTab === "checklist" && (
            <div className="mc-checklist-section">
              <div className="mc-section-header"><h4>Checklist</h4><button type="button" className="mc-small-add" onClick={addChecklistItem}><Plus size={13} /> Add Item</button></div>
              {(selectedTask.checklist || []).length === 0 ? <div className="mc-empty-checklist">No checklist items added.</div> :
                <div className="mc-table-wrap">
                  <table className="mc-mini-table checklist-table">
                    <thead><tr><th style={{ width: '40px' }}>S.No</th><th style={{ width: '90px' }}>Code</th><th>Name</th><th style={{ width: '50px' }}>Actions</th></tr></thead>
                    <tbody>
                      {(selectedTask.checklist || []).map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><span className="mc-code-badge">{item.chk_cd}</span></td>
                          <td><input className="mc-checklist-name-input" value={item.chk_nm || ""} onChange={(e) => updateChecklistItem(idx, "chk_nm", e.target.value)} placeholder="Enter checklist item name" /></td>
                          <td><button className="mc-icon-btn danger" onClick={() => removeChecklistItem(idx)}><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            </div>
          )}
          {activeTaskTab === "attachments" && (
            <div className="mc-attachment-section">
              <div className="mc-section-header"><h4>Attachments</h4>
                <div className="mc-file-upload-small">
                  <input type="file" ref={fileInputRef} onChange={handleTaskFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
                  {uploading ? (
                    <div className="mc-upload-progress-container">
                      <svg className="mc-progress-circle" viewBox="0 0 36 36">
                        <path
                          className="mc-progress-circle-bg"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="mc-progress-circle-fill"
                          strokeDasharray={`${uploadProgress}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="mc-upload-progress-text">{uploadProgress}%</span>
                    </div>
                  ) : (
                    <button type="button" className="mc-small-add" onClick={() => fileInputRef.current?.click()}><Upload size={13} /> Upload File</button>
                  )}
                </div>
              </div>
              {(selectedTask.attachments || []).length === 0 ? <div className="mc-empty-checklist">No attachments uploaded.</div> :
                <div className="mc-attachment-list">
                  {(selectedTask.attachments || []).map((att, idx) => (
                    <div key={idx} className="mc-attachment-item"><File size={14} /><span className="mc-attachment-name">{att.file_nm}</span><span className="mc-badge">{att.at_type}</span><button className="mc-icon-btn danger" onClick={() => removeTaskAttachment(idx)}><X size={14} /></button></div>
                  ))}
                </div>
              }
            </div>
          )}
          {activeTaskTab === "process" && (
            <div className="mc-process-section">
              <div className="mc-section-header"><h4>Process / Workflow</h4><label className="mc-switch"><input type="checkbox" checked={selectedTask.process?.enabled || false} onChange={toggleTaskProcess} /><i /></label></div>
              {selectedTask.process?.enabled && (
                <>
                  <div className="mc-process-info"><span className="mc-process-assignee"><strong>Task Executor:</strong> {assigneeName || "Not assigned yet"}</span></div>
                  <div className="mc-process-review-approver">
                    <div className="mc-form-grid two">
                      <label className="mc-field"><span>Reviewer <b>*</b></span>
                        <SearchableSelect
                          options={reviewersList
                            .filter(r => String(r.r_id) !== String(selectedTask.emp_id))
                            .map(r => ({ value: r.r_id, label: r.r_nm }))}
                          value={selectedTask.process?.reviewer_id || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            let process = { ...selectedTask.process, reviewer_id: v };
                            if (String(v) === String(process.approver_id)) {
                              process.approver_id = "";
                            }
                            const updated = { ...selectedTask, process };
                            setSelectedTask(updated);
                            if (editingTaskIndex !== null && editingTaskIndex >= 0) {
                              const ut = [...tasks];
                              ut[editingTaskIndex] = updated;
                              setTasks(ut);
                            }
                          }}
                          placeholder="Select Reviewer"
                          className={getTaskError(editingTaskIndex, "reviewer") ? "mc-error" : ""}
                        />
                        {getTaskError(editingTaskIndex, "reviewer") && <small className="mc-error-text">{getTaskError(editingTaskIndex, "reviewer")}</small>}
                      </label>
                      <label className="mc-field"><span>Approver <b>*</b></span>
                        <SearchableSelect
                          options={approversList
                            .filter(r => String(r.r_id) !== String(selectedTask.emp_id) && String(r.r_id) !== String(selectedTask.process?.reviewer_id || ""))
                            .map(r => ({ value: r.r_id, label: r.r_nm }))}
                          value={selectedTask.process?.approver_id || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            let process = { ...selectedTask.process, approver_id: v };
                            const updated = { ...selectedTask, process };
                            setSelectedTask(updated);
                            if (editingTaskIndex !== null && editingTaskIndex >= 0) {
                              const ut = [...tasks];
                              ut[editingTaskIndex] = updated;
                              setTasks(ut);
                            }
                          }}
                          placeholder="Select Approver"
                          className={getTaskError(editingTaskIndex, "approver") ? "mc-error" : ""}
                        />
                        {getTaskError(editingTaskIndex, "approver") && <small className="mc-error-text">{getTaskError(editingTaskIndex, "approver")}</small>}
                      </label>
                    </div>
                  </div>
                  <div className="mc-process-status-display"><span className="mc-process-enabled-badge"><CheckCircle size={14} /> Process Enabled</span><span className="mc-process-note"><small>Reviewer and Approver will be assigned to this task</small></span></div>
                  {/* ====== ADDED Rule====== */}
                  <div style={{ marginTop: '12px', padding: '12px', background: '#f0f9ff', borderLeft: '4px solid #3b82f6', borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <AlertCircle size={14} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.875rem', color: '#1e293b', lineHeight: '1.5' }}>
                      <strong>Note:</strong> Once the Executor completes the task, it is forwarded to the Reviewer. If no defects or errors are found, the task is forwarded to the Approver. If errors are found, it is reassigned back to the Executor. Similarly, if the Approver finds no defects, the task is marked as 'Completed'; otherwise, it is reassigned back to the Executor.
                    </div>
                  </div>
                  {/* ====== END Rule ====== */}
                </>
              )}
              {!selectedTask.process?.enabled && <div className="mc-process-disabled-msg"><span>Process workflow is disabled. Enable the toggle above to assign reviewer and approver.</span></div>}
            </div>
          )}
        </div>
        <div className="mc-form-actions">
          <button type="button" className="mc-btn primary" onClick={saveTaskChanges}><Save size={14} /> Save Task</button>
          <button type="button" className="mc-btn secondary" onClick={cancelEdit}><X size={14} /> Cancel</button>
        </div>
      </div>
    );
  };

  // ── Render Tasks Table ───────────────────────────────────────
  const renderTasksTable = () => {
    if (tasks.length === 0) return <div className="mc-empty-state"><p>No tasks added yet. Click "Add Task" to create one.</p><small>Tasks must be within milestone date range</small></div>;
    return (
      <div className="mc-table-wrap">
        <table className="mc-task-table">
          <thead><tr><th style={{ width: '40px' }}>S.No</th><th>Code</th><th>Task Name</th><th>Type</th><th>Executor</th><th>Duration</th><th>Start</th><th>End</th><th>Dependency</th><th>Checklist</th><th>Attachments</th><th>Process</th><th>Status</th><th style={{ width: '80px' }}>Actions</th></tr></thead>
          <tbody>
            {tasks.map((task, index) => {
              const isIncomplete = !task.task_nm || (task.task_typ === "INTERNAL" && !task.emp_id) || (task.task_typ === "EXTERNAL" && !task.ext_emp_id) || !task.no_of_days;
              let assigneeName = "Not Assigned";
              if (task.task_typ === "INTERNAL") { const emp = employees.find(e => e.emp_id === parseInt(task.emp_id)); assigneeName = emp ? emp.emp_nm : "Not Assigned"; }
              else { const emp = externalEmployees.find(e => e.ext_emp_id === parseInt(task.ext_emp_id)); assigneeName = emp ? (emp.ext_emp_nm || emp.name) : "Not Assigned"; }
              const assignedTo = [{ role: "Executor", name: assigneeName }];
              if (task.process?.enabled && task.process?.reviewer_id) {
                const rev = employees.find(e => String(e.emp_id) === String(task.process.reviewer_id));
                assignedTo.push({ role: "Reviewer", name: rev ? rev.emp_nm : "Not Selected" });
              }
              if (task.process?.enabled && task.process?.approver_id) {
                const app = employees.find(e => String(e.emp_id) === String(task.process.approver_id));
                assignedTo.push({ role: "Approver", name: app ? app.emp_nm : "Not Selected" });
              }
              const hasChecklist = task.checklist && task.checklist.length > 0;
              const hasAttachments = task.attachments && task.attachments.length > 0;
              const hasProcess = task.process?.enabled && task.process?.reviewer_id && task.process?.approver_id;
              return (
                <tr key={index} className={editingTaskIndex === index ? "mc-editing-row" : ""}>
                  <td>{index + 1}</td>
                  <td><span className="mc-code-badge">{task.task_cd}</span></td>
                  <td>{task.task_nm || "-"}</td>
                  <td>{task.task_typ || "-"}</td>
                  <td><div className="mc-assigned-to">{assignedTo.map((p, idx) => <span key={idx} className={`mc-assignee-tag ${p.role.toLowerCase()}`}>{p.name}<span className="mc-assignee-role">{p.role}</span></span>)}</div></td>
                  <td>{task.no_of_days || "-"}d</td>
                  <td>{formatDisplayDate(task.tent_st_dt) || "-"}</td>
                  <td>{formatDisplayDate(task.tent_end_dt) || "-"}</td>
                  <td>{task.task_dep_flg && task.dep_task_id ? <span className={`mc-dep-label ${task.task_dep_typ?.toLowerCase() || 'independent'}`}>{task.task_dep_typ} ({task.dep_task_id})</span> : "Independent"}</td>
                  <td>{hasChecklist ? <span className="mc-badge success">{task.checklist.length} items</span> : <span className="mc-badge">None</span>}</td>
                  <td>{hasAttachments ? <span className="mc-badge success">{task.attachments.length} files</span> : <span className="mc-badge">None</span>}</td>
                  <td>{hasProcess ? <span className="mc-badge success">Enabled</span> : <span className="mc-badge">Disabled</span>}</td>
                  <td><span className={`mc-status ${isIncomplete ? "incomplete" : "draft"}`}>{isIncomplete ? "Incomplete" : "DRAFT"}</span></td>
                  <td><div className="mc-actions"><button type="button" className="mc-icon-btn edit" onClick={() => editTask(index)} title="Edit Task"><Edit size={14} /></button><button type="button" className="mc-icon-btn danger" onClick={() => { setDeleteIndex(index); setShowModal(true); }} title="Delete Task"><Trash2 size={14} /></button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Step Progress ────────────────────────────────────────────
  const renderStepProgress = () => (
    <div className="mc-step-progress">
      {STEPS.map((step) => {
        const isActive = currentStep === step.id, isCompleted = isStepComplete(step.id);
        return (
          <div key={step.id} className="mc-step-item" onClick={() => goToStep(step.id)}>
            <div className={`mc-step-circle ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>{isCompleted ? <Check size={16} /> : <span>{step.id}</span>}</div>
            <div className="mc-step-line" />
            <div className="mc-step-label"><span className="mc-step-name">{step.name}</span><span className="mc-step-desc">{step.description}</span></div>
          </div>
        );
      })}
    </div>
  );

  // ── Step 2: Tasks ────────────────────────────────────────────
  const renderTasks = () => {
    const errors = stepValidation[2] || {};
    const milestoneEnd = milestone.tent_end_dt ? parseLocalDate(milestone.tent_end_dt) : null;
    const hasExceedingTasks = milestoneEnd && tasks.some(task => task?.tent_end_dt && parseLocalDate(task.tent_end_dt) > milestoneEnd);
    return (
      <div className="mc-step-content">
        <div className="mc-step-header"><h2><Users size={20} /> Tasks Management</h2><p>Add and manage tasks with checklist, attachments, process workflow & gantt chart</p>{milestone.tent_st_dt && milestone.tent_end_dt && <div className="mc-task-range-info"><CalendarDays size={14} /><span>Milestone Date Range: {formatDisplayDate(milestone.tent_st_dt)} to {formatDisplayDate(milestone.tent_end_dt)}</span></div>}</div>
        <div className="mc-tasks-section">
          <div className="mc-section-header"><h3><Plus size={18} /> Task Creation</h3><button type="button" onClick={addTask} className="mc-add-btn"><Plus size={15} /> Add New Task</button></div>
          {errors.tasks && <div className="mc-error-banner"><AlertCircle size={16} /><span>{errors.tasks}</span></div>}
          {!errors.tasks && hasExceedingTasks && <div className="mc-error-banner"><AlertCircle size={16} /><span>You are exceeding the milestone duration — you have to create the task within <strong>{milestone.mlstm_days} days</strong> only. Please update the task days or milestone duration.</span></div>}
          {!selectedTask ? <div className="mc-empty-state"><p>Click "Add New Task" to create a task or select an existing task from the table below to edit.</p></div> : renderTaskForm()}
        </div>
        <div className="mc-preview-table-section">
          <div className="mc-section-header"><h3><ListChecks size={18} /> Tasks Preview Table</h3></div>
          {renderTasksTable()}
        </div>
        <div className="mc-gantt-section"><div className="mc-section-header"><h3><GanttChartSquare size={18} /> Gantt Chart View</h3></div>{renderGanttChart()}</div>
      </div>
    );
  };

  // ── Step 1: Milestone Details ───────────────────────────────
  const renderMilestoneDetails = () => {
    const errors = stepValidation[1] || {}, today = getTodayDate();
    const selectedProjectObj = projects.find(p => String(p.prj_id || p.id || p.drftPrjId || p.prjId || p.drft_prj_id) === String(milestone.drft_prj_id || milestone.prj_id));
    const pStDtVal = selectedProjectObj ? (selectedProjectObj.startDate || selectedProjectObj.stDt || selectedProjectObj.tentStDt || selectedProjectObj.st_dt || selectedProjectObj.start_date) : "";
    const pEndDtVal = selectedProjectObj ? (selectedProjectObj.endDate || selectedProjectObj.endDt || selectedProjectObj.tentEndDt || selectedProjectObj.end_date || selectedProjectObj.end_dt) : "";
    return (
      <div className="mc-step-content">
        <div className="mc-step-header"><h2><Settings size={20} /> Milestone Details</h2><p>Fill in the basic information for this milestone</p></div>
        <div className="mc-form-section">
          <div className="mc-form-grid three">
            <label className="mc-field"><span>Project <b>*</b></span>
              <SearchableSelect
                options={projects.map(p => ({
                  value: p.prj_id,
                  label: `${p.prj_cd} - ${p.prj_nm}`
                }))}
                value={milestone.drft_prj_id}
                onChange={(e) => updateMilestone("drft_prj_id", e.target.value)}
                placeholder="Select Project"
                className={errors.drft_prj_id ? "mc-error" : ""}
              />
              {errors.drft_prj_id && <small className="mc-error-text">{errors.drft_prj_id}</small>}
            </label>
            <label className="mc-field"><span>Milestone Code <b>*</b></span>
              <div className="mc-input-with-icon"><input value={milestone.mlstm_cd} onChange={(e) => updateMilestone("mlstm_cd", e.target.value.toUpperCase())} placeholder="Enter milestone code (max 10 chars)" className={errors.mlstm_cd ? "mc-error" : ""} maxLength="10" /><span className="mc-char-counter">{milestone.mlstm_cd.length}/10</span></div>
              {errors.mlstm_cd && <small className="mc-error-text">{errors.mlstm_cd}</small>}
            </label>
            <label className="mc-field"><span>Milestone Title <b>*</b></span>
              <input value={milestone.mlstm_ttl} onChange={(e) => updateMilestone("mlstm_ttl", e.target.value)} placeholder="Enter milestone title" className={errors.mlstm_ttl ? "mc-error" : ""} />
              {errors.mlstm_ttl && <small className="mc-error-text">{errors.mlstm_ttl}</small>}
            </label>
            <label className="mc-field"><span>Duration (Days) <b>*</b></span>
              <input type="number" value={milestone.mlstm_days} onChange={(e) => updateMilestone("mlstm_days", e.target.value)} placeholder="Enter duration" min="1" className={errors.mlstm_days ? "mc-error" : ""} />
              {errors.mlstm_days && <div className="mc-error-banner" style={{ marginTop: '8px', padding: '10px 12px' }}><AlertCircle size={16} /><span>{errors.mlstm_days}</span></div>}
            </label>
            <label className="mc-field"><span>Tentative Start Date <b>*</b></span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input
                  type="text"
                  value={formatDisplayDate(milestone.tent_st_dt)}
                  placeholder="dd/mm/yyyy"
                  readOnly
                  onClick={() => {
                    const el = document.getElementById("milestoneStartDatePicker");
                    if (el) {
                      if (typeof el.showPicker === "function") el.showPicker();
                      else el.click();
                    }
                  }}
                  className={errors.tent_st_dt ? "mc-error" : ""}
                  style={{ cursor: 'pointer', paddingRight: '36px' }}
                />
                <Calendar
                  size={16}
                  onClick={() => {
                    const el = document.getElementById("milestoneStartDatePicker");
                    if (el) {
                      if (typeof el.showPicker === "function") el.showPicker();
                      else el.click();
                    }
                  }}
                  style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: '#64748b' }}
                />
                <input
                  id="milestoneStartDatePicker"
                  type="date"
                  value={milestone.tent_st_dt || ""}
                  min={isEditing ? undefined : (pStDtVal || undefined)}
                  max={pEndDtVal || undefined}
                  onChange={(e) => updateMilestone("tent_st_dt", e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                />
              </div>
              {errors.tent_st_dt && <small className="mc-error-text">{errors.tent_st_dt}</small>}
            </label>
            <label className="mc-field"><span>Tentative End Date <b>*</b></span>
              <input type="text" value={formatDisplayDate(milestone.tent_end_dt)} placeholder="dd/mm/yyyy" readOnly className="mc-disabled" />
              <small className="mc-hint">Auto-calculated</small>
            </label>
          </div>
          <div className="mc-form-grid" style={{ marginTop: '12px' }}>
            <label className="mc-field"><span>Description</span><textarea value={milestone.mlstm_desc || ""} onChange={(e) => updateMilestone("mlstm_desc", e.target.value)} placeholder="Enter milestone description" rows={2} /></label>
            <label className="mc-field"><span>Remarks</span><input value={milestone.addl_rem || ""} onChange={(e) => updateMilestone("addl_rem", e.target.value)} placeholder="Additional remarks" /></label>
          </div>
          <div className="mc-dependency-section">
            <h4><Link size={16} /> Milestone Dependency</h4>
            <div className="mc-dependency-grid">
              <div className="mc-dependency-row"><label className="mc-field toggle-field"><span>Dependency Available</span><span className="mc-switch"><input type="checkbox" tabIndex={0} checked={milestone.mlstm_dep_flg} onChange={() => updateMilestone("mlstm_dep_flg", !milestone.mlstm_dep_flg)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateMilestone("mlstm_dep_flg", !milestone.mlstm_dep_flg); } }} /><i /></span></label></div>
              {milestone.mlstm_dep_flg && (
                <>
                  <div className="mc-dependency-row"><label className="mc-field"><span>Dependent Milestone <b>*</b></span>
                    <SearchableSelect
                      options={projectMilestones
                        .filter(m => m.drftMId !== milestone.drft_m_id)
                        .map(m => ({
                          value: m.drftMId,
                          label: `${m.mlstnCd} - ${m.mlstnTtl}`
                        }))}
                      value={milestone.mlstm_dep_m_id || ""}
                      onChange={(e) => updateMilestone("mlstm_dep_m_id", e.target.value)}
                      placeholder="Select Milestone"
                      className={errors.mlstm_dep_m_id ? "mc-error" : ""}
                    />
                    {errors.mlstm_dep_m_id && <small className="mc-error-text">{errors.mlstm_dep_m_id}</small>}
                  </label></div>
                  <div className="mc-dependency-row"><label className="mc-field"><span>Dependency Type <b>*</b></span>
                    <select value={milestone.mlstm_dep_typ} onChange={(e) => updateMilestone("mlstm_dep_typ", e.target.value)}>
                      {dependencyTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </label></div>
                </>
              )}
            </div>
            {milestone.mlstm_dep_flg && (
              <div className="mc-dependency-scenario">
                <strong>How dates will be calculated:</strong>
                <ul>
                  <li><span className="mc-dep-badge independent">Independent</span> Milestone starts independently on its own scheduled date</li>
                  <li><span className="mc-dep-badge sequential">Sequential</span> Milestone starts after the dependent milestone completes</li>
                  <li><span className="mc-dep-badge parallel">Parallel</span> Milestone starts on the same day as the dependent milestone</li>
                </ul>
              </div>
            )}
            {milestone.mlstm_dep_flg && <p className="mc-dependency-note"><span className="mc-dot" /> This milestone will start after completion of <span className="mc-highlight">{milestone.mlstm_dep_m_id ? milestoneList.find(m => m.type === 'draft' && m.id === parseInt(milestone.mlstm_dep_m_id))?.code || "selected milestone" : "selected milestone"}</span></p>}
          </div>
        </div>
      </div>
    );
  };

  // ── External Employee Modal ──────────────────────────────────
  const renderExternalEmployeeModal = () => {
    if (!showExternalEmployeeModal) return null;
    const getError = (field) => externalEmployeeErrors[field];
    return (
      <div className="mc-modal-overlay" onClick={() => { setShowExternalEmployeeModal(false); resetExternalEmployeeForm(); }}>
        <div className="mc-modal mc-modal-large" onClick={(e) => e.stopPropagation()}>
          <div className="mc-modal-header"><h3><UserPlus size={18} /> Add External Employee</h3><button className="mc-modal-close" onClick={() => { setShowExternalEmployeeModal(false); resetExternalEmployeeForm(); }}><X size={18} /></button></div>
          <div className="mc-modal-body">
            <div className="mc-external-form-grid">
              <label className="mc-field"><span>Employee Code</span><input value={externalEmployeeForm.ext_emp_cd || generateExternalEmployeeCode()} onChange={(e) => handleExternalEmployeeChange("ext_emp_cd", e.target.value)} placeholder="Auto-generated" className="mc-code-input" /></label>
              <label className="mc-field"><span>Employee Name <b>*</b></span><input value={externalEmployeeForm.ext_emp_nm} onChange={(e) => { const lettersOnly = e.target.value.replace(/[^a-zA-Z\s]/g, ""); handleExternalEmployeeChange("ext_emp_nm", lettersOnly); }} placeholder="Enter employee name" className={getError("ext_emp_nm") ? "mc-error" : ""} />{getError("ext_emp_nm") && <small className="mc-error-text">{getError("ext_emp_nm")}</small>}</label>
              <label className="mc-field"><span>Email <b>*</b></span><input type="email" value={externalEmployeeForm.email} onChange={(e) => handleExternalEmployeeChange("email", e.target.value)} placeholder="Enter email address" className={getError("email") ? "mc-error" : ""} />{getError("email") && <small className="mc-error-text">{getError("email")}</small>}</label>
              <label className="mc-field"><span>Mobile Number <b>*</b></span><input type="tel" value={externalEmployeeForm.mob_num} onChange={(e) => { let digitsOnly = e.target.value.replace(/\D/g, ""); if (digitsOnly.length === 1 && !/^[6-9]$/.test(digitsOnly)) { digitsOnly = ""; } else if (digitsOnly.length > 1 && !/^[6-9]/.test(digitsOnly)) { digitsOnly = digitsOnly.replace(/^[^6-9]+/, ""); } digitsOnly = digitsOnly.slice(0, 10); handleExternalEmployeeChange("mob_num", digitsOnly); }} placeholder="Enter 10-digit mobile number" className={getError("mob_num") ? "mc-error" : ""} maxLength="10" />{getError("mob_num") && <small className="mc-error-text">{getError("mob_num")}</small>}</label>
              <label className="mc-field"><span>Company Name <b>*</b></span><input value={externalEmployeeForm.company_nm} onChange={(e) => handleExternalEmployeeChange("company_nm", e.target.value)} placeholder="Enter company name" className={getError("company_nm") ? "mc-error" : ""} />{getError("company_nm") && <small className="mc-error-text">{getError("company_nm")}</small>}</label>
              <label className="mc-field"><span>Reporting To <b>*</b></span>
                <SearchableSelect
                  options={employees.map(emp => ({
                    value: emp.emp_id,
                    label: `${emp.emp_nm} (${emp.role})`
                  }))}
                  value={externalEmployeeForm.rep_emp_id}
                  onChange={(e) => handleExternalEmployeeChange("rep_emp_id", e.target.value)}
                  placeholder="Select Reporting Employee"
                  className={getError("rep_emp_id") ? "mc-error" : ""}
                />
                {getError("rep_emp_id") && <small className="mc-error-text">{getError("rep_emp_id")}</small>}
              </label>
              <label className="mc-field"><span>Status</span>
                <select value={externalEmployeeForm.sts ? "active" : "inactive"} onChange={(e) => handleExternalEmployeeChange("sts", e.target.value === "active")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="mc-field"><span>Photo</span>
                <div className="mc-photo-upload">
                  <input type="file" ref={externalPhotoInputRef} onChange={handleExternalPhotoUpload} accept="image/*" />
                  <button type="button" className="mc-upload-btn" onClick={() => externalPhotoInputRef.current?.click()}><ImageIcon size={14} /> Upload Photo</button>
                  {photoPreview && <div className="mc-photo-preview"><img src={photoPreview} alt="Preview" /></div>}
                </div>
              </label>
            </div>
          </div>
          <div className="mc-modal-footer">
            <button className="mc-btn secondary" onClick={() => { setShowExternalEmployeeModal(false); resetExternalEmployeeForm(); }}>Cancel</button>
            <button className="mc-btn primary" onClick={saveExternalEmployee} disabled={isSubmittingExternal}>{isSubmittingExternal ? "Saving..." : <><UserCheck size={14} /> Save Employee</>}</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Navigation Buttons ───────────────────────────────────────
  const renderNavigationButtons = () => (
    <div className="mc-nav-buttons">
      <div className="mc-nav-left">{currentStep > 1 && <button type="button" className="mc-btn secondary" onClick={goToPreviousStep}><ArrowLeft size={16} /> Previous</button>}</div>
      <div className="mc-nav-right">
        {currentStep < STEPS.length ? <button type="button" className="mc-btn primary" onClick={goToNextStep}>Next Step <ArrowRight size={16} /></button> :
          <div className="mc-submit-group">
            <button type="button" className="mc-btn primary" onClick={() => handleSubmit("SUBMITTED")} disabled={isSubmitting}><Save size={16} /> {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Milestone and task" : "Submit Milestone and Task")}</button>
          </div>
        }
      </div>
    </div>
  );

  // ── Render Tasks Preview Table (Read-Only) ───────────────────
  const renderTasksPreviewTable = () => {
    if (tasks.length === 0) {
      return (
        <div className="mc-empty-state">
          <p>No tasks found for this milestone.</p>
        </div>
      );
    }
    return (
      <div className="mc-table-wrap">
        <table className="mc-task-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>S.No</th>
              <th>Code</th>
              <th>Task Name</th>
              <th>Type</th>
              <th>Assigned To</th>
              <th>Duration</th>
              <th>Start</th>
              <th>End</th>
              <th>Dependency</th>
              <th>Checklist</th>
              <th>Attachments</th>
              <th>Process</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => {
              const isIncomplete = !task.task_nm || (task.task_typ === "INTERNAL" && !task.emp_id) || (task.task_typ === "EXTERNAL" && !task.ext_emp_id) || !task.no_of_days;
              let assigneeName = "Not Assigned";
              if (task.task_typ === "INTERNAL") {
                const emp = employees.find(e => e.emp_id === parseInt(task.emp_id));
                assigneeName = emp ? emp.emp_nm : "Not Assigned";
              } else {
                const emp = externalEmployees.find(e => e.ext_emp_id === parseInt(task.ext_emp_id));
                assigneeName = emp ? (emp.ext_emp_nm || emp.name) : "Not Assigned";
              }
              const assignedTo = [{ role: "Executor", name: assigneeName }];
              if (task.process?.enabled && task.process?.reviewer_id) {
                const rev = employees.find(e => String(e.emp_id) === String(task.process.reviewer_id));
                assignedTo.push({ role: "Reviewer", name: rev ? rev.emp_nm : "Not Selected" });
              }
              if (task.process?.enabled && task.process?.approver_id) {
                const app = employees.find(e => String(e.emp_id) === String(task.process.approver_id));
                assignedTo.push({ role: "Approver", name: app ? app.emp_nm : "Not Selected" });
              }
              const hasChecklist = task.checklist && task.checklist.length > 0;
              const hasAttachments = task.attachments && task.attachments.length > 0;
              const hasProcess = task.process?.enabled && task.process?.reviewer_id && task.process?.approver_id;
              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td><span className="mc-code-badge">{task.task_cd}</span></td>
                  <td>{task.task_nm || "-"}</td>
                  <td>{task.task_typ || "-"}</td>
                  <td>
                    <div className="mc-assigned-to">
                      {assignedTo.map((p, idx) => (
                        <span key={idx} className={`mc-assignee-tag ${p.role.toLowerCase()}`}>
                          {p.name}
                          <span className="mc-assignee-role">{p.role}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{task.no_of_days || "-"}d</td>
                  <td>{formatDisplayDate(task.tent_st_dt) || "-"}</td>
                  <td>{formatDisplayDate(task.tent_end_dt) || "-"}</td>
                  <td>{task.task_dep_flg && task.dep_task_id ? <span className={`mc-dep-label ${task.task_dep_typ?.toLowerCase() || 'independent'}`}>{task.task_dep_typ} ({task.dep_task_id})</span> : "Independent"}</td>
                  <td>{hasChecklist ? <span className="mc-badge success">{task.checklist.length} items</span> : <span className="mc-badge">None</span>}</td>
                  <td>{hasAttachments ? <span className="mc-badge success">{task.attachments.length} files</span> : <span className="mc-badge">None</span>}</td>
                  <td>{hasProcess ? <span className="mc-badge success">Enabled</span> : <span className="mc-badge">Disabled</span>}</td>
                  <td><span className={`mc-status ${isIncomplete ? "incomplete" : "draft"}`}>{isIncomplete ? "Incomplete" : task.task_sts || "DRAFT"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Render Detail View (Read-Only) ───────────────────────────
  const renderDetailView = () => {
    if (loading) {
      return (
        <div className="mc-content">
          <div className="mc-form-card" style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
              <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <h3 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "600" }}>Loading Milestone and Task details...</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Please wait while we fetch the milestone and task details.</p>
            </div>
          </div>
        </div>
      );
    }

    const project = projects.find(p => p.prj_id === parseInt(milestone.drft_prj_id));
    const isLive = milestone.mlstm_sts !== "DRAFT" && milestone.mlstm_sts !== "draft";
    const dependentMilestone = milestoneList.find(m => m.id === parseInt(milestone.mlstm_dep_m_id) && m.type === (isLive ? 'live' : 'draft'));

    return (
      <div className="mc-content">
        <div className="mc-form-card">
          <div className="mc-form-header">
            <div>
              <h2>Milestone Details</h2>
              <p className="mc-subtitle">{milestone.mlstm_cd} - {milestone.mlstm_ttl}</p>
            </div>
            <button type="button" className="mc-back-btn" onClick={() => { setView("list"); resetMilestoneForm(); }}>
              <ArrowLeft size={15} /> Back to List
            </button>
          </div>

          <div className="mc-form-body">
            {/* Milestone Details Card Grid */}
            <div className="mc-details-grid">
              <div className="mc-details-item">
                <span className="mc-details-label">Project</span>
                <span className="mc-details-val">
                  {project ? `${project.prj_cd} - ${project.prj_nm}` : (milestone.drft_prj_id || "-")}
                </span>
              </div>
              <div className="mc-details-item">
                <span className="mc-details-label">Milestone Code</span>
                <span className="mc-details-val"><span className="mc-code-badge">{milestone.mlstm_cd}</span></span>
              </div>
              <div className="mc-details-item">
                <span className="mc-details-label">Milestone Title</span>
                <span className="mc-details-val"><strong>{milestone.mlstm_ttl}</strong></span>
              </div>
              <div className="mc-details-item">
                <span className="mc-details-label">Duration</span>
                <span className="mc-details-val">{milestone.mlstm_days} Days</span>
              </div>
              <div className="mc-details-item">
                <span className="mc-details-label">Tentative Start Date</span>
                <span className="mc-details-val">{formatDisplayDate(milestone.tent_st_dt)}</span>
              </div>
              <div className="mc-details-item">
                <span className="mc-details-val">Tentative End Date</span>
                <span className="mc-details-label">{formatDisplayDate(milestone.tent_end_dt)}</span>
              </div>
              <div className="mc-details-item">
                <span className="mc-details-label">Status</span>
                <span className={`mc-status ${milestone.mlstm_sts === "DRAFT" ? "draft" : milestone.mlstm_sts === "SUBMITTED" ? "submitted" : "live"}`}>
                  {milestone.mlstm_sts}
                </span>
              </div>
              <div className="mc-details-item" style={{ gridColumn: "span 2" }}>
                <span className="mc-details-label">Description</span>
                <span className="mc-details-val">{milestone.mlstm_desc || "-"}</span>
              </div>
              <div className="mc-details-item" style={{ gridColumn: "span 2" }}>
                <span className="mc-details-label">Remarks</span>
                <span className="mc-details-val">{milestone.addl_rem || "-"}</span>
              </div>
            </div>

            {/* Dependency Box */}
            <div className="mc-details-dependency-section">
              <h4><Link size={16} /> Milestone Dependency</h4>
              <div className="mc-details-dependency-grid">
                <div>
                  <span className="mc-details-label">Dependency Available</span>
                  <span className="mc-details-val">{milestone.mlstm_dep_flg ? "Yes" : "No"}</span>
                </div>
                {milestone.mlstm_dep_flg && (
                  <>
                    <div>
                      <span className="mc-details-label">Dependent Milestone</span>
                      <span className="mc-details-val">{dependentMilestone ? `${dependentMilestone.code} - ${dependentMilestone.title}` : (milestone.mlstm_dep_m_id || "-")}</span>
                    </div>
                    <div>
                      <span className="mc-details-label">Dependency Type</span>
                      <span className="mc-details-val">{milestone.mlstm_dep_typ}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tasks Preview Table Section */}
            <div className="mc-preview-table-section" style={{ marginTop: '32px' }}>
              <div className="mc-section-header">
                <h3><ListChecks size={18} /> Tasks Preview Table</h3>
              </div>
              {renderTasksPreviewTable()}
            </div>

            {/* Gantt Chart Section */}
            <div className="mc-gantt-section" style={{ marginTop: '32px' }}>
              <div className="mc-section-header">
                <h3><GanttChartSquare size={18} /> Gantt Chart View</h3>
              </div>
              {renderGanttChart()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render List View ─────────────────────────────────────────
  const handleDeleteMilestoneConfirm = async (e) => {
    if (e) e.preventDefault();
    if (!milestoneToDelete) return;

    setShowMilestoneDeleteModal(false); // Close the modal immediately

    try {
      await milestoneApi.delete(milestoneToDelete.id);
      await loadAllData(); // Re-fetch the list from the server to guarantee UI updates
      triggerAlert("success", "Deleted", "Milestone deleted.");
    } catch (err) {
      console.error(err);
      triggerAlert("error", "Delete Error", err.message || "Failed to delete.");
    }
    setMilestoneToDelete(null);
  };

  const renderListView = () => {
    const isClosedStatus = (m) => {
      const s = String(m.status || m.mlstnSts || m.mlstm_sts || m.original?.status || m.original?.mlstnSts || m.original?.mlstmSts || "").toUpperCase();
      return s === "CLOSED" || s === "COMPLETED" || s === "DONE";
    };

    const isHoldStatus = (m) => {
      const s = String(m.status || m.mlstnSts || m.mlstm_sts || m.original?.status || m.original?.mlstnSts || m.original?.mlstmSts || "").toUpperCase();
      return s === "HOLD" || s === "ON_HOLD" || s === "ON HOLD" || s === "HOLDING" || s === "PAUSED";
    };

    const filtered = milestoneList.filter(m => {
      if (filterType === "ALL") return true;
      if (filterType === "CLOSED") {
        return isClosedStatus(m);
      }
      if (filterType === "HOLD") {
        return isHoldStatus(m);
      }
      if (filterType === "DRAFT") {
        return m.type === 'draft' && !isClosedStatus(m) && !isHoldStatus(m);
      }
      if (filterType === "LIVE") {
        return m.type === 'live' && !isClosedStatus(m) && !isHoldStatus(m);
      }
      return true;
    });
    const searched = filtered.filter(m =>
      m.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );


    return (
      <div className="mc-content">
        <div className="mc-table-panel">
          <div className="mc-table-header">
            <div><h2>Milestone & Tasks</h2><p>View and manage all milestone records (Draft + Live)</p></div>
            <button 
              type="button" 
              className="mc-add-btn" 
              disabled={filterType === "LIVE" || filterType === "CLOSED"}
              style={{
                opacity: (filterType === "LIVE" || filterType === "CLOSED") ? 0.5 : 1,
                cursor: (filterType === "LIVE" || filterType === "CLOSED") ? 'not-allowed' : 'pointer',
                pointerEvents: (filterType === "LIVE" || filterType === "CLOSED") ? 'none' : 'auto'
              }}
              onClick={() => { 
                if (filterType === "LIVE" || filterType === "CLOSED") return;
                resetMilestoneForm(); 
                setView("form"); 
                window.scrollTo({ top: 0, behavior: "smooth" }); 
              }}
            >
              <Plus size={16} /> New Milestone
            </button>
          </div>
          <div className="mc-table-filters">
            <div className="mc-filter-group">
              <button className={`mc-filter-btn ${filterType === "ALL" ? "active" : ""}`} onClick={() => setFilterType("ALL")}>All</button>
              <button className={`mc-filter-btn ${filterType === "DRAFT" ? "active" : ""}`} onClick={() => setFilterType("DRAFT")}>Draft</button>
              <button className={`mc-filter-btn ${filterType === "LIVE" ? "active" : ""}`} onClick={() => setFilterType("LIVE")}>Live</button>
              <button className={`mc-filter-btn ${filterType === "CLOSED" ? "active" : ""}`} onClick={() => setFilterType("CLOSED")}>Closed</button>
              <button className={`mc-filter-btn ${filterType === "HOLD" ? "active" : ""}`} onClick={() => setFilterType("HOLD")}>Hold</button>
            </div>
            <div className="mc-search-box"><Search size={14} /><input type="text" placeholder="Search milestones..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          </div>
          <div className="mc-table-container">
            <table className="mc-list-table">
              <thead><tr><th style={{ width: '50px' }}>S.No</th><th>Milestone Code</th><th>Title</th><th>Project</th><th>Duration</th><th>Start Date</th><th>End Date</th><th>Tasks</th><th>Status</th><th style={{ textAlign: "center", width: '100px' }}>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="10" style={{ textAlign: "center", padding: "40px 20px", color: '#94a3b8' }}>Loading records...</td></tr> : searched.length === 0 ? <tr><td colSpan="10" style={{ textAlign: "center", padding: "40px 20px", color: '#94a3b8' }}>No milestone records found.</td></tr> :
                  searched.map((m, index) => {
                    const project = projects.find(p => p.prj_id === m.projectId);
                    const isDraft = m.type === 'draft';
                    const statusUpper = String(m.status || "").toUpperCase();
                    const statusClass = (statusUpper === "CLOSED" || statusUpper === "COMPLETED" || statusUpper === "DONE") ? "closed" : (statusUpper === "HOLD" || statusUpper === "ON_HOLD" || statusUpper === "ON HOLD" || statusUpper === "HOLDING" || statusUpper === "PAUSED") ? "hold" : statusUpper === "DRAFT" ? "draft" : statusUpper === "SUBMITTED" ? "submitted" : "live";
                    return (
                      <tr key={`${m.type}-${m.id}`}>
                        <td>{index + 1}</td>
                        <td><span className="mc-code-badge">{m.code}</span></td>
                        <td><strong>{m.title}</strong></td>
                        <td>{project ? project.prj_cd : m.projectCd || "-"}</td>
                        <td>{m.duration} days</td>
                        <td>{formatDisplayDate(m.startDate || m.tent_st_dt)}</td>
                        <td>{formatDisplayDate(m.endDate || m.tent_end_dt)}</td>
                        <td><span className="mc-badge">{m.taskCount || 0} Tasks</span></td>
                        <td><span className={`mc-status ${statusClass}`}>{m.status}</span></td>
                        <td>
                          <div className="mc-actions" style={{ justifyContent: "center" }}>
                            {isDraft ? (
                              <>
                                <button className="mc-icon-btn edit" title="Edit" onClick={() => loadMilestoneForEdit(m)}><Edit size={14} /></button>
                                <button className="mc-icon-btn" title="View" onClick={() => loadMilestoneForView(m)}><Eye size={14} /></button>
                                <button className="mc-icon-btn danger" title="Delete" onClick={() => { setMilestoneToDelete(m); setShowMilestoneDeleteModal(true); }}><Trash2 size={14} /></button>
                              </>
                            ) : (
                              <button className="mc-icon-btn" title="View Live" onClick={() => loadMilestoneForView(m)}><Eye size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── Render Step Content ──────────────────────────────────────
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderMilestoneDetails();
      case 2: return renderTasks();
      default: return null;
    }
  };

  // ── Main Render ──────────────────────────────────────────────
  return (
    <div className="mc-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />
      <div className="mc-shell">
        <Header title="Milestone & Tasks" showSearch={false} userName="Ravi Kumar" userRole="Project Manager" initials="RK" />
        <main className="mc-main">
          {view === "list" ? (
            renderListView()
          ) : view === "view" ? (
            renderDetailView()
          ) : (
            <div className="mc-content">
              <div className="mc-form-card">
                <div className="mc-form-header">
                  <div><h2>{isEditing ? (currentStep === 2 ? "Edit Task" : "Edit Milestone") : "Create Milestone & Tasks"}</h2><p className="mc-subtitle">Fill in the details below to create a new milestone</p></div>
                  <button type="button" className="mc-back-btn" onClick={() => { setView("list"); resetMilestoneForm(); setIsEditing(false); }}><ArrowLeft size={15} /> Back to List</button>
                </div>
                <div className="mc-form-body">
                  {renderStepProgress()}
                  {successMessage && <div className="mc-success-banner"><CheckCircle size={18} /><span>{successMessage}</span><button onClick={() => setSuccessMessage("")}><X size={16} /></button></div>}
                  <div className="mc-step-content-wrapper">{renderStepContent()}</div>
                  {renderNavigationButtons()}
                </div>
                <div className="mc-form-footer">
                  <span className="mc-step-indicator">Step {currentStep} of {STEPS.length}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {renderExternalEmployeeModal()}
      {showModal && (
        <div className="mc-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-header"><h3>Confirm Delete</h3><button className="mc-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <div className="mc-modal-body"><p>Are you sure you want to delete this task?</p><p className="mc-modal-warning">This action cannot be undone!</p></div>
            <div className="mc-modal-footer"><button className="mc-btn secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="mc-btn danger" onClick={deleteTask}><Trash2 size={14} /> Delete</button></div>
          </div>
        </div>
      )}
      {showMilestoneDeleteModal && (
        <div className="mc-modal-overlay" onClick={() => { setShowMilestoneDeleteModal(false); setMilestoneToDelete(null); }}>
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-header"><h3>Confirm Delete</h3><button type="button" className="mc-modal-close" onClick={() => { setShowMilestoneDeleteModal(false); setMilestoneToDelete(null); }}><X size={18} /></button></div>
            <div className="mc-modal-body"><p>Are you sure you want to delete this milestone?</p><p className="mc-modal-warning">This action cannot be undone!</p></div>
            <div className="mc-modal-footer"><button type="button" className="mc-btn secondary" onClick={() => { setShowMilestoneDeleteModal(false); setMilestoneToDelete(null); }}>Cancel</button><button type="button" className="mc-btn danger" onClick={handleDeleteMilestoneConfirm}><Trash2 size={14} /> Delete</button></div>
          </div>
        </div>
      )}
      {alertConfig.isOpen && (
        <div className="mc-modal-overlay" onClick={() => {
          const cb = alertConfig.onClose;
          setAlertConfig(prev => ({ ...prev, isOpen: false, onClose: null }));
          if (cb) cb();
        }}>
          <div className="mc-modal mc-alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-header"><h3>{alertConfig.type === "success" ? <CheckCircle size={18} style={{ color: '#16a34a' }} /> : <AlertCircle size={18} style={{ color: '#ef4444' }} />} {alertConfig.title}</h3><button className="mc-modal-close" onClick={() => {
              const cb = alertConfig.onClose;
              setAlertConfig(prev => ({ ...prev, isOpen: false, onClose: null }));
              if (cb) cb();
            }}><X size={18} /></button></div>
            <div className="mc-modal-body"><p>{alertConfig.message}</p></div>
            <div className="mc-modal-footer"><button className="mc-btn primary" onClick={() => {
              const cb = alertConfig.onClose;
              setAlertConfig(prev => ({ ...prev, isOpen: false, onClose: null }));
              if (cb) cb();
            }}>OK</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneCreation;

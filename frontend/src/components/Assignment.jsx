// Assignment.jsx
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import {
  Lock, Calendar as CalendarIcon, Flag, ChevronDown,
  Edit3, Trash2, Plus, Info, UploadCloud, Save, Eye, X, Check, ChevronLeft
} from 'lucide-react';
import '../styles/Assignment.css';
import '../styles/CompanyMaster.css';
import AlertModal from './AlertModal';
import { getScreenPermission } from '../utils/permissions';
import GoLiveCalendar from './Projectmanager/GoLiveCalendar';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

const formatListDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// ============================================================
// SearchableSelect component
// ============================================================
const SearchableSelect = ({ options, value, onChange, placeholder, name, style, disabled, forceOpen, isMulti }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) && 
    (isMulti ? !(value || []).includes(String(o.value)) : true)
  );
  
  const selected = isMulti ? null : options.find(o => String(o.value) === String(value));

  const handleClear = (e, valToRemove) => {
    e.stopPropagation();
    if (isMulti) {
      onChange({ target: { name, value: (value || []).filter(v => String(v) !== String(valToRemove)) } });
    } else {
      onChange({ target: { name, value: '' } });
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', margin: 0 }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: '6px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          backgroundColor: disabled ? '#f1f5f9' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          minHeight: '42px',
          flexWrap: 'wrap',
          gap: '4px',
          ...style
        }}
      >
        {isMulti ? (
          value && value.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: 'calc(100% - 24px)' }}>
              {value.map(v => {
                const opt = options.find(o => String(o.value) === String(v));
                return (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{opt ? opt.label : v}</span>
                    <X size={14} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={(e) => handleClear(e, v)} />
                  </div>
                );
              })}
            </div>
          ) : (
            <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{placeholder}</span>
          )
        ) : selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', maxWidth: 'calc(100% - 24px)' }}>
            <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{selected.label}</span>
            <X size={14} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={(e) => handleClear(e)} />
          </div>
        ) : (
          <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{placeholder}</span>
        )}
        <ChevronDown size={14} style={{ color: '#64748b', flexShrink: 0, marginLeft: 'auto' }} />
      </div>
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 1000
        }}>
          <div style={{ padding: '8px' }}>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.length > 0 ? (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => {
                    if (isMulti) {
                      const currentVals = value || [];
                      onChange({ target: { name, value: [...currentVals, String(opt.value)] } });
                      setIsOpen(false);
                    } else {
                      onChange({ target: { name, value: String(opt.value) } });
                      setIsOpen(false);
                    }
                    setSearch("");
                  }}
                  style={{ padding: '10px 12px', cursor: 'pointer', backgroundColor: (isMulti ? (value || []).includes(String(opt.value)) : String(value) === String(opt.value)) ? '#f1f5f9' : 'transparent', fontSize: '14px', color: '#0f172a' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = (isMulti ? (value || []).includes(String(opt.value)) : String(value) === String(opt.value)) ? '#f1f5f9' : 'transparent'}
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

// ============================================================
// DateInputWithFormat component
// ============================================================
const DateInputWithFormat = ({ value, onChange, min, error, placeholder }) => {
  const [displayVal, setDisplayVal] = useState("");
  const [localError, setLocalError] = useState("");
  const dateRef = useRef(null);

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setDisplayVal(`${d}/${m}/${y}`);
    } else if (!value) {
      setDisplayVal("");
    }
  }, [value]);

  const handleChange = (e) => {
    let val = e.target.value;
    
    if (val.length - displayVal.length === 1) {
      if (val.length === 2 && !val.includes('/')) val += '/';
      else if (val.length === 5 && (val.match(/\//g) || []).length === 1) val += '/';
    }
    
    setDisplayVal(val);

    if (/[a-zA-Z]/.test(val)) {
      setLocalError("Letters are not allowed.");
      onChange({ target: { value: "" } });
      return;
    }
    
    setLocalError("");
    
    if (val === "") {
      onChange({ target: { value: "" } });
      return;
    }

    const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      
      const date = new Date(y, m - 1, d);
      if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
        const formattedDate = `${match[3]}-${match[2]}-${match[1]}`;
        if (min && formattedDate < min) {
          setLocalError("Past dates not allowed.");
          onChange({ target: { value: "" } });
          return;
        }
        onChange({ target: { value: formattedDate } });
      } else {
        setLocalError("Invalid date.");
        onChange({ target: { value: "" } });
      }
    } else {
      onChange({ target: { value: "" } });
    }
  };

  const finalError = localError || error;

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', border: '1px solid ' + (finalError ? '#ef4444' : '#cbd5e1'), borderRadius: '6px', backgroundColor: 'white' }}>
      <input 
        type="text" 
        value={displayVal} 
        onChange={handleChange} 
        placeholder={placeholder || "DD/MM/YYYY"}
        maxLength={10}
        style={{ flex: 1, padding: '8px 12px', border: 'none', outline: 'none', borderRadius: '6px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
      />
      <div 
        style={{ padding: '0 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        onClick={() => {
          if (dateRef.current && typeof dateRef.current.showPicker === 'function') {
            dateRef.current.showPicker();
          }
        }}
      >
        <CalendarIcon size={16} color="#64748b" />
      </div>
      <input 
        type="date"
        ref={dateRef}
        min={min}
        value={(value && /^\d{4}-\d{2}-\d{2}$/.test(value)) ? value : ""}
        onChange={(e) => {
          if(e.target.value) {
            onChange({ target: { value: e.target.value } });
            setLocalError("");
          }
        }}
        style={{ position: 'absolute', width: '1px', height: '1px', border: 0, padding: 0, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', right: 0 }}
      />
      {finalError && <span style={{ color: '#ef4444', fontSize: '11px', position: 'absolute', bottom: '-16px', left: 0 }}>{finalError}</span>}
    </div>
  );
};

// ============================================================
// Utility functions
// ============================================================
const parseLocal = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return new Date(dateStr);
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

const formatLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const calcEndDate = (startStr, workingDays, skipSat, skipSun, publicHolidayDates = []) => {
  if (!startStr || !workingDays) return startStr;
  const holidaySet = new Set(publicHolidayDates);
  let count = 0;
  let cur = parseLocal(startStr);
  if (!cur) return startStr;
  while (count < workingDays) {
    const dow = cur.getDay();
    const dateKey = formatLocal(cur);
    if (!((skipSat && dow === 6) || (skipSun && dow === 0) || holidaySet.has(dateKey))) {
      count++;
    }
    if (count < workingDays) cur.setDate(cur.getDate() + 1);
  }
  return formatLocal(cur);
};

// ============================================================
// Main Assignment component
// ============================================================
const Assignment = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('INDIVIDUAL_TASK');
  // --- Form state ---
  const [taskCode, setTaskCode] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [priority, setPriority] = useState("High");
  const [status, setStatus] = useState("Draft");
  const [duration, setDuration] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [description, setDescription] = useState("");

  const [assignedEmployee, setAssignedEmployee] = useState("");
  const [enableWorkflow, setEnableWorkflow] = useState(false);
  const [reviewer, setReviewer] = useState([]);
  const [approver, setApprover] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [view, setView] = useState("list");
  const [previewSource, setPreviewSource] = useState("list");
  const [editId, setEditId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("checklist");
  const [goLiveTask, setGoLiveTask] = useState(null);
  const [assignmentView, setAssignmentView] = useState("my");

  // --- Alert state ---
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null, confirmText: '', cancelText: '' });
  const triggerAlert = (type, title, message, onConfirm = null, confirmText = '', cancelText = '') => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm, confirmText, cancelText });
  };

  const [forceOpenReviewer, setForceOpenReviewer] = useState(false);
  const [forceOpenApprover, setForceOpenApprover] = useState(false);

  // --- Attachments & checklist state ---
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [checklist, setChecklist] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");

  const removeExistingAttachment = async (fileId) => {
    try {
      await fetch(`${apiBaseUrl}/api/attachments/${fileId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      setExistingAttachments(existingAttachments.filter(a => a.fileId !== fileId));
    } catch (e) {
      console.error("Failed to delete attachment:", e);
    }
  };

  // --- Helper: Task Code Formatting & Auto Generation ---
  const formatTaskCode = (cd) => {
    if (!cd) return "";
    const match = String(cd).match(/^INDTSK-?(\d+)$/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      return `INDTSK-${String(num).padStart(3, '0')}`;
    }
    return cd;
  };

  const generateNextTaskCode = (allTasks) => {
    if (!allTasks || allTasks.length === 0) return "INDTSK-001";
    
    let maxNum = 0;
    allTasks.forEach(t => {
      const cd = t.taskCd || t.task_cd || "";
      const match = String(cd).match(/INDTSK-?(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return `INDTSK-${String(nextNum).padStart(3, '0')}`;
  };

  // --- Helper: get employee name from ID ---
  const getEmployeeName = (id) => {
    if (!id) return 'None';
    let emp = employees.find(e => String(e.empId || e.id) === String(id));
    if (!emp) {
      const numId = Number(id);
      if (!isNaN(numId)) {
        emp = employees.find(e => Number(e.empId || e.id) === numId);
      }
    }
    if (emp) {
      const firstName = emp.fstNm || emp.firstName || '';
      const lastName = emp.lstNm || emp.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) return fullName;
      if (emp.displayLabel) return emp.displayLabel;
      return `Employee ${id}`;
    }
    const taskWithEmp = tasks.find(t => String(t.empId) === String(id) || String(t.assignedBy) === String(id));
    if (taskWithEmp) {
      const empName = taskWithEmp.empNm || taskWithEmp.assignedByNm;
      if (empName && empName !== "N/A") return empName;
    }
    return `ID: ${id}`;
  };

  // --- Data fetching ---
  const fetchAllData = async () => {
    setTasksLoading(true);
    try {
      const profileRes = await fetch(`${apiBaseUrl}/api/profile`, { headers: getAuthHeaders() });
      if (profileRes.ok) setCurrentUser(await profileRes.json());

      const [empRes, coyRes, desigRes, pltRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/employees`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/companies`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/designations`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/plants`, { headers: getAuthHeaders() })
      ]);

      const empData = empRes.ok ? await empRes.json() : [];
      const coyData = coyRes.ok ? await coyRes.json() : [];
      const desigData = desigRes.ok ? await desigRes.json() : [];
      const pltData = pltRes.ok ? await pltRes.json() : [];

      setCompanies(coyData);
      setPlants(pltData);
      setDesignations(desigData);

      const mappedEmps = empData.map(emp => {
        const coyNm = coyData.find(c => String(c.coyId || c.id) === String(emp.coyId))?.coyNm || emp.company;
        const pltNm = pltData.find(p => String(p.pltId || p.id) === String(emp.pltId))?.pltNm || emp.plant;
        const orgInfo = coyNm ? coyNm : (pltNm ? pltNm : "N/A");

        let desigNm = emp.designation || emp.role;
        if (!desigNm) {
          const desigObj = desigData.find(d => String(d.desigId || d.id) === String(emp.desigId));
          desigNm = desigObj?.desigNm || (emp.desigId ? `Designation ${emp.desigId}` : "N/A");
        }
        return {
          ...emp,
          displayLabel: `${emp.fstNm || emp.firstName} ${emp.lstNm || emp.lastName} - ${desigNm} - ${orgInfo}`
        };
      });
      setEmployees(mappedEmps);

      const currentSessionEmpId = sessionStorage.getItem("empId");
      const [tasksRes, assignedByRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/assignments`, { headers: getAuthHeaders() }),
        currentSessionEmpId ? fetch(`${apiBaseUrl}/api/assignments/assigned-by/${currentSessionEmpId}`, { headers: getAuthHeaders() }) : Promise.resolve(null)
      ]);

      if (tasksRes.ok) {
        let rawTasks = await tasksRes.json();
        if (assignedByRes && assignedByRes.ok) {
          const assignedByTasks = await assignedByRes.json();
          const existingIds = new Set(rawTasks.map(t => t.empTaskId || t.id));
          assignedByTasks.forEach(t => {
            if (!existingIds.has(t.empTaskId || t.id)) {
              rawTasks.push(t);
            }
          });
        }
        const enrichedTasks = await Promise.all(rawTasks.map(async (task) => {
          let reviewerName = task.reviewerNm || "N/A";
          let approverName = task.approverNm || "N/A";
          let checklistCount = 0;
          try {
            const chkRes = await fetch(`${apiBaseUrl}/api/checklists/assignments/${task.empTaskId || task.id}?t=${new Date().getTime()}`, { headers: getAuthHeaders() });
            if (chkRes.ok) {
              const chks = await chkRes.json();
              checklistCount = chks.length;
            }
          } catch(err) {}
          return { ...task, reviewerName, approverName, checklistCount };
        }));
        setTasks(enrichedTasks);
      }
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchTasksSilent = async () => {
    try {
      const currentSessionEmpId = sessionStorage.getItem("empId");
      const [tasksRes, assignedByRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/assignments`, { headers: getAuthHeaders() }),
        currentSessionEmpId ? fetch(`${apiBaseUrl}/api/assignments/assigned-by/${currentSessionEmpId}`, { headers: getAuthHeaders() }) : Promise.resolve(null)
      ]);

      if (tasksRes.ok) {
        let rawTasks = await tasksRes.json();
        if (assignedByRes && assignedByRes.ok) {
          const assignedByTasks = await assignedByRes.json();
          const existingIds = new Set(rawTasks.map(t => t.empTaskId || t.id));
          assignedByTasks.forEach(t => {
            if (!existingIds.has(t.empTaskId || t.id)) {
              rawTasks.push(t);
            }
          });
        }
        const enrichedTasks = await Promise.all(rawTasks.map(async (task) => {
          let reviewerName = task.reviewerNm || "N/A";
          let approverName = task.approverNm || "N/A";
          let checklistCount = 0;
          try {
            const chkRes = await fetch(`${apiBaseUrl}/api/checklists/assignments/${task.empTaskId || task.id}?t=${new Date().getTime()}`, { headers: getAuthHeaders() });
            if (chkRes.ok) {
              const chks = await chkRes.json();
              checklistCount = chks.length;
            }
          } catch(err) {}
          return { ...task, reviewerName, approverName, checklistCount };
        }));
        setTasks(enrichedTasks);
      }
    } catch (err) {
      console.error("Error silently updating tasks", err);
    }
  };

  React.useEffect(() => {
    fetchAllData();

    const interval = setInterval(() => {
      fetchTasksSilent();
    }, 8000);

    const handleFocus = () => {
      fetchTasksSilent();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // --- QuickAddBox ---
  const [showQuickAddReviewer, setShowQuickAddReviewer] = useState(false);
  const [showQuickAddApprover, setShowQuickAddApprover] = useState(false);

  const QuickAddBox = ({ role, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({ name: '', designation: '', company: '' });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
      if (!formData.name || !formData.designation || !formData.company) {
        triggerAlert("error", "Error", "Please fill all fields");
        return;
      }
      setLoading(true);
      try {
        const nameParts = formData.name.trim().split(" ");
        const fstNm = nameParts[0];
        const lstNm = nameParts.slice(1).join(" ") || " ";

        const payload = {
          empCode: `TMP-${Math.floor(Math.random() * 10000)}`,
          fstNm: fstNm,
          lstNm: lstNm,
          email: `${fstNm.toLowerCase()}@example.com`,
          gender: "MALE",
          mobNum: "9999999999",
          empTyp: "FTE",
          designation: formData.designation,
          sts: true,
          coyId: parseInt(formData.company),
          pltId: 1,
          deptId: 1,
          wLoc: "HQ",
          role: "user"
        };
        const res = await fetch(`${apiBaseUrl}/api/employees`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const newEmp = await res.json();
          const coyObj = companies.find(c => String(c.coyId || c.id) === String(formData.company));
          const coyNm = coyObj ? coyObj.coyNm : "Unknown Company";

          newEmp.displayLabel = `${newEmp.fstNm || newEmp.firstName} ${newEmp.lstNm || newEmp.lastName} - ${newEmp.designation} - ${coyNm}`;
          setEmployees(prev => [...prev, newEmp]);
          onSuccess(newEmp.empId || newEmp.id);
          onClose();
        } else {
          const text = await res.text();
          triggerAlert("error", "Error", `Failed to add employee: ${text}`);
        }
      } catch (err) {
        console.error("Quick add error:", err);
        triggerAlert("error", "Error", "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div style={{ marginTop: '8px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#334155', margin: 0 }}>Add New {role}</h4>
          <X size={14} style={{ cursor: 'pointer', color: '#64748b' }} onClick={onClose} />
        </div>
        <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '8px', boxSizing: 'border-box' }} />

        <select value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '8px', boxSizing: 'border-box', backgroundColor: 'white' }}>
          <option value="">Select Designation</option>
          {designations.map(d => (
            <option key={d.desigId || d.id} value={d.desigNm}>{d.desigNm}</option>
          ))}
        </select>

        <select value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '10px', boxSizing: 'border-box', backgroundColor: 'white' }}>
          <option value="">Select Company</option>
          {companies.map(c => (
            <option key={c.coyId || c.id} value={c.coyId || c.id}>{c.coyNm}</option>
          ))}
        </select>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={onClose} style={{ padding: '4px 12px', fontSize: '12px', color: '#64748b', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={loading} style={{ padding: '4px 12px', fontSize: '12px', color: 'white', backgroundColor: '#2563eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  };

  // --- Form handlers ---
  const handleResetForm = async () => {
    setEditId(null);
    setTaskTitle("");
    setPriority("High");
    setStatus("Draft");
    setDuration("");
    setStartDate("");
    setDueDate("");
    setDateError("");
    setAssignedEmployee("");
    setDescription("");
    setReviewer([]);
    setApprover([]);
    setEnableWorkflow(false);
    setChecklist([]);
    setAttachments([]);
    setExistingAttachments([]);

    try {
      const res = await fetch(`${apiBaseUrl}/api/assignments/next-code`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data && data.nextTaskCode) {
          setTaskCode(data.nextTaskCode);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not fetch next-code from DB endpoint:", e);
    }
    setTaskCode(generateNextTaskCode(tasks));
  };

  const handleEdit = (task) => {
    setEditId(task.empTaskId || task.id);
    setTaskCode(task.taskCd || "");
    setTaskTitle(task.taskNm || "");
    const p = task.priority || task.Priority || "HIGH";
    setPriority(p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
    setStatus(task.taskSts === 'HOLD' ? 'Draft' : 'To-Do');

    let sd = task.stDt ? String(task.stDt).substring(0, 10) : "";
    let dd = task.endDt ? String(task.endDt).substring(0, 10) : "";
    setStartDate(sd);
    setDueDate(dd);

    if (task.plnDys || task.noOfDays || task.duration) {
      setDuration(String(task.plnDys || task.noOfDays || task.duration));
    } else if (sd && dd) {
      const start = new Date(sd);
      const end = new Date(dd);
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      setDuration(diff >= 0 ? String(diff + 1) : "0");
    } else {
      setDuration("");
    }

    setAssignedEmployee(task.empId ? String(task.empId) : "");
    setDescription(task.taskDesc || "");

    // Set workflow based on task's prcsFlg
    const workflowEnabled = task.prcsFlg === true || task.prcsFlg === 'YES' || task.prcsFlg === 1 || task.prcsFlg === 'true';
    setEnableWorkflow(workflowEnabled);
    
    setReviewer([]);
    setApprover([]);
    setAttachments([]);
    setExistingAttachments([]);

    const taskId = task.empTaskId || task.id;
    if (taskId) {
      // Fetch process configs
      fetch(`${apiBaseUrl}/api/process-config/assignments/${taskId}?t=${new Date().getTime()}`, { headers: getAuthHeaders() })
        .then(res => res.ok ? res.json() : [])
        .then(pcs => {
          if (pcs && pcs.length > 0) {
            setEnableWorkflow(true);
            const revs = pcs.filter(p => p.stepType === 'REVIEWER' || p.ordrId === 1);
            if (revs.length > 0) setReviewer(revs.map(r => String(r.empId)));
            const apps = pcs.filter(p => p.stepType === 'APPROVER' || p.ordrId === 2);
            if (apps.length > 0) setApprover(apps.map(a => String(a.empId)));
          }
        })
        .catch(err => console.error("Error loading process config:", err));
        
      fetch(`${apiBaseUrl}/api/checklists/assignments/${taskId}?t=${new Date().getTime()}`, { headers: getAuthHeaders() })
        .then(res => res.ok ? res.json() : [])
        .then(chks => {
          if (chks && chks.length > 0) {
            setChecklist(chks.map(c => ({
              id: c.chkId,
              name: c.chkNm,
              code: c.chkCd
            })));
          } else {
            setChecklist([]);
          }
        });

      // Fetch existing attachments
      fetch(`${apiBaseUrl}/api/attachments/assignment/${taskId}?t=${new Date().getTime()}`, { headers: getAuthHeaders() })
        .then(res => res.ok ? res.json() : [])
        .then(atts => {
          if (atts && Array.isArray(atts)) {
            setExistingAttachments(atts);
          } else {
            setExistingAttachments([]);
          }
        })
        .catch(() => setExistingAttachments([]));
    }

    setView("form");
  };

  const handleView = (task) => {
    handleEdit(task);
    setPreviewSource("list");
    setView("preview");
  };

  const handleDelete = (id) => {
    triggerAlert("warning", "Confirm Deletion", "Are you sure you want to delete this task?", async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/assignments/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders()
        });
        if (response.ok) {
          triggerAlert("success", "Success", "Task deleted successfully!");
          fetchAllData();
        } else {
          triggerAlert("error", "Error", "Failed to delete task.");
        }
      } catch (err) {
        triggerAlert("error", "Error", "Server error occurred.");
      }
    }, "Delete", "Cancel");
  };

  // --- Date calculations ---
  const recalculateDueDate = (start, dur, empId) => {
    if (!start || !dur) return;
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(0, parseInt(dur, 10) - 1));
    setDueDate(end.toISOString().split('T')[0]);
  };

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    setDateError("");
    if (newStart && duration) {
      recalculateDueDate(newStart, duration, assignedEmployee);
    } else if (newStart && dueDate) {
      const start = new Date(newStart);
      const end = new Date(dueDate);
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (diff < 0) {
        setDateError("Due Date cannot be earlier than Start Date.");
        setDueDate("");
        setDuration("");
      } else {
        setDuration(String(diff + 1));
      }
    }
  };

  const handleDurationChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setDuration(val);
    if (val && startDate) {
      recalculateDueDate(startDate, val, assignedEmployee);
    }
  };

  const handleDueDateChange = (e) => {
    const newDue = e.target.value;
    setDateError("");
    if (newDue && startDate) {
      const start = new Date(startDate);
      const end = new Date(newDue);
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (diff < 0) {
        setDateError("Due Date cannot be earlier than Start Date.");
        return;
      }
      setDueDate(newDue);
      setDuration(String(diff + 1));
    } else {
      setDueDate(newDue);
    }
  };

  // --- Attachments handlers ---
  const isDisallowedFile = (file) => {
    if (!file || !file.name) return false;
    return /\.(zip|rar|7z|tar|gz|iso|mp3|wav|aac|m4a|ogg|flac|wma|mp4|avi|mov|mkv|webm|flv|wmv|3gp|m4v)$/i.test(file.name);
  };

  const filterAllowedFiles = (fileList) => {
    const allowed = [];
    let hasDisallowed = false;
    for (let file of fileList) {
      if (isDisallowedFile(file)) {
        hasDisallowed = true;
      } else {
        allowed.push(file);
      }
    }
    if (hasDisallowed) {
      triggerAlert("warning", "Restricted File Type", "ZIP, Audio, and Video files are not allowed. Please upload Documents or Images only.");
    }
    return allowed;
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = filterAllowedFiles(Array.from(e.dataTransfer.files));
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = filterAllowedFiles(Array.from(e.target.files));
      setAttachments(prev => [...prev, ...validFiles]);
      e.target.value = "";
    }
  };

  const removeAttachment = (indexToRemove) => {
    setAttachments(attachments.filter((_, index) => index !== indexToRemove));
  };

  // --- Checklist handlers ---
  const addChecklistItem = () => {
    setIsAddingChecklist(true);
    setNewChecklistName("");
  };

  const saveNewChecklist = () => {
    if (!newChecklistName.trim()) {
      triggerAlert("warning", "Validation Error", "Please enter a valid checklist item name.");
      return;
    }
    const newItemId = Date.now();
    setChecklist([
      ...checklist,
      { id: newItemId, name: newChecklistName, sequence: checklist.length + 1 }
    ]);
    setNewChecklistName("");
    setIsAddingChecklist(false);
  };

  const deleteChecklistItem = (id) => {
    const updated = checklist.filter(item => item.id !== id);
    const resequenced = updated.map((item, idx) => ({ ...item, sequence: idx + 1 }));
    setChecklist(resequenced);
  };

  const startEditingChecklist = (item) => {
    setEditingItemId(item.id);
    setEditingItemName(item.name);
  };

  const saveChecklistEdit = (id) => {
    if (!editingItemName.trim()) return;
    setChecklist(checklist.map(item => item.id === id ? { ...item, name: editingItemName } : item));
    setEditingItemId(null);
  };

  // --- Assignment logic ---
  const handleAssignClick = () => {
    if (!taskCode.trim()) {
      triggerAlert("warning", "Missing Fields", "Please enter Task Code.");
      return;
    }
    if (!taskTitle.trim() || !assignedEmployee) {
      triggerAlert("warning", "Missing Fields", "Please fill in task title and assigned employee.");
      return;
    }
    if (!startDate || !duration || !dueDate) {
      triggerAlert("warning", "Missing Fields", "Please specify Start Date and Duration to calculate the due date.");
      return;
    }
    if (!description.trim()) {
      triggerAlert("warning", "Missing Fields", "Please enter a task description.");
      return;
    }
    const validReviewers = reviewer.filter(r => r.trim() !== '');
    const validApprovers = approver.filter(a => a.trim() !== '');

    if (enableWorkflow && (validReviewers.length === 0 || validApprovers.length === 0)) {
      triggerAlert("warning", "Missing Fields", "Please select at least one Reviewer and one Approver when Workflow is enabled.");
      return;
    }

    const emp = employees.find(e => String(e.empId || e.id) === String(assignedEmployee));
    const coyId = emp ? (emp.coyId || emp.companyId) : null;
    const pltId = emp ? (emp.pltId || emp.plantId) : null;
    const isPlantEmployee = !!pltId;

    setGoLiveTask({
      projectName: taskTitle,
      startDate: startDate,
      endDate: dueDate,
      totalProjectDays: duration,
      id: editId,
      isIndividualTask: true,
      coyId: coyId,
      pltId: pltId,
      isPlantEmployee: isPlantEmployee
    });
  };

  const executeTaskSave = async (settings) => {
    setGoLiveTask(null);

    let excludeSat = false;
    let excludeSun = true;
    let coyHolidays = false;
    let pltHolidays = false;
    let extHolidays = false;
    let includeMandatory = true;

    if (settings.mode === 'existing') {
      const { company, plant, external } = settings.existingSelection || {};
      coyHolidays = !!company;
      pltHolidays = !!plant;
      extHolidays = !!external;
      if (settings.excludeSat !== undefined) excludeSat = settings.excludeSat;
      if (settings.excludeSun !== undefined) excludeSun = settings.excludeSun;
    } else if (settings.mode === 'custom') {
      const { saturday, sunday, publicHolidays } = settings.customSettings || {};
      excludeSat = !!saturday?.active;
      excludeSun = !!sunday?.active;
      coyHolidays = !!publicHolidays?.company;
      pltHolidays = !!publicHolidays?.plant;
      extHolidays = !!publicHolidays?.external;
    }

    const existingTaskObj = editId ? (tasks || []).find(t => String(t.empTaskId || t.id) === String(editId)) : null;
    const currentSts = existingTaskObj ? (existingTaskObj.taskSts?.statusNm || existingTaskObj.taskSts || 'ASSIGNED') : 'ASSIGNED';
    const hasAtta = (attachments && attachments.length > 0) || (existingAttachments && existingAttachments.length > 0);

    const taskPayload = {
      empTaskId: editId || null,
      taskCd: taskCode,
      taskNm: taskTitle,
      taskDesc: description,
      empId: parseInt(assignedEmployee),
      assignedBy: currentUser?.empId || currentUser?.id || parseInt(sessionStorage.getItem("empId")) || 1,
      taskAsgnTo: 'INTERNAL',
      stDt: startDate ? startDate : null,
      priority: priority.toUpperCase(),
      taskSts: currentSts,
      attaFlg: hasAtta,
      chkFlg: checklist.length > 0,
      prcsFlg: enableWorkflow,
      prcsYesActn: enableWorkflow ? "YES" : "",
      sts: true
    };

    const emp = employees.find(e => String(e.empId || e.id) === String(assignedEmployee));
    const coyId = emp ? (emp.coyId || emp.companyId) : (currentUser?.coyId || currentUser?.companyId);
    const pltId = emp ? (emp.pltId || emp.plantId) : (currentUser?.pltId || currentUser?.plantId);

    const payload = {
      task: taskPayload,
      excludeSat,
      excludeSun,
      includeMandatory,
      coyHolidays,
      pltHolidays,
      extHolidays,
      noOfDays: parseInt(duration) || 0,
      coyId,
      pltId
    };

    try {
      const url = `${apiBaseUrl}/api/assignments/assign-with-calendar`;
      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const savedTask = await response.json();
        const taskId = savedTask.empTaskId || savedTask.id;
        
        if (!taskId) {
          triggerAlert("error", "Task ID Missing", "The backend did not return a valid Task ID. Response: " + JSON.stringify(savedTask));
          return;
        }

        // Save Checklists
        if (checklist.length > 0) {
          const checklistItems = checklist.map((c, i) => ({
            chkCd: `CHK-${i + 1}`,
            chkNm: c.name,
            chkDesc: "",
            seqNo: i + 1,
            sts: true
          }));
          try {
            const chkRes = await fetch(`${apiBaseUrl}/api/checklists/assignments/${taskId}/bulk`, {
              method: "POST", headers: getAuthHeaders(),
              body: JSON.stringify(checklistItems)
            });
            if (!chkRes.ok) {
              const errTxt = await chkRes.text();
              triggerAlert("error", "Checklist Error", errTxt);
            }
          } catch (e) { triggerAlert("error", "Checklist Exception", e.message); }
        }

        // Save Attachments
        if (attachments && attachments.length > 0) {
          for (let file of attachments) {
            try {
              const formData = new FormData();
              formData.append("file", file);
              const uploadRes = await fetch(`${apiBaseUrl}/api/storage/upload/attachment/task`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
                },
                body: formData
              });

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                const fileUrl = uploadData?.url || "";
                if (fileUrl) {
                  await fetch(`${apiBaseUrl}/api/attachments/assignment/${taskId}`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                      fileNm: file.name,
                      atPath: fileUrl,
                      atType: "UPLOAD",
                      refId: taskId,
                      refType: "ASSIGNMENT",
                      tId: taskId,
                      isLive: true
                    })
                  });
                }
              } else {
                console.error("Storage upload failed for file:", file.name);
              }
            } catch (attErr) {
              console.error("Failed to upload attachment:", attErr);
            }
          }
        }

        // Save Process Configs
        if (enableWorkflow && taskId) {
          const validReviewers = reviewer.filter(r => r.trim() !== '');
          const validApprovers = approver.filter(a => a.trim() !== '');

          if (validReviewers && validReviewers.length > 0) {
            for (let i = 0; i < validReviewers.length; i++) {
              try {
                const revRes = await fetch(`${apiBaseUrl}/api/process-config/assignments/${taskId}`, {
                  method: "POST", headers: getAuthHeaders(),
                  body: JSON.stringify({ ordrId: i + 1, stepType: "REVIEWER", empId: parseInt(validReviewers[i]), stepLabel: `Reviewer ${i + 1}` })
                });
                if (!revRes.ok) {
                  const errTxt = await revRes.text();
                  triggerAlert("error", "Reviewer Error", errTxt);
                }
              } catch (e) { triggerAlert("error", "Reviewer Exception", e.message); }
            }
          }
          if (validApprovers && validApprovers.length > 0) {
            for (let i = 0; i < validApprovers.length; i++) {
              try {
                const appRes = await fetch(`${apiBaseUrl}/api/process-config/assignments/${taskId}`, {
                  method: "POST", headers: getAuthHeaders(),
                  body: JSON.stringify({ ordrId: validReviewers.length + i + 1, stepType: "APPROVER", empId: parseInt(validApprovers[i]), stepLabel: `Approver ${i + 1}` })
                });
                if (!appRes.ok) {
                  const errTxt = await appRes.text();
                  triggerAlert("error", "Approver Error", errTxt);
                }
              } catch (e) { triggerAlert("error", "Approver Exception", e.message); }
            }
          }
        }

        // Send Notifications
        try {
          const sendNotification = async (empId, roleMsg) => {
            if(!empId) return;
            await fetch(`${apiBaseUrl}/api/notifications`, {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                empId: parseInt(empId),
                title: `Task Assigned: ${taskCode}`,
                message: `You have been assigned as the ${roleMsg} for task '${taskTitle}' (${taskCode}).`,
                entityTyp: "INDIVIDUAL_TASK",
                entityId: taskId
              })
            });
          };

          if (!editId) {
            await sendNotification(assignedEmployee, "Assignee");
            if (enableWorkflow) {
              const validReviewers = reviewer.filter(r => r.trim() !== '');
              const validApprovers = approver.filter(a => a.trim() !== '');
              if (validReviewers && validReviewers.length > 0) {
                for (let r of validReviewers) await sendNotification(r, "Reviewer");
              }
              if (validApprovers && validApprovers.length > 0) {
                for (let a of validApprovers) await sendNotification(a, "Approver");
              }
            }
          }
        } catch (e) {
          console.error("Failed to send some notifications:", e);
        }

        triggerAlert("success", "Success", `Task '${taskTitle}' has been successfully assigned! Notifications sent to Assignee, Reviewer, and Approver.`);
        setView("list");
        handleResetForm();
        fetchAllData();
      } else {
        const errorText = await response.text();
        triggerAlert("error", "Failed to assignment", errorText || "An error occurred.");
      }
    } catch (err) {
      triggerAlert("error", "Server error", err.message || "An error occurred.");
    }
  };

  // --- Filter tasks ---
  const getFilteredTasks = () => {
    let baseTasks = tasks;
    const currentEmpId = currentUser?.empId || currentUser?.id || sessionStorage.getItem("empId");

    if (assignmentView === "my") {
      baseTasks = baseTasks.filter(task => String(task.empId) === String(currentEmpId));
    } else if (assignmentView === "assignedByMe") {
      baseTasks = baseTasks.filter(task => 
        String(task.assignedBy) === String(currentEmpId)
      );
    }

    const q = searchQuery.toLowerCase();
    return baseTasks.filter(task => {
      const emp = employees.find(e => String(e.empId || e.id) === String(task.empId));
      const empName = emp ? `${emp.fstNm || emp.firstName} ${emp.lstNm || emp.lastName}` : "N/A";
      
      const assignedByEmp = employees.find(e => String(e.empId || e.id) === String(task.assignedBy));
      const assignedByName = assignedByEmp ? `${assignedByEmp.fstNm || assignedByEmp.firstName} ${assignedByEmp.lstNm || assignedByEmp.lastName}` : "N/A";

      const displayName = assignmentView === "my" ? assignedByName : empName;

      return (
        (task.taskCd || "").toLowerCase().includes(q) ||
        (task.taskNm || "").toLowerCase().includes(q) ||
        displayName.toLowerCase().includes(q) ||
        (task.taskSts || "").toLowerCase().includes(q)
      );
    });
  };

  const filteredTasks = getFilteredTasks();

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="cc-shell-container">
      <AlertModal {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
      {goLiveTask && (
        <GoLiveCalendar
          project={goLiveTask}
          onCancel={() => setGoLiveTask(null)}
          onPreview={(settings) => executeTaskSave(settings)}
        />
      )}
      <Sidebar onLogout={onLogout} />
      <div className="cc-shell">
        <Header title=" Assignment " onLogout={onLogout} userRole={userRole} />

        <main className="cc-main">
          <div className="cit-container">

            {/* --- VIEW: LIST --- */}
            {view === "list" && (
              <div className="cit-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h3 className="cit-card-title" style={{ margin: 0, marginBottom: '4px', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>Assignment List</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>View and manage all assigned task records</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="Search tasks..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', minWidth: '220px' }}
                    />
                    {screenPerm.canCreate && (
                      <button className="cit-btn-create" style={{ background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: 6, border: 'none', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: '500' }} onClick={async () => { await handleResetForm(); setView("form"); }}>
                        <Plus size={16} /> Assign New Task
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ margin: '8px 0 20px 0', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '10px', display: 'flex' }}>
                  <div 
                    onClick={() => setAssignmentView("my")}
                    style={{ flex: 1, padding: '10px 0', cursor: 'pointer', backgroundColor: assignmentView === "my" ? '#2563eb' : 'transparent', borderRadius: '8px', textAlign: 'center' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: assignmentView === "my" ? 'white' : '#64748b' }}>My Assignments</span>
                  </div>
                  <div 
                    onClick={() => setAssignmentView("assignedByMe")}
                    style={{ flex: 1, padding: '10px 0', cursor: 'pointer', backgroundColor: assignmentView === "assignedByMe" ? '#2563eb' : 'transparent', borderRadius: '8px', textAlign: 'center' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: assignmentView === "assignedByMe" ? 'white' : '#64748b' }}>Assigned by Me</span>
                  </div>
                </div>

                <div className="cit-table-container">
                  <table className="cit-table">
                    <thead>
                      <tr>
                        <th>Task Code</th>
                        <th>Title</th>
                        <th>{assignmentView === "my" ? "Assigned By" : "Assigned To"}</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Start Date</th>
                        <th>Due Date</th>
                        <th>Reviewer</th>
                        <th>Approver</th>
                        <th>Checklist</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasksLoading ? (
                        <tr><td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading tasks…</td></tr>
                      ) : filteredTasks.length > 0 ? filteredTasks.map(task => {
                        const empName = task.empNm || "N/A";
                        const assignedByName = task.assignedByNm || "N/A";
                        const displayName = assignmentView === "my" ? assignedByName : empName;
                        const isClosedTask = (() => {
                          const sts = String(task.taskSts?.statusNm || task.taskSts || "").toUpperCase();
                          const id = task.taskSts?.statusId || task.taskSts;
                          return sts === "CLOSED" || sts === "COMPLETED" || id === 4;
                        })();

                        return (
                          <tr key={task.empTaskId || task.id}>
                            <td>{formatTaskCode(task.taskCd)}</td>
                            <td>{task.taskNm}</td>
                            <td>{displayName}</td>
                            <td>
                              <span className={`cit-badge priority-${(task.priority || task.Priority || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                {task.priority || task.Priority || 'None'}
                              </span>
                            </td>
                            <td>
                              <span style={{ 
                                color: isClosedTask ? "#16a34a" : "#2563eb", 
                                background: isClosedTask ? "#dcfce7" : "#eff6ff", 
                                padding: "2px 8px", 
                                borderRadius: 4, 
                                fontWeight: 600, 
                                border: isClosedTask ? "1px solid #bbf7d0" : "1px solid #bfdbfe", 
                                fontSize: 12 
                              }}>
                                {isClosedTask ? "Closed" : (task.taskSts?.statusNm || task.taskSts)}
                              </span>
                            </td>
                            <td>{formatListDate(task.stDt)}</td>
                            <td>{formatListDate(task.endDt)}</td>
                            <td>{task.reviewerName || "N/A"}</td>
                            <td>{task.approverName || "N/A"}</td>
                            <td>{task.checklistCount || 0} Items</td>
                            <td>
                              <button className="cit-action-btn view" title="View" style={{ color: '#64748b', marginRight: isClosedTask ? 0 : 8 }} onClick={() => handleView(task)}>
                                <Eye size={16} />
                              </button>
                              {assignmentView === "assignedByMe" && !isClosedTask && (
                                <>
                                  {screenPerm.canEdit && (
                                    <button className="cit-action-btn edit" title="Edit" style={{ color: '#3b82f6', marginRight: 8 }} onClick={() => handleEdit(task)}>
                                      <Edit3 size={16} />
                                    </button>
                                  )}
                                  {screenPerm.canDelete && (
                                    <button className="cit-action-btn delete" title="Delete" style={{ color: '#ef4444' }} onClick={() => handleDelete(task.empTaskId || task.id)}>
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                          No tasks found.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- VIEW: FORM --- */}
            {view === "form" && (
              <>
                <div className="cc-content" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto' }}>
                  <div className="cc-form-card" style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '20px 24px',
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: '#fafbfc'
                    }}>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                        {editId ? "Edit Task" : "Add New Task"}
                      </h2>
                      <button
                        type="button"
                        className="cc-nav-view-btn"
                        onClick={() => {
                          setView("list");
                          handleResetForm();
                        }}
                      >
                        <ChevronLeft size={15} /> Back to Task List
                      </button>
                    </div>

                    <div style={{ padding: '24px' }}>
                      {/* Section 1: Task Details */}
                      <section className="cc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                        <h3 className="cc-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                          Task Details
                        </h3>

                        <div className="cc-form-layout-row columns-4">
                          <label className="cc-field-item">
                            <span>Task Code <b style={{ color: '#ef4444' }}>*</b></span>
                            <input type="text" value={taskCode} onChange={(e) => setTaskCode(e.target.value)} maxLength={10} placeholder="Enter task code" />
                          </label>
                          <label className="cc-field-item">
                            <span>Task Title <b style={{ color: '#ef4444' }}>*</b></span>
                            <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Enter task title" />
                          </label>
                          <label className="cc-field-item">
                            <span>Assigned To <b style={{ color: '#ef4444' }}>*</b></span>
                            <SearchableSelect
                              name="assignedEmployee"
                              value={assignedEmployee}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAssignedEmployee(val);
                                if (reviewer.includes(val)) setReviewer(reviewer.filter(r => r !== val));
                                if (approver.includes(val)) setApprover(approver.filter(a => a !== val));
                                if (startDate && duration) {
                                  recalculateDueDate(startDate, duration, val);
                                }
                              }}
                              options={employees
                                .map(emp => ({ value: emp.empId || emp.id, label: emp.displayLabel || `${emp.fstNm || emp.firstName} ${emp.lstNm || emp.lastName}` }))}
                              placeholder="Search Employee..."
                            />
                          </label>
                          <label className="cc-field-item">
                            <span>Assigned By</span>
                            <input 
                              type="text" 
                              value={sessionStorage.getItem("userName") || "Admin"} 
                              disabled 
                              style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                            />
                          </label>
                          <label className="cc-field-item">
                            <span>Priority <b style={{ color: '#ef4444' }}>*</b></span>
                            <div className="cit-input-wrapper" style={{ margin: 0 }}>
                              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ color: priority === 'High' || priority === 'Critical' ? '#ef4444' : priority === 'Medium' ? '#eab308' : priority === 'Normal' ? '#3b82f6' : '#22c55e', fontWeight: 600 }}>
                                <option value="High" style={{ color: '#ef4444' }}>High</option>
                                <option value="Medium" style={{ color: '#eab308' }}>Medium</option>
                                <option value="Normal" style={{ color: '#3b82f6' }}>Normal</option>
                                <option value="Low" style={{ color: '#22c55e' }}>Low</option>
                              </select>
                              <ChevronDown size={14} className="cit-input-icon-right" style={{ color: priority === 'High' || priority === 'Critical' ? '#ef4444' : priority === 'Medium' ? '#eab308' : priority === 'Normal' ? '#3b82f6' : '#22c55e' }} />
                            </div>
                          </label>
                        </div>

                        <div className="cc-form-layout-row columns-3" style={{ marginTop: '20px' }}>
                          <label className="cc-field-item">
                            <span>Duration (Days) <b style={{ color: '#ef4444' }}>*</b></span>
                            <input type="text" value={duration} onChange={handleDurationChange} pattern="\d*" placeholder="Enter days" />
                          </label>
                          <label className="cc-field-item">
                            <span>Start Date <b style={{ color: '#ef4444' }}>*</b></span>
                            <DateInputWithFormat value={startDate} onChange={handleStartDateChange} min={formatLocal(new Date())} />
                          </label>
                          <label className="cc-field-item" style={{ position: 'relative' }}>
                            <span>Due Date <b style={{ color: '#ef4444' }}>*</b></span>
                            <DateInputWithFormat value={dueDate} onChange={handleDueDateChange} min={startDate || formatLocal(new Date())} error={dateError} />
                          </label>
                        </div>

                        <div className="cc-form-layout-row columns-1" style={{ marginTop: '20px' }}>
                          <label className="cc-field-item">
                            <span>Description <b style={{ color: '#ef4444' }}>*</b></span>
                            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter task description"></textarea>
                          </label>
                        </div>
                      </section>

                      {/* Section 2: Process & Workflow */}
                      <section className="cc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            Process / Workflow
                          </h3>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>Enable Workflow:</span>
                            <label style={{ position: "relative", display: "inline-block", width: "46px", height: "26px", margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={enableWorkflow}
                                onChange={() => setEnableWorkflow(!enableWorkflow)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                              />
                              <span style={{
                                position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: enableWorkflow ? "#10b981" : "#cbd5e1",
                                transition: ".4s", borderRadius: "34px"
                              }}>
                                <span style={{
                                  position: "absolute", height: "20px", width: "20px",
                                  left: enableWorkflow ? "23px" : "3px", bottom: "3px",
                                  backgroundColor: "white", transition: ".4s", borderRadius: "50%",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                }}></span>
                              </span>
                            </label>
                            <span style={{
                              fontSize: "14px", fontWeight: "600", minWidth: "30px",
                              color: enableWorkflow ? "#16a34a" : "#64748b"
                            }}>
                              {enableWorkflow ? "YES" : "NO"}
                            </span>
                          </div>
                        </div>

                        {enableWorkflow && (
                          <div className="cc-form-layout-row columns-2" style={{ marginTop: '16px' }}>
                            <div className="cc-field-item">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span>Reviewer <b style={{ color: '#ef4444' }}>*</b></span>
                                <span 
                                  onClick={() => setReviewer([...reviewer, ''])}
                                  style={{ color: '#2563eb', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  + Add
                                </span>
                              </div>
                              {(reviewer.length > 0 ? reviewer : ['']).map((revId, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', width: '100%' }}>
                                  <div style={{ width: 'calc(100% - 36px)' }}>
                                    <SearchableSelect
                                      name={`reviewer_${index}`}
                                      value={revId}
                                      isMulti={false}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newRev = reviewer.length > 0 ? [...reviewer] : [''];
                                        newRev[index] = val;
                                        setReviewer(newRev);
                                      }}
                                      options={employees
                                        .filter(emp => {
                                          const id = String(emp.empId || emp.id);
                                          if (assignedEmployee && id === String(assignedEmployee)) return false;
                                          return !approver.includes(id) && (!reviewer.includes(id) || reviewer[index] === id);
                                        })
                                        .map(emp => ({ value: emp.empId || emp.id, label: emp.displayLabel || `${emp.fstNm || emp.firstName} ${emp.lstNm || emp.lastName}` }))}
                                      placeholder={`Search Reviewer ${index + 1}...`}
                                    />
                                  </div>
                                  {(reviewer.length > 1 || (reviewer.length === 1 && reviewer[0] !== '')) && (
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        const newRev = [...reviewer];
                                        if (newRev.length > 1) {
                                          newRev.splice(index, 1);
                                          setReviewer(newRev);
                                        } else {
                                          setReviewer([]);
                                        }
                                      }}
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '28px', height: '28px' }}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="cc-field-item">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span>Approver <b style={{ color: '#ef4444' }}>*</b></span>
                                <span 
                                  onClick={() => setApprover([...approver, ''])}
                                  style={{ color: '#2563eb', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  + Add
                                </span>
                              </div>
                              {(approver.length > 0 ? approver : ['']).map((appId, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', width: '100%' }}>
                                  <div style={{ width: 'calc(100% - 36px)' }}>
                                    <SearchableSelect
                                      name={`approver_${index}`}
                                      value={appId}
                                      isMulti={false}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newApp = approver.length > 0 ? [...approver] : [''];
                                        newApp[index] = val;
                                        setApprover(newApp);
                                      }}
                                      options={employees
                                        .filter(emp => {
                                          const id = String(emp.empId || emp.id);
                                          if (assignedEmployee && id === String(assignedEmployee)) return false;
                                          return !reviewer.includes(id) && (!approver.includes(id) || approver[index] === id);
                                        })
                                        .map(emp => ({ value: emp.empId || emp.id, label: emp.displayLabel || `${emp.fstNm || emp.firstName} ${emp.lstNm || emp.lastName}` }))}
                                      placeholder={`Search Approver ${index + 1}...`}
                                    />
                                  </div>
                                  {(approver.length > 1 || (approver.length === 1 && approver[0] !== '')) && (
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        const newApp = [...approver];
                                        if (newApp.length > 1) {
                                          newApp.splice(index, 1);
                                          setApprover(newApp);
                                        } else {
                                          setApprover([]);
                                        }
                                      }}
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '28px', height: '28px' }}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {!enableWorkflow && (
                          <div className="cit-info-box" style={{ background: "#f1f5f9", borderColor: "#e2e8f0", color: "#64748b", margin: 0 }}>
                            <Info size={18} style={{ marginTop: 2 }} />
                            <span>Workflow is disabled. Task will bypass review process.</span>
                          </div>
                        )}
                      </section>

                      {/* Section 3: Attachments & Checklist */}
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
                          <button 
                            type="button"
                            onClick={() => setActiveTab('checklist')}
                            style={{ 
                              padding: '12px 24px', 
                              borderBottom: activeTab === 'checklist' ? '2px solid #2563eb' : '2px solid transparent', 
                              color: activeTab === 'checklist' ? '#2563eb' : '#64748b',
                              fontWeight: activeTab === 'checklist' ? '600' : '400',
                              backgroundColor: 'transparent',
                              borderTop: 'none',
                              borderLeft: 'none',
                              borderRight: 'none',
                              cursor: 'pointer',
                              fontSize: '15px'
                            }}
                          >
                            Checklist Items
                          </button>
                          <button 
                            type="button"
                            onClick={() => setActiveTab('attachment')}
                            style={{ 
                              padding: '12px 24px', 
                              borderBottom: activeTab === 'attachment' ? '2px solid #2563eb' : '2px solid transparent', 
                              color: activeTab === 'attachment' ? '#2563eb' : '#64748b',
                              fontWeight: activeTab === 'attachment' ? '600' : '400',
                              backgroundColor: 'transparent',
                              borderTop: 'none',
                              borderLeft: 'none',
                              borderRight: 'none',
                              cursor: 'pointer',
                              fontSize: '15px'
                            }}
                          >
                            Attachments
                          </button>
                        </div>

                        {activeTab === 'attachment' && (
                          <section className="cc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none' }}>
                            <div
                              className="cit-upload-box"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={handleFileDrop}
                            >
                              <UploadCloud size={32} color="#94a3b8" />
                              <p>Drag & drop files here<br />or</p>
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileInput}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                                style={{ display: "none" }}
                                multiple
                              />
                              <button className="cit-upload-btn" onClick={() => fileInputRef.current.click()}>Browse Files</button>
                              <div className="cit-upload-info">Max file size: 10 MB (Documents & Images only. ZIP, Audio & Video files are NOT allowed.)</div>
                            </div>
                            {(existingAttachments.length > 0 || attachments.length > 0) && (
                              <div className="cit-file-list" style={{ marginTop: '16px' }}>
                                {existingAttachments.map((att, idx) => (
                                  <div className="cit-file-item" key={`ext_${att.fileId || idx}`} style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 600, color: '#1e40af', fontSize: '13px' }}>📎 {att.fileNm || att.fileName} (Uploaded)</span>
                                    <button className="cit-file-remove" type="button" onClick={() => removeExistingAttachment(att.fileId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                  </div>
                                ))}
                                {attachments.map((file, idx) => (
                                  <div className="cit-file-item" key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', marginBottom: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '13px', color: '#0f172a' }}>{file.name}</span>
                                    <button className="cit-file-remove" type="button" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>
                        )}

                        {activeTab === 'checklist' && (
                          <section className="cc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <div></div>
                              <button className="cit-add-btn" onClick={addChecklistItem} style={{ margin: 0 }}>
                                <Plus size={14} /> Add Checklist Item
                              </button>
                            </div>
                            {(checklist.length > 0 || isAddingChecklist) && (
                              <div className="cit-table-container">
                                <table className="cit-table">
                                  <thead>
                                    <tr>
                                      <th width="10%">S.No</th>
                                      <th width="15%">Code</th>
                                      <th width="55%">Checklist Item</th>
                                      <th width="20%">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {checklist.map((item, index) => (
                                      <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td>CHK-{index + 1}</td>
                                        <td>
                                          {editingItemId === item.id ? (
                                            <input
                                              type="text"
                                              value={editingItemName}
                                              onChange={(e) => setEditingItemName(e.target.value)}
                                              onKeyDown={(e) => e.key === 'Enter' && saveChecklistEdit(item.id)}
                                              autoFocus
                                              style={{ padding: '6px 10px', width: '100%', border: '1px solid #3b82f6', borderRadius: '4px', outline: 'none' }}
                                            />
                                          ) : (
                                            item.name
                                          )}
                                        </td>
                                        <td>
                                          {editingItemId === item.id ? (
                                            <button className="cit-action-btn edit" onClick={() => saveChecklistEdit(item.id)}><Check size={14} /></button>
                                          ) : (
                                            <button className="cit-action-btn edit" onClick={() => startEditingChecklist(item)}><Edit3 size={14} /></button>
                                          )}
                                          <button className="cit-action-btn delete" onClick={() => deleteChecklistItem(item.id)}><Trash2 size={14} /></button>
                                        </td>
                                      </tr>
                                    ))}
                                    {isAddingChecklist && (
                                      <tr>
                                        <td>{checklist.length + 1}</td>
                                        <td>CHK-{checklist.length + 1}</td>
                                        <td>
                                          <input
                                            type="text"
                                            value={newChecklistName}
                                            onChange={(e) => setNewChecklistName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveNewChecklist()}
                                            autoFocus
                                            placeholder="Enter checklist item..."
                                            style={{ padding: '6px 10px', width: '100%', border: '1px solid #3b82f6', borderRadius: '4px', outline: 'none' }}
                                          />
                                        </td>
                                        <td>
                                          <button className="cit-action-btn edit" onClick={saveNewChecklist}><Check size={14} /></button>
                                          <button className="cit-action-btn delete" onClick={() => { setIsAddingChecklist(false); setNewChecklistName(""); }}><Trash2 size={14} /></button>
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </section>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="cc-form-footer" style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '12px',
                      padding: '16px 24px',
                      backgroundColor: '#fafbfc',
                      borderTop: '1px solid #e2e8f0'
                    }}>
                      <button type="button" className="cc-btn primary" onClick={handleAssignClick} style={{ background: '#10b981', borderColor: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Save size={14} /> {editId ? 'Update Assign' : 'Assign'}
                      </button>
                      <button type="button" className="cc-btn primary" onClick={() => { setPreviewSource("form"); setView("preview"); }} style={{ background: '#3b82f6', borderColor: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={14} /> Preview Task
                      </button>
                      <button type="button" className="cc-btn secondary" onClick={() => {
                        setView("list");
                        handleResetForm();
                      }} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '8px 16px', borderRadius: '6px', fontWeight: 600 }}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* --- VIEW: PREVIEW --- */}
            {view === "preview" && (
              <div className="cc-content" style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div className="cc-form-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#fafbfc'
                  }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Task Preview</h2>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>View task details in the form below</p>
                    </div>
                    <button
                      type="button"
                      className="cc-nav-view-btn"
                      onClick={() => {
                        setView(previewSource);
                      }}
                    >
                      <ChevronLeft size={15} /> Back
                    </button>
                  </div>

                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 48px' }}>
                      <div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Task Code</span>
                          <span style={{ color: '#0f172a' }}>{taskCode}</span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Task Title</span>
                          <span style={{ color: '#0f172a' }}>{taskTitle || "-"}</span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Priority</span>
                          <span style={{ color: priority === 'High' || priority === 'Critical' ? '#ef4444' : priority === 'Medium' ? '#eab308' : priority === 'Normal' ? '#3b82f6' : '#22c55e', fontWeight: 600 }}>{priority}</span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Status</span>
                          <span>
                            <span style={{ color: "#2563eb", background: "#eff6ff", padding: "2px 10px", borderRadius: 4, fontWeight: 600, border: "1px solid #bfdbfe", fontSize: 13 }}>{status}</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Duration</span>
                          <span style={{ color: '#0f172a' }}>{duration ? `${duration} Days` : "-"}</span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Start Date</span>
                          <span style={{ color: '#0f172a' }}>
                            {startDate ? startDate.split("-").reverse().join("-") : "-"}
                          </span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Due Date</span>
                          <span style={{ color: '#0f172a' }}>
                            {dueDate ? dueDate.split("-").reverse().join("-") : "-"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Assigned To</span>
                          <span style={{ color: '#0f172a' }}>
                            {tasks.find(t => String(t.empTaskId || t.id) === String(editId))?.empNm || "None"}
                          </span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Process / Workflow</span>
                          <span>
                            {enableWorkflow ? (
                              <>
                                <span style={{ color: "#10b981", background: "#d1fae5", padding: "2px 10px", borderRadius: 4, fontWeight: 600, border: "1px solid #a7f3d0", fontSize: 13 }}>Enabled</span>
                                <div style={{ marginTop: '4px', fontSize: '13px', color: '#334155' }}>
                                  <span style={{ fontWeight: '500' }}>Reviewer:</span> 
                                  {reviewer.length === 0 ? 'Loading...' : reviewer.filter(r => r.trim() !== '').map(r => getEmployeeName(r)).join(', ') || 'None'}
                                </div>
                                <div style={{ fontSize: '13px', color: '#334155' }}>
                                  <span style={{ fontWeight: '500' }}>Approver:</span> 
                                  {approver.length === 0 ? 'Loading...' : approver.filter(a => a.trim() !== '').map(a => getEmployeeName(a)).join(', ') || 'None'}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: "#64748b", background: "#f1f5f9", padding: "2px 10px", borderRadius: 4, fontWeight: 600, border: "1px solid #e2e8f0", fontSize: 13 }}>Disabled</span>
                            )}
                          </span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Checklist Items</span>
                          <span style={{ color: '#0f172a' }}>{checklist.length} Items</span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Attachments</span>
                          <span style={{ color: '#0f172a' }}>
                            {((existingAttachments || []).length + (attachments || []).length) > 0 
                              ? `${((existingAttachments || []).length + (attachments || []).length)} ${((existingAttachments || []).length + (attachments || []).length) === 1 ? 'Attachment' : 'Attachments'}` 
                              : "No attachments"}
                          </span>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                          <span style={{ fontWeight: '600', color: '#475569', width: '140px', flexShrink: 0 }}>Description</span>
                          <span style={{ color: '#0f172a', whiteSpace: 'pre-wrap' }}>{description || "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                      <button
                        onClick={() => {
                          setView(previewSource);
                        }}
                        style={{
                          padding: '8px 20px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: 'white',
                          color: '#475569',
                          fontWeight: '500',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        Close Preview
                      </button>
                      {!editId && (
                        <button
                          onClick={handleAssignClick}
                          style={{
                            padding: '8px 20px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#2563eb',
                            color: 'white',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                          }}
                        >
                          <Plus size={16} /> Create & Assignment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Assignment;
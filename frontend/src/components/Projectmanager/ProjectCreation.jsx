import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  ChevronRight,
  Upload,
  X,
  Bell,
  CheckCircle,
  RefreshCcw,
  Save,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  ChevronLeft,
  Search,
  Image as ImageIcon,
  Calendar,
  Copy
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import AlertModal from "../AlertModal.jsx";
import { getScreenPermission } from "../../utils/permissions";
import { calculateDynamicPriority } from "../../utils/priority";
import GoLiveCalendar from "./GoLiveCalendar.jsx";
import "../../styles/projectCreation.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const getAuthHeaders = () => {
  const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

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

const formatListDate = (dateString) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// ========== Searchable Select (unchanged) ==========
const SearchableSelect = ({ options, value, onChange, placeholder, name, style, disabled }) => {
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

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
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
          ...style
        }}
      >
        <span style={{ color: selected ? '#0f172a' : '#94a3b8' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>▼</span>
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
              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none', fontSize: '14px' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
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
                  style={{ padding: '10px 12px', cursor: 'pointer', backgroundColor: String(value) === String(opt.value) ? '#f1f5f9' : 'transparent', fontSize: '14px' }}
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

// ========== Custom DatePicker (with calendar icon) ==========
const DatePicker = ({ value, onChange, placeholder, name, minDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
        setViewDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
      }
    } else {
      setDisplayValue('');
      setViewDate(new Date());
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isBeforeMin = (date) => {
    if (!minDate || !date) return false;
    const parts = minDate.split('-');
    if (parts.length !== 3) return false;
    const minYear = parseInt(parts[0], 10);
    const minMonth = parseInt(parts[1], 10) - 1;
    const minDay = parseInt(parts[2], 10);

    const min = new Date(minYear, minMonth, minDay);
    min.setHours(0, 0, 0, 0);

    const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    current.setHours(0, 0, 0, 0);

    return current < min;
  };

  const parseTypedDate = (str) => {
    if (!str) return null;
    const trimmed = str.trim();
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(year, month - 1, day);
        if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
          return d;
        }
      }
    }
    return null;
  };

  const handleInputChange = (e) => {
    let raw = e.target.value;
    let clean = raw.replace(/[^0-9/]/g, '');

    const digitsOnly = clean.replace(/\D/g, '');
    const isDeleting = e.nativeEvent && e.nativeEvent.inputType === 'deleteContentBackward';

    let formatted = clean;
    if (digitsOnly.length > 0) {
      if (!clean.includes('/')) {
        if (digitsOnly.length >= 5) {
          formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
        } else if (digitsOnly.length >= 3) {
          formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
        } else if (digitsOnly.length === 2 && !isDeleting) {
          formatted = `${digitsOnly}/`;
        }
      } else {
        const parts = clean.split('/');
        let dayPart = parts[0] || '';
        let monthPart = parts[1] !== undefined ? parts[1] : null;

        if (monthPart && monthPart.length === 2 && parts.length === 2 && !isDeleting) {
          formatted = `${dayPart}/${monthPart}/`;
        }
      }
    }

    formatted = formatted.slice(0, 10);
    setDisplayValue(formatted);

    if (!formatted.trim()) {
      onChange({ target: { name, value: '' } });
      return;
    }

    const parsed = parseTypedDate(formatted);
    if (parsed) {
      if (isBeforeMin(parsed)) {
        onChange({ target: { name, value: '' } });
      } else {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        const dbFormatted = `${year}-${month}-${day}`;
        onChange({ target: { name, value: dbFormatted } });
        setViewDate(parsed);
      }
    } else {
      onChange({ target: { name, value: '' } });
    }
  };

  const handleInputBlur = () => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
      }
    } else {
      setDisplayValue('');
    }
  };

  const handleDateSelect = (date) => {
    if (isBeforeMin(date)) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    onChange({ target: { name, value: formatted } });
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({ target: { name, value: '' } });
    setDisplayValue('');
  };

  const daysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const generateCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(viewDate);
    const firstDay = firstDayOfMonth(viewDate);
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isSelected = (date) => {
    if (!value) return false;
    const parts = value.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return date.getFullYear() === year &&
             date.getMonth() === month &&
             date.getDate() === day;
    }
    return false;
  };

  const changeMonth = (delta) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <Calendar
          size={18}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            pointerEvents: 'none'
          }}
        />
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder || "dd/mm/yyyy"}
          onFocus={() => setIsOpen(true)}
          style={{
            width: '100%',
            padding: '10px 34px 10px 36px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            cursor: 'text'
          }}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          zIndex: 1000,
          padding: '12px',
          width: '280px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <button type="button" onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>&lt;</button>
            <span style={{ fontWeight: '600' }}>{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button type="button" onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>&gt;</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{d}</div>)}
            {generateCalendar().map((date, idx) => {
              const disabled = date ? isBeforeMin(date) : false;
              const selected = date ? isSelected(date) : false;
              return (
                <div key={idx} style={{ padding: '4px', fontSize: '14px' }}>
                  {date ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && handleDateSelect(date)}
                      style={{
                        background: selected ? '#2563eb' : 'transparent',
                        color: disabled ? '#cbd5e1' : (selected ? 'white' : '#0f172a'),
                        border: 'none',
                        borderRadius: '4px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        width: '100%',
                        padding: '4px 0',
                        opacity: disabled ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => { if (!disabled && !selected) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                      onMouseLeave={(e) => { if (!disabled && !selected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {date.getDate()}
                    </button>
                  ) : <span></span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ========== Main Component ==========
const ProjectCreation = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('PROJECT_CREATION');
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [departments, setDepartments] = useState([]);

  const fetchAllData = async () => {
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
      setCompanies(coyData);
      setPlants(pltData);
      setDepartments(deptData);
      const mappedDrafts = drafts.map(d => {
        const dynamicPrio = calculateDynamicPriority(d.prjPrty || "LOW", d.tentStDt, d.tentEndDt, d.noOfDays);
        return {
          id: d.drftPrjId,
          _type: "draft",
          projectCode: d.prjCd || "",
          projectName: d.prjNm || "",
          projectDescription: d.prjDesc || "",
          projectObjective: d.prjObjtv || "",
          expectedDeliverables: d.expDlvbls || "",
          priority: dynamicPrio.priority,
          priorityMeta: dynamicPrio,
          rawPriority: d.prjPrty || "MEDIUM",
          status: "DRAFT",
          startDate: d.tentStDt || "",
          endDate: d.tentEndDt || "",
          totalProjectDays: d.noOfDays || "",
          companyId: d.coyId || "",
          plantId: d.pltId || "",
          departmentId: d.deptId || "",
          companyName: coyData.find(c => c.coyId === d.coyId)?.coyNm || "",
          plantName: pltData.find(p => p.pltId === d.pltId)?.pltNm || "",
          department: deptData.find(dep => dep.deptId === d.deptId)?.deptNm || "",
          remarks: d.addlRem || "",
          logo: d.logo || null,
          createdBy: getLoggedInUser()
        };
      });
      const statusOverrides = JSON.parse(localStorage.getItem("project_status_overrides") || "{}");
      const mappedLive = live.map(l => {
        const backendSts = l.prjSts || "LIVE";
        let displaySts = statusOverrides[l.prjId] || backendSts;
        if (displaySts === "IN_PROGRESS" && backendSts !== "LIVE") {
          displaySts = backendSts;
        }
        const dynamicPrio = calculateDynamicPriority(l.prjPrty || "LOW", l.stDt, l.endDt, l.noOfDays);
        return {
          id: l.prjId,
          _type: "live",
          projectCode: l.prjCd || "",
          projectName: l.prjNm || "",
          projectDescription: l.prjDesc || "",
          projectObjective: l.prjObjtv || "",
          expectedDeliverables: l.expDlvbls || "",
          priority: dynamicPrio.priority,
          priorityMeta: dynamicPrio,
          rawPriority: l.prjPrty || "MEDIUM",
          status: displaySts,
          startDate: l.stDt || "",
          endDate: l.endDt || "",
          totalProjectDays: l.noOfDays || "",
          companyId: l.coyId || "",
          plantId: l.pltId || "",
          departmentId: l.deptId || "",
          companyName: coyData.find(c => c.coyId === l.coyId)?.coyNm || "",
          plantName: pltData.find(p => p.pltId === l.pltId)?.pltNm || "",
          department: deptData.find(dep => dep.deptId === l.deptId)?.deptNm || "",
          remarks: l.addlRem || "",
          logo: l.logo || null,
          createdBy: getLoggedInUser()
        };
      });
      const allProjects = [...mappedDrafts, ...mappedLive];
      setProjects(allProjects);
      setForm(prev => {
        if (!isEditing) {
          return { ...prev, projectCode: generateNextProjectCode(allProjects) };
        }
        return prev;
      });
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateNextProjectCode = (projectList = projects) => {
    let maxNum = 0;
    (projectList || []).forEach(p => {
      const code = p.projectCode || p.prjCd || "";
      const match = code.match(/^PRJ-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num < 2000 && num > maxNum) {
          maxNum = num;
        }
      }
    });

    if (maxNum === 0) {
      (projectList || []).forEach(p => {
        const code = p.projectCode || p.prjCd || "";
        const match = code.match(/^PRJ[-_]?(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num < 2000 && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }

    const nextNum = maxNum + 1;
    return `PRJ-${String(nextNum).padStart(3, '0')}`;
  };

  useEffect(() => { fetchAllData(); }, []);

  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [goLiveProject, setGoLiveProject] = useState(null);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  const triggerAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const [form, setForm] = useState({
    projectCode: "",
    projectName: "",
    priority: "MEDIUM",
    status: "Draft",
    projectDescription: "",
    projectObjective: "",
    expectedDeliverables: "",
    companyName: "",
    plantName: "",
    department: "",
    createdBy: getLoggedInUser(),
    startDate: "",
    endDate: "",
    totalProjectDays: "",
    priorityDetails: "",
    budget: "",
    remarks: "",
    uploadImage: null,
    organizationType: "company" // "company" or "plant"
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [success, setSuccess] = useState(false);

  // ─── Search state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    projectName: '',
    projectCode: '',
    status: ''
  });

  const [activeDropdown, setActiveDropdown] = useState(null);

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTargetId, setDeactivateTargetId] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ─── Status tab filter state ──────────────────────────────────────
  const [statusTab, setStatusTab] = useState('All'); // 'All', 'Draft', 'Live', 'Hold', 'Closed'

  // ─── Input Change Handler ──────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'projectCode') newValue = value.slice(0, 10);
    else if (name === 'projectName') newValue = value.slice(0, 100);
    else if (name === 'projectDescription') newValue = value.slice(0, 250);
    else if (name === 'projectObjective' || name === 'expectedDeliverables' || name === 'remarks')
      newValue = value.slice(0, 255);
    else if (name === 'totalProjectDays') {
      newValue = value.replace(/[^0-9]/g, '');
    }

    setForm((prev) => {
      const nextForm = { ...prev, [name]: newValue };

      if (name === 'startDate' || name === 'totalProjectDays') {
        if (nextForm.startDate && nextForm.totalProjectDays) {
          const parts = nextForm.startDate.split('-');
          const days = parseInt(nextForm.totalProjectDays, 10);
          if (parts.length === 3 && !isNaN(days) && days > 0) {
            const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            start.setDate(start.getDate() + days - 1);
            const ey = start.getFullYear();
            const em = String(start.getMonth() + 1).padStart(2, '0');
            const ed = String(start.getDate()).padStart(2, '0');
            nextForm.endDate = `${ey}-${em}-${ed}`;
          }
        } else if (!nextForm.totalProjectDays && nextForm.startDate && nextForm.endDate) {
          const startParts = nextForm.startDate.split('-');
          const endParts = nextForm.endDate.split('-');
          if (startParts.length === 3 && endParts.length === 3) {
            const start = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
            const end = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));
            const diffTime = end - start;
            if (diffTime >= 0) {
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
              nextForm.totalProjectDays = String(diffDays);
            } else {
              nextForm.endDate = "";
              nextForm.totalProjectDays = "0";
              triggerAlert("warning", "Invalid Date Range", "Tentative End Date cannot be earlier than Tentative Start Date.");
            }
          }
        }
      } else if (name === 'endDate') {
        if (nextForm.startDate && nextForm.endDate) {
          const startParts = nextForm.startDate.split('-');
          const endParts = nextForm.endDate.split('-');
          if (startParts.length === 3 && endParts.length === 3) {
            const start = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
            const end = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));
            const diffTime = end - start;
            if (diffTime >= 0) {
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
              nextForm.totalProjectDays = diffDays >= 0 ? String(diffDays) : "0";
            } else {
              nextForm.endDate = "";
              nextForm.totalProjectDays = "0";
              triggerAlert("warning", "Invalid Date Range", "Tentative End Date cannot be earlier than Tentative Start Date.");
            }
          }
        }
      }

      return nextForm;
    });
  };

  const handleToggleStatus = (e) => {
    setForm(prev => ({ ...prev, status: e.target.checked ? "Live" : "Draft" }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(prev => ({ ...prev, uploadImage: file }));
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        const response = await fetch(`${apiBaseUrl}/api/storage/upload/project-logo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionStorage.getItem("authToken") || localStorage.getItem("authToken") || ""}` },
          body: formDataUpload
        });
        if (!response.ok) throw new Error("Image upload failed");
        const data = await response.json();
        setImagePreview(data.url);
      } catch (err) {
        console.error("Project logo upload error:", err);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setForm(prev => ({ ...prev, uploadImage: file }));
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        const response = await fetch(`${apiBaseUrl}/api/storage/upload/project-logo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionStorage.getItem("authToken") || localStorage.getItem("authToken") || ""}` },
          body: formDataUpload
        });
        if (!response.ok) throw new Error("Image upload failed");
        const data = await response.json();
        setImagePreview(data.url);
      } catch (err) {
        console.error("Project logo drop upload error:", err);
      }
    }
  };

  const handleBulletKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const { name, value, selectionStart, selectionEnd } = e.target;

      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);

      let insertion = "";
      let offset = 0;

      if (e.key === "Enter") {
        insertion = "\n• ";
        offset = 3;
      } else if (e.key === ",") {
        insertion = ",\n• ";
        offset = 4;
      }

      const newValue = before + insertion + after;
      setForm((prev) => ({ ...prev, [name]: newValue }));

      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + offset;
      }, 0);
    }
  };

  const handleBulletFocus = (e) => {
    const { name, value } = e.target;
    if (!value.trim()) {
      setForm((prev) => ({ ...prev, [name]: "• " }));
    }
  };

  const handleResetForm = (projectList = projects) => {
    setForm({
      projectCode: generateNextProjectCode(projectList),
      projectName: "",
      priority: "MEDIUM",
      status: "Draft",
      projectDescription: "",
      projectObjective: "",
      expectedDeliverables: "",
      companyName: "",
      plantName: "",
      department: "",
      createdBy: getLoggedInUser(),
      startDate: "",
      endDate: "",
      totalProjectDays: "",
      priorityDetails: "",
      budget: "",
      remarks: "",
      uploadImage: null,
      organizationType: "company"
    });
    setImagePreview(null);
  };

  useEffect(() => {
    if (location.state?.createMode) {
      setView("form");
      setIsEditing(false);
      handleResetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.state]);

  const handleSave = async () => {
    // Validate based on organization type
    if (
      !form.projectName.trim() || !form.startDate || !form.endDate ||
      !form.projectDescription.trim() || 
      (form.organizationType === "company" ? !form.companyName : !form.plantName) ||
      !form.department
    ) {
      triggerAlert("error", "Validation Error", "Please fill in all required fields marked with *");
      return;
    }

    if (form.startDate && form.endDate) {
      const startParts = form.startDate.split('-');
      const endParts = form.endDate.split('-');
      if (startParts.length === 3 && endParts.length === 3) {
        const start = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
        const end = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));
        if (end < start) {
          triggerAlert("error", "Validation Error", "Tentative End Date cannot be earlier than Tentative Start Date.");
          return;
        }
      }
    }
    setLoading(true);
    try {
      const isLive = form.status === "Live" || form.status === "LIVE";
      const projectCodeVal = (form.projectCode || generateNextProjectCode(projects)).trim();
      const payload = {
        prjCd: projectCodeVal,
        prjNm: (form.projectName || "").trim(),
        prjDesc: (form.projectDescription || "").trim(),
        prjObjtv: (form.projectObjective || "").trim() || "N/A",
        expDlvbls: (form.expectedDeliverables || "").trim() || null,
        prjPrty: form.priority,
        coyId: form.organizationType === "company" ? parseInt(form.companyName) : null,
        pltId: form.organizationType === "plant" ? parseInt(form.plantName) : null,
        deptId: parseInt(form.department),
        tentStDt: form.startDate,
        tentEndDt: form.endDate,
        noOfDays: parseInt(form.totalProjectDays) || 0,
        creBy: form.createdBy || "System",
        logo: imagePreview || null,
        addlRem: (form.remarks || "").trim() || null
      };

      let response;
      if (isEditing) {
        const editProject = projects.find(p => p.id === editingId);
        const endpoint = editProject?._type === "live"
          ? `${apiBaseUrl}/api/project-live/${editingId}`
          : `${apiBaseUrl}/api/project-drafts/${editingId}`;
        if (editProject?._type === "live") {
          response = await fetch(endpoint, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ ...payload, prjSts: form.status, stDt: form.startDate, endDt: form.endDate })
          });
        } else {
          response = await fetch(endpoint, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(payload) });
        }
      } else {
        response = await fetch(`${apiBaseUrl}/api/project-drafts`, {
          method: "POST", headers: getAuthHeaders(), body: JSON.stringify(payload)
        });
        if (response.ok && isLive) {
          const draft = await response.json();
          response = await fetch(`${apiBaseUrl}/api/project-live/promote/${draft.drftPrjId}`, {
            method: "POST", headers: getAuthHeaders(),
            body: JSON.stringify({ prjSts: "LIVE", stDt: form.startDate, endDt: form.endDate })
          });
        }
      }

      if (response.ok) {
        let newId = editingId;
        let pType = isEditing ? (projects.find(p => p.id === editingId)?._type || "live") : (isLive ? "live" : "draft");
        try {
          const data = await response.clone().json();
          if (data) {
            newId = data.drftPrjId || data.drft_prj_id || data.prjId || data.prj_id || data.id || newId;
          }
        } catch (e) {
          // If response body is empty or non-JSON, fallback to editingId / newId
        }
        handleResetForm();
        setIsEditing(false);
        setEditingId(null);
        if (newId) {
          navigate("/milestone-creation", {
            state: {
              projectId: newId,
              projectType: pType,
              showSuccessAlert: true,
              message: isEditing ? "Project updated successfully!" : "Project created successfully!"
            }
          });
        } else {
          triggerAlert("success", "Success", isEditing ? "Project updated successfully!" : "Project saved successfully!");
          setView("list");
          fetchAllData();
        }
      } else {
        let msg = `Failed to save project. (Status: ${response.status})`;
        try {
          const text = await response.text();
          if (text) {
            try {
              const j = JSON.parse(text);
              if (j.message) msg = j.message;
            } catch (e) {
              msg = text;
            }
          }
        } catch (e) { console.warn(e); }
        triggerAlert("error", "Error", msg);
      }
    } catch (err) {
      triggerAlert("error", "Error", err.message || "Could not save project.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project) => {
    setForm({
      projectCode: project.projectCode || "",
      projectName: project.projectName || "",
      priority: project.priority || "MEDIUM",
      status: project.status || "DRAFT",
      projectDescription: project.projectDescription || "",
      projectObjective: project.projectObjective || "",
      expectedDeliverables: project.expectedDeliverables || "",
      companyName: project.companyId ? String(project.companyId) : "",
      plantName: project.plantId ? String(project.plantId) : "",
      department: project.departmentId ? String(project.departmentId) : "",
      createdBy: getLoggedInUser(),
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      totalProjectDays: String(project.totalProjectDays || ""),
      priorityDetails: "",
      budget: "",
      remarks: project.remarks || "",
      uploadImage: null,
      organizationType: project.companyId ? "company" : "plant"
    });
    if (project.logo) setImagePreview(project.logo);
    else setImagePreview(null);
    setIsEditing(true);
    setEditingId(project.id);
    setActiveDropdown(null);
    setView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
    const mainEl = document.querySelector(".main-content") || document.querySelector(".layout-content") || document.documentElement;
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicate = async (project) => {
    setActiveDropdown(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/project-drafts/${project.id}/duplicate`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const newDraft = await res.json();
        triggerAlert("success", "Project Duplicated", "Project draft copied successfully with all its milestones and tasks!");
        await fetchAllData();
        handleEdit({
          id: newDraft.drftPrjId,
          _type: "draft",
          projectCode: newDraft.prjCd || "",
          projectName: newDraft.prjNm || "",
          projectDescription: newDraft.prjDesc || "",
          projectObjective: newDraft.prjObjtv || "",
          expectedDeliverables: newDraft.expDlvbls || "",
          priority: newDraft.prjPrty || "MEDIUM",
          status: "DRAFT",
          startDate: newDraft.tentStDt || "",
          endDate: newDraft.tentEndDt || "",
          totalProjectDays: newDraft.noOfDays || "",
          companyId: newDraft.coyId || "",
          plantId: newDraft.pltId || "",
          departmentId: newDraft.deptId || "",
          remarks: newDraft.addlRem || "",
          logo: newDraft.logo || null
        });
      } else {
        const errText = await res.text();
        triggerAlert("error", "Error", errText || "Failed to duplicate project draft.");
      }
    } catch (err) {
      console.error("Error duplicating project draft:", err);
      triggerAlert("error", "Error", `Duplicate failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = (id) => {
    setActiveDropdown(prev => (prev === id ? null : id));
  };

  const triggerDeactivate = (id) => {
    setDeactivateTargetId(id);
    setShowDeactivateModal(true);
    setActiveDropdown(null);
  };

  const confirmDeactivate = async () => {
    const project = projects.find(p => p.id === deactivateTargetId);
    setShowDeactivateModal(false);
    setDeactivateTargetId(null);
    if (!project) return;
    try {
      if (project._type === "live") {
        await fetch(`${apiBaseUrl}/api/project-live/${project.id}`, {
          method: "PUT", headers: getAuthHeaders(),
          body: JSON.stringify({
            prjSts: "CLOSED", prjNm: project.projectName, prjDesc: project.projectDescription,
            prjObjtv: project.projectObjective || "N/A", coyId: project.companyId, pltId: project.plantId,
            deptId: project.departmentId, prjPrty: project.priority, stDt: project.startDate, endDt: project.endDate
          })
        });
      }
      fetchAllData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = (id) => {
    const project = projects.find(p => p.id === id);
    setAlertConfig({
      isOpen: true, type: "warning", title: "Confirm Delete",
      message: "Are you sure you want to delete this project? This action cannot be undone.",
      confirmText: "Delete", cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const endpoint = project?._type === "live"
            ? `${apiBaseUrl}/api/project-live/${id}`
            : `${apiBaseUrl}/api/project-drafts/${id}`;
          const res = await fetch(endpoint, { method: "DELETE", headers: getAuthHeaders() });
          if (res.ok) { triggerAlert("success", "Deleted", "Project deleted successfully."); fetchAllData(); }
          else triggerAlert("error", "Error", "Could not delete project.");
        } catch (err) { triggerAlert("error", "Error", err.message); }
      }
    });
    setActiveDropdown(null);
  };

  const handleStatusChange = async (project, newStatus) => {
    if (project.status === newStatus) return;

    if (project._type === "draft" && newStatus === "LIVE") {
      setGoLiveProject(project);
      setView("golive");
      setActiveDropdown(null);
      return;
    }

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      if (project._type === "draft") {
        if (newStatus === "LIVE" || newStatus === "HOLD" || newStatus === "CLOSED") {
          const promoteBody = {
            excludeSat: false,
            excludeSun: true,
            includeMandatory: true,
            coyHolidays: true,
            pltHolidays: true,
            extHolidays: false
          };
          const res = await fetch(`${apiBaseUrl}/api/project-live/promote/${project.id}`, {
            method: "POST",
            headers,
            body: JSON.stringify(promoteBody)
          });
          if (res.ok) {
            const text = await res.text();
            let result = {};
            try { if (text) result = JSON.parse(text); } catch (e) { }

            const newLiveId = result?.prjId || result?.id || project.id;
            if (newLiveId) {
              if (newStatus === "HOLD" || newStatus === "CLOSED") {
                try {
                  await fetch(`${apiBaseUrl}/api/project-live/${newLiveId}/status`, {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({ prjSts: newStatus })
                  });
                } catch (e) {
                  console.warn("Failed to patch status after promotion:", e);
                }
              }
              const statusOverrides = JSON.parse(localStorage.getItem("project_status_overrides") || "{}");
              statusOverrides[newLiveId] = newStatus;
              localStorage.setItem("project_status_overrides", JSON.stringify(statusOverrides));
            }

            triggerAlert("success", "Success", `Project promoted and set to ${newStatus} successfully!`);
            fetchAllData();
          } else {
            let errText = "Failed to promote project.";
            try { errText = await res.text() || errText; } catch (e) { }
            triggerAlert("error", "Error", errText);
          }
        }
      } else {
        const res = await fetch(`${apiBaseUrl}/api/project-live/${project.id}/status`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ prjSts: newStatus })
        });
        if (res.ok) {
          const statusOverrides = JSON.parse(localStorage.getItem("project_status_overrides") || "{}");
          statusOverrides[project.id] = newStatus;
          localStorage.setItem("project_status_overrides", JSON.stringify(statusOverrides));

          triggerAlert("success", "Success", `Project status updated to ${newStatus} successfully!`);
          fetchAllData();
        } else {
          const errText = await res.text();
          triggerAlert("error", "Error", errText || "Failed to update project status.");
        }
      }
    } catch (err) {
      console.error("Error changing status:", err);
      triggerAlert("error", "Error", `Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeGoLive = async (project, settings) => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      let promoteBody = {
        excludeSat: false,
        excludeSun: true,
        includeMandatory: true,
        coyHolidays: false,
        pltHolidays: false,
        extHolidays: false
      };

      if (settings.mode === 'existing') {
        const { company, plant, external } = settings.existingSelection || {};
        promoteBody.coyHolidays = !!company;
        promoteBody.pltHolidays = !!plant;
        promoteBody.extHolidays = !!external;
        if (settings.excludeSat !== undefined) promoteBody.excludeSat = settings.excludeSat;
        if (settings.excludeSun !== undefined) promoteBody.excludeSun = settings.excludeSun;
      } else if (settings.mode === 'custom') {
        const { saturday, sunday, publicHolidays } = settings.customSettings || {};
        promoteBody.excludeSat = !!saturday?.active;
        promoteBody.excludeSun = !!sunday?.active;
        promoteBody.coyHolidays = !!publicHolidays?.company;
        promoteBody.pltHolidays = !!publicHolidays?.plant;
        promoteBody.extHolidays = !!publicHolidays?.external;
      }

      const res = await fetch(`${apiBaseUrl}/api/project-live/promote/${project.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify(promoteBody)
      });
      if (res.ok) {
        const text = await res.text();
        let result = {};
        try { if (text) result = JSON.parse(text); } catch (e) { }

        triggerAlert("success", "Success", "Project promoted to Live successfully!");
        setView("list");
        setGoLiveProject(null);
        fetchAllData();
      } else {
        let errText = "Failed to promote project.";
        try { errText = await res.text() || errText; } catch (e) { }
        triggerAlert("error", "Error", errText);
      }
    } catch (err) {
      console.error("Error promoting to live:", err);
      triggerAlert("error", "Error", `Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProjects = React.useMemo(() => {
    let sortable = [...projects];
    if (sortConfig.key !== null) {
      sortable.sort((a, b) => {
        const valA = (a[sortConfig.key] || "").toString().toLowerCase();
        const valB = (b[sortConfig.key] || "").toString().toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [projects, sortConfig]);

  // ─── Filtering logic (including search) ─────────────────────────
  const filteredProjects = sortedProjects.filter(p => {
    // Search filter (project name or code)
    const searchLower = searchQuery.toLowerCase().trim();
    const matchSearch = !searchLower ||
      p.projectName?.toLowerCase().includes(searchLower) ||
      p.projectCode?.toLowerCase().includes(searchLower);

    // Status tab filter
    let tabMatch = true;
    if (statusTab === 'Draft') {
      tabMatch = p.status.toUpperCase() === 'DRAFT';
    } else if (statusTab === 'Live') {
      tabMatch = p.status.toUpperCase() === 'LIVE';
    } else if (statusTab === 'Hold') {
      tabMatch = p.status.toUpperCase() === 'HOLD';
    } else if (statusTab === 'Closed') {
      tabMatch = p.status.toUpperCase() === 'CLOSED';
    }
    // 'All' – no filter

    return matchSearch && tabMatch;
  });

  const currentItems = filteredProjects;
  const indexOfFirstItem = 0;

  // ─── Search handler ──────────────────────────────────────────────
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleTabChange = (status) => {
    // 1. Scroll to top/left BEFORE the state update so the browser doesn't try to clamp the scroll position
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
    const elementsToScroll = document.querySelectorAll('.proj-shell, .proj-shell-container, .proj-main, .proj-table-container, #root');
    elementsToScroll.forEach(el => { 
      el.scrollTop = 0; 
      el.scrollLeft = 0; 
    });

    // 2. Trigger the state updates
    setStatusTab(status);
    setCurrentPage(1);

    // 3. Scroll to top/left AFTER the state update in the next animation frame and a short timeout
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      elementsToScroll.forEach(el => { 
        el.scrollTop = 0; 
        el.scrollLeft = 0; 
      });
      
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
        elementsToScroll.forEach(el => { 
          el.scrollTop = 0; 
          el.scrollLeft = 0; 
        });
      }, 50);
    });
  };

  const vibrantBlue = "#2563eb";

  return (
    <div className="proj-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="proj-shell">

        <Header
          title="Project Creation"
          showSearch={false}
          userName="Syed Mohammad Johny Basha"
          userRole="Web Developer"
          initials="SB"
        />

        <main className="proj-main" style={{ padding: '24px' }}>

          {view === "form" ? (
            <>
              <div className="proj-content" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto' }}>

                <div className="proj-form-card" style={{
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
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#0f172a',
                      margin: 0
                    }}>
                      {isEditing ? "Edit Project" : "Add New Project"}
                    </h2>
                    <button
                      type="button"
                      className="proj-nav-view-btn"
                      onClick={() => {
                        setView("list");
                        handleResetForm();
                        setIsEditing(false);
                        setEditingId(null);
                      }}
                    >
                      <ChevronLeft size={15} /> Back to Project List
                    </button>
                  </div>

                  <div style={{ padding: '24px' }}>
                    {success && (
                      <div className="proj-success-alert" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: '#dcfce7', borderRadius: '6px', color: '#166534', marginBottom: '20px', border: '1px solid #86efac' }}>
                        <CheckCircle size={18} />
                        <span>Project configured and saved successfully!</span>
                      </div>
                    )}

                    <section className="proj-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                          Project Information
                        </h3>
                        
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          padding: '6px 18px',           
                          borderRadius: '24px',
                          fontSize: '14px',              
                          fontWeight: '700',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          letterSpacing: '0.3px'
                        }}>
                          Draft
                        </span>
                      </div>

                      <div className="proj-form-layout-row columns-4">
                        <label className="proj-field-item">
                          <span>Project Code <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="projectCode" value={form.projectCode} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-generated code" />
                          <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Must be unique.</small>
                        </label>
                        <label className="proj-field-item">
                          <span>Project Name <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="projectName" value={form.projectName} onChange={handleChange} placeholder="Enter project name" maxLength={100} />
                        </label>
                        <label className="proj-field-item">
                          <span>Project Priority <b style={{ color: '#ef4444' }}>*</b></span>
                          <select name="priority" value={form.priority} onChange={handleChange}>
                            <option value="HIGH">🔴 HIGH</option>
                            <option value="NORMAL">🔵 NORMAL</option>
                            <option value="MEDIUM">🟡 MEDIUM</option>
                            <option value="LOW">🟢 LOW</option>
                          </select>
                        </label>
                        <label className="proj-field-item">
                          <span>Project Logo</span>
                          <div className="proj-logo-row">
                            <div className="proj-logo-box" style={{ width: '48px', height: '48px', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                              {imagePreview ? <img src={imagePreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={22} style={{ color: '#94a3b8' }} />}
                            </div>
                            <input id="logoUploadHidden" type="file" accept="image/*" onChange={handleImageChange} hidden />
                            <button type="button" onClick={() => document.getElementById("logoUploadHidden").click()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#0f172a', cursor: 'pointer' }}>
                              <Upload size={14} /> Upload Logo
                            </button>
                          </div>
                        </label>
                      </div>

                      <div className="proj-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                        <label className="proj-field-item" style={{ gridColumn: 'span 2' }}>
                          <span>Project Description <b style={{ color: '#ef4444' }}>*</b></span>
                          <textarea name="projectDescription" value={form.projectDescription} onChange={handleChange} placeholder="Brief description of the project" maxLength={250} />
                        </label>
                        <label className="proj-field-item">
                          <span>Project Objective <b style={{ color: '#ef4444' }}>*</b></span>
                          <textarea name="projectObjective" value={form.projectObjective} onChange={handleChange} onKeyDown={handleBulletKeyDown} onFocus={handleBulletFocus} placeholder="Key objective of the project" maxLength={255} />
                        </label>
                        <label className="proj-field-item">
                          <span>Expected Deliverables <b style={{ color: '#ef4444' }}>*</b></span>
                          <textarea name="expectedDeliverables" value={form.expectedDeliverables} onChange={handleChange} onKeyDown={handleBulletKeyDown} onFocus={handleBulletFocus} placeholder="What will be delivered" maxLength={255} />
                        </label>
                      </div>
                    </section>

                    <section className="proj-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="proj-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Organization Details</h3>

                      {/* ─── Radio Buttons for Company / Plant ─── */}
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ marginRight: '20px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
                          <input
                            type="radio"
                            name="organizationType"
                            value="company"
                            checked={form.organizationType === 'company'}
                            onChange={() => setForm(prev => ({ ...prev, organizationType: 'company', companyName: '', plantName: '' }))}
                          /> Company
                        </label>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>
                          <input
                            type="radio"
                            name="organizationType"
                            value="plant"
                            checked={form.organizationType === 'plant'}
                            onChange={() => setForm(prev => ({ ...prev, organizationType: 'plant', companyName: '', plantName: '' }))}
                          /> Plant
                        </label>
                      </div>

                      <div className="proj-form-layout-row columns-4">
                        {form.organizationType === 'company' ? (
                          <label className="proj-field-item">
                            <span>Company <b style={{ color: '#ef4444' }}>*</b></span>
                            <SearchableSelect
                              name="companyName"
                              value={form.companyName}
                              onChange={handleChange}
                              placeholder="Select Company"
                              options={companies.map(c => ({ value: c.coyId, label: c.coyNm }))}
                            />
                          </label>
                        ) : (
                          <label className="proj-field-item">
                            <span>Plant <b style={{ color: '#ef4444' }}>*</b></span>
                            <SearchableSelect
                              name="plantName"
                              value={form.plantName}
                              onChange={handleChange}
                              placeholder="Select Plant"
                              options={plants.map(p => ({ value: p.pltId, label: p.pltNm }))}
                            />
                          </label>
                        )}
                        <label className="proj-field-item">
                          <span>Department <b style={{ color: '#ef4444' }}>*</b></span>
                          <SearchableSelect
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            placeholder="Select Department"
                            options={departments.map(d => ({ value: d.deptId, label: d.deptNm }))}
                          />
                        </label>
                        <label className="proj-field-item">
                          <span>Created By <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="createdBy" value={form.createdBy} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} />
                        </label>
                      </div>

                      <div className="proj-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                        <label className="proj-field-item">
                          <span>Total Project Days <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="totalProjectDays" value={form.totalProjectDays} onChange={handleChange} placeholder="Enter total days" />
                          <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Auto calculates end date (inclusive)</small>
                        </label>
                        <label className="proj-field-item">
                          <span>Tentative Start Date <b style={{ color: '#ef4444' }}>*</b></span>
                          <DatePicker
                            name="startDate"
                            value={form.startDate}
                            onChange={handleChange}
                            placeholder="dd/mm/yyyy"
                          />
                        </label>
                        <label className="proj-field-item">
                          <span>Tentative End Date <b style={{ color: '#ef4444' }}>*</b></span>
                          <DatePicker
                            name="endDate"
                            value={form.endDate}
                            onChange={handleChange}
                            placeholder="dd/mm/yyyy"
                            minDate={form.startDate}
                          />
                          <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>(End Date Will Auto Calculate)</small>
                        </label>
                      </div>
                    </section>

                    <section className="proj-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="proj-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}> Information</h3>

                      <div className="proj-form-layout-row columns-4">
                        <label className="proj-field-item" style={{ gridColumn: 'span 4' }}>
                          <span>Remarks</span>
                          <textarea name="remarks" value={form.remarks} onChange={handleChange} placeholder="Any remarks" maxLength={255} rows={3} />
                        </label>
                      </div>
                    </section>
                  </div>

                  <div className="proj-form-footer" style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    padding: '16px 24px',
                    backgroundColor: '#fafbfc',
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    <button type="button" className="proj-btn primary" onClick={handleSave}>
                      <Save size={14} /> {isEditing ? "Update Project" : "Save Project"}
                    </button>

                    <button type="button" className="proj-btn secondary" onClick={() => {
                      setView("list");
                      handleResetForm();
                      setIsEditing(false);
                      setEditingId(null);
                    }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="proj-content" style={{ maxWidth: '1280px', margin: '0 auto' }}>

              <div className="proj-table-panel" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                {/* ─── Header with Title, Search, and Add Button ─── */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 24px',
                  borderBottom: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                      Project List
                    </h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
                      View and manage all project records
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search Bar */}
                    <div style={{ position: 'relative', width: '240px' }}>
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 36px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <Search
                        size={18}
                        style={{
                          position: 'absolute',
                          left: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94a3b8'
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: '2px'
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="proj-btn-add-new"
                      onClick={() => {
                        handleResetForm(projects);
                        setIsEditing(false);
                        setView("form");
                      }}
                    >
                      <Plus size={16} /> Add New Project
                    </button>
                  </div>
                </div>

                {/* ─── Status filter tabs ────────────────────────── */}
                <div style={{
                  padding: '8px 24px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: '#fafbfc'
                }}>
                  <button
                    onClick={() => handleTabChange('All')}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: statusTab === 'All' ? '#2563eb' : 'white',
                      color: statusTab === 'All' ? 'white' : '#334155',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => handleTabChange('Draft')}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: statusTab === 'Draft' ? '#2563eb' : 'white',
                      color: statusTab === 'Draft' ? 'white' : '#334155',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    Draft
                  </button>
                  <button
                    onClick={() => handleTabChange('Live')}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: statusTab === 'Live' ? '#2563eb' : 'white',
                      color: statusTab === 'Live' ? 'white' : '#334155',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    Live
                  </button>
                  <button
                    onClick={() => handleTabChange('Hold')}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: statusTab === 'Hold' ? '#2563eb' : 'white',
                      color: statusTab === 'Hold' ? 'white' : '#334155',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    Hold
                  </button>
                  <button
                    onClick={() => handleTabChange('Closed')}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: statusTab === 'Closed' ? '#2563eb' : 'white',
                      color: statusTab === 'Closed' ? 'white' : '#334155',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    Closed
                  </button>
                </div>

                <div className="proj-table-container" style={{ overflowX: 'auto' }}>
                  {/* ─── Loading Spinner ─────────────────────────────── */}
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                      <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <p style={{ marginTop: '12px', fontSize: '14px' }}>Loading projects...</p>
                    </div>
                  ) : (
                    <table className="proj-list-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '2800px' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ width: "50px", padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>S.NO</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LOGO</th>
                          <th
                            className="sortable"
                            onClick={() => handleSort("projectCode")}
                            style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                          >
                            PROJECT CODE{" "}
                            {sortConfig.key === "projectCode" &&
                              (sortConfig.direction === "asc" ? "▲" : "▼")}
                          </th>
                          <th
                            className="sortable"
                            onClick={() => handleSort("projectName")}
                            style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                          >
                            PROJECT NAME{" "}
                            {sortConfig.key === "projectName" &&
                              (sortConfig.direction === "asc" ? "▲" : "▼")}
                          </th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>COMPANY</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PLANT</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DEPARTMENT</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESCRIPTION</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OBJECTIVE</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DELIVERABLES</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRIORITY</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>START DATE</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>END DATE</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL DAYS</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REMARKS</th>
                          <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STATUS</th>
                          <th style={{ textAlign: "center", width: "100px", padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.length > 0 ? (
                          currentItems.map((project, index) => (
                            <tr key={`${project._type}-${project.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td data-label="S.NO" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{indexOfFirstItem + index + 1}</td>
                              <td data-label="LOGO" style={{ padding: '14px 20px' }}>
                                {project.logo ? (
                                  <img src={project.logo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                ) : (
                                  <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                                    <ImageIcon size={16} style={{ color: '#94a3b8' }} />
                                  </div>
                                )}
                              </td>
                              <td data-label="PROJECT CODE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                                <span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                                  {project.projectCode}
                                </span>
                              </td>
                              <td data-label="PROJECT NAME" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}><strong>{project.projectName}</strong></td>
                              <td data-label="COMPANY" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{project.companyName || "N/A"}</td>
                              <td data-label="PLANT" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{project.plantName || "N/A"}</td>
                              <td data-label="DEPARTMENT" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{project.department || "N/A"}</td>
                              <td data-label="DESCRIPTION" style={{ 
                                padding: '14px 20px', 
                                fontSize: '14px', 
                                color: '#334155',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '150px'
                              }}>
                                {project.projectDescription || "N/A"}
                              </td>
                              <td data-label="OBJECTIVE" style={{ 
                                padding: '14px 20px', 
                                fontSize: '13px', 
                                color: '#334155',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '150px'
                              }}>
                                {project.projectObjective || "N/A"}
                              </td>
                              <td data-label="DELIVERABLES" style={{ 
                                padding: '14px 20px', 
                                fontSize: '13px', 
                                color: '#334155',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '150px'
                              }}>
                                {project.expectedDeliverables || "N/A"}
                              </td>
                              <td data-label="PRIORITY" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  display: 'inline-block',
                                  backgroundColor: project.priorityMeta?.bgColor || (
                                    project.priority === 'ATMOST CRITICAL' ? '#7f1d1d18' :
                                      project.priority === 'CRITICAL' ? '#b91c1c18' :
                                        project.priority === 'HIGH' ? '#ef444418' :
                                          project.priority === 'NORMAL' ? '#3b82f618' :
                                            project.priority === 'MEDIUM' ? '#f59e0b18' : '#22c55e18'
                                  ),
                                  color: project.priorityMeta?.color || (
                                    project.priority === 'ATMOST CRITICAL' ? '#7F1D1D' :
                                      project.priority === 'CRITICAL' ? '#B91C1C' :
                                        project.priority === 'HIGH' ? '#EF4444' :
                                          project.priority === 'NORMAL' ? '#3B82F6' :
                                            project.priority === 'MEDIUM' ? '#F59E0B' : '#22C55E'
                                  ),
                                  border: `1px solid ${project.priorityMeta?.borderColor || (
                                    project.priority === 'ATMOST CRITICAL' ? '#7f1d1d40' :
                                      project.priority === 'CRITICAL' ? '#b91c1c40' :
                                        project.priority === 'HIGH' ? '#ef444440' :
                                          project.priority === 'NORMAL' ? '#3b82f640' :
                                            project.priority === 'MEDIUM' ? '#f59e0b40' : '#22c55e40'
                                  )}`
                                }}>
                                  {project.priority}
                                </span>
                              </td>
                              <td data-label="START DATE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{formatListDate(project.startDate)}</td>
                              <td data-label="END DATE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{formatListDate(project.endDate)}</td>
                              <td data-label="TOTAL DAYS" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{project.totalProjectDays || "N/A"}</td>
                              <td data-label="REMARKS" style={{ 
                                padding: '14px 20px', 
                                fontSize: '14px', 
                                color: '#334155',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '150px'
                              }}>
                                {project.remarks || "N/A"}
                              </td>
                              <td data-label="STATUS" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                                {project.status.toUpperCase() === 'CLOSED' ? (
                                  <span style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    backgroundColor: '#fee2e2',
                                    color: '#991b1b',
                                    display: 'inline-block',
                                    border: '1px solid #fecaca'
                                  }}>
                                    Closed
                                  </span>
                                ) : (
                                  <select
                                    value={project.status}
                                    onChange={(e) => handleStatusChange(project, e.target.value)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      border: '1px solid #cbd5e1',
                                      outline: 'none',
                                      cursor: 'pointer',
                                      backgroundColor: project.status === 'LIVE' || project.status === 'Live' ? '#dcfce7' :
                                        project.status === 'DRAFT' || project.status === 'Draft' ? '#fefce8' :
                                          project.status === 'IN_PROGRESS' || project.status === 'In Progress' ? '#eff6ff' :
                                            project.status === 'HOLD' || project.status === 'Hold' ? '#fef3c7' : '#fee2e2',
                                      color: project.status === 'LIVE' || project.status === 'Live' ? '#166534' :
                                        project.status === 'DRAFT' || project.status === 'Draft' ? '#854d0e' :
                                          project.status === 'IN_PROGRESS' || project.status === 'In Progress' ? '#1e40af' :
                                            project.status === 'HOLD' || project.status === 'Hold' ? '#92400e' : '#991b1b'
                                    }}
                                  >
                                    {(() => {
                                      const upper = project.status.toUpperCase();
                                      if (upper === "DRAFT") {
                                        return (
                                          <>
                                            <option value={project.status} disabled style={{ display: 'none' }}>Draft</option>
                                            <option value="LIVE">Live</option>
                                          </>
                                        );
                                      } else {
                                        return (
                                          <>
                                            {upper !== "LIVE" && <option value="LIVE">Live</option>}
                                            {upper !== "HOLD" && <option value="HOLD">Hold</option>}
                                            {upper !== "CLOSED" && <option value="CLOSED">Closed</option>}
                                            <option value={project.status} disabled style={{ display: 'none' }}>
                                              {project.status === "LIVE" ? "Live" : project.status === "HOLD" ? "Hold" : "Closed"}
                                            </option>
                                          </>
                                        );
                                      }
                                    })()}
                                  </select>
                                )}
                              </td>
                              <td data-label="ACTIONS" style={{ position: "relative", padding: '14px 20px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }}
                                  onClick={() => toggleDropdown(`${project._type}-${project.id}`)}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <MoreVertical size={18} />
                                </button>

                                {activeDropdown === `${project._type}-${project.id}` && (() => {
                                  const isNearBottom = currentItems.length > 1 && index >= Math.max(1, currentItems.length - 3);
                                  return (
                                    <>
                                      <div
                                        className="proj-actions-dropdown-backdrop"
                                        onClick={() => setActiveDropdown(null)}
                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                                      />
                                      <div
                                        className="proj-actions-dropdown-menu"
                                        style={{
                                          position: 'absolute',
                                          right: '30px',
                                          ...(isNearBottom ? { bottom: '8px', top: 'auto' } : { top: '8px', bottom: 'auto' }),
                                          backgroundColor: 'white',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: '8px',
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                          zIndex: 10,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          padding: '4px 0',
                                          minWidth: '170px'
                                        }}
                                      >
                                        <button
                                          type="button"
                                          style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                          onClick={() => {
                                            if (project._type === 'live') {
                                              navigate(`/project-details/${project.id}`, { state: { viewMode: 'live' } });
                                            } else {
                                              navigate(`/project-details/${project.id}`, { state: { viewMode: 'milestones_only' } });
                                            }
                                            setActiveDropdown(null);
                                          }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          <Eye size={15} /> View
                                        </button>
                                        {project._type !== 'live' && (
                                          <>
                                            <button
                                              type="button"
                                              style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#2563eb', borderRadius: '4px', margin: '2px 4px' }}
                                              onClick={() => handleDuplicate(project)}
                                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                              <Copy size={15} /> Duplicate (Template)
                                            </button>
                                            <button
                                              type="button"
                                              style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                              onClick={() => handleEdit(project)}
                                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                              <Edit size={15} /> Edit
                                            </button>
                                            <button
                                              type="button"
                                              style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ef4444', borderRadius: '4px', margin: '2px 4px' }}
                                              onClick={() => handleDelete(project.id)}
                                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                              <Trash2 size={15} /> Delete
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="17" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>
                              No project records found. Add a new project using the button above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            </div>
          )}
        </main>
      </div>

      {showDeactivateModal && (
        <div className="proj-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="proj-modal" style={{ backgroundColor: 'white', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <div className="proj-modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Close Project Record</h3>
              <button
                type="button"
                className="proj-modal-close"
                onClick={() => setShowDeactivateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="proj-modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '14px' }}>Are you sure you want to close this project record?</p>
              <p className="proj-modal-warning" style={{ margin: 0, color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>
                This will change its status to Closed.
              </p>
            </div>
            <div className="proj-modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                className="proj-btn-cancel-modal"
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="proj-btn-delete-modal"
                onClick={confirmDeactivate}
              >
                <Trash2 size={14} /> Close Project
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false, onConfirm: null }))}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
      {goLiveProject && (
        <GoLiveCalendar
          project={goLiveProject}
          onCancel={() => { setGoLiveProject(null); }}
          onPreview={(settings) => executeGoLive(goLiveProject, settings)}
        />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProjectCreation;
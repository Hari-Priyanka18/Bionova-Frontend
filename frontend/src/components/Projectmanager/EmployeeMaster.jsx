import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Menu,
  RefreshCcw,
  Save,
  Trash2,
  User,
  Search,
  X,
  MoreVertical,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Image,
  Lock,
  Plus,
  Building,
  Factory,
  Users,
  Briefcase,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  CheckSquare
} from "lucide-react";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import AlertModal from "../AlertModal.jsx";
import { getScreenPermission } from "../../utils/permissions";
import "../../styles/EmployeeMaster.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

const SearchableSelect = ({ options, value, onChange, placeholder, name, style, disabled, allowCustom, hideSearch, bottomFixedOption }) => {
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
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px',
          background: disabled ? '#f1f5f9' : 'white', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '40px', fontSize: '14px', color: disabled ? '#94a3b8' : '#0f172a'
        }}
      >
        <span>{selected ? selected.label : (value && allowCustom ? value : (placeholder || "Select..."))}</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>▼</span>
      </div>
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
          marginTop: '4px', zIndex: 999, maxHeight: '250px', overflowY: 'auto',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
        }} onClick={e => e.stopPropagation()}>
          {!hideSearch && (
            <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #e2e8f0', zIndex: 2 }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
          <div style={{ padding: '4px 0' }}>
            {allowCustom && search.trim() && !options.some(o => o.label.toLowerCase() === search.toLowerCase()) && (
              <div 
                onClick={() => {
                  onChange({ target: { name, value: search.trim() } });
                  setIsOpen(false);
                  setSearch("");
                }}
                style={{ padding: '8px 16px', cursor: 'pointer', background: '#eef2ff', fontSize: '14px', color: '#2563eb', fontWeight: '500' }}
                onMouseOver={e => e.target.style.background = '#e0e7ff'}
                onMouseOut={e => e.target.style.background = '#eef2ff'}
              >
                + Add "{search.trim()}"
              </div>
            )}
            {filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange({ target: { name, value: opt.value } });
                  setIsOpen(false);
                  setSearch("");
                }}
                style={{ padding: '8px 16px', cursor: 'pointer', background: String(value) === String(opt.value) ? '#f1f5f9' : 'white', fontSize: '14px', color: '#334155' }}
                onMouseOver={e => e.target.style.background = '#f8fafc'}
                onMouseOut={e => e.target.style.background = String(value) === String(opt.value) ? '#f1f5f9' : 'white'}
              >
                {opt.label}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: '8px 16px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>No results found</div>}
          </div>
          {bottomFixedOption && (
            <div
              onClick={() => {
                onChange({ target: { name, value: bottomFixedOption.value } });
                setIsOpen(false);
                setSearch("");
              }}
              style={{ padding: '10px 16px', cursor: 'pointer', background: 'white', borderTop: '1px solid #e2e8f0', fontSize: '14px', color: '#2563eb', fontWeight: '600', position: 'sticky', bottom: 0, zIndex: 3 }}
              onMouseOver={e => e.target.style.background = '#f8fafc'}
              onMouseOut={e => e.target.style.background = 'white'}
            >
              {bottomFixedOption.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MaskedDateInput = React.forwardRef(({ value, onClick, onChange, placeholder, style, className }, ref) => {
  const [localValue, setLocalValue] = React.useState(value || "");

  React.useEffect(() => {
    if (value === "" && localValue.length > 0 && localValue.length < 10) return;
    setLocalValue(value || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e) => {
    let input = e.target.value.replace(/\D/g, ""); 
    if (input.length > 8) input = input.slice(0, 8); 

    let formatted = input;
    if (input.length >= 5) {
      formatted = `${input.slice(0, 2)}/${input.slice(2, 4)}/${input.slice(4)}`;
    } else if (input.length >= 3) {
      formatted = `${input.slice(0, 2)}/${input.slice(2)}`;
    }

    setLocalValue(formatted);
    if (onChange) {
      if (formatted.length === 10) { e.target.value = formatted; onChange(e); }
      else { e.target.value = ""; onChange(e); }
    }
  };

  const handleBlur = () => {
    if (localValue.length > 0 && localValue.length < 10) {
      setLocalValue("");
      if (onChange) onChange({ target: { value: "" } });
    }
  };

  return (
    <input
      type="text"
      ref={ref}
      value={localValue}
      onClick={onClick}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      style={style}
      className={className}
      maxLength="10"
    />
  );
});
MaskedDateInput.displayName = 'MaskedDateInput';

const EmployeeCreation = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('EMPLOYEE_CREATION');
  // API States
  const [employees, setEmployees] = useState([]);
  const [externalEmployees, setExternalEmployees] = useState([]);
  const [activeEmployeeTab, setActiveEmployeeTab] = useState("INTERNAL"); // INTERNAL, EXTERNAL
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Views & UI States
  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [liveTasks, setLiveTasks] = useState([]);
  const [activeOverviewTab, setActiveOverviewTab] = useState(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/assignments`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAssignments(data))
      .catch(err => console.error("Error fetching assignments:", err));
    fetch(`${apiBaseUrl}/api/task-live`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => setLiveTasks(data))
      .catch(err => console.error("Error fetching live tasks:", err));
  }, []);
  const [photo, setPhoto] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ isTop: false, top: 0, bottom: 0, right: 0 });

  // Scroll handler to reposition dropdown dynamically
  useEffect(() => {
    const handleScroll = () => {
      if (activeActionsMenu !== null) {
        const btn = document.getElementById(`action-btn-${activeActionsMenu}`);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          const dropdownHeight = 220;
          const isTop = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
          setDropdownPos({
            isTop,
            top: rect.top,
            bottom: rect.bottom,
            right: window.innerWidth - rect.right
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeActionsMenu]);
  const [formErrors, setFormErrors] = useState({});
  const [extFormErrors, setExtFormErrors] = useState({});
  const [showExtModal, setShowExtModal] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  const triggerAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({
    code: "",
    name: "",
    description: "",
    status: ""
  });

  // Designation Modal State
  const [showDesigModal, setShowDesigModal] = useState(false);
  const [isEditingDesig, setIsEditingDesig] = useState(false);
  const [editingDesigId, setEditingDesigId] = useState(null);
  const [desigForm, setDesigForm] = useState({
    code: "",
    name: "",
    description: ""
  });
  const [customDesignations, setCustomDesignations] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [mappings, setMappings] = useState([]);

  // Employee Form State
  const [form, setForm] = useState({
    employeeCode: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    email: "",
    mobile: "",
    bloodGroup: "",
    address: "",
    photoPath: "",
    joiningDate: "",
    designation: "",
    workingFor: "company",
    company: "",
    plant: "",
    department: "",
    workLocation: "",
    reportingManager: "",
    username: "",
    password: "",
    confirmPassword: "",
    status: "",
    employmentType: "",
    role: "user"
  });

  const [extForm, setExtForm] = useState({
    extEmpCode: "",
    extEmpNm: "",
    email: "",
    mobNum: "",
    companyNm: "",
    photoPath: "",
    repEmpId: "",
    sts: true
  });
  const [isExtEditing, setIsExtEditing] = useState(false);
  const [isExtViewing, setIsExtViewing] = useState(false);
  const [extEditId, setExtEditId] = useState(null);

  const handleExtReset = () => {
    setExtForm({
      extEmpCode: generateExtEmployeeCode(),
      extEmpNm: "",
      email: "",
      mobNum: "",
      companyNm: "",
      photoPath: "",
      repEmpId: "",
      sts: true
    });
    setExtFormErrors({});
    setIsExtEditing(false);
    setIsExtViewing(false);
    setExtEditId(null);
  };

  const generateEmployeeCode = (empList = employees) => {
    let maxNum = 0;
    if (Array.isArray(empList)) {
      empList.forEach(e => {
        const code = e.empCode || e.employeeCode || "";
        const match = code.match(/^EMP-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
    }
    return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const generateExtEmployeeCode = (empList = externalEmployees) => {
    let maxNum = 0;
    if (Array.isArray(empList)) {
      empList.forEach(e => {
        const code = e.extEmpCode || "";
        const match = code.match(/^EXT-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
    }
    return `EXT-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const generateDesignationCode = (dList = designations) => {
    let maxNum = 0;
    if (Array.isArray(dList)) {
      dList.forEach(d => {
        const code = d.desigCd || d.code || d.designationCode || "";
        const match = code.match(/^DESG-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
    }
    return `DESG-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const generateDepartmentCode = (dList = departments) => {
    let maxNum = 0;
    if (Array.isArray(dList)) {
      dList.forEach(d => {
        const code = d.deptCd || d.code || d.deptCode || "";
        const match = code.match(/^DEPT-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
    }
    return `DEPT-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [empRes, coyRes, pltRes, deptRes, desigRes, mapRes, extEmpRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/employees`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/companies`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/plants`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/departments`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/designations`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/dept-coy-plt-maps`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/external-employees`, { headers: getAuthHeaders() })
      ]);

      const coyData = coyRes.ok ? await coyRes.json() : [];
      const pltData = pltRes.ok ? await pltRes.json() : [];
      const deptData = deptRes.ok ? await deptRes.json() : [];
      const desigData = desigRes.ok ? await desigRes.json() : [];
      const mapData = mapRes.ok ? await mapRes.json() : [];

      if (empRes.ok) {
        const data = await empRes.json();
        const mappedEmps = data.map(emp => {
          const coyNm = coyData.find(c => String(c.coyId || c.id) === String(emp.coyId))?.coyNm || emp.company || "N/A";
          const pltNm = pltData.find(p => String(p.pltId || p.id) === String(emp.pltId))?.pltNm || emp.plant || "N/A";
          const deptNm = deptData.find(d => String(d.deptId || d.id) === String(emp.deptId))?.deptNm || emp.department || "N/A";

          let displayGender = "";
          if (emp.gender) {
            const g = emp.gender.toUpperCase();
            if (g === "MALE") displayGender = "Male";
            else if (g === "FEMALE") displayGender = "Female";
            else displayGender = "Others";
          }

          let displayEmpTyp = "";
          const t = emp.empTyp || "";
          if (t === "RET" || t === "Retainer") {
            displayEmpTyp = "Retainer";
          } else if (t === "CON" || t === "Contract Employee") {
            displayEmpTyp = "Contract Employee";
          } else if (t === "FTE" || t === "Full Time Employee (FTE)" || t === "PER") {
            displayEmpTyp = "Full Time Employee (FTE)";
          } else {
            displayEmpTyp = t;
          }

          const resolvedFirstName = emp.fstNm || emp.firstName || "";
          const resolvedLastName = emp.lstNm || emp.lastName || "";

          let resolvedDesignation = emp.designation || emp.role;
          if (!resolvedDesignation) {
            if (emp.desigId === 1) resolvedDesignation = "Site Engineer";
            else if (emp.desigId === 2) resolvedDesignation = "QA Engineer";
            else if (emp.desigId === 3) resolvedDesignation = "Reviewer";
            else if (emp.desigId === 4) resolvedDesignation = "Project Manager";
            else resolvedDesignation = emp.desigId ? `Designation ${emp.desigId}` : "N/A";
          }
          const repManager = data.find(e => String(e.empId || e.id) === String(emp.repManId));
          const repManagerName = repManager ? `${repManager.fstNm || repManager.firstName || ""} ${repManager.lstNm || repManager.lastName || ""}`.trim() : (emp.repManId ? `Employee ${emp.repManId}` : "N/A");

          return {
            ...emp,
            id: emp.empId || emp.id,
            employeeCode: emp.empCode || emp.employeeCode || "",
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            employeeName: `${resolvedFirstName} ${resolvedLastName}`.trim(),
            gender: displayGender || emp.gender || "",
            dateOfBirth: emp.dob || emp.dateOfBirth || "",
            mobile: emp.mobNum || emp.mobile || "",
            bloodGroup: emp.bldGrp || emp.bloodGroup || "",
            photoPath: emp.photoUrl || emp.photoPath || "",
            joiningDate: emp.doj || emp.joiningDate || "",
            workLocation: emp.wLoc || emp.wloc || emp.workLocation || "",
            status: emp.sts === true || emp.status === true || emp.status === "Active" ? "Active" : "Inactive",
            company: coyNm,
            plant: pltNm,
            department: deptNm,
            employmentType: displayEmpTyp,
            designation: resolvedDesignation,
            reportingManager: repManagerName,
            workingFor: emp.pltId ? "plant" : "company"
          };
        });
        setEmployees(mappedEmps);
        setForm(prev => {
          if (!prev.employeeCode || /^EMP-\d+$/i.test(prev.employeeCode)) {
            return { ...prev, employeeCode: generateEmployeeCode(mappedEmps) };
          }
          return prev;
        });
      }

      if (extEmpRes && extEmpRes.ok) {
        const extData = await extEmpRes.json();
        setExternalEmployees(extData || []);
      }

      setCompanies(coyData);
      setPlants(pltData);
      setDepartments(deptData);
      setDesignations(desigData);
      setMappings(mapData);
    } catch (err) {
      console.error("Error fetching data:", err);
      // alertConfig might not be available right away, so we just log
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const validateField = (name, value, currentForm = form) => {
    let error = "";
    if (name === "email" || name === "username") {
      const emailVal = value.trim();
      if (!emailVal) {
        error = "Email is required.";
      } else if (!emailVal.toLowerCase().endsWith("@gmail.com")) {
        error = "Email must end with @gmail.com.";
      }
    } else if (name === "password") {
      if (!value) {
        error = "Password is required.";
      } else {
        const hasUpper = /[A-Z]/.test(value);
        const hasLower = /[a-z]/.test(value);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
        if (!hasUpper || !hasLower || !hasSpecial) {
          error = "Password must include at least one uppercase letter, one lowercase letter, and one special character.";
        }
      }
    } else if (name === "confirmPassword") {
      if (!value) {
        error = "Confirm Password is required.";
      } else if (value !== currentForm.password) {
        error = "Passwords does not match.";
      }
    } else if (name === "mobile") {
      const mobileVal = value.trim();
      if (!mobileVal) {
        error = "Mobile Number is required.";
      } else if (!/^[6789]/.test(mobileVal)) {
        error = "Mobile Number must start with 6, 7, 8, or 9.";
      } else if (mobileVal.length > 0 && mobileVal.length < 10) {
        error = "Mobile Number must be exactly 10 digits.";
      }
    } else if (name === "employeeCode") {
      if (/\s/.test(value)) {
        error = "Spaces are not allowed in Employee Code.";
      }
    } else if (name === "firstName" || name === "lastName") {
      if (/[^a-zA-Z\s]/.test(value)) {
        error = "Only letters and spaces are allowed.";
      }
    }
    return error;
  };

  // Handle Input Change for Employee Form
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Check if user clicked "+ Create Department"
    if (name === "department" && value === "CREATE_NEW") {
      setDeptForm({ code: generateDepartmentCode(departments), name: "", description: "", status: "" });
      setShowDeptModal(true);
      setForm((prev) => ({ ...prev, department: "" }));
      return;
    }
    // Check if user clicked "+ Create Designation"
    if (name === "designation" && value === "CREATE_NEW") {
      setDesigForm({ code: generateDesignationCode(designations), name: "", description: "" });
      setShowDesigModal(true);
      setForm((prev) => ({ ...prev, designation: "" }));
      return;
    }

    if (name === "workingFor") {
      setForm((prev) => ({
        ...prev,
        workingFor: value,
        company: "",
        plant: "",
        department: ""
      }));
      setFormErrors((prevErrors) => ({
        ...prevErrors,
        company: "",
        plant: "",
        department: ""
      }));
      return;
    }

    if (name === "company") {
      const selectedCompany = companies.find(c => String(c.coyId || c.id) === String(value));
      const location = selectedCompany ? (selectedCompany.ctVlg || "") : "";
      setForm((prev) => ({
        ...prev,
        company: value,
        workLocation: location,
        department: ""
      }));
      setFormErrors((prevErrors) => ({
        ...prevErrors,
        company: "",
        workLocation: "",
        department: ""
      }));
      return;
    }

    if (name === "plant") {
      const selectedPlant = plants.find(p => String(p.pltId || p.id) === String(value));
      const location = selectedPlant ? (selectedPlant.addr || "") : "";
      setForm((prev) => ({
        ...prev,
        plant: value,
        workLocation: location,
        department: ""
      }));
      setFormErrors((prevErrors) => ({
        ...prevErrors,
        plant: "",
        workLocation: "",
        department: ""
      }));
      return;
    }

    let newValue = value;
    if (name === "employeeCode") {
      newValue = value.slice(0, 10);
    } else if (name === "firstName" || name === "lastName") {
      newValue = value.slice(0, 50);
    } else if (name === "gender") {
      newValue = value.slice(0, 10);
    } else if (name === "email" || name === "username") {
      newValue = value.slice(0, 50);
    } else if (name === "mobile") {
      newValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    } else if (name === "bloodGroup") {
      newValue = value.slice(0, 20);
    } else if (name === "address") {
      newValue = value.slice(0, 255);
    } else if (name === "workLocation") {
      newValue = value.slice(0, 100);
    } else if (name === "password" || name === "confirmPassword") {
      newValue = value.slice(0, 50);
    }

    if (name === "email" || name === "username") {
      setForm((prev) => {
        const updatedForm = { ...prev, email: newValue, username: newValue };
        const error = validateField("email", newValue, updatedForm);
        setFormErrors((prevErrors) => ({ ...prevErrors, email: error }));
        return updatedForm;
      });
    } else {
      setForm((prev) => {
        const updatedForm = { ...prev, [name]: newValue };
        const error = validateField(name, newValue, updatedForm);
        setFormErrors((prevErrors) => {
          let updatedErrors = { ...prevErrors, [name]: error };
          if (name === "password") {
            const confirmError = validateField("confirmPassword", updatedForm.confirmPassword, updatedForm);
            updatedErrors.confirmPassword = confirmError;
          }
          return updatedErrors;
        });
        return updatedForm;
      });
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      const response = await fetch(`${apiBaseUrl}/api/storage/upload/employee-photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("authToken") || ""}` },
        body: formDataUpload
      });
      if (!response.ok) throw new Error("Photo upload failed");
      const data = await response.json();
      setPhoto(data.url);
      setForm((prev) => ({ ...prev, photoPath: data.url }));
    } catch (err) {
      console.error("Employee photo upload error:", err);
    }
  };

  const handleDeletePhoto = () => {
    setPhoto(null);
    setForm((prev) => ({ ...prev, photoPath: "" }));
    const fileInput = document.getElementById("empPhotoUpload");
    if (fileInput) fileInput.value = "";
  };

  // Handle New Department Modal Input Change
  const handleDeptChange = (e) => {
    const { name, value } = e.target;
    setDeptForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle New Designation Modal Input Change
  const handleDesigChange = (e) => {
    const { name, value } = e.target;
    setDesigForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditDesignation = () => {
    const selectedDesig = designations.find(d => d.desigNm === form.designation);
    if (selectedDesig) {
      setDesigForm({
        code: selectedDesig.desigCd || "",
        name: selectedDesig.desigNm || "",
        description: selectedDesig.desigDesc || ""
      });
      setIsEditingDesig(true);
      setEditingDesigId(selectedDesig.desigId);
      setShowDesigModal(true);
    }
  };

  const handleDeleteDesignation = async () => {
    const selectedDesig = designations.find(d => d.desigNm === form.designation);
    if (!selectedDesig) return;

    if (window.confirm(`Are you sure you want to delete designation "${selectedDesig.desigNm}"?`)) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/designations/${selectedDesig.desigId}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          triggerAlert("success", "Deleted", "Designation deleted successfully!");
          setForm(prev => ({ ...prev, designation: "" }));
          const desigRes = await fetch(`${apiBaseUrl}/api/designations`, { headers: getAuthHeaders() });
          if (desigRes.ok) {
            setDesignations(await desigRes.json());
          }
        } else {
          triggerAlert("error", "Error", "Failed to delete designation.");
        }
      } catch (err) {
        console.error("Error deleting designation:", err);
        triggerAlert("error", "Error", "Server error occurred.");
      }
    }
  };

  // Save New or Edit Designation from Modal
  const handleSaveNewDesignation = async () => {
    if (!desigForm.code.trim() || !desigForm.name.trim()) {
      triggerAlert("error", "Validation Error", "Designation code and name are required.");
      return;
    }

    const trimmedCode = desigForm.code.trim().toUpperCase();
    const codeExists = designations.some(d => {
      const dCode = (d.desigCd || d.code || d.designationCode || "").trim().toUpperCase();
      const dId = d.desigId || d.id;
      if (isEditingDesig && String(dId) === String(editingDesigId)) return false;
      return dCode === trimmedCode;
    });

    if (codeExists) {
      triggerAlert("error", "Already Exists", "Designation code already exists.");
      return;
    }

    const payload = {
      desigCd: trimmedCode,
      desigNm: desigForm.name.trim(),
      desigDesc: desigForm.description.trim()
    };
    try {
      const url = isEditingDesig ? `${apiBaseUrl}/api/designations/${editingDesigId}` : `${apiBaseUrl}/api/designations`;
      const method = isEditingDesig ? "PUT" : "POST";
      const response = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newDesig = await response.json();
        triggerAlert("success", "Success", isEditingDesig ? "Designation updated successfully!" : "Designation created successfully!");
        setDesigForm({ code: "", name: "", description: "" });
        setShowDesigModal(false);
        setIsEditingDesig(false);
        setEditingDesigId(null);
        const desigRes = await fetch(`${apiBaseUrl}/api/designations`, { headers: getAuthHeaders() });
        if (desigRes.ok) {
          setDesignations(await desigRes.json());
        }
        setForm((prev) => ({ ...prev, designation: newDesig.desigNm }));
      } else {
        triggerAlert("error", "Error", "Designation code already exists.");
      }
    } catch (err) {
      console.error("Error saving designation:", err);
      triggerAlert("error", "Error", "Server error occurred.");
    }
  };

  // Save New Department from Modal
  const handleSaveNewDepartment = async () => {
    if (!deptForm.code.trim() || !deptForm.name.trim()) {
      triggerAlert("error", "Validation Error", "Department code and name are required.");
      return;
    }

    const payload = {
      deptCode: deptForm.code.trim().toUpperCase(),
      deptNm: deptForm.name.trim(),
      descr: deptForm.description.trim(),
      sts: deptForm.status === "Inactive" ? false : true
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/departments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const newDept = await response.json();
        triggerAlert("success", "Success", "Department created successfully!");
        setDeptForm({ code: "", name: "", description: "", status: "" });
        setShowDeptModal(false);
        const deptRes = await fetch(`${apiBaseUrl}/api/departments`, { headers: getAuthHeaders() });
        if (deptRes.ok) {
          setDepartments(await deptRes.json());
        }
        setForm((prev) => ({ ...prev, department: String(newDept.deptId || newDept.id) }));
      } else {
        triggerAlert("error", "Error", "Failed to save department. Ensure department code is unique.");
      }
    } catch (err) {
      console.error("Error saving department:", err);
      triggerAlert("error", "Error", "Server error occurred.");
    }
  };

  // Reset Employee Form
  const handleReset = (empList = employees) => {
    setForm({
      employeeCode: generateEmployeeCode(empList),
      firstName: "",
      lastName: "",
      gender: "",
      dateOfBirth: "",
      email: "",
      mobile: "",
      bloodGroup: "",
      address: "",
      photoPath: "",
      joiningDate: "",
      designation: "",
      workingFor: "company",
      company: "",
      plant: "",
      department: "",
      workLocation: "",
      reportingManager: "",
      username: "",
      password: "",
      confirmPassword: "",
      status: "",
      employmentType: "",
      role: "user"
    });
    setFormErrors({});
    setPhoto(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsViewing(false);
  };

  // Save / Submit Employee
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    // 1. Employee Code check
    if (!form.employeeCode.trim()) {
      triggerAlert("error", "Validation Error", "Employee Code is required.");
      return;
    }
    if (/\s/.test(form.employeeCode)) {
      triggerAlert("error", "Validation Error", "Spaces are not allowed in Employee Code.");
      return;
    }
    if (form.employeeCode.length > 10) {
      triggerAlert("error", "Validation Error", "Employee Code cannot exceed 10 characters.");
      return;
    }

    // 2. First Name check
    if (!form.firstName.trim()) {
      triggerAlert("error", "Validation Error", "First Name is required.");
      return;
    }
    if (form.firstName.length > 50) {
      triggerAlert("error", "Validation Error", "First Name cannot exceed 50 characters.");
      return;
    }
    if (/[^a-zA-Z\s]/.test(form.firstName)) {
      triggerAlert("error", "Validation Error", "First Name can only contain letters and spaces.");
      return;
    }

    // 3. Last Name check
    if (!form.lastName.trim()) {
      triggerAlert("error", "Validation Error", "Last Name is required.");
      return;
    }
    if (form.lastName.length > 50) {
      triggerAlert("error", "Validation Error", "Last Name cannot exceed 50 characters.");
      return;
    }
    if (/[^a-zA-Z\s]/.test(form.lastName)) {
      triggerAlert("error", "Validation Error", "Last Name can only contain letters and spaces.");
      return;
    }

    // 4. Gender check
    if (!form.gender) {
      triggerAlert("error", "Validation Error", "Gender selection is required.");
      return;
    }
    if (form.gender.length > 10) {
      triggerAlert("error", "Validation Error", "Gender cannot exceed 10 characters.");
      return;
    }

    // 5. Date of Birth check
    if (!form.dateOfBirth) {
      triggerAlert("error", "Validation Error", "Date of Birth is required.");
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (form.dateOfBirth > todayStr) {
      triggerAlert("error", "Validation Error", "Date of Birth cannot be in the future.");
      return;
    }

    // 6. Employee Email check
    if (!form.email.trim()) {
      triggerAlert("error", "Validation Error", "Employee Email is required.");
      return;
    }
    if (form.email.length > 50) {
      triggerAlert("error", "Validation Error", "Employee Email cannot exceed 50 characters.");
      return;
    }
    const emailVal = form.email.trim();
    if (!emailVal.includes("@") || !emailVal.toLowerCase().endsWith(".com")) {
      triggerAlert("error", "Validation Error", "Please enter a valid Employee Email address (must contain @ and end with .com).");
      return;
    }

    // 7. Mobile Number check
    if (!form.mobile.trim()) {
      triggerAlert("error", "Validation Error", "Mobile Number is required.");
      return;
    }
    const mobileRegex = /^[6789]\d{9}$/;
    if (!mobileRegex.test(form.mobile.trim())) {
      triggerAlert("error", "Validation Error", "Mobile Number must be exactly 10 digits and start with 6, 7, 8, or 9.");
      return;
    }

    // 8. Blood Group check
    if (form.bloodGroup && form.bloodGroup.length > 20) {
      triggerAlert("error", "Validation Error", "Blood Group cannot exceed 20 characters.");
      return;
    }

    // 9. Employee Address check
    if (!form.address.trim()) {
      triggerAlert("error", "Validation Error", "Employee Address is required.");
      return;
    }
    if (form.address.length > 255) {
      triggerAlert("error", "Validation Error", "Employee Address cannot exceed 255 characters.");
      return;
    }

    // 10. Joining Date check
    if (!form.joiningDate) {
      triggerAlert("error", "Validation Error", "Joining Date is required.");
      return;
    }

    // 11. Designation check
    if (!form.designation.trim()) {
      triggerAlert("error", "Validation Error", "Designation is required.");
      return;
    }

    // Employment Type check
    if (!form.employmentType) {
      triggerAlert("error", "Validation Error", "Employment Type is required.");
      return;
    }

    // 12. Company check
    if (form.workingFor === "company" && !form.company) {
      triggerAlert("error", "Validation Error", "Company selection is required.");
      return;
    }

    // 13. Plant check
    if (form.workingFor === "plant" && !form.plant) {
      triggerAlert("error", "Validation Error", "Plant selection is required.");
      return;
    }

    // 14. Department check
    if (!form.department) {
      triggerAlert("error", "Validation Error", "Department selection is required.");
      return;
    }

    // 15. Work Location check
    if (!form.workLocation.trim()) {
      triggerAlert("error", "Validation Error", "Work Location is required.");
      return;
    }
    if (form.workLocation.length > 100) {
      triggerAlert("error", "Validation Error", "Work Location cannot exceed 100 characters.");
      return;
    }

    // 16. Reporting Manager check
    if (!form.reportingManager) {
      triggerAlert("error", "Validation Error", "Reporting Manager is required.");
      return;
    }



    // 17. Username check
    if (!form.username.trim()) {
      triggerAlert("error", "Validation Error", "Username (Email) is required.");
      return;
    }
    if (form.username.length > 50) {
      triggerAlert("error", "Validation Error", "Username cannot exceed 50 characters.");
      return;
    }

    const isPasswordChanged = form.password && form.password !== "********";

    // 18. Password check with complexity rules (only required for new employee, optional for editing if blank)
    if (!isEditing || isPasswordChanged) {
      if (!form.password) {
        triggerAlert("error", "Validation Error", "Password is required.");
        return;
      }
      const hasUpper = /[A-Z]/.test(form.password);
      const hasLower = /[a-z]/.test(form.password);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password);
      if (!hasUpper || !hasLower || !hasSpecial) {
        triggerAlert(
          "error",
          "Validation Error",
          "Password must include at least one uppercase letter, one lowercase letter, and one special character."
        );
        return;
      }
      if (form.password !== form.confirmPassword) {
        triggerAlert("error", "Validation Error", "Password and Confirm Password does not match!");
        return;
      }
    }

    // 19. Status check
    if (!form.status) {
      triggerAlert("error", "Validation Error", "Employee Status is required.");
      return;
    }

    // Unique Employee Code check is handled by backend, but we can do a quick local check
    const isDuplicate = employees.some(
      emp => emp.employeeCode.toLowerCase().trim() === form.employeeCode.toLowerCase().trim() && emp.id !== editId
    );

    if (isDuplicate) {
      triggerAlert("error", "Duplicate Error", "Employee code must be unique. This code already exists.");
      return;
    }

    let empTypVal = "FTE";
    if (form.employmentType === "Retainer") {
      empTypVal = "RET";
    } else if (form.employmentType === "Contract Employee") {
      empTypVal = "CON";
    } else if (form.employmentType === "Full Time Employee (FTE)") {
      empTypVal = "FTE";
    } else {
      empTypVal = form.employmentType;
    }

    let genderVal = "MALE";
    if (form.gender && form.gender.toUpperCase() === "FEMALE") {
      genderVal = "FEMALE";
    } else if (form.gender && (form.gender.toUpperCase() === "OTHERS" || form.gender.toUpperCase() === "OTHER")) {
      genderVal = "OTHER";
    } else if (form.gender) {
      genderVal = form.gender.toUpperCase();
    }

    const payload = {
      empCode: form.employeeCode.trim(),
      fstNm: form.firstName.trim(),
      lstNm: form.lastName.trim(),
      gender: genderVal,
      dob: form.dateOfBirth,
      email: form.email.trim(),
      mobNum: form.mobile.trim(),
      bldGrp: form.bloodGroup || null,
      address: form.address.trim(),
      photoUrl: form.photoPath || null,
      doj: form.joiningDate,
      empTyp: empTypVal,
      designation: form.designation.trim(),
      coyId: form.workingFor === "company" && form.company ? parseInt(form.company) : null,
      pltId: form.workingFor === "plant" && form.plant ? parseInt(form.plant) : null,
      deptId: parseInt(form.department),
      wLoc: form.workLocation.trim(),
      repManId: form.reportingManager ? parseInt(form.reportingManager) : null,
      sts: form.status === "Active",
      role: form.role || "user",
      password: isPasswordChanged ? form.password : null
    };

    if (isEditing) {
      payload.empId = editId;
    }

    setLoading(true);
    try {
      let url = `${apiBaseUrl}/api/employees`;
      let method = "POST";
      if (isEditing) {
        url = `${apiBaseUrl}/api/employees/${editId}`;
        method = "PUT";
      }

      const response = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const successMsg = isEditing 
          ? "Employee updated successfully!" 
          : "Employee created successfully! An email with login credentials (URL, User ID, Password) has been sent.";
        triggerAlert("success", "Success", successMsg);
        setIsEditing(false);
        setEditId(null);
        handleReset();
        setView("list");
        fetchAllData();
      } else {
        let errorMsg = "Ensure Unique constraints are met.";
        try {
          const errorJson = await response.json();
          if (errorJson && errorJson.message) {
            errorMsg = errorJson.message;
          } else {
            errorMsg = JSON.stringify(errorJson);
          }
        } catch (e) {
          const errorText = await response.text();
          if (errorText) errorMsg = errorText;
        }
        triggerAlert("error", "Error", "Failed to save employee: " + errorMsg);
      }
    } catch (err) {
      console.error("Error saving employee:", err);
      triggerAlert("error", "Error", "Server error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit Action
  const handleEdit = (emp) => {
    setForm({
      employeeCode: emp.empCode || emp.employeeCode || "",
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      gender: emp.gender ? (function(g) {
        const u = g.toUpperCase();
        if (u === "MALE") return "Male";
        if (u === "FEMALE") return "Female";
        if (u === "OTHER" || u === "OTHERS") return "Others";
        return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
      })(emp.gender) : "",
      dateOfBirth: emp.dob || emp.dateOfBirth || "",
      email: emp.email || "",
      mobile: emp.mobNum || emp.mobile || "",
      bloodGroup: emp.bldGrp || emp.bloodGroup || "",
      address: emp.address || "",
      photoPath: emp.photoUrl || emp.photoPath || "",
      joiningDate: emp.doj || emp.joiningDate || "",
      designation: emp.designation || "",
      workingFor: emp.pltId ? "plant" : "company",
      company: emp.coyId ? String(emp.coyId) : "",
      plant: emp.pltId ? String(emp.pltId) : "",
      department: emp.deptId ? String(emp.deptId) : "",
      workLocation: emp.wloc || emp.wLoc || emp.workLocation || "",
      reportingManager: emp.repManId ? String(emp.repManId) : "",
      username: emp.email || emp.username || "",
      password: "********",
      confirmPassword: "********",
      status: emp.status === true || emp.status === "Active" ? "Active" : "Inactive",
      employmentType: emp.employmentType || "",
      role: emp.role || "user"
    });

    setPhoto(emp.photoPath || emp.photoUrl || null);
    setFormErrors({});
    setIsEditing(true);
    setIsViewing(false);
    setEditId(emp.empId || emp.id);
    setView("form");
    setActiveActionsMenu(null);
  };

  const handleView = (emp) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setForm({
      employeeCode: emp.empCode || emp.employeeCode || "",
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      gender: emp.gender ? (function(g) {
        const u = g.toUpperCase();
        if (u === "MALE") return "Male";
        if (u === "FEMALE") return "Female";
        if (u === "OTHER" || u === "OTHERS") return "Others";
        return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
      })(emp.gender) : "",
      dateOfBirth: emp.dob || emp.dateOfBirth || "",
      email: emp.email || "",
      mobile: emp.mobNum || emp.mobile || "",
      bloodGroup: emp.bldGrp || emp.bloodGroup || "",
      address: emp.address || "",
      photoPath: emp.photoUrl || emp.photoPath || "",
      joiningDate: emp.doj || emp.joiningDate || "",
      designation: emp.designation || "",
      workingFor: emp.pltId ? "plant" : "company",
      company: emp.coyId ? String(emp.coyId) : "",
      plant: emp.pltId ? String(emp.pltId) : "",
      department: emp.deptId ? String(emp.deptId) : "",
      workLocation: emp.wloc || emp.wLoc || emp.workLocation || "",
      reportingManager: emp.repManId ? String(emp.repManId) : "",
      username: emp.email || emp.username || "",
      password: "********",
      confirmPassword: "********",
      status: emp.status === true || emp.status === "Active" ? "Active" : "Inactive",
      employmentType: emp.employmentType || "",
      role: emp.role || "user"
    });

    setPhoto(emp.photoPath || emp.photoUrl || null);
    setFormErrors({});
    setIsEditing(false);
    setIsViewing(true);
    setEditId(emp.empId || emp.id);
    setView("form");
    setActiveActionsMenu(null);
  };

  const generateDeleteWarningMessage = (empId, isExternal = false) => {
    const userAssignments = assignments.filter(a => String(a.empId) === String(empId) || (isExternal && String(a.extEmpId || a.ext_emp_id) === String(empId)));
    const userLiveTasks = liveTasks.filter(t => String(t.empId) === String(empId) || (isExternal && String(t.extEmpId || t.ext_emp_id) === String(empId)));
    
    const taskItems = [
      ...userAssignments.map(t => ({ title: t.taskNm || t.tasknm || t.taskCd || "Unnamed Task", type: "Individual Task" })),
      ...userLiveTasks.map(t => ({ title: t.taskNm || t.tasknm || t.taskCd || "Unnamed Task", type: "Project Task" }))
    ];

    if (taskItems.length === 0) {
      return (
        <div style={{ textAlign: "left", width: "100%", marginTop: "8px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#16a34a", marginBottom: "8px", borderBottom: "1px solid #bbf7d0", paddingBottom: "6px" }}>
            ✅ Safe to Delete
          </h4>
          <p style={{ fontSize: "13px", color: "#334155", marginBottom: "12px" }}>
            This employee is currently assigned to <strong>0</strong> active tasks.
          </p>
          <p style={{ fontSize: "13px", color: "#0f172a", marginTop: "12px", fontWeight: "600" }}>
            Are you sure you want to proceed with deletion? This action cannot be undone.
          </p>
        </div>
      );
    }

    return (
      <div style={{ textAlign: "left", width: "100%", marginTop: "8px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#dc2626", marginBottom: "8px", borderBottom: "1px solid #fecaca", paddingBottom: "6px" }}>
          ⚠️ Warning: Employee has active assignments!
        </h4>
        <p style={{ fontSize: "13px", color: "#334155", marginBottom: "12px" }}>
          This employee is currently assigned to <strong>{taskItems.length}</strong> tasks. Deleting them may cause these tasks to become unassigned.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px", background: "#f8fafc", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
          {taskItems.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderBottom: idx === taskItems.length - 1 ? "none" : "1px solid #e2e8f0", paddingBottom: "4px" }}>
              <span style={{ color: "#0f172a", fontWeight: "500", wordBreak: "break-word", paddingRight: "8px" }}>{item.title}</span>
              <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>{item.type}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "13px", color: "#ef4444", marginTop: "12px", fontWeight: "600" }}>
          Are you sure you want to proceed with deletion?
        </p>
      </div>
    );
  };

  const handleDelete = (empId) => {
    setAlertConfig({
      isOpen: true,
      type: "warning",
      title: "Confirm Delete",
      message: generateDeleteWarningMessage(empId, false),
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        setLoading(true);
        try {
          const response = await fetch(`${apiBaseUrl}/api/employees/${empId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
          });
          if (response.ok) {
            triggerAlert("success", "Success", "Employee deleted successfully!");
            fetchAllData();
          } else {
            const errorText = await response.text();
            let errorMsg = "Could not delete employee.";
            try {
              const parsed = JSON.parse(errorText);
              if (parsed.message) errorMsg = parsed.message;
              else if (parsed.error && parsed.status === 500) {
                errorMsg = "Cannot delete this employee because they are linked to other records. Please deactivate instead.";
              }
            } catch (e) {
              errorMsg = errorText || errorMsg;
            }
            triggerAlert("error", "Error", errorMsg);
          }
        } catch (err) {
          console.error("Delete employee failed:", err);
          triggerAlert("error", "Error", err.message || "Could not delete employee.");
        } finally {
          setLoading(false);
        }
      }
    });
    setActiveActionsMenu(null);
  };

  // Toggle Status Action
  const handleToggleStatus = async (empId) => {
    const emp = employees.find(e => (e.empId || e.id) === empId);
    if (!emp) return;

    const nextStatus = emp.status === "Active" ? false : true;
    let empTypVal = "FTE";
    if (emp.employmentType === "Retainer") {
      empTypVal = "RET";
    } else if (emp.employmentType === "Contract Employee") {
      empTypVal = "CON";
    } else if (emp.employmentType === "Full Time Employee (FTE)") {
      empTypVal = "FTE";
    } else {
      empTypVal = emp.employmentType;
    }

    const payload = {
      empId: emp.empId || emp.id,
      empCode: emp.empCode || emp.employeeCode,
      fstNm: emp.firstName || "",
      lstNm: emp.lastName || "",
      gender: emp.gender || "",
      dob: emp.dob || emp.dateOfBirth,
      email: emp.email,
      mobNum: emp.mobNum || emp.mobile,
      bldGrp: emp.bldGrp || emp.bloodGroup || null,
      address: emp.address,
      photoUrl: emp.photoUrl || emp.photoPath || null,
      doj: emp.doj || emp.joiningDate,
      empTyp: empTypVal,
      desigId: emp.desigId || 1,
      coyId: emp.coyId || null,
      pltId: emp.pltId || null,
      deptId: emp.deptId || null,
      wLoc: emp.wLoc || emp.wloc || emp.workLocation || "",
      repManId: emp.repManId || null,
      sts: nextStatus,
      role: emp.role || "user"
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/employees/${empId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        triggerAlert("success", "Status Update", `Employee is now ${nextStatus ? "Active" : "Inactive"}!`);
        fetchAllData();
      } else {
        triggerAlert("error", "Error", "Failed to toggle employee status.");
      }
} catch (err) {
      console.error("Error toggling employee status:", err);
      triggerAlert("error", "Error", "Server error occurred while toggling status.");
    }
    setActiveActionsMenu(null);
  };

  const handleExtChange = (e) => {
    const { name, value } = e.target;
    setExtForm(prev => ({ ...prev, [name]: value }));
    const fieldNameForValidation = name === "mobNum" ? "mobile" : name;
    const error = validateField(fieldNameForValidation, value, extForm);
    if (error) {
      setExtFormErrors(prev => ({ ...prev, [name]: error }));
    } else {
      setExtFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const viewExternalEmployee = (emp) => {
    setIsExtEditing(false);
    setIsExtViewing(true);
    setExtForm({
      extEmpCode: emp.extEmpCode || "",
      extEmpNm: emp.extEmpNm || "",
      email: emp.email || "",
      mobNum: emp.mobNum || "",
      companyNm: emp.companyNm || "",
      photoPath: emp.photoPath || "",
      repEmpId: emp.repEmpId || "",
      sts: emp.sts !== undefined ? emp.sts : true
    });
    setExtEditId(emp.extEmpId || emp.id);
    setExtFormErrors({});
    setView("extForm");
    setActiveActionsMenu(null);
  };

  const editExternalEmployee = (emp) => {
    setIsExtEditing(true);
    setIsExtViewing(false);
    setExtForm({
      extEmpCode: emp.extEmpCode || "",
      extEmpNm: emp.extEmpNm || "",
      email: emp.email || "",
      mobNum: emp.mobNum || "",
      companyNm: emp.companyNm || "",
      photoPath: emp.photoPath || "",
      repEmpId: emp.repEmpId || "",
      sts: emp.sts !== undefined ? emp.sts : true
    });
    setExtEditId(emp.extEmpId || emp.id);
    setExtFormErrors({});
    setView("extForm");
    setActiveActionsMenu(null);
  };

  const deleteExternalEmployee = (id) => {
    setAlertConfig({
      isOpen: true,
      type: "warning",
      title: "Confirm Delete",
      message: generateDeleteWarningMessage(id, true),
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const res = await fetch(`${apiBaseUrl}/api/external-employees/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
          });
          if (res.ok) {
            triggerAlert("success", "Success", "External employee deleted successfully!");
            fetchAllData();
          } else {
            triggerAlert("error", "Error", "Failed to delete external employee.");
          }
        } catch (err) {
          console.error(err);
          triggerAlert("error", "Error", "Server error while deleting.");
        }
      }
    });
    setActiveActionsMenu(null);
  };

  const toggleDropdown = (e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 220;
    const isTop = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    
    setDropdownPos({
      isTop,
      top: rect.top,
      bottom: rect.bottom,
      right: window.innerWidth - rect.right
    });
    setActiveActionsMenu((prev) => (prev === id ? null : id));
  };

  const handleExtPhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      const response = await fetch(`${apiBaseUrl}/api/storage/upload/employee-photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("authToken") || ""}` },
        body: formDataUpload
      });
      if (!response.ok) throw new Error("Photo upload failed");
      const data = await response.json();
      setExtForm((prev) => ({ ...prev, photoPath: data.url }));
    } catch (err) {
      console.error("External employee photo upload error:", err);
    }
  };

  const handleDeleteExtPhoto = () => {
    setExtForm((prev) => ({ ...prev, photoPath: "" }));
    const fileInput = document.getElementById("extPhotoUpload");
    if (fileInput) fileInput.value = "";
  };

  const saveExternalEmployee = async () => {
    const emailError = validateField("email", extForm.email, extForm);
    const mobileError = validateField("mobile", extForm.mobNum, extForm);
    const newErrors = {};
    if (emailError) newErrors.email = emailError;
    if (mobileError) newErrors.mobNum = mobileError;

    if (Object.keys(newErrors).length > 0) {
      setExtFormErrors(newErrors);
      triggerAlert("error", "Validation Error", "Please fix the errors before submitting.");
      return;
    }

    if (!extForm.extEmpNm || !extForm.email || !extForm.mobNum || !extForm.companyNm || !extForm.repEmpId) {
      triggerAlert("error", "Validation Error", "Please fill all required fields");
      return;
    }
    
    try {
      const endpoint = isExtEditing && extEditId 
        ? `${apiBaseUrl}/api/external-employees/${extEditId}`
        : `${apiBaseUrl}/api/external-employees`;
      const method = isExtEditing && extEditId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          extEmpCode: extForm.extEmpCode || generateExtEmployeeCode(),
          extEmpNm: extForm.extEmpNm,
          email: extForm.email,
          mobNum: extForm.mobNum,
          companyNm: extForm.companyNm,
          photoPath: extForm.photoPath,
          repEmpId: extForm.repEmpId ? parseInt(extForm.repEmpId) : null,
          sts: extForm.sts
        })
      });
      if (res.ok) {
        triggerAlert("success", "Success", `External employee ${isExtEditing ? "updated" : "created"}!`);
        setView("list");
        handleExtReset();
        fetchAllData();
      } else {
        const errText = await res.text();
        triggerAlert("error", "Error", errText || `Failed to ${isExtEditing ? "update" : "create"} external employee`);
      }
    } catch(err) {
      console.error(err);
      triggerAlert("error", "Error", "Server error");
    }
  };

  const filteredEmployees = (tableSearchQuery
    ? employees.filter(emp =>
      (emp.employeeCode && emp.employeeCode.toLowerCase().includes(tableSearchQuery.toLowerCase())) ||
      (emp.employeeName && emp.employeeName.toLowerCase().includes(tableSearchQuery.toLowerCase()))
    )
    : employees).slice().sort((a, b) => (a.employeeCode || '').localeCompare(b.employeeCode || '', undefined, {numeric: true, sensitivity: 'base'}));

  const filteredExternalEmployees = (tableSearchQuery
    ? externalEmployees.filter(emp =>
      (emp.extEmpCode && emp.extEmpCode.toLowerCase().includes(tableSearchQuery.toLowerCase())) ||
      (emp.extEmpNm && emp.extEmpNm.toLowerCase().includes(tableSearchQuery.toLowerCase()))
    ) : externalEmployees) || [];

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  
  const currentEmployees = filteredEmployees.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredEmployees.length / recordsPerPage);

  const currentExtEmployees = filteredExternalEmployees.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalExtPages = Math.ceil(filteredExternalEmployees.length / recordsPerPage);

  return (
    <div className="emp-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="emp-shell">
        <Header
          title="Employee Creation"
        />

        <main className="emp-main" style={{ padding: '24px', position: 'relative' }}>

          {view === "form" ? (
            /* ================= VIEW: ADD NEW EMPLOYEE FORM ================= */
            <div className="emp-content" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto' }}>

              <div className="emp-form-card" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                      {isViewing ? "View Employee" : isEditing ? "Edit Employee" : "Add New Employee"}
                    </h2>
                    {!isViewing && !isEditing && (
                      <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Enter employee details in the form below</p>
                    )}
                  </div>
                  <button type="button" className="emp-nav-view-btn" onClick={() => {
                    setView("list"); handleReset(); setIsEditing(false); setEditId(null);
                  }}>
                    <ArrowLeft size={15} /> Back to Employee List
                  </button>
                </div>

                <div style={{ padding: '24px' }}>
                {/* Dummy inputs to trap browser autofill engines */}
                <input type="text" name="fake_user_name_autofill" style={{ display: 'none', position: 'absolute', opacity: 0, pointerEvents: 'none' }} tabIndex={-1} readOnly autoComplete="off" />
                <input type="password" name="fake_pass_word_autofill" style={{ display: 'none', position: 'absolute', opacity: 0, pointerEvents: 'none' }} tabIndex={-1} readOnly autoComplete="new-password" />
                
                {isViewing ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Photo Row & Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', overflow: 'hidden', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {form.photoPath || photo ? (
                          <img src={form.photoPath || photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={32} style={{ color: '#94a3b8' }} />
                        )}
                      </div>
                      <div>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#0f172a', fontWeight: '700' }}>{form.firstName} {form.lastName}</h2>
                        <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: form.status === 'Active' ? '#dcfce7' : '#fee2e2', color: form.status === 'Active' ? '#166534' : '#991b1b' }}>{form.status}</span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Personal Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: '40px', rowGap: '16px', marginBottom: '32px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Employee Code</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.employeeCode || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Gender</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.gender || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Date of Birth</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.dateOfBirth ? form.dateOfBirth.split('T')[0].split('-').reverse().join('/') : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Email</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.email || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Mobile Number</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.mobile || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Blood Group</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.bloodGroup || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Address</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.address || '-'}</span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Employment Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: '40px', rowGap: '16px', marginBottom: '32px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Joining Date</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.joiningDate ? form.joiningDate.split('T')[0].split('-').reverse().join('/') : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Designation</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.designation || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Employment Type</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.employmentType || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Working For</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500', textTransform: 'capitalize' }}>{form.workingFor || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Company</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{companies.find(c => String(c.coyId || c.id) === String(form.company))?.coyNm || companies.find(c => String(c.coyId || c.id) === String(form.company))?.name || '-'}</span>
                      </div>
                      {form.workingFor === "plant" && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Plant</span>
                          <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{plants.find(p => String(p.pltId || p.id) === String(form.plant))?.pltNm || plants.find(p => String(p.pltId || p.id) === String(form.plant))?.name || '-'}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Department</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{departments.find(d => String(d.deptId || d.id) === String(form.department))?.deptNm || departments.find(d => String(d.deptId || d.id) === String(form.department))?.name || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Work Location</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.workLocation || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Reporting Manager</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{employees.find(emp => String(emp.empId || emp.id) === String(form.reportingManager))?.employeeName || employees.find(emp => String(emp.empId || emp.id) === String(form.reportingManager))?.firstName || '-'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                  {/* 1. PERSONAL INFORMATION */}
                  <div className="emp-form-section">
                    <h3 className="emp-form-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                      Personal Information
                    </h3>
                    <div className="emp-form-row-4">
                      <div className="emp-form-item">
                        <label>Employee Code <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><User size={16} /></span>
                          <input type="text" name="employeeCode" value={form.employeeCode} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-generated code" required />
                        </div>
                        {formErrors.employeeCode && (
                          <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                            {formErrors.employeeCode}
                          </div>
                        )}
                      </div>
                      <div className="emp-form-item">
                        <label>First Name <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><User size={16} /></span>
                          <input type="text" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Enter first name" maxLength="50" required />
                        </div>
                        {formErrors.firstName && (
                          <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                            {formErrors.firstName}
                          </div>
                        )}
                      </div>
                      <div className="emp-form-item">
                        <label>Last Name <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><User size={16} /></span>
                          <input type="text" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Enter last name" maxLength="50" required />
                        </div>
                        {formErrors.lastName && (
                          <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                            {formErrors.lastName}
                          </div>
                        )}
                      </div>
                      <div className="emp-form-item">
                        <label>Gender <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <SearchableSelect
                            name="gender"
                            value={form.gender}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })}
                            placeholder="Select gender"
                            hideSearch={true}
                            options={[
                              { value: "Male", label: "Male" },
                              { value: "Female", label: "Female" },
                              { value: "Others", label: "Others" }
                            ]}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="emp-form-row-4" style={{ marginTop: '16px' }}>
                      <div className="emp-form-item">
                        <label>Date of Birth <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <input
                            type="date"
                            name="dateOfBirth"
                            value={form.dateOfBirth}
                            onChange={handleChange}
                            max={new Date().toISOString().split("T")[0]}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none',
                              color: '#0f172a'
                            }}
                          />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Email <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Mail size={16} /></span>
                          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter email id" maxLength="50" required autoComplete="off" />
                        </div>
                        {formErrors.email && (
                          <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                            {formErrors.email}
                          </div>
                        )}
                      </div>
                      <div className="emp-form-item">
                        <label>Mobile Number <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Phone size={16} /></span>
                          <input type="text" name="mobile" value={form.mobile} onChange={handleChange} placeholder="Enter mobile number" maxLength="10" required />
                        </div>
                        {formErrors.mobile && (
                          <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                            {formErrors.mobile}
                          </div>
                        )}
                      </div>
                      <div className="emp-form-item">
                        <label>Blood Group</label>
                        <div className="emp-input-icon-wrap">
                          <SearchableSelect
                            name="bloodGroup"
                            value={form.bloodGroup}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })}
                            placeholder="Select blood group"
                            options={[
                              { value: "A+", label: "A+" },
                              { value: "A-", label: "A-" },
                              { value: "B+", label: "B+" },
                              { value: "B-", label: "B-" },
                              { value: "AB+", label: "AB+" },
                              { value: "AB-", label: "AB-" },
                              { value: "O+", label: "O+" },
                              { value: "O-", label: "O-" },
                              { value: "Bombay", label: "Bombay" },
                              { value: "RH-Null", label: "Rh Null" }
                            ]}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="emp-form-row-2" style={{ marginTop: '16px' }}>
                      <div className="emp-form-item">
                        <label>Address <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon" style={{ alignSelf: "flex-start", marginTop: "14px" }}><MapPin size={16} /></span>
                          <textarea name="address" value={form.address} onChange={handleChange} placeholder="Enter full address" maxLength="255" required />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Upload Image</label>
                        {/* PHOTO SECTION – upload button and delete button on left, preview on right */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', height: '96px' }}>
                          <input id="empPhotoUpload" type="file" accept="image/*" onChange={handlePhotoChange} disabled={isViewing} hidden />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {!isViewing && (
                              <>
                                <button type="button" className="emp-photo-row-upload-btn" onClick={() => document.getElementById("empPhotoUpload").click()} style={{ padding: '0 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155', flexShrink: 0, height: '38px', whiteSpace: 'nowrap' }}>
                                  <Upload size={14} /> Upload Image
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeletePhoto}
                                  disabled={!form.photoPath && !photo}
                                  style={{
                                    padding: '0 16px',
                                    background: (form.photoPath || photo) ? '#fef2f2' : '#f8fafc',
                                    border: (form.photoPath || photo) ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    cursor: (form.photoPath || photo) ? 'pointer' : 'not-allowed',
                                    fontSize: '13px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: (form.photoPath || photo) ? '#dc2626' : '#94a3b8',
                                    flexShrink: 0,
                                    height: '38px',
                                    whiteSpace: 'nowrap',
                                    opacity: (form.photoPath || photo) ? 1 : 0.6
                                  }}
                                  title="Delete Image"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                          <div className="emp-photo-row-preview" style={{ flex: 1, height: '96px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                            {form.photoPath || photo ? (
                              <img src={form.photoPath || photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <User size={48} style={{ color: '#94a3b8' }} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. EMPLOYMENT INFORMATION */}
                  <div className="emp-form-section" style={{ marginTop: '32px' }}>
                    <h3 className="emp-form-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                      Employment Information
                    </h3>
                    <div className="emp-form-row-4">
                      <div className="emp-form-item">
                        <label>Joining Date <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <input
                            type="date"
                            name="joiningDate"
                            value={form.joiningDate}
                            onChange={handleChange}
                            min={new Date().toISOString().split("T")[0]}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none',
                              color: '#0f172a'
                            }}
                          />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Designation <span className="emp-req-star">*</span></label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div className="emp-input-icon-wrap" style={{ flex: 1, margin: 0 }}>
                            <span className="emp-input-prefix-icon"><Briefcase size={16} /></span>
                            <SearchableSelect 
                              name="designation" 
                              value={form.designation} 
                              onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })} 
                              placeholder="Select designation"
                              bottomFixedOption={{ value: "CREATE_NEW", label: "+ Create Designation" }}
                              options={[
                                ...[...new Set([...designations.map(d => d.desigNm).filter(Boolean), ...employees.map(emp => emp.designation).filter(Boolean)])]
                                  .map(d => ({ value: d, label: d }))
                                  .sort((a, b) => a.label.localeCompare(b.label))
                              ]}
                            />
                          </div>
                          {form.designation && designations.some(d => d.desigNm === form.designation) && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button type="button" onClick={handleEditDesignation} style={{ padding: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit Designation">
                                <Edit size={16} />
                              </button>
                              <button type="button" onClick={handleDeleteDesignation} style={{ padding: '6px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete Designation">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Employee Type <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Briefcase size={16} /></span>
                          <select
                            name="employmentType"
                            value={form.employmentType}
                            onChange={handleChange}
                          >
                            <option value="" disabled hidden>Select employment type</option>
                            <option value="Retainer">Retainer</option>
                            <option value="Full Time Employee (FTE)">Full Time Employee (FTE)</option>
                            <option value="Contract Employee">Contract Employee</option>
                          </select>
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Working For <span className="emp-req-star">*</span></label>
                        <div style={{ display: 'flex', gap: '20px', height: '40px', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#334155', margin: 0 }}>
                            <input 
                              type="radio" 
                              name="workingFor" 
                              value="company" 
                              checked={form.workingFor === "company"} 
                              onChange={handleChange}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
                            />
                            Company
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#334155', margin: 0 }}>
                            <input 
                              type="radio" 
                              name="workingFor" 
                              value="plant" 
                              checked={form.workingFor === "plant"} 
                              onChange={handleChange}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
                            />
                            Plant
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="emp-form-row-4" style={{ marginTop: '16px' }}>
                      <div className="emp-form-item">
                        <label>Company {form.workingFor === "company" && <span className="emp-req-star">*</span>}</label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Building size={16} /></span>
                          <SearchableSelect
                            name="company"
                            value={form.company}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })}
                            placeholder="Select company"
                            options={companies.map(coy => ({ value: coy.coyId || coy.id, label: coy.coyNm || coy.name }))}
                            disabled={form.workingFor !== "company"}
                          />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Plant {form.workingFor === "plant" && <span className="emp-req-star">*</span>}</label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Factory size={16} /></span>
                          <SearchableSelect
                            name="plant"
                            value={form.plant}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })}
                            placeholder="Select plant"
                            options={plants.map(plt => {
                              const associatedCoy = companies.find(c => String(c.coyId || c.id) === String(plt.coyId));
                              const label = associatedCoy ? `${plt.pltNm || plt.name} (${associatedCoy.coyNm || associatedCoy.name})` : (plt.pltNm || plt.name);
                              return { value: plt.pltId || plt.id, label: label };
                            })}
                            disabled={form.workingFor !== "plant"}
                          />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Department <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Users size={16} /></span>
                          <SearchableSelect
                            name="department"
                            value={form.department}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })}
                            placeholder="Select department"
                            bottomFixedOption={{ value: "CREATE_NEW", label: "+ Create Department" }}
                            options={[
                              ...departments
                                .filter(dept => {
                                  const deptId = dept.deptId || dept.id;
                                  if (form.workingFor === "company") {
                                    if (!form.company) return true;
                                    return mappings.some(m => m.coyId === parseInt(form.company) && m.deptId === deptId && m.sts !== false);
                                  } else {
                                    if (!form.plant) return true;
                                    return mappings.some(m => m.pltId === parseInt(form.plant) && m.deptId === deptId && m.sts !== false);
                                  }
                                })
                                .map(dept => ({ value: dept.deptId || dept.id, label: dept.deptNm || dept.name }))
                            ]}
                          />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Work Location <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><MapPin size={16} /></span>
                          <input type="text" name="workLocation" value={form.workLocation} onChange={handleChange} placeholder="Enter work location" maxLength="100" required />
                        </div>
                      </div>
                    </div>

                    <div className="emp-form-row-4" style={{ marginTop: '16px' }}>
                      <div className="emp-form-item">
                        <label>Reporting Manager <b style={{ color: '#ef4444' }}>*</b></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><User size={16} /></span>
                          <SearchableSelect
                            name="reportingManager"
                            value={form.reportingManager}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })}
                            placeholder="Select reporting manager"
                            options={employees.filter(emp => String(emp.empId || emp.id) !== String(editId)).map(emp => ({ value: emp.empId || emp.id, label: emp.employeeName || `${emp.firstName} ${emp.lastName}` }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. LOGIN INFORMATION */}
                  <div className="emp-form-section" style={{ marginTop: '32px' }}>
                    <h3 className="emp-form-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                      Login Information
                    </h3>
                    <div className="emp-form-row-3">
                      <div className="emp-form-item">
                        <label>Username (Email) <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Mail size={16} /></span>
                          <input type="email" name="username" value={form.username} onChange={handleChange} placeholder="Enter email id" maxLength="50" required autoComplete="off" />
                        </div>
                        {formErrors.email && (
                          <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                            {formErrors.email}
                          </div>
                        )}
                      </div>
                      <div className="emp-form-item">
                        <label>Password <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Lock size={16} /></span>
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Enter Password"
                            maxLength="50"
                            required={!isEditing}
                            disabled={isEditing}
                            autoComplete="new-password"
                            style={isEditing ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
                          />
                          <button type="button" className="emp-input-suffix-btn" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {formErrors.password && (
                          <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                            {formErrors.password}
                          </div>
                        )}
                      </div>
                      <div className="emp-form-item">
                        <label>Confirm Password <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Lock size={16} /></span>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm password"
                            maxLength="50"
                            required={!isEditing}
                            disabled={isEditing}
                            autoComplete="new-password"
                            style={isEditing ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
                          />
                          <button type="button" className="emp-input-suffix-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {formErrors.confirmPassword && (
                          <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                            {formErrors.confirmPassword}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. STATUS */}
                  <div className="emp-form-section" style={{ marginTop: '32px' }}>
                    <h3 className="emp-form-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                      Status
                    </h3>
                    <div className="emp-form-row-4">
                      <div className="emp-form-item">
                        <label>Employee Status <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><CheckCircle2 size={16} /></span>
                          <select name="status" value={form.status} onChange={handleChange} required>
                            <option value="" disabled hidden>Select status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  </>
                )}
                </div>

                {/* Form Footer Buttons */}
                {!isViewing && (
                <div className="emp-form-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', backgroundColor: '#fafbfc', borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" className="emp-btn primary" onClick={handleSave} disabled={loading} style={loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
                    <Save size={14} /> {loading ? (isEditing ? "Updating..." : "Saving...") : (isEditing ? "Update Employee" : "Save Employee")}
                  </button>
                  <button type="button" className="emp-btn secondary" onClick={() => { setView("list"); handleReset(); setIsEditing(false); setIsViewing(false); setEditId(null); }}>
                    Cancel
                  </button>
                </div>
                )}
              </div>
            </div>
          ) : view === "extForm" ? (
            /* ================= VIEW: ADD NEW EXTERNAL EMPLOYEE FORM ================= */
            <div className="emp-content" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto' }}>
              <div className="emp-form-card" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'visible', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                      {isExtViewing ? "View External Employee" : isExtEditing ? "Edit External Employee" : "Add New External Employee"}
                    </h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
                      {isExtViewing ? "Viewing external employee details" : "Enter external employee details in the form below"}
                    </p>
                  </div>
                  <button type="button" className="emp-nav-view-btn" onClick={() => {
                    setView("list"); handleExtReset();
                  }}>
                    <ArrowLeft size={15} /> Back to Employee List
                  </button>
                </div>
                {isExtViewing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', overflow: 'hidden', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {extForm.photoPath ? (
                          <img src={extForm.photoPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={32} style={{ color: '#94a3b8' }} />
                        )}
                      </div>
                      <div>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#0f172a', fontWeight: '700' }}>{extForm.extEmpNm}</h2>
                        <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: extForm.sts ? '#dcfce7' : '#fee2e2', color: extForm.sts ? '#166534' : '#991b1b' }}>{extForm.sts ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>External Employee Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: '40px', rowGap: '16px', marginBottom: '32px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Employee Code</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{extForm.extEmpCode || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Company Name</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{extForm.companyNm || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Email</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{extForm.email || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Mobile Number</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{extForm.mobNum || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Reporting To</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{employees.find(e => String(e.id) === String(extForm.repEmpId))?.employeeName || '-'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="emp-form-row-3" style={{ gridColumn: 'span 3', display: 'block' }}>
                      <div className="emp-form-item" style={{ gridColumn: 'span 2' }}>
                        <label>Employee Photo</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {extForm.photoPath ? (
                              <img src={extForm.photoPath} alt="External Employee" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Image size={24} style={{ color: '#94a3b8' }} />
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <label className="emp-btn secondary" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '13px' }}>
                              <Upload size={14} /> Upload Photo
                              <input type="file" id="extPhotoUpload" style={{ display: 'none' }} accept="image/*" onChange={handleExtPhotoUpload} />
                            </label>
                            {extForm.photoPath && (
                              <button type="button" className="emp-btn-danger-outline" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleDeleteExtPhoto}>
                                <Trash2 size={14} /> Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="emp-form-row-3">
                      <div className="emp-form-item">
                        <label>Employee Code</label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><User size={16} /></span>
                          <input type="text" name="extEmpCode" value={extForm.extEmpCode || generateExtEmployeeCode()} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-generated" />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Employee Name <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><User size={16} /></span>
                          <input type="text" name="extEmpNm" value={extForm.extEmpNm} onChange={handleExtChange} placeholder="Enter name" required disabled={isExtViewing} />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Company Name <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Building size={16} /></span>
                          <input type="text" name="companyNm" value={extForm.companyNm} onChange={handleExtChange} placeholder="Enter company name" required disabled={isExtViewing} />
                        </div>
                      </div>
                    </div>
                  <div className="emp-form-row-3">
                    <div className="emp-form-item">
                      <label>Email <span className="emp-req-star">*</span></label>
                      <div className="emp-input-icon-wrap">
                        <span className="emp-input-prefix-icon"><Mail size={16} /></span>
                        <input type="email" name="email" value={extForm.email} onChange={handleExtChange} placeholder="Enter email" required disabled={isExtViewing} />
                      </div>
                      {extFormErrors.email && (
                        <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                          {extFormErrors.email}
                        </div>
                      )}
                    </div>
                    <div className="emp-form-item">
                      <label>Mobile Number <span className="emp-req-star">*</span></label>
                      <div className="emp-input-icon-wrap">
                        <span className="emp-input-prefix-icon"><Phone size={16} /></span>
                        <input type="tel" name="mobNum" value={extForm.mobNum} onChange={handleExtChange} placeholder="Enter mobile" required maxLength="10" disabled={isExtViewing} />
                      </div>
                      {extFormErrors.mobNum && (
                        <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                          {extFormErrors.mobNum}
                        </div>
                      )}
                    </div>
                    <div className="emp-form-item">
                      <label>Reporting To <span className="emp-req-star">*</span></label>
                      <div className="emp-input-icon-wrap">
                        <span className="emp-input-prefix-icon"><User size={16} /></span>
                        <SearchableSelect
                          name="repEmpId"
                          value={extForm.repEmpId}
                          onChange={(e) => handleExtChange({ target: { name: e.target.name, value: e.target.value } })}
                          placeholder="Select Manager"
                          options={employees.map(e => ({ value: e.id, label: e.employeeName }))}
                          disabled={isExtViewing}
                        />
                      </div>
                    </div>
                  </div>
                  {/* STATUS */}
                  <div className="emp-form-section">
                    <h3 className="emp-form-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                      Status
                    </h3>
                    <div className="emp-form-row-4">
                      <div className="emp-form-item">
                        <label>Employee Status <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><CheckCircle2 size={16} /></span>
                          <select name="sts" value={extForm.sts ? "Active" : "Inactive"} onChange={(e) => handleExtChange({ target: { name: 'sts', value: e.target.value === 'Active' } })} required disabled={isExtViewing}>
                            <option value="" disabled hidden>Select status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}
                <div className="emp-form-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', backgroundColor: '#fafbfc', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                  {!isExtViewing && (
                    <button type="button" className="emp-btn primary" onClick={saveExternalEmployee}>
                      <Save size={14} /> {isExtEditing ? "Update Employee" : "Save Employee"}
                    </button>
                  )}
                  <button type="button" className="emp-btn secondary" onClick={() => { setView("list"); handleExtReset(); }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ================= VIEW: EMPLOYEE LIST ================= */
            <div className="emp-content" style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <div className="emp-table-panel" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Employee List</h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>View and manage all employees</p>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                      <button 
                        onClick={() => { setActiveEmployeeTab("INTERNAL"); setCurrentPage(1); }}
                        style={{ padding: '6px 12px', border: 'none', background: activeEmployeeTab === "INTERNAL" ? '#2563eb' : 'transparent', color: activeEmployeeTab === "INTERNAL" ? 'white' : '#64748b', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                      >
                        Internal Employees
                      </button>
                      <button 
                        onClick={() => { setActiveEmployeeTab("EXTERNAL"); setCurrentPage(1); }}
                        style={{ padding: '6px 12px', border: 'none', background: activeEmployeeTab === "EXTERNAL" ? '#2563eb' : 'transparent', color: activeEmployeeTab === "EXTERNAL" ? 'white' : '#64748b', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                      >
                        External Employees
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', alignSelf: 'flex-start' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder={activeEmployeeTab === "INTERNAL" ? "Search employees..." : "Search external..."}
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        style={{ padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '250px' }}
                      />
                    </div>
                    {screenPerm.canCreate && (
                      <button type="button" className="emp-btn-add-new" onClick={() => { 
                          handleReset(); 
                          setIsEditing(false); 
                          if (activeEmployeeTab === "EXTERNAL") {
                            handleExtReset();
                            setView("extForm");
                          } else {
                            setView("form");
                          }
                      }}>
                        <Plus size={16} /> Add New {activeEmployeeTab === "EXTERNAL" ? "External " : ""}Employee
                      </button>
                    )}
                  </div>
                </div>

                {activeEmployeeTab === "INTERNAL" ? (
                <>
                <div className="emp-table-container" style={{ overflowX: 'auto' }}>
                  <table className="emp-list-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '2200px' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ width: "50px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>S.NO</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee Code</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee Name</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gender</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date of Birth</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mobile</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Blood Group</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joining Date</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designation</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employment Type</th>
                        {/* REPLACED Company & Plant columns with a single Working For column */}
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Working For</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Work Location</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reporting Manager</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                        <th style={{ textAlign: "center", width: "100px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="19" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                              Loading employees...
                            </div>
                          </td>
                        </tr>
                      ) : currentEmployees.length === 0 ? (
                        <tr><td colSpan="19" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>No employee records found. Add a new employee using the button above.</td></tr>
                      ) : (
                        currentEmployees.map((emp, index) => (
                          <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{indexOfFirstRecord + index + 1}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>{emp.employeeCode}</span></td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {emp.photoPath ? (<img src={emp.photoPath} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />) : (<div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: '#475569' }}>{emp.employeeName ? emp.employeeName.charAt(0) : ''}</div>)}
                                <strong>{emp.employeeName}</strong>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.gender}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.dateOfBirth ? emp.dateOfBirth.split('T')[0].split('-').reverse().join('/') : '-'}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.email}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.mobile}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.bloodGroup || "-"}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={emp.address}>{emp.address}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.joiningDate ? emp.joiningDate.split('T')[0].split('-').reverse().join('/') : '-'}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.designation}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.employmentType || "N/A"}</td>
                            {/* Working For column: show company if workingFor === "company", else show plant */}
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>
                              {emp.workingFor === "company" ? emp.company : emp.plant}
                              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
                                ({emp.workingFor === "company" ? "Company" : "Plant"})
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.department}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.workLocation}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.reportingManager}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>
                              <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'inline-block', backgroundColor: emp.status === 'Active' ? '#dcfce7' : '#fee2e2', color: emp.status === 'Active' ? '#166534' : '#991b1b' }}>{emp.status}</span>
                            </td>
                            <td style={{ position: "relative", padding: '14px 16px', textAlign: 'center' }}>
                              <button id={`action-btn-${emp.id}`} type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }} onClick={(e) => toggleDropdown(e, emp.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <MoreVertical size={18} />
                              </button>
                              {activeActionsMenu === emp.id && (
                                <>
                                  <div className="emp-actions-dropdown-backdrop" onClick={() => setActiveActionsMenu(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} />
                                  <div className="emp-actions-dropdown-menu" style={{ position: 'fixed', right: `${dropdownPos.right}px`, top: dropdownPos.isTop ? 'auto' : `${dropdownPos.bottom}px`, bottom: dropdownPos.isTop ? `${window.innerHeight - dropdownPos.top}px` : 'auto', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 99, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                    <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleView(emp)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Eye size={15} /> View </button>
                                    {screenPerm.canEdit && (
                                      <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleEdit(emp)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Edit size={15} /> Edit </button>
                                    )}
                                    {screenPerm.canDelete && (
                                      <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ef4444', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleDelete(emp.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Trash2 size={15} /> Delete </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                      Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredEmployees.length)} of {filteredEmployees.length} entries
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                      >
                        Previous
                      </button>
                      <button
                        style={{ padding: '6px 12px', border: '1px solid #2563eb', borderRadius: '6px', background: '#2563eb', color: 'white', fontWeight: '600' }}
                      >
                        {currentPage}
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalPages ? '#f8fafc' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#334155', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
                </>
                ) : (
                <>
                <div className="emp-table-container" style={{ overflowX: 'auto' }}>
                  <table className="emp-list-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ width: "50px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>S.NO</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ext Code</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mobile</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                        <th style={{ textAlign: "center", width: "100px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="8" style={{ textAlign: "center", padding: "60px 20px" }}>Loading...</td></tr>
                      ) : currentExtEmployees.length === 0 ? (
                        <tr><td colSpan="8" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b' }}>No external employees found.</td></tr>
                      ) : (
                        currentExtEmployees.map((emp, index) => (
                          <tr key={emp.extEmpId || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', fontSize: '14px' }}>{indexOfFirstRecord + index + 1}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px' }}><span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', fontSize: '13px' }}>{emp.extEmpCode || "-"}</span></td>
                            <td style={{ padding: '14px 16px', fontSize: '14px' }}><strong>{emp.extEmpNm}</strong></td>
                            <td style={{ padding: '14px 16px', fontSize: '14px' }}>{emp.companyNm}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px' }}>{emp.email || "-"}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px' }}>{emp.mobNum || "-"}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px' }}>
                              <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'inline-block', backgroundColor: emp.sts ? '#dcfce7' : '#fee2e2', color: emp.sts ? '#166534' : '#991b1b' }}>{emp.sts ? "Active" : "Inactive"}</span>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', position: 'relative' }}>
                              <button id={`action-btn-ext-${emp.extEmpId || index}`} type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }} onClick={(e) => toggleDropdown(e, `ext-${emp.extEmpId || index}`)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <MoreVertical size={18} />
                              </button>
                              {activeActionsMenu === `ext-${emp.extEmpId || index}` && (
                                <>
                                  <div className="emp-actions-dropdown-backdrop" onClick={() => setActiveActionsMenu(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} />
                                  <div className="emp-actions-dropdown-menu" style={{ position: 'fixed', right: `${dropdownPos.right}px`, top: dropdownPos.isTop ? 'auto' : `${dropdownPos.bottom}px`, bottom: dropdownPos.isTop ? `${window.innerHeight - dropdownPos.top}px` : 'auto', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 99, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                    <button onClick={() => viewExternalEmployee(emp)} style={{ background: 'none', border: 'none', padding: '8px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '13px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                      <Eye size={14} /> View
                                    </button>
                                    <button onClick={() => editExternalEmployee(emp)} style={{ background: 'none', border: 'none', padding: '8px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '13px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                      <Edit size={14} /> Edit
                                    </button>
                                    <button onClick={() => deleteExternalEmployee(emp.extEmpId || emp.id)} style={{ background: 'none', border: 'none', padding: '8px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '13px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {totalExtPages > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                      Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredExternalEmployees.length)} of {filteredExternalEmployees.length} entries
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                      >
                        Previous
                      </button>
                      <button
                        style={{ padding: '6px 12px', border: '1px solid #2563eb', borderRadius: '6px', background: '#2563eb', color: 'white', fontWeight: '600' }}
                      >
                        {currentPage}
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalExtPages, p + 1))}
                        disabled={currentPage === totalExtPages}
                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalExtPages ? '#f8fafc' : 'white', color: currentPage === totalExtPages ? '#94a3b8' : '#334155', cursor: currentPage === totalExtPages ? 'not-allowed' : 'pointer' }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
                </>
                )}

              </div>
            </div>
          )}

          {/* ===================== DEPARTMENT CREATION POPUP MODAL ===================== */}
          {showDeptModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '500px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Add New Department</h3>
                  <button onClick={() => { setShowDeptModal(false); setForm(p => ({ ...p, department: "" })); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="emp-form-item">
                    <label>Department Code <span className="emp-req-star">*</span></label>
                    <div className="emp-input-icon-wrap">
                      <span className="emp-input-prefix-icon"><Calendar size={16} /></span>
                      <input type="text" name="code" value={deptForm.code} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-generated code" required />
                    </div>
                  </div>
                  <div className="emp-form-item">
                    <label>Department Name <span className="emp-req-star">*</span></label>
                    <div className="emp-input-icon-wrap">
                      <span className="emp-input-prefix-icon"><Building size={16} /></span>
                      <input type="text" name="name" value={deptForm.name} onChange={handleDeptChange} placeholder="Enter department name" required />
                    </div>
                  </div>
                  <div className="emp-form-item">
                    <label>Description</label>
                    <div className="emp-input-icon-wrap">
                      <span className="emp-input-prefix-icon" style={{ alignSelf: "flex-start", marginTop: "14px" }}><FileText size={16} /></span>
                      <textarea name="description" value={deptForm.description} onChange={handleDeptChange} placeholder="Enter description (optional)" rows={3} style={{ height: "80px" }} />
                    </div>
                  </div>
                  <div className="emp-form-item">
                    <label>Status</label>
                    <div className="emp-input-icon-wrap">
                      <select name="status" value={deptForm.status} onChange={handleDeptChange}>
                        <option value="">Select status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#fafbfc' }}>
                  <button type="button" onClick={() => { setShowDeptModal(false); setForm(p => ({ ...p, department: "" })); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontWeight: '500' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveNewDepartment} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={14} /> Save Department
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== DESIGNATION CREATION POPUP MODAL ===================== */}
          {showDesigModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '500px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Add New Designation</h3>
                  <button onClick={() => { setShowDesigModal(false); setForm(p => ({ ...p, designation: "" })); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="emp-form-item">
                    <label>Designation Code <span className="emp-req-star">*</span></label>
                    <div className="emp-input-icon-wrap">
                      <span className="emp-input-prefix-icon"><Briefcase size={16} /></span>
                      <input type="text" name="code" value={desigForm.code} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-generated code" required />
                    </div>
                  </div>
                  <div className="emp-form-item">
                    <label>Designation Name <span className="emp-req-star">*</span></label>
                    <div className="emp-input-icon-wrap">
                      <span className="emp-input-prefix-icon"><Briefcase size={16} /></span>
                      <input type="text" name="name" value={desigForm.name} onChange={handleDesigChange} placeholder="Enter designation name" required />
                    </div>
                  </div>
                  <div className="emp-form-item">
                    <label>Description</label>
                    <div className="emp-input-icon-wrap">
                      <span className="emp-input-prefix-icon" style={{ alignSelf: "flex-start", marginTop: "14px" }}><FileText size={16} /></span>
                      <textarea name="description" value={desigForm.description} onChange={handleDesigChange} placeholder="Enter description (optional)" rows={3} style={{ height: "80px" }} />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#fafbfc' }}>
                  <button type="button" onClick={() => { setShowDesigModal(false); setIsEditingDesig(false); setEditingDesigId(null); setForm(p => ({ ...p, designation: "" })); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontWeight: '500' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveNewDesignation} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={14} /> {isEditingDesig ? "Update Designation" : "Save Designation"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
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
    </div>
  );
};

export default EmployeeCreation;
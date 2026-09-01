import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import {
  Search,
  Bell,
  X,
  Menu,
  ChevronRight,
  RefreshCcw,
  Save,
  Edit,
  Trash2,
  Eye,
  Plus,
  MoreVertical,
  ChevronLeft,
  Building2,
  Upload,
  Image as ImageIcon,
  Users,
  MapPin,
  Briefcase,
  FileText
} from "lucide-react";
import "../../styles/CompanyMaster.css";
import AlertModal from "../AlertModal.jsx";
import { getScreenPermission } from "../../utils/permissions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Logic for State to Zone mapping
const stateToZoneMap = {
  "Telangana": "South Zone",
  "Andhra Pradesh": "South Zone",
  "Karnataka": "South Zone",
  "Tamil Nadu": "South Zone",
  "Kerala": "South Zone",
  "Maharashtra": "West Zone",
  "Gujarat": "West Zone",
  "Delhi": "North Zone",
  "Punjab": "North Zone",
  "West Bengal": "East Zone",
  "Odisha": "East Zone",
  "Madhya Pradesh": "Central Zone"
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const cleanStr = String(dateStr).split('T')[0];
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      if (parts[2].length === 4) {
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
    }
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return cleanStr;
    }
  } catch (e) {
    console.error("Error formatting date:", dateStr, e);
  }
  return dateStr;
};

const SearchableSelect = ({ options, value, onChange, placeholder, name, style, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = React.useRef(null);

  React.useEffect(() => {
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
          background: disabled ? '#f1f5f9' : 'white', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '40px', fontSize: '14px', color: '#0f172a'
        }}
      >
        <span>{selected ? selected.label : placeholder || "Select..."}</span>
        <span style={{ fontSize: '14px', color: '#475569', lineHeight: 1 }}>▼</span>
      </div>
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, 
          background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
          marginTop: '4px', zIndex: 999, maxHeight: '250px', overflowY: 'auto',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #e2e8f0', zIndex: 2 }}>
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search..." 
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ padding: '4px 0' }}>
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
        </div>
      )}
    </div>
  );
};

const MaskedDateInput = React.forwardRef(({ value, onClick, onChange, placeholder, style, className }, ref) => {
  const [localValue, setLocalValue] = React.useState(value || "");

  React.useEffect(() => {
    if (value === "" && localValue.length > 0 && localValue.length < 10) {
      return;
    }
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
      if (formatted.length === 10) {
        e.target.value = formatted;
        onChange(e);
      } else {
        e.target.value = "";
        onChange(e);
      }
    }
  };

  const handleBlur = () => {
    if (localValue.length > 0 && localValue.length < 10) {
      setLocalValue("");
      if (onChange) {
        onChange({ target: { value: "" } });
      }
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

const CompanyCreation = ({ onLogout, userRole }) => {
  const screenPerm = getScreenPermission('COMPANY_CREATION');
  const navigate = useNavigate();

    const [companies, setCompanies] = useState([]);
  const [states, setStates] = useState([]);
  const [plants, setPlants] = useState([]);
  const [lands, setLands] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [deptMappings, setDeptMappings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState(null);
  const [activeOverviewTab, setActiveOverviewTab] = useState(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const [compRes, stateRes, plantRes, landRes, empRes, mapRes, draftProjRes, liveProjRes, deptRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/companies`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/states`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/plants`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/lands`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/employees`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/dept-coy-plt-maps`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/project-drafts`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/project-live`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/departments`, { headers: getAuthHeaders() })
      ]);

      if (compRes.ok) {
        const data = await compRes.json();
        let localData = {};
        try {
          localData = JSON.parse(localStorage.getItem("company_local_fields") || "{}");
        } catch (e) {
          console.error("Error parsing local company data:", e);
        }
        const enriched = data.map(company => ({
          ...company,
          flatPlotDoor: localData[company.coyId]?.flatPlotDoor || "",
          workingDaysPerWeek: company.wrkDaysPerWk || localData[company.coyId]?.workingDaysPerWeek || ""
        }));
        setCompanies(enriched);
        setFormData(prev => {
          if (!prev.companyCode || /^CMP-\d+$/i.test(prev.companyCode)) {
            let maxNum = 0;
            enriched.forEach(c => {
              const code = c.coyCd || c.companyCode || "";
              const match = code.match(/^CMP-(\d+)$/i);
              if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
              }
            });
            return { ...prev, companyCode: `CMP-${String(maxNum + 1).padStart(3, '0')}` };
          }
          return prev;
        });
      }

      if (stateRes.ok) {
        const data = await stateRes.json();
        setStates(data);
      }

      if (plantRes.ok) {
        const data = await plantRes.json();
        setPlants(data);
      }

      if (landRes.ok) {
        const data = await landRes.json();
        setLands(data);
      }

      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data);
      }

      if (mapRes.ok) {
        const data = await mapRes.json();
        setDeptMappings(data);
      }

      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(data);
      }

      let allProj = [];
      if (draftProjRes.ok) {
        const drafts = await draftProjRes.json();
        allProj = [...allProj, ...drafts];
      }
      if (liveProjRes.ok) {
        const live = await liveProjRes.json();
        allProj = [...allProj, ...live];
      }
      setProjects(allProj);

    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // View toggle â€“ default is "list"
  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Form state â€“ all empty by default
  const [formData, setFormData] = useState({
    companyName: "",
    companyCode: "",
    under: "",
    cinNumber: "",
    gstNumber: "",
    panNumber: "",
    tanNumber: "",
    incorporationDate: "",
    flatPlotDoor: "",
    streetAddress: "",
    landMark: "",
    city: "",
    district: "",
    state: "",
    zone: "",
    pincode: "",
    email: "",
    remarks: "",
    website: "",
    logo: null,
    status: "Active",
    workingDaysPerWeek: ""
  });

  // Table action dropdown trigger state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // Scroll handler to reposition dropdown dynamically
  useEffect(() => {
    const handleScroll = () => {
      if (activeDropdown !== null) {
        const btn = document.getElementById(`action-btn-${activeDropdown}`);
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
  }, [activeDropdown]);

  // Deactivation confirmation modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTargetId, setDeactivateTargetId] = useState(null);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  const triggerAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const validateField = (name, value) => {
    let error = "";
    if (name === "companyName") {
      if (!value.trim()) error = "Company Name is required.";
      else if (value.length > 100) error = "Company Name cannot exceed 100 characters.";
    } else if (name === "companyCode") {
      if (!value.trim()) error = "Company Code is required.";
      else if (/\s/.test(value)) error = "Spaces are not allowed in Company Code.";
      else if (value.length > 10) error = "Company Code cannot exceed 10 characters.";
    } else if (name === "under") {
      if (!value) error = "Parent Company selection is required.";
    } else if (name === "cinNumber") {
      if (!value.trim()) error = "Company CIN Number is required.";
      else {
        const cinRegex = /^[LU]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
        if (!cinRegex.test(value.trim())) {
          error = "Invalid CIN format (e.g. L01500MH1988PLC048508, 21 characters).";
        }
      }
    } else if (name === "gstNumber") {
      if (value.trim()) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(value.trim())) {
          error = "Invalid GSTIN format (e.g. 22AAAAA1111A1Z5, 15 characters).";
        }
      }
    } else if (name === "panNumber") {
      if (!value.trim()) error = "PAN Number is required.";
      else {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(value.trim())) {
          error = "Invalid PAN format (e.g. ABCDE1234F, 10 characters).";
        }
      }
    } else if (name === "tanNumber") {
      if (!value.trim()) error = "TAN Number is required.";
      else {
        const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
        if (!tanRegex.test(value.trim())) {
          error = "Invalid TAN format (e.g. ABCD12345E, 10 characters).";
        }
      }
    } else if (name === "incorporationDate") {
      if (!value.trim()) error = "Incorporation Date is required.";
      else {
        const selectedDate = new Date(value);
        selectedDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate > today) {
          error = "Incorporation Date cannot be in the future.";
        }
      }

    } else if (name === "streetAddress") {
      if (!value.trim()) error = "Street Name is required.";
      else if (value.length > 50) error = "Cannot exceed 50 characters.";
    } else if (name === "city") {
      if (!value.trim()) error = "City/Village is required.";
      else if (value.length > 30) error = "Cannot exceed 30 characters.";
      else if (!/^[A-Za-z\s]+$/.test(value)) error = "Only letters and spaces are allowed.";
    } else if (name === "district") {
      if (!value.trim()) error = "District Name is required.";
      else if (value.length > 30) error = "Cannot exceed 30 characters.";
      else if (!/^[A-Za-z\s]+$/.test(value)) error = "Only letters and spaces are allowed.";
    } else if (name === "state") {
      if (!value) error = "State Reference selection is required.";
    } else if (name === "pincode") {
      if (!value.trim()) error = "Postal Code (Pincode) is required.";
      else {
        const pincodeRegex = /^[1-9]\d{5}$/;
        if (!pincodeRegex.test(value.trim())) {
          error = "Pincode must be 6 digits and cannot start with 0.";
        }
      }
    } else if (name === "email") {
      if (!value.trim()) error = "Company Email is required.";
      else if (value.length > 100) error = "Company Email cannot exceed 100 characters.";
      else {
        const emailRegex = /^([a-zA-Z0-9._%+-]+@)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
        if (!emailRegex.test(value.trim())) {
          error = "Company Email must be a valid email or domain.";
        }
      }
    } else if (name === "website") {
      if (value.trim()) {
        if (value.length > 100) error = "Cannot exceed 100 characters.";
        else {
          const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;
          if (!urlPattern.test(value.trim())) {
            error = "Please enter a valid Company Website URL.";
          }
        }
      }
    } else if (name === "remarks") {
      if (value.trim() && value.length > 255) error = "Remarks cannot exceed 255 characters.";
    } else if (name === "workingDaysPerWeek") {
      if (!value) error = "Working Days Per Week is required.";
    }
    return error;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "incorporationDate" && value) {
      const selectedDate = new Date(value);
      selectedDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        setFormErrors(prev => ({ ...prev, incorporationDate: "Incorporation Date cannot be in the future." }));
        return;
      }
    }

    if (name === "pincode") {
      newValue = value.replace(/[^0-9]/g, '').slice(0, 6);
      if (newValue.startsWith('0')) {
        newValue = newValue.substring(1);
      }
    } else if (name === "companyCode") {
      newValue = value.slice(0, 10);
    } else if (name === "companyName") {
      newValue = value.slice(0, 100);
    } else if (name === "cinNumber") {
      newValue = value.toUpperCase().slice(0, 21);
    } else if (name === "panNumber") {
      newValue = value.toUpperCase().slice(0, 10);
    } else if (name === "tanNumber") {
      newValue = value.toUpperCase().slice(0, 10);
    } else if (name === "streetAddress") {
      newValue = value.slice(0, 50);
    } else if (name === "city" || name === "district") {
      newValue = value.slice(0, 30);
    } else if (name === "email" || name === "website") {
      newValue = value.slice(0, 100);
    } else if (name === "remarks") {
      newValue = value.slice(0, 255);
    } else if (name === "gstNumber") {
      newValue = value.toUpperCase().slice(0, 15);
    } else if (name === "flatPlotDoor" || name === "landMark") {
      newValue = value.slice(0, 50);
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));

    const error = validateField(name, newValue);
    setFormErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleToggleStatus = (e) => {
    setFormData(prev => ({ ...prev, status: e.target.checked ? "Active" : "Inactive" }));
  };

  const handleStateChange = (e) => {
    const selectedStateId = e.target.value;
    const selectedStateObj = states.find(s => s.stId.toString() === selectedStateId.toString());
    const mappedZone = selectedStateObj ? selectedStateObj.znNm : "";
    setFormData(prev => ({
      ...prev,
      state: selectedStateId,
      zone: mappedZone
    }));

    setFormErrors(prev => ({
      ...prev,
      state: selectedStateId ? "" : "State Reference selection is required.",
      zone: mappedZone ? "" : "Zone selection is required (auto-filled from State)."
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFormData((prev) => ({ ...prev, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleDeleteLogo = () => {
    setLogoFile(null);
    setFormData((prev) => ({ ...prev, logo: "" }));
    const fileInput = document.getElementById("logoUploadHidden");
    if (fileInput) fileInput.value = "";
  };



  const generateCompanyCode = (cList = companies) => {
    let maxNum = 0;
    if (Array.isArray(cList)) {
      cList.forEach(c => {
        const code = c.coyCd || c.companyCode || "";
        const match = code.match(/^CMP-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }
    const nextNum = maxNum + 1;
    return `CMP-${String(nextNum).padStart(3, '0')}`;
  };

  const handleResetForm = (cList = companies) => {
    const autoCode = generateCompanyCode(cList);
    setFormData({
      companyName: "",
      companyCode: autoCode,
      under: "",
      cinNumber: "",
      gstNumber: "",
      panNumber: "",
      tanNumber: "",
      incorporationDate: "",
      flatPlotDoor: "",
      streetAddress: "",
      landMark: "",
      city: "",
      district: "",
      state: "",
      zone: "",
      pincode: "",
      email: "",
      remarks: "",
      website: "",
      logo: "",
      status: "Active",
      workingDaysPerWeek: ""
    });
    setLogoFile(null);
    setIsViewing(false);
    setFormErrors({});
    setActiveOverviewTab(null);
  };

  const handleSave = async () => {
    // Validate all fields
    const errors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        errors[key] = error;
      }
    });

    // Zone check
    if (!formData.zone || !formData.zone.trim()) {
      errors["zone"] = "Zone selection is required (auto-filled from State).";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      const fieldLabel = firstErrorKey.replace(/([A-Z])/g, ' $1').toLowerCase();
      triggerAlert("error", "Validation Error", `Please fix the error in ${fieldLabel}: ${errors[firstErrorKey]}`);
      return;
    }

    let finalLogoUrl = formData.logo;
    if (logoFile) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("file", logoFile);
        const uploadResponse = await fetch(`${apiBaseUrl}/api/storage/upload/company-logo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionStorage.getItem("authToken") || ""}` },
          body: formDataUpload
        });
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          finalLogoUrl = uploadData.url;
        } else {
          throw new Error("Logo upload failed");
        }
      } catch (uploadErr) {
        triggerAlert("error", "Upload Error", "Failed to upload company logo.");
        return;
      }
    }



    const companyPayload = {
      coyCd: formData.companyCode.trim(),
      coyNm: formData.companyName.trim(),
      prntCoyId: formData.under && formData.under !== "Independent" ? Number(formData.under) : null,
      email: formData.email.trim(),
      gstNum: formData.gstNumber ? formData.gstNumber.trim() : null,
      tanNum: formData.tanNumber.trim(),
      panNum: formData.panNumber.trim(),
      incDt: formData.incorporationDate,
      cin: formData.cinNumber.trim(),
      webUrl: formData.website ? formData.website.trim() : null,
      logo: finalLogoUrl ? finalLogoUrl : null,
      str: formData.streetAddress.trim(),
      ctVlg: formData.city.trim(),
      dist: formData.district.trim(),
      stId: formData.state ? Number(formData.state) : null,
      znNm: formData.zone,
      pin: formData.pincode.trim(),
      addlRem: formData.remarks ? formData.remarks.trim() : null,
      sts: formData.status === "Active",
      wrkDaysPerWk: formData.workingDaysPerWeek ? Number(formData.workingDaysPerWeek) : null
    };

    setLoading(true);
    fetch(isEditing ? `${apiBaseUrl}/api/companies/${editingId}` : `${apiBaseUrl}/api/companies`, {
      method: isEditing ? "PUT" : "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(companyPayload)
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          let errorMsg = "Failed to save company";
          try {
            const parsed = JSON.parse(errorText);
            if (parsed.message) errorMsg = parsed.message;
            else if (parsed.error && parsed.status) {
              errorMsg = `Server Error (${parsed.status}): ${parsed.error}. Please check the data constraints or duplicate values.`;
            }
          } catch (e) {
            errorMsg = errorText || errorMsg;
          }
          throw new Error(errorMsg);
        }

        const textData = await response.text();
        let savedCompany = {};
        try {
          if (textData) savedCompany = JSON.parse(textData);
        } catch (e) {
          console.warn("Response is not JSON, but request was successful:", textData);
        }
        try {
          const localData = JSON.parse(localStorage.getItem("company_local_fields") || "{}");
          localData[savedCompany.coyId] = {
            flatPlotDoor: formData.flatPlotDoor.trim(),
            workingDaysPerWeek: formData.workingDaysPerWeek
          };
          localStorage.setItem("company_local_fields", JSON.stringify(localData));
        } catch (e) {
          console.error("Error saving local company fields:", e);
        }

        triggerAlert("success", "Success", isEditing ? "Company updated successfully!" : "Company created successfully!");
        fetchCompanies();
        handleResetForm();
        setIsEditing(false);
        setEditingId(null);
        setView("list");
      })
      .catch((err) => {
        console.error("Save company failed:", err);
        triggerAlert("error", "Error", err.message || "Could not connect to server or save company.");
      })
      .finally(() => { setLoading(false); });
  };

  const handleEdit = (company) => {
    setFormData({
      companyName: company.coyNm || "",
      companyCode: company.coyCd || "",
      under: company.prntCoyId ? company.prntCoyId.toString() : "Independent",
      cinNumber: company.cin || "",
      gstNumber: company.gstNum || "",
      panNumber: company.panNum || "",
      tanNumber: company.tanNum || "",
      incorporationDate: company.incDt ? company.incDt.split('T')[0] : "",
      flatPlotDoor: company.flatPlotDoor || "",
      streetAddress: company.str || "",
      landMark: company.landMark || "",
      city: company.ctVlg || "",
      district: company.dist || "",
      state: company.stId ? company.stId.toString() : "",
      zone: company.znNm || "",
      pincode: company.pin || "",
      email: company.email || "",
      remarks: company.addlRem || "",
      website: company.webUrl || "",
      logo: company.logo || null,
      status: company.sts ? "Active" : "Inactive",
      workingDaysPerWeek: company.workingDaysPerWeek || ""
    });
    setFormErrors({});
    setLogoFile(null);
    setIsEditing(true);
    setIsViewing(false);
    setEditingId(company.coyId);
    setActiveDropdown(null);
    setView("form");
  };

  const handleView = (company) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setFormData({
      companyName: company.coyNm || "",
      companyCode: company.coyCd || "",
      under: company.prntCoyId ? company.prntCoyId.toString() : "Independent",
      cinNumber: company.cin || "",
      gstNumber: company.gstNum || "",
      panNumber: company.panNum || "",
      tanNumber: company.tanNum || "",
      incorporationDate: company.incDt ? company.incDt.split('T')[0] : "",
      flatPlotDoor: company.flatPlotDoor || "",
      streetAddress: company.str || "",
      landMark: company.landMark || "",
      city: company.ctVlg || "",
      district: company.dist || "",
      state: company.stId ? company.stId.toString() : "",
      zone: company.znNm || "",
      pincode: company.pin || "",
      email: company.email || "",
      remarks: company.addlRem || "",
      website: company.webUrl || "",
      logo: company.logo || null,
      status: company.sts ? "Active" : "Inactive",
      workingDaysPerWeek: company.workingDaysPerWeek || ""
    });
    setFormErrors({});
    setIsEditing(false);
    setIsViewing(true);
    setEditingId(company.coyId);
    setActiveDropdown(null);
    setActiveOverviewTab(null);
    setView("form");
  };

  const toggleDropdown = (id, event) => {
    if (event) event.stopPropagation();
    if (activeDropdown === id) {
      setActiveDropdown(null);
    } else {
      if (event) {
        const btn = event.currentTarget;
        const rect = btn.getBoundingClientRect();
        
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 150;
        const isTop = spaceBelow < dropdownHeight;
        
        setDropdownPos({
          isTop,
          top: rect.top,
          bottom: rect.bottom,
          right: window.innerWidth - rect.right
        });
      }
      setActiveDropdown(id);
    }
  };

  const triggerDeactivate = (id) => {
    setDeactivateTargetId(id);
    setShowDeactivateModal(true);
    setActiveDropdown(null);
  };

  const confirmDeactivate = async () => {
    const company = companies.find(c => c.coyId === deactivateTargetId);
    if (!company) return;

    const companyPayload = {
      coyCd: company.coyCd,
      coyNm: company.coyNm,
      prntCoyId: company.prntCoyId,
      email: company.email,
      gstNum: company.gstNum,
      tanNum: company.tanNum,
      panNum: company.panNum,
      incDt: company.incDt,
      cin: company.cin,
      webUrl: company.webUrl,
      logo: company.logo,
      str: company.str,
      ctVlg: company.ctVlg,
      dist: company.dist,
      stId: company.stId,
      znNm: company.znNm,
      pin: company.pin,
      addlRem: company.addlRem,
      sts: false,
      wrkDaysPerWk: company.wrkDaysPerWk ? Number(company.wrkDaysPerWk) : null
    };

    // setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/companies/${deactivateTargetId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(companyPayload)
      });
      if (!response.ok) throw new Error("Failed to deactivate company");
      triggerAlert("success", "Success", "Company deactivated successfully!");
      fetchCompanies();
    } catch (err) {
      console.error("Deactivate company failed:", err);
      triggerAlert("error", "Error", "Could not deactivate company.");
    } finally {
      // setLoading(false);
    }

    setShowDeactivateModal(false);
    setDeactivateTargetId(null);
  };

  const handleDelete = (id) => {
    setAlertConfig({
      isOpen: true,
      type: "warning",
      title: "Confirm Delete",
      message: "Are you sure you want to delete this company?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        // setLoading(true);
        try {
          const response = await fetch(`${apiBaseUrl}/api/companies/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
          });
          if (!response.ok) {
            const errorText = await response.text();
            let errorMsg = "Could not delete company.";
            try {
              const parsed = JSON.parse(errorText);
              if (parsed.message) errorMsg = parsed.message;
              else if (parsed.error && parsed.status === 500) {
                errorMsg = "Cannot delete this company because it is currently linked to other records (like a subsidiary company or a plant). Please remove those links first or deactivate the company instead.";
              } else if (parsed.error) {
                errorMsg = parsed.error;
              }
            } catch (e) {
              errorMsg = errorText || errorMsg;
            }
            throw new Error(errorMsg);
          }

          try {
            const localData = JSON.parse(localStorage.getItem("company_local_fields") || "{}");
            delete localData[id];
            localStorage.setItem("company_local_fields", JSON.stringify(localData));
          } catch (e) {
            console.error("Error removing local company fields:", e);
          }

          triggerAlert("success", "Success", "Company deleted successfully!");
          fetchCompanies();
        } catch (err) {
          console.error("Delete company failed:", err);
          triggerAlert("error", "Error", err.message || "Could not delete company.");
        } finally {
          // setLoading(false);
        }
      }
    });
    setActiveDropdown(null);
  };

  // Sorting calculation
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedCompanies = React.useMemo(() => {
    let sortable = [...companies];

    if (tableSearchQuery) {
      const q = tableSearchQuery.toLowerCase();
      sortable = sortable.filter(company => {
        const code = (company.coyCd || company.companyCode || "").toLowerCase();
        const name = (company.coyNm || company.companyName || "").toLowerCase();
        return code.includes(q) || name.includes(q);
      });
    }

    if (sortConfig.key !== null) {
      sortable.sort((a, b) => {
        let valA = "";
        let valB = "";
        if (sortConfig.key === "companyName") {
          valA = (a.coyNm || "").toString().toLowerCase();
          valB = (b.coyNm || "").toString().toLowerCase();
        } else if (sortConfig.key === "companyCode") {
          valA = (a.coyCd || "").toString().toLowerCase();
          valB = (b.coyCd || "").toString().toLowerCase();
        } else if (sortConfig.key === "state") {
          const stateAObj = states.find(s => s.stId === a.stId);
          const stateBObj = states.find(s => s.stId === b.stId);
          valA = (stateAObj ? stateAObj.stNm : "").toString().toLowerCase();
          valB = (stateBObj ? stateBObj.stNm : "").toString().toLowerCase();
        } else {
          valA = (a[sortConfig.key] || "").toString().toLowerCase();
          valB = (b[sortConfig.key] || "").toString().toLowerCase();
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [companies, sortConfig, states, tableSearchQuery]);

  // Pagination logic
  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentItems = sortedCompanies.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedCompanies.length / recordsPerPage);

  // Calculate company overview counts for the selected company
  const companyPlants = plants.filter(p => Number(p.coyId) === Number(editingId));
  const plantsCount = companyPlants.length;

  const companyPlantIds = new Set(companyPlants.map(p => Number(p.pltId)));
  const landsCount = lands.filter(l => l.pltId && companyPlantIds.has(Number(l.pltId))).length;

  const employeesCount = employees.filter(emp => Number(emp.coyId) === Number(editingId)).length;

  const companyDeptMappings = deptMappings.filter(map => Number(map.coyId) === Number(editingId));
  const uniqueDeptIds = new Set(companyDeptMappings.map(map => Number(map.deptId)));
  const departmentsCount = uniqueDeptIds.size;
  const companyDeptsFiltered = departments.filter(d => uniqueDeptIds.has(Number(d.deptId)));

  const companyProjectsFiltered = projects.filter(p => {
    const matchCoy = Number(p.coyId || p.companyId) === Number(editingId);
    const statusUpper = String(p.status || p.prjSts || '').toUpperCase();
    return matchCoy && statusUpper !== 'DRAFT';
  });
  const projectsCount = companyProjectsFiltered.length;

  const companySubsidiaries = companies.filter(c => Number(c.prntCoyId) === Number(editingId));
  const subsidiariesCount = companySubsidiaries.length;

  return (
    <div className="cc-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="cc-shell">

        <Header
          title="Company Creation"
          showSearch={false}
          userName=""
          userRole=""
          initials=""
        />

        <main className="cc-main" style={{ padding: '24px' }}>

          {view === "form" ? (
            <>
              <div className="cc-content" style={{ paddingBottom: '80px' }}>

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
                      <h2 style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#0f172a',
                        margin: 0
                      }}>
                        {isViewing ? "View Company Details" : isEditing ? "Edit Company" : "Add New Company"}
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                        {isViewing ? "View company details below" : isEditing ? "Update company details in the form below" : "Enter company details in the form below"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="cc-nav-view-btn"
                      onClick={() => {
                        window.scrollTo(0, 0);
                        setView("list");
                        handleResetForm();
                        setIsEditing(false);
                        setIsViewing(false);
                        setEditingId(null);
                      }}
                    >
                      <ChevronLeft size={15} /> Back to Company List
                    </button>
                  </div>

                  <div style={{ padding: '24px' }}>
                    {isViewing ? (
                      <div className="cc-view-unified" style={{ padding: '12px 0' }}>
                        {/* Company Overview Dashboard Grid */}
                        <div style={{ marginBottom: '32px' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building2 size={18} style={{ color: '#2563eb' }} />
                            Company Overview
                          </h3>
                          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', marginTop: 0 }}>
                            Click on any card below to view its corresponding list details.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '12px' }}>
                            {/* Card 1: Plants */}
                            <div 
                              className="cc-overview-card" 
                              onClick={() => setActiveOverviewTab(activeOverviewTab === 'plants' ? null : 'plants')}
                              style={{ 
                                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                                border: activeOverviewTab === 'plants' ? '2px solid #2563eb' : '1px solid #bfdbfe', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transform: activeOverviewTab === 'plants' ? 'scale(1.02)' : 'none',
                                boxShadow: activeOverviewTab === 'plants' ? '0 4px 12px rgba(37,99,235,0.15)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Plants</span>
                              <strong style={{ fontSize: '28px', color: '#1e3a8a', marginTop: '8px', zIndex: 1 }}>{plantsCount}</strong>
                              <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.1, color: '#1e3a8a', pointerEvents: 'none' }}>
                                <Building2 size={70} />
                              </div>
                            </div>
                            {/* Card 2: Lands */}
                            <div 
                              className="cc-overview-card" 
                              onClick={() => setActiveOverviewTab(activeOverviewTab === 'lands' ? null : 'lands')}
                              style={{ 
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                                border: activeOverviewTab === 'lands' ? '2px solid #16a34a' : '1px solid #bbf7d0', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transform: activeOverviewTab === 'lands' ? 'scale(1.02)' : 'none',
                                boxShadow: activeOverviewTab === 'lands' ? '0 4px 12px rgba(22,163,74,0.15)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Lands</span>
                              <strong style={{ fontSize: '28px', color: '#14532d', marginTop: '8px', zIndex: 1 }}>{landsCount}</strong>
                              <div style={{ position: 'absolute', right: '10px', bottom: '-15px', opacity: 0.1, color: '#14532d', fontSize: '70px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                                L
                              </div>
                            </div>
                            {/* Card 3: Employees */}
                            <div 
                              className="cc-overview-card" 
                              onClick={() => setActiveOverviewTab(activeOverviewTab === 'employees' ? null : 'employees')}
                              style={{ 
                                background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', 
                                border: activeOverviewTab === 'employees' ? '2px solid #7c3aed' : '1px solid #e9d5ff', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transform: activeOverviewTab === 'employees' ? 'scale(1.02)' : 'none',
                                boxShadow: activeOverviewTab === 'employees' ? '0 4px 12px rgba(124,58,237,0.15)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employees</span>
                              <strong style={{ fontSize: '28px', color: '#581c87', marginTop: '8px', zIndex: 1 }}>{employeesCount}</strong>
                              <div style={{ position: 'absolute', right: '10px', bottom: '-15px', opacity: 0.1, color: '#581c87', fontSize: '70px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                                E
                              </div>
                            </div>
                            {/* Card 4: Departments */}
                            <div 
                              className="cc-overview-card" 
                              onClick={() => setActiveOverviewTab(activeOverviewTab === 'departments' ? null : 'departments')}
                              style={{ 
                                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', 
                                border: activeOverviewTab === 'departments' ? '2px solid #ea580c' : '1px solid #fed7aa', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transform: activeOverviewTab === 'departments' ? 'scale(1.02)' : 'none',
                                boxShadow: activeOverviewTab === 'departments' ? '0 4px 12px rgba(234,88,12,0.15)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Departments</span>
                              <strong style={{ fontSize: '28px', color: '#7c2d12', marginTop: '8px', zIndex: 1 }}>{departmentsCount}</strong>
                              <div style={{ position: 'absolute', right: '10px', bottom: '-15px', opacity: 0.1, color: '#7c2d12', fontSize: '70px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                                D
                              </div>
                            </div>
                            {/* Card 5: Projects */}
                            <div 
                              className="cc-overview-card" 
                              onClick={() => setActiveOverviewTab(activeOverviewTab === 'projects' ? null : 'projects')}
                              style={{ 
                                background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', 
                                border: activeOverviewTab === 'projects' ? '2px solid #db2777' : '1px solid #fbcfe8', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transform: activeOverviewTab === 'projects' ? 'scale(1.02)' : 'none',
                                boxShadow: activeOverviewTab === 'projects' ? '0 4px 12px rgba(219,39,119,0.15)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#9d174d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projects</span>
                              <strong style={{ fontSize: '28px', color: '#831843', marginTop: '8px', zIndex: 1 }}>{projectsCount}</strong>
                              <div style={{ position: 'absolute', right: '10px', bottom: '-15px', opacity: 0.1, color: '#831843', fontSize: '70px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                                P
                              </div>
                            </div>
                            {/* Card 6: Subsidiaries */}
                            <div 
                              className="cc-overview-card" 
                              onClick={() => setActiveOverviewTab(activeOverviewTab === 'subsidiaries' ? null : 'subsidiaries')}
                              style={{ 
                                background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', 
                                border: activeOverviewTab === 'subsidiaries' ? '2px solid #0d9488' : '1px solid #99f6e4', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transform: activeOverviewTab === 'subsidiaries' ? 'scale(1.02)' : 'none',
                                boxShadow: activeOverviewTab === 'subsidiaries' ? '0 4px 12px rgba(13,148,136,0.15)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subsidiaries</span>
                              <strong style={{ fontSize: '28px', color: '#115e59', marginTop: '8px', zIndex: 1 }}>{subsidiariesCount}</strong>
                              <div style={{ position: 'absolute', right: '10px', bottom: '-15px', opacity: 0.1, color: '#115e59', fontSize: '70px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                                S
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Overview Detail List Container */}
                        {activeOverviewTab && (
                          <div style={{ 
                            marginBottom: '32px', 
                            backgroundColor: '#f8fafc', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '12px', 
                            padding: '20px',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', margin: 0, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {activeOverviewTab === 'plants' && <Building2 size={16} style={{ color: '#2563eb' }} />}
                                {activeOverviewTab === 'lands' && <MapPin size={16} style={{ color: '#16a34a' }} />}
                                {activeOverviewTab === 'employees' && <Users size={16} style={{ color: '#7c3aed' }} />}
                                {activeOverviewTab === 'departments' && <Briefcase size={16} style={{ color: '#ea580c' }} />}
                                {activeOverviewTab === 'projects' && <FileText size={16} style={{ color: '#db2777' }} />}
                                {activeOverviewTab === 'subsidiaries' && <Building2 size={16} style={{ color: '#0d9488' }} />}
                                Associated {activeOverviewTab === 'subsidiaries' ? 'Subsidiary' : activeOverviewTab} List
                              </h4>
                              <button 
                                type="button" 
                                onClick={() => setActiveOverviewTab(null)} 
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: '#64748b', 
                                  cursor: 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  fontSize: '13px',
                                  fontWeight: '600'
                                }}
                              >
                                Close Table
                              </button>
                            </div>
                            
                            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                  {activeOverviewTab === 'plants' && (
                                    <tr>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>S.NO</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Plant Code</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Plant Name</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Email</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Capacity (TPD)</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>District</th>
                                    </tr>
                                  )}
                                  {activeOverviewTab === 'lands' && (
                                    <tr>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>S.NO</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Land Code</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Plant Name</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Owner Name(s)</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Area (Acres)</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Mobile No</th>
                                    </tr>
                                  )}
                                  {activeOverviewTab === 'employees' && (
                                    <tr>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>S.NO</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Employee Code</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Employee Name</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Designation</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Email</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Phone</th>
                                    </tr>
                                  )}
                                  {activeOverviewTab === 'departments' && (
                                    <tr>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>S.NO</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Department Code</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Department Name</th>
                                    </tr>
                                  )}
                                  {activeOverviewTab === 'projects' && (
                                    <tr>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>S.NO</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Project Code</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Project Name</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Priority</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Status</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Start Date</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>End Date</th>
                                    </tr>
                                  )}
                                  {activeOverviewTab === 'subsidiaries' && (
                                    <tr>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>S.NO</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Company Code</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Company Name</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>CIN Number</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>GST Number</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Status</th>
                                    </tr>
                                  )}
                                </thead>
                                <tbody>
                                  {activeOverviewTab === 'plants' && (
                                    plants.filter(p => Number(p.coyId) === Number(editingId)).length > 0 ? (
                                      plants.filter(p => Number(p.coyId) === Number(editingId)).map((p, idx) => (
                                        <tr key={p.pltId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                          <td style={{ padding: '10px 12px' }}>
                                            <span style={{ backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', color: '#1e40af' }}>
                                              {p.pltCd || 'N/A'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{p.pltNm || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{p.email || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{p.cap || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{p.dist || 'N/A'}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                          No plants found for this company.
                                        </td>
                                      </tr>
                                    )
                                  )}
                                  {activeOverviewTab === 'lands' && (
                                    lands.filter(l => l.pltId && companyPlantIds.has(Number(l.pltId))).length > 0 ? (
                                      lands.filter(l => l.pltId && companyPlantIds.has(Number(l.pltId))).map((l, idx) => {
                                        const owners = l.landOwners || (Array.isArray(l.landOwnerName) ? l.landOwnerName.join(', ') : l.landOwnerName) || 'N/A';
                                        return (
                                          <tr key={l.landId || l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                              <span style={{ backgroundColor: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', color: '#166534' }}>
                                                {l.landCd || l.landCode || 'N/A'}
                                              </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{plants.find(p => Number(p.pltId) === Number(l.pltId))?.pltNm || 'N/A'}</td>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{owners}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>{l.landSize || l.landArea || 'N/A'}</td>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{l.mobNum || l.mobileNo || 'N/A'}</td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                          No land records found for this company.
                                        </td>
                                      </tr>
                                    )
                                  )}
                                  {activeOverviewTab === 'employees' && (
                                    employees.filter(emp => Number(emp.coyId) === Number(editingId)).length > 0 ? (
                                      employees.filter(emp => Number(emp.coyId) === Number(editingId)).map((emp, idx) => {
                                        const code = emp.empCode || emp.empCd || emp.employeeCode || emp.code || 'N/A';
                                        const name = emp.employeeName || `${emp.firstName || emp.fstNm || ''} ${emp.lastName || emp.lstNm || ''}`.trim() || 'N/A';
                                        return (
                                          <tr key={emp.empId || emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                              <span style={{ backgroundColor: '#faf5ff', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', color: '#6b21a8' }}>
                                                {code}
                                              </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{name}</td>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{emp.designation || emp.desigNm || 'N/A'}</td>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{emp.email || 'N/A'}</td>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{emp.mobile || emp.mobNum || emp.phNo || 'N/A'}</td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                          No employees found for this company.
                                        </td>
                                      </tr>
                                    )
                                  )}
                                  {activeOverviewTab === 'departments' && (
                                    companyDeptsFiltered.length > 0 ? (
                                      companyDeptsFiltered.map((d, idx) => (
                                        <tr key={d.deptId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                          <td style={{ padding: '10px 12px' }}>
                                            <span style={{ backgroundColor: '#fff7ed', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', color: '#9a3412' }}>
                                              {d.deptCode || d.deptCd || 'N/A'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{d.deptNm || 'N/A'}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                          No departments found for this company.
                                        </td>
                                      </tr>
                                    )
                                  )}
                                  {activeOverviewTab === 'projects' && (
                                    companyProjectsFiltered.length > 0 ? (
                                      companyProjectsFiltered.map((p, idx) => {
                                        const code = p.projectCode || p.prjCd || 'N/A';
                                        const name = p.projectName || p.prjNm || 'N/A';
                                        const prio = p.priority || p.prjPrty || 'N/A';
                                        const sts = p.status || p.prjSts || 'N/A';
                                        const start = p.startDate || p.stDt || p.tentStDt || 'N/A';
                                        const end = p.endDate || p.endDt || p.tentEndDt || 'N/A';
                                        const prioUpper = String(prio).toUpperCase();
                                        const stsUpper = String(sts).toUpperCase();
                                        return (
                                          <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                              <span style={{ backgroundColor: '#fdf2f8', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', color: '#9d174d' }}>
                                                {code}
                                              </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{name}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                              <span style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                backgroundColor: prioUpper === 'HIGH' ? '#fee2e2' : prioUpper === 'MEDIUM' ? '#fef3c7' : '#dcfce7',
                                                color: prioUpper === 'HIGH' ? '#991b1b' : prioUpper === 'MEDIUM' ? '#92400e' : '#166534'
                                              }}>
                                                {prio}
                                              </span>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                              <span style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                backgroundColor: stsUpper === 'LIVE' || stsUpper === 'ACTIVE' || stsUpper === 'COMPLETED' ? '#dcfce7' : '#f1f5f9',
                                                color: stsUpper === 'LIVE' || stsUpper === 'ACTIVE' || stsUpper === 'COMPLETED' ? '#15803d' : '#475569'
                                              }}>
                                                {sts}
                                              </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{formatDate(start)}</td>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>{formatDate(end)}</td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                          No projects found for this company.
                                        </td>
                                      </tr>
                                    )
                                  )}
                                  {activeOverviewTab === 'subsidiaries' && (
                                    companySubsidiaries.length > 0 ? (
                                      companySubsidiaries.map((sub, idx) => (
                                        <tr key={sub.coyId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                          <td style={{ padding: '10px 12px' }}>
                                            <span style={{ backgroundColor: '#f0fdfa', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', color: '#0f766e' }}>
                                              {sub.coyCd || sub.coyCode || 'N/A'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{sub.coyNm || sub.coyName || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{sub.cin || sub.cinNo || sub.cinNumber || sub.cinNum || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{sub.gstNum || sub.gstNo || sub.gstNumber || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                              padding: '2px 8px',
                                              borderRadius: '12px',
                                              fontSize: '11px',
                                              fontWeight: '600',
                                              backgroundColor: String(sub.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                                              color: String(sub.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? '#15803d' : '#991b1b'
                                            }}>
                                              {sub.status || 'Active'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                          No subsidiary companies found for this company.
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                          Company Profile Details
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Company Code :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.companyCode || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Parent Company :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{companies.find(c => String(c.coyId) === String(formData.under))?.coyNm || 'Independent'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>CIN Number :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.cinNumber || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>PAN Number :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.panNumber || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Incorporation Date :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formatDate(formData.incorporationDate)}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Address :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.streetAddress || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>State :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{states.find(s => String(s.stId) === String(formData.state))?.stNm || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Company Logo :</span>
                              <div>
                                 {formData.logo ? (
                                   <img src={formData.logo} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                 ) : (
                                   <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={20} style={{ color: '#94a3b8' }} /></div>
                                 )}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Website :</span>
                              <span style={{ fontSize: '14px', color: '#2563eb', fontWeight: '500' }}>
                                {formData.website ? <a href={formData.website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{formData.website}</a> : '-'}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Remarks :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.remarks || '-'}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Company Name :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.companyName || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Status :</span>
                              <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', width: 'fit-content', backgroundColor: formData.status === 'Active' ? '#dcfce7' : '#fee2e2', color: formData.status === 'Active' ? '#166534' : '#991b1b' }}>{formData.status}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>GST Number :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.gstNumber || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>TAN Number :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.tanNumber || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Email :</span>
                              <span style={{ fontSize: '14px', color: '#2563eb', fontWeight: '500' }}>{formData.email || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>City/Village :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.city || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>District :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.district || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Pincode :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.pincode || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Zone :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.zone || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Working Days :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.workingDaysPerWeek ? `${formData.workingDaysPerWeek} Days/Week` : '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <section className="cc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                          Company Details
                        </h3>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>Status:</span>

                          <label style={{ position: "relative", display: "inline-block", width: "46px", height: "26px", margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={formData.status === "Active"}
                              onChange={handleToggleStatus}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                              backgroundColor: formData.status === "Active" ? "#10b981" : "#cbd5e1",
                              transition: ".4s", borderRadius: "34px"
                            }}>
                              <span style={{
                                position: "absolute", height: "20px", width: "20px",
                                left: formData.status === "Active" ? "23px" : "3px", bottom: "3px",
                                backgroundColor: "white", transition: ".4s", borderRadius: "50%",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                              }}></span>
                            </span>
                          </label>

                          <span style={{
                            fontSize: "14px", fontWeight: "600", minWidth: "60px",
                            color: formData.status === "Active" ? "#16a34a" : "#dc2626"
                          }}>
                            {formData.status}
                          </span>
                        </div>
                      </div>

                      <div className="cc-form-layout-row columns-4">
                        <label className="cc-field-item">
                          <span>Company Name <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Enter company name" maxLength={100} />
                          {formErrors.companyName && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.companyName}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>Company Code <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="companyCode" value={formData.companyCode} readOnly placeholder="Auto-generated code" />
                          {formErrors.companyCode && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.companyCode}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>Under / Subsidiary <b style={{ color: '#ef4444' }}>*</b></span>
                          <SearchableSelect 
                            name="under" 
                            value={formData.under} 
                            onChange={handleInputChange} 
                            placeholder="Select Parent Company"
                            options={[
                              ...companies
                                .filter(c => !editingId || Number(c.coyId) !== Number(editingId))
                                .map(c => ({ value: c.coyId, label: c.coyNm })),
                              { value: "Independent", label: "Independent (No Parent)" }
                            ]}
                          />
                          {formErrors.under && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.under}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>CIN Number <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="cinNumber" value={formData.cinNumber} onChange={handleInputChange} placeholder="Enter CIN number" maxLength={21} />
                          {formErrors.cinNumber && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.cinNumber}</span>}
                        </label>
                      </div>

                      <div className="cc-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                        <label className="cc-field-item">
                          <span>GST Number</span>
                          <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} placeholder="Enter GST number" maxLength={20} />
                          {formErrors.gstNumber && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.gstNumber}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>PAN Number <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="panNumber" value={formData.panNumber} onChange={handleInputChange} placeholder="Enter PAN number" maxLength={10} />
                          {formErrors.panNumber && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.panNumber}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>TAN Number <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="tanNumber" value={formData.tanNumber} onChange={handleInputChange} placeholder="Enter TAN number" maxLength={15} />
                          {formErrors.tanNumber && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.tanNumber}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>Incorporation Date <b style={{ color: '#ef4444' }}>*</b></span>
                          <input 
                            type="date"
                            name="incorporationDate"
                            value={formData.incorporationDate}
                            onChange={handleInputChange}
                            max={new Date().toISOString().split('T')[0]}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none',
                              boxSizing: 'border-box',
                              height: '40px'
                            }}
                          />
                          {formErrors.incorporationDate && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.incorporationDate}</span>}
                        </label>
                      </div>

                      <div className="cc-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                        <label className="cc-field-item">
                          <span>Company Logo</span>
                          <div className="cc-logo-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="cc-logo-box" style={{ width: '48px', height: '48px', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden', flexShrink: 0 }}>
                              {formData.logo ? <img src={formData.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={22} style={{ color: '#94a3b8' }} />}
                            </div>
                            <input id="logoUploadHidden" type="file" accept="image/*" onChange={handleLogoChange} disabled={isViewing} hidden />
                            {!isViewing && (
                              <>
                                <button type="button" onClick={() => document.getElementById("logoUploadHidden").click()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#0f172a', cursor: 'pointer', height: '38px', whiteSpace: 'nowrap' }}>
                                  <Upload size={14} /> Upload Logo
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeleteLogo}
                                  disabled={!formData.logo}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    background: formData.logo ? '#fef2f2' : '#f8fafc',
                                    border: formData.logo ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: formData.logo ? '#dc2626' : '#94a3b8',
                                    cursor: formData.logo ? 'pointer' : 'not-allowed',
                                    height: '38px',
                                    whiteSpace: 'nowrap',
                                    opacity: formData.logo ? 1 : 0.6
                                  }}
                                  title="Delete logo"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </label>
                        <label className="cc-field-item">
                          <span>Working Days Per Week <b style={{ color: '#ef4444' }}>*</b></span>
                          <select
                            name="workingDaysPerWeek"
                            value={formData.workingDaysPerWeek}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              height: '40px',
                              fontSize: '14px',
                              color: '#0f172a',
                              backgroundColor: 'white',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="" disabled hidden>Select working days</option>
                            <option value="5">5 days per week</option>
                            <option value="6">6 days per week</option>
                          </select>
                          {formErrors.workingDaysPerWeek && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.workingDaysPerWeek}</span>}
                        </label>
                      </div>

                    </section>

                    <section className="cc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="cc-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Address Information</h3>
                      <div className="cc-form-layout-row columns-4">

                        <label className="cc-field-item">
                          <span>Street Address <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="streetAddress" value={formData.streetAddress} onChange={handleInputChange} placeholder="Enter street address" maxLength={50} />
                          {formErrors.streetAddress && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.streetAddress}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>City/Village <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="Enter city/village" maxLength={30} />
                          {formErrors.city && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.city}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>District <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="district" value={formData.district} onChange={handleInputChange} placeholder="Enter district" maxLength={30} />
                          {formErrors.district && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.district}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>Pincode <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} placeholder="Enter 6-digit pincode" maxLength={6} />
                          {formErrors.pincode && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.pincode}</span>}
                        </label>
                      </div>

                      <div className="cc-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                        <label className="cc-field-item">
                          <span>State <b style={{ color: '#ef4444' }}>*</b></span>
                          <SearchableSelect 
                            name="state" 
                            value={formData.state} 
                            onChange={handleStateChange} 
                            placeholder="Select State"
                            options={states.map(s => ({ value: s.stId, label: s.stNm }))}
                          />
                          {formErrors.state && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.state}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>Zone <b style={{ color: '#ef4444' }}>*</b></span>
                          <input
                            type="text"
                            name="zone"
                            value={formData.zone}
                            readOnly
                            className="cc-readonly-input"
                            placeholder="Auto-fills from State"
                          />
                          {formErrors.zone && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.zone}</span>}
                        </label>
                      </div>
                    </section>

                    <section className="cc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="cc-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Contact Information</h3>
                      <div className="cc-form-layout-row columns-2">
                        <label className="cc-field-item">
                          <span>Email <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email address" maxLength={100} />
                          {formErrors.email && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.email}</span>}
                        </label>
                        <label className="cc-field-item">
                          <span>Website URL</span>
                          <input type="url" name="website" value={formData.website} onChange={handleInputChange} placeholder="Enter URL" maxLength={100} />
                          {formErrors.website && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.website}</span>}
                        </label>
                      </div>

                      <div className="cc-form-layout-row columns-1" style={{ marginTop: '20px' }}>
                        <label className="cc-field-item">
                          <span>Remarks</span>
                          <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} placeholder="Enter Remarks" rows={3} maxLength={255} />
                          {formErrors.remarks && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.remarks}</span>}
                        </label>
                      </div>
                    </section>
                      </>
                    )}
                  </div>

                  {!isViewing && (
                  <div className="cc-form-footer" style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    padding: '16px 24px',
                    backgroundColor: '#fafbfc',
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    <button type="button" className="cc-btn primary" onClick={handleSave} disabled={loading} style={loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
                      <Save size={14} /> {loading ? (isEditing ? "Updating..." : "Saving...") : (isEditing ? "Update Company" : "Save Company")}
                    </button>
                    <button type="button" className="cc-btn secondary" onClick={() => {
                      setView("list");
                      handleResetForm();
                      setIsEditing(false);
                      setIsViewing(false);
                      setEditingId(null);
                    }}>
                      Cancel
                    </button>
                  </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="cc-content">

              <div className="cc-table-panel" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 24px',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                      Company List
                    </h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
                      View and manage all company records
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search companies..."
                        value={tableSearchQuery}
                        onChange={(e) => {
                          setTableSearchQuery(e.target.value);
                          setCurrentPage(1); // Reset to first page on search
                        }}
                        style={{ padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '250px' }}
                      />
                    </div>
                    {screenPerm.canCreate && (
                      <button
                        type="button"
                        className="cc-btn-add-new"
                        onClick={() => {
                          handleResetForm();
                          setIsEditing(false);
                          setView("form");
                        }}
                      >
                        <Plus size={16} /> Add New Company
                      </button>
                    )}
                  </div>
                </div>

                <div className="cc-table-container" style={{ overflowX: 'auto' }}>
                  <table className="cc-list-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '2200px' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ width: "50px", padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>S.NO</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LOGO</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          COMPANY NAME
                        </th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          CODE
                        </th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>UNDER</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CIN NUMBER</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GST NUMBER</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PAN NUMBER</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TAN NUMBER</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>INCORPORATION DATE</th>

                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STREET ADDRESS</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CITY</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DISTRICT</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STATE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ZONE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PINCODE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EMAIL</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REMARKS</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>WEBSITE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>WORKING DAYS PER WEEK</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STATUS</th>
                        <th style={{ textAlign: "center", width: "100px", padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="22" style={{ textAlign: "center", padding: "60px 20px" }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#64748b', fontSize: '14px' }}>
                              <RefreshCcw className="spinning" size={16} />
                              <span>Loading companies...</span>
                            </div>
                          </td>
                        </tr>
                      ) : currentItems.length > 0 ? (
                        currentItems.map((company, index) => (
                          <tr key={company.coyId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{indexOfFirstRecord + index + 1}</td>
                            <td style={{ padding: '14px 20px' }}>
                              {company.logo ? (
                                <img src={company.logo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                                  <Building2 size={16} style={{ color: '#94a3b8' }} />
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}><strong>{company.coyNm}</strong></td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                                {company.coyCd}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{companies.find(c => c.coyId === company.prntCoyId)?.coyNm || "Independent"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.cin || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.gstNum || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.panNum || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.tanNum || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{formatDate(company.incDt)}</td>

                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.str || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.ctVlg || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.dist || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{states.find(s => Number(s.stId) === Number(company.stId))?.stNm || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.znNm || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.pin || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.email || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.addlRem || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.webUrl || "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{company.workingDaysPerWeek ? `${company.workingDaysPerWeek} Days` : "N/A"}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              <span
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'inline-block',
                                  backgroundColor: company.sts ? '#dcfce7' : '#fee2e2',
                                  color: company.sts ? '#166534' : '#991b1b'
                                }}
                              >
                                {company.sts ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ position: "relative", padding: '14px 20px', textAlign: 'center' }}>
                              <button
                                id={`action-btn-${company.coyId}`}
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }}
                                onClick={(e) => toggleDropdown(company.coyId, e)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <MoreVertical size={18} />
                              </button>

                                {activeDropdown === company.coyId && (
                                  <>
                                    <div className="cc-actions-dropdown-backdrop" onClick={() => setActiveDropdown(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />
                                    <div className="cc-actions-dropdown-menu" style={{ position: 'fixed', right: `${dropdownPos.right}px`, top: dropdownPos.isTop ? 'auto' : `${dropdownPos.bottom}px`, bottom: dropdownPos.isTop ? `${window.innerHeight - dropdownPos.top}px` : 'auto', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 99, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                      <button
                                      type="button"
                                      style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                      onClick={() => handleView(company)}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <Eye size={15} /> View
                                    </button>
                                    {screenPerm.canEdit && (
                                      <button
                                        type="button"
                                        style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                        onClick={() => handleEdit(company)}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                      >
                                        <Edit size={15} /> Edit
                                      </button>
                                    )}
                                    {screenPerm.canDelete && (
                                      <button
                                        type="button"
                                        style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ef4444', borderRadius: '4px', margin: '2px 4px' }}
                                        onClick={() => handleDelete(company.coyId)}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                      >
                                        <Trash2 size={15} /> Delete
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="22" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>
                            No company records found. Add a new company using the button above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderTop: '1px solid #e2e8f0',
                    backgroundColor: '#fafbfc'
                  }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                      Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, sortedCompanies.length)} of {sortedCompanies.length} entries
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: currentPage === 1 ? '#f1f5f9' : 'white',
                          color: currentPage === 1 ? '#94a3b8' : '#334155',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        Previous
                      </button>
                      
                      <button
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #2563eb',
                          borderRadius: '6px',
                          background: '#2563eb',
                          color: 'white',
                          cursor: 'default',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        {currentPage}
                      </button>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: currentPage === totalPages ? '#f1f5f9' : 'white',
                          color: currentPage === totalPages ? '#94a3b8' : '#334155',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </main>
      </div>


      {showDeactivateModal && (
        <div className="cc-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="cc-modal" style={{ backgroundColor: 'white', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <div className="cc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Deactivate Company Record</h3>
              <button
                type="button"
                className="cc-modal-close"
                onClick={() => setShowDeactivateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="cc-modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '14px' }}>Are you sure you want to deactivate this company record?</p>
              <p className="cc-modal-warning" style={{ margin: 0, color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>
                This will change its status to Inactive.
              </p>
            </div>
            <div className="cc-modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                className="cc-btn-cancel-modal"
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cc-btn-delete-modal"
                onClick={confirmDeactivate}
              >
                <Trash2 size={14} /> Deactivate
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
    </div>
  );
};

export default CompanyCreation;
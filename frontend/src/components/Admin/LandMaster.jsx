import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar.jsx';
import Header from '../Header.jsx';
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
  Calendar,
  MoreVertical,
  ChevronLeft,
  MapPin,
  Map,
  Upload,
  Image as ImageIcon,
  Info,
  Building2,
  Factory,
  FileText,
  Users
} from "lucide-react";
import '../../styles/LandMaster.css';
import AlertModal from "../AlertModal.jsx";
import { getScreenPermission } from "../../utils/permissions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

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
        <span style={{ fontSize: '12px', color: '#64748b' }}>▼</span>
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

const AgriLandAllocation = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('LAND_CREATION');
  const navigate = useNavigate();

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  const triggerAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const [allocations, setAllocations] = useState([]);
  const [plants, setPlants] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);

  const calculateDuration = (startDt, endDt) => {
    if (!startDt || !endDt) return "";

    const parseDateLocal = (dtString) => {
      const parts = dtString.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
      return new Date(dtString);
    };

    const start = parseDateLocal(startDt);
    const end = parseDateLocal(endDt);
    if (!start || !end || end < start) return "Invalid Dates (End before Start)";

    // Inclusive of the end date
    end.setDate(end.getDate() + 1);

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const previousMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += previousMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    let durationStr = [];
    if (years > 0) durationStr.push(`${years} Years`);
    if (months > 0) durationStr.push(`${months} Months`);
    if (days > 0) durationStr.push(`${days} Days`);
    if (durationStr.length === 0) durationStr.push("0 Days");

    return durationStr.join(', ');
  };

  const generateLandCode = (lList = allocations) => {
    let maxNum = 0;
    if (Array.isArray(lList)) {
      lList.forEach(l => {
        const code = l.landCd || l.lndCd || l.landCode || "";
        const match = code.match(/^LND-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
    }
    return `LND-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const fetchLands = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/lands`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        const enriched = data.map(land => {
          const rawAlloted = land.allotedFor || land.AllotedFor || land.alcTyp || "";
          let allotedVal;
          if (!rawAlloted || rawAlloted === "null") allotedVal = "N/A";
          else if (rawAlloted === "AGL" || rawAlloted === "Agriculture Land") allotedVal = "Agriculture Land";
          else if (rawAlloted === "PLT" || rawAlloted === "Plant") allotedVal = "Plant";
          else allotedVal = rawAlloted;

          return {
            ...land,
            id: land.landId,
            landCode: land.landCd || "",
            plant: land.pltId ? land.pltId.toString() : "",
            allotedFor: allotedVal,
            surveyNo: land.surveyNo ? land.surveyNo.split(",") : [],
            landOwnerName: land.landOwners ? land.landOwners.split(",") : [],
            mobileNo: land.mobNum || "",
            state: land.stId ? land.stId.toString() : "",
            zone: states.find(s => Number(s.stId) === Number(land.stId))?.znNm || "",
            status: land.sts ? "Active" : "Inactive",
            landArea: land.landSize ? land.landSize.toString() : "",
            latitude: land.lat || "",
            longitude: land.longt || "",
            district: land.dist || "",
            mandal: land.mdl || "",
            village: land.vlg || "",
            pincode: land.pin || "",
            landType: land.ownershipType && land.ownershipType !== "null" ? land.ownershipType : "",
            leaseStartDate: land.leaseDt && land.leaseDt !== "null" ? land.leaseDt.split('T')[0] : "",
            leaseEndDate: land.leaseEndDt && land.leaseEndDt !== "null" ? land.leaseEndDt.split('T')[0] : "",
            leaseDuration: calculateDuration(land.leaseDt && land.leaseDt !== "null" ? land.leaseDt : null, land.leaseEndDt && land.leaseEndDt !== "null" ? land.leaseEndDt : null)
          };
        });
        setAllocations(enriched);
        setForm(prev => {
          if (!prev.landCode || /^LND-\d+$/i.test(prev.landCode)) {
            return { ...prev, landCode: generateLandCode(enriched) };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error fetching lands:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlants = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/plants`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setPlants(data);
      }
    } catch (err) {
      console.error("Error fetching plants:", err);
    }
  };

  const fetchStates = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/states`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setStates(data);
      }
    } catch (err) {
      console.error("Error fetching states:", err);
    }
  };

  useEffect(() => {
    fetchPlants();
    fetchStates();
  }, []);

  useEffect(() => {
    if (states.length > 0) {
      fetchLands();
    }
  }, [states]);

  // View toggle – default is "list"
  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [activeOverviewTab, setActiveOverviewTab] = useState(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/companies`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => setCompanies(data))
      .catch(err => console.error("Error fetching companies:", err));
    fetch(`${apiBaseUrl}/api/project-live`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => setProjects(data))
      .catch(err => console.error("Error fetching projects for land overview:", err));
  }, []);

  // Form state – all empty by default
  const [form, setForm] = useState({
    landCode: '',
    plant: '',
    allotedFor: '',
    surveyNo: [],
    surveyInput: '',
    landOwnerName: [],
    ownerInput: '',
    mobileNo: '',
    state: '',
    zone: '',
    district: '',
    village: '',
    mandal: '',
    pincode: '',
    landArea: '',
    latitude: '',
    longitude: '',
    status: 'Active',
    logo: null,
    landType: '',
    leaseStartDate: '',
    leaseEndDate: '',
    leaseDuration: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Table action dropdown trigger state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [logoFile, setLogoFile] = useState(null);

  // Scroll handler to reposition dropdown dynamically
  useEffect(() => {
    const handleScroll = () => {
      if (activeDropdown !== null) {
        const btn = document.getElementById(`action-btn-${activeDropdown}`);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          const dropdownHeight = 250;
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

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const validateField = (name, value) => {
    let error = "";
    if (name === "latitude") {
      if (!value) {
        error = "Latitude is required.";
      } else {
        const latRegex = /^\d{2}\.\d{6}\s[NS]$/;
        if (!latRegex.test(value.trim())) {
          error = "Format must be e.g. 17.438574 N (2 digits, dot, 6 decimals, space, and N/S).";
        }
      }
    } else if (name === "longitude") {
      if (!value) {
        error = "Longitude is required.";
      } else {
        const lngRegex = /^\d{2}\.\d{6}\s[EW]$/;
        if (!lngRegex.test(value.trim())) {
          error = "Format must be e.g. 78.421012 E (2 digits, dot, 6 decimals, space, and E/W).";
        }
      }
    } else if (name === "mobileNo") {
      const mobileVal = value.trim();
      if (!mobileVal) {
        error = "Mobile Number is required.";
      } else if (!/^[6789]/.test(mobileVal)) {
        error = "Mobile Number must start with 6, 7, 8, or 9.";
      } else if (mobileVal.length > 0 && mobileVal.length < 10) {
        error = "Mobile Number must be exactly 10 digits.";
      }
    } else if (name === "landCode") {
      if (!value || !value.trim()) {
        error = "Land Code is required.";
      } else if (/\s/.test(value)) {
        error = "Spaces are not allowed in Land Code.";
      } else if (value.length > 10) {
        error = "Land Code cannot exceed 10 characters.";
      }
    } else if (name === "landArea") {
      if (!value.trim()) {
        error = "Land Area is required.";
      } else if (Number(value) <= 0) {
        error = "Land Area must be greater than 0.";
      }
    } else if (name === "district") {
      if (!value.trim()) {
        error = "District is required.";
      } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
        error = "District should contain only letters.";
      }
    } else if (name === "mandal") {
      if (!value.trim()) {
        error = "Mandal is required.";
      } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
        error = "Mandal should contain only letters.";
      }
    } else if (name === "village") {
      if (!value.trim()) {
        error = "Village is required.";
      } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
        error = "Village should contain only letters.";
      }
    } else if (name === "pincode") {
      if (value && value.trim() !== "") {
        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(value.trim())) {
          error = "Pincode must be exactly 6 digits and cannot start with 0.";
        }
      }
    }
    return error;
  };
  // Auto-calculate lease duration
  useEffect(() => {
    setForm(prev => ({ ...prev, leaseDuration: calculateDuration(form.leaseStartDate, form.leaseEndDate) }));
  }, [form.leaseStartDate, form.leaseEndDate]);

  // Handle standard input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'landArea') {
      newValue = value.replace(/[^0-9.]/g, '');
      if (newValue && !/^\d{0,10}(\.\d{0,2})?$/.test(newValue)) return;
    } else if (name === 'pincode') {
      newValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    } else if (name === 'mobileNo') {
      newValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    } else if (name === 'latitude' || name === 'longitude') {
      let upperValue = value.toUpperCase();
      if (/^\d{2}\.\d{6}[NEWS]$/.test(upperValue)) {
        upperValue = upperValue.slice(0, 9) + ' ' + upperValue.slice(9);
      }
      const partialRegex = /^(?:\d{0,2}|\d{2}\.|\d{2}\.\d{1,6}|\d{2}\.\d{6}\s|\d{2}\.\d{6}\s[NEWS])?$/;
      if (!partialRegex.test(upperValue)) {
        return;
      }
      newValue = upperValue;
    } else if (name === 'landCode') {
      newValue = value.slice(0, 10);
    } else if (name === 'surveyInput') {
      newValue = value.slice(0, 50);
    } else if (name === 'ownerInput') {
      newValue = value.replace(/[^a-zA-Z\s.]/g, '').slice(0, 100);
    } else if (name === 'village') {
      newValue = value.slice(0, 50);
    } else if (name === 'mandal' || name === 'district') {
      newValue = value.slice(0, 30);
    } else if (name === 'allotedFor') {
      newValue = value.slice(0, 50);
    } else if (name === 'state') {
      newValue = value;
      const selectedStateObj = states.find(s => s.stId.toString() === newValue.toString());
      const zoneValue = selectedStateObj ? selectedStateObj.znNm : '';
      setForm(prev => ({ ...prev, state: newValue, zone: zoneValue }));
      return;
    }

    setForm(prev => {
      const updatedForm = { ...prev, [name]: newValue };
      if (
        ['latitude', 'longitude', 'mobileNo', 'landCode', 'landArea', 'district', 'mandal', 'village', 'pincode'].includes(name)
      ) {
        const error = validateField(name, newValue);
        setFormErrors(prevErrors => ({ ...prevErrors, [name]: error }));
      }
      return updatedForm;
    });
  };

  const handleSurveyKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = form.surveyInput?.trim().toUpperCase();
      if (val) {
        if (!form.surveyNo.includes(val)) {
          setForm(prev => ({
            ...prev,
            surveyNo: [...(prev.surveyNo || []), val],
            surveyInput: ''
          }));
        } else {
          triggerAlert("warning", "Duplicate Entry", "This Survey Number has already been added.");
          setForm(prev => ({ ...prev, surveyInput: '' }));
        }
      }
    }
  };

  const removeSurveyTag = (tagToRemove) => {
    setForm(prev => ({
      ...prev,
      surveyNo: (prev.surveyNo || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleOwnerKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = form.ownerInput?.trim();
      if (val && !form.landOwnerName.includes(val)) {
        setForm(prev => ({
          ...prev,
          landOwnerName: [...(prev.landOwnerName || []), val],
          ownerInput: ''
        }));
      }
    }
  };

  const removeOwnerTag = (tagToRemove) => {
    setForm(prev => ({
      ...prev,
      landOwnerName: (prev.landOwnerName || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleToggleStatus = (e) => {
    setForm(prev => ({ ...prev, status: e.target.checked ? "Active" : "Inactive" }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setForm((prev) => ({ ...prev, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleDeleteLogo = () => {
    setLogoFile(null);
    setForm((prev) => ({ ...prev, logo: "" }));
    const fileInput = document.getElementById("logoUploadHidden");
    if (fileInput) fileInput.value = "";
  };

  const handleResetForm = (lList = allocations) => {
    setLogoFile(null);
    setForm({
      landCode: generateLandCode(lList),
      plant: '',
      allotedFor: '',
      surveyNo: [],
      surveyInput: '',
      landOwnerName: [],
      ownerInput: '',
      mobileNo: '',
      state: '',
      zone: '',
      district: '',
      village: '',
      mandal: '',
      pincode: '',
      landArea: '',
      latitude: '',
      longitude: '',
      status: 'Active',
      logo: null,
      landType: '',
      leaseStartDate: '',
      leaseEndDate: '',
      leaseDuration: ''
    });
    setFormErrors({});
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // 1. Land Code check
    if (!form.landCode.trim()) {
      triggerAlert("error", "Validation Error", "Land Code is required.");
      return;
    }
    if (/\s/.test(form.landCode)) {
      triggerAlert("error", "Validation Error", "Spaces are not allowed in Land Code.");
      return;
    }
    if (form.landCode.length > 10) {
      triggerAlert("error", "Validation Error", "Land Code cannot exceed 10 characters.");
      return;
    }

    // 2. Plant check
    if (!form.plant || !String(form.plant).trim()) {
      triggerAlert("error", "Validation Error", "Plant selection is required.");
      return;
    }

    // 3. Land Area check
    if (!form.landArea || !String(form.landArea).trim()) {
      triggerAlert("error", "Validation Error", "Land Area is required.");
      return;
    }
    if (Number(form.landArea) <= 0) {
      triggerAlert("error", "Validation Error", "Land Area must be greater than 0.");
      return;
    }

    // 4. Survey Number check
    if (!form.surveyNo || form.surveyNo.length === 0) {
      triggerAlert("error", "Validation Error", "At least one Survey Number is required. Enter a value and press Enter/comma.");
      return;
    }

    // 5. Mobile No check
    if (!form.mobileNo || !String(form.mobileNo).trim()) {
      triggerAlert("error", "Validation Error", "Mobile Number is required.");
      return;
    }
    const mobileRegex = /^[6789]\d{9}$/;
    if (!mobileRegex.test(form.mobileNo.trim())) {
      triggerAlert("error", "Validation Error", "Mobile Number must be exactly 10 digits and start with 6, 7, 8, or 9.");
      return;
    }

    // 6. Land Owner Name check
    if (!form.landOwnerName || form.landOwnerName.length === 0) {
      triggerAlert("error", "Validation Error", "At least one Land Owner Name is required. Enter a name and press Enter/comma.");
      return;
    }

    if (!form.landType) {
      triggerAlert("error", "Validation Error", "Ownership Type is required.");
      return;
    }

    if (form.landType === 'Lease') {
      if (!form.leaseStartDate) {
        triggerAlert("error", "Validation Error", "Lease Start Date is required.");
        return;
      }
      if (!form.leaseEndDate) {
        triggerAlert("error", "Validation Error", "Lease End Date is required.");
        return;
      }
      if (new Date(form.leaseEndDate) < new Date(form.leaseStartDate)) {
        triggerAlert("error", "Validation Error", "Lease End Date cannot be earlier than Lease Start Date.");
        return;
      }
    }

    // 7. State check
    if (!form.state || !String(form.state).trim()) {
      triggerAlert("error", "Validation Error", "State selection is required.");
      return;
    }

    // 8. District check
    if (!form.district || !String(form.district).trim()) {
      triggerAlert("error", "Validation Error", "District is required.");
      return;
    }
    if (form.district.length > 30) {
      triggerAlert("error", "Validation Error", "District cannot exceed 30 characters.");
      return;
    }

    // 9. Mandal check
    if (!form.mandal || !String(form.mandal).trim()) {
      triggerAlert("error", "Validation Error", "Mandal is required.");
      return;
    }
    if (form.mandal.length > 30) {
      triggerAlert("error", "Validation Error", "Mandal cannot exceed 30 characters.");
      return;
    }

    // 10. Village check
    if (!form.village || !String(form.village).trim()) {
      triggerAlert("error", "Validation Error", "Village is required.");
      return;
    }
    if (form.village.length > 50) {
      triggerAlert("error", "Validation Error", "Village cannot exceed 50 characters.");
      return;
    }

    // 11. Pincode check
    if (!form.pincode || !String(form.pincode).trim()) {
      triggerAlert("error", "Validation Error", "Pincode is required.");
      return;
    }
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!pincodeRegex.test(form.pincode.trim())) {
      triggerAlert("error", "Validation Error", "Pincode must be exactly 6 digits and cannot start with 0.");
      return;
    }

    // 12. Latitude check
    if (!form.latitude || !form.latitude.trim()) {
      triggerAlert("error", "Validation Error", "Latitude is required.");
      return;
    }
    const latRegex = /^\d{2}\.\d{6}\s[NS]$/;
    if (!latRegex.test(form.latitude.trim())) {
      triggerAlert("error", "Validation Error", "Latitude format must be e.g. 17.438574 N (2 digits, dot, 6 decimals, space, and N/S).");
      return;
    }

    // 13. Longitude check
    if (!form.longitude || !form.longitude.trim()) {
      triggerAlert("error", "Validation Error", "Longitude is required.");
      return;
    }
    const lngRegex = /^\d{2}\.\d{6}\s[EW]$/;
    if (!lngRegex.test(form.longitude.trim())) {
      triggerAlert("error", "Validation Error", "Longitude format must be e.g. 78.421012 E (2 digits, dot, 6 decimals, space, and E/W).");
      return;
    }

    // 14. Alloted for check
    if (!form.allotedFor || !String(form.allotedFor).trim()) {
      triggerAlert("error", "Validation Error", "Alloted for selection is required.");
      return;
    }

    // 15. Status check
    if (!form.status) {
      triggerAlert("error", "Validation Error", "Status selection is required.");
      return;
    }

    // Unique Land Code check
    const isDuplicate = allocations.some(
      a => a.landCode.toLowerCase().trim() === form.landCode.toLowerCase().trim() && a.id !== editingId
    );

    if (isDuplicate) {
      triggerAlert("error", "Duplicate Error", "Land code must be unique. This land code already exists.");
      return;
    }

    setLoading(true);

    let finalLogoUrl = form.logo;
    if (logoFile) {
      const uploadForm = new FormData();
      uploadForm.append("file", logoFile);
      try {
        const uploadRes = await fetch(`${apiBaseUrl}/api/storage/upload/land-logo`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
          },
          body: uploadForm
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalLogoUrl = uploadData.url;
        } else {
          throw new Error("Failed to upload logo.");
        }
      } catch (err) {
        // setLoading(false);
        console.error("Logo upload failed:", err);
        triggerAlert("error", "Error", "Could not upload land logo.");
        return;
      }
    }

    let alcTypVal = "AGL";
    if (form.allotedFor === "Plant") {
      alcTypVal = "PLT";
    }

    const landPayload = {
      landCd: form.landCode.trim(),
      pltId: Number(form.plant),
      surveyNo: form.surveyNo.join(","),
      landOwners: form.landOwnerName.join(","),
      mobNum: form.mobileNo.trim(),
      landSize: Number(form.landArea),
      allotedFor: alcTypVal,
      AllotedFor: alcTypVal,
      alcTyp: alcTypVal,
      vlg: form.village.trim(),
      mdl: form.mandal.trim(),
      dist: form.district.trim(),
      stId: Number(form.state),
      pin: form.pincode.trim(),
      lat: form.latitude.trim(),
      longt: form.longitude.trim(),
      ownershipType: form.landType,
      leaseDt: form.landType === 'Lease' ? (form.leaseStartDate || null) : null,
      leaseEndDt: form.landType === 'Lease' ? (form.leaseEndDate || null) : null,
      logo: finalLogoUrl || null,
      sts: form.status === "Active"
    };

    if (isEditing) {
      landPayload.landId = editingId;
    }

    fetch(isEditing ? `${apiBaseUrl}/api/lands/${editingId}` : `${apiBaseUrl}/api/lands`, {
      method: isEditing ? "PUT" : "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(landPayload)
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to save land record.");
        }
        triggerAlert("success", "Success", isEditing ? "Land record updated successfully!" : "Land record created successfully!");
        fetchLands();
        handleResetForm();
        setIsEditing(false);
        setEditingId(null);
        setView("list");
      })
      .catch((err) => {
        console.error("Save land failed:", err);
        triggerAlert("error", "Error", err.message || "Could not save land record.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleView = (land) => {
    const targetId = land.lndId || land.id || land.landId;
    const pltIdVal = land.plant || land.pltId;
    setForm({
      ...land,
      landCode: land.landCode || land.lndCd || '',
      plant: pltIdVal || '',
      landArea: land.landArea || land.lndAr || land.landSize || '',
      surveyNo: Array.isArray(land.surveyNo) ? land.surveyNo : (land.surveyNo ? String(land.surveyNo).split(',') : []),
      surveyInput: '',
      landOwnerName: Array.isArray(land.landOwnerName) ? land.landOwnerName : (land.landOwnerName ? String(land.landOwnerName).split(',') : []),
      ownerInput: '',
      mobileNo: land.mobileNo || land.mobNo || land.mobNum || '',
      district: land.district || land.dist || '',
      village: land.village || land.vlg || '',
      mandal: land.mandal || land.mdl || '',
      state: land.state || land.stId || ''
    });
    setFormErrors({});
    setIsViewing(true);
    setIsEditing(false);
    setEditingId(targetId);
    setActiveDropdown(null);
    setView("form");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (land) => {
    setLogoFile(null);
    setForm({
      ...land,
      surveyNo: Array.isArray(land.surveyNo) ? land.surveyNo : (land.surveyNo ? [land.surveyNo] : []),
      surveyInput: '',
      landOwnerName: Array.isArray(land.landOwnerName) ? land.landOwnerName : (land.landOwnerName ? [land.landOwnerName] : []),
      ownerInput: ''
    });
    setFormErrors({});
    setIsEditing(true);
    setEditingId(land.id);
    setActiveDropdown(null);
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
        const spaceAbove = rect.top;
        const dropdownHeight = 250;
        const isTop = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        
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
    const land = allocations.find(a => a.id === deactivateTargetId);
    if (!land) return;

    let alcTypVal = "AGL";
    if (land.allotedFor === "Plant") {
      alcTypVal = "PLT";
    }

    const landPayload = {
      landId: land.id,
      landCd: land.landCode,
      pltId: Number(land.plant),
      surveyNo: Array.isArray(land.surveyNo) ? land.surveyNo.join(",") : land.surveyNo,
      landOwners: Array.isArray(land.landOwnerName) ? land.landOwnerName.join(",") : land.landOwnerName,
      mobNum: land.mobileNo,
      landSize: Number(land.landArea),
      allotedFor: alcTypVal,
      AllotedFor: alcTypVal,
      alcTyp: alcTypVal,
      vlg: land.village,
      mdl: land.mandal,
      dist: land.district,
      stId: Number(land.state),
      pin: land.pincode,
      lat: land.latitude,
      longt: land.longitude,
      sts: false
    };

    // setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/lands`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(landPayload)
      });
      if (!response.ok) {
        throw new Error("Failed to deactivate land record.");
      }
      triggerAlert("success", "Success", "Land record deactivated successfully!");
      fetchLands();
    } catch (err) {
      console.error("Deactivate land failed:", err);
      triggerAlert("error", "Error", "Could not deactivate land record.");
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
      message: "Are you sure you want to delete this land record?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        // setLoading(true);
        try {
          const response = await fetch(`${apiBaseUrl}/api/lands/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
          });
          if (!response.ok) {
            throw new Error("Failed to delete land record.");
          }
          triggerAlert("success", "Success", "Land record deleted successfully!");
          fetchLands();
        } catch (err) {
          console.error("Delete land failed:", err);
          triggerAlert("error", "Error", err.message || "Could not delete land record.");
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

  const sortedAllocations = React.useMemo(() => {
    let sortable = [...allocations];

    if (tableSearchQuery) {
      const q = tableSearchQuery.toLowerCase();
      sortable = sortable.filter(land => {
        const plantObj = plants.find(p => Number(p.pltId) === Number(land.pltId));
        return (
          (land.landCode && land.landCode.toLowerCase().includes(q)) ||
          (plantObj && plantObj.pltNm && plantObj.pltNm.toLowerCase().includes(q)) ||
          (land.allotedFor && land.allotedFor.toLowerCase().includes(q)) ||
          (land.district && land.district.toLowerCase().includes(q)) ||
          (land.village && land.village.toLowerCase().includes(q))
        );
      });
    }

    if (sortConfig.key !== null) {
      sortable.sort((a, b) => {
        let valA = "";
        let valB = "";
        if (sortConfig.key === "plant") {
          const plantAObj = plants.find(p => Number(p.pltId) === Number(a.pltId));
          const plantBObj = plants.find(p => Number(p.pltId) === Number(b.pltId));
          valA = (plantAObj ? plantAObj.pltNm : "").toString().toLowerCase();
          valB = (plantBObj ? plantBObj.pltNm : "").toString().toLowerCase();
        } else if (sortConfig.key === "state") {
          const stateAObj = states.find(s => Number(s.stId) === Number(a.stId));
          const stateBObj = states.find(s => Number(s.stId) === Number(b.stId));
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
  }, [allocations, sortConfig, plants, states, tableSearchQuery]);

  // Pagination logic
  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentItems = sortedAllocations.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedAllocations.length / recordsPerPage);

  return (
    <div className="al-shell-container">
      {/* Sidebar Navigation */}
      <Sidebar userRole={userRole} onLogout={onLogout} />

      {/* Main Container Viewport */}
      <div className="al-shell">

        {/* ======================= DYNAMIC HEADER ======================= */}
        <Header
          title="Land Creation"
          showSearch={false}
          userName="Syed Mohammad Johny Basha"
          userRole="Web Developer"
          initials="SB"
        />

        <main className="al-main" style={{ padding: '24px' }}>

          {view === "form" ? (
            /* ================= VIEW: ADD NEW LAND FORM ================= */
            <>
              <div className="al-content" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto' }}>

                {/* Form Card */}
                <div className="al-form-card" style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>

                  {/* Form Header with Title and Back Button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#fafbfc'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h2 style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#0f172a',
                        margin: 0
                      }}>
                        {isViewing ? "View Land Details" : isEditing ? "Edit Land" : "Add New Land Creation"}
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                        {isViewing ? "View land details in the form below" : isEditing ? "Update land details in the form below" : "Enter land details in the form below"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="al-nav-view-btn"
                      onClick={() => {
                        setView("list");
                        handleResetForm();
                        setIsEditing(false);
                        setIsViewing(false);
                        setEditingId(null);
                      }}
                    >
                      <ChevronLeft size={15} /> Back to Land List
                    </button>
                  </div>

                  {/* Form Body */}
                  <div style={{ padding: '24px' }}>
                    {isViewing ? (
                      <div className="al-view-unified" style={{ padding: '12px 0' }}>
                        {/* Land Overview Section */}
                        <div style={{ 
                          marginBottom: '32px', 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '12px', 
                          padding: '24px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={18} style={{ color: '#16a34a' }} />
                            Land Overview
                          </h3>
                          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', marginTop: 0 }}>
                            Click on any card below to view its corresponding list details.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                            {/* Card 1: Plant */}
                            <div 
                              onClick={() => setActiveOverviewTab(activeOverviewTab === 'plant' ? null : 'plant')}
                              style={{ 
                                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                                border: activeOverviewTab === 'plant' ? '2px solid #2563eb' : '1px solid #bfdbfe', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transform: activeOverviewTab === 'plant' ? 'scale(1.02)' : 'none',
                                boxShadow: activeOverviewTab === 'plant' ? '0 4px 12px rgba(37,99,235,0.15)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Associated Plant</span>
                              <strong style={{ fontSize: '20px', color: '#1e3a8a', marginTop: '8px', zIndex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {plants.find(p => String(p.pltId || p.id) === String(form.plant) || (p.pltNm || p.plantName || '').trim().toLowerCase() === String(form.plant || '').trim().toLowerCase())?.pltNm || form.plant || 'N/A'}
                              </strong>
                            </div>
                            {/* Card 2: Company */}
                            <div 
                              onClick={() => setActiveOverviewTab(activeOverviewTab === 'company' ? null : 'company')}
                              style={{ 
                                background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', 
                                border: activeOverviewTab === 'company' ? '2px solid #0d9488' : '1px solid #99f6e4', 
                                borderRadius: '12px', 
                                padding: '20px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transform: activeOverviewTab === 'company' ? 'scale(1.02)' : 'none',
                                boxShadow: activeOverviewTab === 'company' ? '0 4px 12px rgba(13,148,136,0.15)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Associated Company</span>
                              <strong style={{ fontSize: '20px', color: '#115e59', marginTop: '8px', zIndex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {(() => {
                                  const pltObj = plants.find(p => String(p.pltId || p.id) === String(form.plant) || (p.pltNm || p.plantName || '').trim().toLowerCase() === String(form.plant || '').trim().toLowerCase());
                                  return pltObj?.coyNm || (Array.isArray(companies) ? companies.find(c => String(c.coyId || c.id) === String(pltObj?.coyId))?.coyNm : 'N/A') || 'N/A';
                                })()}
                              </strong>
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
                                {activeOverviewTab === 'plant' && <Factory size={16} style={{ color: '#2563eb' }} />}
                                {activeOverviewTab === 'company' && <Building2 size={16} style={{ color: '#0d9488' }} />}
                                Associated {activeOverviewTab} Details
                              </h4>
                              <button 
                                type="button" 
                                onClick={() => setActiveOverviewTab(null)} 
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                              >
                                Close Table
                              </button>
                            </div>
                            
                            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                  {activeOverviewTab === 'plant' && (
                                    <tr>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Plant Code</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Plant Name</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Capacity (TPD)</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Email</th>
                                    </tr>
                                  )}
                                  {activeOverviewTab === 'company' && (
                                    <tr>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Company Code</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Company Name</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>CIN Number</th>
                                    </tr>
                                  )}
                                </thead>
                                <tbody>
                                  {activeOverviewTab === 'plant' && (() => {
                                    const p = plants.find(plt => String(plt.pltId || plt.id) === String(form.plant) || (plt.pltNm || plt.plantName || '').trim().toLowerCase() === String(form.plant || '').trim().toLowerCase());
                                    return p ? (
                                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#2563eb' }}>{p.pltCd || p.plantCode || 'N/A'}</td>
                                        <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{p.pltNm || p.plantName || 'N/A'}</td>
                                        <td style={{ padding: '10px 12px', color: '#475569' }}>{(p.cap !== undefined && p.cap !== null) ? `${p.cap} TPD` : (p.cpcty || p.capacity || p.plantCapacity || 'N/A')}</td>
                                        <td style={{ padding: '10px 12px', color: '#2563eb' }}>{p.email || 'N/A'}</td>
                                      </tr>
                                    ) : (
                                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No plant associated.</td></tr>
                                    );
                                  })()}
                                  {activeOverviewTab === 'company' && (() => {
                                    const pltObj = plants.find(p => String(p.pltId || p.id) === String(form.plant) || (p.pltNm || p.plantName || '').trim().toLowerCase() === String(form.plant || '').trim().toLowerCase());
                                    const coyObj = Array.isArray(companies) ? companies.find(c => String(c.coyId || c.id) === String(pltObj?.coyId)) : null;
                                    return coyObj ? (
                                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0d9488' }}>{coyObj.coyCd || coyObj.companyCode || 'N/A'}</td>
                                        <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{coyObj.coyNm || coyObj.companyName || 'N/A'}</td>
                                        <td style={{ padding: '10px 12px', color: '#475569' }}>{coyObj.cin || coyObj.cinNo || coyObj.cinNumber || 'N/A'}</td>
                                      </tr>
                                    ) : (
                                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No company associated.</td></tr>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                          Land Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Land Code :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.landCode || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Plant :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{plants.find(p => String(p.pltId) === String(form.plant))?.pltNm || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Land Area :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.landArea ? `${form.landArea} Acres` : '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Survey Number :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{Array.isArray(form.surveyNo) ? form.surveyNo.join(', ') : (form.surveyNo || '-')}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Owner Name :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{Array.isArray(form.landOwnerName) ? form.landOwnerName.join(', ') : (form.landOwnerName || '-')}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Mobile No :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.mobileNo || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>State :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{states.find(s => String(s.stId) === String(form.state))?.stNm || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>District :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.district || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Mandal :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.mandal || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Village :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.village || '-'}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Status :</span>
                              <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', width: 'fit-content', backgroundColor: form.status === 'Active' ? '#dcfce7' : '#fee2e2', color: form.status === 'Active' ? '#166534' : '#991b1b' }}>{form.status}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Zone :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.zone || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Pincode :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.pincode || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Ownership Type :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.landType || '-'}</span>
                            </div>
                            {form.landType === 'Lease' && (
                              <>
                                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Lease Start Date :</span>
                                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.leaseStartDate ? form.leaseStartDate.split('-').reverse().join('/') : '-'}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Lease End Date :</span>
                                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.leaseEndDate ? form.leaseEndDate.split('-').reverse().join('/') : '-'}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Duration :</span>
                                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.leaseDuration || '-'}</span>
                                </div>
                              </>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Latitude :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.latitude || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Longitude :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.longitude || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Alloted For :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.allotedFor || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Land Image :</span>
                              <div>
                                 {form.logo ? (
                                   <img src={form.logo} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                 ) : (
                                   <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} style={{ color: '#94a3b8' }} /></div>
                                 )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* 1. Basic Information */}
                        <section className="al-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                              Basic Information
                            </h3>

                            {/* Status Toggle Bar */}
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>Status:</span>

                              <label style={{ position: "relative", display: "inline-block", width: "46px", height: "26px", margin: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={form.status === "Active"}
                                  onChange={handleToggleStatus}
                                  style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                  position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                                  backgroundColor: form.status === "Active" ? "#10b981" : "#cbd5e1",
                                  transition: ".4s", borderRadius: "34px"
                                }}>
                                  <span style={{
                                    position: "absolute", height: "20px", width: "20px",
                                    left: form.status === "Active" ? "23px" : "3px", bottom: "3px",
                                    backgroundColor: "white", transition: ".4s", borderRadius: "50%",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                  }}></span>
                                </span>
                              </label>

                              <span style={{
                                fontSize: "14px", fontWeight: "600", minWidth: "60px",
                                color: form.status === "Active" ? "#16a34a" : "#dc2626"
                              }}>
                                {form.status}
                              </span>
                            </div>
                          </div>

                          <div className="al-form-layout-row columns-4">
                            <label className="al-field-item">
                              <span>Land Code <b style={{ color: '#ef4444' }}>*</b></span>
                              <input type="text" name="landCode" value={form.landCode} readOnly placeholder="Auto-generated code" />
                              {formErrors.landCode && (
                                <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.landCode}</span>
                              )}
                              <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Must be unique.</small>
                            </label>
                            <label className="al-field-item">
                              <span>Plant <b style={{ color: '#ef4444' }}>*</b></span>
                              <SearchableSelect 
                                name="plant" 
                                value={form.plant} 
                                onChange={handleChange} 
                                placeholder="Select Plant"
                                options={plants.map(p => ({ value: p.pltId, label: p.pltNm }))}
                              />
                            </label>
                            <label className="al-field-item" style={{ gridColumn: 'span 2' }}>
                              <span>Land Image</span>
                              <div className="al-logo-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="al-logo-box" style={{ width: '48px', height: '48px', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden', flexShrink: 0 }}>
                                  {form.logo ? <img src={form.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={22} style={{ color: '#94a3b8' }} />}
                                </div>
                                <input id="logoUploadHidden" type="file" accept="image/*" onChange={handleLogoChange} disabled={isViewing} hidden />
                                {!isViewing && (
                                  <>
                                    <button type="button" onClick={() => document.getElementById("logoUploadHidden").click()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#0f172a', cursor: 'pointer', height: '38px', whiteSpace: 'nowrap' }}>
                                      <Upload size={14} /> Upload Image
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleDeleteLogo}
                                      disabled={!form.logo}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 12px',
                                        background: form.logo ? '#fef2f2' : '#f8fafc',
                                        border: form.logo ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        color: form.logo ? '#dc2626' : '#94a3b8',
                                        cursor: form.logo ? 'pointer' : 'not-allowed',
                                        height: '38px',
                                        whiteSpace: 'nowrap',
                                        opacity: form.logo ? 1 : 0.6
                                      }}
                                      title="Delete image"
                                    >
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </label>
                          </div>
                        </section>

                        {/* 3. Land Details */}
                        <section className="al-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                          <h3 className="al-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Land Details</h3>
                          <div className="al-form-layout-row columns-4">
                            <label className="al-field-item">
                              <span>Land Area (Acres) <b style={{ color: '#ef4444' }}>*</b></span>
                              <input type="text" name="landArea" value={form.landArea} onChange={handleChange} placeholder="Enter land area" />
                              {formErrors.landArea && (
                                <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.landArea}</span>
                              )}
                            </label>
                            <label className="al-field-item" style={{ gridColumn: 'span 2' }}>
                              <span>Survey Number <b style={{ color: '#ef4444' }}>*</b></span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', minHeight: '40px', boxSizing: 'border-box', backgroundColor: 'white' }}>
                                {Array.isArray(form.surveyNo) && form.surveyNo.map((tag, idx) => (
                                  <span key={idx} style={{ backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0' }}>
                                    {tag}
                                    <X size={14} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => removeSurveyTag(tag)} />
                                  </span>
                                ))}
                                <input
                                  type="text"
                                  name="surveyInput"
                                  value={form.surveyInput || ''}
                                  onChange={handleChange}
                                  onKeyDown={handleSurveyKeyDown}
                                  placeholder={(!form.surveyNo || form.surveyNo.length === 0) ? "Type and press Enter" : ""}
                                  style={{ border: 'none', outline: 'none', flex: 1, minWidth: '150px', fontSize: '14px', background: 'transparent' }}
                                />
                              </div>
                            </label>
                          </div>
                          <div className="al-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                            <label className="al-field-item" style={{ gridColumn: 'span 2' }}>
                              <span>Land Owner Name <b style={{ color: '#ef4444' }}>*</b></span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', minHeight: '40px', boxSizing: 'border-box', backgroundColor: 'white' }}>
                                {Array.isArray(form.landOwnerName) && form.landOwnerName.map((tag, idx) => (
                                  <span key={idx} style={{ backgroundColor: '#f1f5f9', color: '#0f172a', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0' }}>
                                    {tag}
                                    <X size={14} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => removeOwnerTag(tag)} />
                                  </span>
                                ))}
                                <input
                                  type="text"
                                  name="ownerInput"
                                  value={form.ownerInput || ''}
                                  onChange={handleChange}
                                  onKeyDown={handleOwnerKeyDown}
                                  placeholder={(!form.landOwnerName || form.landOwnerName.length === 0) ? "Type and press Enter" : ""}
                                  style={{ border: 'none', outline: 'none', flex: 1, minWidth: '150px', fontSize: '14px', background: 'transparent' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '4px', margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                <span style={{ color: '#f59e0b', fontWeight: '700', whiteSpace: 'nowrap' }}>📝 Note:</span>
                                <span>If multiple owners share the same name, please include their initials to differentiate them <span style={{ fontStyle: 'italic' }}>(e.g., "A. Kumar", "B. Kumar")</span>.</span>
                              </div>
                            </label>

                            <label className="al-field-item">
                              <span>Mobile No <b style={{ color: '#ef4444' }}>*</b></span>
                              <input type="text" name="mobileNo" value={form.mobileNo} onChange={handleChange} placeholder="Enter mobile number" maxLength={10} />
                              {formErrors.mobileNo && (
                                <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.mobileNo}</span>
                              )}
                            </label>
                            
                            <label className="al-field-item">
                              <span>Ownership Type <b style={{ color: '#ef4444' }}>*</b></span>
                              <select 
                                name="landType" 
                                value={form.landType || ''} 
                                onChange={handleChange} 
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', height: '40px', backgroundColor: 'white' }}
                              >
                                <option value="" disabled hidden>Select Ownership Type</option>
                                <option value="Lease">Lease</option>
                                <option value="Owner">Owner</option>
                              </select>
                            </label>
                          </div>
                          {form.landType === 'Lease' && (
                            <div className="al-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                              <label className="al-field-item">
                              <span>Lease Start Date <b style={{ color: '#ef4444' }}>*</b></span>
                              <input 
                                type="date"
                                name="leaseStartDate"
                                value={form.leaseStartDate || ''}
                                onChange={handleChange}
                                max={form.leaseEndDate || ''}
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
                            </label>
                            <label className="al-field-item">
                              <span>Lease End Date <b style={{ color: '#ef4444' }}>*</b></span>
                              <input 
                                type="date"
                                name="leaseEndDate"
                                value={form.leaseEndDate || ''}
                                onChange={handleChange}
                                min={form.leaseStartDate || ''}
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
                            </label>
                              <label className="al-field-item" style={{ gridColumn: 'span 2' }}>
                                <span>Lease Duration</span>
                                <input type="text" name="leaseDuration" value={form.leaseDuration || ""} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-calculated" />
                              </label>
                            </div>
                          )}
                        </section>

                        {/* 4. Location Information */}
                        <section className="al-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                          <h3 className="al-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Location Information</h3>
                          <div className="al-form-layout-row columns-4">
                            <label className="al-field-item">
                              <span>State <b style={{ color: '#ef4444' }}>*</b></span>
                              <SearchableSelect 
                                name="state" 
                                value={form.state} 
                                onChange={handleChange} 
                                placeholder="Select State"
                                options={states.map(s => ({ value: s.stId, label: s.stNm }))}
                              />
                            </label>
                            <label className="al-field-item">
                              <span>Zone</span>
                              <input type="text" name="zone" value={form.zone || ''} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-filled Zone" />
                            </label>
                            <label className="al-field-item">
                              <span>District <b style={{ color: '#ef4444' }}>*</b></span>
                              <input type="text" name="district" value={form.district} onChange={handleChange} placeholder="Enter district" maxLength={30} />
                              {formErrors.district && (
                                <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.district}</span>
                              )}
                            </label>
                            <label className="al-field-item">
                              <span>Mandal <b style={{ color: '#ef4444' }}>*</b></span>
                              <input type="text" name="mandal" value={form.mandal} onChange={handleChange} placeholder="Enter mandal" maxLength={30} />
                              {formErrors.mandal && (
                                <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.mandal}</span>
                              )}
                            </label>
                          </div>
                          <div className="al-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                            <label className="al-field-item">
                              <span>Village <b style={{ color: '#ef4444' }}>*</b></span>
                              <input type="text" name="village" value={form.village} onChange={handleChange} placeholder="Enter village" maxLength={50} />
                              {formErrors.village && (
                                <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.village}</span>
                              )}
                            </label>
                            <label className="al-field-item">
                              <span>Pincode <b style={{ color: '#ef4444' }}>*</b></span>
                              <input type="text" name="pincode" value={form.pincode} onChange={handleChange} placeholder="Enter pincode" maxLength={6} />
                              {formErrors.pincode && (
                                <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.pincode}</span>
                              )}
                            </label>
                          </div>
                        </section>

                        {/* 5. Geo Location */}
                        <section className="al-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                          <h3 className="al-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Geo Location</h3>
                          <div className="al-form-layout-row columns-4">
                            <label className="al-field-item">
                              <span>Latitude <b style={{ color: '#ef4444' }}>*</b></span>
                              <input type="text" name="latitude" value={form.latitude} onChange={handleChange} placeholder="Enter latitude" />
                              {formErrors.latitude && (
                                <span className="error-text" style={{ color: 'red', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.latitude}</span>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748b', fontSize: '12px', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                                <Info size={14} style={{ color: '#3b82f6' }} />
                                <span>17.438574 N / S</span>
                              </div>
                            </label>
                            <label className="al-field-item">
                              <span>Longitude <b style={{ color: '#ef4444' }}>*</b></span>
                              <input type="text" name="longitude" value={form.longitude} onChange={handleChange} placeholder="Enter longitude" />
                              {formErrors.longitude && (
                                <span className="error-text" style={{ color: 'red', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.longitude}</span>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748b', fontSize: '12px', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                                <Info size={14} style={{ color: '#3b82f6' }} />
                                <span>78.421012 E / W</span>
                              </div>
                            </label>
                            <label className="al-field-item">
                              <span>Alloted for <b style={{ color: '#ef4444' }}>*</b></span>
                              <select 
                                name="allotedFor" 
                                value={form.allotedFor} 
                                onChange={handleChange}
                              >
                                <option value="" disabled hidden>Select Alloted for</option>
                                <option value="Agriculture Land">Agriculture Land</option>
                                <option value="Plant">Plant</option>
                              </select>
                            </label>
                          </div>
                        </section>
                      </>
                    )}
                  </div>

                  {/* Form Footer Buttons */}
                  {!isViewing && (
                  <div className="al-form-footer" style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    padding: '16px 24px',
                    backgroundColor: '#fafbfc',
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    <button type="button" className="al-btn primary" onClick={handleSave} disabled={loading} style={loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
                      <Save size={14} /> {loading ? (isEditing ? "Updating..." : "Saving...") : (isEditing ? "Update Land" : "Save Land")}
                    </button>
                    <button type="button" className="al-btn secondary" onClick={() => {
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
            /* ================= VIEW: LAND LIST ================= */
            <div className="al-content" style={{ maxWidth: '1280px', margin: '0 auto' }}>

              {/* INTEGRATED CARD FOR FILTERS AND TABLE */}
              <div className="al-table-panel" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                {/* Header with Title and Add New Button - Inside Card */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 24px',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                      Land List
                    </h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
                      View and manage all land records
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search lands..."
                        value={tableSearchQuery}
                        onChange={(e) => {
                          setTableSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{ padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '250px' }}
                      />
                    </div>
                    {screenPerm.canCreate && (
                      <button
                        type="button"
                        className="al-btn-add-new"
                        onClick={() => {
                          handleResetForm();
                          setIsEditing(false);
                          setView("form");
                        }}
                      >
                        <Plus size={16} /> Add New Land
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Table Section Inside the Card */}
                <div className="al-table-container" style={{ overflowX: 'auto' }}>
                  <table className="al-list-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '2200px' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ width: "50px", padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>S.NO</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LOGO</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          LAND CODE
                        </th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          PLANT
                        </th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OWNER NAME</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OWNERSHIP TYPE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MOBILE NO</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SURVEY NO</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STATE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ZONE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DISTRICT</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MANDAL</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VILLAGE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PINCODE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AREA (Acres)</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LATITUDE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LONGITUDE</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LEASE START</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LEASE END</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DURATION</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ALLOTED FOR</th>
                        <th style={{ padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STATUS</th>
                        <th style={{ textAlign: "center", width: "100px", padding: '14px 20px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="20" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                              Loading land records...
                            </div>
                          </td>
                        </tr>
                      ) : currentItems.length > 0 ? (
                        currentItems.map((land, index) => (
                          <tr key={land.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td data-label="#" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{index + 1}</td>
                            <td data-label="LOGO" style={{ padding: '14px 20px' }}>
                              {land.logo ? (
                                <img src={land.logo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                                  <MapPin size={16} style={{ color: '#94a3b8' }} />
                                </div>
                              )}
                            </td>
                            <td data-label="LAND CODE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                                {land.landCode}
                              </span>
                            </td>
                            <td data-label="PLANT" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              <strong>{plants.find(p => Number(p.pltId) === Number(land.pltId))?.pltNm || "N/A"}</strong>
                            </td>
                            <td data-label="OWNER NAME" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              {Array.isArray(land.landOwnerName) ? land.landOwnerName.join(', ') : land.landOwnerName}
                            </td>
                            <td data-label="OWNERSHIP TYPE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              <span style={{ backgroundColor: land.landType === 'Owner' ? '#f0fdf4' : (land.landType === 'Lease' ? '#eff6ff' : '#f1f5f9'), color: land.landType === 'Owner' ? '#166534' : (land.landType === 'Lease' ? '#1e40af' : '#64748b'), padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', border: land.landType === 'Owner' ? '1px solid #bbf7d0' : (land.landType === 'Lease' ? '1px solid #bfdbfe' : '1px solid #e2e8f0') }}>
                                {land.landType || "N/A"}
                              </span>
                            </td>
                            <td data-label="MOBILE NO" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.mobileNo}</td>
                            <td data-label="SURVEY NO" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{Array.isArray(land.surveyNo) ? land.surveyNo.join(', ') : land.surveyNo}</td>
                            <td data-label="STATE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              {states.find(s => Number(s.stId) === Number(land.stId))?.stNm || "N/A"}
                            </td>
                            <td data-label="ZONE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.zone || "N/A"}</td>
                            <td data-label="DISTRICT" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.district}</td>
                            <td data-label="MANDAL" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.mandal}</td>
                            <td data-label="VILLAGE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.village}</td>
                            <td data-label="PINCODE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.pincode}</td>
                            <td data-label="AREA (Acres)" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              <span style={{ fontWeight: '600' }}>{land.landArea}</span>
                            </td>
                            <td data-label="LATITUDE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.latitude}</td>
                            <td data-label="LONGITUDE" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.longitude}</td>
                            <td data-label="LEASE START" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.leaseStartDate ? land.leaseStartDate.split('-').reverse().join('/') : "N/A"}</td>
                            <td data-label="LEASE END" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.leaseEndDate ? land.leaseEndDate.split('-').reverse().join('/') : "N/A"}</td>
                            <td data-label="DURATION" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>{land.leaseDuration || "N/A"}</td>
                            <td data-label="ALLOTED FOR" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                                {land.allotedFor || "N/A"}
                              </span>
                            </td>
                            <td data-label="STATUS" style={{ padding: '14px 20px', fontSize: '14px', color: '#334155' }}>
                              <span
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'inline-block',
                                  backgroundColor: land.status === 'Active' ? '#dcfce7' : '#fee2e2',
                                  color: land.status === 'Active' ? '#166534' : '#991b1b'
                                }}
                              >
                                {land.status}
                              </span>
                            </td>
                            <td data-label="ACTIONS" style={{ position: "relative", padding: '14px 20px', textAlign: 'center' }}>
                              <button
                                id={`action-btn-${land.id}`}
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }}
                                onClick={(e) => toggleDropdown(land.id, e)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <MoreVertical size={18} />
                              </button>

                              {/* Actions Dropdown menu */}
                              {activeDropdown === land.id && (
                                <>
                                  <div
                                    className="al-actions-dropdown-backdrop"
                                    onClick={() => setActiveDropdown(null)}
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                                  />
                                  <div className="al-actions-dropdown-menu" style={{ position: 'fixed', right: `${dropdownPos.right}px`, top: dropdownPos.isTop ? 'auto' : `${dropdownPos.bottom}px`, bottom: dropdownPos.isTop ? `${window.innerHeight - dropdownPos.top}px` : 'auto', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 99, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                    <button
                                      type="button"
                                      style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                      onClick={() => handleView(land)}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <Eye size={15} /> View
                                    </button>
                                    {screenPerm.canEdit && (
                                      <button
                                        type="button"
                                        style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                        onClick={() => handleEdit(land)}
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
                                        onClick={() => handleDelete(land.id)}
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
                          <td colSpan="19" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>
                            No land records found. Add a new land using the button above.
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
                      Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, sortedAllocations.length)} of {sortedAllocations.length} entries
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

      {/* Deactivation Confirmation Modal */}
      {showDeactivateModal && (
        <div className="al-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="al-modal" style={{ backgroundColor: 'white', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <div className="al-modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Deactivate Land Record</h3>
              <button
                type="button"
                className="al-modal-close"
                onClick={() => setShowDeactivateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="al-modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '14px' }}>Are you sure you want to deactivate this land record?</p>
              <p className="al-modal-warning" style={{ margin: 0, color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>
                This will change its status to Inactive.
              </p>
            </div>
            <div className="al-modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                className="al-btn-cancel-modal"
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="al-btn-delete-modal"
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

export default AgriLandAllocation;
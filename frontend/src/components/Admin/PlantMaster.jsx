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
  Factory,
  MapPin,
  Map,
  Upload,
  Image as ImageIcon,
  Info,
  Users,
  Briefcase,
  FileText,
  Building2
} from "lucide-react";
import '../../styles/PlantMaster.css';
import AlertModal from "../AlertModal.jsx";
import { getScreenPermission } from "../../utils/permissions";

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

const PlantCreation = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('PLANT_CREATION');
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

  const [plants, setPlants] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);

  const generatePlantCode = (pList = plants) => {
    let maxNum = 0;
    if (Array.isArray(pList)) {
      pList.forEach(p => {
        const code = p.pltCd || p.plantCode || "";
        const match = code.match(/^PLT-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
    }
    return `PLT-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const fetchPlants = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/plants`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setPlants(data);
        setForm(prev => {
          if (!prev.plantCode || /^PLT-\d+$/i.test(prev.plantCode)) {
            return { ...prev, plantCode: generatePlantCode(data) };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error fetching plants:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/companies`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
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

  const [lands, setLands] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [deptMaps, setDeptMaps] = useState([]);
  const [activeOverviewTab, setActiveOverviewTab] = useState(null);

  const getPlantLands = (plantId) => {
    if (!plantId) return [];
    const targetPlantObj = plants.find(p => Number(p.pltId || p.id) === Number(plantId));
    const targetPlantName = targetPlantObj ? (targetPlantObj.pltNm || targetPlantObj.plantName || '').trim().toLowerCase() : '';

    return lands.filter(l => {
      const lPltId = l.pltId || l.plant || l.plantId;
      if (lPltId && Number(lPltId) === Number(plantId)) return true;
      
      // Also check plant name string matching
      if (targetPlantName && typeof l.plant === 'string' && l.plant.trim().toLowerCase() === targetPlantName) return true;
      if (targetPlantName && typeof l.pltNm === 'string' && l.pltNm.trim().toLowerCase() === targetPlantName) return true;

      return false;
    });
  };

  const getPlantDepartments = (plantId) => {
    if (!plantId) return [];

    const mappedDeptIds = new Set();
    // 1. Collect deptIds mapped to this plant in dept_company_plt_map
    deptMaps.forEach(m => {
      if (Number(m.pltId) === Number(plantId)) {
        mappedDeptIds.add(Number(m.deptId));
      }
    });

    // 2. Collect deptIds of employees working at this plant
    employees.forEach(e => {
      if (Number(e.pltId || e.plant) === Number(plantId) && (e.deptId || e.department)) {
        mappedDeptIds.add(Number(e.deptId || e.department));
      }
    });

    if (mappedDeptIds.size === 0) {
      return [];
    }

    return departments.filter(d => mappedDeptIds.has(Number(d.deptId || d.id)));
  };

  const fetchAuxData = async () => {
    try {
      const [lRes, eRes, dRes, pRes, mRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/lands`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/employees`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/departments`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/project-live`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/dept-coy-plt-maps`, { headers: getAuthHeaders() })
      ]);
      if (lRes.ok) setLands(await lRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
      if (pRes.ok) setProjects(await pRes.json());
      if (mRes.ok) setDeptMaps(await mRes.json());
    } catch (err) {
      console.error("Error fetching aux data:", err);
    }
  };

  useEffect(() => {
    fetchPlants();
    fetchCompanies();
    fetchStates();
    fetchAuxData();
  }, []);

  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  // Form state
  const [form, setForm] = useState({
    plantCode: '',
    plantName: '',
    company: '',
    email: '',
    capacity: '',
    Remarks: '',
    addressLine1: '',
    state: '',
    district: '',
    pincode: '',
    zone: '',
    latitude: '',
    longitude: '',
    workingDays: '',
    status: 'Active',
    logo: null
  });

  // Table action dropdown trigger state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ isTop: false });

  // Deactivation confirmation modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTargetId, setDeactivateTargetId] = useState(null);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const validateField = (name, value) => {
    let error = "";
    if (name === "plantCode") {
      if (!value || !value.trim()) {
        error = "Plant Code is required.";
      } else if (/\s/.test(value)) {
        error = "Spaces are not allowed in Plant Code.";
      } else if (value.length > 10) {
        error = "Plant Code cannot exceed 10 characters.";
      } else {
        const cleanVal = value.replace(/\s+/g, '').toLowerCase();
        const isDuplicate = plants.some(p => {
          const pCode = (p.pltCd || p.plantCode || "").replace(/\s+/g, '').toLowerCase();
          const pId = p.pltId || p.id;
          return pCode === cleanVal && (!editingId || pId !== editingId);
        });
        if (isDuplicate) {
          error = "Plant code must be unique. This plant code already exists.";
        }
      }
    } else if (name === "latitude") {
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
    } else if (name === "email") {
      if (!value) {
        error = "Email is required.";
      } else {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(value.trim())) {
          error = "Please enter a valid email (e.g., name@domain.com). Only letters, numbers, dots, underscores, and hyphens allowed before '@'.";
        }
      }
    } else if (name === "addressLine1") {
      if (!value) {
        error = "Address is required.";
      } else {
        const addressRegex = /^[a-zA-Z0-9\s,.\-/#&]+$/;
        if (!addressRegex.test(value.trim())) {
          error = "Address can only contain letters, numbers, spaces, and , . - / # &";
        }
      }
    } else if (name === "district") {
      if (!value) {
        error = "District is required.";
      } else {
        const districtRegex = /^[a-zA-Z\s]+$/;
        if (!districtRegex.test(value.trim())) {
          error = "District should contain only letters.";
        }
      }
    } else if (name === "pincode") {
      if (!value || value.trim() === "") {
        error = "Pincode is required.";
      } else {
        // First digit 1-9, remaining 5 digits can be 0-9
        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(value.trim())) {
          error = "Pincode must be exactly 6 digits, first digit cannot be 0.";
        }
      }
    }
    setFormErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'capacity') {
      newValue = value.replace(/[^0-9.]/g, '');
      if (newValue && !/^\d{0,8}(\.\d{0,2})?$/.test(newValue)) return;
    } else if (name === 'pincode') {
      newValue = value.replace(/[^0-9]/g, '').slice(0, 6);
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
    } else if (name === 'plantCode') {
      newValue = value.slice(0, 10);
    } else if (name === 'plantName' || name === 'email' || name === 'addressLine1') {
      newValue = value.slice(0, 100);
    } else if (name === 'district') {
      newValue = value.slice(0, 30);
    } else if (name === 'Remarks') {
      newValue = value.slice(0, 250);
    } else if (name === 'state') {
      newValue = value;
      const selectedStateObj = states.find(s => s.stId.toString() === newValue.toString());
      const zoneValue = selectedStateObj ? selectedStateObj.znNm : '';
      setForm(prev => ({ ...prev, state: newValue, zone: zoneValue }));
      return;
    }

    // Call validation for specific fields
    if (name === 'plantCode' || name === 'email' || name === 'addressLine1' || name === 'district' || name === 'pincode' || name === 'latitude' || name === 'longitude') {
      validateField(name, newValue);
    }

    setForm(prev => ({ ...prev, [name]: newValue }));
  };

  const handleToggleStatus = (e) => {
    setForm(prev => ({ ...prev, status: e.target.checked ? "Active" : "Inactive" }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setForm((prev) => ({ ...prev, logo: URL.createObjectURL(file) }));
  };

  const handleDeleteLogo = () => {
    setLogoFile(null);
    setForm((prev) => ({ ...prev, logo: null }));
    const fileInput = document.getElementById("logoUploadHidden");
    if (fileInput) fileInput.value = "";
  };

  const handleResetForm = (pList = plants) => {
    setForm({
      plantCode: generatePlantCode(pList),
      plantName: '',
      company: '',
      email: '',
      capacity: '',
      Remarks: '',
      addressLine1: '',
      state: '',
      district: '',
      pincode: '',
      zone: '',
      latitude: '',
      longitude: '',
      workingDays: '',
      status: 'Active',
      logo: null
    });
    setLogoFile(null);
    setFormErrors({});
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Required fields check
    if (
      !form.plantCode.trim() ||
      !form.plantName.trim() ||
      !form.company ||
      !form.email.trim() ||
      !form.capacity ||
      !form.addressLine1.trim() ||
      !form.state ||
      !form.district.trim() ||
      !form.pincode.trim() ||
      !form.latitude ||
      !form.longitude ||
      !form.workingDays ||
      !form.status
    ) {
      triggerAlert("error", "Validation Error", "Please fill in all required fields marked with *");
      return;
    }

    // Validate format errors
    const errors = [];
    if (formErrors.plantCode) errors.push(formErrors.plantCode);
    if (formErrors.email) errors.push(formErrors.email);
    if (formErrors.addressLine1) errors.push(formErrors.addressLine1);
    if (formErrors.district) errors.push(formErrors.district);
    if (formErrors.pincode) errors.push(formErrors.pincode);
    if (formErrors.latitude) errors.push(formErrors.latitude);
    if (formErrors.longitude) errors.push(formErrors.longitude);

    if (errors.length > 0) {
      triggerAlert("error", "Validation Error", errors[0]);
      return;
    }

    // Geo location regex check (redundant but keep for safety)
    const latRegex = /^\d{2}\.\d{6}\s[NS]$/;
    const lngRegex = /^\d{2}\.\d{6}\s[EW]$/;
    if (!latRegex.test(form.latitude.trim())) {
      triggerAlert("error", "Validation Error", "Latitude format must be e.g. 17.438574 N (2 digits, dot, 6 decimals, space, and N/S).");
      return;
    }
    if (!lngRegex.test(form.longitude.trim())) {
      triggerAlert("error", "Validation Error", "Longitude format must be e.g. 78.421012 E (2 digits, dot, 6 decimals, space, and E/W).");
      return;
    }

    // Unique Plant Code check
    const cleanFormCode = form.plantCode.replace(/\s+/g, '').toLowerCase();
    const isDuplicate = plants.some(p => {
      const pCode = (p.pltCd || p.plantCode || "").replace(/\s+/g, '').toLowerCase();
      const pId = p.pltId || p.id;
      return pCode === cleanFormCode && (!editingId || pId !== editingId);
    });

    if (isDuplicate) {
      triggerAlert("error", "Duplicate Error", "Plant code must be unique. This plant code already exists.");
      return;
    }

    setLoading(true);
    try {
      let finalLogoUrl = form.logo;
      if (logoFile) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", logoFile);
        const uploadResponse = await fetch(`${apiBaseUrl}/api/storage/upload/plant-logo`, {
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
      }

      const plantPayload = {
        pltCd: form.plantCode.trim(),
        pltNm: form.plantName.trim(),
        coyId: Number(form.company),
        email: form.email.trim(),
        cap: Number(form.capacity),
        addr: form.addressLine1.trim(),
        dist: form.district.trim(),
        stId: Number(form.state),
        znNm: form.zone,
        pin: form.pincode.trim(),
        lat: form.latitude.trim(),
        longt: form.longitude.trim(),
        wrkDaysPerWk: form.workingDays ? Number(form.workingDays) : null,
        wrk_days_per_wk: form.workingDays ? Number(form.workingDays) : null,
        workingDays: form.workingDays ? Number(form.workingDays) : null,
        logo: finalLogoUrl,
        addlRem: form.Remarks ? form.Remarks.trim() : null,
        sts: form.status === "Active"
      };

      let response;
      if (isEditing) {
        response = await fetch(`${apiBaseUrl}/api/plants/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(plantPayload)
        });
      } else {
        response = await fetch(`${apiBaseUrl}/api/plants`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(plantPayload)
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "Failed to save plant";
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.message) errorMsg = parsed.message;
          else if (parsed.error && parsed.status) {
            errorMsg = `Server Error (${parsed.status}): ${parsed.error}. Please check the data constraints.`;
          }
        } catch(e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      triggerAlert("success", "Success", isEditing ? "Plant updated successfully!" : "Plant created successfully!");
      fetchPlants();
      handleResetForm();
      setIsEditing(false);
      setEditingId(null);
      setView("list");
    } catch (err) {
      console.error("Save plant failed:", err);
      triggerAlert("error", "Error", err.message || "Could not connect to server or save plant.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plant) => {
    setForm({
      plantCode: plant.pltCd || "",
      plantName: plant.pltNm || "",
      company: plant.coyId ? plant.coyId.toString() : "",
      email: plant.email || "",
      capacity: plant.cap ? plant.cap.toString() : "",
      Remarks: plant.addlRem || "",
      addressLine1: plant.addr || "",
      state: plant.stId ? plant.stId.toString() : "",
      district: plant.dist || "",
      pincode: plant.pin || "",
      zone: plant.znNm || "",
      latitude: plant.lat ? plant.lat.toString() : "",
      longitude: plant.longt ? plant.longt.toString() : "",
      workingDays: plant.wrkDaysPerWk ? plant.wrkDaysPerWk.toString() : (plant.wrk_days_per_wk ? plant.wrk_days_per_wk.toString() : (plant.workingDays ? plant.workingDays.toString() : "")),
      status: plant.sts ? "Active" : "Inactive",
      logo: plant.logo || null
    });
    setLogoFile(null);
    setIsEditing(true);
    setIsViewing(false);
    setEditingId(plant.pltId);
    setActiveDropdown(null);
    setView("form");
    setFormErrors({});
  };

  const handleView = (plant) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setForm({
      plantCode: plant.pltCd || "",
      plantName: plant.pltNm || "",
      company: plant.coyId ? plant.coyId.toString() : "",
      email: plant.email || "",
      capacity: plant.cap ? plant.cap.toString() : "",
      Remarks: plant.addlRem || "",
      addressLine1: plant.addr || "",
      state: plant.stId ? plant.stId.toString() : "",
      district: plant.dist || "",
      pincode: plant.pin || "",
      zone: plant.znNm || "",
      latitude: plant.lat ? plant.lat.toString() : "",
      longitude: plant.longt ? plant.longt.toString() : "",
      workingDays: plant.wrkDaysPerWk ? plant.wrkDaysPerWk.toString() : (plant.wrk_days_per_wk ? plant.wrk_days_per_wk.toString() : (plant.workingDays ? plant.workingDays.toString() : "")),
      status: plant.sts ? "Active" : "Inactive",
      logo: plant.logo || null
    });
    setLogoFile(null);
    setIsEditing(false);
    setIsViewing(true);
    setEditingId(plant.pltId);
    setActiveDropdown(null);
    setView("form");
    setFormErrors({});
  };

  const toggleDropdown = (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const targetId = typeof e === 'object' && e !== null && !e.currentTarget ? id : (typeof e !== 'object' ? e : id);
    const eventObj = typeof e === 'object' && e !== null && e.currentTarget ? e : null;

    if (activeDropdown === targetId) {
      setActiveDropdown(null);
    } else {
      if (eventObj) {
        const btn = eventObj.currentTarget;
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
      setActiveDropdown(targetId);
    }
  };

  const triggerDeactivate = (id) => {
    setDeactivateTargetId(id);
    setShowDeactivateModal(true);
    setActiveDropdown(null);
  };

  const confirmDeactivate = async () => {
    const plant = plants.find(p => p.pltId === deactivateTargetId);
    if (!plant) return;

    const plantPayload = {
      ...plant,
      sts: false
    };

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/plants/${deactivateTargetId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(plantPayload)
      });
      if (!response.ok) {
        throw new Error("Failed to deactivate plant");
      }
      triggerAlert("success", "Success", "Plant deactivated successfully!");
      fetchPlants();
    } catch (err) {
      console.error("Deactivate plant failed:", err);
      triggerAlert("error", "Error", "Could not deactivate plant.");
    } finally {
      setLoading(false);
    }

    setShowDeactivateModal(false);
    setDeactivateTargetId(null);
  };

  const triggerDelete = (id) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/plants/${deleteTargetId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "Could not delete plant.";
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.message) errorMsg = parsed.message;
          else if (parsed.error && parsed.status === 500) {
            errorMsg = "Cannot delete this plant because it is currently linked to other records. Please remove those links first or deactivate the plant instead.";
          } else if (parsed.error) {
            errorMsg = parsed.error;
          }
        } catch(e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }
      triggerAlert("success", "Success", "Plant deleted successfully!");
      fetchPlants();
    } catch (err) {
      console.error("Delete plant failed:", err);
      triggerAlert("error", "Error", err.message || "Could not delete plant.");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    }
  };

  const handleDelete = (id) => {
    triggerDelete(id);
  };

  // Sorting calculation
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPlants = React.useMemo(() => {
    let sortable = [...plants];

    if (tableSearchQuery) {
      const q = tableSearchQuery.toLowerCase();
      sortable = sortable.filter(plant => {
        return (
          (plant.pltCd && plant.pltCd.toLowerCase().includes(q)) ||
          (plant.pltNm && plant.pltNm.toLowerCase().includes(q))
        );
      });
    }

    if (sortConfig.key !== null) {
      sortable.sort((a, b) => {
        let valA = "";
        let valB = "";
        if (sortConfig.key === "plantCode") {
          valA = (a.pltCd || "").toString().toLowerCase();
          valB = (b.pltCd || "").toString().toLowerCase();
        } else if (sortConfig.key === "plantName") {
          valA = (a.pltNm || "").toString().toLowerCase();
          valB = (b.pltNm || "").toString().toLowerCase();
        } else if (sortConfig.key === "company") {
          const coyAObj = companies.find(c => Number(c.coyId) === Number(a.coyId));
          const coyBObj = companies.find(c => Number(c.coyId) === Number(b.coyId));
          valA = (coyAObj ? coyAObj.coyNm : "").toString().toLowerCase();
          valB = (coyBObj ? coyBObj.coyNm : "").toString().toLowerCase();
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
  }, [plants, sortConfig, companies, tableSearchQuery]);

  // Pagination logic
  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentItems = sortedPlants.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedPlants.length / recordsPerPage);

  const thStyle = {
    padding: '14px 20px',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap'
  };

  const tdStyle = {
    padding: '14px 20px',
    fontSize: '14px',
    color: '#334155',
    whiteSpace: 'nowrap'
  };

  // Reusable vibrant blue color matching the sidebar active state
  const vibrantBlue = "#2563eb";

  return (
    <div className="pc-shell-container">
      {/* Sidebar Navigation */}
      <Sidebar userRole={userRole} onLogout={onLogout} />

      {/* Main Container Viewport */}
      <div className="pc-shell">

        {/* ======================= DYNAMIC HEADER ======================= */}
        <Header
          title="Plant Creation"
          showSearch={false}
          userName="Syed Mohammad Johny Basha"
          userRole="Web Developer"
          initials="SB"
        />

        <main className="pc-main" style={{ padding: '24px' }}>

          {/* Breadcrumb Navigation */}

          {view === "form" ? (
            /* ================= VIEW: ADD NEW PLANT FORM ================= */
            <>
              <div className="pc-content" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto' }}>

                {/* Form Card */}
                <div className="pc-form-card" style={{
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
                    <div>
                      <h2 style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#0f172a',
                        margin: 0
                      }}>
                        {isViewing ? "View Plant Details" : isEditing ? "Edit Plant" : "Add New Plant"}
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                        {isViewing ? "View plant details in the form below" : isEditing ? "Update plant details in the form below" : "Enter plant details in the form below"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="pc-nav-view-btn"
                      onClick={() => {
                        setView("list");
                        handleResetForm();
                        setIsEditing(false);
                        setIsViewing(false);
                        setEditingId(null);
                      }}
                    >
                      <ChevronLeft size={15} /> Back to Plant List
                    </button>
                  </div>

                  {/* Form Body */}
                  <div style={{ padding: '24px' }}>
                    {isViewing ? (
                      <div className="pc-view-unified" style={{ padding: '12px 0' }}>
                        {/* Plant Overview Section */}
                        <div style={{ 
                          marginBottom: '32px', 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '12px', 
                          padding: '24px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Factory size={18} style={{ color: '#2563eb' }} />
                            Plant Overview
                          </h3>
                          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', marginTop: 0 }}>
                            Click on any card below to view its corresponding list details.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                            {/* Card 1: Lands */}
                            <div 
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
                              <strong style={{ fontSize: '28px', color: '#14532d', marginTop: '8px', zIndex: 1 }}>
                                {getPlantLands(editingId).length}
                              </strong>
                              <div style={{ position: 'absolute', right: '10px', bottom: '-15px', opacity: 0.1, color: '#14532d', fontSize: '70px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                                L
                              </div>
                            </div>
                            {/* Card 2: Employees */}
                            <div 
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
                              <strong style={{ fontSize: '28px', color: '#581c87', marginTop: '8px', zIndex: 1 }}>
                                {employees.filter(e => Number(e.pltId || e.plant) === Number(editingId)).length}
                              </strong>
                              <div style={{ position: 'absolute', right: '10px', bottom: '-15px', opacity: 0.1, color: '#581c87', fontSize: '70px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                                E
                              </div>
                            </div>
                            {/* Card 3: Departments */}
                            <div 
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
                              <strong style={{ fontSize: '28px', color: '#7c2d12', marginTop: '8px', zIndex: 1 }}>
                                {getPlantDepartments(editingId).length}
                              </strong>
                              <div style={{ position: 'absolute', right: '10px', bottom: '-15px', opacity: 0.1, color: '#7c2d12', fontSize: '70px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                                D
                              </div>
                            </div>
                            {/* Card 4: Projects */}
                            <div 
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
                              <strong style={{ fontSize: '28px', color: '#831843', marginTop: '8px', zIndex: 1 }}>
                                {projects.filter(p => Number(p.pltId || p.plantId) === Number(editingId)).length}
                              </strong>
                              <div style={{ position: 'absolute', right: '10px', bottom: '-15px', opacity: 0.1, color: '#831843', fontSize: '70px', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                                P
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
                                {activeOverviewTab === 'lands' && <MapPin size={16} style={{ color: '#16a34a' }} />}
                                {activeOverviewTab === 'employees' && <Users size={16} style={{ color: '#7c3aed' }} />}
                                {activeOverviewTab === 'departments' && <Briefcase size={16} style={{ color: '#ea580c' }} />}
                                {activeOverviewTab === 'projects' && <FileText size={16} style={{ color: '#db2777' }} />}
                                Associated {activeOverviewTab} List
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
                                  {activeOverviewTab === 'lands' && (
                                    <tr>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>S.NO</th>
                                      <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Land Code</th>
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
                                    </tr>
                                  )}
                                </thead>
                                <tbody>
                                  {activeOverviewTab === 'lands' && (
                                    getPlantLands(editingId).length > 0 ? (
                                      getPlantLands(editingId).map((l, idx) => (
                                        <tr key={l.lndId || l.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                          <td style={{ padding: '10px 12px', fontWeight: '600', color: '#16a34a' }}>{l.landCd || l.lndCd || l.landCode || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#0f172a' }}>{Array.isArray(l.landOwners || l.lndOwnrNm || l.landOwnerName) ? (l.landOwners || l.lndOwnrNm || l.landOwnerName).join(', ') : (l.landOwners || l.lndOwnrNm || l.landOwnerName || 'N/A')}</td>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{l.landSize || l.lndAr || l.landArea ? `${l.landSize || l.lndAr || l.landArea} Acres` : 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{l.mobNum || l.mobNo || l.mobileNo || 'N/A'}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No lands found for this plant.</td></tr>
                                    )
                                  )}
                                  {activeOverviewTab === 'employees' && (
                                    employees.filter(e => Number(e.pltId || e.plant) === Number(editingId)).length > 0 ? (
                                      employees.filter(e => Number(e.pltId || e.plant) === Number(editingId)).map((e, idx) => (
                                        <tr key={e.empId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                          <td style={{ padding: '10px 12px', fontWeight: '600', color: '#7c3aed' }}>{e.empCode || e.employeeCode || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{e.fstNm || e.firstName} {e.lstNm || e.lastName}</td>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{e.designation || e.role || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#2563eb' }}>{e.email || 'N/A'}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No employees found for this plant.</td></tr>
                                    )
                                  )}
                                  {activeOverviewTab === 'departments' && (
                                    getPlantDepartments(editingId).length > 0 ? (
                                      getPlantDepartments(editingId).map((d, idx) => (
                                        <tr key={d.deptId || d.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                          <td style={{ padding: '10px 12px', fontWeight: '600', color: '#ea580c' }}>{d.deptCd || d.code || d.deptCode || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{d.deptNm || d.name || d.deptName || 'N/A'}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No departments mapped to this plant.</td></tr>
                                    )
                                  )}
                                  {activeOverviewTab === 'projects' && (
                                    projects.filter(p => Number(p.pltId || p.plantId) === Number(editingId)).length > 0 ? (
                                      projects.filter(p => Number(p.pltId || p.plantId) === Number(editingId)).map((p, idx) => (
                                        <tr key={p.prjId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                          <td style={{ padding: '10px 12px', fontWeight: '600', color: '#db2777' }}>{p.prjCd || p.projectCode || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{p.prjNm || p.projectName || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#475569' }}>{p.priority || p.prjPrty || 'N/A'}</td>
                                          <td style={{ padding: '10px 12px', color: '#15803d', fontWeight: '600' }}>{p.status || p.prjSts || 'LIVE'}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No projects found for this plant.</td></tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                          Plant Profile Details
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                          
                          {/* Left Column Fields */}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Plant Code :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.plantCode || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Company Reference :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{companies.find(c => String(c.coyId) === String(form.company))?.coyNm || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Capacity (TPD) :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.capacity || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Address :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.addressLine1 || '-'}</span>
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
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Latitude :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.latitude || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Plant Image :</span>
                              <div>
                                 {form.logo ? (
                                   <img src={form.logo} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                 ) : (
                                   <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} style={{ color: '#94a3b8' }} /></div>
                                 )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Column Fields */}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Plant Name :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.plantName || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Email :</span>
                              <span style={{ fontSize: '14px', color: '#2563eb', fontWeight: '500' }}>{form.email || '-'}</span>
                            </div>
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
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Working Days Per Week :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.workingDays ? `${form.workingDays} Days` : '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Longitude :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.longitude || '-'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Remarks :</span>
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.Remarks || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* 1. Plant Information */}
                        <section className="pc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                          Plant Information
                        </h3>

                        {/* Status Toggle Bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>Status:</span>

                          <label style={{ position: "relative", display: "inline-block", width: "46px", height: "26px", margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={form.status === "Active"}
                              onChange={handleToggleStatus}
                              disabled={isViewing}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: "absolute", cursor: isViewing ? "default" : "pointer", top: 0, left: 0, right: 0, bottom: 0,
                              backgroundColor: form.status === "Active" ? "#10b981" : "#cbd5e1",
                              transition: ".4s", borderRadius: "34px",
                              opacity: isViewing ? 0.7 : 1
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

                      <div className="pc-form-layout-row columns-4">
                        <label className="pc-field-item">
                          <span>Plant Code <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="plantCode" value={form.plantCode} readOnly disabled={isViewing} placeholder="Auto-generated code" />
                          {formErrors.plantCode ? (
                            <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.plantCode}</span>
                          ) : (
                            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Must be unique.</small>
                          )}
                        </label>
                        <label className="pc-field-item">
                          <span>Plant Name <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="plantName" value={form.plantName} onChange={handleChange} disabled={isViewing} placeholder="Enter plant name" maxLength={100} />
                        </label>
                        <label className="pc-field-item">
                          <span>Company Reference <b style={{ color: '#ef4444' }}>*</b></span>
                          <SearchableSelect
                            name="company"
                            value={form.company}
                            onChange={handleChange}
                            disabled={isViewing}
                            placeholder="Select Company"
                            options={companies.map(c => ({ value: c.coyId, label: c.coyNm }))}
                          />
                        </label>
                        <label className="pc-field-item">
                          <span>Email <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="email" name="email" value={form.email} onChange={handleChange} disabled={isViewing} placeholder="Enter email" maxLength={100} />
                          {formErrors.email && (
                            <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.email}</span>
                          )}
                        </label>
                      </div>

                      <div className="pc-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                        <label className="pc-field-item">
                          <span>Capacity (TPD) <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="capacity" value={form.capacity} onChange={handleChange} disabled={isViewing} placeholder="Enter capacity" />
                        </label>
                        <label className="pc-field-item">
                          <span>Plant Image</span>
                          <div className="pc-logo-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="pc-logo-box" style={{ width: '48px', height: '48px', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden', flexShrink: 0 }}>
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

                    {/* 2. Location Details */}
                    <section className="pc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="pc-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Location Details</h3>
                      <div className="pc-form-layout-row columns-4">
                        <label className="pc-field-item" style={{ gridColumn: 'span 2' }}>
                          <span>Address <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="addressLine1" value={form.addressLine1} onChange={handleChange} disabled={isViewing} placeholder="Enter address" maxLength={100} />
                          {formErrors.addressLine1 && (
                            <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.addressLine1}</span>
                          )}
                        </label>
                        <label className="pc-field-item">
                          <span>State <b style={{ color: '#ef4444' }}>*</b></span>
                          <SearchableSelect
                            name="state"
                            value={form.state}
                            onChange={handleChange}
                            disabled={isViewing}
                            placeholder="Select State"
                            options={states.map(s => ({ value: s.stId, label: s.stNm }))}
                          />
                        </label>
                        <label className="pc-field-item">
                          <span>Zone</span>
                          <input type="text" name="zone" value={form.zone} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-filled Zone" />
                        </label>
                      </div>

                      <div className="pc-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                        <label className="pc-field-item">
                          <span>District <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="district" value={form.district} onChange={handleChange} disabled={isViewing} placeholder="Enter district" maxLength={30} />
                          {formErrors.district && (
                            <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.district}</span>
                          )}
                        </label>
                        <label className="pc-field-item">
                          <span>Pincode <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="pincode" value={form.pincode} onChange={handleChange} disabled={isViewing} placeholder="Enter pincode" maxLength="6" />
                          {formErrors.pincode && (
                            <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.pincode}</span>
                          )}
                        </label>
                        <label className="pc-field-item">
                          <span>Working Days Per Week <b style={{ color: '#ef4444' }}>*</b></span>
                          <select name="workingDays" value={form.workingDays} onChange={handleChange} disabled={isViewing}>
                            <option value="" disabled hidden>Select working days</option>
                            <option value="5">5 days per week</option>
                            <option value="6">6 days per week</option>
                          </select>
                        </label>
                      </div>
                    </section>

                    {/* 3. GEO Location */}
                    <section className="pc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="pc-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>GEO Location</h3>
                      <div className="pc-form-layout-row columns-4">
                        <label className="pc-field-item">
                          <span>Latitude <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="latitude" value={form.latitude} onChange={handleChange} disabled={isViewing} placeholder="Enter latitude" />
                          {formErrors.latitude && (
                            <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.latitude}</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748b', fontSize: '12px', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                            <Info size={14} style={{ color: '#3b82f6' }} />
                            <span>17.438574 N / S</span>
                          </div>
                        </label>
                        <label className="pc-field-item">
                          <span>Longitude <b style={{ color: '#ef4444' }}>*</b></span>
                          <input type="text" name="longitude" value={form.longitude} onChange={handleChange} disabled={isViewing} placeholder="Enter longitude" />
                          {formErrors.longitude && (
                            <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.longitude}</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748b', fontSize: '12px', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                            <Info size={14} style={{ color: '#3b82f6' }} />
                            <span>78.421012 E / W</span>
                          </div>
                        </label>
                      </div>
                    </section>

                    {/* 4. Information */}
                    <section className="pc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="pc-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Additional Information</h3>
                      <div className="pc-form-layout-row columns-4">
                        <label className="pc-field-item" style={{ gridColumn: 'span 4' }}>
                          <span>Remarks</span>
                          <textarea name="Remarks" value={form.Remarks} onChange={handleChange} disabled={isViewing} placeholder="Enter remarks" rows={3} maxLength={250} />
                        </label>
                      </div>
                        </section>
                      </>
                    )}
                  </div>

                  {/* Form Footer Buttons */}
                  {!isViewing && (
                  <div className="pc-form-footer" style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    padding: '16px 24px',
                    backgroundColor: '#fafbfc',
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    <button type="button" className="pc-btn primary" onClick={handleSave}>
                      <Save size={14} /> {isEditing ? "Update Plant" : "Save Plant"}
                    </button>
                    <button type="button" className="pc-btn secondary" onClick={() => {
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
            /* ================= VIEW: PLANT LIST ================= */
            <div className="pc-content" style={{ maxWidth: '1280px', margin: '0 auto' }}>

              {/* INTEGRATED CARD FOR FILTERS AND TABLE */}
              <div className="pc-table-panel" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

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
                      Plant List
                    </h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
                      View and manage all registered plant details
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search plants..."
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
                        className="pc-btn-add-new"
                        onClick={() => {
                          handleResetForm();
                          setIsEditing(false);
                          setView("form");
                        }}
                      >
                        <Plus size={16} /> Add New Plant
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Table Section Inside the Card */}
                <div className="pc-table-container" style={{ overflowX: 'auto', paddingBottom: '20px' }}>
                  <table className="pc-list-table text-nowrap" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '2200px', whiteSpace: 'nowrap' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ ...thStyle, width: "50px" }}>S.NO</th>
                        <th style={thStyle}>LOGO</th>
                        <th style={thStyle}>
                          PLANT CODE
                        </th>
                        <th style={thStyle}>
                          PLANT NAME
                        </th>
                        <th style={thStyle}>
                          COMPANY
                        </th>
                        <th style={thStyle}>EMAIL</th>
                        <th style={thStyle}>CAPACITY (TPD)</th>
                        <th style={thStyle}>ADDRESS</th>
                        <th style={thStyle}>STATE</th>
                        <th style={thStyle}>ZONE</th>
                        <th style={thStyle}>DISTRICT</th>
                        <th style={thStyle}>PINCODE</th>
                        <th style={thStyle}>LATITUDE</th>
                        <th style={thStyle}>LONGITUDE</th>
                        <th style={thStyle}>WORKING DAYS</th>
                        <th style={thStyle}>REMARKS</th>
                        <th style={thStyle}>STATUS</th>
                        <th style={{ ...thStyle, textAlign: "center", width: "100px" }}>
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                              Loading plants...
                            </div>
                          </td>
                        </tr>
                      ) : currentItems.length > 0 ? (
                        currentItems.map((plant, index) => (
                          <tr key={plant.pltId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td data-label="#" style={tdStyle}>{index + 1}</td>
                            <td data-label="LOGO" style={{ ...tdStyle, padding: '14px 20px' }}>
                              {plant.logo ? (
                                <img src={plant.logo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                                  <Factory size={16} style={{ color: '#94a3b8' }} />
                                </div>
                              )}
                            </td>
                            <td data-label="PLANT CODE" style={tdStyle}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                                {plant.pltCd}
                              </span>
                            </td>
                            <td data-label="PLANT NAME" style={tdStyle}><strong>{plant.pltNm}</strong></td>
                            <td data-label="COMPANY" style={tdStyle}>
                              {companies.find(c => Number(c.coyId) === Number(plant.coyId))?.coyNm || "N/A"}
                            </td>
                            <td data-label="EMAIL" style={tdStyle}>{plant.email}</td>
                            <td data-label="CAPACITY (TPD)" style={tdStyle}>{plant.cap}</td>
                            <td data-label="ADDRESS" style={tdStyle}>{plant.addr}</td>
                            <td data-label="STATE" style={tdStyle}>
                              {states.find(s => Number(s.stId) === Number(plant.stId))?.stNm || "N/A"}
                            </td>
                            <td data-label="ZONE" style={tdStyle}>{plant.znNm || "N/A"}</td>
                            <td data-label="DISTRICT" style={tdStyle}>{plant.dist}</td>
                            <td data-label="PINCODE" style={tdStyle}>{plant.pin}</td>
                            <td data-label="LATITUDE" style={tdStyle}>{plant.lat || "N/A"}</td>
                            <td data-label="LONGITUDE" style={tdStyle}>{plant.longt || "N/A"}</td>
                            <td data-label="WORKING DAYS" style={tdStyle}>{plant.wrkDaysPerWk ? `${plant.wrkDaysPerWk} days per week` : "N/A"}</td>
                            <td data-label="REMARKS" style={tdStyle}>{plant.addlRem || "N/A"}</td>
                            <td data-label="STATUS" style={tdStyle}>
                              <span
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'inline-block',
                                  backgroundColor: plant.sts ? '#dcfce7' : '#fee2e2',
                                  color: plant.sts ? '#166534' : '#991b1b'
                                }}
                              >
                                {plant.sts ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td data-label="ACTIONS" style={{ ...tdStyle, position: "relative", textAlign: 'center' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }}
                                onClick={(e) => toggleDropdown(e, plant.pltId)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <MoreVertical size={18} />
                              </button>

                              {/* Actions Dropdown menu */}
                              {activeDropdown === plant.pltId && (
                                <>
                                  <div
                                    className="pc-actions-dropdown-backdrop"
                                    onClick={() => setActiveDropdown(null)}
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                                  />
                                  <div className="pc-actions-dropdown-menu" style={{ position: 'fixed', right: `${dropdownPos.right}px`, top: dropdownPos.isTop ? 'auto' : `${dropdownPos.bottom}px`, bottom: dropdownPos.isTop ? `${window.innerHeight - dropdownPos.top}px` : 'auto', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                    <button
                                      type="button"
                                      style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                      onClick={() => handleView(plant)}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <Eye size={15} /> View
                                    </button>
                                    {screenPerm.canEdit && (
                                      <button
                                        type="button"
                                        style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                        onClick={() => handleEdit(plant)}
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
                                        onClick={() => handleDelete(plant.pltId)}
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
                          <td colSpan="8" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>
                            No plant records found. Add a new plant using the button above.
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
                      Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, sortedPlants.length)} of {sortedPlants.length} entries
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
        <div className="pc-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pc-modal" style={{ backgroundColor: 'white', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <div className="pc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Deactivate Plant Record</h3>
              <button
                type="button"
                className="pc-modal-close"
                onClick={() => setShowDeactivateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="pc-modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '14px' }}>Are you sure you want to deactivate this plant record?</p>
              <p className="pc-modal-warning" style={{ margin: 0, color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>
                This will change its status to Inactive.
              </p>
            </div>
            <div className="pc-modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                className="pc-btn-cancel-modal"
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pc-btn-delete-modal"
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
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <AlertModal
        isOpen={showDeleteModal}
        type="warning"
        title="Delete Plant"
        message="Are you sure you want to delete this plant? This action cannot be undone."
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default PlantCreation;
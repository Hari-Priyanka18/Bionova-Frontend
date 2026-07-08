import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Header from '../Header'; 
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
  Info
} from "lucide-react";
import '../../styles/PlantMaster.css';
import AlertModal from "../AlertModal";

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

const PlantCreation = ({ userRole, onLogout }) => {
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
  const [loading, setLoading] = useState(false);

  const fetchPlants = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/plants`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setPlants(data);
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

  useEffect(() => {
    fetchPlants();
    fetchCompanies();
    fetchStates();
  }, []);

  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
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

  // Deactivation confirmation modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTargetId, setDeactivateTargetId] = useState(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const validateField = (name, value) => {
    let error = "";
    if (name === "latitude") {
      if (!value) {
        error = "Latitude is required.";
      } else {
        const latRegex = /^\d{2}\.\d{6}\s[NEWS]$/;
        if (!latRegex.test(value.trim())) {
          error = "Format must be e.g. 17.438574 N (2 digits, dot, 6 decimals, space, and N/E/W/S).";
        }
      }
    } else if (name === "longitude") {
      if (!value) {
        error = "Longitude is required.";
      } else {
        const lngRegex = /^\d{2}\.\d{6}\s[NEWS]$/;
        if (!lngRegex.test(value.trim())) {
          error = "Format must be e.g. 78.421012 E (2 digits, dot, 6 decimals, space, and N/E/W/S).";
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

    validateField(name, newValue);
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

  const handleResetForm = () => {
    setForm({
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
    setLogoFile(null);
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
      !form.latitude ||
      !form.longitude ||
      !form.workingDays ||
      !form.status
    ) {
      triggerAlert("error", "Validation Error", "Please fill in all required fields marked with *");
      return;
    }

    // Geo location regex check
    const latRegex = /^\d{2}\.\d{6}\s[NEWS]$/;
    const lngRegex = /^\d{2}\.\d{6}\s[NEWS]$/;
    if (!latRegex.test(form.latitude.trim())) {
      triggerAlert("error", "Validation Error", "Latitude format must be e.g. 17.438574 N (2 digits, dot, 6 decimals, space, and N/E/W/S).");
      return;
    }
    if (!lngRegex.test(form.longitude.trim())) {
      triggerAlert("error", "Validation Error", "Longitude format must be e.g. 78.421012 E (2 digits, dot, 6 decimals, space, and N/E/W/S).");
      return;
    }

    // Unique Plant Code check
    const isDuplicate = plants.some(
      p => p.pltCd?.toLowerCase().trim() === form.plantCode.toLowerCase().trim() && p.pltId !== editingId
    );

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
    setEditingId(plant.pltId);
    setActiveDropdown(null);
    setView("form");
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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this plant?")) {
      setLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/api/plants/${id}`, {
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
      }
      setActiveDropdown(null);
    }
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
        const coy = companies.find(c => Number(c.coyId) === Number(plant.coyId));
        return (
          (plant.pltNm && plant.pltNm.toLowerCase().includes(q)) ||
          (plant.pltCd && plant.pltCd.toLowerCase().includes(q)) ||
          (coy && coy.coyNm && coy.coyNm.toLowerCase().includes(q))
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

  const currentItems = sortedPlants;

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
          title="Plant Master" 
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
                    <h2 style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#0f172a', 
                      margin: 0 
                    }}>
                      {isEditing ? "Edit Plant" : "Add New Plant"}
                    </h2>
                    <button
                      type="button"
                      className="pc-nav-view-btn"
                      onClick={() => {
                        setView("list");
                        handleResetForm();
                        setIsEditing(false);
                        setEditingId(null);
                      }}
                    >
                      <ChevronLeft size={15} /> Back to Plant List
                    </button>
                  </div>

                  {/* Form Body */}
                  <div style={{ padding: '24px' }}>

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
                      
                      <div className="pc-form-layout-row columns-4">
                        <label className="pc-field-item">
                          <span>Plant Code <b style={{color: '#ef4444'}}>*</b></span>
                          <input type="text" name="plantCode" value={form.plantCode} onChange={handleChange} placeholder="Enter plant code" maxLength={10} />
                          <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Must be unique.</small>
                        </label>
                        <label className="pc-field-item">
                          <span>Plant Name <b style={{color: '#ef4444'}}>*</b></span>
                          <input type="text" name="plantName" value={form.plantName} onChange={handleChange} placeholder="Enter plant name" maxLength={100} />
                        </label>
                        <label className="pc-field-item">
                          <span>Company Reference <b style={{ color: '#ef4444' }}>*</b></span>
                          <SearchableSelect 
                            name="company" 
                            value={form.company} 
                            onChange={handleChange} 
                            placeholder="Select Company"
                            options={companies.map(c => ({ value: c.coyId, label: c.coyNm }))}
                          />
                        </label>
                        <label className="pc-field-item">
                          <span>Email <b style={{color: '#ef4444'}}>*</b></span>
                          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter email" maxLength={100} />
                        </label>
                      </div>

                      <div className="pc-form-layout-row columns-4" style={{ marginTop: '20px' }}>
                        <label className="pc-field-item">
                          <span>Capacity (TPD) <b style={{color: '#ef4444'}}>*</b></span>
                          <input type="text" name="capacity" value={form.capacity} onChange={handleChange} placeholder="Enter capacity" />
                        </label>
                        <label className="pc-field-item">
                          <span>Plant Image</span>
                          <div className="pc-logo-row">
                            <div className="pc-logo-box" style={{ width: '48px', height: '48px', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                              {form.logo ? <img src={form.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={22} style={{ color: '#94a3b8' }} />}
                            </div>
                            <input id="logoUploadHidden" type="file" accept="image/*" onChange={handleLogoChange} hidden />
                            <button type="button" onClick={() => document.getElementById("logoUploadHidden").click()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#0f172a', cursor: 'pointer' }}>
                              <Upload size={14} /> Upload Image
                            </button>
                          </div>
                        </label>
                      </div>
                    </section>

                    {/* 2. Location Details */}
                    <section className="pc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="pc-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Location Details</h3>
                      <div className="pc-form-layout-row columns-4">
                        <label className="pc-field-item" style={{ gridColumn: 'span 2' }}>
                          <span>Address <b style={{color: '#ef4444'}}>*</b></span>
                          <input type="text" name="addressLine1" value={form.addressLine1} onChange={handleChange} placeholder="Enter addres" maxLength={100} />
                        </label>
                        <label className="pc-field-item">
                          <span>State <b style={{ color: '#ef4444' }}>*</b></span>
                          <SearchableSelect 
                            name="state" 
                            value={form.state} 
                            onChange={handleChange} 
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
                          <span>District <b style={{color: '#ef4444'}}>*</b></span>
                          <input type="text" name="district" value={form.district} onChange={handleChange} placeholder="Enter district" maxLength={30} />
                        </label>
                        <label className="pc-field-item">
                          <span>Pincode</span>
                          <input type="text" name="pincode" value={form.pincode} onChange={handleChange} placeholder="Enter pincode" maxLength="6" />
                        </label>
                        <label className="pc-field-item">
                          <span>Working Days Per Week <b style={{color: '#ef4444'}}>*</b></span>
                          <select name="workingDays" value={form.workingDays} onChange={handleChange}>
                            <option value="">Select working days</option>
                            <option value="5">5 days per week</option>
                            <option value="6">6 days per week</option>
                          </select>
                        </label>
                      </div>
                    </section>

                    {/* 3. GEO Loaction */}
                    <section className="pc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="pc-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>GEO Loaction </h3>
                      <div className="pc-form-layout-row columns-4">
                        <label className="pc-field-item">
                          <span>Latitude <b style={{color: '#ef4444'}}>*</b></span>
                          <input type="text" name="latitude" value={form.latitude} onChange={handleChange} placeholder="Enter latitude" />
                          {formErrors.latitude && (
                            <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.latitude}</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748b', fontSize: '12px', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                            <Info size={14} style={{ color: '#3b82f6' }} />
                            <span>17.438574 N</span>
                          </div>
                        </label>
                        <label className="pc-field-item">
                          <span>Longitude <b style={{color: '#ef4444'}}>*</b></span>
                          <input type="text" name="longitude" value={form.longitude} onChange={handleChange} placeholder="Enter longitude" />
                          {formErrors.longitude && (
                            <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.longitude}</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#64748b', fontSize: '12px', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                            <Info size={14} style={{ color: '#3b82f6' }} />
                            <span>78.421012 E</span>
                          </div>
                        </label>
                      </div>
                    </section>

                    {/* 4. Information */}
                    <section className="pc-panel" style={{ backgroundColor: 'white', padding: 0, border: 'none', marginBottom: '32px' }}>
                      <h3 className="pc-section-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}> Information</h3>
                      <div className="pc-form-layout-row columns-4">
                        <label className="pc-field-item" style={{ gridColumn: 'span 4' }}>
                          <span> Remarks</span>
                          <textarea name="Remarks" value={form.Remarks} onChange={handleChange} placeholder="Enter  remarks" rows={3} maxLength={250} />
                        </label>
                      </div>
                    </section>
                  </div>

                  {/* Form Footer Buttons */}
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
                    <button type="button" className="pc-btn tertiary" onClick={handleResetForm}>
                      <RefreshCcw size={14} /> Reset
                    </button>
                    <button type="button" className="pc-btn secondary" onClick={() => {
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
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        style={{ padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '250px' }}
                      />
                    </div>
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
                  </div>
                </div>

                {/* Data Table Section Inside the Card */}
                <div className="pc-table-container" style={{ overflowX: 'auto', paddingBottom: '140px' }}>
                  <table className="pc-list-table text-nowrap" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '2200px', whiteSpace: 'nowrap' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ ...thStyle, width: "50px" }}>S.NO</th>
                        <th style={thStyle}>LOGO</th>
                        <th
                          className="sortable"
                          onClick={() => handleSort("plantCode")}
                          style={{ ...thStyle, cursor: 'pointer' }}
                        >
                          PLANT CODE{" "}
                          {sortConfig.key === "plantCode" &&
                            (sortConfig.direction === "asc" ? "▲" : "▼")}
                        </th>
                        <th
                          className="sortable"
                          onClick={() => handleSort("plantName")}
                          style={{ ...thStyle, cursor: 'pointer' }}
                        >
                          PLANT NAME{" "}
                          {sortConfig.key === "plantName" &&
                            (sortConfig.direction === "asc" ? "▲" : "▼")}
                        </th>
                        <th
                          className="sortable"
                          onClick={() => handleSort("company")}
                          style={{ ...thStyle, cursor: 'pointer' }}
                        >
                          COMPANY{" "}
                          {sortConfig.key === "company" &&
                            (sortConfig.direction === "asc" ? "▲" : "▼")}
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
                        <th style={thStyle}> REMARKS</th>
                        <th style={thStyle}>STATUS</th>
                        <th style={{ ...thStyle, textAlign: "center", width: "100px" }}>
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.length > 0 ? (
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
                            <td data-label=" REMARKS" style={tdStyle}>{plant.addlRem || "N/A"}</td>
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
                                onClick={() => toggleDropdown(plant.pltId)}
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
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                                  />
                                  <div className="pc-actions-dropdown-menu" style={{ position: 'absolute', right: '30px', top: '8px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                    <button
                                      type="button"
                                      style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                      onClick={() => {
                                        triggerAlert(
                                          "info",
                                          "Plant Details",
                                          `Plant Details:\nCode: ${plant.pltCd}\nName: ${plant.pltNm}\nCompany: ${companies.find(c => Number(c.coyId) === Number(plant.coyId))?.coyNm || 'N/A'}\nCapacity: ${plant.cap} TPD\nLocation: ${plant.dist}, ${states.find(s => Number(s.stId) === Number(plant.stId))?.stNm || 'N/A'}`
                                        );
                                        setActiveDropdown(null);
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <Eye size={15} /> View
                                    </button>
                                    <button
                                      type="button"
                                      style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }}
                                      onClick={() => handleEdit(plant)}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <Edit size={15} /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ef4444', borderRadius: '4px', margin: '2px 4px' }}
                                      onClick={() => handleDelete(plant.pltId)}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <Trash2 size={15} /> Delete
                                    </button>
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
    </div>
  );
};

export default PlantCreation;
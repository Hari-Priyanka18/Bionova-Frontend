import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Briefcase,
  FileText,
  Save,
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  MoreVertical,
  X
} from "lucide-react";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import AlertModal from "../AlertModal.jsx";
import { getScreenPermission } from "../../utils/permissions";
import "../../styles/DesignationMaster.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

const DesignationCreation = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('DESIGNATION_CREATION');
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const fetchDesignations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/designations`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((desig) => ({
          id: desig.desigId || desig.id,
          code: desig.desigCd || desig.code,
          name: desig.desigNm || desig.name,
          description: desig.desigDesc || desig.description || ""
        }));
        setDesignations(mapped);
        setForm(prev => {
          if (!prev.code || /^DESG-\d+$/i.test(prev.code)) {
            return { ...prev, code: generateDesignationCode(mapped) };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error fetching designations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  // Screen View: "form" or "list"
  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: ""
  });

  // UI States
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ isTop: false, top: 0, bottom: 0, right: 0 });

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

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  const triggerAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  // Sorting & Search
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const validateField = (name, value) => {
    let error = "";
    if (name === "code") {
      if (!value || !value.trim()) {
        error = "Designation Code is required.";
      } else if (/\s/.test(value)) {
        error = "Spaces are not allowed in Designation Code.";
      } else if (value.length > 50) {
        error = "Designation Code cannot exceed 50 characters.";
      }
    }
    setFormErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "code") {
      newValue = value.slice(0, 50);
      validateField("code", newValue);
    } else if (name === "name") {
      newValue = value.slice(0, 100);
    } else if (name === "description") {
      newValue = value.slice(0, 255);
    }
    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleReset = (dList = designations) => {
    setForm({ code: generateDesignationCode(dList), name: "", description: "" });
    setFormErrors({});
    setIsViewing(false);
  };

  // Actual save API call
  const performSave = async (payload) => {
    setLoading(true);
    try {
      let response;
      if (isEditing) {
        response = await fetch(`${apiBaseUrl}/api/designations/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${apiBaseUrl}/api/designations`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "Failed to save designation";
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.message) errorMsg = parsed.message;
          else if (parsed.error && parsed.status) {
            errorMsg = `Server Error (${parsed.status}): ${parsed.error}.`;
          }
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      triggerAlert("success", "Success", isEditing ? "Designation updated successfully!" : "Designation created successfully!");
      fetchDesignations();
      handleReset();
      setIsEditing(false);
      setEditingId(null);
      setView("list");
    } catch (err) {
      console.error("Save designation failed:", err);
      triggerAlert("error", "Error", err.message || "Could not connect to server or save designation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // 1. Designation Code check
    if (!form.code.trim()) {
      triggerAlert("error", "Validation Error", "Designation Code is required.");
      return;
    }
    if (/\s/.test(form.code)) {
      triggerAlert("error", "Validation Error", "Spaces are not allowed in Designation Code.");
      return;
    }
    if (form.code.trim().length > 50) {
      triggerAlert("error", "Validation Error", "Designation Code cannot exceed 50 characters.");
      return;
    }

    // 2. Designation Name check
    if (!form.name.trim()) {
      triggerAlert("error", "Validation Error", "Designation Name is required.");
      return;
    }
    if (form.name.trim().length > 100) {
      triggerAlert("error", "Validation Error", "Designation Name cannot exceed 100 characters.");
      return;
    }

    // 3. Description check (optional but max 255 chars)
    if (form.description && form.description.length > 255) {
      triggerAlert("error", "Validation Error", "Designation Description cannot exceed 255 characters.");
      return;
    }

    const codeToCheck = form.code.trim().toUpperCase();

    // Check duplicate code (exact match, case-insensitive)
    const isDuplicateCode = designations.some(
      (desig) => desig.code && desig.code.toUpperCase() === codeToCheck && (!isEditing || desig.id !== editingId)
    );

    if (isDuplicateCode) {
      setAlertConfig({
        isOpen: true,
        type: "warning",
        title: "Already Exists",
        message: "Designation code already exists.",
        confirmText: "OK",
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    const nameToCheck = form.name.trim().toLowerCase();
    // Check for exact duplicate name (case-insensitive)
    const isExactDuplicateName = designations.some(
      (desig) => {
        if (!desig.name) return false;
        const existingName = desig.name.toLowerCase().trim();
        if (isEditing && desig.id === editingId) return false;
        return existingName === nameToCheck;
      }
    );

    if (isExactDuplicateName) {
      setAlertConfig({
        isOpen: true,
        type: "warning",
        title: "Already Exists",
        message: "Designation name already exists.",
        confirmText: "OK",
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    const desigPayload = {
      desigCd: codeToCheck,
      desigNm: form.name.trim(),
      desigDesc: form.description.trim()
    };

    performSave(desigPayload);
  };

  const handleEdit = (desig) => {
    setForm({ code: desig.code, name: desig.name, description: desig.description || "" });
    setIsEditing(true);
    setIsViewing(false);
    setEditingId(desig.id);
    setActiveDropdown(null);
    setView("form");
  };

  const handleView = (desig) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setForm({ code: desig.code, name: desig.name, description: desig.description || "" });
    setIsEditing(false);
    setIsViewing(true);
    setEditingId(desig.id);
    setActiveDropdown(null);
    setView("form");
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowModal(true);
    setActiveDropdown(null);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/designations/${deleteId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "Could not delete designation.";
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.message) errorMsg = parsed.message;
          else if (parsed.error && parsed.status === 500) {
            errorMsg = "Cannot delete this designation because it is currently assigned to employees. Please reassign the employees first.";
          } else if (parsed.error) {
            errorMsg = parsed.error;
          }
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }
      triggerAlert("success", "Success", "Designation deleted successfully!");
      fetchDesignations();
    } catch (err) {
      console.error("Delete designation failed:", err);
      triggerAlert("error", "Error", err.message || "Could not delete designation.");
    } finally {
      setLoading(false);
    }
    setShowModal(false);
    setDeleteId(null);
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
    setActiveDropdown((prev) => (prev === id ? null : id));
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") { direction = "desc"; }
    setSortConfig({ key, direction });
  };

  const sortedDesignations = [...designations].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key] || "";
    const bValue = b[sortConfig.key] || "";
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  let filteredItems = sortedDesignations;
  if (tableSearchQuery) {
    const q = tableSearchQuery.toLowerCase();
    filteredItems = sortedDesignations.filter(desig => 
      (desig.code || "").toLowerCase().includes(q) ||
      (desig.name || "").toLowerCase().includes(q)
    );
  }

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredItems.length / recordsPerPage);

  return (
    <div className="desig-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="desig-shell">
        <Header
          title="Designation Creation"
          showSearch={false}
          userName="Syed Mohammad Johny Basha"
          userRole="Web Developer"
          initials="SB"
        />

        <main className="desig-main" style={{ padding: '24px' }}>
          {view === "form" ? (
            <div className="desig-content" style={{ paddingBottom: '80px', width: '100%', maxWidth: 'none' }}>
              <div className="desig-form-card" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                {/* Form Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                        {isViewing ? "View Designation" : isEditing ? "Edit Designation" : "Add New Designation"}
                      </h2>
                      <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
                        {isViewing ? "View designation details below" : "Enter designation details in the form below"}
                      </p>
                    </div>

                    <button type="button" className="desig-nav-view-btn" onClick={() => { handleReset(); setIsEditing(false); setIsViewing(false); setView("list"); }}>
                      <ArrowLeft size={15} /> Back to Designation List
                    </button>
                  </div>
                </div>

                {isViewing ? (
                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Designation Code :</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.code || '-'}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Designation Name :</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.name || '-'}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Description :</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.description || '-'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Form Body */}
                    <div style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'flex-start' }}>

                      {/* Left Side: Inputs */}
                      <div style={{ flex: '1 1 400px', maxWidth: '700px' }}>

                        {/* Side by Side Wrapper */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>

                          {/* Designation Code Input */}
                          <div className="desig-form-item" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                            <label>Designation Code <span className="desig-req-star">*</span></label>
                            <div className="desig-input-icon-wrap">
                              <span className="desig-input-prefix-icon"><Calendar size={16} /></span>
                              <input type="text" name="code" value={form.code} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-generated code" required />
                            </div>
                            {formErrors.code ? (
                              <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.code}</span>
                            ) : (
                              <div className="desig-input-helper-text" style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Designation code must be unique.</div>
                            )}
                          </div>

                          {/* Designation Name Input */}
                          <div className="desig-form-item" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                            <label>Designation Name <span className="desig-req-star">*</span></label>
                            <div className="desig-input-icon-wrap">
                              <span className="desig-input-prefix-icon"><Briefcase size={16} /></span>
                              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Enter designation name" maxLength="100" required />
                            </div>
                          </div>

                        </div>

                        {/* Description Input */}
                        <div className="desig-form-item">
                          <label>Description (Optional)</label>
                          <div className="desig-input-icon-wrap">
                            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Enter description (optional)" maxLength="255" rows={4} style={{ paddingLeft: '14px' }} />
                          </div>
                        </div>
                      </div>

                    </div>
                  </>
                )}

                {/* Form Footer Buttons */}
                {!isViewing && (
                  <div className="desig-form-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', backgroundColor: '#fafbfc', borderTop: '1px solid #e2e8f0' }}>
                    <button type="button" className="desig-btn primary" onClick={handleSave}><Save size={14} /> {isEditing ? "Update Designation" : "Save Designation"}</button>
                    <button type="button" className="desig-btn secondary" onClick={() => { handleReset(); setIsEditing(false); setIsViewing(false); setView("list"); }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="desig-content" style={{ width: '100%', maxWidth: 'none' }}>
              <div className="desig-table-panel" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                {/* Header with Title and Add New Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Designation List</h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>View and manage all designations</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search designations..."
                        value={tableSearchQuery}
                        onChange={(e) => {
                          setTableSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{ padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '250px' }}
                      />
                    </div>
                    {screenPerm.canCreate && (
                      <button type="button" className="desig-btn-add-new" onClick={() => { handleReset(); setIsEditing(false); setIsViewing(false); setView("form"); }}>
                        <Plus size={16} /> Add New Designation
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Table */}
                <div className="desig-table-container" style={{ overflowX: 'auto' }}>
                  <table className="desig-list-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ width: "50px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>S.NO</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designation Code</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designation Name</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                        <th style={{ textAlign: "center", width: "100px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                              Loading designations...
                            </div>
                          </td>
                        </tr>
                      ) : currentItems.length > 0 ? (
                        currentItems.map((desig, index) => (
                          <tr key={desig.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td data-label="S.NO" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{indexOfFirstRecord + index + 1}</td>
                            <td data-label="DESIGNATION CODE" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>{desig.code}</span></td>
                            <td data-label="DESIGNATION NAME" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><strong>{desig.name}</strong></td>
                            <td data-label="DESCRIPTION" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{desig.description || "N/A"}</td>
                            <td data-label="ACTIONS" style={{ position: "relative", padding: '14px 16px', textAlign: 'center' }}>
                              <button id={`action-btn-${desig.id}`} type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }} onClick={(e) => toggleDropdown(e, desig.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <MoreVertical size={18} />
                              </button>
                              {activeDropdown === desig.id && (
                                <>
                                  <div className="desig-actions-dropdown-backdrop" onClick={() => setActiveDropdown(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />
                                  <div className="desig-actions-dropdown-menu" style={{ position: 'fixed', right: `${dropdownPos.right}px`, top: dropdownPos.isTop ? 'auto' : `${dropdownPos.bottom}px`, bottom: dropdownPos.isTop ? `${window.innerHeight - dropdownPos.top}px` : 'auto', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 99, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                    <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleView(desig)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Eye size={15} /> View </button>
                                    {screenPerm.canEdit && (
                                      <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleEdit(desig)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Edit size={15} /> Edit </button>
                                    )}
                                    {screenPerm.canDelete && (
                                      <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ef4444', borderRadius: '4px', margin: '2px 4px' }} onClick={() => confirmDelete(desig.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Trash2 size={15} /> Delete </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>No designation records found. Add a new designation using the button above.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                      Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredItems.length)} of {filteredItems.length} entries
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
              </div>
            </div>
          )}
        </main>

        {/* Confirmation Modal */}
        {showModal && (
          <div className="desig-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="desig-modal" style={{ backgroundColor: 'white', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              <div className="desig-modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Confirm Delete</h3>
                <button className="desig-modal-close" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="desig-modal-body" style={{ padding: '20px' }}>
                <p style={{ margin: '0', color: '#334155', fontSize: '14px' }}>Are you sure you want to delete this designation?</p>
              </div>
              <div className="desig-modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                <button className="desig-btn-cancel-modal" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#475569' }}>Cancel</button>
                <button className="desig-btn-delete-modal" onClick={handleDelete} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false, onConfirm: null, confirmText: undefined, cancelText: undefined }))}
      />
    </div>
  );
};

export default DesignationCreation;
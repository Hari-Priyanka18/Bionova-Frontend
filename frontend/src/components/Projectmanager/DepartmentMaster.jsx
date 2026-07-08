import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Building,
  FileText,
  CheckCircle2,
  X,
  RefreshCcw,
  Save,
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  Menu,
  Bell,
  MoreVertical,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import Sidebar from "../Sidebar";
import Header from "../Header";
import AlertModal from "../AlertModal";
import "../../styles/DepartmentMaster.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

const DepartmentCreation = ({ userRole, onLogout }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/departments`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((dept) => ({
          id: dept.deptId || dept.id,
          code: dept.deptCd || dept.deptCode || dept.code,
          name: dept.deptNm || dept.name,
          description: dept.descr || dept.description || "",
          status: dept.sts ? "Active" : "Inactive",
          company: "Atirath Bio Energy Private Limited",
          head: "Admin User",
          employeesCount: 0
        }));
        setDepartments(mapped);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
      // We will rely on UI state for alerting later, as alertConfig isn't initialized yet here
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Screen View: "form" or "list"
  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    status: "Active"
  });

  // UI States
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "code") {
      newValue = value.slice(0, 10);
    } else if (name === "name") {
      newValue = value.slice(0, 100);
    } else if (name === "description") {
      newValue = value.slice(0, 255);
    }
    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  // Handle Toggle Status
  const handleToggleStatus = (e) => {
    setForm(prev => ({ ...prev, status: e.target.checked ? "Active" : "Inactive" }));
  };



  const handleReset = () => {
    setForm({ code: "", name: "", description: "", status: "Active" });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    // 1. Department Code check
    if (!form.code.trim()) {
      triggerAlert("error", "Validation Error", "Department Code is required.");
      return;
    }
    if (form.code.trim().length > 10) {
      triggerAlert("error", "Validation Error", "Department Code cannot exceed 10 characters.");
      return;
    }

    // 2. Department Name check
    if (!form.name.trim()) {
      triggerAlert("error", "Validation Error", "Department Name is required.");
      return;
    }
    if (form.name.trim().length > 100) {
      triggerAlert("error", "Validation Error", "Department Name cannot exceed 100 characters.");
      return;
    }

    // 3. Description check (optional but max 255 chars)
    if (form.description && form.description.length > 255) {
      triggerAlert("error", "Validation Error", "Department Description cannot exceed 255 characters.");
      return;
    }

    // 4. Status check
    if (!form.status) {
      triggerAlert("error", "Validation Error", "Department Status is required.");
      return;
    }

    const codeToCheck = form.code.trim().toUpperCase();

    const isDuplicate = departments.some(
      (dept) => dept.code && dept.code.toUpperCase() === codeToCheck && (!isEditing || dept.id !== editingId)
    );

    if (isDuplicate) {
      triggerAlert("error", "Duplicate Error", "Department code already exists.");
      return;
    }

    const deptPayload = {
      deptCode: codeToCheck,
      deptNm: form.name.trim(),
      descr: form.description.trim(),
      sts: form.status === "Active"
    };

    setLoading(true);
    try {
      let response;
      if (isEditing) {
        response = await fetch(`${apiBaseUrl}/api/departments/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(deptPayload)
        });
      } else {
        response = await fetch(`${apiBaseUrl}/api/departments`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(deptPayload)
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "Failed to save department";
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

      triggerAlert("success", "Success", isEditing ? "Department updated successfully!" : "Department created successfully!");
      fetchDepartments();
      handleReset();
      setIsEditing(false);
      setEditingId(null);
      setView("list");
    } catch (err) {
      console.error("Save department failed:", err);
      triggerAlert("error", "Error", err.message || "Could not connect to server or save department.");
    } finally {
      setLoading(false);
    }
  };



  const handleEdit = (dept) => {
    setForm({ code: dept.code, name: dept.name, description: dept.description || "", status: dept.status });
    setIsEditing(true);
    setEditingId(dept.id);
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
      const response = await fetch(`${apiBaseUrl}/api/departments/${deleteId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "Could not delete department.";
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.message) errorMsg = parsed.message;
          else if (parsed.error && parsed.status === 500) {
            errorMsg = "Cannot delete this department because it is currently linked to other records. Please deactivate it instead.";
          } else if (parsed.error) {
            errorMsg = parsed.error;
          }
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }
      triggerAlert("success", "Success", "Department deactivated successfully!");
      fetchDepartments();
    } catch (err) {
      console.error("Delete department failed:", err);
      triggerAlert("error", "Error", err.message || "Could not delete department.");
    } finally {
      setLoading(false);
    }
    setShowModal(false);
    setDeleteId(null);
  };

  const toggleDropdown = (e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      right: window.innerWidth - rect.right
    });
    setActiveDropdown((prev) => (prev === id ? null : id));
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") { direction = "desc"; }
    setSortConfig({ key, direction });
  };

  const sortedDepartments = [...departments].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  let currentItems = sortedDepartments;
  if (tableSearchQuery) {
    const q = tableSearchQuery.toLowerCase();
    currentItems = sortedDepartments.filter(dept => 
      (dept.code || "").toLowerCase().includes(q) ||
      (dept.name || "").toLowerCase().includes(q)
    );
  }

  return (
    <div className="dept-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="dept-shell">
        <Header
          title="Department Master"
          showSearch={false}
          userName="Syed Mohammad Johny Basha"
          userRole="Web Developer"
          initials="SB"
        />

        {/* Breadcrumb Navigation */}

        <main className="dept-main" style={{ padding: '24px' }}>
          {view === "form" ? (
            <div className="dept-content" style={{ paddingBottom: '80px', width: '100%', maxWidth: 'none' }}>
              <div className="dept-form-card" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                {/* Form Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                        {isEditing ? "Edit Department" : "Add New Department"}
                      </h2>
                      <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
                        Enter department details in the form below
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                      <button type="button" className="dept-nav-view-btn" onClick={() => { handleReset(); setIsEditing(false); setView("list"); }}>
                        <ArrowLeft size={15} /> Back to Department List
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Body - UPDATED DEPARTMENT NAME (REVERTED TO NORMAL) AND TOGGLE (SCREENSHOT MATCH) */}
                <div style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'flex-start' }}>

                  {/* Left Side: Inputs */}
                  <div style={{ flex: '1 1 400px', maxWidth: '700px' }}>

                    {/* --- Side by Side Wrapper --- */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>

                      {/* Department Code Input */}
                      <div className="dept-form-item" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                        <label>Department Code <span className="dept-req-star">*</span></label>
                        <div className="dept-input-icon-wrap">
                          <span className="dept-input-prefix-icon"><Calendar size={16} /></span>
                          <input type="text" name="code" value={form.code} onChange={handleChange} placeholder="Enter department code" maxLength="10" required />
                        </div>
                        <div className="dept-input-helper-text" style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Department code must be unique.</div>
                      </div>

                      {/* Department Name Input (Normal) */}
                      <div className="dept-form-item" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                        <label>Department Name <span className="dept-req-star">*</span></label>
                        <div className="dept-input-icon-wrap">
                          <span className="dept-input-prefix-icon"><Building size={16} /></span>
                          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Enter department name" maxLength="100" required />
                        </div>
                      </div>

                    </div>
                    {/* --- End Side by Side Wrapper --- */}

                    {/* Description Input */}
                    <div className="dept-form-item">
                      <label>Description (Optional)</label>
                      <div className="dept-input-icon-wrap">
                        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Enter description (optional)" maxLength="255" rows={4} style={{ paddingLeft: '14px' }} />
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Status Toggle (SCREENSHOT STYLE) */}
                  <div style={{ width: '280px', paddingTop: '8px' }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

                      <span style={{ fontSize: "16px", fontWeight: "600", color: "#334155" }}>Status:</span>

                      <label style={{ position: "relative", display: "inline-block", width: "48px", height: "26px", margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={form.status === "Active"}
                          onChange={handleToggleStatus}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: form.status === "Active" ? "#10b981" : "#cbd5e1",
                          transition: ".3s", borderRadius: "34px"
                        }}>
                          <span style={{
                            position: "absolute", height: "20px", width: "20px",
                            left: form.status === "Active" ? "25px" : "3px", bottom: "3px",
                            backgroundColor: "white", transition: ".3s", borderRadius: "50%",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                          }}></span>
                        </span>
                      </label>

                      <span style={{
                        fontSize: "16px", fontWeight: "600", minWidth: "50px",
                        color: form.status === "Active" ? "#10b981" : "#64748b"
                      }}>
                        {form.status}
                      </span>

                    </div>
                  </div>

                </div>

                {/* Form Footer Buttons */}
                <div className="dept-form-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', backgroundColor: '#fafbfc', borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" className="dept-btn primary" onClick={handleSave}><Save size={14} /> {isEditing ? "Update Department" : "Save Department"}</button>
                  <button type="button" className="dept-btn secondary" onClick={() => { handleReset(); setIsEditing(false); setView("list"); }}>Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="dept-content" style={{ width: '100%', maxWidth: 'none' }}>
              <div className="dept-table-panel" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                {/* Header with Title and Add New Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Department List</h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>View and manage all departments</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search departments..."
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        style={{ padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '250px' }}
                      />
                    </div>
                    <button type="button" className="dept-btn-add-new" onClick={() => { handleReset(); setIsEditing(false); setView("form"); }}>
                      <Plus size={16} /> Add New Department
                    </button>
                  </div>
                </div>

                {/* Data Table */}
                <div className="dept-table-container" style={{ overflowX: 'auto' }}>
                  <table className="dept-list-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ width: "50px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>S.NO</th>
                        <th className="sortable" onClick={() => handleSort("code")} style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department Code {sortConfig.key === "code" && (sortConfig.direction === "asc" ? "▲" : "▼")}</th>
                        <th className="sortable" onClick={() => handleSort("name")} style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department Name {sortConfig.key === "name" && (sortConfig.direction === "asc" ? "▲" : "▼")}</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                        <th className="sortable" onClick={() => handleSort("status")} style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "▲" : "▼")}</th>
                        <th style={{ textAlign: "center", width: "100px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.length > 0 ? (
                        currentItems.map((dept, index) => (
                          <tr key={dept.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td data-label="S.NO" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{index + 1}</td>
                            <td data-label="DEPARTMENT CODE" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>{dept.code}</span></td>
                            <td data-label="DEPARTMENT NAME" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><strong>{dept.name}</strong></td>
                            <td data-label="DESCRIPTION" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{dept.description || "N/A"}</td>
                            <td data-label="STATUS" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'inline-block', backgroundColor: dept.status === 'Active' ? '#dcfce7' : '#fee2e2', color: dept.status === 'Active' ? '#166534' : '#991b1b' }}>{dept.status}</span></td>
                            <td data-label="ACTIONS" style={{ position: "relative", padding: '14px 16px', textAlign: 'center' }}>
                              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }} onClick={(e) => toggleDropdown(e, dept.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <MoreVertical size={18} />
                              </button>
                              {activeDropdown === dept.id && (
                                <>
                                  <div className="dept-actions-dropdown-backdrop" onClick={() => setActiveDropdown(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                                  <div className="dept-actions-dropdown-menu" style={{ position: 'fixed', right: `${dropdownPos.right}px`, top: `${dropdownPos.top}px`, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 999, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                    <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => { triggerAlert("info", "Department Info", `Department Info:\nCode: ${dept.code}\nName: ${dept.name}\nDescription: ${dept.description}`); setActiveDropdown(null); }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Eye size={15} /> View </button>
                                    <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleEdit(dept)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Edit size={15} /> Edit </button>
                                    <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ef4444', borderRadius: '4px', margin: '2px 4px' }} onClick={() => confirmDelete(dept.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Trash2 size={15} /> Delete </button>
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={6} style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>No department records found. Add a new department using the button above.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Confirmation Modal */}
        {showModal && (
          <div className="dept-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="dept-modal" style={{ backgroundColor: 'white', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              <div className="dept-modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Confirm Deactivation</h3>
                <button className="dept-modal-close" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="dept-modal-body" style={{ padding: '20px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '14px' }}>Are you sure you want to deactivate this department?</p>
                <p className="dept-modal-warning" style={{ margin: 0, color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>This operation cannot be undone!</p>
              </div>
              <div className="dept-modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                <button className="dept-btn-cancel-modal" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#475569' }}>Cancel</button>
                <button className="dept-btn-delete-modal" onClick={handleDelete} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={14} /> Deactivate</button>
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
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default DepartmentCreation;
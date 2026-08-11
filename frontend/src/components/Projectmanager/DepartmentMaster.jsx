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
  ChevronDown,
  Users,
  Factory,
  Briefcase,
  Building2
} from "lucide-react";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import AlertModal from "../AlertModal.jsx";
import { getScreenPermission } from "../../utils/permissions";
import "../../styles/DepartmentMaster.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

const DepartmentCreation = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('DEPARTMENT_CREATION');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setForm(prev => {
          if (!prev.code || /^DEPT-\d+$/i.test(prev.code)) {
            return { ...prev, code: generateDepartmentCode(mapped) };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
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
  const [isViewing, setIsViewing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [activeOverviewTab, setActiveOverviewTab] = useState(null);

  const getDepartmentEmployees = (deptId, deptName) => {
    if (!deptId && !deptName) return [];
    const normalizedDeptName = deptName ? String(deptName).trim().toLowerCase() : '';

    return employees.filter(e => {
      const eDeptId = e.deptId || e.department;
      if (eDeptId && Number(eDeptId) === Number(deptId)) return true;

      const eDeptNm = e.deptNm || e.departmentName || e.deptName || '';
      if (normalizedDeptName && eDeptNm && String(eDeptNm).trim().toLowerCase() === normalizedDeptName) return true;

      return false;
    });
  };

  const getDepartmentCompanies = (deptId, deptName) => {
    const deptEmps = getDepartmentEmployees(deptId, deptName);
    const coyIds = new Set();
    deptEmps.forEach(e => {
      const cId = e.coyId || e.companyId;
      if (cId) coyIds.add(Number(cId));
    });

    if (coyIds.size === 0) {
      return companies;
    }

    return companies.filter(c => coyIds.has(Number(c.coyId || c.id)));
  };

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/employees`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => setEmployees(data))
      .catch(err => console.error("Error fetching employees:", err));
    fetch(`${apiBaseUrl}/api/companies`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => setCompanies(data))
      .catch(err => console.error("Error fetching companies:", err));
  }, []);

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
  const [currentPage, setCurrentPage] = useState(1);
  const [formErrors, setFormErrors] = useState({});

  const validateField = (name, value) => {
    let error = "";
    if (name === "code") {
      if (!value || !value.trim()) {
        error = "Department Code is required.";
      } else if (/\s/.test(value)) {
        error = "Spaces are not allowed in Department Code.";
      } else if (value.length > 10) {
        error = "Department Code cannot exceed 10 characters.";
      }
    }
    setFormErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "code") {
      newValue = value.slice(0, 10);
      validateField("code", newValue);
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

  const handleReset = (dList = departments) => {
    setForm({ code: generateDepartmentCode(dList), name: "", description: "", status: "Active" });
    setFormErrors({});
    setIsViewing(false);
  };

  // Separate function to perform the actual save (API call)
  const performSave = async (payload) => {
    setLoading(true);
    try {
      let response;
      if (isEditing) {
        response = await fetch(`${apiBaseUrl}/api/departments/${editingId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${apiBaseUrl}/api/departments`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
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

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // 1. Department Code check
    if (!form.code.trim()) {
      triggerAlert("error", "Validation Error", "Department Code is required.");
      return;
    }
    if (/\s/.test(form.code)) {
      triggerAlert("error", "Validation Error", "Spaces are not allowed in Department Code.");
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

    // Check duplicate code (exact match, case-insensitive)
    const isDuplicateCode = departments.some(
      (dept) => dept.code && dept.code.toUpperCase() === codeToCheck && (!isEditing || dept.id !== editingId)
    );

    if (isDuplicateCode) {
      setAlertConfig({
        isOpen: true,
        type: "warning",
        title: "Already Exists",
        message: "Department code already exists.",
        confirmText: "OK",
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          handleReset();
        }
      });
      return;
    }

    const nameToCheck = form.name.trim().toLowerCase();
    // Check for exact duplicate name (case-insensitive)
    const isExactDuplicateName = departments.some(
      (dept) => {
        if (!dept.name) return false;
        const existingName = dept.name.toLowerCase().trim();
        if (isEditing && dept.id === editingId) return false;
        return existingName === nameToCheck;
      }
    );

    if (isExactDuplicateName) {
      setAlertConfig({
        isOpen: true,
        type: "warning",
        title: "Already Exists",
        message: "Department name already exists.",
        confirmText: "OK",
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          handleReset();
        }
      });
      return;
    }

    // Check for partial match (one contains the other) – ask for confirmation
    const isPartialMatch = departments.some(
      (dept) => {
        if (!dept.name) return false;
        const existingName = dept.name.toLowerCase().trim();
        if (isEditing && dept.id === editingId) return false;
        // Exact match already handled, so only check containment
        if (existingName.includes(nameToCheck) || nameToCheck.includes(existingName)) {
          return true;
        }
        return false;
      }
    );

    const deptPayload = {
      deptCode: codeToCheck,
      deptNm: form.name.trim(),
      descr: form.description.trim(),
      sts: form.status === "Active"
    };

    if (isPartialMatch) {
      // Show confirmation dialog
      setAlertConfig({
        isOpen: true,
        type: "warning",
        title: "Similar Name Found",
        message: "A department with a similar name already exists. Do you want to continue?",
        confirmText: "OK",
        cancelText: "Cancel",
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          performSave(deptPayload);
        },
        onCancel: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    // No duplicate, proceed with save
    performSave(deptPayload);
  };

  const handleEdit = (dept) => {
    setForm({ code: dept.code, name: dept.name, description: dept.description || "", status: dept.status });
    setIsEditing(true);
    setIsViewing(false);
    setEditingId(dept.id);
    setActiveDropdown(null);
    setView("form");
  };

  const handleView = (dept) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setForm({ code: dept.code, name: dept.name, description: dept.description || "", status: dept.status });
    setIsEditing(false);
    setIsViewing(true);
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
      triggerAlert("success", "Success", "Department deleted successfully!");
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
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 220; // threshold height (220px) so lower rows open upside

    setDropdownPos({
      isTop: spaceBelow < dropdownHeight && spaceAbove > spaceBelow,
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

  const sortedDepartments = [...departments].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  let filteredItems = sortedDepartments;
  if (tableSearchQuery) {
    const q = tableSearchQuery.toLowerCase();
    filteredItems = sortedDepartments.filter(dept => 
      (dept.code || "").toLowerCase().includes(q) ||
      (dept.name || "").toLowerCase().includes(q)
    );
  }

  // Pagination logic
  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredItems.length / recordsPerPage);

  return (
    <div className="dept-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="dept-shell">
        <Header
          title="Department Creation"
          showSearch={false}
          userName="Syed Mohammad Johny Basha"
          userRole="Web Developer"
          initials="SB"
        />

        <main className="dept-main" style={{ padding: '24px' }}>
          {view === "form" ? (
            <div className="dept-content" style={{ paddingBottom: '80px', width: '100%', maxWidth: 'none' }}>
              <div className="dept-form-card" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                {/* Form Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                        {isViewing ? "View Department" : isEditing ? "Edit Department" : "Add New Department"}
                      </h2>
                      <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
                        {isViewing ? "View department details below" : "Enter department details in the form below"}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                      <button type="button" className="dept-nav-view-btn" onClick={() => { handleReset(); setIsEditing(false); setIsViewing(false); setView("list"); }}>
                        <ArrowLeft size={15} /> Back to Department List
                      </button>
                    </div>
                  </div>
                </div>

                {isViewing ? (
                  <div style={{ padding: '24px' }}>
                    {/* Department Overview Section */}
                    <div style={{ 
                      marginBottom: '32px', 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '12px', 
                      padding: '24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase size={18} style={{ color: '#ea580c' }} />
                        Department Overview
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', marginTop: 0 }}>
                        Click on any card below to view its corresponding list details.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        {/* Card 1: Employees */}
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
                            {getDepartmentEmployees(editingId, form.name).length}
                          </strong>
                        </div>
                        {/* Card 2: Companies */}
                        <div 
                          onClick={() => setActiveOverviewTab(activeOverviewTab === 'companies' ? null : 'companies')}
                          style={{ 
                            background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', 
                            border: activeOverviewTab === 'companies' ? '2px solid #0d9488' : '1px solid #99f6e4', 
                            borderRadius: '12px', 
                            padding: '20px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            position: 'relative', 
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transform: activeOverviewTab === 'companies' ? 'scale(1.02)' : 'none',
                            boxShadow: activeOverviewTab === 'companies' ? '0 4px 12px rgba(13,148,136,0.15)' : 'none'
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Companies</span>
                          <strong style={{ fontSize: '28px', color: '#115e59', marginTop: '8px', zIndex: 1 }}>
                            {getDepartmentCompanies(editingId, form.name).length}
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
                            {activeOverviewTab === 'employees' && <Users size={16} style={{ color: '#7c3aed' }} />}
                            {activeOverviewTab === 'companies' && <Building2 size={16} style={{ color: '#0d9488' }} />}
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
                              {activeOverviewTab === 'employees' && (
                                <tr>
                                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>S.NO</th>
                                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Employee Code</th>
                                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Employee Name</th>
                                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Designation</th>
                                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Email</th>
                                </tr>
                              )}
                              {activeOverviewTab === 'companies' && (
                                <tr>
                                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>S.NO</th>
                                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Company Code</th>
                                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>Company Name</th>
                                  <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: '700' }}>CIN Number</th>
                                </tr>
                              )}
                            </thead>
                            <tbody>
                              {activeOverviewTab === 'employees' && (
                                getDepartmentEmployees(editingId, form.name).length > 0 ? (
                                  getDepartmentEmployees(editingId, form.name).map((e, idx) => (
                                    <tr key={e.empId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#7c3aed' }}>{e.empCode || e.employeeCode || 'N/A'}</td>
                                      <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{e.fstNm || e.firstName} {e.lstNm || e.lastName}</td>
                                      <td style={{ padding: '10px 12px', color: '#475569' }}>{e.designation || e.role || 'N/A'}</td>
                                      <td style={{ padding: '10px 12px', color: '#2563eb' }}>{e.email || 'N/A'}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No employees found for this department.</td></tr>
                                )
                              )}
                              {activeOverviewTab === 'companies' && (
                                getDepartmentCompanies(editingId, form.name).length > 0 ? (
                                  getDepartmentCompanies(editingId, form.name).map((c, idx) => (
                                    <tr key={c.coyId || c.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0d9488' }}>{c.coyCd || c.companyCode || 'N/A'}</td>
                                      <td style={{ padding: '10px 12px', fontWeight: '500', color: '#0f172a' }}>{c.coyNm || c.companyName || 'N/A'}</td>
                                      <td style={{ padding: '10px 12px', color: '#475569' }}>{c.cin || c.cinNo || c.cinNumber || 'N/A'}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No companies found.</td></tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                      Department Details
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Department Code :</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.code || '-'}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Department Name :</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.name || '-'}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Description :</span>
                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{form.description || '-'}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 0', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Status :</span>
                        <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', width: 'fit-content', backgroundColor: form.status === 'Active' ? '#dcfce7' : '#fee2e2', color: form.status === 'Active' ? '#166534' : '#991b1b' }}>{form.status}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Form Body */}
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
                              <input type="text" name="code" value={form.code} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} placeholder="Auto-generated code" required />
                            </div>
                            {formErrors.code ? (
                              <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{formErrors.code}</span>
                            ) : (
                              <div className="dept-input-helper-text" style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Department code must be unique.</div>
                            )}
                          </div>

                          {/* Department Name Input */}
                          <div className="dept-form-item" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                            <label>Department Name <span className="dept-req-star">*</span></label>
                            <div className="dept-input-icon-wrap">
                              <span className="dept-input-prefix-icon"><Building size={16} /></span>
                              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Enter department name" maxLength="100" required />
                            </div>
                          </div>

                        </div>

                        {/* Description Input */}
                        <div className="dept-form-item">
                          <label>Description (Optional)</label>
                          <div className="dept-input-icon-wrap">
                            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Enter description (optional)" maxLength="255" rows={4} style={{ paddingLeft: '14px' }} />
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Status Toggle */}
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
                  </>
                )}

                {/* Form Footer Buttons */}
                {!isViewing && (
                  <div className="dept-form-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', backgroundColor: '#fafbfc', borderTop: '1px solid #e2e8f0' }}>
                    <button type="button" className="dept-btn primary" onClick={handleSave}><Save size={14} /> {isEditing ? "Update Department" : "Save Department"}</button>
                    <button type="button" className="dept-btn secondary" onClick={() => { handleReset(); setIsEditing(false); setIsViewing(false); setView("list"); }}>Cancel</button>
                  </div>
                )}
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
                        onChange={(e) => {
                          setTableSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{ padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '250px' }}
                      />
                    </div>
                    {screenPerm.canCreate && (
                      <button type="button" className="dept-btn-add-new" onClick={() => { handleReset(); setIsEditing(false); setIsViewing(false); setView("form"); }}>
                        <Plus size={16} /> Add New Department
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Table */}
                <div className="dept-table-container" style={{ overflowX: 'auto' }}>
                  <table className="dept-list-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ width: "50px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>S.NO</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department Code</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department Name</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                        <th style={{ padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                        <th style={{ textAlign: "center", width: "100px", padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                              Loading departments...
                            </div>
                          </td>
                        </tr>
                      ) : currentItems.length > 0 ? (
                        currentItems.map((dept, index) => (
                          <tr key={dept.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td data-label="S.NO" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{index + 1}</td>
                            <td data-label="DEPARTMENT CODE" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>{dept.code}</span></td>
                            <td data-label="DEPARTMENT NAME" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><strong>{dept.name}</strong></td>
                            <td data-label="DESCRIPTION" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{dept.description || "N/A"}</td>
                            <td data-label="STATUS" style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'inline-block', backgroundColor: dept.status === 'Active' ? '#dcfce7' : '#fee2e2', color: dept.status === 'Active' ? '#166534' : '#991b1b' }}>{dept.status}</span></td>
                            <td data-label="ACTIONS" style={{ position: "relative", padding: '14px 16px', textAlign: 'center' }}>
                              <button id={`action-btn-${dept.id}`} type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }} onClick={(e) => toggleDropdown(e, dept.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <MoreVertical size={18} />
                              </button>
                              {activeDropdown === dept.id && (
                                <>
                                  <div className="dept-actions-dropdown-backdrop" onClick={() => setActiveDropdown(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />
                                  <div className="dept-actions-dropdown-menu" style={{ position: 'fixed', right: `${dropdownPos.right}px`, top: dropdownPos.isTop ? 'auto' : `${dropdownPos.bottom}px`, bottom: dropdownPos.isTop ? `${window.innerHeight - dropdownPos.top}px` : 'auto', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 99, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                    <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleView(dept)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Eye size={15} /> View </button>
                                    {screenPerm.canEdit && (
                                      <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleEdit(dept)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Edit size={15} /> Edit </button>
                                    )}
                                    {screenPerm.canDelete && (
                                      <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ef4444', borderRadius: '4px', margin: '2px 4px' }} onClick={() => confirmDelete(dept.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Trash2 size={15} /> Delete </button>
                                    )}
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
                      Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredItems.length)} of {filteredItems.length} entries
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

        {/* Confirmation Modal */}
        {showModal && (
          <div className="dept-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="dept-modal" style={{ backgroundColor: 'white', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              <div className="dept-modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Confirm Delete</h3>
                <button className="dept-modal-close" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="dept-modal-body" style={{ padding: '20px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '14px' }}>Are you sure you want to delete this department?</p>
                <p className="dept-modal-warning" style={{ margin: 0, color: '#ef4444', fontSize: '13px', fontWeight: '500' }}></p>
              </div>
              <div className="dept-modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                <button className="dept-btn-cancel-modal" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#475569' }}>Cancel</button>
                <button className="dept-btn-delete-modal" onClick={handleDelete} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={14} /> Delete</button>
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

export default DepartmentCreation;
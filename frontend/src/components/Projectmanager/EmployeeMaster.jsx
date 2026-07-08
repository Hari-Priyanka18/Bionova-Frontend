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
  FileText
} from "lucide-react";
import Sidebar from "../Sidebar";
import Header from "../Header";
import AlertModal from "../AlertModal";
import "../../styles/EmployeeMaster.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

const SearchableSelect = ({ options, value, onChange, placeholder, name, style, disabled, allowCustom }) => {
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
        </div>
      )}
    </div>
  );
};

const EmployeeCreation = ({ userRole, onLogout }) => {
  // API States
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);

  // Views & UI States
  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [tableSearchQuery, setTableSearchQuery] = useState("");

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
    status: "Active"
  });

  // Designation Modal State
  const [showDesigModal, setShowDesigModal] = useState(false);
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

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [empRes, coyRes, pltRes, deptRes, desigRes, mapRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/employees`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/companies`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/plants`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/departments`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/designations`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/dept-coy-plt-maps`, { headers: getAuthHeaders() })
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
            gender: displayGender,
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
            workingFor: emp.pltId ? "plant" : "company"  // <-- NEW: determine workingFor
          };
        });
        setEmployees(mappedEmps);
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
      } else if (!emailVal.includes("@")) {
        error = "Email must contain @.";
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
    }
    return error;
  };

  // Handle Input Change for Employee Form
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Check if user clicked "+ Create Department"
    if (name === "department" && value === "CREATE_NEW") {
      setShowDeptModal(true);
      setForm((prev) => ({ ...prev, department: "" }));
      return;
    }
    // Check if user clicked "+ Create Designation"
    if (name === "designation" && value === "CREATE_NEW") {
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

  // Save New Designation from Modal
  const handleSaveNewDesignation = async () => {
    if (!desigForm.code.trim() || !desigForm.name.trim()) {
      triggerAlert("error", "Validation Error", "Designation code and name are required.");
      return;
    }

    const payload = {
      desigCd: desigForm.code.trim().toUpperCase(),
      desigNm: desigForm.name.trim(),
      desigDesc: desigForm.description.trim()
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/designations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const newDesig = await response.json();
        triggerAlert("success", "Success", "Designation created successfully!");
        setDesigForm({ code: "", name: "", description: "" });
        setShowDesigModal(false);
        const desigRes = await fetch(`${apiBaseUrl}/api/designations`, { headers: getAuthHeaders() });
        if (desigRes.ok) {
          setDesignations(await desigRes.json());
        }
        setForm((prev) => ({ ...prev, designation: newDesig.desigNm }));
      } else {
        triggerAlert("error", "Error", "Failed to save designation.");
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
      sts: deptForm.status === "Active"
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
        setDeptForm({ code: "", name: "", description: "", status: "Active" });
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
  const handleReset = () => {
    setForm({
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
    setFormErrors({});
    setPhoto(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Save / Submit Employee
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    // 1. Employee Code check
    if (!form.employeeCode.trim()) {
      triggerAlert("error", "Validation Error", "Employee Code is required.");
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

    // 3. Last Name check
    if (!form.lastName.trim()) {
      triggerAlert("error", "Validation Error", "Last Name is required.");
      return;
    }
    if (form.lastName.length > 50) {
      triggerAlert("error", "Validation Error", "Last Name cannot exceed 50 characters.");
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
    if (!emailVal.includes("@")) {
      triggerAlert("error", "Validation Error", "Please enter a valid Employee Email address (must contain @).");
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

    let genderVal = "MALE";
    if (form.gender.toUpperCase() === "FEMALE") {
      genderVal = "FEMALE";
    } else if (form.gender.toUpperCase() === "OTHERS" || form.gender.toUpperCase() === "OTHER") {
      genderVal = "OTHER";
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
        triggerAlert("success", "Success", isEditing ? "Employee updated successfully!" : "Employee created successfully!");
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
      gender: emp.gender ? (emp.gender.charAt(0) + emp.gender.slice(1).toLowerCase()) : "",
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

    setPhoto(emp.photoUrl && emp.photoUrl.startsWith("data:") ? emp.photoUrl : (emp.photoPath && emp.photoPath.startsWith("data:") ? emp.photoPath : null));
    setFormErrors({});
    setIsEditing(true);
    setEditId(emp.empId || emp.id);
    setView("form");
    setActiveActionsMenu(null);
  };

  const handleDelete = (empId) => {
    setAlertConfig({
      isOpen: true,
      type: "warning",
      title: "Confirm Delete",
      message: "Are you sure you want to delete this employee? This action cannot be undone.",
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
    let genderVal = "MALE";
    if (emp.gender) {
      const g = emp.gender.toUpperCase();
      if (g === "FEMALE") genderVal = "FEMALE";
      else if (g === "OTHERS" || g === "OTHER") genderVal = "OTHER";
    }

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
      gender: genderVal,
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
  const filteredEmployees = tableSearchQuery
    ? employees.filter(emp =>
      (emp.employeeCode && emp.employeeCode.toLowerCase().includes(tableSearchQuery.toLowerCase())) ||
      (emp.employeeName && emp.employeeName.toLowerCase().includes(tableSearchQuery.toLowerCase())) ||
      (emp.email && emp.email.toLowerCase().includes(tableSearchQuery.toLowerCase())) ||
      (emp.designation && emp.designation.toLowerCase().includes(tableSearchQuery.toLowerCase()))
    )
    : employees;

  return (
    <div className="emp-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="emp-shell">
        <Header
          title="Employee Master"
          showSearch={false}
          userName="Syed Mohammad Johny Basha"
          userRole="Web Developer"
          initials="SB"
        />

        <main className="emp-main" style={{ padding: '24px', position: 'relative' }}>

          {view === "form" ? (
            /* ================= VIEW: ADD NEW EMPLOYEE FORM ================= */
            <div className="emp-content" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto' }}>

              <div className="emp-form-card" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                    {isEditing ? "Edit Employee" : "Add New Employee"}
                  </h2>
                  <button type="button" className="emp-nav-view-btn" onClick={() => {
                    setView("list"); handleReset(); setIsEditing(false); setEditId(null);
                  }}>
                    <ArrowLeft size={15} /> Back to Employee List
                  </button>
                </div>

                <div style={{ padding: '24px' }}>
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
                          <input type="text" name="employeeCode" value={form.employeeCode} onChange={handleChange} placeholder="Enter employee code" maxLength="10" required />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>First Name <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><User size={16} /></span>
                          <input type="text" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Enter first name" maxLength="50" required />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Last Name <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><User size={16} /></span>
                          <input type="text" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Enter last name" maxLength="50" required />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Gender <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <SearchableSelect
                            name="gender"
                            value={form.gender}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })}
                            placeholder="Select gender"
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
                          <span className="emp-input-prefix-icon"><Calendar size={16} /></span>
                          <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} required />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Email <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Mail size={16} /></span>
                          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter email id" maxLength="50" required />
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
                        {/* PHOTO SECTION – upload button on left, preview on right with equal height to Address textarea and correct alignment */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', height: '96px' }}>
                          <input id="empPhotoUpload" type="file" accept="image/*" onChange={handlePhotoChange} hidden />
                          <button type="button" className="emp-photo-row-upload-btn" onClick={() => document.getElementById("empPhotoUpload").click()} style={{ padding: '0 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155', flexShrink: 0, height: '38px' }}>
                            <Upload size={14} /> Upload File instead
                          </button>
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
                          <span className="emp-input-prefix-icon"><Calendar size={16} /></span>
                          <input type="date" name="joiningDate" value={form.joiningDate} onChange={handleChange} required />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Designation <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Briefcase size={16} /></span>
                          <SearchableSelect 
                            name="designation" 
                            value={form.designation} 
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })} 
                            placeholder="Select designation"
                            options={[
                              ...[...new Set([...designations.map(d => d.desigNm).filter(Boolean), ...employees.map(emp => emp.designation).filter(Boolean)])]
                                .map(d => ({ value: d, label: d }))
                                .sort((a, b) => a.label.localeCompare(b.label)),
                              { value: "CREATE_NEW", label: "+ Create Designation" }
                            ]}
                          />
                        </div>
                      </div>
                      <div className="emp-form-item">
                        <label>Employee Type <span className="emp-req-star">*</span></label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><Briefcase size={16} /></span>
                          <SearchableSelect
                            name="employmentType"
                            value={form.employmentType}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })}
                            placeholder="Select employment type"
                            options={[
                              { value: "Retainer", label: "Retainer" },
                              { value: "Full Time Employee (FTE)", label: "Full Time Employee (FTE)" },
                              { value: "Contract Employee", label: "Contract Employee" }
                            ]}
                          />
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
                                .map(dept => ({ value: dept.deptId || dept.id, label: dept.deptNm || dept.name })),
                              { value: "CREATE_NEW", label: "+ Create Department" }
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
                        <label>Reporting Manager</label>
                        <div className="emp-input-icon-wrap">
                          <span className="emp-input-prefix-icon"><User size={16} /></span>
                          <SearchableSelect
                            name="reportingManager"
                            value={form.reportingManager}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value } })}
                            placeholder="Select reporting manager"
                            options={employees.map(emp => ({ value: emp.empId || emp.id, label: emp.employeeName || `${emp.firstName} ${emp.lastName}` }))}
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
                          <input type="email" name="username" value={form.username} onChange={handleChange} placeholder="Enter email id" maxLength="50" required />
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
                            <option value="">Select status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="emp-form-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', backgroundColor: '#fafbfc', borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" className="emp-btn primary" onClick={handleSave}>
                    <Save size={14} /> {isEditing ? "Update Employee" : "Save Employee"}
                  </button>
                  <button type="button" className="emp-btn tertiary" onClick={handleReset}>
                    <RefreshCcw size={14} /> Reset
                  </button>
                  <button type="button" className="emp-btn secondary" onClick={() => { setView("list"); handleReset(); setIsEditing(false); setEditId(null); }}>
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
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search employees..."
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        style={{ padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '250px' }}
                      />
                    </div>
                    <button type="button" className="emp-btn-add-new" onClick={() => { handleReset(); setIsEditing(false); setView("form"); }}>
                      <Plus size={16} /> Add New Employee
                    </button>
                  </div>
                </div>

                <div className="emp-table-container" style={{ overflowX: 'auto', paddingBottom: '140px' }}>
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
                      {filteredEmployees.length === 0 ? (
                        <tr><td colSpan="19" style={{ textAlign: "center", padding: "60px 20px", color: '#64748b', fontSize: '14px' }}>No employee records found. Add a new employee using the button above.</td></tr>
                      ) : (
                        filteredEmployees.map((emp, index) => (
                          <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{index + 1}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}><span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px' }}>{emp.employeeCode}</span></td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {emp.photoPath ? (<img src={emp.photoPath} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />) : (<div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: '#475569' }}>{emp.employeeName ? emp.employeeName.charAt(0) : ''}</div>)}
                                <strong>{emp.employeeName}</strong>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.gender}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.dateOfBirth}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.email}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.mobile}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.bloodGroup || "-"}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={emp.address}>{emp.address}</td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{emp.joiningDate}</td>
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
                              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px 8px', borderRadius: '4px' }} onClick={() => setActiveActionsMenu(activeActionsMenu === emp.id ? null : emp.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <MoreVertical size={18} />
                              </button>
                              {activeActionsMenu === emp.id && (
                                <>
                                  <div className="emp-actions-dropdown-backdrop" onClick={() => setActiveActionsMenu(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} />
                                  <div className="emp-actions-dropdown-menu" style={{ position: 'absolute', right: '30px', top: '8px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, display: 'flex', flexDirection: 'column', padding: '4px 0', minWidth: '140px' }}>
                                    <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => { triggerAlert("info", "Employee Details", `Employee Details:\nName: ${emp.employeeName}\nCode: ${emp.employeeCode}\nDepartment: ${emp.department}\nEmployment Type: ${emp.employmentType || "N/A"}\nLocation: ${emp.workLocation || "N/A"}`); setActiveActionsMenu(null); }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Eye size={15} /> View </button>
                                    <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleEdit(emp)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Edit size={15} /> Edit </button>
                                    <button type="button" style={{ padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ef4444', borderRadius: '4px', margin: '2px 4px' }} onClick={() => handleDelete(emp.id)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}> <Trash2 size={15} /> Delete </button>
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
                      <input type="text" name="code" value={deptForm.code} onChange={handleDeptChange} placeholder="Enter department code" required />
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
                      <input type="text" name="code" value={desigForm.code} onChange={handleDesigChange} placeholder="Enter designation code" required />
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
                  <button type="button" onClick={() => { setShowDesigModal(false); setForm(p => ({ ...p, designation: "" })); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontWeight: '500' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveNewDesignation} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={14} /> Save Designation
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
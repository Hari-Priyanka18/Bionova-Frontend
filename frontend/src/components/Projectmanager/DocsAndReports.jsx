import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar.jsx";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Eye,
  Download,
  History,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Folder,
  RefreshCw,
  TrendingUp,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User,
  Layers,
  Calendar as CalendarIcon,
  X,
  Database,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Edit2,
  Bell,
  Menu
} from "lucide-react";
import "../../styles/DocsAndReports.css";
import plantImage from "../../assets/cbg_plant_construction.png";
import Header from "../Header";
import AlertModal from "../AlertModal";

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";

const authHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem("authToken") || ""}`,
  "Content-Type": "application/json",
});

// Document Categories Mapping (UI labels only – no mock counts)
const CATEGORIES = [
  { name: "All Documents", key: "All Documents" },
  { name: "Project Charter", key: "Governance" },
  { name: "Drawings", key: "Drawings" },
  { name: "BOQ & Estimates", key: "BOQ & Estimates" },
  { name: "Contracts", key: "Contracts" },
  { name: "Approvals", key: "Approvals" },
  { name: "Technical Specifications", key: "Technical Specifications" },
  { name: "Safety Documents", key: "Safety" },
  { name: "Progress Reports", key: "Progress Reports" },
  { name: "Risk Reports", key: "Risk Reports" },
  { name: "Closure Documents", key: "Closure Documents" }
];

// System‑defined report types (used for generation simulation)
const REPORTS = [
  "Project Summary Report",
  "Project Progress Report",
  "Milestone Report",
  "Task Status Report",
  "Employee Workload Report",
  "Risk & Issues Report",
  "Budget Utilization Report",
  "Forecast vs Actual Report"
];

const DocsAndReports = ({ userRole, onLogout, isTab = false, project }) => {
  const navigate = useNavigate();

  // ---- State ----
  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & UI state
  const [selectedCategoryTab, setSelectedCategoryTab] = useState("All Documents");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterType, setFilterType] = useState("All Types");
  const [filterUser, setFilterUser] = useState("All Users");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("01-May-2025 ~ 30-Jun-2025"); // static UI placeholder
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGeneratingModal, setShowGeneratingModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeActionsMenuId, setActiveActionsMenuId] = useState(null);
  const [generatingReportName, setGeneratingReportName] = useState("");

  // Form states for upload
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Governance");
  const [uploadVersion, setUploadVersion] = useState("V1.0");
  const [uploadSize, setUploadSize] = useState("1.5 MB");
  const [uploadUploadedBy, setUploadUploadedBy] = useState("Ravi Kumar");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadStatus, setUploadStatus] = useState("Approved");

  // Form states for edit
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Alert modal
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "",
    cancelText: ""
  });

  const triggerAlert = (type, title, message, onConfirm = null, confirmText = "", cancelText = "") => {
    setAlertConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  // ---- Helper functions ----
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}-${month}-${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  };

  const getMockSize = (fileId, fileName) => {
    if (!fileId) return "1.2 MB";
    const seed = fileId * (fileName ? fileName.length : 10);
    const sizeKb = (seed * 347) % 9500 + 120; 
    if (sizeKb > 1024) {
      return `${(sizeKb / 1024).toFixed(1)} MB`;
    }
    return `${sizeKb} KB`;
  };

  const getFileTypeDisplayName = (type) => {
    const t = type.toLowerCase();
    if (t === "pdf") return "PDF";
    if (t === "xlsx" || t === "xls") return "Excel/XLSX";
    if (t === "docx" || t === "doc") return "Word/DOCX";
    if (t === "dwg") return "AutoCAD/DWG";
    return type.toUpperCase();
  };

  const renderFileTypeIcon = (type) => {
    const t = type.toLowerCase();
    let displayType = t;
    if (t === "xlsx" || t === "xls") displayType = "XLSX";
    else if (t === "docx" || t === "doc") displayType = "DOCX";
    else displayType = t.toUpperCase();
    
    let className = "dr-type-icon other";
    if (t === "pdf") className = "dr-type-icon pdf";
    else if (t === "xlsx" || t === "xls") className = "dr-type-icon xlsx";
    else if (t === "docx" || t === "doc") className = "dr-type-icon docx";
    else if (t === "dwg") className = "dr-type-icon dwg";

    return <div className={className}>{displayType}</div>;
  };

  // ---- Data fetching functions ----
  const fetchDocuments = async () => {
    const prjId = project?.prjId || project?.id;
    if (!prjId) return;
    try {
      const res = await fetch(`${API_BASE}/attachments/project/${prjId}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map(att => ({
          id: `DOC-${att.fileId}`,
          name: att.fileNm,
          category: "Project Document", // default; can be improved if category stored
          type: (att.fileNm.split('.').pop() || "unknown").toLowerCase(),
          version: "V1.0",
          uploadedBy: att.createdBy || "System",
          uploadedOn: att.dateTimestamp,
          status: "Approved", // default; could be extended
          size: att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : getMockSize(att.fileId, att.fileNm),
          description: att.description || "",
          url: att.atPath
        }));
        setDocuments(mapped);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const fetchActivities = async () => {
    const prjId = project?.prjId || project?.id;
    if (!prjId) return;
    try {
      // Fetch all logs
      const res = await fetch(`${API_BASE}/activity-logs`, { headers: authHeaders() });
      if (!res.ok) return;
      const allLogs = await res.json();

      // Get milestone IDs for this project (to filter milestone logs)
      const isDraft = project?.status === "DRAFT" || project?.status === "Draft";
      const mlUrl = isDraft
        ? `${API_BASE}/milestone-drafts/by-project/${prjId}`
        : `${API_BASE}/milestone-live/by-project/${prjId}`;
      const mlRes = await fetch(mlUrl, { headers: authHeaders() });
      const mlData = mlRes.ok ? await mlRes.json() : [];
      const milestoneIds = mlData.map(m => m.id || m.drftMId || m.drft_m_id || m.mId);

      // Filter logs relevant to this project
      const relevantLogs = allLogs.filter(log => {
        if (log.entityTyp === 'PROJECT' && String(log.entityId) === String(prjId)) return true;
        if (log.entityTyp === 'MILESTONE' && milestoneIds.includes(Number(log.entityId))) return true;
        return false;
      });

      // Map to activity format (similar to change logs)
      const mapped = relevantLogs.map(log => ({
        id: `ACT-${log.logId || Date.now()}`,
        user: log.createdBy || log.modifiedBy || "System",
        action: log.statusFrom ? `changed status from ${log.statusFrom} to ${log.statusTo}` : (log.fieldName ? `updated ${log.fieldName}` : "modified"),
        item: log.entityTyp === 'PROJECT' ? project?.projectCode || 'Project' : `Milestone ${log.entityId}`,
        timestamp: log.logDt,
        type: log.statusFrom ? 'update' : 'upload' // not exact but fine
      }));
      setActivities(mapped);
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchDocuments(), fetchActivities()]);
    setLoading(false);
  };

  // ---- Effects ----
  useEffect(() => {
    if (project?.id || project?.prjId) {
      refreshData();
    }
  }, [project]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterType, filterUser, searchQuery]);

  // Sync category tab with filter dropdown
  useEffect(() => {
    if (selectedCategoryTab !== "All Documents") {
      setFilterCategory(selectedCategoryTab);
    } else {
      setFilterCategory("All Categories");
    }
    setCurrentPage(1);
  }, [selectedCategoryTab]);

  // ---- Derived data ----
  // Unique categories, types, users from actual documents
  const presentCategories = Array.from(new Set(documents.map(d => d.category))).filter(Boolean).sort();
  const presentTypes = Array.from(new Set(documents.map(d => d.type.toLowerCase()))).filter(Boolean).sort();
  const presentUsers = Array.from(new Set(documents.map(d => d.uploadedBy))).filter(Boolean).sort();

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchCategory = filterCategory === "All Categories" || doc.category === filterCategory;
    const matchType = filterType === "All Types" || doc.type.toLowerCase() === filterType.toLowerCase();
    const matchUser = filterUser === "All Users" || doc.uploadedBy === filterUser;
    const matchSearch = !searchQuery || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchType && matchUser && matchSearch;
  });

  // Stats (still needed for counts but not displayed in cards)
  const totalCount = documents.length;
  const drawingsCount = documents.filter(d => d.category === "Drawings").length;
  const reportsCount = documents.filter(d => 
    d.category === "Progress Reports" || 
    d.category === "Risk Reports" || 
    d.name.toLowerCase().includes("report")
  ).length;
  const pendingApprovalsCount = documents.filter(d => d.status === "Under Review").length;

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);

  // ---- Event handlers ----
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadName.trim()) {
      triggerAlert("warning", "Required", "Please enter a document title.");
      return;
    }
    if (!selectedFile) {
      triggerAlert("warning", "File Required", "Please select a file to upload.");
      return;
    }

    const prjId = project?.prjId || project?.id;
    if (!prjId) {
      triggerAlert("error", "Error", "Project ID not found.");
      return;
    }

    try {
      // 1. Upload file to storage
      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadRes = await fetch(`${API_BASE}/storage/upload/attachment/project`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("authToken") || ""}` },
        body: formData
      });
      if (!uploadRes.ok) {
        const errMsg = await uploadRes.text();
        throw new Error(errMsg || "Failed to upload file.");
      }
      const uploadData = await uploadRes.json();
      const finalPath = uploadData.url;

      // 2. Save attachment metadata
      const attRes = await fetch(`${API_BASE}/attachments/project/${prjId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          fileNm: uploadName,
          atPath: finalPath,
          atType: "UPLOAD",
          description: uploadDescription || ""
        })
      });
      if (!attRes.ok) {
        const errMsg = await attRes.text();
        throw new Error(errMsg || "Failed to save attachment metadata.");
      }

      triggerAlert("success", "Success", "Document uploaded successfully.");
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadName("");
      setUploadDescription("");
      refreshData(); // refresh list
    } catch (err) {
      console.error(err);
      triggerAlert("error", "Upload Failed", err.message || "An error occurred during upload.");
    }
  };

  const handleDeleteDoc = (id, name) => {
    const fileId = parseInt(id.replace("DOC-", ""), 10);
    triggerAlert(
      "warning",
      "Confirm Delete",
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`${API_BASE}/attachments/${fileId}`, {
            method: "DELETE",
            headers: authHeaders()
          });
          if (res.ok) {
            triggerAlert("success", "Deleted", "Document deleted successfully.");
            refreshData();
          } else {
            const errMsg = await res.text();
            throw new Error(errMsg || "Failed to delete.");
          }
        } catch (err) {
          console.error(err);
          triggerAlert("error", "Delete Failed", err.message || "Failed to delete document.");
        }
      },
      "Delete",
      "Cancel"
    );
    setActiveActionsMenuId(null);
  };

  const openEditModal = (doc) => {
    setSelectedDoc(doc);
    setEditName(doc.name);
    setEditCategory(doc.category);
    setEditStatus(doc.status);
    setEditDescription(doc.description || "");
    setShowEditModal(true);
    setActiveActionsMenuId(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    // We need to update the backend. Since we don't have a dedicated update endpoint,
    // we can simulate by updating local state and maybe sending a PATCH if available.
    // For now, we'll update local state and log the change.
    setDocuments(prev => prev.map(d => {
      if (d.id === selectedDoc.id) {
        return {
          ...d,
          name: editName,
          category: editCategory,
          status: editStatus,
          description: editDescription
        };
      }
      return d;
    }));

    // Add activity locally (simulate backend update)
    const newAct = {
      id: `ACT-${Date.now()}`,
      user: sessionStorage.getItem("username") || "System",
      action: "updated metadata of",
      item: editName,
      timestamp: new Date().toISOString(),
      type: "update"
    };
    setActivities(prev => [newAct, ...prev]);

    triggerAlert("success", "Updated", `Document metadata updated successfully.`);
    setShowEditModal(false);
  };

  const handleGenerateReport = (reportName) => {
    setGeneratingReportName(reportName);
    setShowGeneratingModal(true);

    setTimeout(() => {
      setShowGeneratingModal(false);
      triggerAlert(
        "success",
        "Report Generated",
        `Report "${reportName}" has been generated and downloaded to your local device.`
      );

      // Add to activities
      const newAct = {
        id: `ACT-${Date.now()}`,
        user: sessionStorage.getItem("username") || "System",
        action: "generated",
        item: reportName,
        timestamp: new Date().toISOString(),
        type: "generate"
      };
      setActivities(prev => [newAct, ...prev]);

      // Add generated document to list (simulate)
      const nextNum = Math.max(...documents.map(d => parseInt(d.id.replace("DOC-", ""), 10)), 0) + 1;
      const newDoc = {
        id: `DOC-${String(nextNum).padStart(3, "0")}`,
        name: `${reportName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`,
        category: "Progress Reports",
        type: "pdf",
        version: "V1.0",
        uploadedBy: sessionStorage.getItem("username") || "System",
        uploadedOn: new Date().toISOString(),
        status: "Approved",
        size: "2.4 MB",
        description: `Auto-generated system report for ${reportName}`
      };
      setDocuments(prev => [newDoc, ...prev]);
    }, 1800);
  };

  // ---- Render ----
  return (
    <div className={isTab ? "dr-tab-mode-container" : "dr-shell-container"} style={isTab ? { width: '100%', background: 'transparent' } : {}}>
      {!isTab && <Sidebar onLogout={onLogout} />}

      <div className={isTab ? "" : "dr-shell"} style={isTab ? { width: '100%', marginLeft: 0 } : {}}>
        {!isTab && <Header title="Documents & Reports" showSearch={false} />}

        <main className={isTab ? "" : "dr-main"} style={isTab ? { padding: 0 } : {}}>
          {!isTab && (
            <>
              {/* Breadcrumbs */}
              <div className="dr-breadcrumbs">
                <span>Home</span>
                <ChevronRight size={14} />
                <span>Projects</span>
                <ChevronRight size={14} />
                <span>Project Details</span>
                <ChevronRight size={14} />
                <span className="active">Documents & Reports</span>
              </div>

              {/* Project Header Row - all dynamic from project prop */}
              <div className="dr-project-header-row">
                <div>
                  <div className="dr-header-title-row">
                    <h1 className="dr-header-title">{project?.name || project?.projectName || "Project"}</h1>
                    <span className={`dr-badge ${project?.status?.toLowerCase() === 'live' ? 'live' : 'draft'}`}>
                      {project?.status || "DRAFT"}
                    </span>
                  </div>
                </div>
                <div className="dr-header-actions">
                  <button className="dr-btn-white-header" onClick={() => navigate("/project-creation")}>
                    Edit Project
                  </button>
                  <button className="dr-btn-white-header">More</button>
                </div>
              </div>

              {/* Project Meta Information Cards */}
              <div className="dr-project-card">
                <div className="dr-project-grid">
                  <div className="dr-project-field">
                    <span className="dr-project-label">Project Code</span>
                    <span className="dr-project-value" title={project?.projectCode || "N/A"}>
                      {project?.projectCode || "N/A"}
                    </span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">Company</span>
                    <span className="dr-project-value" title={project?.companyName || "N/A"}>
                      {project?.companyName || "N/A"}
                    </span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">Plant</span>
                    <span className="dr-project-value" title={project?.plantName || "N/A"}>
                      {project?.plantName || "N/A"}
                    </span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">Project Manager</span>
                    <span className="dr-project-value" title={project?.createdBy || "N/A"}>
                      {project?.createdBy || "N/A"}
                    </span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">Start Date</span>
                    <span className="dr-project-value" title={project?.startDate || "N/A"}>
                      {project?.startDate || "N/A"}
                    </span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">End Date</span>
                    <span className="dr-project-value" title={project?.endDate || "N/A"}>
                      {project?.endDate || "N/A"}
                    </span>
                  </div>
                  <div className="dr-project-field dr-project-field-progress" style={{ minWidth: "140px" }}>
                    <span className="dr-project-label">Progress</span>
                    <div className="dr-progress-container">
                      <span className="dr-project-value">{project?.progress || 0}%</span>
                      <div className="dr-progress-bar-bg">
                        <div className="dr-progress-bar-fill" style={{ width: `${project?.progress || 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="dr-tab-navigation">
                <button className="dr-tab-btn" onClick={() => navigate("/pm-dashboard")}>Overview</button>
                <button className="dr-tab-btn" onClick={() => navigate("/milestone-creation")}>Milestones & Tasks</button>
                <button className="dr-tab-btn">Gantt Chart</button>
                <button className="dr-tab-btn active">Documents & Reports</button>
                <button className="dr-tab-btn">Risks & Issues</button>
                <button className="dr-tab-btn">Notes</button>
                <button className="dr-tab-btn">Team</button>
                <button className="dr-tab-btn">Budget & Expenses</button>
                <button className="dr-tab-btn">Change Logs</button>
              </div>
            </>
          )}

          {/* Stats Row Removed as requested */}

          {/* Main Two Column Repository Grid */}
          <div className="dr-main-grid">
            <div className="dr-repo-card">
              {/* Header row with Title, Search, and Upload */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 className="dr-repo-title" style={{ margin: 0, whiteSpace: 'nowrap' }}>Document Repository</h2>
                
                <div className="dr-search-box" style={{ flex: '1 1 200px', minWidth: '200px', margin: 0 }}>
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <button className="dr-btn-blue" onClick={() => setShowUploadModal(true)} style={{ whiteSpace: 'nowrap' }}>
                  Upload Document
                </button>
              </div>

              <div className="dr-table-container">
                <table className="dr-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Document Name</th>
                      <th>Category</th>
                      <th>Uploaded By</th>
                      <th>Uploaded On</th>
                      <th>Status</th>
                      <th>Size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length > 0 ? (
                      currentItems.map((doc) => (
                        <tr key={doc.id}>
                          <td data-label="Type">{renderFileTypeIcon(doc.type)}</td>
                          <td data-label="Document Name" style={{ fontWeight: '700', color: '#1e293b' }}>{doc.name}</td>
                          <td data-label="Category">{doc.category}</td>
                          <td data-label="Uploaded By">{doc.uploadedBy}</td>
                          <td data-label="Uploaded On" style={{ fontSize: '12px', color: '#64748b' }}>
                            {formatDateTime(doc.uploadedOn)}
                          </td>
                          <td data-label="Status">
                            <span className={`dr-status-badge ${doc.status === "Approved" ? "approved" : doc.status === "Under Review" ? "under-review" : "rejected"}`}>
                              {doc.status}
                            </span>
                          </td>
                          <td data-label="Size">{doc.size}</td>
                          <td data-label="Actions">
                            <div className="dr-actions-col" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                className="dr-action-btn"
                                title="Download"
                                onClick={() => {
                                  if (doc.url) {
                                    window.open(doc.url, "_blank");
                                  } else {
                                    triggerAlert("error", "Error", "Download URL is not available.");
                                  }
                                }}
                              >
                                <Download size={13} />
                              </button>
                              <button
                                className="dr-action-btn"
                                title="Delete"
                                onClick={() => handleDeleteDoc(doc.id, doc.name)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" style={{ textAlign: "center", color: "#64748b", padding: "30px" }}>
                          {loading ? "Loading documents..." : "No documents matched the selected filters."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredDocuments.length > 0 && (
                <div className="dr-table-footer">
                  <div className="dr-entries-info">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDocuments.length)} of {filteredDocuments.length} entries
                  </div>
                  <div className="dr-pagination">
                    <button
                      className="dr-page-btn"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        className={`dr-page-btn ${currentPage === i + 1 ? "active" : ""}`}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      className="dr-page-btn"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ====== UPLOAD DOCUMENT MODAL ====== */}
      {showUploadModal && (
        <div className="dr-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <form className="dr-modal" onClick={e => e.stopPropagation()} onSubmit={handleUploadSubmit}>
            <div className="dr-modal-header">
              <h3>Upload Document</h3>
              <button type="button" className="dr-modal-close-btn" onClick={() => setShowUploadModal(false)}><X size={18} /></button>
            </div>
            <div className="dr-modal-body">
              <div 
                className="dr-file-dropzone" 
                onClick={() => document.getElementById("drFileSelect").click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.backgroundColor = "#eff6ff";
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.backgroundColor = "transparent";
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    setSelectedFile(file);
                    setUploadName(file.name);
                    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
                    setUploadSize(`${sizeInMb} MB`);
                  }
                }}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <input 
                  type="file" 
                  id="drFileSelect" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setSelectedFile(file);
                      setUploadName(file.name);
                      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
                      setUploadSize(`${sizeInMb} MB`);
                    }
                  }}
                />
                <UploadCloud size={32} />
                <p>{uploadName ? `Selected: ${uploadName}` : "Drag and drop or click to upload"}</p>
                <span>Supports PDF, XLSX, DOCX, DWG up to 20MB</span>
              </div>

              <div className="dr-form-group" style={{ marginTop: "16px" }}>
                <label>Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mechanical Construction Drawings"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                />
              </div>
            </div>
            <div className="dr-modal-footer">
              <button type="button" className="dr-btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
              <button type="submit" className="dr-btn-primary">Upload Document</button>
            </div>
          </form>
        </div>
      )}

      {/* ====== VIEW DETAIL MODAL ====== */}
      {showDetailModal && selectedDoc && (
        <div className="dr-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="dr-modal" onClick={e => e.stopPropagation()}>
            <div className="dr-modal-header">
              <h3>Document Info: {selectedDoc.id}</h3>
              <button className="dr-modal-close-btn" onClick={() => setShowDetailModal(false)}><X size={18} /></button>
            </div>
            <div className="dr-modal-body">
              <div className="dr-detail-row">
                <span className="dr-detail-label">Name</span>
                <span className="dr-detail-value">{selectedDoc.name}</span>
              </div>
              <div className="dr-detail-row">
                <span className="dr-detail-label">Category</span>
                <span className="dr-detail-value">{selectedDoc.category}</span>
              </div>
              <div className="dr-form-row">
                <div className="dr-detail-row">
                  <span className="dr-detail-label">File Type</span>
                  <span className="dr-detail-value" style={{ textTransform: "uppercase" }}>{selectedDoc.type}</span>
                </div>
              </div>
              <div className="dr-form-row">
                <div className="dr-detail-row">
                  <span className="dr-detail-label">Uploaded By</span>
                  <span className="dr-detail-value">{selectedDoc.uploadedBy}</span>
                </div>
                <div className="dr-detail-row">
                  <span className="dr-detail-label">Uploaded On</span>
                  <span className="dr-detail-value">{formatDateTime(selectedDoc.uploadedOn)}</span>
                </div>
              </div>
              <div className="dr-form-row">
                <div className="dr-detail-row">
                  <span className="dr-detail-label">Size</span>
                  <span className="dr-detail-value">{selectedDoc.size}</span>
                </div>
                <div className="dr-detail-row">
                  <span className="dr-detail-label">Status</span>
                  <span className={`dr-status-badge ${selectedDoc.status === "Approved" ? "approved" : selectedDoc.status === "Under Review" ? "under-review" : "rejected"}`}>
                    {selectedDoc.status}
                  </span>
                </div>
              </div>
              {selectedDoc.description && (
                <div className="dr-detail-row">
                  <span className="dr-detail-label">Description</span>
                  <span className="dr-detail-value" style={{ fontWeight: 'normal', color: '#64748b' }}>{selectedDoc.description}</span>
                </div>
              )}
            </div>
            <div className="dr-modal-footer">
              <button className="dr-btn-secondary" onClick={() => {
                if (selectedDoc.url) {
                  window.open(selectedDoc.url, "_blank");
                } else {
                  alert("Download URL is not available.");
                }
                setShowDetailModal(false);
              }}>
                <Download size={14} /> Download File
              </button>
              <button className="dr-btn-primary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== EDIT META MODAL ====== */}
      {showEditModal && selectedDoc && (
        <div className="dr-modal-overlay" onClick={() => setShowEditModal(false)}>
          <form className="dr-modal" onClick={e => e.stopPropagation()} onSubmit={handleEditSubmit}>
            <div className="dr-modal-header">
              <h3>Edit Document Metadata</h3>
              <button type="button" className="dr-modal-close-btn" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <div className="dr-modal-body">
              <div className="dr-form-group">
                <label>Document Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>

              <div className="dr-form-row">
                <div className="dr-form-group">
                  <label>Category</label>
                  <select value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                    {CATEGORIES.filter(c => c.key !== "All Documents").map(c => (
                      <option key={c.key} value={c.key}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="dr-form-group">
                  <label>Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    <option value="Approved">Approved</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="dr-form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="dr-modal-footer">
              <button type="button" className="dr-btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" className="dr-btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* ====== SIMULATED GENERATING REPORT PROGRESS MODAL ====== */}
      {showGeneratingModal && (
        <div className="dr-modal-overlay">
          <div className="dr-modal" style={{ maxWidth: '400px' }}>
            <div className="dr-modal-header">
              <h3>Generating System Report</h3>
            </div>
            <div className="dr-modal-body dr-progress-loader">
              <div className="dr-spinner"></div>
              <p style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                Generating {generatingReportName}...
              </p>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Please wait while we compile the project documents and stats.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ====== ACTIVITY LOGS MODAL ====== */}
      {showActivityModal && (
        <div className="dr-modal-overlay" onClick={() => setShowActivityModal(false)}>
          <div className="dr-modal" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="dr-modal-header">
              <h3>System Activity Logs</h3>
              <button type="button" className="dr-modal-close-btn" onClick={() => setShowActivityModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dr-modal-body" style={{ maxHeight: '400px', overflowY: 'auto', padding: '20px' }}>
              <div className="dr-activity-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activities.length > 0 ? (
                  activities.map((act) => (
                    <div key={act.id} className="dr-activity-item" style={{ display: 'flex', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
                      <div className={`dr-activity-icon-wrap ${act.type === 'upload' ? 'green' : act.type === 'approve' ? 'blue' : act.type === 'delete' ? 'red' : 'purple'}`} style={{ flexShrink: 0 }}>
                        {act.type === 'upload' ? <UploadCloud size={14} /> : act.type === 'approve' ? <CheckCircle2 size={14} /> : act.type === 'delete' ? <Trash2 size={14} /> : <TrendingUp size={14} />}
                      </div>
                      <div className="dr-activity-details" style={{ flex: 1 }}>
                        <span className="dr-activity-text" style={{ fontSize: '13px', color: '#1e293b', display: 'block', lineHeight: '1.4' }}>
                          <strong>{act.user}</strong> {act.action} <strong>{act.item}</strong>
                        </span>
                        <span className="dr-activity-time" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                          {formatDateTime(act.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8' }}>No activity logs found.</p>
                )}
              </div>
            </div>
            <div className="dr-modal-footer">
              <button type="button" className="dr-btn-secondary" onClick={() => setShowActivityModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== ALERT MODAL ====== */}
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

export default DocsAndReports;
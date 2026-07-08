import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
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
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

const initialDocuments = [];
const initialActivities = [];

// Document Categories Mapping
const CATEGORIES = [
  { name: "All Documents", key: "All Documents", mockCount: 84 },
  { name: "Project Charter", key: "Governance", mockCount: 5 },
  { name: "Drawings", key: "Drawings", mockCount: 22 },
  { name: "BOQ & Estimates", key: "BOQ & Estimates", mockCount: 14 },
  { name: "Contracts", key: "Contracts", mockCount: 7 },
  { name: "Approvals", key: "Approvals", mockCount: 9 },
  { name: "Technical Specifications", key: "Technical Specifications", mockCount: 6 },
  { name: "Safety Documents", key: "Safety", mockCount: 8 },
  { name: "Progress Reports", key: "Progress Reports", mockCount: 11 },
  { name: "Risk Reports", key: "Risk Reports", mockCount: 6 },
  { name: "Closure Documents", key: "Closure Documents", mockCount: 4 }
];

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

  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (isTab && project) {
      const prjId = project.prjId || project.id;
      if (prjId) {
        fetch(`${API_BASE}/attachments/project/${prjId}`, { headers: authHeaders() })
          .then(res => res.ok ? res.json() : [])
          .then(data => {
            if (Array.isArray(data)) {
              const mapped = data.map(att => ({
                id: `DOC-${att.fileId}`,
                name: att.fileNm,
                category: "Project Document", 
                type: (att.fileNm.split('.').pop() || "unknown").toLowerCase(),
                version: "V1.0",
                uploadedBy: "System",
                uploadedOn: att.dateTimestamp,
                status: "Approved",
                size: "Unknown",
                description: "Uploaded document",
                url: att.atPath
              }));
              setDocuments(mapped);
            }
          })
          .catch(err => console.error("Error fetching docs", err));
      }
    } else {
      setDocuments([]);
    }
  }, [isTab, project]);

  // Filters & State
  const [selectedCategoryTab, setSelectedCategoryTab] = useState("All Documents");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterType, setFilterType] = useState("All Types");
  const [filterUser, setFilterUser] = useState("All Users");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("01-May-2025 ~ 30-Jun-2025");

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeActionsMenuId, setActiveActionsMenuId] = useState(null);

  // Generate Report simulation modal
  const [showGeneratingModal, setShowGeneratingModal] = useState(false);
  const [generatingReportName, setGeneratingReportName] = useState("");
  const [showActivityModal, setShowActivityModal] = useState(false);

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

  // Form states for upload
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Governance");
  const [uploadVersion, setUploadVersion] = useState("V1.0");
  const [uploadSize, setUploadSize] = useState("1.5 MB");
  const [uploadUploadedBy, setUploadUploadedBy] = useState("Ravi Kumar");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadStatus, setUploadStatus] = useState("Approved");

  // Form states for edit/update metadata
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Sync category tab with filter category dropdown
  useEffect(() => {
    if (selectedCategoryTab !== "All Documents") {
      setFilterCategory(selectedCategoryTab);
    } else {
      setFilterCategory("All Categories");
    }
    setCurrentPage(1);
  }, [selectedCategoryTab]);

  // Apply filters
  const filteredDocuments = documents.filter((doc) => {
    // Category match
    const matchCategory =
      filterCategory === "All Categories" || doc.category === filterCategory;

    // File type match
    const matchType =
      filterType === "All Types" || doc.type.toLowerCase() === filterType.toLowerCase();

    // Uploaded by match
    const matchUser =
      filterUser === "All Users" || doc.uploadedBy === filterUser;

    // Search query match
    const matchSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchCategory && matchType && matchUser && matchSearch;
  });

  // Calculate stats based on current docs list
  const totalCount = documents.length;
  const drawingsCount = documents.filter(d => d.category === "Drawings").length;
  const reportsCount = documents.filter(d => d.category === "Progress Reports" || d.category === "Risk Reports" || d.name.toLowerCase().includes("report")).length;
  const pendingApprovalsCount = documents.filter(d => d.status === "Under Review").length;

  // Derive unique categories present in documents
  const presentCategories = Array.from(new Set(documents.map(d => d.category))).filter(Boolean).sort();

  // Derive unique types present in documents
  const presentTypes = Array.from(new Set(documents.map(d => d.type.toLowerCase()))).filter(Boolean).sort();

  // Helper mapping for display types
  const getFileTypeDisplayName = (type) => {
    const t = type.toLowerCase();
    if (t === "pdf") return "PDF";
    if (t === "xlsx" || t === "xls") return "Excel/XLSX";
    if (t === "docx" || t === "doc") return "Word/DOCX";
    if (t === "dwg") return "AutoCAD/DWG";
    return type.toUpperCase();
  };

  // Derive unique users present in documents
  const presentUsers = Array.from(new Set(documents.map(d => d.uploadedBy))).filter(Boolean).sort();

  // Pagination math
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  // Helper to render type icon
  const renderFileTypeIcon = (type) => {
    const t = type.toLowerCase();
    if (t === "pdf") return <div className="dr-type-icon pdf">PDF</div>;
    if (t === "xlsx" || t === "xls") return <div className="dr-type-icon xlsx">XLSX</div>;
    if (t === "docx" || t === "doc") return <div className="dr-type-icon docx">DOCX</div>;
    if (t === "dwg") return <div className="dr-type-icon dwg">DWG</div>;
    return <div className="dr-type-icon other">FILE</div>;
  };

  // Format date time helper
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
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${day}-${month}-${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  };

  // Upload a document handler
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadName.trim()) return;

    // Generate custom ID
    const nextNum = Math.max(...documents.map(d => parseInt(d.id.replace("DOC-", ""), 10))) + 1;
    const formattedId = `DOC-${String(nextNum).padStart(3, "0")}`;

    const newDoc = {
      id: formattedId,
      name: uploadName.endsWith(".pdf") || uploadName.endsWith(".xlsx") || uploadName.endsWith(".docx") || uploadName.endsWith(".dwg") 
        ? uploadName 
        : `${uploadName}.pdf`,
      category: uploadCategory,
      type: uploadName.split(".").pop() || "pdf",
      version: uploadVersion || "V1.0",
      uploadedBy: uploadUploadedBy || "Ravi Kumar",
      uploadedOn: new Date().toISOString(),
      status: uploadStatus || "Approved",
      size: uploadSize || "1.2 MB",
      description: uploadDescription || ""
    };

    setDocuments(prev => [newDoc, ...prev]);

    // Add activity log
    const newAct = {
      id: `ACT-${Date.now()}`,
      user: newDoc.uploadedBy,
      action: "uploaded",
      item: newDoc.name,
      timestamp: newDoc.uploadedOn,
      type: "upload"
    };
    setActivities(prev => [newAct, ...prev]);

    setShowUploadModal(false);
    // Reset inputs
    setUploadName("");
    setUploadCategory("Governance");
    setUploadVersion("V1.0");
    setUploadSize("1.5 MB");
    setUploadUploadedBy("Ravi Kumar");
    setUploadDescription("");
    setUploadStatus("Approved");
  };

  // Delete document handler
  const handleDeleteDoc = (id, name) => {
    triggerAlert(
      "warning",
      "Confirm Delete",
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      () => {
        setDocuments(prev => prev.filter(d => d.id !== id));
        // Add activity log
        const newAct = {
          id: `ACT-${Date.now()}`,
          user: "Ravi Kumar",
          action: "deleted",
          item: name,
          timestamp: new Date().toISOString(),
          type: "delete"
        };
        setActivities(prev => [newAct, ...prev]);
      },
      "Delete",
      "Cancel"
    );
    setActiveActionsMenuId(null);
  };

  // Edit document handler
  const openEditModal = (doc) => {
    setSelectedDoc(doc);
    setEditName(doc.name);
    setEditCategory(doc.category);
    setEditStatus(doc.status);
    setEditDescription(doc.description || "");
    setShowEditModal(true);
    setActiveActionsMenuId(null);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

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

    // Add activity log
    const newAct = {
      id: `ACT-${Date.now()}`,
      user: "Ravi Kumar",
      action: "updated metadata of",
      item: editName,
      timestamp: new Date().toISOString(),
      type: "update"
    };
    setActivities(prev => [newAct, ...prev]);

    setShowEditModal(false);
  };

  // Generate Report simulation
  const handleGenerateReport = (reportName) => {
    setGeneratingReportName(reportName);
    setShowGeneratingModal(true);

    setTimeout(() => {
      setShowGeneratingModal(false);
      
      // Simulate file download
      triggerAlert(
        "success",
        "Report Generated",
        `Report "${reportName}" has been generated successfully and downloaded to your local device.`
      );

      // Add to activities log
      const newAct = {
        id: `ACT-${Date.now()}`,
        user: "Ravi Kumar",
        action: "generated",
        item: reportName,
        timestamp: new Date().toISOString(),
        type: "generate"
      };
      setActivities(prev => [newAct, ...prev]);

      // Add generated document to repository
      const nextNum = Math.max(...documents.map(d => parseInt(d.id.replace("DOC-", ""), 10))) + 1;
      const newDoc = {
        id: `DOC-${String(nextNum).padStart(3, "0")}`,
        name: `${reportName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`,
        category: "Progress Reports",
        type: "pdf",
        version: "V1.0",
        uploadedBy: "Ravi Kumar",
        uploadedOn: new Date().toISOString(),
        status: "Approved",
        size: "2.4 MB",
        description: `Auto-generated system report for ${reportName}`
      };
      setDocuments(prev => [newDoc, ...prev]);
    }, 1800);
  };

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

              {/* Project Header Row */}
              <div className="dr-project-header-row">
                <div>
                  <div className="dr-header-title-row">
                    <h1 className="dr-header-title">50 TPD CBG Plant Construction - Nalgonda</h1>
                    <span className="dr-badge live">LIVE</span>
                  </div>
                </div>
                <div className="dr-header-actions">
                  <button className="dr-btn-white-header" onClick={() => navigate("/project-creation")}>
                    Edit Project
                  </button>
                  <button className="dr-btn-primary-header" onClick={() => handleGenerateReport("Overall Project Performance Report")}>
                    <TrendingUp size={16} /> Generate Report
                  </button>
                  <button className="dr-btn-white-header">
                    More
                  </button>
                </div>
              </div>

              {/* Project Meta Information Cards */}
              <div className="dr-project-card">
                <div className="dr-project-grid">
                  <div className="dr-project-field">
                    <span className="dr-project-label">Project Code</span>
                    <span className="dr-project-value" title="PRJ-2025-001">PRJ-2025-001</span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">Company</span>
                    <span className="dr-project-value" title="Atirath Bio Energy">Atirath Bio Energy</span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">Plant</span>
                    <span className="dr-project-value" title="Nalgonda Plant">Nalgonda Plant</span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">Project Manager</span>
                    <span className="dr-project-value" title="Ravi Kumar">Ravi Kumar</span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">Start Date</span>
                    <span className="dr-project-value" title="01-May-2025">01-May-2025</span>
                  </div>
                  <div className="dr-project-field">
                    <span className="dr-project-label">End Date</span>
                    <span className="dr-project-value" title="30-Nov-2025">30-Nov-2025</span>
                  </div>
                  <div className="dr-project-field dr-project-field-progress" style={{ minWidth: "140px" }}>
                    <span className="dr-project-label">Progress</span>
                    <div className="dr-progress-container">
                      <span className="dr-project-value">42.35%</span>
                      <div className="dr-progress-bar-bg">
                        <div className="dr-progress-bar-fill" style={{ width: "42.35%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation Navigation Menu */}
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

        {/* Sub-toolbar upload export buttons */}
        <div className="dr-toolbar-actions">
          <div className="dr-toolbar-left">
            <button className="dr-btn-blue" onClick={() => setShowUploadModal(true)}>
              <UploadCloud size={16} /> Upload Document
            </button>
            <button className="dr-btn-white-tool" onClick={() => handleGenerateReport("Executive Summary Report")}>
              <TrendingUp size={15} /> Generate Report
            </button>
            <button className="dr-btn-white-tool">
              Export
            </button>
            <button className="dr-btn-white-tool">
              Share
            </button>
          </div>
          <div className="dr-toolbar-right">
            <button className="dr-btn-icon-only" title="Refresh Dashboard" onClick={() => {
              setDocuments(initialDocuments);
              setActivities(initialActivities);
            }}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Stats Summary Grid Cards */}
        <div className="dr-stats-row">
          <div 
            className="dr-stat-card" 
            style={{ cursor: "pointer" }} 
            onClick={() => {
              setSelectedCategoryTab("All Documents");
              setFilterCategory("All Categories");
              setFilterType("All Types");
              setFilterUser("All Users");
              setSearchQuery("");
            }}
          >
            <div className="dr-stat-icon-wrap blue">
              <Folder />
            </div>
            <div className="dr-stat-info">
              <span className="dr-stat-label">Total Documents</span>
              <span className="dr-stat-value">{totalCount}</span>
              <span className="dr-stat-link">View all</span>
            </div>
          </div>

          <div 
            className="dr-stat-card" 
            style={{ cursor: "pointer" }} 
            onClick={() => {
              setSelectedCategoryTab("Drawings");
              setFilterCategory("Drawings");
              setFilterType("All Types");
              setFilterUser("All Users");
              setSearchQuery("");
            }}
          >
            <div className="dr-stat-icon-wrap green">
              <Layers />
            </div>
            <div className="dr-stat-info">
              <span className="dr-stat-label">Drawings</span>
              <span className="dr-stat-value">{drawingsCount}</span>
              <span className="dr-stat-link">View all</span>
            </div>
          </div>

          <div 
            className="dr-stat-card" 
            style={{ cursor: "pointer" }} 
            onClick={() => {
              setSelectedCategoryTab("All Documents");
              setFilterCategory("All Categories");
              setFilterType("All Types");
              setFilterUser("All Users");
              setSearchQuery("report");
            }}
          >
            <div className="dr-stat-icon-wrap purple">
              <FileText />
            </div>
            <div className="dr-stat-info">
              <span className="dr-stat-label">Reports</span>
              <span className="dr-stat-value">{reportsCount}</span>
              <span className="dr-stat-link">View all</span>
            </div>
          </div>

          <div 
            className="dr-stat-card" 
            style={{ cursor: "pointer" }} 
            onClick={() => {
              setSelectedCategoryTab("All Documents");
              setFilterCategory("All Categories");
              setFilterType("All Types");
              setFilterUser("All Users");
              setSearchQuery("Under Review");
            }}
          >
            <div className="dr-stat-icon-wrap orange">
              <Clock />
            </div>
            <div className="dr-stat-info">
              <span className="dr-stat-label">Pending Approvals</span>
              <span className="dr-stat-value">{pendingApprovalsCount}</span>
              <span className="dr-stat-link">View all</span>
            </div>
          </div>

          <div className="dr-stat-card dr-stat-card-storage" style={{ minWidth: "170px" }}>
            <div className="dr-stat-icon-wrap yellow">
              <Database />
            </div>
            <div className="dr-stat-info">
              <span className="dr-stat-label">Storage Used</span>
              <span className="dr-stat-value" style={{ fontSize: '18px' }}>1.8 GB</span>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>of 10 GB</span>
              <div className="dr-storage-bar-bg">
                <div className="dr-storage-bar-fill" style={{ width: "18%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="dr-filters-row">
          <select className="dr-filter-select" value={filterCategory} onChange={e => {
            setFilterCategory(e.target.value);
            setSelectedCategoryTab(e.target.value === "All Categories" ? "All Documents" : e.target.value);
          }}>
            <option value="All Categories">All Categories</option>
            {presentCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select className="dr-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="All Types">All Types</option>
            {presentTypes.map(t => (
              <option key={t} value={t}>{getFileTypeDisplayName(t)}</option>
            ))}
          </select>

          <select className="dr-filter-select" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="All Users">All Users</option>
            {presentUsers.map(usr => (
              <option key={usr} value={usr}>{usr}</option>
            ))}
          </select>

          <div className="dr-date-range-box">
            <CalendarIcon size={14} />
            <input type="text" value={dateRange} onChange={e => setDateRange(e.target.value)} />
          </div>

          <div className="dr-search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <button className="dr-btn-white-tool" style={{ height: "38px" }}>
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>

        {/* Main Two Column Repository Grid */}
        <div className="dr-main-grid">
          {/* Left Column - Documents list table */}
          <div className="dr-repo-card">
            <h2 className="dr-repo-title">Document Repository</h2>
            <div className="dr-table-container">
              <table className="dr-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>Version</th>
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
                        <td data-label="Version">
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{doc.version}</span>
                        </td>
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
                          <div className="dr-actions-col">
                            <button
                              className="dr-action-btn"
                              title="View details"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setShowDetailModal(true);
                              }}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              className="dr-action-btn"
                              title="Simulate Download"
                              onClick={() => {
                                triggerAlert(
                                  "success",
                                  "Download Started",
                                  `Simulating file download of: ${doc.name}`
                                );
                              }}
                            >
                              <Download size={13} />
                            </button>
                            <button
                              className="dr-action-btn"
                              title="Version History"
                              onClick={() => {
                                triggerAlert(
                                  "info",
                                  "Version History",
                                  `Version History for ${doc.name}\nActive Version:${doc.version}\nUploaded By:${doc.uploadedBy}\nUploaded On:${formatDateTime(doc.uploadedOn)}\nInitial Version:V1.0 (System on 01-May-2025)`
                                );
                              }}
                            >
                              <History size={13} />
                            </button>
                            <div style={{ position: 'relative' }}>
                              <button
                                className="dr-action-btn"
                                onClick={() => setActiveActionsMenuId(activeActionsMenuId === doc.id ? null : doc.id)}
                              >
                                <MoreVertical size={13} />
                              </button>

                              {/* Action Dropdown Menu */}
                              {activeActionsMenuId === doc.id && (
                                <div style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '32px',
                                  backgroundColor: 'white',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                  zIndex: 100,
                                  minWidth: '120px',
                                  padding: '4px'
                                }}>
                                  <button
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      width: '100%',
                                      border: 'none',
                                      background: 'none',
                                      padding: '8px 10px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#334155',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      borderRadius: '4px'
                                    }}
                                    onClick={() => openEditModal(doc)}
                                  >
                                    <Edit2 size={12} /> Edit Meta
                                  </button>
                                  <button
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      width: '100%',
                                      border: 'none',
                                      background: 'none',
                                      padding: '8px 10px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      borderRadius: '4px'
                                    }}
                                    onClick={() => handleDeleteDoc(doc.id, doc.name)}
                                  >
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", color: "#64748b", padding: "30px" }}>
                        No documents matched the selected filters.
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

              <div className="dr-form-row">
                <div className="dr-form-group">
                  <label>Category</label>
                  <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
                    {CATEGORIES.filter(c => c.key !== "All Documents").map(c => (
                      <option key={c.key} value={c.key}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="dr-form-group">
                  <label>Version</label>
                  <input
                    type="text"
                    required
                    placeholder="V1.0"
                    value={uploadVersion}
                    onChange={e => setUploadVersion(e.target.value)}
                  />
                </div>
              </div>

              <div className="dr-form-row">
                <div className="dr-form-group">
                  <label>Uploaded By</label>
                  <input
                    type="text"
                    required
                    value={uploadUploadedBy}
                    onChange={e => setUploadUploadedBy(e.target.value)}
                  />
                </div>
                <div className="dr-form-group">
                  <label>Initial Status</label>
                  <select value={uploadStatus} onChange={e => setUploadStatus(e.target.value)}>
                    <option value="Approved">Approved</option>
                    <option value="Under Review">Under Review</option>
                  </select>
                </div>
              </div>

              <div className="dr-form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Brief description of the document contents..."
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
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
                  <span className="dr-detail-label">Version</span>
                  <span className="dr-detail-value">{selectedDoc.version}</span>
                </div>
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
                alert(`Simulating download of: ${selectedDoc.name}`);
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
                {activities.map((act) => (
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
                ))}
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

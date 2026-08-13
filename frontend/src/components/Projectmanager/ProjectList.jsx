import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, Download, Settings, Eye, Edit2, Trash2, 
  ChevronLeft, ChevronRight, FileText, PlayCircle, PauseCircle, CheckCircle, XCircle,
  RefreshCw
} from 'lucide-react';
import Sidebar from '../Sidebar.jsx';
import Header from '../Header.jsx';
import '../../styles/projectList.css';
import { calculateDynamicPriority } from '../../utils/priority';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
});

const getLoggedInUser = () => {
  const storedName = sessionStorage.getItem("userName");
  if (storedName) return storedName;
  const email = sessionStorage.getItem("userEmail") || "";
  if (email) {
    const namePart = email.split("@")[0];
    return namePart.split(/[._]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return "Admin";
};

export default function ProjectList({ userRole, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const fromDashboard = location.state?.fromDashboard || false;
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search/filter state
  const [searchText, setSearchText] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterPlant, setFilterPlant] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStartFrom, setFilterStartFrom] = useState('');
  const [filterStartTo, setFilterStartTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const [draftsRes, liveRes, coyRes, pltRes, deptRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/project-drafts`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/project-live`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/companies`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/plants`, { headers: getAuthHeaders() }),
        fetch(`${apiBaseUrl}/api/departments`, { headers: getAuthHeaders() })
      ]);

      const drafts = draftsRes.ok ? await draftsRes.json() : [];
      const live = liveRes.ok ? await liveRes.json() : [];
      const coyData = coyRes.ok ? await coyRes.json() : [];
      const pltData = pltRes.ok ? await pltRes.json() : [];
      const deptData = deptRes.ok ? await deptRes.json() : [];

      const mappedDrafts = (drafts || []).map(d => ({
        id: d.drftPrjId,
        _type: 'draft',
        projectCode: d.prjCd || '',
        projectName: d.prjNm || '',
        companyName: coyData.find(c => c.coyId === d.coyId)?.coyNm || '',
        plantName: pltData.find(p => p.pltId === d.pltId)?.pltNm || '',
        department: deptData.find(dep => dep.deptId === d.deptId)?.deptNm || '',
        priority: d.prjPrty || 'MEDIUM',
        status: 'DRAFT',
        startDate: d.tentStDt || '',
        endDate: d.tentEndDt || '',
        totalProjectDays: d.noOfDays || '',
        createdBy: getLoggedInUser()
      }));

      const mappedLive = (live || []).map(l => {
        const dynamicPrio = calculateDynamicPriority(l.prjPrty || 'LOW', l.stDt, l.endDt, l.noOfDays);
        return {
          id: l.prjId,
          _type: 'live',
          projectCode: l.prjCd || '',
          projectName: l.prjNm || '',
          companyName: coyData.find(c => c.coyId === l.coyId)?.coyNm || '',
          plantName: pltData.find(p => p.pltId === l.pltId)?.pltNm || '',
          department: deptData.find(dep => dep.deptId === l.deptId)?.deptNm || '',
          priority: dynamicPrio.priority,
          priorityMeta: dynamicPrio,
          status: l.prjSts || 'LIVE',
          startDate: l.stDt || '',
          endDate: l.endDt || '',
          totalProjectDays: l.noOfDays || '',
          createdBy: getLoggedInUser()
        };
      });

      setProjects([...mappedLive]);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  // Filter logic – search includes company, plant, department
  const filteredProjects = projects.filter(p => {
    const searchLower = searchText.toLowerCase().trim();
    const matchSearch = !searchLower ||
      p.projectCode?.toLowerCase().includes(searchLower) ||
      p.projectName?.toLowerCase().includes(searchLower) ||
      p.companyName?.toLowerCase().includes(searchLower) ||
      p.plantName?.toLowerCase().includes(searchLower) ||
      p.department?.toLowerCase().includes(searchLower);

    const matchCompany = !filterCompany || p.companyName === filterCompany;
    const matchPlant = !filterPlant || p.plantName === filterPlant;
    const matchDept = !filterDept || p.department === filterDept;
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchPriority = !filterPriority || p.priority === filterPriority;
    const matchStartFrom = !filterStartFrom || (p.startDate && p.startDate >= filterStartFrom);
    const matchStartTo = !filterStartTo || (p.startDate && p.startDate <= filterStartTo);
    return matchSearch && matchCompany && matchPlant && matchDept && matchStatus && matchPriority && matchStartFrom && matchStartTo;
  });

  // Stats – removed cancelled
  const totalProjects = projects.length;
  const liveProjects = projects.filter(p => p.status === 'LIVE').length;
  const onHoldProjects = projects.filter(p => p.status === 'HOLD').length;
  const closedProjects = projects.filter(p => p.status === 'CLOSED').length;

  // Unique options for dropdowns
  const uniqueCompanies = [...new Set(projects.map(p => p.companyName).filter(Boolean))];
  const uniquePlants = [...new Set(projects.map(p => p.plantName).filter(Boolean))];
  const uniqueDepts = [...new Set(projects.map(p => p.department).filter(Boolean))];

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const indexOfFirst = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredProjects.slice(indexOfFirst, indexOfFirst + itemsPerPage);

  const getPriorityClass = (priority) => {
    switch(priority?.toUpperCase()) {
      case 'ATMOST CRITICAL':
      case 'ATMOST_CRITICAL': return 'atmost-critical';
      case 'CRITICAL': return 'critical';
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      case 'NORMAL': return 'normal';
      case 'LOW': return 'low';
      default: return '';
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'LIVE': return 'live';
      case 'DRAFT': return 'draft';
      case 'HOLD': return 'on-hold';
      case 'CLOSED': return 'closed';
      default: return '';
    }
  };

  const resetFilters = () => {
    setSearchText('');
    setFilterCompany('');
    setFilterPlant('');
    setFilterDept('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterStartFrom('');
    setFilterStartTo('');
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = ['#','Project Code','Project Name','Company','Plant','Department','Priority','Status','Start Date','End Date','Total Days'];
    const rows = filteredProjects.map((p, i) => [
      i+1, p.projectCode, p.projectName, p.companyName, p.plantName,
      p.department, p.priority, p.status, p.startDate, p.endDate, p.totalProjectDays
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = 'project_list.csv';
    link.click();
  };

  return (
    <div className="pl-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />
      <div className="pl-shell">
        <Header title="Project List" userRole="Project Manager" initials="RK" />
        
        <main className="pl-main-content">
          {fromDashboard && (
            <div style={{ marginBottom: "20px" }}>
              <button 
                onClick={() => navigate('/pm-dashboard')}
                style={{ 
                  display: "flex", alignItems: "center", gap: "6px", 
                  background: "#2563eb", border: "none", 
                  padding: "8px 16px", borderRadius: "6px", 
                  color: "white", fontSize: "13px", fontWeight: "600", 
                  cursor: "pointer", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                  transition: "background 0.2s"
                }}
              >
                <ChevronLeft size={16} /> Back to Dashboard
              </button>
            </div>
          )}

          {/* Stats Cards – Cancelled removed, now 4 columns */}
          <div className="row row-cols-1 row-cols-sm-2 row-cols-md-4 g-3 mb-4">
            <div className="col">
              <div className="pl-stat-card h-100 m-0 w-100">
                <div className="pl-stat-icon blue"><FileText size={24} /></div>
                <div className="pl-stat-info">
                  <span className="pl-stat-label">Total Projects</span>
                  <span className="pl-stat-value">{totalProjects}</span>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="pl-stat-card h-100 m-0 w-100">
                <div className="pl-stat-icon green"><PlayCircle size={24} /></div>
                <div className="pl-stat-info">
                  <span className="pl-stat-label">Live Projects</span>
                  <span className="pl-stat-value">{liveProjects}</span>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="pl-stat-card h-100 m-0 w-100">
                <div className="pl-stat-icon orange"><PauseCircle size={24} /></div>
                <div className="pl-stat-info">
                  <span className="pl-stat-label">On Hold</span>
                  <span className="pl-stat-value">{onHoldProjects}</span>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="pl-stat-card h-100 m-0 w-100">
                <div className="pl-stat-icon purple"><CheckCircle size={24} /></div>
                <div className="pl-stat-info">
                  <span className="pl-stat-label">Closed</span>
                  <span className="pl-stat-value">{closedProjects}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table – removed Edit and Delete, kept only View */}
          <div className="pl-table-card">
            <div className="pl-table-header">
              <div className="pl-entries-select">
                Show 
                <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                entries
              </div>

              <div style={{ position: 'relative', marginLeft: 'auto', marginRight: '16px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  value={searchText}
                  onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
                  style={{ 
                    padding: '8px 16px 8px 36px', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    outline: 'none', 
                    fontSize: '14px', 
                    width: '400px',
                    color: '#334155',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                />
              </div>

              <div className="pl-sort-select">
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {loading ? 'Loading...' : `${filteredProjects.length} record(s)`}
                </span>
              </div>
            </div>

            <div className="pl-table-container">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#2563eb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <RefreshCw size={32} style={{ animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#475569' }}>Loading projects...</span>
                </div>
              ) : (
                <table className="pl-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Project Code</th>
                      <th>Project Name</th>
                      <th>Company</th>
                      <th>Plant</th>
                      <th>Department</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Total Days</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length > 0 ? currentItems.map((p, idx) => (
                      <tr key={p.id}>
                        <td>{indexOfFirst + idx + 1}</td>
                        <td style={{ fontWeight: 500 }}>{p.projectCode || 'N/A'}</td>
                        <td>{p.projectName}</td>
                        <td>{p.companyName || 'N/A'}</td>
                        <td>{p.plantName || 'N/A'}</td>
                        <td>{p.department || 'N/A'}</td>
                        <td><span className={`pl-badge ${getPriorityClass(p.priority)}`}>{p.priority}</span></td>
                        <td><span className={`pl-badge ${getStatusClass(p.status)}`}>{p.status}</span></td>
                        <td>{p.startDate || 'N/A'}</td>
                        <td>{p.endDate || 'N/A'}</td>
                        <td>{p.totalProjectDays || 'N/A'}</td>
                        <td>
                          <div className="pl-actions">
                            <button 
                              className="pl-action-btn view" 
                              title="View Project Details" 
                              onClick={() => navigate(`/project-details/${p.id}`, { state: { viewMode: 'full', projectType: p._type } })}
                            >
                              <Eye size={14} />
                            </button>
                            {/* Edit and Delete buttons removed */}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={12} style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                          No projects found. {projects.length === 0 ? 'No projects in the system yet.' : 'Try adjusting your filters.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!loading && totalPages > 0 && (
              <div className="pl-pagination-container">
                <div>
                  Showing {filteredProjects.length > 0 ? indexOfFirst + 1 : 0} to {Math.min(indexOfFirst + itemsPerPage, filteredProjects.length)} of {filteredProjects.length} entries
                </div>
                <div className="pl-page-controls">
                  <button className="pl-page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      page = currentPage - 2 + i;
                    }
                    if (page > totalPages) return null;
                    return (
                      <button key={page} className={`pl-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                        {page}
                      </button>
                    );
                  })}
                  <button className="pl-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
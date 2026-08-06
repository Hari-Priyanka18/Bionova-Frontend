import React, { useState, useEffect } from 'react';
import { 
  FileText, PlusCircle, Edit3, Trash2, Download, 
  Search, Filter, Eye, X, User, ChevronDown, ChevronUp
} from 'lucide-react';
import '../../styles/project-change-logs.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";
const getAuthToken = () => sessionStorage.getItem("authToken") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getAuthToken()}`
});

const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr || dateStr === "N/A" || dateStr === "Not Specified") return "N/A";
  const parts = dateStr.split('-');
  if (parts.length >= 3 && parts[0].length === 4) {
    return `${parts[2].substring(0, 2)}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  }
  return dateStr;
};

export default function ProjectChangeLogs({ project, progressData }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterModule, setFilterModule] = useState('All Modules');
  const [filterUser, setFilterUser] = useState('All Users');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const actualProgress = progressData?.overall || 0;

  const [dbLogs, setDbLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!project?.id) return;
      try {
        // 1. Fetch all activity logs
        const res = await fetch(`${API_BASE}/activity-logs`, { headers: authHeaders() });
        const allLogs = res.ok ? await res.json() : [];

        // 2. Fetch milestone IDs for this project (to filter relevant milestones)
        const isDraft = project.status === "DRAFT" || project.status === "Draft";
        const mlUrl = isDraft
          ? `${API_BASE}/milestone-drafts/by-project/${project.id}`
          : `${API_BASE}/milestone-live/by-project/${project.id}`;

        const mlRes = await fetch(mlUrl, { headers: authHeaders() });
        const mlData = mlRes.ok ? await mlRes.json() : [];
        const milestoneIds = mlData.map(m => m.id || m.drftMId || m.drft_m_id || m.mId);

        // 3. Filter logs for this project and its milestones
        const projectLogs = allLogs.filter(log => {
          if (log.entityTyp === 'PROJECT' && String(log.entityId) === String(project.id)) {
            return true;
          }
          if (log.entityTyp === 'MILESTONE' && milestoneIds.includes(Number(log.entityId))) {
            return true;
          }
          return false;
        });

        // 4. Map logs to the display format
        const mappedDbLogs = projectLogs.map((log, index) => {
          const logDate = new Date(log.logDt);
          const dateStr = isNaN(logDate.getTime()) 
            ? 'N/A' 
            : `${String(logDate.getDate()).padStart(2, '0')}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${logDate.getFullYear()}`;
          
          let hours = logDate.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const mins = String(logDate.getMinutes()).padStart(2, '0');
          const timeStr = `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;

          let module = 'Project';
          if (log.entityTyp === 'MILESTONE') module = 'Milestone';
          if (log.entityTyp === 'TASK') module = 'Task';

          // Determine change type: Created if statusFrom is N/A or empty
          const type = log.statusFrom === 'N/A' || !log.statusFrom ? 'Created' : 'Updated';
          const recordId = `${module.substring(0, 3).toUpperCase()}-${log.entityId}`;

          // Use actual user who made the change (fallback to 'System')
          const changedBy = log.createdBy || log.modifiedBy || 'System';

          // Determine what changed – use fieldName if available, else 'Status'
          const whatChanged = log.fieldName || 'Status';

          // Build description using status change if available, else generic
          let description = `${module} ${whatChanged} changed`;
          if (log.statusFrom && log.statusTo) {
            description = `${module} status changed from ${log.statusFrom} to ${log.statusTo}`;
          } else if (log.fieldName) {
            description = `${module} ${log.fieldName} updated`;
          }

          return {
            id: `db-${log.logId || index}`,
            dateStr,
            timeStr,
            timestamp: logDate.getTime(),
            module,
            type,
            whatChanged,
            changedBy,
            recordId,
            description,
            oldVal: log.statusFrom || log.oldValue || 'N/A',
            newVal: log.statusTo || log.newValue || 'N/A'
          };
        });

        setDbLogs(mappedDbLogs);
      } catch (err) {
        console.error("Error fetching activity logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [project]);

  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    const [year, month, day] = dStr.split('-');
    return new Date(year, month - 1, day);
  };
  const startDate = parseDate(project?.startDate);
  const today = new Date();

  const allMergedLogs = [...dbLogs].sort((a, b) => b.timestamp - a.timestamp);

  // Stats – all values are derived from actual data; exported is not available from API, set to 0
  const stats = {
    total: allMergedLogs.length,
    created: allMergedLogs.filter(l => l.type === 'Created').length,
    updated: allMergedLogs.filter(l => l.type === 'Updated').length,
    deleted: allMergedLogs.filter(l => l.type === 'Deleted').length,
    exported: 0  // Remove static dummy value; can be replaced with a real API call if needed
  };

  const uniqueTypes = ['All', ...new Set(allMergedLogs.map(l => l.type))];
  const uniqueModules = ['All Modules', ...new Set(allMergedLogs.map(l => l.module))];
  const uniqueUsers = ['All Users', ...new Set(allMergedLogs.map(l => l.changedBy))];

  // Filter the logs
  const filteredLogs = allMergedLogs.filter(log => {
    if (filterType !== 'All' && log.type !== filterType) return false;
    if (filterModule !== 'All Modules' && log.module !== filterModule) return false;
    if (filterUser !== 'All Users' && log.changedBy !== filterUser) return false;

    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();
    return (
      log.description.toLowerCase().includes(lowerSearch) ||
      log.module.toLowerCase().includes(lowerSearch) ||
      log.changedBy.toLowerCase().includes(lowerSearch) ||
      log.type.toLowerCase().includes(lowerSearch) ||
      log.whatChanged.toLowerCase().includes(lowerSearch) ||
      log.recordId.toLowerCase().includes(lowerSearch)
    );
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterModule, filterUser, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const total = totalPages;
    const current = currentPage;
    const delta = 2;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      let left = Math.max(2, current - delta);
      let right = Math.min(total - 1, current + delta);

      if (current - delta > 2) {
        pages.push(1, '...');
      } else {
        pages.push(1);
      }

      for (let i = left; i <= right; i++) {
        if (i !== 1 && i !== total) pages.push(i);
      }

      if (current + delta < total - 1) {
        pages.push('...', total);
      } else {
        pages.push(total);
      }
    }
    return pages;
  };

  const handleGenerateReport = () => {
    const headers = ['Date', 'Time', 'Module', 'Change Type', 'What Changed', 'Changed By', 'Record ID', 'Description'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => 
        [
          `"${log.dateStr}"`, 
          `"${log.timeStr}"`, 
          `"${log.module}"`, 
          `"${log.type}"`, 
          `"${log.whatChanged}"`, 
          `"${log.changedBy}"`, 
          `"${log.recordId}"`, 
          `"${log.description.replace(/"/g, '""')}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${project?.projectCode || 'Project'}_ChangeLogs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pcl-container">
      {/* Project Header Banner */}
      <div className="pcl-project-banner" style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', paddingBottom: '10px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Project Code</span>
          <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{project?.projectCode || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Company</span>
          <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{project?.companyName || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Plant</span>
          <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{project?.plantName || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Project Manager</span>
          <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{project?.createdBy || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Start Date</span>
          <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{formatDateToDDMMYYYY(project?.startDate)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>End Date</span>
          <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{formatDateToDDMMYYYY(project?.endDate)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px', flex: 1 }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Progress</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{actualProgress}%</span>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', flex: 1, overflow: 'hidden' }}>
              <div style={{ width: `${actualProgress}%`, height: '100%', background: '#22c55e', borderRadius: '3px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Top Filters Row */}
      <div className="pcl-filters-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
        <div className="pcl-filter-group pcl-search-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
          <div className="pcl-search-input" style={{ display: 'flex', alignItems: 'center', position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              placeholder="Search change logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 32px 8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', width: '100%' }}
            />
            <Search size={16} style={{ position: 'absolute', right: '10px', color: '#94a3b8' }} />
          </div>
        </div>

        <div className="pcl-filter-group pcl-date-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>Date Range</label>
          <div className="pcl-date-input" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <CalendarIcon />
            <span style={{ fontSize: '13px' }}>{startDate.toLocaleDateString('en-GB').replace(/\//g, '-')} ~ {today.toLocaleDateString('en-GB').replace(/\//g, '-')}</span>
          </div>
        </div>

        <button 
          className="pcl-filter-btn" 
          onClick={() => setFiltersVisible(!filtersVisible)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
        >
          <Filter size={16} /> Filters {filtersVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button 
          className="pcl-filter-btn" 
          style={{ color: '#2563eb', borderColor: '#2563eb', display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 14px', border: '1px solid #2563eb', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
          onClick={handleGenerateReport}
        >
          <Download size={16} /> Generate Report
        </button>
      </div>

      {/* Collapsible Filter Dropdowns */}
      {filtersVisible && (
        <div className="pcl-filters-expanded" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div className="pcl-filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Change Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white' }}>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="pcl-filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Module</label>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white' }}>
              {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="pcl-filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Changed By</label>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white' }}>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
            <button 
              onClick={() => { setFilterType('All'); setFilterModule('All Modules'); setFilterUser('All Users'); }}
              style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="pcl-stats-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '20px' }}>
        <StatCard icon={<FileText color="#3b82f6"/>} label="Total Changes" value={stats.total} bg="#eff6ff" link="" />
        <StatCard icon={<PlusCircle color="#10b981"/>} label="Created" value={stats.created} bg="#ecfdf5" link="" />
        <StatCard icon={<Edit3 color="#f59e0b"/>} label="Updated" value={stats.updated} bg="#fffbeb" link="" />
        <StatCard icon={<Trash2 color="#ef4444"/>} label="Deleted" value={stats.deleted} bg="#fef2f2" link="" />
        <StatCard icon={<Download color="#8b5cf6"/>} label="Exported" value={stats.exported} bg="#f5f3ff" link="" />
      </div>

      <div className="pcl-main-content" style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
        {/* Table Area */}
        <div className="pcl-table-card" style={{ flex: 1, minWidth: 0 }}>
          <table className="pcl-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Date & Time ↓</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Module</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Change Type</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>What Changed</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Changed By</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Record ID / Code</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Description</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => (
                <tr key={log.id} onClick={() => setSelectedRecord(log)} className={selectedRecord?.id === log.id ? 'active' : ''} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selectedRecord?.id === log.id ? '#f1f5f9' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    <div className="pcl-td-date" style={{ fontSize: '13px', fontWeight: '500' }}>{log.dateStr}</div>
                    <div className="pcl-td-time" style={{ fontSize: '12px', color: '#94a3b8' }}>{log.timeStr}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>{log.module}</td>
                  <td style={{ padding: '10px 12px' }}><TypeBadge type={log.type} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <div className="pcl-user-badge-mini" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="pcl-avatar-mini" style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: '#475569' }}>{log.whatChanged.substring(0,2).toUpperCase()}</div>
                      <span style={{ fontSize: '13px' }}>{log.whatChanged}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>{log.changedBy}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '500' }}>{log.recordId}</td>
                  <td className="pcl-td-desc" style={{ padding: '10px 12px', fontSize: '13px' }} dangerouslySetInnerHTML={{__html: formatDesc(log.description)}}></td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button className="pcl-action-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Eye size={16} color="#64748b" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pcl-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
            <span>Showing {filteredLogs.length ? startIndex + 1 : 0} to {endIndex} of {filteredLogs.length} entries</span>
            <div className="pcl-page-controls" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                &lt;
              </button>
              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={page === '...'}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    background: page === currentPage ? '#2563eb' : 'white',
                    color: page === currentPage ? 'white' : '#475569',
                    cursor: page === '...' ? 'default' : 'pointer',
                    minWidth: '32px'
                  }}
                >
                  {page}
                </button>
              ))}
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar Details */}
        {selectedRecord && (
          <div className="pcl-sidebar" style={{ width: '340px', flexShrink: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', maxHeight: '600px', overflowY: 'auto' }}>
            <div className="pcl-sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Change Details</h3>
              <button onClick={() => setSelectedRecord(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="pcl-sidebar-body" style={{ paddingTop: '12px' }}>
              <div className="pcl-sb-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Date & Time</label>
                <div className="pcl-sb-val" style={{ fontSize: '13px', fontWeight: '500' }}>{selectedRecord.dateStr} {selectedRecord.timeStr}</div>
              </div>
              <div className="pcl-sb-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Module</label>
                <div className="pcl-sb-val" style={{ fontSize: '13px', fontWeight: '500' }}>{selectedRecord.module}</div>
              </div>
              <div className="pcl-sb-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Change Type</label>
                <TypeBadge type={selectedRecord.type} />
              </div>
              
              <div className="pcl-sb-divider" style={{ margin: '12px 0', borderTop: '1px solid #e2e8f0' }}></div>

              <div className="pcl-sb-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
                <label style={{ fontSize: '13px', color: '#64748b', width: '80px' }}>Changed By</label>
                <div className="pcl-user-badge" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="pcl-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', color: '#475569' }}>{selectedRecord.changedBy.substring(0,2).toUpperCase()}</div>
                  <div className="pcl-user-info">
                    <span className="pcl-user-name" style={{ fontSize: '13px', fontWeight: '500', display: 'block' }}>{selectedRecord.changedBy}</span>
                    <span className="pcl-user-role" style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedRecord.changedBy === project?.createdBy ? 'Project Manager' : 'Team Member'}</span>
                  </div>
                </div>
              </div>

              <div className="pcl-sb-row mt-4" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Record ID / Code</label>
                <div className="pcl-sb-val bold" style={{ fontSize: '13px', fontWeight: '600' }}>{selectedRecord.recordId}</div>
              </div>
              <div className="pcl-sb-row mt-4" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Field Changed</label>
                <div className="pcl-sb-val bold" style={{ fontSize: '13px', fontWeight: '600' }}>{selectedRecord.whatChanged}</div>
              </div>

              <div className="pcl-sb-diff" style={{ display: 'flex', gap: '16px', marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                <div className="pcl-diff-col" style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Old Value</label>
                  <div className="pcl-diff-val" style={{ fontSize: '13px', background: '#fef2f2', padding: '4px 8px', borderRadius: '4px', color: '#b91c1c' }}>{selectedRecord.oldVal}</div>
                </div>
                <div className="pcl-diff-col" style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>New Value</label>
                  <div className="pcl-diff-val" style={{ fontSize: '13px', background: '#ecfdf5', padding: '4px 8px', borderRadius: '4px', color: '#047857' }}>{selectedRecord.newVal}</div>
                </div>
              </div>

              <div className="pcl-sb-row mt-4" style={{ padding: '6px 0' }}>
                <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Description</label>
                <div className="pcl-sb-val" style={{ fontSize: '13px' }}>{selectedRecord.description}</div>
              </div>

              <div className="pcl-sb-row mt-4" style={{ padding: '6px 0' }}>
                <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Additional Info</label>
                <div className="pcl-sb-val text-sm" style={{ fontSize: '12px', color: '#64748b' }}>Update made from {selectedRecord.module} Details screen.</div>
              </div>

              <button className="pcl-view-record-btn" style={{ marginTop: '16px', width: '100%', padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                View Record <span style={{marginLeft: 6}}>↗</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg, link }) {
  return (
    <div className="pcl-stat-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', flex: '1 1 150px' }}>
      <div className="pcl-stat-icon-wrap" style={{ background: bg, padding: '8px', borderRadius: '50%' }}>{icon}</div>
      <div className="pcl-stat-info" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="pcl-stat-label" style={{ fontSize: '12px', color: '#64748b' }}>{label}</span>
        <span className="pcl-stat-value" style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>{value}</span>
        <span className="pcl-stat-link" style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer' }}>{link}</span>
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  let colorClass = '';
  if (type === 'Updated') colorClass = 'updated';
  if (type === 'Created') colorClass = 'created';
  if (type === 'Deleted') colorClass = 'deleted';
  return <span className={`pcl-badge ${colorClass}`} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', display: 'inline-block', background: colorClass === 'updated' ? '#fef3c7' : colorClass === 'created' ? '#d1fae5' : '#fee2e2', color: colorClass === 'updated' ? '#b45309' : colorClass === 'created' ? '#047857' : '#b91c1c' }}>{type}</span>;
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

function formatDesc(desc) {
  let formatted = desc;
  formatted = formatted.replace(/High/g, '<span class="pcl-hl-red" style="color:#b91c1c;font-weight:500;">High</span>');
  formatted = formatted.replace(/Medium/g, '<span class="pcl-hl-orange" style="color:#b45309;font-weight:500;">Medium</span>');
  formatted = formatted.replace(/In Progress/g, '<span class="pcl-hl-orange" style="color:#b45309;font-weight:500;">In Progress</span>');
  formatted = formatted.replace(/Completed/g, '<span class="pcl-hl-green" style="color:#047857;font-weight:500;">Completed</span>');
  return formatted;
}
import React, { useState, useEffect } from 'react';
import { 
  FileText, PlusCircle, Edit3, Trash2, Download, 
  Search, Filter, Eye, X, User
} from 'lucide-react';
import '../../styles/project-change-logs.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";
const getAuthToken = () => sessionStorage.getItem("authToken") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getAuthToken()}`
});

export default function ProjectChangeLogs({ project, progressData }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterModule, setFilterModule] = useState('All Modules');
  const [filterUser, setFilterUser] = useState('All Users');
  const actualProgress = progressData?.overall || 0;

  const [dbLogs, setDbLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!project?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/activity-logs`, { headers: authHeaders() });
        const allLogs = res.ok ? await res.json() : [];

        const isDraft = project.status === "DRAFT" || project.status === "Draft";
        const mlUrl = isDraft
          ? `${API_BASE}/milestone-drafts/by-project/${project.id}`
          : `${API_BASE}/milestone-live/by-project/${project.id}`;

        const mlRes = await fetch(mlUrl, { headers: authHeaders() });
        const mlData = mlRes.ok ? await mlRes.json() : [];
        const milestoneIds = mlData.map(m => m.id || m.drftMId || m.drft_m_id || m.mId);

        const projectLogs = allLogs.filter(log => {
          if (log.entityTyp === 'PROJECT' && String(log.entityId) === String(project.id)) {
            return true;
          }
          if (log.entityTyp === 'MILESTONE' && milestoneIds.includes(Number(log.entityId))) {
            return true;
          }
          return false;
        });

        const mappedDbLogs = projectLogs.map((log, index) => {
          const logDate = new Date(log.logDt);
          const dateStr = isNaN(logDate.getTime()) 
            ? 'N/A' 
            : logDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
          
          let hours = logDate.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const mins = String(logDate.getMinutes()).padStart(2, '0');
          const timeStr = `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;

          let module = 'Project';
          if (log.entityTyp === 'MILESTONE') module = 'Milestone';
          if (log.entityTyp === 'TASK') module = 'Task';

          const type = log.statusFrom === 'N/A' || !log.statusFrom ? 'Created' : 'Updated';
          const recordId = `${module.substring(0, 3).toUpperCase()}-${log.entityId}`;

          return {
            id: `db-${log.logId || index}`,
            dateStr,
            timeStr,
            timestamp: logDate.getTime(),
            module,
            type,
            whatChanged: 'Status',
            changedBy: 'System Admin',
            recordId,
            description: `${module} status changed from ${log.statusFrom} to ${log.statusTo}`,
            oldVal: log.statusFrom,
            newVal: log.statusTo
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

  const stats = {
    total: allMergedLogs.length,
    created: allMergedLogs.filter(l => l.type === 'Created').length,
    updated: allMergedLogs.filter(l => l.type === 'Updated').length,
    deleted: allMergedLogs.filter(l => l.type === 'Deleted').length,
    exported: 12
  };

  const uniqueTypes = ['All', ...new Set(allMergedLogs.map(l => l.type))];
  const uniqueModules = ['All Modules', ...new Set(allMergedLogs.map(l => l.module))];
  const uniqueUsers = ['All Users', ...new Set(allMergedLogs.map(l => l.changedBy))];

  const filteredLogs = allMergedLogs.filter(log => {
    // Dropdown filters
    if (filterType !== 'All' && log.type !== filterType) return false;
    if (filterModule !== 'All Modules' && log.module !== filterModule) return false;
    if (filterUser !== 'All Users' && log.changedBy !== filterUser) return false;

    // Search filter
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
    ].join('\\n');

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
      <div className="pcl-project-banner" style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', paddingBottom: '10px' }}>
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
          <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{project?.startDate || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>End Date</span>
          <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{project?.endDate || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
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
      <div className="pcl-filters-row">
        <div className="pcl-filter-group">
          <label>Change Type</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="pcl-filter-group">
          <label>Module</label>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}>
            {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="pcl-filter-group">
          <label>Changed By</label>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="pcl-filter-group pcl-date-group">
          <label>Date Range</label>
          <div className="pcl-date-input">
            <CalendarIcon />
            <span>{startDate.toLocaleDateString('en-GB').replace(/\//g, '-')} ~ {today.toLocaleDateString('en-GB').replace(/\//g, '-')}</span>
          </div>
        </div>
        
        <div className="pcl-filter-group pcl-search-group" style={{ marginLeft: 'auto' }}>
          <div className="pcl-search-input">
            <input 
              type="text" 
              placeholder="Search change logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} />
          </div>
          <button className="pcl-filter-btn"><Filter size={16} /> Filters</button>
          <button 
            className="pcl-filter-btn" 
            style={{ color: '#2563eb', borderColor: '#2563eb', display: 'flex', gap: '6px', alignItems: 'center' }}
            onClick={handleGenerateReport}
          >
            <Download size={16} /> Generate Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="pcl-stats-row">
        <StatCard icon={<FileText color="#3b82f6"/>} label="Total Changes" value={stats.total} bg="#eff6ff" link="View all" />
        <StatCard icon={<PlusCircle color="#10b981"/>} label="Created" value={stats.created} bg="#ecfdf5" link="View all" />
        <StatCard icon={<Edit3 color="#f59e0b"/>} label="Updated" value={stats.updated} bg="#fffbeb" link="View all" />
        <StatCard icon={<Trash2 color="#ef4444"/>} label="Deleted" value={stats.deleted} bg="#fef2f2" link="View all" />
        <StatCard icon={<Download color="#8b5cf6"/>} label="Exported" value={stats.exported} bg="#f5f3ff" link="View all" />
      </div>

      <div className="pcl-main-content">
        {/* Table Area */}
        <div className="pcl-table-card">
          <table className="pcl-table">
            <thead>
              <tr>
                <th>Date & Time ↓</th>
                <th>Module</th>
                <th>Change Type</th>
                <th>What Changed</th>
                <th>Changed By</th>
                <th>Record ID / Code</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} onClick={() => setSelectedRecord(log)} className={selectedRecord?.id === log.id ? 'active' : ''}>
                  <td>
                    <div className="pcl-td-date">{log.dateStr}</div>
                    <div className="pcl-td-time">{log.timeStr}</div>
                  </td>
                  <td>{log.module}</td>
                  <td><TypeBadge type={log.type} /></td>
                  <td>
                    <div className="pcl-user-badge-mini">
                      <div className="pcl-avatar-mini">{log.whatChanged.substring(0,2).toUpperCase()}</div>
                      <span>{log.whatChanged}</span>
                    </div>
                  </td>
                  <td>{log.changedBy}</td>
                  <td>{log.recordId}</td>
                  <td className="pcl-td-desc" dangerouslySetInnerHTML={{__html: formatDesc(log.description)}}></td>
                  <td><button className="pcl-action-btn"><Eye size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pcl-pagination">
            <span>Showing 1 to {filteredLogs.length} of {filteredLogs.length} entries</span>
            <div className="pcl-page-controls">
              <button>&lt;</button>
              <button className="active">1</button>
              <button>2</button>
              <button>3</button>
              <button>4</button>
              <button>5</button>
              <span>...</span>
              <button>20</button>
              <button>&gt;</button>
            </div>
          </div>
        </div>

        {/* Right Sidebar Details */}
        {selectedRecord && (
          <div className="pcl-sidebar">
            <div className="pcl-sidebar-header">
              <h3>Change Details</h3>
              <button onClick={() => setSelectedRecord(null)}><X size={18} /></button>
            </div>
            <div className="pcl-sidebar-body">
              <div className="pcl-sb-row">
                <label>Date & Time</label>
                <div className="pcl-sb-val">{selectedRecord.dateStr} {selectedRecord.timeStr}</div>
              </div>
              <div className="pcl-sb-row">
                <label>Module</label>
                <div className="pcl-sb-val">{selectedRecord.module}</div>
              </div>
              <div className="pcl-sb-row">
                <label>Change Type</label>
                <TypeBadge type={selectedRecord.type} />
              </div>
              
              <div className="pcl-sb-divider"></div>

              <div className="pcl-sb-row">
                <label>Changed By</label>
                <div className="pcl-user-badge">
                  <div className="pcl-avatar">{selectedRecord.changedBy.substring(0,2).toUpperCase()}</div>
                  <div className="pcl-user-info">
                    <span className="pcl-user-name">{selectedRecord.changedBy}</span>
                    <span className="pcl-user-role">{selectedRecord.changedBy === projectManager ? 'Project Manager' : 'Team Member'}</span>
                  </div>
                </div>
              </div>

              <div className="pcl-sb-row mt-4">
                <label>Record ID / Code</label>
                <div className="pcl-sb-val bold">{selectedRecord.recordId}</div>
              </div>
              <div className="pcl-sb-row mt-4">
                <label>Field Changed</label>
                <div className="pcl-sb-val bold">{selectedRecord.whatChanged === selectedRecord.changedBy ? 'Record' : selectedRecord.whatChanged}</div>
              </div>

              <div className="pcl-sb-diff">
                <div className="pcl-diff-col">
                  <label>Old Value</label>
                  <div className="pcl-diff-val">{selectedRecord.oldVal}</div>
                </div>
                <div className="pcl-diff-col">
                  <label>New Value</label>
                  <div className="pcl-diff-val">{selectedRecord.newVal}</div>
                </div>
              </div>

              <div className="pcl-sb-row mt-4">
                <label>Description</label>
                <div className="pcl-sb-val">{selectedRecord.description}</div>
              </div>

              <div className="pcl-sb-row mt-4">
                <label>Additional Info</label>
                <div className="pcl-sb-val text-sm">Update made from {selectedRecord.module} Details screen.</div>
              </div>

              <button className="pcl-view-record-btn">
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
    <div className="pcl-stat-card">
      <div className="pcl-stat-icon-wrap" style={{ background: bg }}>{icon}</div>
      <div className="pcl-stat-info">
        <span className="pcl-stat-label">{label}</span>
        <span className="pcl-stat-value">{value}</span>
        <span className="pcl-stat-link">{link}</span>
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  let colorClass = '';
  if (type === 'Updated') colorClass = 'updated';
  if (type === 'Created') colorClass = 'created';
  if (type === 'Deleted') colorClass = 'deleted';
  return <span className={`pcl-badge ${colorClass}`}>{type}</span>;
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
  // Highlight "High to Medium", dates, etc.
  let formatted = desc;
  formatted = formatted.replace(/High/g, '<span class="pcl-hl-red">High</span>');
  formatted = formatted.replace(/Medium/g, '<span class="pcl-hl-orange">Medium</span>');
  formatted = formatted.replace(/In Progress/g, '<span class="pcl-hl-orange">In Progress</span>');
  formatted = formatted.replace(/Completed/g, '<span class="pcl-hl-green">Completed</span>');
  return formatted;
}

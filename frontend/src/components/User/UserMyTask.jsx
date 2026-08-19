import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../styles/UserMyTask.css';

const HorizontalProgress = ({ pct, color }) => (
  <div className="ut-horiz-prog-wrap">
    <span className="ut-horiz-pct">{pct}%</span>
    <div className="ut-horiz-bar-bg">
      <div className="ut-horiz-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }}></div>
    </div>
  </div>
);

const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr || dateStr === "N/A") return "N/A";
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year.length === 4) {
        return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

const UserMyTask = ({ selectedProject, userTasks = [] }) => {
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [milestoneFilter, setMilestoneFilter] = useState("All Milestones");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const tasksPerPage = 5;

  const projectMilestoneIds = (selectedProject?.milestones || []).map(m => m.mId || m.mid || m.id);
  const projectUserTasks = userTasks.filter(t => {
    const tMId = t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id;
    return projectMilestoneIds.includes(tMId);
  });

  const mappedTasks = projectUserTasks.map(t => {
    const tMId = t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id;
    const milestoneObj = selectedProject?.milestones?.find(m => (m.mId || m.mid || m.id) === tMId);
    const milestoneName = milestoneObj ? milestoneObj.name : "Unknown Milestone";
    const statusVal = (t.taskSts || t.tasksts || "").toUpperCase();
    const subSts = (t.subStatus || t.substatus || "").toUpperCase();
    const isRework = subSts === 'REWORK' || statusVal === 'REWORK';
    const rawEnd = t.endDt || t.enddt;
    let isTaskOverdue = false;
    if (statusVal !== 'COMPLETED' && statusVal !== 'CLOSED' && rawEnd && rawEnd !== 'N/A') {
      const d = new Date(rawEnd);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d < today) isTaskOverdue = true;
      }
    }

    let displayStatus = "Not Started";
    if (statusVal === 'COMPLETED' || statusVal === 'CLOSED') displayStatus = "Closed";
    else if (isTaskOverdue) displayStatus = "Overdue";
    else if (statusVal === 'WIP' || isRework) displayStatus = "In Progress";
    else if (statusVal === 'SUBMIT_REVIEW' || statusVal === 'UNDER_REVIEW') displayStatus = "In Progress";
    else if (statusVal === 'OPEN') displayStatus = "Pending";

    const progressVal = (statusVal === 'COMPLETED' || statusVal === 'CLOSED') ? 100 : (statusVal === 'WIP' || statusVal === 'IN_PROGRESS') ? 50 : (statusVal === 'SUBMIT_REVIEW' || statusVal === 'UNDER_REVIEW') ? 80 : 0;

    return {
      code: t.taskCd || t.taskcd || `TSK-${t.taskId}`,
      name: t.taskNm || t.tasknm,
      milestone: milestoneName,
      milestoneId: tMId,
      priority: t.priority || "Medium",
      due: formatDateDDMMYYYY(t.endDt || t.enddt || "N/A"),
      status: displayStatus,
      progress: progressVal,
      isOverdue: isTaskOverdue
    };
  });

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, milestoneFilter, searchQuery]);

  const filteredTasks = mappedTasks.filter(t => {
    const matchStatus = statusFilter === "All Status" || t.status === statusFilter;
    const matchPriority = priorityFilter === "All Priority" || t.priority === priorityFilter;
    const matchMilestone = milestoneFilter === "All Milestones" || String(t.milestoneId) === String(milestoneFilter);
    const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchPriority && matchMilestone && matchSearch;
  });

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  const pagedTasks = filteredTasks.slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage);

  const getStatusClass = (status) => {
    const s = String(status || '').toUpperCase().trim();
    switch (s) {
      case 'CLOSED':
      case 'COMPLETED': return 'ut-status-completed';
      case 'OVERDUE': return 'ut-status-overdue';
      case 'IN PROGRESS': return 'ut-status-inprogress';
      case 'NOT STARTED': return 'ut-status-notstarted';
      case 'PENDING': return 'ut-status-pending';
      case 'ATMOST CRITICAL':
      case 'ATMOST_CRITICAL': return 'ut-status-atmost-critical';
      case 'CRITICAL': return 'ut-status-critical';
      case 'HIGH': return 'ut-status-high';
      case 'NORMAL': return 'ut-status-normal';
      case 'MEDIUM': return 'ut-status-medium';
      case 'LOW': return 'ut-status-low';
      default: return 'ut-status-default';
    }
  };

  return (
    <div className="ut-container">
      <div className="ut-section">
        {/* Header */}
        <div className="ut-header-row">
          <div className="ut-header">
            <CalendarIcon size={16} className="ut-header-icon" />
            <span className="ut-header-title">TASKS ASSIGNED TO ME</span>
          </div>
          <button className="ut-export-btn">
            <Download size={14} /> Export
          </button>
        </div>

        {/* Filters */}
        <div className="ut-filters-row">
          <div className="ut-filter-group">
            <label className="ut-filter-label">Status</label>
            <select className="ut-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All Status">All Status</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Not Started">Not Started</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          
          <div className="ut-filter-group">
            <label className="ut-filter-label">Priority</label>
            <select className="ut-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="All Priority">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="ut-filter-group">
            <label className="ut-filter-label">Milestone</label>
            <select className="ut-select" value={milestoneFilter} onChange={e => setMilestoneFilter(e.target.value)}>
              <option value="All Milestones">All Milestones</option>
              {(selectedProject?.milestones || []).map(m => (
                <option key={m.mId} value={m.mId}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="ut-search-group">
            <Search size={14} className="ut-search-icon" />
            <input type="text" className="ut-search-input" placeholder="Search tasks..." 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="ut-table-container">
          <table className="ut-table">
            <thead>
              <tr>
                <th>Task Code</th>
                <th>Task Name</th>
                <th>Milestone</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {pagedTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    No tasks found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                pagedTasks.map((t, idx) => (
                  <tr key={idx}>
                    <td><strong>{t.code}</strong></td>
                    <td>{t.name}</td>
                    <td>{t.milestone}</td>
                    <td>{t.status !== 'Closed' && <span className={`ut-badge ${getStatusClass(t.priority)}`}>{t.priority}</span>}</td>
                    <td>{t.due}</td>
                    <td><span className={`ut-badge ${getStatusClass(t.status)}`}>{t.status}</span></td>
                    <td>
                      <HorizontalProgress pct={t.progress} color={t.progress > 0 ? "#195dfa" : "#d1d5db"} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTasks.length > 0 && (
          <div className="ut-pagination">
            <span>Showing {((currentPage - 1) * tasksPerPage) + 1} to {Math.min(currentPage * tasksPerPage, filteredTasks.length)} of {filteredTasks.length} tasks</span>
            <div className="ut-pag-controls">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <span key={idx} className={`ut-pag-page ${currentPage === idx + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(idx + 1)}>
                  {idx + 1}
                </span>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMyTask;

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
    const progressVal = statusVal === 'COMPLETED' ? 100 : statusVal === 'WIP' ? 50 : (statusVal === 'SUBMIT_REVIEW' || statusVal === 'UNDER_REVIEW') ? 80 : 0;
    
    let displayStatus = "Not Started";
    if (statusVal === 'COMPLETED') displayStatus = "Completed";
    else if (statusVal === 'WIP') displayStatus = "In Progress";
    else if (statusVal === 'SUBMIT_REVIEW' || statusVal === 'UNDER_REVIEW') displayStatus = "In Progress";
    else if (statusVal === 'OPEN' || statusVal === 'REWORK') displayStatus = "Pending";

    return {
      code: t.taskCd || t.taskcd || `TSK-${t.taskId}`,
      name: t.taskNm || t.tasknm,
      milestone: milestoneName,
      milestoneId: tMId,
      priority: t.priority || "Medium",
      due: t.endDt || t.enddt || "N/A",
      status: displayStatus,
      progress: progressVal
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
    switch (status) {
      case 'Completed': return 'ut-status-completed';
      case 'In Progress': return 'ut-status-inprogress';
      case 'Not Started': return 'ut-status-notstarted';
      case 'Pending': return 'ut-status-pending';
      case 'High': return 'ut-status-high';
      case 'Medium': return 'ut-status-medium';
      case 'Low': return 'ut-status-low';
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
              <option value="Completed">Completed</option>
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
                    <td><span className={`ut-badge ${getStatusClass(t.priority)}`}>{t.priority}</span></td>
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

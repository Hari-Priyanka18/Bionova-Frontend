import React, { useState, useEffect } from 'react';
import { Briefcase, Calendar as CalendarIcon, ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../styles/UserMilestone.css';

const MilestoneProgress = ({ pct, color }) => {
  const size = 44, stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e9ecef" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fontSize: "11px", fontWeight: 700, fill: "#0d1126" }}>
        {pct}%
      </text>
    </svg>
  );
};

const HorizontalProgress = ({ pct, color }) => (
  <div className="um-horiz-prog-wrap">
    <span className="um-horiz-pct">{pct}%</span>
    <div className="um-horiz-bar-bg">
      <div className="um-horiz-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }}></div>
    </div>
  </div>
);

const UserMilestone = ({ selectedProject, userTasks = [] }) => {
  const milestones = (selectedProject?.milestones || []).map((m, i) => {
    const mId = m.mId || m.mid || m.id;
    const milestoneTasks = userTasks.filter(t => {
      const tMId = t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id;
      return String(tMId) === String(mId);
    });
    const assignedCount = milestoneTasks.length;
    const completedCount = milestoneTasks.filter(t => (t.taskSts || t.tasksts || "").toUpperCase() === 'COMPLETED').length;
    const progressVal = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
    
    let statusVal = "Not Started";
    if (progressVal === 100) statusVal = "Completed";
    else if (progressVal > 0) statusVal = "In Progress";

    return {
      id: mId,
      idx: i + 1,
      name: m.name,
      desc: m.desc || `Details for ${m.name}`,
      start: m.start || "N/A",
      end: m.date || "N/A",
      progress: progressVal,
      assigned: assignedCount,
      open: assignedCount - completedCount,
      status: statusVal,
      color: statusVal === "Completed" ? "#10b981" : statusVal === "In Progress" ? "#195dfa" : "#9ca3af"
    };
  });

  const [selectedMilestone, setSelectedMilestone] = useState(null);

  useEffect(() => {
    if (milestones.length > 0) {
      setSelectedMilestone(milestones[0].id);
    } else {
      setSelectedMilestone(null);
    }
  }, [selectedProject?.id]);

  const selectedMilestoneTasks = userTasks.filter(t => {
    const tMId = t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id;
    return String(tMId) === String(selectedMilestone);
  });
  const tasks = selectedMilestoneTasks.map(t => {
    const statusVal = (t.taskSts || t.tasksts || "").toUpperCase();
    const progressVal = statusVal === 'COMPLETED' ? 100 : statusVal === 'WIP' ? 50 : (statusVal === 'SUBMIT_REVIEW' || statusVal === 'UNDER_REVIEW') ? 80 : 0;
    return {
      code: t.taskCd || t.taskcd || `TSK-${t.taskId}`,
      name: t.taskNm || t.tasknm,
      assigned: "You",
      priority: t.priority || "Medium",
      due: t.endDt || t.enddt || "N/A",
      status: t.taskSts || t.tasksts || "OPEN",
      progress: progressVal
    };
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-inprogress';
      case 'Not Started': return 'status-notstarted';
      case 'Pending': return 'status-pending';
      case 'High': return 'status-high';
      case 'Medium': return 'status-medium';
      default: return 'status-default';
    }
  };

  return (
    <div className="um-container">
      {/* Top Section */}
      <div className="um-section">
        <div className="um-header">
          <Briefcase size={16} className="um-header-icon" />
          <span className="um-header-title">PROJECT MILESTONES</span>
        </div>
        
        <div className="um-table-container">
          <table className="um-table">
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Description</th>
                <th>Start Date</th>
                <th>Target Date</th>
                <th>Progress</th>
                <th>Tasks Assigned</th>
                <th>Open Tasks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map(m => (
                <tr key={m.id} 
                    className={selectedMilestone === m.id ? "selected-row" : ""}
                    onClick={() => setSelectedMilestone(m.id)}>
                  <td>
                    <div className="um-milestone-name-col">
                      <div className={`um-milestone-circle ${m.status === 'Completed' ? 'completed' : m.status === 'Not Started' ? 'not-started' : 'in-progress'}`}>
                        {m.status === 'Completed' ? <Check size={12} strokeWidth={4} /> : m.id}
                      </div>
                      <div className="um-mname-text">
                        <span className="um-mname-num">{m.id}</span>
                        <span className="um-mname">{m.name}</span>
                      </div>
                    </div>
                  </td>
                  <td><div className="um-desc">{m.desc}</div></td>
                  <td>{m.start}</td>
                  <td>{m.end}</td>
                  <td>
                    <MilestoneProgress pct={m.progress} color={m.color} />
                  </td>
                  <td className="um-center-txt"><strong>{m.assigned}</strong></td>
                  <td className="um-center-txt"><strong>{m.open}</strong></td>
                  <td>
                    <span className={`um-badge ${getStatusClass(m.status)}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="um-section">
        <div className="um-header-row">
          <div className="um-header">
            <CalendarIcon size={16} className="um-header-icon" />
            <span className="um-header-title">TASKS ASSIGNED FROM THIS MILESTONE</span>
          </div>
          <div className="um-header-right">
            <span className="um-milestone-ref">Milestone: {milestones.find(m => m.id === selectedMilestone)?.name}</span>
            <button className="um-view-all">View all tasks <ArrowRight size={14} /></button>
          </div>
        </div>

        <div className="um-table-container">
          <table className="um-table">
            <thead>
              <tr>
                <th>Task Code</th>
                <th>Task Name</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, idx) => (
                <tr key={idx}>
                  <td><strong>{t.code}</strong></td>
                  <td>{t.name}</td>
                  <td><span className="um-link">{t.assigned}</span></td>
                  <td><span className={`um-badge ${getStatusClass(t.priority)}`}>{t.priority}</span></td>
                  <td>{t.due}</td>
                  <td><span className={`um-badge ${getStatusClass(t.status)}`}>{t.status}</span></td>
                  <td>
                    <HorizontalProgress pct={t.progress} color={t.progress > 0 ? "#195dfa" : "#d1d5db"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="um-pagination">
          <span>Showing 1 to {tasks.length} of {tasks.length} tasks</span>
          <div className="um-pag-controls">
            <button disabled><ChevronLeft size={14} /></button>
            <span className="um-pag-page active">1</span>
            <button disabled><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserMilestone;

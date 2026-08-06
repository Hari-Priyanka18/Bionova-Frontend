import React, { useState, useEffect } from 'react';
import { Briefcase, Calendar as CalendarIcon, ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../styles/UserMilestone.css';

const HorizontalProgress = ({ pct, color }) => (
  <div className="um-horiz-prog-wrap">
    <span className="um-horiz-pct">{pct}%</span>
    <div className="um-horiz-bar-bg">
      <div className="um-horiz-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }}></div>
    </div>
  </div>
);

const UserMilestone = ({ selectedProject, userTasks = [], allTasks = [], employees = [], profile = null }) => {
  const getTaskStatusStr = (t) => {
    if (!t) return '';
    let sts = t.taskSts ?? t.task_sts ?? t.status ?? t.tasksts;
    if (!sts) return '';
    if (typeof sts === 'object') {
      sts = sts.statusNm || sts.status_nm || sts.name || sts.status || '';
    }
    return String(sts).trim().toUpperCase();
  };

  const milestones = (selectedProject?.milestones || []).map((m, i) => {
    const mId = m.mId || m.mid || m.id;
    const milestoneTasks = userTasks.filter(t => {
      const tMId = t.mId || t.mid || t.milestoneId || t.drftMId || t.drft_m_id;
      return String(tMId) === String(mId);
    });
    const assignedCount = milestoneTasks.length;
    const completedCount = milestoneTasks.filter(t => {
      const s = getTaskStatusStr(t);
      return s === 'COMPLETED' || s === 'CLOSED' || s === 'DONE' || s === 'COMPLETE';
    }).length;

    const totalProgress = milestoneTasks.reduce((sum, t) => {
      const statusVal = getTaskStatusStr(t);
      return sum + ((statusVal === 'COMPLETED' || statusVal === 'CLOSED' || statusVal === 'DONE' || statusVal === 'COMPLETE') ? 100 : (statusVal === 'WIP' || statusVal === 'IN_PROGRESS') ? 50 : (statusVal === 'SUBMIT_REVIEW' || statusVal === 'UNDER_REVIEW') ? 80 : 0);
    }, 0);
    const progressVal = assignedCount > 0 ? Math.round(totalProgress / assignedCount) : 0;

    let statusVal = m.status || "Not Started";
    if (assignedCount > 0) {
      const allCompleted = milestoneTasks.every(t => {
        const s = getTaskStatusStr(t);
        return s === 'COMPLETED' || s === 'CLOSED' || s === 'DONE' || s === 'COMPLETE';
      });
      const anyStarted = milestoneTasks.some(t => {
        const s = getTaskStatusStr(t);
        return s === 'WIP' || s === 'IN_PROGRESS' || s === 'UNDER_REVIEW' || s === 'SUBMIT_REVIEW';
      });

      if (allCompleted) {
        statusVal = "Closed";
      } else if (anyStarted || progressVal > 0) {
        statusVal = "In Progress";
      } else {
        statusVal = "Not Started";
      }
    }

    return {
      id: mId,
      idx: i + 1,
      code: m.code || "",
      name: m.name,
      desc: m.desc || `Details for ${m.name}`,
      start: m.start || "N/A",
      end: m.date || "N/A",
      progress: progressVal,
      assigned: assignedCount,
      open: assignedCount - completedCount,
      status: statusVal,
      color: (statusVal === "Closed" || statusVal === "Completed") ? "#10b981" : statusVal === "In Progress" ? "#195dfa" : "#9ca3af"
    };
  }).filter(m => m.assigned > 0);

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
    const progressVal = (statusVal === 'COMPLETED' || statusVal === 'CLOSED') ? 100 : statusVal === 'WIP' ? 50 : (statusVal === 'SUBMIT_REVIEW' || statusVal === 'UNDER_REVIEW') ? 80 : 0;
    
    let assigneeName = "Unassigned";
    const assignedId = t.empId || t.empid;
    if (assignedId) {
      if (profile && assignedId === profile.empId) {
        assigneeName = "You";
      } else {
        const emp = employees.find(e => (e.empId || e.empid) === assignedId);
        if (emp) {
          assigneeName = `${emp.firstName || emp.fstNm || ""} ${emp.lastName || emp.lstNm || ""}`.trim();
        } else {
          assigneeName = `Employee #${assignedId}`;
        }
      }
    }

    return {
      code: t.taskCd || t.taskcd || `TSK-${t.taskId}`,
      name: t.taskNm || t.tasknm,
      assigned: assigneeName,
      priority: t.priority || "Medium",
      due: t.endDt || t.enddt || "N/A",
      status: t.taskSts || t.tasksts || "OPEN",
      progress: progressVal
    };
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'Closed':
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
                      <div className={`um-milestone-circle ${m.status === 'Closed' || m.status === 'Completed' ? 'completed' : m.status === 'Not Started' ? 'not-started' : 'in-progress'}`}>
                        {m.status === 'Closed' || m.status === 'Completed' ? <Check size={12} strokeWidth={4} /> : m.idx}
                      </div>
                      <div className="um-mname-text" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="um-mname" style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{m.name}</span>
                        {m.code && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#475569', 
                              letterSpacing: '0.5px',
                              fontWeight: '600'
                            }}>{m.code}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><div className="um-desc">{m.desc}</div></td>
                  <td>{m.start}</td>
                  <td>{m.end}</td>
                  <td>
                    <HorizontalProgress pct={m.progress} color={m.color} />
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

    </div>
  );
};

export default UserMilestone;

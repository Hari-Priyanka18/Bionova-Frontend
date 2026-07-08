import React from 'react';
import { BarChart2, Users, CheckCircle2, PlayCircle, Clock, Calendar } from 'lucide-react';
import '../../styles/UserOverview.css';

// Donut chart for project progress panel
const DonutChart = ({ completedPct, inProgressPct, yetToStartPct, overallPct }) => {
  const size = 130, stroke = 18;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const segments = [
    { value: completedPct, color: "#10b981" },
    { value: inProgressPct, color: "#3b82f6" },
    { value: yetToStartPct, color: "#f59e0b" }
  ];
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {segments.map((seg, i) => {
        const dash = (seg.value / 100) * circ;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset * circ / 100} strokeLinecap="butt" />
        );
        offset += seg.value;
        return el;
      })}
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fontSize: "22px", fontWeight: 800, fill: "#0d1126" }}>
        {overallPct}%
      </text>
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fontSize: "11px", fill: "#6b7280" }}>
        Completed
      </text>
    </svg>
  );
};

const UserOverview = ({ selectedProject }) => {
  const total = selectedProject.taskSummary?.assigned || 0;
  const completedCount = selectedProject.taskSummary?.completed || 0;
  const wipCount = selectedProject.taskSummary?.inProgress || 0;
  const openCount = selectedProject.taskSummary?.openTasks || 0;
  const reviewCount = Math.max(0, total - completedCount - wipCount - openCount);

  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round(((wipCount + reviewCount) / total) * 100) : 0;
  const yetToStartPct = total > 0 ? Math.max(0, 100 - completedPct - inProgressPct) : 100;

  return (
    <div className="mp-overview-grid">
      {/* Project Information */}
      <div className="mp-overview-card">
        <div className="mp-card-title"><BarChart2 size={15} /> PROJECT INFORMATION</div>
        <table className="mp-info-table">
          <tbody>
            <tr><td>Project Code</td><td>{selectedProject.code}</td></tr>
            <tr><td>Project Type</td><td>{selectedProject.type}</td></tr>
            <tr><td>Location</td><td>{selectedProject.location}</td></tr>
            <tr><td>Client</td><td>{selectedProject.client}</td></tr>
            <tr><td colSpan={2} style={{ paddingTop: 10 }}>
              <div className="mp-info-desc-label">Description</div>
              <div className="mp-info-desc">{selectedProject.description}</div>
            </td></tr>
          </tbody>
        </table>
      </div>

      {/* My Role */}
      <div className="mp-overview-card">
        <div className="mp-card-title"><Users size={15} /> MY ROLE</div>
        <table className="mp-info-table">
          <tbody>
            <tr><td>Role</td><td>{selectedProject.role}</td></tr>
            <tr><td>Department</td><td>{selectedProject.department}</td></tr>
            <tr><td>Reporting To</td><td>
              <div>{selectedProject.reportingTo}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Project Manager</div>
            </td></tr>
          </tbody>
        </table>
      </div>

      {/* Project Progress */}
      <div className="mp-overview-card">
        <div className="mp-card-title"><BarChart2 size={15} /> PROJECT PROGRESS</div>
        <div className="mp-progress-chart-wrap">
          <DonutChart completedPct={completedPct} inProgressPct={inProgressPct} yetToStartPct={yetToStartPct} overallPct={selectedProject.progress} />
        </div>
        <div className="mp-progress-legend">
          <div className="mp-legend-item"><span style={{ background: "#10b981" }}></span> Completed <strong style={{ color: "#10b981" }}>{completedPct}%</strong></div>
          <div className="mp-legend-item"><span style={{ background: "#3b82f6" }}></span> In Progress <strong style={{ color: "#3b82f6" }}>{inProgressPct}%</strong></div>
          <div className="mp-legend-item"><span style={{ background: "#f59e0b" }}></span> Yet to Start <strong style={{ color: "#f59e0b" }}>{yetToStartPct}%</strong></div>
        </div>
      </div>

      {/* Task Summary */}
      <div className="mp-overview-card">
        <div className="mp-card-title"><CheckCircle2 size={15} /> TASK SUMMARY</div>
        <div className="mp-task-summary-grid">
          <div className="mp-task-stat">
            <div className="mp-task-icon mp-icon-blue"><CheckCircle2 size={20} /></div>
            <div className="mp-task-num">{selectedProject.taskSummary.assigned}</div>
            <div className="mp-task-label">Tasks Assigned</div>
          </div>
          <div className="mp-task-stat">
            <div className="mp-task-icon mp-icon-green"><PlayCircle size={20} /></div>
            <div className="mp-task-num">{selectedProject.taskSummary.inProgress}</div>
            <div className="mp-task-label">In Progress</div>
          </div>
          <div className="mp-task-stat">
            <div className="mp-task-icon mp-icon-orange"><Clock size={20} /></div>
            <div className="mp-task-num">{selectedProject.taskSummary.openTasks}</div>
            <div className="mp-task-label">Open Tasks</div>
          </div>
          <div className="mp-task-stat">
            <div className="mp-task-icon mp-icon-red"><CheckCircle2 size={20} /></div>
            <div className="mp-task-num">{selectedProject.taskSummary.completed}</div>
            <div className="mp-task-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Upcoming Milestones */}
      <div className="mp-overview-card mp-milestones-card">
        <div className="mp-card-title-row">
          <div className="mp-card-title"><Calendar size={15} /> UPCOMING MILESTONES</div>
          <button className="mp-view-all-btn">View all</button>
        </div>
        <table className="mp-milestone-table">
          <tbody>
            {selectedProject.milestones.map((m, i) => (
              <tr key={i}>
                <td>{m.name}</td>
                <td>{m.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserOverview;

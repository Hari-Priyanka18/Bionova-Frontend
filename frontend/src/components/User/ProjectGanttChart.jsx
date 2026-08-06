import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomOut, ZoomIn, Calendar, SlidersHorizontal, ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';
import '../../styles/gantt-chart.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";
const getAuthToken = () => sessionStorage.getItem("authToken") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getAuthToken()}`
});

/* ═══ Status colour map ═══ */
const SC = {
  'Completed': { bar: '#10b981', bg: '#d1fae5' },
  'In Progress': { bar: '#3b82f6', bg: '#dbeafe' },
  'Not Started': { bar: '#f97316', bg: '#ffedd5' },
  'Overdue': { bar: '#ef4444', bg: '#fee2e2' },
};

/* Row height — bigger when baseline is ON (2 bars per row) */
const ROW_H_NORMAL = 38;
const ROW_H_BASELINE = 56;

export default function ProjectGanttChart({ project, userRole, compact = false }) {
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState('All');
  const [groupBy, setGroupBy] = useState('Milestone');
  const [filterSt, setFilterSt] = useState('All');
  const [baseline, setBaseline] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const toggleExpand = (id, type = 'milestone') => {
    if (type === 'project') {
      setExpandedProjects(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setExpandedMilestones(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  // NEW: Expand / collapse all projects and milestones
  const toggleExpandAll = () => {
    // Collect all project and milestone IDs from the original rows (before filtering)
    const allProjectIds = ganttRows.filter(r => r.type === 'project').map(r => r.id);
    const allMilestoneIds = ganttRows.filter(r => r.type === 'milestone').map(r => r.id);

    const allProjectsExpanded = allProjectIds.length === 0 || allProjectIds.every(id => expandedProjects.has(id));
    const allMilestonesExpanded = allMilestoneIds.length === 0 || allMilestoneIds.every(id => expandedMilestones.has(id));

    if (allProjectsExpanded && allMilestonesExpanded) {
      // Collapse all
      setExpandedProjects(new Set());
      setExpandedMilestones(new Set());
    } else {
      // Expand all
      setExpandedProjects(new Set(allProjectIds));
      setExpandedMilestones(new Set(allMilestoneIds));
    }
  };

  const [loading, setLoading] = useState(false);
  const [ganttRows, setGanttRows] = useState([]);
  const [ganttDeps, setGanttDeps] = useState([]);
  const [timelineStart, setTimelineStart] = useState(new Date());
  const [months, setMonths] = useState([]);

  // Dynamic marker line
  const [markerOff, setMarkerOff] = useState(null);

  const tableBodyRef = useRef(null);
  const timelineRef = useRef(null);
  const syncingScroll = useRef(false);

  const DW = 14 * (zoom / 100);
  const ROW_H = baseline ? ROW_H_BASELINE : ROW_H_NORMAL;

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate(), 12, 0, 0);
    const s = String(dateStr).trim();
    if (!s) return null;

    const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 12, 0, 0);
    }

    const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      return new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]), 12, 0, 0);
    }

    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  };

  /* Helper to format Date string to DD-MMM-YY */
  const formatDateString = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = parseLocalDate(dateStr);
    if (!d) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  /* Helper to calculate day difference */
  const getDayOffset = (dateStr, tStart) => {
    if (!dateStr || !tStart) return 0;
    const dTarget = parseLocalDate(dateStr);
    if (!dTarget) return 0;
    const dStart = new Date(tStart.getFullYear(), tStart.getMonth(), tStart.getDate(), 12, 0, 0);
    const diffTime = dTarget - dStart;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const getDurationDays = (startStr, endStr) => {
    if (!startStr || !endStr) return 1;
    const sMid = parseLocalDate(startStr);
    const eMid = parseLocalDate(endStr);
    if (!sMid || !eMid) return 1;
    const diffTime = eMid - sMid;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays >= 1 ? diffDays : 1;
  };

  const getWeeklyDays = (year, month) => {
    const days = [];
    const numDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= numDays; i++) {
      const d = new Date(year, month, i);
      if (d.getDay() === 1) days.push(i);
    }
    if (days.length === 0) days.push(1);
    return days;
  };

  const calculateTimeline = (items) => {
    let minDate = null;
    let maxDate = null;

    items.forEach(item => {
      if (item.startDate) {
        const start = parseLocalDate(item.startDate);
        if (start && (!minDate || start < minDate)) minDate = start;
      }
      if (item.endDate) {
        const end = parseLocalDate(item.endDate);
        if (end && (!maxDate || end > maxDate)) maxDate = end;
      }
    });

    if (!minDate) minDate = new Date();
    if (!maxDate) maxDate = new Date(minDate.getTime() + 180 * 24 * 60 * 60 * 1000);

    const tStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1, 12, 0, 0);

    let monthCount = (maxDate.getFullYear() - tStart.getFullYear()) * 12 + (maxDate.getMonth() - tStart.getMonth()) + 2;
    if (monthCount < 6) monthCount = 6;
    if (monthCount > 36) monthCount = 36;

    const list = [];
    let current = new Date(tStart);
    for (let i = 0; i < monthCount; i++) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const label = current.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const days = new Date(year, month + 1, 0).getDate();
      list.push({ label, days, year, month });
      current.setMonth(current.getMonth() + 1);
    }

    return { timelineStart: tStart, monthsList: list };
  };

  const mapItemsToGanttRows = (items, tStart) => {
    const projectItem = items.find(i => i.type === 'project');
    const milestones = items.filter(i => i.type === 'milestone').sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    const result = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mapStatus = (item) => {
      const s = (item.status || 'Not Started').toUpperCase();
      let statusLabel = 'Not Started';
      if (s === 'COMPLETED' || s === 'CLOSED') statusLabel = 'Completed';
      else if (s === 'WIP' || s === 'IN_PROGRESS' || s === 'LIVE' || s === 'UNDER_REVIEW' || s === 'SUBMIT_REVIEW') statusLabel = 'In Progress';
      else if (s === 'HOLD') statusLabel = 'Not Started';

      if (statusLabel !== 'Completed' && item.endDate) {
        const end = new Date(item.endDate);
        if (!isNaN(end.getTime()) && end < today) {
          statusLabel = 'Overdue';
        }
      }
      return statusLabel;
    };

    if (projectItem) {
      const pOff = getDayOffset(projectItem.startDate, tStart);
      const pW = getDurationDays(projectItem.startDate, projectItem.endDate);
      const paOff = getDayOffset(projectItem.plannedStartDate || projectItem.startDate, tStart);
      const paW = getDurationDays(projectItem.plannedStartDate || projectItem.startDate, projectItem.plannedEndDate || projectItem.endDate);

      result.push({
        id: projectItem.id,
        type: 'project',
        name: projectItem.name,
        dur: pW,
        start: formatDateString(projectItem.startDate),
        end: formatDateString(projectItem.endDate),
        prog: Math.round((projectItem.progress || 0) * 100),
        status: mapStatus(projectItem),
        off: pOff,
        w: pW,
        aOff: paOff,
        aW: paW,
        aProg: Math.round((projectItem.progress || 0) * 100)
      });
    }

    milestones.forEach((ms, msIdx) => {
      const msNum = msIdx + 1;
      const msOff = getDayOffset(ms.startDate, tStart);
      const msW = getDurationDays(ms.startDate, ms.endDate);
      const msaOff = getDayOffset(ms.plannedStartDate || ms.startDate, tStart);
      const msaW = getDurationDays(ms.plannedStartDate || ms.startDate, ms.plannedEndDate || ms.endDate);

      result.push({
        id: ms.id,
        type: 'milestone',
        name: ms.name,
        dur: msW,
        start: formatDateString(ms.startDate),
        end: formatDateString(ms.endDate),
        prog: Math.round((ms.progress || 0) * 100),
        status: mapStatus(ms),
        off: msOff,
        w: msW,
        aOff: msaOff,
        aW: msaW,
        aProg: Math.round((ms.progress || 0) * 100),
        displayId: String(msNum),
        colorIdx: msIdx,
        parentPrj: projectItem ? projectItem.id : 'unknown'
      });

      const msTasks = items.filter(i => i.type === 'task' && i.parent === ms.id).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      msTasks.forEach((tsk, tskIdx) => {
        const tOff = getDayOffset(tsk.startDate, tStart);
        const tW = getDurationDays(tsk.startDate, tsk.endDate);
        const taOff = getDayOffset(tsk.plannedStartDate || tsk.startDate, tStart);
        const taW = getDurationDays(tsk.plannedStartDate || tsk.startDate, tsk.plannedEndDate || tsk.endDate);

        result.push({
          id: tsk.id,
          type: 'task',
          name: tsk.name,
          dur: tW,
          start: formatDateString(tsk.startDate),
          end: formatDateString(tsk.endDate),
          prog: Math.round((tsk.progress || 0) * 100),
          status: mapStatus(tsk),
          off: tOff,
          w: tW,
          aOff: taOff,
          aW: taW,
          aProg: Math.round((tsk.progress || 0) * 100),
          displayId: `${msNum}.${tskIdx + 1}`,
          assignee: tsk.assignee,
          colorIdx: msIdx,
          parentMs: ms.id,
          parentPrj: projectItem ? projectItem.id : 'unknown'
        });
      });
    });

    return result;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!project?.id) return;
      setLoading(true);
      try {
        const isDraft = project.status === "DRAFT" || project.status === "Draft";
        let rawItems = [];

        if (!isDraft) {
          const [res, taskRes, profileRes] = await Promise.all([
            fetch(`${API_BASE}/gantt/${project.id}`, { headers: authHeaders() }),
            fetch(`${API_BASE}/task-live`, { headers: authHeaders() }),
            fetch(`${API_BASE}/profile`, { headers: authHeaders() })
          ]);
          if (res.ok) {
            const rawGantt = await res.json();
            rawItems = Array.isArray(rawGantt) ? rawGantt : (rawGantt?.data && Array.isArray(rawGantt.data) ? rawGantt.data : []);
          }
          const taskResData = taskRes.ok ? await taskRes.json() : [];
          const userTasksRaw = Array.isArray(taskResData) ? taskResData : (taskResData?.data && Array.isArray(taskResData.data) ? taskResData.data : []);
          const profile = profileRes.ok ? await profileRes.json() : null;
          const isAdmin = profile?.email === 'vsv.vempati@gmail.com';

          if (userRole === 'user' && !isAdmin && profile) {
            const loggedInEmpId = profile?.empId || profile?.empid || profile?.id;
            
            // Filter tasks to only include those assigned or involved to logged in user
            const userTasks = userTasksRaw.filter(t => 
              String(t.empId || t.empid) === String(loggedInEmpId) ||
              String(t.reviewer) === String(loggedInEmpId) ||
              String(t.approver) === String(loggedInEmpId)
            );

            // Build a broad set of IDs to match against gantt API item IDs
            // which may be in formats like "TSK-123", "123", or task code
            const userTaskIds = new Set([
              ...userTasks.map(t => t.taskId ? `TSK-${t.taskId}` : ''),
              ...userTasks.map(t => t.taskId ? String(t.taskId) : ''),
              ...userTasks.map(t => t.taskCd || t.task_cd || ''),
              ...userTasks.map(t => t.id ? `TSK-${t.id}` : ''),
              ...userTasks.map(t => t.id ? String(t.id) : '')
            ].filter(Boolean));

            const keptTaskIds = new Set();
            const keptMilestoneIds = new Set();

            rawItems.forEach(item => {
              if ((item.type || '').toLowerCase() === 'task') {
                const itemId = String(item.id || '');
                const matches = userTaskIds.has(itemId) ||
                  userTaskIds.has(itemId.replace(/^TSK-/i, '')) ||
                  userTaskIds.has(`TSK-${itemId}`);
                if (matches) {
                  keptTaskIds.add(item.id);
                  if (item.parent) {
                    keptMilestoneIds.add(item.parent);
                  }
                }
              }
            });

            // For users, hide the project row and only show their milestones and tasks
            rawItems = rawItems.filter(item => {
              const iType = (item.type || '').toLowerCase();
              if (iType === 'project') return false; // Hide the project row as requested
              if (iType === 'milestone') return keptMilestoneIds.has(item.id);
              if (iType === 'task') return keptTaskIds.has(item.id);
              return false;
            });
          }
        } else {
          const [mlRes, taskRes, empRes, profileRes] = await Promise.all([
            fetch(`${API_BASE}/milestone-drafts/by-project/${project.id}`, { headers: authHeaders() }),
            fetch(`${API_BASE}/task-drafts`, { headers: authHeaders() }),
            fetch(`${API_BASE}/employees`, { headers: authHeaders() }),
            fetch(`${API_BASE}/profile`, { headers: authHeaders() })
          ]);

          const mlData = mlRes.ok ? await mlRes.json() : [];
          let taskData = taskRes.ok ? await taskRes.json() : [];
          const empData = empRes.ok ? await empRes.json() : [];
          const profile = profileRes.ok ? await profileRes.json() : null;
          const isAdmin = profile?.email === 'vsv.vempati@gmail.com';

          if (userRole === 'user' && !isAdmin && profile) {
            taskData = taskData.filter(t => 
              String(t.empId) === String(profile.empId) || 
              String(t.reviewer) === String(profile.empId) || 
              String(t.approver) === String(profile.empId)
            );
          }

          const prjDto = {
            id: `PRJ-${project.id}`,
            name: project.projectName,
            type: "project",
            startDate: project.startDate,
            endDate: project.endDate,
            progress: 0.0,
            parent: null,
            status: "DRAFT",
            code: project.projectCode,
            assignee: null,
            dependencies: null,
            plannedStartDate: project.startDate,
            plannedEndDate: project.endDate
          };

          const msDtos = mlData.map(m => {
            const mId = m.drftMId || m.drft_m_id || m.id;
            const mTasks = taskData.filter(t => String(t.drftMId || t.drft_m_id || t.mId || t.mid || t.mlstm_id) === String(mId));
            const completedCount = mTasks.filter(t => (t.taskSts || '').toUpperCase() === 'COMPLETED').length;
            const progressVal = mTasks.length > 0 ? (completedCount / mTasks.length) : ((m.mlstnSts || '').toUpperCase() === 'COMPLETED' ? 1.0 : 0.0);

            return {
              id: `MS-${mId}`,
              name: m.mlstnTtl || m.mlstmTtl || m.mlstn_ttl || m.mlstm_ttl || "Milestone",
              type: "milestone",
              startDate: m.tentStDt || m.tent_st_dt || m.stDt || m.st_dt,
              endDate: m.tentEndDt || m.tent_end_dt || m.endDt || m.end_dt,
              progress: progressVal,
              parent: `PRJ-${project.id}`,
              status: m.mlstnSts || m.mlstn_sts || m.mlstmSts || m.mlstm_sts || "DRAFT",
              code: m.mlstnCd || m.mlstn_cd || m.mlstmCd || m.mlstm_cd || `ML-${mId}`,
              assignee: null,
              dependencies: m.mlstnDepMId ? `MS-${m.mlstnDepMId}` : null,
              plannedStartDate: m.tentStDt || m.tent_st_dt || m.stDt || m.st_dt,
              plannedEndDate: m.tentEndDt || m.tent_end_dt || m.endDt || m.end_dt
            };
          });

          const taskDtos = taskData.filter(t => {
            const tMid = t.drftMId || t.drft_m_id || t.mId || t.mid || t.mlstm_id;
            return mlData.some(m => String(m.drftMId || m.drft_m_id || m.mId || m.id) === String(tMid));
          }).map(t => {
            const tId = t.drftTaskId || t.drft_task_id || t.taskId || t.id;
            const emp = empData.find(e => e.empId === t.empId);
            const assigneeName = emp ? `${emp.fstNm || ''} ${emp.lstNm || ''}`.trim() : (t.taskAsgnTo || 'Unassigned');
            const progressVal = (t.taskSts || '').toUpperCase() === 'COMPLETED' ? 1.0 : ((t.taskSts || '').toUpperCase() === 'WIP' ? 0.5 : 0.0);

            return {
              id: `TSK-${tId}`,
              name: t.taskNm || t.task_nm || "Task",
              type: "task",
              startDate: t.tentStDt || t.tent_st_dt || t.stDt || t.st_dt,
              endDate: t.tentEndDt || t.tent_end_dt || t.endDt || t.end_dt,
              progress: progressVal,
              parent: `MS-${t.drftMId || t.drft_m_id || t.mId || t.mid || t.mlstm_id}`,
              status: t.taskSts || t.task_sts || "DRAFT",
              code: t.taskCd || t.task_cd || `TSK-${tId}`,
              assignee: assigneeName,
              dependencies: t.depTaskId ? `TSK-${t.depTaskId}` : null,
              plannedStartDate: t.tentStDt || t.tent_st_dt || t.stDt || t.st_dt,
              plannedEndDate: t.tentEndDt || t.tent_end_dt || t.endDt || t.end_dt
            };
          });

          if (msDtos.length > 0) {
            prjDto.progress = msDtos.reduce((acc, curr) => acc + curr.progress, 0) / msDtos.length;
          }

          rawItems = [prjDto, ...msDtos, ...taskDtos];

          // For users, hide the project row and empty milestones (like LIVE)
          if (userRole === 'user' && !isAdmin && profile) {
            const draftKeptTasks = new Set(taskDtos.map(t => t.id));
            const draftKeptMilestones = new Set(taskDtos.map(t => t.parent));
            
            rawItems = rawItems.filter(item => {
              const iType = (item.type || '').toLowerCase();
              if (iType === 'project') return false;
              if (iType === 'milestone') return draftKeptMilestones.has(item.id);
              if (iType === 'task') return draftKeptTasks.has(item.id);
              return false;
            });
          }
        }

        if (rawItems.length === 0) {
          setGanttRows([]);
          setLoading(false);
          return;
        }

        const { timelineStart: tStart, monthsList } = calculateTimeline(rawItems);
        setTimelineStart(tStart);
        setMonths(monthsList);

        const mappedRows = mapItemsToGanttRows(rawItems, tStart);
        setGanttRows(mappedRows);

        const allProjectIds = mappedRows.filter(r => r.type === 'project').map(r => r.id);
        const allMilestoneIds = mappedRows.filter(r => r.type === 'milestone').map(r => r.id);
        setExpandedProjects(new Set(allProjectIds));
        setExpandedMilestones(new Set(allMilestoneIds));

        const deps = [];
        rawItems.forEach(item => {
          if (item.dependencies) {
            deps.push({ f: item.dependencies, t: item.id });
          }
        });
        setGanttDeps(deps);

      } catch (err) {
        console.error("Error fetching Gantt chart data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [project, userRole]);

  /* ── vertical sync ── */
  const scrollContainerRef = useRef(null);

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        Loading Gantt chart data...
      </div>
    );
  }

  if (ganttRows.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        No milestones or tasks found for this project. Gantt chart cannot be displayed.
      </div>
    );
  }

  /* ── filter rows ── */
  let rows = [...ganttRows];
  if (viewMode === 'Milestones') rows = rows.filter(r => r.type === 'milestone');
  if (viewMode === 'Tasks') rows = rows.filter(r => r.type === 'task');
  if (filterSt !== 'All') rows = rows.filter(r => r.status === filterSt);

  if (groupBy === 'Status') {
    const order = Object.keys(SC);
    const grps = {};
    rows.forEach(r => { (grps[r.status] = grps[r.status] || []).push(r); });
    rows = [];
    order.forEach(s => {
      if (grps[s]?.length) {
        rows.push({ id: `grp-${s}`, type: 'group', name: `● ${s}`, dur: '', start: '', end: '', prog: '', status: s, off: 0, w: 0, aOff: 0, aW: 0, aProg: 0 });
        rows.push(...grps[s]);
      }
    });
  }

  // Filter based on expansion state — in compact mode show all rows directly
  const isFiltering = viewMode !== 'All' || filterSt !== 'All' || groupBy !== 'Milestone';
  if (!isFiltering) {
    rows = rows.filter(r => {
      if (r.type === 'project') return compact ? false : true;
      if (r.type === 'milestone') return r.parentPrj === 'unknown' || expandedProjects.has(r.parentPrj);
      if (r.type === 'task') return (r.parentPrj === 'unknown' || expandedProjects.has(r.parentPrj)) && expandedMilestones.has(r.parentMs);
      return true;
    });
  } else if (compact) {
    rows = rows.filter(r => r.type !== 'project');
  }

  const totalDays = months.reduce((s, m) => s + m.days, 0);
  const timelineW = totalDays * DW;
  const todayOffFixed = getDayOffset(new Date(), timelineStart) * DW;
  const currentMarkerOff = markerOff !== null ? markerOff : todayOffFixed;

  /* ── format marker date string ── */
  const getMarkerDateStr = (pxOff) => {
    const daysOff = Math.floor(pxOff / DW);
    const d = new Date(timelineStart);
    d.setDate(d.getDate() + daysOff);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  };

  /* ── click handlers ── */
  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setMarkerOff(x);
  };

  const handleBarClick = (e, rowId, idx) => {
    e.stopPropagation();
    setActiveRow(rowId);
    if (tableBodyRef.current) tableBodyRef.current.scrollTo({ top: idx * ROW_H - 80, behavior: 'smooth' });
  };

  const handleRowClick = (row, idx) => {
    setActiveRow(row.id);
    if (timelineRef.current && row.off !== undefined) {
      setMarkerOff(row.off * DW);
      timelineRef.current.scrollTo({ left: Math.max(0, row.off * DW - 120), behavior: 'smooth' });
    }
  };

  /* ── dependency paths ── */
  const depPaths = ganttDeps.map(({ f, t }) => {
    const fi = rows.findIndex(r => String(r.id) === String(f));
    const ti = rows.findIndex(r => String(r.id) === String(t));
    if (fi === -1 || ti === -1) return null;
    const fr = rows[fi], tr = rows[ti];
    const x1 = (fr.off + fr.w) * DW;
    const y1 = fi * ROW_H + (baseline ? 18 : ROW_H / 2);
    const x2 = tr.off * DW;
    const y2 = ti * ROW_H + (baseline ? 18 : ROW_H / 2);
    return `M${x1},${y1} H${x1 + 6} V${y2} H${x2}`;
  }).filter(Boolean);

  /* ── render a bar (planned or actual) ── */
  const renderBar = (row, i, isActual = false) => {
    const off = row.off; // Always match planned bar's position
    const w = row.w;     // Always match planned bar's width
    const prog = isActual ? row.aProg : row.prog;
    const col = SC[row.status] || { bar: '#94a3b8', bg: '#f1f5f9' };

    const topOffset = baseline
      ? (isActual ? ROW_H - 22 : 6)   // planned on top, actual on bottom
      : (ROW_H - 16) / 2;

    const COMPACT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#14b8a6'];
    const cColor = COMPACT_COLORS[row.colorIdx % 5] || '#10b981';

    const barH = compact ? 16 : (baseline ? 14 : 16);
    // Use milestone colors universally for planned bars
    const barColor = isActual ? '#64748b' : cColor;
    const bgColor = isActual ? '#e2e8f0' : cColor;
    const isActive = activeRow === row.id;
    const barW = Math.max(w * DW, 6);
    const fillProg = (baseline && isActual) ? prog : 100; // Show progress fill only on the Actual bar in baseline mode

    return (
      <div
        key={isActual ? `act-${i}` : `pln-${i}`}
        style={{
          position: 'absolute',
          top: i * ROW_H + topOffset,
          left: off * DW,
          width: barW,
          height: barH,
          borderRadius: 3,
          cursor: 'pointer',
          zIndex: 3,
          outline: isActive && !isActual ? `2px solid ${barColor}` : 'none',
          outlineOffset: 1,
        }}
        onClick={(e) => handleBarClick(e, row.id, i)}
        title={`${row.name}\n${isActual ? 'Actual' : 'Planned'}: ${prog}%\nStart: ${row.start} | End: ${row.end}`}
      >
        {/* background */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: bgColor }} />
        {/* fill */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${fillProg}%`, minWidth: 0,
          background: barColor, borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: row.type === 'milestone' ? 'flex-start' : 'flex-end',
          paddingRight: 2, overflow: 'hidden'
        }}>
          {row.type === 'milestone' && (
            <span style={{ paddingLeft: 4, color: 'white', fontSize: 10, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              {row.displayId}. {row.name}
            </span>
          )}
          {prog === 100 && <span style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>✓</span>}
        </div>
        {/* % label */}
        <span style={{
          position: 'absolute', left: `calc(100% + 4px)`, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap'
        }}>
          {isActual ? `${prog}%` : '100%'}
        </span>
      </div>
    );
  };

  return (
    <div className={`gc-wrap ${compact ? 'gc-compact' : ''}`}>

      {compact && (
        <div className="gc-toolbar" style={{ justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafbfc' }}>
          <div className="gc-tb-right">
            <span className="gc-lbl">Baseline Comparison</span>
            <div className={`gc-tog ${baseline ? 'on' : ''}`} onClick={() => setBaseline(b => !b)}>
              <div className="gc-tog-knob" />
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <div className="gc-toolbar">

          <div className="gc-tb-left">
            <span className="gc-lbl">View</span>
            <select className="gc-sel" value={viewMode} onChange={e => setViewMode(e.target.value)}>
              <option value="All">Milestones & Tasks</option>
              <option value="Milestones">Milestones Only</option>
              <option value="Tasks">Tasks Only</option>
            </select>

            <span className="gc-lbl">Group By</span>
            <select className="gc-sel" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="Milestone">Milestone</option>
              <option value="Status">Status</option>
            </select>

            <span className="gc-lbl">Filter</span>
            <select className="gc-sel" value={filterSt} onChange={e => setFilterSt(e.target.value)}>
              <option value="All">All Status</option>
              {Object.keys(SC).map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div className="gc-zoom">
              <span className="gc-lbl">Zoom</span>
              <button className="gc-icn" onClick={() => setZoom(z => Math.max(30, z - 10))}><ZoomOut size={13} /></button>
              <span className="gc-zoom-val">{zoom}%</span>
              <button className="gc-icn" onClick={() => setZoom(z => Math.min(300, z + 10))}><ZoomIn size={13} /></button>
            </div>

            <button className="gc-today-btn" onClick={() => {
              setMarkerOff(todayOffFixed);
              if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ left: Math.max(0, todayOffFixed - 100), behavior: 'smooth' });
            }}>
              <Calendar size={13} /> Today
            </button>

            {/* NEW: Expand / Collapse All button */}
            <button className="gc-today-btn" onClick={toggleExpandAll}>
              {expandedProjects.size === ganttRows.filter(r => r.type === 'project').length &&
               expandedMilestones.size === ganttRows.filter(r => r.type === 'milestone').length
                ? 'Collapse All'
                : 'Expand All'}
            </button>
          </div>

          <div className="gc-tb-right">
            <span className="gc-lbl">Baseline</span>
            <div className={`gc-tog ${baseline ? 'on' : ''}`} onClick={() => setBaseline(b => !b)}>
              <div className="gc-tog-knob" />
            </div>
          </div>
        </div>
      )}

      {/* ─── Baseline info banner ─── */}
      {baseline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, padding: '6px 16px',
          background: '#f0f9ff', borderBottom: '1px solid #bae6fd', fontSize: 11,
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 600, color: '#0369a1' }}>📊 Baseline Comparison Mode</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 10, borderRadius: 3, background: '#3b82f6' }} />
            <span style={{ color: '#334155' }}>Planned Schedule (Project Plan)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 10, borderRadius: 3, background: '#94a3b8' }} />
            <span style={{ color: '#334155' }}>Actual Progress (Employee Work)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 10, borderRadius: 3, background: '#f97316' }} />
            <span style={{ color: '#f97316', fontWeight: 500 }}>Selected Date / Marker</span>
          </div>
          <span style={{ color: '#64748b', fontStyle: 'italic' }}>
            — Compare planned vs actual to identify delays
          </span>
        </div>
      )}

      {/* ═══ BODY ═══ */}
      <div className="gc-body" style={{ position: 'relative', display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: sticky table */}
        <div className="gc-left" style={{ 
          width: tableCollapsed ? 0 : (compact ? 340 : 422), 
          borderRight: '2px solid #e2e8f0', 
          boxShadow: '2px 0 6px rgba(0,0,0,0.05)',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          <div className="gc-left-hdr" style={{ width: compact ? 340 : 422 }}>
            <table className="gc-tbl" style={{ tableLayout: 'fixed' }}><thead><tr>
              {compact ? (
                <>
                  <th style={{ width: 260 }}>Task Name</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Duration</th>
                </>
              ) : (
                <>
                  <th style={{ width: 32, textAlign: 'center' }}>S.No</th>
                  <th style={{ width: 180 }}>Task / Milestone</th>
                  <th style={{ width: 46, textAlign: 'center' }}>Days</th>
                  <th style={{ width: 82, textAlign: 'center' }}>Start</th>
                  <th style={{ width: 82, textAlign: 'center' }}>End</th>
                </>
              )}
            </tr></thead></table>
          </div>
          <div className="gc-left-body" style={{ width: compact ? 340 : 422 }}>
            <table className="gc-tbl" style={{ tableLayout: 'fixed' }}><tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  style={{ height: ROW_H, cursor: 'pointer' }}
                  className={`gc-tr ${row.type === 'milestone' || row.type === 'group' || row.type === 'project' ? 'gc-ms' : ''} ${activeRow === row.id ? 'gc-active' : ''}`}
                  onClick={() => handleRowClick(row, i)}
                >
                  {compact ? (
                    <>
                      <td style={{ width: 260 }}>
                        <div className="gc-name" style={{ height: ROW_H, paddingLeft: row.type === 'task' ? 24 : (row.type === 'milestone' ? 8 : 0) }}>
                          {row.type === 'project' && (
                            <span style={{ marginRight: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} onClick={(e) => { e.stopPropagation(); toggleExpand(row.id, 'project'); }}>
                              {expandedProjects.has(row.id) ? <ChevronDown size={14} color="#3b82f6"/> : <ChevronRight size={14} color="#3b82f6"/>}
                            </span>
                          )}
                          {row.type === 'milestone' && (
                            <span style={{ marginRight: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} onClick={(e) => { e.stopPropagation(); toggleExpand(row.id, 'milestone'); }}>
                              {expandedMilestones.has(row.id) ? <ChevronDown size={14} color="#3b82f6"/> : <ChevronRight size={14} color="#3b82f6"/>}
                            </span>
                          )}
                          <span className="gc-name-text" style={{ fontWeight: row.type === 'milestone' ? 'bold' : 'normal', color: '#1e293b' }}>
                            {row.displayId ? `${row.displayId}. ` : ''}{row.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ width: 80, textAlign: 'center' }}>{row.dur} {row.dur === 1 ? 'Day' : 'Days'}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ width: 32, color: '#94a3b8', textAlign: 'center', fontSize: 11 }}>{row.displayId || (row.type === 'project' ? 'P' : '')}</td>
                      <td style={{ width: 180 }}>
                        <div className="gc-name" style={{ height: ROW_H, paddingLeft: row.type === 'task' ? 24 : (row.type === 'milestone' ? 8 : 0) }}>
                          {row.type === 'project' && (
                            <span style={{ marginRight: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} onClick={(e) => { e.stopPropagation(); toggleExpand(row.id, 'project'); }}>
                              {expandedProjects.has(row.id) ? <ChevronDown size={14} color="#3b82f6"/> : <ChevronRight size={14} color="#3b82f6"/>}
                            </span>
                          )}
                          {row.type === 'milestone' && (
                            <span style={{ marginRight: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} onClick={(e) => { e.stopPropagation(); toggleExpand(row.id, 'milestone'); }}>
                              {expandedMilestones.has(row.id) ? <ChevronDown size={14} color="#3b82f6"/> : <ChevronRight size={14} color="#3b82f6"/>}
                            </span>
                          )}
                          {(row.type === 'milestone' || row.type === 'group' || row.type === 'project') && (
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: SC[row.status]?.bar, display: 'inline-block', flexShrink: 0, marginRight: 8 }} />
                          )}
                          <span className="gc-name-text" title={row.name}>{row.name}</span>
                        </div>
                      </td>
                      <td style={{ width: 46, textAlign: 'center' }}>{row.dur}</td>
                      <td style={{ width: 82, textAlign: 'center' }}>{row.start}</td>
                      <td style={{ width: 82, textAlign: 'center' }}>{row.end}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>

          <div style={{ position: 'relative', zIndex: 30, width: 0, alignSelf: 'stretch', overflow: 'visible' }}>
            <div 
              onClick={() => setTableCollapsed(!tableCollapsed)}
              style={{
                position: 'absolute', 
                left: -12, 
                top: 10, 
                width: 24, 
                height: 24,
                background: 'white', 
                border: '1px solid #cbd5e1', 
                borderRadius: '50%',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'left 0.3s ease'
              }}
              title={tableCollapsed ? "Expand Table" : "Collapse Table"}
            >
              {tableCollapsed ? <ChevronRight size={14} color="#3b82f6"/> : <ChevronLeft size={14} color="#3b82f6"/>}
            </div>
          </div>

        {/* RIGHT: scrollable timeline */}
        <div className="gc-right" ref={scrollContainerRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>

          {/* Sticky month/day header */}
          <div className="gc-right-hdr" style={{ width: timelineW }}>
            <div className="gc-months-row">
              {months.map((m, i) => (
                <div key={i} className="gc-month" style={{ width: m.days * DW }}>{m.label}</div>
              ))}
            </div>
            <div className="gc-days-row" style={{ position: 'relative', height: 28 }}>
              {months.map((m, mi) => {
                const prevDays = months.slice(0, mi).reduce((s, mm) => s + mm.days, 0);
                const numDays = m.days;
                return Array.from({ length: numDays }, (_, di) => {
                  const dayNum = di + 1;
                  const leftPx = (prevDays + di) * DW;
                  const isMajor = dayNum === 1 || dayNum % 5 === 0;
                  const isToday =
                    m.year === new Date().getFullYear() &&
                    m.month === new Date().getMonth() &&
                    dayNum === new Date().getDate();
                  return (
                    <React.Fragment key={`${mi}-${di}`}>
                      <div style={{ position: 'absolute', left: leftPx, top: isMajor ? 0 : 12, width: 1, height: isMajor ? '100%' : '45%', background: isToday ? '#2563eb' : isMajor ? '#cbd5e1' : '#e2e8f0' }} />
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setMarkerOff(leftPx);
                          if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ left: Math.max(0, leftPx - 100), behavior: 'smooth' });
                        }}
                        style={{
                          position: 'absolute',
                          left: leftPx + 1,
                          top: 1,
                          fontSize: 9,
                          lineHeight: '11px',
                          color: isToday ? '#2563eb' : isMajor ? '#334155' : '#94a3b8',
                          fontWeight: isToday ? 800 : isMajor ? 700 : 400,
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                          width: `${DW - 1}px`,
                          overflow: 'hidden',
                          textAlign: 'center',
                          cursor: 'pointer'
                        }}
                        title="Click to place marker here"
                      >
                        {String(dayNum).padStart(2, '0')}
                      </span>
                    </React.Fragment>
                  );
                });
              })}
            </div>
          </div>

          {/* Bars area */}
          <div className="gc-bars-area" style={{ width: timelineW, height: rows.length * ROW_H, cursor: 'crosshair' }} onClick={handleTimelineClick}>

            {/* Grid */}
            <div className="gc-grid" style={{ width: timelineW, height: rows.length * ROW_H }}>
              {months.map((m, i) => {
                const left = months.slice(0, i).reduce((s, mm) => s + mm.days * DW, 0);
                return (
                  <React.Fragment key={i}>
                    <div className="gc-grid-month" style={{ left, height: rows.length * ROW_H }} />
                    {[7, 14, 21, 28].filter(d => d < m.days).map(d => (
                      <div key={d} className="gc-grid-week" style={{ left: left + d * DW, height: rows.length * ROW_H }} />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Row alternating stripes */}
            {rows.map((_, i) => (
              <div key={i} style={{
                position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H,
                background: i % 2 === 0 ? 'transparent' : 'rgba(248,250,252,0.6)'
              }} />
            ))}

            {/* Dependency arrows */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: timelineW, height: rows.length * ROW_H, pointerEvents: 'none', zIndex: 2, overflow: 'visible' }}>
              <defs>
                <marker id="arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="4" markerHeight="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#cbd5e1" />
                </marker>
              </defs>
              {depPaths.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="#cbd5e1" strokeWidth="1.2" markerEnd="url(#arr)" />
              ))}
            </svg>

            {/* Marker / Today line */}
            <div className="gc-today-line" style={{ left: currentMarkerOff, height: rows.length * ROW_H, pointerEvents: 'none', zIndex: 5 }}>
              <span className="gc-today-tag" style={{ background: markerOff !== null ? '#f59e0b' : '#3b82f6', transition: 'background 0.2s' }}>
                {markerOff !== null ? getMarkerDateStr(markerOff) : 'Today'}
              </span>
            </div>

            {/* Row separators */}
            {rows.map((_, i) => (
              <div key={`sep-${i}`} style={{ position: 'absolute', top: (i + 1) * ROW_H - 1, left: 0, right: 0, height: 1, background: '#f1f5f9', zIndex: 1 }} />
            ))}

            {/* ── PLANNED bars ── */}
            {rows.map((row, i) => {
              if (row.type === 'group' || !row.w) return null;
              return renderBar(row, i, false);
            })}

            {/* ── ACTUAL bars (only when baseline ON) ── */}
            {baseline && rows.map((row, i) => {
              if (row.type === 'group' || !row.aW) return null;
              return renderBar(row, i, true);
            })}
          </div>
        </div>
      </div>

      {/* ═══ LEGEND ═══ */}
      <div className="gc-legend">
        {Object.entries(SC).map(([label, { bar }]) => (
          <div key={label} className="gc-leg-item">
            <span style={{ display: 'inline-block', width: 14, height: 8, borderRadius: 2, background: bar }} />
            {label}
          </div>
        ))}
        <div className="gc-leg-item">
          <span style={{ display: 'inline-block', width: 16, height: 0, borderTop: '2px dashed #f59e0b' }} />
          Date Marker
        </div>
        {baseline && (
          <>
            <div className="gc-leg-item">
              <span style={{ display: 'inline-block', width: 14, height: 8, borderRadius: 2, background: '#3b82f6', opacity: 0.7 }} />
              Planned (upper bar)
            </div>
            <div className="gc-leg-item">
              <span style={{ display: 'inline-block', width: 14, height: 8, borderRadius: 2, background: '#94a3b8' }} />
              Actual / Employee (lower bar)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
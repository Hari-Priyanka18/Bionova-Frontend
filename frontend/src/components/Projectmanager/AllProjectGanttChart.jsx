import React, { useState, useEffect, useRef } from "react";
import { Download, Filter, Search, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, SlidersHorizontal, ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import "../../styles/AllProjectGanttChart.css";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";
const getAuthToken = () => sessionStorage.getItem("authToken") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getAuthToken()}`
});

const SC = {
  'Completed':   { bar:'#10b981', bg:'#d1fae5' },
  'In Progress': { bar:'#3b82f6', bg:'#dbeafe' },
  'Not Started': { bar:'#f59e0b', bg:'#fef3c7' },
  'Overdue':     { bar:'#ef4444', bg:'#fee2e2' },
};

const ROW_H_NORMAL   = 52;
const ROW_H_BASELINE = 72;

// ── Searchable Select Component for Projects ───────────────────
const SearchableSelect = ({ options, value, onChange, placeholder, style, disabled, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '220px', flexShrink: 0, ...style }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={className}
        style={{
          padding: '6px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          background: disabled ? '#f1f5f9' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '34px',
          fontSize: '13px',
          color: selected ? '#0f172a' : '#64748b',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected ? selected.label : (placeholder || "All Projects")}
        </span>
        <ChevronDown size={14} style={{ color: '#64748b', flexShrink: 0, marginLeft: '6px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '260px',
            background: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            zIndex: 99999,
            maxHeight: '240px',
            overflowY: 'auto',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '6px 8px', position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #e2e8f0', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fafbfc' }}>
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                autoFocus
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  background: 'transparent'
                }}
              />
            </div>
          </div>
          <div style={{ padding: '4px 0' }}>
            {filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setIsOpen(false);
                  setSearch("");
                }}
                style={{
                  padding: '7px 12px',
                  cursor: 'pointer',
                  background: String(value) === String(opt.value) ? '#eff6ff' : 'white',
                  fontSize: '13px',
                  color: String(value) === String(opt.value) ? '#1d4ed8' : '#334155',
                  fontWeight: String(value) === String(opt.value) ? '600' : '400'
                }}
                onMouseOver={(e) => {
                  if (String(value) !== String(opt.value)) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseOut={(e) => {
                  if (String(value) !== String(opt.value)) e.currentTarget.style.background = 'white';
                }}
              >
                {opt.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>
                No projects found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function AllProjectGanttChart({ userRole, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState("Gantt Chart");
  const [baseline, setBaseline] = useState(false);
  
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const [activeRow, setActiveRow] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [projectFilter, setProjectFilter] = useState(location.state?.projectFilter || "All Projects");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [departmentsList, setDepartmentsList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const [singleProjectView, setSingleProjectView] = useState(null); // stores project row when single project selected

  const [loading, setLoading] = useState(true);
  const [ganttRows, setGanttRows] = useState([]);
  const [timelineStart, setTimelineStart] = useState(new Date());
  const [months, setMonths] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, notStarted: 0, overdue: 0 });

  const [markerOff, setMarkerOff] = useState(null); 
  
  const timelineRef = useRef(null);

  const DW = 14 * (zoom / 100);
  const ROW_H = baseline ? ROW_H_BASELINE : ROW_H_NORMAL;

  // Resizable Table Setup
  const [tableWidth, setTableWidth] = useState(300);
  const dragState = useRef({ isDragging: false, startX: 0, startW: 0 });

  useEffect(() => {
    setTableWidth(baseline ? 360 : 300);
  }, [baseline]);

  useEffect(() => {
    if (projectFilter !== "All Projects" && ganttRows.length > 0 && !singleProjectView) {
      const projRow = ganttRows.find(r => r.type === 'project' && String(r.id) === String(projectFilter));
      if (projRow) {
        setSingleProjectView(projRow);
        setTableCollapsed(true);
        setExpandedProjects(prev => new Set([...prev, projRow.id]));
      }
    }
  }, [ganttRows, projectFilter, singleProjectView]);

  const handleDragStart = (e) => {
    dragState.current = { isDragging: true, startX: e.clientX, startW: tableWidth };
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleDragMove = (e) => {
    if (!dragState.current.isDragging) return;
    const diff = e.clientX - dragState.current.startX;
    let newW = dragState.current.startW + diff;
    if (newW < 250) newW = 250; 
    if (newW > 1200) newW = 1200; 
    setTableWidth(newW);
  };

  const handleDragEnd = () => {
    dragState.current.isDragging = false;
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  const toggleProjectExpand = (id) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMilestoneExpand = (id) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const dateOnly = String(dateStr).split('T')[0];
      const [year, month, day] = dateOnly.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      d.setHours(0, 0, 0, 0);
      return d;
    } catch (e) {
      return new Date(dateStr);
    }
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = parseLocalDate(dateStr);
    if (!d || isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Returns exact day offset from timeline start (month boundary aligned)
  const getDayOffset = (dateStr, tStart) => {
    if (!dateStr || !tStart) return 0;
    const d = parseLocalDate(dateStr);
    if (!d || isNaN(d.getTime())) return 0;
    // Count exact calendar days from tStart (1st of first month) to the target date
    const tStartMid = new Date(tStart.getFullYear(), tStart.getMonth(), 1);
    const dTargetMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffMs = dTargetMid - tStartMid;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const getDurationDays = (startStr, endStr) => {
    if (!startStr || !endStr) return 1;
    const s = parseLocalDate(startStr);
    const e = parseLocalDate(endStr);
    if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const sMid = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const eMid = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    const diffMs = eMid - sMid;
    // +1 so the bar includes the end date visually
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return diffDays >= 1 ? diffDays : 1;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prjRes] = await Promise.all([
          fetch(`${API_BASE}/project-live`, { headers: authHeaders() })
        ]);

        const projectsRaw = prjRes.ok ? await prjRes.json() : [];
        const projects = Array.from(new Map(projectsRaw.map(p => [p.prjId, p])).values());

        // Fetch Gantt data for each project using the unified Gantt endpoint
        const ganttPromises = projects.map(p => 
          fetch(`${API_BASE}/gantt/${p.prjId}`, { headers: authHeaders() })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []) // Fallback in case a project endpoint fails
        );
        const ganttResults = await Promise.all(ganttPromises);

        // Combine all items into one flat array
        let rawItems = [];
        ganttResults.forEach(arr => {
          rawItems = rawItems.concat(arr);
        });

        if (rawItems.length === 0) {
          setGanttRows([]);
          setLoading(false);
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let minDate = null;
        let maxDate = null;

        const updateMinMax = (dateStr) => {
          if (!dateStr) return;
          const d = parseLocalDate(dateStr);
          if (!d || isNaN(d.getTime())) return;
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        };

        const mapStatus = (statusStr, endDate) => {
          const s = (statusStr || 'Not Started').toUpperCase();
          let label = 'Not Started';
          if (s === 'COMPLETED' || s === 'CLOSED') label = 'Completed';
          else if (s === 'WIP' || s === 'IN_PROGRESS' || s === 'LIVE' || s === 'UNDER_REVIEW' || s === 'SUBMIT_REVIEW') label = 'In Progress';
          else if (s === 'HOLD') label = 'Not Started';
          
          if (label !== 'Completed' && endDate) {
            const end = parseLocalDate(endDate);
            if (end && !isNaN(end.getTime()) && end < today) {
              label = 'Overdue';
            }
          }
          return label;
        };

        const kpi = { total: projects.length, completed: 0, inProgress: 0, notStarted: 0, overdue: 0 };
        
        projects.forEach(p => {
          const st = mapStatus(p.prjSts, p.endDt);
          if (st === 'Completed') kpi.completed++;
          else if (st === 'In Progress') kpi.inProgress++;
          else if (st === 'Overdue') kpi.overdue++;
          else kpi.notStarted++;
        });

        rawItems.forEach(item => {
          updateMinMax(item.startDate);
          updateMinMax(item.endDate);
        });

        setStats(kpi);

        if (!minDate) minDate = new Date();
        if (!maxDate) maxDate = new Date(minDate.getTime() + 180 * 24 * 60 * 60 * 1000);

        const tStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        let monthCount = (maxDate.getFullYear() - tStart.getFullYear()) * 12 + (maxDate.getMonth() - tStart.getMonth()) + 2;
        if (monthCount < 6) monthCount = 6;
        if (monthCount > 36) monthCount = 36;

        const monthsList = [];
        let current = new Date(tStart);
        for (let i = 0; i < monthCount; i++) {
          const year = current.getFullYear();
          const month = current.getMonth();
          const label = current.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
          const days = new Date(year, month + 1, 0).getDate();
          monthsList.push({ label, days, year, month });
          current.setMonth(current.getMonth() + 1);
        }
        setTimelineStart(tStart);
        setMonths(monthsList);

        const result = [];
        
        // Group items by project to maintain nesting hierarchy
        projects.sort((a,b) => new Date(a.stDt) - new Date(b.stDt)).forEach((p, pIdx) => {
          const prjItem = rawItems.find(i => i.type === 'project' && i.id === `PRJ-${p.prjId}`);
          if (!prjItem) return;

          const pOff = getDayOffset(prjItem.startDate, tStart);
          const pW = getDurationDays(prjItem.startDate, prjItem.endDate);
          const paOff = getDayOffset(prjItem.plannedStartDate || prjItem.startDate, tStart);
          const paW = getDurationDays(prjItem.plannedStartDate || prjItem.startDate, prjItem.plannedEndDate || prjItem.endDate);

          result.push({
            id: prjItem.id,
            type: 'project',
            name: prjItem.name,
            dur: pW,
            start: formatDateString(prjItem.startDate),
            end: formatDateString(prjItem.endDate),
            rawStart: prjItem.startDate,
            rawEnd: prjItem.endDate,
            prog: Math.round((prjItem.progress || 0) * 100),
            status: mapStatus(prjItem.status, prjItem.endDate),
            off: pOff,
            w: pW,
            aOff: paOff,
            aW: paW,
            aProg: Math.round((prjItem.progress || 0) * 100)
          });

          const pMilestones = rawItems.filter(i => i.type === 'milestone' && i.parent === prjItem.id).sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
          
          pMilestones.forEach((ms, msIdx) => {
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
              rawStart: ms.startDate,
              rawEnd: ms.endDate,
              prog: Math.round((ms.progress || 0) * 100),
              status: mapStatus(ms.status, ms.endDate),
              off: msOff,
              w: msW,
              aOff: msaOff,
              aW: msaW,
              aProg: Math.round((ms.progress || 0) * 100),
              displayId: `${pIdx + 1}.${msIdx + 1}`,
              parentId: prjItem.id
            });

            const msTasks = rawItems.filter(i => i.type === 'task' && i.parent === ms.id).sort((a,b) => new Date(a.startDate) - new Date(b.startDate));

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
                rawStart: tsk.startDate,
                rawEnd: tsk.endDate,
                prog: Math.round((tsk.progress || 0) * 100),
                status: mapStatus(tsk.status, tsk.endDate),
                off: tOff,
                w: tW,
                aOff: taOff,
                aW: taW,
                aProg: Math.round((tsk.progress || 0) * 100),
                displayId: `${pIdx + 1}.${msIdx + 1}.${tskIdx + 1}`,
                parentId: ms.id,
                grandParentId: prjItem.id,
                manager: tsk.assignee || "Unassigned"
              });
            });
          });
        });

        setGanttRows(result);
        const allProjIds = projects.map(p => `PRJ-${p.prjId}`);
        const allMsIds = rawItems.filter(i => i.type === 'milestone').map(m => m.id);
        setExpandedProjects(new Set(allProjIds));
        setExpandedMilestones(new Set(allMsIds));
      } catch (err) {
        console.error("Failed to load global Gantt data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  let visibleRows = ganttRows.filter(r => {
    let match = true;
    if (searchQuery) match = match && r.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter !== "All Status") match = match && r.status === statusFilter;
    
    if (projectFilter !== "All Projects") {
      let rProjectId = null;
      if (r.type === 'project') rProjectId = r.id;
      else if (r.type === 'milestone') rProjectId = r.parentId;
      else if (r.type === 'task') rProjectId = r.grandParentId;
      
      if (String(rProjectId) !== String(projectFilter)) match = false;
    }

    if (startDateFilter && match) {
      if (!r.rawStart) match = false;
      else if (new Date(r.rawStart) < new Date(startDateFilter)) match = false;
    }

    if (endDateFilter && match) {
      if (!r.rawEnd) match = false;
      else if (new Date(r.rawEnd) > new Date(endDateFilter)) match = false;
    }

    if (!match) return false;

    if (r.type === 'project') return true;
    if (r.type === 'milestone') return expandedProjects.has(r.parentId);
    if (r.type === 'task') return expandedProjects.has(r.grandParentId) && expandedMilestones.has(r.parentId);
    return false;
  });

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Type,ID,Name,Start Date,End Date,Plan Progress %,Actual Progress %,Status\n";
    visibleRows.forEach(row => {
      const rowData = [row.type, row.id, `"${row.name}"`, row.start, row.end, 100, row.aProg, row.status];
      csvContent += rowData.join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gantt_chart.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalDays = months.reduce((s, m) => s + m.days, 0);
  const timelineW = totalDays * DW;
  const todayOffFixed = getDayOffset(new Date(), timelineStart) * DW;
  const currentMarkerOff = markerOff !== null ? markerOff : todayOffFixed;

  const handleBarClick = (e, rowId) => {
    e.stopPropagation();
    setActiveRow(rowId);
  };

  const getPercentage = (count) => {
    if (stats.total === 0) return 0;
    return Math.round((count / stats.total) * 100);
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

  return (
    <div className="gantt-page">
      <Sidebar userRole={userRole} onLogout={onLogout} />
      
      <div className="gc-shell">
        <Header 
          title={singleProjectView ? singleProjectView.name : "All Projects Gantt Chart"} 
          subtitle={singleProjectView ? "Gantt Chart View" : "View timeline and progress of all projects"} 
          showSearch={false}
          statusBadge={singleProjectView ? singleProjectView.status : undefined}
          progressPercent={singleProjectView ? singleProjectView.prog : undefined}
        />

        <div className="gantt-main">
          
          <div className="gantt-header-row" style={{ flexShrink: 0, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {singleProjectView ? (
                <button className="gantt-btn" onClick={() => { setSingleProjectView(null); setProjectFilter('All Projects'); setTableCollapsed(false); setShowFilters(false); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', color: '#1e293b' }}><ArrowLeft size={16}/> Back to All Projects</button>
              ) : (
                <button className="gantt-btn" onClick={() => navigate('/pm-dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', color: '#1e293b' }}><ArrowLeft size={16}/> Back to Dashboard</button>
              )}
            </div>
            <div className="gantt-header-actions">
              {!singleProjectView && (
                <button className="gantt-btn gantt-btn-filters" onClick={() => setShowFilters(!showFilters)} style={{ background: showFilters ? '#f1f5f9' : 'white' }}><Filter size={16}/> Filters</button>
              )}
              <button className="gantt-btn gantt-btn-export" onClick={handleExportCSV}><Download size={16}/> Export <ChevronDown size={14}/></button>
            </div>
          </div>

          {showFilters && !singleProjectView && (
            <div className="gantt-filters-bar" style={{ flexShrink: 0 }}>
            <div className="gantt-filters-left">
              <div className="gantt-search-input">
                <Search size={14} color="#94a3b8"/>
                <input type="text" placeholder="Search projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <SearchableSelect
                options={[
                  { value: "All Projects", label: "All Projects" },
                  ...ganttRows.filter(r => r.type === 'project').map(p => ({ value: p.id, label: p.name }))
                ]}
                value={projectFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectFilter(val);
                  if (val !== "All Projects") {
                    const projRow = ganttRows.find(r => r.type === 'project' && String(r.id) === String(val));
                    setSingleProjectView(projRow || null);
                    setTableCollapsed(true);
                    if (projRow) setExpandedProjects(prev => new Set([...prev, projRow.id]));
                  } else {
                    setSingleProjectView(null);
                    setTableCollapsed(false);
                  }
                }}
                placeholder="All Projects"
              />
              <div className="gantt-filter-date" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="date" value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }} title="Start Date" />
                <span style={{ color: '#64748b' }}>-</span>
                <input type="date" value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }} title="End Date" />
              </div>
              <button className="gantt-btn-clear" onClick={() => { setSearchQuery(""); setStatusFilter("All Status"); setProjectFilter("All Projects"); setStartDateFilter(""); setEndDateFilter(""); }}>Clear</button>
              <button className="gantt-btn-today" onClick={() => { 
                setMarkerOff(todayOffFixed);
                if(timelineRef.current) timelineRef.current.scrollTo({ left: Math.max(0, todayOffFixed - 100), behavior: 'smooth' }); 
              }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <Calendar size={14}/> Today
              </button>
            </div>
          </div>
          )}

          {/* Single Project banner removed - now shown in header row */}

          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', flexGrow: 1 }}>
              Loading Gantt chart data...
            </div>
          ) : (
            <div className="gantt-content-wrapper" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
              <div className="gantt-controls-row" style={{ flexShrink: 0 }}>
                <div className="gantt-zoom-controls">
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Zoom</span>
                  <button className="gantt-zoom-btn" onClick={() => setZoom(Math.max(50, zoom - 10))}><ZoomOut size={14}/></button>
                  <span className="gantt-zoom-val">{zoom}%</span>
                  <button className="gantt-zoom-btn" onClick={() => setZoom(Math.min(200, zoom + 10))}><ZoomIn size={14}/></button>
                </div>
                <div className="gantt-legend" style={{ marginLeft: 'auto' }}>
                  <div className="gantt-legend-item"><div className="gantt-legend-color color-completed"></div> Completed</div>
                  <div className="gantt-legend-item"><div className="gantt-legend-color color-inprogress"></div> In Progress</div>
                  <div className="gantt-legend-item"><div className="gantt-legend-color color-notstarted"></div> Not Started</div>
                  <div className="gantt-legend-item"><div className="gantt-legend-color color-overdue"></div> Overdue</div>
                </div>
                <div className="gantt-filters-right" style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: '#475569', marginLeft: '24px' }} onClick={() => setBaseline(!baseline)}>
                  Baseline
                  <div className={`gantt-toggle ${baseline ? 'on' : ''}`} style={{ background: baseline ? '#10b981' : '#cbd5e1' }}>
                  </div>
                </div>
              </div>

              {baseline && (
                <div style={{
                  display:'flex', alignItems:'center', gap:20, padding:'6px 16px',
                  background:'#f0f9ff', borderBottom:'1px solid #bae6fd', fontSize:11,
                  flexWrap: 'wrap', flexShrink: 0
                }}>
                  <span style={{fontWeight:600, color:'#0369a1'}}>📊 Baseline Comparison Mode</span>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:24,height:10,borderRadius:3,background:'#3b82f6'}}/>
                    <span style={{color:'#334155'}}>Planned Schedule (Project Plan)</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:24,height:10,borderRadius:3,background:'#94a3b8'}}/>
                    <span style={{color:'#334155'}}>Actual Progress (Employee Work)</span>
                  </div>
                </div>
              )}

            <div className="gantt-chart-container" ref={timelineRef} style={{ flexGrow: 1, overflow: 'auto', display: 'flex', minHeight: 0 }}>
              
              {(() => {
                const totalTimelineHeight = 60 + visibleRows.length * ROW_H;
                return (
                  <>
                  {/* Left Table Section with Collapse */}
                  {!tableCollapsed && (
                    <div className="gantt-table-section" style={{ width: tableWidth, flexShrink: 0, position: 'sticky', left: 0, zIndex: 40, background: '#fff', minHeight: totalTimelineHeight }}>
                      <div className="gantt-thead" style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex' }}>
                        <div className="gantt-th" style={{ flex: 1, minWidth: '180px' }}>Project / Task / Status</div>
                        {baseline && <div className="gantt-th" style={{ width: '60px' }}>Act%</div>}
                      </div>
                      <div style={{ overflowY: 'hidden' }}>
                        {visibleRows.map((row, i) => (
                          <div 
                            key={row.id} 
                            className="gantt-row" 
                            style={{ height: ROW_H, cursor: 'pointer', background: activeRow === row.id ? '#f1f5f9' : 'transparent' }}
                            onClick={() => {
                              setActiveRow(row.id);
                              if (row.type === 'project') toggleProjectExpand(row.id);
                              if (row.type === 'milestone') toggleMilestoneExpand(row.id);
                            }}
                          >
                            <div className="gantt-td" style={{ flex: 1, minWidth: '200px', fontWeight: row.type !== 'task' ? '600' : '400', paddingLeft: row.type === 'milestone' ? '24px' : (row.type === 'task' ? '48px' : '12px'), display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                              {row.type === 'project' && (
                                <span style={{ cursor: 'pointer', paddingRight: 4 }}>
                                  {expandedProjects.has(row.id) ? <ChevronDown size={14} color="#64748b"/> : <span style={{display:'inline-block', transform:'rotate(-90deg)'}}><ChevronDown size={14} color="#64748b"/></span>}
                                </span>
                              )}
                              {row.type === 'milestone' && (
                                <span style={{ cursor: 'pointer', paddingRight: 4 }}>
                                  {expandedMilestones.has(row.id) ? <ChevronDown size={14} color="#64748b"/> : <span style={{display:'inline-block', transform:'rotate(-90deg)'}}><ChevronDown size={14} color="#64748b"/></span>}
                                </span>
                              )}
                              {row.type !== 'task' && <span style={{width: 8, height: 8, borderRadius: '50%', background: SC[row.status]?.bar || '#94a3b8', flexShrink: 0}}></span>}
                              
                              <span 
                                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: row.type !== 'task' ? 'pointer' : 'default', padding: '4px 0' }} 
                                title={row.name}
                              >
                                {row.displayId ? `${row.displayId}. ` : ''}{row.name}
                              </span>
                              <span style={{ padding: '2px 7px', borderRadius: '10px', fontWeight: 600, fontSize: '10px', background: SC[row.status]?.bg || '#f1f5f9', color: SC[row.status]?.bar || '#64748b', whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}>
                                {row.status || '-'}
                              </span>
                            </div>

                            {baseline && <div className="gantt-td" style={{ width: '60px', fontWeight: 600, color: '#64748b' }}>{row.aProg}%</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                    {/* Expand button when table collapsed */}
                    {tableCollapsed && (
                      <div style={{ flexShrink: 0, position: 'sticky', left: 0, width: 32, zIndex: 40, background: 'white', borderRight: '1px solid #e2e8f0', minHeight: totalTimelineHeight }}>
                        <button
                          onClick={() => setTableCollapsed(false)}
                          title="Expand table"
                          style={{ position: 'sticky', top: 18, marginLeft: '4px', width: 24, height: 28, borderRadius: '14px 0 0 14px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '-2px 2px 4px rgba(0,0,0,0.1)' }}
                        >
                          <PanelLeftOpen size={16} />
                        </button>
                      </div>
                    )}

                    {/* Resizer Handle - only when table visible */}
                    {!tableCollapsed && (
                      <div 
                        onMouseDown={handleDragStart}
                        style={{
                          width: 6,
                          cursor: 'col-resize',
                          background: '#e2e8f0',
                          zIndex: 41,
                          position: 'sticky',
                          left: tableWidth,
                          flexShrink: 0,
                          minHeight: totalTimelineHeight
                        }}
                        title="Drag to resize table"
                      >
                    {/* Collapse button */}
                    <button
                      onMouseDown={(e) => e.stopPropagation()} 
                      onClick={() => setTableCollapsed(true)}
                      title="Collapse table"
                      style={{ position: 'sticky', top: 18, left: -24, zIndex: 31, width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                    >
                      <PanelLeftClose size={16} />
                    </button>
                    
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ width: 2, height: 12, background: '#94a3b8', borderRadius: 2 }}></div>
                      <div style={{ width: 2, height: 12, background: '#94a3b8', borderRadius: 2 }}></div>
                    </div>
                  </div>
                )}
                  </>
                );
              })()}

                {/* Right Timeline Section */}
                <div className="gantt-timeline-section" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
                  const snappedX = Math.floor(clickX / DW) * DW;
                  setMarkerOff(snappedX);
                }}>
                  <div style={{ width: timelineW, position: 'relative' }}>
                    <div className="gantt-timeline-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                      {/* Month row */}
                      <div className="gantt-months-row">
                        {months.map((m, i) => {
                          const prevDays = months.slice(0, i).reduce((s, mm) => s + mm.days, 0);
                          return (
                            <div
                              key={m.label}
                              style={{ position: 'absolute', left: prevDays * DW, width: m.days * DW, borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#1e293b', height: '100%' }}
                            >
                              {m.label}
                            </div>
                          );
                        })}
                      </div>
                      {/* Day ticks row — every single day with number */}
                      <div className="gantt-days-row" style={{ position: 'relative', height: 28 }}>
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
                                {/* Tick line */}
                                <div style={{ position: 'absolute', left: leftPx, top: isMajor ? 0 : 12, width: 1, height: isMajor ? '100%' : '45%', background: isToday ? '#2563eb' : isMajor ? '#cbd5e1' : '#e2e8f0' }} />
                                {/* Day number — every day */}
                                <span style={{
                                  position: 'absolute',
                                  left: leftPx + 2,
                                  top: 1,
                                  fontSize: 9,
                                  lineHeight: '11px',
                                  color: isToday ? '#2563eb' : isMajor ? '#334155' : '#94a3b8',
                                  fontWeight: isToday ? 800 : isMajor ? 700 : 400,
                                  userSelect: 'none',
                                  whiteSpace: 'nowrap',
                                  width: `${DW - 2}px`,
                                  overflow: 'hidden',
                                  textAlign: 'left',
                                }}>
                                  {String(dayNum).padStart(2, '0')}
                                </span>
                              </React.Fragment>
                            );
                          });
                        })}
                      </div>
                    </div>
                    
                    {/* Marker line */}
                    <div className="gantt-today-line" style={{ left: currentMarkerOff }}>
                      <div className="gantt-today-label">Marker</div>
                    </div>

                    <div style={{ position: 'relative', height: visibleRows.length * ROW_H }}>
                      {/* Grid Lines */}
                      {months.map((m, i) => {
                        const left = months.slice(0, i).reduce((s, mm) => s + mm.days * DW, 0);
                        return (
                          <React.Fragment key={`grid-${i}`}>
                            <div style={{ position: 'absolute', left, top: 0, bottom: 0, width: 1, background: '#f1f5f9' }} />
                            {getWeeklyDays(m.year, m.month).map(d => (
                              <div key={d} style={{ position: 'absolute', left: left + (d - 1) * DW, top: 0, bottom: 0, width: 1, background: '#f8fafc' }} />
                            ))}
                          </React.Fragment>
                        );
                      })}

                      {visibleRows.map((row, i) => {
                        const barColor = SC[row.status]?.bar || '#94a3b8';
                        const barBg   = SC[row.status]?.bg  || '#f1f5f9';
                        const isActive = activeRow === row.id;
                        const highlightColor = isActive ? '#f97316' : barColor;

                        // Bar height and vertical centering by row type
                        const barH = row.type === 'project' ? 22 : row.type === 'milestone' ? 18 : 16;
                        const barTop = (ROW_H - barH) / 2;
                        const barLeft = row.off * DW;
                        const barWidth = Math.max(row.w * DW, 8);
                        const progWidth = `${Math.min(row.prog, 100)}%`;

                        // Border-radius per type
                        const radius = row.type === 'project' ? 4 : row.type === 'milestone' ? 3 : 3;

                        return (
                          <div
                            key={row.id}
                            style={{ position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: '1px solid #f1f5f9', background: isActive ? '#fffbeb' : 'transparent', cursor: 'pointer' }}
                            onClick={() => {
                              setActiveRow(isActive ? null : row.id);
                              if (row.type === 'project') toggleProjectExpand(row.id);
                              if (row.type === 'milestone') toggleMilestoneExpand(row.id);
                            }}
                          >
                            
                            {/* ── Planned Bar ── */}
                            <div
                              style={{ position: 'absolute', top: barTop, left: barLeft, width: barWidth, height: barH, borderRadius: radius, overflow: 'hidden', cursor: 'pointer', zIndex: 4, boxShadow: isActive ? `0 0 0 2px ${highlightColor}` : 'none' }}
                              title={`${row.name} | ${row.start} → ${row.end} | 100%`}
                              onClick={(e) => { e.stopPropagation(); setActiveRow(row.id); if (row.type === 'project') toggleProjectExpand(row.id); if (row.type === 'milestone') toggleMilestoneExpand(row.id); }}
                            >
                              {/* Background track */}
                              <div style={{ position: 'absolute', inset: 0, background: isActive ? '#fed7aa' : barBg }} />
                              {/* Progress fill */}
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: highlightColor, transition: 'width 0.3s ease' }} />
                            </div>

                            {/* Progress % badge */}
                            {barWidth > 30 && (
                              <span style={{ position: 'absolute', top: baseline ? barTop + barH + 14 : barTop + barH + 2, left: barLeft, fontSize: 9, color: barColor, fontWeight: 600, pointerEvents: 'none' }}>
                                {baseline ? `${row.prog}%` : '100%'}
                              </span>
                            )}

                            {/* ── Baseline Actual Bar (only when baseline ON) ── */}
                            {baseline && (
                              <div
                                style={{ position: 'absolute', top: barTop + barH + 2, left: barLeft, width: barWidth, height: 10, borderRadius: 2, overflow: 'hidden', cursor: 'pointer', zIndex: 4 }}
                                title={`Progress: ${row.prog || 0}%`}
                                onClick={(e) => { e.stopPropagation(); setActiveRow(row.id); if (row.type === 'project') toggleProjectExpand(row.id); if (row.type === 'milestone') toggleMilestoneExpand(row.id); }}
                              >
                                <div style={{ position: 'absolute', inset: 0, background: '#e2e8f0' }} />
                                <div style={{ position: 'absolute', top: 0, left: 0, width: progWidth, height: '100%', background: isActive ? '#f97316' : '#64748b', transition: 'width 0.3s ease' }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

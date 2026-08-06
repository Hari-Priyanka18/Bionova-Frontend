import React, { useState } from 'react';
import {
  X, ArrowRight, ArrowLeft, Building2, Factory,
  Calendar as CalendarIcon, Info, CheckCircle, Loader2, AlertTriangle,
  ChevronDown, ChevronRight
} from 'lucide-react';
import '../../styles/GoLiveCalendar.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const getAuthHeaders = () => {
  const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const parseLocal = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return new Date(dateStr);
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

const formatLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const dayOfWeek = (dateStr) => {
  const d = parseLocal(dateStr);
  return d ? d.getDay() : new Date(dateStr).getDay();
};

const addDays = (dateStr, n) => {
  const d = parseLocal(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + n);
  return formatLocal(d);
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = parseLocal(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const calcWorkingDays = (startStr, endStr, skipSat, skipSun, publicHolidayDates = []) => {
  if (!startStr || !endStr) return 0;
  const holidaySet = new Set(publicHolidayDates);
  let count = 0;
  let cur = parseLocal(startStr);
  const end = parseLocal(endStr);
  if (!cur || !end) return 0;
  while (cur <= end) {
    const dow = cur.getDay();
    const dateKey = formatLocal(cur);
    if (!((skipSat && dow === 6) || (skipSun && dow === 0) || holidaySet.has(dateKey))) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const getNextWorkingDay = (dateStr, skipSat, skipSun, publicHolidayDates = []) => {
  if (!dateStr) return dateStr;
  const holidaySet = new Set(publicHolidayDates);
  let cur = parseLocal(dateStr);
  if (!cur) return dateStr;
  while (true) {
    const dow = cur.getDay();
    const dateKey = formatLocal(cur);
    if (!((skipSat && dow === 6) || (skipSun && dow === 0) || holidaySet.has(dateKey))) {
      return dateKey;
    }
    cur.setDate(cur.getDate() + 1);
  }
};

const calcEndDate = (startStr, workingDays, skipSat, skipSun, publicHolidayDates = []) => {
  if (!startStr || !workingDays) return startStr;
  const holidaySet = new Set(publicHolidayDates);
  let count = 0;
  let cur = parseLocal(startStr);
  if (!cur) return startStr;
  while (count < workingDays) {
    const dow = cur.getDay();
    const dateKey = formatLocal(cur);
    if (!((skipSat && dow === 6) || (skipSun && dow === 0) || holidaySet.has(dateKey))) {
      count++;
    }
    if (count < workingDays) cur.setDate(cur.getDate() + 1);
  }
  return formatLocal(cur);
};

// ── Component ──────────────────────────────────────────────────────────────────
const GoLiveCalendar = ({ project, onCancel, onPreview }) => {
  const [step, setStep] = useState('config');
  const [calendarMode, setCalendarMode] = useState('existing');
  const [existingSelection, setExistingSelection] = useState(() => {
    if (project?.isIndividualTask) {
      return {
        company: !project.isPlantEmployee,
        plant: !!project.isPlantEmployee,
        external: false
      };
    }
    return {
      company: true,
      plant: false,
      external: false
    };
  });
  const [considerOnly, setConsiderOnly] = useState({
    saturday:      { active: false, company: false, plant: false, external: false },
    sunday:        { active: false, company: false, plant: false, external: false },
    publicHolidays:{ active: false, company: false, plant: false, external: false },
  });

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set(['project']));

  const toggleMaster = (day) => setConsiderOnly(p => ({ ...p, [day]: { ...p[day], active: !p[day].active } }));
  const toggleSub = (day, field) => setConsiderOnly(p => ({ ...p, [day]: { ...p[day], [field]: !p[field] } }));
  
  const toggleRow = (id) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const isConfigValid = () => {
    if (calendarMode === 'existing') {
      return existingSelection.company || existingSelection.plant || existingSelection.external;
    }
    if (calendarMode === 'custom') {
      const hasAnyMaster = considerOnly.saturday.active || considerOnly.sunday.active || considerOnly.publicHolidays.active;
      if (!hasAnyMaster) return false;
      const isSubValid = (key) => {
        if (!considerOnly[key].active) return true;
        return considerOnly[key].company || considerOnly[key].plant || considerOnly[key].external;
      };
      return isSubValid('saturday') && isSubValid('sunday') && isSubValid('publicHolidays');
    }
    return false;
  };

  const buildPreview = async () => {
    setPreviewLoading(true);
    try {
      // ── Determine skip flags from company wrkDaysPerWk ──────────────────
      let skipSat = false;
      let skipSun = false;

      if (calendarMode === 'existing') {
        // wrkDaysPerWk = 5 → skip Sat AND Sun; 6 → skip Sun only; 7 → all working
        try {
          if (existingSelection.plant && (project.pltId || project.plantId)) {
            const pltId = project.pltId || project.plantId;
            const pltRes = await fetch(`${apiBaseUrl}/api/plants/${pltId}`, { headers: getAuthHeaders() });
            if (pltRes.ok) {
              const pltData = await pltRes.json();
              const wrkDays = pltData.wrkDaysPerWk || pltData.workingDaysPerWeek;
              if (Number(wrkDays) === 5) { skipSat = true; skipSun = true; }
              else if (Number(wrkDays) === 6) { skipSat = false; skipSun = true; }
              else if (Number(wrkDays) === 7) { skipSat = false; skipSun = false; }
              else { skipSun = true; }
            }
          } else {
            const coyId = project.companyId || project.coyId;
            if (coyId) {
              const coyRes = await fetch(`${apiBaseUrl}/api/companies/${coyId}`, { headers: getAuthHeaders() });
              if (coyRes.ok) {
                const coyData = await coyRes.json();
                const wrkDays = coyData.wrkDaysPerWk || coyData.workingDaysPerWeek;
                if (Number(wrkDays) === 5) { skipSat = true; skipSun = true; }
                else if (Number(wrkDays) === 6) { skipSat = false; skipSun = true; }
                else if (Number(wrkDays) === 7) { skipSat = false; skipSun = false; }
                else { skipSun = true; }
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch working days, defaulting to skipSun only:', e);
          skipSun = true;
        }
      } else {
        skipSat = considerOnly.saturday.active;
        skipSun = considerOnly.sunday.active;
      }

      const skipPub = calendarMode === 'existing' ? true : considerOnly.publicHolidays.active;

      let publicHolidayDates = [];
      try {
        const calRes = await fetch(`${apiBaseUrl}/api/calendar`, { headers: getAuthHeaders() });
        if (calRes.ok) {
          const calData = await calRes.json();
          const coyId = project.companyId || project.coyId;
          const pltId = project.plantId || project.pltId;
          
          if (calendarMode === 'existing') {
            const filteredHols = calData.filter(c => {
              if (c.holTyp === 'MANDATORY') return true;
              if (existingSelection.company && coyId && c.coyId === Number(coyId) && c.calType === 'COMPANY') return true;
              if (existingSelection.plant && pltId && c.pltId === Number(pltId) && c.calType === 'PLANT') return true;
              if (existingSelection.external && coyId && c.coyId === Number(coyId) && c.calType === 'EXTERNAL') return true;
              return false;
            });
            publicHolidayDates = filteredHols.map(c => c.calDt).filter(Boolean);
          } else {
            if (skipPub) {
              const filteredHols = calData.filter(c => {
                if (c.holTyp === 'MANDATORY') return true;
                if (considerOnly.publicHolidays.company && coyId && c.coyId === Number(coyId) && c.calType === 'COMPANY') return true;
                if (considerOnly.publicHolidays.plant && pltId && c.pltId === Number(pltId) && c.calType === 'PLANT') return true;
                if (considerOnly.publicHolidays.external && coyId && c.coyId === Number(coyId) && c.calType === 'EXTERNAL') return true;
                return false;
              });
              publicHolidayDates = filteredHols.map(c => c.calDt).filter(Boolean);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch public holidays:", e);
      }

      const projStart = project.startDate || project.tentStDt || project.tent_st_dt || project.start_date || '';
      const projEnd   = project.endDate   || project.tentEndDt  || project.tent_end_dt  || project.end_date   || '';
      let totalDays = parseInt(project.totalProjectDays || project.noOfDays || project.no_of_days || 0, 10);
      if (!totalDays && projStart && projEnd) {
        const sd = parseLocal(projStart);
        const ed = parseLocal(projEnd);
        if (sd && ed) totalDays = Math.round((ed - sd) / 86400000) + 1;
      }
      const projAdjustedEnd = totalDays ? calcEndDate(projStart, totalDays, skipSat, skipSun, publicHolidayDates) : projEnd;

      let hierarchy = [];
      const drftPrjId = project.drftPrjId || project.drft_prj_id || project.projectId || project.project_id || project.id;
      
      if (drftPrjId && !project.isIndividualTask) {
        const milestonesRes = await fetch(`${apiBaseUrl}/api/milestone-drafts/by-project/${drftPrjId}`, { headers: getAuthHeaders() });
        if (milestonesRes.ok) {
          const milestonesData = await milestonesRes.json();
          const sortedMilestones = [...(milestonesData || [])].sort((a, b) => {
            const idA = a.drftMId || a.drft_m_id || 0;
            const idB = b.drftMId || b.drft_m_id || 0;
            return idA - idB;
          });
          for (const m of sortedMilestones) {
            const mStart = m.tentStDt || m.tent_st_dt || '';
            const mEnd = m.tentEndDt || m.tent_end_dt || '';
            let mDays = parseInt(m.mlstnDays || m.mlstn_days || m.workingDays || 0, 10);
            if (!mDays && mStart && mEnd) {
              const sd = parseLocal(mStart);
              const ed = parseLocal(mEnd);
              if (sd && ed) mDays = Math.round((ed - sd) / 86400000) + 1;
            }
            const fallbackMAdjEnd = mDays ? calcEndDate(mStart, mDays, skipSat, skipSun, publicHolidayDates) : mEnd;

            const mId = m.drftMId || m.drft_m_id || m.id;
            const tasksRes = await fetch(`${apiBaseUrl}/api/task-drafts/by-milestone/${mId}`, { headers: getAuthHeaders() });
            let taskRows = [];
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json();
              const sortedTasks = [...(tasksData || [])].sort((a, b) => {
                const idA = a.drftTaskId || a.drft_task_id || 0;
                const idB = b.drftTaskId || b.drft_task_id || 0;
                return idA - idB;
              });

              const taskMap = {};

              const rawTaskRows = sortedTasks.map(t => {
                const tStart = t.tentStDt || t.tent_st_dt || '';
                const tEnd = t.tentEndDt || t.tent_end_dt || '';
                let tDays = parseInt(t.noOfDays || t.no_of_days || t.taskDays || 0, 10);
                if (!tDays && tStart && tEnd) {
                  const sd = parseLocal(tStart);
                  const ed = parseLocal(tEnd);
                  if (sd && ed) tDays = Math.round((ed - sd) / 86400000) + 1;
                }

                let rawStart = tStart || mStart || projStart;
                const depId = t.depTaskId || t.dep_task_id;

                if (depId && taskMap[depId]) {
                  const depObj = taskMap[depId];
                  if (depObj && depObj.adjEnd) {
                    const depStart = depObj.start || '';
                    if (!depStart || !tStart || parseLocal(tStart) > parseLocal(depStart)) {
                      const nextDay = addDays(depObj.adjEnd, 1);
                      if (parseLocal(nextDay) > parseLocal(rawStart)) {
                        rawStart = nextDay;
                      }
                    }
                  }
                } else if (tStart) {
                  let maxPrevAdjEnd = '';
                  sortedTasks.forEach(pt => {
                    const pId = pt.drftTaskId || pt.drft_task_id;
                    const pObj = taskMap[pId] || (pt.taskCd ? taskMap[pt.taskCd] : null);
                    if (pObj && pObj.end && parseLocal(pObj.end) < parseLocal(tStart)) {
                      if (!maxPrevAdjEnd || parseLocal(pObj.adjEnd) > parseLocal(maxPrevAdjEnd)) {
                        maxPrevAdjEnd = pObj.adjEnd;
                      }
                    }
                  });
                  if (maxPrevAdjEnd) {
                    const nextDay = addDays(maxPrevAdjEnd, 1);
                    if (parseLocal(nextDay) > parseLocal(rawStart)) {
                      rawStart = nextDay;
                    }
                  }
                }

                const tAdjStart = getNextWorkingDay(rawStart, skipSat, skipSun, publicHolidayDates);
                const tAdjEnd = (tDays && tAdjStart) ? calcEndDate(tAdjStart, tDays, skipSat, skipSun, publicHolidayDates) : (tEnd || tAdjStart);

                const taskObj = {
                  type: 'T',
                  id: t.drftTaskId || t.drft_task_id,
                  code: t.taskCd || t.task_cd || `TSK-${t.drftTaskId || t.drft_task_id}`,
                  name: t.taskNm || t.task_nm || '',
                  start: tStart,
                  end: tEnd,
                  adjStart: tAdjStart,
                  adjEnd: tAdjEnd,
                  adjDays: tDays
                };

                const tKey = t.drftTaskId || t.drft_task_id;
                if (tKey) taskMap[tKey] = taskObj;
                if (t.taskCd) taskMap[t.taskCd] = taskObj;

                return taskObj;
              });

              // Second pass: Synchronize parallel tasks with identical DB start date (tentStDt)
              const startGroupMap = {};
              rawTaskRows.forEach(t => {
                if (t.start) {
                  if (!startGroupMap[t.start] || parseLocal(t.adjStart) > parseLocal(startGroupMap[t.start])) {
                    startGroupMap[t.start] = t.adjStart;
                  }
                }
              });

              taskRows = rawTaskRows.map(t => {
                if (t.start && startGroupMap[t.start]) {
                  const syncedAdjStart = startGroupMap[t.start];
                  const syncedAdjEnd = (t.adjDays && syncedAdjStart) ? calcEndDate(syncedAdjStart, t.adjDays, skipSat, skipSun, publicHolidayDates) : t.adjEnd;
                  return { ...t, adjStart: syncedAdjStart, adjEnd: syncedAdjEnd };
                }
                return t;
              });
            }

            // Derive Milestone Adjusted End Date as maximum Adjusted End Date of its tasks
            let maxTaskAdjEnd = '';
            taskRows.forEach(t => {
              if (t.adjEnd && (!maxTaskAdjEnd || t.adjEnd > maxTaskAdjEnd)) {
                maxTaskAdjEnd = t.adjEnd;
              }
            });
            const mAdjEnd = maxTaskAdjEnd || fallbackMAdjEnd;

            hierarchy.push({
              type: 'M',
              id: mId,
              code: m.mlstnCd || m.mlstn_cd || `MS-${mId}`,
              name: m.mlstnTtl || m.mlstn_ttl || m.mlstnNm || m.mlstn_nm || '',
              start: mStart,
              end: mEnd,
              adjEnd: mAdjEnd,
              adjDays: mDays,
              tasks: taskRows
            });
          }
        }
      }

      // Derive Project Adjusted End Date based on project's total working days (e.g. 100 days -> 19 Nov 2026)
      let maxMilestoneAdjEnd = '';
      hierarchy.forEach(m => {
        if (m.adjEnd && (!maxMilestoneAdjEnd || m.adjEnd > maxMilestoneAdjEnd)) {
          maxMilestoneAdjEnd = m.adjEnd;
        }
      });
      const projFinalAdjustedEnd = projAdjustedEnd || maxMilestoneAdjEnd;

      const pType = project.isIndividualTask ? 'T' : 'P';
      const pCode = project.isIndividualTask ? (project.taskCd || project.task_cd || `TSK-${project.id || 'NEW'}`) : (project.prjCd || project.prj_cd || project.projectCode || '');
      
      setPreview({
        projectRow: { type: pType, id: 'project', code: pCode, name: project.prjNm || project.prj_nm || project.projectName || '', start: projStart, end: projEnd, adjEnd: projFinalAdjustedEnd, adjDays: totalDays },
        hierarchy, skipSat, skipSun, skipPub
      });
      setStep('preview');
      setExpandedRows(new Set(['project', ...hierarchy.map(m => m.id)]));
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmGoLive = () => {
    onPreview({
      mode: calendarMode,
      existingSelection: calendarMode === 'existing' ? existingSelection : null,
      customSettings: calendarMode === 'custom' ? considerOnly : null,
      excludeSat: preview ? preview.skipSat : false,
      excludeSun: preview ? preview.skipSun : true,
    });
  };

  const renderRow = (item, level = 0, isExpanded = false, hasChildren = false, onToggle = null) => (
    <tr key={item.id} className={`glm-tree-row level-${level}`}>
      <td className="glm-tree-name">
        <span className="glm-tree-indent" style={{ display: 'inline-block', width: level * 24 }}></span>
        {hasChildren ? (
          <button className="glm-tree-toggle" onClick={() => onToggle(item.id)}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="glm-tree-toggle-placeholder" />
        )}
        <span className={`glm-type-badge glm-type-${item.type.toLowerCase()}`}>{item.type}</span>
        <span className="glm-entity-code">{item.code}</span>
        {item.code && item.name && <span className="glm-entity-sep">-</span>}
        <span className="glm-entity-name" title={item.name}>{item.name}</span>
      </td>
      <td>{fmtDate(item.start)}</td>
      <td>{fmtDate(item.end)}</td>
      <td>{item.adjDays || '—'}</td>
      <td className="glm-highlight-cell">{fmtDate(item.adjEnd)}</td>
    </tr>
  );

  return (
    <div className="glm-overlay" onClick={onCancel}>
      <div className="glm-modal" onClick={e => e.stopPropagation()}>
        <div className="glm-header">
          <div>
            <h2 className="glm-title">Go Live – Calendar Configuration</h2>
            <p className="glm-subtitle">{step === 'config' ? 'Configure calendar, holidays and working days.' : `Preview of actual ${project?.isIndividualTask ? 'task' : 'project'} dates for "${project?.prjNm || project?.projectName || 'Item'}".`}</p>
          </div>
          <button className="glm-close-btn" onClick={onCancel}><X size={18} /></button>
        </div>

        <div className="glm-steps">
          <div className={`glm-step ${step === 'config' ? 'active' : 'done'}`}>
            <span className="glm-step-num">{step === 'config' ? '1' : <CheckCircle size={14}/>}</span>
            <span>Calendar Setup</span>
          </div>
          <div className="glm-step-line" />
          <div className={`glm-step ${step === 'preview' ? 'active' : ''}`}>
            <span className="glm-step-num">2</span>
            <span>Preview Dates</span>
          </div>
        </div>

        {step === 'config' && (
          <div className="glm-body">
            <p className="glm-section-label">Calendar Mode</p>
            <p className="glm-section-hint">Choose how you want to configure the calendar for this project.</p>
            <div className={`glm-option-card ${calendarMode === 'existing' ? 'selected' : ''}`} onClick={() => setCalendarMode('existing')}>
              <input type="radio" name="calMode" readOnly checked={calendarMode === 'existing'} className="glm-radio" />
              <div><strong>Use Existing Business Calendar</strong><p>Use working days and holidays already defined in Company, Plant or External calendar.</p></div>
            </div>
            {calendarMode === 'existing' && (
              <div className="glm-sub-cards">
                {['company','plant','external'].map(opt => (
                  <div key={opt} className={`glm-sub-card ${existingSelection[opt] ? 'selected' : ''}`} onClick={() => setExistingSelection(prev => ({ ...prev, [opt]: !prev[opt] }))}>
                    <input type="checkbox" readOnly checked={!!existingSelection[opt]} className="glm-checkbox-sm"/>
                    {opt === 'company' && <Building2 size={22} className="glm-sub-icon"/>}
                    {opt === 'plant'   && <Factory   size={22} className="glm-sub-icon"/>}
                    {opt === 'external'&& <CalendarIcon size={22} className="glm-sub-icon"/>}
                    <div><div className="glm-sub-title">{opt.charAt(0).toUpperCase()+opt.slice(1)}</div><div className="glm-sub-desc">Use working days defined for {opt}.</div></div>
                  </div>
                ))}
                <div className="glm-info-note"><Info size={14}/> If Calendar doesn't exist for External, Company Calendar will be used.</div>
              </div>
            )}
            <div className={`glm-option-card ${calendarMode === 'custom' ? 'selected' : ''}`} style={{ marginTop: 10 }} onClick={() => setCalendarMode('custom')}>
              <input type="radio" name="calMode" readOnly checked={calendarMode === 'custom'} className="glm-radio" />
              <div><strong>Define Custom Calendar</strong><p>Define non-working days (Saturday, Sunday, Public Holidays) for the selected calendar.</p></div>
            </div>
            {calendarMode === 'custom' && (
              <>
                <p className="glm-section-label" style={{marginTop:20}}>Consider Non-Working Days</p>
                <p className="glm-section-hint">Choose which days to exclude from working day calculations.</p>
                <div className="glm-chk-grid">
                  {[{ key:'saturday', label:'Saturday' }, { key:'sunday', label:'Sunday' }, { key:'publicHolidays', label:'Public Holidays' }].map(({ key, label }) => (
                    <div key={key} className="glm-chk-col">
                      <label className="glm-chk-master"><input type="checkbox" checked={considerOnly[key].active} onChange={() => toggleMaster(key)} /><span>{label}</span></label>
                      <div className={`glm-chk-subs ${!considerOnly[key].active ? 'disabled' : ''}`}>
                        {['company','plant','external'].map(sub => (
                          <label key={sub} className="glm-chk-sub"><input type="checkbox" checked={considerOnly[key][sub]} onChange={() => toggleSub(key, sub)} disabled={!considerOnly[key].active} /><span>{sub.charAt(0).toUpperCase()+sub.slice(1)}</span></label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="glm-body">
            <div className="glm-preview-summary">
              <div className="glm-preview-badge success"><CheckCircle size={16}/> Calendar rules applied successfully</div>
              <div className="glm-preview-rules">
                {preview.skipSat && <span className="glm-tag">Saturdays excluded</span>}
                {preview.skipSun && <span className="glm-tag">Sundays excluded</span>}
                {preview.skipPub && <span className="glm-tag">Holidays excluded</span>}
                {!preview.skipSat && !preview.skipSun && !preview.skipPub && <span className="glm-tag">All days included</span>}
              </div>
              <div className="glm-info-note" style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
                <Info size={14} /> Note: Adjusted End Dates are extended to accommodate the excluded non-working days while maintaining the original duration.
              </div>
            </div>

            <table className="glm-preview-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Entity Name</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Duration</th>
                  <th>Adjusted End Date</th>
                </tr>
              </thead>
              <tbody>
                {renderRow(preview.projectRow, 0, expandedRows.has(preview.projectRow.id), preview.hierarchy.length > 0, toggleRow)}
                {expandedRows.has(preview.projectRow.id) && preview.hierarchy.map(m => (
                  <React.Fragment key={m.id}>
                    {renderRow(m, 1, expandedRows.has(m.id), m.tasks && m.tasks.length > 0, toggleRow)}
                    {expandedRows.has(m.id) && m.tasks.map(t => renderRow(t, 2, false, false, null))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            <div className="glm-confirm-note">
              <AlertTriangle size={15} />
              Clicking <strong>"Confirm Go Live"</strong> will {project?.isIndividualTask ? 'assign this task' : 'promote this project to LIVE status'} using the calendar configuration above.
            </div>
          </div>
        )}

        <div className="glm-footer">
          {step === 'config' ? (
            <><button className="glm-btn-secondary" onClick={onCancel}><X size={14}/> Cancel</button>
            <button className="glm-btn-primary" onClick={buildPreview} disabled={previewLoading || !isConfigValid()}>
              {previewLoading ? <Loader2 size={14} className="glm-spin"/> : <ArrowRight size={14}/>}
              {previewLoading ? 'Calculating…' : `Preview ${project?.isIndividualTask ? 'Task' : 'Project'} Dates`}
            </button></>
          ) : (
            <><button className="glm-btn-secondary" onClick={() => setStep('config')}><ArrowLeft size={14}/> Back to Setup</button>
            <button className="glm-btn-primary" onClick={handleConfirmGoLive}><CheckCircle size={14}/> Confirm Go Live</button></>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoLiveCalendar;

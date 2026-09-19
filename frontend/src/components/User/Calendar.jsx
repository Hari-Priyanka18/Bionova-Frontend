// src/components/User/Calendar.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import "../../styles/calendar.css";

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Calendar as CalendarIcon,
  Check,
  Menu,
  ArrowRight
} from "lucide-react";
import { apiGet } from "../../utils/api";
import { getScreenPermission } from "../../utils/permissions";

const EVENT_COLORS = {
  task: "#2563eb",       
  milestone: "#f59e0b",  
  meeting: "#8b5cf6",    
  overdue: "#ef4444",    
  today: "#3b82f6",
  holiday: "#e11d48",
  closed: "#4b5563"
};

const Calendar = ({ userRole, onLogout }) => {
  const navigate = useNavigate();
  const screenPerm = getScreenPermission('CALENDAR');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month"); // 'month', 'week', 'day'
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthPickerRef = useRef(null);

  // API data states
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter States
  const [filterTasks, setFilterTasks] = useState(true);
  const [filterMilestones, setFilterMilestones] = useState(true);
  const [filterOverdue, setFilterOverdue] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Helper formatting and parsing
  const formatDateStr = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const clean = String(dateStr).split('T')[0].split(' ')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const cleanStr = String(dateStr).split('T')[0].split(' ')[0];
    const [year, month, day] = cleanStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatModalDateHeader = (dateObj) => {
    if (!dateObj) return "";
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Close month picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target)) {
        setShowMonthPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch events when date or view changes
  useEffect(() => {
    const fetchCalendarData = async () => {
      setLoading(true);
      setError(null);
      try {
        const formattedDate = formatDateStr(currentDate);
        const data = await apiGet(`/api/calendar/user-feed?viewType=${view}&date=${formattedDate}&showClosed=${showCompleted}`).catch(() => []);
        const rawFeed = data || [];

        let allEvents = [];

        try {
          const profile = await apiGet("/api/profile").catch(() => null);
          const liveTasks = await apiGet("/api/task-live").catch(() => []);
          const indTasks = await apiGet("/api/assignments").catch(() => []);
          const rawHolidays = await apiGet("/api/calendar").catch(() => []);

          const empId = profile ? (profile.empId || profile.empid || profile.id) : null;

          // 1. Process Holidays from /api/calendar first
          const seenHolidayKeys = new Set();
          if (Array.isArray(rawHolidays)) {
            rawHolidays.forEach(h => {
              if (!h.calDt) return;
              const holTitle = h.holidayNm || h.name || h.title || "Public Holiday";
              const holKey = `${h.calDt}_${holTitle.trim().toLowerCase()}`;
              if (!seenHolidayKeys.has(holKey)) {
                seenHolidayKeys.add(holKey);
                allEvents.push({
                  id: `HOLIDAY-${h.clId || h.id || Math.random()}`,
                  title: holTitle,
                  type: 'holiday',
                  date: h.calDt,
                  status: h.holTyp || 'MANDATORY',
                  code: 'Public Holiday',
                  description: holTitle
                });
              }
            });
          }

          // 2. Collect and deduplicate all employee tasks (Live project tasks and individual assignments)
          const userTaskMap = new Map();

          if (Array.isArray(liveTasks)) {
            const userLive = liveTasks.filter(t => 
              !empId ||
              String(t.empId) === String(empId) ||
              String(t.empid) === String(empId) ||
              String(t.reviewerId) === String(empId) || 
              String(t.approverId) === String(empId) ||
              String(t.reviewer) === String(empId) ||
              String(t.approver) === String(empId)
            );
            userLive.forEach(t => {
              const rawId = String(t.taskId || t.id || t.taskCd || '').replace(/^TASK[-_]?/i, '').trim();
              const key = rawId ? `LIVE_${rawId}` : `LIVE_${(t.taskNm || '').trim().toLowerCase()}_${t.endDt || t.stDt}`;
              if (!userTaskMap.has(key)) {
                userTaskMap.set(key, { ...t, _taskSource: 'LIVE', _cleanId: rawId, _uniqueKey: key });
              }
            });
          }

          if (Array.isArray(indTasks)) {
            const userInd = indTasks.filter(t => 
              !empId ||
              String(t.empId) === String(empId) ||
              String(t.empid) === String(empId) ||
              String(t.reviewerId) === String(empId) ||
              String(t.approverId) === String(empId) ||
              String(t.reviewer) === String(empId) ||
              String(t.approver) === String(empId)
            );
            userInd.forEach(t => {
              const rawId = String(t.empTaskId || t.id || t.taskCd || '').replace(/^IND[-_]?TASK[-_]?/i, '').trim();
              const key = rawId ? `IND_${rawId}` : `IND_${(t.taskNm || '').trim().toLowerCase()}_${t.endDt || t.stDt}`;
              if (!userTaskMap.has(key)) {
                userTaskMap.set(key, { ...t, _taskSource: 'IND', _cleanId: rawId, _uniqueKey: key });
              }
            });
          }

          // Also include tasks & milestones from user-feed that might not be in liveTasks/indTasks
          if (Array.isArray(rawFeed)) {
            rawFeed.forEach(evt => {
              const typeLower = (evt.type || "").toLowerCase();
              if (typeLower === 'holiday') {
                const holTitle = (evt.title || "").trim().toLowerCase();
                const holKey = `${evt.date}_${holTitle}`;
                if (!seenHolidayKeys.has(holKey) && !allEvents.some(e => (e.type || '').toLowerCase() === 'holiday' && `${e.date}_${(e.title || '').trim().toLowerCase()}` === holKey)) {
                  seenHolidayKeys.add(holKey);
                  allEvents.push(evt);
                }
              } else if (typeLower === 'milestone') {
                const msId = String(evt.id || evt.mId || '').replace(/^MILESTONE-/i, '');
                const msTitle = (evt.title || '').trim().toLowerCase();
                if (!allEvents.some(e => (e.type || '').toLowerCase() === 'milestone' && (String(e.id || '').replace(/^MILESTONE-/i, '') === msId || ((e.title || '').trim().toLowerCase() === msTitle && e.date === evt.date)))) {
                  allEvents.push(evt);
                }
              } else if (typeLower === 'task' || typeLower === 'overdue' || evt.taskId) {
                const rawIdStr = String(evt.id || evt.taskId || '');
                const isIndTask = rawIdStr.toUpperCase().startsWith('IND-TASK') || rawIdStr.toUpperCase().startsWith('IND_TASK');
                const cleanId = rawIdStr.replace(/^(IND[-_]TASK|TASK)[-_]?/i, '').trim();
                const evtTitle = (evt.title || '').trim().toLowerCase();
                const evtDate = evt.date ? String(evt.date).split('T')[0] : '';
                const evtCode = (evt.code || '').trim().toLowerCase();

                // Check if this task is already in userTaskMap
                let found = false;
                if (isIndTask && cleanId) {
                  if (userTaskMap.has(`IND_${cleanId}`)) found = true;
                } else if (cleanId) {
                  if (userTaskMap.has(`LIVE_${cleanId}`)) found = true;
                }

                // Match by code or by title + date
                if (!found) {
                  for (const existing of userTaskMap.values()) {
                    const exTitle = (existing.taskNm || existing.taskName || existing.title || '').trim().toLowerCase();
                    const exEnd = String(existing.endDt || existing.dueDate || existing.date || '').split('T')[0];
                    const exStart = String(existing.stDt || existing.startDate || '').split('T')[0];
                    const exCode = (existing.taskCd || existing.empTaskCd || existing.code || '').trim().toLowerCase();
                    
                    if (evtCode && exCode && evtCode === exCode) {
                      found = true;
                      break;
                    }
                    if (exTitle && evtTitle && exTitle === evtTitle && (exEnd === evtDate || exStart === evtDate)) {
                      found = true;
                      break;
                    }
                  }
                }

                if (!found) {
                  const source = isIndTask ? 'IND' : 'LIVE';
                  const key = cleanId ? `${source}_${cleanId}` : `${source}_${evtTitle}_${evtDate}`;
                  userTaskMap.set(key, {
                    taskId: isIndTask ? undefined : cleanId,
                    empTaskId: isIndTask ? cleanId : undefined,
                    taskNm: evt.title,
                    endDt: evt.date,
                    stDt: evt.startDate || evt.stDt || evt.date,
                    taskSts: evt.status,
                    taskCd: evt.code,
                    taskDesc: evt.description,
                    _taskSource: source,
                    _cleanId: cleanId,
                    _uniqueKey: key
                  });
                }
              } else {
                allEvents.push(evt);
              }
            });
          }

          // 3. Process every task -> map strictly to Start Date and Due Date (no intermediate days)
          const processedEventKeys = new Set();

          userTaskMap.forEach(t => {
            const isInd = t._taskSource === 'IND' || Boolean(t.empTaskId);
            const rawId = String(t.empTaskId || t.taskId || t.id || t.taskCd || t.taskNm || Math.random().toString());
            const cleanId = rawId.replace(/^(IND[-_]TASK|TASK)[-_]?/i, '').trim();
            const taskUniqueId = isInd ? `IND-${cleanId}` : `TASK-${cleanId}`;

            const title = t.taskNm || t.taskName || t.taskTitle || t.title || "Task";
            const code = t.taskCd || t.empTaskCd || t.code || "";
            const status = t.taskSts || t.tasksts || t.status || "OPEN";
            const desc = t.taskDesc || t.description || "";
            const actCmpDt = t.actCmpDt || t.actcmpdt || t.act_cmp_dt || t.completedTs || t.sbmtDt || "";

            const rawSt = t.stDt || t.stdt || t.startDate || t.start_date || t.st_dt || "";
            const rawEnd = t.endDt || t.enddt || t.dueDate || t.due_date || t.endDate || t.end_date || t.date || t.targetDt || "";

            const cleanStart = rawSt ? String(rawSt).split('T')[0].split(' ')[0] : "";
            const cleanEnd = rawEnd ? String(rawEnd).split('T')[0].split(' ')[0] : "";

            const startStr = cleanStart || cleanEnd;
            const endStr = cleanEnd || cleanStart;

            if (!startStr && !endStr) return;

            const isSameDay = !startStr || !endStr || startStr === endStr;

            const subStatus = t.subStatus || t.sub_status || t.subSts || t.sub_sts || t.prcsYesActn || t.prcs_yes_actn || "";
            const leadLagStatus = t.leadLagStatus || t.lead_lag_status || t.leadLagSts || t.lead_lag_sts || "";
            const normalizedTitle = title.trim().toLowerCase();

            if (isSameDay) {
              const targetDate = endStr || startStr;
              const eventKey = `${taskUniqueId}_due_${targetDate}_${normalizedTitle}`;
              if (!processedEventKeys.has(eventKey)) {
                processedEventKeys.add(eventKey);
                allEvents.push({
                  id: `${taskUniqueId}-${targetDate}`,
                  taskId: cleanId,
                  taskType: isInd ? 'INDIVIDUAL' : 'PROJECT',
                  type: 'task',
                  title: title,
                  date: targetDate,
                  startDate: startStr,
                  endDate: endStr,
                  dateBadge: 'Due Date',
                  status: status,
                  subStatus: subStatus,
                  leadLagStatus: leadLagStatus,
                  code: code,
                  description: desc,
                  actCmpDt: actCmpDt,
                  completed: t.completed,
                  closed: t.closed,
                  isClosed: t.isClosed,
                  progress: t.progress,
                  sts: t.sts
                });
              }
            } else {
              // 1. Start Date only
              const startKey = `${taskUniqueId}_start_${startStr}_${normalizedTitle}`;
              if (!processedEventKeys.has(startKey)) {
                processedEventKeys.add(startKey);
                allEvents.push({
                  id: `${taskUniqueId}-start-${startStr}`,
                  taskId: cleanId,
                  taskType: isInd ? 'INDIVIDUAL' : 'PROJECT',
                  type: 'task',
                  title: title,
                  date: startStr,
                  startDate: startStr,
                  endDate: endStr,
                  dateBadge: 'Start Date',
                  status: status,
                  subStatus: subStatus,
                  leadLagStatus: leadLagStatus,
                  code: code,
                  description: desc,
                  actCmpDt: actCmpDt,
                  completed: t.completed,
                  closed: t.closed,
                  isClosed: t.isClosed,
                  progress: t.progress,
                  sts: t.sts
                });
              }

              // 2. Due Date only
              const dueKey = `${taskUniqueId}_due_${endStr}_${normalizedTitle}`;
              if (!processedEventKeys.has(dueKey)) {
                processedEventKeys.add(dueKey);
                allEvents.push({
                  id: `${taskUniqueId}-due-${endStr}`,
                  taskId: cleanId,
                  taskType: isInd ? 'INDIVIDUAL' : 'PROJECT',
                  type: 'task',
                  title: title,
                  date: endStr,
                  startDate: startStr,
                  endDate: endStr,
                  dateBadge: 'Due Date',
                  status: status,
                  subStatus: subStatus,
                  leadLagStatus: leadLagStatus,
                  code: code,
                  description: desc,
                  actCmpDt: actCmpDt,
                  completed: t.completed,
                  closed: t.closed,
                  isClosed: t.isClosed,
                  progress: t.progress,
                  sts: t.sts
                });
              }
            }
          });

        } catch (extraErr) {
          console.warn("Failed to fetch extra task dates", extraErr);
          if (allEvents.length === 0) {
            allEvents = rawFeed;
          }
        }

        // Final safeguard deduplication across all events
        const uniqueEvents = [];
        const seenSignatures = new Set();

        allEvents.forEach(evt => {
          const type = (evt.type || 'task').toLowerCase();
          const evtDate = evt.date ? String(evt.date).split('T')[0] : '';
          const evtTitle = (evt.title || '').trim().toLowerCase();
          const badge = (evt.dateBadge || '').toLowerCase();
          const code = (evt.code || '').trim().toLowerCase();
          const rawId = String(evt.id || evt.taskId || '').toLowerCase();

          const sig = `${type}_${evtDate}_${badge}_${evtTitle}_${code || rawId}`;
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            uniqueEvents.push(evt);
          }
        });

        setEventsList(uniqueEvents);
      } catch (err) {
        console.error("Error fetching calendar data:", err);
        setError("Failed to load calendar events.");
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [currentDate, view, showCompleted]);

  // Robust Helper to extract status string
  const getEventStatusString = (evt) => {
    if (!evt) return "";
    let rawStatus = evt.status || evt.taskSts || evt.subStatus || evt.projectStatus || "";
    if (typeof rawStatus === 'object' && rawStatus !== null) {
      rawStatus = rawStatus.statusNm || rawStatus.name || rawStatus.status || "";
    }
    return String(rawStatus).toUpperCase();
  };

  // Helper to check if event is closed/completed
  const isEventClosed = (evt) => {
    if (!evt) return false;
    const statusUpper = getEventStatusString(evt);
    const completedStatuses = [
      'COMPLETED', 'DONE', 'CLOSE', 'CLOSED', 'COMPLETE', 'FINISHED', 
      '100%', 'INACTIVE', 'IN_ACTIVE', 'DEACTIVATED', 'RESOLVED', 'APPROVED', 'CANCELLED', 'ARCHIVED', '4'
    ];
    const isCompletedStatus = completedStatuses.includes(statusUpper);
    const isCompletedBool = evt.completed === true || evt.closed === true || evt.isClosed === true || evt.progress === 100;
    const isInactiveSts = evt.sts === false || evt.sts === 0 || evt.sts === "0" || evt.sts === "false" || evt.sts === "Inactive";

    return isCompletedStatus || isCompletedBool || isInactiveSts;
  };

  // Helper to calculate Lead / Lag / On Time for popup modal
  const calculateTaskLeadLag = (evt) => {
    if (!evt) return null;
    const isClosed = isEventClosed(evt);
    if (!isClosed) return null;

    const rawStatus = evt.leadLagStatus || evt.subStatus || evt.sub_status || evt.scheduleStatus || "";
    const rawUpper = String(rawStatus).toUpperCase();
    if (rawUpper.includes('LEAD') || rawUpper.includes('LAG') || rawUpper.includes('ON TIME') || rawUpper.includes('ONTIME')) {
      if (rawUpper.includes('LEAD')) {
        const daysMatch = String(rawStatus).match(/\d+/);
        const days = daysMatch ? daysMatch[0] : null;
        return {
          status: 'LEAD',
          label: days ? `LEAD (${days} DAYS)` : 'LEAD',
          color: '#16a34a',
          bg: '#dcfce7',
          border: '#bbf7d0'
        };
      } else if (rawUpper.includes('LAG')) {
        const daysMatch = String(rawStatus).match(/\d+/);
        const days = daysMatch ? daysMatch[0] : null;
        return {
          status: 'LAG',
          label: days ? `LAG (${days} DAYS)` : 'LAG',
          color: '#dc2626',
          bg: '#fee2e2',
          border: '#fecaca'
        };
      } else {
        return {
          status: 'ON TIME',
          label: 'ON TIME',
          color: '#2563eb',
          bg: '#dbeafe',
          border: '#bfdbfe'
        };
      }
    }

    const targetStr = evt.endDate || evt.endDt || evt.dueDate || evt.due_date || evt.targetDt || evt.target_dt || evt.date;
    const compStr = evt.actCmpDt || evt.actcmpdt || evt.act_cmp_dt || evt.completedTs || evt.sbmtDt;

    if (!targetStr || !compStr) {
      return {
        status: 'ON TIME',
        label: 'ON TIME',
        color: '#2563eb',
        bg: '#dbeafe',
        border: '#bfdbfe'
      };
    }

    try {
      const targetDate = parseLocalDate(targetStr);
      const compDate = parseLocalDate(compStr);
      if (!targetDate || !compDate) return null;

      targetDate.setHours(0,0,0,0);
      compDate.setHours(0,0,0,0);

      const diffTime = targetDate.getTime() - compDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        return {
          status: 'LEAD',
          label: `LEAD (${diffDays} DAYS)`,
          color: '#16a34a',
          bg: '#dcfce7',
          border: '#bbf7d0'
        };
      } else if (diffDays < 0) {
        return {
          status: 'LAG',
          label: `LAG (${Math.abs(diffDays)} DAYS)`,
          color: '#dc2626',
          bg: '#fee2e2',
          border: '#fecaca'
        };
      } else {
        return {
          status: 'ON TIME',
          label: 'ON TIME',
          color: '#2563eb',
          bg: '#dbeafe',
          border: '#bfdbfe'
        };
      }
    } catch (_) {
      return null;
    }
  };

  const getEventDateString = (evt) => {
    if (!evt) return "";
    let raw = evt.date || evt.dueDate || evt.tentEndDt || evt.tent_end_dt || evt.endDate || evt.end_date || evt.endDt || evt.enddt || evt.actCmpDt || evt.actcmpdt || evt.act_cmp_dt || "";
    if (!raw) return "";
    
    let cleanStr = String(raw).split('T')[0].split(' ')[0];
    
    const monthMap = { jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06", jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12" };
    if (/^\d{1,2}-[a-zA-Z]{3}-\d{4}$/.test(cleanStr)) {
      const parts = cleanStr.split('-');
      const m = monthMap[parts[1].toLowerCase()];
      if (m) {
        return `${parts[2]}-${m}-${parts[0].padStart(2, '0')}`;
      }
    }
    
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(cleanStr)) {
      const parts = cleanStr.split(/[-/]/);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    return cleanStr;
  };



  // Determine event type (with overdue check)
  const getEventType = (evt) => {
    if (!evt) return 'task';
    const typeLower = (evt.type || "").toLowerCase();
    const isClosed = isEventClosed(evt);

    if (isClosed) {
      return 'closed';
    }

    const isMilestone = typeLower === 'milestone' || typeLower.includes('milestone') || (evt.id && evt.id.toString().toUpperCase().includes('MILESTONE'));
    if (isMilestone) {
      return 'milestone';
    }

    const isHoliday = typeLower === 'holiday' || typeLower.includes('holiday');
    if (isHoliday) {
      return 'holiday';
    }

    const isTask = typeLower === 'task' || 
                   typeLower === 'overdue' || 
                   typeLower.includes('task') || 
                   (evt.id && evt.id.toString().toUpperCase().includes('TASK')) ||
                   evt.taskId || evt.taskCd || evt.empTaskId;

    if (isTask) {
      const statusUpper = getEventStatusString(evt);
      const isExplicitOverdue = typeLower === 'overdue' || statusUpper === 'OVERDUE' || evt.isOverdue === true || evt.overdue === true;
      const dateVal = getEventDateString(evt);
      const taskDate = parseLocalDate(dateVal);
      if (taskDate) {
        taskDate.setHours(23, 59, 59, 999);
      }
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const isPast = taskDate ? taskDate < todayStart : false;

      if (!isClosed && (isExplicitOverdue || isPast)) {
        return 'overdue';
      }
      return 'task';
    }

    return 'meeting'; 
  };

  // Filter events
  const getFilteredEvents = () => {
    return eventsList.filter(evt => {
      const isClosed = isEventClosed(evt);

      if (isClosed) {
        return showCompleted;
      }

      const eventType = getEventType(evt);

      if (eventType === 'task' && !filterTasks) return false;
      if (eventType === 'overdue' && !filterOverdue) return false;
      if (eventType === 'milestone' && !filterMilestones) return false;

      return true;
    });
  };

  const getEventsForDate = (dateObj) => {
    const dateStr = formatDateStr(dateObj);
    const dateObjTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();

    return getFilteredEvents().filter(evt => {
      const typeLower = (evt.type || "").toLowerCase();
      const isMilestone = typeLower === 'milestone' || typeLower.includes('milestone') || (evt.id && evt.id.toString().toUpperCase().includes('MILESTONE'));
      
      if (isMilestone) {
        const sStr = evt.startDate || evt.stDt || evt.date;
        const eStr = evt.endDate || evt.endDt || evt.dueDate || evt.date;
        if (sStr && eStr) {
          const sDate = parseLocalDate(sStr);
          const eDate = parseLocalDate(eStr);
          if (sDate && eDate) {
            sDate.setHours(0,0,0,0);
            eDate.setHours(0,0,0,0);
            if (dateObjTime >= sDate.getTime() && dateObjTime <= eDate.getTime()) {
              return true;
            }
          }
        }
      }
      
      
      const evtDateStr = String(getEventDateString(evt));
      if (!evtDateStr) return false;
      const cleanEvtDate = evtDateStr.split('T')[0].split(' ')[0];
      return cleanEvtDate === dateStr;
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);
    next7Days.setHours(23, 59, 59, 999);

    return eventsList
      .filter(evt => {
        // Closed/completed tasks should NEVER appear in Upcoming Due's
        if (isEventClosed(evt)) {
          return false;
        }

        const eventType = getEventType(evt);
        if (eventType === 'task' && !filterTasks) return false;
        if (eventType === 'overdue' && !filterOverdue) return false;
        if (eventType === 'milestone' && !filterMilestones) return false;

        const dateVal = getEventDateString(evt);
        const evtDate = parseLocalDate(dateVal);
        if (!evtDate) return false;
        evtDate.setHours(0, 0, 0, 0);
        return evtDate >= tomorrow && evtDate <= next7Days;
      })
      .sort((a, b) => new Date(getEventDateString(a)) - new Date(getEventDateString(b)));
  };

  const previousMonth = () => {
    if (view === "month") {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    } else if (view === "week") {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      const prevDay = new Date(currentDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setCurrentDate(prevDay);
    }
  };

  const nextMonth = () => {
    if (view === "month") {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    } else if (view === "week") {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setCurrentDate(nextDay);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleMonthSelect = (mIndex) => {
    setCurrentDate(new Date(currentYear, mIndex, 1));
    setShowMonthPicker(false);
  };

  const handleYearChange = (delta) => {
    setCurrentDate(new Date(currentYear + delta, currentMonth, 1));
  };

  // Determine which days to show based on the view filter
  let visibleDays = [];
  let emptyPrefix = 0;

  if (view === "month") {
    const startDate = new Date(currentYear, currentMonth, 1);
    const firstDayOfWeek = startDate.getDay();
    const daysToPrepend = firstDayOfWeek;
    
    // Previous month dates
    for (let i = daysToPrepend - 1; i >= 0; i--) {
      visibleDays.push(new Date(currentYear, currentMonth, -i));
    }
    
    // Current month dates
    for (let i = 1; i <= daysInMonth; i++) {
      visibleDays.push(new Date(currentYear, currentMonth, i));
    }
    
    // Next month dates
    const daysToAppend = 42 - visibleDays.length;
    for (let i = 1; i <= daysToAppend; i++) {
      visibleDays.push(new Date(currentYear, currentMonth + 1, i));
    }
    emptyPrefix = 0;
  } else if (view === "week") {
    emptyPrefix = 0;
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      visibleDays.push(d);
    }
  } else if (view === "day") {
    emptyPrefix = currentDate.getDay();
    visibleDays = [currentDate];
  }

  return (
    <div className="cc-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="cc-shell" style={{ background: "#ffffff" }}>
        <Header 
          title="CALENDAR" 
          subtitle="View your tasks, milestones, deadlines and meetings."
          showSearch={false} 
        />

        <main className="calendar-content">
          {/* Top Header */}
          <div className="calendar-header-wrapper">
            <div className="calendar-page-info">
              <button className="mobile-menu-btn" onClick={() => window.dispatchEvent(new CustomEvent('toggleSidebar'))}>
                <Menu size={24} />
              </button>
            </div>

            <div className="calendar-top-controls">
              <div className="calendar-view-toggles">
                <button className={`toggle-btn ${view === "month" ? "active" : ""}`} onClick={() => setView("month")}>Month</button>
                <button className={`toggle-btn ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>Week</button>
                <button className={`toggle-btn ${view === "day" ? "active" : ""}`} onClick={() => setView("day")}>Day</button>
              </div>
              
              <div className="calendar-nav-controls">
                <button className="today-btn" onClick={goToToday}>Today</button>
                <div className="nav-arrows">
                  <button onClick={previousMonth} className="nav-btn"><ChevronLeft size={16} /></button>
                  <button onClick={nextMonth} className="nav-btn"><ChevronRight size={16} /></button>
                </div>
              </div>

             
            </div>
          </div>

          <div className="calendar-content-wrapper">
            {/* Main Grid Area */}
            <div className="calendar-grid-area">
              
              <div className="calendar-month-selector" style={{ position: "relative" }} ref={monthPickerRef}>
                <h2 onClick={() => setShowMonthPicker(!showMonthPicker)}>
                  {months[currentMonth]} {currentYear} <ChevronDown size={20} />
                </h2>
                
                {showMonthPicker && (
                  <div className="month-picker-dropdown">
                    <div className="year-selector">
                      <button onClick={() => handleYearChange(-1)}><ChevronLeft size={16}/></button>
                      <span>{currentYear}</span>
                      <button onClick={() => handleYearChange(1)}><ChevronRight size={16}/></button>
                    </div>
                    <div className="months-grid">
                      {months.map((m, idx) => (
                        <div 
                          key={m} 
                          className={`month-cell ${idx === currentMonth ? 'active' : ''}`}
                          onClick={() => handleMonthSelect(idx)}
                        >
                          {m.substring(0, 3)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="calendar-grid-container">
                <div className="calendar-weekdays">
                  {weekDays.map(day => (
                    <div key={day} className="weekday-cell">{day}</div>
                  ))}
                </div>

                <div className="calendar-days-grid" style={{ gridTemplateRows: view === "day" ? "minmax(300px, auto)" : "auto" }}>
                  {/* Empty cells for visual offset in week/month view */}
                  {Array.from({ length: emptyPrefix }).map((_, i) => (
                    <div key={`empty-${i}`} className="calendar-day empty">
                    </div>
                  ))}

                  {/* Visible days */}
                  {visibleDays.map((dayObj, index) => {
                    const day = dayObj.getDate();
                    const dayEvents = getEventsForDate(dayObj);
                    const todayObj = new Date();
                    const isToday = dayObj.getDate() === todayObj.getDate() &&
                                    dayObj.getMonth() === todayObj.getMonth() &&
                                    dayObj.getFullYear() === todayObj.getFullYear();
                    const isOtherMonth = view === "month" && dayObj.getMonth() !== currentMonth;

                    return (
                      <div key={index} className={`calendar-day ${isToday ? "today-cell" : ""} ${isOtherMonth ? "empty" : ""}`} onClick={(e) => {
                        setSelectedDateEvents({ date: dayObj, events: dayEvents });
                      }}>
                        <div className="day-number-wrapper">
                          <span className={`day-number ${isToday ? "today-number" : ""} ${isOtherMonth ? "empty-number" : ""}`}>{day}</span>
                        </div>
                        <div className="day-events-list">
                          {dayEvents.slice(0, 3).map((evt, idx) => {
                            const eventType = getEventType(evt);
                            const isStart = evt.dateBadge === 'Start Date';
                            const dotColor = isStart ? '#10b981' : (EVENT_COLORS[eventType] || EVENT_COLORS.task);
                            return (
                              <div 
                                key={idx} 
                                className="calendar-event-item" 
                                style={{ cursor: "pointer" }}
                              >
                                <span className="event-dot" style={{ backgroundColor: dotColor }}></span>
                                <div className="event-text">
                                  <span className="event-title">
                                    {evt.dateBadge && (
                                      <span style={{ 
                                        fontSize: '9.5px', 
                                        fontWeight: '700', 
                                        color: isStart ? '#059669' : '#2563eb',
                                        marginRight: '4px',
                                        backgroundColor: isStart ? '#ecfdf5' : '#eff6ff',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        display: 'inline-block'
                                      }}>
                                        {isStart ? 'Start' : 'Due'}
                                      </span>
                                    )}
                                    {evt.title}
                                  </span>
                                  {evt.time && <span className="event-subtitle">{evt.time}</span>}
                                </div>
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="event-more-text" style={{ cursor: "pointer", fontWeight: "600" }} onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateEvents({ date: dayObj, events: dayEvents });
                            }}>
                              + {dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Fill empty cells at end if needed to complete the row */}
                  {view === "week" && Array.from({ length: 7 - (emptyPrefix + visibleDays.length) }).map((_, i) => (
                    <div key={`end-empty-${i}`} className="calendar-day empty"></div>
                  ))}
                  {view === "day" && Array.from({ length: 6 - emptyPrefix }).map((_, i) => (
                    <div key={`end-empty-${i}`} className="calendar-day empty"></div>
                  ))}

                </div>
              </div>

              {/* Legend */}
              <div className="calendar-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: "#10b981" }}></span>
                  Task Start Date
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: "#2563eb" }}></span>
                  Task Due Date
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: EVENT_COLORS.milestone }}></span>
                  Milestones
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: EVENT_COLORS.overdue }}></span>
                  Overdue
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: EVENT_COLORS.holiday }}></span>
                  Holiday
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="calendar-right-sidebar" style={{ marginTop: '38px' }}>
              
              {/* Upcoming Events */}
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <h3>UPCOMING DUE'S <span>(Next 7 Days)</span></h3>
                  {loading && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "#195dfa",
                      fontWeight: 600
                    }}>
                      <div className="calendar-mini-spinner" />
                      <style>{`
                        .calendar-mini-spinner {
                          width: 12px;
                          height: 12px;
                          border: 2px solid #e0e7ff;
                          border-top-color: #195dfa;
                          border-radius: 50%;
                          animation: mini-spinner 0.6s linear infinite;
                        }
                        @keyframes mini-spinner {
                          to { transform: rotate(360deg); }
                        }
                      `}</style>
                    </div>
                  )}
                </div>
                <div className="upcoming-list">
                  {getUpcomingEvents().map((evt, idx) => {
                    const eventType = getEventType(evt);
                    const isStart = evt.dateBadge === 'Start Date';
                    const dotColor = isStart ? '#10b981' : (EVENT_COLORS[eventType] || EVENT_COLORS.task);

                    const parsedDate = parseLocalDate(evt.date);
                    const formattedDate = parsedDate ? parsedDate.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : evt.date;

                    const rawStart = evt.startDate || evt.stDt || evt.stdt || evt.start_date || evt.st_dt;
                    const parsedStart = parseLocalDate(rawStart);
                    const formattedStart = parsedStart ? parsedStart.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : rawStart;

                    let dateDisplay = formattedDate;
                    if (formattedStart && formattedStart !== formattedDate) {
                      dateDisplay = `${formattedStart} - ${formattedDate}`;
                    }

                    return (
                      <div 
                        key={evt.id || `upcoming-${idx}`} 
                        className="upcoming-item" 
                        onClick={() => setSelectedEvent(evt)} 
                        style={{ cursor: "pointer" }}
                      >
                        <div className="upcoming-icon" style={{ 
                          color: dotColor, 
                          backgroundColor: dotColor + '15' 
                        }}>
                          <CalendarIcon size={18} />
                        </div>
                        <div className="upcoming-details">
                          <div className="upcoming-title">{evt.title}</div>
                          <div className="upcoming-subtitle" style={{ textTransform: 'capitalize' }}>
                            {evt.dateBadge ? `${evt.dateBadge}` : eventType}
                          </div>
                        </div>
                        <div className="upcoming-time">
                          {dateDisplay}
                          {evt.time && <><br/>{evt.time}</>}
                        </div>
                      </div>
                    );
                  })}
                  {!loading && getUpcomingEvents().length === 0 && (
                    <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                      No upcoming events
                    </div>
                  )}
                </div>
              </div>

              {/* Calendar Filters */}
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <h3>CALENDAR FILTERS</h3>
                </div>
                <div className="filters-list">
                  <label className="filter-checkbox">
                    <input 
                      type="checkbox" 
                      checked={filterTasks} 
                      onChange={(e) => setFilterTasks(e.target.checked)} 
                    />
                    <span className="checkmark" style={{ 
                      backgroundColor: filterTasks ? EVENT_COLORS.task : "transparent", 
                      borderColor: EVENT_COLORS.task 
                    }}>{filterTasks && <Check size={12} color="white"/>}</span>
                    Tasks
                  </label>

                  <label className="filter-checkbox">
                    <input 
                      type="checkbox" 
                      checked={filterMilestones} 
                      onChange={(e) => setFilterMilestones(e.target.checked)} 
                    />
                    <span className="checkmark" style={{ 
                      backgroundColor: filterMilestones ? EVENT_COLORS.milestone : "transparent", 
                      borderColor: EVENT_COLORS.milestone 
                    }}>{filterMilestones && <Check size={12} color="white"/>}</span>
                    Milestones
                  </label>

                  <label className="filter-checkbox">
                    <input 
                      type="checkbox" 
                      checked={filterOverdue} 
                      onChange={(e) => setFilterOverdue(e.target.checked)} 
                    />
                    <span className="checkmark" style={{ 
                      backgroundColor: filterOverdue ? EVENT_COLORS.overdue : "transparent", 
                      borderColor: EVENT_COLORS.overdue 
                    }}>{filterOverdue && <Check size={12} color="white"/>}</span>
                    Overdue Tasks
                  </label>
                  <label className="filter-checkbox">
                    <input 
                      type="checkbox" 
                      checked={showCompleted} 
                      onChange={(e) => setShowCompleted(e.target.checked)} 
                    />
                    <span className="checkmark" style={{
                      backgroundColor: showCompleted ? "#4b5563" : "transparent",
                      borderColor: "#4b5563"
                    }}>{showCompleted && <Check size={12} color="white"/>}</span>
                    Show Closed
                  </label>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="event-modal-header">
              <span className="event-modal-badge" style={{ 
                backgroundColor: (EVENT_COLORS[getEventType(selectedEvent)] || EVENT_COLORS.task) + '20', 
                color: EVENT_COLORS[getEventType(selectedEvent)] || EVENT_COLORS.task 
              }}>
                {selectedEvent.type}
              </span>
              <button className="close-modal-btn" onClick={() => setSelectedEvent(null)}>&times;</button>
            </div>
            <div className="event-modal-body">
              <h3 className="event-modal-title">{selectedEvent.title}</h3>
              {selectedEvent.code && (
                <div className="event-modal-meta">
                  <strong>Code:</strong> {selectedEvent.code}
                </div>
              )}
              {selectedEvent.startDate && selectedEvent.endDate && selectedEvent.startDate !== selectedEvent.endDate ? (
                <div className="event-modal-meta">
                  <strong>Date Range:</strong> Start: {formatDateDisplay(selectedEvent.startDate)} &nbsp;•&nbsp; Due: {formatDateDisplay(selectedEvent.endDate)}
                </div>
              ) : (
                <div className="event-modal-meta">
                  <strong>Date:</strong> {selectedEvent.date ? formatDateDisplay(selectedEvent.date) : ''} {selectedEvent.time ? `@ ${selectedEvent.time}` : ''}
                </div>
              )}
              {selectedEvent.status && (
                <div className="event-modal-meta">
                  <strong>Status:</strong> <span className={`status-badge status-${selectedEvent.status.toLowerCase()}`}>{selectedEvent.status}</span>
                </div>
              )}
              {(selectedEvent.subStatus || selectedEvent.processStatus || selectedEvent.taskSts) && (
                <div className="event-modal-meta">
                  <strong>Process Status:</strong> <span className="status-badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>{selectedEvent.subStatus || selectedEvent.processStatus || selectedEvent.taskSts}</span>
                </div>
              )}
              {selectedEvent.subTasks && selectedEvent.subTasks.length > 0 && (
                <div className="event-modal-description">
                  <strong>Sub Tasks:</strong>
                  <ul style={{ paddingLeft: "20px", marginTop: "4px" }}>
                    {selectedEvent.subTasks.map((st, i) => (
                      <li key={i} style={{ marginBottom: "4px" }}>
                        {st.name || st.title} 
                        {st.status && <span style={{ marginLeft: "8px", fontSize: "11px", backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "10px" }}>{st.status}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedEvent.description && (
                <div className="event-modal-description">
                  <strong>Description:</strong>
                  <p>{selectedEvent.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Date Events Modal */}
      {selectedDateEvents && (
        <div className="event-modal-overlay" onClick={() => setSelectedDateEvents(null)}>
          <div className="event-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', width: '90%', borderRadius: '16px', padding: '24px' }}>
            <div className="event-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}>
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
                    {formatModalDateHeader(selectedDateEvents.date)}
                  </h3>
                  {(() => {
                    const taskCount = selectedDateEvents.events.filter(e => {
                      const t = getEventType(e);
                      return t === 'task' || t === 'overdue' || t === 'closed';
                    }).length;
                    const holCount = selectedDateEvents.events.filter(e => getEventType(e) === 'holiday').length;
                    let countLabel = `${selectedDateEvents.events.length} Events`;
                    if (taskCount > 0 && holCount > 0) {
                      countLabel = `${taskCount} ${taskCount === 1 ? 'Task' : 'Tasks'} • ${holCount} ${holCount === 1 ? 'Holiday' : 'Holidays'}`;
                    } else if (holCount > 0) {
                      countLabel = `${holCount} ${holCount === 1 ? 'Holiday' : 'Holidays'}`;
                    } else if (taskCount > 0) {
                      countLabel = `${taskCount} ${taskCount === 1 ? 'Task' : 'Tasks'}`;
                    }
                    return (
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#2563eb', marginTop: '2px', display: 'block' }}>
                        {countLabel}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedDateEvents(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '24px', lineHeight: 1 }}>&times;</button>
            </div>
            
            <div className="event-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', paddingTop: '16px' }}>
              {selectedDateEvents.events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px 20px 20px' }}>
                  <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 24px 0', fontWeight: '500' }}>
                    No events or tasks scheduled for this day.
                  </p>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedDateEvents(null);
                      navigate('/my-tasks');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    View all tasks <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                selectedDateEvents.events.map((evt, idx) => {
                  const eventType = getEventType(evt);
                  const isStart = evt.dateBadge === 'Start Date';
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        paddingBottom: '20px', 
                        marginBottom: '20px',
                        borderBottom: idx !== selectedDateEvents.events.length - 1 ? '1px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="event-modal-badge" style={{ 
                          backgroundColor: (EVENT_COLORS[eventType] || EVENT_COLORS.task) + '20', 
                          color: EVENT_COLORS[eventType] || EVENT_COLORS.task,
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase'
                        }}>
                          {evt.type || 'TASK'}
                        </span>
                        {evt.dateBadge && (
                          <span style={{
                            backgroundColor: isStart ? '#ecfdf5' : '#eff6ff',
                            color: isStart ? '#059669' : '#2563eb',
                            border: `1px solid ${isStart ? '#a7f3d0' : '#bfdbfe'}`,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {evt.dateBadge}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="event-modal-title">{evt.title}</h3>
                      
                      {evt.code && (
                        <div className="event-modal-meta">
                          <strong>Code:</strong> {evt.code}
                        </div>
                      )}
                      
                      {evt.startDate && evt.endDate && evt.startDate !== evt.endDate ? (
                        <div className="event-modal-meta">
                          <strong>Date Range:</strong> Start: {formatDateDisplay(evt.startDate)} &nbsp;•&nbsp; Due: {formatDateDisplay(evt.endDate)}
                        </div>
                      ) : (
                        <div className="event-modal-meta">
                          <strong>Date:</strong> {evt.date ? formatDateDisplay(evt.date) : ''} {evt.time ? `@ ${evt.time}` : ''}
                        </div>
                      )}
                      
                      {isEventClosed(evt) ? (
                        <>
                          <div className="event-modal-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <strong>Status:</strong> 
                            <span style={{ 
                              backgroundColor: '#dcfce7', 
                              color: '#16a34a', 
                              border: '1px solid #bbf7d0',
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              textTransform: 'uppercase'
                            }}>
                              Closed
                            </span>
                          </div>
                          {calculateTaskLeadLag(evt) && (
                            <div className="event-modal-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              <strong>Schedule:</strong>
                              {(() => {
                                const ll = calculateTaskLeadLag(evt);
                                return (
                                  <span style={{
                                    backgroundColor: ll.bg,
                                    color: ll.color,
                                    border: `1px solid ${ll.border}`,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    ● {ll.label}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                          {evt.actCmpDt && (
                            <div className="event-modal-meta" style={{ marginTop: '6px' }}>
                              <strong>Completed On:</strong> {formatDateDisplay(evt.actCmpDt)}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {evt.status && (
                            <div className="event-modal-meta" style={{ marginTop: '6px' }}>
                              <strong>Status:</strong> <span className={`status-badge status-${evt.status.toLowerCase()}`}>{evt.status}</span>
                            </div>
                          )}
                          {(evt.subStatus || evt.processStatus || evt.taskSts) && (
                            <div className="event-modal-meta" style={{ marginTop: '6px' }}>
                              <strong>Process Status:</strong> <span className="status-badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>{evt.subStatus || evt.processStatus || evt.taskSts}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {evt.subTasks && evt.subTasks.length > 0 && (
                        <div className="event-modal-description">
                          <strong>Sub Tasks:</strong>
                          <ul style={{ paddingLeft: "20px", marginTop: "4px" }}>
                            {evt.subTasks.map((st, i) => (
                              <li key={i} style={{ marginBottom: "4px" }}>
                                {st.name || st.title} 
                                {st.status && <span style={{ marginLeft: "8px", fontSize: "11px", backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "10px" }}>{st.status}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {evt.description && (
                        <div className="event-modal-description">
                          <strong>Description:</strong>
                          <p>{evt.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
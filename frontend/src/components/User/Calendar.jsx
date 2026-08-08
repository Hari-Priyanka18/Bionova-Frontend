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
  task: "#10b981",       
  milestone: "#f59e0b",  
  meeting: "#8b5cf6",    
  overdue: "#ef4444",    
  today: "#3b82f6"       
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

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
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
        const data = await apiGet(`/api/calendar/user-feed?viewType=${view}&date=${formattedDate}`);
        setEventsList(data || []);
      } catch (err) {
        console.error("Error fetching calendar data:", err);
        setError("Failed to load calendar events.");
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [currentDate, view]);

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
      '100%', 'INACTIVE', 'IN_ACTIVE', 'DEACTIVATED', 'RESOLVED', 'APPROVED', 'CANCELLED', 'ARCHIVED'
    ];
    const isCompletedStatus = completedStatuses.includes(statusUpper);
    const isCompletedBool = evt.completed === true || evt.closed === true || evt.isClosed === true || evt.progress === 100;
    const isInactiveSts = evt.sts === false || evt.sts === 0 || evt.sts === "0" || evt.sts === "false" || evt.sts === "Inactive";

    return isCompletedStatus || isCompletedBool || isInactiveSts;
  };

  // Determine event type (with overdue check)
  const getEventType = (evt) => {
    if (!evt) return 'task';
    const typeLower = (evt.type || "").toLowerCase();
    const isClosed = isEventClosed(evt);

    const isMilestone = typeLower === 'milestone' || typeLower.includes('milestone') || (evt.id && evt.id.toString().toUpperCase().includes('MILESTONE'));
    if (isMilestone) {
      return 'milestone';
    }

    const isTask = typeLower === 'task' || 
                   typeLower === 'overdue' || 
                   typeLower.includes('task') || 
                   (evt.id && evt.id.toString().toUpperCase().includes('TASK')) ||
                   evt.taskId || evt.taskCd || evt.empTaskId;

    if (isTask) {
      const statusUpper = getEventStatusString(evt);
      const isExplicitOverdue = typeLower === 'overdue' || statusUpper === 'OVERDUE' || evt.isOverdue === true || evt.overdue === true;
      const dateVal = evt.date || evt.dueDate || evt.tentEndDt || evt.endDate;
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

      if (isClosed && !showCompleted) {
        return false;
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
    return getFilteredEvents().filter(evt => evt.date === dateStr);
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);
    next7Days.setHours(23, 59, 59, 999);

    return eventsList
      .filter(evt => {
        const isClosed = isEventClosed(evt);
        if (isClosed && !showCompleted) return false;

        const eventType = getEventType(evt);
        if (eventType === 'task' && !filterTasks) return false;
        if (eventType === 'overdue' && !filterOverdue) return false;
        if (eventType === 'milestone' && !filterMilestones) return false;

        const dateVal = evt.date || evt.dueDate || evt.tentEndDt || evt.endDate;
        const evtDate = parseLocalDate(dateVal);
        if (!evtDate) return false;
        evtDate.setHours(0, 0, 0, 0);
        return evtDate >= today && evtDate <= next7Days;
      })
      .sort((a, b) => new Date(a.date || a.dueDate || a.tentEndDt) - new Date(b.date || b.dueDate || b.tentEndDt));
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
    emptyPrefix = firstDay;
    for (let i = 1; i <= daysInMonth; i++) {
      visibleDays.push(new Date(currentYear, currentMonth, i));
    }
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
                      {view === "month" && (
                        <span className="day-number empty-number">{getDaysInMonth(currentYear, currentMonth - 1) - firstDay + i + 1}</span>
                      )}
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

                    return (
                      <div key={index} className={`calendar-day ${isToday ? "today-cell" : ""}`} onClick={(e) => {
                        setSelectedDateEvents({ date: dayObj, events: dayEvents });
                      }}>
                        <div className="day-number-wrapper">
                          <span className={`day-number ${isToday ? "today-number" : ""}`}>{day}</span>
                        </div>
                        <div className="day-events-list">
                          {dayEvents.slice(0, 3).map((evt, idx) => {
                            const eventType = getEventType(evt);
                            return (
                              <div 
                                key={idx} 
                                className="calendar-event-item" 
                                style={{ cursor: "pointer" }}
                              >
                                <span className="event-dot" style={{ backgroundColor: EVENT_COLORS[eventType] || EVENT_COLORS.task }}></span>
                                <div className="event-text">
                                  <span className="event-title">{evt.title}</span>
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
                  <span className="legend-dot" style={{ backgroundColor: EVENT_COLORS.task }}></span>
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
                  <span className="legend-dot" style={{ backgroundColor: EVENT_COLORS.today }}></span>
                  Today
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
                  {getUpcomingEvents().map((evt) => {
                    const eventType = getEventType(evt);
                    const parsedDate = parseLocalDate(evt.date);
                    const formattedDate = parsedDate ? parsedDate.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : evt.date;

                    return (
                      <div 
                        key={evt.id} 
                        className="upcoming-item" 
                        onClick={() => setSelectedEvent(evt)} 
                        style={{ cursor: "pointer" }}
                      >
                        <div className="upcoming-icon" style={{ 
                          color: EVENT_COLORS[eventType] || EVENT_COLORS.task, 
                          backgroundColor: (EVENT_COLORS[eventType] || EVENT_COLORS.task) + '15' 
                        }}>
                          <CalendarIcon size={18} />
                        </div>
                        <div className="upcoming-details">
                          <div className="upcoming-title">{evt.title}</div>
                          <div className="upcoming-subtitle" style={{ textTransform: 'capitalize' }}>{eventType}</div>
                        </div>
                        <div className="upcoming-time">
                          {formattedDate}
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
              <div className="event-modal-meta">
                <strong>Date:</strong> {selectedEvent.date} {selectedEvent.time ? `@ ${selectedEvent.time}` : ''}
              </div>
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
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#2563eb', marginTop: '2px', display: 'block' }}>
                    {selectedDateEvents.events.length} {selectedDateEvents.events.length === 1 ? 'Event & Task' : 'Events & Tasks'}
                  </span>
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
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        paddingBottom: '20px', 
                        marginBottom: '20px',
                        borderBottom: idx !== selectedDateEvents.events.length - 1 ? '1px dashed #cbd5e1' : 'none'
                      }}
                    >
                      <div style={{ marginBottom: '12px' }}>
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
                      </div>
                      
                      <h3 className="event-modal-title">{evt.title}</h3>
                      
                      {evt.code && (
                        <div className="event-modal-meta">
                          <strong>Code:</strong> {evt.code}
                        </div>
                      )}
                      
                      <div className="event-modal-meta">
                        <strong>Date:</strong> {evt.date} {evt.time ? `@ ${evt.time}` : ''}
                      </div>
                      
                      {evt.status && (
                        <div className="event-modal-meta">
                          <strong>Status:</strong> <span className={`status-badge status-${evt.status.toLowerCase()}`}>{evt.status}</span>
                        </div>
                      )}
                      
                      {(evt.subStatus || evt.processStatus || evt.taskSts) && (
                        <div className="event-modal-meta">
                          <strong>Process Status:</strong> <span className="status-badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>{evt.subStatus || evt.processStatus || evt.taskSts}</span>
                        </div>
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
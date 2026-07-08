// src/components/User/Calendar.jsx
import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../Sidebar";
import Header from "../Header";
import "../../styles/calendar.css";

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Calendar as CalendarIcon,
  Check,
  Menu
} from "lucide-react";
import { apiGet } from "../../utils/api";

const EVENT_COLORS = {
  task: "#10b981",       
  milestone: "#f59e0b",  
  meeting: "#8b5cf6",    
  overdue: "#ef4444",    
  today: "#3b82f6"       
};

const Calendar = ({ userRole, onLogout }) => {
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
  const [filterMeetings, setFilterMeetings] = useState(true);
  const [filterOverdue, setFilterOverdue] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  // Determine event type (with overdue check)
  const getEventType = (evt) => {
    const typeLower = (evt.type || "").toLowerCase();
    if (typeLower === 'task') {
      const isCompleted = evt.status && ['COMPLETED', 'DONE', 'CLOSE', 'CLOSED'].includes(evt.status.toUpperCase());
      // Set to end of the day for overdue check
      const taskDate = parseLocalDate(evt.date);
      if (taskDate) {
        taskDate.setHours(23, 59, 59, 999);
      }
      const isPast = taskDate && taskDate < new Date();
      if (!isCompleted && isPast) {
        return 'overdue';
      }
      return 'task';
    }
    if (typeLower === 'milestone') {
      return 'milestone';
    }
    return 'meeting'; // Holidays, Meetings, Events
  };

  // Filter events
  const getFilteredEvents = () => {
    return eventsList.filter(evt => {
      const eventType = getEventType(evt);
      const isCompleted = evt.status && ['COMPLETED', 'DONE', 'CLOSE', 'CLOSED'].includes(evt.status.toUpperCase());

      if (isCompleted && !showCompleted) {
        return false;
      }

      if (eventType === 'task' && !filterTasks) return false;
      if (eventType === 'milestone' && !filterMilestones) return false;
      if (eventType === 'meeting' && !filterMeetings) return false;
      if (eventType === 'overdue' && !filterOverdue) return false;

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
        const isCompleted = evt.status && ['COMPLETED', 'DONE', 'CLOSE', 'CLOSED'].includes(evt.status.toUpperCase());
        if (isCompleted && !showCompleted) return false;

        const evtDate = parseLocalDate(evt.date);
        if (!evtDate) return false;
        evtDate.setHours(0, 0, 0, 0);
        return evtDate >= today && evtDate <= next7Days;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
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

              <button className="filters-btn">
                <Filter size={16} /> Filters
              </button>
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
                      <div key={index} className={`calendar-day ${isToday ? "today-cell" : ""}`}>
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
                                onClick={() => setSelectedEvent(evt)}
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
                            <div className="event-more-text" style={{ cursor: "pointer", fontWeight: "600" }} onClick={() => {
                              // Filter out events of this day and view them in 'day' view
                              setCurrentDate(dayObj);
                              setView("day");
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
                  Milestone Due Date
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: EVENT_COLORS.meeting }}></span>
                  Meeting / Holiday
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
                  <h3>UPCOMING <span>(Next 7 Days)</span></h3>
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
                      checked={filterMeetings} 
                      onChange={(e) => setFilterMeetings(e.target.checked)} 
                    />
                    <span className="checkmark" style={{ 
                      backgroundColor: filterMeetings ? EVENT_COLORS.meeting : "transparent", 
                      borderColor: EVENT_COLORS.meeting 
                    }}>{filterMeetings && <Check size={12} color="white"/>}</span>
                    Meetings / Holidays
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
                    Show Completed
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
    </div>
  );
};

export default Calendar;
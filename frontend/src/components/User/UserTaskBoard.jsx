import React, { useState, useEffect } from 'react';
import { 
  Calendar, ListTodo, AlertCircle, PieChart, Eye, Layers, CheckCircle2, 
  Search, Filter, Plus, ChevronDown, User, Info, Folder, FileText, ClipboardList, Loader, X
} from 'lucide-react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { apiGet } from '../../utils/api';
import '../../styles/user-task-board.css';

const UserTaskBoard = ({ userRole, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize empty state for tasks instead of hardcoded data
  const [tasks, setTasks] = useState({
    todo: [],
    overdue: [],
    inProgress: [],
    underReview: [],
    completed: []
  });

  // Calculate stats based on tasks
  const stats = {
    todo: tasks.todo.length,
    overdue: tasks.overdue.length,
    inProgress: tasks.inProgress.length,
    underReview: tasks.underReview.length,
    completed: tasks.completed.length,
    open: tasks.todo.length + tasks.overdue.length + tasks.inProgress.length + tasks.underReview.length,
    total: tasks.todo.length + tasks.overdue.length + tasks.inProgress.length + tasks.underReview.length + tasks.completed.length
  };


  const filterTasks = (taskList) => {
    let result = taskList || [];
    
    if (selectedProject !== 'All') {
      result = result.filter(task => task.project === selectedProject);
    }
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(task => 
        (task.title && task.title.toLowerCase().includes(lower)) ||
        (task.id && task.id.toLowerCase().includes(lower)) ||
        (task.project && task.project.toLowerCase().includes(lower)) ||
        (task.assigned && task.assigned.toLowerCase().includes(lower)) ||
        (task.milestone && task.milestone.toLowerCase().includes(lower))
      );
    }
    return result;
  };

  useEffect(() => {
    const handleToggle = () => setSidebarOpen(prev => !prev);
    window.addEventListener('toggleSidebar', handleToggle);
    
    // Check initial state from local storage or window size
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    } else if (localStorage.getItem("sidebarCollapsed") === "true") {
      setSidebarOpen(false);
    }
    
    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  useEffect(() => {
    const fetchBoardData = async () => {
      setLoading(true);
      try {
        const [projectsData, milestonesData, tasksData, indTasksData, profileRes] = await Promise.all([
          apiGet("/api/project-live"),
          apiGet("/api/milestone-live"),
          apiGet("/api/task-live"),
          apiGet("/api/individual-tasks"),
          apiGet("/api/profile")
        ]);

        const empId = profileRes?.empId;

        // Filter tasks assigned to current employee
        const userTasks = (tasksData || []).filter(t => (t.empId === empId) || (t.empid === empId));
        const userIndTasks = (indTasksData || []).filter(t => (t.empId === empId) || (t.empid === empId));

        // Mapping function for project tasks
        const mapProjectTask = (t) => {
          let status = "To-Do";
          const rawSts = (t.taskSts || t.tasksts || "DRAFT").toUpperCase();
          if (rawSts === "COMPLETED") {
            status = "Completed";
          } else if (rawSts === "SUBMIT_REVIEW" || rawSts === "UNDER_REVIEW") {
            status = "Under Review";
          } else {
            const today = new Date().toISOString().split("T")[0];
            const endDt = t.endDt || t.enddt;
            if (endDt && endDt < today) {
              status = "Overdue";
            } else if (rawSts === "WIP" || rawSts === "REWORK" || rawSts === "ASSIGNED") {
              status = "In Progress";
            } else {
              status = "To-Do";
            }
          }

          let calculatedPriority = t.priority || "Medium";
          const endDt = t.endDt || t.enddt;
          if (endDt) {
            const [year, month, day] = endDt.split('-');
            const endDtObj = new Date(year, month - 1, day);
            endDtObj.setHours(0, 0, 0, 0);

            const todayObj = new Date();
            todayObj.setHours(0, 0, 0, 0);

            const diffTime = todayObj.getTime() - endDtObj.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
              calculatedPriority = "High";
            } else if (diffDays === 1) {
              calculatedPriority = "Critical";
            } else if (diffDays >= 2) {
              calculatedPriority = "Atmost Critical";
            }
          }

          const project = (projectsData || []).find(p => (p.prjId === t.prjId) || (p.prjid === t.prjid) || (p.prjId === t.prjid) || (p.prjid === t.prjId));
          const milestone = (milestonesData || []).find(m => (m.mId === t.mId) || (m.mid === t.mid) || (m.mId === t.mid) || (m.mid === t.mId));

          return {
            id: t.taskCd || t.taskcd || `TSK-${t.taskId}`,
            taskId: t.taskId,
            isIndividual: false,
            title: t.taskNm || t.tasknm,
            project: project ? project.prjNm || project.prjnm : "Unknown Project",
            milestone: milestone ? milestone.mlstnTtl || milestone.mlstnttl : "Unknown Milestone",
            priority: calculatedPriority,
            due: endDt || "",
            status: status,
            rawStatus: rawSts,
            rawTask: t,
            description: t.taskDesc || t.taskdesc || "",
            assigned: "Project Manager",
            isOverdue: status === "Overdue"
          };
        };

        // Mapping function for individual tasks
        const mapIndividualTask = (t) => {
          let status = "To-Do";
          const rawSts = (t.taskSts || t.tasksts || "DRAFT").toUpperCase();
          if (rawSts === "COMPLETED") {
            status = "Completed";
          } else if (rawSts === "SUBMIT_REVIEW" || rawSts === "UNDER_REVIEW") {
            status = "Under Review";
          } else {
            const today = new Date().toISOString().split("T")[0];
            const endDt = t.endDt || t.enddt;
            if (endDt && endDt < today) {
              status = "Overdue";
            } else if (rawSts === "WIP" || rawSts === "REWORK" || rawSts === "ASSIGNED") {
              status = "In Progress";
            } else {
              status = "To-Do";
            }
          }

          let calculatedPriority = t.priority || "Medium";
          const endDt = t.endDt || t.enddt;
          if (endDt) {
            const [year, month, day] = endDt.split('-');
            const endDtObj = new Date(year, month - 1, day);
            endDtObj.setHours(0, 0, 0, 0);

            const todayObj = new Date();
            todayObj.setHours(0, 0, 0, 0);

            const diffTime = todayObj.getTime() - endDtObj.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
              calculatedPriority = "High";
            } else if (diffDays === 1) {
              calculatedPriority = "Critical";
            } else if (diffDays >= 2) {
              calculatedPriority = "Atmost Critical";
            }
          }

          return {
            id: t.taskCd || t.taskcd || `IND-${t.empTaskId}`,
            taskId: t.empTaskId,
            isIndividual: true,
            title: t.taskNm || t.tasknm,
            project: "Individual Task",
            milestone: "-",
            priority: calculatedPriority,
            due: endDt || "",
            status: status,
            rawStatus: rawSts,
            rawTask: t,
            description: t.taskDesc || t.taskdesc || "",
            assigned: "Task Manager",
            isOverdue: status === "Overdue"
          };
        };

        const mappedProjectTasks = userTasks.map(mapProjectTask);
        const mappedIndTasks = userIndTasks.map(mapIndividualTask);
        const allMapped = [...mappedProjectTasks, ...mappedIndTasks];

        const todo = [];
        const overdue = [];
        const inProgress = [];
        const underReview = [];
        const completed = [];

        allMapped.forEach(task => {
          if (task.status === "Completed") {
            completed.push(task);
          } else if (task.status === "Under Review") {
            underReview.push(task);
          } else if (task.status === "Overdue") {
            overdue.push(task);
          } else if (task.status === "In Progress") {
            inProgress.push(task);
          } else {
            todo.push(task);
          }
        });

        setTasks({ todo, overdue, inProgress, underReview, completed });
      } catch (err) {
        console.error("Error fetching task board data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardData();
  }, []);

  const renderCard = (task, type) => {
    return (
      <div className="utb-card" key={task.id}>
        <div className="utb-card-top">
          <span className="utb-card-id">{task.id}</span>
          <span className={`utb-badge ${task.priority.toLowerCase()}`}>
            {type === 'completed' && <CheckCircle2 size={12} style={{marginRight: '4px', display: 'inline', verticalAlign: 'text-bottom'}} />}
            {task.priority}
          </span>
        </div>
        <h4 className="utb-card-title">{task.title}</h4>
        <div className="utb-card-details">
          <div className="utb-card-detail-item">Project: <span>{task.project}</span></div>
          <div className="utb-card-detail-item">Milestone: <span>{task.milestone}</span></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
          {task.due && (
            <div className={`utb-card-meta ${task.isOverdue ? 'overdue-text' : ''}`} style={{ marginBottom: 0 }}>
              <Calendar size={14} /> Due: {task.due}
            </div>
          )}
          {task.submittedOn && (
            <div className="utb-card-meta" style={{ marginBottom: 0 }}>
              <Calendar size={14} /> Submitted on: {task.submittedOn}
            </div>
          )}
          {task.completedOn && (
            <div className="utb-card-meta completed-text" style={{ marginBottom: 0 }}>
              <Calendar size={14} /> Completed on: {task.completedOn}
            </div>
          )}

          <div className="utb-assignee" style={{ marginBottom: 0 }}>
            <User size={14} /> Assigned by: {task.assigned}
          </div>
          {task.submittedTo && (
            <div className="utb-assignee" style={{ marginBottom: 0 }}>
              <FileText size={14} /> Submitted to: {task.submittedTo}
            </div>
          )}
        </div>

        {['todo', 'overdue', 'inprogress'].includes(type) && (
          <div className="utb-card-actions">
            <button className="utb-card-btn outline" onClick={() => setSelectedTask(task)}>View Details</button>
            <button className="utb-card-btn solid">Update Progress</button>
          </div>
        )}
        {['review', 'completed'].includes(type) && (
          <div className="utb-card-actions">
            <button className="utb-card-btn outline full" onClick={() => setSelectedTask(task)}>View Details</button>
          </div>
        )}
      </div>
    );
  };

  const allTasksForDropdown = [...tasks.todo, ...tasks.overdue, ...tasks.inProgress, ...tasks.underReview, ...tasks.completed];
  const uniqueProjects = ["All", ...new Set(allTasksForDropdown.map(t => t.project).filter(Boolean))];

  return (
    <div className="utb-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />
      
      <div className={`utb-shell ${!sidebarOpen ? 'expanded' : ''}`}>
        <Header title="Task Board" subtitle="Track and manage your assigned tasks across projects." onLogout={onLogout} userRole={userRole} />
        
        <main className="utb-main" style={{ paddingTop: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '55vh', flexDirection: 'column', gap: '16px' }}>
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
              <span style={{ color: '#64748b', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px' }}>Loading Tasks...</span>
            </div>
          ) : (
            <>

          <div className="row g-2 mb-4 flex-xl-nowrap">
            
            <div className="col-6 col-md-4 col-xl">
              <div className="utb-stat-card" style={{ background: '#f5f8ff', border: '1px solid #e5edff' }}>
                <div className="utb-stat-icon-wrap" style={{ background: '#3b82f6', color: '#ffffff' }}>
                  <ClipboardList size={16} />
                </div>
                <div className="utb-stat-info">
                  <span className="utb-stat-label">My Tasks</span>
                  <span className="utb-stat-value">{stats.total}</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-xl">
              <div className="utb-stat-card" style={{ background: '#f5f8ff', border: '1px solid #e5edff' }}>
                <div className="utb-stat-icon-wrap" style={{ background: '#3b82f6', color: '#ffffff' }}>
                  <ListTodo size={16} />
                </div>
                <div className="utb-stat-info">
                  <span className="utb-stat-label">To-Do</span>
                  <span className="utb-stat-value">{stats.todo}</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-xl">
              <div className="utb-stat-card" style={{ background: '#fef2f2', border: '1px solid #fee2e2' }}>
                <div className="utb-stat-icon-wrap" style={{ background: '#ef4444', color: '#ffffff' }}>
                  <AlertCircle size={16} />
                </div>
                <div className="utb-stat-info">
                  <span className="utb-stat-label">Overdue</span>
                  <span className="utb-stat-value">{stats.overdue}</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-xl">
              <div className="utb-stat-card" style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
                <div className="utb-stat-icon-wrap" style={{ background: '#f59e0b', color: '#ffffff' }}>
                  <Loader size={16} />
                </div>
                <div className="utb-stat-info">
                  <span className="utb-stat-label">In Progress</span>
                  <span className="utb-stat-value">{stats.inProgress}</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-xl">
              <div className="utb-stat-card" style={{ background: '#faf5ff', border: '1px solid #f3e8ff' }}>
                <div className="utb-stat-icon-wrap" style={{ background: '#a855f7', color: '#ffffff' }}>
                  <Eye size={16} />
                </div>
                <div className="utb-stat-info">
                  <span className="utb-stat-label">Under Review</span>
                  <span className="utb-stat-value">{stats.underReview}</span>
                </div>
              </div>
            </div>



            <div className="col-6 col-md-4 col-xl">
              <div className="utb-stat-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="utb-stat-icon-wrap" style={{ background: '#22c55e', color: '#ffffff' }}>
                  <CheckCircle2 size={16} />
                </div>
                <div className="utb-stat-info">
                  <span className="utb-stat-label">Completed</span>
                  <span className="utb-stat-value">{stats.completed}</span>
                </div>
              </div>
            </div>
            
          </div>

          <div className="utb-controls-row">
            <div className="utb-controls-left">
              <select 
                className="utb-btn" 
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', color: '#334155', cursor: 'pointer', appearance: 'auto', fontWeight: '500', minWidth: '150px' }}
              >
                {uniqueProjects.map(p => (
                  <option key={p} value={p}>{p === "All" ? "All Projects" : p}</option>
                ))}
              </select>
              <div className="utb-search-wrapper">
                <Search size={16} className="utb-search-icon" />
                <input 
                  type="text" 
                  className="utb-control-input" 
                  placeholder="Search tasks..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="utb-controls-right">
              <button className="utb-btn"><Filter size={16} /> Filters</button>
              <select className="utb-select">
                <option>Group by: Status</option>
              </select>
              <select className="utb-select">
                <option>Sort by: Priority</option>
              </select>
            </div>
          </div>

          <div className="utb-board">
            <div className="utb-column todo">
              <div className="utb-col-header">
                <h3 className="utb-col-title">To-Do</h3>
                <span className="utb-col-count">{filterTasks(tasks.todo).length}</span>
              </div>
              <div className="utb-col-content">
                {filterTasks(tasks.todo).map(t => renderCard(t, 'todo'))}
                <button className="utb-view-more"><Plus size={14} style={{display:'inline', verticalAlign:'middle'}}/> View More</button>
              </div>
            </div>
            
            <div className="utb-column overdue">
              <div className="utb-col-header">
                <h3 className="utb-col-title">Overdue</h3>
                <span className="utb-col-count">{filterTasks(tasks.overdue).length}</span>
              </div>
              <div className="utb-col-content">
                {filterTasks(tasks.overdue).map(t => renderCard(t, 'overdue'))}
              </div>
            </div>

            <div className="utb-column inprogress">
              <div className="utb-col-header">
                <h3 className="utb-col-title">In Progress</h3>
                <span className="utb-col-count">{filterTasks(tasks.inProgress).length}</span>
              </div>
              <div className="utb-col-content">
                {filterTasks(tasks.inProgress).map(t => renderCard(t, 'inprogress'))}
              </div>
            </div>

            <div className="utb-column review">
              <div className="utb-col-header">
                <h3 className="utb-col-title">Under Review</h3>
                <span className="utb-col-count">{filterTasks(tasks.underReview).length}</span>
              </div>
              <div className="utb-col-content">
                {filterTasks(tasks.underReview).map(t => renderCard(t, 'review'))}
              </div>
            </div>

            <div className="utb-column completed">
              <div className="utb-col-header">
                <h3 className="utb-col-title">Completed</h3>
                <span className="utb-col-count">{filterTasks(tasks.completed).length}</span>
              </div>
              <div className="utb-col-content">
                {filterTasks(tasks.completed).map(t => renderCard(t, 'completed'))}
              </div>
            </div>
          </div>


          </>
          )}
        </main>
      </div>

      {selectedTask && (
        <div className="utb-modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="utb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="utb-modal-header">
              <h3>Task Details: {selectedTask.id}</h3>
              <button className="utb-modal-close" onClick={() => setSelectedTask(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="utb-modal-body">
              <div className="utb-modal-field">
                <label>Title</label>
                <p>{selectedTask.title}</p>
              </div>
              <div className="utb-modal-row">
                <div className="utb-modal-field">
                  <label>Project</label>
                  <p>{selectedTask.project}</p>
                </div>
                <div className="utb-modal-field">
                  <label>Milestone</label>
                  <p>{selectedTask.milestone}</p>
                </div>
              </div>
              <div className="utb-modal-row">
                <div className="utb-modal-field">
                  <label>Priority</label>
                  <p><span className={`utb-badge ${selectedTask.priority.toLowerCase()}`}>{selectedTask.priority}</span></p>
                </div>
                <div className="utb-modal-field">
                  <label>Assigned To</label>
                  <p>{selectedTask.assigned}</p>
                </div>
              </div>
              {(selectedTask.due || selectedTask.submittedOn || selectedTask.completedOn) && (
                <div className="utb-modal-field">
                  <label>Relevant Dates</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedTask.due && <div>Due: {selectedTask.due}</div>}
                    {selectedTask.submittedOn && <div>Submitted: {selectedTask.submittedOn}</div>}
                    {selectedTask.completedOn && <div>Completed: {selectedTask.completedOn}</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="utb-modal-footer">
              <button className="utb-btn outline" onClick={() => setSelectedTask(null)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserTaskBoard;

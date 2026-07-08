import React, { useState } from 'react';
import Sidebar from '../Sidebar';
import '../../styles/dashboard.css';
import {
  Menu,
  Search,
  Bell,
  Mail,
  ChevronDown,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  FolderKanban,
  Briefcase,
  EllipsisVertical,
  CircleCheckBig,
  Plus,
  LogOut,
  TrendingUp,
  AlertCircle,
  Activity,
  Users,
  Target,
  BarChart2,
  Clock
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from 'recharts';

const Dashboard = ({ onLogout, userRole }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    const user = {
        name: userRole === 'admin' ? 'Sai Ram' : 'John Doe',
        role: userRole === 'admin' ? 'Administrator' : 'Employee',
        avatar: 'https://ui-avatars.com/api/?background=4f6fff&color=fff&name=' + (userRole === 'admin' ? 'Sai+Ram' : 'John+Doe')
    };

    // Todo List
    const [todoList, setTodoList] = useState([
        { id: 1, task: 'Design Landing Page UI', status: 'completed', priority: '' },
        { id: 2, task: 'API Integration', status: 'pending', priority: 'high' },
        { id: 3, task: 'Test Module Dashboard', status: 'pending', priority: 'medium' },
        { id: 4, task: 'Client Review Meeting', status: 'pending', priority: 'low' }
    ]);

    // Active Projects
    const [activeProjects, setActiveProjects] = useState([
        { id: 1, name: 'Project Alpha', description: 'Website Redesign', progress: 80, dueDate: '15 Jun 2026', icon: 'blue' },
        { id: 2, name: 'Project Beta', description: 'Mobile Development', progress: 45, dueDate: '20 Jun 2026', icon: 'green' },
        { id: 3, name: 'Project Gamma', description: 'API Integration', progress: 60, dueDate: '25 Jun 2026', icon: 'purple' }
    ]);

    // Upcoming Tasks
    const [upcomingTasks, setUpcomingTasks] = useState([
        { id: 1, title: 'Project Alpha Review', dueDate: '15 Jun 2026', daysLeft: 2, color: 'pink' },
        { id: 2, title: 'Testing Completion', dueDate: '18 Jun 2026', daysLeft: 5, color: 'orange' },
        { id: 3, title: 'API Integration', dueDate: '20 Jun 2026', daysLeft: 7, color: 'green' },
        { id: 4, title: 'Client Presentation', dueDate: '25 Jun 2026', daysLeft: 12, color: 'purple' }
    ]);

    // Performance Data
    const performanceData = [
        { day: 'Mon', productivity: 75 },
        { day: 'Tue', productivity: 82 },
        { day: 'Wed', productivity: 78 },
        { day: 'Thu', productivity: 88 },
        { day: 'Fri', productivity: 92 },
        { day: 'Sat', productivity: 85 },
        { day: 'Sun', productivity: 70 }
    ];

    // Recent Activities
    const [recentActivities, setRecentActivities] = useState([
        { id: 1, action: 'Completed task "Design Landing Page"', time: '2 hours ago', user: 'Sai Ram' },
        { id: 2, action: 'Added new comment on Project Alpha', time: '4 hours ago', user: 'Team Lead' },
        { id: 3, action: 'Updated project status to 80%', time: '6 hours ago', user: 'Manager' },
        { id: 4, action: 'Uploaded design files', time: '1 day ago', user: 'Designer' }
    ]);

    const toggleTodo = (id) => {
        setTodoList(todoList.map(item => 
            item.id === id 
                ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' } 
                : item
        ));
    };

    const getStatusBadge = (status) => {
        if (status === 'completed') {
            return <span className="status-badge completed">Completed</span>;
        }
        return null;
    };

    const getPriorityBadge = (priority) => {
        if (!priority) return null;
        const badges = {
            high: <span className="priority-badge priority-high">High</span>,
            medium: <span className="priority-badge priority-medium">Medium</span>,
            low: <span className="priority-badge priority-low">Low</span>
        };
        return badges[priority];
    };

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

    return (
        <div className="modern-dashboard">
            <Sidebar userRole={userRole} onLogout={onLogout} sidebarOpen={sidebarOpen} />
            
            <div className={`dashboard-main ${!sidebarOpen ? 'expanded' : ''}`}>
                {/* Top Header */}
                <div className="top-header">
                    <div className="header-left">
                        <button className="mobile-menu-btn" onClick={() => { setSidebarOpen(!sidebarOpen); window.dispatchEvent(new CustomEvent('toggleSidebar')); }}>
                            <Menu size={24} />
                        </button>
                        <div className="search-box">
                            <Search size={16} className="search-icon" />
                            <input type="text" placeholder="Search" />
                        </div>
                    </div>

                    <div className="header-right">
                        <button className="icon-btn">
                            <Bell size={18} />
                            <span className="badge">3</span>
                        </button>
                        <button className="icon-btn">
                            <Mail size={18} />
                            <span className="badge">5</span>
                        </button>
                        
                        <div className="profile-dropdown">
                            <img src={user.avatar} alt="profile" className="profile-avatar" />
                            <span className="profile-name">{user.name}</span>
                            <ChevronDown size={14} className="dropdown-icon" />
                        </div>
                        
                        <button onClick={onLogout} className="logout-btn">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Welcome Section */}
                <div className="welcome-section">
                    <div className="welcome-content">
                        <h1>{(() => {
                            const hr = new Date().getHours();
                            if (hr >= 0 && hr < 12) return "Good Morning";
                            if (hr >= 12 && hr < 16) return "Good Afternoon";
                            return "Good Evening";
                        })()}, {user.name.split(' ')[0]}!</h1>
                        <p>Here's what's happening with your projects today.</p>
                    </div>
                    <div className="date-card">
                        <CalendarDays size={22} className="date-icon" />
                        <div className="date-info">
                            <span className="date">{formattedDate}</span>
                            <span className="day">{dayName}</span>
                        </div>
                    </div>
                </div>

                {/* First Row: Todo + Projects */}
                <div className="dashboard-grid">
                    {/* Todo Card */}
                    <div className="todo-card">
                        <div className="card-header">
                            <div className="card-title">
                                <ClipboardCheck size={20} className="title-icon" />
                                <h3>TO-DO LIST</h3>
                            </div>
                            <button className="view-all-btn">View All</button>
                        </div>
                        
                        <div className="todo-list-container">
                            {todoList.map(item => (
                                <div key={item.id} className={`todo-item ${item.status === 'completed' ? 'completed' : ''}`}>
                                    <label className="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={item.status === 'completed'} 
                                            onChange={() => toggleTodo(item.id)}
                                        />
                                        <span className="checkmark">
                                            {item.status === 'completed' && <CircleCheckBig size={14} />}
                                        </span>
                                        <span className="task-text">{item.task}</span>
                                    </label>
                                    <div className="todo-badges">
                                        {getStatusBadge(item.status)}
                                        {getPriorityBadge(item.priority)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="add-task-footer">
                            <button className="add-task-btn-footer">
                                <Plus size={14} /> Add New Task
                            </button>
                        </div>
                    </div>

                    {/* Projects Card */}
                    <div className="project-card">
                        <div className="card-header">
                            <div className="card-title">
                                <FolderKanban size={20} className="title-icon" />
                                <h3>ACTIVE PROJECTS</h3>
                            </div>
                            <button className="view-all-btn">View All Projects</button>
                        </div>
                        
                        <div className="project-body">
                            {activeProjects.map(project => (
                                <div key={project.id} className="project-item">
                                    <div className="project-header">
                                        <div className="project-icon-wrapper">
                                            <div className={`project-icon ${project.icon}`}>
                                                <Briefcase size={22} />
                                            </div>
                                            <div className="project-info">
                                                <h4 className="project-title">{project.name}</h4>
                                                <p className="project-subtitle">{project.description}</p>
                                            </div>
                                        </div>
                                        <button className="project-menu">
                                            <EllipsisVertical size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="progress-wrapper">
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill" 
                                                style={{ width: `${project.progress}%` }}
                                            ></div>
                                        </div>
                                        <span className="progress-percent">{project.progress}%</span>
                                    </div>
                                    
                                    <div className="due-date-wrapper">
                                        <CalendarClock size={12} className="due-icon" />
                                        <span className="due-text">Due: {project.dueDate}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Second Row: Upcoming Tasks */}
                <div className="upcoming-section">
                    <div className="section-header">
                        <h3>
                            <CalendarDays size={18} className="section-icon" />
                            Upcoming Tasks
                        </h3>
                        <button className="view-all-tasks-btn">View All Tasks</button>
                    </div>
                    
                    <div className="upcoming-grid">
                        {upcomingTasks.map(task => (
                            <div key={task.id} className={`task-card ${task.color}`}>
                                <div className="task-icon">
                                    <CalendarDays size={26} strokeWidth={2.2} />
                                </div>
                                <h4 className="task-title">{task.title}</h4>
                                <p className="task-date">Due: {task.dueDate}</p>
                                <span className="task-days">{task.daysLeft} Days Left</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Third Row: Performance + Risk */}
                <div className="analytics-grid">
                    {/* Performance Chart */}
                    <div className="performance-card">
                        <div className="card-header">
                            <div className="card-title">
                                <TrendingUp size={20} className="title-icon" />
                                <h3>PERFORMANCE TREND</h3>
                            </div>
                            <div className="chart-filters">
                                <button className="filter-btn active">Weekly</button>
                                <button className="filter-btn">Monthly</button>
                            </div>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={performanceData}>
                                    <defs>
                                        <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#5b7cff" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#5b7cff" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip />
                                    <Area 
                                        type="monotone" 
                                        dataKey="productivity" 
                                        stroke="#5b7cff" 
                                        fill="url(#colorProductivity)" 
                                        strokeWidth={3}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Risk Projection */}
                    <div className="risk-card">
                        <div className="card-header">
                            <div className="card-title">
                                <AlertCircle size={20} className="title-icon" />
                                <h3>RISK PROJECTION</h3>
                            </div>
                        </div>
                        <div className="risk-content">
                            <div className="risk-score">
                                <div className="risk-circle">
                                    <span className="risk-number">18</span>
                                    <span className="risk-total">/100</span>
                                </div>
                                <div className="risk-status">
                                    <h4>Low Risk</h4>
                                    <p>Project on track</p>
                                </div>
                            </div>
                            <div className="risk-metrics">
                                <div className="metric-item">
                                    <Target size={14} className="metric-icon" />
                                    <span>Schedule Risk: 15%</span>
                                </div>
                                <div className="metric-item">
                                    <BarChart2 size={14} className="metric-icon" />
                                    <span>Budget Risk: 22%</span>
                                </div>
                                <div className="metric-item">
                                    <Users size={14} className="metric-icon" />
                                    <span>Resource Risk: 8%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fourth Row: Recent Activity */}
                <div className="activity-section">
                    <div className="section-header">
                        <h3>
                            <Activity size={18} className="section-icon" />
                            Recent Activity
                        </h3>
                        <button className="view-all-btn">View All</button>
                    </div>
                    
                    <div className="activity-timeline">
                        {recentActivities.map(activity => (
                            <div key={activity.id} className="timeline-item">
                                <div className="timeline-dot"></div>
                                <div className="timeline-content">
                                    <p className="timeline-action">{activity.action}</p>
                                    <div className="timeline-meta">
                                        <span className="timeline-user">
                                            <Users size={10} className="meta-icon" /> {activity.user}
                                        </span>
                                        <span className="timeline-time">
                                            <Clock size={10} className="meta-icon" /> {activity.time}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
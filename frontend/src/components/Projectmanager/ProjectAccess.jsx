// src/pages/ProjectAccess.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Folder, Users, Plus, X, Eye, Edit, Shield,
  UserPlus, UserMinus, ChevronDown, ChevronRight, FileText,
  CheckCircle, AlertCircle, Save, Building2, Settings,
  Check, ArrowLeft, Pencil, Trash2, User, Calendar, Clock,
  Grid, List, LayoutGrid, UserCheck, UserX, UserCog, UserCheck as UserApprover,
  PauseCircle, TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, Loader2
} from 'lucide-react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import AlertModal from '../AlertModal';
import '../../styles/ProjectAccess.css';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api';
import { calculateDynamicPriority } from '../../utils/priority';

const GROUP_ICONS = {
  'Company Master': Building2,
  'Project Management': Folder,
  'User Modules': Users,
  'System Settings': Settings
};

// ── SCREEN DEFINITIONS ──
const SCREEN_GROUPS = [
  {
    id: 'company-master',
    name: 'Company Master',
    icon: Building2,
    screens: [
      { id: 'admin-dashboard', name: 'Admin Dashboard' },
      { id: 'company-creation', name: 'Company Creation' },
      { id: 'employee-creation', name: 'Employee Creation' }
    ]
  },
  {
    id: 'project',
    name: 'Project Management',
    icon: Folder,
    screens: [
      { id: 'project-creation', name: 'Project Creation' },
      { id: 'task-board', name: 'Task Board' },
      { id: 'project-dashboard', name: 'Project Dashboard' }
    ]
  },
  {
    id: 'user',
    name: 'User Modules',
    icon: Users,
    screens: [
      { id: 'user-dashboard', name: 'User Dashboard' },
      { id: 'my-tasks', name: 'My Tasks' }
    ]
  },
  {
    id: 'settings',
    name: 'System Settings',
    icon: Settings,
    screens: [
      { id: 'assign-access', name: 'Assign Access' },
      { id: 'profile', name: 'Profile' }
    ]
  }
];

const PERMISSION_TYPES = ['view', 'create', 'edit', 'delete'];

const PERMISSION_STATES = {
  EMPTY: 'empty',
  BLUE: 'blue',
  GREEN: 'green',
  RED: 'red'
};

const getStatusColor = (status) => {
  const colors = { 
    'Completed': 'green', 
    'In Progress': 'orange', 
    'Pending': 'gray',
    'Under Review': 'purple',
    'Rework': 'orange',
    'Overdue': 'red',
    'Due Today': 'orange'
  };
  return colors[status] || 'gray';
};

const getInitials = (name) => {
  if (!name || name === 'Unassigned' || name === '—') return '??';
  const cleanName = name.replace(/\([^)]*\)/g, '').trim();
  return cleanName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
};

const getAvatarColor = (name) => {
  if (!name) return '#64748b';
  const colors = [
    '#2563eb', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', 
    '#ef4444', '#8b5cf6', '#14b8a6', '#f472b6', '#6366f1'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const renderStatusBadge = (status) => {
  const color = getStatusColor(status);
  let Icon = AlertCircle;
  if (status === 'Completed') Icon = CheckCircle;
  else if (status === 'In Progress') Icon = Clock;
  else if (status === 'Under Review') Icon = Eye;
  else if (status === 'Rework') Icon = RefreshCw;
  else if (status === 'Overdue') Icon = AlertTriangle;
  else if (status === 'Due Today') Icon = Clock;

  return (
    <span className={`pac-status-badge pac-status-${color}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <Icon size={12} style={{ flexShrink: 0 }} />
      <span>{status}</span>
    </span>
  );
};

const getProjectStatusColor = (status) => {
  const colors = { 
    'active': 'green', 
    'live': 'green', 
    'upcoming': 'orange', 
    'completed': 'blue',
    'closed': 'blue',
    'on-hold': 'red',
    'hold': 'red'
  };
  return colors[status] || 'gray';
};

const getProjectStatusIcon = (status) => {
  switch(status) {
    case 'active':
    case 'live': return '🟢';
    case 'upcoming': return '🟠';
    case 'completed':
    case 'closed': return '🔵';
    case 'on-hold':
    case 'hold': return '🔴';
    default: return '⚪';
  }
};

const getProjectStatusLabel = (status) => {
  switch(status) {
    case 'active':
    case 'live': return 'Active';
    case 'upcoming': return 'Upcoming';
    case 'completed':
    case 'closed': return 'Completed';
    case 'on-hold':
    case 'hold': return 'On Hold';
    default: return status;
  }
};

const getPermissionStateColor = (state) => {
  const colors = { 'blue': 'blue', 'green': 'green', 'red': 'red', 'empty': 'empty' };
  return colors[state] || 'empty';
};

const getPriorityColor = (priority) => {
  const p = String(priority || '').toLowerCase().trim();
  switch(p) {
    case 'atmost critical':
    case 'atmost_critical': return '#7f1d1d';
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#f59e0b';
    case 'normal': return '#3b82f6';
    case 'low': return '#10b981';
    default: return '#64748b';
  }
};

const getPriorityLabel = (priority) => {
  const p = String(priority || '').toLowerCase().trim();
  switch(p) {
    case 'atmost critical':
    case 'atmost_critical': return 'Atmost Critical';
    case 'critical': return 'Critical';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'normal': return 'Normal';
    case 'low': return 'Low';
    default: return priority || 'Normal';
  }
};

const getPriorityIcon = (priority) => {
  const p = String(priority || '').toLowerCase().trim();
  switch(p) {
    case 'atmost critical':
    case 'atmost_critical':
    case 'critical':
    case 'high': return <TrendingUp size={14} />;
    case 'medium':
    case 'normal': return <Minus size={14} />;
    case 'low': return <TrendingDown size={14} />;
    default: return <Minus size={14} />;
  }
};

// ── Searchable Role Select Component ──
const SearchableRoleSelect = ({ options, value, onChange, placeholder = "-- Unassigned --" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220, openUp: false });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 230;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setCoords({
        top: openUp ? rect.top : (rect.bottom + 4),
        left: rect.left,
        width: Math.max(rect.width, 220),
        openUp: openUp
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
      setSearchTerm("");
    } else {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => String(o.value) === String(value));

  const filteredOptions = options.filter(o => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase().trim();
    return (
      o.label?.toLowerCase().includes(s) ||
      (o.name && o.name.toLowerCase().includes(s)) ||
      (o.code && o.code.toLowerCase().includes(s)) ||
      (o.dept && o.dept.toLowerCase().includes(s))
    );
  });

  return (
    <div className="pac-searchable-select-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`pac-searchable-select-btn ${isOpen ? 'open' : ''} ${selectedOption ? 'has-value' : ''}`}
        onClick={handleToggle}
        title={selectedOption ? selectedOption.label : placeholder}
      >
        <span className="pac-searchable-select-text">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={13} className={`pac-select-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={`pac-searchable-select-dropdown pac-portal-dropdown ${coords.openUp ? 'open-up' : 'open-down'}`}
          style={{
            position: 'fixed',
            top: coords.openUp ? 'auto' : `${coords.top}px`,
            bottom: coords.openUp ? `${window.innerHeight - coords.top + 4}px` : 'auto',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 9999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pac-searchable-select-search-box">
            <Search size={13} className="pac-searchable-select-icon" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pac-searchable-select-input"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                className="pac-searchable-select-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm("");
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="pac-searchable-select-list">
            <div
              className={`pac-searchable-select-item unassigned-opt ${!value ? 'selected' : ''}`}
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearchTerm("");
              }}
            >
              <span>-- Unassigned --</span>
              {!value && <Check size={13} />}
            </div>

            {filteredOptions.length === 0 ? (
              <div className="pac-searchable-select-no-results">
                No matching results
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    className={`pac-searchable-select-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <div className="pac-searchable-item-content">
                      <span className="pac-searchable-item-name">{opt.name || opt.label}</span>
                      <div className="pac-searchable-item-sub">
                        {opt.code && <span className="pac-searchable-item-code">({opt.code})</span>}
                        {opt.dept && <span className="pac-searchable-item-dept">{opt.dept}</span>}
                      </div>
                    </div>
                    {isSelected && <Check size={13} className="pac-searchable-item-check" />}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ── Main Component ──
const ProjectAccess = ({ userRole, onLogout }) => {
  // ── State ──
  const [currentView, setCurrentView] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState('permission');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditPermissions, setShowEditPermissions] = useState(false);
  const [taskRoleCategories, setTaskRoleCategories] = useState({});
  const [expandedMilestones, setExpandedMilestones] = useState(new Set(['M-001']));
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedProjectGroups, setExpandedProjectGroups] = useState({});
  const [accessGroups, setAccessGroups] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [projectAccesses, setProjectAccesses] = useState([]);
  const [alertConfig, setAlertConfig] = useState({ 
    isOpen: false, 
    type: 'info', 
    title: '', 
    message: '',
    onConfirm: null,
    confirmText: 'OK',
    cancelText: 'Cancel'
  });
  
  // ── List/Grid View State ──
  const [projectViewType, setProjectViewType] = useState('grid');

  // ── Add Employee Modal State ──
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  // ── Data ──
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [externalEmployees, setExternalEmployees] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [allEmployeesPermissions, setAllEmployeesPermissions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Fetch initial data
  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await apiGet('/api/projects/access');
      const mappedProjects = (data || []).map(proj => {
        const dynamicPrio = calculateDynamicPriority(
          proj.priority || proj.prjPrty || 'LOW',
          proj.startDate || proj.stDt,
          proj.endDate || proj.endDt,
          proj.totalProjectDays || proj.noOfDays
        );
        return {
          ...proj,
          id: proj.id || String(proj.prjId),
          name: proj.name || proj.prjNm,
          code: proj.code || proj.prjCd,
          description: proj.description || proj.prjDesc,
          status: proj.status || (proj.prjSts ? proj.prjSts.toLowerCase() : 'active'),
          priority: dynamicPrio.priority,
          priorityMeta: dynamicPrio,
          progress: proj.progress || 0,
          startDate: proj.startDate || proj.stDt,
          endDate: proj.endDate || proj.endDt,
          manager: proj.manager || 'Suresh Babu (EMP1009)',
          department: proj.department || 'Operations',
          assignedEmployees: proj.assignedEmployees || []
        };
      });
      setProjects(mappedProjects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      showAlert('error', 'Error', 'Failed to load projects.');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const [empData, extData] = await Promise.all([
        apiGet('/api/employees').catch(() => []),
        apiGet('/api/external-employees').catch(() => [])
      ]);
      const mappedEmployees = (empData || []).map(emp => ({
        ...emp,
        id: emp.empId,
        rawId: emp.empId,
        empCode: emp.empCode,
        name: `${emp.fstNm || emp.firstName || ''} ${emp.lstNm || emp.lastName || ''}`.trim(),
        photoUrl: emp.photoUrl || emp.photo_url || null,
        designation: emp.designation || 'Employee',
        department: emp.deptNm || 'Operations',
        isExternal: false
      }));
      const mappedExtEmployees = (extData || []).map(ext => ({
        ...ext,
        id: `EXT_${ext.extEmpId}`,
        rawId: ext.extEmpId,
        empCode: ext.extEmpCode || `EXT-${ext.extEmpId}`,
        name: ext.extEmpNm || ext.ext_emp_nm || 'External Employee',
        photoUrl: ext.photoPath || null,
        designation: ext.companyNm ? `External (${ext.companyNm})` : 'External Employee',
        department: ext.companyNm || 'External Vendor',
        isExternal: true
      }));
      setEmployees(mappedEmployees);
      setExternalEmployees(mappedExtEmployees);
    } catch (err) {
      console.error("Error fetching employees:", err);
      showAlert('error', 'Error', 'Failed to load employees.');
    }
  };

  // ── Alert ──
  const showAlert = (type, title, message, onConfirm = null, confirmText = 'OK', cancelText = 'Cancel') => {
    setAlertConfig({ 
      isOpen: true, 
      type, 
      title, 
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  };

  // ── Initialize Access Groups ──
  const initializeAccessGroups = (project) => {
    if (!project) {
      const emptyGroups = SCREEN_GROUPS.map(group => ({
        ...group,
        screens: group.screens.map(screen => ({
          ...screen,
          view: PERMISSION_STATES.EMPTY,
          create: PERMISSION_STATES.EMPTY,
          edit: PERMISSION_STATES.EMPTY,
          delete: PERMISSION_STATES.EMPTY,
          badge: 'orange',
          badgeText: 'No Access'
        })),
        view: PERMISSION_STATES.EMPTY,
        create: PERMISSION_STATES.EMPTY,
        edit: PERMISSION_STATES.EMPTY,
        delete: PERMISSION_STATES.EMPTY,
        badge: 'orange',
        badgeText: 'No Access'
      }));
      setAccessGroups(emptyGroups);
      return;
    }

    const groups = SCREEN_GROUPS.map(group => {
      const screens = group.screens.map(screen => {
        const perms = project.permissions?.[screen.id];
        if (perms) {
          const view = perms.view ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
          const create = perms.create ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
          const edit = perms.edit ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
          const delete_ = perms.delete ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
          
          const hasBlue = view === PERMISSION_STATES.BLUE || create === PERMISSION_STATES.BLUE || 
                          edit === PERMISSION_STATES.BLUE || delete_ === PERMISSION_STATES.BLUE;
          const hasEmpty = view === PERMISSION_STATES.EMPTY || create === PERMISSION_STATES.EMPTY || 
                          edit === PERMISSION_STATES.EMPTY || delete_ === PERMISSION_STATES.EMPTY;
          
          let badge = 'orange';
          let badgeText = 'No Access';
          if (hasBlue && hasEmpty) { badge = 'orange'; badgeText = 'Mixed'; }
          else if (hasBlue) { badge = 'blue'; badgeText = 'From Project'; }
          
          return { ...screen, view, create, edit, delete: delete_, badge, badgeText };
        }
        return { ...screen, view: PERMISSION_STATES.EMPTY, create: PERMISSION_STATES.EMPTY,
                  edit: PERMISSION_STATES.EMPTY, delete: PERMISSION_STATES.EMPTY,
                  badge: 'orange', badgeText: 'No Access' };
      });

      return { ...group, screens, view: PERMISSION_STATES.EMPTY, create: PERMISSION_STATES.EMPTY,
               edit: PERMISSION_STATES.EMPTY, delete: PERMISSION_STATES.EMPTY,
               badge: 'orange', badgeText: 'No Access' };
    });
    
    setAccessGroups(groups);
    setExpandedGroups({});
  };

  const initializeAccessGroupsFromPermissions = (permissions) => {
    const groups = SCREEN_GROUPS.map(group => {
      const screens = group.screens.map(screen => {
        const p = permissions.find(p => 
          (p.screenCode && p.screenCode.toLowerCase().replace(/_/g, '-') === screen.id.toLowerCase()) ||
          (p.screenNm && p.screenNm.toLowerCase() === screen.name.toLowerCase())
        );

        if (p) {
          const view = p.viewFlg ? (p.accessType === 'From Template' ? PERMISSION_STATES.BLUE : PERMISSION_STATES.GREEN) : PERMISSION_STATES.EMPTY;
          const create = p.addFlg ? (p.accessType === 'From Template' ? PERMISSION_STATES.BLUE : PERMISSION_STATES.GREEN) : PERMISSION_STATES.EMPTY;
          const edit = p.editFlg ? (p.accessType === 'From Template' ? PERMISSION_STATES.BLUE : PERMISSION_STATES.GREEN) : PERMISSION_STATES.EMPTY;
          const delete_ = p.deleteFlg ? (p.accessType === 'From Template' ? PERMISSION_STATES.BLUE : PERMISSION_STATES.GREEN) : PERMISSION_STATES.EMPTY;

          const hasBlue = [view, create, edit, delete_].includes(PERMISSION_STATES.BLUE);
          const hasGreen = [view, create, edit, delete_].includes(PERMISSION_STATES.GREEN);
          const hasRed = [view, create, edit, delete_].includes(PERMISSION_STATES.RED);
          
          let badge = 'orange';
          let badgeText = 'No Access';
          if (hasBlue && (hasGreen || hasRed)) { badge = 'orange'; badgeText = 'Mixed'; }
          else if (hasBlue) { badge = 'blue'; badgeText = 'From Template'; }
          else if (hasGreen) { badge = 'green'; badgeText = 'Added'; }
          else if (hasRed) { badge = 'red'; badgeText = 'Revoked'; }

          return {
            ...screen,
            screenId: p.screenId,
            screenCode: p.screenCode,
            view,
            create,
            edit,
            delete: delete_,
            badge,
            badgeText
          };
        }

        return {
          ...screen,
          view: PERMISSION_STATES.EMPTY,
          create: PERMISSION_STATES.EMPTY,
          edit: PERMISSION_STATES.EMPTY,
          delete: PERMISSION_STATES.EMPTY,
          badge: 'orange',
          badgeText: 'No Access'
        };
      });

      return {
        ...group,
        screens,
        view: PERMISSION_STATES.EMPTY,
        create: PERMISSION_STATES.EMPTY,
        edit: PERMISSION_STATES.EMPTY,
        delete: PERMISSION_STATES.EMPTY,
        badge: 'orange',
        badgeText: 'No Access'
      };
    });

    groups.forEach(group => {
      group.view = group.screens.some(s => s.view !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
      group.create = group.screens.some(s => s.create !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
      group.edit = group.screens.some(s => s.edit !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
      group.delete = group.screens.some(s => s.delete !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;

      const groupHasBlue = group.screens.some(s => [s.view, s.create, s.edit, s.delete].includes(PERMISSION_STATES.BLUE));
      const groupHasGreen = group.screens.some(s => [s.view, s.create, s.edit, s.delete].includes(PERMISSION_STATES.GREEN));
      const groupHasRed = group.screens.some(s => [s.view, s.create, s.edit, s.delete].includes(PERMISSION_STATES.RED));

      if (groupHasBlue && (groupHasGreen || groupHasRed)) {
        group.badge = 'orange';
        group.badgeText = 'Mixed';
      } else if (groupHasBlue) {
        group.badge = 'blue';
        group.badgeText = 'From Template';
      } else if (groupHasGreen) {
        group.badge = 'green';
        group.badgeText = 'Added';
      } else if (groupHasRed) {
        group.badge = 'red';
        group.badgeText = 'Revoked';
      } else {
        group.badge = 'orange';
        group.badgeText = 'No Access';
      }
    });

    setAccessGroups(groups);
    setExpandedGroups({});
  };

  const refreshProjectDetails = async (projectId) => {
    try {
      const accessData = await apiGet(`/api/projects/${projectId}/access`);
      setSelectedProject(accessData.project || selectedProject);
      setSelectedEmployees(accessData.assignedEmployees || []);
      setProjectAccesses(accessData.accesses || []);

      const milestonesData = await apiGet(`/api/projects/${projectId}/milestones-with-tasks`);
      const mappedMilestones = (milestonesData || []).map(m => ({
        id: m.id || String(m.mId),
        name: m.name || m.mlstnTtl,
        tasks: (m.tasks || []).map(t => ({
          id: t.id || String(t.taskId),
          name: t.name || t.taskNm,
          taskCode: t.taskCode,
          assignee: t.assignee || 'Unassigned',
          reviewer: t.reviewer || 'Unassigned',
          approver: t.approver || 'Unassigned',
          status: t.status || 'Pending'
        }))
      }));
      setMilestones(mappedMilestones);

      try {
        const allPerms = await apiGet('/api/rbac/employees/permissions');
        setAllEmployeesPermissions(allPerms || []);
      } catch (err) {
        console.warn("Could not fetch all employee permissions:", err);
      }
    } catch (err) {
      console.error("Error refreshing project details:", err);
    }
  };

  // ── Open/Close Project ──
  const openProjectDetail = async (project) => {
    try {
      const accessData = await apiGet(`/api/projects/${project.id}/access`);
      setSelectedProject(accessData.project || project);
      setSelectedEmployees(accessData.assignedEmployees || []);
      setProjectAccesses(accessData.accesses || []);

      const milestonesData = await apiGet(`/api/projects/${project.id}/milestones-with-tasks`);
      const mappedMilestones = (milestonesData || []).map(m => ({
        id: m.id || String(m.mId),
        name: m.name || m.mlstnTtl,
        tasks: (m.tasks || []).map(t => ({
          id: t.id || String(t.taskId),
          name: t.name || t.taskNm,
          taskCode: t.taskCode,
          assignee: t.assignee || 'Unassigned',
          reviewer: t.reviewer || 'Unassigned',
          approver: t.approver || 'Unassigned',
          status: t.status || 'Pending'
        }))
      }));
      setMilestones(mappedMilestones);

      // Fetch all employee permissions first (needed for both checkboxes and avatar display)
      let allPerms = [];
      try {
        allPerms = await apiGet('/api/rbac/employees/permissions') || [];
        setAllEmployeesPermissions(allPerms);
      } catch (err) {
        console.warn("Could not fetch all employee permissions:", err);
      }

      // Build checkboxes as UNION of all project employees' permissions
      const assignedIds = accessData.assignedEmployees || [];
      const projectEmpPerms = allPerms.filter(p => assignedIds.map(id => String(id)).includes(String(p.employeeId)));

      if (projectEmpPerms.length > 0) {
        // Merge all permissions: if any employee has access to a screen, show as ticked
        const mergedPermissions = [];
        const screenMap = {};
        projectEmpPerms.forEach(empPerm => {
          (empPerm.permissions || []).forEach(p => {
            const key = p.screenCode || p.screenNm;
            if (!screenMap[key]) {
              screenMap[key] = { ...p, viewFlg: false, addFlg: false, editFlg: false, deleteFlg: false };
            }
            if (p.viewFlg) screenMap[key].viewFlg = true;
            if (p.addFlg) screenMap[key].addFlg = true;
            if (p.editFlg) screenMap[key].editFlg = true;
            if (p.deleteFlg) screenMap[key].deleteFlg = true;
          });
        });
        Object.values(screenMap).forEach(p => mergedPermissions.push(p));
        initializeAccessGroupsFromPermissions(mergedPermissions);
      } else {
        initializeAccessGroups(project);
      }

      setCurrentView('project-detail');
      setShowEditPermissions(false);
      setSearchTerm('');
    } catch (err) {
      console.error("Error opening project details:", err);
      showAlert('error', 'Error', 'Failed to load project details.');
    }
  };

  const closeProjectDetail = () => {
    setSelectedProject(null);
    setSelectedEmployees([]);
    setAccessGroups([]);
    setProjectAccesses([]);
    setCurrentView('projects');
    setShowEditPermissions(false);
    setSearchTerm('');
  };

  // ── Toggle Functions ──
  const toggleMilestone = (id) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleGroup = (id) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProjectGroup = (id) => {
    setExpandedProjectGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Permission Toggle ──
  const togglePermission = (groupId, screenId, permissionType) => {
    if (!showEditPermissions) return;

    const newGroups = accessGroups.map(group => ({
      ...group,
      screens: group.screens.map(screen => ({ ...screen }))
    }));

    const groupIndex = newGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;

    const screenIndex = newGroups[groupIndex].screens.findIndex(s => s.id === screenId);
    if (screenIndex === -1) return;

    const screen = newGroups[groupIndex].screens[screenIndex];
    const currentState = screen[permissionType];
    
    let newState;
    if (currentState === PERMISSION_STATES.EMPTY) newState = PERMISSION_STATES.GREEN;
    else if (currentState === PERMISSION_STATES.GREEN) newState = PERMISSION_STATES.EMPTY;
    else if (currentState === PERMISSION_STATES.BLUE) newState = PERMISSION_STATES.RED;
    else if (currentState === PERMISSION_STATES.RED) newState = PERMISSION_STATES.EMPTY;
    else newState = PERMISSION_STATES.EMPTY;

    screen[permissionType] = newState;

    const hasBlue = PERMISSION_TYPES.some(p => screen[p] === PERMISSION_STATES.BLUE);
    const hasGreen = PERMISSION_TYPES.some(p => screen[p] === PERMISSION_STATES.GREEN);
    const hasRed = PERMISSION_TYPES.some(p => screen[p] === PERMISSION_STATES.RED);
    
    if (hasBlue && (hasGreen || hasRed)) { screen.badge = 'orange'; screen.badgeText = 'Mixed'; }
    else if (hasBlue) { screen.badge = 'blue'; screen.badgeText = 'From Project'; }
    else if (hasGreen) { screen.badge = 'green'; screen.badgeText = 'Added'; }
    else if (hasRed) { screen.badge = 'red'; screen.badgeText = 'Revoked'; }
    else { screen.badge = 'orange'; screen.badgeText = 'No Access'; }

    const group = newGroups[groupIndex];
    group.view = group.screens.some(s => s.view !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
    group.create = group.screens.some(s => s.create !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
    group.edit = group.screens.some(s => s.edit !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
    group.delete = group.screens.some(s => s.delete !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
    
    const groupHasBlue = group.screens.some(s => 
      PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.BLUE)
    );
    const groupHasGreen = group.screens.some(s => 
      PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.GREEN)
    );
    const groupHasRed = group.screens.some(s => 
      PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.RED)
    );
    
    if (groupHasBlue && (groupHasGreen || groupHasRed)) {
      group.badge = 'orange';
      group.badgeText = 'Mixed';
    } else if (groupHasBlue) {
      group.badge = 'blue';
      group.badgeText = 'From Project';
    } else if (groupHasGreen) {
      group.badge = 'green';
      group.badgeText = 'Added';
    } else if (groupHasRed) {
      group.badge = 'red';
      group.badgeText = 'Revoked';
    } else {
      group.badge = 'orange';
      group.badgeText = 'No Access';
    }

    setAccessGroups(newGroups);
  };

  // ── Render Checkbox ──
  const renderCheckbox = (state, groupId, screenId, permissionType) => {
    const handleClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      togglePermission(groupId, screenId, permissionType);
    };

    const color = getPermissionStateColor(state);

    return (
      <div 
        className={`pac-chk pac-chk-${color}`}
        onClick={handleClick}
        style={{ cursor: showEditPermissions ? 'pointer' : 'default' }}
      >
        {state === PERMISSION_STATES.BLUE && <Check size={12} strokeWidth={3} />}
        {state === PERMISSION_STATES.GREEN && <Check size={12} strokeWidth={3} />}
        {state === PERMISSION_STATES.RED && <X size={12} strokeWidth={3} />}
      </div>
    );
  };

  // ── Render Task Checkbox ──
  const renderTaskCheckbox = (taskId, permissionType) => {
    let state = PERMISSION_STATES.EMPTY;
    if (accessGroups && accessGroups.length > 0) {
      accessGroups.forEach(group => {
        group.screens.forEach(screen => {
          if (screen.id === 'individual-task' || screen.id === 'task-board') {
            state = screen[permissionType] || PERMISSION_STATES.EMPTY;
          }
        });
      });
    }

    const color = getPermissionStateColor(state);
    const handleClick = (e) => {
      e.stopPropagation();
      if (!showEditPermissions) return;
      
      let targetGroupId = null;
      let targetScreenId = null;
      accessGroups.forEach(group => {
        group.screens.forEach(screen => {
          if (screen.id === 'individual-task' || screen.id === 'task-board') {
            targetGroupId = group.id;
            targetScreenId = screen.id;
          }
        });
      });
      if (targetGroupId && targetScreenId) {
        togglePermission(targetGroupId, targetScreenId, permissionType);
      }
    };

    return (
      <div 
        className={`pac-chk pac-chk-${color}`}
        onClick={handleClick}
        style={{ cursor: showEditPermissions ? 'pointer' : 'default', opacity: showEditPermissions ? 1 : 0.6 }}
      >
        {state === PERMISSION_STATES.BLUE && <Check size={12} strokeWidth={3} />}
        {state === PERMISSION_STATES.GREEN && <Check size={12} strokeWidth={3} />}
        {state === PERMISSION_STATES.RED && <X size={12} strokeWidth={3} />}
      </div>
    );
  };

  // ── Filters ──
  const filteredProjects = (() => {
    if (!projectSearchTerm) return projects;
    const search = projectSearchTerm.toLowerCase().trim();
    return projects.filter(p => 
      p.name?.toLowerCase().includes(search) ||
      p.code?.toLowerCase().includes(search) ||
      p.manager?.toLowerCase().includes(search) ||
      p.department?.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search) ||
      p.status?.toLowerCase().includes(search)
    );
  })();

  const filteredMilestones = (() => {
    if (!searchTerm) return milestones;
    const search = searchTerm.toLowerCase().trim();
    return milestones.map(m => {
      const milestoneMatches = m.name?.toLowerCase().includes(search) || String(m.id)?.toLowerCase().includes(search);
      const matchingTasks = (m.tasks || []).filter(t => 
        milestoneMatches ||
        t.name?.toLowerCase().includes(search) || 
        t.taskCode?.toLowerCase().includes(search) || 
        String(t.id)?.toLowerCase().includes(search) ||
        (t.assignee && t.assignee.toLowerCase().includes(search)) ||
        (t.reviewer && t.reviewer.toLowerCase().includes(search)) ||
        (t.approver && t.approver.toLowerCase().includes(search)) ||
        (t.status && t.status.toLowerCase().includes(search))
      );
      if (milestoneMatches || matchingTasks.length > 0) {
        return {
          ...m,
          tasks: matchingTasks
        };
      }
      return null;
    }).filter(Boolean);
  })();

  // ── Employee Management Functions ──
  
  // Get Employee Tasks
  const getEmployeeTasks = (empId) => {
    const emp = employees.find(e => String(e.id) === String(empId)) ||
                externalEmployees.find(e => String(e.id) === String(empId) || String(e.rawId) === String(empId));
    if (!emp) return [];
    
    const assignedTasks = [];
    milestones.forEach(milestone => {
      if (!milestone.tasks) return;
      milestone.tasks.forEach(task => {
        const matchCode = emp.empCode ? `(${emp.empCode})` : `(${emp.rawId || emp.id})`;
        const matchName = emp.name;
        
        const isAssignee = (task.assignee && (task.assignee.includes(matchCode) || (emp.empCode && task.assignee.includes(emp.empCode)) || (matchName && task.assignee.includes(matchName))));
        const isReviewer = (task.reviewer && (task.reviewer.includes(matchCode) || (emp.empCode && task.reviewer.includes(emp.empCode)) || (matchName && task.reviewer.includes(matchName))));
        const isApprover = (task.approver && (task.approver.includes(matchCode) || (emp.empCode && task.approver.includes(emp.empCode)) || (matchName && task.approver.includes(matchName))));

        if (isAssignee) {
          assignedTasks.push({
            ...task,
            milestoneId: milestone.id,
            milestoneName: milestone.name,
            role: 'Assignee'
          });
        }
        if (isReviewer) {
          assignedTasks.push({
            ...task,
            milestoneId: milestone.id,
            milestoneName: milestone.name,
            role: 'Reviewer'
          });
        }
        if (isApprover) {
          assignedTasks.push({
            ...task,
            milestoneId: milestone.id,
            milestoneName: milestone.name,
            role: 'Approver'
          });
        }
      });
    });
    return assignedTasks;
  };

  const getScreenUsers = (screenId, screenName) => {
    const list = [];
    selectedEmployees.forEach(empId => {
      const empPerms = allEmployeesPermissions.find(p => String(p.employeeId) === String(empId));
      if (empPerms && empPerms.permissions) {
        const hasAccess = empPerms.permissions.some(p => {
          const matchId = (p.screenCode && p.screenCode.toLowerCase().replace(/_/g, '-') === screenId.toLowerCase());
          const matchName = (p.screenNm && p.screenNm.toLowerCase() === screenName.toLowerCase());
          return (matchId || matchName) && (p.viewFlg || p.addFlg || p.editFlg || p.deleteFlg);
        });
        if (hasAccess) {
          const emp = employees.find(e => String(e.id) === String(empId));
          const name = emp?.name || empPerms.name || `Employee ${empId}`;
          list.push({
            id: empId,
            name,
            photoUrl: emp?.photoUrl || null,
            initials: getInitials(name),
            avatarColor: getAvatarColor(name)
          });
        }
      }
    });
    return list;
  };

  const getGroupUsers = (groupId, groupScreens) => {
    const list = [];
    selectedEmployees.forEach(empId => {
      const empPerms = allEmployeesPermissions.find(p => String(p.employeeId) === String(empId));
      if (empPerms && empPerms.permissions) {
        const hasAccess = groupScreens.some(screen => {
          return empPerms.permissions.some(p => {
            const matchId = (p.screenCode && p.screenCode.toLowerCase().replace(/_/g, '-') === screen.id.toLowerCase());
            const matchName = (p.screenNm && p.screenNm.toLowerCase() === screen.name.toLowerCase());
            return (matchId || matchName) && (p.viewFlg || p.addFlg || p.editFlg || p.deleteFlg);
          });
        });
        if (hasAccess) {
          const emp = employees.find(e => String(e.id) === String(empId));
          const name = emp?.name || empPerms.name || `Employee ${empId}`;
          list.push({
            id: empId,
            name,
            photoUrl: emp?.photoUrl || null,
            initials: getInitials(name),
            avatarColor: getAvatarColor(name)
          });
        }
      }
    });
    return list;
  };

  // Get Employee Task Count
  const getEmployeeTaskCount = (empId) => {
    const emp = employees.find(e => String(e.id) === String(empId)) ||
                externalEmployees.find(e => String(e.id) === String(empId) || String(e.rawId) === String(empId));
    if (!emp) return 0;
    
    let count = 0;
    const matchCode = emp.empCode ? `(${emp.empCode})` : `(${emp.rawId || emp.id})`;
    const matchName = emp.name;

    milestones.forEach(milestone => {
      if (!milestone.tasks) return;
      milestone.tasks.forEach(task => {
        const isAssignee = (task.assignee && (task.assignee.includes(matchCode) || (emp.empCode && task.assignee.includes(emp.empCode)) || (matchName && task.assignee.includes(matchName))));
        const isReviewer = (task.reviewer && (task.reviewer.includes(matchCode) || (emp.empCode && task.reviewer.includes(emp.empCode)) || (matchName && task.reviewer.includes(matchName))));
        const isApprover = (task.approver && (task.approver.includes(matchCode) || (emp.empCode && task.approver.includes(emp.empCode)) || (matchName && task.approver.includes(matchName))));
        
        if (isAssignee) count++;
        if (isReviewer) count++;
        if (isApprover) count++;
      });
    });
    return count;
  };

  // Remove Employee with Task Check
  const handleRemoveEmployee = (empId) => {
    const employeeTasks = getEmployeeTasks(empId);
    
    if (employeeTasks.length > 0) {
      const taskList = employeeTasks.map(t => 
        `• ${t.id} - ${t.name} (${t.milestoneName}) [${t.role}]`
      ).join('\n');
      
      showAlert(
        'warning',
        `⚠️ Employee has ${employeeTasks.length} assigned task(s)!`,
        `Employee has the following assigned tasks:\n\n${taskList}\n\nRemoving this employee will unassign these tasks. Do you want to continue?`,
        () => confirmRemoveEmployee(empId, employeeTasks),
        'Yes, Remove Employee',
        'Cancel'
      );
    } else {
      confirmRemoveEmployee(empId, []);
    }
  };

  // Confirm Remove Employee
  const confirmRemoveEmployee = async (empId, employeeTasks) => {
    try {
      await apiDelete(`/api/projects/${selectedProject.id}/access/${empId}`);

      if (employeeTasks.length > 0) {
        const emp = employees.find(e => String(e.id) === String(empId)) ||
                    externalEmployees.find(e => String(e.id) === String(empId) || String(e.rawId) === String(empId));
        const matchCode = emp ? (emp.empCode ? `(${emp.empCode})` : `(${emp.rawId || emp.id})`) : `(${empId})`;
        const matchName = emp ? emp.name : '';

        for (const t of employeeTasks) {
          const isAssignee = t.assignee && (t.assignee.includes(matchCode) || (emp?.empCode && t.assignee.includes(emp.empCode)) || (matchName && t.assignee.includes(matchName)));
          const isReviewer = t.reviewer && (t.reviewer.includes(matchCode) || (emp?.empCode && t.reviewer.includes(emp.empCode)) || (matchName && t.reviewer.includes(matchName)));
          const isApprover = t.approver && (t.approver.includes(matchCode) || (emp?.empCode && t.approver.includes(emp.empCode)) || (matchName && t.approver.includes(matchName)));

          if (isAssignee) {
            await apiPost(`/api/projects/tasks/${t.id}/assign-role`, { roleType: 'assignee', empId: null, extEmpId: null });
          }
          if (isReviewer) {
            await apiPost(`/api/projects/tasks/${t.id}/assign-role`, { roleType: 'reviewer', empId: null, extEmpId: null });
          }
          if (isApprover) {
            await apiPost(`/api/projects/tasks/${t.id}/assign-role`, { roleType: 'approver', empId: null, extEmpId: null });
          }
        }
      }

      await refreshProjectDetails(selectedProject.id);

      if (employeeTasks.length > 0) {
        showAlert('info', 'Tasks Unassigned', 
          `${employeeTasks.length} task(s) have been unassigned in the database.`
        );
      } else {
        showAlert('success', 'Employee Removed', 'Employee has been removed from the project.');
      }
    } catch (err) {
      console.error("Error removing employee:", err);
      showAlert('error', 'Error', 'Failed to remove employee.');
    }
  };

  const handleAddEmployee = async (empId) => {
    if (!selectedEmployees.includes(empId)) {
      try {
        const rawId = typeof empId === 'string' && empId.startsWith('EXT_') ? Number(empId.replace('EXT_', '')) : Number(empId);
        await apiPost(`/api/projects/${selectedProject.id}/access`, {
          empId: rawId,
          accessType: 'EDITOR',
          performedBy: 'System',
          remarks: 'Added via Project Access UI'
        });
        
        await refreshProjectDetails(selectedProject.id);
        showAlert('success', 'Employee Added', 'Employee has been added to the project.');
        setShowAddEmployeeModal(false);
        setEmployeeSearchTerm('');
      } catch (err) {
        console.error("Error adding employee:", err);
        showAlert('error', 'Error', 'Failed to add employee.');
      }
    } else {
      showAlert('warning', 'Already Added', 'This employee is already in the project.');
    }
  };

  const handleAssignRole = async (taskId, roleType, id, isExternal = false) => {
    try {
      await apiPost(`/api/projects/tasks/${taskId}/assign-role`, {
        roleType,
        empId: !isExternal ? (id ? Number(id) : null) : null,
        extEmpId: isExternal ? (id ? Number(id) : null) : null,
        isExternal: Boolean(isExternal)
      });
      
      const milestonesData = await apiGet(`/api/projects/${selectedProject.id}/milestones-with-tasks`);
      const mappedMilestones = (milestonesData || []).map(m => ({
        id: m.id || String(m.mId),
        name: m.name || m.mlstnTtl,
        tasks: (m.tasks || []).map(t => ({
          id: t.id || String(t.taskId),
          name: t.name || t.taskNm,
          taskCode: t.taskCode,
          assignee: t.assignee || 'Unassigned',
          reviewer: t.reviewer || 'Unassigned',
          approver: t.approver || 'Unassigned',
          status: t.status || 'Pending'
        }))
      }));
      setMilestones(mappedMilestones);
      showAlert('success', 'Success', 'Employee role updated successfully!');
    } catch (err) {
      console.error("Error assigning task role:", err);
      showAlert('error', 'Error', 'Failed to update employee assignment.');
    }
  };

  // ── Get Available Employees ──
  const getAvailableEmployees = () => {
    const selectedIds = new Set(selectedEmployees.map(id => String(id)));
    const allAvailable = [
      ...employees.map(e => ({ ...e, isExternal: false })),
      ...externalEmployees.map(e => ({ ...e, isExternal: true }))
    ].filter(emp => !selectedIds.has(String(emp.id)) && !selectedIds.has(String(emp.rawId)));
    
    return [...allAvailable].sort((a, b) => {
      const aSelected = selectedEmployees.map(id => String(id)).includes(String(a.id));
      const bSelected = selectedEmployees.map(id => String(id)).includes(String(b.id));
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // ── Filter Available Employees ──
  const filteredAvailableEmployees = (() => {
    const available = getAvailableEmployees();
    if (!employeeSearchTerm) return available;
    const search = employeeSearchTerm.toLowerCase().trim();
    return available.filter(emp =>
      emp.name?.toLowerCase().includes(search) ||
      String(emp.id)?.toLowerCase().includes(search) ||
      String(emp.rawId)?.toLowerCase().includes(search) ||
      (emp.empCode && emp.empCode.toLowerCase().includes(search)) ||
      (emp.designation && emp.designation.toLowerCase().includes(search)) ||
      (emp.department && emp.department.toLowerCase().includes(search))
    );
  })();

  const handleSaveChanges = async () => {
    if (!selectedProject || !selectedEmployees || selectedEmployees.length === 0) {
      showAlert('warning', 'No Employees', 'At least one employee must be assigned to the project to save permissions.');
      return;
    }

    const permissionsPayload = [];
    accessGroups.forEach(group => {
      group.screens.forEach(screen => {
        permissionsPayload.push({
          screenId: screen.screenId,
          screenNm: screen.name,
          groupNm: group.name,
          screenCode: screen.screenCode,
          viewFlg: screen.view === PERMISSION_STATES.BLUE || screen.view === PERMISSION_STATES.GREEN,
          addFlg: screen.create === PERMISSION_STATES.BLUE || screen.create === PERMISSION_STATES.GREEN,
          editFlg: screen.edit === PERMISSION_STATES.BLUE || screen.edit === PERMISSION_STATES.GREEN,
          deleteFlg: screen.delete === PERMISSION_STATES.BLUE || screen.delete === PERMISSION_STATES.GREEN
        });
      });
    });

    try {
      await apiPost('/api/rbac/save', {
        empIds: selectedEmployees.map(id => Number(id)),
        roleId: null,
        customRoleName: "",
        permissions: permissionsPayload,
        createdBy: "Admin"
      });
      showAlert('success', 'Saved', 'Permissions saved successfully!');
      setShowEditPermissions(false);
    } catch (err) {
      console.error("Error saving permissions:", err);
      showAlert('error', 'Error', 'Failed to save screen permissions.');
    }
  };

  // ── RENDER: Projects View ──
  const renderProjectsView = () => {
    const normalizeStatus = (status) => {
      const s = (status || '').toLowerCase().replace(/[_\s]/g, '-');
      if (['active', 'in-progress', 'inprogress', 'live', 'ongoing'].includes(s)) return 'active';
      if (['upcoming', 'planned', 'planning', 'pending', 'new', 'initiated'].includes(s)) return 'upcoming';
      if (['completed', 'done', 'closed', 'finished'].includes(s)) return 'completed';
      if (['on-hold', 'onhold', 'paused', 'hold', 'cancelled', 'delayed'].includes(s)) return 'onHold';
      return 'active';
    };

    const groupedProjects = {
      active: filteredProjects.filter(p => normalizeStatus(p.status) === 'active'),
      upcoming: filteredProjects.filter(p => normalizeStatus(p.status) === 'upcoming'),
      completed: filteredProjects.filter(p => normalizeStatus(p.status) === 'completed'),
      onHold: filteredProjects.filter(p => normalizeStatus(p.status) === 'onHold')
    };

    const statusGroups = [
      { key: 'active', label: 'Active Projects', icon: Folder, color: 'green' },
      { key: 'upcoming', label: 'Upcoming Projects', icon: Calendar, color: 'orange' },
      { key: 'completed', label: 'Completed Projects', icon: CheckCircle, color: 'blue' },
      { key: 'onHold', label: 'On-Hold Projects', icon: PauseCircle, color: 'red' }
    ];

    return (
      <div className="pac-projects-view">
        <div className="pac-search-toggle-bar">
          <div className="pac-search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search projects by name, code, manager, department..."
              value={projectSearchTerm}
              onChange={(e) => setProjectSearchTerm(e.target.value)}
            />
            {projectSearchTerm && (
              <button 
                className="pac-search-clear"
                onClick={() => setProjectSearchTerm('')}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="pac-view-toggle-buttons">
            <button 
              className={`pac-view-toggle-btn ${projectViewType === 'grid' ? 'active' : ''}`}
              onClick={() => setProjectViewType('grid')}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button 
              className={`pac-view-toggle-btn ${projectViewType === 'list' ? 'active' : ''}`}
              onClick={() => setProjectViewType('list')}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {loadingProjects ? (
          <div className="pac-empty-state" style={{ padding: '60px 20px' }}>
            <Loader2 size={48} className="spinning" />
            <h4>Loading Projects...</h4>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="pac-empty-state" style={{ padding: '60px 20px' }}>
            <Folder size={48} />
            <h4>No Projects Found</h4>
            {projectSearchTerm ? (
              <>
                <p style={{ color: '#64748b', marginTop: '6px' }}>No projects match "{projectSearchTerm}"</p>
                <button 
                  className="pac-btn-outline" 
                  onClick={() => setProjectSearchTerm('')} 
                  style={{ marginTop: '14px' }}
                >
                  Clear Search
                </button>
              </>
            ) : (
              <p style={{ color: '#64748b', marginTop: '6px' }}>No projects available in the system.</p>
            )}
          </div>
        ) : (
          <div className={`pac-projects-container pac-projects-${projectViewType}`}>
            {statusGroups.map((group) => {
              const projectsInGroup = groupedProjects[group.key] || [];
              if (projectsInGroup.length === 0) return null;
              const isExpanded = Boolean(projectSearchTerm) || expandedProjectGroups[group.key] !== false;

              return (
                <div key={group.key} className="pac-project-group">
                  <div 
                    className="pac-project-group-header"
                    onClick={() => toggleProjectGroup(group.key)}
                  >
                    <div className="pac-project-group-title">
                      <group.icon size={20} className="pac-project-group-icon" />
                      <h3>{group.label}</h3>
                      <span className="pac-project-group-count">({projectsInGroup.length})</span>
                    </div>
                    {isExpanded ? 
                      <ChevronDown size={20} /> : 
                      <ChevronRight size={20} />
                    }
                  </div>
                  {isExpanded && (
                    <div className={`pac-project-group-content pac-project-group-${projectViewType}`}>
                      {projectsInGroup.map(project => 
                        projectViewType === 'grid' 
                          ? renderProjectCardGrid(project) 
                          : renderProjectCardList(project)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Project Card - Grid View (Dynamic & Attractive) ──
  const renderProjectCardGrid = (project) => {
    const statusColor = getProjectStatusColor(project.status);
    const priorityColor = getPriorityColor(project.priority);
    const statusIcon = getProjectStatusIcon(project.status);
    const statusLabel = getProjectStatusLabel(project.status);
    const progressColor = project.status === 'completed' ? '#10b981' :
                          project.status === 'upcoming' ? '#94a3b8' :
                          project.status === 'on-hold' ? '#ef4444' :
                          '#2563eb';
    
    // Card gradient based on status
    const getCardGradient = (status) => {
      switch(status) {
        case 'active': return 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
        case 'upcoming': return 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
        case 'completed': return 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
        case 'on-hold': return 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
        default: return 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
      }
    };

    // Status border color
    const getBorderColor = (status) => {
      switch(status) {
        case 'active': return '#2563eb';
        case 'upcoming': return '#f59e0b';
        case 'completed': return '#10b981';
        case 'on-hold': return '#ef4444';
        default: return '#94a3b8';
      }
    };

    return (
      <div 
        key={project.id} 
        className="pac-project-card pac-project-card-grid"
        onClick={() => openProjectDetail(project)}
        style={{
          background: getCardGradient(project.status),
          borderColor: getBorderColor(project.status),
          borderWidth: '2px'
        }}
      >
        {/* Card Top - Status & Priority */}
        <div className="pac-card-top">
          <div className="pac-card-status">
            <span className={`pac-status-dot ${statusColor}`}></span>
            <span className="pac-status-label">{statusLabel}</span>
          </div>
          <div className="pac-card-priority" style={{ background: priorityColor }}>
            {getPriorityIcon(project.priority)}
            <span>{getPriorityLabel(project.priority)}</span>
          </div>
        </div>

        {/* Card Header */}
        <div className="pac-card-header">
          <div className="pac-card-title-group">
            <h4 className="pac-card-title">{project.name}</h4>
            <span className="pac-card-code">{project.code}</span>
          </div>
        </div>

        {/* Card Meta - Department */}
        <div className="pac-card-meta">
          <div className="pac-card-meta-item">
            <Building2 size={14} className="pac-meta-icon" />
            <span>{project.department}</span>
          </div>
        </div>

        {/* Card Stats - Milestones & Tasks */}
        <div className="pac-card-stats">
          <div className="pac-card-stat">
            <span className="pac-stat-icon">🎯</span>
            <div className="pac-stat-info">
              <span className="pac-stat-label">Milestones</span>
              <span className="pac-stat-value">{project.milestonesCount?.completed || 0}/{project.milestonesCount?.total || 0}</span>
            </div>
          </div>
          <div className="pac-card-stat">
            <span className="pac-stat-icon">📋</span>
            <div className="pac-stat-info">
              <span className="pac-stat-label">Tasks</span>
              <span className="pac-stat-value">{project.tasks?.completed || 0}/{project.tasks?.total || 0}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pac-card-progress">
          <div className="pac-progress-header">
            <span className="pac-progress-label">Progress</span>
            <span className="pac-progress-value" style={{ color: progressColor }}>
              {project.progress}%
            </span>
          </div>
          <div className="pac-progress-bar">
            <div 
              className="pac-progress-fill" 
              style={{ 
                width: `${project.progress}%`,
                background: progressColor
              }}
            ></div>
          </div>
        </div>

        {/* Card Footer - Dates & Assignees */}
        <div className="pac-card-footer">
          <div className="pac-card-dates">
            <Calendar size={14} className="pac-footer-icon" />
            <span>{project.startDate}</span>
            <span className="pac-date-arrow">→</span>
            <span>{project.endDate}</span>
          </div>
          <div className="pac-card-assignees">
            <Users size={14} className="pac-footer-icon" />
            <span>{project.assignedEmployees?.length || 0}</span>
          </div>
        </div>

        {/* Hover Overlay - Click to Manage */}
        <div className="pac-card-hover-overlay">
          <span className="pac-hover-text">
            <Edit size={16} /> Manage Access
          </span>
        </div>
      </div>
    );
  };

  // ── Project Card - List View ──
  const renderProjectCardList = (project) => {
    const statusColor = getProjectStatusColor(project.status);
    const priorityColor = getPriorityColor(project.priority);
    const statusIcon = getProjectStatusIcon(project.status);
    const statusLabel = getProjectStatusLabel(project.status);
    const progressColor = project.status === 'completed' ? '#10b981' :
                          project.status === 'upcoming' ? '#94a3b8' :
                          project.status === 'on-hold' ? '#ef4444' :
                          '#2563eb';

    return (
      <div 
        key={project.id} 
        className="pac-project-card pac-project-card-list"
        onClick={() => openProjectDetail(project)}
      >
        <div className="pac-project-card-list-content">
          <div className="pac-list-left">
            <div className="pac-list-header">
              <div className="pac-list-title-group">
                <h4>{project.name}</h4>
                <span className="pac-project-code">{project.code}</span>
              </div>
              <div className="pac-list-badges">
                <span className={`pac-status-badge pac-status-${statusColor}`}>
                  {statusIcon} {statusLabel}
                </span>
                <span className="pac-priority-badge" style={{ background: priorityColor }}>
                  {getPriorityLabel(project.priority)}
                </span>
              </div>
            </div>
            <div className="pac-list-meta">
              <div className="pac-list-meta-item">
                <Building2 size={14} /> <span>{project.department}</span>
              </div>
              <div className="pac-list-meta-item">
                <span>🎯 Milestones: {project.milestonesCount?.completed || 0}/{project.milestonesCount?.total || 0}</span>
              </div>
              <div className="pac-list-meta-item">
                <span>📋 Tasks: {project.tasks?.completed || 0}/{project.tasks?.total || 0}</span>
              </div>
            </div>
          </div>
          <div className="pac-list-right">
            <div className="pac-list-progress">
              <div className="pac-progress-header">
                <span>Progress</span>
                <span style={{ color: progressColor }}>{project.progress}%</span>
              </div>
              <div className="pac-progress-bar">
                <div 
                  className="pac-progress-fill" 
                  style={{ 
                    width: `${project.progress}%`,
                    background: progressColor
                  }}
                ></div>
              </div>
            </div>
            <div className="pac-list-dates">
              <Calendar size={14} />
              <span>{project.startDate}</span>
              <span>→</span>
              <span>{project.endDate}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER: Permission View ──
  const renderPermissionView = () => {
    if (!milestones || milestones.length === 0) {
      return <div className="pac-empty-state"><FileText size={48} /><h4>No Tasks</h4></div>;
    }

    if (filteredMilestones.length === 0) {
      return (
        <div className="pac-empty-state" style={{ padding: '60px 20px' }}>
          <FileText size={48} />
          <h4>No Tasks or Milestones Found</h4>
          <p style={{ color: '#64748b', marginTop: '6px' }}>No results matching "{searchTerm}"</p>
          <button className="pac-btn-outline" onClick={() => setSearchTerm('')} style={{ marginTop: '14px' }}>
            Clear Search
          </button>
        </div>
      );
    }

    const getAvatarColor = (name) => {
      if (!name || name === 'Unassigned' || name === '—') return '#94a3b8';
      const colors = ['#2563eb', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f472b6', '#6366f1'];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    const getInitials = (name) => {
      if (!name || name === 'Unassigned' || name === '—') return '—';
      const cleanName = name.replace(/\([^)]*\)/g, '').trim();
      return cleanName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '—';
    };

    const renderTaskPerson = (name, type, taskId) => {
      const isUnassigned = !name || name === 'Unassigned' || name === '—';
      
      if (showEditPermissions) {
        const cellKey = `${taskId}_${type}`;

        // Search internal employees
        const matchedEmp = employees.find(e => {
          if (!name || isUnassigned) return false;
          const codeStr = e.empCode ? `(${e.empCode})` : `(${e.id})`;
          return name.includes(codeStr) || (e.empCode && name.includes(e.empCode)) || (e.name && name.includes(e.name));
        });

        // Search external employees
        const matchedExt = !matchedEmp ? externalEmployees.find(ext => {
          if (!name || isUnassigned) return false;
          const codeStr = ext.empCode ? `(${ext.empCode})` : `(${ext.rawId || ext.id})`;
          return name.includes(codeStr) || (ext.empCode && name.includes(ext.empCode)) || (ext.name && name.includes(ext.name));
        }) : null;

        // Active category: user override OR inferred from assigned employee (default to INTERNAL)
        const currentCategory = taskRoleCategories[cellKey] || (matchedExt ? 'EXTERNAL' : 'INTERNAL');

        const currentVal = currentCategory === 'INTERNAL'
          ? (matchedEmp ? String(matchedEmp.id) : '')
          : (matchedExt ? String(matchedExt.rawId || matchedExt.id) : '');

        const currentOptions = currentCategory === 'INTERNAL'
          ? employees.map(emp => ({
              value: String(emp.id),
              name: emp.name,
              code: emp.empCode || '',
              label: `${emp.name} ${emp.empCode ? `(${emp.empCode})` : ''}`,
              dept: emp.department
            }))
          : externalEmployees.map(ext => ({
              value: String(ext.rawId || ext.id),
              name: ext.name,
              code: ext.empCode || `EXT-${ext.rawId || ext.id}`,
              label: `${ext.name} (${ext.empCode || `EXT-${ext.rawId || ext.id}`})`,
              dept: ext.department || ext.designation
            }));

        return (
          <div className="pac-role-cell-edit">
            <div className="pac-role-type-radios">
              <label className={`pac-radio-label ${currentCategory === 'INTERNAL' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name={`role_cat_${cellKey}`}
                  value="INTERNAL"
                  checked={currentCategory === 'INTERNAL'}
                  onChange={() => setTaskRoleCategories(prev => ({ ...prev, [cellKey]: 'INTERNAL' }))}
                />
                <span>Internal</span>
              </label>
              <label className={`pac-radio-label ${currentCategory === 'EXTERNAL' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name={`role_cat_${cellKey}`}
                  value="EXTERNAL"
                  checked={currentCategory === 'EXTERNAL'}
                  onChange={() => setTaskRoleCategories(prev => ({ ...prev, [cellKey]: 'EXTERNAL' }))}
                />
                <span>External</span>
              </label>
            </div>
            <SearchableRoleSelect
              options={currentOptions}
              value={currentVal}
              placeholder="-- Unassigned --"
              onChange={(val) => {
                if (!val) {
                  handleAssignRole(taskId, type, null, currentCategory === 'EXTERNAL');
                } else {
                  handleAssignRole(taskId, type, Number(val), currentCategory === 'EXTERNAL');
                }
              }}
            />
          </div>
        );
      } else {
        if (isUnassigned) {
          return <span className="pac-person-unassigned">—</span>;
        }
        const color = getAvatarColor(name);
        const initials = getInitials(name);
        return (
          <div className="pac-person">
            <span className="pac-person-avatar" style={{ background: color }}>{initials}</span>
            <span className="pac-person-name">{name}</span>
          </div>
        );
      }
    };

    return (
      <div className="pac-permission-view">
        <div className="pac-permission-legend">
          <span className="pac-legend-item"><span className="pac-dot pac-dot-blue"></span> From Project</span>
          <span className="pac-legend-item"><span className="pac-dot pac-dot-green"></span> Added</span>
          <span className="pac-legend-item"><span className="pac-dot pac-dot-red"></span> Revoked</span>
          <span className="pac-legend-item"><span className="pac-dot pac-dot-empty"></span> No Access</span>
          <span className="pac-legend-item">
            <User size={14} className="pac-legend-icon" /> Executor
          </span>
          <span className="pac-legend-item">
            <UserCog size={14} className="pac-legend-icon" /> Reviewer
          </span>
          <span className="pac-legend-item">
            <UserApprover size={14} className="pac-legend-icon" /> Approver
          </span>
          {showEditPermissions && <span className="pac-edit-indicator"><AlertCircle size={14} /> Click to toggle</span>}
          {!showEditPermissions && <span className="pac-view-indicator"><Eye size={14} /> View mode</span>}
        </div>

        <div className="pac-table-wrapper">
          <table className="pac-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Task Code</th>
                <th style={{ width: '160px' }}>Task / Activity Name</th>
                <th style={{ width: showEditPermissions ? '180px' : '150px' }}>Executor</th>
                <th style={{ width: showEditPermissions ? '180px' : '150px' }}>Reviewer</th>
                <th style={{ width: showEditPermissions ? '180px' : '150px' }}>Approver</th>
                <th style={{ width: '90px' }}>Status</th>
                <th style={{ width: '50px', textAlign: 'center' }}>View</th>
                <th style={{ width: '50px', textAlign: 'center' }}>Create</th>
                <th style={{ width: '50px', textAlign: 'center' }}>Edit</th>
                <th style={{ width: '50px', textAlign: 'center' }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {filteredMilestones.map((milestone) => {
                const isExpanded = Boolean(searchTerm) || expandedMilestones.has(milestone.id);
                return (
                  <React.Fragment key={milestone.id}>
                    <tr className="pac-milestone-row" onClick={() => toggleMilestone(milestone.id)}>
                      <td colSpan="10">
                        <div className="pac-milestone-header">
                          <span className="pac-milestone-toggle">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </span>
                          <span className="pac-milestone-name">{milestone.name}</span>
                          <span className="pac-milestone-count">{milestone.tasks?.length || 0} tasks</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && milestone.tasks?.map((task) => {
                      return (
                        <tr key={task.id} className="pac-task-row">
                          <td><span className="pac-task-code">{task.taskCode || task.id}</span></td>
                          <td>{task.name}</td>
                          <td>{renderTaskPerson(task.assignee, 'assignee', task.id)}</td>
                          <td>{renderTaskPerson(task.reviewer, 'reviewer', task.id)}</td>
                          <td>{renderTaskPerson(task.approver, 'approver', task.id)}</td>
                          <td>{renderStatusBadge(task.status)}</td>
                          <td style={{ textAlign: 'center' }}>{renderTaskCheckbox(task.id, 'view')}</td>
                          <td style={{ textAlign: 'center' }}>{renderTaskCheckbox(task.id, 'create')}</td>
                          <td style={{ textAlign: 'center' }}>{renderTaskCheckbox(task.id, 'edit')}</td>
                          <td style={{ textAlign: 'center' }}>{renderTaskCheckbox(task.id, 'delete')}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── RENDER: Employee View ──
  const renderEmployeeView = () => {
    const projectEmployees = employees.filter(e => selectedEmployees?.map(id => String(id)).includes(String(e.id)));
    const displayEmployees = showEditPermissions ? employees : projectEmployees;

    const filteredDisplayEmployees = displayEmployees.filter(emp => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase().trim();
      return (
        emp.name?.toLowerCase().includes(s) ||
        String(emp.id)?.toLowerCase().includes(s) ||
        (emp.empCode && emp.empCode.toLowerCase().includes(s)) ||
        (emp.designation && emp.designation.toLowerCase().includes(s)) ||
        (emp.department && emp.department.toLowerCase().includes(s))
      );
    });

    if (!displayEmployees || displayEmployees.length === 0) {
      return <div className="pac-empty-state"><Users size={48} /><h4>No Employees</h4></div>;
    }

    return (
      <div className="pac-employee-view">
        <div className="pac-employee-view-header">
          <div className="pac-employee-header-left">
            <h3>👥 Team Members ({projectEmployees.length})</h3>
            {searchTerm && (
              <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '10px' }}>
                ({filteredDisplayEmployees.length} matching)
              </span>
            )}
          </div>
          <div className="pac-employee-header-right">
            {showEditPermissions && (
              <button 
                className="pac-btn-primary-sm pac-add-member-btn"
                onClick={() => setShowAddEmployeeModal(true)}
              >
                <UserPlus size={14} /> Add Member
              </button>
            )}
          </div>
        </div>

        {filteredDisplayEmployees.length === 0 ? (
          <div className="pac-empty-state" style={{ padding: '60px 20px' }}>
            <Users size={48} />
            <h4>No Team Members Found</h4>
            <p style={{ color: '#64748b', marginTop: '6px' }}>No employees matching "{searchTerm}"</p>
            <button className="pac-btn-outline" onClick={() => setSearchTerm('')} style={{ marginTop: '14px' }}>
              Clear Search
            </button>
          </div>
        ) : (
          <div className="pac-employee-grid">
            {filteredDisplayEmployees.map(emp => {
              const taskCount = getEmployeeTaskCount(emp.id);
              const isOnTeam = selectedEmployees?.map(id => String(id)).includes(String(emp.id));
              
              return (
                <div key={emp.id} className={`pac-employee-card-enhanced ${!isOnTeam ? 'not-on-team' : ''}`} style={{ opacity: isOnTeam ? 1 : 0.6 }}>
                  <div className="pac-emp-card-header">
                    <div className="pac-emp-avatar-wrapper">
                      <div className="pac-emp-avatar-enhanced" style={{ background: isOnTeam ? '#2563eb' : '#94a3b8' }}>
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      {isOnTeam && taskCount > 0 && (
                        <div className="pac-emp-task-indicator" title={`${taskCount} tasks assigned`}>
                          {taskCount}
                        </div>
                      )}
                    </div>
                    <div className="pac-emp-card-title">
                      <h4>{emp.name}</h4>
                      <span className="pac-emp-id">{emp.id}</span>
                    </div>
                    <div className="pac-emp-role-badge">
                      <span>{emp.designation}</span>
                    </div>
                  </div>
                  <div className="pac-emp-card-body">
                    <div className="pac-emp-dept">
                      <Building2 size={14} /> <span>{emp.department}</span>
                    </div>
                    {isOnTeam ? (
                      <div className="pac-emp-task-count">
                        <FileText size={14} />
                        <span>{taskCount} task(s) assigned</span>
                        {taskCount > 0 && (
                          <span className="pac-emp-task-warning">⚠️</span>
                        )}
                      </div>
                    ) : (
                      <div className="pac-emp-task-count">
                        <Minus size={14} />
                        <span>Not on project team</span>
                      </div>
                    )}
                  </div>
                  {showEditPermissions && (
                    <div className="pac-emp-card-footer">
                      {isOnTeam ? (
                        <button 
                          className={`pac-emp-remove-btn ${taskCount > 0 ? 'has-tasks' : ''}`}
                          onClick={() => handleRemoveEmployee(emp.id)}
                        >
                          <UserMinus size={14} /> 
                          Remove{taskCount > 0 ? ` (${taskCount} tasks)` : ''}
                        </button>
                      ) : (
                        <button 
                          className="pac-emp-add-btn"
                          onClick={() => handleAddEmployee(emp.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: '#10b981',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            width: '100%',
                            justifyContent: 'center'
                          }}
                        >
                          <UserPlus size={14} /> 
                          Add Employee
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── RENDER: Screen View ──
  const renderScreenView = () => {
    if (!accessGroups || accessGroups.length === 0) {
      return <div className="pac-empty-state"><Settings size={48} /><h4>No Screen Permissions</h4></div>;
    }

    const getPermissionCount = (group) => {
      let count = 0;
      group.screens.forEach(screen => {
        PERMISSION_TYPES.forEach(p => {
          if (screen[p] !== PERMISSION_STATES.EMPTY) count++;
        });
      });
      return count;
    };

    const toggleGroupPermission = (groupId, permissionType) => {
      if (!showEditPermissions) return;

      const newGroups = accessGroups.map(group => ({
        ...group,
        screens: group.screens.map(screen => ({ ...screen }))
      }));

      const groupIndex = newGroups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;

      const group = newGroups[groupIndex];
      const hasAny = group.screens.some(s => s[permissionType] !== PERMISSION_STATES.EMPTY);
      const targetState = hasAny ? PERMISSION_STATES.EMPTY : PERMISSION_STATES.GREEN;

      group.screens = group.screens.map(screen => {
        const updatedScreen = { ...screen, [permissionType]: targetState };
        
        const hasBlue = PERMISSION_TYPES.some(p => updatedScreen[p] === PERMISSION_STATES.BLUE);
        const hasGreen = PERMISSION_TYPES.some(p => updatedScreen[p] === PERMISSION_STATES.GREEN);
        const hasRed = PERMISSION_TYPES.some(p => updatedScreen[p] === PERMISSION_STATES.RED);
        
        if (hasBlue && (hasGreen || hasRed)) {
          updatedScreen.badge = 'orange';
          updatedScreen.badgeText = 'Mixed';
        } else if (hasBlue) {
          updatedScreen.badge = 'blue';
          updatedScreen.badgeText = 'From Project';
        } else if (hasGreen) {
          updatedScreen.badge = 'green';
          updatedScreen.badgeText = 'Added';
        } else if (hasRed) {
          updatedScreen.badge = 'red';
          updatedScreen.badgeText = 'Revoked';
        } else {
          updatedScreen.badge = 'orange';
          updatedScreen.badgeText = 'No Access';
        }
        
        return updatedScreen;
      });

      group[permissionType] = targetState;
      
      const groupHasBlue = group.screens.some(s => 
        PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.BLUE)
      );
      const groupHasGreen = group.screens.some(s => 
        PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.GREEN)
      );
      const groupHasRed = group.screens.some(s => 
        PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.RED)
      );
      
      if (groupHasBlue && (groupHasGreen || groupHasRed)) {
        group.badge = 'orange';
        group.badgeText = 'Mixed';
      } else if (groupHasBlue) {
        group.badge = 'blue';
        group.badgeText = 'From Project';
      } else if (groupHasGreen) {
        group.badge = 'green';
        group.badgeText = 'Added';
      } else if (groupHasRed) {
        group.badge = 'red';
        group.badgeText = 'Revoked';
      } else {
        group.badge = 'orange';
        group.badgeText = 'No Access';
      }

      setAccessGroups(newGroups);
    };

    const toggleScreenPermission = (groupId, screenId, permissionType) => {
      if (!showEditPermissions) return;

      const newGroups = accessGroups.map(group => ({
        ...group,
        screens: group.screens.map(screen => ({ ...screen }))
      }));

      const groupIndex = newGroups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;

      const screenIndex = newGroups[groupIndex].screens.findIndex(s => s.id === screenId);
      if (screenIndex === -1) return;

      const screen = newGroups[groupIndex].screens[screenIndex];
      const currentState = screen[permissionType];
      
      let newState;
      if (currentState === PERMISSION_STATES.EMPTY) newState = PERMISSION_STATES.GREEN;
      else if (currentState === PERMISSION_STATES.GREEN) newState = PERMISSION_STATES.EMPTY;
      else if (currentState === PERMISSION_STATES.BLUE) newState = PERMISSION_STATES.RED;
      else if (currentState === PERMISSION_STATES.RED) newState = PERMISSION_STATES.EMPTY;
      else newState = PERMISSION_STATES.EMPTY;

      screen[permissionType] = newState;

      const hasBlue = PERMISSION_TYPES.some(p => screen[p] === PERMISSION_STATES.BLUE);
      const hasGreen = PERMISSION_TYPES.some(p => screen[p] === PERMISSION_STATES.GREEN);
      const hasRed = PERMISSION_TYPES.some(p => screen[p] === PERMISSION_STATES.RED);
      
      if (hasBlue && (hasGreen || hasRed)) {
        screen.badge = 'orange';
        screen.badgeText = 'Mixed';
      } else if (hasBlue) {
        screen.badge = 'blue';
        screen.badgeText = 'From Project';
      } else if (hasGreen) {
        screen.badge = 'green';
        screen.badgeText = 'Added';
      } else if (hasRed) {
        screen.badge = 'red';
        screen.badgeText = 'Revoked';
      } else {
        screen.badge = 'orange';
        screen.badgeText = 'No Access';
      }

      const group = newGroups[groupIndex];
      group.view = group.screens.some(s => s.view !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
      group.create = group.screens.some(s => s.create !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
      group.edit = group.screens.some(s => s.edit !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
      group.delete = group.screens.some(s => s.delete !== PERMISSION_STATES.EMPTY) ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
      
      const groupHasBlue = group.screens.some(s => 
        PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.BLUE)
      );
      const groupHasGreen = group.screens.some(s => 
        PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.GREEN)
      );
      const groupHasRed = group.screens.some(s => 
        PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.RED)
      );
      
      if (groupHasBlue && (groupHasGreen || groupHasRed)) {
        group.badge = 'orange';
        group.badgeText = 'Mixed';
      } else if (groupHasBlue) {
        group.badge = 'blue';
        group.badgeText = 'From Project';
      } else if (groupHasGreen) {
        group.badge = 'green';
        group.badgeText = 'Added';
      } else if (groupHasRed) {
        group.badge = 'red';
        group.badgeText = 'Revoked';
      } else {
        group.badge = 'orange';
        group.badgeText = 'No Access';
      }

      setAccessGroups(newGroups);
    };

    const renderGroupCheckbox = (state, groupId, permissionType) => {
      const handleClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleGroupPermission(groupId, permissionType);
      };

      const color = getPermissionStateColor(state);

      return (
        <div 
          className={`pac-chk pac-chk-${color}`}
          onClick={handleClick}
          style={{ cursor: showEditPermissions ? 'pointer' : 'default' }}
          title={showEditPermissions ? 'Click to toggle all screens' : 'Read only'}
        >
          {state === PERMISSION_STATES.BLUE && <Check size={12} strokeWidth={3} />}
          {state === PERMISSION_STATES.GREEN && <Check size={12} strokeWidth={3} />}
          {state === PERMISSION_STATES.RED && <X size={12} strokeWidth={3} />}
        </div>
      );
    };

    const renderScreenCheckbox = (state, groupId, screenId, permissionType) => {
      const handleClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleScreenPermission(groupId, screenId, permissionType);
      };

      const color = getPermissionStateColor(state);

      return (
        <div 
          className={`pac-chk pac-chk-${color}`}
          onClick={handleClick}
          style={{ cursor: showEditPermissions ? 'pointer' : 'default' }}
          title={showEditPermissions ? 'Click to toggle' : 'Read only'}
        >
          {state === PERMISSION_STATES.BLUE && <Check size={12} strokeWidth={3} />}
          {state === PERMISSION_STATES.GREEN && <Check size={12} strokeWidth={3} />}
          {state === PERMISSION_STATES.RED && <X size={12} strokeWidth={3} />}
        </div>
      );
    };

    const filteredScreens = (() => {
      if (!searchTerm) return accessGroups;
      const search = searchTerm.toLowerCase().trim();
      return accessGroups.map(group => {
        const groupMatches = group.name?.toLowerCase().includes(search) || group.id?.toLowerCase().includes(search);
        const matchingScreens = (group.screens || []).filter(screen =>
          groupMatches ||
          screen.name?.toLowerCase().includes(search) ||
          screen.id?.toLowerCase().includes(search) ||
          (screen.code && screen.code.toLowerCase().includes(search)) ||
          (screen.screenCode && screen.screenCode.toLowerCase().includes(search))
        );
        if (groupMatches || matchingScreens.length > 0) {
          return {
            ...group,
            screens: matchingScreens
          };
        }
        return null;
      }).filter(Boolean);
    })();

    return (
      <div className="pac-screen-view">
        <div className="pac-screen-view-header">
          <h3>🖥️ Screen Access Permissions</h3>
          <span className="pac-screen-count">{SCREEN_GROUPS.length} Groups</span>
        </div>

        <div className="pac-permission-legend">
          <span className="pac-legend-item">
            <span className="pac-dot pac-dot-blue"></span> From Project
          </span>
          <span className="pac-legend-item">
            <span className="pac-dot pac-dot-green"></span> Added
          </span>
          <span className="pac-legend-item">
            <span className="pac-dot pac-dot-red"></span> Revoked
          </span>
          <span className="pac-legend-item">
            <span className="pac-dot pac-dot-empty"></span> No Access
          </span>
          {showEditPermissions && (
            <span className="pac-edit-indicator">
              <AlertCircle size={14} /> Click on checkboxes to toggle
            </span>
          )}
        </div>

        {filteredScreens.length === 0 ? (
          <div className="pac-empty-state" style={{ padding: '60px 20px' }}>
            <Settings size={48} />
            <h4>No Screen Permissions Found</h4>
            <p style={{ color: '#64748b', marginTop: '6px' }}>No screen permissions matching "{searchTerm}"</p>
            <button className="pac-btn-outline" onClick={() => setSearchTerm('')} style={{ marginTop: '14px' }}>
              Clear Search
            </button>
          </div>
        ) : (
          <div className="pac-table-container">
            <table className="pac-table">
              <thead>
                <tr>
                  <th width="32%">Group / Screen</th>
                  <th width="10%" style={{ textAlign: 'center' }}>Screens</th>
                  <th width="10%" style={{ textAlign: 'center' }}>View</th>
                  <th width="10%" style={{ textAlign: 'center' }}>Create</th>
                  <th width="10%" style={{ textAlign: 'center' }}>Edit</th>
                  <th width="10%" style={{ textAlign: 'center' }}>Delete</th>
                  <th width="18%" style={{ textAlign: 'center' }}>Access Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredScreens.map((group) => {
                  const isExpanded = Boolean(searchTerm) || Boolean(expandedGroups[group.id]);
                  const permissionCount = getPermissionCount(group);
                
                return (
                  <React.Fragment key={group.id}>
                    <tr 
                      className="pac-group-row"
                      onClick={() => toggleGroup(group.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="pac-group-name" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <group.icon size={16} className="pac-group-icon" />
                            <span>{group.name}</span>
                            <span className="pac-group-count" style={{ marginLeft: '4px' }}>({group.screens.length} screens)</span>
                          </div>
                          <div className="pac-screen-users-avatars" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                            {getGroupUsers(group.id, group.screens).map(u => (
                              <div
                                key={u.id}
                                title={`${u.name} has access`}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  overflow: 'hidden',
                                  border: '2px solid white',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                              >
                                {u.photoUrl ? (
                                  <img
                                    src={u.photoUrl}
                                    alt={u.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                                  />
                                ) : null}
                                <div style={{
                                  display: u.photoUrl ? 'none' : 'flex',
                                  width: '100%',
                                  height: '100%',
                                  background: u.avatarColor,
                                  color: 'white',
                                  fontSize: '9px',
                                  fontWeight: 'bold',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {u.initials}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{group.screens.length}</td>
                      <td style={{ textAlign: 'center' }}>
                        {renderGroupCheckbox(group.view, group.id, 'view')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderGroupCheckbox(group.create, group.id, 'create')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderGroupCheckbox(group.edit, group.id, 'edit')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderGroupCheckbox(group.delete, group.id, 'delete')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`pac-badge pac-badge-${group.badge || 'orange'}`}>
                          {permissionCount > 0 ? `${permissionCount} perms` : group.badgeText || 'No Access'}
                        </span>
                      </td>
                    </tr>

                    {isExpanded && group.screens.map((screen) => (
                      <tr key={screen.id} className="pac-screen-row">
                        <td className="pac-screen-name">
                          <div className="pac-screen-indent" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <FileText size={14} className="pac-screen-icon" />
                              <span>{screen.name}</span>
                            </div>
                            <div className="pac-screen-users-avatars" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                              {getScreenUsers(screen.id, screen.name).map(u => (
                                <div
                                  key={u.id}
                                  title={`${u.name} has access`}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '2px solid white',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                  }}
                                >
                                  {u.photoUrl ? (
                                    <img
                                      src={u.photoUrl}
                                      alt={u.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                                    />
                                  ) : null}
                                  <div style={{
                                    display: u.photoUrl ? 'none' : 'flex',
                                    width: '100%',
                                    height: '100%',
                                    background: u.avatarColor,
                                    color: 'white',
                                    fontSize: '8px',
                                    fontWeight: 'bold',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {u.initials}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td></td>
                        <td style={{ textAlign: 'center' }}>
                          {renderScreenCheckbox(screen.view, group.id, screen.id, 'view')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderScreenCheckbox(screen.create, group.id, screen.id, 'create')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderScreenCheckbox(screen.edit, group.id, screen.id, 'edit')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderScreenCheckbox(screen.delete, group.id, screen.id, 'delete')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`pac-badge pac-badge-${screen.badge || 'orange'}`}>
                            {screen.badgeText || 'No Access'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    );
  };

  const renderAddEmployeeModal = () => {
    if (!showAddEmployeeModal) return null;

    return (
      <div className="pac-popup-overlay" onClick={() => { setShowAddEmployeeModal(false); setEmployeeSearchTerm(''); }}>
        <div className="pac-popup-container" onClick={(e) => e.stopPropagation()}>
          <div className="pac-popup-window">
            <div className="pac-popup-header">
              <div className="pac-popup-header-left">
                <div className="pac-popup-icon-box">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 className="pac-popup-title">Add Employee</h3>
                  <p className="pac-popup-subtitle">
                    Select an employee to add to <strong>{selectedProject?.name}</strong>
                  </p>
                </div>
              </div>
              <button 
                className="pac-popup-close"
                onClick={() => { setShowAddEmployeeModal(false); setEmployeeSearchTerm(''); }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="pac-popup-body">
              <div className="pac-popup-search">
                <div className="pac-popup-search-box">
                  <Search size={18} className="pac-popup-search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search by name, ID, or department..." 
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    className="pac-popup-search-input"
                    autoFocus
                  />
                  {employeeSearchTerm && (
                    <button 
                      className="pac-popup-search-clear"
                      onClick={() => setEmployeeSearchTerm('')}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="pac-popup-stats">
                  <span className="pac-popup-stat">
                    <Users size={14} />
                    {filteredAvailableEmployees.length} Available
                  </span>
                  <span className="pac-popup-stat pac-popup-stat-assigned">
                    <UserCheck size={14} />
                    {selectedEmployees.length} Assigned
                  </span>
                </div>
              </div>

              <div className="pac-popup-list-wrapper">
                {filteredAvailableEmployees.length === 0 ? (
                  <div className="pac-popup-empty">
                    <div className="pac-popup-empty-icon">{employeeSearchTerm ? '🔍' : '👥'}</div>
                    <h4>{employeeSearchTerm ? 'No Employees Found' : 'All Employees Assigned'}</h4>
                    <p>{employeeSearchTerm ? `No available employees match "${employeeSearchTerm}"` : 'All available employees are already assigned to this project.'}</p>
                    {employeeSearchTerm && (
                      <button className="pac-btn-outline" onClick={() => setEmployeeSearchTerm('')} style={{ marginTop: '12px' }}>
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pac-popup-list">
                    {filteredAvailableEmployees.map((emp) => {
                      const isSelected = selectedEmployees.includes(emp.id);
                      const avatarColor = getAvatarColor(emp.name);
                      const initials = getInitials(emp.name);

                      return (
                        <div 
                          key={emp.id} 
                          className={`pac-popup-item ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="pac-popup-item-avatar" style={{ background: avatarColor }}>
                            {initials}
                          </div>
                          <div className="pac-popup-item-info">
                            <div className="pac-popup-item-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{emp.name}</span>
                              {emp.isExternal && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  background: '#f3e8ff',
                                  color: '#7c3aed',
                                  borderRadius: '4px',
                                  fontWeight: '600'
                                }}>
                                  External
                                </span>
                              )}
                            </div>
                            <div className="pac-popup-item-details">
                              <span className="pac-popup-item-id">{emp.empCode || emp.id}</span>
                              <span className="pac-popup-item-role">{emp.designation}</span>
                              <span className="pac-popup-item-dept">{emp.department}</span>
                            </div>
                          </div>
                          {isSelected ? (
                            <span className="pac-popup-item-badge added">
                              <UserCheck size={14} /> Added
                            </span>
                          ) : (
                            <button 
                              className="pac-popup-item-add"
                              onClick={(e) => { e.stopPropagation(); handleAddEmployee(emp.id); }}
                            >
                              <Plus size={16} /> Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="pac-popup-footer">
              <span className="pac-popup-footer-info">
                {filteredAvailableEmployees.length} employee(s) available
              </span>
              <button 
                className="pac-popup-footer-cancel"
                onClick={() => { setShowAddEmployeeModal(false); setEmployeeSearchTerm(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER: Project Detail ──
  const renderProjectDetailView = () => {
    if (!selectedProject) return null;

    return (
      <div className="pac-project-detail-view">
        <div className="pac-detail-header">
          <button className="pac-btn-outline-sm" onClick={closeProjectDetail}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="pac-detail-title">
            <h2>{selectedProject.name}</h2>
            <span className="pac-project-code">{selectedProject.code}</span>
            <span className={`pac-status-badge pac-status-${getProjectStatusColor(selectedProject.status)}`}>
              {getProjectStatusIcon(selectedProject.status)} {getProjectStatusLabel(selectedProject.status)}
            </span>
          </div>
          <div className="pac-detail-actions">
            <button 
              className={`pac-btn-${showEditPermissions ? 'success' : 'primary'}`}
              onClick={() => setShowEditPermissions(!showEditPermissions)}
            >
              {showEditPermissions ? <Check size={16} /> : <Pencil size={16} />}
              {showEditPermissions ? ' Done' : ' Edit Permissions'}
            </button>
            {showEditPermissions && (
              <button 
                className="pac-btn-primary" 
                onClick={handleSaveChanges}
              >
                <Save size={16} /> Save Changes
              </button>
            )}
          </div>
        </div>

        <div className="pac-detail-info">
          <div className="pac-detail-info-grid">
            <div className="pac-detail-info-item"><label>Department</label><p><Building2 size={14} /> {selectedProject.department}</p></div>
            <div className="pac-detail-info-item"><label>Dates</label><p>{selectedProject.startDate} → {selectedProject.endDate}</p></div>
            <div className="pac-detail-info-item">
              <label>Progress</label>
              <div className="pac-detail-progress">
                <div className="pac-progress-bar" style={{ width: '200px' }}>
                  <div 
                    className="pac-progress-fill" 
                    style={{ 
                      width: `${selectedProject.progress}%`,
                      background: selectedProject.status === 'completed' ? '#10b981' :
                                 selectedProject.status === 'upcoming' ? '#94a3b8' :
                                 selectedProject.status === 'on-hold' ? '#ef4444' :
                                 '#2563eb'
                    }}
                  ></div>
                </div>
                <span style={{ fontWeight: '600' }}>{selectedProject.progress}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pac-view-toggle-container">
          <div className="pac-view-toggle">
            <button className={`pac-toggle-btn ${viewMode === 'permission' ? 'active' : ''}`}
              onClick={() => setViewMode('permission')}><Shield size={14} /> Permission</button>
            <button className={`pac-toggle-btn ${viewMode === 'employee' ? 'active' : ''}`}
              onClick={() => setViewMode('employee')}><Users size={14} /> Employee</button>
            <button className={`pac-toggle-btn ${viewMode === 'screen' ? 'active' : ''}`}
              onClick={() => setViewMode('screen')}><Settings size={14} /> Screen</button>
          </div>
          <div className="pac-search-bar" style={{ width: '280px' }}>
            <Search size={16} />
            <input 
              type="text" 
              placeholder={
                viewMode === 'permission' ? "Search tasks, assignees..." :
                viewMode === 'employee' ? "Search team members..." :
                "Search screens, groups..."
              } 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button 
                className="pac-search-clear"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="pac-detail-content">
          {viewMode === 'permission' && renderPermissionView()}
          {viewMode === 'employee' && renderEmployeeView()}
          {viewMode === 'screen' && renderScreenView()}
        </div>
      </div>
    );
  };

  // ── MAIN RENDER ──
  return (
    <div className="cc-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />
      <div className="cc-shell">
        <Header 
          title="Project Access Control" 
          subtitle="Manage access permissions for projects"
          onLogout={onLogout}
          userRole={userRole}
        />
        <main className="cc-main">
          <div className="pac-container">
            {currentView === 'projects' ? renderProjectsView() : renderProjectDetailView()}
          </div>
        </main>
      </div>

      {/* Add Employee Modal */}
      {renderAddEmployeeModal()}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={closeAlert}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </div>
  );
};

export default ProjectAccess;
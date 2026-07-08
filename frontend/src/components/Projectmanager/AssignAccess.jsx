// src/pages/AssignAccess.jsx
import React, { useState, useEffect } from 'react';
import {
  Search, Check, Folder, Shield, ArrowRight, 
  Save, RotateCcw, Plus, X, Eye, Info, ChevronDown, ChevronRight, 
  FileText, Minus, Users, User, Building2, Settings, 
  CheckCircle2, ChevronLeft, Copy, Bookmark, UserPlus, UserMinus,
  Edit, AlertCircle, BarChart2, Trash2, Pencil, Copy as CopyIcon,
  Users as UsersIcon, FileText as FileTextIcon, ArrowLeft
} from 'lucide-react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import AlertModal from '../AlertModal';
import '../../styles/AssignAcess.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token || ""}`
  };
};

// Screen definitions with their permission keys
const SCREEN_GROUPS = [];

const PERMISSION_TYPES = ['view', 'create', 'edit', 'delete'];

// Permission state types
const PERMISSION_STATES = {
  EMPTY: 'empty',      // No Access
  BLUE: 'blue',        // From Template
  GREEN: 'green',      // Extra Added
  RED: 'red'           // Revoked
};

const AssignAccess = ({ userRole, onLogout }) => {
  // ── State ──
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [accessGroups, setAccessGroups] = useState([]);
  const [dbScreenGroups, setDbScreenGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermStep2, setSearchTermStep2] = useState('');
  const [searchTermStep3, setSearchTermStep3] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // ── New States for Mode Selection ──
  const [pageMode, setPageMode] = useState('direct'); // 'direct' or 'template'
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [updateOrSaveModal, setUpdateOrSaveModal] = useState(false);
  const [templateUpdateChoice, setTemplateUpdateChoice] = useState(null);

  // ── Template Edit Flow States ──
  const [isTemplateEditMode, setIsTemplateEditMode] = useState(false);
  const [templateEditStep, setTemplateEditStep] = useState(1);
  const [templateEditGroups, setTemplateEditGroups] = useState([]);
  const [templateEditExpandedGroups, setTemplateEditExpandedGroups] = useState({});
  const [templateEditSearchTerm, setTemplateEditSearchTerm] = useState('');
  const [templateEditTemplateName, setTemplateEditTemplateName] = useState('');
  const [templateEditTemplateDescription, setTemplateEditTemplateDescription] = useState('');
  const [templateEditIsDraft, setTemplateEditIsDraft] = useState(false);
  const [templateEditOriginalTemplate, setTemplateEditOriginalTemplate] = useState(null);

  // ── NEW: Create Template Flow States ──
  const [isCreateTemplateMode, setIsCreateTemplateMode] = useState(false);
  const [createTemplateStep, setCreateTemplateStep] = useState(1);
  const [createTemplateGroups, setCreateTemplateGroups] = useState([]);
  const [createTemplateExpandedGroups, setCreateTemplateExpandedGroups] = useState({});
  const [createTemplateSearchTerm, setCreateTemplateSearchTerm] = useState('');
  const [createTemplateName, setCreateTemplateName] = useState('');
  const [createTemplateDescription, setCreateTemplateDescription] = useState('');
  const [createTemplateIsDraft, setCreateTemplateIsDraft] = useState(false);

  // ── Alert System ──
  const triggerAlert = (type, title, message) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const getLoggedInUserName = () => {
    return sessionStorage.getItem("userName") || localStorage.getItem("userName") || "Admin User";
  };

  // ── Fetch Data ──
  // ── Fetch Data ──
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchEmployees();
      const groupsList = await fetchDbScreensAndGroups();
      await fetchTemplates();
      if (groupsList && groupsList.length > 0) {
        initializeAccessGroups(groupsList);
      }
      setLoading(false);
    };
    init();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/employees`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        const sortedData = data.sort((a, b) => {
          const codeA = a.empCode || a.employeeCode || a.id || '';
          const codeB = b.empCode || b.employeeCode || b.id || '';
          return String(codeA).localeCompare(String(codeB));
        });
        setEmployees(sortedData);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      triggerAlert('error', 'Error', 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDbScreensAndGroups = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/rbac/screens`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const screens = await response.json();
        
        const groupIcons = {
          'Company Master': Building2,
          'Project': Folder,
          'User': Users,
          'Access Control': Settings,
          'Individual Screens': User
        };

        const groupsMap = {};
        screens.forEach(screen => {
          const groupName = screen.groupNm;
          if (!groupsMap[groupName]) {
            groupsMap[groupName] = {
              id: groupName,
              name: groupName,
              icon: groupIcons[groupName] || Shield,
              screens: []
            };
          }
          groupsMap[groupName].screens.push({
            id: screen.screenId,
            name: screen.screenNm,
            code: screen.screenCode
          });
        });
        
        const groupsList = Object.values(groupsMap);
        setDbScreenGroups(groupsList);
        return groupsList;
      }
    } catch (err) {
      console.error('Error fetching screens:', err);
    }
    return [];
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/rbac/roles`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map(r => ({
          id: r.roleId,
          code: `ROLE-${String(r.roleId).padStart(3, '0')}`,
          name: r.roleNm,
          description: `Database Template: ${r.roleNm}`,
          isDraft: false,
          permissionsCount: r.permissionsCount || 0
        }));
        setTemplates(mapped);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  // ── Initialize Access Groups ──
  const initializeAccessGroups = (groupsList = dbScreenGroups) => {
    const groups = groupsList.map(group => {
      const screens = group.screens.map(screen => ({
        ...screen,
        view: PERMISSION_STATES.EMPTY,
        create: PERMISSION_STATES.EMPTY,
        edit: PERMISSION_STATES.EMPTY,
        delete: PERMISSION_STATES.EMPTY,
        badge: 'orange',
        badgeText: 'No Access'
      }));

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
    setAccessGroups(groups);
    setExpandedGroups({ [groups[0]?.id]: true });
  };

  // ── Initialize Empty Create Template Groups ──
  const initializeCreateTemplateGroups = (groupsList = dbScreenGroups) => {
    const groups = groupsList.map(group => {
      const screens = group.screens.map(screen => ({
        ...screen,
        view: PERMISSION_STATES.EMPTY,
        create: PERMISSION_STATES.EMPTY,
        edit: PERMISSION_STATES.EMPTY,
        delete: PERMISSION_STATES.EMPTY,
        badge: 'orange',
        badgeText: 'No Access'
      }));

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
    setCreateTemplateGroups(groups);
    setCreateTemplateExpandedGroups({ [groups[0]?.id]: true });
  };

  // ── Stepper Steps ──
  const steps = [
    { num: 1, title: 'Select Employees', desc: 'Choose employees to assign access' },
    { num: 2, title: 'Select Template', desc: 'Apply template (Optional)' },
    { num: 3, title: 'Manage Access', desc: 'Add or revoke permissions' },
    { num: 4, title: 'Summary', desc: 'Review and save permissions' }
  ];

  // ── Template Edit Stepper Steps ──
  const templateEditSteps = [
    { num: 1, title: 'Manage Access', desc: 'Edit template permissions' },
    { num: 2, title: 'Summary', desc: 'Review and save template' }
  ];

  // ── Create Template Stepper Steps ──
  const createTemplateSteps = [
    { num: 1, title: 'Manage Access', desc: 'Add permissions to template' },
    { num: 2, title: 'Summary', desc: 'Review and save template' }
  ];

  // ── Navigation ──
  const handleNext = async () => {
    if (currentStep < 4) {
      if (currentStep === 1) {
        if (selectedEmployees.length === 0) {
          triggerAlert('warning', 'Selection Required', 'Please select at least one employee.');
          return;
        }
        
        if (selectedEmployees.length === 1) {
          setLoading(true);
          try {
            const empId = selectedEmployees[0];
            const hasRbacRes = await fetch(`${apiBaseUrl}/api/rbac/employees/${empId}/has-rbac`, {
              headers: getAuthHeaders()
            });
            let hasRbac = false;
            if (hasRbacRes.ok) {
              const rbacData = await hasRbacRes.json();
              hasRbac = rbacData.hasRbac;
            }

            if (hasRbac) {
              const response = await fetch(`${apiBaseUrl}/api/rbac/employees/${empId}/permissions`, {
                headers: getAuthHeaders()
              });
              if (response.ok) {
                const permsList = await response.json();
                
                const updatedGroups = accessGroups.map(group => {
                  let groupHasView = false;
                  let groupHasCreate = false;
                  let groupHasEdit = false;
                  let groupHasDelete = false;

                  const updatedScreens = group.screens.map(screen => {
                    const perms = permsList.find(p => p.screenId === screen.id);
                    if (perms) {
                      const view = perms.viewFlg ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
                      const create = perms.addFlg ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
                      const edit = perms.editFlg ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
                      const delete_ = perms.deleteFlg ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
                      
                      if (view === PERMISSION_STATES.BLUE) groupHasView = true;
                      if (create === PERMISSION_STATES.BLUE) groupHasCreate = true;
                      if (edit === PERMISSION_STATES.BLUE) groupHasEdit = true;
                      if (delete_ === PERMISSION_STATES.BLUE) groupHasDelete = true;

                      const hasBlue = view === PERMISSION_STATES.BLUE || create === PERMISSION_STATES.BLUE || 
                                      edit === PERMISSION_STATES.BLUE || delete_ === PERMISSION_STATES.BLUE;
                      const hasEmpty = view === PERMISSION_STATES.EMPTY || create === PERMISSION_STATES.EMPTY || 
                                      edit === PERMISSION_STATES.EMPTY || delete_ === PERMISSION_STATES.EMPTY;
                      
                      let badge = 'orange';
                      let badgeText = 'No Access';
                      
                      if (hasBlue && hasEmpty) {
                        badge = 'orange';
                        badgeText = 'Mixed';
                      } else if (hasBlue) {
                        badge = 'blue';
                        badgeText = 'From Template';
                      }
                      
                      return {
                        ...screen,
                        view,
                        create,
                        edit,
                        delete: delete_,
                        badge,
                        badgeText
                      };
                    }
                    return screen;
                  });

                  const groupHasBlue = updatedScreens.some(s => 
                    PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.BLUE)
                  );
                  const groupHasEmpty = updatedScreens.some(s => 
                    PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.EMPTY)
                  );
                  
                  let groupBadge = 'orange';
                  let groupBadgeText = 'No Access';
                  
                  if (groupHasBlue && groupHasEmpty) {
                    groupBadge = 'orange';
                    groupBadgeText = 'Mixed';
                  } else if (groupHasBlue) {
                    groupBadge = 'blue';
                    groupBadgeText = 'From Template';
                  }

                  return {
                    ...group,
                    screens: updatedScreens,
                    view: groupHasView ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
                    create: groupHasCreate ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
                    edit: groupHasEdit ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
                    delete: groupHasDelete ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
                    badge: groupBadge,
                    badgeText: groupBadgeText
                  };
                });

                setAccessGroups(updatedGroups);
              }
            } else {
              initializeAccessGroups();
            }
          } catch (err) {
            console.error('Error fetching employee permissions on next:', err);
          } finally {
            setLoading(false);
          }
        }
      }
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Template Edit Navigation ──
  const handleTemplateEditNext = () => {
    if (templateEditStep < 2) {
      setTemplateEditStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTemplateEditPrev = () => {
    if (templateEditStep > 1) {
      setTemplateEditStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Create Template Navigation ──
  const handleCreateTemplateNext = () => {
    if (createTemplateStep < 2) {
      setCreateTemplateStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreateTemplatePrev = () => {
    if (createTemplateStep > 1) {
      setCreateTemplateStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Employee Selection ──
  const toggleEmployee = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) 
        ? prev.filter(id => id !== empId) 
        : [...prev, empId]
    );
  };

  const handleEmployeeCheckbox = (e, empId) => {
    e.stopPropagation();
    toggleEmployee(empId);
  };

  const toggleAllEmployees = () => {
    const filteredIds = filteredEmployees.map(emp => emp.empId || emp.id);
    const allFilteredSelected = filteredIds.every(id => selectedEmployees.includes(id));
    
    if (allFilteredSelected) {
      setSelectedEmployees(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedEmployees(prev => {
        const newSelection = [...prev];
        filteredIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  // ── Template Selection ──
  const applyTemplate = async (template) => {
    if (!template) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/rbac/roles/${template.id}/permissions`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const permsList = await response.json();
        
        const permissions = {};
        permsList.forEach(p => {
          permissions[p.screenId] = {
            view: p.viewFlg,
            create: p.addFlg,
            edit: p.editFlg,
            delete: p.deleteFlg
          };
        });

        const templateWithPerms = { ...template, permissions };
        setSelectedTemplate(templateWithPerms);
        setTemplateName(template.name);
        setTemplateDescription(template.description || '');

        const updatedGroups = accessGroups.map(group => {
          let groupHasView = false;
          let groupHasCreate = false;
          let groupHasEdit = false;
          let groupHasDelete = false;

          const updatedScreens = group.screens.map(screen => {
            const perms = permissions[screen.id];
            if (perms) {
              const view = perms.view ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
              const create = perms.create ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
              const edit = perms.edit ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
              const delete_ = perms.delete ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
              
              if (view === PERMISSION_STATES.BLUE) groupHasView = true;
              if (create === PERMISSION_STATES.BLUE) groupHasCreate = true;
              if (edit === PERMISSION_STATES.BLUE) groupHasEdit = true;
              if (delete_ === PERMISSION_STATES.BLUE) groupHasDelete = true;

              const hasBlue = view === PERMISSION_STATES.BLUE || create === PERMISSION_STATES.BLUE || 
                              edit === PERMISSION_STATES.BLUE || delete_ === PERMISSION_STATES.BLUE;
              const hasEmpty = view === PERMISSION_STATES.EMPTY || create === PERMISSION_STATES.EMPTY || 
                              edit === PERMISSION_STATES.EMPTY || delete_ === PERMISSION_STATES.EMPTY;
              
              let badge = 'orange';
              let badgeText = 'No Access';
              
              if (hasBlue && hasEmpty) {
                badge = 'orange';
                badgeText = 'Mixed';
              } else if (hasBlue) {
                badge = 'blue';
                badgeText = 'From Template';
              } else {
                badge = 'orange';
                badgeText = 'No Access';
              }
              
              return {
                ...screen,
                view,
                create,
                edit,
                delete: delete_,
                badge,
                badgeText
              };
            }
            return screen;
          });

          const groupHasBlue = updatedScreens.some(s => 
            PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.BLUE)
          );
          const groupHasEmpty = updatedScreens.some(s => 
            PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.EMPTY)
          );
          
          let groupBadge = 'orange';
          let groupBadgeText = 'No Access';
          
          if (groupHasBlue && groupHasEmpty) {
            groupBadge = 'orange';
            groupBadgeText = 'Mixed';
          } else if (groupHasBlue) {
            groupBadge = 'blue';
            groupBadgeText = 'From Template';
          }

          return {
            ...group,
            screens: updatedScreens,
            view: groupHasView ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
            create: groupHasCreate ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
            edit: groupHasEdit ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
            delete: groupHasDelete ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
            badge: groupBadge,
            badgeText: groupBadgeText
          };
        });
        
        setAccessGroups(updatedGroups);
        triggerAlert('success', 'Template Applied', `"${template.name}" has been applied successfully.`);
      } else {
        triggerAlert('error', 'Error', 'Failed to fetch permissions for the selected template.');
      }
    } catch (err) {
      console.error('Error fetching template permissions:', err);
      triggerAlert('error', 'Error', 'Failed to fetch template permissions.');
    } finally {
      setLoading(false);
    }
  };

  // ── Deselect Template ──
  const deselectTemplate = () => {
    setSelectedTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    initializeAccessGroups();
    triggerAlert('info', 'Template Removed', 'Template has been deselected. All permissions reset to No Access.');
  };

  // ── Permission Toggle Function ──
  const togglePermission = (groupId, screenId, permissionType, isEditMode = false, isCreateMode = false) => {
    let groups, setGroups;
    
    if (isCreateMode) {
      groups = createTemplateGroups;
      setGroups = setCreateTemplateGroups;
    } else if (isEditMode) {
      groups = templateEditGroups;
      setGroups = setTemplateEditGroups;
    } else {
      groups = accessGroups;
      setGroups = setAccessGroups;
    }

    const newGroups = groups.map(group => ({
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

    // ── Permission Toggle Logic ──
    if (currentState === PERMISSION_STATES.EMPTY) {
      // In create mode, always mark as GREEN (Added)
      if (isCreateMode) {
        newState = PERMISSION_STATES.GREEN;
      } else if (selectedTemplate && selectedTemplate.permissions && selectedTemplate.permissions[screenId]) {
        const templatePerm = selectedTemplate.permissions[screenId];
        const hasPermission = templatePerm[permissionType] === true;
        if (hasPermission) {
          newState = PERMISSION_STATES.BLUE;
        } else {
          newState = PERMISSION_STATES.GREEN;
        }
      } else {
        newState = PERMISSION_STATES.GREEN;
      }
    } else if (currentState === PERMISSION_STATES.GREEN) {
      newState = PERMISSION_STATES.EMPTY;
    } else if (currentState === PERMISSION_STATES.BLUE) {
      newState = PERMISSION_STATES.RED;
    } else if (currentState === PERMISSION_STATES.RED) {
      if (selectedTemplate && selectedTemplate.permissions && selectedTemplate.permissions[screenId]) {
        const templatePerm = selectedTemplate.permissions[screenId];
        const hasPermission = templatePerm[permissionType] === true;
        if (hasPermission) {
          newState = PERMISSION_STATES.BLUE;
        } else {
          newState = PERMISSION_STATES.EMPTY;
        }
      } else {
        newState = PERMISSION_STATES.EMPTY;
      }
    } else {
      newState = PERMISSION_STATES.EMPTY;
    }

    screen[permissionType] = newState;

    const hasBlue = PERMISSION_TYPES.some(p => screen[p] === PERMISSION_STATES.BLUE);
    const hasGreen = PERMISSION_TYPES.some(p => screen[p] === PERMISSION_STATES.GREEN);
    const hasRed = PERMISSION_TYPES.some(p => screen[p] === PERMISSION_STATES.RED);
    
    if (hasBlue && (hasGreen || hasRed)) {
      screen.badge = 'orange';
      screen.badgeText = 'Mixed';
    } else if (hasBlue) {
      screen.badge = 'blue';
      screen.badgeText = 'From Template';
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

    setGroups(newGroups);
  };

  // ── Group Level Permission Toggle ──
  const toggleGroupPermission = (groupId, permissionType, isEditMode = false, isCreateMode = false) => {
    let groups, setGroups;
    
    if (isCreateMode) {
      groups = createTemplateGroups;
      setGroups = setCreateTemplateGroups;
    } else if (isEditMode) {
      groups = templateEditGroups;
      setGroups = setTemplateEditGroups;
    } else {
      groups = accessGroups;
      setGroups = setAccessGroups;
    }

    const newGroups = groups.map(group => ({
      ...group,
      screens: group.screens.map(screen => ({ ...screen }))
    }));

    const groupIndex = newGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;

    const group = newGroups[groupIndex];
    
    const hasAny = group.screens.some(s => s[permissionType] !== PERMISSION_STATES.EMPTY);
    
    let targetState;
    if (hasAny) {
      targetState = PERMISSION_STATES.EMPTY;
    } else {
      // In create mode, always mark as GREEN
      if (isCreateMode) {
        targetState = PERMISSION_STATES.GREEN;
      } else if (selectedTemplate && selectedTemplate.permissions) {
        const hasTemplatePerm = group.screens.some(screen => {
          const perms = selectedTemplate.permissions[screen.id];
          return perms && perms[permissionType] === true;
        });
        targetState = hasTemplatePerm ? PERMISSION_STATES.BLUE : PERMISSION_STATES.GREEN;
      } else {
        targetState = PERMISSION_STATES.GREEN;
      }
    }

    group.screens = group.screens.map(screen => {
      const updatedScreen = {
        ...screen,
        [permissionType]: targetState
      };
      
      const hasBlue = PERMISSION_TYPES.some(p => updatedScreen[p] === PERMISSION_STATES.BLUE);
      const hasGreen = PERMISSION_TYPES.some(p => updatedScreen[p] === PERMISSION_STATES.GREEN);
      const hasRed = PERMISSION_TYPES.some(p => updatedScreen[p] === PERMISSION_STATES.RED);
      
      if (hasBlue && (hasGreen || hasRed)) {
        updatedScreen.badge = 'orange';
        updatedScreen.badgeText = 'Mixed';
      } else if (hasBlue) {
        updatedScreen.badge = 'blue';
        updatedScreen.badgeText = 'From Template';
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

    setGroups(newGroups);
  };

  // ── Expand/Collapse Groups ──
  const toggleGroup = (groupId, isEditMode = false, isCreateMode = false) => {
    if (isCreateMode) {
      setCreateTemplateExpandedGroups(prev => ({
        ...prev,
        [groupId]: !prev[groupId]
      }));
    } else if (isEditMode) {
      setTemplateEditExpandedGroups(prev => ({
        ...prev,
        [groupId]: !prev[groupId]
      }));
    } else {
      setExpandedGroups(prev => ({
        ...prev,
        [groupId]: !prev[groupId]
      }));
    }
  };

  // ── Render Checkbox ──
  const renderCheckbox = (state, groupId, screenId, permissionType, isEditMode = false, isCreateMode = false) => {
    const handleClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (screenId) {
        togglePermission(groupId, screenId, permissionType, isEditMode, isCreateMode);
      } else {
        toggleGroupPermission(groupId, permissionType, isEditMode, isCreateMode);
      }
    };

    switch(state) {
      case PERMISSION_STATES.BLUE:
        return (
          <div 
            className="aa-chk aa-chk-blue" 
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
            title="From Template"
          >
            <Check size={12} strokeWidth={3} />
          </div>
        );
      case PERMISSION_STATES.GREEN:
        return (
          <div 
            className="aa-chk aa-chk-green" 
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
            title="Added"
          >
            <Check size={12} strokeWidth={3} />
          </div>
        );
      case PERMISSION_STATES.RED:
        return (
          <div 
            className="aa-chk aa-chk-red" 
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
            title="Revoked"
          >
            <X size={12} strokeWidth={3} />
          </div>
        );
      case PERMISSION_STATES.EMPTY:
      default:
        return (
          <div 
            className="aa-chk aa-chk-empty" 
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
            title="No Access - Click to add"
          ></div>
        );
    }
  };

  // ── Render Preview Icon ──
  const renderPreviewIcon = (state) => {
    switch(state) {
      case PERMISSION_STATES.BLUE:
        return <div className="aa-chk aa-chk-blue"><Check size={12} strokeWidth={3} /></div>;
      case PERMISSION_STATES.GREEN:
        return <div className="aa-chk aa-chk-green"><Check size={12} strokeWidth={3} /></div>;
      case PERMISSION_STATES.RED:
        return <div className="aa-chk aa-chk-red"><X size={12} strokeWidth={3} /></div>;
      case PERMISSION_STATES.EMPTY:
      default:
        return <div className="aa-chk aa-chk-empty"></div>;
    }
  };

  // ── Get Permission Display Text ──
  const getPermissionDisplay = (state) => {
    switch(state) {
      case PERMISSION_STATES.BLUE:
        return 'Template';
      case PERMISSION_STATES.GREEN:
        return 'Added';
      case PERMISSION_STATES.RED:
        return 'Revoked';
      case PERMISSION_STATES.EMPTY:
      default:
        return 'No Access';
    }
  };

  const getPermissionColor = (state) => {
    switch(state) {
      case PERMISSION_STATES.BLUE:
        return 'blue';
      case PERMISSION_STATES.GREEN:
        return 'green';
      case PERMISSION_STATES.RED:
        return 'red';
      case PERMISSION_STATES.EMPTY:
      default:
        return 'orange';
    }
  };

  const getGroupPermissionCount = (group) => {
    let count = 0;
    group.screens.forEach(screen => {
      PERMISSION_TYPES.forEach(p => {
        if (screen[p] !== PERMISSION_STATES.EMPTY) count++;
      });
    });
    return count;
  };

  const getPermissionStateCounts = (groups) => {
    let blue = 0, green = 0, red = 0, empty = 0;
    groups.forEach(group => {
      group.screens.forEach(screen => {
        PERMISSION_TYPES.forEach(p => {
          if (screen[p] === PERMISSION_STATES.BLUE) blue++;
          else if (screen[p] === PERMISSION_STATES.GREEN) green++;
          else if (screen[p] === PERMISSION_STATES.RED) red++;
          else empty++;
        });
      });
    });
    return { blue, green, red, empty };
  };

  // ── Save as Template ──
  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      triggerAlert('warning', 'Template Name Required', 'Please enter a name for the template.');
      return;
    }

    setLoading(true);
    try {
      const permissionsList = [];
      accessGroups.forEach(group => {
        group.screens.forEach(screen => {
          permissionsList.push({
            screenId: screen.id,
            screenNm: screen.name,
            groupNm: group.name,
            screenCode: screen.code,
            viewFlg: screen.view === PERMISSION_STATES.BLUE || screen.view === PERMISSION_STATES.GREEN,
            addFlg: screen.create === PERMISSION_STATES.BLUE || screen.create === PERMISSION_STATES.GREEN,
            editFlg: screen.edit === PERMISSION_STATES.BLUE || screen.edit === PERMISSION_STATES.GREEN,
            deleteFlg: screen.delete === PERMISSION_STATES.BLUE || screen.delete === PERMISSION_STATES.GREEN
          });
        });
      });

      const response = await fetch(`${apiBaseUrl}/api/rbac/roles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roleNm: templateName.trim(),
          permissions: permissionsList,
          createdBy: getLoggedInUserName()
        })
      });

      if (response.ok) {
        triggerAlert('success', 'Template Saved', `"${templateName}" has been saved as a template successfully!`);
        setShowSaveTemplateModal(false);
        setTemplateName('');
        setTemplateDescription('');
        setSaveAsDraft(false);
        fetchTemplates();
      } else {
        triggerAlert('error', 'Error', 'Failed to save template. Please try again.');
      }
    } catch (err) {
      console.error('Error saving template:', err);
      triggerAlert('error', 'Error', 'Failed to save template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── NEW: Save Create Template ──
  const saveCreateTemplate = async () => {
    if (!createTemplateName.trim()) {
      triggerAlert('warning', 'Template Name Required', 'Please enter a name for the template.');
      return;
    }

    setLoading(true);
    try {
      const permissionsList = [];
      createTemplateGroups.forEach(group => {
        group.screens.forEach(screen => {
          permissionsList.push({
            screenId: screen.id,
            screenNm: screen.name,
            groupNm: group.name,
            screenCode: screen.code,
            viewFlg: screen.view === PERMISSION_STATES.BLUE || screen.view === PERMISSION_STATES.GREEN,
            addFlg: screen.create === PERMISSION_STATES.BLUE || screen.create === PERMISSION_STATES.GREEN,
            editFlg: screen.edit === PERMISSION_STATES.BLUE || screen.edit === PERMISSION_STATES.GREEN,
            deleteFlg: screen.delete === PERMISSION_STATES.BLUE || screen.delete === PERMISSION_STATES.GREEN
          });
        });
      });

      const response = await fetch(`${apiBaseUrl}/api/rbac/roles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roleNm: createTemplateName.trim(),
          permissions: permissionsList,
          createdBy: getLoggedInUserName()
        })
      });

      if (response.ok) {
        triggerAlert('success', 'Template Created', `"${createTemplateName}" has been created successfully!`);
        closeCreateTemplateMode();
        fetchTemplates();
      } else {
        triggerAlert('error', 'Error', 'Failed to create template. Please try again.');
      }
    } catch (err) {
      console.error('Error creating template:', err);
      triggerAlert('error', 'Error', 'Failed to create template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── NEW: Open Create Template Mode ──
  const openCreateTemplateMode = () => {
    setCreateTemplateName('');
    setCreateTemplateDescription('');
    setCreateTemplateIsDraft(false);
    setCreateTemplateStep(1);
    setIsCreateTemplateMode(true);
    initializeCreateTemplateGroups();
    triggerAlert('info', 'Create Template', 'Add permissions to your new template. All permissions start as No Access.');
  };

  // ── NEW: Close Create Template Mode ──
  const closeCreateTemplateMode = () => {
    setIsCreateTemplateMode(false);
    setCreateTemplateStep(1);
    setCreateTemplateGroups([]);
    setCreateTemplateName('');
    setCreateTemplateDescription('');
    setCreateTemplateIsDraft(false);
  };

  // ── Save Access ──
  const handleSaveAccess = async () => {
    if (selectedEmployees.length === 0) {
      triggerAlert('warning', 'No Employees', 'Please select at least one employee.');
      return;
    }

    setLoading(true);
    try {
      const permissionsList = [];
      accessGroups.forEach(group => {
        group.screens.forEach(screen => {
          permissionsList.push({
            screenId: screen.id,
            screenNm: screen.name,
            groupNm: group.name,
            screenCode: screen.code,
            viewFlg: screen.view === PERMISSION_STATES.BLUE || screen.view === PERMISSION_STATES.GREEN,
            addFlg: screen.create === PERMISSION_STATES.BLUE || screen.create === PERMISSION_STATES.GREEN,
            editFlg: screen.edit === PERMISSION_STATES.BLUE || screen.edit === PERMISSION_STATES.GREEN,
            deleteFlg: screen.delete === PERMISSION_STATES.BLUE || screen.delete === PERMISSION_STATES.GREEN
          });
        });
      });

      const payload = {
        empIds: selectedEmployees.map(id => Number(id)),
        roleId: selectedTemplate ? selectedTemplate.id : null,
        customRoleName: null,
        permissions: permissionsList,
        createdBy: getLoggedInUserName()
      };

      const response = await fetch(`${apiBaseUrl}/api/rbac/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        triggerAlert('success', 'Success', 'Access permissions saved successfully!');
        setTimeout(() => {
          setCurrentStep(1);
          setSelectedEmployees([]);
          setSelectedTemplate(null);
          setTemplateName('');
          setTemplateDescription('');
          initializeAccessGroups();
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        triggerAlert('error', 'Error', errorData.message || 'Some permissions failed to save. Please try again.');
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      triggerAlert('error', 'Error', 'Failed to save permissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Save as Draft ──
  const handleSaveAsDraft = async () => {
    if (selectedEmployees.length === 0) {
      triggerAlert('warning', 'No Employees', 'Please select at least one employee.');
      return;
    }

    setLoading(true);
    try {
      const permissionsList = [];
      accessGroups.forEach(group => {
        group.screens.forEach(screen => {
          permissionsList.push({
            screenId: screen.id,
            screenNm: screen.name,
            groupNm: group.name,
            screenCode: screen.code,
            viewFlg: screen.view === PERMISSION_STATES.BLUE || screen.view === PERMISSION_STATES.GREEN,
            addFlg: screen.create === PERMISSION_STATES.BLUE || screen.create === PERMISSION_STATES.GREEN,
            editFlg: screen.edit === PERMISSION_STATES.BLUE || screen.edit === PERMISSION_STATES.GREEN,
            deleteFlg: screen.delete === PERMISSION_STATES.BLUE || screen.delete === PERMISSION_STATES.GREEN
          });
        });
      });

      const payload = {
        empIds: selectedEmployees.map(id => Number(id)),
        roleId: selectedTemplate ? selectedTemplate.id : null,
        customRoleName: null,
        permissions: permissionsList
      };

      const response = await fetch(`${apiBaseUrl}/api/rbac/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        triggerAlert('success', 'Success', 'Access permissions saved as draft successfully!');
        setTimeout(() => {
          setCurrentStep(1);
          setSelectedEmployees([]);
          setSelectedTemplate(null);
          setTemplateName('');
          setTemplateDescription('');
          initializeAccessGroups();
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        triggerAlert('error', 'Error', errorData.message || 'Some permissions failed to save as draft. Please try again.');
      }
    } catch (err) {
      console.error('Error saving permissions as draft:', err);
      triggerAlert('error', 'Error', 'Failed to save permissions as draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Everything ──
  const handleReset = () => {
    setCurrentStep(1);
    setSelectedEmployees([]);
    setSelectedTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setSearchTerm('');
    setSearchTermStep2('');
    setSearchTermStep3('');
    initializeAccessGroups();
    triggerAlert('info', 'Reset', 'All selections have been cleared.');
  };

  // ── Employee Management in Summary ──
  const handleRemoveEmployee = (empId) => {
    setSelectedEmployees(prev => prev.filter(id => id !== empId));
    triggerAlert('info', 'Employee Removed', 'Employee has been removed from the list.');
  };

  const handleAddEmployee = (empId) => {
    if (!selectedEmployees.includes(empId)) {
      setSelectedEmployees(prev => [...prev, empId]);
      triggerAlert('success', 'Employee Added', 'Employee has been added to the list.');
      setShowAddEmployeeModal(false);
      setEmployeeSearchTerm('');
    } else {
      triggerAlert('warning', 'Already Added', 'This employee is already in the list.');
    }
  };

  const availableEmployees = employees.filter(emp => 
    !selectedEmployees.includes(emp.empId || emp.id) &&
    (emp.fstNm || emp.firstName || '').toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    (emp.lstNm || emp.lastName || '').toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    (emp.empCode || emp.employeeCode || '').toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    (emp.email || '').toLowerCase().includes(employeeSearchTerm.toLowerCase())
  );

  // ── FIXED: Filtered Employees with Selected on Top ──
  const filteredEmployees = employees
    .filter(emp => {
      const search = searchTerm.toLowerCase();
      const name = `${emp.fstNm || emp.firstName || ''} ${emp.lstNm || emp.lastName || ''}`.toLowerCase();
      const code = (emp.empCode || emp.employeeCode || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      return name.includes(search) || code.includes(search) || email.includes(search);
    })
    .sort((a, b) => {
      const aId = a.empId || a.id;
      const bId = b.empId || b.id;
      const aSelected = selectedEmployees.includes(aId);
      const bSelected = selectedEmployees.includes(bId);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      const codeA = a.empCode || a.employeeCode || a.id || '';
      const codeB = b.empCode || b.employeeCode || b.id || '';
      return String(codeA).localeCompare(String(codeB));
    });

  // ── TEMPLATE MANAGEMENT FUNCTIONS ──

  // ── Initialize Template Edit Groups from Template ──
  const initializeTemplateEditGroups = (template) => {
    const groups = dbScreenGroups.map(group => {
      let groupHasView = false;
      let groupHasCreate = false;
      let groupHasEdit = false;
      let groupHasDelete = false;

      const screens = group.screens.map(screen => {
        const perms = template.permissions?.[screen.id];
        if (perms) {
          const view = perms.view ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
          const create = perms.create ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
          const edit = perms.edit ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
          const delete_ = perms.delete ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
          
          if (view === PERMISSION_STATES.BLUE) groupHasView = true;
          if (create === PERMISSION_STATES.BLUE) groupHasCreate = true;
          if (edit === PERMISSION_STATES.BLUE) groupHasEdit = true;
          if (delete_ === PERMISSION_STATES.BLUE) groupHasDelete = true;

          const hasBlue = view === PERMISSION_STATES.BLUE || create === PERMISSION_STATES.BLUE || 
                          edit === PERMISSION_STATES.BLUE || delete_ === PERMISSION_STATES.BLUE;
          const hasEmpty = view === PERMISSION_STATES.EMPTY || create === PERMISSION_STATES.EMPTY || 
                          edit === PERMISSION_STATES.EMPTY || delete_ === PERMISSION_STATES.EMPTY;
          
          let badge = 'orange';
          let badgeText = 'No Access';
          
          if (hasBlue && hasEmpty) {
            badge = 'orange';
            badgeText = 'Mixed';
          } else if (hasBlue) {
            badge = 'blue';
            badgeText = 'From Template';
          } else {
            badge = 'orange';
            badgeText = 'No Access';
          }
          
          return {
            ...screen,
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

      const groupHasBlue = screens.some(s => 
        PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.BLUE)
      );
      const groupHasEmpty = screens.some(s => 
        PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.EMPTY)
      );
      
      let groupBadge = 'orange';
      let groupBadgeText = 'No Access';
      
      if (groupHasBlue && groupHasEmpty) {
        groupBadge = 'orange';
        groupBadgeText = 'Mixed';
      } else if (groupHasBlue) {
        groupBadge = 'blue';
        groupBadgeText = 'From Template';
      }

      return {
        ...group,
        screens,
        view: groupHasView ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
        create: groupHasCreate ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
        edit: groupHasEdit ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
        delete: groupHasDelete ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
        badge: groupBadge,
        badgeText: groupBadgeText
      };
    });
    
    setTemplateEditGroups(groups);
    setTemplateEditExpandedGroups({ [groups[0]?.id]: true });
  };

  // ── Open Template Edit Mode ──
  const openTemplateEditMode = async (template) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/rbac/roles/${template.id}/permissions`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const permsList = await response.json();
        const permissions = {};
        permsList.forEach(p => {
          permissions[p.screenId] = {
            view: p.viewFlg,
            create: p.addFlg,
            edit: p.editFlg,
            delete: p.deleteFlg
          };
        });
        const templateWithPerms = { ...template, permissions };
        setTemplateEditOriginalTemplate(templateWithPerms);
        setTemplateEditTemplateName(template.name);
        setTemplateEditTemplateDescription(template.description || '');
        setTemplateEditIsDraft(template.isDraft || false);
        setTemplateEditStep(1);
        setIsTemplateEditMode(true);
        setIsCreateTemplateMode(false);
        initializeTemplateEditGroups(templateWithPerms);
        triggerAlert('info', 'Edit Mode', `Editing template: "${template.name}". Modify permissions and save.`);
      } else {
        triggerAlert('error', 'Error', 'Failed to fetch template permissions.');
      }
    } catch (err) {
      console.error('Error fetching template permissions:', err);
      triggerAlert('error', 'Error', 'Failed to fetch template permissions.');
    } finally {
      setLoading(false);
    }
  };

  // ── Close Template Edit Mode ──
  const closeTemplateEditMode = () => {
    setIsTemplateEditMode(false);
    setTemplateEditStep(1);
    setTemplateEditGroups([]);
    setTemplateEditOriginalTemplate(null);
    setTemplateEditTemplateName('');
    setTemplateEditTemplateDescription('');
    setTemplateEditIsDraft(false);
  };

  // ── Save Edited Template ──
  const saveEditedTemplateFromEditMode = async (choice) => {
    if (!templateEditTemplateName.trim()) {
      triggerAlert('warning', 'Template Name Required', 'Please enter a name for the template.');
      return;
    }

    setLoading(true);
    try {
      const permissionsList = [];
      templateEditGroups.forEach(group => {
        group.screens.forEach(screen => {
          permissionsList.push({
            screenId: screen.id,
            screenNm: screen.name,
            groupNm: group.name,
            screenCode: screen.code,
            viewFlg: screen.view === PERMISSION_STATES.BLUE || screen.view === PERMISSION_STATES.GREEN,
            addFlg: screen.create === PERMISSION_STATES.BLUE || screen.create === PERMISSION_STATES.GREEN,
            editFlg: screen.edit === PERMISSION_STATES.BLUE || screen.edit === PERMISSION_STATES.GREEN,
            deleteFlg: screen.delete === PERMISSION_STATES.BLUE || screen.delete === PERMISSION_STATES.GREEN
          });
        });
      });

      let response;
      if (choice === 'update' && templateEditOriginalTemplate?.id) {
        response = await fetch(`${apiBaseUrl}/api/rbac/roles/${templateEditOriginalTemplate.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            roleNm: templateEditTemplateName.trim(),
            permissions: permissionsList,
            createdBy: getLoggedInUserName()
          })
        });
        if (response.ok) {
          triggerAlert('success', 'Success', `Template "${templateEditTemplateName}" updated successfully!`);
        }
      } else {
        response = await fetch(`${apiBaseUrl}/api/rbac/roles`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            roleNm: templateEditTemplateName.trim(),
            permissions: permissionsList,
            createdBy: getLoggedInUserName()
          })
        });
        if (response.ok) {
          triggerAlert('success', 'Success', `Template "${templateEditTemplateName}" saved as new template!`);
        }
      }

      if (response && response.ok) {
        closeTemplateEditMode();
        fetchTemplates();
      } else {
        triggerAlert('error', 'Error', 'Failed to save template. Please try again.');
      }
    } catch (err) {
      console.error('Error saving template:', err);
      triggerAlert('error', 'Error', 'Failed to save template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── TEMPLATE MANAGEMENT: Edit Existing Template ──
  const loadTemplateForEdit = (template) => {
    setTemplateToEdit(template);
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setSaveAsDraft(template.isDraft || false);
    
    if (template.permissions) {
      const updatedGroups = accessGroups.map(group => {
        let groupHasView = false;
        let groupHasCreate = false;
        let groupHasEdit = false;
        let groupHasDelete = false;

        const updatedScreens = group.screens.map(screen => {
          const perms = template.permissions[screen.id];
          if (perms) {
            const view = perms.view ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
            const create = perms.create ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
            const edit = perms.edit ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
            const delete_ = perms.delete ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY;
            
            if (view === PERMISSION_STATES.BLUE) groupHasView = true;
            if (create === PERMISSION_STATES.BLUE) groupHasCreate = true;
            if (edit === PERMISSION_STATES.BLUE) groupHasEdit = true;
            if (delete_ === PERMISSION_STATES.BLUE) groupHasDelete = true;

            const hasBlue = view === PERMISSION_STATES.BLUE || create === PERMISSION_STATES.BLUE || 
                            edit === PERMISSION_STATES.BLUE || delete_ === PERMISSION_STATES.BLUE;
            const hasEmpty = view === PERMISSION_STATES.EMPTY || create === PERMISSION_STATES.EMPTY || 
                            edit === PERMISSION_STATES.EMPTY || delete_ === PERMISSION_STATES.EMPTY;
            
            let badge = 'orange';
            let badgeText = 'No Access';
            
            if (hasBlue && hasEmpty) {
              badge = 'orange';
              badgeText = 'Mixed';
            } else if (hasBlue) {
              badge = 'blue';
              badgeText = 'From Template';
            } else {
              badge = 'orange';
              badgeText = 'No Access';
            }
            
            return {
              ...screen,
              view,
              create,
              edit,
              delete: delete_,
              badge,
              badgeText
            };
          }
          return screen;
        });

        const groupHasBlue = updatedScreens.some(s => 
          PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.BLUE)
        );
        const groupHasEmpty = updatedScreens.some(s => 
          PERMISSION_TYPES.some(p => s[p] === PERMISSION_STATES.EMPTY)
        );
        
        let groupBadge = 'orange';
        let groupBadgeText = 'No Access';
        
        if (groupHasBlue && groupHasEmpty) {
          groupBadge = 'orange';
          groupBadgeText = 'Mixed';
        } else if (groupHasBlue) {
          groupBadge = 'blue';
          groupBadgeText = 'From Template';
        }

        return {
          ...group,
          screens: updatedScreens,
          view: groupHasView ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
          create: groupHasCreate ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
          edit: groupHasEdit ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
          delete: groupHasDelete ? PERMISSION_STATES.BLUE : PERMISSION_STATES.EMPTY,
          badge: groupBadge,
          badgeText: groupBadgeText
        };
      });
      
      setAccessGroups(updatedGroups);
    }
    
    setShowEditTemplateModal(true);
  };

  // ── TEMPLATE MANAGEMENT: Save Edited Template ──
  const saveEditedTemplate = async (choice) => {
    if (!templateName.trim()) {
      triggerAlert('warning', 'Template Name Required', 'Please enter a name for the template.');
      return;
    }

    setLoading(true);
    try {
      const permissionsList = [];
      accessGroups.forEach(group => {
        group.screens.forEach(screen => {
          permissionsList.push({
            screenId: screen.id,
            screenNm: screen.name,
            groupNm: group.name,
            screenCode: screen.code,
            viewFlg: screen.view === PERMISSION_STATES.BLUE || screen.view === PERMISSION_STATES.GREEN,
            addFlg: screen.create === PERMISSION_STATES.BLUE || screen.create === PERMISSION_STATES.GREEN,
            editFlg: screen.edit === PERMISSION_STATES.BLUE || screen.edit === PERMISSION_STATES.GREEN,
            deleteFlg: screen.delete === PERMISSION_STATES.BLUE || screen.delete === PERMISSION_STATES.GREEN
          });
        });
      });

      let response;
      if (choice === 'update' && templateToEdit?.id) {
        response = await fetch(`${apiBaseUrl}/api/rbac/roles/${templateToEdit.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            roleNm: templateName.trim(),
            permissions: permissionsList
          })
        });
        if (response.ok) {
          triggerAlert('success', 'Success', `Template "${templateName}" updated successfully!`);
        }
      } else {
        response = await fetch(`${apiBaseUrl}/api/rbac/roles`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            roleNm: templateName.trim(),
            permissions: permissionsList
          })
        });
        if (response.ok) {
          triggerAlert('success', 'Success', `Template "${templateName}" saved as new template!`);
        }
      }

      if (response && response.ok) {
        setShowEditTemplateModal(false);
        setTemplateToEdit(null);
        setSaveAsDraft(false);
        setUpdateOrSaveModal(false);
        setTemplateUpdateChoice(null);
        fetchTemplates();
      } else {
        triggerAlert('error', 'Error', 'Failed to save template. Please try again.');
      }
    } catch (err) {
      console.error('Error saving template:', err);
      triggerAlert('error', 'Error', 'Failed to save template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── TEMPLATE MANAGEMENT: Delete Template ──
  const deleteTemplate = (templateId) => {
    setTemplateToDelete(templateId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/rbac/roles/${templateToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete));
        triggerAlert('success', 'Deleted', 'Template deleted successfully!');
        setShowDeleteConfirm(false);
        setTemplateToDelete(null);
      } else {
        triggerAlert('error', 'Error', 'Failed to delete template.');
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      triggerAlert('error', 'Error', 'Failed to delete template.');
    } finally {
      setLoading(false);
    }
  };

  // ── Update or Save Modal ──
  const renderUpdateOrSaveModal = () => {
    if (!updateOrSaveModal) return null;

    return (
      <div className="aa-modal-overlay" onClick={() => setUpdateOrSaveModal(false)}>
        <div className="aa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
          <div className="aa-modal-header">
            <h3>Save Template</h3>
            <button className="aa-modal-close" onClick={() => setUpdateOrSaveModal(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="aa-modal-body">
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '16px' }}>
              How would you like to save this template?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="aa-btn-primary" 
                onClick={() => {
                  setUpdateOrSaveModal(false);
                  if (isTemplateEditMode) {
                    saveEditedTemplateFromEditMode('update');
                  } else {
                    saveEditedTemplate('update');
                  }
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Save size={16} /> Update Existing Template
              </button>
              <button 
                className="aa-btn-outline" 
                onClick={() => {
                  setUpdateOrSaveModal(false);
                  if (isTemplateEditMode) {
                    saveEditedTemplateFromEditMode('save');
                  } else {
                    saveEditedTemplate('save');
                  }
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Copy size={16} /> Save as New Template
              </button>
            </div>
            <p style={{ marginTop: '16px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              Choose "Update" to modify the existing template or "Save as New" to create a copy.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ── Step Renderers ──
  const renderStepper = () => (
    <div className="aa-stepper">
      {steps.map((step, index) => {
        const isActive = currentStep === step.num;
        const isCompleted = currentStep > step.num;
        
        return (
          <div key={step.num} className={`aa-step-wrapper ${isCompleted ? 'completed' : ''}`}>
            <div 
              className={`aa-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => {
                if (isCompleted) {
                  setCurrentStep(step.num);
                }
              }}
              style={{ cursor: isCompleted ? 'pointer' : 'default' }}
            >
              <div className="aa-step-circle">
                {isCompleted ? <Check size={16} /> : step.num}
              </div>
              <div className="aa-step-info">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
            {index < steps.length - 1 && <div className="aa-step-connector"></div>}
          </div>
        );
      })}
    </div>
  );

  // ── Template Edit Stepper ──
  const renderTemplateEditStepper = () => (
    <div className="aa-stepper">
      {templateEditSteps.map((step, index) => {
        const isActive = templateEditStep === step.num;
        const isCompleted = templateEditStep > step.num;
        
        return (
          <div key={step.num} className={`aa-step-wrapper ${isCompleted ? 'completed' : ''}`}>
            <div 
              className={`aa-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => {
                if (isCompleted) {
                  setTemplateEditStep(step.num);
                }
              }}
              style={{ cursor: isCompleted ? 'pointer' : 'default' }}
            >
              <div className="aa-step-circle">
                {isCompleted ? <Check size={16} /> : step.num}
              </div>
              <div className="aa-step-info">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
            {index < templateEditSteps.length - 1 && <div className="aa-step-connector"></div>}
          </div>
        );
      })}
    </div>
  );

  // ── Create Template Stepper ──
  const renderCreateTemplateStepper = () => (
    <div className="aa-stepper">
      {createTemplateSteps.map((step, index) => {
        const isActive = createTemplateStep === step.num;
        const isCompleted = createTemplateStep > step.num;
        
        return (
          <div key={step.num} className={`aa-step-wrapper ${isCompleted ? 'completed' : ''}`}>
            <div 
              className={`aa-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => {
                if (isCompleted) {
                  setCreateTemplateStep(step.num);
                }
              }}
              style={{ cursor: isCompleted ? 'pointer' : 'default' }}
            >
              <div className="aa-step-circle">
                {isCompleted ? <Check size={16} /> : step.num}
              </div>
              <div className="aa-step-info">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
            {index < createTemplateSteps.length - 1 && <div className="aa-step-connector"></div>}
          </div>
        );
      })}
    </div>
  );

  // ── Create Template Manage Access ──
  const renderCreateTemplateManageAccess = () => {
    const counts = getPermissionStateCounts(createTemplateGroups);

    const filteredGroups = createTemplateGroups.map(group => ({
      ...group,
      screens: group.screens.filter(screen => 
        screen.name.toLowerCase().includes(createTemplateSearchTerm.toLowerCase()) ||
        group.name.toLowerCase().includes(createTemplateSearchTerm.toLowerCase())
      )
    })).filter(group => group.screens.length > 0);

    return (
      <div className="aa-step-content">
        <div className="aa-step-header">
          <h3>Create Template - Manage Access</h3>
          <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
            <Plus size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Adding permissions to new template. All permissions start as <strong>No Access</strong>.
          </p>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Click on empty checkboxes to add permissions (Green = Added). Click on Added to remove.
          </p>
        </div>

        <div className="aa-search-bar" style={{ marginBottom: '16px' }}>
          <Search className="aa-search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search groups or screens..." 
            value={createTemplateSearchTerm}
            onChange={(e) => setCreateTemplateSearchTerm(e.target.value)}
          />
        </div>

        <div className="aa-permission-legend">
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-green"><Check size={12} strokeWidth={3} /></div>
            <span>Added Permission</span>
          </div>
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-empty"></div>
            <span>No Access</span>
          </div>
        </div>

        <div className="aa-stats-bar">
          <div className="aa-stat-item">
            <span className="aa-stat-label">Added</span>
            <span className="aa-stat-value aa-stat-green">{counts.green}</span>
          </div>
          <div className="aa-stat-divider"></div>
          <div className="aa-stat-item">
            <span className="aa-stat-label">No Access</span>
            <span className="aa-stat-value">{counts.empty}</span>
          </div>
        </div>

        <div className="aa-table-container">
          <table className="aa-table aa-access-table">
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
              {filteredGroups.map((group) => {
                const isExpanded = createTemplateExpandedGroups[group.id];
                const permissionCount = getGroupPermissionCount(group);
                
                return (
                  <React.Fragment key={group.id}>
                    <tr 
                      className={`aa-group-row ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleGroup(group.id, false, true)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="aa-group-name">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <group.icon size={16} className="aa-group-icon" />
                          <span>{group.name}</span>
                          <span className="aa-group-count">({group.screens.length} screens)</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{group.screens.length}</td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.view, group.id, null, 'view', false, true)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.create, group.id, null, 'create', false, true)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.edit, group.id, null, 'edit', false, true)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.delete, group.id, null, 'delete', false, true)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`aa-badge aa-badge-${group.badge}`}>
                          {permissionCount > 0 ? `${permissionCount} perms` : group.badgeText}
                        </span>
                      </td>
                    </tr>

                    {isExpanded && group.screens.map((screen) => (
                      <tr key={screen.id} className="aa-screen-row">
                        <td className="aa-screen-name">
                          <div className="aa-screen-indent">
                            <FileText size={14} className="aa-screen-icon" />
                            <span>{screen.name}</span>
                          </div>
                        </td>
                        <td></td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.view, group.id, screen.id, 'view', false, true)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.create, group.id, screen.id, 'create', false, true)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.edit, group.id, screen.id, 'edit', false, true)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.delete, group.id, screen.id, 'delete', false, true)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`aa-badge aa-badge-${screen.badge}`}>
                            {screen.badgeText}
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
      </div>
    );
  };

  // ── Create Template Summary ──
  const renderCreateTemplateSummary = () => {
    const counts = getPermissionStateCounts(createTemplateGroups);
    let totalScreens = 0;
    createTemplateGroups.forEach(group => {
      totalScreens += group.screens.length;
    });

    return (
      <div className="aa-step-content">
        <div className="aa-step-header">
          <h3>Create Template - Summary</h3>
          <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
            <Plus size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Review permissions for your new template.
          </p>
        </div>

        <div className="aa-summary-combined-row">
          <div className="aa-summary-employees-section">
            <div className="aa-summary-employees-header">
              <h4>
                <FileText size={18} />
                Template Details
              </h4>
            </div>
            <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Template Name</label>
                  <input 
                    type="text" 
                    value={createTemplateName}
                    onChange={(e) => setCreateTemplateName(e.target.value)}
                    placeholder="Enter template name"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      marginTop: '4px'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="aa-summary-stats-section">
            <div className="aa-summary-stats-grid">
              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini purple">
                  <Folder size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Screens</span>
                  <span className="aa-stat-value-mini">{totalScreens}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini green">
                  <Plus size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Added</span>
                  <span className="aa-stat-value-mini">{counts.green}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini orange">
                  <Minus size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">No Access</span>
                  <span className="aa-stat-value-mini">{counts.empty}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="aa-summary-section">
          <div className="aa-summary-section-header">
            <h4>
              <Shield size={18} />
              Permission Preview
            </h4>
          </div>
          
          <div className="aa-preview-legend">
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-green"></span> Added</span>
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-empty"></span> No Access</span>
          </div>

          <div className="aa-table-container">
            <table className="aa-table aa-access-table">
              <thead>
                <tr>
                  <th width="30%">Group / Screen</th>
                  <th width="14%" style={{ textAlign: 'center' }}>View</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Create</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Edit</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Delete</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {createTemplateGroups.map((group) => {
                  const isExpanded = createTemplateExpandedGroups[group.id];
                  
                  return (
                    <React.Fragment key={group.id}>
                      <tr className="aa-group-row" onClick={() => toggleGroup(group.id, false, true)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div className="aa-group-name">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <group.icon size={16} className="aa-group-icon" />
                            <span>{group.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.view)}</td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.create)}</td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.edit)}</td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.delete)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`aa-badge aa-badge-${getPermissionColor(group.view)}`}>
                            {getPermissionDisplay(group.view)}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && group.screens.map((screen) => {
                        return (
                          <tr key={screen.id} className="aa-screen-row">
                            <td className="aa-screen-name">
                              <div className="aa-screen-indent">
                                <FileText size={14} className="aa-screen-icon" />
                                <span>{screen.name}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.view)}</td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.create)}</td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.edit)}</td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.delete)}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`aa-badge aa-badge-${getPermissionColor(screen.view)}`}>
                                {getPermissionDisplay(screen.view)}
                              </span>
                            </td>
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

        <div className="aa-summary-footer">
          <div className="aa-summary-meta">
            <span>New Template</span>
            <span>Status: {createTemplateIsDraft ? 'Draft' : 'Published'}</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Template Edit Manage Access ──
  const renderTemplateEditManageAccess = () => {
    const counts = getPermissionStateCounts(templateEditGroups);

    const filteredGroups = templateEditGroups.map(group => ({
      ...group,
      screens: group.screens.filter(screen => 
        screen.name.toLowerCase().includes(templateEditSearchTerm.toLowerCase()) ||
        group.name.toLowerCase().includes(templateEditSearchTerm.toLowerCase())
      )
    })).filter(group => group.screens.length > 0);

    return (
      <div className="aa-step-content">
        <div className="aa-step-header">
          <h3>Edit Template Permissions</h3>
          <p style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
            <Edit size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Editing template: <strong>{templateEditOriginalTemplate?.name}</strong> ({templateEditOriginalTemplate?.code})
          </p>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Click on checkboxes to modify permissions. Blue = Template, Green = Added, Red = Revoked
          </p>
        </div>

        <div className="aa-search-bar" style={{ marginBottom: '16px' }}>
          <Search className="aa-search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search groups or screens..." 
            value={templateEditSearchTerm}
            onChange={(e) => setTemplateEditSearchTerm(e.target.value)}
          />
        </div>

        <div className="aa-permission-legend">
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-blue"><Check size={12} strokeWidth={3} /></div>
            <span>Template Permission</span>
          </div>
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-green"><Check size={12} strokeWidth={3} /></div>
            <span>Added</span>
          </div>
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-red"><X size={12} strokeWidth={3} /></div>
            <span>Revoked</span>
          </div>
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-empty"></div>
            <span>No Access</span>
          </div>
        </div>

        <div className="aa-stats-bar">
          <div className="aa-stat-item">
            <span className="aa-stat-label">Template</span>
            <span className="aa-stat-value aa-stat-blue">{counts.blue}</span>
          </div>
          <div className="aa-stat-divider"></div>
          <div className="aa-stat-item">
            <span className="aa-stat-label">Added</span>
            <span className="aa-stat-value aa-stat-green">{counts.green}</span>
          </div>
          <div className="aa-stat-divider"></div>
          <div className="aa-stat-item">
            <span className="aa-stat-label">Revoked</span>
            <span className="aa-stat-value aa-stat-red">{counts.red}</span>
          </div>
          <div className="aa-stat-divider"></div>
          <div className="aa-stat-item">
            <span className="aa-stat-label">No Access</span>
            <span className="aa-stat-value">{counts.empty}</span>
          </div>
        </div>

        <div className="aa-table-container">
          <table className="aa-table aa-access-table">
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
              {filteredGroups.map((group) => {
                const isExpanded = templateEditExpandedGroups[group.id];
                const permissionCount = getGroupPermissionCount(group);
                
                return (
                  <React.Fragment key={group.id}>
                    <tr 
                      className={`aa-group-row ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleGroup(group.id, true)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="aa-group-name">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <group.icon size={16} className="aa-group-icon" />
                          <span>{group.name}</span>
                          <span className="aa-group-count">({group.screens.length} screens)</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{group.screens.length}</td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.view, group.id, null, 'view', true)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.create, group.id, null, 'create', true)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.edit, group.id, null, 'edit', true)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.delete, group.id, null, 'delete', true)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`aa-badge aa-badge-${group.badge}`}>
                          {permissionCount > 0 ? `${permissionCount} perms` : group.badgeText}
                        </span>
                      </td>
                    </tr>

                    {isExpanded && group.screens.map((screen) => (
                      <tr key={screen.id} className="aa-screen-row">
                        <td className="aa-screen-name">
                          <div className="aa-screen-indent">
                            <FileText size={14} className="aa-screen-icon" />
                            <span>{screen.name}</span>
                          </div>
                        </td>
                        <td></td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.view, group.id, screen.id, 'view', true)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.create, group.id, screen.id, 'create', true)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.edit, group.id, screen.id, 'edit', true)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.delete, group.id, screen.id, 'delete', true)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`aa-badge aa-badge-${screen.badge}`}>
                            {screen.badgeText}
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
      </div>
    );
  };

  // ── Template Edit Summary ──
  const renderTemplateEditSummary = () => {
    const counts = getPermissionStateCounts(templateEditGroups);
    let totalScreens = 0;
    templateEditGroups.forEach(group => {
      totalScreens += group.screens.length;
    });

    return (
      <div className="aa-step-content">
        <div className="aa-step-header">
          <h3>Template Edit Summary</h3>
          <p style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
            <Edit size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Review changes for: <strong>{templateEditOriginalTemplate?.name}</strong> ({templateEditOriginalTemplate?.code})
          </p>
        </div>

        <div className="aa-summary-combined-row">
          <div className="aa-summary-employees-section">
            <div className="aa-summary-employees-header">
              <h4>
                <FileText size={18} />
                Template Details
              </h4>
            </div>
            <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Template Name</label>
                  <input 
                    type="text" 
                    value={templateEditTemplateName}
                    onChange={(e) => setTemplateEditTemplateName(e.target.value)}
                    placeholder="Enter template name"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      marginTop: '4px'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="aa-summary-stats-section">
            <div className="aa-summary-stats-grid">
              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini purple">
                  <Folder size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Screens</span>
                  <span className="aa-stat-value-mini">{totalScreens}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini blue">
                  <Shield size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Template</span>
                  <span className="aa-stat-value-mini">{counts.blue}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini green">
                  <Plus size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Added</span>
                  <span className="aa-stat-value-mini">{counts.green}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini red">
                  <X size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Revoked</span>
                  <span className="aa-stat-value-mini">{counts.red}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini orange">
                  <Minus size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">No Access</span>
                  <span className="aa-stat-value-mini">{counts.empty}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="aa-summary-section">
          <div className="aa-summary-section-header">
            <h4>
              <Shield size={18} />
              Permission Preview
            </h4>
          </div>
          
          <div className="aa-preview-legend">
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-blue"></span> Template Access</span>
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-green"></span> Added</span>
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-red"></span> Revoked</span>
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-empty"></span> No Access</span>
          </div>

          <div className="aa-table-container">
            <table className="aa-table aa-access-table">
              <thead>
                <tr>
                  <th width="30%">Group / Screen</th>
                  <th width="14%" style={{ textAlign: 'center' }}>View</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Create</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Edit</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Delete</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {templateEditGroups.map((group) => {
                  const isExpanded = templateEditExpandedGroups[group.id];
                  
                  return (
                    <React.Fragment key={group.id}>
                      <tr className="aa-group-row" onClick={() => toggleGroup(group.id, true)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div className="aa-group-name">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <group.icon size={16} className="aa-group-icon" />
                            <span>{group.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.view)}</td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.create)}</td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.edit)}</td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.delete)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`aa-badge aa-badge-${getPermissionColor(group.view)}`}>
                            {getPermissionDisplay(group.view)}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && group.screens.map((screen) => {
                        return (
                          <tr key={screen.id} className="aa-screen-row">
                            <td className="aa-screen-name">
                              <div className="aa-screen-indent">
                                <FileText size={14} className="aa-screen-icon" />
                                <span>{screen.name}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.view)}</td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.create)}</td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.edit)}</td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.delete)}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`aa-badge aa-badge-${getPermissionColor(screen.view)}`}>
                                {getPermissionDisplay(screen.view)}
                              </span>
                            </td>
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

        <div className="aa-summary-footer">
          <div className="aa-summary-meta">
            <span>Template: {templateEditOriginalTemplate?.code}</span>
            <span>Status: {templateEditIsDraft ? 'Draft' : 'Published'}</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Step 1: Select Employees ──
  const renderStep1 = () => (
    <div className="aa-step-content">
      <div className="aa-step-header">
        <h3>Select Employees</h3>
        <p>Choose one or more employees to assign access permissions.</p>
      </div>
      
      <div className="aa-search-bar">
        <Search className="aa-search-icon" size={18} />
        <input 
          type="text" 
          placeholder="Search by name, code, or email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="aa-selection-controls">
        <div className="aa-selection-info">
          <strong>Selected Employees: <span className="aa-selection-count">{selectedEmployees.length}</span></strong>
          <span className="aa-total-count">Total: {employees.length}</span>
          {searchTerm && (
            <span className="aa-filtered-count">Filtered: {filteredEmployees.length}</span>
          )}
        </div>
        <div className="aa-selection-actions">
          <button className="aa-btn-outline-sm" onClick={toggleAllEmployees}>
            {filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.includes(emp.empId || emp.id))
              ? 'Deselect Filtered'
              : 'Select Filtered'}
          </button>
          {selectedEmployees.length > 0 && (
            <button className="aa-btn-danger-sm" onClick={() => setSelectedEmployees([])}>
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="aa-list">
        {loading ? (
          <div className="aa-loading">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="aa-empty">No employees found matching your search.</div>
        ) : (
          filteredEmployees.map((emp, index) => {
            const empId = emp.empId || emp.id;
            const name = `${emp.fstNm || emp.firstName || ''} ${emp.lstNm || emp.lastName || ''}`.trim();
            const code = emp.empCode || emp.employeeCode || '';
            const role = emp.role || emp.designation || 'Employee';
            const email = emp.email || '';
            const isSelected = selectedEmployees.includes(empId);
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div 
                key={empId} 
                className={`aa-list-item ${isSelected ? 'selected' : ''}`} 
                onClick={() => toggleEmployee(empId)}
              >
                <input 
                  type="checkbox" 
                  className="aa-checkbox"
                  checked={isSelected} 
                  onChange={() => {}}
                  onClick={(e) => handleEmployeeCheckbox(e, empId)}
                />
                <div className="aa-avatar">{initials || 'U'}</div>
                <div className="aa-info">
                  <h5>{code ? `${code} - ${name}` : name}</h5>
                  <p>{role} {email ? `| ${email}` : ''}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ── Step 2: Select Template ──
  const renderStep2 = () => {
    const filteredTemplates = templates.filter(t => 
      t.name?.toLowerCase().includes(searchTermStep2.toLowerCase()) ||
      t.code?.toLowerCase().includes(searchTermStep2.toLowerCase())
    );

    return (
      <div className="aa-step-content">
        <div className="aa-step-header">
          <h3>Select Template</h3>
          <p>Apply a predefined template to quickly assign permissions. (Optional)</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            {selectedTemplate ? 'Template is applied and reflected in Manage Access' : 'No template selected - you will create fresh permissions'}
          </p>
        </div>
        
        <div className="aa-search-bar">
          <Search className="aa-search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search templates..." 
            value={searchTermStep2}
            onChange={(e) => setSearchTermStep2(e.target.value)}
          />
        </div>

        {selectedTemplate && (
          <div className="aa-selected-template">
            <div className="aa-template-card selected">
              <div className="aa-template-info">
                <h4>
                  {selectedTemplate.name}
                  <span className="aa-template-status applied">✓ Applied</span>
                </h4>
                <span className="aa-template-code">{selectedTemplate.code}</span>
              </div>
              <div className="aa-template-actions">
                <button 
                  className="aa-btn-danger-sm"
                  onClick={deselectTemplate}
                >
                  <X size={14} /> Deselect
                </button>
              </div>
            </div>
            <div className="aa-info-box aa-info-success">
              <CheckCircle2 size={18} />
              <p>
                <strong>"{selectedTemplate.name}"</strong> is applied. You can customize permissions in the next step.
                <br />
                <span style={{ fontSize: '12px', color: '#166534' }}>
                  Template permissions are shown as <strong>blue checkmarks</strong>.
                </span>
              </p>
            </div>
          </div>
        )}

        {!selectedTemplate && (
          <>
            <div className="aa-template-list">
              {filteredTemplates.length === 0 ? (
                <div className="aa-empty">No templates found matching your search.</div>
              ) : (
                filteredTemplates.map(template => {
                  return (
                    <div 
                      key={template.id} 
                      className="aa-template-card"
                    >
                      <div className="aa-template-info">
                        <h4>
                          {template.name}
                        </h4>
                        <span className="aa-template-code">{template.code}</span>
                      </div>
                      <div className="aa-template-actions">
                        <button 
                          className="aa-btn-outline-sm" 
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const response = await fetch(`${apiBaseUrl}/api/rbac/roles/${template.id}/permissions`, {
                                headers: getAuthHeaders()
                              });
                              if (response.ok) {
                                const permsList = await response.json();
                                const configuredCount = permsList.filter(p => p.viewFlg || p.addFlg || p.editFlg || p.deleteFlg).length;
                                triggerAlert('info', 'Template Details', 
                                  `Template: ${template.name}\n` +
                                  `Code: ${template.code}\n` +
                                  `Permissions: ${configuredCount} screens configured\n` +
                                  `Created By: ${template.createdBy || getLoggedInUserName()}`
                                );
                              } else {
                                triggerAlert('error', 'Error', 'Failed to fetch template details.');
                              }
                            } catch (err) {
                              console.error(err);
                              triggerAlert('error', 'Error', 'Failed to fetch template details.');
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          <Eye size={14} /> View
                        </button>
                        <button 
                          className="aa-btn-primary-sm"
                          onClick={() => applyTemplate(template)}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="aa-info-box">
              <Info size={18} />
              <p>
                <strong>No template selected.</strong> You will create fresh permissions in the next step.
                <br />
                <span style={{ fontSize: '12px', color: '#475569' }}>
                  All permissions will start as <strong>No Access</strong> and you can add them manually.
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Step 3: Manage Access ──
  const renderStep3 = () => {
    const counts = getPermissionStateCounts(accessGroups);

    const filteredGroups = accessGroups.map(group => ({
      ...group,
      screens: group.screens.filter(screen => 
        screen.name.toLowerCase().includes(searchTermStep3.toLowerCase()) ||
        group.name.toLowerCase().includes(searchTermStep3.toLowerCase())
      )
    })).filter(group => group.screens.length > 0);

    return (
      <div className="aa-step-content">
        <div className="aa-step-header">
          <h3>Manage Access by Group</h3>
          {selectedTemplate && (
            <p style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
              <Check size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Template "{selectedTemplate.name}" is applied. Blue checkmarks show template permissions.
            </p>
          )}
          {!selectedTemplate && (
            <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
              <Info size={14} style={{ display: 'inline', marginRight: '4px' }} />
              No template applied. All permissions start as <strong>No Access</strong>.
            </p>
          )}
        </div>

        <div className="aa-search-bar" style={{ marginBottom: '16px' }}>
          <Search className="aa-search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search groups or screens..." 
            value={searchTermStep3}
            onChange={(e) => setSearchTermStep3(e.target.value)}
          />
        </div>

        <div className="aa-permission-legend">
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-blue"><Check size={12} strokeWidth={3} /></div>
            <span>From Template {selectedTemplate ? `(${selectedTemplate.name})` : ''}</span>
          </div>
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-green"><Check size={12} strokeWidth={3} /></div>
            <span>Extra Added</span>
          </div>
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-red"><X size={12} strokeWidth={3} /></div>
            <span>Revoked</span>
          </div>
          <div className="aa-legend-item">
            <div className="aa-chk aa-chk-empty"></div>
            <span>No Access</span>
          </div>
        </div>

        <div className="aa-stats-bar">
          <div className="aa-stat-item">
            <span className="aa-stat-label">From Template</span>
            <span className="aa-stat-value aa-stat-blue">{counts.blue}</span>
          </div>
          <div className="aa-stat-divider"></div>
          <div className="aa-stat-item">
            <span className="aa-stat-label">Extra Added</span>
            <span className="aa-stat-value aa-stat-green">{counts.green}</span>
          </div>
          <div className="aa-stat-divider"></div>
          <div className="aa-stat-item">
            <span className="aa-stat-label">Revoked</span>
            <span className="aa-stat-value aa-stat-red">{counts.red}</span>
          </div>
          <div className="aa-stat-divider"></div>
          <div className="aa-stat-item">
            <span className="aa-stat-label">No Access</span>
            <span className="aa-stat-value">{counts.empty}</span>
          </div>
        </div>

        <div className="aa-table-container">
          <table className="aa-table aa-access-table">
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
              {filteredGroups.map((group) => {
                const isExpanded = expandedGroups[group.id];
                const permissionCount = getGroupPermissionCount(group);
                
                return (
                  <React.Fragment key={group.id}>
                    <tr 
                      className={`aa-group-row ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleGroup(group.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="aa-group-name">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <group.icon size={16} className="aa-group-icon" />
                          <span>{group.name}</span>
                          <span className="aa-group-count">({group.screens.length} screens)</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{group.screens.length}</td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.view, group.id, null, 'view')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.create, group.id, null, 'create')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.edit, group.id, null, 'edit')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {renderCheckbox(group.delete, group.id, null, 'delete')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`aa-badge aa-badge-${group.badge}`}>
                          {permissionCount > 0 ? `${permissionCount} perms` : group.badgeText}
                        </span>
                      </td>
                    </tr>

                    {isExpanded && group.screens.map((screen) => (
                      <tr key={screen.id} className="aa-screen-row">
                        <td className="aa-screen-name">
                          <div className="aa-screen-indent">
                            <FileText size={14} className="aa-screen-icon" />
                            <span>{screen.name}</span>
                          </div>
                        </td>
                        <td></td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.view, group.id, screen.id, 'view')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.create, group.id, screen.id, 'create')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.edit, group.id, screen.id, 'edit')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderCheckbox(screen.delete, group.id, screen.id, 'delete')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`aa-badge aa-badge-${screen.badge}`}>
                            {screen.badgeText}
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
      </div>
    );
  };

  // ── Step 4: Summary ──
  const renderStep4 = () => {
    const counts = getPermissionStateCounts(accessGroups);
    let totalScreens = 0;
    accessGroups.forEach(group => {
      totalScreens += group.screens.length;
    });

    const selectedEmployeeDetails = selectedEmployees
      .map(empId => {
        const emp = employees.find(e => (e.empId || e.id) === empId);
        return emp ? {
          id: emp.empId || emp.id,
          name: `${emp.fstNm || emp.firstName || ''} ${emp.lstNm || emp.lastName || ''}`.trim(),
          code: emp.empCode || emp.employeeCode || '',
          role: emp.role || emp.designation || 'Employee',
          email: emp.email || ''
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => String(a.code).localeCompare(String(b.code)));

    return (
      <div className="aa-step-content">
        <div className="aa-step-header">
          <h3>Access Summary</h3>
          <p>Review the permissions that will be applied to the selected employees.</p>
          
          <div className="aa-summary-template-info">
            {selectedTemplate && (
              <span className="aa-summary-template-badge">
                <CheckCircle2 size={14} /> Template: <strong>{selectedTemplate.name}</strong> is applied
              </span>
            )}
            {!selectedTemplate && (
              <span className="aa-summary-template-badge aa-summary-template-custom">
                <Info size={14} /> Custom permissions (not saved as template)
              </span>
            )}
          </div>
        </div>

        <div className="aa-summary-combined-row">
          <div className="aa-summary-employees-section">
            <div className="aa-summary-employees-header">
              <h4>
                <Users size={18} />
                Selected Employees ({selectedEmployees.length})
              </h4>
              <button 
                className="aa-btn-primary-sm"
                onClick={() => setShowAddEmployeeModal(true)}
              >
                <UserPlus size={14} /> Add Employee
              </button>
            </div>
            
            <div className="aa-summary-employees-list">
              {selectedEmployeeDetails.length === 0 ? (
                <div className="aa-empty">No employees selected. Please add employees.</div>
              ) : (
                selectedEmployeeDetails.map(emp => (
                  <div key={emp.id} className="aa-summary-employee-item">
                    <div className="aa-summary-employee-info">
                      <div className="aa-avatar" style={{ width: '32px', height: '32px', fontSize: '11px' }}>
                        {emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="aa-summary-employee-name">{emp.name}</div>
                        <div className="aa-summary-employee-details">{emp.code} • {emp.role} • {emp.email}</div>
                      </div>
                    </div>
                    <button 
                      className="aa-btn-danger-sm"
                      onClick={() => handleRemoveEmployee(emp.id)}
                      title="Remove Employee"
                    >
                      <UserMinus size={14} /> Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="aa-summary-stats-section">
            <div className="aa-summary-stats-grid">
              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini blue">
                  <Users size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Employees</span>
                  <span className="aa-stat-value-mini">{selectedEmployees.length}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini purple">
                  <Folder size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Screens</span>
                  <span className="aa-stat-value-mini">{totalScreens}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini blue">
                  <Shield size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">From Template</span>
                  <span className="aa-stat-value-mini">{counts.blue}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini green">
                  <Plus size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Extra Added</span>
                  <span className="aa-stat-value-mini">{counts.green}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini red">
                  <X size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">Revoked</span>
                  <span className="aa-stat-value-mini">{counts.red}</span>
                </div>
              </div>

              <div className="aa-stat-card-mini">
                <div className="aa-stat-icon-mini orange">
                  <Minus size={16} />
                </div>
                <div>
                  <span className="aa-stat-label-mini">No Access</span>
                  <span className="aa-stat-value-mini">{counts.empty}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="aa-summary-section">
          <div className="aa-summary-section-header">
            <h4>
              <Shield size={18} />
              Permission Preview
            </h4>
          </div>
          
          <div className="aa-preview-legend">
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-blue"></span> Template Access</span>
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-green"></span> Extra Added</span>
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-red"></span> Revoked</span>
            <span className="aa-preview-legend-item"><span className="aa-dot aa-dot-empty"></span> No Access</span>
          </div>

          <div className="aa-table-container">
            <table className="aa-table aa-access-table">
              <thead>
                <tr>
                  <th width="30%">Group / Screen</th>
                  <th width="14%" style={{ textAlign: 'center' }}>View</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Create</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Edit</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Delete</th>
                  <th width="14%" style={{ textAlign: 'center' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {accessGroups.map((group) => {
                  const isExpanded = expandedGroups[group.id];
                  
                  return (
                    <React.Fragment key={group.id}>
                      <tr className="aa-group-row" onClick={() => toggleGroup(group.id)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div className="aa-group-name">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <group.icon size={16} className="aa-group-icon" />
                            <span>{group.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.view)}</td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.create)}</td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.edit)}</td>
                        <td style={{ textAlign: 'center' }}>{renderPreviewIcon(group.delete)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`aa-badge aa-badge-${getPermissionColor(group.view)}`}>
                            {getPermissionDisplay(group.view)}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && group.screens.map((screen) => {
                        return (
                          <tr key={screen.id} className="aa-screen-row">
                            <td className="aa-screen-name">
                              <div className="aa-screen-indent">
                                <FileText size={14} className="aa-screen-icon" />
                                <span>{screen.name}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.view)}</td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.create)}</td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.edit)}</td>
                            <td style={{ textAlign: 'center' }}>{renderPreviewIcon(screen.delete)}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`aa-badge aa-badge-${getPermissionColor(screen.view)}`}>
                                {getPermissionDisplay(screen.view)}
                              </span>
                            </td>
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

        <div className="aa-summary-footer">
          <div className="aa-summary-meta">
            <span>Last Updated: {new Date().toLocaleString()}</span>
            <span>Updated By: {sessionStorage.getItem("userName") || 'System'}</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Add Employee Modal ──
  const renderAddEmployeeModal = () => {
    if (!showAddEmployeeModal) return null;

    const filteredAvailableEmployees = availableEmployees
      .filter(emp => {
        const search = employeeSearchTerm.toLowerCase();
        const name = `${emp.fstNm || emp.firstName || ''} ${emp.lstNm || emp.lastName || ''}`.toLowerCase();
        const code = (emp.empCode || emp.employeeCode || '').toLowerCase();
        const email = (emp.email || '').toLowerCase();
        return name.includes(search) || code.includes(search) || email.includes(search);
      })
      .sort((a, b) => {
        const codeA = a.empCode || a.employeeCode || a.id || '';
        const codeB = b.empCode || b.employeeCode || b.id || '';
        return String(codeA).localeCompare(String(codeB));
      });

    return (
      <div className="aa-modal-overlay" onClick={() => { setShowAddEmployeeModal(false); setEmployeeSearchTerm(''); }}>
        <div className="aa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="aa-modal-header">
            <h3>Add Employee</h3>
            <button className="aa-modal-close" onClick={() => { setShowAddEmployeeModal(false); setEmployeeSearchTerm(''); }}>
              <X size={18} />
            </button>
          </div>
          <div className="aa-modal-body">
            <p style={{ marginBottom: '12px', color: '#64748b', fontSize: '14px' }}>
              Select an employee to add to the access list.
            </p>
            <div className="aa-search-bar" style={{ marginBottom: '16px' }}>
              <Search className="aa-search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={employeeSearchTerm}
                onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="aa-list" style={{ maxHeight: '300px' }}>
              {filteredAvailableEmployees.length === 0 ? (
                <div className="aa-empty">No employees available to add.</div>
              ) : (
                filteredAvailableEmployees.map(emp => {
                  const empId = emp.empId || emp.id;
                  const name = `${emp.fstNm || emp.firstName || ''} ${emp.lstNm || emp.lastName || ''}`.trim();
                  const code = emp.empCode || emp.employeeCode || '';
                  const role = emp.role || emp.designation || 'Employee';
                  const email = emp.email || '';
                  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                  return (
                    <div 
                      key={empId} 
                      className="aa-list-item" 
                      onClick={() => handleAddEmployee(empId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="aa-avatar">{initials || 'U'}</div>
                      <div className="aa-info">
                        <h5>{code ? `${code} - ${name}` : name}</h5>
                        <p>{role} {email ? `| ${email}` : ''}</p>
                      </div>
                      <button 
                        className="aa-btn-primary-sm"
                        onClick={(e) => { e.stopPropagation(); handleAddEmployee(empId); }}
                      >
                        Add
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="aa-modal-footer">
            <button className="aa-btn-outline" onClick={() => { setShowAddEmployeeModal(false); setEmployeeSearchTerm(''); }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Save Template Modal ──
  const renderSaveTemplateModal = () => {
    if (!showSaveTemplateModal) return null;

    return (
      <div className="aa-modal-overlay" onClick={() => setShowSaveTemplateModal(false)}>
        <div className="aa-modal" onClick={(e) => e.stopPropagation()}>
          <div className="aa-modal-header">
            <h3>{selectedTemplate ? 'Update Template' : 'Save as Template'}</h3>
            <button className="aa-modal-close" onClick={() => setShowSaveTemplateModal(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="aa-modal-body">
            <p style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}>
              {selectedTemplate 
                ? 'Update the template with current permissions.' 
                : 'Save the current permissions as a template for future use.'}
            </p>
            <div className="aa-form-group">
              <label>Template Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
          <div className="aa-modal-footer">
            <button className="aa-btn-outline" onClick={() => setShowSaveTemplateModal(false)}>
              Cancel
            </button>
            <button className="aa-btn-primary" onClick={saveAsTemplate} disabled={loading}>
              {loading ? 'Saving...' : selectedTemplate ? 'Update Template' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Edit Template Modal ──
  const renderEditTemplateModal = () => {
    if (!showEditTemplateModal) return null;

    return (
      <div className="aa-modal-overlay" onClick={() => setShowEditTemplateModal(false)}>
        <div className="aa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
          <div className="aa-modal-header">
            <h3>{templateToEdit ? 'Edit Template' : 'Create New Template'}</h3>
            <button className="aa-modal-close" onClick={() => setShowEditTemplateModal(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="aa-modal-body">
            {templateToEdit && (
              <div className="aa-edit-info">
                <span className="aa-edit-template-code">Code: {templateToEdit.code}</span>
                {templateToEdit.isDraft && (
                  <span className="aa-template-status draft">Draft</span>
                )}
              </div>
            )}
            
            <div className="aa-form-group">
              <label>Template Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            
            <div className="aa-form-group" style={{ marginTop: '12px' }}>
              <label>Description</label>
              <textarea 
                value={templateDescription} 
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter template description"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div className="aa-edit-actions-info">
              <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                <Check size={14} style={{ display: 'inline', marginRight: '4px', color: '#10b981' }} />
                You can add or remove permissions in the <strong>Manage Access</strong> section.
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                <Users size={14} style={{ display: 'inline', marginRight: '4px', color: '#2563eb' }} />
                You can add or remove employees in the <strong>Summary</strong> section.
              </p>
            </div>
          </div>
          <div className="aa-modal-footer">
            <button className="aa-btn-outline" onClick={() => setShowEditTemplateModal(false)}>
              Cancel
            </button>
            <button 
              className="aa-btn-outline aa-btn-warning" 
              onClick={() => {
                if (templateToEdit) {
                  setUpdateOrSaveModal(true);
                } else {
                  setSaveAsDraft(true);
                  saveEditedTemplate('save');
                }
              }}
              disabled={loading}
            >
              <FileText size={16} /> Save as Draft
            </button>
            <button 
              className="aa-btn-primary" 
              onClick={() => {
                if (templateToEdit) {
                  setUpdateOrSaveModal(true);
                } else {
                  setSaveAsDraft(false);
                  saveEditedTemplate('save');
                }
              }}
              disabled={loading}
            >
              {loading ? 'Saving...' : (
                <>
                  <Save size={16} /> {templateToEdit ? 'Save Changes' : 'Save Template'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Delete Confirmation Modal ──
  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className="aa-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
        <div className="aa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
          <div className="aa-modal-header">
            <h3>Confirm Delete</h3>
            <button className="aa-modal-close" onClick={() => setShowDeleteConfirm(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="aa-modal-body">
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <p className="aa-modal-warning" style={{ color: '#ef4444', marginTop: '12px', fontWeight: '500' }}>
              This will permanently remove the template from the system.
            </p>
          </div>
          <div className="aa-modal-footer">
            <button className="aa-btn-outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </button>
            <button className="aa-btn-danger" onClick={confirmDeleteTemplate} disabled={loading}>
              {loading ? 'Deleting...' : (
                <>
                  <Trash2 size={16} /> Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Mode Selector with Radio Buttons ──
  const renderModeSelector = () => (
    <div className="aa-mode-selector">
      <div className="aa-mode-radio-group">
        <label className={`aa-mode-radio-label ${pageMode === 'direct' ? 'active' : ''}`}>
          <input
            type="radio"
            name="pageMode"
            value="direct"
            checked={pageMode === 'direct'}
            onChange={() => {
              setPageMode('direct');
              setCurrentStep(1);
              if (isTemplateEditMode) closeTemplateEditMode();
              if (isCreateTemplateMode) closeCreateTemplateMode();
            }}
            className="aa-mode-radio-input"
          />
          <div className="aa-mode-radio-content">
            <div className="aa-mode-icon">
              <UsersIcon size={24} />
            </div>
            <div className="aa-mode-content">
              <span className="aa-mode-title">Direct Assign Access</span>
              <span className="aa-mode-desc">Assign permissions directly to employees without managing templates</span>
            </div>
          </div>
        </label>
      </div>

      <div className="aa-mode-radio-group">
        <label className={`aa-mode-radio-label ${pageMode === 'template' ? 'active' : ''}`}>
          <input
            type="radio"
            name="pageMode"
            value="template"
            checked={pageMode === 'template'}
            onChange={() => {
              setPageMode('template');
              initializeAccessGroups();
              setSelectedEmployees([]);
              setSelectedTemplate(null);
              if (isTemplateEditMode) closeTemplateEditMode();
              if (isCreateTemplateMode) closeCreateTemplateMode();
            }}
            className="aa-mode-radio-input"
          />
          <div className="aa-mode-radio-content">
            <div className="aa-mode-icon">
              <FileTextIcon size={24} />
            </div>
            <div className="aa-mode-content">
              <span className="aa-mode-title">Template Management</span>
              <span className="aa-mode-desc">Create, edit, copy and manage access templates</span>
            </div>
          </div>
        </label>
      </div>
    </div>
  );

  // ── Template Management View ──
  const renderTemplateManagement = () => {
    // Check if in Create Template Mode
    if (isCreateTemplateMode) {
      return (
        <div className="aa-template-edit-container">
          {/* Back Button */}
          <div style={{ marginBottom: '16px' }}>
            <button 
              className="aa-btn-outline-sm" 
              onClick={closeCreateTemplateMode}
            >
              <ArrowLeft size={14} /> Back to Templates
            </button>
          </div>

          {/* Create Template Stepper */}
          {renderCreateTemplateStepper()}

          {/* Create Template Content */}
          <div className="aa-step-wrapper-content">
            {createTemplateStep === 1 && renderCreateTemplateManageAccess()}
            {createTemplateStep === 2 && renderCreateTemplateSummary()}
          </div>

          {/* Create Template Bottom Bar */}
          <div className="aa-bottom-bar-sticky">
            <div className="aa-bottom-bar-content">
              <div className="aa-bottom-left">
                {createTemplateStep > 1 && (
                  <button className="aa-btn-outline" onClick={handleCreateTemplatePrev}>
                    <ChevronLeft size={16} /> Previous
                  </button>
                )}
                <button className="aa-btn-outline" onClick={closeCreateTemplateMode}>
                  <X size={16} /> Cancel
                </button>
              </div>
              
              <div className="aa-bottom-right">
                {createTemplateStep < 2 ? (
                  <button className="aa-btn-primary" onClick={handleCreateTemplateNext}>
                    Next Step <ArrowRight size={16} />
                  </button>
                ) : (
                  <div className="aa-bottom-actions">
                    <button 
                      className="aa-btn-primary" 
                      onClick={() => {
                        setCreateTemplateIsDraft(false);
                        saveCreateTemplate();
                      }}
                      disabled={loading}
                    >
                      <Save size={16} /> Save Template
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Check if in Edit Template Mode
    if (isTemplateEditMode) {
      return (
        <div className="aa-template-edit-container">
          {/* Back Button */}
          <div style={{ marginBottom: '16px' }}>
            <button 
              className="aa-btn-outline-sm" 
              onClick={closeTemplateEditMode}
            >
              <ArrowLeft size={14} /> Back to Templates
            </button>
          </div>

          {/* Template Edit Stepper */}
          {renderTemplateEditStepper()}

          {/* Template Edit Content */}
          <div className="aa-step-wrapper-content">
            {templateEditStep === 1 && renderTemplateEditManageAccess()}
            {templateEditStep === 2 && renderTemplateEditSummary()}
          </div>

          {/* Template Edit Bottom Bar */}
          <div className="aa-bottom-bar-sticky">
            <div className="aa-bottom-bar-content">
              <div className="aa-bottom-left">
                {templateEditStep > 1 && (
                  <button className="aa-btn-outline" onClick={handleTemplateEditPrev}>
                    <ChevronLeft size={16} /> Previous
                  </button>
                )}
                <button className="aa-btn-outline" onClick={closeTemplateEditMode}>
                  <X size={16} /> Cancel
                </button>
              </div>
              
              <div className="aa-bottom-right">
                {templateEditStep < 2 ? (
                  <button className="aa-btn-primary" onClick={handleTemplateEditNext}>
                    Next Step <ArrowRight size={16} />
                  </button>
                ) : (
                  <div className="aa-bottom-actions">
                    <button 
                      className="aa-btn-primary" 
                      onClick={() => {
                        setTemplateEditIsDraft(false);
                        setUpdateOrSaveModal(true);
                      }}
                      disabled={loading}
                    >
                      <Save size={16} /> Save Template
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default Template Management View
    return (
      <div className="aa-template-management">
        <div className="aa-template-management-header">
          <div>
            <h3>Template Management</h3>
            <p>Create, edit, copy and manage access templates</p>
          </div>
          <button 
            className="aa-btn-primary" 
            onClick={openCreateTemplateMode}
          >
            <Plus size={16} /> Create New Template
          </button>
        </div>

        <div className="aa-template-list-container">
          <div className="aa-template-list-header">
            <div className="aa-template-list-stats">
              <span>Total Templates: <strong>{templates.length}</strong></span>
            </div>
            <div className="aa-search-bar" style={{ marginBottom: 0, width: '280px' }}>
              <Search className="aa-search-icon" size={16} />
              <input 
                type="text" 
                placeholder="Search templates..." 
                value={searchTermStep2}
                onChange={(e) => setSearchTermStep2(e.target.value)}
              />
            </div>
          </div>

          <div className="aa-template-grid">
            {templates.filter(t => 
              t.name?.toLowerCase().includes(searchTermStep2.toLowerCase()) ||
              t.code?.toLowerCase().includes(searchTermStep2.toLowerCase())
            ).length === 0 ? (
              <div className="aa-empty">No templates found. Create a new template.</div>
            ) : (
              templates.filter(t => 
                t.name?.toLowerCase().includes(searchTermStep2.toLowerCase()) ||
                t.code?.toLowerCase().includes(searchTermStep2.toLowerCase())
              ).map(template => (
                <div key={template.id} className="aa-template-item">
                  <div className="aa-template-item-header">
                    <div className="aa-template-item-info">
                      <h4>{template.name}</h4>
                      <span className="aa-template-code">{template.code}</span>
                    </div>
                    <div className="aa-template-item-actions">
                      <button 
                        className="aa-btn-outline-sm" 
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const response = await fetch(`${apiBaseUrl}/api/rbac/roles/${template.id}/permissions`, {
                              headers: getAuthHeaders()
                            });
                            if (response.ok) {
                              const permsList = await response.json();
                              const configuredCount = permsList.filter(p => p.viewFlg || p.addFlg || p.editFlg || p.deleteFlg).length;
                              triggerAlert('info', 'Template Details', 
                                `Template: ${template.name}\n` +
                                `Code: ${template.code}\n` +
                                `Permissions: ${configuredCount} screens configured\n` +
                                `Created By: ${template.createdBy || 'System'}`
                              );
                            } else {
                              triggerAlert('error', 'Error', 'Failed to fetch template details.');
                            }
                          } catch (err) {
                            console.error(err);
                            triggerAlert('error', 'Error', 'Failed to fetch template details.');
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        <Eye size={14} /> View
                      </button>
                      
                      <button 
                        className="aa-btn-outline-sm" 
                        onClick={() => openTemplateEditMode(template)}
                        title="Edit Template"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      
                      <button 
                        className="aa-btn-danger-sm" 
                        onClick={() => deleteTemplate(template.id)}
                        title="Delete Template"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                  <div className="aa-template-item-body">
                    <div className="aa-template-meta">
                      <span>Permissions: <strong>{template.permissionsCount !== undefined ? template.permissionsCount : Object.keys(template.permissions || {}).length}</strong> screens</span>
                      <span>Created By: <strong>{template.createdBy || getLoggedInUserName()}</strong></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render ──
  return (
    <div className="cc-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />
      
      <div className="cc-shell">
        <Header 
          title="Assign Access" 
          subtitle="Assign and manage access permissions for employees"
          onLogout={onLogout}
          userRole={userRole}
        />

        <main className="cc-main">
          <div className="aa-container">

            {/* Mode Selector with Radio Buttons */}
            {renderModeSelector()}

            {pageMode === 'direct' ? (
              <>
                {/* Stepper Navigation */}
                {renderStepper()}

                {/* Dynamic Step Content */}
                <div className="aa-step-wrapper-content">
                  {currentStep === 1 && renderStep1()}
                  {currentStep === 2 && renderStep2()}
                  {currentStep === 3 && renderStep3()}
                  {currentStep === 4 && renderStep4()}
                </div>

                {/* Bottom Bar with 2 Buttons: Save Access & Save as Draft */}
                <div className="aa-bottom-bar-sticky">
                  <div className="aa-bottom-bar-content">
                    <div className="aa-bottom-left">
                      {currentStep > 1 && (
                        <button className="aa-btn-outline" onClick={handlePrev}>
                          <ChevronLeft size={16} /> Previous
                        </button>
                      )}
                      <button className="aa-btn-outline" onClick={handleReset}>
                        <RotateCcw size={16} /> Reset
                      </button>
                    </div>
                    
                    <div className="aa-bottom-right">
                      {currentStep < 4 ? (
                        <button className="aa-btn-primary" onClick={handleNext}>
                          Next Step <ArrowRight size={16} />
                        </button>
                      ) : (
                        <div className="aa-bottom-actions">
                          <button 
                            className="aa-btn-primary" 
                            onClick={handleSaveAccess} 
                            disabled={loading || selectedEmployees.length === 0}
                          >
                            {loading ? (
                              <>Saving...</>
                            ) : (
                              <>
                                <Save size={16} /> Save Access
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Template Management Mode
              renderTemplateManagement()
            )}

          </div>
        </main>
      </div>

      {/* Add Employee Modal */}
      {renderAddEmployeeModal()}

      {/* Save Template Modal */}
      {renderSaveTemplateModal()}

      {/* Edit Template Modal */}
      {renderEditTemplateModal()}

      {/* Update or Save Modal */}
      {renderUpdateOrSaveModal()}

      {/* Delete Confirmation Modal */}
      {renderDeleteConfirmModal()}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </div>
  );
};

export default AssignAccess;
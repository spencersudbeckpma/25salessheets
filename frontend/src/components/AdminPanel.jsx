import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { Users, Building2, UserPlus, RefreshCw, Search, Shield, UserCog, ChevronRight, Wrench, AlertTriangle, CheckCircle2, ArrowRight, Trash2, Pencil, Settings, ToggleLeft, ToggleRight, Download, Package, FileText } from 'lucide-react';
import { Switch } from './ui/switch';

const API = process.env.REACT_APP_BACKEND_URL;

const AdminPanel = ({ user }) => {
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  
  // Modal states
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [selectedTeamForBranding, setSelectedTeamForBranding] = useState(null);
  
  // Branding form
  const [brandingForm, setBrandingForm] = useState({
    logo_url: '',
    primary_color: '#1e40af',
    accent_color: '#3b82f6',
    display_name: '',
    tagline: ''
  });
  
  // Feature flags modal
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [selectedTeamForFeatures, setSelectedTeamForFeatures] = useState(null);
  const [featuresForm, setFeaturesForm] = useState({
    activity: true,
    stats: true,
    team_view: true,
    suitability: true,
    pma_bonuses: true,
    docusphere: true,
    leaderboard: true,
    analytics: true,
    reports: true,
    team_mgmt: true,
    recruiting: false,
    interviews: true,
    fact_finder: true,
    sna: true,
    npa: true,
    new_faces: true
  });
  
  // Team Customization modal (Phase 1)
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [selectedTeamForCustomization, setSelectedTeamForCustomization] = useState(null);
  const [customizationForm, setCustomizationForm] = useState({
    features: {},
    role_tab_overrides: {
      agent: { hidden_tabs: [] },
      district_manager: { hidden_tabs: [] },
      regional_manager: { hidden_tabs: [] }
    },
    ui_settings: {
      default_landing_tab: 'activity',
      default_leaderboard_period: 'weekly'
    },
    branding: {
      logo_url: '',
      primary_color: '#1e40af',
      accent_color: '#3b82f6',
      display_name: '',
      tagline: ''
    },
    view_settings: {
      kpi_cards: [
        { id: 'dials', label: 'Dials', enabled: true },
        { id: 'contacts', label: 'Contacts', enabled: true },
        { id: 'appointments', label: 'Appointments', enabled: true },
        { id: 'presentations', label: 'Presentations', enabled: true },
        { id: 'sales', label: 'Sales', enabled: true },
        { id: 'premium', label: 'Premium', enabled: true },
        { id: 'referrals', label: 'Referrals', enabled: true },
        { id: 'lives', label: 'Lives', enabled: true }
      ],
      subtabs: {
        new_faces: true,
        sna: true,
        npa: true
      }
    }
  });
  const [customizationLoading, setCustomizationLoading] = useState(false);
  const [customizationTab, setCustomizationTab] = useState('features');
  
  // Form states
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState('');
  const [selectedRoleForAssignment, setSelectedRoleForAssignment] = useState('');
  
  // New user form
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    team_id: '',
    manager_id: ''
  });
  
  // Edit user modal
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    id: '',
    name: '',
    email: '',
    role: '',
    team_id: '',
    manager_id: ''
  });
  
  // Hierarchy repair states
  const [hierarchyData, setHierarchyData] = useState({});
  const [repairLoading, setRepairLoading] = useState({});
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [selectedTeamForRepair, setSelectedTeamForRepair] = useState(null);
  const [managerAssignments, setManagerAssignments] = useState({});
  
  // Diagnostics states
  const [diagnosticsData, setDiagnosticsData] = useState(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  
  // Unassigned users states
  const [unassignedData, setUnassignedData] = useState(null);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [selectedUnassignedUsers, setSelectedUnassignedUsers] = useState([]);
  const [assignToTeamId, setAssignToTeamId] = useState('');
  const [assignManagerId, setAssignManagerId] = useState('');
  
  // Orphaned activities states
  const [orphanedActivitiesData, setOrphanedActivitiesData] = useState(null);
  const [orphanedActivitiesLoading, setOrphanedActivitiesLoading] = useState(false);
  const [showFixOrphanedModal, setShowFixOrphanedModal] = useState(false);
  const [fixOrphanedResult, setFixOrphanedResult] = useState(null);
  
  // Sub-tabs diagnostic states (New Faces, SNA, NPA)
  const [subtabsDiagnostic, setSubtabsDiagnostic] = useState(null);
  const [subtabsDiagnosticLoading, setSubtabsDiagnosticLoading] = useState(false);
  const [subtabsMigrationResult, setSubtabsMigrationResult] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, usersRes] = await Promise.all([
        axios.get(`${API}/api/admin/teams`, { headers }),
        axios.get(`${API}/api/admin/users`, { headers })
      ]);
      setTeams(teamsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // Download PDF using blob (handles auth properly)
  const handleDownloadPdf = async (endpoint, filename) => {
    try {
      toast.info('Generating PDF...');
      const response = await axios.get(`${API}${endpoint}`, {
        headers,
        responseType: 'blob'
      });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.detail || 'Failed to download PDF');
    }
  };

  // Download CSV using blob (handles auth properly)
  const handleDownloadCsv = async (endpoint, filename) => {
    try {
      toast.info('Generating CSV...');
      const response = await axios.get(`${API}${endpoint}`, {
        headers,
        responseType: 'blob'
      });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('CSV downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.detail || 'Failed to download CSV');
    }
  };

  // Load team full configuration for customization modal
  const loadTeamCustomization = async (teamId, teamName) => {
    setSelectedTeamForCustomization({ id: teamId, name: teamName });
    setCustomizationLoading(true);
    setShowCustomizationModal(true);
    
    try {
      const response = await axios.get(`${API}/api/admin/teams/${teamId}/full-config`, { headers });
      setCustomizationForm({
        features: response.data.features,
        role_tab_overrides: response.data.role_tab_overrides,
        ui_settings: response.data.ui_settings,
        branding: response.data.branding,
        view_settings: response.data.view_settings || {
          kpi_cards: [],
          subtabs: { new_faces: true, sna: true, npa: true }
        }
      });
    } catch (error) {
      console.error('Error loading team config:', error);
      toast.error('Failed to load team configuration');
    } finally {
      setCustomizationLoading(false);
    }
  };

  // Save team customization
  const saveTeamCustomization = async () => {
    if (!selectedTeamForCustomization) return;
    
    setCustomizationLoading(true);
    try {
      await axios.put(
        `${API}/api/admin/teams/${selectedTeamForCustomization.id}/full-config`,
        customizationForm,
        { headers }
      );
      toast.success('Team configuration saved!');
      setShowCustomizationModal(false);
      fetchData(); // Refresh teams list
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error(error.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setCustomizationLoading(false);
    }
  };

  // Toggle a feature flag
  const toggleFeature = (feature) => {
    setCustomizationForm(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature]
      }
    }));
  };

  // Toggle a hidden tab for a role
  const toggleRoleTab = (role, tab) => {
    setCustomizationForm(prev => {
      const currentHidden = prev.role_tab_overrides[role]?.hidden_tabs || [];
      const newHidden = currentHidden.includes(tab)
        ? currentHidden.filter(t => t !== tab)
        : [...currentHidden, tab];
      
      return {
        ...prev,
        role_tab_overrides: {
          ...prev.role_tab_overrides,
          [role]: { hidden_tabs: newHidden }
        }
      };
    });
  };

  // Toggle KPI card visibility
  const toggleKpiCard = (cardId) => {
    setCustomizationForm(prev => ({
      ...prev,
      view_settings: {
        ...prev.view_settings,
        kpi_cards: prev.view_settings.kpi_cards.map(card =>
          card.id === cardId ? { ...card, enabled: !card.enabled } : card
        )
      }
    }));
  };

  // Move KPI card up in order
  const moveKpiCardUp = (index) => {
    if (index === 0) return;
    setCustomizationForm(prev => {
      const cards = [...prev.view_settings.kpi_cards];
      [cards[index - 1], cards[index]] = [cards[index], cards[index - 1]];
      return {
        ...prev,
        view_settings: { ...prev.view_settings, kpi_cards: cards }
      };
    });
  };

  // Move KPI card down in order
  const moveKpiCardDown = (index) => {
    setCustomizationForm(prev => {
      const cards = [...prev.view_settings.kpi_cards];
      if (index >= cards.length - 1) return prev;
      [cards[index], cards[index + 1]] = [cards[index + 1], cards[index]];
      return {
        ...prev,
        view_settings: { ...prev.view_settings, kpi_cards: cards }
      };
    });
  };

  // Toggle sub-tab visibility
  const toggleSubtab = (subtab) => {
    setCustomizationForm(prev => ({
      ...prev,
      view_settings: {
        ...prev.view_settings,
        subtabs: {
          ...prev.view_settings.subtabs,
          [subtab]: !prev.view_settings.subtabs[subtab]
        }
      }
    }));
  };

  // Download State Manager Pack (roster PDF + guide)
  const handleDownloadSmPack = async (teamId, teamName) => {
    try {
      toast.info('Downloading State Manager Pack...');
      const safeName = teamName.replace(/\s+/g, '_');
      
      // Download roster PDF
      await handleDownloadPdf(`/api/admin/teams/${teamId}/roster/pdf`, `${safeName}_Roster.pdf`);
      
      // Small delay then download guide
      setTimeout(async () => {
        await handleDownloadPdf('/api/admin/guides/state-manager', 'State_Manager_Guide.pdf');
        toast.success('State Manager Pack complete!');
      }, 500);
    } catch (error) {
      console.error('SM Pack download error:', error);
      toast.error('Failed to download State Manager Pack');
    }
  };

  // Fetch broken hierarchy for a team
  const fetchBrokenHierarchy = async (teamId) => {
    try {
      setRepairLoading(prev => ({ ...prev, [teamId]: true }));
      const res = await axios.get(`${API}/api/admin/teams/${teamId}/broken-hierarchy`, { headers });
      setHierarchyData(prev => ({ ...prev, [teamId]: res.data }));
      return res.data;
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
      toast.error('Failed to fetch hierarchy data');
      return null;
    } finally {
      setRepairLoading(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // Fetch broken hierarchies for all teams
  const fetchAllBrokenHierarchies = async () => {
    setRepairLoading(prev => ({ ...prev, all: true }));
    // Include ALL teams - no exclusions
    for (const team of teams) {
      await fetchBrokenHierarchy(team.id);
    }
    setRepairLoading(prev => ({ ...prev, all: false }));
    toast.success('Hierarchy check complete for all teams');
  };

  // Open repair modal for a team
  const openRepairModal = async (team) => {
    setSelectedTeamForRepair(team);
    const data = await fetchBrokenHierarchy(team.id);
    if (data && data.broken_users) {
      // Pre-populate manager assignments with first available state_manager
      const stateManager = data.potential_managers?.find(m => m.role === 'state_manager');
      const initialAssignments = {};
      data.broken_users.forEach(user => {
        if (stateManager) {
          initialAssignments[user.id] = stateManager.id;
        }
      });
      setManagerAssignments(initialAssignments);
    }
    setShowRepairModal(true);
  };

  // Repair hierarchy for a single team
  const repairTeamHierarchy = async (teamId) => {
    const data = hierarchyData[teamId];
    if (!data || data.broken_count === 0) {
      toast.success('No repairs needed for this team');
      return;
    }

    const repairs = data.broken_users.map(user => ({
      user_id: user.id,
      manager_id: managerAssignments[user.id] || null
    })).filter(r => r.manager_id); // Only include users with assigned managers

    if (repairs.length === 0) {
      toast.error('Please select a manager for each user');
      return;
    }

    try {
      setRepairLoading(prev => ({ ...prev, [teamId]: true }));
      const res = await axios.post(`${API}/api/admin/repair-manager-ids`, repairs, { headers });
      toast.success(`Repaired ${res.data.results.length} users`);
      // Refresh data
      await fetchBrokenHierarchy(teamId);
      setShowRepairModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to repair hierarchy');
    } finally {
      setRepairLoading(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // Force rebuild hierarchy for a single team
  const forceRebuildTeamHierarchy = async (teamId, teamName) => {
    if (!window.confirm(`This will FORCE REBUILD the entire hierarchy for ${teamName}.\n\nAll Regional Managers will report to the State Manager.\nAll District Managers will report to a Regional Manager.\nAll Agents will report to a District Manager.\n\nContinue?`)) {
      return;
    }
    
    setRepairLoading(prev => ({ ...prev, [teamId]: true }));
    
    try {
      const res = await axios.post(`${API}/api/admin/teams/${teamId}/force-rebuild-hierarchy`, {}, { headers });
      toast.success(`${res.data.message} - ${res.data.repairs_made} repairs made`);
      console.log('Force rebuild details:', res.data.details);
      
      // Refresh hierarchy data
      await fetchBrokenHierarchy(teamId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to rebuild hierarchy');
    } finally {
      setRepairLoading(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // Repair ALL teams at once (auto-assign to state_manager)
  const repairAllTeams = async () => {
    if (!window.confirm('This will automatically repair manager_id relationships for all teams (except Team Sudbeck). Continue?')) {
      return;
    }
    
    setRepairLoading(prev => ({ ...prev, all: true }));

    try {
      const res = await axios.post(`${API}/api/admin/auto-repair-all-teams`, {}, { headers });
      const data = res.data;
      
      toast.success(`${data.message}`);
      
      // Log details
      console.log('Repair results:', data.details);
      
      // Refresh all hierarchy data
      await fetchAllBrokenHierarchies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to repair teams');
    } finally {
      setRepairLoading(prev => ({ ...prev, all: false }));
    }
  };

  // Diagnostics functions
  const runDiagnoseInterviews = async () => {
    setDiagnosticsLoading(true);
    setDiagnosticsData(null);
    setFixResult(null);
    
    try {
      const res = await axios.get(`${API}/api/admin/diagnose-interviews`, { headers });
      setDiagnosticsData(res.data);
      toast.success('Diagnosis complete');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to run diagnostics');
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const runFixOrphanedInterviews = async () => {
    if (!window.confirm(
      'This will fix orphaned interviews by reassigning them to each team\'s State Manager.\n\n' +
      '✅ Team Sudbeck will NOT be affected\n' +
      '✅ Original interviewer_id will be preserved for audit\n' +
      '✅ Only interviews with deleted interviewers will be fixed\n\n' +
      'Continue?'
    )) {
      return;
    }
    
    setDiagnosticsLoading(true);
    setFixResult(null);
    
    try {
      const res = await axios.post(`${API}/api/admin/fix-orphaned-interviews`, {}, { headers });
      setFixResult(res.data);
      toast.success(`Fixed ${res.data.fixed_total} orphaned interviews`);
      
      // Re-run diagnostics to show updated state
      await runDiagnoseInterviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fix interviews');
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  // Unassigned users functions
  const runDiagnoseUnassignedUsers = async () => {
    setUnassignedLoading(true);
    setUnassignedData(null);
    setSelectedUnassignedUsers([]);
    setAssignToTeamId('');
    setAssignManagerId('');
    
    try {
      const res = await axios.get(`${API}/api/admin/diagnose-unassigned-users`, { headers });
      setUnassignedData(res.data);
      
      if (res.data.unassigned_count > 0) {
        toast.warning(`Found ${res.data.unassigned_count} users without team assignment`);
      } else {
        toast.success('All users have team assignments');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to diagnose unassigned users');
    } finally {
      setUnassignedLoading(false);
    }
  };

  const toggleSelectUnassignedUser = (userId) => {
    setSelectedUnassignedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const selectAllUnassignedUsers = () => {
    if (!unassignedData) return;
    setSelectedUnassignedUsers(unassignedData.unassigned_users.map(u => u.id));
  };

  const deselectAllUnassignedUsers = () => {
    setSelectedUnassignedUsers([]);
  };

  const runFixUnassignedUsers = async () => {
    if (selectedUnassignedUsers.length === 0) {
      toast.error('Please select at least one user to fix');
      return;
    }
    if (!assignToTeamId) {
      toast.error('Please select a team to assign users to');
      return;
    }
    
    const teamName = unassignedData?.available_teams?.find(t => t.id === assignToTeamId)?.name || 'selected team';
    
    if (!window.confirm(
      `This will assign ${selectedUnassignedUsers.length} user(s) to "${teamName}".\n\n` +
      'These users will then be able to access the application.\n\n' +
      'Continue?'
    )) {
      return;
    }
    
    setUnassignedLoading(true);
    
    try {
      const payload = {
        user_ids: selectedUnassignedUsers,
        team_id: assignToTeamId,
        set_manager_id: assignManagerId && assignManagerId !== 'none' ? assignManagerId : null
      };
      const res = await axios.post(`${API}/api/admin/fix-unassigned-users`, payload, { headers });
      toast.success(res.data.message);
      
      // Re-run diagnostics to show updated state
      await runDiagnoseUnassignedUsers();
      fetchData(); // Refresh users list
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fix unassigned users');
    } finally {
      setUnassignedLoading(false);
    }
  };

  // Orphaned Activities functions
  const runDiagnoseOrphanedActivities = async () => {
    setOrphanedActivitiesLoading(true);
    setOrphanedActivitiesData(null);
    setFixOrphanedResult(null);
    
    try {
      const res = await axios.get(`${API}/api/admin/diagnose-orphaned-activities`, { headers });
      setOrphanedActivitiesData(res.data);
      
      if (res.data.total_orphaned_activities > 0) {
        toast.warning(`Found ${res.data.total_orphaned_activities} activities with NULL team_id`);
      } else {
        toast.success('All activities have team_id assigned!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to diagnose orphaned activities');
    } finally {
      setOrphanedActivitiesLoading(false);
    }
  };

  const copyOrphanedDataToClipboard = () => {
    if (!orphanedActivitiesData) return;
    
    const text = JSON.stringify(orphanedActivitiesData, null, 2);
    navigator.clipboard.writeText(text);
    toast.success('Diagnostic data copied to clipboard');
  };

  const runFixOrphanedActivities = async () => {
    if (!orphanedActivitiesData) {
      toast.error('Please run diagnostic first');
      return;
    }
    
    if (orphanedActivitiesData.needs_team_assignment_activities > 0) {
      toast.error('Some users need team assignment first. Fix those users before running migration.');
      return;
    }
    
    if (orphanedActivitiesData.fixable_activities === 0) {
      toast.info('No fixable activities found');
      return;
    }
    
    setShowFixOrphanedModal(true);
  };

  const confirmFixOrphanedActivities = async () => {
    setOrphanedActivitiesLoading(true);
    setShowFixOrphanedModal(false);
    
    try {
      const res = await axios.post(`${API}/api/admin/migrate-activities-team-id`, {}, { headers });
      setFixOrphanedResult(res.data.migration_report);
      toast.success(`Fixed ${res.data.migration_report.total_updated} activities`);
      
      // Re-run diagnostic to show updated state
      await runDiagnoseOrphanedActivities();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fix orphaned activities');
    } finally {
      setOrphanedActivitiesLoading(false);
    }
  };

  // Sub-tabs Diagnostic Functions (New Faces, SNA, NPA)
  const runSubtabsDiagnostic = async () => {
    setSubtabsDiagnosticLoading(true);
    setSubtabsDiagnostic(null);
    setSubtabsMigrationResult(null);
    
    try {
      const res = await axios.get(`${API}/api/admin/diagnose-subtabs`, { headers });
      setSubtabsDiagnostic(res.data);
      
      const totalIssues = res.data.summary?.total_data_issues || 0;
      if (totalIssues > 0) {
        toast.warning(`Found ${totalIssues} records with missing team_id affecting rollups`);
      } else {
        toast.success('All sub-tab data has team_id assigned!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to run diagnostics');
    } finally {
      setSubtabsDiagnosticLoading(false);
    }
  };

  const runSubtabsMigration = async () => {
    if (!subtabsDiagnostic || subtabsDiagnostic.summary?.total_data_issues === 0) {
      toast.info('No issues to fix');
      return;
    }
    
    setSubtabsDiagnosticLoading(true);
    
    try {
      const res = await axios.post(`${API}/api/admin/migrate-all-team-ids`, {}, { headers });
      setSubtabsMigrationResult(res.data);
      toast.success(res.data.message);
      
      // Re-run diagnostic to show updated state
      await runSubtabsDiagnostic();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to run migration');
    } finally {
      setSubtabsDiagnosticLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }
    
    try {
      await axios.post(`${API}/api/admin/teams`, { name: newTeamName.trim() }, { headers });
      toast.success(`Team "${newTeamName}" created successfully`);
      setNewTeamName('');
      setShowNewTeamModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create team');
    }
  };

  const openBrandingModal = async (team) => {
    setSelectedTeamForBranding(team);
    // Load existing branding
    try {
      const res = await axios.get(`${API}/api/admin/teams/${team.id}/branding`, { headers });
      const b = res.data.branding || {};
      setBrandingForm({
        logo_url: b.logo_url || '',
        primary_color: b.primary_color || '#1e40af',
        accent_color: b.accent_color || '#3b82f6',
        display_name: b.display_name || '',
        tagline: b.tagline || ''
      });
    } catch (error) {
      setBrandingForm({
        logo_url: '',
        primary_color: '#1e40af',
        accent_color: '#3b82f6',
        display_name: '',
        tagline: ''
      });
    }
    setShowBrandingModal(true);
  };

  const handleSaveBranding = async () => {
    if (!selectedTeamForBranding) return;
    
    try {
      await axios.put(`${API}/api/admin/teams/${selectedTeamForBranding.id}/branding`, brandingForm, { headers });
      toast.success(`Branding updated for ${selectedTeamForBranding.name}`);
      setShowBrandingModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update branding');
    }
  };

  // Feature flags functions
  const openFeaturesModal = async (team) => {
    setSelectedTeamForFeatures(team);
    try {
      const res = await axios.get(`${API}/api/admin/teams/${team.id}/features`, { headers });
      setFeaturesForm(res.data.features);
    } catch (error) {
      // Use defaults if fetch fails
      setFeaturesForm({
        activity: true, stats: true, team_view: true, suitability: true,
        pma_bonuses: true, docusphere: true, leaderboard: true, analytics: true,
        reports: true, team_mgmt: true, recruiting: false, interviews: true
      });
    }
    setShowFeaturesModal(true);
  };

  const handleSaveFeatures = async () => {
    if (!selectedTeamForFeatures) return;
    try {
      await axios.put(`${API}/api/admin/teams/${selectedTeamForFeatures.id}/features`, { features: featuresForm }, { headers });
      toast.success(`Features updated for ${selectedTeamForFeatures.name}`);
      setShowFeaturesModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update features');
    }
  };

  const handleResetFeatures = async () => {
    if (!selectedTeamForFeatures) return;
    try {
      const res = await axios.post(`${API}/api/admin/teams/${selectedTeamForFeatures.id}/features/reset`, {}, { headers });
      setFeaturesForm(res.data.features);
      toast.success('Features reset to defaults');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset features');
    }
  };

  const handleCopyFeatures = async (sourceTeamId) => {
    if (!selectedTeamForFeatures || !sourceTeamId) return;
    try {
      const res = await axios.post(`${API}/api/admin/teams/${selectedTeamForFeatures.id}/features/copy-from/${sourceTeamId}`, {}, { headers });
      setFeaturesForm(res.data.features);
      toast.success(`Features copied from ${teams.find(t => t.id === sourceTeamId)?.name}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to copy features');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password || !newUserForm.role || !newUserForm.team_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const payload = {
        name: newUserForm.name,
        email: newUserForm.email,
        password: newUserForm.password,
        role: newUserForm.role,
        team_id: newUserForm.team_id,
        manager_id: newUserForm.manager_id && newUserForm.manager_id !== 'none' ? newUserForm.manager_id : null
      };
      
      await axios.post(`${API}/api/admin/users`, payload, { headers });
      toast.success(`User "${newUserForm.name}" created successfully`);
      setNewUserForm({ name: '', email: '', password: '', role: '', team_id: '', manager_id: '' });
      setShowCreateUserModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUser || !selectedTeamForAssignment) {
      toast.error('Please select a user and team');
      return;
    }
    
    try {
      const payload = {
        user_id: selectedUser.id,
        team_id: selectedTeamForAssignment
      };
      if (selectedRoleForAssignment && selectedRoleForAssignment !== 'keep_current') {
        payload.role = selectedRoleForAssignment;
      }
      
      await axios.post(`${API}/api/admin/users/assign-team`, payload, { headers });
      toast.success(`User assigned to team successfully`);
      setShowAssignUserModal(false);
      setSelectedUser(null);
      setSelectedTeamForAssignment('');
      setSelectedRoleForAssignment('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign user');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to DELETE "${userName}"? This will also delete all their activity data. This action cannot be undone.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API}/api/admin/users/${userId}`, { headers });
      toast.success(`User "${userName}" deleted successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const openEditUserModal = (user) => {
    setEditUserForm({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      team_id: user.team_id || '',
      manager_id: user.manager_id || ''
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      const payload = {};
      if (editUserForm.name) payload.name = editUserForm.name;
      if (editUserForm.email) payload.email = editUserForm.email;
      if (editUserForm.role) payload.role = editUserForm.role;
      if (editUserForm.team_id) payload.team_id = editUserForm.team_id;
      if (editUserForm.manager_id !== undefined) payload.manager_id = editUserForm.manager_id || null;

      await axios.put(`${API}/api/admin/users/${editUserForm.id}`, payload, { headers });
      toast.success('User updated successfully');
      setShowEditUserModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  // Get potential managers for selected team and role
  const getPotentialManagers = () => {
    if (!newUserForm.team_id || !newUserForm.role) return [];
    
    const teamUsers = users.filter(u => u.team_id === newUserForm.team_id);
    
    // Based on role, find valid managers
    const managerRoles = {
      'regional_manager': ['state_manager'],
      'district_manager': ['regional_manager'],
      'agent': ['district_manager']
    };
    
    const validManagerRoles = managerRoles[newUserForm.role] || [];
    return teamUsers.filter(u => validManagerRoles.includes(u.role));
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.team_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeam = selectedTeamFilter === 'all' || u.team_id === selectedTeamFilter;
    
    return matchesSearch && matchesTeam;
  });

  const roleColors = {
    'super_admin': 'bg-purple-100 text-purple-800',
    'state_manager': 'bg-blue-100 text-blue-800',
    'regional_manager': 'bg-green-100 text-green-800',
    'district_manager': 'bg-amber-100 text-amber-800',
    'agent': 'bg-slate-100 text-slate-800'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-panel">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Admin Panel
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage teams and users</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => setShowNewTeamModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="create-team-btn"
          >
            <Building2 className="w-4 h-4 mr-2" />
            New Team
          </Button>
          <Button 
            onClick={() => setShowCreateUserModal(true)}
            className="bg-green-600 hover:bg-green-700"
            data-testid="create-user-btn"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <Button
          variant={activeTab === 'teams' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('teams')}
          className={activeTab === 'teams' ? 'bg-slate-800 text-white' : ''}
          data-testid="teams-tab"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Teams ({teams.length})
        </Button>
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'bg-slate-800 text-white' : ''}
          data-testid="users-tab"
        >
          <Users className="w-4 h-4 mr-2" />
          Users ({users.length})
        </Button>
        <Button
          variant={activeTab === 'repair' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('repair')}
          className={activeTab === 'repair' ? 'bg-orange-600 text-white' : 'text-orange-600 border-orange-200'}
          data-testid="repair-tab"
        >
          <Wrench className="w-4 h-4 mr-2" />
          Repair Hierarchy
        </Button>
        <Button
          variant={activeTab === 'diagnostics' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('diagnostics')}
          className={activeTab === 'diagnostics' ? 'bg-purple-600 text-white' : 'text-purple-600 border-purple-200'}
          data-testid="diagnostics-tab"
        >
          <Search className="w-4 h-4 mr-2" />
          Diagnostics
        </Button>
      </div>

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          {/* Admin Documents Section */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-slate-800">Admin Documents</h3>
                  <p className="text-sm text-slate-600">Download playbooks and guides for administration</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleDownloadPdf('/api/admin/guides/admin-playbook', 'Admin_Playbook.pdf')}
                    variant="outline"
                    className="border-slate-400"
                    data-testid="download-admin-playbook-btn"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Admin Playbook
                  </Button>
                  <Button
                    onClick={() => handleDownloadPdf('/api/admin/guides/state-manager', 'State_Manager_Guide.pdf')}
                    variant="outline"
                    className="border-slate-400"
                    data-testid="download-sm-guide-btn"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    State Manager Guide
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Setup Button */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-blue-800">Quick Branding Setup</h3>
                  <p className="text-sm text-blue-600">Apply all team logos and colors in one click</p>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      const res = await axios.post(`${API}/api/admin/setup-all-branding`, {}, { headers });
                      toast.success(res.data.message);
                      fetchData(); // Refresh to show updated branding
                    } catch (error) {
                      toast.error(error.response?.data?.detail || 'Failed to setup branding');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Apply All Team Branding
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="teams-grid">
            {teams.map(team => (
              <Card key={team.id} className="hover:shadow-md transition-shadow" data-testid={`team-card-${team.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      {team.name}
                    </CardTitle>
                    {team.settings?.is_default && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    {team.user_count} members
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Branding Preview */}
                  <div className="flex items-center gap-2">
                    {team.branding?.logo_url ? (
                      <img src={team.branding.logo_url} alt="Logo" className="h-8 w-8 object-contain rounded" />
                    ) : (
                      <div className="h-8 w-8 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-500">
                        No Logo
                      </div>
                    )}
                    <div className="flex gap-1">
                      <div 
                        className="w-6 h-6 rounded border" 
                        style={{ backgroundColor: team.branding?.primary_color || '#1e40af' }}
                        title="Primary Color"
                      />
                      <div 
                        className="w-6 h-6 rounded border" 
                        style={{ backgroundColor: team.branding?.accent_color || '#3b82f6' }}
                        title="Accent Color"
                      />
                    </div>
                  </div>
                
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadTeamCustomization(team.id, team.name);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid={`customize-btn-${team.id}`}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Customize
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedTeamFilter(team.id);
                      setActiveTab('users');
                    }}
                  >
                    View Users
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                
                {/* Download Section */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <span className="text-xs text-slate-500 w-full mb-1">Downloads:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPdf(`/api/admin/teams/${team.id}/roster/pdf`, `${team.name.replace(/\s+/g, '_')}_Roster.pdf`)}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    data-testid={`download-roster-pdf-${team.id}`}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Roster PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadCsv(`/api/admin/teams/${team.id}/roster/csv`, `${team.name.replace(/\s+/g, '_')}_Roster.csv`)}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    data-testid={`download-roster-csv-${team.id}`}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Roster CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleDownloadSmPack(team.id, team.name)}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid={`download-sm-pack-${team.id}`}
                  >
                    <Package className="w-3 h-3 mr-1" />
                    SM Pack
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Mobile-friendly Create User Button */}
          <Button 
            onClick={() => setShowCreateUserModal(true)}
            className="w-full bg-green-600 hover:bg-green-700 py-6 text-base"
            data-testid="create-user-btn-mobile"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            + Create New User
          </Button>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search users by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="user-search-input"
              />
            </div>
            <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="team-filter">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="users-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Team</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Reports To</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Subs</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50 ${u.subordinate_count === 0 && u.role === 'state_manager' ? 'bg-yellow-50' : ''}`} data-testid={`user-row-${u.id}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${roleColors[u.role] || 'bg-slate-100'}`}>
                          {u.role?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.team_name === 'Unassigned' ? (
                          <span className="text-red-500 text-xs font-medium">Unassigned</span>
                        ) : (
                          <span className="text-slate-600 text-xs">{u.team_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u.manager_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {u.subordinate_count > 0 ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            {u.subordinate_count}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditUserModal(u)}
                            data-testid={`edit-user-btn-${u.id}`}
                            title="Edit user details"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedTeamForAssignment(u.team_id || '');
                              setSelectedRoleForAssignment(u.role || '');
                              setShowAssignUserModal(true);
                            }}
                            data-testid={`assign-user-btn-${u.id}`}
                            title="Reassign team/role"
                          >
                            <UserCog className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            data-testid={`delete-user-btn-${u.id}`}
                            title="Delete user"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Repair Hierarchy Tab */}
      {activeTab === 'repair' && (
        <div className="space-y-6" data-testid="repair-hierarchy-tab">
          {/* Header */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Wrench className="w-5 h-5" />
                Repair Team Hierarchies
              </CardTitle>
              <CardDescription className="text-orange-700">
                This tool fixes broken manager_id relationships. It will NOT modify team_id, reset users, 
                or touch Team Sudbeck. Use this to repair hierarchies for newly created teams.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={fetchAllBrokenHierarchies}
                  disabled={repairLoading.all}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  data-testid="check-all-teams-btn"
                >
                  {repairLoading.all ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Check All Teams
                </Button>
                <Button
                  onClick={repairAllTeams}
                  disabled={repairLoading.all}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  data-testid="repair-all-teams-btn"
                >
                  {repairLoading.all ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                  Repair All Teams (Auto)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Teams Grid */}
          <div className="grid gap-4 md:grid-cols-2" data-testid="repair-teams-grid">
            {teams.map(team => {
                const data = hierarchyData[team.id];
                const isLoading = repairLoading[team.id];
                const hasBroken = data && data.broken_count > 0;
                const isHealthy = data && data.broken_count === 0;

                return (
                  <Card 
                    key={team.id} 
                    className={`transition-all ${hasBroken ? 'border-red-300 bg-red-50' : isHealthy ? 'border-green-300 bg-green-50' : ''}`}
                    data-testid={`repair-team-card-${team.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-slate-600" />
                          {team.name}
                        </CardTitle>
                        {hasBroken && (
                          <span className="flex items-center text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {data.broken_count} broken
                          </span>
                        )}
                        {isHealthy && (
                          <span className="flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Healthy
                          </span>
                        )}
                      </div>
                      <CardDescription>
                        {team.user_count} members
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Status info */}
                      {data && (
                        <div className="text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>Total Users:</span>
                            <span className="font-medium">{data.total_users}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Broken Relationships:</span>
                            <span className={`font-medium ${hasBroken ? 'text-red-600' : 'text-green-600'}`}>
                              {data.broken_count}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Broken users list */}
                      {hasBroken && data.broken_users && (
                        <div className="bg-white rounded border border-red-200 p-2 text-xs">
                          <div className="font-medium text-red-800 mb-1">Users needing repair:</div>
                          {data.broken_users.map(user => (
                            <div key={user.id} className="flex items-center gap-1 text-slate-600 py-0.5">
                              <ArrowRight className="w-3 h-3 text-red-400" />
                              {user.name} ({user.role?.replace('_', ' ')})
                              <span className="text-red-500">- {user.issue}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchBrokenHierarchy(team.id)}
                          disabled={isLoading}
                          data-testid={`check-team-btn-${team.id}`}
                        >
                          {isLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Search className="w-3 h-3 mr-1" />}
                          Check
                        </Button>
                        {hasBroken && (
                          <Button
                            size="sm"
                            onClick={() => openRepairModal(team)}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            data-testid={`repair-team-btn-${team.id}`}
                          >
                            <Wrench className="w-3 h-3 mr-1" />
                            Repair ({data.broken_count})
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceRebuildTeamHierarchy(team.id, team.name)}
                          disabled={isLoading}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          data-testid={`force-rebuild-btn-${team.id}`}
                          title="Force rebuild entire hierarchy from scratch"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Force Rebuild
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Diagnostics Tab */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6" data-testid="diagnostics-tab-content">
          {/* Header */}
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Search className="w-5 h-5" />
                Data Diagnostics
              </CardTitle>
              <CardDescription className="text-purple-700">
                Diagnose and fix data integrity issues. These tools help recover orphaned records 
                when users are deleted but their data remains.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                <h4 className="font-medium text-slate-800 mb-2">Safety Guarantees:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>✅ Original data is preserved for audit trail</li>
                  <li>✅ Only orphaned records (with deleted owners) are modified</li>
                  <li>✅ team_id is never changed</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={runDiagnoseInterviews}
                  disabled={diagnosticsLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="diagnose-interviews-btn"
                >
                  {diagnosticsLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Diagnose Interviews
                </Button>
                <Button
                  onClick={runFixOrphanedInterviews}
                  disabled={diagnosticsLoading || !diagnosticsData || diagnosticsData.orphaned_total === 0}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  data-testid="fix-interviews-btn"
                >
                  {diagnosticsLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                  Fix Orphaned Interviews
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostics Results */}
          {diagnosticsData && (
            <Card data-testid="diagnostics-results">
              <CardHeader>
                <CardTitle className="text-lg">Interview Diagnostics Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-800">{diagnosticsData.total_interviews}</div>
                    <div className="text-sm text-blue-600">Total Interviews</div>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${diagnosticsData.orphaned_total > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className={`text-2xl font-bold ${diagnosticsData.orphaned_total > 0 ? 'text-red-800' : 'text-green-800'}`}>
                      {diagnosticsData.orphaned_total}
                    </div>
                    <div className={`text-sm ${diagnosticsData.orphaned_total > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Orphaned Interviews
                    </div>
                  </div>
                </div>

                {/* Interviews by Team */}
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">Interviews by Team:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(diagnosticsData.interviews_by_team || {}).map(([team, count]) => (
                      <div key={team} className="bg-slate-50 px-3 py-2 rounded flex justify-between">
                        <span className="text-slate-700">{team}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Orphaned by Team */}
                {diagnosticsData.orphaned_total > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Orphaned by Team:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(diagnosticsData.orphaned_by_team || {}).map(([team, count]) => (
                        <div key={team} className="bg-red-50 px-3 py-2 rounded flex justify-between">
                          <span className="text-red-700">{team}</span>
                          <span className="font-medium text-red-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orphaned Interview Details */}
                {diagnosticsData.orphaned_interviews && diagnosticsData.orphaned_interviews.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Orphaned Interview Details (first 50):</h4>
                    <div className="max-h-60 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Candidate</th>
                            <th className="px-3 py-2 text-left">Team</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Issue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {diagnosticsData.orphaned_interviews.map((interview, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2">{interview.candidate_name}</td>
                              <td className="px-3 py-2">{interview.team_name}</td>
                              <td className="px-3 py-2">{interview.interview_date?.split('T')[0]}</td>
                              <td className="px-3 py-2 text-red-600 text-xs">{interview.issue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {diagnosticsData.orphaned_total === 0 && (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-green-800 font-medium">All interviews are healthy!</div>
                    <div className="text-green-600 text-sm">No orphaned interviews found.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fix Results */}
          {fixResult && (
            <Card className="border-green-200 bg-green-50" data-testid="fix-results">
              <CardHeader>
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Fix Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg text-center border border-green-200">
                    <div className="text-2xl font-bold text-green-800">{fixResult.fixed_total}</div>
                    <div className="text-sm text-green-600">Fixed</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center border border-slate-200">
                    <div className="text-2xl font-bold text-slate-800">{fixResult.skipped_team_sudbeck}</div>
                    <div className="text-sm text-slate-600">Skipped (Sudbeck)</div>
                  </div>
                </div>

                {/* Fixed by Team */}
                {Object.keys(fixResult.fixed_by_team || {}).length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-800 mb-2">Fixed by Team:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(fixResult.fixed_by_team).map(([team, count]) => (
                        <div key={team} className="bg-white px-3 py-2 rounded border border-green-200 flex justify-between">
                          <span className="text-green-700">{team}</span>
                          <span className="font-medium text-green-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-green-700 bg-white p-3 rounded border border-green-200">
                  <strong>Audit Trail:</strong> {fixResult.audit_trail}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unassigned Users Section */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Unassigned Users Diagnostic
              </CardTitle>
              <CardDescription className="text-orange-700">
                Find and fix users who cannot access the app because they do not have a team assigned.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={runDiagnoseUnassignedUsers}
                  disabled={unassignedLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="diagnose-unassigned-btn"
                >
                  {unassignedLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Find Unassigned Users
                </Button>
                
                {/* Create Team Sudbeck */}
                <Button
                  onClick={async () => {
                    try {
                      const res = await axios.post(`${API}/api/admin/create-missing-team-record`, {}, { headers });
                      if (res.data.created) {
                        toast.success(`Created: ${res.data.team.name}`);
                      } else {
                        toast.info(res.data.message);
                      }
                      await fetchData(); // Refresh teams list
                    } catch (error) {
                      toast.error(error.response?.data?.detail || 'Failed to create team');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Create Team Sudbeck
                </Button>
              </div>
              
              <p className="text-xs text-orange-700">
                Click Create Team Sudbeck first, then Find Unassigned Users to assign them.
              </p>
            </CardContent>
          </Card>

          {/* Unassigned Users Results */}
          {unassignedData && (
            <Card data-testid="unassigned-results">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {unassignedData.unassigned_count > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  Unassigned Users Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className={`p-4 rounded-lg text-center ${unassignedData.unassigned_count > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                  <div className={`text-3xl font-bold ${unassignedData.unassigned_count > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                    {unassignedData.unassigned_count}
                  </div>
                  <div className={`text-sm ${unassignedData.unassigned_count > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    Users Without Team Assignment
                  </div>
                </div>

                {unassignedData.unassigned_count > 0 && (
                  <>
                    {/* Selection controls */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button variant="outline" size="sm" onClick={selectAllUnassignedUsers}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllUnassignedUsers}>
                        Deselect All
                      </Button>
                      <span className="text-sm text-slate-600">
                        {selectedUnassignedUsers.length} of {unassignedData.unassigned_count} selected
                      </span>
                    </div>

                    {/* User list with checkboxes */}
                    <div className="max-h-60 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left w-8">
                              <input 
                                type="checkbox" 
                                checked={selectedUnassignedUsers.length === unassignedData.unassigned_count}
                                onChange={(e) => e.target.checked ? selectAllUnassignedUsers() : deselectAllUnassignedUsers()}
                              />
                            </th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Role</th>
                            <th className="px-3 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {unassignedData.unassigned_users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <input 
                                  type="checkbox" 
                                  checked={selectedUnassignedUsers.includes(u.id)}
                                  onChange={() => toggleSelectUnassignedUser(u.id)}
                                />
                              </td>
                              <td className="px-3 py-2 font-medium">{u.name || '-'}</td>
                              <td className="px-3 py-2">{u.email}</td>
                              <td className="px-3 py-2">{u.role || '-'}</td>
                              <td className="px-3 py-2">
                                <span className={`text-xs px-2 py-1 rounded ${u.status === 'active' || !u.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {u.status || 'active'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Assignment controls - Simple and direct */}
                    <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-slate-800">Assign Selected Users To:</h4>
                      
                      {/* Selected team indicator */}
                      {assignToTeamId && (
                        <div className="bg-blue-100 p-2 rounded text-blue-800 text-sm">
                          <strong>Selected Team:</strong> {teams.find(t => t.id === assignToTeamId)?.name || assignToTeamId}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="assign-team" className="text-sm text-slate-600 mb-1 block">Team (required)</Label>
                          <Select value={assignToTeamId} onValueChange={setAssignToTeamId}>
                            <SelectTrigger id="assign-team">
                              <SelectValue placeholder="Select team..." />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Show ALL teams - no filtering */}
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="assign-manager" className="text-sm text-slate-600 mb-1 block">Manager (optional)</Label>
                          <Select value={assignManagerId} onValueChange={setAssignManagerId}>
                            <SelectTrigger id="assign-manager">
                              <SelectValue placeholder="No manager..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No manager</SelectItem>
                              {assignToTeamId && users
                                .filter(u => u.team_id === assignToTeamId && ['state_manager', 'regional_manager', 'district_manager'].includes(u.role))
                                .map((manager) => (
                                  <SelectItem key={manager.id} value={manager.id}>
                                    {manager.name} ({manager.role})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        onClick={runFixUnassignedUsers}
                        disabled={unassignedLoading || selectedUnassignedUsers.length === 0 || !assignToTeamId}
                        className="bg-orange-600 hover:bg-orange-700 w-full md:w-auto"
                        data-testid="fix-unassigned-btn"
                      >
                        {unassignedLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                        Assign {selectedUnassignedUsers.length} User(s) to Team
                      </Button>
                    </div>
                  </>
                )}

                {unassignedData.unassigned_count === 0 && (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-green-800 font-medium">All users are assigned to teams!</div>
                    <div className="text-green-600 text-sm">No users are blocked from accessing the app.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Orphaned Activities Section */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Search className="w-5 h-5" />
                Orphaned Activities Diagnostic
              </CardTitle>
              <CardDescription className="text-blue-700">
                Find activities with NULL team_id. These activities won't appear in team rollups until fixed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-slate-800 mb-2">How this works:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>1. <strong>Diagnose</strong> - Identifies activities missing team_id</li>
                  <li>2. <strong>Review</strong> - Shows which users' activities are affected</li>
                  <li>3. <strong>Fix</strong> - Sets team_id based on each user's current team</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={runDiagnoseOrphanedActivities}
                  disabled={orphanedActivitiesLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="diagnose-orphaned-activities-btn"
                >
                  {orphanedActivitiesLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Diagnose Orphaned Activities
                </Button>
                {orphanedActivitiesData && (
                  <Button
                    onClick={copyOrphanedDataToClipboard}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Copy to Clipboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Orphaned Activities Results */}
          {orphanedActivitiesData && (
            <Card data-testid="orphaned-activities-results">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {orphanedActivitiesData.total_orphaned_activities > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  Orphaned Activities Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg text-center ${orphanedActivitiesData.total_orphaned_activities > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                    <div className={`text-3xl font-bold ${orphanedActivitiesData.total_orphaned_activities > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                      {orphanedActivitiesData.total_orphaned_activities}
                    </div>
                    <div className={`text-sm ${orphanedActivitiesData.total_orphaned_activities > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      Total Orphaned
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-800">
                      {orphanedActivitiesData.fixable_activities}
                    </div>
                    <div className="text-sm text-green-600">Fixable</div>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${orphanedActivitiesData.needs_team_assignment_activities > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div className={`text-3xl font-bold ${orphanedActivitiesData.needs_team_assignment_activities > 0 ? 'text-red-800' : 'text-slate-600'}`}>
                      {orphanedActivitiesData.needs_team_assignment_activities}
                    </div>
                    <div className={`text-sm ${orphanedActivitiesData.needs_team_assignment_activities > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                      Need User Fix First
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                {orphanedActivitiesData.users_with_orphaned_activities.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Affected Users:</h4>
                    <div className="max-h-80 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">User</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-center">Activities</th>
                            <th className="px-3 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {orphanedActivitiesData.users_with_orphaned_activities.map((user, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium">{user.user_name}</td>
                              <td className="px-3 py-2 text-slate-600">{user.user_email || '-'}</td>
                              <td className="px-3 py-2 text-center font-bold">{user.activity_count}</td>
                              <td className="px-3 py-2">
                                {user.fix_status === 'FIXABLE - user has team_id' ? (
                                  <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-xs">
                                    <CheckCircle2 className="w-3 h-3" /> Fixable
                                  </span>
                                ) : user.fix_status === 'NEEDS USER TEAM ASSIGNMENT' ? (
                                  <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded text-xs">
                                    <AlertTriangle className="w-3 h-3" /> Needs Team
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-xs">
                                    <AlertTriangle className="w-3 h-3" /> Orphaned
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Fix Button */}
                {orphanedActivitiesData.total_orphaned_activities > 0 && (
                  <div className="pt-4 border-t">
                    {orphanedActivitiesData.needs_team_assignment_activities > 0 ? (
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-orange-800 text-sm mb-2">
                          <strong>Action Required:</strong> {orphanedActivitiesData.needs_team_assignment_activities} activities belong to users without a team.
                        </p>
                        <p className="text-orange-700 text-sm">
                          Use "Find Unassigned Users" above to assign these users to a team first, then re-run the diagnostic.
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={runFixOrphanedActivities}
                        disabled={orphanedActivitiesLoading}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="fix-orphaned-activities-btn"
                      >
                        {orphanedActivitiesLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                        Fix {orphanedActivitiesData.fixable_activities} Orphaned Activities
                      </Button>
                    )}
                  </div>
                )}

                {/* Success State */}
                {orphanedActivitiesData.total_orphaned_activities === 0 && (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-green-800 font-medium">All activities have team_id assigned!</div>
                    <div className="text-green-600 text-sm">No orphaned activities found.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fix Results */}
          {fixOrphanedResult && (
            <Card className="border-green-200 bg-green-50" data-testid="fix-orphaned-results">
              <CardHeader>
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Migration Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg text-center border border-green-200">
                    <div className="text-2xl font-bold text-green-800">{fixOrphanedResult.total_updated}</div>
                    <div className="text-sm text-green-600">Updated</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center border border-slate-200">
                    <div className="text-2xl font-bold text-slate-800">{fixOrphanedResult.total_skipped_user_has_no_team || 0}</div>
                    <div className="text-sm text-slate-600">Skipped (No Team)</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center border border-slate-200">
                    <div className="text-2xl font-bold text-slate-800">{fixOrphanedResult.total_skipped_user_not_found || 0}</div>
                    <div className="text-sm text-slate-600">Skipped (No User)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-Tabs Diagnostic Section (New Faces, SNA, NPA) */}
          <Card className="bg-purple-50 border-purple-200 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Search className="w-5 h-5" />
                Sub-Tabs Diagnostic (New Faces / SNA / NPA)
              </CardTitle>
              <CardDescription className="text-purple-700">
                Diagnose data integrity issues affecting New Faces, SNA, and NPA rollups. 
                Missing team_id causes data to not appear in team views.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <h4 className="font-medium text-slate-800 mb-2">How rollups work:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• <strong>New Faces</strong>: Separate collection, requires team_id for team views</li>
                  <li>• <strong>SNA</strong>: Calculated from activities.premium, requires team_id</li>
                  <li>• <strong>NPA</strong>: Separate collection, premium pulled from activities</li>
                  <li>• <strong>Missing team_id</strong> = data invisible to team rollups</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={runSubtabsDiagnostic}
                  disabled={subtabsDiagnosticLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="diagnose-subtabs-btn"
                >
                  {subtabsDiagnosticLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Diagnose Sub-Tabs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Tabs Diagnostic Results */}
          {subtabsDiagnostic && (
            <Card data-testid="subtabs-diagnostic-results">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {subtabsDiagnostic.summary?.total_data_issues > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  Sub-Tabs Diagnostic Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg text-center ${subtabsDiagnostic.summary?.total_data_issues > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                    <div className={`text-3xl font-bold ${subtabsDiagnostic.summary?.total_data_issues > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                      {subtabsDiagnostic.summary?.total_data_issues || 0}
                    </div>
                    <div className="text-sm text-slate-600">Total Issues</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-800">
                      {subtabsDiagnostic.new_face_customers?.missing_team_id || 0}
                    </div>
                    <div className="text-sm text-blue-600">New Faces Missing</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-purple-800">
                      {subtabsDiagnostic.activities_with_premium?.missing_team_id || 0}
                    </div>
                    <div className="text-sm text-purple-600">Premium Activities Missing</div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-indigo-800">
                      {subtabsDiagnostic.npa_agents?.missing_team_id || 0}
                    </div>
                    <div className="text-sm text-indigo-600">NPA Missing</div>
                  </div>
                </div>

                {/* Activities with Premium Details */}
                {subtabsDiagnostic.activities_with_premium?.missing_team_id_by_user?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Premium Activities Missing team_id (affects SNA/NPA):</h4>
                    <div className="max-h-60 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">User</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-center">Activities</th>
                            <th className="px-3 py-2 text-right">Premium</th>
                            <th className="px-3 py-2 text-center">Fixable</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {subtabsDiagnostic.activities_with_premium.missing_team_id_by_user.map((user, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium">{user.user_name}</td>
                              <td className="px-3 py-2 text-slate-600">{user.user_email || '-'}</td>
                              <td className="px-3 py-2 text-center">{user.activities_count}</td>
                              <td className="px-3 py-2 text-right font-bold">${user.total_premium?.toLocaleString()}</td>
                              <td className="px-3 py-2 text-center">
                                {user.fixable ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-red-600">✗</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* By Month Breakdown */}
                {subtabsDiagnostic.activities_with_premium?.by_month && Object.keys(subtabsDiagnostic.activities_with_premium.by_month).length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Premium Activities by Month (all):</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(subtabsDiagnostic.activities_with_premium.by_month).slice(0, 12).map(([month, data]) => (
                        <div key={month} className="bg-slate-100 px-3 py-2 rounded text-sm">
                          <span className="font-medium">{month}</span>: {data.count} records, ${data.premium?.toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fix Button */}
                {subtabsDiagnostic.summary?.total_data_issues > 0 && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={runSubtabsMigration}
                      disabled={subtabsDiagnosticLoading}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="fix-subtabs-btn"
                    >
                      {subtabsDiagnosticLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                      Fix All Collections (Activities, New Faces, NPA)
                    </Button>
                    <p className="text-sm text-slate-500 mt-2">
                      This will set team_id on all affected records based on the user's current team assignment.
                    </p>
                  </div>
                )}

                {/* Success State */}
                {subtabsDiagnostic.summary?.total_data_issues === 0 && (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-green-800 font-medium">All sub-tab data has team_id assigned!</div>
                    <div className="text-green-600 text-sm">New Faces, SNA, and NPA rollups should be accurate.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sub-Tabs Migration Results */}
          {subtabsMigrationResult && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Sub-Tabs Migration Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h5 className="font-medium text-slate-800 mb-2">Activities</h5>
                    <div className="text-2xl font-bold text-green-800">{subtabsMigrationResult.report?.activities?.updated || 0}</div>
                    <div className="text-sm text-slate-600">Updated</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h5 className="font-medium text-slate-800 mb-2">New Faces</h5>
                    <div className="text-2xl font-bold text-green-800">{subtabsMigrationResult.report?.new_face_customers?.updated || 0}</div>
                    <div className="text-sm text-slate-600">Updated</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h5 className="font-medium text-slate-800 mb-2">NPA Agents</h5>
                    <div className="text-2xl font-bold text-green-800">{subtabsMigrationResult.report?.npa_agents?.updated || 0}</div>
                    <div className="text-sm text-slate-600">Updated</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Fix Orphaned Activities Confirmation Modal */}
      <Dialog open={showFixOrphanedModal} onOpenChange={setShowFixOrphanedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Fix Orphaned Activities</DialogTitle>
            <DialogDescription>
              This will update {orphanedActivitiesData?.fixable_activities || 0} activity records, setting their team_id based on the user's current team assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <strong>What this does:</strong>
              <ul className="mt-2 space-y-1">
                <li>• Sets activity.team_id = user.team_id for each affected activity</li>
                <li>• Only updates activities where team_id is NULL</li>
                <li>• Does NOT modify any other fields (dates, counts, premium, etc.)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFixOrphanedModal(false)}>
              Cancel
            </Button>
            <Button onClick={confirmFixOrphanedActivities} className="bg-green-600 hover:bg-green-700">
              Confirm & Fix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Modal */}
      <Dialog open={showNewTeamModal} onOpenChange={setShowNewTeamModal}>
        <DialogContent data-testid="create-team-modal">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team for organizing users and data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="Enter team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                data-testid="team-name-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTeamModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} data-testid="confirm-create-team">
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
        <DialogContent className="max-w-md" data-testid="create-user-modal">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user directly into a team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team *</Label>
              <Select 
                value={newUserForm.team_id} 
                onValueChange={(val) => setNewUserForm({...newUserForm, team_id: val, manager_id: ''})}
              >
                <SelectTrigger data-testid="new-user-team">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                placeholder="John Smith"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                data-testid="new-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                data-testid="new-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                data-testid="new-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select 
                value={newUserForm.role} 
                onValueChange={(val) => setNewUserForm({...newUserForm, role: val, manager_id: ''})}
              >
                <SelectTrigger data-testid="new-user-role">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="state_manager">State Manager</SelectItem>
                  <SelectItem value="regional_manager">Regional Manager</SelectItem>
                  <SelectItem value="district_manager">District Manager</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUserForm.role && newUserForm.role !== 'state_manager' && (
              <div className="space-y-2">
                <Label>Reports To</Label>
                <Select 
                  value={newUserForm.manager_id} 
                  onValueChange={(val) => setNewUserForm({...newUserForm, manager_id: val})}
                >
                  <SelectTrigger data-testid="new-user-manager">
                    <SelectValue placeholder="Select manager..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (set later in Team Mgmt)</SelectItem>
                    {getPotentialManagers().map(manager => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name} ({manager.role?.replace('_', ' ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {getPotentialManagers().length === 0 && newUserForm.team_id && 
                    "No managers found. Create the manager first, or set this later in Team Mgmt."}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} className="bg-green-600 hover:bg-green-700" data-testid="confirm-create-user">
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign User Modal */}
      <Dialog open={showAssignUserModal} onOpenChange={setShowAssignUserModal}>
        <DialogContent data-testid="assign-user-modal">
          <DialogHeader>
            <DialogTitle>Edit User Assignment</DialogTitle>
            <DialogDescription>
              {selectedUser && `Update team or role for ${selectedUser.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={selectedTeamForAssignment} onValueChange={setSelectedTeamForAssignment}>
                <SelectTrigger data-testid="team-select">
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.user_count} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRoleForAssignment} onValueChange={setSelectedRoleForAssignment}>
                <SelectTrigger data-testid="role-select">
                  <SelectValue placeholder="Keep current role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep_current">Keep current role</SelectItem>
                  <SelectItem value="state_manager">State Manager</SelectItem>
                  <SelectItem value="regional_manager">Regional Manager</SelectItem>
                  <SelectItem value="district_manager">District Manager</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignUser} data-testid="confirm-assign-user">
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repair Hierarchy Modal */}
      <Dialog open={showRepairModal} onOpenChange={setShowRepairModal}>
        <DialogContent className="max-w-lg" data-testid="repair-hierarchy-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              Repair Hierarchy - {selectedTeamForRepair?.name}
            </DialogTitle>
            <DialogDescription>
              Assign managers to users with broken relationships. This will ONLY update manager_id.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTeamForRepair && hierarchyData[selectedTeamForRepair.id] && (
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              {hierarchyData[selectedTeamForRepair.id].broken_users?.map(user => (
                <div key={user.id} className="p-3 bg-slate-50 rounded-lg border">
                  <div className="font-medium text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-500 mb-2">
                    {user.role?.replace('_', ' ').toUpperCase()} • {user.issue}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Assign to Manager:</Label>
                    <Select
                      value={managerAssignments[user.id] || ''}
                      onValueChange={(val) => setManagerAssignments(prev => ({ ...prev, [user.id]: val }))}
                    >
                      <SelectTrigger className="h-8 text-sm" data-testid={`assign-manager-${user.id}`}>
                        <SelectValue placeholder="Select manager..." />
                      </SelectTrigger>
                      <SelectContent>
                        {hierarchyData[selectedTeamForRepair.id].potential_managers
                          ?.filter(m => {
                            // Filter based on role hierarchy
                            const validManagers = {
                              'regional_manager': ['state_manager'],
                              'district_manager': ['state_manager', 'regional_manager'],
                              'agent': ['district_manager', 'regional_manager']
                            };
                            return validManagers[user.role]?.includes(m.role) || m.role === 'state_manager';
                          })
                          .map(manager => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.name} ({manager.role?.replace('_', ' ')})
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepairModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => repairTeamHierarchy(selectedTeamForRepair?.id)}
              disabled={repairLoading[selectedTeamForRepair?.id]}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="confirm-repair-btn"
            >
              {repairLoading[selectedTeamForRepair?.id] ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="w-4 h-4 mr-2" />
              )}
              Apply Repairs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
        <DialogContent className="max-w-md" data-testid="edit-user-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              Edit User Details
            </DialogTitle>
            <DialogDescription>
              Update user name, email, or other details. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editUserForm.name}
                onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                placeholder="Full Name"
                data-testid="edit-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email / Username</Label>
              <Input
                value={editUserForm.email}
                onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                placeholder="email@example.com"
                data-testid="edit-user-email"
              />
              <p className="text-xs text-slate-500">
                Format: First.Last@pmagent.net (capitalized)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select 
                value={editUserForm.role} 
                onValueChange={(val) => setEditUserForm({...editUserForm, role: val})}
              >
                <SelectTrigger data-testid="edit-user-role">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="state_manager">State Manager</SelectItem>
                  <SelectItem value="regional_manager">Regional Manager</SelectItem>
                  <SelectItem value="district_manager">District Manager</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select 
                value={editUserForm.team_id} 
                onValueChange={(val) => setEditUserForm({...editUserForm, team_id: val})}
              >
                <SelectTrigger data-testid="edit-user-team">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} className="bg-blue-600 hover:bg-blue-700" data-testid="confirm-edit-user">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branding Modal */}
      <Dialog open={showBrandingModal} onOpenChange={setShowBrandingModal}>
        <DialogContent className="max-w-lg" data-testid="branding-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Team Branding - {selectedTeamForBranding?.name}
            </DialogTitle>
            <DialogDescription>
              Customize the look and feel for this team. Users will see these colors and logo after login.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Logo URL */}
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                placeholder="https://example.com/logo.png"
                value={brandingForm.logo_url}
                onChange={(e) => setBrandingForm({ ...brandingForm, logo_url: e.target.value })}
                data-testid="branding-logo-url"
              />
              {brandingForm.logo_url && (
                <div className="mt-2 p-2 bg-slate-100 rounded flex items-center justify-center">
                  <img 
                    src={brandingForm.logo_url} 
                    alt="Logo Preview" 
                    className="h-12 object-contain"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
            
            {/* Display Name */}
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                placeholder="Team Display Name"
                value={brandingForm.display_name}
                onChange={(e) => setBrandingForm({ ...brandingForm, display_name: e.target.value })}
                data-testid="branding-display-name"
              />
              <p className="text-xs text-slate-500">Shown in the header after login. Leave empty to use team name.</p>
            </div>
            
            {/* Tagline */}
            <div className="space-y-2">
              <Label>Tagline (optional)</Label>
              <Input
                placeholder="Your team motto or tagline"
                value={brandingForm.tagline}
                onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
                data-testid="branding-tagline"
              />
            </div>
            
            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={brandingForm.primary_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                    data-testid="branding-primary-color"
                  />
                  <Input
                    value={brandingForm.primary_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                    className="font-mono"
                    placeholder="#1e40af"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={brandingForm.accent_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, accent_color: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                    data-testid="branding-accent-color"
                  />
                  <Input
                    value={brandingForm.accent_color}
                    onChange={(e) => setBrandingForm({ ...brandingForm, accent_color: e.target.value })}
                    className="font-mono"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            </div>
            
            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div 
                className="rounded-lg p-4 text-white"
                style={{ 
                  background: `linear-gradient(to right, ${brandingForm.primary_color}, ${brandingForm.accent_color})`
                }}
              >
                <div className="flex items-center gap-3">
                  {brandingForm.logo_url ? (
                    <img src={brandingForm.logo_url} alt="Logo" className="h-10 w-auto object-contain bg-white rounded p-1" />
                  ) : (
                    <div className="h-10 w-10 bg-white/20 rounded flex items-center justify-center text-sm font-bold">
                      {(brandingForm.display_name || selectedTeamForBranding?.name || 'TM').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold">{brandingForm.display_name || selectedTeamForBranding?.name}</div>
                    {brandingForm.tagline && <div className="text-xs opacity-70">{brandingForm.tagline}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrandingModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBranding} className="bg-blue-600 hover:bg-blue-700" data-testid="save-branding-btn">
              Save Branding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Features Modal */}
      <Dialog open={showFeaturesModal} onOpenChange={setShowFeaturesModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="features-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              Team Features - {selectedTeamForFeatures?.name}
            </DialogTitle>
            <DialogDescription>
              Control which tabs and features are visible to members of this team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Copy from team / Reset */}
            <div className="flex flex-wrap gap-2 pb-3 border-b">
              <Select onValueChange={handleCopyFeatures}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Copy from team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.filter(t => t.id !== selectedTeamForFeatures?.id).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleResetFeatures}>
                Reset to Defaults
              </Button>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-3">
              <h4 className="font-medium text-slate-700">Visible Tabs / Features:</h4>
              
              {[
                { key: 'activity', label: 'Daily Activity', desc: 'Daily activity input form' },
                { key: 'stats', label: 'My Stats', desc: 'Personal statistics view' },
                { key: 'team_view', label: 'Team View', desc: 'Team overview and hierarchy' },
                { key: 'suitability', label: 'Suitability', desc: 'Suitability form tab' },
                { key: 'pma_bonuses', label: 'PMA Bonuses', desc: 'PMA bonuses documentation' },
                { key: 'docusphere', label: 'DocuSphere', desc: 'Document management' },
                { key: 'leaderboard', label: 'Leaderboard', desc: 'Team leaderboard' },
                { key: 'analytics', label: 'Analytics', desc: 'Analytics dashboard' },
                { key: 'reports', label: 'Reports', desc: 'Manager reports (role-restricted)' },
                { key: 'team_mgmt', label: 'Team Mgmt', desc: 'Team management (role-restricted)' },
                { key: 'recruiting', label: 'Recruiting', desc: 'Recruiting module (role-restricted)' },
                { key: 'interviews', label: 'Interviews', desc: 'Interview tracking' }
              ].map(feature => (
                <div key={feature.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-800">{feature.label}</div>
                    <div className="text-xs text-slate-500">{feature.desc}</div>
                  </div>
                  <Switch
                    checked={featuresForm[feature.key] || false}
                    onCheckedChange={(checked) => setFeaturesForm({ ...featuresForm, [feature.key]: checked })}
                    data-testid={`feature-toggle-${feature.key}`}
                  />
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeaturesModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFeatures} className="bg-purple-600 hover:bg-purple-700" data-testid="save-features-btn">
              Save Features
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Customization Modal (Phase 1) */}
      <Dialog open={showCustomizationModal} onOpenChange={setShowCustomizationModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Customize Team: {selectedTeamForCustomization?.name}
            </DialogTitle>
            <DialogDescription>
              Control what this team sees and how their dashboard appears
            </DialogDescription>
          </DialogHeader>

          {customizationLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {/* Tab navigation */}
              <div className="flex border-b mb-4">
                {['features', 'role-overrides', 'ui-settings', 'branding', 'views'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setCustomizationTab(tab)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      customizationTab === tab 
                        ? 'border-b-2 border-indigo-600 text-indigo-600' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab === 'features' && 'Feature Flags'}
                    {tab === 'role-overrides' && 'Role Overrides'}
                    {tab === 'ui-settings' && 'UI Settings'}
                    {tab === 'branding' && 'Branding'}
                    {tab === 'views' && 'Views'}
                  </button>
                ))}
              </div>

              {/* Feature Flags Tab */}
              {customizationTab === 'features' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Toggle which features are visible to this team. Disabled features will be hidden from navigation and return 403 if accessed directly.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(customizationForm.features || {}).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <Label className="text-sm capitalize">{feature.replace(/_/g, ' ')}</Label>
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggleFeature(feature)}
                          data-testid={`feature-toggle-${feature}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Role-Based Tab Overrides Tab */}
              {customizationTab === 'role-overrides' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Hide specific tabs for certain roles. State Managers always see full team configuration.</p>
                  
                  {['agent', 'district_manager', 'regional_manager'].map(role => (
                    <div key={role} className="border rounded-lg p-4">
                      <h4 className="font-medium text-slate-900 mb-3 capitalize">{role.replace(/_/g, ' ')}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.keys(customizationForm.features || {}).map(tab => {
                          const isHidden = customizationForm.role_tab_overrides?.[role]?.hidden_tabs?.includes(tab);
                          return (
                            <button
                              key={tab}
                              onClick={() => toggleRoleTab(role, tab)}
                              className={`px-3 py-2 text-xs rounded-md transition-colors ${
                                isHidden 
                                  ? 'bg-red-100 text-red-700 border border-red-200' 
                                  : 'bg-green-50 text-green-700 border border-green-200'
                              }`}
                              data-testid={`role-override-${role}-${tab}`}
                            >
                              {isHidden ? '❌' : '✓'} {tab.replace(/_/g, ' ')}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Click to toggle. Red = hidden from this role.
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* UI Settings Tab */}
              {customizationTab === 'ui-settings' && (
                <div className="space-y-6">
                  <p className="text-sm text-slate-600">Configure default UI behavior for this team.</p>
                  
                  <div className="grid gap-4">
                    <div>
                      <Label>Default Landing Tab</Label>
                      <Select
                        value={customizationForm.ui_settings?.default_landing_tab || 'activity'}
                        onValueChange={(value) => setCustomizationForm(prev => ({
                          ...prev,
                          ui_settings: { ...prev.ui_settings, default_landing_tab: value }
                        }))}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(customizationForm.features || {}).map(tab => (
                            <SelectItem key={tab} value={tab}>
                              {tab.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-1">The tab users see after login</p>
                    </div>

                    <div>
                      <Label>Default Leaderboard Period</Label>
                      <Select
                        value={customizationForm.ui_settings?.default_leaderboard_period || 'weekly'}
                        onValueChange={(value) => setCustomizationForm(prev => ({
                          ...prev,
                          ui_settings: { ...prev.ui_settings, default_leaderboard_period: value }
                        }))}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-1">Default period shown on leaderboard</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Branding Tab */}
              {customizationTab === 'branding' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Customize the visual appearance for this team.</p>
                  
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="logo_url">Logo URL</Label>
                      <Input
                        id="logo_url"
                        value={customizationForm.branding?.logo_url || ''}
                        onChange={(e) => setCustomizationForm(prev => ({
                          ...prev,
                          branding: { ...prev.branding, logo_url: e.target.value }
                        }))}
                        placeholder="https://example.com/logo.png"
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primary_color">Primary Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            id="primary_color"
                            value={customizationForm.branding?.primary_color || '#1e40af'}
                            onChange={(e) => setCustomizationForm(prev => ({
                              ...prev,
                              branding: { ...prev.branding, primary_color: e.target.value }
                            }))}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={customizationForm.branding?.primary_color || '#1e40af'}
                            onChange={(e) => setCustomizationForm(prev => ({
                              ...prev,
                              branding: { ...prev.branding, primary_color: e.target.value }
                            }))}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="accent_color">Accent Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            id="accent_color"
                            value={customizationForm.branding?.accent_color || '#3b82f6'}
                            onChange={(e) => setCustomizationForm(prev => ({
                              ...prev,
                              branding: { ...prev.branding, accent_color: e.target.value }
                            }))}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={customizationForm.branding?.accent_color || '#3b82f6'}
                            onChange={(e) => setCustomizationForm(prev => ({
                              ...prev,
                              branding: { ...prev.branding, accent_color: e.target.value }
                            }))}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={customizationForm.branding?.display_name || ''}
                        onChange={(e) => setCustomizationForm(prev => ({
                          ...prev,
                          branding: { ...prev.branding, display_name: e.target.value }
                        }))}
                        placeholder="Leave empty to use team name"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="tagline">Tagline</Label>
                      <Input
                        id="tagline"
                        value={customizationForm.branding?.tagline || ''}
                        onChange={(e) => setCustomizationForm(prev => ({
                          ...prev,
                          branding: { ...prev.branding, tagline: e.target.value }
                        }))}
                        placeholder="Optional tagline"
                        className="mt-1"
                      />
                    </div>

                    {/* Preview */}
                    <div className="mt-4 p-4 rounded-lg" style={{
                      background: `linear-gradient(to right, ${customizationForm.branding?.primary_color || '#1e40af'}, ${customizationForm.branding?.accent_color || '#3b82f6'})`
                    }}>
                      <div className="flex items-center gap-3">
                        {customizationForm.branding?.logo_url ? (
                          <img src={customizationForm.branding.logo_url} alt="Preview" className="h-10 w-10 object-contain bg-white rounded p-1" />
                        ) : (
                          <div className="h-10 w-10 bg-white/20 rounded flex items-center justify-center text-white text-xs">Logo</div>
                        )}
                        <div className="text-white">
                          <div className="font-semibold">{customizationForm.branding?.display_name || selectedTeamForCustomization?.name}</div>
                          {customizationForm.branding?.tagline && (
                            <div className="text-sm text-white/80">{customizationForm.branding.tagline}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowCustomizationModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveTeamCustomization} 
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={customizationLoading}
              data-testid="save-customization-btn"
            >
              {customizationLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;

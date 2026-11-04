import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyPortalApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Eye,
  EyeOff,
  Key,
  Trash2,
  Phone,
  Mail,
  UserPlus,
  Users,
  Shield,
  ShieldCheck,
  Zap,
  Search,
  Check,
  Edit2,
  LayoutDashboard,
  Inbox,
  KanbanSquare,
  CheckSquare,
  FileText,
  Workflow,
  MessageSquare,
  MessageSquareText,
  Settings,
  X,
  RefreshCw,
  Sliders,
  Filter,
  Plus,
  ChevronDown,
  ArrowRightLeft,
} from 'lucide-react';

const PERMISSION_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Executive revenue, pipeline overview & analytics', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', desc: 'Lead management, uploads, webhooks & assignments', icon: Inbox },
  { id: 'pipeline', label: 'Pipeline', desc: 'Kanban deal stages, quotations & closures', icon: KanbanSquare },
  { id: 'tasks', label: 'Tasks', desc: 'Follow-up cadences, schedules & reminders', icon: CheckSquare },
  { id: 'quotations', label: 'Quotations', desc: 'Proposals, quote requests & pricing deals', icon: FileText },
  { id: 'feedbacks', label: 'Feedback Logs', desc: 'Sales rep stage transition notes & client feedback audit', icon: MessageSquareText },
  { id: 'automation', label: 'Automation', desc: 'Lead routing rules, webhooks & auto-cadence', icon: Workflow },
  { id: 'whatsapp', label: 'WhatsApp API', desc: 'Live chat hub, templates & Meta credentials', icon: MessageSquare },
  { id: 'team', label: 'Team', desc: 'Team member directory & permission management', icon: Users },
  { id: 'settings', label: 'Settings', desc: 'Company profile, admin name & passwords', icon: Settings },
];

const ALL_SECTION_IDS = PERMISSION_SECTIONS.map((s) => s.id);

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  domain: '',
  roleType: 'sales', // 'sales' | 'manager' | 'hr' | 'custom'
  customRoleTitle: '',
  permissions: ['leads', 'pipeline', 'tasks', 'whatsapp'],
};

export default function CompanyTeamPage() {
  const { user, setSalesSession } = useAuth('company');
  const navigate = useNavigate();

  const isPrimaryAdmin =
    user?.role === 'company_admin' &&
    (!user?.custom_role || user?.custom_role?.trim().toLowerCase() === 'admin');

  const canManage =
    user?.role === 'company_admin' ||
    (Array.isArray(user?.permissions) && user.permissions.includes('team'));

  const [team, setTeam] = useState([]);
  const [domains, setDomains] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'sales' | 'manager' | 'hr'
  const [roleFilter, setRoleFilter] = useState(''); // dropdown filter
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedAccessMap, setExpandedAccessMap] = useState({});

  const toggleExpandedAccess = (id) => {
    setExpandedAccessMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Transfer Leads Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceMember, setTransferSourceMember] = useState(null);
  const [transferSummary, setTransferSummary] = useState(null);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [transferring, setTransferring] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [teamData, domainsData] = await Promise.all([
        companyPortalApi.team(),
        companyPortalApi.domains().catch(() => ({ domains: [] })),
      ]);
      setTeam(teamData.team || []);
      setDomains(domainsData.domains || []);
    } catch (err) {
      setError(err.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAddModal() {
    setShowPassword(false);
    setEditingMember(null);
    setFormData({
      ...emptyForm,
      roleType: 'sales',
      customRoleTitle: 'Sales Representative',
      permissions: ['leads', 'pipeline', 'tasks', 'whatsapp'],
    });
    setError('');
    setModalOpen(true);
  }

  function openEditModal(member) {
    setShowPassword(false);
    setEditingMember(member);
    let memberPerms = [];
    if (member.permissions) {
      try {
        memberPerms = typeof member.permissions === 'string' ? JSON.parse(member.permissions) : member.permissions;
      } catch (e) {
        memberPerms = [];
      }
    }

    let detectedRoleType = 'custom';
    if (member.role === 'salesperson' && (!member.custom_role || member.custom_role === 'Sales Representative')) {
      detectedRoleType = 'sales';
    } else if (member.custom_role === 'Manager' || (member.role === 'company_admin' && !member.custom_role)) {
      detectedRoleType = 'manager';
    } else if (member.custom_role === 'HR') {
      detectedRoleType = 'hr';
    } else if (member.custom_role) {
      detectedRoleType = 'custom';
    }

    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.agent_phone || '',
      password: '',
      domain: member.domain_name || '',
      roleType: detectedRoleType,
      customRoleTitle: member.custom_role || '',
      permissions: memberPerms.length > 0 ? memberPerms : ALL_SECTION_IDS,
    });
    setError('');
    setModalOpen(true);
  }

  function handleRoleTypeChange(type) {
    if (type === 'sales') {
      setFormData((prev) => ({
        ...prev,
        roleType: 'sales',
        customRoleTitle: 'Sales Representative',
        permissions: ['leads', 'pipeline', 'tasks', 'whatsapp'],
      }));
    } else if (type === 'manager') {
      setFormData((prev) => ({
        ...prev,
        roleType: 'manager',
        customRoleTitle: 'Manager',
        permissions: ALL_SECTION_IDS,
      }));
    } else if (type === 'hr') {
      setFormData((prev) => ({
        ...prev,
        roleType: 'hr',
        customRoleTitle: 'HR',
        permissions: ['dashboard', 'team'],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        roleType: 'custom',
        customRoleTitle:
          prev.customRoleTitle === 'Sales Representative' ||
            prev.customRoleTitle === 'Manager' ||
            prev.customRoleTitle === 'HR'
            ? ''
            : prev.customRoleTitle,
      }));
    }
  }

  function togglePermission(sectionId) {
    setFormData((prev) => {
      const exists = prev.permissions.includes(sectionId);
      const next = exists ? prev.permissions.filter((p) => p !== sectionId) : [...prev.permissions, sectionId];
      return { ...prev, permissions: next };
    });
  }

  function selectAllPermissions() {
    setFormData((prev) => ({ ...prev, permissions: ALL_SECTION_IDS }));
  }

  function clearAllPermissions() {
    setFormData((prev) => ({ ...prev, permissions: [] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        domain: formData.domain.trim(),
        role: formData.roleType,
        custom_role:
          formData.roleType === 'custom'
            ? formData.customRoleTitle.trim() || 'Team Member'
            : formData.customRoleTitle,
        permissions:
          formData.roleType === 'sales'
            ? ['leads', 'pipeline', 'tasks', 'whatsapp']
            : formData.permissions,
      };

      if (formData.password && formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      if (editingMember) {
        await companyPortalApi.updateMember(editingMember.id, payload);
        setSuccessMsg(`Team member "${payload.name}" updated successfully!`);
      } else {
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        await companyPortalApi.addMember(payload);
        setSuccessMsg(`Team member "${payload.name}" added successfully!`);
      }

      setModalOpen(false);
      await load();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setBusy(false);
    }
  }

  async function openTransferModal(member) {
    setTransferSourceMember(member);
    setTransferTargetId('');
    setTransferNotes('');
    setTransferSummary(null);
    setTransferModalOpen(true);
    setLoadingSummary(true);
    setError('');
    try {
      const data = await companyPortalApi.memberLeadsSummary(member.id);
      setTransferSummary(data);
      if (data.active_reps && data.active_reps.length > 0) {
        setTransferTargetId(String(data.active_reps[0].id));
      }
    } catch (err) {
      setError(err.message || 'Failed to load transfer summary');
    } finally {
      setLoadingSummary(false);
    }
  }

  async function handleExecuteTransfer(e) {
    if (e) e.preventDefault();
    if (!transferSourceMember || !transferTargetId) return;

    const count = transferSummary?.claimed_leads_count || 0;
    if (count === 0) {
      alert(`"${transferSourceMember.name}" has 0 claimed pipeline leads to transfer.`);
      return;
    }

    const targetRep = (transferSummary?.active_reps || []).find((r) => String(r.id) === String(transferTargetId));
    const targetName = targetRep ? targetRep.name : 'the selected salesperson';

    if (!window.confirm(`Are you sure you want to transfer ${count} pipeline leads from "${transferSourceMember.name}" to "${targetName}"?`)) {
      return;
    }

    setTransferring(true);
    setError('');
    try {
      const res = await companyPortalApi.transferLeads({
        from_salesperson_id: transferSourceMember.id,
        to_salesperson_id: transferTargetId,
        notes: transferNotes.trim(),
      });
      setSuccessMsg(res.message || 'Leads transferred successfully!');
      setTransferModalOpen(false);
      await load();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to transfer leads');
    } finally {
      setTransferring(false);
    }
  }

  async function toggleStatus(member) {
    try {
      await companyPortalApi.setMemberStatus(member.id, !member.is_active);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(member) {
    if (!window.confirm(`Are you sure you want to delete "${member.name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(member.id);
    setError('');
    try {
      await companyPortalApi.deleteMember(member.id);
      await load();
      setSuccessMsg(`Team member "${member.name}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete member');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSalesLogin(member) {
    if (!member.is_active) {
      setError('Cannot log in to a deactivated salesperson account');
      return;
    }
    setSwitchingId(member.id);
    setError('');
    try {
      const data = await companyPortalApi.impersonateSales(member.id);
      if (data.token && data.user) {
        setSalesSession(data.token, data.user);
        navigate('/sales');
      }
    } catch (err) {
      navigate(`/sales/login?email=${encodeURIComponent(member.email)}`);
    } finally {
      setSwitchingId(null);
    }
  }

  // Filtered list
  const filteredTeam = team.filter((m) => {
    const term = search.toLowerCase().trim();
    const matchSearch =
      !term ||
      m.name?.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.agent_phone?.includes(term) ||
      m.custom_role?.toLowerCase().includes(term);

    if (!matchSearch) return false;

    if (statusFilter === 'active' && !m.is_active) return false;
    if (statusFilter === 'inactive' && m.is_active) return false;

    // Dropdown role filter
    if (roleFilter === 'sales') {
      if (!(m.role === 'salesperson' && (!m.custom_role || m.custom_role.toLowerCase().includes('sales')))) return false;
    } else if (roleFilter === 'manager') {
      if (!(m.role === 'company_admin' || m.custom_role?.toLowerCase().includes('manager'))) return false;
    } else if (roleFilter === 'hr') {
      if (!m.custom_role?.toLowerCase().includes('hr')) return false;
    } else if (roleFilter === 'custom') {
      if (m.role === 'salesperson' || m.role === 'company_admin' || m.custom_role?.toLowerCase().includes('sales') || m.custom_role?.toLowerCase().includes('manager') || m.custom_role?.toLowerCase().includes('hr')) return false;
    }

    // Tab filter
    if (activeTab === 'all') return true;
    if (activeTab === 'sales')
      return m.role === 'salesperson' && (!m.custom_role || m.custom_role.toLowerCase().includes('sales'));
    if (activeTab === 'manager')
      return m.role === 'company_admin' || m.custom_role?.toLowerCase().includes('manager');
    if (activeTab === 'hr') return m.custom_role?.toLowerCase().includes('hr');
    return true;
  });

  const totalMembers = team.length;
  const activeMembers = team.filter((m) => m.is_active).length;
  const salesCount = team.filter(
    (m) => m.role === 'salesperson' && (!m.custom_role || m.custom_role.toLowerCase().includes('sales'))
  ).length;
  const managerCount = team.filter(
    (m) => m.role === 'company_admin' || m.custom_role?.toLowerCase().includes('manager')
  ).length;
  const hrCount = team.filter((m) => m.custom_role?.toLowerCase().includes('hr')).length;

  return (
    <div className="company-team-page">
      {/* Strict Scoped CSS ensuring 100% Manrope Font & Responsive Layout */}
      <style>{`
        .company-team-page,
        .company-team-page * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }
        .company-team-page {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .team-modal-container,
        .team-modal-container * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }

        /* Desktop View default */
        .team-table-desktop {
          display: block;
        }
        .team-cards-mobile {
          display: none;
        }

        /* Mobile & Tablet Responsiveness (< 900px) */
        @media (max-width: 899px) {
          .team-table-desktop {
            display: none !important;
          }
          .team-cards-mobile {
            display: flex !important;
            flex-direction: column !important;
            gap: 14px !important;
          }
          .team-header-wrap {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
          }
          .team-header-actions {
            width: 100% !important;
            display: flex !important;
            gap: 8px !important;
          }
          .team-header-actions button {
            flex: 1 !important;
            justify-content: center !important;
          }
          .team-filter-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
          }
          .team-filter-tools {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 10px !important;
          }
          .team-filter-tools > * {
            width: 100% !important;
            min-width: 100% !important;
          }
          .lead-tabs {
            display: flex !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            max-width: 100% !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 4px !important;
          }
          .lead-tabs button {
            flex-shrink: 0 !important;
            padding: 8px 14px !important;
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* 1. Top Header Matching Leads Directory Exactly */}
      <div className="team-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#F68713',
              marginBottom: '4px',
            }}
          >
            <span>Commercial Operations</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Workforce & Access</span>
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#111827',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            Enterprise Team Directory
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Manage, distribute, and track team members across active company roles, specialized domains, and permission tiers.
          </p>
        </div>

        <div className="team-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '9px',
              border: '1px solid #E6E9EE',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              type="button"
              onClick={openAddModal}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '9px',
                backgroundColor: '#F68713',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(246,135,19,0.3)',
              }}
            >
              <Plus size={14} />
              <span>+ Add Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#166534', fontSize: '13px', fontWeight: 700 }}>
          ✓ {successMsg}
        </div>
      )}

      {/* 2. Segmented Tabs - Exact Styling from Leads Directory (.lead-tabs) */}
      <div className="lead-tabs">
        <button
          type="button"
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Members ({totalMembers})
        </button>
        <button
          type="button"
          className={activeTab === 'sales' ? 'active' : ''}
          onClick={() => setActiveTab('sales')}
        >
          Sales Reps ({salesCount})
        </button>
        <button
          type="button"
          className={activeTab === 'manager' ? 'active' : ''}
          onClick={() => setActiveTab('manager')}
        >
          Managers & Admins ({managerCount})
        </button>
        <button
          type="button"
          className={activeTab === 'hr' ? 'active' : ''}
          onClick={() => setActiveTab('hr')}
        >
          HR Personnel ({hrCount})
        </button>
      </div>

      {/* 3. Search & High-Density Filter Bar (Matching Leads Directory Card) */}
      <div
        className="team-filter-bar"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>
            All Team Members
          </h2>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#F3F4F6',
              color: '#4B5563',
              padding: '2px 8px',
              borderRadius: '999px',
            }}
          >
            {filteredTeam.length} records
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="team-filter-tools" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search name, phone, email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                height: '36px',
                padding: '0 12px 0 32px',
                fontSize: '13px',
                border: '1px solid #E6E9EE',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                outline: 'none',
                minWidth: '220px',
              }}
            />
          </div>

          {/* Role Filter Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              height: '36px',
              padding: '0 10px',
              fontSize: '13px',
              border: '1px solid #E6E9EE',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Roles</option>
            <option value="sales">Sales Representatives</option>
            <option value="manager">Managers & Admins</option>
            <option value="hr">HR Personnel</option>
            <option value="custom">Custom Roles</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: '36px',
              padding: '0 10px',
              fontSize: '13px',
              border: '1px solid #E6E9EE',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            type="button"
            onClick={load}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              backgroundColor: '#F68713',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(246,135,19,0.2)',
            }}
          >
            <Filter size={13} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* 4. High-Density Enterprise Table Matching Leads Page Exactly (Desktop >= 900px) */}
      <div
        className="team-table-desktop"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E6E9EE',
                  color: '#6B7280',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                <th style={{ padding: '12px 16px', minWidth: '170px' }}>TEAM MEMBER</th>
                <th style={{ padding: '12px 16px', minWidth: '130px' }}>ROLE</th>
                <th style={{ padding: '12px 16px', minWidth: '120px' }}>PHONE</th>
                <th style={{ padding: '12px 16px', minWidth: '180px' }}>EMAIL</th>
                <th style={{ padding: '12px 16px', minWidth: '160px' }}>ASSIGNED ACCESS</th>
                <th style={{ padding: '12px 16px', minWidth: '100px' }}>STATUS</th>
                {canManage && <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: '220px' }}>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {filteredTeam.map((member) => {
                const isAdmin = member.role === 'company_admin';
                const isSelf = member.id === user?.id;

                let memberPerms = [];
                if (member.permissions) {
                  try {
                    memberPerms = typeof member.permissions === 'string' ? JSON.parse(member.permissions) : member.permissions;
                  } catch (e) {
                    memberPerms = [];
                  }
                }

                let roleLabel = member.custom_role || (isAdmin ? 'Admin' : 'Sales Representative');
                let roleBg = '#FFF3E6';
                let roleColor = '#F68713';
                let roleBorder = '#FED7AA';

                if (isAdmin || roleLabel.toLowerCase().includes('manager')) {
                  roleBg = '#E8F6FA';
                  roleColor = '#2A9CB8';
                  roleBorder = '#B8E3ED';
                } else if (roleLabel.toLowerCase().includes('hr')) {
                  roleBg = '#FAF5FF';
                  roleColor = '#7C3AED';
                  roleBorder = '#E9D5FF';
                } else if (!roleLabel.toLowerCase().includes('sales')) {
                  roleBg = '#F3F4F6';
                  roleColor = '#374151';
                  roleBorder = '#E5E7EB';
                }

                return (
                  <tr
                    key={member.id}
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      fontSize: '13px',
                      color: '#374151',
                    }}
                  >
                    {/* Name Column */}
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#111827' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{member.name}</span>
                        {isSelf && (
                          <span style={{ fontSize: '10px', backgroundColor: '#E5E7EB', color: '#374151', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            You
                          </span>
                        )}
                      </div>
                      {member.domain_name && (
                        <div style={{ fontSize: '11px', color: '#2A9CB8', fontWeight: 600, marginTop: '2px' }}>
                          {member.domain_name}
                        </div>
                      )}
                    </td>

                    {/* Role Column */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: roleBg,
                          color: roleColor,
                          border: `1px solid ${roleBorder}`,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {roleLabel}
                      </span>
                    </td>

                    {/* Phone Column */}
                    <td style={{ padding: '14px 16px' }}>
                      {member.agent_phone ? (
                        <a
                          href={`tel:${member.agent_phone}`}
                          style={{ color: '#111827', fontWeight: 600, textDecoration: 'none' }}
                        >
                          {member.agent_phone}
                        </a>
                      ) : (
                        <span style={{ color: '#9CA3AF' }}>—</span>
                      )}
                    </td>

                    {/* Email Column */}
                    <td style={{ padding: '14px 16px', color: '#4B5563', whiteSpace: 'nowrap' }}>
                      {member.email}
                    </td>

                    {/* Assigned Access */}
                    <td style={{ padding: '14px 16px', minWidth: '160px', whiteSpace: 'nowrap' }}>
                      {isAdmin && (!member.permissions || memberPerms.length === 0) ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#0284C7',
                            backgroundColor: '#E0F2FE',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            border: '1px solid #BAE6FD',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          Full Admin Access
                        </span>
                      ) : memberPerms.length > 0 ? (
                        (() => {
                          const isExpanded = Boolean(expandedAccessMap[member.id]);
                          const displayedPerms = isExpanded ? memberPerms : memberPerms.slice(0, 4);
                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: isExpanded ? '400px' : '300px' }}>
                              {displayedPerms.map((p) => {
                                const sec = PERMISSION_SECTIONS.find((s) => s.id === p);
                                return (
                                  <span
                                    key={p}
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      backgroundColor: '#F3F4F6',
                                      color: '#374151',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      border: '1px solid #E5E7EB',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {sec?.label || p}
                                  </span>
                                );
                              })}
                              {memberPerms.length > 4 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandedAccess(member.id)}
                                  title={isExpanded ? 'Click to show less' : 'Click to see all assigned access'}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: isExpanded ? '#F1F5F9' : '#EFF6FF',
                                    color: isExpanded ? '#475569' : '#2563EB',
                                    border: `1px solid ${isExpanded ? '#CBD5E1' : '#BFDBFE'}`,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {isExpanded ? 'Show less ▲' : `+${memberPerms.length - 4} more ▼`}
                                </button>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span style={{ color: '#9CA3AF', fontSize: '12px', whiteSpace: 'nowrap' }}>Sales CRM Standard</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: member.is_active ? '#DCFCE7' : '#FEE2E2',
                          color: member.is_active ? '#166534' : '#991B1B',
                          border: `1px solid ${member.is_active ? '#BBF7D0' : '#FECACA'}`,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: member.is_active ? '#16A34A' : '#DC2626',
                          }}
                        />
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions Column */}
                    {canManage && (
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {member.role === 'salesperson' && member.is_active && (
                            <button
                              type="button"
                              onClick={() => handleSalesLogin(member)}
                              disabled={switchingId === member.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '6px',
                                backgroundColor: '#2A9CB8',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <Key size={12} />
                              <span>{switchingId === member.id ? 'Connecting…' : 'Sales Login'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openEditModal(member)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              borderRadius: '6px',
                              backgroundColor: '#FFFFFF',
                              color: '#374151',
                              border: '1px solid #E6E9EE',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={12} />
                            <span>Edit Access</span>
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => toggleStatus(member)}
                              style={{
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: '#FFFFFF',
                                color: member.is_active ? '#D97706' : '#059669',
                                border: `1px solid ${member.is_active ? '#FDE68A' : '#A7F3D0'}`,
                                cursor: 'pointer',
                              }}
                            >
                              {member.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          {member.role === 'salesperson' && canManage && (
                            <button
                              type="button"
                              onClick={() => openTransferModal(member)}
                              title={`Transfer ${member.name}'s pipeline leads to an active salesperson`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '6px',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <ArrowRightLeft size={12} />
                              <span>Transfer Leads</span>
                            </button>
                          )}

                          {!isSelf && isPrimaryAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(member)}
                              disabled={deletingId === member.id}
                              title="Delete Member"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredTeam.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
                    <Users size={36} style={{ margin: '0 auto 10px auto', opacity: 0.35, color: '#F68713' }} />
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#374151' }}>No team members match this filter</div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#9CA3AF' }}>
                      {search || roleFilter || statusFilter ? 'Try clearing your search query or filters.' : 'Click "+ Add Team Member" to invite your first colleague.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Mobile & Tablet Card Layout (< 900px) */}
      <div className="team-cards-mobile">
        {filteredTeam.map((member) => {
          const isAdmin = member.role === 'company_admin';
          const isSelf = member.id === user?.id;

          let memberPerms = [];
          if (member.permissions) {
            try {
              memberPerms = typeof member.permissions === 'string' ? JSON.parse(member.permissions) : member.permissions;
            } catch (e) {
              memberPerms = [];
            }
          }

          let roleLabel = member.custom_role || (isAdmin ? 'Admin' : 'Sales Representative');
          let roleBg = '#FFF3E6';
          let roleColor = '#F68713';
          let roleBorder = '#FED7AA';

          if (isAdmin || roleLabel.toLowerCase().includes('manager')) {
            roleBg = '#E8F6FA';
            roleColor = '#2A9CB8';
            roleBorder = '#B8E3ED';
          } else if (roleLabel.toLowerCase().includes('hr')) {
            roleBg = '#FAF5FF';
            roleColor = '#7C3AED';
            roleBorder = '#E9D5FF';
          }

          const initials = (member.name || 'U')
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div
              key={member.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E6E9EE',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Member Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: roleBg,
                      color: roleColor,
                      border: `1px solid ${roleBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{member.name}</span>
                      {isSelf && (
                        <span style={{ fontSize: '10px', backgroundColor: '#E5E7EB', color: '#374151', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          You
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>
                      {member.email}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: member.is_active ? '#DCFCE7' : '#FEE2E2',
                    color: member.is_active ? '#166534' : '#991B1B',
                    border: `1px solid ${member.is_active ? '#BBF7D0' : '#FECACA'}`,
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: member.is_active ? '#16A34A' : '#DC2626',
                    }}
                  />
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Meta details */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#4B5563', backgroundColor: '#F9FAFB', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                <span
                  style={{
                    backgroundColor: roleBg,
                    color: roleColor,
                    border: `1px solid ${roleBorder}`,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {roleLabel}
                </span>

                {member.domain_name && (
                  <span style={{ color: '#2A9CB8', fontWeight: 700 }}>
                    {member.domain_name}
                  </span>
                )}

                {member.agent_phone && (
                  <a
                    href={`tel:${member.agent_phone}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#111827', fontWeight: 600, textDecoration: 'none' }}
                  >
                    <Phone size={12} color="#F68713" />
                    <span>{member.agent_phone}</span>
                  </a>
                )}
              </div>

              {/* Assigned Access Modules */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Assigned Section Access
                </div>
                {isAdmin && (!member.permissions || memberPerms.length === 0) ? (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0284C7',
                      backgroundColor: '#E0F2FE',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      border: '1px solid #BAE6FD',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Full Admin Access
                  </span>
                ) : memberPerms.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {memberPerms.map((p) => {
                      const sec = PERMISSION_SECTIONS.find((s) => s.id === p);
                      return (
                        <span
                          key={p}
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #E5E7EB',
                          }}
                        >
                          {sec?.label || p}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Sales CRM Standard</span>
                )}
              </div>

              {/* Action Buttons */}
              {canManage && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                  {member.role === 'salesperson' && member.is_active && (
                    <button
                      type="button"
                      onClick={() => handleSalesLogin(member)}
                      style={{
                        flex: '1 1 120px',
                        height: '34px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: '#2A9CB8',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Key size={12} />
                      <span>Sales Login</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditModal(member)}
                    style={{
                      flex: '1 1 120px',
                      height: '34px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      border: '1px solid #E6E9EE',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit2 size={12} />
                    <span>Edit Access</span>
                  </button>
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => toggleStatus(member)}
                      style={{
                        height: '34px',
                        padding: '0 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: '#FFFFFF',
                        color: member.is_active ? '#D97706' : '#059669',
                        border: `1px solid ${member.is_active ? '#FDE68A' : '#A7F3D0'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                  {member.role === 'salesperson' && canManage && (
                    <button
                      type="button"
                      onClick={() => openTransferModal(member)}
                      style={{
                        flex: '1 1 120px',
                        height: '34px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <ArrowRightLeft size={12} />
                      <span>Transfer Leads</span>
                    </button>
                  )}
                  {!isSelf && isPrimaryAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(member)}
                      style={{
                        height: '34px',
                        padding: '0 10px',
                        fontSize: '12px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 6. Add / Edit Modal */}
      {modalOpen && (
        <div
          className="team-modal-container"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E6E9EE',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E6E9EE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {editingMember ? `Edit Access: ${editingMember.name}` : 'Add New Team Member'}
                </h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                  Define user role and configure granular section access for the company portal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Phone Number (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter WhatsApp phone number"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    {editingMember ? 'Password (leave blank to keep current)' : 'Login Password *'}
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingMember}
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingMember ? 'Enter new password (optional)' : 'Enter login password (min 6 characters)'}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 38px 0 12px',
                        border: '1px solid #E6E9EE',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9CA3AF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Department / Domain
                  </label>
                  <input
                    type="text"
                    list="team-domains-list"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="Enter department or domain"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <datalist id="team-domains-list">
                    {domains.map((d) => (
                      <option key={d.id} value={d.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Role Selection Segmented Bar */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#111827', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Assign Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {[
                    { key: 'sales', label: 'Sales', desc: 'Standard Sales CRM' },
                    { key: 'manager', label: 'Manager', desc: 'Full Company Access' },
                    { key: 'hr', label: 'HR', desc: 'Team & Dashboard' },
                    { key: 'custom', label: 'Other', desc: 'Custom Role & Access' },
                  ].map((r) => {
                    const isSelected = formData.roleType === r.key;
                    return (
                      <button
                        type="button"
                        key={r.key}
                        onClick={() => handleRoleTypeChange(r.key)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #F68713' : '1px solid #E6E9EE',
                          backgroundColor: isSelected ? '#FFF8F0' : '#FFFFFF',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#F68713' : '#111827' }}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                          {r.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {formData.roleType === 'custom' && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                      Custom Role Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customRoleTitle}
                      onChange={(e) => setFormData({ ...formData, customRoleTitle: e.target.value })}
                      placeholder="e.g. Support Specialist, Account Executive, Operations Manager"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        border: '1px solid #E6E9EE',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#111827',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Section Access Permissions */}
              {formData.roleType === 'sales' ? (
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '12px',
                    color: '#166534',
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: '2px' }}>Standard Sales CRM Role</div>
                  <div>
                    This user logs into the <strong>Sales Rep Portal</strong> with full access to their assigned Leads, Sales Pipeline, Tasks cadence, and WhatsApp Customer Chat.
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#111827', letterSpacing: '0.04em' }}>
                        Portal Section Permissions
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        Check each company portal section this user is authorized to view and operate.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={selectAllPermissions}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#F68713',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Select All
                      </button>
                      <span style={{ color: '#D1D5DB' }}>|</span>
                      <button
                        type="button"
                        onClick={clearAllPermissions}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6B7280',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {PERMISSION_SECTIONS.map((sec) => {
                      const isChecked = formData.permissions.includes(sec.id);
                      const Icon = sec.icon;
                      return (
                        <label
                          key={sec.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isChecked ? '1px solid #F68713' : '1px solid #E6E9EE',
                            backgroundColor: isChecked ? '#FFF8F0' : '#FFFFFF',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(sec.id)}
                            style={{
                              marginTop: '2px',
                              accentColor: '#F68713',
                              cursor: 'pointer',
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon size={14} color={isChecked ? '#F68713' : '#6B7280'} />
                              <span style={{ fontSize: '13px', fontWeight: 700, color: isChecked ? '#111827' : '#374151' }}>
                                {sec.label}
                              </span>
                            </div>
                            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px', lineHeight: 1.3 }}>
                              {sec.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E6E9EE', paddingTop: '16px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #E6E9EE',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#F68713',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 3px rgba(246,135,19,0.3)',
                  }}
                >
                  {busy ? 'Saving…' : editingMember ? 'Update Team Member' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Transfer Leads Modal */}
      {transferModalOpen && transferSourceMember && (
        <div
          className="team-modal-container"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E6E9EE',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E6E9EE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Transfer Pipeline Leads
                  </h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Reassign active pipeline leads from this rep to another active rep.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleExecuteTransfer} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Source Rep Summary Card */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Source Salesperson
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: transferSourceMember.is_active ? '#DCFCE7' : '#FEE2E2',
                      color: transferSourceMember.is_active ? '#166534' : '#991B1B',
                    }}
                  >
                    {transferSourceMember.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  {transferSourceMember.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>
                  {transferSourceMember.email} {transferSourceMember.agent_phone ? `• ${transferSourceMember.agent_phone}` : ''}
                </div>

                {/* Lead Count Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#1D4ED8' }}>
                      {loadingSummary ? '…' : (transferSummary?.claimed_leads_count || 0)}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#3B82F6', marginTop: '2px' }}>
                      Claimed Leads in Pipeline
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#B45309' }}>
                      {loadingSummary ? '…' : (transferSummary?.pending_reminders_count || 0)}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', marginTop: '2px' }}>
                      Pending Reminders & Tasks
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Rep Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                  Transfer To Active Salesperson *
                </label>
                {loadingSummary ? (
                  <div style={{ fontSize: '12px', color: '#64748B', padding: '8px 0' }}>Loading active salespersons…</div>
                ) : (transferSummary?.active_reps || []).length === 0 ? (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#991B1B',
                    }}
                  >
                    ⚠️ No other active salespersons found in your company. Please create or activate another salesperson first.
                  </div>
                ) : (
                  <select
                    required
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="" disabled>-- Select active salesperson --</option>
                    {(transferSummary?.active_reps || []).map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name} ({rep.email}) - Active
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Transfer Notes (Optional) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Transfer Reason / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Sales rep departure, reallocating active accounts to new rep..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Explanatory Info Card */}
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '11px',
                  color: '#166534',
                  lineHeight: '1.45',
                }}
              >
                <div>✓ <strong>Pipeline Stages Preserved:</strong> Transferred leads remain in their exact current stages (Contacted, Interested, Quotes, etc.).</div>
                <div style={{ marginTop: '2px' }}>✓ <strong>Tagging:</strong> All leads will carry a visible <strong>🔄 Transferred</strong> badge.</div>
                <div style={{ marginTop: '2px' }}>✓ <strong>Auditing:</strong> Past notes, call logs, WhatsApp chats, and quotes remain fully accessible.</div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || loadingSummary || !transferTargetId || (transferSummary?.claimed_leads_count || 0) === 0}
                  style={{
                    height: '38px',
                    padding: '0 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: (transferSummary?.claimed_leads_count || 0) === 0 ? '#94A3B8' : '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: transferring || (transferSummary?.claimed_leads_count || 0) === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 3px rgba(37,99,235,0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ArrowRightLeft size={14} />
                  <span>{transferring ? 'Transferring Leads…' : `Confirm & Transfer Leads`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

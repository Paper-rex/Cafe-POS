import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { UserPlus, Mail, Shield, MoreVertical, Send, Trash2, Users as UsersIcon } from 'lucide-react';
import api from '../../lib/api';
import type { User } from '../../types';

export default function Staff() {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('WAITER');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const fetchStaff = async () => {
    try { const { data } = await api.get('/admin/staff'); setStaff(data); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchStaff(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      await api.post('/admin/staff', { email: inviteEmail, role: inviteRole, name: inviteName });
      addToast('success', `Invite sent to ${inviteEmail}`);
      setShowInvite(false); setInviteEmail(''); setInviteName('');
      fetchStaff();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to invite'); }
    finally { setInviteLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to disable this user?')) return;
    try { await api.delete(`/admin/staff/${id}`); addToast('success', 'User disabled'); fetchStaff(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleResend = async (id: string) => {
    try { await api.post(`/admin/staff/${id}/resend-invite`); addToast('success', 'Invite resent'); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    if (!confirm(`Change this user's access role to ${newRole}?`)) return;
    try {
      await api.patch(`/admin/staff/${id}/role`, { role: newRole });
      addToast('success', 'Role updated');
      fetchStaff();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleEnable = async (id: string) => {
    try {
      await api.patch(`/admin/staff/${id}/enable`);
      addToast('success', 'User access restored');
      fetchStaff();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to re-enable');
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!confirm('WARNING: Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/staff/${id}/permanent`);
      addToast('success', 'User permanently deleted');
      fetchStaff();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to permanently delete');
    }
  };

  if (loading) return <PageLoader />;

  const roleBadge = (role: string) => {
    const m: Record<string, 'success' | 'info' | 'warning' | 'danger'> = { ADMIN: 'danger', WAITER: 'success', KITCHEN: 'warning', CASHIER: 'info' };
    return <Badge variant={m[role] || 'neutral'}>{role}</Badge>;
  };
  const statusBadge = (status: string) => {
    const m: Record<string, 'success' | 'warning' | 'danger'> = { ACTIVE: 'success', PENDING: 'warning', DISABLED: 'danger' };
    return <Badge variant={m[status] || 'neutral'} dot>{status}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="font-display text-3xl font-bold text-text-primary">Staff</h1><p className="text-text-secondary mt-1">Manage your team members</p></div>
        <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowInvite(true)}>Invite Staff</Button>
      </div>

      {staff.length === 0 ? (
        <Card className="p-12 text-center">
          <UsersIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-text-primary mb-2">No staff yet</h3>
          <p className="text-text-secondary mb-6">Start by inviting your first team member</p>
          <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowInvite(true)}>Invite Staff</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-surface-2">
              {staff.map((s, i) => (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="hover:bg-surface-1 transition-colors">
                  <td className="px-6 py-4"><div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-pale flex items-center justify-center text-brand-dark text-sm font-bold">
                      {(s.name || s.email)[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-text-primary">{s.name || '—'}</span>
                  </div></td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{s.email}</td>
                  <td className="px-6 py-4">
                    <select 
                      value={s.role} 
                      onChange={(e) => handleRoleChange(s.id, e.target.value)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-brand-main font-semibold ${
                        s.role === 'ADMIN' ? 'bg-danger-pale text-danger border-danger/20' : 
                        s.role === 'WAITER' ? 'bg-success-pale text-success border-success/20' : 
                        s.role === 'KITCHEN' ? 'bg-warning-pale text-warning border-warning/20' : 
                        'bg-info-pale text-info border-info/20'
                      }`}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="CASHIER">CASHIER</option>
                      <option value="KITCHEN">KITCHEN</option>
                      <option value="WAITER">WAITER</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">{statusBadge(s.status)}</td>
                  <td className="px-6 py-4"><div className="flex items-center gap-2">
                    {s.status === 'PENDING' && (
                      <button onClick={() => handleResend(s.id)} className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-brand-main" title="Resend invite">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {s.status !== 'DISABLED' && (
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-danger-pale text-text-muted hover:text-danger" title="Disable User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {s.status === 'DISABLED' && (
                      <>
                        <button onClick={() => handleEnable(s.id)} className="p-1.5 px-3 rounded-lg bg-surface-2 hover:bg-success-pale text-text-secondary hover:text-success text-xs font-semibold transition-colors" title="Re-enable Access">
                          Enable
                        </button>
                        <button onClick={() => handleHardDelete(s.id)} className="p-1.5 rounded-lg bg-surface-2 hover:bg-danger-pale text-text-secondary hover:text-danger transition-colors" title="Permanently Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Staff Member">
        <div className="p-6 space-y-4">
          <Input label="Name (optional)" placeholder="John Doe" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          <Input label="Email" type="email" placeholder="john@cafe.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />} required />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary text-sm focus:ring-2 focus:ring-brand-pale focus:border-brand-main">
              <option value="WAITER">Waiter</option>
              <option value="KITCHEN">Kitchen</option>
              <option value="CASHIER">Cashier</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowInvite(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleInvite} loading={inviteLoading} className="flex-1" icon={<Send className="w-4 h-4" />}>Send Invite</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

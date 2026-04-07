import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { UserPlus, Mail, Send, Trash2, Users as UsersIcon, RotateCcw } from 'lucide-react';
import api from '../../lib/api';
import type { User } from '../../types';
import { useBranchStore } from '../../store/useBranchStore';

const roleColors: Record<string, string> = {
  ADMIN: '#FF2D78',
  WAITER: '#00FFB3',
  KITCHEN: '#FF6B2B',
  CASHIER: '#FFE600',
};

export default function Staff() {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('WAITER');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const selectedBranchId = useBranchStore((s) => s.selectedBranchId);

  const fetchStaff = async () => {
    if (!selectedBranchId) return;
    try { const { data } = await api.get(`/admin/staff?branchId=${selectedBranchId}`); setStaff(data); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchStaff(); }, [selectedBranchId]);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      await api.post('/admin/staff', { email: inviteEmail, role: inviteRole, name: inviteName, branchIds: selectedBranchId ? [selectedBranchId] : [] });
      addToast('success', `Invite sent to ${inviteEmail}`);
      setShowInvite(false); setInviteEmail(''); setInviteName('');
      fetchStaff();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to invite'); }
    finally { setInviteLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Disable this user?')) return;
    try { await api.delete(`/admin/staff/${id}`); addToast('success', 'User disabled'); fetchStaff(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleResend = async (id: string) => {
    try { await api.post(`/admin/staff/${id}/resend-invite`); addToast('success', 'Invite resent'); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    if (!confirm(`Change role to ${newRole}?`)) return;
    try { await api.patch(`/admin/staff/${id}/role`, { role: newRole }); addToast('success', 'Role updated'); fetchStaff(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to update role'); }
  };

  const handleEnable = async (id: string) => {
    try { await api.patch(`/admin/staff/${id}/enable`); addToast('success', 'User access restored'); fetchStaff(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to re-enable'); }
  };

  const handleHardDelete = async (id: string) => {
    if (!confirm('WARNING: Permanently delete this user? This cannot be undone.')) return;
    try { await api.delete(`/admin/staff/${id}/permanent`); addToast('success', 'User permanently deleted'); fetchStaff(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to delete'); }
  };

  if (loading) return <PageLoader />;

  const statusBadge = (status: string) => {
    const m: Record<string, 'success' | 'warning' | 'danger'> = { ACTIVE: 'success', PENDING: 'warning', DISABLED: 'danger' };
    return <Badge variant={m[status] || 'neutral'} dot>{status}</Badge>;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-neon-pink mb-1">Admin Console</p>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-white uppercase">Staff</h1>
          <p className="text-xs text-ink-muted mt-1 font-medium">{staff.length} team member{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <Button icon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setShowInvite(true)}>
          Invite Staff
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="p-14 text-center bg-surface-2 border border-edge rounded"
             style={{ boxShadow: '4px 4px 0px #FF2D78' }}>
          <div className="w-14 h-14 bg-surface-3 border border-edge rounded mx-auto flex items-center justify-center mb-5">
            <UsersIcon className="w-7 h-7 text-ink-muted" />
          </div>
          <h3 className="text-lg font-black uppercase text-white mb-2">No Staff Yet</h3>
          <p className="text-xs text-ink-muted mb-7">Start by inviting your first team member</p>
          <Button icon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setShowInvite(true)}>Invite Staff</Button>
        </div>
      ) : (
        <div className="bg-surface-2 border border-edge rounded overflow-hidden"
             style={{ boxShadow: '4px 4px 0px #FF2D78' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge bg-surface-1">
                {['Member', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black tracking-[0.12em] uppercase text-ink-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {staff.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="hover:bg-[rgba(255,45,120,0.04)] transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-black text-white shrink-0"
                        style={{ backgroundColor: roleColors[s.role] || '#2A2A2A' }}
                      >
                        {(s.name || s.email)[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-ink-primary">{s.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-secondary font-medium">{s.email}</td>
                  <td className="px-5 py-3">
                    <select
                      value={s.role}
                      onChange={(e) => handleRoleChange(s.id, e.target.value)}
                      className="text-[10px] px-2 py-1.5 rounded border bg-surface-3 font-black uppercase tracking-[0.08em] focus:outline-none focus:border-neon-pink transition-colors cursor-pointer"
                      style={{ color: roleColors[s.role] || '#A0A0A0', borderColor: `${roleColors[s.role] || '#2A2A2A'}40` }}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="CASHIER">CASHIER</option>
                      <option value="KITCHEN">KITCHEN</option>
                      <option value="WAITER">WAITER</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">{statusBadge(s.status)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      {s.status === 'PENDING' && (
                        <button
                          onClick={() => handleResend(s.id)}
                          className="p-1.5 rounded hover:bg-[rgba(0,255,179,0.1)] text-ink-muted hover:text-neon-mint transition-colors"
                          title="Resend invite"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {s.status !== 'DISABLED' && (
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 rounded hover:bg-[rgba(255,59,92,0.1)] text-ink-muted hover:text-danger transition-colors"
                          title="Disable User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {s.status === 'DISABLED' && (
                        <>
                          <button
                            onClick={() => handleEnable(s.id)}
                            className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-[0.08em] hover:bg-[rgba(0,255,179,0.1)] text-ink-muted hover:text-neon-mint transition-colors border border-edge"
                            title="Re-enable Access"
                          >
                            <RotateCcw className="w-3 h-3 inline mr-1" />Enable
                          </button>
                          <button
                            onClick={() => handleHardDelete(s.id)}
                            className="p-1.5 rounded hover:bg-[rgba(255,59,92,0.1)] text-ink-muted hover:text-danger transition-colors"
                            title="Permanently Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Staff Member">
        <div className="p-6 space-y-4">
          <Input label="Name (optional)" placeholder="e.g. Rahul Sharma" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          <Input
            label="Email Address"
            type="email"
            placeholder="staff@induspos.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            icon={<Mail className="w-3.5 h-3.5" />}
            required
          />
          <div>
            <label className="block text-[10px] font-black tracking-[0.12em] uppercase text-ink-secondary mb-2">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded border border-edge bg-surface-2 text-ink-primary text-xs font-bold focus:border-neon-pink outline-none transition-colors"
            >
              <option value="WAITER">Waiter</option>
              <option value="KITCHEN">Kitchen</option>
              <option value="CASHIER">Cashier</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowInvite(false)} className="flex-1 border border-edge">Cancel</Button>
            <Button onClick={handleInvite} loading={inviteLoading} className="flex-1" icon={<Send className="w-3.5 h-3.5" />}>
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { Banknote, CreditCard, Smartphone, Save, Check } from 'lucide-react';
import api from '../../lib/api';
import type { PaymentConfig as PaymentConfigType } from '../../types';

const methodConfig = [
  {
    key: 'cashEnabled' as keyof PaymentConfigType,
    icon: <Banknote className="w-5 h-5" />,
    label: 'Cash',
    desc: 'Accept cash payments with exact change calculation',
    color: '#00FFB3',
  },
  {
    key: 'cardEnabled' as keyof PaymentConfigType,
    icon: <CreditCard className="w-5 h-5" />,
    label: 'Card / POS',
    desc: 'Accept debit and credit card payments via terminal',
    color: '#38BDF8',
  },
  {
    key: 'upiEnabled' as keyof PaymentConfigType,
    icon: <Smartphone className="w-5 h-5" />,
    label: 'UPI',
    desc: 'Accept UPI payments with scannable QR code',
    color: '#FF2D78',
  },
];

export default function PaymentConfig() {
  const [config, setConfig] = useState<PaymentConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    api.get('/payment-config').then(({ data }) => { setConfig(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return; setSaving(true);
    try {
      const { data } = await api.patch('/payment-config', config);
      setConfig(data);
      addToast('success', 'Payment config saved');
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading || !config) return <PageLoader />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-neon-pink mb-1">Admin Console</p>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-white uppercase">Payment Methods</h1>
          <p className="text-xs text-ink-muted mt-1 font-medium">Configure accepted payment modes for your staff</p>
        </div>
        <Button icon={<Save className="w-3.5 h-3.5" />} loading={saving} onClick={handleSave}>
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {methodConfig.map(({ key, icon, label, desc, color }) => {
          const enabled = !!config[key];
          return (
            <div
              key={key}
              className="bg-surface-2 border border-edge rounded p-6 transition-all duration-100"
              style={{
                boxShadow: enabled ? `4px 4px 0px ${color}` : '4px 4px 0px #2A2A2A',
                borderTop: enabled ? `2px solid ${color}` : '2px solid #2A2A2A',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: enabled ? `${color}18` : '#2A2A2A',
                      color: enabled ? color : '#505050',
                      border: `1px solid ${enabled ? color + '30' : '#2A2A2A'}`,
                    }}
                  >
                    {icon}
                  </div>
                  <h3 className="text-sm font-black tracking-[0.04em] uppercase text-white">{label}</h3>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => setConfig({ ...config, [key]: !enabled })}
                  className="relative w-12 h-6 rounded-sm transition-colors"
                  style={{ backgroundColor: enabled ? color : '#2A2A2A', border: `1px solid ${enabled ? color : '#3A3A3A'}` }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-sm shadow transition-transform ${enabled ? 'translate-x-6' : ''}`}>
                    {enabled && <Check className="w-3 h-3 text-surface-1 m-1" />}
                  </span>
                </button>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed mb-4">{desc}</p>

              {/* UPI extra fields */}
              {key === 'upiEnabled' && enabled && (
                <div className="space-y-3 pt-4 border-t border-edge">
                  <Input
                    label="UPI ID"
                    placeholder="cafe@upi"
                    value={config.upiId || ''}
                    onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                  />
                  <Input
                    label="Display Name"
                    placeholder="Indus Cafe"
                    value={config.upiName || ''}
                    onChange={(e) => setConfig({ ...config, upiName: e.target.value })}
                  />
                </div>
              )}

              {/* Status pill */}
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: enabled ? color : '#505050' }}
                />
                <span
                  className="text-[10px] font-black uppercase tracking-[0.12em]"
                  style={{ color: enabled ? color : '#505050' }}
                >
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

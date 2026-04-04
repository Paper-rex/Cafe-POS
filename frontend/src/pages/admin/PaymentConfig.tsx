import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { Banknote, CreditCard, Smartphone, Save } from 'lucide-react';
import api from '../../lib/api';
import type { PaymentConfig as PaymentConfigType } from '../../types';

export default function PaymentConfig() {
  const [config, setConfig] = useState<PaymentConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => { api.get('/payment-config').then(({ data }) => { setConfig(data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const handleSave = async () => {
    if (!config) return; setSaving(true);
    try { const { data } = await api.patch('/payment-config', config); setConfig(data); addToast('success', 'Payment config saved'); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to save'); } finally { setSaving(false); }
  };

  if (loading || !config) return <PageLoader />;

  const toggleClasses = (enabled: boolean) => enabled
    ? 'bg-brand-main' : 'bg-gray-300';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="font-display text-3xl font-bold text-text-primary">Payment Methods</h1><p className="text-text-secondary mt-1">Configure accepted payment methods</p></div>
        <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={handleSave}>Save Changes</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cash */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center"><Banknote className="w-5 h-5 text-green-600" /></div><h3 className="font-display font-semibold text-text-primary">Cash</h3></div>
            <button onClick={() => setConfig({ ...config, cashEnabled: !config.cashEnabled })} className={`w-11 h-6 rounded-full transition-colors relative ${toggleClasses(config.cashEnabled)}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.cashEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <p className="text-sm text-text-secondary">Accept cash payments with change calculation</p>
        </Card>

        {/* Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-blue-600" /></div><h3 className="font-display font-semibold text-text-primary">Card</h3></div>
            <button onClick={() => setConfig({ ...config, cardEnabled: !config.cardEnabled })} className={`w-11 h-6 rounded-full transition-colors relative ${toggleClasses(config.cardEnabled)}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.cardEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <p className="text-sm text-text-secondary">Accept debit/credit card payments</p>
        </Card>

        {/* UPI */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center"><Smartphone className="w-5 h-5 text-purple-600" /></div><h3 className="font-display font-semibold text-text-primary">UPI</h3></div>
            <button onClick={() => setConfig({ ...config, upiEnabled: !config.upiEnabled })} className={`w-11 h-6 rounded-full transition-colors relative ${toggleClasses(config.upiEnabled)}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.upiEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {config.upiEnabled && (
            <div className="space-y-3 mt-4 pt-4 border-t border-border">
              <Input label="UPI ID" placeholder="cafe@upi" value={config.upiId || ''} onChange={(e) => setConfig({ ...config, upiId: e.target.value })} />
              <Input label="Display Name" placeholder="Café POS" value={config.upiName || ''} onChange={(e) => setConfig({ ...config, upiName: e.target.value })} />
            </div>
          )}
          {!config.upiEnabled && <p className="text-sm text-text-secondary">Accept UPI payments with QR code</p>}
        </Card>
      </div>
    </div>
  );
}

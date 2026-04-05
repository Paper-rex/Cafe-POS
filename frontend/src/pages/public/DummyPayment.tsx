import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { formatCurrency } from '../../lib/formatters';
import api from '../../lib/api';

type PaymentIntent = {
  orderId: string;
  orderNumber: string;
  table: { id: string; number: number } | null;
  totalAmount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  isPaid: boolean;
  paymentMethod: 'UPI' | 'CASH' | 'CARD';
  paymentLabel: string;
};

export default function DummyPayment() {
  const { orderId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [payerName, setPayerName] = useState('');
  const [upiId, setUpiId] = useState('');

  const loadIntent = async () => {
    if (!orderId || !token) {
      setError('Missing payment token');
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get<PaymentIntent>(`/self-order/orders/${orderId}/payment-intent`, {
        params: { token },
      });
      setIntent(data);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Unable to load payment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntent();
  }, [orderId, token]);

  const canPay = useMemo(() => !!intent && !intent.isPaid && !processing, [intent, processing]);

  const handlePayNow = async () => {
    if (!intent || !canPay) return;
    setProcessing(true);
    setError('');

    try {
      // Simulate real payment processing
      await new Promise((resolve) => setTimeout(resolve, 2500));

      await api.post(`/self-order/orders/${orderId}/pay`, {
        token,
        payerName,
        upiId,
      });

      await loadIntent();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const goToTracking = () => {
    navigate(`/self-order/track/${orderId}?token=${encodeURIComponent(token)}`);
  };

  if (loading) return <PageLoader />;

  if (!intent) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <Card className="p-6">
          <p className="text-danger">{error || 'Unable to load payment intent'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl font-bold text-text-primary">Dummy Online Payment</h1>
          <Badge variant={intent.isPaid ? 'success' : 'warning'}>{intent.isPaid ? 'PAID' : 'UNPAID'}</Badge>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-danger-pale text-danger text-sm">{error}</div>}

        <div className="space-y-2 rounded-xl border border-border p-4 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Order ID</span>
            <span className="font-mono text-text-primary">{intent.orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Table Number</span>
            <span className="text-text-primary">{intent.table?.number ?? '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Total Billing Amount</span>
            <span className="font-display text-2xl font-bold text-brand-main">{formatCurrency(intent.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Payment Type</span>
            <Badge variant="info">Online Payment</Badge>
          </div>
        </div>

        {!intent.isPaid && (
          <div className="space-y-3 mb-4">
            <Input
              label="Payer Name (optional)"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="Customer name"
            />
            <Input
              label="UPI ID (optional)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="name@upi"
            />
          </div>
        )}

        {intent.isPaid ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-success-pale border border-success/20 p-4 text-brand-dark font-medium">
              Payment Successful ✅
            </div>
            <Button className="w-full" onClick={goToTracking}>Track Order Status</Button>
          </div>
        ) : (
          <Button
            className="w-full"
            size="lg"
            onClick={handlePayNow}
            disabled={!canPay}
            loading={processing}
          >
            Pay Now
          </Button>
        )}
      </Card>
    </div>
  );
}

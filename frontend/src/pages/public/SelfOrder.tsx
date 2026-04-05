import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';

type Category = { id: string; name: string; icon?: string | null };
type Product = { id: string; name: string; price: number; description?: string | null; imageUrl?: string | null; categoryId: string };
type AvailableTable = { id: string; number: number; seats: number; floorName: string };
type BootstrapResponse = {
  categories: Category[];
  products: Product[];
  availableTables: AvailableTable[];
  requestedTable: { id: string; number: number; occupied: boolean } | null;
  paymentConfig: { upiEnabled: boolean; upiId?: string | null; upiName?: string | null };
};

type CartItem = { productId: string; name: string; unitPrice: number; quantity: number };

export default function SelfOrder() {
  const params = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const tableIdFromLink = params.tableId || query.get('tableId') || '';
  const trackingOrderId = params.orderId || '';
  const trackingTokenFromUrl = query.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tableId, setTableId] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentOption, setPaymentOption] = useState<'PAY_AT_COUNTER' | 'PREPAID_UPI'>('PAY_AT_COUNTER');

  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [trackingToken, setTrackingToken] = useState('');
  const [customerStatus, setCustomerStatus] = useState<'TO_COOK' | 'PREPARING' | 'COMPLETED'>('TO_COOK');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(0);

  useEffect(() => {
    if (!trackingOrderId || !trackingTokenFromUrl) return;
    setOrderId(trackingOrderId);
    setTrackingToken(trackingTokenFromUrl);
    setTracking(true);
  }, [trackingOrderId, trackingTokenFromUrl]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<BootstrapResponse>('/self-order/bootstrap', {
          params: tableIdFromLink ? { tableId: tableIdFromLink } : undefined,
        });

        setCategories(data.categories);
        setProducts(data.products);
        setAvailableTables(data.availableTables);
        setSelectedCategory(data.categories[0]?.id || null);

        if (data.requestedTable && !data.requestedTable.occupied) {
          setTableId(data.requestedTable.id);
        }
      } catch (e: any) {
        setError(e.response?.data?.error || 'Unable to load self-order page');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tableIdFromLink]);

  useEffect(() => {
    if (!tracking || !orderId || !trackingToken) return;

    const fetchStatus = async () => {
      try {
        const { data } = await api.get(`/self-order/orders/${orderId}/status`, {
          params: { token: trackingToken },
        });
        setCustomerStatus(data.customerStatus);
        setEstimatedMinutes(data.estimatedMinutes || 0);
      } catch {
        // Ignore transient polling errors
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [tracking, orderId, trackingToken]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory && p.categoryId !== selectedCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, selectedCategory, search]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [cart]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev
      .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
      .filter((i) => i.quantity > 0));
  };

  const placeOrder = async () => {
    setError('');
    if (!name.trim() || !phone.trim() || !tableId || cart.length === 0) {
      setError('Please fill name, phone, table and add at least one item');
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `self-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { data } = await api.post('/self-order/orders', {
        name: name.trim(),
        phone: phone.trim(),
        tableId,
        paymentOption,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      }, {
        headers: { 'x-idempotency-key': idempotencyKey },
      });

      setOrderId(data.orderId);
      setOrderNumber(data.orderNumber);
      setTrackingToken(data.trackingToken);
      setEstimatedMinutes(data.estimatedMinutes || 0);
      navigate(`/self-order/payment/${data.orderId}?token=${encodeURIComponent(data.trackingToken)}`);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  if (tracking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        <Card className="p-6">
          <h1 className="font-display text-2xl font-bold text-text-primary mb-1">Order Placed</h1>
          <p className="text-text-secondary mb-4">Track your order in real-time</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Order ID</span>
              <span className="font-mono font-semibold">{orderNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Current Status</span>
              <Badge variant={customerStatus === 'COMPLETED' ? 'success' : customerStatus === 'PREPARING' ? 'warning' : 'info'}>
                {customerStatus === 'TO_COOK' ? 'To Cook' : customerStatus === 'PREPARING' ? 'Preparing' : 'Completed'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Estimated Time</span>
              <span className="font-medium">{estimatedMinutes > 0 ? `${estimatedMinutes} min` : 'Ready'}</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-surface-1 border border-border p-3 text-sm text-text-secondary">
            When kitchen marks completed, POS will show: "Order #{orderNumber} is Ready to Serve".
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-text-primary">Self Booking / Self Ordering</h1>
        <p className="text-sm text-text-secondary">Order directly from your table</p>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-danger-pale text-danger text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Customer Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone" />
            </div>
            <div className="mt-3">
              <label className="block text-sm text-text-secondary mb-1">Table</label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Select available table</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>Table {t.number} • {t.floorName} • {t.seats} seats</option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <label className="block text-sm text-text-secondary mb-1">Payment Option</label>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={paymentOption === 'PAY_AT_COUNTER'}
                    onChange={() => setPaymentOption('PAY_AT_COUNTER')}
                  />
                  Pay at Counter
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={paymentOption === 'PREPAID_UPI'}
                    onChange={() => setPaymentOption('PREPAID_UPI')}
                  />
                  Prepaid UPI
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${selectedCategory === cat.id ? 'bg-brand-main text-white' : 'bg-surface-2 text-text-secondary'}`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu..." />

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProducts.map((p) => (
                <Card key={p.id} className="p-3 cursor-pointer" hover onClick={() => addToCart(p)}>
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-28 object-cover rounded-lg mb-2"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-28 rounded-lg mb-2 bg-surface-2" />
                  )}
                  <p className="font-medium text-text-primary">{p.name}</p>
                  <p className="text-xs text-text-muted line-clamp-2 min-h-8">{p.description || 'No description'}</p>
                  <p className="mt-2 font-display font-bold text-brand-main">{formatCurrency(p.price)}</p>
                </Card>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-4 h-fit lg:sticky lg:top-24">
          <h3 className="font-semibold mb-2">Your Cart</h3>
          {cart.length === 0 ? (
            <p className="text-sm text-text-muted">No items yet</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-2 border-b border-surface-2 pb-2">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-text-muted">{formatCurrency(item.unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="w-6 h-6 rounded bg-surface-2" onClick={() => updateQty(item.productId, -1)}>-</button>
                    <span className="text-sm w-4 text-center">{item.quantity}</span>
                    <button className="w-6 h-6 rounded bg-surface-2" onClick={() => updateQty(item.productId, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-text-secondary">Total</span>
            <span className="font-display text-xl font-bold">{formatCurrency(total)}</span>
          </div>

          <Button className="w-full mt-4" size="lg" onClick={placeOrder} loading={submitting} disabled={cart.length === 0}>
            Place Order
          </Button>
        </Card>
      </div>
    </div>
  );
}

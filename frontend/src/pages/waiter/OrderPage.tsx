import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { Search, Plus, Minus, Send } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import api from '../../lib/api';
import type { Category, Product } from '../../types';

interface CartItem { productId: string; name: string; unitPrice: number; quantity: number; variants: any[]; toppings: any[]; }

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId') || '';
  const tableNumber = searchParams.get('tableNumber') || '?';
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounce(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchCategories = async () => {
    try {
      const cRes = await api.get('/categories');
      setCategories(cRes.data);
    } catch (err) { }
  };

  const fetchProducts = async () => {
    try {
      if (page === 1 && !loading) setIsFetching(true);
      else setIsFetchingMore(true);
      
      const pRes = await api.get('/products', { 
        params: { active: true, page, limit: 20, categoryId: selectedCat || undefined, search: searchDebounce } 
      });
      
      if (page === 1) {
         setProducts(pRes.data.data);
      } else {
         setProducts(prev => [...prev, ...pRes.data.data]);
      }
      setTotalPages(pRes.data.pagination.totalPages || 1);
    } catch {} finally { 
       setLoading(false); 
       setIsFetching(false);
       setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCat, searchDebounce]);

  const handleCategoryClick = (catId: string | null) => {
    setSelectedCat(catId);
    setPage(1);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1, variants: [], toppings: [] }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const total = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const handleSend = async () => {
    if (!cart.length) return; setSending(true);
    try {
      const { data } = await api.post('/orders', { tableId, items: cart });
      addToast('success', `Order ${data.orderNumber} sent to kitchen!`);
      // Auto-transition to SENT
      await api.patch(`/orders/${data.id}/status`, { status: 'SENT' });
      setCart([]);
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to create order'); }
    finally { setSending(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex gap-4 h-[calc(100vh-80px)]">
      {/* Left: Categories */}
      <div className="w-48 shrink-0 bg-white rounded-2xl border border-border p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 mb-2"><p className="font-display text-sm font-bold text-text-primary">Categories</p></div>
        <button onClick={() => handleCategoryClick(null)}
          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${!selectedCat ? 'bg-brand-main text-white' : 'text-text-secondary hover:bg-surface-2'}`}>
          All Products
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => handleCategoryClick(cat.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${selectedCat === cat.id ? 'bg-brand-main text-white' : 'text-text-secondary hover:bg-surface-2'}`}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Middle: Products */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand-pale focus:border-brand-main" />
        </div>
        <div className="flex-1 flex flex-col relative pb-6">
          {isFetching && !loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
              <PageLoader />
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto">
            {products.map(product => {
            const inCart = cart.find(i => i.productId === product.id);
            return (
              <motion.div key={product.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className="p-4 cursor-pointer relative" hover onClick={() => addToCart(product)}>
                  {inCart && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-brand-main text-white text-xs font-bold rounded-full flex items-center justify-center">{inCart.quantity}</span>
                  )}
                  <h3 className="text-sm font-medium text-text-primary mb-1">{product.name}</h3>
                  <p className="text-xs text-text-muted mb-2 line-clamp-1">{product.description}</p>
                  <span className="text-sm font-display font-bold text-brand-main">{formatCurrency(product.price)}</span>
                </Card>
              </motion.div>
            );
          })}
          
          {products.length === 0 && !loading && (
            <div className="col-span-full text-center py-10 text-text-muted">
              No products found.
            </div>
          )}

          {page < totalPages && (
            <div className="col-span-full pt-4 flex justify-center mt-auto">
              <Button variant="outline" loading={isFetchingMore} onClick={() => setPage(p => p + 1)}>
                Load More
              </Button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-80 shrink-0 bg-white rounded-2xl border border-border flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg font-bold text-text-primary">Table {tableNumber}</h2>
          <p className="text-xs text-text-muted">New Order</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-8">Add items to get started</p>
          ) : cart.map(item => (
            <div key={item.productId} className="flex items-center gap-3 py-2 border-b border-surface-2 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                <p className="text-xs text-text-muted">{formatCurrency(item.unitPrice)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-danger-pale"><Minus className="w-3 h-3" /></button>
                <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-brand-pale"><Plus className="w-3 h-3" /></button>
              </div>
              <span className="text-sm font-medium text-text-primary w-16 text-right">{formatCurrency(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Total</span>
            <span className="text-xl font-display font-bold text-text-primary">{formatCurrency(total)}</span>
          </div>
          <Button className="w-full" size="lg" icon={<Send className="w-4 h-4" />} loading={sending} disabled={!cart.length} onClick={handleSend}>
            Send to Kitchen
          </Button>
        </div>
      </div>
    </div>
  );
}

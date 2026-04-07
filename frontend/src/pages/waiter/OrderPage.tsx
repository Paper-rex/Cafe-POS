import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { Search, Plus, Minus, Send, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import api from '../../lib/api';
import type { Category, Product } from '../../types';

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  variants: any[];
  toppings: any[];
}

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
    const handler = setTimeout(() => { setSearchDebounce(search); setPage(1); }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchCategories = async () => {
    try { const cRes = await api.get('/categories'); setCategories(cRes.data); } catch {}
  };

  const fetchProducts = async () => {
    try {
      if (page === 1 && !loading) setIsFetching(true);
      else setIsFetchingMore(true);
      const pRes = await api.get('/products', {
        params: { active: true, withFallbackImages: true, page, limit: 20, categoryId: selectedCat || undefined, search: searchDebounce || undefined },
      });
      if (page === 1) setProducts(pRes.data.data);
      else setProducts((prev) => [...prev, ...pRes.data.data]);
      setTotalPages(pRes.data.pagination?.totalPages || 1);
    } catch {} finally { setLoading(false); setIsFetching(false); setIsFetchingMore(false); }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchProducts(); }, [page, selectedCat, searchDebounce]);

  const handleCategoryClick = (catId: string | null) => { setSelectedCat(catId); setPage(1); };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1, variants: [], toppings: [] }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)).filter((i) => i.quantity > 0));
  };

  const total = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const handleSend = async () => {
    if (!cart.length) return;
    setSending(true);
    try {
      const { data } = await api.post('/orders', { tableId, items: cart });
      addToast('success', `Order ${data.orderNumber} sent to kitchen!`);
      await api.patch(`/orders/${data.id}/status`, { status: 'SENT' });
      setCart([]);
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to create order');
    } finally { setSending(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex gap-4 h-[calc(100vh-80px)]">
      {/* Category Sidebar */}
      <div className="w-44 shrink-0 bg-surface-2 border border-edge rounded p-2 space-y-0.5 overflow-y-auto"
           style={{ boxShadow: '3px 3px 0px #2A2A2A' }}>
        <div className="px-2 py-2 mb-1">
          <p className="text-[9px] font-black tracking-[0.15em] uppercase text-ink-muted">Categories</p>
        </div>
        <button
          onClick={() => handleCategoryClick(null)}
          className={`w-full text-left px-3 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all border-l-2 ${
            !selectedCat
              ? 'bg-[rgba(255,45,120,0.1)] text-neon-pink border-neon-pink'
              : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-3 border-transparent'
          }`}
        >
          All Products
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={`w-full text-left px-3 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all border-l-2 ${
              selectedCat === cat.id
                ? 'bg-[rgba(255,45,120,0.1)] text-neon-pink border-neon-pink'
                : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-3 border-transparent'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2 rounded border border-edge bg-surface-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-neon-pink outline-none transition-colors"
          />
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col relative overflow-y-auto pb-4">
          {isFetching && !loading && (
            <div className="absolute inset-0 bg-[rgba(10,10,10,0.7)] z-10 flex items-center justify-center rounded">
              <PageLoader />
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((product) => {
              const inCart = cart.find((i) => i.productId === product.id);
              return (
                <motion.div key={product.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                  <div
                    className="bg-surface-2 border rounded-xl overflow-hidden cursor-pointer relative transition-all group hover:border-neon-pink/50"
                    style={{ 
                      boxShadow: inCart ? '6px 6px 0px var(--neon-pink)' : '4px 4px 0px var(--edge)',
                      borderColor: inCart ? 'var(--neon-pink)' : 'var(--edge)',
                    }}
                    onClick={() => addToCart(product)}
                  >
                    {inCart && (
                      <div
                        className="absolute top-2 right-2 z-10 w-7 h-7 bg-neon-pink text-white text-xs font-black rounded-full flex items-center justify-center shadow-lg transform scale-110"
                        style={{ boxShadow: '0 0 15px rgba(255,45,120,0.4)' }}
                      >
                        {inCart.quantity}
                      </div>
                    )}
                    
                    <div className="relative aspect-[16/10] overflow-hidden bg-surface-3 border-b border-edge">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                          loading="lazy" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl opacity-50">{product.category?.icon || '🍽️'}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-2/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-black text-ink-primary truncate leading-tight">{product.name}</h3>
                        <span className="text-sm font-black text-neon-pink shrink-0">{formatCurrency(product.price)}</span>
                      </div>
                      
                      {product.description ? (
                        <p className="text-[10px] text-ink-muted line-clamp-2 min-h-[2.5em] leading-relaxed">
                          {product.description}
                        </p>
                      ) : (
                        <div className="h-[2.5em]" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {products.length === 0 && !loading && (
              <div className="col-span-full text-center py-10">
                <p className="text-xs text-ink-muted font-medium">No products found.</p>
              </div>
            )}

            {page < totalPages && (
              <div className="col-span-full pt-4 flex justify-center mt-auto">
                <Button variant="outline" loading={isFetchingMore} onClick={() => setPage((p) => p + 1)} size="sm">
                  Load More
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div
        className="w-72 shrink-0 bg-surface-2 border border-edge rounded flex flex-col overflow-hidden"
        style={{ boxShadow: '4px 4px 0px #FFE600', borderTop: '2px solid #FFE600' }}
      >
        {/* Cart Header */}
        <div className="px-5 py-4 border-b border-edge">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-neon-yellow" />
            <h2 className="text-sm font-black tracking-[-0.01em] uppercase text-white">
              Table {tableNumber}
            </h2>
          </div>
          <p className="text-[10px] text-ink-muted mt-0.5 font-medium">
            {cart.length === 0 ? 'Empty order' : `${cart.reduce((s, i) => s + i.quantity, 0)} items`}
          </p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {cart.length === 0 ? (
            <p className="text-center text-xs text-ink-muted py-8 font-medium">Add items to get started</p>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-2 py-2 border-b border-edge last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ink-primary truncate">{item.name}</p>
                  <p className="text-[10px] text-ink-muted">{formatCurrency(item.unitPrice)} each</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQty(item.productId, -1)}
                    className="w-5 h-5 rounded bg-surface-3 flex items-center justify-center hover:bg-[rgba(255,59,92,0.15)] hover:text-danger transition-colors"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-xs font-black text-ink-primary w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.productId, 1)}
                    className="w-5 h-5 rounded bg-surface-3 flex items-center justify-center hover:bg-[rgba(255,45,120,0.15)] hover:text-neon-pink transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
                <span className="text-xs font-black text-neon-pink w-14 text-right">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t border-edge space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-[0.1em] uppercase text-ink-muted">Total</span>
            <span className="text-xl font-black text-neon-yellow">{formatCurrency(total)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            variant="yellow"
            icon={<Send className="w-4 h-4" />}
            loading={sending}
            disabled={!cart.length}
            onClick={handleSend}
          >
            Send to Kitchen
          </Button>
        </div>
      </div>
    </div>
  );
}

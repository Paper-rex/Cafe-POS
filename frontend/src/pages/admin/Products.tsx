import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Package as PackageIcon, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import api from '../../lib/api';
import type { Category, Product } from '../../types';

export default function Products() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [productForm, setProductForm] = useState({ id: '', name: '', price: '', description: '', categoryId: '', taxPercent: '5' });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const handler = setTimeout(() => { setSearchDebounce(search); setPage(1); }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchCategories = async () => {
    try { const cRes = await api.get('/categories'); setCategories(cRes.data); } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      setIsFetching(true);
      const pRes = await api.get('/products', { params: { page, limit: 15, categoryId: selectedCat || undefined, search: searchDebounce } });
      setProducts(pRes.data.data);
      setTotalPages(pRes.data.pagination.totalPages || 1);
    } catch (err) { console.error(err); } finally { setIsFetching(false); setLoading(false); }
  };

  const fetchData = async () => { await fetchCategories(); await fetchProducts(); };
  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchProducts(); }, [page, selectedCat, searchDebounce]);

  const handleCategoryClick = (catId: string | null) => { setSelectedCat(catId); setPage(1); };

  const handleAddCategory = async () => {
    if (!catName) return; setFormLoading(true);
    try { await api.post('/categories', { name: catName, icon: catIcon }); addToast('success', 'Category created'); setShowAddCategory(false); setCatName(''); setCatIcon(''); fetchData(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); } finally { setFormLoading(false); }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) return; setFormLoading(true);
    try {
      const payload = { ...productForm, price: parseFloat(productForm.price), categoryId: productForm.categoryId || selectedCat, taxPercent: parseFloat(productForm.taxPercent) };
      if (productForm.id) { await api.patch(`/products/${productForm.id}`, payload); addToast('success', 'Product updated'); }
      else { await api.post('/products', payload); addToast('success', 'Product created'); }
      setShowAddProduct(false); setProductForm({ id: '', name: '', price: '', description: '', categoryId: '', taxPercent: '5' }); fetchData();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); } finally { setFormLoading(false); }
  };

  const openEditProduct = (p: Product) => {
    setProductForm({ id: p.id, name: p.name, price: p.price.toString(), description: p.description || '', categoryId: p.categoryId, taxPercent: p.taxPercent.toString() });
    setShowAddProduct(true);
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    try { await api.delete(`/products/${deleteProductId}`); addToast('success', 'Product removed'); fetchData(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
    finally { setDeleteProductId(null); }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    try { await api.delete(`/categories/${deleteCategoryId}`); addToast('success', 'Category deleted'); setSelectedCat(null); fetchData(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
    finally { setDeleteCategoryId(null); }
  };

  const toggleProduct = async (id: string, isActive: boolean) => {
    try { await api.patch(`/products/${id}`, { isActive: !isActive }); fetchData(); }
    catch { addToast('error', 'Failed to update'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-neon-pink mb-1">Admin Console</p>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-white uppercase">Products</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9 pr-4 py-2 rounded border border-edge bg-surface-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-neon-pink outline-none transition-colors w-52"
            />
          </div>
          <Button variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddCategory(true)} size="sm">
            Category
          </Button>
          <Button
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => { setProductForm({ id: '', name: '', price: '', description: '', categoryId: selectedCat || '', taxPercent: '5' }); setShowAddProduct(true); }}
            size="sm"
          >
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Category Sidebar */}
        <div className="w-48 shrink-0 space-y-0.5">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide rounded transition-all ${
              !selectedCat
                ? 'bg-[rgba(255,45,120,0.1)] text-neon-pink border-l-2 border-neon-pink pl-2.5'
                : 'text-ink-muted hover:bg-surface-2 hover:text-ink-secondary border-l-2 border-transparent'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <div key={cat.id} className="relative group">
              <button
                onClick={() => handleCategoryClick(cat.id)}
                className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide rounded transition-all pr-8 ${
                  selectedCat === cat.id
                    ? 'bg-[rgba(255,45,120,0.1)] text-neon-pink border-l-2 border-neon-pink pl-2.5'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink-secondary border-l-2 border-transparent'
                }`}
              >
                {cat.icon} {cat.name}
                <span className="ml-1 text-ink-muted font-normal">({cat._count?.products || 0})</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteCategoryId(cat.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 text-ink-muted hover:text-danger transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 flex flex-col relative">
          {isFetching && !loading && (
            <div className="absolute inset-0 bg-[rgba(10,10,10,0.7)] z-10 flex items-center justify-center rounded">
              <PageLoader />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-surface-2 border rounded-xl overflow-hidden group transition-all duration-200"
                style={{ 
                  boxShadow: product.isActive ? '6px 6px 0px var(--neon-pink)' : '4px 4px 0px var(--edge)',
                  borderColor: product.isActive ? 'var(--neon-pink)' : 'var(--edge)',
                  opacity: product.isActive ? 1 : 0.7
                }}
              >
                <div className="relative aspect-[21/9] overflow-hidden bg-surface-3 border-b border-edge group-hover:bg-surface-4 transition-colors">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30">
                      <span className="text-2xl">{product.category?.icon || '📦'}</span>
                    </div>
                  )}
                  
                  {/* Floating Controls */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditProduct(product)} 
                      className="p-1.5 rounded-lg bg-surface-1/80 text-white hover:text-neon-pink backdrop-blur-sm transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setDeleteProductId(product.id)} 
                      className="p-1.5 rounded-lg bg-surface-1/80 text-white hover:text-danger backdrop-blur-sm transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2">
                    <button 
                      onClick={() => toggleProduct(product.id, product.isActive)} 
                      className="p-1 rounded-full flex items-center gap-1.5 bg-surface-1/80 backdrop-blur-sm pr-2 text-[9px] font-black uppercase tracking-wider"
                    >
                      {product.isActive ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-neon-mint shadow-[0_0_8px_rgba(0,255,179,0.5)]" />
                          <span className="text-neon-mint">Active</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-ink-muted" />
                          <span className="text-ink-muted">Hidden</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`text-sm font-black truncate leading-tight ${!product.isActive ? 'text-ink-muted' : 'text-ink-primary'}`}>
                      {product.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[10px] text-ink-muted font-bold uppercase tracking-widest">{product.category?.name}</span>
                    <div className="w-1 h-1 rounded-full bg-edge" />
                    <span className="text-xs font-black text-neon-pink">{formatCurrency(product.price)}</span>
                  </div>

                  {product.description && (
                    <p className="text-[10px] text-ink-secondary line-clamp-2 leading-relaxed h-[2.5em]">
                      {product.description}
                    </p>
                  )}

                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-edge/30">
                    {product.variants.length > 0 && (
                      <div className="px-1.5 py-0.5 rounded bg-surface-3 border border-edge text-[9px] font-black text-ink-muted">
                        {product.variants.length} VARIANTS
                      </div>
                    )}
                    {product.toppings.length > 0 && (
                      <div className="px-1.5 py-0.5 rounded bg-surface-3 border border-edge text-[9px] font-black text-ink-muted">
                        {product.toppings.length} TOPPINGS
                      </div>
                    )}
                    {!product.variants.length && !product.toppings.length && (
                      <div className="text-[9px] font-black text-ink-muted/50 uppercase">No customization</div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {products.length === 0 && (
              <div className="col-span-full text-center py-16">
                <PackageIcon className="w-10 h-10 text-ink-muted mx-auto mb-3" />
                <p className="text-xs text-ink-muted font-medium">No products found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 mt-auto">
              <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft className="w-3.5 h-3.5" />}>
                Prev
              </Button>
              <span className="text-xs font-bold text-ink-secondary">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage(p => p + 1)} icon={<ChevronRight className="w-3.5 h-3.5" />}>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      <Modal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} title="Add Category" size="sm" accentColor="#00FFB3">
        <div className="p-6 space-y-4">
          <Input label="Category Name" placeholder="e.g. Coffee" value={catName} onChange={(e) => setCatName(e.target.value)} required />
          <Input label="Icon (emoji)" placeholder="☕" value={catIcon} onChange={(e) => setCatIcon(e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddCategory(false)} className="flex-1 border border-edge">Cancel</Button>
            <Button onClick={handleAddCategory} loading={formLoading} className="flex-1">Create</Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Product Modal */}
      <Modal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} title={productForm.id ? 'Edit Product' : 'Add Product'}>
        <div className="p-6 space-y-4">
          <Input label="Product Name" placeholder="e.g. Cappuccino" value={productForm.name} onChange={(e) => setProductForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (₹)" type="number" placeholder="200" value={productForm.price} onChange={(e) => setProductForm(f => ({ ...f, price: e.target.value }))} required />
            <Input label="Tax %" type="number" placeholder="5" value={productForm.taxPercent} onChange={(e) => setProductForm(f => ({ ...f, taxPercent: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black tracking-[0.12em] uppercase text-ink-secondary mb-2">Category</label>
            <select
              value={productForm.categoryId || selectedCat || ''}
              onChange={(e) => setProductForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded border border-edge bg-surface-2 text-sm text-ink-primary focus:border-neon-pink outline-none transition-colors"
            >
              <option value="">Select category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <Input label="Description" placeholder="A delicious drink..." value={productForm.description} onChange={(e) => setProductForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddProduct(false)} className="flex-1 border border-edge">Cancel</Button>
            <Button onClick={handleSaveProduct} loading={formLoading} className="flex-1">{productForm.id ? 'Save Changes' : 'Create Product'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteProductId} onClose={() => setDeleteProductId(null)} onConfirm={handleDeleteProduct}
        title="Delete Product" message="Remove this product from the POS menu permanently?" confirmLabel="Delete" danger />
      <ConfirmModal isOpen={!!deleteCategoryId} onClose={() => setDeleteCategoryId(null)} onConfirm={handleDeleteCategory}
        title="Delete Category" message="This only works if no products remain in this category." confirmLabel="Delete Category" danger />
    </div>
  );
}

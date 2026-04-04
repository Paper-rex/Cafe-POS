import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Package as PackageIcon, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import api from '../../lib/api';
import type { Category, Product } from '../../types';

export default function Products() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [productForm, setProductForm] = useState({ name: '', price: '', description: '', categoryId: '', taxPercent: '5' });
  const [formLoading, setFormLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const fetchData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([api.get('/categories'), api.get('/products')]);
      setCategories(cRes.data); setProducts(pRes.data);
      if (!selectedCat && cRes.data.length > 0) setSelectedCat(cRes.data[0].id);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const filteredProducts = selectedCat ? products.filter(p => p.categoryId === selectedCat) : products;

  const handleAddCategory = async () => {
    if (!catName) return; setFormLoading(true);
    try { await api.post('/categories', { name: catName, icon: catIcon }); addToast('success', 'Category created'); setShowAddCategory(false); setCatName(''); setCatIcon(''); fetchData(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); } finally { setFormLoading(false); }
  };

  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.price) return; setFormLoading(true);
    try {
      await api.post('/products', { ...productForm, price: parseFloat(productForm.price), categoryId: productForm.categoryId || selectedCat, taxPercent: parseFloat(productForm.taxPercent) });
      addToast('success', 'Product created'); setShowAddProduct(false); setProductForm({ name: '', price: '', description: '', categoryId: '', taxPercent: '5' }); fetchData();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); } finally { setFormLoading(false); }
  };

  const toggleProduct = async (id: string, isActive: boolean) => {
    try { await api.patch(`/products/${id}`, { isActive: !isActive }); fetchData(); }
    catch (err: any) { addToast('error', 'Failed to update'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="font-display text-3xl font-bold text-text-primary">Products</h1><p className="text-text-secondary mt-1">Manage menu items</p></div>
        <div className="flex gap-3">
          <Button variant="outline" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddCategory(true)}>Add Category</Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddProduct(true)}>Add Product</Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Category Sidebar */}
        <div className="w-56 shrink-0 space-y-1">
          <button onClick={() => setSelectedCat(null)}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${!selectedCat ? 'bg-brand-main text-white' : 'text-text-secondary hover:bg-surface-2'}`}>
            All ({products.length})
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${selectedCat === cat.id ? 'bg-brand-main text-white' : 'text-text-secondary hover:bg-surface-2'}`}>
              {cat.icon} {cat.name} ({cat._count?.products || 0})
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`p-5 ${!product.isActive ? 'opacity-60' : ''}`} hover>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-text-primary">{product.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{product.category?.icon} {product.category?.name}</p>
                  </div>
                  <button onClick={() => toggleProduct(product.id, product.isActive)} className="text-text-muted hover:text-text-primary">
                    {product.isActive ? <ToggleRight className="w-6 h-6 text-brand-main" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </div>
                {product.description && <p className="text-sm text-text-secondary mb-3 line-clamp-2">{product.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-display font-bold text-brand-main">{formatCurrency(product.price)}</span>
                  <div className="flex gap-1">
                    {product.variants.length > 0 && <Badge variant="info">{product.variants.length} variants</Badge>}
                    {product.toppings.length > 0 && <Badge variant="warning">{product.toppings.length} toppings</Badge>}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-16">
              <PackageIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No products in this category</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      <Modal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} title="Add Category" size="sm">
        <div className="p-6 space-y-4">
          <Input label="Category Name" placeholder="Coffee" value={catName} onChange={(e) => setCatName(e.target.value)} required />
          <Input label="Icon (emoji)" placeholder="☕" value={catIcon} onChange={(e) => setCatIcon(e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddCategory(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddCategory} loading={formLoading} className="flex-1">Create</Button>
          </div>
        </div>
      </Modal>

      {/* Add Product Modal */}
      <Modal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} title="Add Product">
        <div className="p-6 space-y-4">
          <Input label="Product Name" placeholder="Cappuccino" value={productForm.name} onChange={(e) => setProductForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (₹)" type="number" placeholder="200" value={productForm.price} onChange={(e) => setProductForm(f => ({ ...f, price: e.target.value }))} required />
            <Input label="Tax %" type="number" placeholder="5" value={productForm.taxPercent} onChange={(e) => setProductForm(f => ({ ...f, taxPercent: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Category</label>
            <select value={productForm.categoryId || selectedCat || ''} onChange={(e) => setProductForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm">
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <Input label="Description" placeholder="A delicious drink..." value={productForm.description} onChange={(e) => setProductForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddProduct(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddProduct} loading={formLoading} className="flex-1">Create Product</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

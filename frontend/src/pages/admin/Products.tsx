import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Package as PackageIcon, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
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
  const [productForm, setProductForm] = useState({ id: '', name: '', price: '', description: '', categoryId: '', taxPercent: '5' });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  
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

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) return; setFormLoading(true);
    try {
      const payload = { ...productForm, price: parseFloat(productForm.price), categoryId: productForm.categoryId || selectedCat, taxPercent: parseFloat(productForm.taxPercent) };
      if (productForm.id) {
         await api.patch(`/products/${productForm.id}`, payload);
         addToast('success', 'Product updated');
      } else {
         await api.post('/products', payload);
         addToast('success', 'Product created');
      }
      setShowAddProduct(false); setProductForm({ id: '', name: '', price: '', description: '', categoryId: '', taxPercent: '5' }); fetchData();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); } finally { setFormLoading(false); }
  };

  const openEditProduct = (p: Product) => {
    setProductForm({
      id: p.id,
      name: p.name,
      price: p.price.toString(),
      description: p.description || '',
      categoryId: p.categoryId,
      taxPercent: p.taxPercent.toString()
    });
    setShowAddProduct(true);
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    try {
      await api.delete(`/products/${deleteProductId}`);
      addToast('success', 'Product removed');
      fetchData();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to delete product'); }
    finally { setDeleteProductId(null); }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    try {
      await api.delete(`/categories/${deleteCategoryId}`);
      addToast('success', 'Category deleted');
      setSelectedCat(null);
      fetchData();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to delete category'); }
    finally { setDeleteCategoryId(null); }
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
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setProductForm({ id: '', name: '', price: '', description: '', categoryId: selectedCat || '', taxPercent: '5' }); setShowAddProduct(true); }}>Add Product</Button>
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
            <div key={cat.id} className="relative group">
              <button onClick={() => setSelectedCat(cat.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors pr-10 ${selectedCat === cat.id ? 'bg-brand-main text-white' : 'text-text-secondary hover:bg-surface-2'}`}>
                {cat.icon} {cat.name} ({cat._count?.products || 0})
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteCategoryId(cat.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-danger/10 text-danger rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`p-5 group ${!product.isActive ? 'bg-surface-1/50 border-dashed border-border' : ''}`} hover>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className={`font-medium ${!product.isActive ? 'text-text-muted line-through' : 'text-text-primary'}`}>{product.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{product.category?.icon} {product.category?.name}</p>
                  </div>
                  <div className="flex gap-1">
                     <button onClick={() => openEditProduct(product)} className="text-text-muted hover:text-brand-main opacity-0 group-hover:opacity-100 transition-opacity p-1">
                       <Pencil className="w-4 h-4" />
                     </button>
                     <button onClick={() => setDeleteProductId(product.id)} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity p-1">
                       <Trash2 className="w-4 h-4" />
                     </button>
                     <button onClick={() => toggleProduct(product.id, product.isActive)} className="text-text-muted hover:text-text-primary ml-1" title={product.isActive ? 'Disable' : 'Enable'}>
                       {product.isActive ? <ToggleRight className="w-6 h-6 text-brand-main" /> : <ToggleLeft className="w-6 h-6" />}
                     </button>
                  </div>
                </div>
                {product.description && <p className="text-sm text-text-secondary mb-3 line-clamp-2">{product.description}</p>}
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-display font-bold ${product.isActive ? 'text-brand-main' : 'text-text-muted'}`}>{formatCurrency(product.price)}</span>
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

      <Modal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} title={productForm.id ? "Edit Product" : "Add Product"}>
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
              <option value="" disabled>Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <Input label="Description" placeholder="A delicious drink..." value={productForm.description} onChange={(e) => setProductForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddProduct(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSaveProduct} loading={formLoading} className="flex-1">{productForm.id ? "Save Changes" : "Create Product"}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteProductId}
        onClose={() => setDeleteProductId(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message="Are you sure you want to completely remove this product? It will be removed from the POS menu."
        confirmLabel="Delete"
        danger
      />
      
      <ConfirmModal
        isOpen={!!deleteCategoryId}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message="Are you sure? This will only work if there are no products remaining in this category."
        confirmLabel="Delete Category"
        danger
      />
    </div>
  );
}

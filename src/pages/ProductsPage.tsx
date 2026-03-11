import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Pencil, Trash2, Calculator, Search, X } from 'lucide-react';
import type { Product, ProductType } from '../types';
import { deleteProduct, getProducts, saveProduct, updateProduct } from '../lib/supabase';
import { formatVND } from '../lib/pricing';
import PriceInput from '../components/PriceInput';

const emptyForm = {
  name: '',
  brand: '',
  type: 'full_size' as ProductType,
  size_ml: '',
  purchase_price: '',
  notes: '',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const data = await getProducts();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      brand: p.brand ?? '',
      type: p.type,
      size_ml: p.size_ml?.toString() ?? '',
      purchase_price: p.purchase_price.toString(),
      notes: p.notes ?? '',
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name: form.name,
        brand: form.brand,
        type: form.type,
        size_ml: parseFloat(form.size_ml) || 0,
        purchase_price: parseFloat(form.purchase_price) || 0,
        notes: form.notes,
      };
      if (editId) {
        await updateProduct(editId, data);
      } else {
        await saveProduct(data);
      }
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xoá sản phẩm "${name}"?`)) return;
    await deleteProduct(id);
    await load();
  };

  const handleCalc = (p: Product) => {
    navigate('/calculator', {
      state: {
        name: p.name,
        brand: p.brand,
        type: p.type,
        size_ml: p.size_ml,
        purchase_price: p.purchase_price,
      },
    });
  };

  const filtered = products.filter((p) =>
    search === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={18} style={{ color: '#a78bfa' }} />
          <h1 className="text-lg font-semibold text-white">Sản Phẩm</h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}
          >
            {products.length}
          </span>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          <Plus size={14} />
          Thêm SP
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#52525b' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, thương hiệu..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border focus:outline-none"
          style={{ background: '#111111', borderColor: '#1f1f1f', color: '#f0f0f0' }}
          onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }}
          onBlur={(e) => { e.target.style.borderColor = '#1f1f1f'; }}
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: '#52525b' }}>Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package size={40} className="mx-auto mb-3" style={{ color: '#2a2a2a' }} />
          <p className="text-sm" style={{ color: '#52525b' }}>
            {search ? 'Không tìm thấy sản phẩm.' : 'Chưa có sản phẩm nào.'}
          </p>
          {!search && (
            <button
              onClick={openAdd}
              className="mt-3 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}
            >
              + Thêm sản phẩm đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-xl p-4 border flex items-center gap-3 group"
              style={{ background: '#111111', borderColor: '#1f1f1f' }}
            >
              {/* Type badge */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
                style={{ background: p.type === 'full_size' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)' }}
              >
                {p.type === 'full_size' ? '🧴' : '💧'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  {p.brand && (
                    <span className="text-xs shrink-0" style={{ color: '#52525b' }}>{p.brand}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {p.size_ml > 0 && (
                    <span className="text-xs" style={{ color: '#71717a' }}>{p.size_ml}ml</span>
                  )}
                  <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>
                    Nhập: {formatVND(p.purchase_price)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCalc(p)}
                  title="Tính giá"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: '#a78bfa', background: 'rgba(124,58,237,0.1)' }}
                >
                  <Calculator size={13} />
                </button>
                <button
                  onClick={() => openEdit(p)}
                  title="Sửa"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: '#a1a1aa', background: '#1a1a1a' }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  title="Xoá"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5 space-y-4"
            style={{ background: '#111111', borderColor: '#2a2a2a' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">
                {editId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#71717a' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                    Loại
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['full_size', 'chiet'] as ProductType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t }))}
                        className="py-2 rounded-lg text-xs font-medium transition-all"
                        style={
                          form.type === t
                            ? { background: 'rgba(124,58,237,0.25)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.5)' }
                            : { background: '#1a1a1a', color: '#71717a', border: '1px solid #2a2a2a' }
                        }
                      >
                        {t === 'full_size' ? '🧴 Full Size' : '💧 Chiết'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>Tên SP</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Dior Sauvage..."
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>Thương hiệu</label>
                  <input
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="Dior..."
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>Size (ml)</label>
                  <input
                    type="number"
                    value={form.size_ml}
                    onChange={(e) => setForm((f) => ({ ...f, size_ml: e.target.value }))}
                    placeholder="100"
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>Giá nhập (₫)</label>
                  <PriceInput
                    value={form.purchase_price}
                    onChange={(v) => setForm((f) => ({ ...f, purchase_price: v }))}
                    placeholder="1.500.000"
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>Ghi chú</label>
                  <input
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Ghi chú thêm..."
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: '#1a1a1a', color: '#71717a', border: '1px solid #2a2a2a' }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: saving ? '#3f3f46' : '#7c3aed', color: 'white' }}
                >
                  {saving ? 'Đang lưu...' : (editId ? 'Cập nhật' : 'Thêm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

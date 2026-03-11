import { useEffect, useState } from 'react';
import { Settings, Lock, List, Plus, Trash2, Pencil, Eye, EyeOff, CheckCircle, X } from 'lucide-react';
import type { CostTemplate, CostType } from '../types';
import { changePassword } from '../lib/auth';
import {
  getAllCostTemplates,
  saveCostTemplate,
  updateCostTemplate,
  deleteCostTemplate,
  isSupabaseConfigured,
} from '../lib/supabase';

const emptyForm = {
  name: '',
  cost_type: 'variable' as CostType,
  is_percentage: false,
  default_value: '',
  channel: 'all' as CostTemplate['channel'],
};

export default function SettingsPage() {
  const [templates, setTemplates] = useState<CostTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Password change
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getAllCostTemplates();
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (t: CostTemplate) => {
    setForm({
      name: t.name,
      cost_type: t.cost_type,
      is_percentage: t.is_percentage,
      default_value: t.default_value.toString(),
      channel: t.channel,
    });
    setEditId(t.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name: form.name,
        cost_type: form.cost_type,
        is_percentage: form.is_percentage,
        default_value: parseFloat(form.default_value) || 0,
        channel: form.channel,
        is_active: true,
      };
      if (editId) {
        await updateCostTemplate(editId, data);
        showSuccess('Đã cập nhật chi phí!');
      } else {
        await saveCostTemplate(data);
        showSuccess('Đã thêm chi phí!');
      }
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: CostTemplate) => {
    await updateCostTemplate(t.id, { is_active: !t.is_active });
    await load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xoá chi phí "${name}"?`)) return;
    await deleteCostTemplate(id);
    await load();
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw.length < 4) {
      setPwError('Mật khẩu mới phải có ít nhất 4 ký tự.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(newPw);
      setNewPw('');
      setConfirmPw('');
      showSuccess('Đã đổi mật khẩu thành công!');
    } finally {
      setPwLoading(false);
    }
  };

  const fixedTemplates = templates.filter((t) => t.cost_type === 'fixed');
  const variableTemplates = templates.filter((t) => t.cost_type === 'variable');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings size={18} style={{ color: '#a78bfa' }} />
        <h1 className="text-lg font-semibold text-white">Cài Đặt</h1>
      </div>

      {/* Success message */}
      {successMsg && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
        >
          <CheckCircle size={15} />
          {successMsg}
        </div>
      )}

      {/* Supabase notice */}
      {!isSupabaseConfigured() && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <p className="font-medium mb-1" style={{ color: '#fbbf24' }}>⚡ Đang dùng bộ nhớ cục bộ</p>
          <p className="text-xs leading-relaxed" style={{ color: '#a16207' }}>
            Dữ liệu đang lưu trên thiết bị này (localStorage). Để đồng bộ giữa nhiều thiết bị/nhân viên,
            hãy cấu hình Supabase trong file <code>.env</code> và deploy lại.
          </p>
        </div>
      )}

      {/* Cost templates */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#111111', borderColor: '#1f1f1f' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#1f1f1f' }}>
          <div className="flex items-center gap-2">
            <List size={15} style={{ color: '#a78bfa' }} />
            <h2 className="text-sm font-semibold text-white">Danh Sách Chi Phí Mẫu</h2>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <Plus size={12} />
            Thêm
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-center py-6" style={{ color: '#52525b' }}>Đang tải...</p>
        ) : (
          <div className="divide-y" style={{ borderColor: '#1f1f1f' }}>
            {/* Fixed */}
            {fixedTemplates.length > 0 && (
              <div className="p-4 space-y-2">
                <p className="text-xs font-medium mb-3" style={{ color: '#52525b' }}>ĐỊNH PHÍ</p>
                {fixedTemplates.map((t) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    onToggle={() => handleToggleActive(t)}
                    onEdit={() => openEdit(t)}
                    onDelete={() => handleDelete(t.id, t.name)}
                  />
                ))}
              </div>
            )}
            {/* Variable */}
            {variableTemplates.length > 0 && (
              <div className="p-4 space-y-2">
                <p className="text-xs font-medium mb-3" style={{ color: '#52525b' }}>BIẾN PHÍ</p>
                {variableTemplates.map((t) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    onToggle={() => handleToggleActive(t)}
                    onEdit={() => openEdit(t)}
                    onDelete={() => handleDelete(t.id, t.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="rounded-xl border p-4 space-y-3" style={{ background: '#111111', borderColor: '#1f1f1f' }}>
        <div className="flex items-center gap-2">
          <Lock size={15} style={{ color: '#a78bfa' }} />
          <h2 className="text-sm font-semibold text-white">Đổi Mật Khẩu</h2>
        </div>
        <form onSubmit={handleChangePw} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Mật khẩu mới', val: newPw, set: setNewPw, ph: '••••••' },
              { label: 'Xác nhận mật khẩu', val: confirmPw, set: setConfirmPw, ph: '••••••' },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={ph}
                    className="w-full pr-8 px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                    onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: '#52525b' }}
                  >
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {pwError && <p className="text-xs" style={{ color: '#f87171' }}>{pwError}</p>}
          <button
            type="submit"
            disabled={pwLoading || !newPw || !confirmPw}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: pwLoading ? '#3f3f46' : '#7c3aed',
              color: 'white',
              cursor: pwLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {pwLoading ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5 space-y-4"
            style={{ background: '#111111', borderColor: '#2a2a2a' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">
                {editId ? 'Sửa chi phí' : 'Thêm chi phí mới'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#71717a' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>Tên chi phí</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Phí đóng gói..."
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                  style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>Loại</label>
                  <select
                    value={form.cost_type}
                    onChange={(e) => setForm((f) => ({ ...f, cost_type: e.target.value as CostType }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                  >
                    <option value="fixed">Định phí</option>
                    <option value="variable">Biến phí</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>Đơn vị</label>
                  <select
                    value={form.is_percentage ? 'pct' : 'vnd'}
                    onChange={(e) => setForm((f) => ({ ...f, is_percentage: e.target.value === 'pct' }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                  >
                    <option value="vnd">Tiền (₫)</option>
                    <option value="pct">Phần trăm (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                    Giá trị mặc định
                  </label>
                  <input
                    type="number"
                    value={form.default_value}
                    onChange={(e) => setForm((f) => ({ ...f, default_value: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>Kênh</label>
                  <select
                    value={form.channel}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as CostTemplate['channel'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                    style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
                  >
                    <option value="all">Tất cả</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                  </select>
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

function TemplateRow({
  template,
  onToggle,
  onEdit,
  onDelete,
}: {
  template: CostTemplate;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 group"
      style={{ background: template.is_active ? 'transparent' : 'transparent', opacity: template.is_active ? 1 : 0.4 }}
    >
      <button
        onClick={onToggle}
        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
        style={{
          background: template.is_active ? '#7c3aed' : '#1a1a1a',
          border: `1px solid ${template.is_active ? '#7c3aed' : '#3f3f46'}`,
        }}
        title={template.is_active ? 'Đang bật – click để tắt' : 'Đang tắt – click để bật'}
      >
        {template.is_active && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className="flex-1 text-xs" style={{ color: '#e4e4e7' }}>{template.name}</span>
      <span className="text-xs" style={{ color: '#52525b' }}>
        {template.channel !== 'all' && (template.channel === 'facebook' ? '📘 ' : '🎵 ')}
        {template.default_value}{template.is_percentage ? '%' : '₫'}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 rounded" style={{ color: '#a1a1aa' }}>
          <Pencil size={11} />
        </button>
        <button onClick={onDelete} className="p-1 rounded" style={{ color: '#f87171' }}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

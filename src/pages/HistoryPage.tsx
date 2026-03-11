import { useEffect, useState } from 'react';
import { History, Download, Trash2, Filter, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Channel, PriceHistory, ProductType } from '../types';
import { deletePriceHistory, getPriceHistory } from '../lib/supabase';
import { formatVND } from '../lib/pricing';

export default function HistoryPage() {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | ProductType>('all');
  const [filterChannel, setFilterChannel] = useState<'all' | Channel>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getPriceHistory();
    setHistory(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Xoá bản ghi này?')) return;
    await deletePriceHistory(id);
    await load();
  };

  const filtered = history.filter((h) => {
    if (filterType !== 'all' && h.product_type !== filterType) return false;
    if (filterChannel !== 'all' && h.channel !== filterChannel) return false;
    if (search && !h.product_name.toLowerCase().includes(search.toLowerCase()) &&
        !(h.brand ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportExcel = () => {
    const rows = filtered.map((h) => ({
      'Ngày tính': new Date(h.created_at).toLocaleString('vi-VN'),
      'Tên sản phẩm': h.product_name,
      'Thương hiệu': h.brand ?? '',
      'Loại': h.product_type === 'full_size' ? 'Full Size' : 'Chiết',
      'Size (ml)': h.size_ml ?? '',
      'Kênh bán': channelLabel(h.channel),
      'Giá nhập (₫)': h.purchase_price,
      'Tổng chi phí (₫)': h.total_cost,
      'Giá vốn (₫)': h.purchase_price + h.total_cost,
      'Lợi nhuận (%)': h.profit_margin,
      'Giá bán chính xác (₫)': Math.round(h.selling_price),
      'Giá bán làm tròn (₫)': h.selling_price_rounded,
      'Lợi nhuận / SP (₫)': Math.round(h.selling_price_rounded - (h.purchase_price + h.total_cost)),
      'Ghi chú': h.notes ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Style column widths
    ws['!cols'] = [
      { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 8 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch Sử Giá');

    // Cost detail sheet
    const detailRows: Record<string, unknown>[] = [];
    filtered.forEach((h) => {
      h.costs.forEach((c) => {
        detailRows.push({
          'Ngày tính': new Date(h.created_at).toLocaleString('vi-VN'),
          'Sản phẩm': h.product_name,
          'Tên chi phí': c.name,
          'Loại': c.cost_type === 'fixed' ? 'Định phí' : 'Biến phí',
          'Giá trị': c.value,
          'Đơn vị': c.is_percentage ? '%' : '₫',
          'Thành tiền (₫)': c.is_percentage ? Math.round((h.purchase_price * c.value) / 100) : c.value,
        });
      });
    });
    if (detailRows.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(detailRows);
      ws2['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Chi Tiết Chi Phí');
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `lich-su-gia-${dateStr}.xlsx`);
  };

  const channelLabel = (c: Channel) => {
    if (c === 'facebook') return '📘 Facebook';
    if (c === 'tiktok') return '🎵 TikTok';
    return '🌐 Tất cả';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={18} style={{ color: '#a78bfa' }} />
          <h1 className="text-lg font-semibold text-white">Lịch Sử Tính Giá</h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}
          >
            {filtered.length}
          </span>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            <Download size={13} />
            Xuất Excel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#52525b' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm sản phẩm..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-xs border focus:outline-none"
            style={{ background: '#111111', borderColor: '#1f1f1f', color: '#f0f0f0' }}
            onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }}
            onBlur={(e) => { e.target.style.borderColor = '#1f1f1f'; }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: '#52525b' }} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | ProductType)}
            className="px-2 py-2 rounded-lg text-xs border focus:outline-none"
            style={{ background: '#111111', borderColor: '#1f1f1f', color: '#a1a1aa' }}
          >
            <option value="all">Tất cả loại</option>
            <option value="full_size">Full Size</option>
            <option value="chiet">Chiết</option>
          </select>
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value as 'all' | Channel)}
            className="px-2 py-2 rounded-lg text-xs border focus:outline-none"
            style={{ background: '#111111', borderColor: '#1f1f1f', color: '#a1a1aa' }}
          >
            <option value="all">Tất cả kênh</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: '#52525b' }}>Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <History size={40} className="mx-auto mb-3" style={{ color: '#2a2a2a' }} />
          <p className="text-sm" style={{ color: '#52525b' }}>Chưa có lịch sử tính giá.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((h) => (
            <div
              key={h.id}
              className="rounded-xl border overflow-hidden"
              style={{ background: '#111111', borderColor: '#1f1f1f' }}
            >
              {/* Summary row */}
              <button
                onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                  style={{ background: h.product_type === 'full_size' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)' }}
                >
                  {h.product_type === 'full_size' ? '🧴' : '💧'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{h.product_name}</p>
                    {h.brand && <span className="text-xs shrink-0" style={{ color: '#52525b' }}>{h.brand}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: '#71717a' }}>
                      {new Date(h.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="text-xs" style={{ color: '#71717a' }}>
                      {channelLabel(h.channel)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: '#a78bfa' }}>
                    {formatVND(h.selling_price_rounded)}
                  </p>
                  <p className="text-xs" style={{ color: '#4ade80' }}>
                    +{h.profit_margin}% LN
                  </p>
                </div>
              </button>

              {/* Expanded details */}
              {expanded === h.id && (
                <div
                  className="px-4 pb-4 border-t space-y-3"
                  style={{ borderColor: '#1f1f1f' }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                    <Stat label="Giá nhập" value={formatVND(h.purchase_price)} />
                    <Stat label="Tổng CP" value={formatVND(h.total_cost)} color="#fbbf24" />
                    <Stat label="Giá vốn" value={formatVND(h.purchase_price + h.total_cost)} />
                    <Stat
                      label="Lợi nhuận / SP"
                      value={formatVND(h.selling_price_rounded - (h.purchase_price + h.total_cost))}
                      color="#4ade80"
                    />
                  </div>

                  {h.costs.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: '#52525b' }}>CHI TIẾT CHI PHÍ</p>
                      <div className="space-y-1">
                        {h.costs.map((c, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span style={{ color: '#71717a' }}>{c.name}</span>
                            <span style={{ color: '#a1a1aa' }}>
                              {c.is_percentage
                                ? `${c.value}% → ${formatVND((h.purchase_price * c.value) / 100)}`
                                : formatVND(c.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {h.notes && (
                    <p className="text-xs italic" style={{ color: '#52525b' }}>Ghi chú: {h.notes}</p>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}
                    >
                      <Trash2 size={11} />
                      Xoá bản ghi
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = '#f0f0f0' }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: '#1a1a1a' }}>
      <p className="text-xs mb-1" style={{ color: '#52525b' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

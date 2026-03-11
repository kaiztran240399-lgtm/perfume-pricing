import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calculator, ChevronDown, ChevronUp, Plus, Trash2,
  Save, CheckCircle, AlertCircle, Info
} from 'lucide-react';
import type { Channel, CostTemplate, ProductType, SelectedCost } from '../types';
import { getCostTemplates, savePriceHistory, saveProduct } from '../lib/supabase';
import { calculateDecantPurchasePrice, calculatePrice, formatVND } from '../lib/pricing';
import PriceInput from '../components/PriceInput';

interface AdHocCost {
  id: string;
  name: string;
  is_percentage: boolean;
  value: string; // raw string để dùng PriceInput
}

export default function CalculatorPage() {
  const location = useLocation();
  const prefill = location.state as Record<string, unknown> | null;

  // Form state
  const [productName, setProductName] = useState((prefill?.name as string) ?? '');
  const [brand, setBrand] = useState((prefill?.brand as string) ?? '');
  const [productType, setProductType] = useState<ProductType>((prefill?.type as ProductType) ?? 'full_size');
  const [sizeMl, setSizeMl] = useState<string>((prefill?.size_ml as number)?.toString() ?? '');
  // Chiết-specific
  const [bottleSizeMl, setBottleSizeMl] = useState<string>('');
  const [decantSizeMl, setDecantSizeMl] = useState<string>('');
  const [purchasePriceInput, setPurchasePriceInput] = useState<string>(
    (prefill?.purchase_price as number)?.toString() ?? ''
  );
  const [profitMargin, setProfitMargin] = useState<string>('30');
  const [channel, setChannel] = useState<Channel>('facebook');
  const [notes, setNotes] = useState('');

  // Costs
  const [templates, setTemplates] = useState<CostTemplate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [adHocCosts, setAdHocCosts] = useState<AdHocCost[]>([]);
  const [showCostPanel, setShowCostPanel] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Feedback
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    getCostTemplates().then((data) => {
      setTemplates(data);
      setLoadingTemplates(false);
    });
  }, []);

  // Effective purchase price
  const effectivePurchasePrice = useCallback((): number => {
    if (productType === 'chiet') {
      const bp = parseFloat(purchasePriceInput) || 0;
      const bs = parseFloat(bottleSizeMl) || 0;
      const ds = parseFloat(decantSizeMl) || 0;
      return calculateDecantPurchasePrice(bp, bs, ds);
    }
    return parseFloat(purchasePriceInput) || 0;
  }, [productType, purchasePriceInput, bottleSizeMl, decantSizeMl]);

  // Build selected costs
  const buildSelectedCosts = useCallback((): SelectedCost[] => {
    const result: SelectedCost[] = [];
    for (const t of templates) {
      if (selectedIds.has(t.id)) {
        const rawVal = customValues[t.id];
        const value = rawVal !== undefined ? parseFloat(rawVal) || 0 : t.default_value;
        result.push({
          template_id: t.id,
          name: t.name,
          is_percentage: t.is_percentage,
          value,
          cost_type: t.cost_type,
        });
      }
    }
    for (const ah of adHocCosts) {
      result.push({
        template_id: ah.id,
        name: ah.name,
        is_percentage: ah.is_percentage,
        value: parseFloat(ah.value) || 0,
        cost_type: 'variable',
      });
    }
    return result;
  }, [templates, selectedIds, customValues, adHocCosts]);

  const calc = calculatePrice(
    effectivePurchasePrice(),
    buildSelectedCosts(),
    parseFloat(profitMargin) || 0
  );

  const toggleCost = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addAdHoc = () => {
    setAdHocCosts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', is_percentage: false, value: '' },
    ]);
  };

  const updateAdHoc = (id: string, field: keyof AdHocCost, value: unknown) => {
    setAdHocCosts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeAdHoc = (id: string) => {
    setAdHocCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const showSuccess = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleSaveHistory = async () => {
    if (!calc.sellingPrice) return;
    setSaving(true);
    try {
      await savePriceHistory({
        product_name: productName || 'Không tên',
        brand,
        product_type: productType,
        size_ml: productType === 'full_size' ? parseFloat(sizeMl) || 0 : parseFloat(decantSizeMl) || 0,
        bottle_size_ml: productType === 'chiet' ? parseFloat(bottleSizeMl) || 0 : undefined,
        decant_size_ml: productType === 'chiet' ? parseFloat(decantSizeMl) || 0 : undefined,
        purchase_price: effectivePurchasePrice(),
        costs: buildSelectedCosts(),
        total_cost: calc.totalCostAmount,
        profit_margin: calc.profitMargin,
        selling_price: calc.sellingPrice,
        selling_price_rounded: calc.sellingPriceRounded,
        channel,
        notes,
      });
      showSuccess('Đã lưu vào lịch sử!');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async () => {
    setSaving(true);
    try {
      await saveProduct({
        name: productName || 'Không tên',
        brand,
        type: productType,
        size_ml: productType === 'full_size' ? parseFloat(sizeMl) || 0 : parseFloat(decantSizeMl) || 0,
        purchase_price: parseFloat(purchasePriceInput) || 0,
        notes,
      });
      showSuccess('Đã lưu sản phẩm!');
    } finally {
      setSaving(false);
    }
  };

  const fixedTemplates = templates.filter((t) => t.cost_type === 'fixed');
  const variableTemplates = templates.filter((t) => t.cost_type === 'variable');

  const isValid = effectivePurchasePrice() > 0;

  // Shared input style helpers
  const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600 border focus:outline-none transition-colors";
  const inputStyle = { background: '#1a1a1a', borderColor: '#2a2a2a' };
  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#7c3aed'; };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#2a2a2a'; };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calculator size={18} style={{ color: '#a78bfa' }} />
        <h1 className="text-lg font-semibold text-white">Tính Giá Bán</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: Inputs */}
        <div className="space-y-4">

          {/* Product info */}
          <div
            className="rounded-xl p-4 border space-y-3"
            style={{ background: '#111111', borderColor: '#1f1f1f' }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#71717a' }}>
              Thông tin sản phẩm
            </h2>

            {/* Product type toggle */}
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                Loại sản phẩm
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['full_size', 'chiet'] as ProductType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setProductType(t)}
                    className="py-2 rounded-lg text-sm font-medium transition-all"
                    style={
                      productType === t
                        ? { background: 'rgba(124,58,237,0.25)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.5)' }
                        : { background: '#1a1a1a', color: '#71717a', border: '1px solid #2a2a2a' }
                    }
                  >
                    {t === 'full_size' ? '🧴 Full Size' : '💧 Chiết'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                  Tên sản phẩm
                </label>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="VD: Dior Sauvage..."
                  className={inputCls}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                  Thương hiệu
                </label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="VD: Dior, Chanel..."
                  className={inputCls}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
            </div>

            {productType === 'full_size' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                    Dung tích (ml)
                  </label>
                  <input
                    type="number"
                    value={sizeMl}
                    onChange={(e) => setSizeMl(e.target.value)}
                    placeholder="100"
                    min="0"
                    className={inputCls}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                    Giá nhập (₫)
                  </label>
                  <PriceInput
                    value={purchasePriceInput}
                    onChange={setPurchasePriceInput}
                    placeholder="1.500.000"
                    className={inputCls}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
              </div>
            ) : (
              // Chiết inputs
              <div className="space-y-3">
                <div
                  className="rounded-lg p-3 text-xs flex items-start gap-2"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}
                >
                  <Info size={12} className="mt-0.5 shrink-0" />
                  <span>Nhập giá nhập chai gốc và hệ thống sẽ tự tính giá nhập cho từng lọ chiết.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                      Giá nhập chai gốc (₫)
                    </label>
                    <PriceInput
                      value={purchasePriceInput}
                      onChange={setPurchasePriceInput}
                      placeholder="3.000.000"
                      className={inputCls}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                      Size chai gốc (ml)
                    </label>
                    <input
                      type="number"
                      value={bottleSizeMl}
                      onChange={(e) => setBottleSizeMl(e.target.value)}
                      placeholder="100"
                      min="0"
                      className={inputCls}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                      Size lọ chiết (ml)
                    </label>
                    <input
                      type="number"
                      value={decantSizeMl}
                      onChange={(e) => setDecantSizeMl(e.target.value)}
                      placeholder="10"
                      min="0"
                      className={inputCls}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                  {effectivePurchasePrice() > 0 && (
                    <div
                      className="flex flex-col justify-end pb-2 px-3 rounded-lg"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                    >
                      <p className="text-xs" style={{ color: '#71717a' }}>Giá nhập / lọ</p>
                      <p className="text-sm font-semibold" style={{ color: '#a78bfa' }}>
                        {formatVND(effectivePurchasePrice())}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Costs */}
          <div
            className="rounded-xl border"
            style={{ background: '#111111', borderColor: '#1f1f1f' }}
          >
            <button
              onClick={() => setShowCostPanel(!showCostPanel)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#71717a' }}>
                Chi phí ({selectedIds.size + adHocCosts.filter(a => a.name).length} đã chọn)
              </span>
              {showCostPanel ? <ChevronUp size={14} style={{ color: '#71717a' }} /> : <ChevronDown size={14} style={{ color: '#71717a' }} />}
            </button>

            {showCostPanel && (
              <div className="px-4 pb-4 space-y-4">
                {loadingTemplates ? (
                  <p className="text-xs" style={{ color: '#52525b' }}>Đang tải...</p>
                ) : (
                  <>
                    {/* Fixed costs */}
                    {fixedTemplates.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: '#52525b' }}>
                          ĐỊNH PHÍ (phân bổ theo sản phẩm)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {fixedTemplates.map((t) => (
                            <CostRow
                              key={t.id}
                              template={t}
                              selected={selectedIds.has(t.id)}
                              customValue={customValues[t.id]}
                              onToggle={() => toggleCost(t.id)}
                              onValueChange={(v) => setCustomValues((prev) => ({ ...prev, [t.id]: v }))}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Variable costs */}
                    {variableTemplates.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: '#52525b' }}>
                          BIẾN PHÍ
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {variableTemplates
                            .filter((t) => {
                              if (productType === 'full_size' && (
                                t.name.includes('lọ chiết') || t.name.includes('bơm / dụng cụ')
                              )) return false;
                              if (t.channel !== 'all' && t.channel !== channel) return false;
                              return true;
                            })
                            .map((t) => (
                              <CostRow
                                key={t.id}
                                template={t}
                                selected={selectedIds.has(t.id)}
                                customValue={customValues[t.id]}
                                onToggle={() => toggleCost(t.id)}
                                onValueChange={(v) => setCustomValues((prev) => ({ ...prev, [t.id]: v }))}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Ad-hoc costs */}
                    {adHocCosts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: '#52525b' }}>CHI PHÍ TỰ THÊM</p>
                        <div className="space-y-2">
                          {adHocCosts.map((ah) => (
                            <div key={ah.id} className="flex items-center gap-2">
                              <input
                                value={ah.name}
                                onChange={(e) => updateAdHoc(ah.id, 'name', e.target.value)}
                                placeholder="Tên chi phí..."
                                className="flex-1 px-2 py-1.5 rounded-lg text-xs text-white placeholder-zinc-600 border focus:outline-none"
                                style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}
                              />
                              {ah.is_percentage ? (
                                // % input: giữ type=number bình thường
                                <input
                                  type="number"
                                  value={ah.value}
                                  onChange={(e) => updateAdHoc(ah.id, 'value', e.target.value)}
                                  placeholder="0"
                                  className="w-20 px-2 py-1.5 rounded-lg text-xs text-white placeholder-zinc-600 border focus:outline-none text-right"
                                  style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}
                                />
                              ) : (
                                // ₫ input: dùng PriceInput có format
                                <PriceInput
                                  value={ah.value}
                                  onChange={(v) => updateAdHoc(ah.id, 'value', v)}
                                  placeholder="0"
                                  className="w-24 px-2 py-1.5 rounded-lg text-xs text-white placeholder-zinc-600 border focus:outline-none text-right"
                                  style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}
                                />
                              )}
                              <select
                                value={ah.is_percentage ? 'pct' : 'vnd'}
                                onChange={(e) => updateAdHoc(ah.id, 'is_percentage', e.target.value === 'pct')}
                                className="px-2 py-1.5 rounded-lg text-xs border focus:outline-none"
                                style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#a1a1aa' }}
                              >
                                <option value="vnd">₫</option>
                                <option value="pct">%</option>
                              </select>
                              <button onClick={() => removeAdHoc(ah.id)} style={{ color: '#71717a' }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={addAdHoc}
                      className="flex items-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded-lg"
                      style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.1)' }}
                    >
                      <Plus size={12} />
                      Thêm chi phí khác
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Margin & Channel */}
          <div
            className="rounded-xl p-4 border grid grid-cols-2 gap-3"
            style={{ background: '#111111', borderColor: '#1f1f1f' }}
          >
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                Lợi nhuận mong muốn (%)
              </label>
              <input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(e.target.value)}
                min="0"
                max="99"
                placeholder="30"
                className={inputCls}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                Kênh bán
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
                style={{ background: '#1a1a1a', borderColor: '#2a2a2a', color: '#f0f0f0' }}
              >
                <option value="facebook">📘 Facebook</option>
                <option value="tiktok">🎵 TikTok Shop</option>
                <option value="all">🌐 Tất cả</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#71717a' }}>
                Ghi chú
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú thêm..."
                className={inputCls}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4">
          <div
            className="rounded-xl border sticky top-20"
            style={{ background: '#111111', borderColor: '#1f1f1f' }}
          >
            <div className="p-4 border-b" style={{ borderColor: '#1f1f1f' }}>
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#71717a' }}>
                Kết quả tính giá
              </h2>
            </div>

            {!isValid ? (
              <div className="p-8 text-center">
                <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#3f3f46' }} />
                <p className="text-sm" style={{ color: '#52525b' }}>Nhập giá nhập để xem kết quả</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Main price display */}
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.1))', border: '1px solid rgba(124,58,237,0.3)' }}
                >
                  <p className="text-xs mb-1" style={{ color: '#a78bfa' }}>Giá bán đề xuất</p>
                  <p className="text-3xl font-bold text-white mb-1">
                    {formatVND(calc.sellingPriceRounded)}
                  </p>
                  {calc.sellingPriceRounded !== Math.round(calc.sellingPrice) && (
                    <p className="text-xs" style={{ color: '#71717a' }}>
                      Giá chính xác: {formatVND(calc.sellingPrice)}
                    </p>
                  )}
                </div>

                {/* Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: '#71717a' }}>Giá nhập</span>
                    <span className="text-sm text-white">{formatVND(calc.purchasePrice)}</span>
                  </div>

                  {calc.costsBreakdown.map((c, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-xs flex-1 mr-2" style={{ color: '#a1a1aa' }}>
                        + {c.name}
                        {c.is_percentage && c.rate !== undefined && (
                          <span style={{ color: '#71717a' }}> ({c.rate}%)</span>
                        )}
                      </span>
                      <span className="text-sm" style={{ color: '#a78bfa' }}>
                        +{formatVND(c.amount)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t pt-2 mt-2" style={{ borderColor: '#2a2a2a' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium" style={{ color: '#a1a1aa' }}>Tổng chi phí</span>
                      <span className="text-sm font-medium" style={{ color: '#fbbf24' }}>
                        {formatVND(calc.totalCostAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs font-medium" style={{ color: '#a1a1aa' }}>Giá vốn</span>
                      <span className="text-sm font-medium text-white">{formatVND(calc.costBase)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs font-medium" style={{ color: '#a1a1aa' }}>Lợi nhuận ({calc.profitMargin}%)</span>
                      <span className="text-sm font-medium" style={{ color: '#4ade80' }}>
                        +{formatVND(calc.sellingPrice - calc.costBase)}
                      </span>
                    </div>
                  </div>

                  {/* Margin check */}
                  <div className="rounded-lg p-3 mt-2" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: '#71717a' }}>Biên lợi nhuận thực</span>
                      <span style={{ color: '#4ade80' }}>
                        {(((calc.sellingPrice - calc.costBase) / calc.sellingPrice) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#71717a' }}>Lợi nhuận / sản phẩm</span>
                      <span style={{ color: '#4ade80' }}>
                        {formatVND(calc.sellingPriceRounded - calc.costBase)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {savedMsg && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
                  >
                    <CheckCircle size={12} />
                    {savedMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSaveHistory}
                    disabled={saving}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: saving ? '#3f3f46' : 'rgba(124,58,237,0.2)',
                      color: saving ? '#71717a' : '#a78bfa',
                      border: '1px solid rgba(124,58,237,0.3)',
                    }}
                  >
                    <Save size={12} />
                    Lưu lịch sử
                  </button>
                  <button
                    onClick={handleSaveProduct}
                    disabled={saving}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: saving ? '#3f3f46' : '#1a1a1a',
                      color: saving ? '#71717a' : '#a1a1aa',
                      border: '1px solid #2a2a2a',
                    }}
                  >
                    <Plus size={12} />
                    Lưu SP
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cost Row Component ────────────────────────────────────────────────────────
function CostRow({
  template,
  selected,
  customValue,
  onToggle,
  onValueChange,
}: {
  template: CostTemplate;
  selected: boolean;
  customValue?: string;
  onToggle: () => void;
  onValueChange: (v: string) => void;
}) {
  const rawValue = customValue !== undefined ? customValue : template.default_value.toString();

  return (
    <div
      onClick={onToggle}
      className="rounded-xl p-2 sm:p-3 cursor-pointer transition-all select-none"
      style={{
        background: selected ? 'rgba(124,58,237,0.12)' : '#1a1a1a',
        border: `1px solid ${selected ? 'rgba(124,58,237,0.45)' : '#2a2a2a'}`,
      }}
    >
      {/* Top row: checkbox + name */}
      <div className="flex items-start gap-1.5">
        <div
          className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-all"
          style={{
            background: selected ? '#7c3aed' : 'transparent',
            border: `1px solid ${selected ? '#7c3aed' : '#3f3f46'}`,
          }}
        >
          {selected && (
            <svg width="7" height="5" viewBox="0 0 8 6" fill="none">
              <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span
          className="text-xs leading-snug"
          style={{ color: selected ? '#e4e4e7' : '#71717a' }}
        >
          {template.name}
        </span>
      </div>

      {/* Bottom row: value */}
      <div className="mt-1.5 ml-5" onClick={(e) => e.stopPropagation()}>
        {selected ? (
          <div className="flex items-center gap-1">
            {template.is_percentage ? (
              <input
                type="number"
                value={rawValue}
                onChange={(e) => onValueChange(e.target.value)}
                className="w-full px-1.5 py-1 rounded-lg text-xs text-right border focus:outline-none"
                style={{ background: '#111111', borderColor: '#3f3f46', color: '#a78bfa' }}
              />
            ) : (
              <PriceInput
                value={rawValue}
                onChange={onValueChange}
                className="w-full px-1.5 py-1 rounded-lg text-xs text-right border focus:outline-none"
                style={{ background: '#111111', borderColor: '#3f3f46', color: '#a78bfa' }}
              />
            )}
            <span className="text-xs shrink-0" style={{ color: '#71717a' }}>
              {template.is_percentage ? '%' : '₫'}
            </span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: '#3f3f46' }}>
            {template.is_percentage
              ? `${template.default_value}%`
              : `${new Intl.NumberFormat('vi-VN').format(template.default_value)}₫`}
          </span>
        )}
      </div>
    </div>
  );
}

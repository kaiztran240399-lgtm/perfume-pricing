import { createClient } from '@supabase/supabase-js';
import type { CostTemplate, PriceHistory, Product } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL');
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// ─── LOCAL STORAGE FALLBACK ───────────────────────────────────────────────────
// Used when Supabase is not yet configured

const LS = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set: <T>(key: string, value: T) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('settings').select('value').eq('key', key).single();
    return data?.value ?? null;
  }
  const settings = LS.get<Record<string, string>>('settings', { password: 'admin123' });
  return settings[key] ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('settings').upsert({ key, value, updated_at: now() });
    return;
  }
  const settings = LS.get<Record<string, string>>('settings', { password: 'admin123' });
  settings[key] = value;
  LS.set('settings', settings);
}

// ─── COST TEMPLATES ───────────────────────────────────────────────────────────

export async function getCostTemplates(): Promise<CostTemplate[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('cost_templates')
      .select('*')
      .eq('is_active', true)
      .order('cost_type')
      .order('name');
    if (error) throw error;
    return data ?? [];
  }
  const templates = LS.get<CostTemplate[]>('cost_templates', []);
  if (templates.length === 0) {
    // Seed defaults
    const seeded = seedDefaultCosts();
    LS.set('cost_templates', seeded);
    return seeded;
  }
  return templates.filter((t) => t.is_active);
}

export async function getAllCostTemplates(): Promise<CostTemplate[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('cost_templates')
      .select('*')
      .order('cost_type')
      .order('name');
    if (error) throw error;
    return data ?? [];
  }
  const templates = LS.get<CostTemplate[]>('cost_templates', []);
  if (templates.length === 0) {
    const seeded = seedDefaultCosts();
    LS.set('cost_templates', seeded);
    return seeded;
  }
  return templates;
}

export async function saveCostTemplate(t: Omit<CostTemplate, 'id' | 'created_at'>): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('cost_templates').insert({ ...t, created_at: now() });
    return;
  }
  const templates = LS.get<CostTemplate[]>('cost_templates', []);
  templates.push({ ...t, id: genId(), created_at: now() });
  LS.set('cost_templates', templates);
}

export async function updateCostTemplate(id: string, updates: Partial<CostTemplate>): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('cost_templates').update(updates).eq('id', id);
    return;
  }
  const templates = LS.get<CostTemplate[]>('cost_templates', []);
  const idx = templates.findIndex((t) => t.id === id);
  if (idx >= 0) templates[idx] = { ...templates[idx], ...updates };
  LS.set('cost_templates', templates);
}

export async function deleteCostTemplate(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('cost_templates').delete().eq('id', id);
    return;
  }
  const templates = LS.get<CostTemplate[]>('cost_templates', []);
  LS.set('cost_templates', templates.filter((t) => t.id !== id));
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  return LS.get<Product[]>('products', []);
}

export async function saveProduct(p: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
  const product: Product = { ...p, id: genId(), created_at: now(), updated_at: now() };
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('products').insert(product).select().single();
    if (error) throw error;
    return data;
  }
  const products = LS.get<Product[]>('products', []);
  products.unshift(product);
  LS.set('products', products);
  return product;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('products').update({ ...updates, updated_at: now() }).eq('id', id);
    return;
  }
  const products = LS.get<Product[]>('products', []);
  const idx = products.findIndex((p) => p.id === id);
  if (idx >= 0) products[idx] = { ...products[idx], ...updates, updated_at: now() };
  LS.set('products', products);
}

export async function deleteProduct(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('products').delete().eq('id', id);
    return;
  }
  const products = LS.get<Product[]>('products', []);
  LS.set('products', products.filter((p) => p.id !== id));
}

// ─── PRICE HISTORY ────────────────────────────────────────────────────────────

export async function getPriceHistory(): Promise<PriceHistory[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  }
  return LS.get<PriceHistory[]>('price_history', []);
}

export async function savePriceHistory(h: Omit<PriceHistory, 'id' | 'created_at'>): Promise<void> {
  const record: PriceHistory = { ...h, id: genId(), created_at: now() };
  if (isSupabaseConfigured()) {
    await supabase.from('price_history').insert(record);
    return;
  }
  const history = LS.get<PriceHistory[]>('price_history', []);
  history.unshift(record);
  LS.set('price_history', history);
}

export async function deletePriceHistory(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('price_history').delete().eq('id', id);
    return;
  }
  const history = LS.get<PriceHistory[]>('price_history', []);
  LS.set('price_history', history.filter((h) => h.id !== id));
}

// ─── SEED DEFAULT COSTS ───────────────────────────────────────────────────────

function seedDefaultCosts(): CostTemplate[] {
  const fixed: Omit<CostTemplate, 'id' | 'created_at'>[] = [
    { name: 'Tiền thuê kho / mặt bằng', cost_type: 'fixed', is_percentage: false, default_value: 0, channel: 'all', is_active: true },
    { name: 'Lương nhân viên cố định', cost_type: 'fixed', is_percentage: false, default_value: 0, channel: 'all', is_active: true },
    { name: 'Chi phí phần mềm / công cụ', cost_type: 'fixed', is_percentage: false, default_value: 0, channel: 'all', is_active: true },
    { name: 'Điện, nước, internet', cost_type: 'fixed', is_percentage: false, default_value: 0, channel: 'all', is_active: true },
    { name: 'Khấu hao thiết bị', cost_type: 'fixed', is_percentage: false, default_value: 0, channel: 'all', is_active: true },
  ];
  const variable: Omit<CostTemplate, 'id' | 'created_at'>[] = [
    { name: 'Phí vận chuyển nhập hàng nội địa', cost_type: 'variable', is_percentage: false, default_value: 0, channel: 'all', is_active: true },
    { name: 'Phí ship quốc tế', cost_type: 'variable', is_percentage: false, default_value: 0, channel: 'all', is_active: true },
    { name: 'Thuế nhập khẩu', cost_type: 'variable', is_percentage: true, default_value: 10, channel: 'all', is_active: true },
    { name: 'Phí hải quan / khai báo', cost_type: 'variable', is_percentage: false, default_value: 0, channel: 'all', is_active: true },
    { name: 'Phí đóng gói (hộp, túi, bubble wrap)', cost_type: 'variable', is_percentage: false, default_value: 5000, channel: 'all', is_active: true },
    { name: 'Phí in nhãn / sticker / card', cost_type: 'variable', is_percentage: false, default_value: 2000, channel: 'all', is_active: true },
    { name: 'Phí ship giao khách', cost_type: 'variable', is_percentage: false, default_value: 30000, channel: 'all', is_active: true },
    { name: 'Hoa hồng TikTok Shop', cost_type: 'variable', is_percentage: true, default_value: 3, channel: 'tiktok', is_active: true },
    { name: 'Phí quảng cáo Facebook Ads', cost_type: 'variable', is_percentage: true, default_value: 10, channel: 'facebook', is_active: true },
    { name: 'Phí quảng cáo TikTok Ads', cost_type: 'variable', is_percentage: true, default_value: 8, channel: 'tiktok', is_active: true },
    { name: 'Dự phòng hoàn hàng', cost_type: 'variable', is_percentage: true, default_value: 3, channel: 'all', is_active: true },
    { name: 'Phí thanh toán điện tử', cost_type: 'variable', is_percentage: true, default_value: 1, channel: 'all', is_active: true },
    { name: 'Chi phí lọ chiết + nắp', cost_type: 'variable', is_percentage: false, default_value: 8000, channel: 'all', is_active: true },
    { name: 'Chi phí bơm / dụng cụ chiết', cost_type: 'variable', is_percentage: false, default_value: 3000, channel: 'all', is_active: true },
    { name: 'Mẫu thử / tester', cost_type: 'variable', is_percentage: false, default_value: 5000, channel: 'all', is_active: true },
    { name: 'Phí bảo hiểm hàng hóa', cost_type: 'variable', is_percentage: true, default_value: 0.5, channel: 'all', is_active: true },
  ];

  return [...fixed, ...variable].map((c) => ({ ...c, id: genId(), created_at: now() }));
}

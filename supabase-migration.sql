-- ============================================================
-- BƯỚC 1: Chạy script này trong Supabase SQL Editor
-- Vào: https://app.supabase.com → Project → SQL Editor → New query
-- ============================================================

-- Bảng Settings (mật khẩu + cấu hình)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Giá trị mặc định: mật khẩu = admin123
INSERT INTO settings (key, value) VALUES ('password', 'admin123')
ON CONFLICT (key) DO NOTHING;

-- Bảng Cost Templates (danh sách chi phí mẫu)
CREATE TABLE IF NOT EXISTS cost_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  cost_type VARCHAR(20) NOT NULL CHECK (cost_type IN ('fixed', 'variable')),
  is_percentage BOOLEAN DEFAULT FALSE,
  default_value DECIMAL(12,4) DEFAULT 0,
  channel VARCHAR(20) DEFAULT 'all' CHECK (channel IN ('all', 'facebook', 'tiktok')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  type VARCHAR(20) NOT NULL CHECK (type IN ('full_size', 'chiet')),
  size_ml DECIMAL(10,2),
  purchase_price DECIMAL(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Price History
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('full_size', 'chiet')),
  size_ml DECIMAL(10,2),
  bottle_size_ml DECIMAL(10,2),
  decant_size_ml DECIMAL(10,2),
  purchase_price DECIMAL(14,2) NOT NULL,
  costs JSONB NOT NULL DEFAULT '[]',
  total_cost DECIMAL(14,2) NOT NULL,
  profit_margin DECIMAL(6,2) NOT NULL,
  selling_price DECIMAL(14,2) NOT NULL,
  selling_price_rounded DECIMAL(14,2) NOT NULL,
  channel VARCHAR(20) DEFAULT 'all',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security: cho phép anon key đọc/ghi (public tool)
-- ============================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON cost_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON price_history FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- Seed: Chi phí mặc định
-- ============================================================
INSERT INTO cost_templates (name, cost_type, is_percentage, default_value, channel) VALUES
  -- Định phí
  ('Tiền thuê kho / mặt bằng', 'fixed', false, 0, 'all'),
  ('Lương nhân viên cố định', 'fixed', false, 0, 'all'),
  ('Chi phí phần mềm / công cụ', 'fixed', false, 0, 'all'),
  ('Điện, nước, internet', 'fixed', false, 0, 'all'),
  ('Khấu hao thiết bị', 'fixed', false, 0, 'all'),
  -- Biến phí
  ('Phí vận chuyển nhập hàng nội địa', 'variable', false, 0, 'all'),
  ('Phí ship quốc tế', 'variable', false, 0, 'all'),
  ('Thuế nhập khẩu', 'variable', true, 10, 'all'),
  ('Phí hải quan / khai báo', 'variable', false, 0, 'all'),
  ('Phí đóng gói (hộp, túi, bubble wrap)', 'variable', false, 5000, 'all'),
  ('Phí in nhãn / sticker / card', 'variable', false, 2000, 'all'),
  ('Phí ship giao khách', 'variable', false, 30000, 'all'),
  ('Hoa hồng TikTok Shop', 'variable', true, 3, 'tiktok'),
  ('Phí quảng cáo Facebook Ads', 'variable', true, 10, 'facebook'),
  ('Phí quảng cáo TikTok Ads', 'variable', true, 8, 'tiktok'),
  ('Dự phòng hoàn hàng', 'variable', true, 3, 'all'),
  ('Phí thanh toán điện tử', 'variable', true, 1, 'all'),
  ('Chi phí lọ chiết + nắp', 'variable', false, 8000, 'all'),
  ('Chi phí bơm / dụng cụ chiết', 'variable', false, 3000, 'all'),
  ('Mẫu thử / tester', 'variable', false, 5000, 'all'),
  ('Phí bảo hiểm hàng hóa', 'variable', true, 0.5, 'all');

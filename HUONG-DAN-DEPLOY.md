# 🚀 Hướng Dẫn Deploy – Hệ Thống Tính Giá Nước Hoa

## Tổng quan
- **Chi phí hàng tháng:** 0 ₫ (hoàn toàn miễn phí)
- **Thời gian setup:** ~15–20 phút
- **Kết quả:** URL dạng `https://tenban.vercel.app`

---

## BƯỚC 1 — Cài đặt Supabase (database đám mây)

> Bỏ qua bước này nếu chỉ dùng 1 thiết bị. Nhưng để nhân viên cùng dùng được, **bắt buộc phải làm bước này**.

### 1.1 Tạo tài khoản
1. Vào **https://supabase.com** → Click **Start your project**
2. Đăng ký bằng GitHub hoặc email (miễn phí)

### 1.2 Tạo project
1. Click **New project**
2. Điền:
   - **Name:** `perfume-pricing` (hoặc tên bất kỳ)
   - **Database Password:** đặt mật khẩu mạnh (lưu lại)
   - **Region:** `Southeast Asia (Singapore)`
3. Click **Create new project** → đợi ~1 phút

### 1.3 Chạy SQL tạo bảng
1. Vào **SQL Editor** (menu bên trái) → **New query**
2. Copy toàn bộ nội dung file `supabase-migration.sql`
3. Paste vào và click **Run** (▶)
4. Thấy "Success. No rows returned" là xong ✅

### 1.4 Lấy API keys
1. Vào **Settings** (bánh răng) → **API**
2. Copy 2 thứ:
   - **Project URL** (dạng: `https://xxxx.supabase.co`)
   - **anon public** key (chuỗi dài ~200 ký tự)

---

## BƯỚC 2 — Tạo file `.env`

Trong thư mục `perfume-pricing`, tạo file tên `.env` (không có đuôi):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

> ⚠️ Thay `xxxx` và key bằng giá trị thực lấy từ Bước 1.4

---

## BƯỚC 3 — Deploy lên Vercel (có URL)

### Cách A: Dùng Vercel CLI (nhanh nhất)

```bash
# Cài Vercel CLI (1 lần)
npm install -g vercel

# Trong thư mục perfume-pricing
cd /Users/embefeliz_1/Documents/perfume-pricing
vercel

# Làm theo hướng dẫn:
# → Set up and deploy? Y
# → Which scope? (chọn tài khoản của bạn)
# → Link to existing project? N
# → Project name: perfume-pricing
# → Directory: ./
# → Override settings? N
```

Sau khi deploy xong, Vercel sẽ hiện URL, ví dụ:
```
✅ Production: https://perfume-pricing-abc123.vercel.app
```

### Thêm biến môi trường lên Vercel:
```bash
vercel env add VITE_SUPABASE_URL
# → Nhập URL Supabase, chọn all environments

vercel env add VITE_SUPABASE_ANON_KEY
# → Nhập anon key, chọn all environments

# Deploy lại để áp dụng
vercel --prod
```

---

### Cách B: Dùng GitHub + Vercel (có auto-deploy khi push code)

1. **Tạo GitHub repo** tại https://github.com/new
2. Push code lên:
   ```bash
   cd /Users/embefeliz_1/Documents/perfume-pricing
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TENBAN/perfume-pricing.git
   git push -u origin main
   ```
3. Vào **https://vercel.com** → **Add New Project** → Import repo vừa tạo
4. Thêm Environment Variables:
   - `VITE_SUPABASE_URL` = URL của bạn
   - `VITE_SUPABASE_ANON_KEY` = key của bạn
5. Click **Deploy** → Done!

---

## BƯỚC 4 — Đặt domain riêng (tuỳ chọn)

Nếu muốn URL dạng `gia.tenshop.com`:
1. Vào Vercel → Project → **Settings** → **Domains**
2. Thêm domain → Làm theo hướng dẫn cấu hình DNS

---

## BƯỚC 5 — Đổi mật khẩu mặc định

1. Mở URL app → Đăng nhập bằng `admin123`
2. Vào **Cài Đặt** → Kéo xuống **Đổi Mật Khẩu**
3. Đặt mật khẩu mới → Lưu
4. **Chia sẻ URL + mật khẩu mới cho nhân viên**

---

## Tóm tắt nhanh

| Bước | Thao tác | Thời gian |
|------|----------|-----------|
| 1 | Tạo Supabase + chạy SQL | ~5 phút |
| 2 | Tạo file `.env` | ~2 phút |
| 3 | Deploy Vercel | ~5 phút |
| 4 | Đổi mật khẩu | ~1 phút |

---

## Cấu trúc dữ liệu (để tham khảo)

```
Giá bán = Giá vốn ÷ (1 − % Lợi nhuận)

Giá vốn = Giá nhập
         + Σ Chi phí tiền mặt
         + Giá nhập × Σ % chi phí

Với hàng chiết:
  Giá nhập/lọ = Giá nhập chai gốc ÷ Size chai × Size lọ chiết
```

---

## Hỗ trợ

- **Quên mật khẩu?** → Vào Supabase → Table Editor → settings → sửa cột `value` của dòng `password`
- **Xoá hết dữ liệu test?** → Supabase → Table Editor → xoá rows trong `price_history`
- **Thêm người dùng?** → Chia sẻ URL + mật khẩu là xong (không cần tạo tài khoản)

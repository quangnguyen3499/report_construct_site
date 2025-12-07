# Hướng dẫn Deploy

## ⚠️ QUAN TRỌNG: Bật GitHub Pages trước khi chạy workflow

**Bước bắt buộc trước khi deploy:**

1. Vào repository trên GitHub
2. **Settings** → **Pages**
3. Trong phần **Source**, chọn:
   - **Source**: `Deploy from a branch` → chọn branch `gh-pages` và folder `/ (root)` (tạm thời)
   - HOẶC chọn **Source**: `GitHub Actions` (nếu có option này)
4. **Save**

Sau đó workflow sẽ tự động chạy và deploy.

## Deploy Backend lên Vercel (Khuyến nghị)

Vercel hỗ trợ miễn phí và dễ cấu hình cho Node.js backend.

### Bước 1: Cài đặt Vercel CLI (tùy chọn)
```bash
npm i -g vercel
```

### Bước 2: Deploy backend
```bash
cd server
vercel
```

Hoặc deploy qua web:
1. Truy cập [vercel.com](https://vercel.com)
2. Đăng nhập với GitHub
3. Import repository
4. Root Directory: chọn `server`
5. Framework Preset: chọn "Other"
6. Build Command: để trống
7. Output Directory: để trống
8. Install Command: `npm install`
9. Deploy

### Bước 3: Lấy Backend URL
Sau khi deploy, Vercel sẽ cung cấp URL như: `https://your-project.vercel.app`

### Bước 4: Cập nhật Frontend
1. Tạo file `client/.env.production`:
```env
VITE_API_BASE_URL=https://your-project.vercel.app/api
```

2. Hoặc cập nhật trong GitHub Secrets:
   - Vào Settings → Secrets and variables → Actions
   - Thêm secret: `BACKEND_URL` = `https://your-project.vercel.app`
   - Uncomment dòng `VITE_API_BASE_URL` trong `.github/workflows/deploy.yml`

## Deploy Backend lên Railway

### Bước 1: Tạo tài khoản Railway
1. Truy cập [railway.app](https://railway.app)
2. Đăng nhập với GitHub

### Bước 2: Deploy
1. New Project → Deploy from GitHub repo
2. Chọn repository
3. Add Service → GitHub Repo
4. Root Directory: `server`
5. Build Command: `npm install`
6. Start Command: `node index.js`

### Bước 3: Lấy URL
Railway sẽ tự động cung cấp URL public

## Deploy Backend lên Render

### Bước 1: Tạo tài khoản Render
1. Truy cập [render.com](https://render.com)
2. Đăng nhập với GitHub

### Bước 2: Deploy
1. New → Web Service
2. Connect repository
3. Settings:
   - Name: `report-construct-backend`
   - Root Directory: `server`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node index.js`
4. Deploy

## Deploy Frontend lên GitHub Pages

Frontend sẽ tự động deploy qua GitHub Actions khi push code lên branch `main`.

### Cấu hình
1. Vào repository Settings → Pages
2. Source: chọn "GitHub Actions"
3. Lưu

### Cập nhật API URL
Sau khi có backend URL, cập nhật trong:
- `client/.env.production` (cho build local)
- Hoặc GitHub Secrets `BACKEND_URL` (cho CI/CD)

## Kiểm tra Deploy

1. **Backend**: Truy cập `https://your-backend-url.com/api/projects`
   - Nếu thấy `[]` hoặc danh sách projects → OK

2. **Frontend**: Truy cập `https://username.github.io/repo-name/`
   - Kiểm tra console xem có lỗi API không
   - Thử tạo project mới

## Troubleshooting

### Backend không hoạt động
- Kiểm tra logs trên platform deploy
- Đảm bảo PORT được set đúng (Vercel tự động, Railway/Render cần set env `PORT`)

### Frontend không kết nối được Backend
- Kiểm tra CORS settings trong backend
- Kiểm tra API URL trong `.env.production`
- Kiểm tra network tab trong browser console

### Routing không hoạt động trên GitHub Pages
- Đã cấu hình hash routing, không cần thêm gì
- Nếu vẫn lỗi, kiểm tra base path trong `vite.config.js`


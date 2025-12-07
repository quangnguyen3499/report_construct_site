# Hệ thống Báo cáo Xây dựng

Hệ thống quản lý và báo cáo dự án xây dựng với giao diện giống Excel, cho phép nhập liệu, thống kê và xuất báo cáo Excel.

## Tính năng

- 📊 Giao diện Excel-like với grid có thể chỉnh sửa (sử dụng AG-Grid)
- 📑 Hỗ trợ nhiều sheet/tab: Vật liệu, Nhân công, Máy thi công, Tổng hợp
- 📝 Nhập liệu theo cấu trúc file Excel mẫu (Định mức xây dựng, File mẫu dự toán)
- 📈 Thống kê theo dự án, vật liệu, chi phí
- 💰 Tính toán tự động tổng chi phí, thành tiền
- 📤 Xuất báo cáo Excel với nhiều sheet
- 🏗️ Quản lý nhiều dự án
- 🧪 Chế độ test với mock data (không cần backend)
- 🔄 Tự động tính toán khi thay đổi dữ liệu

## Cài đặt

### Yêu cầu
- Node.js 16+ 
- npm hoặc yarn

### Cài đặt dependencies

```bash
npm run install-all
```

Hoặc cài đặt riêng:

```bash
# Cài đặt backend
npm install

# Cài đặt frontend
cd client
npm install
```

## Chạy ứng dụng

### Chế độ Test (không cần backend)

Để test frontend mà không cần chạy backend:

1. Tạo file `client/.env`:
```env
VITE_USE_MOCK_DATA=true
```

2. Chạy frontend:
```bash
cd client
npm run dev
```

Ứng dụng sẽ sử dụng mock data và hoạt động hoàn toàn offline.

### Chế độ Production (với backend)

1. **Tạo file `client/.env`** (hoặc `client/.env.production`):
```env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:3001/api
```

2. **Chạy cả frontend và backend:**
```bash
npm run dev
```

Hoặc chạy riêng:

**Backend:**
```bash
npm run server
```

**Frontend:**
```bash
cd client
npm run dev
```

## Truy cập

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Cấu trúc dự án

```
report_construct_site/
├── server/           # Backend Node.js/Express
│   ├── index.js     # Server chính
│   └── data/        # Lưu trữ dữ liệu (tự động tạo)
├── client/          # Frontend Vue.js
│   ├── src/
│   │   ├── views/   # Các trang
│   │   ├── services/ # API services
│   │   └── router/  # Vue Router
│   └── ...
└── package.json
```

## Sử dụng

1. **Tạo dự án mới**: Click "Tạo dự án mới" và nhập tên dự án
2. **Chọn sheet**: Sử dụng các tab để chuyển đổi giữa các sheet:
   - **Vật liệu**: Nhập thông tin vật liệu, mã hiệu, khối lượng, giá
   - **Nhân công**: Nhập thông tin nhân công và đơn giá
   - **Máy thi công**: Nhập thông tin máy móc thi công
   - **Tổng hợp**: Tổng hợp chi phí theo các hạng mục
3. **Nhập liệu**: Click vào ô để chỉnh sửa, hệ thống tự động tính toán thành tiền
4. **Thêm/Xóa dòng**: Sử dụng nút "+ Thêm dòng" hoặc chọn dòng và click "Xóa dòng"
5. **Lưu dữ liệu**: Click "Lưu" để lưu thay đổi
6. **Xem thống kê**: Vào trang "Thống kê" để xem tổng hợp theo dự án
7. **Xuất Excel**: Click "Xuất Excel" để tải báo cáo với tất cả các sheet

## Deploy

### Deploy Backend

Backend cần deploy lên platform hỗ trợ Node.js. Xem hướng dẫn chi tiết trong [DEPLOY.md](./DEPLOY.md)

**Khuyến nghị: Vercel (miễn phí, dễ dùng)**
```bash
cd server
vercel
```

Hoặc deploy qua web tại [vercel.com](https://vercel.com)

### Deploy Frontend lên GitHub Pages

**⚠️ BƯỚC QUAN TRỌNG: Bật GitHub Pages trước**

1. **Bật GitHub Pages trong repository:**
   - Vào repository trên GitHub
   - **Settings** → **Pages**
   - **Source**: Chọn **"GitHub Actions"** (nếu có)
   - HOẶC chọn **"Deploy from a branch"** → branch `gh-pages` (tạm thời, sẽ tự động chuyển sau)
   - **Save**

2. **Push code lên GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/repo-name.git
   git push -u origin main
   ```

3. **Workflow tự động deploy:**
   - Sau khi push, GitHub Actions sẽ tự động chạy
   - Xem tiến trình trong tab **Actions**
   - Khi hoàn thành, website sẽ có tại: `https://username.github.io/repo-name/`

3. **Cấu hình Backend URL:**
   - Sau khi deploy backend, lấy URL (ví dụ: `https://your-backend.vercel.app`)
   - Tạo file `client/.env.production`:
     ```env
     VITE_USE_MOCK_DATA=false
     VITE_API_BASE_URL=https://your-backend.vercel.app/api
     ```
   - Hoặc thêm vào GitHub Secrets: `BACKEND_URL`
   - **Lưu ý**: Nếu chưa có backend, có thể để `VITE_USE_MOCK_DATA=true` để sử dụng mock data

4. **Truy cập website:** `https://username.github.io/repo-name/`

Xem hướng dẫn chi tiết trong [DEPLOY.md](./DEPLOY.md)

## API Endpoints

- `GET /api/projects` - Lấy danh sách dự án
- `GET /api/projects/:id` - Lấy chi tiết dự án
- `POST /api/projects` - Tạo dự án mới
- `PUT /api/projects/:id` - Cập nhật dự án
- `DELETE /api/projects/:id` - Xóa dự án
- `GET /api/statistics` - Lấy thống kê
- `POST /api/export` - Xuất Excel


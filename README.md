# Nề Nếp Số — API + Giao diện

Hệ thống thật, dựng đúng theo tài liệu "Kiến trúc Backend Nề Nếp Số": NestJS + TypeORM +
JWT (access 15 phút, refresh xoay vòng) + RBAC theo vai trò, dữ liệu mẫu đúng lớp 11B10
(Trường THPT Trần Nguyên Hãn). Đã xong **đăng nhập + phân quyền**, **toàn bộ nghiệp vụ nề
nếp** (danh mục lỗi/khen thưởng, ghi nhận, xử lý trạng thái, tính điểm hạnh kiểm, lịch sử
chỉnh sửa), và **giao diện thật** phục vụ ngay tại `http://localhost:3000/` (thư mục
`public/`) — cùng gốc với API nên không vướng CORS/mixed-content.

**Đã mở bằng trình duyệt thật (Chrome headless, có ảnh chụp màn hình) và xác minh**:
đăng nhập → tổng quan → học sinh (mở hồ sơ, thấy lịch sử chỉnh sửa) → ghi nhận một vi phạm
thật qua form → xuất hiện ngay trong bảng và trong lịch sử chỉnh sửa → GVCN chuyển trạng
thái xử lý qua nút bấm → tổ trưởng đăng nhập chỉ thấy đúng 12 em tổ mình, không thấy mục
"Lịch sử chỉnh sửa" → phụ huynh đăng nhập chỉ thấy đúng 1 con, không thấy nút ghi nhận.
Không có lỗi console/network nào trong toàn bộ luồng.

> Ghi chú: bản đầu dùng Prisma nhưng phiên bản Prisma 7 mới đổi hẳn sang mô hình driver-adapter
> + module ESM (chưa ổn định, CLI còn cảnh báo bản 8.0 release-candidate) nên đã đổi sang
> **TypeORM** — ổn định hơn, tích hợp thẳng vào NestJS qua `@nestjs/typeorm`.

## Chạy thử (local, dùng SQLite — không cần cài gì thêm)

```bash
npm install
npm run seed         # tạo trường, lớp 11B10, 49 học sinh, tài khoản mẫu (tự tạo bảng)
npm run start:dev    # http://localhost:3000
```

Mở trình duyệt tại **http://localhost:3000/** — đây là giao diện thật, đăng nhập bằng
một trong các tài khoản mẫu bên dưới. `.env` đã có sẵn (bí mật JWT sinh ngẫu nhiên cho
máy này) — nếu cần tạo lại, sao chép `.env.example` rồi tự điền.

## Tài khoản mẫu sau khi seed

**Đây là mật khẩu demo để bạn tự test — bắt buộc đổi hết trước khi dùng dữ liệu học sinh thật.**

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Ban giám hiệu | admin@thpttnh.edu.vn | Admin@123 |
| GVCN (Nguyễn Thị Hường) | gvcn.11b10@thpttnh.edu.vn | Gvcn@123 |
| Giám thị (Trần Văn Long) | giamthi@thpttnh.edu.vn | Giamthi@123 |
| Tổ trưởng Tổ 1 (Đặng Thảo An) | to1.11b10@thpttnh.edu.vn | ToTruong@123 |
| Tổ trưởng Tổ 2 (Nguyễn Thùy Lâm) | to2.11b10@thpttnh.edu.vn | ToTruong@123 |
| Tổ trưởng Tổ 3 (Nguyễn Hải Yến Nhi) | to3.11b10@thpttnh.edu.vn | ToTruong@123 |
| Tổ trưởng Tổ 4 (Nguyễn Thu Thủy) | to4.11b10@thpttnh.edu.vn | ToTruong@123 |
| Phụ huynh (mẫu, con là Đặng Thảo An) | phuhuynh.dangthaoan@thpttnh.edu.vn | PhuHuynh@123 |

## Đã kiểm thử (curl thật, không phải suy đoán)

```bash
# 1) Đăng nhập tổ trưởng Tổ 1 — nhận access token + cookie refresh_token (httpOnly)
curl -i -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"to1.11b10@thpttnh.edu.vn","password":"ToTruong@123"}'

# Lấy accessToken từ kết quả trên rồi thay vào <TOKEN> bên dưới

# 2) Gọi /students — đã xác minh: tổ trưởng Tổ 1 chỉ thấy đúng 12 em Tổ 1
curl http://localhost:3000/students -H "Authorization: Bearer <TOKEN>"

# 3) So sánh: đăng nhập admin/GVCN rồi gọi lại /students — đã xác minh: thấy đủ 49 em
#    Phụ huynh mẫu chỉ thấy đúng 1 em (con mình) — cũng đã xác minh.
curl -c cookies-admin.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@thpttnh.edu.vn","password":"Admin@123"}'

# 4) Làm mới access token bằng cookie refresh (không cần gửi lại mật khẩu)
curl -i -b cookies.txt -X POST http://localhost:3000/auth/refresh

# 5) Đăng xuất rồi thử refresh lại bằng cookie cũ — đã xác minh: bị từ chối 401
curl -i -b cookies.txt -X POST http://localhost:3000/auth/logout -H "Authorization: Bearer <TOKEN>"
curl -i -b cookies.txt -X POST http://localhost:3000/auth/refresh
```

`GET /auth/me` (kèm header Authorization) trả hồ sơ + vai trò + phạm vi (group/student)
của chính token đang dùng — dùng để frontend biết hiện ẩn nút gì.

## Toàn bộ API hiện có

| Method | Endpoint | Ai gọi được | Ghi chú |
|---|---|---|---|
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout`, GET `/auth/me` | — | Xem mục trên |
| GET | `/students` | tất cả | Phạm vi tự lọc theo vai trò |
| GET | `/violation-types`, `/merit-types` | tất cả | Danh mục dùng chung |
| POST/DELETE | `/violation-types`, `/merit-types` | Admin | Xoá = tắt `active` (giữ lịch sử cũ) |
| GET | `/violations`, `/merits` | tất cả | Cùng phạm vi như `/students` |
| POST | `/violations`, `/merits` | Admin/GVCN/Giám thị/Tổ trưởng | Tổ trưởng: server tự chặn nếu học sinh không thuộc tổ mình (403) |
| PATCH | `/violations/:id/status` | Admin/GVCN/Giám thị | Chuyển Chờ xử lý → Đã xử lý → Đã báo phụ huynh |
| GET | `/conduct/scores` | tất cả | Điểm hạnh kiểm tính theo đúng công thức, phạm vi như `/students` |
| GET | `/audit-logs` | Admin/GVCN | Toàn bộ nhật ký trong phạm vi (Admin: cả trường; GVCN: lớp mình) |
| GET | `/audit-logs/student/:id` | tất cả (nếu xem được học sinh đó) | Lịch sử chỉnh sửa của riêng một em |

Body mẫu cho `POST /violations`:
```json
{ "studentId": "TNH25260433", "typeId": "vt1", "occurredAt": "2026-09-03", "note": "Ghi chú (tuỳ chọn)" }
```
`typeId` lấy từ `GET /violation-types` (10 loại lỗi đã seed sẵn: `vt1`..`vt10`).
`POST /merits` tương tự với `typeId` từ `GET /merit-types` (`mt1`..`mt5`).

## Về ô "chọn vai trò" trên bản giao diện demo (Artifact) trước đây

Bản demo trên claude.ai có dropdown "xem thử theo vai trò" vì lúc đó chưa có đăng nhập
thật. Giao diện thật ở `public/` **đã bỏ hẳn dropdown đó** — thay bằng màn hình đăng
nhập; vai trò hiện lên/ẩn nút do **API quyết định** (qua `/auth/me` và mọi response bị
lọc sẵn theo `req.user`), không phải do người dùng tự chọn trên trình duyệt nữa.

## Cấu trúc quyền (RBAC) đã thực thi trong code

- `JwtAccessGuard` — bắt buộc có Bearer token hợp lệ mới vào được route.
- `RolesGuard` + `@Roles(...)` — role trong token phải khớp danh sách cho phép.
- Với `TO_TRUONG`: `StudentsService` lọc thêm `groupId`; với `GVCN`: lọc theo lớp
  mình chủ nhiệm; với `PHU_HUYNH`: lọc qua bảng `parent_links` — đây chính là ranh
  giới được ép ở tầng server, xem `src/students/students.service.ts`.
- Refresh token: chỉ lưu **hash** trong DB (`users.refreshTokenHash`), xoay vòng
  mỗi lần làm mới; nếu một refresh token cũ (đã xoay vòng) bị dùng lại — dấu hiệu
  bị đánh cắp — toàn bộ phiên của tài khoản đó bị thu hồi ngay lập tức.
- Tài khoản bị khoá (`status = 'locked'`) mất quyền truy cập ngay từ request kế
  tiếp, kể cả access token đang dùng chưa hết hạn (`JwtAccessStrategy` tra lại DB).

## Bước tiếp theo

1. Đổi 4 tổ trưởng giữ chỗ trong `src/database/seed.ts` thành đúng học sinh được lớp bầu
   (cần bạn cho biết tên — hiện chưa có cách nào tôi tự suy ra được).
2. Đổi hết mật khẩu mẫu (sửa trực tiếp trong `dev.db` hoặc thêm API đổi mật khẩu) trước
   khi dùng với dữ liệu học sinh thật ngoài phạm vi demo.
3. Khi lên production: sửa `type` trong `src/database/database.module.ts` **và**
   `src/database/data-source.ts` từ `better-sqlite3` sang `postgres`, thêm
   host/port/username/password/database, tắt `synchronize` và dùng migration thật.
   Khi đó cũng cần một nơi lưu trữ **có HTTPS thật** để triển khai công khai — xem lại
   phần "đưa lên internet thật" đã trao đổi trước đó, việc này cần bạn chọn nhà cung
   cấp hosting và xác nhận trước khi làm.
4. Tính năng còn thiếu so với thiết kế gốc: thêm/sửa hồ sơ học sinh qua giao diện
   (hiện chỉ xem — chưa có `POST /students`), đổi mật khẩu qua giao diện, gửi thông
   báo Zalo ZNS/SMS cho phụ huynh khi có vi phạm nặng (đã thiết kế trong tài liệu
   kiến trúc, chưa cài đặt).

## Scripts

| Lệnh | Việc gì |
|---|---|
| `npm run start:dev` | Chạy dev, tự reload khi sửa code |
| `npm run build` | Biên dịch TypeScript ra `dist/` |
| `npm run start` | Chạy bản đã build (`dist/main.js`) |
| `npm run seed` | Nạp lại dữ liệu mẫu (an toàn chạy lại nhiều lần — dùng upsert) |

Xem dữ liệu SQLite trực tiếp: `dev.db` mở được bằng bất kỳ trình xem SQLite nào
(VD extension "SQLite Viewer" trong VS Code), hoặc dùng `better-sqlite3` trong
một script Node nhỏ như đã làm khi kiểm thử.

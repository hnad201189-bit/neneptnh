# ---- build stage: cài đủ gói (kể cả dev) + biên dịch TypeScript ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# python3/make/g++: dự phòng cho better-sqlite3 nếu không tải được bản dựng sẵn
# (prebuild) khớp kiến trúc container — thường không cần tới nhưng để an toàn.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- runtime stage: chỉ chứa gói production + mã đã biên dịch ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY public ./public

EXPOSE 3000
# Seed dùng upsert nên chạy lại an toàn mỗi lần khởi động — luôn đảm bảo đủ
# dữ liệu mẫu (trường/lớp/danh mục/tài khoản demo) tồn tại trước khi phục vụ request.
CMD ["sh", "-c", "node dist/database/seed.js && node dist/main.js"]

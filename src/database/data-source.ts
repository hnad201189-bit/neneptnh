import "dotenv/config";
import { DataSource } from "typeorm";
import { ENTITIES } from "./database.module";

// Dùng cho script seed (chạy ngoài Nest DI). Cấu hình phải khớp với
// database.module.ts — khi đổi sang PostgreSQL cho production, sửa cả 2 nơi.
export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: process.env.DATABASE_PATH || "dev.db",
  entities: ENTITIES,
  synchronize: true,
});

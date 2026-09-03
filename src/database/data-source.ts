import "dotenv/config";
import { DataSource, DataSourceOptions } from "typeorm";
import { ENTITIES } from "./database.module";

// Dùng cho script seed (chạy ngoài Nest DI) — logic chọn SQLite/Postgres phải khớp
// với database.module.ts (dựa trên có/không biến DATABASE_URL).
const options: DataSourceOptions = process.env.DATABASE_URL
  ? {
      type: "postgres",
      url: process.env.DATABASE_URL,
      entities: ENTITIES,
      synchronize: true,
      ssl: { rejectUnauthorized: false },
    }
  : {
      type: "better-sqlite3",
      database: process.env.DATABASE_PATH || "dev.db",
      entities: ENTITIES,
      synchronize: true,
    };

export const AppDataSource = new DataSource(options);

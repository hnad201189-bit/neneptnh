import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { School } from "./entities/school.entity";
import { Class } from "./entities/class.entity";
import { Group } from "./entities/group.entity";
import { Student } from "./entities/student.entity";
import { User } from "./entities/user.entity";
import { ViolationType } from "./entities/violation-type.entity";
import { MeritType } from "./entities/merit-type.entity";
import { Violation } from "./entities/violation.entity";
import { Merit } from "./entities/merit.entity";
import { AuditLog } from "./entities/audit-log.entity";

export const ENTITIES = [
  School,
  Class,
  Group,
  Student,
  User,
  ViolationType,
  MeritType,
  Violation,
  Merit,
  AuditLog,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>("DATABASE_URL");
        if (databaseUrl) {
          // Production: Postgres bền vững (VD Neon.tech) — ổ đĩa Render Free không
          // lưu lâu dài nên KHÔNG dùng SQLite khi đã có DATABASE_URL.
          return {
            type: "postgres",
            url: databaseUrl,
            entities: ENTITIES,
            synchronize: true, // MVP: tự tạo bảng theo entity — chuyển sang migration khi ổn định schema
            ssl: { rejectUnauthorized: false }, // Neon (và hầu hết Postgres cloud) bắt buộc TLS
          };
        }
        // Dev: SQLite tại chỗ, không cần cài đặt/tài khoản gì thêm.
        return {
          type: "better-sqlite3",
          database: config.get<string>("DATABASE_PATH", "dev.db"),
          entities: ENTITIES,
          synchronize: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}

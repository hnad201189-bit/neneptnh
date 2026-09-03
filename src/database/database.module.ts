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
      useFactory: (config: ConfigService) => ({
        // Dev: SQLite tại chỗ, không cần cài đặt gì. Production: đổi "type" thành
        // "postgres" và thêm host/port/username/password/database (đúng khuyến
        // nghị PostgreSQL trong tài liệu kiến trúc) — chỉ sửa ở khối này.
        type: "better-sqlite3",
        database: config.get<string>("DATABASE_PATH", "dev.db"),
        entities: ENTITIES,
        // Tiện cho MVP: tự tạo bảng theo entity, không cần chạy migration riêng.
        // Trước khi có dữ liệu thật/production: tắt synchronize, dùng
        // `typeorm migration:generate` + `migration:run` để kiểm soát thay đổi schema.
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { DatabaseModule } from "./database/database.module";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { StudentsModule } from "./students/students.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { ViolationTypesModule } from "./violation-types/violation-types.module";
import { MeritTypesModule } from "./merit-types/merit-types.module";
import { ViolationsModule } from "./violations/violations.module";
import { MeritsModule } from "./merits/merits.module";
import { ConductModule } from "./conduct/conduct.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    StudentsModule,
    AuditLogsModule,
    ViolationTypesModule,
    MeritTypesModule,
    ViolationsModule,
    MeritsModule,
    ConductModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

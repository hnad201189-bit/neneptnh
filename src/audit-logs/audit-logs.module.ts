import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { AuditLog } from "../database/entities/audit-log.entity";
import { AuditLogsService } from "./audit-logs.service";
import { AuditLogsController } from "./audit-logs.controller";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), PassportModule.register({ defaultStrategy: "jwt-access" })],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}

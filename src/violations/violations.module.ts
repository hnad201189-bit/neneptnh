import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { Violation } from "../database/entities/violation.entity";
import { Student } from "../database/entities/student.entity";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { ViolationsService } from "./violations.service";
import { ViolationsController } from "./violations.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Violation, Student]),
    AuditLogsModule,
    PassportModule.register({ defaultStrategy: "jwt-access" }),
  ],
  controllers: [ViolationsController],
  providers: [ViolationsService],
  exports: [ViolationsService],
})
export class ViolationsModule {}

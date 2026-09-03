import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { ViolationType } from "../database/entities/violation-type.entity";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { ViolationTypesService } from "./violation-types.service";
import { ViolationTypesController } from "./violation-types.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([ViolationType]),
    AuditLogsModule,
    PassportModule.register({ defaultStrategy: "jwt-access" }),
  ],
  controllers: [ViolationTypesController],
  providers: [ViolationTypesService],
  exports: [ViolationTypesService],
})
export class ViolationTypesModule {}

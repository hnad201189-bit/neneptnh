import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { MeritType } from "../database/entities/merit-type.entity";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { MeritTypesService } from "./merit-types.service";
import { MeritTypesController } from "./merit-types.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([MeritType]),
    AuditLogsModule,
    PassportModule.register({ defaultStrategy: "jwt-access" }),
  ],
  controllers: [MeritTypesController],
  providers: [MeritTypesService],
  exports: [MeritTypesService],
})
export class MeritTypesModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { Merit } from "../database/entities/merit.entity";
import { Student } from "../database/entities/student.entity";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { MeritsService } from "./merits.service";
import { MeritsController } from "./merits.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Merit, Student]),
    AuditLogsModule,
    PassportModule.register({ defaultStrategy: "jwt-access" }),
  ],
  controllers: [MeritsController],
  providers: [MeritsService],
  exports: [MeritsService],
})
export class MeritsModule {}

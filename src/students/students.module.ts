import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { Student } from "../database/entities/student.entity";
import { Group } from "../database/entities/group.entity";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Group]),
    AuditLogsModule,
    PassportModule.register({ defaultStrategy: "jwt-access" }),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}

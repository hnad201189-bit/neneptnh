import { Module } from "@nestjs/common";
import { StudentsModule } from "../students/students.module";
import { ViolationsModule } from "../violations/violations.module";
import { MeritsModule } from "../merits/merits.module";
import { ConductService } from "./conduct.service";
import { ConductController } from "./conduct.controller";

@Module({
  imports: [StudentsModule, ViolationsModule, MeritsModule],
  controllers: [ConductController],
  providers: [ConductService],
})
export class ConductModule {}

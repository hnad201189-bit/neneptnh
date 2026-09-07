import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { Group } from "../database/entities/group.entity";
import { Student } from "../database/entities/student.entity";
import { User } from "../database/entities/user.entity";
import { GroupsService } from "./groups.service";
import { GroupsController } from "./groups.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, Student, User]),
    PassportModule.register({ defaultStrategy: "jwt-access" }),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}

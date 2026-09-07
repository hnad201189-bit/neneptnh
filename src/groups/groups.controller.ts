import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { GroupsService } from "./groups.service";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../auth/guards/admin.guard";

class UpdateLeaderDto {
  @IsOptional()
  @IsString()
  leaderStudentId?: string | null;

  @IsOptional()
  @IsString()
  studentId?: string | null;
}

@Controller("groups")
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  list() {
    return this.groupsService.list();
  }

  @Patch(":id/leader")
  @UseGuards(JwtAccessGuard, AdminGuard)
  updateLeader(@Param("id") id: string, @Body() dto: UpdateLeaderDto) {
    const leaderId = dto.leaderStudentId !== undefined ? dto.leaderStudentId : (dto.studentId ?? null);
    return this.groupsService.updateLeader(id, leaderId);
  }
}

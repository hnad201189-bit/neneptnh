import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { GroupsService } from "./groups.service";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../auth/guards/admin.guard";

class UpdateLeaderDto {
  leaderStudentId!: string | null;
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
    return this.groupsService.updateLeader(id, dto.leaderStudentId);
  }
}

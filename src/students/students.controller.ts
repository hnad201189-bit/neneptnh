import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { StudentsService } from "./students.service";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/types/jwt-payload.type";
import { UpdateStudentGroupDto } from "./dto/update-student-group.dto";
import { AutoDistributeDto, DivideGroupsDto } from "./dto/divide-groups.dto";

@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list() {
    return this.studentsService.list();
  }

  @Patch(":id/group")
  @UseGuards(JwtAccessGuard, AdminGuard)
  updateGroup(
    @Param("id") id: string,
    @Body() dto: UpdateStudentGroupDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.updateStudentGroup(id, dto.groupId, user);
  }

  @Post("divide-groups")
  @UseGuards(JwtAccessGuard, AdminGuard)
  divideGroups(
    @Body() dto: DivideGroupsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.divideGroups(dto.assignments, user);
  }

  @Post("auto-distribute")
  @UseGuards(JwtAccessGuard, AdminGuard)
  autoDistribute(
    @Body() dto: AutoDistributeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.autoDistribute(dto.method || "alphabetical", user);
  }
}

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ViolationsService } from "./violations.service";
import { CreateViolationDto } from "./dto/create-violation.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/types/jwt-payload.type";

@Controller("violations")
export class ViolationsController {
  constructor(private readonly service: ViolationsService) {}

  // Công khai — xem lịch sử vi phạm không cần đăng nhập.
  @Get()
  list() {
    return this.service.list();
  }

  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @RequirePermission("record_violations")
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateViolationDto) {
    return this.service.create(user, dto);
  }

  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @RequirePermission("manage_status")
  @Patch(":id/status")
  advance(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.advanceStatus(user, id);
  }
}

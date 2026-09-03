import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/types/jwt-payload.type";
import { MeritTypesService } from "./merit-types.service";
import { CreateMeritTypeDto } from "./dto/create-merit-type.dto";
import { AuditLogsService } from "../audit-logs/audit-logs.service";

@Controller("merit-types")
export class MeritTypesController {
  constructor(
    private readonly service: MeritTypesService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @Get()
  list() {
    return this.service.list();
  }

  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @RequirePermission("manage_catalog")
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMeritTypeDto) {
    const created = await this.service.create(user.schoolId, dto);
    await this.auditLogs.record(user, "Cập nhật danh mục", `Thêm hình thức khen thưởng "${dto.name}" (+${dto.points})`);
    return created;
  }

  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @RequirePermission("manage_catalog")
  @Delete(":id")
  async remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const removed = await this.service.deactivate(id, user.schoolId);
    await this.auditLogs.record(user, "Cập nhật danh mục", `Xoá hình thức khen thưởng "${removed.name}"`);
    return { success: true };
  }
}

import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/types/jwt-payload.type";
import { ViolationTypesService } from "./violation-types.service";
import { CreateViolationTypeDto } from "./dto/create-violation-type.dto";
import { AuditLogsService } from "../audit-logs/audit-logs.service";

@Controller("violation-types")
export class ViolationTypesController {
  constructor(
    private readonly service: ViolationTypesService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // Công khai — cần để hiện danh mục trên trang xem chung.
  @Get()
  list() {
    return this.service.list();
  }

  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @RequirePermission("manage_catalog")
  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateViolationTypeDto) {
    const created = await this.service.create(user.schoolId, dto);
    await this.auditLogs.record(user, "Cập nhật danh mục", `Thêm loại lỗi "${dto.name}" (${dto.severity}, −${dto.points})`);
    return created;
  }

  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @RequirePermission("manage_catalog")
  @Delete(":id")
  async remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const removed = await this.service.deactivate(id, user.schoolId);
    await this.auditLogs.record(user, "Cập nhật danh mục", `Xoá loại lỗi "${removed.name}"`);
    return { success: true };
  }
}

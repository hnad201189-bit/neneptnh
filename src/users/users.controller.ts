import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/types/jwt-payload.type";
import { PERMISSIONS, PERMISSION_LABEL } from "../common/permissions";

// Toàn bộ "Quản lý tài khoản" — CHỈ Admin dùng được. Đây là cách duy nhất để cấp
// quyền cho người khác: không còn sửa seed.ts/database bằng tay như trước.
@Controller("users")
@UseGuards(JwtAccessGuard, AdminGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.schoolId);
  }

  // Danh sách quyền khả dụng + nhãn tiếng Việt — để giao diện vẽ ô tích chọn.
  @Get("permissions")
  listPermissions() {
    return PERMISSIONS.map((key) => ({ key, label: PERMISSION_LABEL[key] }));
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.service.create({ schoolId: user.schoolId, ...dto });
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, user.schoolId, dto);
  }
}

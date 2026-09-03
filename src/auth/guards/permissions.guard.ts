import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission } from "../../common/permissions";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator";

// Chạy SAU JwtAccessGuard. Không có @RequirePermission(...) -> chỉ cần đăng nhập là
// qua được. Có @RequirePermission(...) -> phải là Admin, hoặc có đúng quyền đó trong
// mảng permissions của tài khoản (do Admin tự tích chọn lúc tạo/sửa tài khoản).
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    if (user.isAdmin) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(required);
  }
}

import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

// Dành riêng cho quản lý tài khoản — CHỈ Admin mới tạo/sửa/khoá được tài khoản khác,
// không thể cấp quyền này cho tài khoản thường (khác với PermissionsGuard).
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    return Boolean(user && user.isAdmin);
  }
}

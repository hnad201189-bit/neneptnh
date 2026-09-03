import { SetMetadata } from "@nestjs/common";
import { Permission } from "../../common/permissions";

export const PERMISSION_KEY = "permission";

// Gắn trên route ghi/sửa dữ liệu: @RequirePermission("record_violations").
// Admin (isAdmin=true) luôn qua được mọi permission — xem PermissionsGuard.
export const RequirePermission = (permission: Permission) => SetMetadata(PERMISSION_KEY, permission);

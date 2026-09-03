import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Đứng trước mọi route cần đăng nhập: đọc "Authorization: Bearer <access token>",
// xác minh chữ ký + hạn dùng (JwtAccessStrategy), gắn payload vào req.user.
@Injectable()
export class JwtAccessGuard extends AuthGuard("jwt-access") {}

import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Chỉ dùng cho POST /auth/refresh — đọc refresh token từ cookie httpOnly
// (không phải header), xác minh bằng secret RIÊNG với access token.
@Injectable()
export class JwtRefreshGuard extends AuthGuard("jwt-refresh") {}

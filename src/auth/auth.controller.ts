import { Body, Controller, Post, Get, Req, Res, UseGuards, HttpCode } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAccessGuard } from "./guards/jwt-access.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtPayload } from "./types/jwt-payload.type";
import { UsersService } from "../users/users.service";
import { durationToMs } from "../common/duration.util";

const REFRESH_COOKIE = "refresh_token";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    const ttl = this.config.get<string>("JWT_REFRESH_TTL", "7d");
    const secure = this.config.get<string>("COOKIE_SECURE", "false") === "true";
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true, // JS phía trình duyệt không đọc được — chặn đánh cắp qua XSS
      secure, // bắt buộc true khi chạy production sau HTTPS
      sameSite: "lax",
      path: "/auth", // chỉ gửi cookie này lên đúng /auth/refresh và /auth/logout
      maxAge: durationToMs(ttl, 7 * 24 * 60 * 60 * 1000),
    });
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(
      dto.email,
      dto.password,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = req.user as JwtPayload & { refreshToken: string | null };
    const { accessToken, refreshToken, user } = await this.authService.refreshTokens(
      payload.sub,
      payload.refreshToken,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @UseGuards(JwtAccessGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.sub);
    res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
    return { success: true };
  }

  // Endpoint mẫu để tự kiểm tra: có token hợp lệ mới gọi được, trả đúng hồ sơ + phạm vi quyền.
  @UseGuards(JwtAccessGuard)
  @Get("me")
  async me(@CurrentUser() user: JwtPayload) {
    const full = await this.usersService.findById(user.sub);
    return this.authService.publicProfile(full);
  }
}

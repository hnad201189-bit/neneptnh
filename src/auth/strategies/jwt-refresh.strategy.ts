import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { JwtPayload } from "../types/jwt-payload.type";

function fromRefreshCookie(req: Request): string | null {
  return (req?.cookies?.refresh_token as string | undefined) ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: fromRefreshCookie,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      passReqToCallback: true,
    });
  }

  // Không kiểm tra DB ở đây — AuthService.refreshTokens() sẽ so sánh token thô
  // với bản hash đã lưu để phát hiện refresh token cũ bị dùng lại (token đã xoay vòng).
  validate(req: Request, payload: JwtPayload) {
    const refreshToken = fromRefreshCookie(req);
    return { ...payload, refreshToken };
  }
}

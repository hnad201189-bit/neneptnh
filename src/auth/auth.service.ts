import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { UsersService } from "../users/users.service";
import { JwtPayload } from "./types/jwt-payload.type";
import { User } from "../database/entities/user.entity";

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException("Email hoặc mật khẩu không đúng");

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException("Email hoặc mật khẩu không đúng");

    if (user.status !== "active") {
      throw new UnauthorizedException("Tài khoản đã bị khoá — liên hệ Ban giám hiệu");
    }
    return user;
  }

  private buildPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      schoolId: user.schoolId,
      isAdmin: user.isAdmin,
      permissions: user.permissions || [],
      groupId: user.groupId ?? null,
    };
  }

  private async signTokens(payload: JwtPayload) {
    // `as JwtSignOptions["expiresIn"]` — giá trị tới từ .env ("15m"/"7d") luôn đúng định
    // dạng thời hạn của jsonwebtoken, chỉ là ConfigService trả kiểu string chung chung.
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get<string>("JWT_ACCESS_TTL", "15m") as JwtSignOptions["expiresIn"],
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get<string>("JWT_REFRESH_TTL", "7d") as JwtSignOptions["expiresIn"],
      }),
    ]);
    return { accessToken, refreshToken };
  }

  publicProfile(user: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      permissions: user.permissions || [],
      group: user.group ? { id: user.group.id, name: user.group.name } : null,
    };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = this.buildPayload(user);
    const { accessToken, refreshToken } = await this.signTokens(payload);

    // Chỉ lưu HASH của refresh token, không lưu token gốc — giống cách lưu mật khẩu.
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.usersService.setRefreshTokenHash(user.id, refreshTokenHash);

    return { accessToken, refreshToken, user: this.publicProfile(user) };
  }

  // Được gọi khi JwtRefreshGuard đã xác minh chữ ký/hạn dùng của refresh token cookie.
  async refreshTokens(userId: string, presentedRefreshToken: string | null) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshTokenHash || !presentedRefreshToken) {
      throw new UnauthorizedException("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
    }

    const matches = await bcrypt.compare(presentedRefreshToken, user.refreshTokenHash);
    if (!matches) {
      // Refresh token cũ bị dùng lại sau khi đã xoay vòng — có thể đã bị đánh cắp.
      // Thu hồi ngay toàn bộ phiên của tài khoản này để an toàn, thay vì bỏ qua.
      await this.usersService.setRefreshTokenHash(userId, null);
      throw new UnauthorizedException("Refresh token không hợp lệ — phiên đã bị thu hồi");
    }
    if (user.status !== "active") {
      throw new UnauthorizedException("Tài khoản đã bị khoá — liên hệ Ban giám hiệu");
    }

    const payload = this.buildPayload(user);
    const { accessToken, refreshToken } = await this.signTokens(payload);
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.usersService.setRefreshTokenHash(userId, refreshTokenHash);

    return { accessToken, refreshToken, user: this.publicProfile(user) };
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
  }
}

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../users/users.service";
import { JwtPayload } from "../types/jwt-payload.type";

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, "jwt-access") {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  // Chạy trên MỌI request có Bearer token hợp lệ về chữ ký/hạn dùng.
  // Vẫn tra lại DB để: (1) tài khoản bị khoá thì chặn ngay dù token chưa hết hạn,
  // (2) trả state mới nhất (vd Admin vừa đổi quyền) thay vì tin hẳn vào token cũ.
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== "active") {
      throw new UnauthorizedException("Tài khoản không còn hiệu lực");
    }
    return {
      sub: user.id,
      email: user.email,
      schoolId: user.schoolId,
      isAdmin: user.isAdmin,
      permissions: user.permissions || [],
      groupId: user.groupId,
    };
  }
}

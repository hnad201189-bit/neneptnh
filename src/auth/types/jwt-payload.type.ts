import { Permission } from "../../common/permissions";

// Những gì thực sự nằm bên trong JWT — đủ để guard quyết định ngay tại middleware,
// không cần query DB lại trên mỗi request (JwtAccessStrategy vẫn tra lại DB để
// bắt tài khoản bị khoá tức thời — xem strategies/jwt-access.strategy.ts).
export interface JwtPayload {
  sub: string; // user id
  email: string;
  schoolId: string;
  isAdmin: boolean;
  permissions: Permission[];
  groupId?: string | null; // có giá trị nếu Admin giới hạn tài khoản này theo 1 tổ
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

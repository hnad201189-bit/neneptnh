import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";

// Không công khai — chỉ tài khoản đã đăng nhập (Admin hoặc tài khoản được Admin cấp)
// mới xem được nhật ký chỉnh sửa. Đây là thông tin nội bộ, khác với các "chỉ số" công khai.
@Controller("audit-logs")
@UseGuards(JwtAccessGuard)
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get("student/:studentId")
  forStudent(@Param("studentId") studentId: string) {
    return this.service.listForStudent(studentId);
  }
}

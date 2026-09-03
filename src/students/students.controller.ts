import { Controller, Get } from "@nestjs/common";
import { StudentsService } from "./students.service";

// Công khai — không cần đăng nhập. Ai vào trang cũng xem được danh sách học sinh
// (đúng yêu cầu: chỉ số/báo cáo mở cho mọi người, chỉ việc GHI mới cần tài khoản).
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list() {
    return this.studentsService.list();
  }
}

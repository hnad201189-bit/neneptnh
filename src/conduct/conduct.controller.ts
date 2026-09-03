import { Controller, Get, Query } from "@nestjs/common";
import { ConductService } from "./conduct.service";

// Công khai — điểm hạnh kiểm là một trong các "chỉ số" ai cũng xem được.
@Controller("conduct")
export class ConductController {
  constructor(private readonly service: ConductService) {}

  // ?month=YYYY-MM — bỏ trống = tháng hiện tại. Mỗi học sinh khởi điểm lại 100
  // điểm mỗi tháng, không cộng dồn.
  @Get("scores")
  scores(@Query("month") month?: string) {
    return this.service.list(month);
  }
}

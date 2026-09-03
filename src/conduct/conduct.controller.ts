import { Controller, Get } from "@nestjs/common";
import { ConductService } from "./conduct.service";

// Công khai — điểm hạnh kiểm là một trong các "chỉ số" ai cũng xem được.
@Controller("conduct")
export class ConductController {
  constructor(private readonly service: ConductService) {}

  @Get("scores")
  scores() {
    return this.service.list();
  }
}

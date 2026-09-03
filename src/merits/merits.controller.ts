import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { MeritsService } from "./merits.service";
import { CreateMeritDto } from "./dto/create-merit.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/types/jwt-payload.type";

@Controller("merits")
export class MeritsController {
  constructor(private readonly service: MeritsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @RequirePermission("record_merits")
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMeritDto) {
    return this.service.create(user, dto);
  }
}

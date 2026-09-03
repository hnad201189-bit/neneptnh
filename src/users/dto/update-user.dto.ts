import { IsArray, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { PERMISSIONS, Permission } from "../../common/permissions";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsArray()
  @IsIn(PERMISSIONS, { each: true, message: "Quyền không hợp lệ" })
  permissions?: Permission[];

  @IsOptional()
  @IsString()
  groupId?: string | null;

  @IsOptional()
  @IsIn(["active", "locked"], { message: "Trạng thái phải là active hoặc locked" })
  status?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: "Mật khẩu tối thiểu 6 ký tự" })
  password?: string;
}

import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { PERMISSIONS, Permission } from "../../common/permissions";

export class CreateUserDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(6, { message: "Mật khẩu tối thiểu 6 ký tự" })
  password!: string;

  @IsArray()
  @IsIn(PERMISSIONS, { each: true, message: "Quyền không hợp lệ" })
  permissions!: Permission[];

  @IsOptional()
  @IsString()
  groupId?: string;
}

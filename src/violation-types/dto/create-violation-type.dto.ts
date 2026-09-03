import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { Severity } from "../../common/severity.enum";

export class CreateViolationTypeDto {
  @IsString()
  @MinLength(2, { message: "Tên lỗi tối thiểu 2 ký tự" })
  name!: string;

  @IsEnum(Severity, { message: "Mức độ phải là nhe | tb | nang" })
  severity!: Severity;

  @IsInt()
  @Min(1)
  @Max(30)
  points!: number;

  @IsOptional()
  @IsString()
  icon?: string;
}

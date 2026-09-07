import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateViolationDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

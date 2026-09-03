import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateMeritDto {
  @IsString()
  @MinLength(1)
  studentId!: string;

  @IsString()
  @MinLength(1)
  typeId!: string;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

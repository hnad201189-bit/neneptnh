import { IsOptional, IsString } from "class-validator";

export class UpdateStudentGroupDto {
  @IsOptional()
  @IsString()
  groupId?: string | null;
}

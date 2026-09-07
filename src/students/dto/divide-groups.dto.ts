import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class StudentAssignmentItem {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  groupId?: string | null;
}

export class DivideGroupsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAssignmentItem)
  assignments!: StudentAssignmentItem[];
}

export class AutoDistributeDto {
  @IsOptional()
  @IsIn(["alphabetical", "random"])
  method?: "alphabetical" | "random";
}

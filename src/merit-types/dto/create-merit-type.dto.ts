import { IsInt, IsString, Max, Min, MinLength } from "class-validator";

export class CreateMeritTypeDto {
  @IsString()
  @MinLength(2, { message: "Tên hình thức khen thưởng tối thiểu 2 ký tự" })
  name!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  points!: number;
}

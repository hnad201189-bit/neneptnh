import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "../database/entities/student.entity";

@Injectable()
export class StudentsService {
  constructor(@InjectRepository(Student) private readonly students: Repository<Student>) {}

  // Không còn phân biệt phạm vi theo vai trò — xem "Học sinh" là công khai;
  // việc kiểm soát chỉ còn nằm ở các thao tác GHI (xem ViolationsService/MeritsService).
  list() {
    return this.students.find({
      relations: { group: true },
      select: { id: true, fullName: true, status: true },
      order: { fullName: "ASC" },
    });
  }

  findOne(id: string) {
    return this.students.findOne({ where: { id }, relations: { group: true } });
  }
}

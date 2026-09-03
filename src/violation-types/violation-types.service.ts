import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ViolationType } from "../database/entities/violation-type.entity";
import { CreateViolationTypeDto } from "./dto/create-violation-type.dto";

@Injectable()
export class ViolationTypesService {
  constructor(@InjectRepository(ViolationType) private readonly repo: Repository<ViolationType>) {}

  // Công khai — không lọc theo trường vì hệ thống này chỉ phục vụ 1 trường.
  list() {
    return this.repo.find({ where: { active: true }, order: { name: "ASC" } });
  }

  async findOneOrThrow(id: string, schoolId: string) {
    const found = await this.repo.findOne({ where: { id, schoolId } });
    if (!found) throw new NotFoundException("Không tìm thấy loại lỗi này");
    return found;
  }

  create(schoolId: string, dto: CreateViolationTypeDto) {
    const entity = this.repo.create({ ...dto, schoolId });
    return this.repo.save(entity);
  }

  // Xoá mềm — giữ lại lịch sử vi phạm đã ghi nhận trước đó vẫn tham chiếu đúng loại lỗi.
  async deactivate(id: string, schoolId: string) {
    const found = await this.findOneOrThrow(id, schoolId);
    found.active = false;
    return this.repo.save(found);
  }
}

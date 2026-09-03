import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MeritType } from "../database/entities/merit-type.entity";
import { CreateMeritTypeDto } from "./dto/create-merit-type.dto";

@Injectable()
export class MeritTypesService {
  constructor(@InjectRepository(MeritType) private readonly repo: Repository<MeritType>) {}

  // Công khai — không lọc theo trường vì hệ thống này chỉ phục vụ 1 trường.
  list() {
    return this.repo.find({ where: { active: true }, order: { name: "ASC" } });
  }

  async findOneOrThrow(id: string, schoolId: string) {
    const found = await this.repo.findOne({ where: { id, schoolId } });
    if (!found) throw new NotFoundException("Không tìm thấy hình thức khen thưởng này");
    return found;
  }

  create(schoolId: string, dto: CreateMeritTypeDto) {
    return this.repo.save(this.repo.create({ ...dto, schoolId }));
  }

  async deactivate(id: string, schoolId: string) {
    const found = await this.findOneOrThrow(id, schoolId);
    found.active = false;
    return this.repo.save(found);
  }
}

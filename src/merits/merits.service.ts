import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Merit } from "../database/entities/merit.entity";
import { Student } from "../database/entities/student.entity";
import { JwtPayload } from "../auth/types/jwt-payload.type";
import { CreateMeritDto } from "./dto/create-merit.dto";
import { AuditLogsService } from "../audit-logs/audit-logs.service";

@Injectable()
export class MeritsService {
  constructor(
    @InjectRepository(Merit) private readonly repo: Repository<Merit>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // Công khai — ai cũng xem được toàn bộ lịch sử khen thưởng.
  list() {
    return this.repo.find({
      relations: { student: { group: true }, type: true, recordedBy: true },
      order: { occurredAt: "DESC", createdAt: "DESC" },
    });
  }

  private async assertCanRecordFor(user: JwtPayload, studentId: string) {
    if (!user.groupId) return;
    const student = await this.students.findOne({ where: { id: studentId } });
    if (!student || student.groupId !== user.groupId) {
      throw new ForbiddenException("Tài khoản này chỉ được ghi nhận cho học sinh trong tổ được cấp");
    }
  }

  async create(user: JwtPayload, dto: CreateMeritDto) {
    await this.assertCanRecordFor(user, dto.studentId);

    const saved = await this.repo.save(
      this.repo.create({
        studentId: dto.studentId,
        typeId: dto.typeId,
        occurredAt: dto.occurredAt,
        note: dto.note,
        recordedByUserId: user.sub,
      }),
    );

    const full = await this.repo.findOneOrFail({
      where: { id: saved.id },
      relations: { student: true, type: true },
    });
    await this.auditLogs.record(
      user,
      "Ghi nhận khen thưởng",
      `${full.student.fullName} — ${full.type.name}`,
      full.studentId,
    );
    return full;
  }
}

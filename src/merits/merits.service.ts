import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Merit } from "../database/entities/merit.entity";
import { Student } from "../database/entities/student.entity";
import { JwtPayload } from "../auth/types/jwt-payload.type";
import { CreateMeritDto } from "./dto/create-merit.dto";
import { UpdateMeritDto } from "./dto/update-merit.dto";
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

  async update(user: JwtPayload, id: string, dto: UpdateMeritDto) {
    const merit = await this.repo.findOne({
      where: { id },
      relations: { student: true, type: true, recordedBy: true },
    });
    if (!merit) throw new NotFoundException("Không tìm thấy khen thưởng này");

    // Phân quyền: Admin toàn quyền; Người ghi chỉ được sửa bản ghi của chính mình
    if (!user.isAdmin && merit.recordedByUserId !== user.sub) {
      throw new ForbiddenException("Bạn chỉ được chỉnh sửa khen thưởng do chính tài khoản của bạn ghi nhận");
    }

    if (dto.studentId && dto.studentId !== merit.studentId) {
      await this.assertCanRecordFor(user, dto.studentId);
      merit.studentId = dto.studentId;
    }
    if (dto.typeId) merit.typeId = dto.typeId;
    if (dto.occurredAt) merit.occurredAt = dto.occurredAt;
    if (dto.note !== undefined) merit.note = dto.note;

    const saved = await this.repo.save(merit);
    const full = await this.repo.findOneOrFail({
      where: { id: saved.id },
      relations: { student: true, type: true, recordedBy: true },
    });

    await this.auditLogs.record(
      user,
      "Sửa khen thưởng (Ghi nhầm)",
      `Đã sửa khen thưởng của ${full.student.fullName} — ${full.type.name} (${full.occurredAt})`,
      full.studentId,
    );
    return full;
  }

  async remove(user: JwtPayload, id: string) {
    const merit = await this.repo.findOne({
      where: { id },
      relations: { student: true, type: true, recordedBy: true },
    });
    if (!merit) throw new NotFoundException("Không tìm thấy khen thưởng này");

    // Phân quyền: Admin toàn quyền; Người ghi chỉ được xóa bản ghi của chính mình
    if (!user.isAdmin && merit.recordedByUserId !== user.sub) {
      throw new ForbiddenException("Bạn chỉ được xóa khen thưởng do chính tài khoản của bạn ghi nhận");
    }

    await this.repo.remove(merit);

    await this.auditLogs.record(
      user,
      "Xóa khen thưởng (Ghi nhầm)",
      `Đã xóa khen thưởng của ${merit.student.fullName} — ${merit.type.name} (${merit.occurredAt})`,
      merit.studentId,
    );
    return { success: true, message: "Đã xóa khen thưởng thành công" };
  }
}

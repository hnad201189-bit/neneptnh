import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Violation } from "../database/entities/violation.entity";
import { Student } from "../database/entities/student.entity";
import { STATUS_ORDER, ViolationStatus } from "../common/severity.enum";
import { JwtPayload } from "../auth/types/jwt-payload.type";
import { CreateViolationDto } from "./dto/create-violation.dto";
import { UpdateViolationDto } from "./dto/update-violation.dto";
import { AuditLogsService } from "../audit-logs/audit-logs.service";

const STATUS_LABEL_VI: Record<ViolationStatus, string> = {
  [ViolationStatus.CHO_XU_LY]: "Chờ xử lý",
  [ViolationStatus.DA_XU_LY]: "Đã xử lý",
  [ViolationStatus.DA_BAO_PH]: "Đã báo phụ huynh",
};

@Injectable()
export class ViolationsService {
  constructor(
    @InjectRepository(Violation) private readonly repo: Repository<Violation>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // Công khai — ai cũng xem được toàn bộ lịch sử vi phạm.
  list() {
    return this.repo.find({
      relations: { student: { group: true }, type: true, recordedBy: true },
      order: { occurredAt: "DESC", createdAt: "DESC" },
    });
  }

  // Nếu Admin gán tài khoản này cho 1 tổ cụ thể (user.groupId), chỉ ghi được cho
  // học sinh trong tổ đó — chặn ở server, không chỉ ẩn nút trên giao diện.
  private async assertCanRecordFor(user: JwtPayload, studentId: string) {
    if (!user.groupId) return;
    const student = await this.students.findOne({ where: { id: studentId } });
    if (!student || student.groupId !== user.groupId) {
      throw new ForbiddenException("Tài khoản này chỉ được ghi nhận cho học sinh trong tổ được cấp");
    }
  }

  async create(user: JwtPayload, dto: CreateViolationDto) {
    await this.assertCanRecordFor(user, dto.studentId);

    const entity = this.repo.create({
      studentId: dto.studentId,
      typeId: dto.typeId,
      occurredAt: dto.occurredAt,
      note: dto.note,
      recordedByUserId: user.sub,
      status: ViolationStatus.CHO_XU_LY, // luôn bắt đầu ở đây — cần "manage_status" mới chuyển tiếp
    });
    const saved = await this.repo.save(entity);

    const full = await this.repo.findOneOrFail({
      where: { id: saved.id },
      relations: { student: true, type: true },
    });
    await this.auditLogs.record(
      user,
      "Ghi nhận vi phạm",
      `${full.student.fullName} — ${full.type.name}`,
      full.studentId,
    );
    return full;
  }

  async advanceStatus(user: JwtPayload, id: string) {
    const violation = await this.repo.findOne({
      where: { id },
      relations: { student: true, type: true },
    });
    if (!violation) throw new NotFoundException("Không tìm thấy vi phạm này");

    const idx = STATUS_ORDER.indexOf(violation.status);
    violation.status = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
    violation.processedByUserId = user.sub;
    violation.processedAt = new Date();
    const saved = await this.repo.save(violation);

    await this.auditLogs.record(
      user,
      "Cập nhật trạng thái",
      `${violation.student.fullName} — ${violation.type.name} → ${STATUS_LABEL_VI[violation.status]}`,
      violation.studentId,
    );
    return saved;
  }

  async update(user: JwtPayload, id: string, dto: UpdateViolationDto) {
    const violation = await this.repo.findOne({
      where: { id },
      relations: { student: true, type: true, recordedBy: true },
    });
    if (!violation) throw new NotFoundException("Không tìm thấy vi phạm này");

    // Phân quyền: Admin toàn quyền; Người ghi chỉ được sửa khi là bản ghi của chính mình và đang ở 'cho_xu_ly'
    if (!user.isAdmin) {
      if (violation.recordedByUserId !== user.sub) {
        throw new ForbiddenException("Bạn chỉ được chỉnh sửa vi phạm do chính tài khoản của bạn ghi nhận");
      }
      if (violation.status !== ViolationStatus.CHO_XU_LY) {
        throw new ForbiddenException("Vi phạm đã được xử lý hoặc báo phụ huynh, không thể tự ý sửa đổi");
      }
    }

    if (dto.studentId && dto.studentId !== violation.studentId) {
      await this.assertCanRecordFor(user, dto.studentId);
      violation.studentId = dto.studentId;
    }
    if (dto.typeId) violation.typeId = dto.typeId;
    if (dto.occurredAt) violation.occurredAt = dto.occurredAt;
    if (dto.note !== undefined) violation.note = dto.note;

    const saved = await this.repo.save(violation);
    const full = await this.repo.findOneOrFail({
      where: { id: saved.id },
      relations: { student: true, type: true, recordedBy: true },
    });

    await this.auditLogs.record(
      user,
      "Sửa vi phạm (Ghi nhầm)",
      `Đã sửa vi phạm của ${full.student.fullName} — ${full.type.name} (${full.occurredAt})`,
      full.studentId,
    );
    return full;
  }

  async remove(user: JwtPayload, id: string) {
    const violation = await this.repo.findOne({
      where: { id },
      relations: { student: true, type: true, recordedBy: true },
    });
    if (!violation) throw new NotFoundException("Không tìm thấy vi phạm này");

    // Phân quyền: Admin toàn quyền; Người ghi chỉ được xóa khi là bản ghi của chính mình và đang ở 'cho_xu_ly'
    if (!user.isAdmin) {
      if (violation.recordedByUserId !== user.sub) {
        throw new ForbiddenException("Bạn chỉ được xóa vi phạm do chính tài khoản của bạn ghi nhận");
      }
      if (violation.status !== ViolationStatus.CHO_XU_LY) {
        throw new ForbiddenException("Vi phạm đã được xử lý hoặc báo phụ huynh, không thể tự ý xóa");
      }
    }

    await this.repo.remove(violation);

    await this.auditLogs.record(
      user,
      "Xóa vi phạm (Ghi nhầm)",
      `Đã xóa vi phạm của ${violation.student.fullName} — ${violation.type.name} (${violation.occurredAt})`,
      violation.studentId,
    );
    return { success: true, message: "Đã xóa vi phạm thành công" };
  }
}

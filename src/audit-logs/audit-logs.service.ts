import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "../database/entities/audit-log.entity";
import { JwtPayload } from "../auth/types/jwt-payload.type";

@Injectable()
export class AuditLogsService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  // Gọi từ mọi nơi tạo/sửa vi phạm, khen thưởng, danh mục — đây chính là
  // "lịch sử chỉnh sửa nề nếp": ai, làm gì, khi nào.
  record(actor: JwtPayload, action: string, detail: string, studentId?: string | null) {
    const entry = this.repo.create({
      actorUserId: actor.sub,
      action,
      detail,
      studentId: studentId ?? null,
    });
    return this.repo.save(entry);
  }

  // Chỉ cần đăng nhập (Admin hoặc tài khoản Admin cấp) là xem được — đây là dữ liệu
  // nội bộ, khác với các "chỉ số" công khai (danh sách, vi phạm, hạnh kiểm...).
  list() {
    return this.repo.find({
      relations: { actor: true, student: true },
      order: { at: "DESC" },
      take: 200,
    });
  }

  listForStudent(studentId: string) {
    return this.repo.find({
      where: { studentId },
      relations: { actor: true },
      order: { at: "DESC" },
      take: 20,
    });
  }
}

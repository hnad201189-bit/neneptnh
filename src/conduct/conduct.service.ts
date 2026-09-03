import { BadRequestException, Injectable } from "@nestjs/common";
import { StudentsService } from "../students/students.service";
import { ViolationsService } from "../violations/violations.service";
import { MeritsService } from "../merits/merits.service";

export type Classification = "tot" | "kha" | "dat" | "chua_dat";

// Công thức: 100 điểm khởi điểm MỖI THÁNG, trừ theo lỗi, cộng khen thưởng (tối đa
// +10), giới hạn 0-100. Đối chiếu 4 mức của Thông tư 22/2021/TT-BGDĐT. Điểm không
// cộng dồn qua tháng — mỗi tháng học sinh lại bắt đầu từ 100.
export function classify(score: number): Classification {
  if (score >= 90) return "tot";
  if (score >= 70) return "kha";
  if (score >= 50) return "dat";
  return "chua_dat";
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

@Injectable()
export class ConductService {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly violationsService: ViolationsService,
    private readonly meritsService: MeritsService,
  ) {}

  async list(month?: string) {
    const targetMonth = month || currentMonth();
    if (!MONTH_RE.test(targetMonth)) {
      throw new BadRequestException('Tháng không hợp lệ — đúng định dạng "YYYY-MM", VD 2026-09');
    }

    const [students, allViolations, allMerits] = await Promise.all([
      this.studentsService.list(),
      this.violationsService.list(),
      this.meritsService.list(),
    ]);
    // occurredAt lưu dạng "YYYY-MM-DD" nên so khớp tiền tố "YYYY-MM" là đủ, không cần
    // truy vấn riêng theo tháng ở tầng DB — dữ liệu vi phạm/khen thưởng đã tải sẵn.
    const violations = allViolations.filter((v) => v.occurredAt.startsWith(targetMonth));
    const merits = allMerits.filter((m) => m.occurredAt.startsWith(targetMonth));

    const deductionByStudent = new Map<string, number>();
    const violationCountByStudent = new Map<string, number>();
    for (const v of violations) {
      deductionByStudent.set(v.studentId, (deductionByStudent.get(v.studentId) ?? 0) + v.type.points);
      violationCountByStudent.set(v.studentId, (violationCountByStudent.get(v.studentId) ?? 0) + 1);
    }

    const bonusByStudent = new Map<string, number>();
    const meritCountByStudent = new Map<string, number>();
    for (const m of merits) {
      bonusByStudent.set(m.studentId, (bonusByStudent.get(m.studentId) ?? 0) + m.type.points);
      meritCountByStudent.set(m.studentId, (meritCountByStudent.get(m.studentId) ?? 0) + 1);
    }

    const scores = students.map((s) => {
      const deduction = deductionByStudent.get(s.id) ?? 0;
      const bonus = Math.min(bonusByStudent.get(s.id) ?? 0, 10);
      const score = Math.max(0, Math.min(100, 100 - deduction + bonus));
      return {
        student: { id: s.id, fullName: s.fullName, group: s.group?.name ?? null },
        score,
        classification: classify(score),
        deduction,
        bonus,
        violationCount: violationCountByStudent.get(s.id) ?? 0,
        meritCount: meritCountByStudent.get(s.id) ?? 0,
      };
    });

    return { month: targetMonth, scores };
  }
}

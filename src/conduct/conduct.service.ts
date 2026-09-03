import { Injectable } from "@nestjs/common";
import { StudentsService } from "../students/students.service";
import { ViolationsService } from "../violations/violations.service";
import { MeritsService } from "../merits/merits.service";

export type Classification = "tot" | "kha" | "dat" | "chua_dat";

// Công thức đúng như tài liệu kiến trúc: 100 điểm khởi điểm, trừ theo lỗi, cộng khen
// thưởng (tối đa +10), giới hạn 0-100. Đối chiếu 4 mức của Thông tư 22/2021/TT-BGDĐT.
export function classify(score: number): Classification {
  if (score >= 90) return "tot";
  if (score >= 70) return "kha";
  if (score >= 50) return "dat";
  return "chua_dat";
}

@Injectable()
export class ConductService {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly violationsService: ViolationsService,
    private readonly meritsService: MeritsService,
  ) {}

  async list() {
    const [students, violations, merits] = await Promise.all([
      this.studentsService.list(),
      this.violationsService.list(),
      this.meritsService.list(),
    ]);

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

    return students.map((s) => {
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
  }
}

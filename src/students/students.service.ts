import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "../database/entities/student.entity";
import { Group } from "../database/entities/group.entity";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { JwtPayload } from "../auth/types/jwt-payload.type";
import { StudentAssignmentItem } from "./dto/divide-groups.dto";

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  list() {
    return this.students.find({
      relations: { group: true },
      select: { id: true, fullName: true, status: true, groupId: true },
      order: { fullName: "ASC" },
    });
  }

  findOne(id: string) {
    return this.students.findOne({ where: { id }, relations: { group: true } });
  }

  async updateStudentGroup(id: string, groupId: string | null | undefined, actor: JwtPayload) {
    const student = await this.students.findOne({ where: { id }, relations: { group: true } });
    if (!student) throw new NotFoundException(`Không tìm thấy học sinh: ${id}`);

    let targetGroup: Group | null = null;
    if (groupId) {
      targetGroup = await this.groupRepo.findOne({
        where: [{ id: groupId }, { name: groupId }],
      });
      if (!targetGroup) throw new NotFoundException(`Không tìm thấy tổ: ${groupId}`);
    }

    const oldGroupName = student.group?.name || "Chưa phân tổ";
    const newGroupName = targetGroup ? targetGroup.name : "Chưa phân tổ";

    await this.students.update(id, {
      groupId: targetGroup ? targetGroup.id : null,
    });

    await this.auditLogsService.record(
      actor,
      "Chuyển tổ học sinh",
      `Chuyển ${student.fullName} (${student.id}) từ ${oldGroupName} sang ${newGroupName}`,
      student.id,
    );

    return this.findOne(student.id);
  }

  async divideGroups(assignments: StudentAssignmentItem[], actor: JwtPayload) {
    const groups = await this.groupRepo.find();
    const groupById = new Map<string, Group>();
    for (const g of groups) {
      groupById.set(g.id, g);
      groupById.set(g.name, g);
    }

    let updatedCount = 0;
    for (const item of assignments) {
      const student = await this.students.findOne({ where: { id: item.studentId } });
      if (!student) continue;

      let targetGroupId: string | null = null;
      if (item.groupId) {
        const found = groupById.get(item.groupId);
        if (found) targetGroupId = found.id;
      }

      if (student.groupId !== targetGroupId) {
        await this.students.update(student.id, { groupId: targetGroupId });
        updatedCount++;
      }
    }

    await this.auditLogsService.record(
      actor,
      "Phân chia tổ học sinh",
      `Admin cập nhật phân chia tổ cho ${updatedCount} học sinh lớp 11B10`,
      null,
    );

    return {
      success: true,
      updated: updatedCount,
      students: await this.list(),
    };
  }

  async autoDistribute(method: "alphabetical" | "random" = "alphabetical", actor: JwtPayload) {
    const groups = await this.groupRepo.find({ order: { name: "ASC" } });
    if (!groups.length) throw new NotFoundException("Không tìm thấy danh sách tổ nào để phân chia");

    const allStudents = await this.students.find();
    if (method === "alphabetical") {
      allStudents.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
    } else {
      // Fisher-Yates shuffle
      for (let i = allStudents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allStudents[i], allStudents[j]] = [allStudents[j], allStudents[i]];
      }
    }

    // Chia đều round-robin vào các tổ
    for (let i = 0; i < allStudents.length; i++) {
      const assignedGroup = groups[i % groups.length];
      await this.students.update(allStudents[i].id, { groupId: assignedGroup.id });
    }

    const methodName = method === "random" ? "ngẫu nhiên" : "theo thứ tự A-Z";
    await this.auditLogsService.record(
      actor,
      "Tự động chia tổ",
      `Admin tự động chia đều ${allStudents.length} học sinh vào ${groups.length} tổ (${methodName})`,
      null,
    );

    return {
      success: true,
      updated: allStudents.length,
      students: await this.list(),
    };
  }
}

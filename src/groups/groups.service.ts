import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Group } from "../database/entities/group.entity";
import { Student } from "../database/entities/student.entity";
import { User } from "../database/entities/user.entity";

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // Dùng chung cho list() và findOne() — KHÔNG bao giờ trả entity User thô ra ngoài
  // (chứa passwordHash/refreshTokenHash), chỉ trả các trường an toàn.
  private toSafeGroup(g: Group) {
    return {
      id: g.id,
      name: g.name,
      classId: g.classId,
      leaderStudentId: g.leaderStudentId ?? null,
      leaderStudent: g.leaderStudent
        ? {
            id: g.leaderStudent.id,
            fullName: g.leaderStudent.fullName,
            status: g.leaderStudent.status,
          }
        : null,
      studentsCount: g.students?.length ?? 0,
      students: (g.students ?? [])
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"))
        .map((s) => ({ id: s.id, fullName: s.fullName, status: s.status })),
      users: (g.users ?? []).map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        status: u.status,
      })),
    };
  }

  async list() {
    const groups = await this.groupRepo.find({
      relations: {
        leaderStudent: true,
        students: true,
        users: true,
      },
      order: { name: "ASC" },
    });

    return groups.map((g) => this.toSafeGroup(g));
  }

  async findOne(id: string) {
    const group = await this.groupRepo.findOne({
      where: [{ id }, { name: id }],
      relations: { leaderStudent: true, students: true, users: true },
    });
    if (!group) throw new NotFoundException(`Không tìm thấy tổ: ${id}`);
    return this.toSafeGroup(group);
  }

  async updateLeader(groupId: string, leaderStudentId: string | null) {
    const group = await this.groupRepo.findOne({
      where: [{ id: groupId }, { name: groupId }],
    });
    if (!group) throw new NotFoundException(`Không tìm thấy tổ: ${groupId}`);

    if (leaderStudentId) {
      const student = await this.studentRepo.findOne({ where: { id: leaderStudentId } });
      if (!student) {
        throw new NotFoundException(`Không tìm thấy học sinh có mã: ${leaderStudentId}`);
      }

      // Đảm bảo học sinh thuộc tổ này (hoặc cập nhật tổ cho học sinh nếu cần)
      if (student.groupId && student.groupId !== group.id) {
        throw new BadRequestException(
          `Học sinh ${student.fullName} (${student.id}) đang thuộc tổ khác, không thể gán làm tổ trưởng của ${group.name}`,
        );
      }

      // Xóa gán tổ trưởng ở tổ cũ nếu học sinh này đang làm tổ trưởng tổ khác
      await this.groupRepo.update(
        { leaderStudentId },
        { leaderStudentId: null },
      );

      group.leaderStudentId = leaderStudentId;

      const teamLeaderUser = await this.userRepo.findOne({ where: { groupId: group.id } });
      if (teamLeaderUser) {
        teamLeaderUser.fullName = `${student.fullName} - Tổ trưởng ${group.name}`;
        await this.userRepo.save(teamLeaderUser);
      }
    } else {
      group.leaderStudentId = null;
    }

    await this.groupRepo.save(group);

    return this.findOne(group.id);
  }
}

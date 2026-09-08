import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User } from "../database/entities/user.entity";
import { Group } from "../database/entities/group.entity";
import { Permission } from "../common/permissions";

const BCRYPT_ROUNDS = 10;
const SCOPE_RELATIONS = { group: true } as const;

export const OFFICIAL_TEAM_LEADERS = [
  {
    groupName: "Tổ 1",
    email: "to1.11b10@thpttnh.edu.vn",
    fullName: "Đặng Thảo An - Tổ trưởng Tổ 1",
    leaderStudentId: "TNH25260409",
    password: "ToTruong@123",
  },
  {
    groupName: "Tổ 2",
    email: "to2.11b10@thpttnh.edu.vn",
    fullName: "Nguyễn Thùy Lâm - Tổ trưởng Tổ 2",
    leaderStudentId: "TNH25260421",
    password: "ToTruong@123",
  },
  {
    groupName: "Tổ 3",
    email: "to3.11b10@thpttnh.edu.vn",
    fullName: "Trần Bảo Thy - Tổ trưởng Tổ 3",
    leaderStudentId: "TNH25260449",
    password: "ToTruong@123",
  },
  {
    groupName: "Tổ 4",
    email: "to4.11b10@thpttnh.edu.vn",
    fullName: "Lê Thị Thanh Hiền - Tổ trưởng Tổ 4",
    leaderStudentId: "TNH25260417",
    password: "ToTruong@123",
  },
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
  ) {}

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email: email.toLowerCase().trim() }, relations: SCOPE_RELATIONS });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id }, relations: SCOPE_RELATIONS });
  }

  async setRefreshTokenHash(userId: string, hash: string | null) {
    await this.repo.update({ id: userId }, { refreshTokenHash: hash });
  }

  async resolveGroupId(rawGroupId?: string | null): Promise<string | null> {
    if (!rawGroupId || !rawGroupId.trim()) return null;
    const trimmed = rawGroupId.trim();
    const group = await this.groupRepo.findOne({
      where: [{ id: trimmed }, { name: trimmed }],
    });
    return group ? group.id : trimmed;
  }

  // Danh sách cho màn "Quản lý tài khoản" — không trả passwordHash/refreshTokenHash.
  async list(schoolId: string) {
    const rows = await this.repo.find({ where: { schoolId }, relations: SCOPE_RELATIONS, order: { createdAt: "ASC" } });
    return rows.map((u) => this.toSafeProfile(u));
  }

  toSafeProfile(u: User) {
    const isTeamLeader = !u.isAdmin && !!u.groupId;
    const classification = u.isAdmin ? "admin" : isTeamLeader ? "to_truong" : "other";
    const classificationLabel = u.isAdmin
      ? "Quản trị viên"
      : isTeamLeader
        ? `Tổ trưởng (${u.group?.name || "Tổ"})`
        : "Cán bộ / GVCN";

    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      status: u.status,
      isAdmin: u.isAdmin,
      permissions: u.permissions || [],
      groupId: u.groupId ?? null,
      group: u.group ? { id: u.group.id, name: u.group.name } : null,
      classification,
      classificationLabel,
      createdAt: u.createdAt,
    };
  }

  async create(params: {
    schoolId: string;
    email: string;
    fullName: string;
    password: string;
    permissions: Permission[];
    groupId?: string | null;
  }) {
    const email = params.email.toLowerCase().trim();
    const existing = await this.repo.findOne({ where: { email } });
    const resolvedGroupId = await this.resolveGroupId(params.groupId);
    const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);

    if (existing) {
      if (existing.isAdmin) throw new ConflictException("Không thể thay đổi tài khoản Admin qua form này");
      existing.fullName = params.fullName;
      existing.groupId = resolvedGroupId;
      existing.permissions = params.permissions;
      existing.passwordHash = passwordHash;
      existing.status = "active";
      const saved = await this.repo.save(existing);
      return this.toSafeProfile(await this.repo.findOneOrFail({ where: { id: saved.id }, relations: SCOPE_RELATIONS }));
    }

    const saved = await this.repo.save(
      this.repo.create({
        schoolId: params.schoolId,
        email,
        fullName: params.fullName,
        passwordHash,
        permissions: params.permissions,
        groupId: resolvedGroupId,
        isAdmin: false, // chỉ tạo được sẵn bằng seed — không tạo thêm Admin qua API này
      }),
    );
    return this.toSafeProfile(await this.repo.findOneOrFail({ where: { id: saved.id }, relations: SCOPE_RELATIONS }));
  }

  async update(
    id: string,
    schoolId: string,
    changes: { fullName?: string; permissions?: Permission[]; groupId?: string | null; status?: string; password?: string },
  ) {
    const user = await this.repo.findOne({ where: { id, schoolId } });
    if (!user) throw new NotFoundException("Không tìm thấy tài khoản này");
    if (user.isAdmin) throw new ConflictException("Không thể sửa quyền của tài khoản Admin");

    if (changes.fullName !== undefined) user.fullName = changes.fullName;
    if (changes.permissions !== undefined) user.permissions = changes.permissions;
    if (changes.groupId !== undefined) user.groupId = await this.resolveGroupId(changes.groupId);
    if (changes.status !== undefined) user.status = changes.status;
    if (changes.password) user.passwordHash = await bcrypt.hash(changes.password, BCRYPT_ROUNDS);

    const saved = await this.repo.save(user);
    return this.toSafeProfile(await this.repo.findOneOrFail({ where: { id: saved.id }, relations: SCOPE_RELATIONS }));
  }

  async initTeamLeaders(schoolId: string) {
    const results: Array<{ groupName: string; email: string; fullName: string; action: "created" | "updated" }> = [];

    for (const leader of OFFICIAL_TEAM_LEADERS) {
      const group = await this.groupRepo.findOne({
        where: [{ name: leader.groupName }, { id: `group-11b10-${leader.groupName}` }],
      });

      // Chỉ gán tổ trưởng mặc định nếu tổ CHƯA có ai — không ép về lại người mặc định
      // nếu Admin đã tự chỉ định người khác qua giao diện "Quản lý phân tổ".
      if (group && !group.leaderStudentId) {
        group.leaderStudentId = leader.leaderStudentId;
        await this.groupRepo.save(group);
      }

      const groupId = group ? group.id : null;
      const email = leader.email.toLowerCase().trim();
      const existing = await this.repo.findOne({ where: { email } });

      const permissions: Permission[] = ["record_violations", "record_merits"];

      if (existing) {
        // Tài khoản đã tồn tại — chỉ đảm bảo tên/quyền đúng chuẩn, KHÔNG ép lại tổ
        // (groupId) vì Admin có thể đã đổi tổ cho tài khoản này qua "Quản lý tài khoản".
        existing.fullName = leader.fullName;
        existing.permissions = permissions;
        existing.status = "active";
        await this.repo.save(existing);
        results.push({ groupName: leader.groupName, email, fullName: leader.fullName, action: "updated" });
      } else {
        const passwordHash = await bcrypt.hash(leader.password, BCRYPT_ROUNDS);
        await this.repo.save(
          this.repo.create({
            schoolId,
            email,
            fullName: leader.fullName,
            passwordHash,
            permissions,
            groupId,
            isAdmin: false,
            status: "active",
          }),
        );
        results.push({ groupName: leader.groupName, email, fullName: leader.fullName, action: "created" });
      }
    }

    return {
      message: "Đồng bộ và khởi tạo 4 tài khoản Tổ trưởng thành công",
      results,
    };
  }
}

import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User } from "../database/entities/user.entity";
import { Permission } from "../common/permissions";

const BCRYPT_ROUNDS = 10;
const SCOPE_RELATIONS = { group: true } as const;

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email: email.toLowerCase().trim() }, relations: SCOPE_RELATIONS });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id }, relations: SCOPE_RELATIONS });
  }

  async setRefreshTokenHash(userId: string, hash: string | null) {
    await this.repo.update({ id: userId }, { refreshTokenHash: hash });
  }

  // Danh sách cho màn "Quản lý tài khoản" — không trả passwordHash/refreshTokenHash.
  async list(schoolId: string) {
    const rows = await this.repo.find({ where: { schoolId }, relations: SCOPE_RELATIONS, order: { createdAt: "ASC" } });
    return rows.map((u) => this.toSafeProfile(u));
  }

  toSafeProfile(u: User) {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      status: u.status,
      isAdmin: u.isAdmin,
      permissions: u.permissions || [],
      group: u.group ? { id: u.group.id, name: u.group.name } : null,
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
    if (existing) throw new ConflictException("Email này đã có tài khoản");

    const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
    const saved = await this.repo.save(
      this.repo.create({
        schoolId: params.schoolId,
        email,
        fullName: params.fullName,
        passwordHash,
        permissions: params.permissions,
        groupId: params.groupId ?? null,
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
    if (changes.groupId !== undefined) user.groupId = changes.groupId;
    if (changes.status !== undefined) user.status = changes.status;
    if (changes.password) user.passwordHash = await bcrypt.hash(changes.password, BCRYPT_ROUNDS);

    const saved = await this.repo.save(user);
    return this.toSafeProfile(await this.repo.findOneOrFail({ where: { id: saved.id }, relations: SCOPE_RELATIONS }));
  }
}

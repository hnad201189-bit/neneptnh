import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { School } from "./school.entity";
import { Group } from "./group.entity";
import { Permission } from "../../common/permissions";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  schoolId!: string;

  @ManyToOne(() => School, (school) => school.users)
  @JoinColumn({ name: "schoolId" })
  school!: School;

  @Column({ unique: true })
  email!: string;

  @Column()
  fullName!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column()
  passwordHash!: string;

  @Column({ default: "active" }) // active | locked
  status!: string;

  // Admin: toàn quyền, kể cả tạo/sửa tài khoản khác — không tài khoản thường nào có được.
  @Column({ default: false })
  isAdmin!: boolean;

  // Quyền cụ thể do Admin tích chọn khi tạo/sửa tài khoản (bỏ qua nếu isAdmin = true).
  @Column({ type: "simple-array", default: "" })
  permissions!: Permission[];

  // Tuỳ chọn: nếu Admin gán một tổ cho tài khoản này, tài khoản đó chỉ ghi nhận được
  // cho học sinh trong tổ đó. Để trống = không giới hạn (áp dụng cho cả lớp).
  @Column({ type: "varchar", nullable: true })
  groupId?: string | null;

  @ManyToOne(() => Group, (group) => group.users, { nullable: true })
  @JoinColumn({ name: "groupId" })
  group?: Group | null;

  // Chỉ lưu HASH của refresh token hiện hành (bcrypt), không lưu token gốc.
  @Column({ type: "varchar", nullable: true })
  refreshTokenHash?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

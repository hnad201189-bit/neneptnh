import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Student } from "./student.entity";

// Nhật ký mọi thao tác tạo/sửa vi phạm, khen thưởng, danh mục — kể cả các mục
// do tổ trưởng nhập. Không ai xoá được dòng audit (chỉ ghi thêm, không update/delete).
@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  actorUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "actorUserId" })
  actor!: User;

  @Column()
  action!: string;

  @Column({ type: "text" })
  detail!: string;

  @Column({ type: "varchar", nullable: true })
  studentId?: string | null;

  @ManyToOne(() => Student, { nullable: true })
  @JoinColumn({ name: "studentId" })
  student?: Student | null;

  @CreateDateColumn()
  at!: Date;
}

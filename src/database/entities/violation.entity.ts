import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ViolationStatus } from "../../common/severity.enum";
import { Student } from "./student.entity";
import { ViolationType } from "./violation-type.entity";
import { User } from "./user.entity";

@Entity("violations")
export class Violation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  studentId!: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: "studentId" })
  student!: Student;

  @Column()
  typeId!: string;

  @ManyToOne(() => ViolationType)
  @JoinColumn({ name: "typeId" })
  type!: ViolationType;

  @Column({ type: "date" })
  occurredAt!: string;

  @Column()
  recordedByUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "recordedByUserId" })
  recordedBy!: User;

  @Column({ type: "text", nullable: true })
  note?: string;

  @Column({ type: "simple-enum", enum: ViolationStatus, default: ViolationStatus.CHO_XU_LY })
  status!: ViolationStatus;

  @Column({ type: "varchar", nullable: true })
  processedByUserId?: string | null;

  @Column({ type: "timestamp", nullable: true })
  processedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}

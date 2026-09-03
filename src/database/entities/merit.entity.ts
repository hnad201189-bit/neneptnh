import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";
import { MeritType } from "./merit-type.entity";
import { User } from "./user.entity";

@Entity("merits")
export class Merit {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  studentId!: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: "studentId" })
  student!: Student;

  @Column()
  typeId!: string;

  @ManyToOne(() => MeritType)
  @JoinColumn({ name: "typeId" })
  type!: MeritType;

  @Column({ type: "date" })
  occurredAt!: string;

  @Column()
  recordedByUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "recordedByUserId" })
  recordedBy!: User;

  @Column({ type: "text", nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt!: Date;
}

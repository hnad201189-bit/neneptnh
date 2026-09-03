import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { Class } from "./class.entity";
import { Group } from "./group.entity";

@Entity("students")
export class Student {
  @PrimaryColumn("varchar") // dùng đúng Mã học sinh thật, VD "TNH25260409"
  id!: string;

  @Column()
  fullName!: string;

  @Column()
  classId!: string;

  @ManyToOne(() => Class, (klass) => klass.students)
  @JoinColumn({ name: "classId" })
  klass!: Class;

  @Column({ type: "varchar", nullable: true })
  groupId?: string | null;

  @ManyToOne(() => Group, (group) => group.students, { nullable: true })
  @JoinColumn({ name: "groupId" })
  group?: Group | null;

  @Column({ default: "dang_hoc" }) // dang_hoc | nghi | tot_nghiep
  status!: string;

  @OneToOne(() => Group, (group) => group.leaderStudent)
  leaderOfGroup?: Group;
}

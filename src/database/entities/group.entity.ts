import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { Class } from "./class.entity";
import { Student } from "./student.entity";
import { User } from "./user.entity";

// "Tổ" — nhóm nhỏ trong lớp, mỗi tổ có 1 tổ trưởng (học sinh).
@Entity("groups")
export class Group {
  @PrimaryColumn("varchar")
  id!: string;

  @Column() // VD "Tổ 1"
  name!: string;

  @Column()
  classId!: string;

  @ManyToOne(() => Class, (klass) => klass.groups)
  @JoinColumn({ name: "classId" })
  klass!: Class;

  @Column({ type: "varchar", nullable: true, unique: true })
  leaderStudentId?: string | null;

  @OneToOne(() => Student, (student) => student.leaderOfGroup, { nullable: true })
  @JoinColumn({ name: "leaderStudentId" })
  leaderStudent?: Student | null;

  @OneToMany(() => Student, (student) => student.group)
  students!: Student[];

  @OneToMany(() => User, (user) => user.group)
  users!: User[];
}

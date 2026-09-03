import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { School } from "./school.entity";
import { Group } from "./group.entity";
import { Student } from "./student.entity";

@Entity("classes")
export class Class {
  @PrimaryColumn("varchar")
  id!: string;

  @Column()
  schoolId!: string;

  @ManyToOne(() => School, (school) => school.classes)
  @JoinColumn({ name: "schoolId" })
  school!: School;

  @Column() // VD "11B10"
  name!: string;

  @Column("int") // 10 | 11 | 12
  grade!: number;

  @Column() // VD "2026-2027"
  schoolYear!: string;

  // Chỉ để hiển thị (VD "Nguyễn Thị Hường") — không gắn với tài khoản đăng nhập nào,
  // vì hệ thống không còn vai trò "GVCN" cố định; quyền do Admin tự cấp riêng.
  @Column({ nullable: true })
  homeroomTeacherName?: string;

  @OneToMany(() => Group, (group) => group.klass)
  groups!: Group[];

  @OneToMany(() => Student, (student) => student.klass)
  students!: Student[];
}

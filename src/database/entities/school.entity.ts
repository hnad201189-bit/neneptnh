import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { Class } from "./class.entity";
import { User } from "./user.entity";

@Entity("schools")
export class School {
  @PrimaryColumn("varchar")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @OneToMany(() => Class, (klass) => klass.school)
  classes!: Class[];

  @OneToMany(() => User, (user) => user.school)
  users!: User[];
}

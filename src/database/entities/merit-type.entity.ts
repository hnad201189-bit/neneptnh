import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { School } from "./school.entity";

@Entity("merit_types")
export class MeritType {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  schoolId!: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: "schoolId" })
  school!: School;

  @Column()
  name!: string;

  @Column("int")
  points!: number;

  @Column({ default: true })
  active!: boolean;
}

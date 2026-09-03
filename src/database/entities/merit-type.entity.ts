import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { School } from "./school.entity";

// id là varchar (không ép kiểu uuid) vì danh mục gốc dùng id ngắn dễ đọc như "mt1".
@Entity("merit_types")
export class MeritType {
  @PrimaryColumn("varchar")
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

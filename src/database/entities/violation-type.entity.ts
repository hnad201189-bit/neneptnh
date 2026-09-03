import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Severity } from "../../common/severity.enum";
import { School } from "./school.entity";

// Danh mục lỗi vi phạm — dùng chung toàn trường, chuẩn hoá tên/mức độ/điểm trừ.
@Entity("violation_types")
export class ViolationType {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  schoolId!: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: "schoolId" })
  school!: School;

  @Column()
  name!: string;

  @Column({ type: "simple-enum", enum: Severity })
  severity!: Severity;

  @Column("int")
  points!: number;

  @Column({ nullable: true })
  icon?: string;

  @Column({ default: true })
  active!: boolean;
}

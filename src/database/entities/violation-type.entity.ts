import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Severity } from "../../common/severity.enum";
import { School } from "./school.entity";

// Danh mục lỗi vi phạm — dùng chung toàn trường, chuẩn hoá tên/mức độ/điểm trừ.
// id là varchar (không ép kiểu uuid) vì danh mục gốc dùng id ngắn dễ đọc như "vt1".
@Entity("violation_types")
export class ViolationType {
  @PrimaryColumn("varchar")
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

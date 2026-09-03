/* eslint-disable no-console */
import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { AppDataSource } from "./data-source";
import { Permission } from "../common/permissions";
import { Severity, ViolationStatus } from "../common/severity.enum";
import { School } from "./entities/school.entity";
import { Class } from "./entities/class.entity";
import { Group } from "./entities/group.entity";
import { Student } from "./entities/student.entity";
import { User } from "./entities/user.entity";
import { ViolationType } from "./entities/violation-type.entity";
import { MeritType } from "./entities/merit-type.entity";
import { Violation } from "./entities/violation.entity";
import { Merit } from "./entities/merit.entity";

const BCRYPT_ROUNDS = 10;

// Danh sách thật lớp 11B10 (từ "Lớp 11B10.xlsx") — chỉ giữ Mã học sinh + Họ tên,
// đúng như đã dùng trong bản thiết kế giao diện, để hai bên khớp dữ liệu.
const STUDENTS: Array<[string, string, "Tổ 1" | "Tổ 2" | "Tổ 3" | "Tổ 4"]> = [
  ["TNH25260409", "Đặng Thảo An", "Tổ 1"],
  ["TNH25260410", "Nguyễn Thị Trâm Anh", "Tổ 1"],
  ["TNH25260411", "Trịnh Quỳnh Anh", "Tổ 1"],
  ["TNH25260412", "Trương Bảo Anh", "Tổ 1"],
  ["TNH25260413", "Phạm Thị Bảo Châu", "Tổ 1"],
  ["TNH25260414", "Phạm Quang Đông", "Tổ 1"],
  ["TNH25260415", "Trịnh Ngọc Hà", "Tổ 1"],
  ["TNH25260416", "Phạm Kim Hậu", "Tổ 1"],
  ["TNH25260417", "Lê Thị Thanh Hiền", "Tổ 1"],
  ["TNH25260418", "Vũ Thế Hưng", "Tổ 1"],
  ["TNH25260419", "Nghiêm Đăng Khánh", "Tổ 1"],
  ["TNH25260420", "Phạm Bá Việt Khoa", "Tổ 1"],
  ["TNH25260421", "Nguyễn Thùy Lâm", "Tổ 2"],
  ["TNH25260422", "Trần Tuệ Lâm", "Tổ 2"],
  ["TNH25260423", "Nguyễn Đào Đan Linh", "Tổ 2"],
  ["TNH25260424", "Nguyễn Hà Linh", "Tổ 2"],
  ["TNH25260425", "Vũ Thị Phương Linh", "Tổ 2"],
  ["TNH25260426", "Nguyễn Như Mai", "Tổ 2"],
  ["TNH25260427", "Vũ Quang Minh", "Tổ 2"],
  ["TNH25260428", "Nguyễn Ngọc Hà My", "Tổ 2"],
  ["TNH25260429", "Đỗ Minh Ngọc", "Tổ 2"],
  ["TNH25260430", "Nguyễn Khánh Ngọc", "Tổ 2"],
  ["TNH25260431", "Trần Thị Minh Ngọc", "Tổ 2"],
  ["TNH25260432", "Vũ Bảo Ngọc", "Tổ 2"],
  ["TNH25260433", "Nguyễn Hải Yến Nhi", "Tổ 3"],
  ["TNH25260434", "Nguyễn Trần Yến Nhi", "Tổ 3"],
  ["TNH25260435", "Nguyễn Vũ Thùy Nhi", "Tổ 3"],
  ["TNH25260436", "Nguyễn Yến Nhi", "Tổ 3"],
  ["TNH25260437", "Nguyễn Thị Hồng Nhung", "Tổ 3"],
  ["TNH25260438", "Phạm Hồng Nhung", "Tổ 3"],
  ["TNH25260439", "Nguyễn Phạm Quỳnh Như", "Tổ 3"],
  ["TNH25260440", "Ngô Vũ Phong", "Tổ 3"],
  ["TNH25260441", "Phạm Hà Phương", "Tổ 3"],
  ["TNH25260442", "Phạm Tuấn Thành", "Tổ 3"],
  ["TNH25260443", "Nguyễn Phương Thảo", "Tổ 3"],
  ["TNH25260444", "Đỗ Đình Thịnh", "Tổ 3"],
  ["TNH25260445", "Nguyễn Thu Thủy", "Tổ 4"],
  ["TNH25260446", "Đặng Ngọc Anh Thư", "Tổ 4"],
  ["TNH25260447", "Nguyễn Hà Anh Thư", "Tổ 4"],
  ["TNH25260448", "Nguyễn Minh Thư", "Tổ 4"],
  ["TNH25260449", "Trần Bảo Thy", "Tổ 4"],
  ["TNH25260450", "Đào Sỹ Duy Tiến", "Tổ 4"],
  ["TNH25260451", "Đỗ Thùy Trang", "Tổ 4"],
  ["TNH25260452", "Hoàng Minh Trang", "Tổ 4"],
  ["TNH25260453", "Nguyễn Thu Trang", "Tổ 4"],
  ["TNH25260454", "Đào Ngọc Trúc", "Tổ 4"],
  ["TNH25260455", "Nguyễn Đức Tú", "Tổ 4"],
  ["TNH25260456", "Đặng Nguyễn Minh Tuấn", "Tổ 4"],
  ["TNH25260457", "Đinh Xuân Tùng", "Tổ 4"],
];

// Tổ trưởng chỉ mang tính hiển thị (do GVCN chỉ định) — KHÔNG gắn với tài khoản
// đăng nhập nào; tài khoản là việc riêng do Admin tạo và cấp quyền ở màn "Quản lý tài khoản".
const TO_TRUONG_MA_HS: Record<string, string> = {
  "Tổ 1": "TNH25260409",
  "Tổ 2": "TNH25260421",
  "Tổ 3": "TNH25260433",
  "Tổ 4": "TNH25260445",
};

const VIOLATION_TYPES: Array<[string, string, Severity, number, string]> = [
  ["vt1", "Đi học muộn", Severity.NHE, 2, "⏰"],
  ["vt2", "Không mặc đồng phục", Severity.NHE, 2, "👕"],
  ["vt3", "Nói chuyện riêng trong giờ học", Severity.NHE, 3, "💬"],
  ["vt4", "Xả rác, vi phạm vệ sinh chung", Severity.NHE, 2, "🗑️"],
  ["vt5", "Không làm bài tập về nhà", Severity.TB, 4, "📓"],
  ["vt6", "Sử dụng điện thoại trong giờ học", Severity.TB, 5, "📱"],
  ["vt7", "Vi phạm an toàn giao thông", Severity.TB, 5, "🪖"],
  ["vt8", "Vô lễ, cãi lời giáo viên", Severity.NANG, 10, "🗯️"],
  ["vt9", "Đánh nhau, gây gổ", Severity.NANG, 15, "🥊"],
  ["vt10", "Gian lận trong kiểm tra, thi cử", Severity.NANG, 20, "🎭"],
];

const MERIT_TYPES: Array<[string, string, number]> = [
  ["mt1", "Giúp đỡ bạn trong học tập", 3],
  ["mt2", "Thành tích học tập xuất sắc", 5],
  ["mt3", "Tích cực tham gia phong trào Đoàn – Đội", 3],
  ["mt4", "Nhặt được của rơi, trả lại người mất", 5],
  ["mt5", "Có tiến bộ vượt bậc trong rèn luyện", 4],
];

const SAMPLE_VIOLATIONS: Array<[string, string, string, ViolationStatus, string]> = [
  ["TNH25260415", "vt1", "2026-08-25", ViolationStatus.DA_XU_LY, ""],
  ["TNH25260415", "vt3", "2026-08-27", ViolationStatus.DA_XU_LY, ""],
  ["TNH25260418", "vt6", "2026-08-26", ViolationStatus.DA_XU_LY, "Dùng điện thoại giờ Toán"],
  ["TNH25260418", "vt9", "2026-09-02", ViolationStatus.DA_BAO_PH, "Xô xát tại sân trường"],
  ["TNH25260418", "vt8", "2026-08-31", ViolationStatus.DA_BAO_PH, ""],
  ["TNH25260418", "vt4", "2026-08-25", ViolationStatus.DA_XU_LY, ""],
  ["TNH25260410", "vt2", "2026-08-24", ViolationStatus.CHO_XU_LY, ""],
  ["TNH25260423", "vt4", "2026-08-28", ViolationStatus.DA_XU_LY, ""],
  ["TNH25260428", "vt5", "2026-08-25", ViolationStatus.CHO_XU_LY, ""],
  ["TNH25260428", "vt5", "2026-09-01", ViolationStatus.CHO_XU_LY, ""],
  ["TNH25260433", "vt1", "2026-08-26", ViolationStatus.DA_XU_LY, ""],
  ["TNH25260438", "vt7", "2026-08-27", ViolationStatus.DA_XU_LY, "Không đội mũ bảo hiểm"],
  ["TNH25260442", "vt10", "2026-09-01", ViolationStatus.DA_BAO_PH, "Sử dụng tài liệu trong KT 15 phút"],
  ["TNH25260442", "vt6", "2026-08-29", ViolationStatus.DA_XU_LY, ""],
  ["TNH25260444", "vt9", "2026-08-30", ViolationStatus.DA_BAO_PH, "Xô xát với bạn cùng lớp"],
  ["TNH25260444", "vt8", "2026-09-02", ViolationStatus.DA_BAO_PH, ""],
  ["TNH25260444", "vt1", "2026-08-25", ViolationStatus.DA_XU_LY, ""],
  ["TNH25260444", "vt6", "2026-08-24", ViolationStatus.CHO_XU_LY, ""],
  ["TNH25260451", "vt3", "2026-08-31", ViolationStatus.DA_XU_LY, ""],
  ["TNH25260413", "vt2", "2026-08-24", ViolationStatus.CHO_XU_LY, ""],
  ["TNH25260456", "vt6", "2026-09-01", ViolationStatus.CHO_XU_LY, ""],
  ["TNH25260456", "vt5", "2026-08-28", ViolationStatus.CHO_XU_LY, ""],
  ["TNH25260410", "vt1", "2026-09-02", ViolationStatus.CHO_XU_LY, ""],
  ["TNH25260425", "vt7", "2026-08-26", ViolationStatus.DA_XU_LY, ""],
];

const SAMPLE_MERITS: Array<[string, string, string, string]> = [
  ["TNH25260409", "mt2", "2026-08-29", ""],
  ["TNH25260417", "mt1", "2026-08-30", ""],
  ["TNH25260424", "mt3", "2026-08-26", ""],
  ["TNH25260440", "mt4", "2026-09-01", "Trả lại ví nhặt được ở căn tin"],
  ["TNH25260431", "mt2", "2026-08-27", ""],
  ["TNH25260421", "mt5", "2026-09-03", ""],
  ["TNH25260433", "mt3", "2026-08-25", ""],
  ["TNH25260449", "mt1", "2026-08-31", ""],
  ["TNH25260457", "mt2", "2026-08-28", ""],
  ["TNH25260430", "mt5", "2026-09-03", "Không tái phạm sau nhắc nhở"],
];

async function main() {
  console.log("Đang seed dữ liệu Trường THPT Trần Nguyên Hãn — lớp 11B10 …");
  await AppDataSource.initialize();

  const schoolRepo = AppDataSource.getRepository(School);
  const classRepo = AppDataSource.getRepository(Class);
  const groupRepo = AppDataSource.getRepository(Group);
  const studentRepo = AppDataSource.getRepository(Student);
  const userRepo = AppDataSource.getRepository(User);
  const violationTypeRepo = AppDataSource.getRepository(ViolationType);
  const meritTypeRepo = AppDataSource.getRepository(MeritType);
  const violationRepo = AppDataSource.getRepository(Violation);
  const meritRepo = AppDataSource.getRepository(Merit);

  const schoolId = "school-tnh";
  await schoolRepo.upsert(
    { id: schoolId, name: "Trường THPT Trần Nguyên Hãn", address: "Thành phố Hải Phòng" },
    ["id"],
  );

  const classId = "class-11b10";
  await classRepo.upsert(
    {
      id: classId,
      schoolId,
      name: "11B10",
      grade: 11,
      schoolYear: "2026-2027",
      homeroomTeacherName: "Nguyễn Thị Hường",
    },
    ["id"],
  );

  const groupIdByName: Record<string, string> = {};
  for (const name of ["Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4"]) {
    const id = `group-11b10-${name}`;
    await groupRepo.upsert({ id, name, classId }, ["id"]);
    groupIdByName[name] = id;
  }

  for (const [id, fullName, groupName] of STUDENTS) {
    await studentRepo.upsert({ id, fullName, classId, groupId: groupIdByName[groupName] }, ["id"]);
  }

  // Tổ trưởng — chỉ để hiển thị "ai là tổ trưởng tổ nào", GVCN chỉ định và có thể đổi
  // trực tiếp trong dữ liệu bất kỳ lúc nào; không liên quan tới việc cấp tài khoản.
  for (const [groupName, leaderId] of Object.entries(TO_TRUONG_MA_HS)) {
    await groupRepo.update({ id: groupIdByName[groupName] }, { leaderStudentId: leaderId });
  }

  for (const [id, name, severity, points, icon] of VIOLATION_TYPES) {
    await violationTypeRepo.upsert({ id, schoolId, name, severity, points, icon, active: true }, ["id"]);
  }
  for (const [id, name, points] of MERIT_TYPES) {
    await meritTypeRepo.upsert({ id, schoolId, name, points, active: true }, ["id"]);
  }

  async function upsertUser(params: {
    email: string;
    fullName: string;
    password: string;
    isAdmin: boolean;
    permissions: Permission[];
    groupId?: string | null;
  }) {
    const email = params.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
    await userRepo.upsert(
      {
        email,
        fullName: params.fullName,
        passwordHash,
        schoolId,
        isAdmin: params.isAdmin,
        permissions: params.permissions,
        groupId: params.groupId ?? null,
      },
      ["email"],
    );
    return userRepo.findOneByOrFail({ email });
  }

  // Cho phép đổi mật khẩu Admin qua biến môi trường SEED_ADMIN_PASSWORD trước khi
  // deploy công khai — KHÔNG dùng mật khẩu mặc định "Admin@123" khi lên internet thật.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const admin = await upsertUser({
    email: "admin@thpttnh.edu.vn",
    fullName: "Quản trị viên",
    password: adminPassword,
    isAdmin: true,
    permissions: [],
  });

  // 2 tài khoản ví dụ — minh hoạ cách Admin cấp quyền linh hoạt (không còn "vai trò" cố định).
  // Admin có thể sửa/xoá/tạo thêm ở màn "Quản lý tài khoản" bất kỳ lúc nào, không cần sửa code.
  await upsertUser({
    email: "canbo@thpttnh.edu.vn",
    fullName: "Tài khoản cán bộ (ví dụ — không giới hạn tổ)",
    password: "CanBo@123",
    isAdmin: false,
    permissions: ["record_violations", "record_merits", "manage_status"],
    groupId: null,
  });
  await upsertUser({
    email: "totruong1@thpttnh.edu.vn",
    fullName: "Tài khoản Tổ 1 (ví dụ — giới hạn theo tổ)",
    password: "ToTruong@123",
    isAdmin: false,
    permissions: ["record_violations", "record_merits"],
    groupId: groupIdByName["Tổ 1"],
  });

  for (let i = 0; i < SAMPLE_VIOLATIONS.length; i++) {
    const [studentId, typeId, occurredAt, status, note] = SAMPLE_VIOLATIONS[i];
    await violationRepo.upsert(
      { id: `seed-v${i + 1}`, studentId, typeId, occurredAt, status, note: note || undefined, recordedByUserId: admin.id },
      ["id"],
    );
  }
  for (let i = 0; i < SAMPLE_MERITS.length; i++) {
    const [studentId, typeId, occurredAt, note] = SAMPLE_MERITS[i];
    await meritRepo.upsert(
      { id: `seed-m${i + 1}`, studentId, typeId, occurredAt, note: note || undefined, recordedByUserId: admin.id },
      ["id"],
    );
  }

  console.log("Xong. Xem README.md để lấy thông tin đăng nhập.");
  console.log({ admin: admin.email, students: STUDENTS.length, violationTypes: VIOLATION_TYPES.length });

  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

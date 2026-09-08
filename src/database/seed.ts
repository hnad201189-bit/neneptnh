/* eslint-disable no-console */
import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { AppDataSource } from "./data-source";
import { Permission } from "../common/permissions";
import { Severity } from "../common/severity.enum";
import { School } from "./entities/school.entity";
import { Class } from "./entities/class.entity";
import { Group } from "./entities/group.entity";
import { Student } from "./entities/student.entity";
import { User } from "./entities/user.entity";
import { ViolationType } from "./entities/violation-type.entity";
import { MeritType } from "./entities/merit-type.entity";

const BCRYPT_ROUNDS = 10;

// Danh sách thật lớp 11B10 (từ "Lớp 11B10.xlsx") — chỉ giữ Mã học sinh + Họ tên,
// đúng như đã dùng trong bản thiết kế giao diện, để hai bên khớp dữ liệu.
const STUDENTS: Array<[string, string, "Tổ 1" | "Tổ 2" | "Tổ 3" | "Tổ 4"]> = [
  // Tổ 1 (12 học sinh)
  ["TNH25260425", "Vũ Thị Phương Linh", "Tổ 1"],
  ["TNH25260453", "Nguyễn Thu Trang", "Tổ 1"],
  ["TNH25260443", "Nguyễn Phương Thảo", "Tổ 1"],
  ["TNH25260434", "Nguyễn Trần Yến Nhi", "Tổ 1"],
  ["TNH25260437", "Nguyễn Thị Hồng Nhung", "Tổ 1"],
  ["TNH25260409", "Đặng Thảo An", "Tổ 1"],
  ["TNH25260410", "Nguyễn Thị Trâm Anh", "Tổ 1"],
  ["TNH25260432", "Vũ Bảo Ngọc", "Tổ 1"],
  ["TNH25260457", "Đinh Xuân Tùng", "Tổ 1"],
  ["TNH25260415", "Trịnh Ngọc Hà", "Tổ 1"],
  ["TNH25260442", "Phạm Tuấn Thành", "Tổ 1"],
  ["TNH25260413", "Phạm Thị Bảo Châu", "Tổ 1"],

  // Tổ 2 (12 học sinh)
  ["TNH25260448", "Nguyễn Minh Thư", "Tổ 2"],
  ["TNH25260450", "Đào Sỹ Duy Tiến", "Tổ 2"],
  ["TNH25260412", "Trương Bảo Anh", "Tổ 2"],
  ["TNH25260455", "Nguyễn Đức Tú", "Tổ 2"],
  ["TNH25260414", "Phạm Quang Đông", "Tổ 2"],
  ["TNH25260426", "Nguyễn Như Mai", "Tổ 2"],
  ["TNH25260416", "Phạm Kim Hậu", "Tổ 2"],
  ["TNH25260419", "Nghiêm Đăng Khánh", "Tổ 2"],
  ["TNH25260454", "Đào Ngọc Trúc", "Tổ 2"],
  ["TNH25260411", "Trịnh Quỳnh Anh", "Tổ 2"],
  ["TNH25260451", "Đỗ Thùy Trang", "Tổ 2"],
  ["TNH25260422", "Trần Tuệ Lâm", "Tổ 2"],

  // Tổ 3 (12 học sinh)
  ["TNH25260449", "Trần Bảo Thy", "Tổ 3"],
  ["TNH25260440", "Ngô Vũ Phong", "Tổ 3"],
  ["TNH25260456", "Đặng Nguyễn Minh Tuấn", "Tổ 3"],
  ["TNH25260447", "Nguyễn Hà Anh Thư", "Tổ 3"],
  ["TNH25260446", "Đặng Ngọc Anh Thư", "Tổ 3"],
  ["TNH25260431", "Trần Thị Minh Ngọc", "Tổ 3"],
  ["TNH25260420", "Phạm Bá Việt Khoa", "Tổ 3"],
  ["TNH25260423", "Nguyễn Đào Đan Linh", "Tổ 3"],
  ["TNH25260429", "Đỗ Minh Ngọc", "Tổ 3"],
  ["TNH25260435", "Nguyễn Vũ Thùy Nhi", "Tổ 3"],
  ["TNH25260436", "Nguyễn Yến Nhi", "Tổ 3"],
  ["TNH25260444", "Đỗ Đình Thịnh", "Tổ 3"],

  // Tổ 4 (13 học sinh)
  ["TNH25260439", "Nguyễn Phạm Quỳnh Như", "Tổ 4"],
  ["TNH25260445", "Nguyễn Thu Thủy", "Tổ 4"],
  ["TNH25260441", "Phạm Hà Phương", "Tổ 4"],
  ["TNH25260424", "Nguyễn Hà Linh", "Tổ 4"],
  ["TNH25260428", "Nguyễn Ngọc Hà My", "Tổ 4"],
  ["TNH25260418", "Vũ Thế Hưng", "Tổ 4"],
  ["TNH25260433", "Nguyễn Hải Yến Nhi", "Tổ 4"],
  ["TNH25260421", "Nguyễn Thùy Lâm", "Tổ 4"],
  ["TNH25260427", "Vũ Quang Minh", "Tổ 4"],
  ["TNH25260438", "Phạm Hồng Nhung", "Tổ 4"],
  ["TNH25260430", "Nguyễn Khánh Ngọc", "Tổ 4"],
  ["TNH25260452", "Hoàng Minh Trang", "Tổ 4"],
  ["TNH25260417", "Lê Thị Thanh Hiền", "Tổ 4"],
];

const TO_TRUONG_MA_HS: Record<string, string> = {
  "Tổ 1": "TNH25260409",
  "Tổ 2": "TNH25260421",
  "Tổ 3": "TNH25260449",
  "Tổ 4": "TNH25260417",
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

  // CHỈ tạo mới nếu học sinh chưa tồn tại — không đụng vào groupId của học sinh đã có,
  // để không hoàn tác việc Admin chia lại tổ qua giao diện mỗi khi server khởi động lại.
  for (const [id, fullName, groupName] of STUDENTS) {
    const existing = await studentRepo.findOne({ where: { id } });
    if (!existing) {
      await studentRepo.save(studentRepo.create({ id, fullName, classId, groupId: groupIdByName[groupName] }));
    }
  }

  // Tổ trưởng mặc định — CHỈ gán nếu tổ đó chưa có tổ trưởng nào (leaderStudentId rỗng).
  // Nếu Admin đã chỉ định qua giao diện, giữ nguyên, không ép về lại người mặc định.
  for (const [groupName, leaderId] of Object.entries(TO_TRUONG_MA_HS)) {
    const group = await groupRepo.findOne({ where: { id: groupIdByName[groupName] } });
    if (group && !group.leaderStudentId) {
      group.leaderStudentId = leaderId;
      await groupRepo.save(group);
    }
  }

  // Danh mục lỗi/khen thưởng — CHỈ tạo mới nếu chưa có, không ép "active" về true nữa,
  // để không hồi sinh các mục Admin đã ẩn (xoá mềm) qua màn Danh mục lỗi.
  for (const [id, name, severity, points, icon] of VIOLATION_TYPES) {
    const existing = await violationTypeRepo.findOne({ where: { id } });
    if (!existing) {
      await violationTypeRepo.save(violationTypeRepo.create({ id, schoolId, name, severity, points, icon, active: true }));
    }
  }
  for (const [id, name, points] of MERIT_TYPES) {
    const existing = await meritTypeRepo.findOne({ where: { id } });
    if (!existing) {
      await meritTypeRepo.save(meritTypeRepo.create({ id, schoolId, name, points, active: true }));
    }
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

  // 4 tài khoản Tổ trưởng chính thức lớp 11B10 — CHỈ tạo mới nếu email chưa tồn tại.
  // Không ép lại mật khẩu/tổ/quyền mỗi lần khởi động — Admin tự quản lý các tài khoản
  // này qua "Quản lý tài khoản" (đổi mật khẩu, đổi tổ…) và thay đổi đó phải được giữ lại.
  const OFFICIAL_LEADERS = [
    { email: "to1.11b10@thpttnh.edu.vn", name: "Đặng Thảo An - Tổ trưởng Tổ 1", group: "Tổ 1" },
    { email: "to2.11b10@thpttnh.edu.vn", name: "Nguyễn Thùy Lâm - Tổ trưởng Tổ 2", group: "Tổ 2" },
    { email: "to3.11b10@thpttnh.edu.vn", name: "Nguyễn Hải Yến Nhi - Tổ trưởng Tổ 3", group: "Tổ 3" },
    { email: "to4.11b10@thpttnh.edu.vn", name: "Nguyễn Thu Thủy - Tổ trưởng Tổ 4", group: "Tổ 4" },
  ];
  for (const l of OFFICIAL_LEADERS) {
    const email = l.email.toLowerCase().trim();
    const existing = await userRepo.findOne({ where: { email } });
    if (!existing) {
      await upsertUser({
        email,
        fullName: l.name,
        password: "ToTruong@123",
        isAdmin: false,
        permissions: ["record_violations", "record_merits"],
        groupId: groupIdByName[l.group],
      });
    }
  }

  console.log("Xong. Đã tạo Admin và 4 tài khoản Tổ trưởng 11B10.");

  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

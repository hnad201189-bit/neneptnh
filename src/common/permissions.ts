// Hệ thống quyền linh hoạt: KHÔNG còn vai trò cố định (GVCN/Giám thị/Tổ trưởng/...).
// Chỉ có 2 loại tài khoản: Admin (toàn quyền, tự tạo và cấp quyền cho tài khoản khác)
// và tài khoản thường — Admin tích chọn từng quyền dưới đây khi tạo tài khoản đó.
export const PERMISSIONS = ["record_violations", "record_merits", "manage_status", "manage_catalog"] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL: Record<Permission, string> = {
  record_violations: "Ghi nhận vi phạm",
  record_merits: "Ghi nhận khen thưởng",
  manage_status: "Xử lý trạng thái vi phạm",
  manage_catalog: "Sửa danh mục lỗi / khen thưởng",
};

export function isValidPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export enum Severity {
  NHE = "nhe",
  TB = "tb",
  NANG = "nang",
}

export enum ViolationStatus {
  CHO_XU_LY = "cho_xu_ly",
  DA_XU_LY = "da_xu_ly",
  DA_BAO_PH = "da_bao_ph",
}

export const STATUS_ORDER: ViolationStatus[] = [
  ViolationStatus.CHO_XU_LY,
  ViolationStatus.DA_XU_LY,
  ViolationStatus.DA_BAO_PH,
];

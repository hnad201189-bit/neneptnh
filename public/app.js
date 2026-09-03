(function () {
  "use strict";

  /* ================= AUTH / API ================= */
  let accessToken = null;
  let currentUser = null; // null = khách (chưa đăng nhập) | { id, email, fullName, isAdmin, permissions, group }

  function can(perm) {
    return Boolean(currentUser && (currentUser.isAdmin || (currentUser.permissions || []).includes(perm)));
  }

  async function apiFetch(path, opts, isRetry) {
    opts = opts || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (accessToken) headers.Authorization = "Bearer " + accessToken;
    const res = await fetch(path, Object.assign({ credentials: "include" }, opts, { headers }));

    if (res.status === 401 && !isRetry && path !== "/auth/login") {
      const refreshed = await tryRefresh();
      if (refreshed) return apiFetch(path, opts, true);
      // Không còn phiên hợp lệ — quay về trạng thái khách, KHÔNG che trang công khai.
      setLoggedOut();
      throw new Error("UNAUTHENTICATED");
    }
    if (!res.ok) {
      let message = "Có lỗi xảy ra (" + res.status + ")";
      try {
        const body = await res.json();
        if (body.message) message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
      } catch (e) {}
      throw new Error(message);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function tryRefresh() {
    try {
      const res = await fetch("/auth/refresh", { method: "POST", credentials: "include" });
      if (!res.ok) return false;
      const data = await res.json();
      accessToken = data.accessToken;
      currentUser = data.user;
      return true;
    } catch (e) {
      return false;
    }
  }

  function setLoggedOut() {
    accessToken = null;
    currentUser = null;
    state.audit = [];
    state.users = [];
    applyAuthUI();
  }

  /* ================= HELPERS ================= */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function fmtDate(d) {
    if (!d) return "";
    const datePart = String(d).slice(0, 10);
    const [y, m, dd] = datePart.split("-");
    return y && m && dd ? `${dd}/${m}/${y}` : datePart;
  }
  function fmtDateTime(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }
  const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const TRASH_SVG =
    '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2.6 3.8h8.8M5.4 3.8V2.6h3.2v1.2M3.6 3.8l.5 8a.8.8 0 0 0 .8.7h4.2a.8.8 0 0 0 .8-.7l.5-8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const SEV_LABEL = { nhe: "Nhẹ", tb: "Trung bình", nang: "Nặng" };
  const SEV_PILL = { nhe: "pill-warning", tb: "pill-serious", nang: "pill-critical" };
  const STATUS_LABEL = { cho_xu_ly: "Chờ xử lý", da_xu_ly: "Đã xử lý", da_bao_ph: "Đã báo phụ huynh" };
  const STATUS_PILL = { cho_xu_ly: "pill-neutral", da_xu_ly: "pill-info", da_bao_ph: "pill-serious" };
  const XL_LABEL = { tot: "Tốt", kha: "Khá", dat: "Đạt", chua_dat: "Chưa đạt" };
  const XL_PILL = { tot: "pill-good", kha: "pill-info", dat: "pill-warning", chua_dat: "pill-critical" };
  const XL_COLOR_VAR = { tot: "--status-good", kha: "--series-blue", dat: "--status-warning", chua_dat: "--status-critical" };

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function typeIcon(t) {
    return (t && t.icon) || "⚠️";
  }
  function typeLabel(t) {
    return t ? `${typeIcon(t)} ${esc(t.name)}` : "";
  }
  function groupName(student) {
    return (student && student.group && student.group.name) || "—";
  }

  const GROUP_COLOR_VAR = { "Tổ 1": "--to1", "Tổ 2": "--to2", "Tổ 3": "--to3", "Tổ 4": "--to4" };
  function initialsOf(fullName) {
    const parts = (fullName || "?").trim().split(/\s+/);
    return (parts[parts.length - 1][0] || "?").toUpperCase();
  }
  // Avatar tô màu theo Tổ để dễ nhận diện nhanh học sinh cùng tổ trong danh sách dài.
  function avatarHtml(fullName, group) {
    const colorVar = GROUP_COLOR_VAR[group] || "--text-muted";
    return `<span class="stu-avatar" style="background:${cssVar(colorVar)}">${esc(initialsOf(fullName))}</span>`;
  }
  // violationCount === 0 kéo theo điểm luôn = 100 (không có gì để trừ) — huy hiệu riêng cho tháng "sạch" hoàn toàn.
  function achievementBadge(c) {
    if (!c || c.violationCount !== 0) return "";
    return `<span class="stu-badge" title="Không vi phạm trong tháng này">🏅</span>`;
  }
  function scoreSpan(score) {
    return score === 100 ? `<span class="score-perfect">${score}</span>` : score;
  }

  /* ================= TOOLTIP ================= */
  const tip = $("#chart-tooltip");
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-tip]");
    if (t) {
      tip.textContent = t.getAttribute("data-tip");
      tip.style.opacity = 1;
    }
  });
  document.addEventListener("mousemove", (e) => {
    if (tip.style.opacity === "1") {
      tip.style.left = e.clientX + "px";
      tip.style.top = e.clientY - 10 + "px";
    }
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("[data-tip]")) tip.style.opacity = 0;
  });

  /* ================= CHART BUILDERS ================= */
  function hBarChart(data, opts) {
    opts = opts || {};
    const width = opts.width || 460,
      barH = 22,
      gap = 12,
      labelW = opts.labelW || 150,
      valueW = 54;
    const max = opts.max || Math.max(1, ...data.map((d) => d.value));
    const plotW = width - labelW - valueW;
    const rows = data
      .map((d, i) => {
        const y = i * (barH + gap);
        const w = Math.max(2, (d.value / max) * plotW);
        return `<g>
        <text x="${labelW - 8}" y="${y + barH / 2 + 4}" text-anchor="end" font-size="12.5" fill="${cssVar("--text-secondary")}">${esc(d.label)}</text>
        <rect class="viz-bar" data-tip="${esc(d.label)}: ${d.value}" x="${labelW}" y="${y}" width="${w}" height="${barH}" rx="4" fill="${d.color}"/>
        <text x="${labelW + w + 8}" y="${y + barH / 2 + 4}" font-size="12.5" font-weight="600" class="tabular" fill="${cssVar("--text-primary")}">${d.value}</text>
      </g>`;
      })
      .join("");
    const height = data.length * (barH + gap) - gap;
    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img">${rows}</svg>`;
  }

  function vStackChart(groups, segKeys, segMeta, opts) {
    opts = opts || {};
    const width = opts.width || 440,
      plotH = 150,
      colW = 54,
      gap = 30,
      top = 26;
    const totals = groups.map((g) => segKeys.reduce((s, k) => s + (g[k] || 0), 0));
    const max = Math.max(1, ...totals);
    const n = groups.length;
    const totalW = n * colW + (n - 1) * gap;
    const startX = (width - totalW) / 2;
    let bars = "";
    groups.forEach((g, i) => {
      const x = startX + i * (colW + gap);
      let yCursor = top + plotH;
      segKeys.forEach((k) => {
        const val = g[k] || 0;
        if (val <= 0) return;
        const h = Math.max(0, (val / max) * plotH - 2);
        yCursor -= h + 2;
        bars += `<rect class="viz-bar" data-tip="${esc(g.label)} · ${segMeta[k].label}: ${val}" x="${x}" y="${yCursor}" width="${colW}" height="${h}" rx="3" fill="${segMeta[k].color}"/>`;
      });
      const total = totals[i];
      bars += `<text x="${x + colW / 2}" y="${top + plotH - (total / max) * plotH - 8}" text-anchor="middle" font-size="12" font-weight="700" class="tabular" fill="${cssVar("--text-primary")}">${total}</text>`;
      bars += `<text x="${x + colW / 2}" y="${top + plotH + 18}" text-anchor="middle" font-size="12.5" fill="${cssVar("--text-secondary")}">${esc(g.label)}</text>`;
    });
    bars += `<line x1="${startX - 10}" y1="${top + plotH}" x2="${startX + totalW + 10}" y2="${top + plotH}" stroke="${cssVar("--line-strong")}" stroke-width="1"/>`;
    return `<svg viewBox="0 0 ${width} ${top + plotH + 30}" width="100%" height="${top + plotH + 30}" role="img">${bars}</svg>`;
  }

  function vBarChart(data, opts) {
    opts = opts || {};
    const width = opts.width || 440,
      plotH = 130,
      colW = 40,
      gap = opts.gap != null ? opts.gap : 16,
      top = 22;
    const max = Math.max(1, ...data.map((d) => d.value));
    const n = data.length;
    const totalW = n * colW + (n - 1) * gap;
    const startX = (width - totalW) / 2;
    let bars = "";
    data.forEach((d, i) => {
      const x = startX + i * (colW + gap);
      const h = Math.max(2, (d.value / max) * plotH);
      const y = top + plotH - h;
      bars += `<rect class="viz-bar" data-tip="${esc(d.label)}: ${d.value}" x="${x}" y="${y}" width="${colW}" height="${h}" rx="4" fill="${d.color || cssVar("--series-blue")}"/>`;
      bars += `<text x="${x + colW / 2}" y="${y - 6}" text-anchor="middle" font-size="11.5" font-weight="700" class="tabular" fill="${cssVar("--text-primary")}">${d.value}</text>`;
      bars += `<text x="${x + colW / 2}" y="${top + plotH + 18}" text-anchor="middle" font-size="11.5" fill="${cssVar("--text-secondary")}">${esc(d.label)}</text>`;
    });
    bars += `<line x1="${startX - 8}" y1="${top + plotH}" x2="${startX + totalW + 8}" y2="${top + plotH}" stroke="${cssVar("--line-strong")}" stroke-width="1"/>`;
    return `<svg viewBox="0 0 ${width} ${top + plotH + 30}" width="100%" height="${top + plotH + 30}" role="img">${bars}</svg>`;
  }

  /* ================= STATE ================= */
  const state = {
    students: [],
    violationTypes: [],
    meritTypes: [],
    violations: [],
    merits: [],
    conduct: [],
    conductMonth: null,
    audit: [],
    users: [],
    availablePermissions: [],
  };
  let expandedStudent = null;
  let studentAuditCache = {};

  function toList() {
    const names = new Set(state.students.map((s) => groupName(s)).filter((n) => n !== "—"));
    return Array.from(names).sort();
  }

  /* ================= THÁNG ================= */
  const SCHOOL_YEAR_START_MONTH = "2026-08"; // đầu năm học 2026-2027
  function ymNow() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function monthLabel(ym) {
    const [y, m] = ym.split("-");
    return `Tháng ${Number(m)}/${y}`;
  }
  function monthRange(fromYm, toYm) {
    const out = [];
    let [y, m] = fromYm.split("-").map(Number);
    const [ty, tm] = toYm.split("-").map(Number);
    while (y < ty || (y === ty && m <= tm)) {
      out.push(`${y}-${String(m).padStart(2, "0")}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return out;
  }
  function populateMonthSelect() {
    const sel = $("#month-select");
    const now = ymNow();
    const to = now > SCHOOL_YEAR_START_MONTH ? now : SCHOOL_YEAR_START_MONTH;
    const months = monthRange(SCHOOL_YEAR_START_MONTH, to).reverse(); // mới nhất trước
    sel.innerHTML = months.map((m) => `<option value="${m}" ${m === state.conductMonth ? "selected" : ""}>${monthLabel(m)}</option>`).join("");
  }

  // Điểm hạnh kiểm tính riêng theo tháng — 100 điểm khởi điểm mỗi tháng, không cộng dồn.
  async function loadConduct(month) {
    try {
      const data = await apiFetch(`/conduct/scores?month=${encodeURIComponent(month)}`);
      state.conduct = data.scores;
      state.conductMonth = data.month;
    } catch (e) {
      state.conduct = [];
    }
  }

  // Dữ liệu công khai — tải được ngay cả khi chưa đăng nhập.
  async function loadPublicData() {
    $("#load-error").textContent = "";
    try {
      const [students, violationTypes, meritTypes, violations, merits] = await Promise.all([
        apiFetch("/students"),
        apiFetch("/violation-types"),
        apiFetch("/merit-types"),
        apiFetch("/violations"),
        apiFetch("/merits"),
      ]);
      state.students = students;
      state.violationTypes = violationTypes;
      state.meritTypes = meritTypes;
      state.violations = violations;
      state.merits = merits;
      await loadConduct(state.conductMonth || ymNow());

      fillStudentSelect($("#v-student"));
      fillStudentSelect($("#m-student"));
      fillTypeSelect($("#v-type"));
      fillMeritTypeSelect($("#m-type"));
      updateViolationTypeOutput();
      updateMeritTypeOutput();
      fillGroupSelect($("#nu-group"));
      populateMonthSelect();
    } catch (e) {
      $("#load-error").textContent = "Không tải được dữ liệu: " + e.message;
    }
  }

  // Dữ liệu nội bộ — chỉ tải được khi đã đăng nhập.
  async function loadPrivateData() {
    if (!currentUser) return;
    try {
      state.audit = await apiFetch("/audit-logs");
    } catch (e) {
      state.audit = [];
    }
    if (currentUser.isAdmin) {
      try {
        state.users = await apiFetch("/users");
        if (!state.availablePermissions.length) {
          state.availablePermissions = await apiFetch("/users/permissions");
        }
      } catch (e) {
        state.users = [];
      }
    }
  }

  /* ================= AUTH UI ================= */
  function applyAuthUI() {
    document.body.classList.toggle("is-logged-in", Boolean(currentUser));
    document.body.classList.toggle("has-record_violations", can("record_violations"));
    document.body.classList.toggle("has-record_merits", can("record_merits"));
    document.body.classList.toggle("has-manage_catalog", can("manage_catalog"));

    $("#btn-login-open").hidden = Boolean(currentUser);
    $("#user-chip").hidden = !currentUser;
    $("#btn-logout").hidden = !currentUser;
    $("#nav-users-item").hidden = !(currentUser && currentUser.isAdmin);

    if (currentUser) {
      const initials = (currentUser.fullName || "?").trim().split(/\s+/).slice(-1)[0][0] || "?";
      $("#user-avatar").textContent = initials.toUpperCase();
      $("#user-name").textContent = currentUser.fullName;
      $("#user-role").textContent = currentUser.isAdmin
        ? "Quản trị viên"
        : (currentUser.permissions || []).length
          ? "Tài khoản nội bộ"
          : "Chưa được cấp quyền";
    }

    // Nếu đang xem trang chỉ dành cho người đăng nhập mà vừa đăng xuất, quay về Tổng quan.
    const current = $$(".nav-item").find((b) => b.classList.contains("active"));
    if (current && !currentUser && (current.dataset.view === "audit" || current.dataset.view === "users")) {
      switchView("dashboard");
    }
  }

  /* ================= RENDER: DASHBOARD ================= */
  function renderDashboard() {
    const total = state.students.length;
    const month = state.conductMonth || ymNow();
    const inMonth = (d) => d.startsWith(month);
    const violInMonth = state.violations.filter((v) => inMonth(v.occurredAt)).length;
    const meritInMonth = state.merits.filter((m) => inMonth(m.occurredAt)).length;
    const attention = state.conduct.filter((c) => c.score < 70);

    $("#view-sub").textContent = `Lớp 11B10 · ${monthLabel(month)} · Mỗi học sinh 100 điểm/tháng`;
    $("#badge-total-count").textContent = `${total} học sinh`;
    $("#stat-grid").innerHTML = `
      <div class="card stat-tile"><div class="label">Tổng học sinh</div><div class="value tabular">${total}</div><div class="delta delta-flat">Lớp 11B10</div></div>
      <div class="card stat-tile"><div class="label">Vi phạm trong tháng</div><div class="value tabular">${violInMonth}</div><div class="delta delta-up">↑ cần giám sát sát sao</div></div>
      <div class="card stat-tile"><div class="label">Khen thưởng trong tháng</div><div class="value tabular">${meritInMonth}</div><div class="delta delta-down">↑ ghi nhận tích cực</div></div>
      <div class="card stat-tile"><div class="label">Học sinh cần lưu ý</div><div class="value tabular">${attention.length}</div><div class="delta ${attention.length ? "delta-up" : "delta-flat"}">điểm hạnh kiểm dưới 70 (${monthLabel(month)})</div></div>`;

    const counts = { tot: 0, kha: 0, dat: 0, chua_dat: 0 };
    state.conduct.forEach((c) => counts[c.classification]++);
    const xlData = ["tot", "kha", "dat", "chua_dat"].map((k) => ({ label: XL_LABEL[k], value: counts[k], color: cssVar(XL_COLOR_VAR[k]) }));
    $("#chart-xeploai").innerHTML = state.students.length ? hBarChart(xlData, { width: 440, labelW: 90 }) : `<div class="empty-note">Chưa có dữ liệu.</div>`;

    const typeCounts = {};
    state.violations.forEach((v) => {
      typeCounts[v.typeId] = (typeCounts[v.typeId] || 0) + 1;
    });
    const topLoi = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const t = state.violationTypes.find((x) => x.id === id);
        return { label: `${typeIcon(t)} ${t ? t.name : id}`, value: count, color: cssVar("--series-blue") };
      });
    $("#chart-top-loi").innerHTML = topLoi.length ? hBarChart(topLoi, { width: 420, labelW: 190 }) : `<div class="empty-note">Chưa có vi phạm nào.</div>`;

    const recent = [...state.violations].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 6);
    $("#table-recent-violations").innerHTML = `
      <thead><tr><th>Học sinh</th><th>Tổ</th><th>Lỗi</th><th>Mức độ</th><th>Ngày</th></tr></thead>
      <tbody>${
        recent
          .map(
            (v) =>
              `<tr><td class="cell-name">${esc(v.student.fullName)}</td><td class="cell-muted">${groupName(v.student)}</td><td>${typeLabel(v.type)}</td><td><span class="pill ${SEV_PILL[v.type.severity]}">${SEV_LABEL[v.type.severity]}</span></td><td class="tabular cell-muted">${fmtDate(v.occurredAt)}</td></tr>`,
          )
          .join("") || `<tr><td colspan="5" class="empty-note">Chưa có vi phạm nào.</td></tr>`
      }</tbody>`;

    $("#attn-list").innerHTML = attention.length
      ? attention
          .sort((a, b) => a.score - b.score)
          .map(
            (x) => `
      <div class="attn-row">
        <div style="display:flex;align-items:center;gap:8px;">${avatarHtml(x.student.fullName, x.student.group)}<div><div class="attn-name">${esc(x.student.fullName)}</div><div class="attn-class">${x.student.group || "—"} · ${x.violationCount} lượt vi phạm</div></div></div>
        <div style="text-align:right;"><div class="attn-score tabular" style="color:${cssVar(XL_COLOR_VAR[x.classification])}">${x.score}</div><span class="pill ${XL_PILL[x.classification]}">${XL_LABEL[x.classification]}</span></div>
      </div>`,
          )
          .join("")
      : `<div class="empty-note">Không có học sinh nào cần lưu ý.</div>`;
  }

  /* ================= RENDER: STUDENTS ================= */
  function scoreForStudent(id) {
    return state.conduct.find((c) => c.student.id === id);
  }
  function renderStudentFilters() {
    $("#filter-student-to").innerHTML = `<option value="">Tất cả tổ</option>` + toList().map((c) => `<option value="${c}">${c}</option>`).join("");
  }
  function renderStudents() {
    const toFilter = $("#filter-student-to").value;
    const search = ($("#filter-student-search").value || "").toLowerCase();
    const rows = state.students.filter((s) => (!toFilter || groupName(s) === toFilter) && s.fullName.toLowerCase().includes(search));
    const body = rows
      .map((s) => {
        const c = scoreForStudent(s.id) || { score: 100, classification: "tot", violationCount: 0 };
        const detail = expandedStudent === s.id ? renderStudentDetail(s, c) : "";
        return `<tr class="clickable" data-student="${s.id}">
          <td class="cell-name"><div class="name-cell">${avatarHtml(s.fullName, groupName(s))}<span>${esc(s.fullName)}</span>${achievementBadge(c)}</div></td><td class="cell-muted">${groupName(s)}</td>
          <td class="tabular" style="font-weight:700;color:${cssVar(XL_COLOR_VAR[c.classification])}">${scoreSpan(c.score)}</td>
          <td><span class="pill ${XL_PILL[c.classification]}">${XL_LABEL[c.classification]}</span></td>
          <td class="tabular cell-muted">${c.violationCount}</td>
        </tr>${detail ? `<tr class="accordion-row"><td colspan="5">${detail}</td></tr>` : ""}`;
      })
      .join("");
    $("#table-students").innerHTML = `
      <thead><tr><th>Họ và tên</th><th>Tổ</th><th>Điểm HK</th><th>Xếp loại</th><th>Số lỗi</th></tr></thead>
      <tbody>${body || `<tr><td colspan="5" class="empty-note">Không tìm thấy học sinh phù hợp.</td></tr>`}</tbody>`;
  }
  function renderStudentDetail(s, c) {
    const vios = state.violations.filter((v) => v.studentId === s.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    const merits = state.merits.filter((m) => m.studentId === s.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    const auditColumn = currentUser
      ? `<div><div style="font-weight:600;font-size:.82rem;margin-bottom:6px;">Lịch sử chỉnh sửa</div>
          <ul class="mini-list" id="student-audit-${s.id}">${studentAuditCache[s.id] ? renderAuditMiniList(studentAuditCache[s.id]) : `<li class="empty-note">Đang tải…</li>`}</ul></div>`
      : `<div><div style="font-weight:600;font-size:.82rem;margin-bottom:6px;">Lịch sử chỉnh sửa</div>
          <div class="empty-note">Đăng nhập nội bộ để xem</div></div>`;
    return `<div class="accordion-body">
      <div class="card-desc tabular">100 − ${c.deduction} (vi phạm) + ${c.bonus} (khen thưởng, tối đa 10) = <strong>${c.score} điểm</strong></div>
      <div class="accordion-grid">
        <div><div style="font-weight:600;font-size:.82rem;margin-bottom:6px;">Lịch sử vi phạm</div>
          <ul class="mini-list">${vios.length ? vios.map((v) => `<li><span>${typeLabel(v.type)}</span><span class="cell-muted tabular">${fmtDate(v.occurredAt)}</span></li>`).join("") : `<li class="empty-note">Chưa có vi phạm</li>`}</ul></div>
        <div><div style="font-weight:600;font-size:.82rem;margin-bottom:6px;">Khen thưởng</div>
          <ul class="mini-list">${merits.length ? merits.map((m) => `<li><span>${esc(m.type.name)}</span><span class="cell-muted tabular">${fmtDate(m.occurredAt)}</span></li>`).join("") : `<li class="empty-note">Chưa có khen thưởng</li>`}</ul></div>
        ${auditColumn}
      </div>
    </div>`;
  }
  function renderAuditMiniList(list) {
    if (!list.length) return `<li class="empty-note">Chưa có thao tác</li>`;
    return list.map((a) => `<li><span>${esc(a.action)} — <span class="cell-muted">${esc(a.actor ? a.actor.fullName : "")}</span></span><span class="cell-muted tabular">${fmtDate(a.at)}</span></li>`).join("");
  }
  async function ensureStudentAudit(studentId) {
    if (!currentUser || studentAuditCache[studentId]) return;
    try {
      const list = await apiFetch(`/audit-logs/student/${encodeURIComponent(studentId)}`);
      studentAuditCache[studentId] = list;
      const el = $(`#student-audit-${studentId}`);
      if (el) el.innerHTML = renderAuditMiniList(list);
    } catch (e) {
      studentAuditCache[studentId] = [];
    }
  }

  /* ================= FORM SELECTS ================= */
  function fillStudentSelect(sel) {
    sel.innerHTML = state.students.map((s) => `<option value="${s.id}">${esc(s.fullName)} — ${groupName(s)}</option>`).join("");
  }
  function fillTypeSelect(sel) {
    sel.innerHTML = state.violationTypes.map((t) => `<option value="${t.id}">${typeIcon(t)} ${esc(t.name)}</option>`).join("");
  }
  function fillMeritTypeSelect(sel) {
    sel.innerHTML = state.meritTypes.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
  }
  function fillGroupSelect(sel) {
    if (!sel) return;
    sel.innerHTML = `<option value="">Không giới hạn — cả lớp</option>` + toList().map((g) => `<option value="${g}">${g}</option>`).join("");
  }
  function updateViolationTypeOutput() {
    const t = state.violationTypes.find((x) => x.id === $("#v-type").value);
    if (!t) return;
    $("#v-severity-out").innerHTML = `<span class="pill ${SEV_PILL[t.severity]}">${SEV_LABEL[t.severity]}</span>`;
    $("#v-points-out").textContent = "−" + t.points + " điểm";
  }
  function updateMeritTypeOutput() {
    const t = state.meritTypes.find((x) => x.id === $("#m-type").value);
    if (!t) return;
    $("#m-points-out").textContent = "+" + t.points + " điểm";
  }

  /* ================= RENDER: VIOLATIONS ================= */
  function renderViolationFilters() {
    $("#filter-v-to").innerHTML = `<option value="">Tất cả tổ</option>` + toList().map((c) => `<option value="${c}">${c}</option>`).join("");
  }
  function renderViolations() {
    const toF = $("#filter-v-to").value,
      sevF = $("#filter-v-severity").value,
      stF = $("#filter-v-status").value;
    let rows = [...state.violations].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    rows = rows.filter((v) => (!toF || groupName(v.student) === toF) && (!sevF || v.type.severity === sevF) && (!stF || v.status === stF));
    $("#violation-count-meta").textContent = rows.length + " lượt ghi nhận";
    const canAdvance = can("manage_status");
    $("#table-violations").innerHTML = `
      <thead><tr><th>Học sinh</th><th>Tổ</th><th>Lỗi</th><th>Mức độ</th><th>Điểm trừ</th><th>Ngày</th><th>Người ghi nhận</th><th>Trạng thái</th></tr></thead>
      <tbody>${
        rows
          .map(
            (v) => `<tr>
          <td class="cell-name">${esc(v.student.fullName)}</td><td class="cell-muted">${groupName(v.student)}</td>
          <td>${typeLabel(v.type)}${v.note ? `<div class="cell-muted" style="font-size:.76rem;">${esc(v.note)}</div>` : ""}</td>
          <td><span class="pill ${SEV_PILL[v.type.severity]}">${SEV_LABEL[v.type.severity]}</span></td>
          <td class="tabular cell-muted">−${v.type.points}</td>
          <td class="tabular cell-muted">${fmtDate(v.occurredAt)}</td>
          <td class="cell-muted">${esc(v.recordedBy ? v.recordedBy.fullName : "")}</td>
          <td>${
            canAdvance && v.status !== "da_bao_ph"
              ? `<button class="pill ${STATUS_PILL[v.status]} pill-clickable" data-tip="Nhấp để chuyển trạng thái xử lý" data-advance="${v.id}">${STATUS_LABEL[v.status]}</button>`
              : `<span class="pill ${STATUS_PILL[v.status]}">${STATUS_LABEL[v.status]}</span>`
          }</td>
        </tr>`,
          )
          .join("") || `<tr><td colspan="8" class="empty-note">Chưa có vi phạm nào phù hợp bộ lọc.</td></tr>`
      }</tbody>`;
  }

  /* ================= RENDER: MERITS ================= */
  function renderMerits() {
    const rows = [...state.merits].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    $("#merit-count-meta").textContent = rows.length + " lượt ghi nhận";
    $("#table-merits").innerHTML = `
      <thead><tr><th>Học sinh</th><th>Tổ</th><th>Hình thức</th><th>Điểm cộng</th><th>Ngày</th></tr></thead>
      <tbody>${
        rows
          .map(
            (m) =>
              `<tr><td class="cell-name">${esc(m.student.fullName)}</td><td class="cell-muted">${groupName(m.student)}</td><td>${esc(m.type.name)}${m.note ? `<div class="cell-muted" style="font-size:.76rem;">${esc(m.note)}</div>` : ""}</td><td class="tabular" style="color:${cssVar("--status-good")};font-weight:700;">+${m.type.points}</td><td class="tabular cell-muted">${fmtDate(m.occurredAt)}</td></tr>`,
          )
          .join("") || `<tr><td colspan="5" class="empty-note">Chưa có khen thưởng nào.</td></tr>`
      }</tbody>`;
  }

  /* ================= RENDER: CONDUCT ================= */
  let conductSort = { key: "score", dir: -1 };
  function renderConduct() {
    const toF = $("#filter-c-to").value,
      xlF = $("#filter-c-xeploai").value;
    let rows = state.conduct.filter((r) => (!toF || r.student.group === toF) && (!xlF || r.classification === xlF));
    rows.sort((a, b) => (conductSort.key === "score" ? (a.score - b.score) * conductSort.dir : a.student.fullName.localeCompare(b.student.fullName) * conductSort.dir));
    $("#table-conduct").innerHTML = `
      <thead><tr><th>Học sinh</th><th>Tổ</th><th class="sortable" data-sort="score">Điểm HK ${conductSort.key === "score" ? (conductSort.dir < 0 ? "↓" : "↑") : ""}</th><th>Xếp loại</th><th>Vi phạm</th><th>Khen thưởng</th></tr></thead>
      <tbody>${
        rows
          .map(
            (r) => `<tr><td class="cell-name"><div class="name-cell">${avatarHtml(r.student.fullName, r.student.group)}<span>${esc(r.student.fullName)}</span>${achievementBadge(r)}</div></td><td class="cell-muted">${r.student.group || "—"}</td>
        <td class="tabular" style="font-weight:700;color:${cssVar(XL_COLOR_VAR[r.classification])}">${scoreSpan(r.score)}</td>
        <td><span class="pill ${XL_PILL[r.classification]}">${XL_LABEL[r.classification]}</span></td>
        <td class="tabular cell-muted">${r.violationCount}</td><td class="tabular cell-muted">${r.meritCount}</td></tr>`,
          )
          .join("") || `<tr><td colspan="6" class="empty-note">Không có học sinh phù hợp.</td></tr>`
      }</tbody>`;
  }

  /* ================= RENDER: CATALOG ================= */
  function renderCatalog() {
    $("#catalog-count-meta").textContent = state.violationTypes.length + " loại lỗi";
    $("#table-catalog").innerHTML = `
      <thead><tr><th>Tên lỗi</th><th>Mức độ</th><th>Điểm trừ</th><th></th></tr></thead>
      <tbody>${state.violationTypes
        .map(
          (t) => `
        <tr><td class="cell-name"><span class="loi-name"><span class="loi-icon">${typeIcon(t)}</span>${esc(t.name)}</span></td><td><span class="pill ${SEV_PILL[t.severity]}">${SEV_LABEL[t.severity]}</span></td>
        <td class="tabular cell-muted">−${t.points}</td>
        <td><button class="btn-icon btn-icon-del perm-manage_catalog" data-tip="Xoá lỗi này khỏi danh mục" aria-label="Xoá" data-del-catalog="${t.id}">${TRASH_SVG}</button></td></tr>`,
        )
        .join("")}</tbody>`;
  }

  /* ================= RENDER: AUDIT ================= */
  function renderAudit() {
    const actors = [...new Set(state.audit.map((a) => (a.actor ? a.actor.fullName : "")))];
    const actorF = $("#filter-audit-actor").value;
    $("#filter-audit-actor").innerHTML = `<option value="">Tất cả người thực hiện</option>` + actors.map((a) => `<option value="${esc(a)}" ${a === actorF ? "selected" : ""}>${esc(a)}</option>`).join("");
    const rows = state.audit.filter((a) => !actorF || (a.actor && a.actor.fullName) === actorF);
    $("#audit-count-meta").textContent = rows.length + " thao tác";
    $("#table-audit").innerHTML = `
      <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Nội dung</th></tr></thead>
      <tbody>${
        rows
          .map((a) => `<tr><td class="tabular cell-muted">${fmtDateTime(a.at)}</td><td class="cell-name">${esc(a.actor ? a.actor.fullName : "")}</td><td><span class="pill pill-neutral">${esc(a.action)}</span></td><td>${esc(a.detail)}</td></tr>`)
          .join("") || `<tr><td colspan="4" class="empty-note">Chưa có thao tác nào.</td></tr>`
      }</tbody>`;
  }

  /* ================= RENDER: USERS (Quản lý tài khoản) ================= */
  const PERM_LABEL_FALLBACK = {
    record_violations: "Ghi nhận vi phạm",
    record_merits: "Ghi nhận khen thưởng",
    manage_status: "Xử lý trạng thái vi phạm",
    manage_catalog: "Sửa danh mục lỗi / khen thưởng",
  };
  function permLabel(key) {
    const found = state.availablePermissions.find((p) => p.key === key);
    return found ? found.label : PERM_LABEL_FALLBACK[key] || key;
  }
  function renderUsersPermissionCheckboxes() {
    const list = state.availablePermissions.length
      ? state.availablePermissions
      : Object.keys(PERM_LABEL_FALLBACK).map((key) => ({ key, label: PERM_LABEL_FALLBACK[key] }));
    $("#nu-permissions").innerHTML = list
      .map(
        (p) => `<label style="display:flex; align-items:center; gap:6px; font-size:.85rem; font-weight:500;">
        <input type="checkbox" value="${p.key}" class="nu-perm-checkbox"> ${esc(p.label)}</label>`,
      )
      .join("");
  }
  function renderUsers() {
    if (!currentUser || !currentUser.isAdmin) return;
    $("#table-users").innerHTML = `
      <thead><tr><th>Email</th><th>Họ tên</th><th>Quyền</th><th>Tổ</th><th>Trạng thái</th></tr></thead>
      <tbody>${state.users
        .map((u) => {
          if (u.isAdmin) {
            return `<tr><td class="cell-name">${esc(u.email)}</td><td>${esc(u.fullName)}</td><td><span class="pill pill-info">Toàn quyền (Admin)</span></td><td class="cell-muted">—</td><td><span class="pill pill-good">Đang hoạt động</span></td></tr>`;
          }
          const permsHtml = (u.permissions || []).length
            ? u.permissions.map((p) => `<span class="pill pill-neutral" style="margin:1px;">${esc(permLabel(p))}</span>`).join("")
            : `<span class="cell-muted">Chưa có quyền nào</span>`;
          const statusPill =
            u.status === "active"
              ? `<button class="pill pill-good pill-clickable" data-tip="Nhấp để khoá tài khoản" data-toggle-user="${u.id}" data-next="locked">Đang hoạt động</button>`
              : `<button class="pill pill-critical pill-clickable" data-tip="Nhấp để mở khoá" data-toggle-user="${u.id}" data-next="active">Đã khoá</button>`;
          return `<tr><td class="cell-name">${esc(u.email)}</td><td>${esc(u.fullName)}</td><td>${permsHtml}</td><td class="cell-muted">${u.group ? esc(u.group.name) : "Cả lớp"}</td><td>${statusPill}</td></tr>`;
        })
        .join("")}</tbody>`;
  }

  function renderAll() {
    renderDashboard();
    renderStudentFilters();
    renderStudents();
    renderViolationFilters();
    renderViolations();
    renderMerits();
    $("#filter-c-to").innerHTML = `<option value="">Tất cả tổ</option>` + toList().map((c) => `<option value="${c}">${c}</option>`).join("");
    renderConduct();
    renderCatalog();
    if (currentUser) renderAudit();
    if (currentUser && currentUser.isAdmin) renderUsers();
    renderReports();
  }

  /* ================= RENDER: REPORTS ================= */
  function renderReports() {
    const segMeta = { nhe: { label: "Nhẹ", color: cssVar("--status-warning") }, tb: { label: "Trung bình", color: cssVar("--status-serious") }, nang: { label: "Nặng", color: cssVar("--status-critical") } };
    const groups = toList().map((to) => {
      const g = { label: to, nhe: 0, tb: 0, nang: 0 };
      state.violations.forEach((v) => {
        if (groupName(v.student) !== to) return;
        g[v.type.severity]++;
      });
      return g;
    });
    $("#chart-by-to").innerHTML = groups.length ? vStackChart(groups, ["nhe", "tb", "nang"], segMeta, { width: 420 }) : `<div class="empty-note">Chưa có dữ liệu.</div>`;
    $("#legend-by-to").innerHTML = ["nhe", "tb", "nang"].map((k) => `<span class="legend-item"><span class="legend-dot" style="background:${segMeta[k].color}"></span>${segMeta[k].label}</span>`).join("");

    const wdCounts = [0, 0, 0, 0, 0, 0];
    state.violations.forEach((v) => {
      const day = new Date(v.occurredAt + "T00:00:00").getDay();
      if (day >= 1 && day <= 6) wdCounts[day - 1]++;
    });
    $("#chart-by-weekday").innerHTML = vBarChart(
      wdCounts.map((v, i) => ({ label: WEEKDAYS[i + 1], value: v })),
      { width: 420 },
    );

    const compRows = toList()
      .map((to) => {
        const rows = state.conduct.filter((r) => r.student.group === to);
        const violCount = rows.reduce((a, r) => a + r.violationCount, 0);
        const meritCount = rows.reduce((a, r) => a + r.meritCount, 0);
        const avg = rows.length ? rows.reduce((a, r) => a + r.score, 0) / rows.length : 0;
        return { to, size: rows.length, violCount, meritCount, avg };
      })
      .sort((a, b) => b.avg - a.avg);
    $("#table-competition").innerHTML = `
      <thead><tr><th>Hạng</th><th>Tổ</th><th>Sĩ số</th><th>Tổng vi phạm</th><th>Tổng khen thưởng</th><th>Điểm HK trung bình</th></tr></thead>
      <tbody>${compRows
        .map(
          (r, i) =>
            `<tr><td><span class="rank-medal ${i < 3 ? "rank-" + (i + 1) : ""}">${i + 1}</span></td><td class="cell-name">${r.to}</td><td class="tabular cell-muted">${r.size}</td><td class="tabular cell-muted">${r.violCount}</td><td class="tabular cell-muted">${r.meritCount}</td><td class="tabular" style="font-weight:700;">${r.avg.toFixed(1)}</td></tr>`,
        )
        .join("")}</tbody>`;
  }

  /* ================= FORMS / ACTIONS ================= */
  function initForms() {
    $("#cat-icon").innerHTML = ["⏰", "👕", "💬", "🗑️", "📓", "📱", "🪖", "🗯️", "🥊", "🎭", "🚬", "🎮", "✋", "⚠️"].map((ic) => `<option value="${ic}">${ic}</option>`).join("");
    const today = new Date().toISOString().slice(0, 10);
    $("#v-date").value = today;
    $("#m-date").value = today;
    renderUsersPermissionCheckboxes();

    $("#v-type").addEventListener("change", updateViolationTypeOutput);
    $("#m-type").addEventListener("change", updateMeritTypeOutput);

    // ---- Chọn tháng xem hạnh kiểm (100 điểm khởi điểm mỗi tháng) ----
    $("#month-select").addEventListener("change", async (e) => {
      await loadConduct(e.target.value);
      renderDashboard();
      renderConduct();
      renderReports();
    });

    // ---- Đăng nhập / đăng xuất ----
    $("#btn-login-open").addEventListener("click", () => {
      $("#login-error").textContent = "";
      $("#login-modal").hidden = false;
      $("#login-email").focus();
    });
    $("#login-modal-close").addEventListener("click", () => {
      $("#login-modal").hidden = true;
    });
    $("#login-modal").addEventListener("click", (e) => {
      if (e.target.id === "login-modal") $("#login-modal").hidden = true;
    });
    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#login-submit");
      const err = $("#login-error");
      err.textContent = "";
      btn.disabled = true;
      btn.textContent = "Đang đăng nhập…";
      try {
        const res = await fetch("/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: $("#login-email").value.trim(), password: $("#login-password").value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");
        accessToken = data.accessToken;
        currentUser = data.user;
        $("#login-modal").hidden = true;
        $("#login-email").value = "";
        $("#login-password").value = "";
        applyAuthUI();
        await loadPrivateData();
        renderAll();
      } catch (e2) {
        err.textContent = e2.message;
      } finally {
        btn.disabled = false;
        btn.textContent = "Đăng nhập";
      }
    });
    $("#btn-logout").addEventListener("click", async () => {
      try {
        await apiFetch("/auth/logout", { method: "POST" });
      } catch (e) {}
      setLoggedOut();
      renderAll();
    });

    // ---- Ghi nhận vi phạm / khen thưởng ----
    $("#btn-save-violation").addEventListener("click", async () => {
      const err = $("#v-error");
      err.textContent = "";
      const studentId = $("#v-student").value,
        typeId = $("#v-type").value,
        occurredAt = $("#v-date").value;
      if (!studentId || !typeId || !occurredAt) return;
      try {
        await apiFetch("/violations", { method: "POST", body: JSON.stringify({ studentId, typeId, occurredAt, note: $("#v-note").value.trim() || undefined }) });
        $("#v-note").value = "";
        await loadPublicData();
        renderAll();
      } catch (e) {
        err.textContent = e.message;
      }
    });

    $("#btn-save-merit").addEventListener("click", async () => {
      const err = $("#m-error");
      err.textContent = "";
      const studentId = $("#m-student").value,
        typeId = $("#m-type").value,
        occurredAt = $("#m-date").value;
      if (!studentId || !typeId || !occurredAt) return;
      try {
        await apiFetch("/merits", { method: "POST", body: JSON.stringify({ studentId, typeId, occurredAt, note: $("#m-note").value.trim() || undefined }) });
        $("#m-note").value = "";
        await loadPublicData();
        renderAll();
      } catch (e) {
        err.textContent = e.message;
      }
    });

    // ---- Danh mục lỗi ----
    $("#btn-toggle-add-catalog").addEventListener("click", () => {
      const p = $("#panel-add-catalog");
      p.hidden = !p.hidden;
      if (!p.hidden) $("#cat-name").focus();
    });
    $("#btn-cancel-catalog").addEventListener("click", () => {
      $("#panel-add-catalog").hidden = true;
    });
    $("#btn-add-catalog").addEventListener("click", async () => {
      const name = $("#cat-name").value.trim();
      if (!name) {
        $("#cat-name").focus();
        return;
      }
      try {
        await apiFetch("/violation-types", {
          method: "POST",
          body: JSON.stringify({ name, severity: $("#cat-severity").value, points: Number($("#cat-points").value) || 2, icon: $("#cat-icon").value }),
        });
        $("#cat-name").value = "";
        $("#panel-add-catalog").hidden = true;
        await loadPublicData();
        renderAll();
      } catch (e) {
        alert("Không thêm được: " + e.message);
      }
    });

    // ---- Quản lý tài khoản ----
    $("#btn-toggle-add-user").addEventListener("click", () => {
      const p = $("#panel-add-user");
      p.hidden = !p.hidden;
      if (!p.hidden) $("#nu-email").focus();
    });
    $("#btn-cancel-user").addEventListener("click", () => {
      $("#panel-add-user").hidden = true;
    });
    $("#btn-save-user").addEventListener("click", async () => {
      const err = $("#user-error");
      err.textContent = "";
      const email = $("#nu-email").value.trim();
      const fullName = $("#nu-name").value.trim();
      const password = $("#nu-password").value;
      const groupId = $("#nu-group").value || undefined;
      const permissions = $$(".nu-perm-checkbox")
        .filter((c) => c.checked)
        .map((c) => c.value);
      if (!email || !fullName || password.length < 6) {
        err.textContent = "Điền đủ email, họ tên, và mật khẩu tối thiểu 6 ký tự.";
        return;
      }
      try {
        await apiFetch("/users", { method: "POST", body: JSON.stringify({ email, fullName, password, permissions, groupId }) });
        $("#nu-email").value = "";
        $("#nu-name").value = "";
        $("#nu-password").value = "";
        $$(".nu-perm-checkbox").forEach((c) => (c.checked = false));
        $("#panel-add-user").hidden = true;
        await loadPrivateData();
        renderUsers();
      } catch (e) {
        err.textContent = e.message;
      }
    });

    // ---- Bộ lọc ----
    [
      ["#filter-student-to", "change", renderStudents],
      ["#filter-student-search", "input", renderStudents],
      ["#filter-v-to", "change", renderViolations],
      ["#filter-v-severity", "change", renderViolations],
      ["#filter-v-status", "change", renderViolations],
      ["#filter-c-to", "change", renderConduct],
      ["#filter-c-xeploai", "change", renderConduct],
      ["#filter-audit-actor", "change", renderAudit],
    ].forEach(([sel, ev, fn]) => $(sel).addEventListener(ev, fn));

    $("#btn-quick-violation").addEventListener("click", () => switchView("violations"));
    $("#global-search").addEventListener("input", (e) => {
      switchView("students");
      $("#filter-student-search").value = e.target.value;
      renderStudents();
    });

    document.addEventListener("click", async (e) => {
      const goto = e.target.closest("[data-goto]");
      if (goto) {
        e.preventDefault();
        switchView(goto.getAttribute("data-goto"));
      }

      const adv = e.target.closest("[data-advance]");
      if (adv) {
        adv.disabled = true;
        try {
          await apiFetch(`/violations/${adv.getAttribute("data-advance")}/status`, { method: "PATCH" });
          await loadPublicData();
          renderAll();
        } catch (err) {
          alert("Không cập nhật được: " + err.message);
        }
      }

      const del = e.target.closest("[data-del-catalog]");
      if (del) {
        if (!confirm("Xoá lỗi này khỏi danh mục?")) return;
        try {
          await apiFetch(`/violation-types/${del.getAttribute("data-del-catalog")}`, { method: "DELETE" });
          await loadPublicData();
          renderAll();
        } catch (err) {
          alert("Không xoá được: " + err.message);
        }
      }

      const toggleUser = e.target.closest("[data-toggle-user]");
      if (toggleUser) {
        const next = toggleUser.getAttribute("data-next");
        const label = next === "locked" ? "khoá" : "mở khoá";
        if (!confirm(`Xác nhận ${label} tài khoản này?`)) return;
        try {
          await apiFetch(`/users/${toggleUser.getAttribute("data-toggle-user")}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
          await loadPrivateData();
          renderUsers();
        } catch (err) {
          alert("Không cập nhật được: " + err.message);
        }
      }

      const tr = e.target.closest("tr[data-student]");
      if (tr && !e.target.closest("button")) {
        const id = tr.getAttribute("data-student");
        expandedStudent = expandedStudent === id ? null : id;
        renderStudents();
        if (expandedStudent) ensureStudentAudit(expandedStudent);
      }
    });

    $("#table-conduct").addEventListener("click", (e) => {
      const th = e.target.closest("th[data-sort]");
      if (!th) return;
      conductSort.dir = conductSort.key === th.dataset.sort ? -conductSort.dir : -1;
      conductSort.key = th.dataset.sort;
      renderConduct();
    });
  }

  const VIEW_META = {
    dashboard: { title: "Tổng quan nề nếp", sub: "Lớp 11B10 · Từ đầu năm học 2026 – 2027" },
    students: { title: "Học sinh", sub: "Danh sách và hồ sơ rèn luyện từng học sinh" },
    violations: { title: "Vi phạm", sub: "Ghi nhận và theo dõi xử lý vi phạm nề nếp" },
    merits: { title: "Khen thưởng", sub: "Ghi nhận hành vi tích cực, cộng điểm rèn luyện" },
    conduct: { title: "Hạnh kiểm", sub: "Xếp loại rèn luyện theo điểm tích lũy" },
    catalog: { title: "Danh mục lỗi vi phạm", sub: "Chuẩn hoá tên lỗi, mức độ và điểm trừ áp dụng toàn lớp" },
    audit: { title: "Lịch sử chỉnh sửa", sub: "Nhật ký ghi nhận và chỉnh sửa dữ liệu nề nếp" },
    reports: { title: "Báo cáo", sub: "Thống kê và thi đua giữa các tổ" },
    users: { title: "Quản lý tài khoản", sub: "Chỉ Quản trị viên — tạo tài khoản và cấp quyền cho người khác" },
  };
  function switchView(view) {
    $$(".view").forEach((v) => (v.hidden = v.id !== "view-" + view));
    $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    $("#view-title").textContent = VIEW_META[view].title;
    // Tổng quan có phụ đề động theo tháng đang chọn — renderDashboard() tự cập nhật;
    // các trang khác dùng phụ đề tĩnh.
    if (view !== "dashboard") $("#view-sub").textContent = VIEW_META[view].sub;
    else if (state.conductMonth) $("#view-sub").textContent = `Lớp 11B10 · ${monthLabel(state.conductMonth)} · Mỗi học sinh 100 điểm/tháng`;
  }
  $$(".nav-item[data-view]").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));

  /* ================= BOOT ================= */
  // Trang công khai: hiện dữ liệu ngay, không chờ/đòi đăng nhập. Đăng nhập là tuỳ chọn,
  // chỉ cần cho Quản trị viên và tài khoản được cấp quyền ghi/sửa dữ liệu.
  (async function boot() {
    initForms();
    applyAuthUI();
    await loadPublicData();
    renderAll();
    switchView("dashboard");

    const loggedIn = await tryRefresh();
    if (loggedIn) {
      applyAuthUI();
      await loadPrivateData();
      renderAll();
    }
  })();
})();

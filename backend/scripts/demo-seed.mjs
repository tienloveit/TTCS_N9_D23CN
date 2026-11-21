#!/usr/bin/env node
/**
 * Bổ sung dữ liệu mẫu cho database demo MoviePTIT mà KHÔNG xóa dữ liệu có sẵn.
 *
 * - Danh mục, tài khoản, phòng, bắp nước, khuyến mãi, suất chiếu, đánh giá, yêu cầu/duyệt hoàn tiền,
 *   đơn chờ thanh toán: đi qua REST API để backend tự kiểm tra nghiệp vụ, sinh vé, thông báo, nhật ký.
 * - Đơn ĐÃ THANH TOÁN (lịch sử và vé bán trước): ghi trực tiếp bằng SQL. Thanh toán qua API sẽ phát
 *   BookingPaidEvent và gửi email vé thật qua SMTP, nên không dùng API cho phần này.
 *
 * Yêu cầu: backend đang chạy (mặc định http://localhost:8081/api), MySQL client có sẵn,
 * mật khẩu DB trong backend/.env (SPRING_DATASOURCE_PASSWORD). Chỉ chạy trên database demo,
 * sao lưu trước khi chạy.
 *
 *   node scripts/demo-seed.mjs --yes-demo-db            # chạy tất cả bước còn thiếu
 *   MYSQL_BIN="C:/.../mysql.exe" API_BASE=http://localhost:8081/api node scripts/demo-seed.mjs --yes-demo-db
 *
 * Thiếu cờ --yes-demo-db (hoặc DEMO_SEED_CONFIRM=1) thì script chỉ in đích kết nối rồi dừng.
 *
 * Mỗi bước kiểm tra dữ liệu đã có trước khi tạo nên chạy lại không tạo trùng.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.API_BASE || 'http://localhost:8081/api';

// ───────────────────────── Cấu hình kết nối ─────────────────────────
function readEnv() {
  const file = join(BACKEND_DIR, '.env');
  const env = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return { ...env, ...process.env };
}

const ENV = readEnv();
const MYSQL_BIN = ENV.MYSQL_BIN
  || ['C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe', 'C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe']
    .find((p) => existsSync(p))
  || 'mysql';
const DB_URL = ENV.SPRING_DATASOURCE_URL || 'jdbc:mysql://localhost:3306/cinema';
const DB_MATCH = DB_URL.match(/\/\/([^:/]+)(?::(\d+))?\/([^?]+)/) || [];
const DB = {
  host: DB_MATCH[1] === 'localhost' ? '127.0.0.1' : DB_MATCH[1] || '127.0.0.1',
  port: DB_MATCH[2] || '3306',
  name: DB_MATCH[3] || 'cinema',
  user: ENV.SPRING_DATASOURCE_USERNAME || 'root',
  password: ENV.SPRING_DATASOURCE_PASSWORD || '',
};
const MYSQL_ARGS = ['-u', DB.user, '-h', DB.host, '-P', DB.port, '--default-character-set=utf8mb4', DB.name];

function sql(query) {
  const r = spawnSync(MYSQL_BIN, [...MYSQL_ARGS, '-B', '-e', query], {
    env: { ...process.env, MYSQL_PWD: DB.password },
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`SQL lỗi: ${r.stderr || r.error}\n${query.slice(0, 400)}`);
  const lines = r.stdout.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const head = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    return Object.fromEntries(head.map((h, i) => [h, values[i] === 'NULL' ? null : values[i]]));
  });
}

function runSqlScript(script) {
  const r = spawnSync(MYSQL_BIN, MYSQL_ARGS, {
    env: { ...process.env, MYSQL_PWD: DB.password },
    input: script,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`SQL script lỗi: ${r.stderr || r.error}`);
}

const q = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Date) return `'${fmt(v)}'`;
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
};

// ───────────────────────── Thời gian theo giờ rạp ─────────────────────────
// Date có các trường UTC = giờ treo tường của rạp (Asia/Ho_Chi_Minh, không đổi giờ mùa hè).
const NOW = new Date(Date.now() + 7 * 3600e3);
const MIN = 60e3;
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const iso = (d) => d.toISOString().slice(0, 19);
const dayKey = (d) => d.toISOString().slice(0, 10);
const parseDb = (s) => (s ? new Date(`${String(s).replace(' ', 'T').slice(0, 19)}Z`) : null);
const startOfDay = (d) => new Date(`${dayKey(d)}T00:00:00Z`);
const at = (day, h, m = 0) => new Date(startOfDay(day).getTime() + h * HOUR + m * MIN);
const roundUp5 = (d) => new Date(Math.ceil(d.getTime() / (5 * MIN)) * 5 * MIN);
const TODAY = startOfDay(NOW);

// ───────────────────────── Ngẫu nhiên tất định ─────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261120);
const between = (a, b) => a + rand() * (b - a);
const int = (a, b) => Math.floor(between(a, b + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
function weighted(items, weightOf) {
  const total = items.reduce((s, it) => s + Math.max(0, weightOf(it)), 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
const roundTo = (n, step) => Math.round(n / step) * step;

// ───────────────────────── REST API ─────────────────────────
async function api(method, path, { token, body, query } = {}) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok || (json && typeof json.code === 'number' && json.code >= 400)) {
    const err = new Error(`${method} ${path} → ${res.status} ${json?.message || text.slice(0, 200)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json?.result;
}
const tokens = new Map();
async function login(username, password) {
  if (tokens.has(username)) return tokens.get(username);
  const result = await api('POST', '/auth/login', { body: { username, password } });
  tokens.set(username, result.accessToken);
  return result.accessToken;
}
const log = (...args) => console.log(...args);

// ───────────────────────── Dữ liệu tên người Việt ─────────────────────────
const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Trịnh', 'Mai', 'Tạ'];
const MALE_MIDDLE = ['Văn', 'Minh', 'Đức', 'Quang', 'Hoàng', 'Gia', 'Thành', 'Hữu', 'Tuấn', 'Anh', 'Công', 'Bảo'];
const FEMALE_MIDDLE = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Bảo', 'Minh', 'Phương', 'Hồng', 'Khánh', 'Mai', 'Diệu', 'Kim'];
const MALE_GIVEN = ['Nam', 'Huy', 'Khang', 'Phúc', 'Long', 'Tuấn', 'Dũng', 'Hiếu', 'Thắng', 'Kiên', 'Đạt', 'Bình', 'Quân', 'Sơn', 'Trung', 'Vinh', 'Lộc', 'Tài', 'Khôi', 'Duy'];
const FEMALE_GIVEN = ['Linh', 'Trang', 'Ngân', 'Hà', 'Anh', 'Mai', 'Thảo', 'Vy', 'Châu', 'Nhung', 'Hương', 'Yến', 'Quỳnh', 'Uyên', 'Hân', 'Duyên', 'Giang', 'My', 'Tâm', 'Lan'];
const ascii = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, '');

// ═════════════════════════════════════════════════════════════════════════
async function main() {
  log(`API ${API} · DB ${DB.user}@${DB.host}:${DB.port}/${DB.name} · giờ rạp ${fmt(NOW)}`);
  // Script ghi thẳng SQL vào database trong backend/.env: bắt buộc xác nhận đây là database demo.
  if (!process.argv.includes('--yes-demo-db') && process.env.DEMO_SEED_CONFIRM !== '1') {
    console.error('Dừng: script ghi trực tiếp vào database trên. Chỉ chạy với database demo đã sao lưu,\n'
      + 'thêm cờ --yes-demo-db (hoặc DEMO_SEED_CONFIRM=1) để tiếp tục.');
    process.exit(2);
  }
  const adminToken = await login('admin', 'admin@123');

  await seedUsers(adminToken);
  await seedRooms(adminToken);
  await seedMovies(adminToken);
  await seedFoods(adminToken);
  await seedPromotions(adminToken);
  await seedShowtimes(adminToken);
  fixExistingBookings();
  seedPaidBookings();
  recomputeSpending();
  rebalanceCustomers();
  recomputeSpending();
  await seedApiFlows(adminToken);
  seedNotifications();
  recomputeSpending();
  log('Hoàn tất.');
}

// ───────────────────────── 1. Tài khoản ─────────────────────────
const STAFF_SPECS = [
  { username: 'manager2', fullName: 'Lê Quốc Bảo', role: 'MANAGER', branchCode: 'CN-HCM-02', gender: 'MALE', dob: '1988-04-12' },
  { username: 'manager3', fullName: 'Phạm Thu Hà', role: 'MANAGER', branchCode: 'CN-HN-01', gender: 'FEMALE', dob: '1990-09-03' },
  { username: 'manager4', fullName: 'Võ Minh Khôi', role: 'MANAGER', branchCode: 'CN-DN-01', gender: 'MALE', dob: '1986-12-21' },
  { username: 'staff2', fullName: 'Đỗ Gia Huy', role: 'STAFF', branchCode: 'CN-HCM-01', gender: 'MALE', dob: '2001-02-17' },
  { username: 'staff3', fullName: 'Ngô Thảo Vy', role: 'STAFF', branchCode: 'CN-HCM-02', gender: 'FEMALE', dob: '2000-07-08' },
  { username: 'staff4', fullName: 'Hồ Nhật Quang', role: 'STAFF', branchCode: 'CN-HCM-02', gender: 'MALE', dob: '1999-11-30', status: 'INACTIVE' },
  { username: 'staff5', fullName: 'Bùi Đức Anh', role: 'STAFF', branchCode: 'CN-HN-01', gender: 'MALE', dob: '2002-05-25' },
  { username: 'staff6', fullName: 'Lý Khánh Linh', role: 'STAFF', branchCode: 'CN-HN-01', gender: 'FEMALE', dob: '2001-10-14' },
  { username: 'staff7', fullName: 'Trịnh Hoài Nam', role: 'STAFF', branchCode: 'CN-DN-01', gender: 'MALE', dob: '1998-03-09' },
];
// Đủ khách để mỗi người chỉ đặt vài lần: phần lớn hạng Đồng/Bạc, ít người Vàng/Bạch Kim.
const CUSTOMER_COUNT = 450;
const GUEST_COUNT = 300;

function existingPhones() {
  return new Set(sql('SELECT phone_number FROM users WHERE phone_number IS NOT NULL').map((r) => r.phone_number));
}

async function createUser(token, spec) {
  const exists = sql(`SELECT id FROM users WHERE username=${q(spec.username)}`)[0];
  if (exists) return Number(exists.id);
  await api('POST', '/users', { token, body: spec.body });
  const id = Number(sql(`SELECT id FROM users WHERE username=${q(spec.username)}`)[0].id);
  if (spec.status) await api('PUT', `/users/${id}/status`, { token, query: { status: spec.status } });
  return id;
}

async function seedUsers(token) {
  const branches = Object.fromEntries(sql('SELECT id, branch_code FROM branches').map((b) => [b.branch_code, Number(b.id)]));
  const phones = existingPhones();
  const newPhone = (prefix = '09') => {
    let p;
    // Số di động Việt Nam có 10 chữ số.
    do p = `${prefix}${String(int(0, 10 ** (10 - prefix.length) - 1)).padStart(10 - prefix.length, '0')}`; while (phones.has(p));
    phones.add(p);
    return p;
  };

  let staffPhone = 3;
  for (const s of STAFF_SPECS) {
    let phone = `09010000${String(staffPhone++).padStart(2, '0')}`;
    if (phones.has(phone)) phone = newPhone('0901');
    phones.add(phone);
    await createUser(token, {
      username: s.username,
      status: s.status,
      body: {
        username: s.username,
        password: `${s.username}@123`,
        fullName: s.fullName,
        email: `${s.username}@movieptit.vn`,
        phoneNumber: phone,
        gender: s.gender,
        dob: s.dob,
        role: s.role,
        branchId: branches[s.branchCode],
      },
    });
  }

  const customers = sql("SELECT COUNT(*) n FROM users WHERE role='USER' AND username NOT LIKE 'guest\\_%' AND username NOT IN ('user','user2')")[0].n;
  const usedNames = new Set(sql('SELECT username FROM users').map((r) => r.username));
  for (let i = Number(customers); i < CUSTOMER_COUNT; i++) {
    const female = chance(0.52);
    const family = pick(FAMILY);
    const middle = pick(female ? FEMALE_MIDDLE : MALE_MIDDLE);
    const given = pick(female ? FEMALE_GIVEN : MALE_GIVEN);
    let username;
    do username = `${ascii(given)}${ascii(family)}${int(80, 99)}`; while (usedNames.has(username));
    usedNames.add(username);
    const year = weighted([1978, 1985, 1992, 1997, 2001, 2004, 2007], (y) => ({ 1978: 1, 1985: 2, 1992: 4, 1997: 6, 2001: 7, 2004: 6, 2007: 2 })[y]) + int(0, 4);
    await createUser(token, {
      username,
      // Một tài khoản bị khóa vì đặt giữ ghế liên tục rồi bỏ.
      status: i === 7 ? 'BLOCKED' : undefined,
      body: {
        username,
        password: `${username}@123`,
        fullName: `${family} ${middle} ${given}`,
        email: `${username}@example.com`,
        phoneNumber: newPhone(pick(['090', '091', '093', '097', '098', '086', '070', '035'])),
        gender: female ? 'FEMALE' : 'MALE',
        dob: `${Math.min(year, 2008)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
        role: 'USER',
      },
    });
  }

  const guests = Number(sql("SELECT COUNT(*) n FROM users WHERE username LIKE 'guest\\_%'")[0].n);
  for (let i = guests; i < GUEST_COUNT; i++) {
    const phone = newPhone(pick(['090', '091', '093', '097', '098', '039', '077']));
    const female = chance(0.5);
    // Khách vãng lai: quầy chỉ hỏi số điện thoại, đôi khi kèm tên (giống StaffCustomerService).
    const fullName = chance(0.7)
      ? `${pick(FAMILY)} ${pick(female ? FEMALE_MIDDLE : MALE_MIDDLE)} ${pick(female ? FEMALE_GIVEN : MALE_GIVEN)}`
      : 'Walk-in Customer';
    await createUser(token, {
      username: `guest_${phone}`,
      body: {
        username: `guest_${phone}`,
        password: randomBytes(18).toString('base64url'),
        fullName,
        // API yêu cầu email không trùng; quầy thật tạo khách chỉ có số điện thoại nên xóa email ngay sau đó.
        email: `guest_${phone}@example.invalid`,
        phoneNumber: phone,
        role: 'USER',
      },
    });
    sql(`UPDATE users SET email=NULL WHERE username=${q(`guest_${phone}`)}`);
  }
  log(`Tài khoản: ${sql('SELECT COUNT(*) n FROM users')[0].n}`);
}

// ───────────────────────── 2. Phòng chiếu ─────────────────────────
const ROOM_SPECS = [
  { branchCode: 'CN-HCM-01', code: 'R04', name: 'Phòng Gold Class', roomTechnology: 'GOLD_CLASS', seatCapacity: 24, status: 'ACTIVE' },
  { branchCode: 'CN-HCM-02', code: 'R04', name: 'Phòng ScreenX', roomTechnology: 'SCREEN_X', seatCapacity: 80, status: 'ACTIVE' },
  { branchCode: 'CN-HN-01', code: 'R04', name: 'Phòng Standard 2', roomTechnology: 'STANDARD', seatCapacity: 60, status: 'MAINTENANCE' },
  { branchCode: 'CN-DN-01', code: 'R04', name: 'Phòng Gold Class', roomTechnology: 'GOLD_CLASS', seatCapacity: 24, status: 'ACTIVE' },
];

async function seedRooms(token) {
  const branches = Object.fromEntries(sql('SELECT id, branch_code FROM branches').map((b) => [b.branch_code, Number(b.id)]));
  for (const spec of ROOM_SPECS) {
    const branchId = branches[spec.branchCode];
    if (sql(`SELECT id FROM rooms WHERE branch_id=${branchId} AND code=${q(spec.code)}`).length) continue;
    const { branchCode, ...body } = spec;
    await api('POST', '/room', { token, body: { ...body, branchId } });
    const roomId = Number(sql(`SELECT id FROM rooms WHERE branch_id=${branchId} AND code=${q(spec.code)}`)[0].id);
    // Gold Class: toàn bộ ghế VIP. ScreenX: hàng cuối là ghế đôi.
    if (spec.roomTechnology === 'GOLD_CLASS') sql(`UPDATE seats SET seat_type='VIP' WHERE room_id=${roomId}`);
    if (spec.roomTechnology === 'SCREEN_X') {
      sql(`UPDATE seats SET seat_type='COUPLE' WHERE room_id=${roomId} AND row_label=(SELECT r FROM (SELECT MAX(row_label) r FROM seats WHERE room_id=${roomId}) x)`);
    }
    log(`Tạo phòng ${spec.code} – ${spec.name} (${spec.branchCode})`);
  }
}

// ───────────────────────── 3. Phim ─────────────────────────
const MOVIE_DETAILS = {
  'Lật Mặt 7: Một Điều Ước': { originalTitle: 'Face Off 7: One Wish', cast: 'Thanh Hiền, Trương Minh Cường, Đinh Y Nhung, Quách Ngọc Tuyên, Trâm Anh, Trần Kim Hải', trailer: '2ozP8jlZdCk' },
  Mai: { originalTitle: 'Mai', cast: 'Phương Anh Đào, Tuấn Trần, Trấn Thành, Hồng Đào, Uyển Ân, Ngọc Giàu', trailer: 'EX6clvId19s' },
  'Dune: Part Two': { originalTitle: 'Dune: Part Two', cast: 'Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem, Austin Butler, Florence Pugh', trailer: 'Way9Dexny3w' },
  'Inside Out 2': { originalTitle: 'Inside Out 2', cast: 'Amy Poehler, Maya Hawke, Kensington Tallman, Liza Lapira, Tony Hale, Lewis Black', trailer: 'LEjhY15eCx0' },
  'Deadpool & Wolverine': { originalTitle: 'Deadpool & Wolverine', cast: 'Ryan Reynolds, Hugh Jackman, Emma Corrin, Matthew Macfadyen, Rob Delaney', trailer: '73_1biulkYk' },
  'Kung Fu Panda 4': { originalTitle: 'Kung Fu Panda 4', cast: 'Jack Black, Awkwafina, Viola Davis, Dustin Hoffman, Bryan Cranston, Ke Huy Quan', trailer: '_inKs4eeHiI' },
  'The Conjuring': { originalTitle: 'The Conjuring', cast: 'Vera Farmiga, Patrick Wilson, Lili Taylor, Ron Livingston, Mackenzie Foy', trailer: 'k10ETZ41q5o' },
  Oppenheimer: { originalTitle: 'Oppenheimer', cast: 'Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr., Florence Pugh', trailer: 'uYPbbksJxIg' },
  'The Avengers': { originalTitle: "Marvel's The Avengers", cast: 'Robert Downey Jr., Chris Evans, Mark Ruffalo, Chris Hemsworth, Scarlett Johansson, Jeremy Renner', trailer: 'eOrNdBpGMv8' },
};

const NEW_MOVIES = [
  {
    movieName: 'Godzilla x Kong: Đế Chế Mới',
    originalTitle: 'Godzilla x Kong: The New Empire',
    directorName: 'Adam Wingard',
    castNames: 'Rebecca Hall, Brian Tyree Henry, Dan Stevens, Kaylee Hottle',
    description: 'Godzilla và Kong buộc phải hợp sức trước một mối đe dọa khổng lồ ẩn sâu trong lòng Trái Đất, đe dọa sự tồn tại của cả hai loài và con người.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/en/b/be/Godzilla_x_kong_the_new_empire_poster.jpg',
    trailerUrl: 'lV1OOlGwExM',
    durationMinutes: 115,
    ageRating: 'T13',
    language: 'Tiếng Anh',
    subtitle: 'Phụ đề tiếng Việt',
    releaseDate: '2026-09-25',
    endDate: '2026-10-30',
    status: 'ENDED',
    isPublic: true,
    genres: ['Hành động', 'Khoa học viễn tưởng', 'Phiêu lưu'],
  },
  {
    movieName: 'Đào, Phở và Piano',
    originalTitle: 'Peach Blossom, Pho and Piano',
    directorName: 'Phi Tiến Sơn',
    castNames: 'Doãn Quốc Đam, Cao Thùy Linh, Trần Lực, Tuấn Hưng',
    description: 'Hà Nội những ngày cuối năm 1946: giữa khói lửa chiến tranh, một chàng dân quân và cô tiểu thư đam mê piano tìm thấy nhau khi cả thành phố quyết tử để bảo vệ Thủ đô.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/vi/2/29/%C3%81p_ph%C3%ADch_%C4%90%C3%A0o%2C_ph%E1%BB%9F_v%C3%A0_piano.jpg',
    durationMinutes: 100,
    ageRating: 'T13',
    language: 'Tiếng Việt',
    releaseDate: '2026-09-10',
    endDate: '2026-10-15',
    status: 'ENDED',
    isPublic: true,
    genres: ['Tâm lý', 'Tình cảm'],
  },
  {
    movieName: 'Hành Trình Của Moana 2',
    originalTitle: 'Moana 2',
    directorName: 'David Derrick Jr.',
    castNames: "Auliʻi Cravalho, Dwayne Johnson, Alan Tudyk, Hualālai Chung",
    description: 'Moana nhận được lời kêu gọi từ tổ tiên và cùng Maui ra khơi tới vùng biển xa xôi của Châu Đại Dương trong chuyến phiêu lưu chưa từng có.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/en/7/73/Moana_2_poster.jpg',
    trailerUrl: 'hDZ7y8RP5HE',
    durationMinutes: 100,
    ageRating: 'P',
    language: 'Tiếng Anh',
    subtitle: 'Lồng tiếng Việt',
    releaseDate: '2026-12-20',
    endDate: '2027-02-10',
    status: 'UPCOMING',
    // Bản nháp: admin đang chuẩn bị, khách chưa thấy.
    isPublic: false,
    genres: ['Hoạt hình', 'Phiêu lưu', 'Gia đình'],
  },
];

async function seedMovies(token) {
  for (const [name, d] of Object.entries(MOVIE_DETAILS)) {
    sql(`UPDATE movies SET
      original_title=COALESCE(original_title, ${q(d.originalTitle)}),
      cast_names=COALESCE(cast_names, ${q(d.cast)}),
      trailer_url=IF(trailer_url IS NULL OR trailer_url='dQw4w9WgXcQ', ${q(d.trailer)}, trailer_url)
      WHERE movie_name=${q(name)}`);
  }
  const genres = Object.fromEntries(sql('SELECT id, name FROM genres').map((g) => [g.name, Number(g.id)]));
  for (const m of NEW_MOVIES) {
    if (sql(`SELECT id FROM movies WHERE movie_name=${q(m.movieName)}`).length) continue;
    let director = sql(`SELECT id FROM directors WHERE name=${q(m.directorName)}`)[0];
    if (!director) {
      await api('POST', '/director', { token, body: { name: m.directorName } });
      director = sql(`SELECT id FROM directors WHERE name=${q(m.directorName)}`)[0];
    }
    const { genres: genreNames, directorName, ...body } = m;
    await api('POST', '/movie', {
      token,
      body: { ...body, directorId: Number(director.id), genreIds: genreNames.map((g) => genres[g]).filter(Boolean) },
    });
    log(`Tạo phim ${m.movieName}`);
  }
}

// ───────────────────────── 4. Bắp nước ─────────────────────────
const POPCORN_IMG = 'https://commons.wikimedia.org/wiki/Special:FilePath/Caramel%20Chocolate%20Popcorn%20in%20a%20bucket%20%2815256400336%29.jpg?width=640';
const FOOD_SPECS = [
  { name: 'Combo Sinh viên PTIT', branchCode: 'CN-HN-01', price: 79000, stockQuantity: 22, lowStockThreshold: 10, imageUrl: POPCORN_IMG, description: 'Bắp ngọt cỡ vừa và một ly nước ngọt, giá riêng khi xuất trình thẻ sinh viên.' },
  { name: 'Trà sữa trân châu', branchCode: 'CN-HCM-01', price: 49000, stockQuantity: 6, lowStockThreshold: 10, imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bubble_tea.jpg?width=640', description: 'Trà sữa nhà làm với trân châu đường đen, size L.' },
  { name: 'Khoai tây chiên lắc phô mai', branchCode: 'CN-HCM-02', price: 45000, stockQuantity: 0, lowStockThreshold: 8, imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/French_fries.jpg?width=640', description: 'Khoai tây chiên giòn lắc bột phô mai.' },
  { name: 'Nước suối', branchCode: null, price: 20000, stockQuantity: null, lowStockThreshold: 10, imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bottled_water.jpg?width=640', description: 'Chai 500 ml.' },
  { name: 'Combo Halloween', branchCode: null, price: 129000, stockQuantity: null, lowStockThreshold: 5, imageUrl: POPCORN_IMG, description: 'Combo theo mùa Halloween: bắp caramel lớn, hai nước ngọt và móc khóa bí ngô. Đã kết thúc.', active: false },
];

async function seedFoods(token) {
  const branches = Object.fromEntries(sql('SELECT id, branch_code FROM branches').map((b) => [b.branch_code, Number(b.id)]));
  for (const f of FOOD_SPECS) {
    if (sql(`SELECT id FROM foods WHERE name=${q(f.name)}`).length) continue;
    const { branchCode, ...body } = f;
    await api('POST', '/food', { token, body: { ...body, active: f.active ?? true, branchId: branchCode ? branches[branchCode] : null } });
    log(`Tạo món ${f.name}`);
  }
}

// ───────────────────────── 5. Khuyến mãi ─────────────────────────
const PROMOTION_SPECS = () => [
  { code: 'MOVIEPTIT10', description: 'Giảm 10% cho đơn từ 100.000 đ, tối đa 30.000 đ.', discountPercent: 10, maxDiscount: 30000, minOrderAmount: 100000, start: new Date(TODAY - 40 * DAY), end: new Date(TODAY.getTime() + 60 * DAY), usageLimit: 1000 },
  { code: 'PTITSV15', description: 'Sinh viên PTIT giảm 15% tại MoviePTIT Hồ Gươm, đơn từ 150.000 đ.', discountPercent: 15, maxDiscount: 40000, minOrderAmount: 150000, branchCode: 'CN-HN-01', start: new Date(TODAY - 30 * DAY), end: new Date(TODAY.getTime() + 90 * DAY), usageLimit: 300 },
  { code: 'GOLDMEMBER20', description: 'Thành viên hạng Vàng trở lên giảm 20%, tối đa 60.000 đ.', discountPercent: 20, maxDiscount: 60000, minMembershipTier: 'GOLD', start: new Date(TODAY - 20 * DAY), end: new Date(TODAY.getTime() + 40 * DAY) },
  { code: 'FLASHSALE50', description: 'Flash sale giảm 50% (tối đa 50.000 đ), chỉ 30 lượt.', discountPercent: 50, maxDiscount: 50000, start: new Date(TODAY - 10 * DAY), end: new Date(TODAY.getTime() + 5 * DAY), usageLimit: 30 },
  { code: 'BLACKFRIDAY30', description: 'Black Friday giảm 30%, tối đa 70.000 đ, từ 27/11 đến 30/11.', discountPercent: 30, maxDiscount: 70000, start: new Date('2026-11-27T00:00:00Z'), end: new Date('2026-11-30T23:59:00Z'), usageLimit: 500 },
  { code: 'HALLOWEEN25', description: 'Ưu đãi Halloween giảm 25%, tối đa 50.000 đ.', discountPercent: 25, maxDiscount: 50000, start: new Date('2026-10-25T00:00:00Z'), end: new Date('2026-10-31T23:59:00Z'), usageLimit: 200, usedCount: 87 },
  { code: 'TET2027', description: 'Ưu đãi Tết Đinh Mùi (đang soạn, chưa bật).', discountPercent: 20, maxDiscount: 80000, start: new Date('2027-02-01T00:00:00Z'), end: new Date('2027-02-15T23:59:00Z'), usageLimit: 1000, active: false },
];

async function seedPromotions(token) {
  const branches = Object.fromEntries(sql('SELECT id, branch_code FROM branches').map((b) => [b.branch_code, Number(b.id)]));
  for (const p of PROMOTION_SPECS()) {
    if (sql(`SELECT id FROM promotions WHERE code=${q(p.code)}`).length) continue;
    await api('POST', '/promotion', {
      token,
      body: {
        code: p.code,
        description: p.description,
        discountPercent: p.discountPercent,
        maxDiscount: p.maxDiscount ?? null,
        minOrderAmount: p.minOrderAmount ?? null,
        minMembershipTier: p.minMembershipTier ?? null,
        branchId: p.branchCode ? branches[p.branchCode] : null,
        startDate: iso(p.start).slice(0, 16),
        endDate: iso(p.end).slice(0, 16),
        usageLimit: p.usageLimit ?? null,
        active: p.active ?? true,
      },
    });
    if (p.usedCount) sql(`UPDATE promotions SET used_count=${p.usedCount} WHERE code=${q(p.code)}`);
    log(`Tạo khuyến mãi ${p.code}`);
  }
}

// ───────────────────────── 6. Suất chiếu và giá vé ─────────────────────────
const BASE_PRICE = { STANDARD: 85000, SCREEN_X: 125000, IMAX: 150000, FOUR_DX: 165000, GOLD_CLASS: 260000 };

// Giá theo công nghệ phòng, khung giờ và ngày; thứ Ba là ngày vé ưu đãi.
function ticketPrice(tech, start, format) {
  let price = BASE_PRICE[tech] ?? 85000;
  const dow = start.getUTCDay();
  const hour = start.getUTCHours();
  const weekend = dow === 0 || dow === 6 || (dow === 5 && hour >= 17);
  if (dow === 2) price = tech === 'STANDARD' ? 60000 : price - 20000;
  else if (weekend) price += tech === 'GOLD_CLASS' ? 30000 : 15000;
  if (hour < 12 && tech !== 'GOLD_CLASS') price -= 15000;
  if (format === 'THREE_D') price += 20000;
  return roundTo(price, 5000);
}

const MOVIE_WEIGHTS = {
  IMAX: { 'Dune: Part Two': 5, 'Deadpool & Wolverine': 4, 'Kung Fu Panda 4': 2, 'The Conjuring': 1 },
  FOUR_DX: { 'Deadpool & Wolverine': 4, 'Kung Fu Panda 4': 3, 'Dune: Part Two': 3, 'The Conjuring': 2 },
  SCREEN_X: { 'Dune: Part Two': 3, 'Deadpool & Wolverine': 3, 'Inside Out 2': 2 },
  GOLD_CLASS: { Mai: 3, 'Lật Mặt 7: Một Điều Ước': 3, 'Dune: Part Two': 2, 'The Conjuring': 1 },
  STANDARD: { 'Lật Mặt 7: Một Điều Ước': 4, Mai: 4, 'Inside Out 2': 3, 'Kung Fu Panda 4': 3, 'Deadpool & Wolverine': 2, 'Dune: Part Two': 2, 'The Conjuring': 3 },
};
const FAMILY_MOVIES = new Set(['Inside Out 2', 'Kung Fu Panda 4', 'Lật Mặt 7: Một Điều Ước']);
const LATE_MOVIES = new Set(['The Conjuring', 'Deadpool & Wolverine']);
const THREE_D_MOVIES = new Set(['Kung Fu Panda 4', 'Deadpool & Wolverine']);

async function seedShowtimes(token) {
  const SCHEDULE_DAYS = 9;
  const horizon = new Date(TODAY.getTime() + SCHEDULE_DAYS * DAY);
  const rooms = sql(`SELECT r.id, r.room_technology tech, r.status, r.branch_id FROM rooms r JOIN branches b ON b.id=r.branch_id WHERE b.status='ACTIVE'`);
  const movies = sql('SELECT id, movie_name, duration_minutes, status, is_public, release_date, end_date FROM movies');

  // 6a. Giá suất cũ: suất chưa có đơn nào được chỉnh về giá thực tế (quá khứ bằng SQL, tương lai qua API).
  const unsold = sql(`SELECT s.id, s.start_time, s.screening_format, s.ticket_price, r.room_technology tech
    FROM showtimes s JOIN rooms r ON r.id=s.room_id
    WHERE s.status<>'CANCELLED' AND s.ticket_price=75000
      AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.showtime_id=s.id AND t.booking_id IS NOT NULL)`);
  let pastUpdates = '';
  let futureUpdated = 0;
  for (const s of unsold) {
    const start = parseDb(s.start_time);
    const price = ticketPrice(s.tech, start, s.screening_format);
    if (start > new Date(NOW.getTime() + 10 * MIN)) {
      try {
        await api('PUT', `/showtime/${s.id}`, { token, body: { ticketPrice: price } });
        futureUpdated++;
      } catch (e) {
        log(`  Bỏ qua cập nhật giá suất ${s.id}: ${e.message}`);
      }
    } else {
      pastUpdates += `UPDATE showtimes SET ticket_price=${price} WHERE id=${s.id};\nUPDATE tickets SET price=${price} WHERE showtime_id=${s.id} AND booking_id IS NULL;\n`;
    }
  }
  if (pastUpdates) runSqlScript(`START TRANSACTION;\n${pastUpdates}COMMIT;\n`);
  log(`Giá vé: cập nhật ${futureUpdated} suất sắp tới qua API, ${unsold.length - futureUpdated} suất đã qua bằng SQL`);

  // 6b. Lấp đầy lịch chiếu các ngày tới.
  const existing = sql(`SELECT room_id, start_time, end_time FROM showtimes WHERE status<>'CANCELLED' AND end_time >= ${q(TODAY)} AND start_time < ${q(horizon)}`);
  const busy = new Map();
  for (const s of existing) {
    const list = busy.get(s.room_id) || [];
    list.push([parseDb(s.start_time).getTime(), parseDb(s.end_time).getTime()]);
    busy.set(s.room_id, list);
  }
  const overlaps = (roomId, start, end) => (busy.get(String(roomId)) || [])
    .some(([s, e]) => start < e + 15 * MIN && end > s - 15 * MIN);

  let created = 0;
  for (const room of rooms.filter((r) => r.status === 'ACTIVE')) {
    for (let d = 0; d < SCHEDULE_DAYS; d++) {
      const day = new Date(TODAY.getTime() + d * DAY);
      const playable = movies.filter((m) => m.status !== 'ENDED' && m.is_public === '1'
        && (!m.release_date || m.release_date <= dayKey(day))
        && (!m.end_date || m.end_date >= dayKey(day))
        && MOVIE_WEIGHTS[room.tech]?.[m.movie_name]);
      if (playable.length === 0) continue;
      let t = at(day, 9, pick([0, 15, 30, 45]));
      // Suất cuối bắt đầu muộn nhất 23:15 của chính ngày đó.
      const lastStart = at(day, 23, 15);
      while (t <= lastStart) {
        const hour = t.getUTCHours();
        const movie = weighted(playable, (m) => {
          let w = MOVIE_WEIGHTS[room.tech][m.movie_name];
          if (hour < 13 && FAMILY_MOVIES.has(m.movie_name)) w *= 2;
          if (hour >= 21 && LATE_MOVIES.has(m.movie_name)) w *= 2;
          if (hour >= 21 && FAMILY_MOVIES.has(m.movie_name)) w *= 0.3;
          return w;
        });
        const duration = Number(movie.duration_minutes) || 120;
        const end = new Date(t.getTime() + (duration + 15) * MIN);
        if (overlaps(room.id, t.getTime(), end.getTime())) {
          const blocker = busy.get(String(room.id)).filter(([s, e]) => t.getTime() < e + 15 * MIN && end.getTime() > s - 15 * MIN)
            .sort((a, b) => b[1] - a[1])[0];
          t = roundUp5(new Date(blocker[1] + 15 * MIN));
          continue;
        }
        if (t.getTime() > NOW.getTime() + 20 * MIN) {
          const format = (room.tech === 'IMAX' || room.tech === 'FOUR_DX') && THREE_D_MOVIES.has(movie.movie_name) && chance(0.5) ? 'THREE_D' : 'TWO_D';
          try {
            await api('POST', '/showtime', {
              token,
              body: { roomId: Number(room.id), movieId: Number(movie.id), startTime: iso(t), endTime: iso(end), status: 'OPEN', screeningFormat: format, ticketPrice: ticketPrice(room.tech, t, format) },
            });
            created++;
            const list = busy.get(String(room.id)) || [];
            list.push([t.getTime(), end.getTime()]);
            busy.set(String(room.id), list);
          } catch (e) {
            log(`  Bỏ qua suất ${movie.movie_name} ${fmt(t)}: ${e.message}`);
          }
        }
        t = roundUp5(new Date(end.getTime() + int(15, 35) * MIN));
      }
    }
  }
  log(`Suất chiếu mới: ${created}`);

  // Một suất bị hủy vì sự cố kỹ thuật (chưa có ai đặt).
  const toCancel = sql(`SELECT s.id FROM showtimes s JOIN rooms r ON r.id=s.room_id JOIN branches b ON b.id=r.branch_id
    WHERE b.branch_code='CN-DN-01' AND r.code='R03' AND s.status='OPEN' AND DATE(s.start_time)=${q(dayKey(new Date(TODAY.getTime() + 4 * DAY)))}
      AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.showtime_id=s.id AND t.booking_id IS NOT NULL)
    ORDER BY s.start_time LIMIT 1`)[0];
  if (toCancel && !sql("SELECT id FROM showtimes WHERE status='CANCELLED' LIMIT 1").length) {
    await api('PUT', `/showtime/${toCancel.id}`, { token, body: { status: 'CANCELLED' } });
    log(`Hủy suất ${toCancel.id} (phòng 4DX Sông Hàn bảo trì đột xuất)`);
  }
}

// ───────────────────────── 7. Sửa dữ liệu đơn cũ ─────────────────────────
function fixExistingBookings() {
  runSqlScript(`START TRANSACTION;
-- Đơn cũ được seed cùng lúc: đưa ngày tạo về lúc khách bắt đầu thanh toán.
UPDATE bookings b JOIN payments p ON p.booking_id=b.id
  SET b.created_at = p.payment_created_at, b.updated_at = COALESCE(p.refunded_at, p.paid_at, p.payment_created_at)
  WHERE p.payment_created_at IS NOT NULL AND b.created_at > p.payment_created_at + INTERVAL 1 HOUR;
-- Vé được soát trước lúc đơn được tạo/thanh toán (bản seed cũ): dời giờ soát của cả đơn về 1–3 phút sau khi
-- thanh toán. Sau khi dời, vé cách mốc ít nhất 60 giây nên lần chạy sau không chọn lại.
UPDATE tickets t JOIN (
    SELECT b.id, GREATEST(b.created_at, COALESCE(p.paid_at, b.created_at)) ready
    FROM bookings b JOIN payments p ON p.booking_id=b.id JOIN tickets x ON x.booking_id=b.id
    WHERE x.checked_in_at IS NOT NULL
    GROUP BY b.id, ready
    HAVING MIN(x.checked_in_at) < ready + INTERVAL 30 SECOND) k ON k.id=t.booking_id
  SET t.checked_in_at = LEAST(k.ready + INTERVAL (60 + k.id % 120 + (t.id % 10) * 4) SECOND, NOW())
  WHERE t.checked_in_at IS NOT NULL;
UPDATE audit_logs a
  JOIN (SELECT booking_id, MIN(checked_in_at) first_ci FROM tickets WHERE checked_in_at IS NOT NULL GROUP BY booking_id) t
    ON a.target_type='Booking' AND a.target_id=CAST(t.booking_id AS CHAR)
  SET a.created_at = t.first_ci
  WHERE a.action='TICKET_CHECKED_IN' AND a.created_at < t.first_ci;
-- Chính sách hiện tại hoàn toàn bộ số tiền, hoàn tiền trả ghế.
UPDATE payments p JOIN bookings b ON b.id=p.booking_id
  SET p.refund_amount=b.total_amount, p.refund_process_note='Đã hoàn tiền qua VNPay.', p.refund_gateway_status='SUCCEEDED'
  WHERE b.status='REFUNDED' AND p.refund_process_note LIKE '%(80%%)%';
UPDATE tickets t JOIN bookings b ON b.id=t.booking_id
  SET t.booking_id=NULL, t.ticket_status='AVAILABLE', t.qr_code=NULL, t.checked_in_at=NULL, t.checked_in_by=NULL
  WHERE b.status IN ('REFUNDED','CANCELLED','EXPIRED');
-- Cờ đã cộng chi tiêu cho đơn cũ (NULL trước khi có cột).
UPDATE bookings b JOIN payments p ON p.booking_id=b.id
  SET b.spending_recorded = (b.status IN ('COMPLETED','REFUND_REQUESTED') AND p.payment_status='PAID')
  WHERE b.spending_recorded IS NULL;
COMMIT;`);
  log('Đã chuẩn hóa đơn cũ');
}

// ───────────────────────── 8. Đơn đã thanh toán (SQL) ─────────────────────────
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LATE_PAYMENT_REASON = 'VNPay xác nhận thanh toán sau khi đơn đã hết hạn giữ ghế; cần hoàn tiền';
const REFUND_REASONS = ['Bận việc đột xuất', 'Đặt nhầm suất chiếu', 'Đặt nhầm ghế', 'Muốn đổi sang ngày khác', 'Gia đình có việc gấp'];
const POPULARITY = { 'Lật Mặt 7: Một Điều Ước': 1.25, 'Dune: Part Two': 1.2, Mai: 1.15, 'Deadpool & Wolverine': 1.1, 'The Conjuring': 1.2, 'Kung Fu Panda 4': 1.0, 'Inside Out 2': 0.9 };

function seedPaidBookings() {
  const marker = Number(sql("SELECT COUNT(*) n FROM bookings WHERE booking_code LIKE 'BK-%'")[0].n);
  if (marker > 200) {
    log(`Đã có ${marker} đơn định dạng mới, bỏ qua bước sinh đơn.`);
    return;
  }
  const horizon = new Date(TODAY.getTime() + 9 * DAY);
  const showtimes = sql(`SELECT s.id, s.start_time, s.end_time, s.ticket_price, s.status, s.screening_format, r.id room_id, r.room_technology tech,
      r.branch_id, m.movie_name
    FROM showtimes s JOIN rooms r ON r.id=s.room_id JOIN movies m ON m.id=s.movie_id
    WHERE s.status<>'CANCELLED' AND s.start_time >= '2026-11-02' AND s.start_time < ${q(horizon)}`)
    .map((s) => ({ ...s, start: parseDb(s.start_time), end: parseDb(s.end_time), price: Number(s.ticket_price) }));
  const freeTickets = sql(`SELECT t.id, t.showtime_id, se.row_label, se.seat_number, se.seat_code, se.seat_type
    FROM tickets t JOIN seats se ON se.id=t.seat_id
    WHERE t.booking_id IS NULL AND t.ticket_status='AVAILABLE'
      AND t.showtime_id IN (SELECT id FROM showtimes WHERE status<>'CANCELLED' AND start_time >= '2026-11-02' AND start_time < ${q(horizon)})`);
  const ticketsByShow = new Map();
  for (const t of freeTickets) {
    const list = ticketsByShow.get(t.showtime_id) || [];
    list.push({ ...t, seat_number: Number(t.seat_number) });
    ticketsByShow.set(t.showtime_id, list);
  }
  const users = sql("SELECT id, username, role, branch_id, status FROM users");
  const registered = users.filter((u) => u.role === 'USER' && !u.username.startsWith('guest_') && u.status === 'ACTIVE');
  const guests = users.filter((u) => u.username.startsWith('guest_'));
  // Phân bố lệch: vài khách xem rất thường xuyên, đa số thỉnh thoảng.
  const customerWeight = new Map(registered.map((u, i) => [u.id, u.username === 'user' || u.username === 'user2' ? 0.004 : customerWeightAt(i)]));
  const guestWeight = new Map(guests.map((u, i) => [u.id, guestWeightAt(i)]));
  const staffByBranch = new Map();
  for (const u of users.filter((x) => (x.role === 'STAFF' || x.role === 'MANAGER') && x.status === 'ACTIVE' && x.branch_id)) {
    const list = staffByBranch.get(u.branch_id) || [];
    list.push(u);
    staffByBranch.set(u.branch_id, list);
  }
  const counterStaff = (branchId) => (staffByBranch.get(String(branchId)) || []).filter((u) => u.role === 'STAFF');
  const managerOf = (branchId) => (staffByBranch.get(String(branchId)) || []).find((u) => u.role === 'MANAGER');
  const admin = users.find((u) => u.username === 'admin');
  const foods = sql('SELECT id, name, price, branch_id, active, stock_quantity FROM foods').filter((f) => f.active === '1' || f.active === '\u0001')
    .map((f) => ({ ...f, price: Number(f.price) }));
  const promos = Object.fromEntries(sql('SELECT code, discount_percent, max_discount, min_order_amount, branch_id, start_date, end_date FROM promotions')
    .map((p) => [p.code, { ...p, pct: Number(p.discount_percent), max: p.max_discount ? Number(p.max_discount) : null, minOrder: p.min_order_amount ? Number(p.min_order_amount) : 0, start: parseDb(p.start_date), end: parseDb(p.end_date) }]));
  let flashLeft = 29;
  const codes = new Set(sql('SELECT booking_code FROM bookings').map((r) => r.booking_code));
  let txn = 14000000 + int(100000, 900000);

  const newCode = (date) => {
    let code;
    do code = `BK-${dayKey(date).replace(/-/g, '')}-${Array.from({ length: 8 }, () => CODE_ALPHABET[int(0, 31)]).join('')}`; while (codes.has(code));
    codes.add(code);
    return code;
  };

  function takeSeats(list, size) {
    if (list.length === 0) return [];
    if (size === 2 && chance(0.35)) {
      const couple = list.filter((t) => t.seat_type === 'COUPLE');
      if (couple.length >= 2) return removeBlock(list, couple, 2);
    }
    const rows = [...new Set(list.map((t) => t.row_label))].sort();
    // Khách thích hàng giữa và cuối phòng.
    const row = weighted(rows, (r) => 1 + rows.indexOf(r) * 0.6 - (rows.indexOf(r) === rows.length - 1 ? 1 : 0));
    const inRow = list.filter((t) => t.row_label === row).sort((a, b) => a.seat_number - b.seat_number);
    return removeBlock(list, inRow, size);
  }
  function removeBlock(list, candidates, size) {
    let block = [];
    const sorted = [...candidates].sort((a, b) => (a.row_label === b.row_label ? a.seat_number - b.seat_number : a.row_label.localeCompare(b.row_label)));
    const starts = [];
    for (let i = 0; i + size <= sorted.length; i++) {
      const slice = sorted.slice(i, i + size);
      if (slice.every((t, k) => k === 0 || (t.row_label === slice[0].row_label && t.seat_number === slice[k - 1].seat_number + 1))) starts.push(slice);
    }
    block = starts.length ? pick(starts) : sorted.slice(0, Math.min(size, sorted.length));
    for (const t of block) list.splice(list.indexOf(t), 1);
    return block;
  }

  function occupancy(st) {
    const h = st.start.getUTCHours();
    let base = h < 12 ? 0.08 : h < 17 ? 0.13 : h < 20 ? 0.25 : h < 22 ? 0.28 : 0.14;
    const dow = st.start.getUTCDay();
    if (dow === 0 || dow === 6 || (dow === 5 && h >= 17)) base *= 1.4;
    if (dow === 2) base *= 1.25;
    if (st.tech === 'GOLD_CLASS') base *= 0.8;
    if (st.tech === 'IMAX') base *= 1.1;
    base *= POPULARITY[st.movie_name] ?? 1;
    base *= between(0.5, 1.45);
    const daysAhead = (startOfDay(st.start) - TODAY) / DAY;
    if (st.start > NOW) base *= daysAhead <= 0 ? 0.8 : daysAhead === 1 ? 0.5 : daysAhead === 2 ? 0.32 : daysAhead <= 4 ? 0.18 : 0.08;
    return Math.min(0.95, base);
  }

  // Hai suất cuối tuần được bán gần hết/hết để thấy trạng thái "Chỉ còn N ghế" và "Hết ghế".
  const saturday = new Date(TODAY.getTime() + ((6 - TODAY.getUTCDay() + 7) % 7 || 7) * DAY);
  const hotShows = new Map();
  const soldOut = showtimes.filter((s) => s.tech === 'IMAX' && s.movie_name === 'Dune: Part Two' && dayKey(s.start) === dayKey(saturday) && s.start.getUTCHours() >= 18)
    .sort((a, b) => a.start - b.start)[0];
  const almost = showtimes.filter((s) => s.tech === 'FOUR_DX' && dayKey(s.start) === dayKey(saturday) && s.start.getUTCHours() >= 18 && s !== soldOut)
    .sort((a, b) => a.start - b.start)[0];
  if (soldOut) hotShows.set(soldOut.id, 1);
  if (almost) hotShows.set(almost.id, 0.84);

  let script = 'START TRANSACTION;\n';
  const stats = { bookings: 0, tickets: 0, cancelled: 0, refunded: 0, rejected: 0, counter: 0, online: 0, checkedIn: 0 };
  const foodSold = new Map();

  for (const st of showtimes) {
    const list = ticketsByShow.get(st.id) || [];
    if (list.length === 0) continue;
    const capacity = list.length;
    const target = Math.round((hotShows.get(st.id) ?? occupancy(st)) * capacity);
    let sold = 0;
    let guard = 0;
    while (sold < target && list.length && guard++ < 200) {
      const size = Math.min(list.length, target - sold >= 2 ? weighted([1, 2, 3, 4, 5, 6], (n) => ({ 1: 20, 2: 45, 3: 15, 4: 12, 5: 5, 6: 3 })[n]) : 1);
      const started = st.start <= NOW;
      const online = chance(st.start > NOW ? 0.85 : 0.6);
      // Thời điểm đặt: online trước giờ chiếu; quầy trong 3 giờ trước tới 10 phút sau giờ chiếu.
      let created;
      if (online) {
        const from = Math.max(st.start - 5 * DAY, new Date('2026-11-01T08:00:00Z').getTime());
        const to = Math.min(st.start - 20 * MIN, NOW - 10 * MIN);
        if (to <= from) continue;
        const skew = Math.pow(rand(), 0.45);
        created = new Date(from + skew * (to - from));
        if (created.getUTCHours() < 7) created = new Date(created.getTime() + 8 * HOUR > to ? to : created.getTime() + 8 * HOUR);
      } else {
        // Phần lớn mua ngay trước giờ chiếu, một số khách mua trước tại quầy cho ngày sau.
        const from = st.start - (chance(0.15) ? 2 * DAY : 3 * HOUR);
        const to = Math.min(st.start.getTime() + 10 * MIN, NOW - 2 * MIN);
        if (to <= from) continue;
        created = new Date(between(from, to));
      }
      const seats = takeSeats(list, size);
      if (seats.length === 0) break;

      const branchId = st.branch_id;
      const staff = online ? null : pick(counterStaff(branchId).length ? counterStaff(branchId) : [admin]);
      const user = online || chance(0.3)
        ? weighted(registered, (u) => customerWeight.get(u.id))
        : weighted(guests, (u) => guestWeight.get(u.id));
      const ticketTotal = st.price * seats.length;

      // Bắp nước: món dùng chung hoặc món của đúng rạp; món giới hạn tồn chỉ bán khi còn.
      const items = [];
      if (chance(0.45)) {
        const menu = foods.filter((f) => !f.branch_id || f.branch_id === branchId)
          .filter((f) => f.stock_quantity === null || started);
        const count = chance(0.7) ? 1 : 2;
        for (const f of [...menu].sort(() => rand() - 0.5).slice(0, count)) {
          const qty = f.name.startsWith('Combo Couple') ? 1 : int(1, Math.max(1, Math.ceil(seats.length / 2)));
          items.push({ food: f, qty, subtotal: f.price * qty });
          foodSold.set(f.name, (foodSold.get(f.name) || 0) + qty);
        }
      }
      const foodTotal = items.reduce((s, i) => s + i.subtotal, 0);
      const original = ticketTotal + foodTotal;

      // Khuyến mãi chỉ cho đơn online, đúng thời hạn và điều kiện.
      let promo = null;
      if (online) {
        const candidates = [];
        const usable = (p) => p && created >= p.start && created <= p.end && original >= p.minOrder && (!p.branch_id || p.branch_id === branchId);
        if (usable(promos.FLASHSALE50) && flashLeft > 0 && chance(0.25)) candidates.push('FLASHSALE50');
        if (usable(promos.PTITSV15) && chance(0.3)) candidates.push('PTITSV15');
        if (usable(promos.MOVIEPTIT10) && chance(0.12)) candidates.push('MOVIEPTIT10');
        promo = candidates[0] || null;
        if (promo === 'FLASHSALE50') flashLeft--;
      }
      const p = promo ? promos[promo] : null;
      const discount = p ? Math.min(Math.round(original * p.pct / 100), p.max ?? Infinity) : 0;
      const total = original - discount;

      // Kết cục của đơn.
      let status = 'COMPLETED';
      const r = rand();
      if (online && r < 0.06) status = 'CANCELLED';
      else if (online && started && r < 0.075 && st.start - created > 6 * HOUR) status = 'REFUNDED';
      else if (online && started && r < 0.082 && st.start - created > 6 * HOUR) status = 'REJECTED';
      const method = online ? 'VNPAY' : chance(0.75) ? 'CASH' : 'VNPAY';
      const code = newCode(created);
      const paymentCreated = online ? new Date(created.getTime() + int(10, 50) * 1000) : created;
      const paidAt = status === 'CANCELLED' ? null
        : online || method === 'VNPAY' ? new Date(paymentCreated.getTime() + int(40, 220) * 1000) : created;
      const expiresAt = online || method !== 'CASH' ? new Date(created.getTime() + 6 * MIN) : null;
      const providerTxn = method === 'VNPAY' && paidAt ? String(txn++) : null;
      const refundRequestedAt = status === 'REFUNDED' || status === 'REJECTED'
        ? new Date(Math.min(paidAt.getTime() + between(0.5, 20) * HOUR, st.start - 2 * HOUR)) : null;
      const processor = managerOf(branchId) || admin;
      const processedAt = refundRequestedAt ? new Date(refundRequestedAt.getTime() + between(0.3, 1.5) * HOUR) : null;
      const bookingStatus = status === 'REJECTED' ? 'COMPLETED' : status;
      const linked = status === 'COMPLETED' || status === 'REJECTED';
      const updatedAt = processedAt || paidAt || expiresAt || created;

      script += `INSERT INTO bookings (booking_code, created_at, updated_at, discount_amount, expires_at, promotion_code, status, total_amount, showtime_id, booked_staff, user_id, promotion_usage_reserved, spending_recorded) VALUES (${q(code)}, ${q(created)}, ${q(updatedAt)}, ${discount}, ${q(expiresAt)}, ${q(promo && status !== 'CANCELLED' ? promo : null)}, ${q(bookingStatus)}, ${total}, ${st.id}, ${staff ? staff.id : 'NULL'}, ${user.id}, ${promo && status !== 'CANCELLED' ? 1 : 'NULL'}, ${linked ? 1 : 0});
SET @b := LAST_INSERT_ID();
INSERT INTO payments (booking_id, amount, payment_method, payment_status, provider_txn_id, paid_at, payment_created_at, refund_reason, refund_process_note, refund_processed_by, refund_processed_at, refunded_at, refund_amount, refund_gateway_status, refund_requested_at, created_at, updated_at) VALUES (@b, ${total}, ${q(status === 'CANCELLED' ? null : method)}, ${q(status === 'CANCELLED' ? 'CANCELLED' : status === 'REFUNDED' ? 'REFUNDED' : 'PAID')}, ${q(providerTxn)}, ${q(paidAt)}, ${q(paymentCreated)}, ${q(refundRequestedAt ? pick(REFUND_REASONS) : null)}, ${q(status === 'REFUNDED' ? 'Đã hoàn tiền qua VNPay.' : status === 'REJECTED' ? 'Suất chiếu đặc biệt có số ghế giới hạn, rạp không nhận hoàn vé cho đơn này.' : null)}, ${processedAt ? processor.id : 'NULL'}, ${q(processedAt)}, ${q(status === 'REFUNDED' ? processedAt : null)}, ${status === 'REFUNDED' ? total : 'NULL'}, ${q(status === 'REFUNDED' ? 'SUCCEEDED' : null)}, ${q(refundRequestedAt)}, ${q(paymentCreated)}, ${q(updatedAt)});\n`;
      if (items.length) {
        script += `INSERT INTO booking_foods (booking_id, food_id, quantity, unit_price, subtotal) VALUES ${items.map((i) => `(@b, ${i.food.id}, ${i.qty}, ${i.food.price}, ${i.subtotal})`).join(', ')};\n`;
      }

      // Vé: đơn bị hủy/hoàn đã trả ghế. Vé đã chiếu: phần lớn được soát, vài khách không đến.
      if (linked) {
        const show = started;
        const checkKind = !show ? 'none' : chance(0.86) ? 'all' : chance(0.3) ? 'partial' : 'none';
        const checker = show ? pick(counterStaff(branchId).length ? counterStaff(branchId) : [processor]) : null;
        // Soát vé trước giờ chiếu nhưng không sớm hơn lúc đơn được thanh toán (đơn quầy có thể mua sát/sau giờ chiếu).
        const readyAt = (paidAt || created).getTime() + int(1, 3) * MIN;
        const checkTime = new Date(Math.max(st.start.getTime() - int(5, 35) * MIN, readyAt));
        let checked = 0;
        seats.forEach((t, idx) => {
          const isChecked = checkKind === 'all' || (checkKind === 'partial' && idx < Math.max(1, seats.length - 1));
          const when = isChecked && checkTime <= NOW ? new Date(checkTime.getTime() + idx * 4000) : null;
          if (when) checked++;
          script += `UPDATE tickets SET booking_id=@b, ticket_status='BOOKED', qr_code=CONCAT('CINEMAHUB|BOOKING=', ${q(code)}, '|TICKET=', id, '|SEAT=', ${q(t.seat_code)}), checked_in_at=${q(when)}, checked_in_by=${when ? checker.id : 'NULL'} WHERE id=${t.id};\n`;
          // Soát từng vé: backend ghi nhật ký theo vé (TicketService, target Ticket).
          if (when && checkKind === 'partial') {
            script += `INSERT INTO audit_logs (action, actor_id, actor_role, actor_username, branch_id, created_at, details, target_id, target_type) VALUES ('TICKET_CHECKED_IN', ${checker.id}, ${q(checker.role)}, ${q(checker.username)}, ${branchId}, ${q(when)}, ${q(`Checked in ticket ${t.id} for booking ${code}`)}, ${t.id}, 'Ticket');\n`;
          }
        });
        if (checked > 0) {
          stats.checkedIn += checked;
          // Quét mã đơn: backend soát cả đơn và ghi một dòng nhật ký theo booking.
          if (checkKind === 'all') {
            script += `INSERT INTO audit_logs (action, actor_id, actor_role, actor_username, branch_id, created_at, details, target_id, target_type) VALUES ('TICKET_CHECKED_IN', ${checker.id}, ${q(checker.role)}, ${q(checker.username)}, ${branchId}, ${q(checkTime)}, ${q(`Checked in booking ${code} with ${seats.length} tickets`)}, @b, 'Booking');\n`;
          }
        }
        sold += seats.length;
        stats.tickets += seats.length;
      } else {
        // Ghế được trả lại cho đơn khác dùng.
        list.push(...seats);
      }
      if (staff) {
        stats.counter++;
        script += `INSERT INTO audit_logs (action, actor_id, actor_role, actor_username, branch_id, created_at, details, target_id, target_type) VALUES ('STAFF_BOOKING_CREATED', ${staff.id}, ${q(staff.role)}, ${q(staff.username)}, ${branchId}, ${q(created)}, ${q(`Staff booking ${code} created with ${seats.length} tickets`)}, @b, 'Booking');\n`;
      } else stats.online++;
      if (method === 'VNPAY' && paidAt) {
        for (const type of ['VNPAY_RETURN', 'VNPAY_IPN']) {
          script += `INSERT INTO payment_events (booking_id, event_type, reference, provider_txn_id, amount, response_code, transaction_status, valid_signature, outcome, message, created_at) VALUES (@b, '${type}', @b, ${q(providerTxn)}, ${total}, '00', '00', 1, '${type === 'VNPAY_IPN' ? '00' : '00'}', 'Confirm Success', ${q(new Date(paidAt.getTime() + (type === 'VNPAY_IPN' ? 2000 : 0)))});\n`;
        }
      }
      if (status === 'CANCELLED' && chance(0.4)) {
        script += `INSERT INTO payment_events (booking_id, event_type, reference, provider_txn_id, amount, response_code, transaction_status, valid_signature, outcome, message, created_at) VALUES (@b, 'VNPAY_RETURN', @b, NULL, ${total}, '24', '02', 1, '00', 'Khách hàng hủy giao dịch', ${q(new Date(paymentCreated.getTime() + 90 * 1000))});\n`;
      }
      if (status === 'REFUNDED') {
        script += `INSERT INTO payment_events (booking_id, event_type, reference, provider_txn_id, amount, response_code, transaction_status, valid_signature, outcome, message, created_at) VALUES (@b, 'REFUND_SUBMIT', ${q(`RF${providerTxn}`)}, ${q(String(txn++))}, ${total}, '00', '00', 1, 'SUCCEEDED', 'Hoàn tiền thành công', ${q(processedAt)});\n`;
        script += `INSERT INTO audit_logs (action, actor_id, actor_role, actor_username, branch_id, created_at, details, target_id, target_type) VALUES ('REFUND_APPROVED', ${processor.id}, ${q(processor.role)}, ${q(processor.username)}, ${processor.branch_id || 'NULL'}, ${q(processedAt)}, ${q(`Refund confirmed for ${code}`)}, @b, 'Booking');\n`;
      }
      if (status === 'REJECTED') {
        script += `INSERT INTO audit_logs (action, actor_id, actor_role, actor_username, branch_id, created_at, details, target_id, target_type) VALUES ('REFUND_REJECTED', ${processor.id}, ${q(processor.role)}, ${q(processor.username)}, ${processor.branch_id || 'NULL'}, ${q(processedAt)}, ${q(`Refund rejected for ${code}`)}, @b, 'Booking');\n`;
      }
      stats.bookings++;
      if (status === 'CANCELLED') stats.cancelled++;
      if (status === 'REFUNDED') stats.refunded++;
      if (status === 'REJECTED') stats.rejected++;
    }
  }

  // Một đơn thanh toán trễ: VNPay báo thành công sau khi đơn đã hết hạn, đang chờ hoàn tiền.
  const lateShow = showtimes.find((s) => s.start > new Date(NOW.getTime() + 20 * HOUR) && (ticketsByShow.get(s.id) || []).length > 10);
  if (lateShow) {
    const user = weighted(registered.filter((u) => !['user', 'user2'].includes(u.username)), (u) => customerWeight.get(u.id));
    const created = new Date(NOW.getTime() - 3 * HOUR);
    const code = newCode(created);
    const total = lateShow.price * 2;
    const paid = new Date(created.getTime() + 9 * MIN);
    const ref = String(txn++);
    script += `INSERT INTO bookings (booking_code, created_at, updated_at, discount_amount, expires_at, promotion_code, status, total_amount, showtime_id, booked_staff, user_id, promotion_usage_reserved, spending_recorded) VALUES (${q(code)}, ${q(created)}, ${q(paid)}, 0, ${q(new Date(created.getTime() + 6 * MIN))}, NULL, 'REFUND_REQUESTED', ${total}, ${lateShow.id}, NULL, ${user.id}, NULL, 0);
SET @b := LAST_INSERT_ID();
INSERT INTO payments (booking_id, amount, payment_method, payment_status, provider_txn_id, paid_at, payment_created_at, refund_reason, refund_amount, refund_requested_at, created_at, updated_at) VALUES (@b, ${total}, 'VNPAY', 'PAID', ${q(ref)}, ${q(paid)}, ${q(new Date(created.getTime() + 30000))}, ${q(LATE_PAYMENT_REASON)}, ${total}, ${q(paid)}, ${q(created)}, ${q(paid)});
INSERT INTO payment_events (booking_id, event_type, reference, provider_txn_id, amount, response_code, transaction_status, valid_signature, outcome, message, created_at) VALUES (@b, 'VNPAY_IPN', @b, ${q(ref)}, ${total}, '00', '00', 1, '00', 'Thanh toán đến sau khi đơn hết hạn giữ ghế', ${q(paid)});
INSERT INTO notifications (branch_id, created_at, message, recipient_role, recipient_user_id, target_id, target_type, title, type) VALUES (NULL, ${q(paid)}, ${q(`Đơn ${code} có yêu cầu hoàn tiền cần xử lý.`)}, 'ADMIN', NULL, @b, 'Booking', 'Yêu cầu hoàn tiền mới', 'REFUND_REQUEST'), (${lateShow.branch_id}, ${q(paid)}, ${q(`Đơn ${code} có yêu cầu hoàn tiền cần xử lý.`)}, 'MANAGER', NULL, @b, 'Booking', 'Yêu cầu hoàn tiền mới', 'REFUND_REQUEST');\n`;
  }

  // Lượt khuyến mãi đã dùng khớp với số đơn đã giữ lượt.
  script += `UPDATE promotions p SET used_count = (SELECT COUNT(*) FROM bookings b WHERE b.promotion_code=p.code AND b.promotion_usage_reserved=1) + IF(p.code='HALLOWEEN25', 87, 0) WHERE p.code IN ('MOVIEPTIT10','PTITSV15','FLASHSALE50','HALLOWEEN25');\n`;
  script += 'COMMIT;\n';
  runSqlScript(script);
  log(`Đơn mới: ${stats.bookings} (online ${stats.online}, quầy ${stats.counter}); vé ${stats.tickets}; đã soát ${stats.checkedIn}; hủy ${stats.cancelled}; hoàn ${stats.refunded}; từ chối hoàn ${stats.rejected}`);
  log(`Bắp nước đã bán: ${[...foodSold].map(([n, c]) => `${n} ${c}`).join(', ')}`);
}

// Trọng số chọn khách: vài khách quen đặt nhiều, đa số chỉ vài lần (đã mô phỏng để ra cơ cấu hạng hợp lý).
const customerWeightAt = (i) => Math.pow(i + 15, -1.1);
const guestWeightAt = (i) => Math.pow(i + 5, -0.2);

/**
 * Chia lại đơn do script sinh cho nhiều khách hơn khi số khách quá ít so với số đơn
 * (hạng Bạch Kim quá đông). Không đụng đơn cũ, đơn của user/user2, đơn có thông báo riêng,
 * đơn vừa yêu cầu hoàn qua API, và giữ một đơn đã soát vé cho mỗi cặp khách–phim đã đánh giá.
 */
function rebalanceCustomers() {
  const tiers = sql("SELECT SUM(membership_tier='PLATINUM') p, COUNT(*) n FROM users WHERE role='USER' AND total_spending > 0")[0];
  if (Number(tiers.p) <= Number(tiers.n) * 0.15) return;
  const registered = sql("SELECT id FROM users WHERE role='USER' AND status='ACTIVE' AND username NOT LIKE 'guest\\_%' AND username NOT IN ('user','user2') ORDER BY id");
  const guests = sql("SELECT id FROM users WHERE username LIKE 'guest\\_%' ORDER BY id");
  const regWeights = new Map(registered.map((u, i) => [u.id, customerWeightAt(i)]));
  const guestWeights = new Map(guests.map((u, i) => [u.id, guestWeightAt(i)]));
  const movable = sql(`SELECT b.id, (u.username LIKE 'guest\\_%') is_guest FROM bookings b JOIN users u ON u.id=b.user_id
    WHERE b.booking_code LIKE 'BK-%' AND b.status NOT IN ('PENDING','REFUND_REQUESTED') AND u.username NOT IN ('user','user2')
      AND b.id NOT IN (SELECT CAST(target_id AS UNSIGNED) FROM notifications WHERE target_type='Booking' AND target_id REGEXP '^[0-9]+$')
      AND b.id NOT IN (
        SELECT keep_id FROM (
          SELECT MIN(b2.id) keep_id FROM movie_ratings r
          JOIN bookings b2 ON b2.user_id=r.user_id JOIN showtimes s2 ON s2.id=b2.showtime_id AND s2.movie_id=r.movie_id
          JOIN tickets t2 ON t2.booking_id=b2.id AND t2.checked_in_at IS NOT NULL
          GROUP BY r.user_id, r.movie_id) k)`);
  let script = 'START TRANSACTION;\n';
  for (const b of movable) {
    const user = b.is_guest === '1' ? weighted(guests, (u) => guestWeights.get(u.id)) : weighted(registered, (u) => regWeights.get(u.id));
    script += `UPDATE bookings SET user_id=${user.id} WHERE id=${b.id};\n`;
  }
  runSqlScript(`${script}COMMIT;\n`);
  log(`Chia lại ${movable.length} đơn cho ${registered.length} khách đăng ký và ${guests.length} khách vãng lai`);
}

// ───────────────────────── 9. Chi tiêu và hạng thành viên ─────────────────────────
function recomputeSpending() {
  runSqlScript(`START TRANSACTION;
UPDATE users u SET total_spending = (
  SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b WHERE b.user_id=u.id AND b.spending_recorded=1
) WHERE u.role='USER';
UPDATE users SET membership_tier = CASE
  WHEN total_spending >= 5000000 THEN 'PLATINUM'
  WHEN total_spending >= 2000000 THEN 'GOLD'
  WHEN total_spending >= 500000 THEN 'SILVER'
  ELSE 'BRONZE' END WHERE role='USER';
COMMIT;`);
  const tiers = sql("SELECT membership_tier, COUNT(*) n FROM users WHERE role='USER' GROUP BY membership_tier");
  log(`Hạng thành viên: ${tiers.map((t) => `${t.membership_tier} ${t.n}`).join(', ')}`);
}

// ───────────────────────── 10. Luồng qua API ─────────────────────────
const RATING_COMMENTS = {
  'Dune: Part Two': [[5, 'Hình ảnh và âm thanh choáng ngợp, xem IMAX rất đáng tiền.'], [5, 'Phần hai hay hơn phần một, đoạn cưỡi sâu cát nổi da gà.'], [4, 'Phim dài nhưng không thấy chán, nhạc nền quá đỉnh.'], [4, 'Cốt truyện hơi nặng với người chưa xem phần một.']],
  'Lật Mặt 7: Một Điều Ước': [[5, 'Xem mà khóc cả rạp, thương bà mẹ quá.'], [5, 'Phim gia đình ý nghĩa, nên dẫn bố mẹ đi xem.'], [4, 'Cảm động, có vài đoạn hơi dài.'], [4, 'Diễn viên lớn tuổi diễn rất tự nhiên.']],
  Mai: [[5, 'Trấn Thành làm phim ngày càng chắc tay.'], [4, 'Diễn xuất của Phương Anh Đào rất ấn tượng.'], [4, 'Câu chuyện đời thường, chạm cảm xúc.'], [3, 'Phim hay nhưng nhịp hơi chậm ở giữa.']],
  'Deadpool & Wolverine': [[5, 'Cười không nhặt được mồm, fan Marvel phải xem.'], [4, 'Hành động đã mắt, nhiều cameo bất ngờ.'], [4, 'Xem 4DX rung lắc rất vui.'], [3, 'Hài nhưng hơi nhiều chi tiết chỉ fan mới hiểu.']],
  'Inside Out 2': [[5, 'Dễ thương và sâu sắc, hợp cả trẻ con lẫn người lớn.'], [5, 'Nhân vật Lo Âu quá thật.'], [4, 'Dẫn em đi xem, cả nhà đều thích.']],
  'Kung Fu Panda 4': [[4, 'Vui, hợp đi xem với trẻ nhỏ.'], [3, 'Giải trí nhẹ nhàng, không bằng các phần trước.'], [4, 'Po vẫn đáng yêu như ngày nào.']],
};

async function seedApiFlows(adminToken) {
  // 10a. Đánh giá phim từ khách đã xem.
  if (Number(sql('SELECT COUNT(*) n FROM movie_ratings')[0].n) < 10) {
    const watched = sql(`SELECT DISTINCT u.username, m.id movie_id, m.movie_name FROM bookings b
      JOIN users u ON u.id=b.user_id JOIN showtimes s ON s.id=b.showtime_id JOIN movies m ON m.id=s.movie_id
      JOIN tickets t ON t.booking_id=b.id AND t.checked_in_at IS NOT NULL
      WHERE u.role='USER' AND u.status='ACTIVE' AND u.username NOT LIKE 'guest\\_%' AND u.username NOT IN ('user','user2')`);
    let rated = 0;
    const seen = new Set();
    for (const w of watched.sort(() => rand() - 0.5)) {
      const key = `${w.username}|${w.movie_id}`;
      if (seen.has(key) || !RATING_COMMENTS[w.movie_name] || !chance(0.45)) continue;
      seen.add(key);
      const [score, comment] = pick(RATING_COMMENTS[w.movie_name]);
      try {
        const token = await login(w.username, `${w.username}@123`);
        await api('POST', `/movie/${w.movie_id}/rating`, { token, body: { score, comment: chance(0.85) ? comment : '' } });
        rated++;
      } catch (e) {
        log(`  Bỏ qua đánh giá ${w.username}: ${e.message}`);
      }
      if (rated >= 45) break;
    }
    log(`Đánh giá phim: ${rated}`);
  }

  // 10b. Yêu cầu hoàn tiền (khách gửi qua API → thông báo cho quản lý chi nhánh và admin).
  if (Number(sql("SELECT COUNT(*) n FROM bookings WHERE status='REFUND_REQUESTED' AND booking_code LIKE 'BK-%'")[0].n) < 3) {
    const eligible = sql(`SELECT b.id, b.booking_code, u.username, p.payment_method FROM bookings b JOIN users u ON u.id=b.user_id JOIN payments p ON p.booking_id=b.id JOIN showtimes s ON s.id=b.showtime_id
      WHERE b.status='COMPLETED' AND p.payment_status='PAID' AND p.paid_at > ${q(new Date(NOW - 20 * HOUR))} AND s.start_time > ${q(new Date(NOW.getTime() + 3 * HOUR))}
        AND u.username NOT LIKE 'guest\\_%' AND u.username NOT IN ('user','user2') AND u.status='ACTIVE' AND p.refund_processed_at IS NULL
      ORDER BY b.id`);
    // Đơn sinh bằng SQL có mã giao dịch VNPay giả: duyệt hoàn sẽ gọi sandbox và kẹt ở UNKNOWN.
    // Vì vậy yêu cầu chờ duyệt dùng đơn tiền mặt (rạp xác nhận hoàn tại quầy); đơn VNPay chỉ dùng cho ca bị từ chối,
    // vì từ chối không gọi cổng thanh toán.
    const cash = eligible.filter((b) => b.payment_method === 'CASH').slice(0, 4);
    const vnpay = eligible.filter((b) => b.payment_method === 'VNPAY').slice(0, 1);
    for (const b of [...cash, ...vnpay]) {
      try {
        const token = await login(b.username, `${b.username}@123`);
        await api('POST', `/booking/${b.id}/refund-request`, { token, body: { reason: pick(REFUND_REASONS) } });
      } catch (e) {
        log(`  Bỏ qua yêu cầu hoàn ${b.booking_code}: ${e.message}`);
      }
    }
    // Một đơn tiền mặt đã hoàn tại quầy, một yêu cầu VNPay bị từ chối, các đơn tiền mặt còn lại chờ duyệt.
    if (cash[0]) await api('POST', `/booking/${cash[0].id}/refund-process`, { token: adminToken, body: { approved: true, note: 'Khách đã nhận lại tiền mặt tại quầy.' } }).catch((e) => log(`  ${e.message}`));
    if (vnpay[0]) await api('POST', `/booking/${vnpay[0].id}/refund-process`,{ token: adminToken, body: { approved: false, note: 'Suất chiếu sớm có số ghế giới hạn, rạp không nhận hoàn vé.' } }).catch((e) => log(`  ${e.message}`));
    log(`Yêu cầu hoàn tiền mới: ${vnpay.length + cash.length}`);
  }

  // 10c. Đơn chờ thanh toán (giữ ghế thật trong Redis, tự hết hạn sau booking.holdMinutes).
  // Chỉ tạo một lần: đơn chờ hết hạn thành CANCELLED nên kiểm tra các đơn gần đây.
  if (Number(sql("SELECT COUNT(*) n FROM bookings WHERE status IN ('PENDING','CANCELLED') AND created_at > NOW() - INTERVAL 6 HOUR")[0].n) > 0) return;
  const upcoming = sql(`SELECT s.id, r.branch_id FROM showtimes s JOIN rooms r ON r.id=s.room_id
    WHERE s.status='OPEN' AND s.start_time BETWEEN ${q(new Date(NOW.getTime() + 2 * HOUR))} AND ${q(new Date(NOW.getTime() + 30 * HOUR))}
    ORDER BY s.start_time LIMIT 20`);
  const buyers = sql(`SELECT username FROM users WHERE role='USER' AND status='ACTIVE' AND username NOT LIKE 'guest\\_%' AND username NOT IN ('user','user2') ORDER BY id DESC LIMIT 3`);
  for (const [i, buyer] of buyers.entries()) {
    const show = upcoming[i * 3];
    if (!show) break;
    const seats = sql(`SELECT seat_id FROM tickets WHERE showtime_id=${show.id} AND booking_id IS NULL AND ticket_status='AVAILABLE' ORDER BY seat_id DESC LIMIT 2`).map((t) => Number(t.seat_id));
    const food = sql(`SELECT id FROM foods WHERE active=1 AND (branch_id IS NULL OR branch_id=${show.branch_id}) AND (stock_quantity IS NULL OR stock_quantity>0) ORDER BY (branch_id IS NULL), id LIMIT 1`)[0];
    try {
      const token = await login(buyer.username, `${buyer.username}@123`);
      const booking = await api('POST', '/booking', {
        token,
        body: { showtimeId: Number(show.id), seatIds: seats, foods: food ? [{ foodId: Number(food.id), quantity: 1 }] : [], promotionCode: i === 1 ? 'MOVIEPTIT10' : null },
      });
      if (i === 2) await api('DELETE', `/booking/${booking.bookingId}`, { token });
    } catch (e) {
      log(`  Bỏ qua đơn chờ của ${buyer.username}: ${e.message}`);
    }
  }
  log('Đã tạo đơn chờ thanh toán qua API (tự hết hạn sau vài phút) và một đơn khách tự hủy');
}

// ───────────────────────── 11. Thông báo ─────────────────────────
function seedNotifications() {
  if (Number(sql("SELECT COUNT(*) n FROM notifications WHERE type IN ('SYSTEM','PROMOTION','BOOKING_STATUS')")[0].n) > 0) return;
  const hg = sql("SELECT r.id room_id, b.id branch_id FROM rooms r JOIN branches b ON b.id=r.branch_id WHERE b.branch_code='CN-HN-01' AND r.code='R04'")[0];
  const sh = sql("SELECT id FROM branches WHERE branch_code='CN-DN-01'")[0];
  const decided = sql(`SELECT b.id, b.booking_code, b.user_id, b.status, p.refund_processed_at FROM bookings b JOIN payments p ON p.booking_id=b.id
    WHERE p.refund_processed_at IS NOT NULL AND b.booking_code LIKE 'BK-%' ORDER BY p.refund_processed_at DESC LIMIT 6`);
  const rows = [
    [null, new Date(NOW - 2 * DAY), 'Phòng Standard 2 tại MoviePTIT Hồ Gươm tạm ngừng để bảo trì hệ thống âm thanh đến hết tháng 11.', 'ADMIN', null, hg?.room_id, 'Room', 'Phòng chiếu chuyển sang bảo trì', 'SYSTEM'],
    [hg?.branch_id, new Date(NOW - 2 * DAY), 'Phòng Standard 2 tạm ngừng bán vé để bảo trì. Vui lòng hướng dẫn khách sang các phòng khác.', 'MANAGER', null, hg?.room_id, 'Room', 'Phòng chiếu chuyển sang bảo trì', 'SYSTEM'],
    [hg?.branch_id, new Date(NOW - 2 * DAY + HOUR), 'Phòng Standard 2 đang bảo trì, không xếp khách vào phòng này.', 'STAFF', null, hg?.room_id, 'Room', 'Thông báo bảo trì phòng', 'SYSTEM'],
    [sh?.id, new Date(NOW - 5 * HOUR), 'Một suất 4DX ngày tới bị hủy do bảo trì ghế chuyển động. Hỗ trợ khách đổi suất nếu có thắc mắc.', 'MANAGER', null, null, 'Showtime', 'Hủy suất chiếu 4DX', 'SYSTEM'],
    [null, new Date(NOW - DAY), 'Black Friday 27–30/11: giảm 30% (tối đa 70.000 đ) với mã BLACKFRIDAY30.', 'USER', null, 'BLACKFRIDAY30', 'Promotion', 'Sắp có ưu đãi Black Friday', 'PROMOTION'],
    [null, new Date(NOW - 6 * DAY), 'Sinh viên PTIT giảm 15% tại MoviePTIT Hồ Gươm với mã PTITSV15.', 'USER', null, 'PTITSV15', 'Promotion', 'Ưu đãi cho sinh viên PTIT', 'PROMOTION'],
    ...decided.map((d) => [null, parseDb(d.refund_processed_at), d.status === 'REFUNDED'
      ? `Yêu cầu hoàn tiền đơn ${d.booking_code} đã được duyệt. Tiền sẽ về tài khoản đã thanh toán trong 1–3 ngày làm việc.`
      : `Yêu cầu hoàn tiền đơn ${d.booking_code} không được chấp nhận. Vé vẫn dùng được bình thường.`, null, d.user_id, d.id, 'Booking',
      d.status === 'REFUNDED' ? 'Hoàn tiền thành công' : 'Yêu cầu hoàn tiền bị từ chối', 'BOOKING_STATUS']),
  ];
  const values = rows.map((r) => `(${q(r[0])}, ${q(r[1])}, ${q(r[2])}, ${q(r[3])}, ${q(r[4])}, ${q(r[5] == null ? null : String(r[5]))}, ${q(r[6])}, ${q(r[7])}, ${q(r[8])})`).join(',\n');
  const admin = sql("SELECT id FROM users WHERE username='admin'")[0];
  runSqlScript(`START TRANSACTION;
INSERT INTO notifications (branch_id, created_at, message, recipient_role, recipient_user_id, target_id, target_type, title, type) VALUES
${values};
-- Admin đã đọc các thông báo hệ thống cũ hơn một ngày.
INSERT INTO notification_reads (notification_id, user_id, read_at)
  SELECT n.id, ${admin.id}, n.created_at + INTERVAL 2 HOUR FROM notifications n
  WHERE n.recipient_role='ADMIN' AND n.created_at < NOW() - INTERVAL 1 DAY
    AND NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id=n.id AND r.user_id=${admin.id});
COMMIT;`);
  log(`Thông báo: ${sql('SELECT COUNT(*) n FROM notifications')[0].n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

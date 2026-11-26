/** Chuẩn hóa chuỗi để tìm kiếm: chữ thường, bỏ dấu, đ thành d. */
export function normalizeSearch(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

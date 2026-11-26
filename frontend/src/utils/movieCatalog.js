/**
 * Tham số cho GET /movie/catalog từ bộ lọc của trang danh sách phim.
 * Giá trị 'ALL' hay chuỗi rỗng nghĩa là không lọc theo trường đó.
 */
export function buildCatalogQuery({ search, status, genre, age, sort, page, size }) {
  const query = { sort, page, size };
  const keyword = search?.trim();
  if (keyword) query.movieName = keyword;
  if (status && status !== 'ALL') query.status = status;
  if (genre != null && genre !== 'ALL') query.genreId = genre;
  if (age && age !== 'ALL') query.ageRating = age;
  return query;
}

/** Ghép trang đánh giá mới vào danh sách đang hiện, bỏ bản trùng nếu có người vừa đánh giá. */
export function appendReviews(current, incoming) {
  const seen = new Set(current.map((review) => review.userId));
  return [...current, ...incoming.filter((review) => !seen.has(review.userId))];
}

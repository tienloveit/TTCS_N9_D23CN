// Danh mục phân loại phim theo độ tuổi, dùng chung cho quản trị, trang khách và quầy vé.
export const AGE_RATINGS = [
  { code: 'P', option: 'P - Mọi độ tuổi', description: 'Phim dành cho mọi lứa tuổi' },
  { code: 'K', option: 'K - Có người giám hộ', description: 'Khán giả dưới 13 tuổi cần xem cùng cha mẹ hoặc người giám hộ' },
  { code: 'T13', option: 'T13 - Từ 13 tuổi', description: 'Phim dành cho khán giả từ đủ 13 tuổi' },
  { code: 'T16', option: 'T16 - Từ 16 tuổi', description: 'Phim dành cho khán giả từ đủ 16 tuổi' },
  { code: 'T18', option: 'T18 - Từ 18 tuổi', description: 'Phim dành cho khán giả từ đủ 18 tuổi' },
];

// Hiển thị khi phim chưa có phân loại. Không tự điền "P" vì sẽ bị hiểu là phim cho mọi độ tuổi.
export const AGE_RATING_UNKNOWN = 'Chưa cập nhật';

const AGE_RATING_LABELS = Object.fromEntries(AGE_RATINGS.map((rating) => [rating.code, rating.description]));

/** Mô tả đầy đủ của mã phân loại ("T13" → "Phim dành cho khán giả từ đủ 13 tuổi"), dùng cho chữ ẩn và title. */
export const getAgeRatingLabel = (ageRating) => {
  const code = String(ageRating || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return AGE_RATING_LABELS[code] || `Phân loại ${ageRating}`;
};

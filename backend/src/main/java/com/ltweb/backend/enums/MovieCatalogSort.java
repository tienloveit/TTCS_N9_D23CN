package com.ltweb.backend.enums;

/** Thứ tự sắp xếp của danh mục phim công khai. */
public enum MovieCatalogSort {
  /** Theo thứ tự thêm phim. */
  DEFAULT,
  /** Điểm đánh giá trung bình cao nhất trước, phim chưa có đánh giá tính là 0. */
  RATING,
  /** Ngày khởi chiếu mới nhất trước. */
  NEWEST,
  /** Thời lượng dài nhất trước. */
  DURATION
}

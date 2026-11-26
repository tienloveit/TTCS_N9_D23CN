package com.ltweb.backend.repository;

/** Điểm trung bình và số lượt đánh giá của một phim, đọc gộp cho nhiều phim trong một truy vấn. */
public interface MovieRatingStats {
  Long getMovieId();

  Double getAverage();

  Long getTotal();
}

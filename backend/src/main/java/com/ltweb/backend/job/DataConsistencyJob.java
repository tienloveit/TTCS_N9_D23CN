package com.ltweb.backend.job;

import com.ltweb.backend.enums.MembershipTier;
import com.ltweb.backend.repository.MovieRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Giữ các giá trị dẫn xuất khớp với dữ liệu gốc. */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataConsistencyJob {
  private static final int SAMPLE_SIZE = 10;

  /**
   * Tổng chi tiêu đúng của một khách: các đơn đã được cộng (spending_recorded = TRUE), cộng các đơn
   * cũ chưa có cờ nhưng đã thanh toán và chưa hoàn. Đơn hoàn tiền hoặc thanh toán trễ có cờ FALSE.
   */
  static final String SPENDING_MISMATCH_SQL =
      """
      SELECT u.id, u.username, COALESCE(u.total_spending, 0) AS recorded,
             COALESCE(e.expected, 0) AS expected, u.membership_tier
      FROM users u
      LEFT JOIN (
        SELECT b.user_id, SUM(b.total_amount) AS expected
        FROM bookings b JOIN payments p ON p.booking_id = b.id
        WHERE b.spending_recorded = TRUE
           OR (b.spending_recorded IS NULL AND p.payment_status = 'PAID'
               AND b.status IN ('COMPLETED', 'REFUND_REQUESTED'))
        GROUP BY b.user_id
      ) e ON e.user_id = u.id
      WHERE COALESCE(u.total_spending, 0) <> COALESCE(e.expected, 0)
      ORDER BY u.id
      """;

  private final Clock clock;
  private final MovieRepository movieRepository;
  private final JdbcTemplate jdbcTemplate;

  /**
   * Trạng thái phim theo ngày công chiếu/kết thúc. Chỉ đi tới (UPCOMING → NOW_SHOWING → ENDED) và
   * chỉ với phim có ngày, nên không lật ngược quyết định thủ công như cho phim ngừng chiếu sớm.
   */
  @Scheduled(initialDelay = 60_000, fixedDelay = 3_600_000)
  @Transactional
  public void syncMovieStatuses() {
    LocalDate today = LocalDate.now(clock);
    int started = movieRepository.startShowing(today);
    int ended = movieRepository.finishShowing(today);
    if (started + ended > 0) {
      log.info("Movie status sync: {} now showing, {} ended", started, ended);
    }
  }

  /**
   * Đối soát tổng chi tiêu và hạng thành viên mỗi đêm. Chỉ ghi log: tự sửa có thể làm hạng của
   * khách đổi ngoài dự kiến, nên người vận hành xem log rồi quyết định.
   */
  @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Ho_Chi_Minh")
  @Transactional(readOnly = true)
  public void reconcileSpending() {
    List<Map<String, Object>> mismatches = jdbcTemplate.queryForList(SPENDING_MISMATCH_SQL);
    long tierMismatches =
        jdbcTemplate
            .queryForList(
                "SELECT COALESCE(total_spending, 0) AS spending, membership_tier FROM users")
            .stream()
            .filter(row -> !tierMatches(row))
            .count();
    if (mismatches.isEmpty() && tierMismatches == 0) {
      log.info("Spending reconciliation: all customers consistent");
      return;
    }
    log.warn(
        "Spending reconciliation: {} customers with spending mismatch, {} with tier mismatch."
            + " Sample: {}",
        mismatches.size(),
        tierMismatches,
        mismatches.stream().limit(SAMPLE_SIZE).toList());
  }

  private static boolean tierMatches(Map<String, Object> row) {
    Object tier = row.get("membership_tier");
    if (tier == null) return true; // Chưa từng thanh toán: hạng mặc định.
    BigDecimal spending = new BigDecimal(String.valueOf(row.get("spending")));
    return MembershipTier.fromSpending(spending).name().equals(String.valueOf(tier));
  }
}

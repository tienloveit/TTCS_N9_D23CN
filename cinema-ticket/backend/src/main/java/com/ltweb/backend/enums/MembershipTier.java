package com.ltweb.backend.enums;

import java.math.BigDecimal;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MembershipTier {
    BRONZE("Đồng", BigDecimal.ZERO),
    SILVER("Bạc", new BigDecimal("500000")),
    GOLD("Vàng", new BigDecimal("2000000")),
    PLATINUM("Bạch Kim", new BigDecimal("5000000"));

    private final String displayName;
    private final BigDecimal minSpending;

    public static MembershipTier fromSpending(BigDecimal totalSpending) {
        MembershipTier result = BRONZE;
        for (MembershipTier tier : values()) {
            if (totalSpending.compareTo(tier.minSpending) >= 0) {
                result = tier;
            }
        }
        return result;
    }
}

package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateSeatTypePrice;
import com.ltweb.backend.dto.request.UpdateSeatTypePrice;
import com.ltweb.backend.dto.response.SeatTypePriceResponse;
import com.ltweb.backend.entity.SeatTypePrice;
import com.ltweb.backend.enums.SeatType;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.SeatTypePriceRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SeatTypePriceService {

  private final SeatTypePriceRepository seatTypePriceRepository;

  public List<SeatTypePriceResponse> getAllPrice() {
    return seatTypePriceRepository.findAll().stream()
        .map(
            seat ->
                SeatTypePriceResponse.builder()
                    .seatType(seat.getSeatType())
                    .id(seat.getId())
                    .price(seat.getPrice())
                    .build())
        .toList();
  }

  public SeatTypePriceResponse createPrice(CreateSeatTypePrice cre) {
    if (seatTypePriceRepository.existsBySeatType(cre.getSeatType())) {
      throw new AppException(ErrorCode.SEATTYPE_EXIST);
    }

    SeatTypePrice s =
        SeatTypePrice.builder().seatType(cre.getSeatType()).price(cre.getPrice()).build();

    seatTypePriceRepository.save(s);

    return SeatTypePriceResponse.builder()
        .id(s.getId())
        .seatType(s.getSeatType())
        .price(s.getPrice())
        .build();
  }

  public SeatTypePriceResponse update(SeatType seatType, UpdateSeatTypePrice up) {
    SeatTypePrice s =
        seatTypePriceRepository
            .findBySeatType(seatType)
            .orElseThrow(() -> new AppException(ErrorCode.SEATTYPE_NOT_EXIST));

    s.setPrice(up.getPrice());

    seatTypePriceRepository.save(s);

    return SeatTypePriceResponse.builder()
        .id(s.getId())
        .seatType(s.getSeatType())
        .price(s.getPrice())
        .build();
  }
}

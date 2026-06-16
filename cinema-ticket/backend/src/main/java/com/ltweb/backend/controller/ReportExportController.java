package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.OperationsReportResponse;
import com.ltweb.backend.dto.response.RevenueReportResponse;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.service.OperationsReportService;
import com.ltweb.backend.service.RevenueReportService;
import com.ltweb.backend.service.XlsxExportService;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/reports/export")
@RequiredArgsConstructor
public class ReportExportController {
    private static final MediaType XLSX_MEDIA_TYPE = MediaType
            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final RevenueReportService revenueReportService;
    private final OperationsReportService operationsReportService;
    private final XlsxExportService xlsxExportService;

    @GetMapping("/revenue.xlsx")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<byte[]> exportRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long staffId,
            @RequestParam(required = false) PaymentMethod paymentMethod) {
        RevenueReportResponse report = revenueReportService.getReport(from, to, branchId, movieId, staffId,
                paymentMethod);
        List<List<String>> rows = new ArrayList<>();
        rows.add(List.of("Thoi gian", "Ma don", "Chi nhanh", "Phim", "Nhan vien", "Thanh toan", "Ve", "Bap nuoc",
                "Tong"));
        report.getRows().forEach(row -> rows.add(List.of(
                text(row.getPaidAt()),
                text(row.getBookingCode()),
                text(row.getBranchName()),
                text(row.getMovieName()),
                text(row.getStaffUsername()),
                text(row.getPaymentMethod()),
                text(row.getTicketAmount()),
                text(row.getFoodAmount()),
                text(row.getTotalAmount()))));
        return xlsx("revenue-report.xlsx", xlsxExportService.singleSheet("Revenue", rows));
    }

    @GetMapping("/operations.xlsx")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<byte[]> exportOperations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long branchId) {
        OperationsReportResponse report = operationsReportService.getDailyReport(date, branchId);
        List<List<String>> rows = new ArrayList<>();
        rows.add(List.of("Bao cao van hanh", text(report.getReportDate()), text(report.getBranchName())));
        rows.add(List.of());
        rows.add(List.of("Chi so", "Gia tri"));
        var summary = report.getSummary();
        rows.add(List.of("Doanh thu", text(summary.getRevenue())));
        rows.add(List.of("Doanh thu ve", text(summary.getTicketRevenue())));
        rows.add(List.of("Doanh thu bap nuoc", text(summary.getFoodRevenue())));
        rows.add(List.of("Tien mat du kien", text(summary.getExpectedCash())));
        rows.add(List.of("Chenh lech tien mat", text(summary.getCashDifference())));
        rows.add(List.of("Don hoan tat", text(summary.getCompletedBookings())));
        rows.add(List.of("Yeu cau hoan tien", text(summary.getRefundRequests())));
        rows.add(List.of("Hang sap het", text(summary.getLowStockItems())));
        rows.add(List.of());
        rows.add(List.of("Ca lam", "Nhan vien", "Mo ca", "Dong ca", "Tien du kien", "Chenh lech"));
        report.getStaffShifts().forEach(shift -> rows.add(List.of(
                text(shift.getShiftId()),
                text(shift.getStaffName()),
                text(shift.getOpenedAt()),
                text(shift.getClosedAt()),
                text(shift.getExpectedCash()),
                text(shift.getCashDifference()))));
        rows.add(List.of());
        rows.add(List.of("Ton kho can nhap", "Ton", "Nguong"));
        report.getLowStockFoods().forEach(food -> rows.add(List.of(
                text(food.getFoodName()),
                text(food.getStockQuantity()),
                text(food.getLowStockThreshold()))));
        return xlsx("operations-report.xlsx", xlsxExportService.singleSheet("Operations", rows));
    }

    private ResponseEntity<byte[]> xlsx(String filename, byte[] bytes) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(XLSX_MEDIA_TYPE);
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(bytes.length);
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    private String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}

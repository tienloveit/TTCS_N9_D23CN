package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.StaffBookingRequest;
import com.ltweb.backend.dto.response.StaffCustomerLookupResponse;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.UserRepository;
import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Tìm hoặc tạo khách cho đơn bán tại quầy.
 *
 * <p>Email/SĐT trùng một tài khoản có sẵn thì nhân viên phải xác nhận đúng người (gửi lại {@code
 * confirmedCustomerId} lấy từ {@link #lookup}). Nếu không, một lần gõ nhầm sẽ gắn đơn, chi tiêu và
 * email vé có QR vào tài khoản của người khác.
 */
@Service
@RequiredArgsConstructor
public class StaffCustomerService {
  static final String GUEST_PREFIX = "guest_";
  private static final Pattern PHONE = Pattern.compile("^0\\d{9}$");
  private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public StaffCustomerLookupResponse lookup(String email, String phone) {
    Contact contact = Contact.of(email, phone);
    Optional<User> match = findMatch(contact);
    if (match.isEmpty()) {
      return StaffCustomerLookupResponse.builder()
          .matched(false)
          .normalizedEmail(contact.email())
          .normalizedPhone(contact.phone())
          .build();
    }
    User user = match.get();
    requireEligible(user);
    boolean guest = isGuest(user);
    return StaffCustomerLookupResponse.builder()
        .matched(true)
        .customerId(user.getId())
        .maskedName(
            guest && "Walk-in Customer".equals(user.getFullName())
                ? null
                : maskName(user.getFullName()))
        .maskedEmail(maskEmail(user.getEmail()))
        .maskedPhone(maskPhone(user.getPhoneNumber()))
        .membershipTier(
            user.getMembershipTier() == null ? null : user.getMembershipTier().getDisplayName())
        .guestAccount(guest)
        .normalizedEmail(contact.email())
        .normalizedPhone(contact.phone())
        .build();
  }

  public User getOrCreateStaffCustomer(StaffBookingRequest request) {
    Contact contact = Contact.of(request.getCustomerEmail(), request.getCustomerPhone());
    String fullName = trimToNull(request.getCustomerName());

    Optional<User> match = findMatch(contact);
    if (match.isPresent()) {
      User user = match.get();
      requireEligible(user);
      if (!Objects.equals(user.getId(), request.getConfirmedCustomerId())) {
        throw new AppException(ErrorCode.CUSTOMER_CONFIRMATION_REQUIRED);
      }
      return user;
    }

    User customer =
        User.builder()
            .username(generateGuestUsername(contact.email(), contact.phone()))
            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
            .fullName(fullName == null ? "Walk-in Customer" : fullName)
            .email(contact.email())
            .phoneNumber(contact.phone())
            .role(UserRole.USER)
            .status(UserStatus.ACTIVE)
            .build();
    return userRepository.save(customer);
  }

  /** Email và SĐT trỏ tới hai tài khoản khác nhau thì không đoán, báo nhân viên kiểm tra lại. */
  private Optional<User> findMatch(Contact contact) {
    Optional<User> byEmail =
        contact.email() == null ? Optional.empty() : userRepository.findByEmail(contact.email());
    Optional<User> byPhone =
        contact.phone() == null
            ? Optional.empty()
            : userRepository.findByPhoneNumber(contact.phone());
    if (byEmail.isPresent()
        && byPhone.isPresent()
        && !Objects.equals(byEmail.get().getId(), byPhone.get().getId())) {
      throw new AppException(ErrorCode.CUSTOMER_CONTACT_CONFLICT);
    }
    return byEmail.isPresent() ? byEmail : byPhone;
  }

  /** Chỉ gắn đơn vào tài khoản khách hàng đang hoạt động, không gắn vào tài khoản nhân viên. */
  private static void requireEligible(User user) {
    if (user.getRole() != UserRole.USER || user.getStatus() != UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.CUSTOMER_NOT_ELIGIBLE);
    }
  }

  private static boolean isGuest(User user) {
    return user.getUsername() != null && user.getUsername().startsWith(GUEST_PREFIX);
  }

  private String generateGuestUsername(String email, String phone) {
    String source = phone != null ? phone : email;
    String base = source == null ? "guest" : source.toLowerCase().replaceAll("[^a-z0-9]", "");
    if (!StringUtils.hasText(base)) {
      base = "guest";
    }

    String username = GUEST_PREFIX + base;
    int suffix = 1;
    while (userRepository.existsByUsername(username)) {
      username = GUEST_PREFIX + base + "_" + suffix++;
    }
    return username;
  }

  /** Bỏ khoảng trắng, dấu chấm, gạch; đổi +84/84 thành 0. Kết quả phải là số di động 10 chữ số. */
  static String normalizePhone(String value) {
    String raw = trimToNull(value);
    if (raw == null) return null;
    String digits = raw.replaceAll("[\\s.\\-()]", "");
    if (digits.startsWith("+84")) digits = "0" + digits.substring(3);
    else if (digits.startsWith("84") && digits.length() == 11) digits = "0" + digits.substring(2);
    if (!PHONE.matcher(digits).matches()) {
      throw new AppException(ErrorCode.CUSTOMER_PHONE_INVALID);
    }
    return digits;
  }

  static String normalizeEmail(String value) {
    String email = trimToNull(value);
    if (email == null) return null;
    if (email.length() > 255 || !EMAIL.matcher(email).matches()) {
      throw new AppException(ErrorCode.CUSTOMER_EMAIL_INVALID);
    }
    return email;
  }

  /** "Nguyễn Thị Linh" → "N. T. Linh": giữ tên gọi, viết tắt họ và tên đệm. */
  static String maskName(String fullName) {
    String name = trimToNull(fullName);
    if (name == null) return null;
    String[] words = name.split("\\s+");
    if (words.length == 1) return words[0];
    String initials =
        Arrays.stream(words, 0, words.length - 1)
            .map(word -> word.substring(0, 1).toUpperCase() + ".")
            .collect(Collectors.joining(" "));
    return initials + " " + words[words.length - 1];
  }

  /** "linhnguyen@gmail.com" → "li********@gmail.com". */
  static String maskEmail(String email) {
    if (!StringUtils.hasText(email) || !email.contains("@")) return null;
    int at = email.indexOf('@');
    String local = email.substring(0, at);
    String visible = local.substring(0, Math.min(2, local.length()));
    return visible
        + "*".repeat(Math.max(1, local.length() - visible.length()))
        + email.substring(at);
  }

  /** "0901234567" → "090****567". */
  static String maskPhone(String phone) {
    if (!StringUtils.hasText(phone) || phone.length() < 7) return null;
    return phone.substring(0, 3)
        + "*".repeat(phone.length() - 6)
        + phone.substring(phone.length() - 3);
  }

  private static String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private record Contact(String email, String phone) {
    static Contact of(String email, String phone) {
      return new Contact(normalizeEmail(email), normalizePhone(phone));
    }
  }
}

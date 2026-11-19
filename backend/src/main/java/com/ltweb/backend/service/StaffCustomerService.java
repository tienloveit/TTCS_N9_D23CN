package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.StaffBookingRequest;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.repository.UserRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class StaffCustomerService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public User getOrCreateStaffCustomer(StaffBookingRequest request) {
    String email = trimToNull(request.getCustomerEmail());
    String phone = trimToNull(request.getCustomerPhone());
    String fullName = trimToNull(request.getCustomerName());

    if (email != null) {
      var userByEmail = userRepository.findByEmail(email);
      if (userByEmail.isPresent()) {
        return userByEmail.get();
      }
    }

    if (phone != null) {
      var userByPhone = userRepository.findByPhoneNumber(phone);
      if (userByPhone.isPresent()) {
        return userByPhone.get();
      }
    }

    User customer =
        User.builder()
            .username(generateGuestUsername(email, phone))
            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
            .fullName(fullName == null ? "Walk-in Customer" : fullName)
            .email(email)
            .phoneNumber(phone)
            .role(UserRole.USER)
            .status(UserStatus.ACTIVE)
            .build();
    return userRepository.save(customer);
  }

  private String generateGuestUsername(String email, String phone) {
    String source = phone != null ? phone : email;
    String base = source == null ? "guest" : source.toLowerCase().replaceAll("[^a-z0-9]", "");
    if (!StringUtils.hasText(base)) {
      base = "guest";
    }

    String username = "guest_" + base;
    int suffix = 1;
    while (userRepository.existsByUsername(username)) {
      username = "guest_" + base + "_" + suffix++;
    }
    return username;
  }

  private String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }
}

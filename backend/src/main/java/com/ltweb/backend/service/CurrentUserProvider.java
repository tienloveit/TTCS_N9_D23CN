package com.ltweb.backend.service;

import com.ltweb.backend.entity.User;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Resolves the persisted account for this request; never caches it across requests. */
@Component
@RequiredArgsConstructor
public class CurrentUserProvider {
  private final UserRepository users;

  public User requireUser() {
    return requireUser(ErrorCode.USER_NOT_FOUND);
  }

  public User requireUser(ErrorCode error) {
    User user = getOrNull();
    if (user == null) throw new AppException(error);
    return user;
  }

  public User getOrNull() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null
        || !authentication.isAuthenticated()
        || authentication instanceof AnonymousAuthenticationToken
        || authentication.getName() == null
        || "anonymousUser".equals(authentication.getName())) {
      return null;
    }
    return users.findByUsername(authentication.getName()).orElse(null);
  }
}

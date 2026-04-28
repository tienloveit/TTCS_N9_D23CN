package com.ltweb.backend.util;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public class VnpayUtil {

  private VnpayUtil() {}

  public static String hmacSHA512(String key, String data) {
    try {
      Mac hmac512 = Mac.getInstance("HmacSHA512");
      SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
      hmac512.init(keySpec);
      byte[] result = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder(result.length * 2);
      for (byte b : result) {
        sb.append(String.format("%02x", b & 0xff));
      }
      return sb.toString();
    } catch (Exception e) {
      return "";
    }
  }

  public static String getClientIp(HttpServletRequest request) {
    String ip = request.getHeader("X-FORWARDED-FOR");
    if (ip == null || ip.isBlank()) {
      ip = request.getRemoteAddr();
    }
    return ip;
  }

  public static String randomNumeric(int len) {
    Random rnd = new Random();
    String chars = "0123456789";
    StringBuilder sb = new StringBuilder(len);
    for (int i = 0; i < len; i++) {
      sb.append(chars.charAt(rnd.nextInt(chars.length())));
    }
    return sb.toString();
  }

  public static String encode(String input) {
    return URLEncoder.encode(input, StandardCharsets.US_ASCII);
  }

  public static String buildReturnHashData(Map<String, String> params) {
    List<String> names = new ArrayList<>(params.keySet());
    Collections.sort(names);
    StringBuilder sb = new StringBuilder();
    Iterator<String> itr = names.iterator();
    while (itr.hasNext()) {
      String name = itr.next();
      String value = params.get(name);
      if (value != null && !value.isEmpty()) {
        sb.append(encode(name)).append("=").append(encode(value));
        if (itr.hasNext()) {
          sb.append("&");
        }
      }
    }
    return sb.toString();
  }
}

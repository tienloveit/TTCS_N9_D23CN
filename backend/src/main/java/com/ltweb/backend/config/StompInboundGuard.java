package com.ltweb.backend.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ChannelInterceptor;

/**
 * Kênh realtime chỉ cho client đăng ký nhận. Simple broker chuyển tiếp mọi frame SEND tới đúng
 * destination, nên nếu không chặn, bất kỳ ai mở /ws cũng gửi được trạng thái ghế giả lên {@code
 * /topic/showtime/{id}/seats} cho mọi người đang xem suất đó. Backend không có {@code
 * MessageMapping} nào, nên mọi frame SEND đều bị từ chối.
 */
public class StompInboundGuard implements ChannelInterceptor {
  @Override
  public Message<?> preSend(Message<?> message, MessageChannel channel) {
    if (SimpMessageHeaderAccessor.getMessageType(message.getHeaders()) == SimpMessageType.MESSAGE) {
      throw new MessageDeliveryException(message, "Client chỉ được đăng ký nhận sự kiện");
    }
    return message;
  }
}

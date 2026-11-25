package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;

import com.ltweb.backend.config.StompInboundGuard;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.MessageBuilder;

class StompInboundGuardTest {
  StompInboundGuard guard = new StompInboundGuard();
  MessageChannel channel = mock(MessageChannel.class);

  @Test
  void clientsCanConnectAndSubscribeToSeatUpdates() {
    for (SimpMessageType type :
        new SimpMessageType[] {
          SimpMessageType.CONNECT,
          SimpMessageType.SUBSCRIBE,
          SimpMessageType.UNSUBSCRIBE,
          SimpMessageType.HEARTBEAT,
          SimpMessageType.DISCONNECT
        }) {
      Message<byte[]> frame = frame(type);
      assertThat(guard.preSend(frame, channel)).isSameAs(frame);
    }
  }

  @Test
  void clientsCannotPublishFakeSeatStatus() {
    assertThatThrownBy(() -> guard.preSend(frame(SimpMessageType.MESSAGE), channel))
        .isInstanceOf(MessageDeliveryException.class);
  }

  private static Message<byte[]> frame(SimpMessageType type) {
    SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.create(type);
    headers.setDestination("/topic/showtime/7/seats");
    return MessageBuilder.createMessage(
        "{\"seatId\":1,\"status\":\"AVAILABLE\"}".getBytes(), headers.getMessageHeaders());
  }
}

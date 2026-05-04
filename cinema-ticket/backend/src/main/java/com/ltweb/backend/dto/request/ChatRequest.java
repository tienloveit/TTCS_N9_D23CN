package com.ltweb.backend.dto.request;

import lombok.Data;

@Data
public class ChatRequest {
    private String chatId;
    private String message;
}

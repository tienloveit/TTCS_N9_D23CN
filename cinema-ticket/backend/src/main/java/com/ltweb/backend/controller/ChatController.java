package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.ChatRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.ChatResponse;
import com.ltweb.backend.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ChatResponse> chat(@RequestBody ChatRequest request) {
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            return ApiResponse.<ChatResponse>builder()
                    .code(400)
                    .message("Tin nhắn không được để trống")
                    .build();
        }
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        String chatId = username;
        if (request.getChatId() != null && !request.getChatId().trim().isEmpty()) {
            chatId = username + ":" + request.getChatId().trim();
        }
        
        try {
            String response = chatService.chat(chatId, request.getMessage());
            
            return ApiResponse.<ChatResponse>builder()
                    .code(200)
                    .result(new ChatResponse(response))
                    .build();
        } catch (Exception e) {
            log.error("Chat API error: {}", e.getMessage(), e);
            return ApiResponse.<ChatResponse>builder()
                    .code(500)
                    .message("Lỗi hệ thống AI: " + e.getMessage())
                    .build();
        }
    }
}

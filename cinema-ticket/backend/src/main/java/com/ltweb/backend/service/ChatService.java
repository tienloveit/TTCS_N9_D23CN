package com.ltweb.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class ChatService {

        private final ChatClient chatClient;

        public ChatService(ChatClient.Builder chatClientBuilder, RedisChatMemory redisChatMemory) {
                // Cấu hình ChatClient với system prompt, chat memory và các function beans
                this.chatClient = chatClientBuilder
                                .defaultSystem("Bạn là hệ thống AI thông minh của CinemaPTIT. " +
                        "QUY TẮC: " +
                        "1. Luôn ưu tiên dùng Tools để lấy dữ liệu thực tế. " +
                        "2. Trả lời ngắn gọn, lịch sự, đúng trọng tâm. " +
                        "3. Nếu khách muốn đặt vé, hãy hướng dẫn họ cung cấp đủ thông tin (Phim, Rạp, Ngày, Giờ).")
                                // Thêm Chat Memory để lưu trữ lịch sử hội thoại
                                .defaultAdvisors(new MessageChatMemoryAdvisor(redisChatMemory))
                                // Đăng ký toàn bộ kho công cụ (Tools) cho AI
                                .defaultFunctions(
                                        "get_movie_info", "get_showtimes", "book_ticket", "get_now_showing_movies",
                                        "searchMoviesByGenre", "getAvailableSeats", "getBranchInfo", "getSnackMenu",
                                        "getUpcomingMovies", "get_ticket_prices", "get_showtimes_by_branch",
                                        "get_upcoming_movies_by_branch"
                                )
                                .build();
        }

        public String chat(String chatId, String message) {
                int maxRetries = 3;
                long waitMs = 2000; // Giảm xuống 2 giây chờ giữa mỗi lần retry

                for (int attempt = 1; attempt <= maxRetries; attempt++) {
                        try {
                                String result = this.chatClient.prompt()
                                                .user(message)
                                                .advisors(a -> a.param(
                                                                MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY,
                                                                chatId))
                                                .call()
                                                .content();

                                // Làm sạch dữ liệu: Xử lý mọi loại rác từ model 70b
                                if (result != null) {
                                        // 1. Xóa các tag hàm dư thừa như <function=...>...</function>
                                        result = result.replaceAll("(?s)<function=.*?>.*?</function>", "");
                                        result = result.replaceAll("(?s)<function.*?>.*?</function>", "");
                                        result = result.replaceAll("<.*?>", ""); // Xóa mọi tag XML còn sót lại
                                        
                                        // 2. Xóa sạch TẤT CẢ các từ "assistant" thừa thãi
                                        result = result.replaceAll("(?i)assistant[:\\s]+", "").trim();
                                        
                                        // 3. Ép các ký tự \n văn bản thành xuống dòng thật
                                        result = result.replaceAll("\\\\n", "\n").replaceAll("\\\\r", "\r");
                                }
                                
                                return result;
                        } catch (Exception e) {
                                String errorMsg = e.getMessage() != null ? e.getMessage() : "";
                                boolean isRateLimit = errorMsg.contains("429")
                                                || errorMsg.contains("RESOURCE_EXHAUSTED")
                                                || errorMsg.contains("quota");

                                if (isRateLimit && attempt < maxRetries) {
                                        log.warn("Rate limited by AI API (attempt {}/{}). Retrying in {}ms...",
                                                        attempt, maxRetries, waitMs);
                                        try {
                                                Thread.sleep(waitMs);
                                                waitMs *= 2; // exponential backoff
                                        } catch (InterruptedException ie) {
                                                Thread.currentThread().interrupt();
                                                throw new RuntimeException("Chat bị gián đoạn", ie);
                                        }
                                } else {
                                        log.error("Error calling AI chat service (attempt {}/{}): {}", attempt,
                                                        maxRetries, e.getMessage());
                                        if (isRateLimit) {
                                                throw new RuntimeException(
                                                                "Hệ thống AI đang quá tải, vui lòng thử lại sau ít phút.",
                                                                e);
                                        }
                                        throw new RuntimeException("Lỗi khi gọi dịch vụ AI: " + e.getMessage(), e);
                                }
                        }
                }
                throw new RuntimeException("Không thể kết nối dịch vụ AI sau nhiều lần thử.");
        }
}

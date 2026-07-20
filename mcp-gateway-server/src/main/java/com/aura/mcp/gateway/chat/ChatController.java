package com.aura.mcp.gateway.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ChatResponse chat(@RequestBody ChatRequest request) {
        List<HistoryMessage> history = request.history() != null ? request.history() : List.of();
        try {
            return new ChatResponse(chatService.chat(request.message(), history));
        } catch (Exception e) {
            return new ChatResponse("调用失败：" + e.getMessage());
        }
    }

    public record ChatRequest(String message, List<HistoryMessage> history) {
    }

    public record ChatResponse(String reply) {
    }
}

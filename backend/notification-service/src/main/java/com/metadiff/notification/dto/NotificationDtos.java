package com.metadiff.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;

public class NotificationDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationRequest {
        @NotBlank(message = "Title is required")
        private String title;
        @NotBlank(message = "Message is required")
        private String message;
        @NotBlank(message = "Type is required")
        private String type; // INFO, WARNING, ERROR, SUCCESS
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationResponse {
        private String id;
        private String title;
        private String message;
        private String type;
        private boolean read;
        private String createdAt;
    }
}

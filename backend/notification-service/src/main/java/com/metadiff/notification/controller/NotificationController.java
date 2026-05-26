package com.metadiff.notification.controller;

import com.metadiff.notification.dto.NotificationDtos;
import com.metadiff.notification.service.NotificationService;
import com.metadiff.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Alerting and notifications management")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get unread notifications")
    public ResponseEntity<ApiResponse<List<NotificationDtos.NotificationResponse>>> getUnread(
            @RequestParam(defaultValue = "false") boolean all) {
        List<NotificationDtos.NotificationResponse> result = all 
                ? notificationService.getAllNotifications() 
                : notificationService.getUnreadNotifications();
        return ResponseEntity.ok(ApiResponse.ok(result, "Notifications retrieved successfully"));
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<ApiResponse<Void>> read(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Notification marked as read"));
    }

    @PostMapping
    @Operation(summary = "Create a notification (internal / webhook use)")
    public ResponseEntity<ApiResponse<NotificationDtos.NotificationResponse>> create(
            @Valid @RequestBody NotificationDtos.NotificationRequest request) {
        NotificationDtos.NotificationResponse response = notificationService.createNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Notification created successfully"));
    }
}

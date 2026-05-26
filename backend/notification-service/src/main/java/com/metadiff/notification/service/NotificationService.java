package com.metadiff.notification.service;

import com.metadiff.notification.domain.Notification;
import com.metadiff.notification.dto.NotificationDtos;
import com.metadiff.notification.repository.NotificationRepository;
import com.metadiff.shared.exception.MetaDiffException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public List<NotificationDtos.NotificationResponse> getUnreadNotifications() {
        return notificationRepository.findByReadFalseOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<NotificationDtos.NotificationResponse> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(UUID id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> MetaDiffException.notFound("Notification", id.toString()));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public NotificationDtos.NotificationResponse createNotification(NotificationDtos.NotificationRequest request) {
        Notification notification = Notification.builder()
                .title(request.getTitle())
                .message(request.getMessage())
                .type(request.getType().toUpperCase())
                .read(false)
                .build();
        notification = notificationRepository.save(notification);
        return mapToResponse(notification);
    }

    private NotificationDtos.NotificationResponse mapToResponse(Notification n) {
        return NotificationDtos.NotificationResponse.builder()
                .id(n.getId().toString())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .read(n.isRead())
                .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().toString() : null)
                .build();
    }
}

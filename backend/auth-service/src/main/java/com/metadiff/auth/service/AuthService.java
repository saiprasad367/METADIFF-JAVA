package com.metadiff.auth.service;

import com.metadiff.auth.domain.AuditLog;
import com.metadiff.auth.domain.User;
import com.metadiff.auth.dto.AuthDtos;
import com.metadiff.auth.repository.AuditLogRepository;
import com.metadiff.auth.repository.UserRepository;
import com.metadiff.shared.exception.MetaDiffException;
import com.metadiff.shared.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Core authentication service — registration, login, token management, audit logging.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String JWT_BLACKLIST_PREFIX = "jwt:blacklist:";

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final StringRedisTemplate redisTemplate;

    @Value("${jwt.access-token-ttl-minutes:60}")
    private long accessTokenTtlMinutes;

    // ─── Registration ──────────────────────────────────────────────────────

    @Transactional
    public AuthDtos.UserResponse register(AuthDtos.RegisterRequest request, String ipAddress) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw MetaDiffException.conflict("Email address already registered: " + request.getEmail());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole() != null ? request.getRole() : User.Role.DEVELOPER)
                .active(true)
                .build();

        user = userRepository.save(user);

        auditAsync(user.getId(), user.getEmail(), AuditLog.AuditAction.REGISTER, ipAddress, true, null);
        log.info("New user registered: id={}, email={}, role={}", user.getId(), user.getEmail(), user.getRole());

        return mapToUserResponse(user);
    }

    // ─── Login ─────────────────────────────────────────────────────────────

    @Transactional
    public AuthDtos.TokenResponse login(AuthDtos.LoginRequest request, String ipAddress) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> {
                    auditAsync(null, request.getEmail(), AuditLog.AuditAction.LOGIN_FAILED, ipAddress, false, "User not found");
                    return MetaDiffException.unauthorized("Invalid email or password");
                });

        if (!user.isActive()) {
            throw MetaDiffException.unauthorized("Account is disabled. Contact administrator.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            auditAsync(user.getId(), user.getEmail(), AuditLog.AuditAction.LOGIN_FAILED, ipAddress, false, "Wrong password");
            throw MetaDiffException.unauthorized("Invalid email or password");
        }

        userRepository.updateLastLogin(user.getId(), Instant.now());
        auditAsync(user.getId(), user.getEmail(), AuditLog.AuditAction.LOGIN, ipAddress, true, null);

        return buildTokenResponse(user);
    }

    // ─── Token refresh ─────────────────────────────────────────────────────

    @Transactional
    public AuthDtos.TokenResponse refreshToken(String refreshToken, String ipAddress) {
        if (!tokenProvider.isTokenValid(refreshToken) || !tokenProvider.isRefreshToken(refreshToken)) {
            throw MetaDiffException.unauthorized("Invalid or expired refresh token");
        }

        if (isTokenBlacklisted(refreshToken)) {
            throw MetaDiffException.unauthorized("Token has been revoked");
        }

        String email = tokenProvider.extractSubject(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> MetaDiffException.unauthorized("User not found"));

        // Blacklist the old refresh token
        blacklistToken(refreshToken);
        auditAsync(user.getId(), user.getEmail(), AuditLog.AuditAction.TOKEN_REFRESH, ipAddress, true, null);

        return buildTokenResponse(user);
    }

    // ─── Logout ────────────────────────────────────────────────────────────

    public void logout(String accessToken, String ipAddress, String userEmail) {
        blacklistToken(accessToken);
        User user = userRepository.findByEmail(userEmail).orElse(null);
        UUID userId = user != null ? user.getId() : null;
        auditAsync(userId, userEmail, AuditLog.AuditAction.LOGOUT, ipAddress, true, null);
        log.info("User logged out: email={}", userEmail);
    }

    // ─── Current user ──────────────────────────────────────────────────────

    public AuthDtos.UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> MetaDiffException.notFound("User", email));
        return mapToUserResponse(user);
    }

    // ─── Private helpers ───────────────────────────────────────────────────

    private AuthDtos.TokenResponse buildTokenResponse(User user) {
        Map<String, Object> claims = Map.of(
                "role", user.getRole().name(),
                "name", user.getName(),
                "userId", user.getId().toString()
        );

        String accessToken = tokenProvider.generateAccessToken(user.getEmail(), claims);
        String refreshToken = tokenProvider.generateRefreshToken(user.getEmail());

        AuthDtos.TokenResponse response = new AuthDtos.TokenResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);
        response.setExpiresIn(accessTokenTtlMinutes * 60);
        response.setUser(mapToUserResponse(user));
        return response;
    }

    private AuthDtos.UserResponse mapToUserResponse(User user) {
        AuthDtos.UserResponse resp = new AuthDtos.UserResponse();
        resp.setId(user.getId().toString());
        resp.setName(user.getName());
        resp.setEmail(user.getEmail());
        resp.setRole(user.getRole().name());
        resp.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        resp.setLastLoginAt(user.getLastLoginAt() != null ? user.getLastLoginAt().toString() : null);
        return resp;
    }

    private void blacklistToken(String token) {
        try {
            Instant expiry = tokenProvider.getExpiration(token).toInstant();
            Duration ttl = Duration.between(Instant.now(), expiry);
            if (!ttl.isNegative()) {
                redisTemplate.opsForValue().set(
                        JWT_BLACKLIST_PREFIX + token,
                        "revoked",
                        ttl
                );
            }
        } catch (Exception ex) {
            log.warn("Failed to blacklist token: {}", ex.getMessage());
        }
    }

    private boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(JWT_BLACKLIST_PREFIX + token));
    }

    private void auditAsync(UUID userId, String email, AuditLog.AuditAction action,
                            String ipAddress, boolean success, String detail) {
        try {
            AuditLog log = AuditLog.builder()
                    .userId(userId)
                    .userEmail(email)
                    .action(action)
                    .ipAddress(ipAddress)
                    .success(success)
                    .metadataJson(detail != null ? "{\"detail\":\"" + detail + "\"}" : null)
                    .build();
            auditLogRepository.save(log);
        } catch (Exception ex) {
            AuthService.log.warn("Failed to write audit log: {}", ex.getMessage());
        }
    }
}

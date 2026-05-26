package com.metadiff.auth.controller;

import com.metadiff.auth.dto.AuthDtos;
import com.metadiff.auth.service.AuthService;
import com.metadiff.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, login, token management")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user account")
    public ResponseEntity<ApiResponse<AuthDtos.UserResponse>> register(
            @Valid @RequestBody AuthDtos.RegisterRequest request,
            HttpServletRequest httpRequest) {
        AuthDtos.UserResponse user = authService.register(request, getClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(user, "Registration successful"));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate and receive JWT tokens")
    public ResponseEntity<ApiResponse<AuthDtos.TokenResponse>> login(
            @Valid @RequestBody AuthDtos.LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthDtos.TokenResponse tokens = authService.login(request, getClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.ok(tokens, "Login successful"));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using refresh token")
    public ResponseEntity<ApiResponse<AuthDtos.TokenResponse>> refresh(
            @Valid @RequestBody AuthDtos.RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        AuthDtos.TokenResponse tokens = authService.refreshToken(request.getRefreshToken(), getClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.ok(tokens));
    }

    @PostMapping("/logout")
    @Operation(summary = "Invalidate current access token", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest,
            @AuthenticationPrincipal UserDetails userDetails) {
        String token = authHeader.replace("Bearer ", "");
        String email = userDetails != null ? userDetails.getUsername() : "unknown";
        authService.logout(token, getClientIp(httpRequest), email);
        return ResponseEntity.ok(ApiResponse.ok(null, "Logged out successfully"));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<AuthDtos.UserResponse>> me(
            @AuthenticationPrincipal UserDetails userDetails) {
        AuthDtos.UserResponse user = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        return xff != null ? xff.split(",")[0].trim() : request.getRemoteAddr();
    }
}

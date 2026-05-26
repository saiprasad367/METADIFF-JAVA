package com.metadiff.shared.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

/**
 * JWT utility shared across all services.
 * Each service instantiates this with the same secret and TTLs.
 */
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final SecretKey signingKey;
    private final long accessTokenTtlMs;
    private final long refreshTokenTtlMs;
    private final String issuer = "metadiff.io";

    public JwtTokenProvider(String secret, long accessTokenTtlMinutes, long refreshTokenTtlDays) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtlMs = accessTokenTtlMinutes * 60 * 1000;
        this.refreshTokenTtlMs = refreshTokenTtlDays * 24 * 60 * 60 * 1000;
    }

    public String generateAccessToken(String subject, Map<String, Object> claims) {
        return buildToken(subject, claims, accessTokenTtlMs, "access");
    }

    public String generateRefreshToken(String subject) {
        return buildToken(subject, Map.of(), refreshTokenTtlMs, "refresh");
    }

    private String buildToken(String subject, Map<String, Object> claims, long ttlMs, String tokenType) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + ttlMs);

        return Jwts.builder()
                .issuer(issuer)
                .subject(subject)
                .claims(claims)
                .claim("type", tokenType)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    public Claims validateAndExtractClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractSubject(String token) {
        return validateAndExtractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            validateAndExtractClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("JWT validation failed: {}", ex.getMessage());
            return false;
        }
    }

    public boolean isAccessToken(String token) {
        try {
            Claims claims = validateAndExtractClaims(token);
            return "access".equals(claims.get("type", String.class));
        } catch (Exception ex) {
            return false;
        }
    }

    public boolean isRefreshToken(String token) {
        try {
            Claims claims = validateAndExtractClaims(token);
            return "refresh".equals(claims.get("type", String.class));
        } catch (Exception ex) {
            return false;
        }
    }

    public Date getExpiration(String token) {
        return validateAndExtractClaims(token).getExpiration();
    }
}

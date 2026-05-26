package com.metadiff.gateway.filter;

import com.metadiff.shared.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class JwtValidationFilterGatewayFilterFactory extends AbstractGatewayFilterFactory<JwtValidationFilterGatewayFilterFactory.Config> {

    private final JwtTokenProvider tokenProvider;

    public JwtValidationFilterGatewayFilterFactory(
            @Value("${jwt.secret}") String jwtSecret,
            @Value("${jwt.access-token-ttl-minutes:60}") long accessTtl,
            @Value("${jwt.refresh-token-ttl-days:7}") long refreshTtl) {
        super(Config.class);
        this.tokenProvider = new JwtTokenProvider(jwtSecret, accessTtl, refreshTtl);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                return onError(exchange, "No Authorization Header", HttpStatus.UNAUTHORIZED);
            }

            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return onError(exchange, "Invalid Authorization Header format", HttpStatus.UNAUTHORIZED);
            }

            String token = authHeader.substring(7);
            if (!tokenProvider.isTokenValid(token) || !tokenProvider.isAccessToken(token)) {
                return onError(exchange, "Invalid or expired JWT token", HttpStatus.UNAUTHORIZED);
            }

            return chain.filter(exchange);
        };
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(httpStatus);
        return response.setComplete();
    }

    public static class Config {
        // Put configuration properties here if needed
    }
}

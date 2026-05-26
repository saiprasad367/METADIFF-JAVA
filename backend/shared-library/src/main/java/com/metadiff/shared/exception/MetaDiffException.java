package com.metadiff.shared.exception;

import org.springframework.http.HttpStatus;

/**
 * Base exception for all domain-specific MetaDiff errors.
 */
public class MetaDiffException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus httpStatus;

    public MetaDiffException(String message, String errorCode, HttpStatus httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }

    public MetaDiffException(String message, String errorCode, HttpStatus httpStatus, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }

    public String getErrorCode() { return errorCode; }
    public HttpStatus getHttpStatus() { return httpStatus; }

    // ─── Convenience factories ──────────────────────────────────────────────

    public static MetaDiffException notFound(String resource, Object id) {
        return new MetaDiffException(
                resource + " not found with id: " + id,
                resource.toUpperCase().replace(" ", "_") + "_NOT_FOUND",
                HttpStatus.NOT_FOUND
        );
    }

    public static MetaDiffException conflict(String message) {
        return new MetaDiffException(message, "CONFLICT", HttpStatus.CONFLICT);
    }

    public static MetaDiffException badRequest(String message) {
        return new MetaDiffException(message, "BAD_REQUEST", HttpStatus.BAD_REQUEST);
    }

    public static MetaDiffException unauthorized(String message) {
        return new MetaDiffException(message, "UNAUTHORIZED", HttpStatus.UNAUTHORIZED);
    }

    public static MetaDiffException internalError(String message, Throwable cause) {
        return new MetaDiffException(message, "INTERNAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, cause);
    }
}

package com.metadiff.diff.controller;

import com.metadiff.diff.dto.DiffDtos;
import com.metadiff.diff.service.DiffService;
import com.metadiff.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/diff")
@RequiredArgsConstructor
@Tag(name = "Diff Analysis", description = "Structural comparison between metadata snapshots")
@SecurityRequirement(name = "bearerAuth")
public class DiffController {

    private final DiffService diffService;

    @PostMapping
    @Operation(summary = "Generate a structural diff between two snapshots")
    public ResponseEntity<ApiResponse<DiffDtos.DiffResponse>> createDiff(
            @Valid @RequestBody DiffDtos.DiffRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String requestedBy = userDetails != null ? userDetails.getUsername() : "system";
        DiffDtos.DiffResponse response = diffService.createDiff(request, requestedBy);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok(response, "Diff job submitted"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get diff report with all change entries")
    public ResponseEntity<ApiResponse<DiffDtos.DiffResponse>> getDiff(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(diffService.getDiff(id)));
    }

    @GetMapping("/{id}/visualization")
    @Operation(summary = "Get component impact matrix for visualization")
    public ResponseEntity<ApiResponse<DiffDtos.VisualizationResponse>> getVisualization(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(diffService.getVisualization(id)));
    }
}

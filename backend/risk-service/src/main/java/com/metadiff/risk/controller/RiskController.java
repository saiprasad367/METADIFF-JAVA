package com.metadiff.risk.controller;

import com.metadiff.risk.dto.RiskDtos;
import com.metadiff.risk.service.RiskService;
import com.metadiff.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
@Tag(name = "Risk Analysis", description = "Deployment risk scoring and AI explanation")
@SecurityRequirement(name = "bearerAuth")
public class RiskController {

    private final RiskService riskService;

    @GetMapping("/{diffId}")
    @Operation(summary = "Get full risk report for a diff")
    public ResponseEntity<ApiResponse<RiskDtos.RiskReport>> getRiskReport(@PathVariable String diffId) {
        return ResponseEntity.ok(ApiResponse.ok(riskService.getRiskReport(diffId)));
    }

    @GetMapping("/{diffId}/breakdown")
    @Operation(summary = "Get per-component risk breakdown")
    public ResponseEntity<ApiResponse<?>> getBreakdown(@PathVariable String diffId) {
        RiskDtos.RiskReport report = riskService.getRiskReport(diffId);
        return ResponseEntity.ok(ApiResponse.ok(report.getBreakdown()));
    }

    @GetMapping("/{diffId}/explanation")
    @Operation(summary = "Get AI-style human-readable risk explanation")
    public ResponseEntity<ApiResponse<?>> getExplanation(@PathVariable String diffId) {
        RiskDtos.RiskReport report = riskService.getRiskReport(diffId);
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of(
                "explanation", report.getExplanation() != null ? report.getExplanation() : "",
                "suggestedActions", report.getSuggestedActions() != null ? report.getSuggestedActions() : java.util.List.of()
        )));
    }

    @PostMapping("/compute")
    @Operation(summary = "Compute risk score on-demand for a diff ID")
    public ResponseEntity<ApiResponse<RiskDtos.RiskReport>> computeRisk(@RequestParam String diffId) {
        return ResponseEntity.ok(ApiResponse.ok(riskService.computeAndPersist(diffId)));
    }
}

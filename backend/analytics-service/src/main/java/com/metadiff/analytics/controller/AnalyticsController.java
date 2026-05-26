package com.metadiff.analytics.controller;

import com.metadiff.analytics.dto.AnalyticsDtos;
import com.metadiff.analytics.service.AnalyticsService;
import com.metadiff.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Executive engineering analytics and predictions")
@SecurityRequirement(name = "bearerAuth")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/metrics")
    @Operation(summary = "Get dashboard KPI metrics")
    public ResponseEntity<ApiResponse<AnalyticsDtos.DashboardMetrics>> getMetrics() {
        AnalyticsDtos.DashboardMetrics metrics = analyticsService.getMetrics();
        return ResponseEntity.ok(ApiResponse.ok(metrics, "Metrics retrieved successfully"));
    }

    @GetMapping("/trends")
    @Operation(summary = "Get risk score and deployment frequency trends over time")
    public ResponseEntity<ApiResponse<AnalyticsDtos.TrendData>> getTrends(
            @RequestParam(defaultValue = "daily") String period) {
        AnalyticsDtos.TrendData trends = analyticsService.getTrends(period);
        return ResponseEntity.ok(ApiResponse.ok(trends, "Trends retrieved successfully"));
    }

    @GetMapping("/hotspots")
    @Operation(summary = "Get most-changed components causing churn")
    public ResponseEntity<ApiResponse<List<AnalyticsDtos.HotspotComponent>>> getHotspots() {
        List<AnalyticsDtos.HotspotComponent> hotspots = analyticsService.getHotspots();
        return ResponseEntity.ok(ApiResponse.ok(hotspots, "Hotspots retrieved successfully"));
    }

    @GetMapping("/prediction")
    @Operation(summary = "Get next deployment risk estimate and explanation")
    public ResponseEntity<ApiResponse<AnalyticsDtos.RiskPrediction>> getPrediction() {
        AnalyticsDtos.RiskPrediction prediction = analyticsService.getPrediction();
        return ResponseEntity.ok(ApiResponse.ok(prediction, "Prediction retrieved successfully"));
    }
}

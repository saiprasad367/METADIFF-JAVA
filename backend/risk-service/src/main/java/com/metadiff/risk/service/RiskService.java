package com.metadiff.risk.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metadiff.risk.domain.RiskReport;
import com.metadiff.risk.dto.RiskDtos;
import com.metadiff.risk.engine.RiskScoringEngine;
import com.metadiff.risk.repository.RiskReportRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@RequiredArgsConstructor
public class RiskService {

    private static final Logger log = LoggerFactory.getLogger(RiskService.class);

    private final RiskScoringEngine    engine;
    private final RiskReportRepository riskReportRepository;
    private final ObjectMapper         objectMapper;
    private final RestTemplate         restTemplate;

    @Value("${services.diff-service-url:http://localhost:8083}")
    private String diffServiceUrl;

    @Value("${services.notification-service-url:http://localhost:8087}")
    private String notificationServiceUrl;

    @Cacheable(value = "riskReports", key = "#diffId")
    public RiskDtos.RiskReport getRiskReport(String diffId) {
        // Check persisted
        return riskReportRepository.findByDiffId(diffId)
                .map(this::fromEntity)
                .orElseGet(() -> computeAndPersist(diffId));
    }

    public RiskDtos.RiskReport computeAndPersist(String diffId) {
        List<RiskDtos.DiffEntryInput> entries = fetchDiffEntries(diffId);
        RiskDtos.RiskReport report = engine.calculate(entries, diffId);
        String explanation = engine.generateExplanation(report);
        report.setExplanation(explanation);

        // Persist
        try {
            RiskReport entity = RiskReport.builder()
                    .diffId(diffId)
                    .score(report.getScore())
                    .level(report.getLevel())
                    .reasonsJson(objectMapper.writeValueAsString(report.getReasons()))
                    .build();
            riskReportRepository.save(entity);

            // Trigger notification for high/critical risk
            if (report.getScore() >= 70) {
                triggerNotification(diffId, report.getScore(), report.getLevel());
            }
        } catch (Exception ex) {
            log.warn("Could not persist risk report or trigger notification: {}", ex.getMessage());
        }

        return report;
    }

    private void triggerNotification(String diffId, int score, String level) {
        try {
            String url = notificationServiceUrl + "/api/notifications";
            Map<String, String> req = Map.of(
                "title", "High Deployment Risk",
                "message", "Releases for diff " + diffId + " calculated a " + level + " risk score of " + score + ".",
                "type", "WARNING"
            );
            restTemplate.postForObject(url, req, Map.class);
            log.info("Sent alert notification for high risk diff={}", diffId);
        } catch (Exception ex) {
            log.warn("Could not send alert notification: {}", ex.getMessage());
        }
    }


    public double getAverageRisk() {
        return riskReportRepository.findAverageScore().orElse(58.0);
    }

    public long countHighRisk() {
        return riskReportRepository.countByLevelIn(List.of("HIGH", "CRITICAL"));
    }

    @SuppressWarnings("unchecked")
    private List<RiskDtos.DiffEntryInput> fetchDiffEntries(String diffId) {
        try {
            String url = diffServiceUrl + "/api/diff/" + diffId;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("data")) {
                Map<String, Object> data = (Map<String, Object>) response.get("data");
                List<Map<String, Object>> changes = (List<Map<String, Object>>) data.get("changes");
                if (changes != null) {
                    return changes.stream().map(c -> {
                        RiskDtos.DiffEntryInput e = new RiskDtos.DiffEntryInput();
                        e.setComponentType(String.valueOf(c.getOrDefault("componentType", "Metadata")));
                        e.setChangeType(String.valueOf(c.getOrDefault("changeType", "MODIFIED")));
                        e.setComponentName(String.valueOf(c.getOrDefault("componentName", "")));
                        return e;
                    }).toList();
                }
            }
        } catch (Exception ex) {
            log.warn("Could not fetch diff entries for risk: {}", ex.getMessage());
        }
        // Return demo entries for disconnected mode
        return List.of(
            entry("Profile", "MODIFIED"), entry("Profile", "MODIFIED"), entry("Profile", "MODIFIED"),
            entry("PermissionSet", "REMOVED"), entry("PermissionSet", "REMOVED"),
            entry("Class", "ADDED"), entry("Object", "MODIFIED"), entry("Field", "ADDED")
        );
    }

    private RiskDtos.DiffEntryInput entry(String type, String change) {
        RiskDtos.DiffEntryInput e = new RiskDtos.DiffEntryInput();
        e.setComponentType(type); e.setChangeType(change); e.setComponentName(type + "_component");
        return e;
    }

    private RiskDtos.RiskReport fromEntity(RiskReport entity) {
        RiskDtos.RiskReport r = new RiskDtos.RiskReport();
        r.setDiffId(entity.getDiffId());
        r.setScore(entity.getScore());
        r.setLevel(entity.getLevel());
        try {
            r.setReasons(objectMapper.readValue(entity.getReasonsJson(), new TypeReference<>() {}));
        } catch (Exception e) { r.setReasons(List.of()); }
        return r;
    }
}

package com.metadiff.diff.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metadiff.diff.domain.DiffEntry;
import com.metadiff.diff.domain.DiffReport;
import com.metadiff.diff.dto.DiffDtos;
import com.metadiff.diff.engine.DiffEngine;
import com.metadiff.diff.repository.DiffEntryRepository;
import com.metadiff.diff.repository.DiffReportRepository;
import com.metadiff.shared.exception.MetaDiffException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiffService {

    private static final Logger log = LoggerFactory.getLogger(DiffService.class);

    private final DiffReportRepository diffReportRepository;
    private final DiffEntryRepository  diffEntryRepository;
    private final DiffEngine           diffEngine;
    private final ObjectMapper         objectMapper;
    private final RestTemplate         restTemplate;

    @Value("${services.snapshot-service-url:http://localhost:8082}")
    private String snapshotServiceUrl;

    // ─── Create diff ──────────────────────────────────────────────────────

    @Transactional
    public DiffDtos.DiffResponse createDiff(DiffDtos.DiffRequest request, String requestedBy) {
        DiffReport report = DiffReport.builder()
                .beforeSnapshotId(request.getBeforeSnapshotId())
                .afterSnapshotId(request.getAfterSnapshotId())
                .status(DiffReport.DiffStatus.PENDING)
                .requestedBy(requestedBy)
                .build();
        report = diffReportRepository.save(report);

        runDiffAsync(report.getId(), request.getBeforeSnapshotId(), request.getAfterSnapshotId());
        return mapToResponse(report, List.of());
    }

    @Async
    public void runDiffAsync(UUID diffId, String beforeId, String afterId) {
        DiffReport report = diffReportRepository.findById(diffId).orElseThrow();
        try {
            report.setStatus(DiffReport.DiffStatus.RUNNING);
            diffReportRepository.save(report);

            // Fetch snapshots from snapshot-service
            String beforeContent = fetchSnapshotContent(beforeId);
            String afterContent  = fetchSnapshotContent(afterId);

            // Run the O(n) diff
            List<DiffEntry> entries = diffEngine.compute(
                    beforeContent, "JSON", afterContent, "JSON", diffId);

            // Persist entries
            diffEntryRepository.saveAll(entries);

            // Update report counts
            Map<DiffEntry.ChangeType, Long> counts = entries.stream()
                    .collect(Collectors.groupingBy(DiffEntry::getChangeType, Collectors.counting()));

            report.setAddedCount(counts.getOrDefault(DiffEntry.ChangeType.ADDED, 0L).intValue());
            report.setRemovedCount(counts.getOrDefault(DiffEntry.ChangeType.REMOVED, 0L).intValue());
            report.setModifiedCount(counts.getOrDefault(DiffEntry.ChangeType.MODIFIED, 0L).intValue());
            report.setRenamedCount(counts.getOrDefault(DiffEntry.ChangeType.RENAMED, 0L).intValue());
            report.setStatus(DiffReport.DiffStatus.COMPLETED);
            report.setSummaryJson(objectMapper.writeValueAsString(Map.of(
                    "added", report.getAddedCount(),
                    "removed", report.getRemovedCount(),
                    "modified", report.getModifiedCount(),
                    "renamed", report.getRenamedCount(),
                    "total", entries.size()
            )));
            diffReportRepository.save(report);
            log.info("Diff {} completed: {} total changes", diffId, entries.size());

        } catch (Exception ex) {
            log.error("Diff {} failed: {}", diffId, ex.getMessage(), ex);
            report.setStatus(DiffReport.DiffStatus.FAILED);
            diffReportRepository.save(report);
        }
    }

    // ─── Query ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DiffDtos.DiffResponse getDiff(UUID id) {
        DiffReport report = diffReportRepository.findById(id)
                .orElseThrow(() -> MetaDiffException.notFound("DiffReport", id));
        List<DiffEntry> entries = diffEntryRepository.findByDiffIdOrderByChangeType(id);
        return mapToResponse(report, entries);
    }

    @Transactional(readOnly = true)
    public DiffDtos.VisualizationResponse getVisualization(UUID id) {
        List<DiffEntry> entries = diffEntryRepository.findByDiffIdOrderByChangeType(id);

        // Build heat-map matrix data per component
        Map<String, DiffDtos.MatrixRow> matrix = new LinkedHashMap<>();
        for (DiffEntry e : entries) {
            String key = e.getComponentName();
            matrix.computeIfAbsent(key, k -> {
                DiffDtos.MatrixRow row = new DiffDtos.MatrixRow();
                row.setName(k);
                row.setComponentType(e.getComponentType());
                return row;
            });
            DiffDtos.MatrixRow row = matrix.get(key);
            switch (e.getChangeType()) {
                case ADDED    -> row.setAddedCount(row.getAddedCount() + 1);
                case REMOVED  -> row.setRemovedCount(row.getRemovedCount() + 1);
                case MODIFIED -> row.setModifiedCount(row.getModifiedCount() + 1);
                case RENAMED  -> row.setRenamedCount(row.getRenamedCount() + 1);
            }
            // Simple risk proxy for visualization
            int risk = (row.getAddedCount() * 3 + row.getRemovedCount() * 5 + row.getModifiedCount() * 4);
            row.setRiskProxy(Math.min(100, risk));
        }

        DiffDtos.VisualizationResponse viz = new DiffDtos.VisualizationResponse();
        viz.setMatrix(new ArrayList<>(matrix.values()));
        viz.setTotalChanges(entries.size());
        return viz;
    }

    @Transactional(readOnly = true)
    public List<DiffReport> getRecentDiffs(int limit) {
        return diffReportRepository.findTop10ByOrderByCreatedAtDesc();
    }

    public long countTotal() {
        return diffReportRepository.count();
    }

    // ─── Private helpers ──────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String fetchSnapshotContent(String snapshotId) {
        try {
            String url = snapshotServiceUrl + "/api/snapshots/" + snapshotId;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("data")) {
                Map<String, Object> data = (Map<String, Object>) response.get("data");
                Object raw = data.get("rawContent");
                if (raw != null) return raw.toString();
            }
        } catch (Exception ex) {
            log.warn("Could not fetch snapshot {} from snapshot-service: {}", snapshotId, ex.getMessage());
        }
        // Return demo content if snapshot-service unavailable
        return "{\"profiles\":{\"Admin\":{\"manageUsers\":true,\"viewAll\":true}},\"objects\":{\"Account\":{\"fields\":{\"Tier__c\":\"Platinum\",\"Region__c\":\"APAC\"}}}}";
    }

    private DiffDtos.DiffResponse mapToResponse(DiffReport report, List<DiffEntry> entries) {
        DiffDtos.DiffResponse r = new DiffDtos.DiffResponse();
        r.setId(report.getId().toString());
        r.setBeforeSnapshotId(report.getBeforeSnapshotId());
        r.setAfterSnapshotId(report.getAfterSnapshotId());
        r.setStatus(report.getStatus().name());
        r.setAddedCount(report.getAddedCount());
        r.setRemovedCount(report.getRemovedCount());
        r.setModifiedCount(report.getModifiedCount());
        r.setRenamedCount(report.getRenamedCount());
        r.setCreatedAt(report.getCreatedAt() != null ? report.getCreatedAt().toString() : null);
        r.setChanges(entries.stream().map(this::mapEntry).toList());
        return r;
    }

    private DiffDtos.DiffEntryDto mapEntry(DiffEntry e) {
        DiffDtos.DiffEntryDto dto = new DiffDtos.DiffEntryDto();
        dto.setId(e.getId().toString());
        dto.setChangeType(e.getChangeType().name());
        dto.setComponentType(e.getComponentType());
        dto.setComponentName(e.getComponentName());
        dto.setOldValue(e.getOldValue());
        dto.setNewValue(e.getNewValue());
        dto.setSimilarityScore(e.getSimilarityScore());
        return dto;
    }
}

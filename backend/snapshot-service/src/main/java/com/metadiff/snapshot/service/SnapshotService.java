package com.metadiff.snapshot.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.metadiff.shared.dto.PagedResponse;
import com.metadiff.shared.exception.MetaDiffException;
import com.metadiff.snapshot.domain.Snapshot;
import com.metadiff.snapshot.dto.SnapshotDtos;
import com.metadiff.snapshot.repository.SnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipInputStream;

/**
 * Snapshot ingestion pipeline:
 * validate → parse → normalize → persist → JGit commit → tree generation
 */
@Service
@RequiredArgsConstructor
public class SnapshotService {

    private static final Logger log = LoggerFactory.getLogger(SnapshotService.class);
    private static final long MAX_SIZE_BYTES = 250L * 1024 * 1024; // 250 MB

    private final SnapshotRepository snapshotRepository;
    private final GitCommitService gitCommitService;
    private final MetadataTreeService treeService;
    private final ObjectMapper objectMapper;

    // ─── Upload ────────────────────────────────────────────────────────────

    @Transactional
    public SnapshotDtos.SnapshotResponse ingestSnapshot(MultipartFile file,
                                                         String orgId,
                                                         String uploadedBy) {
        // Step 1: Validate
        validateFile(file);

        // Step 2: Read raw content
        String rawContent = extractContent(file);
        Snapshot.SnapshotFormat format = detectFormat(file.getOriginalFilename(), rawContent);

        // Step 3: Fingerprint (SHA-256)
        String fingerprint = sha256(rawContent);

        // Step 4: Persist (status = PROCESSING)
        String filename = sanitizeFilename(file.getOriginalFilename());
        Snapshot snapshot = Snapshot.builder()
                .orgId(orgId)
                .name(filename.replaceAll("\\.[^.]+$", ""))
                .filename(filename)
                .format(format)
                .fingerprint(fingerprint)
                .rawContent(rawContent)
                .sizeBytes(file.getSize())
                .status(Snapshot.SnapshotStatus.PROCESSING)
                .uploadedBy(uploadedBy)
                .build();

        snapshot = snapshotRepository.save(snapshot);
        final UUID snapshotId = snapshot.getId();

        // Step 5+6: Async — JGit commit + tree generation (updates status to READY)
        processAsync(snapshotId, orgId, filename, rawContent, format.name());

        return mapToResponse(snapshot);
    }

    @Async
    public void processAsync(UUID snapshotId, String orgId, String filename,
                             String rawContent, String format) {
        try {
            Snapshot snapshot = snapshotRepository.findById(snapshotId).orElseThrow();

            // Step 5: Commit to Git
            String commitHash = gitCommitService.commitSnapshot(
                    snapshotId.toString(), orgId, filename, rawContent);

            // Step 6: Generate tree and summary
            String summary = treeService.generateSummary(rawContent, format);

            snapshot.setCommitHash(commitHash);
            snapshot.setMetadataSummary(summary);
            snapshot.setStatus(Snapshot.SnapshotStatus.READY);
            snapshotRepository.save(snapshot);

            log.info("Snapshot {} fully processed: commitHash={}", snapshotId, commitHash);
        } catch (Exception ex) {
            log.error("Async processing failed for snapshot {}: {}", snapshotId, ex.getMessage(), ex);
            snapshotRepository.findById(snapshotId).ifPresent(s -> {
                s.setStatus(Snapshot.SnapshotStatus.FAILED);
                snapshotRepository.save(s);
                triggerNotification(snapshotId, s.getFilename(), ex.getMessage());
            });
        }
    }

    private void triggerNotification(UUID snapshotId, String filename, String errorMsg) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://localhost:8087/api/notifications";
            Map<String, String> req = Map.of(
                "title", "Snapshot Ingestion Failure",
                "message", "Failed to ingest snapshot " + filename + " (ID: " + snapshotId + "). Error: " + errorMsg,
                "type", "ERROR"
            );
            restTemplate.postForObject(url, req, Map.class);
            log.info("Sent failure notification for snapshot {}", snapshotId);
        } catch (Exception ex) {
            log.warn("Could not send failure notification for snapshot: {}", ex.getMessage());
        }
    }


    // ─── Read ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<SnapshotDtos.SnapshotResponse> listSnapshots(String orgId, String search,
                                                                       int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Snapshot> result = (search != null && !search.isBlank())
                ? snapshotRepository.searchSnapshots(orgId, search, pageable)
                : (orgId != null
                    ? snapshotRepository.findByOrgIdOrderByCreatedAtDesc(orgId, pageable)
                    : snapshotRepository.findAll(pageable));

        return PagedResponse.of(
                result.getContent().stream().map(this::mapToResponse).toList(),
                page, size, result.getTotalElements()
        );
    }

    @Transactional(readOnly = true)
    public SnapshotDtos.SnapshotResponse getSnapshot(UUID id) {
        return snapshotRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> MetaDiffException.notFound("Snapshot", id));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSnapshotTree(UUID id) {
        Snapshot snapshot = snapshotRepository.findById(id)
                .orElseThrow(() -> MetaDiffException.notFound("Snapshot", id));
        return treeService.buildTree(snapshot.getRawContent(), snapshot.getFormat().name());
    }

    @Transactional
    public void deleteSnapshot(UUID id) {
        if (!snapshotRepository.existsById(id)) {
            throw MetaDiffException.notFound("Snapshot", id);
        }
        snapshotRepository.deleteById(id);
        log.info("Deleted snapshot: {}", id);
    }

    // ─── Private helpers ───────────────────────────────────────────────────

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw MetaDiffException.badRequest("Uploaded file is empty");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw MetaDiffException.badRequest("File exceeds maximum size of 250 MB");
        }
        String name = file.getOriginalFilename();
        if (name == null || (!name.endsWith(".json") && !name.endsWith(".xml") && !name.endsWith(".zip"))) {
            throw MetaDiffException.badRequest("Unsupported format. Accepted: .json, .xml, .zip");
        }
    }

    private String extractContent(MultipartFile file) {
        try {
            String filename = file.getOriginalFilename();
            if (filename != null && filename.endsWith(".zip")) {
                // Extract first text entry from ZIP
                try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
                    var entry = zis.getNextEntry();
                    if (entry != null) {
                        return new String(zis.readAllBytes(), StandardCharsets.UTF_8);
                    }
                }
                return "{}";
            }
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw MetaDiffException.badRequest("Failed to read file content: " + ex.getMessage());
        }
    }

    private Snapshot.SnapshotFormat detectFormat(String filename, String content) {
        if (filename == null) return Snapshot.SnapshotFormat.JSON;
        if (filename.endsWith(".xml")) return Snapshot.SnapshotFormat.XML;
        if (filename.endsWith(".zip")) return Snapshot.SnapshotFormat.ZIP;
        return Snapshot.SnapshotFormat.JSON;
    }

    private String sha256(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            return UUID.randomUUID().toString();
        }
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "snapshot_" + Instant.now().toEpochMilli() + ".json";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private SnapshotDtos.SnapshotResponse mapToResponse(Snapshot s) {
        SnapshotDtos.SnapshotResponse r = new SnapshotDtos.SnapshotResponse();
        r.setId(s.getId().toString());
        r.setName(s.getName());
        r.setOrgId(s.getOrgId());
        r.setFilename(s.getFilename());
        r.setFormat(s.getFormat().name());
        r.setCommitHash(s.getCommitHash());
        r.setFingerprint(s.getFingerprint() != null
                ? s.getFingerprint().substring(0, Math.min(7, s.getFingerprint().length())) : null);
        r.setSizeBytes(s.getSizeBytes());
        r.setStatus(s.getStatus().name());
        r.setUploadedBy(s.getUploadedBy());
        r.setCreatedAt(s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
        return r;
    }
}

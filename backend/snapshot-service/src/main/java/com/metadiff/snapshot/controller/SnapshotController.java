package com.metadiff.snapshot.controller;

import com.metadiff.shared.dto.ApiResponse;
import com.metadiff.shared.dto.PagedResponse;
import com.metadiff.snapshot.dto.SnapshotDtos;
import com.metadiff.snapshot.service.SnapshotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/snapshots")
@RequiredArgsConstructor
@Tag(name = "Snapshots", description = "Metadata snapshot ingestion, versioning and exploration")
@SecurityRequirement(name = "bearerAuth")
public class SnapshotController {

    private final SnapshotService snapshotService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload and ingest a metadata snapshot")
    public ResponseEntity<ApiResponse<SnapshotDtos.SnapshotResponse>> upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam(defaultValue = "default-org") String orgId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String uploader = userDetails != null ? userDetails.getUsername() : "system";
        SnapshotDtos.SnapshotResponse response = snapshotService.ingestSnapshot(file, orgId, uploader);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response, "Snapshot ingested successfully"));
    }

    @GetMapping
    @Operation(summary = "List snapshots with optional search and org filter")
    public ResponseEntity<ApiResponse<PagedResponse<SnapshotDtos.SnapshotResponse>>> list(
            @RequestParam(required = false) String orgId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PagedResponse<SnapshotDtos.SnapshotResponse> result = snapshotService.listSnapshots(orgId, search, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a specific snapshot by ID")
    public ResponseEntity<ApiResponse<SnapshotDtos.SnapshotResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(snapshotService.getSnapshot(id)));
    }

    @GetMapping("/{id}/tree")
    @Operation(summary = "Get hierarchical metadata tree for a snapshot")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTree(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(snapshotService.getSnapshotTree(id)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a snapshot")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        snapshotService.deleteSnapshot(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Snapshot deleted"));
    }
}

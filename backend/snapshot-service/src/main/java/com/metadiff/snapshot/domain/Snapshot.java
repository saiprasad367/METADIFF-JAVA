package com.metadiff.snapshot.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "snapshots", indexes = {
        @Index(name = "idx_snapshot_org_id", columnList = "org_id"),
        @Index(name = "idx_snapshot_created_at", columnList = "created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Snapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private String orgId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "filename", nullable = false)
    private String filename;

    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false)
    private SnapshotFormat format;

    @Column(name = "commit_hash")
    private String commitHash;

    @Column(name = "fingerprint", nullable = false)
    private String fingerprint;

    @Column(name = "raw_content", columnDefinition = "TEXT")
    private String rawContent;

    @Column(name = "metadata_summary", columnDefinition = "TEXT")
    private String metadataSummary;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SnapshotStatus status = SnapshotStatus.PROCESSING;

    @Column(name = "uploaded_by")
    private String uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum SnapshotFormat { JSON, XML, ZIP }

    public enum SnapshotStatus { PROCESSING, READY, FAILED }
}

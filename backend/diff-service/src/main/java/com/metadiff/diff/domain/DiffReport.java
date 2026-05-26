package com.metadiff.diff.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "diff_reports", indexes = {
    @Index(name = "idx_diff_before", columnList = "before_snapshot_id"),
    @Index(name = "idx_diff_after",  columnList = "after_snapshot_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiffReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "before_snapshot_id", nullable = false)
    private String beforeSnapshotId;

    @Column(name = "after_snapshot_id", nullable = false)
    private String afterSnapshotId;

    @Column(name = "added_count")
    private int addedCount;

    @Column(name = "removed_count")
    private int removedCount;

    @Column(name = "modified_count")
    private int modifiedCount;

    @Column(name = "renamed_count")
    private int renamedCount;

    @Column(name = "summary_json", columnDefinition = "TEXT")
    private String summaryJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private DiffStatus status = DiffStatus.PENDING;

    @Column(name = "requested_by")
    private String requestedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum DiffStatus { PENDING, RUNNING, COMPLETED, FAILED }
}

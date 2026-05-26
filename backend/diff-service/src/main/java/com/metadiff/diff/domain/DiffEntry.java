package com.metadiff.diff.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "diff_entries", indexes = {
    @Index(name = "idx_entry_diff_id", columnList = "diff_id"),
    @Index(name = "idx_entry_change_type", columnList = "change_type")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiffEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "diff_id", nullable = false)
    private UUID diffId;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false)
    private ChangeType changeType;

    @Column(name = "component_type")
    private String componentType;   // Profile, Object, Class, Field, PermissionSet …

    @Column(name = "component_name", nullable = false)
    private String componentName;

    @Column(name = "attribute_path")
    private String attributePath;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "similarity_score")
    private Double similarityScore;  // 0.0–1.0 for RENAMED entries

    public enum ChangeType { ADDED, REMOVED, MODIFIED, RENAMED }
}

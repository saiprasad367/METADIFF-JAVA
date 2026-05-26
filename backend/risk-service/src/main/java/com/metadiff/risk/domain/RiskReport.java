package com.metadiff.risk.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "risk_reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RiskReport {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "diff_id", nullable = false, unique = true)
    private String diffId;
    @Column(name = "score")
    private int score;
    @Column(name = "level")
    private String level;
    @Column(name = "reasons_json", columnDefinition = "TEXT")
    private String reasonsJson;
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}

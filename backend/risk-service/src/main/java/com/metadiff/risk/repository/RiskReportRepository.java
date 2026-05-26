package com.metadiff.risk.repository;

import com.metadiff.risk.domain.RiskReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RiskReportRepository extends JpaRepository<RiskReport, UUID> {
    Optional<RiskReport> findByDiffId(String diffId);
    @Query("SELECT AVG(r.score) FROM RiskReport r")
    Optional<Double> findAverageScore();
    long countByLevelIn(List<String> levels);
}

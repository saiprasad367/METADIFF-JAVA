package com.metadiff.diff.repository;

import com.metadiff.diff.domain.DiffReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface DiffReportRepository extends JpaRepository<DiffReport, UUID> {
    List<DiffReport> findTop10ByOrderByCreatedAtDesc();
}

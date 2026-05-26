package com.metadiff.diff.repository;

import com.metadiff.diff.domain.DiffEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface DiffEntryRepository extends JpaRepository<DiffEntry, UUID> {
    List<DiffEntry> findByDiffIdOrderByChangeType(UUID diffId);
    long countByDiffId(UUID diffId);
}

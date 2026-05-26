package com.metadiff.snapshot.repository;

import com.metadiff.snapshot.domain.Snapshot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SnapshotRepository extends JpaRepository<Snapshot, UUID> {

    Page<Snapshot> findByOrgIdOrderByCreatedAtDesc(String orgId, Pageable pageable);

    @Query("SELECT s FROM Snapshot s WHERE " +
           "(:orgId IS NULL OR s.orgId = :orgId) AND " +
           "(:search IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(s.filename) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    Page<Snapshot> searchSnapshots(@Param("orgId") String orgId,
                                   @Param("search") String search,
                                   Pageable pageable);

    long countByOrgId(String orgId);

    @Query("SELECT COUNT(s) FROM Snapshot s")
    long countTotal();
}

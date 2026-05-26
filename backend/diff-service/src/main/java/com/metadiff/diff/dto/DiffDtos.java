package com.metadiff.diff.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

public class DiffDtos {

    @Data
    public static class DiffRequest {
        @NotBlank private String beforeSnapshotId;
        @NotBlank private String afterSnapshotId;
    }

    @Data
    public static class DiffResponse {
        private String id;
        private String beforeSnapshotId;
        private String afterSnapshotId;
        private String status;
        private int addedCount;
        private int removedCount;
        private int modifiedCount;
        private int renamedCount;
        private String createdAt;
        private List<DiffEntryDto> changes;
    }

    @Data
    public static class DiffEntryDto {
        private String id;
        private String changeType;
        private String componentType;
        private String componentName;
        private String oldValue;
        private String newValue;
        private Double similarityScore;
    }

    @Data
    public static class VisualizationResponse {
        private List<MatrixRow> matrix;
        private int totalChanges;
    }

    @Data
    public static class MatrixRow {
        private String name;
        private String componentType;
        private int addedCount;
        private int removedCount;
        private int modifiedCount;
        private int renamedCount;
        private int riskProxy;
    }
}

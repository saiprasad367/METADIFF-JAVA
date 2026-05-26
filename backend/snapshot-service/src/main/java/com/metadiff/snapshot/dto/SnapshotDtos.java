package com.metadiff.snapshot.dto;

import lombok.Data;

public class SnapshotDtos {

    @Data
    public static class SnapshotResponse {
        private String id;
        private String name;
        private String orgId;
        private String filename;
        private String format;
        private String commitHash;
        private String fingerprint;
        private Long sizeBytes;
        private String status;
        private String uploadedBy;
        private String createdAt;
    }
}

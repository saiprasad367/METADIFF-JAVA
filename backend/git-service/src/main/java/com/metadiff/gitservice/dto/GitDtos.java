package com.metadiff.gitservice.dto;

import lombok.Data;

public class GitDtos {

    @Data
    public static class CommitInfo {
        private String sha;
        private String fullSha;
        private String message;
        private String author;
        private String email;
        private String branch;
        private String timestamp;
        private int changes;
    }

    @Data
    public static class CompareResult {
        private String fromSha;
        private String toSha;
        private int added;
        private int removed;
        private int modified;
        private int filesTouched;
    }
}

package com.metadiff.risk.dto;

import lombok.Data;
import java.util.List;

public class RiskDtos {

    @Data
    public static class DiffEntryInput {
        private String componentType;
        private String changeType;
        private String componentName;
    }

    @Data
    public static class RiskReport {
        private String diffId;
        private int score;
        private String level;
        private int confidence;
        private int blastRadius;
        private List<String> reasons;
        private List<ComponentBreakdown> breakdown;
        private List<String> suggestedActions;
        private String explanation;
    }

    @Data
    public static class ComponentBreakdown {
        private String componentType;
        private int score;
        private String weight;
        private int added;
        private int removed;
        private int modified;
        private int renamed;
    }

    @Data
    public static class RiskReportEntity {
        private String id;
        private String diffId;
        private int score;
        private String level;
        private String reasonsJson;
        private String createdAt;
    }
}

package com.metadiff.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

public class AnalyticsDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardMetrics implements Serializable {
        private static final long serialVersionUID = 1L;
        private double avgRisk;
        private String riskDelta;
        private boolean riskUp;
        private String deploySuccess;
        private String deploySuccessDelta;
        private boolean deploySuccessUp;
        private String avgLeadTime;
        private String avgLeadTimeDelta;
        private boolean avgLeadTimeUp;
        private long totalSnapshots;
        private long totalDiffs;
        private long totalCommits;
        private long riskyDeployments;

    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendData implements Serializable {
        private static final long serialVersionUID = 1L;
        private List<Integer> riskScores;
        private List<Integer> deploymentFrequency;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HotspotComponent implements Serializable {
        private static final long serialVersionUID = 1L;
        private String name;
        private int changes;
        private int risk;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiskPrediction implements Serializable {
        private static final long serialVersionUID = 1L;
        private int score;
        private int margin;
        private String confidenceInterval;
        private String band;
        private String description;
        private String modelName;
        private String trainedDate;
    }
}

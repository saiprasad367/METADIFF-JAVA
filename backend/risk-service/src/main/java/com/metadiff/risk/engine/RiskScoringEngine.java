package com.metadiff.risk.engine;

import com.metadiff.risk.dto.RiskDtos;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Rule-based risk scoring engine.
 *
 * Scoring model:
 *  Base = 10
 *  + 5 per ADDED component
 *  + 8 per REMOVED component  (deletions are riskier)
 *  + 6 per MODIFIED component
 *  + 3 per RENAMED component
 *
 *  Component weight multipliers:
 *   Profile       ×2.0   (security surface)
 *   PermissionSet ×1.8
 *   Class/Trigger ×1.5
 *   Object        ×1.2
 *   Field         ×1.0
 *
 *  Score capped at 100. Level: LOW<30, MEDIUM<60, HIGH<85, CRITICAL≥85
 */
@Component
public class RiskScoringEngine {

    private static final Map<String, Double> COMPONENT_WEIGHTS = Map.of(
            "Profile",       2.0,
            "PermissionSet", 1.8,
            "Class",         1.5,
            "Object",        1.2,
            "Field",         1.0,
            "Metadata",      1.0
    );

    private static final int BASE_SCORE     = 10;
    private static final int ADDED_WEIGHT   = 5;
    private static final int REMOVED_WEIGHT = 8;
    private static final int MODIFIED_WEIGHT= 6;
    private static final int RENAMED_WEIGHT = 3;

    public RiskDtos.RiskReport calculate(List<RiskDtos.DiffEntryInput> entries, String diffId) {
        if (entries == null || entries.isEmpty()) {
            return buildReport(diffId, BASE_SCORE, List.of("No changes detected — baseline risk applied"));
        }

        double rawScore = BASE_SCORE;
        List<String> reasons = new ArrayList<>();
        Map<String, RiskDtos.ComponentBreakdown> breakdown = new LinkedHashMap<>();

        // Group by component type
        Map<String, List<RiskDtos.DiffEntryInput>> byType = new LinkedHashMap<>();
        for (RiskDtos.DiffEntryInput e : entries) {
            byType.computeIfAbsent(e.getComponentType(), k -> new ArrayList<>()).add(e);
        }

        for (Map.Entry<String, List<RiskDtos.DiffEntryInput>> group : byType.entrySet()) {
            String type = group.getKey();
            List<RiskDtos.DiffEntryInput> groupEntries = group.getValue();
            double weight = COMPONENT_WEIGHTS.getOrDefault(type, 1.0);

            int added = 0, removed = 0, modified = 0, renamed = 0;
            for (RiskDtos.DiffEntryInput e : groupEntries) {
                switch (e.getChangeType()) {
                    case "ADDED"    -> added++;
                    case "REMOVED"  -> removed++;
                    case "MODIFIED" -> modified++;
                    case "RENAMED"  -> renamed++;
                }
            }

            double componentScore = (added * ADDED_WEIGHT + removed * REMOVED_WEIGHT +
                    modified * MODIFIED_WEIGHT + renamed * RENAMED_WEIGHT) * weight;
            rawScore += componentScore;

            // Build reasons
            if (removed > 0) reasons.add(removed + " " + type + " component(s) removed — high blast radius");
            if (modified > 0) reasons.add(modified + " " + type + " component(s) modified — review required");
            if (added > 0)   reasons.add(added + " " + type + " component(s) added");
            if (renamed > 0) reasons.add(renamed + " " + type + " component(s) renamed");

            // Per-component breakdown
            RiskDtos.ComponentBreakdown cb = new RiskDtos.ComponentBreakdown();
            cb.setComponentType(type);
            cb.setScore((int) Math.min(100, componentScore));
            cb.setWeight(String.format("%.0f%%", weight * 20));
            cb.setAdded(added); cb.setRemoved(removed);
            cb.setModified(modified); cb.setRenamed(renamed);
            breakdown.put(type, cb);
        }

        int finalScore = (int) Math.min(100, rawScore);
        return buildReport(diffId, finalScore, reasons, new ArrayList<>(breakdown.values()));
    }

    private RiskDtos.RiskReport buildReport(String diffId, int score, List<String> reasons) {
        return buildReport(diffId, score, reasons, List.of());
    }

    private RiskDtos.RiskReport buildReport(String diffId, int score, List<String> reasons,
                                             List<RiskDtos.ComponentBreakdown> breakdown) {
        RiskDtos.RiskReport report = new RiskDtos.RiskReport();
        report.setDiffId(diffId);
        report.setScore(score);
        report.setLevel(calculateLevel(score));
        report.setReasons(reasons);
        report.setBreakdown(breakdown);
        report.setConfidence(92);
        report.setBlastRadius(breakdown.stream().mapToInt(b -> b.getAdded() + b.getRemoved() + b.getModified()).sum());
        return report;
    }

    private String calculateLevel(int score) {
        if (score >= 85) return "CRITICAL";
        if (score >= 60) return "HIGH";
        if (score >= 30) return "MEDIUM";
        return "LOW";
    }

    public String generateExplanation(RiskDtos.RiskReport report) {
        StringBuilder sb = new StringBuilder();
        sb.append("This deployment scores ").append(report.getScore())
          .append("/100 (").append(report.getLevel()).append("). ");

        if (report.getBreakdown() != null) {
            report.getBreakdown().stream()
                    .filter(b -> b.getScore() > 40)
                    .forEach(b -> {
                        sb.append(b.getComponentType()).append(" changes are a primary driver (score: ")
                          .append(b.getScore()).append("). ");
                        if (b.getRemoved() > 0)
                            sb.append(b.getRemoved()).append(" ").append(b.getComponentType())
                              .append(" deletion(s) increase blast radius significantly. ");
                        if (b.getModified() > 0)
                            sb.append(b.getModified()).append(" ").append(b.getComponentType())
                              .append(" modification(s) require regression testing. ");
                    });
        }

        List<String> actions = new ArrayList<>();
        if (report.getScore() >= 70) actions.add("Stage to QA environment before production cutover");
        if (report.getScore() >= 60) actions.add("Require 2 reviewer approvals before deploying");
        if (report.getScore() >= 85) actions.add("Consider splitting into multiple smaller deployments");
        actions.add("Run automated regression suite covering affected components");

        report.setSuggestedActions(actions);
        return sb.toString().trim();
    }
}

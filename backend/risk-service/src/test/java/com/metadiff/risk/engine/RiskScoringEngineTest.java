package com.metadiff.risk.engine;

import com.metadiff.risk.dto.RiskDtos;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class RiskScoringEngineTest {

    private final RiskScoringEngine engine = new RiskScoringEngine();

    @Test
    public void testCalculateBaselineRisk() {
        RiskDtos.RiskReport report = engine.calculate(new ArrayList<>(), "diff-123");
        assertNotNull(report);
        assertEquals(10, report.getScore());
        assertEquals("LOW", report.getLevel());
        assertTrue(report.getReasons().get(0).contains("No changes detected"));
    }

    @Test
    public void testCalculateHighRisk() {
        List<RiskDtos.DiffEntryInput> entries = new ArrayList<>();
        
        // Add 2 MODIFIED Profiles (Weight 2.0, Score per mod = 6. Multiplier = 2.0. So 2 * 6 * 2.0 = 24 points)
        RiskDtos.DiffEntryInput entry1 = new RiskDtos.DiffEntryInput();
        entry1.setComponentType("Profile");
        entry1.setComponentName("Admin.profile");
        entry1.setChangeType("MODIFIED");
        entries.add(entry1);

        RiskDtos.DiffEntryInput entry2 = new RiskDtos.DiffEntryInput();
        entry2.setComponentType("Profile");
        entry2.setComponentName("Standard.profile");
        entry2.setChangeType("MODIFIED");
        entries.add(entry2);

        // Add 1 REMOVED Class (Weight 1.5, Score per rem = 8. Multiplier = 1.5. So 1 * 8 * 1.5 = 12 points)
        RiskDtos.DiffEntryInput entry3 = new RiskDtos.DiffEntryInput();
        entry3.setComponentType("Class");
        entry3.setComponentName("PaymentGateway.cls");
        entry3.setChangeType("REMOVED");
        entries.add(entry3);

        // Total score calculation:
        // Base: 10
        // Profiles score: 24
        // Class score: 12
        // Total = 46. Level should be MEDIUM.
        
        RiskDtos.RiskReport report = engine.calculate(entries, "diff-123");
        assertNotNull(report);
        assertEquals(46, report.getScore());
        assertEquals("MEDIUM", report.getLevel());
        
        // Check breakdown contains both Profile and Class
        assertEquals(2, report.getBreakdown().size());
        boolean hasProfile = false;
        boolean hasClass = false;
        
        for (RiskDtos.ComponentBreakdown cb : report.getBreakdown()) {
            if ("Profile".equals(cb.getComponentType())) {
                assertEquals(24, cb.getScore());
                assertEquals(2, cb.getModified());
                hasProfile = true;
            } else if ("Class".equals(cb.getComponentType())) {
                assertEquals(12, cb.getScore());
                assertEquals(1, cb.getRemoved());
                hasClass = true;
            }
        }
        
        assertTrue(hasProfile);
        assertTrue(hasClass);
    }

    @Test
    public void testGenerateExplanation() {
        RiskDtos.RiskReport report = new RiskDtos.RiskReport();
        report.setScore(88);
        report.setLevel("CRITICAL");
        
        List<RiskDtos.ComponentBreakdown> breakdowns = new ArrayList<>();
        RiskDtos.ComponentBreakdown cb = new RiskDtos.ComponentBreakdown();
        cb.setComponentType("Profile");
        cb.setScore(50);
        cb.setModified(2);
        cb.setRemoved(1);
        breakdowns.add(cb);
        
        report.setBreakdown(breakdowns);

        String explanation = engine.generateExplanation(report);
        assertNotNull(explanation);
        assertTrue(explanation.contains("This deployment scores 88/100 (CRITICAL)."));
        assertTrue(explanation.contains("Profile changes are a primary driver (score: 50)."));
        assertTrue(explanation.contains("1 Profile deletion(s) increase blast radius significantly."));
        assertTrue(explanation.contains("2 Profile modification(s) require regression testing."));
        
        // Suggested actions checks
        assertNotNull(report.getSuggestedActions());
        assertTrue(report.getSuggestedActions().contains("Consider splitting into multiple smaller deployments"));
        assertTrue(report.getSuggestedActions().contains("Stage to QA environment before production cutover"));
    }
}

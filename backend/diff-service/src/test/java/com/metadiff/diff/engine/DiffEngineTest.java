package com.metadiff.diff.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.metadiff.diff.domain.DiffEntry;
import com.metadiff.diff.domain.DiffEntry.ChangeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class DiffEngineTest {

    private DiffEngine diffEngine;

    @BeforeEach
    public void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        XmlMapper xmlMapper = new XmlMapper();
        diffEngine = new DiffEngine(objectMapper, xmlMapper);
    }

    @Test
    public void testComputeDiffJson() {
        String beforeJson = "{\n" +
                "  \"config\": {\n" +
                "    \"port\": 80,\n" +
                "    \"name\": \"MetaDiff\",\n" +
                "    \"redundant\": true,\n" +
                "    \"oldNameComponent\": \"value\"\n" +
                "  }\n" +
                "}";

        String afterJson = "{\n" +
                "  \"config\": {\n" +
                "    \"port\": 8080,\n" +
                "    \"name\": \"MetaDiff\",\n" +
                "    \"newKey\": \"new\",\n" +
                "    \"newNameComponent\": \"value\"\n" +
                "  }\n" +
                "}";

        UUID diffId = UUID.randomUUID();
        List<DiffEntry> entries = diffEngine.compute(beforeJson, "JSON", afterJson, "JSON", diffId);

        assertNotNull(entries);

        // Expecting:
        // 1. MODIFIED for config.port (80 -> 8080)
        // 2. ADDED for config.newKey (null -> new)
        // 3. RENAMED for config.oldNameComponent -> config.newNameComponent (since they end with oldNameComponent and newNameComponent which share similarity)
        // 4. REMOVED for config.redundant (true -> null)
        
        boolean hasModified = false;
        boolean hasAdded = false;
        boolean hasRemoved = false;
        boolean hasRenamed = false;

        for (DiffEntry entry : entries) {
            assertEquals(diffId, entry.getDiffId());
            if (entry.getComponentName().equals("config.port")) {
                assertEquals(ChangeType.MODIFIED, entry.getChangeType());
                assertEquals("80", entry.getOldValue());
                assertEquals("8080", entry.getNewValue());
                hasModified = true;
            } else if (entry.getComponentName().equals("config.newKey")) {
                assertEquals(ChangeType.ADDED, entry.getChangeType());
                assertNull(entry.getOldValue());
                assertEquals("new", entry.getNewValue());
                hasAdded = true;
            } else if (entry.getComponentName().equals("config.redundant")) {
                assertEquals(ChangeType.REMOVED, entry.getChangeType());
                assertEquals("true", entry.getOldValue());
                assertNull(entry.getNewValue());
                hasRemoved = true;
            } else if (entry.getComponentName().equals("config.oldNameComponent")) {
                assertEquals(ChangeType.RENAMED, entry.getChangeType());
                hasRenamed = true;
            }
        }

        assertTrue(hasModified, "Should have a MODIFIED entry for config.port");
        assertTrue(hasAdded, "Should have an ADDED entry for config.newKey");
        assertTrue(hasRemoved, "Should have a REMOVED entry for config.redundant");
        assertTrue(hasRenamed, "Should have a RENAMED entry for config.oldNameComponent");
    }

    @Test
    public void testSimilarity() {
        // Similar ending segments: similarity should be above 0.75
        double score = diffEngine.similarity("app.controller.UserController", "app.controller.UserControl");
        assertTrue(score >= 0.75, "Similarity should meet the threshold");

        // Totally different segments
        double lowScore = diffEngine.similarity("app.controller.UserController", "app.model.Order");
        assertTrue(lowScore < 0.5, "Similarity should be low");
    }
}

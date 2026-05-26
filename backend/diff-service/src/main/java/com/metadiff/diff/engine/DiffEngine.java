package com.metadiff.diff.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.metadiff.diff.domain.DiffEntry;
import com.metadiff.diff.domain.DiffEntry.ChangeType;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Core O(n) diff engine.
 *
 * Algorithm:
 *  1. Flatten both snapshots into { key → value } maps using HashMap  O(n)
 *  2. Detect ADDED   — keys in after  but not in before               O(n)
 *  3. Detect REMOVED — keys in before but not in after                O(n)
 *  4. Detect MODIFIED — keys in both with different values            O(n)
 *  5. Detect RENAMED — removed keys with Levenshtein similarity ≥ 0.8 O(n²) bounded by removed.size
 */
@Component
@RequiredArgsConstructor
public class DiffEngine {

    private static final Logger log = LoggerFactory.getLogger(DiffEngine.class);
    private static final double RENAME_THRESHOLD = 0.75;

    private final ObjectMapper jsonMapper;
    private final XmlMapper xmlMapper;

    public List<DiffEntry> compute(String beforeContent, String beforeFormat,
                                   String afterContent, String afterFormat,
                                   UUID diffId) {
        Map<String, String> beforeMap = flatten(beforeContent, beforeFormat);
        Map<String, String> afterMap  = flatten(afterContent,  afterFormat);

        List<DiffEntry> entries = new ArrayList<>();

        // Use HashSets for O(1) lookup
        Set<String> beforeKeys = new HashSet<>(beforeMap.keySet());
        Set<String> afterKeys  = new HashSet<>(afterMap.keySet());

        List<String> removedKeys = new ArrayList<>();
        List<String> addedKeys   = new ArrayList<>();

        // MODIFIED and potential REMOVED
        for (String key : beforeKeys) {
            if (afterKeys.contains(key)) {
                String bv = beforeMap.get(key);
                String av = afterMap.get(key);
                if (!Objects.equals(bv, av)) {
                    entries.add(entry(diffId, ChangeType.MODIFIED, key, bv, av, null));
                }
            } else {
                removedKeys.add(key);
            }
        }

        // ADDED candidates
        for (String key : afterKeys) {
            if (!beforeKeys.contains(key)) {
                addedKeys.add(key);
            }
        }

        // RENAMED detection — match removed ↔ added by Levenshtein similarity
        Set<String> matchedAdded   = new HashSet<>();
        Set<String> matchedRemoved = new HashSet<>();

        for (String rk : removedKeys) {
            double bestScore = 0;
            String bestMatch = null;
            for (String ak : addedKeys) {
                if (matchedAdded.contains(ak)) continue;
                double score = similarity(rk, ak);
                if (score > bestScore && score >= RENAME_THRESHOLD) {
                    bestScore = score;
                    bestMatch = ak;
                }
            }
            if (bestMatch != null) {
                DiffEntry renamedEntry = entry(diffId, ChangeType.RENAMED, rk,
                        beforeMap.get(rk), afterMap.get(bestMatch), bestScore);
                renamedEntry.setNewValue(bestMatch + " → " + afterMap.get(bestMatch));
                entries.add(renamedEntry);
                matchedAdded.add(bestMatch);
                matchedRemoved.add(rk);
            }
        }

        // Remaining REMOVED
        for (String rk : removedKeys) {
            if (!matchedRemoved.contains(rk)) {
                entries.add(entry(diffId, ChangeType.REMOVED, rk, beforeMap.get(rk), null, null));
            }
        }

        // Remaining ADDED
        for (String ak : addedKeys) {
            if (!matchedAdded.contains(ak)) {
                entries.add(entry(diffId, ChangeType.ADDED, ak, null, afterMap.get(ak), null));
            }
        }

        log.info("Diff complete: diffId={} added={} removed={} modified={} renamed={}",
                diffId,
                entries.stream().filter(e -> e.getChangeType() == ChangeType.ADDED).count(),
                entries.stream().filter(e -> e.getChangeType() == ChangeType.REMOVED).count(),
                entries.stream().filter(e -> e.getChangeType() == ChangeType.MODIFIED).count(),
                entries.stream().filter(e -> e.getChangeType() == ChangeType.RENAMED).count());

        return entries;
    }

    // ─── Flatten any JSON/XML into a flat key→value map ───────────────────

    Map<String, String> flatten(String content, String format) {
        try {
            JsonNode root = "XML".equalsIgnoreCase(format)
                    ? xmlMapper.readTree(content.getBytes())
                    : jsonMapper.readTree(content);
            Map<String, String> result = new LinkedHashMap<>();
            flattenNode(root, "", result, 0);
            return result;
        } catch (Exception ex) {
            log.warn("Could not parse content for diff (format={}): {}", format, ex.getMessage());
            return flattenAsLines(content);
        }
    }

    private void flattenNode(JsonNode node, String prefix, Map<String, String> acc, int depth) {
        if (depth > 20) return;
        if (node.isObject()) {
            node.fields().forEachRemaining(e ->
                    flattenNode(e.getValue(), prefix.isEmpty() ? e.getKey() : prefix + "." + e.getKey(), acc, depth + 1));
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                flattenNode(node.get(i), prefix + "[" + i + "]", acc, depth + 1);
            }
        } else {
            acc.put(prefix, node.asText());
        }
    }

    /** Fallback: treat each line as a key */
    private Map<String, String> flattenAsLines(String content) {
        Map<String, String> map = new LinkedHashMap<>();
        if (content == null) return map;
        String[] lines = content.split("\n");
        for (int i = 0; i < lines.length; i++) {
            map.put("line[" + i + "]", lines[i].trim());
        }
        return map;
    }

    // ─── Levenshtein-based name similarity ────────────────────────────────

    double similarity(String a, String b) {
        if (a == null || b == null) return 0;
        // Compare just the last segment (after last dot) for component names
        String sa = lastSegment(a);
        String sb = lastSegment(b);
        int dist = levenshtein(sa.toLowerCase(), sb.toLowerCase());
        int maxLen = Math.max(sa.length(), sb.length());
        return maxLen == 0 ? 1.0 : 1.0 - (double) dist / maxLen;
    }

    private String lastSegment(String key) {
        int idx = key.lastIndexOf('.');
        return idx >= 0 ? key.substring(idx + 1) : key;
    }

    private int levenshtein(String a, String b) {
        int la = a.length(), lb = b.length();
        int[][] dp = new int[la + 1][lb + 1];
        for (int i = 0; i <= la; i++) dp[i][0] = i;
        for (int j = 0; j <= lb; j++) dp[0][j] = j;
        for (int i = 1; i <= la; i++) {
            for (int j = 1; j <= lb; j++) {
                dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1)
                        ? dp[i - 1][j - 1]
                        : 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));
            }
        }
        return dp[la][lb];
    }

    // ─── Helper ───────────────────────────────────────────────────────────

    private DiffEntry entry(UUID diffId, ChangeType type, String name,
                            String oldVal, String newVal, Double similarity) {
        String[] parts = name.split("\\.");
        String componentType = parts.length > 1
                ? categorize(parts[parts.length - 2])
                : categorize(parts[0]);

        return DiffEntry.builder()
                .diffId(diffId)
                .changeType(type)
                .componentType(componentType)
                .componentName(name)
                .oldValue(truncate(oldVal))
                .newValue(truncate(newVal))
                .similarityScore(similarity)
                .build();
    }

    private String categorize(String segment) {
        String s = segment.toLowerCase();
        if (s.contains("profile")) return "Profile";
        if (s.contains("permission") || s.contains("permset")) return "PermissionSet";
        if (s.contains("class") || s.contains("trigger") || s.contains("cls")) return "Class";
        if (s.contains("object")) return "Object";
        if (s.contains("field")) return "Field";
        return "Metadata";
    }

    private String truncate(String val) {
        if (val == null) return null;
        return val.length() > 2000 ? val.substring(0, 2000) + "…" : val;
    }

    // Allow UUID usage in non-Spring contexts (tests)
    public List<DiffEntry> compute(String bc, String bf, String ac, String af, String diffIdStr) {
        return compute(bc, bf, ac, af, UUID.fromString(diffIdStr));
    }
}

package com.metadiff.gitservice.controller;

import com.metadiff.gitservice.dto.GitDtos;
import com.metadiff.gitservice.service.GitHistoryService;
import com.metadiff.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/git")
@RequiredArgsConstructor
@Tag(name = "Git Operations", description = "Git commit history and comparisons")
@SecurityRequirement(name = "bearerAuth")
public class GitController {

    private final GitHistoryService gitHistoryService;

    @GetMapping("/history")
    @Operation(summary = "Get commit history")
    public ResponseEntity<ApiResponse<List<GitDtos.CommitInfo>>> getHistory(
            @RequestParam(defaultValue = "20") int limit) {
        List<GitDtos.CommitInfo> history = gitHistoryService.getHistory(limit);
        return ResponseEntity.ok(ApiResponse.ok(history, "Git history retrieved successfully"));
    }

    @GetMapping("/commits/{sha}")
    @Operation(summary = "Get a commit by SHA")
    public ResponseEntity<ApiResponse<GitDtos.CommitInfo>> getCommit(
            @PathVariable String sha) {
        GitDtos.CommitInfo commit = gitHistoryService.getCommit(sha);
        return ResponseEntity.ok(ApiResponse.ok(commit, "Commit details retrieved successfully"));
    }

    @GetMapping("/compare")
    @Operation(summary = "Compare two commits")
    public ResponseEntity<ApiResponse<GitDtos.CompareResult>> compare(
            @RequestParam("from") String fromSha,
            @RequestParam("to") String toSha) {
        GitDtos.CompareResult result = gitHistoryService.compare(fromSha, toSha);
        return ResponseEntity.ok(ApiResponse.ok(result, "Commits compared successfully"));
    }
}

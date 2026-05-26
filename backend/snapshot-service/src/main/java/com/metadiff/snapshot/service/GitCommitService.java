package com.metadiff.snapshot.service;

import com.metadiff.shared.exception.MetaDiffException;
import lombok.RequiredArgsConstructor;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * JGit integration — auto-commits each snapshot into a local Git repository.
 * Every snapshot becomes a versioned, recoverable artifact.
 */
@Service
@RequiredArgsConstructor
public class GitCommitService {

    private static final Logger log = LoggerFactory.getLogger(GitCommitService.class);

    @Value("${git.repo.path:./git-storage}")
    private String repoPath;

    private Git git;

    @PostConstruct
    public void initRepository() {
        try {
            File repoDir = new File(repoPath);
            File gitDir = new File(repoDir, ".git");

            if (gitDir.exists()) {
                Repository repo = new FileRepositoryBuilder()
                        .setGitDir(gitDir)
                        .build();
                git = new Git(repo);
                log.info("Opened existing Git repository at: {}", repoPath);
            } else {
                repoDir.mkdirs();
                git = Git.init().setDirectory(repoDir).call();
                // Create initial commit so HEAD exists
                File readme = new File(repoDir, "README.md");
                Files.writeString(readme.toPath(), "# MetaDiff Snapshot Repository\nVersioned metadata snapshots.\n");
                git.add().addFilepattern("README.md").call();
                git.commit()
                   .setMessage("chore: initialize MetaDiff snapshot repository")
                   .setAuthor("MetaDiff System", "system@metadiff.io")
                   .call();
                log.info("Initialized new Git repository at: {}", repoPath);
            }
        } catch (Exception ex) {
            log.error("Failed to initialize Git repository: {}", ex.getMessage(), ex);
            throw MetaDiffException.internalError("Git repository initialization failed", ex);
        }
    }

    /**
     * Commits a snapshot file to the local repository and returns the SHA.
     */
    public String commitSnapshot(String snapshotId, String orgId, String filename, String content) {
        try {
            // Write file into org-specific directory
            Path orgDir = Paths.get(repoPath, orgId);
            Files.createDirectories(orgDir);

            Path filePath = orgDir.resolve(filename);
            Files.writeString(filePath, content, StandardCharsets.UTF_8);

            // Stage and commit
            String relativePath = orgId + "/" + filename;
            git.add().addFilepattern(relativePath).call();

            var revCommit = git.commit()
                    .setMessage("snapshot: ingest " + snapshotId + " [" + orgId + "] " + filename)
                    .setAuthor("MetaDiff System", "system@metadiff.io")
                    .call();

            String sha = ObjectId.toString(revCommit.getId());
            log.info("Committed snapshot {} to Git: sha={}", snapshotId, sha);
            return sha;

        } catch (IOException | GitAPIException ex) {
            log.error("Git commit failed for snapshot {}: {}", snapshotId, ex.getMessage(), ex);
            throw MetaDiffException.internalError("Git commit failed", ex);
        }
    }
}

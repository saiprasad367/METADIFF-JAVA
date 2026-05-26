package com.metadiff.snapshot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class SnapshotServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SnapshotServiceApplication.class, args);
    }
}

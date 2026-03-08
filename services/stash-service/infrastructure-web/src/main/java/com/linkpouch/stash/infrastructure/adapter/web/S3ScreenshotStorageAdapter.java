package com.linkpouch.stash.infrastructure.adapter.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.port.outbound.ScreenshotStorage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

@Slf4j
@Component
@RequiredArgsConstructor
public class S3ScreenshotStorageAdapter implements ScreenshotStorage {

    private final S3Client s3Client;

    @Value("${linkpouch.s3.bucket}")
    private String s3Bucket;

    @Override
    public void delete(final String key) {
        if (key == null) {
            return;
        }
        try {
            s3Client.deleteObject(
                    DeleteObjectRequest.builder().bucket(s3Bucket).key(key).build());
            log.debug("Deleted screenshot from storage: {}", key);
        } catch (NoSuchKeyException e) {
            log.debug("Screenshot key not found in storage (already deleted?): {}", key);
        } catch (Exception e) {
            log.warn("Failed to delete screenshot from storage: {}", key, e);
        }
    }
}

package com.linkpouch.stash.infrastructure.adapter.web;

import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.application.service.LinkManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ScreenshotController {

    private final LinkManagementService linkService;
    private final S3Client s3Client;

    @Value("${linkpouch.s3.bucket}")
    private String s3Bucket;

    @GetMapping(value = "/links/{linkId}/screenshot", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getScreenshot(@PathVariable UUID linkId) {
        var link = linkService.findLinkById(linkId)
                .orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        if (link.getScreenshotKey() == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            var request = GetObjectRequest.builder()
                    .bucket(s3Bucket)
                    .key(link.getScreenshotKey().getValue())
                    .build();

            byte[] bytes = s3Client.getObjectAsBytes(request).asByteArray();

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(bytes);

        } catch (NoSuchKeyException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }
}

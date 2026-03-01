package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.domain.exception.ForbiddenException;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.port.in.FindLinkByIdQuery;
import com.linkpouch.stash.domain.port.in.FindStashByIdQuery;
import com.linkpouch.stash.domain.service.StashSignatureService;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

@RestController
@RequiredArgsConstructor
public class ScreenshotController {

    private final FindStashByIdQuery findStashByIdQuery;
    private final FindLinkByIdQuery findLinkByIdQuery;
    private final StashSignatureService signatureService;
    private final S3Client s3Client;

    @Value("${linkpouch.s3.bucket}")
    private String s3Bucket;

    @GetMapping("/stashes/{stashId}/links/{linkId}/screenshot")
    public ResponseEntity<byte[]> getScreenshot(
            @PathVariable("stashId") final UUID stashId,
            @PathVariable("linkId") final UUID linkId,
            @RequestHeader(value = "X-Stash-Signature", required = false) final String headerSig,
            @RequestParam(value = "sig", required = false) final String querySig) {

        final String signature = headerSig != null ? headerSig : querySig;

        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), signature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final var link =
                findLinkByIdQuery.execute(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        if (!link.getStashId().equals(stashId)) {
            throw new ForbiddenException("Link does not belong to this stash");
        }

        if (link.getScreenshotKey() == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            final var request = GetObjectRequest.builder()
                    .bucket(s3Bucket)
                    .key(link.getScreenshotKey().getValue())
                    .build();

            final byte[] bytes = s3Client.getObjectAsBytes(request).asByteArray();

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

package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.StashesApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.application.exception.UnauthorizedException;
import com.linkpouch.stash.application.service.SignatureValidationService;
import com.linkpouch.stash.application.service.StashManagementService;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class StashController implements StashesApi {

    private final StashManagementService stashService;
    private final SignatureValidationService signatureService;
    private final ApiDtoMapper mapper;

    @Override
    public ResponseEntity<StashResponseDTO> createStash(
            final CreateStashRequestDTO createStashRequestDTO) {
        final var request = mapper.mapIn(createStashRequestDTO);
        final var stash = stashService.createStash(request.name());

        final var response = mapper.mapOut(stash);
        final String signedUrl =
                signatureService.generateSignedUrl(stash.getId(), stash.getSecretKey().getValue());
        response.setSignedUrl(signedUrl);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Override
    public ResponseEntity<StashResponseDTO> getStash(
            final UUID stashId, final String xStashSignature) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        return ResponseEntity.ok(mapper.mapOut(stash));
    }

    @Override
    public ResponseEntity<StashResponseDTO> updateStash(
            final UUID stashId,
            final String xStashSignature,
            final UpdateStashRequestDTO updateStashRequestDTO) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final var updatedStash =
                stashService.updateStashName(stashId, updateStashRequestDTO.getName());
        return ResponseEntity.ok(mapper.mapOut(updatedStash));
    }

    @Override
    public ResponseEntity<Void> deleteStash(final UUID stashId, final String xStashSignature) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        stashService.deleteStash(stashId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<SignedUrlResponseDTO> generateSignedUrl(final UUID stashId) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        final String signature =
                signatureService.generateSignature(stashId, stash.getSecretKey().getValue());
        final String signedUrl =
                signatureService.generateSignedUrl(stashId, stash.getSecretKey().getValue());

        final SignedUrlResponseDTO response = new SignedUrlResponseDTO();
        response.setStashId(stashId);
        response.setSignature(signature);
        response.setSignedUrl(signedUrl);

        return ResponseEntity.ok(response);
    }
}

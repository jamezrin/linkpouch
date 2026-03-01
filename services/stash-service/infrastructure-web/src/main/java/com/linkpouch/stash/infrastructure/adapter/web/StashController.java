package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.StashesApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.port.in.CreateStashCommand;
import com.linkpouch.stash.domain.port.in.CreateStashUseCase;
import com.linkpouch.stash.domain.port.in.DeleteStashUseCase;
import com.linkpouch.stash.domain.port.in.FindStashByIdQuery;
import com.linkpouch.stash.domain.port.in.UpdateStashNameUseCase;
import com.linkpouch.stash.domain.service.StashSignatureService;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class StashController implements StashesApi {

    private final CreateStashUseCase createStashUseCase;
    private final FindStashByIdQuery findStashByIdQuery;
    private final UpdateStashNameUseCase updateStashNameUseCase;
    private final DeleteStashUseCase deleteStashUseCase;
    private final StashSignatureService signatureService;
    private final ApiDtoMapper mapper;

    @Override
    public ResponseEntity<StashResponseDTO> createStash(
            final CreateStashRequestDTO createStashRequestDTO) {
        final var command = new CreateStashCommand(createStashRequestDTO.getName());
        final var stash = createStashUseCase.execute(command);

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
                findStashByIdQuery
                        .execute(stashId)
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
                findStashByIdQuery
                        .execute(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final var updatedStash =
                updateStashNameUseCase.execute(stashId, updateStashRequestDTO.getName());
        return ResponseEntity.ok(mapper.mapOut(updatedStash));
    }

    @Override
    public ResponseEntity<Void> deleteStash(final UUID stashId, final String xStashSignature) {
        final var stash =
                findStashByIdQuery
                        .execute(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        deleteStashUseCase.execute(stashId);
        return ResponseEntity.noContent().build();
    }
}

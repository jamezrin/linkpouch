package com.linkpouch.stash.infrastructure.adapter.web;

import com.linkpouch.stash.api.controller.StashesApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.application.exception.UnauthorizedException;
import com.linkpouch.stash.application.service.SignatureValidationService;
import com.linkpouch.stash.application.service.StashManagementService;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class StashController implements StashesApi {

    private final StashManagementService stashService;
    private final SignatureValidationService signatureService;
    private final ApiDtoMapper mapper;

    @Override
    public ResponseEntity<StashResponseDTO> createStash(CreateStashRequestDTO createStashRequestDTO) {
        var request = mapper.mapIn(createStashRequestDTO);
        var stash = stashService.createStash(request.name());
        
        var response = mapper.mapOut(stash);
        String signedUrl = signatureService.generateSignedUrl(stash.getId(), stash.getSecretKey().getValue());
        response.setSignedUrl(signedUrl);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Override
    public ResponseEntity<Void> deleteStash(UUID stashId, String xStashSignature) {
        var stash = stashService.findStashById(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));
        
        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }
        
        stashService.deleteStash(stashId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<StashResponseDTO> getStash(UUID stashId, String xStashSignature) {
        var stash = stashService.findStashById(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));
        
        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }
        
        return ResponseEntity.ok(mapper.mapOut(stash));
    }

    @Override
    public ResponseEntity<SignedUrlResponseDTO> generateSignedUrl(UUID stashId) {
        var stash = stashService.findStashById(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));
        
        String signature = signatureService.generateSignature(stashId, stash.getSecretKey().getValue());
        String signedUrl = signatureService.generateSignedUrl(stashId, stash.getSecretKey().getValue());
        
        SignedUrlResponseDTO response = new SignedUrlResponseDTO();
        response.setStashId(stashId);
        response.setSignature(signature);
        response.setSignedUrl(signedUrl);
        
        return ResponseEntity.ok(response);
    }
}

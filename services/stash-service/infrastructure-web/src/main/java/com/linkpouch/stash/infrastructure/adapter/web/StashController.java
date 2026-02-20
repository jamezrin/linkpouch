package com.linkpouch.stash.infrastructure.adapter.web;

import com.linkpouch.stash.api.controller.StashesApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.service.StashManagementService;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class StashController implements StashesApi {
    
    private final StashManagementService stashService;
    private final ApiDtoMapper mapper;
    
    @Override
    public ResponseEntity<StashResponseDTO> createStash(CreateStashRequestDTO createStashRequestDTO) {
        var request = mapper.mapIn(createStashRequestDTO);
        var response = stashService.createStashResponse(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.mapOut(response));
    }
    
    @Override
    public ResponseEntity<Void> deleteStash(UUID stashId) {
        stashService.deleteStash(stashId);
        return ResponseEntity.noContent().build();
    }
    
    @Override
    public ResponseEntity<StashResponseDTO> getStash(UUID stashId) {
        var stash = stashService.findStashById(stashId)
                .orElseThrow(() -> new IllegalArgumentException("Stash not found: " + stashId));
        var request = new com.linkpouch.stash.application.dto.CreateStashRequest(stash.getName().getValue());
        var response = stashService.createStashResponse(request);
        return ResponseEntity.ok(mapper.mapOut(response));
    }
    
    @Override
    public ResponseEntity<List<StashResponseDTO>> listStashes() {
        var stashes = stashService.listAllStashes();
        // Convert domain models to response DTOs
        var responses = stashes.stream()
                .map(stash -> new com.linkpouch.stash.application.dto.StashResponse(
                        stash.getId(),
                        stash.getName().getValue(),
                        stash.getSecretKey().getValue(),
                        stash.getCreatedAt(),
                        stash.getUpdatedAt()
                ))
                .toList();
        return ResponseEntity.ok(mapper.mapOutStashResponseList(responses));
    }
}

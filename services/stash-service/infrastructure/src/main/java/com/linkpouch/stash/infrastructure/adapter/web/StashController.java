package com.linkpouch.stash.infrastructure.adapter.web;

import com.linkpouch.stash.application.dto.*;
import com.linkpouch.stash.application.service.StashManagementService;
import com.linkpouch.stash.domain.model.Stash;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/stashes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StashController {
    
    private final StashManagementService stashService;
    
    @PostMapping
    public ResponseEntity<StashResponse> createStash(@RequestBody CreateStashRequest request) {
        StashResponse response = stashService.createStashResponse(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<StashResponse> getStash(
            @PathVariable UUID id,
            @RequestHeader("X-Stash-Signature") String signature) {
        // TODO: Validate signature before returning
        Stash stash = stashService.findStashById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stash not found: " + id));
        
        return ResponseEntity.ok(stashService.createStashResponse(new CreateStashRequest(stash.getName().getValue())));
    }
}

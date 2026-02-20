package com.linkpouch.stash.infrastructure.adapter.web;

import com.linkpouch.stash.application.dto.*;
import com.linkpouch.stash.application.service.LinkManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stashes/{stashId}/links")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LinkController {
    
    private final LinkManagementService linkService;
    
    @PostMapping
    public ResponseEntity<LinkResponse> addLink(
            @PathVariable UUID stashId,
            @RequestBody AddLinkRequest request) {
        LinkResponse response = linkService.addLinkResponse(stashId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @GetMapping
    public ResponseEntity<List<LinkResponse>> getLinks(@PathVariable UUID stashId) {
        List<LinkResponse> links = linkService.getLinksResponse(stashId);
        return ResponseEntity.ok(links);
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<LinkResponse>> searchLinks(
            @PathVariable UUID stashId,
            @RequestParam("q") String query) {
        List<LinkResponse> links = linkService.searchLinksResponse(stashId, query);
        return ResponseEntity.ok(links);
    }
    
    @DeleteMapping("/{linkId}")
    public ResponseEntity<Void> deleteLink(
            @PathVariable UUID stashId,
            @PathVariable UUID linkId) {
        linkService.deleteLink(linkId);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{linkId}/refresh")
    public ResponseEntity<Void> refreshScreenshot(
            @PathVariable UUID stashId,
            @PathVariable UUID linkId) {
        linkService.requestScreenshotRefresh(linkId);
        return ResponseEntity.accepted().build();
    }
}

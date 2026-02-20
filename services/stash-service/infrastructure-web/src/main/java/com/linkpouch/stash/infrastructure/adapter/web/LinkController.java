package com.linkpouch.stash.infrastructure.adapter.web;

import com.linkpouch.stash.api.controller.LinksApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.dto.AddLinkRequest;
import com.linkpouch.stash.application.service.LinkManagementService;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LinkController implements LinksApi {
    
    private final LinkManagementService linkService;
    private final ApiDtoMapper mapper;
    
    @Override
    public ResponseEntity<LinkResponseDTO> addLink(UUID stashId, AddLinkRequestDTO addLinkRequestDTO) {
        var request = mapper.mapIn(addLinkRequestDTO);
        var response = linkService.addLinkResponse(stashId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.mapOut(response));
    }
    
    @Override
    public ResponseEntity<Void> deleteLink(UUID linkId) {
        linkService.deleteLink(linkId);
        return ResponseEntity.noContent().build();
    }
    
    @Override
    public ResponseEntity<LinkResponseDTO> getLink(UUID linkId) {
        var link = linkService.findLinkById(linkId)
                .orElseThrow(() -> new IllegalArgumentException("Link not found: " + linkId));
        return ResponseEntity.ok(mapper.mapOut(linkService.toResponse(link)));
    }
    
    @Override
    public ResponseEntity<PagedLinkResponseDTO> listLinks(UUID stashId, String search, Integer page, Integer size) {
        var pagedResult = linkService.listLinksResponse(stashId, search, page, size);
        
        PagedLinkResponseDTO response = new PagedLinkResponseDTO();
        response.setContent(mapper.mapOutLinkResponseList(pagedResult.content()));
        response.setTotalElements(pagedResult.totalElements());
        response.setTotalPages(pagedResult.totalPages());
        response.setSize(pagedResult.size());
        response.setNumber(pagedResult.number());
        
        return ResponseEntity.ok(response);
    }
    
    @Override
    public ResponseEntity<Void> refreshScreenshot(UUID linkId) {
        linkService.requestScreenshotRefresh(linkId);
        return ResponseEntity.accepted().build();
    }
}

package com.linkpouch.stash.infrastructure.adapter.web;

import com.linkpouch.stash.api.controller.LinksApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.application.exception.UnauthorizedException;
import com.linkpouch.stash.application.service.LinkManagementService;
import com.linkpouch.stash.application.service.SignatureValidationService;
import com.linkpouch.stash.application.service.StashManagementService;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LinkController implements LinksApi {

    private final LinkManagementService linkService;
    private final StashManagementService stashService;
    private final SignatureValidationService signatureService;
    private final ApiDtoMapper mapper;

    @Value("${linkpouch.base-url:http://localhost:8080}")
    private String baseUrl;

    @Override
    public ResponseEntity<LinkResponseDTO> addLink(UUID stashId, String xStashSignature, AddLinkRequestDTO addLinkRequestDTO) {
        var stash = stashService.findStashById(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));
        
        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }
        
        var request = mapper.mapIn(addLinkRequestDTO);
        var link = linkService.addLink(stashId, request.url());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(link));
    }

    @Override
    public ResponseEntity<Void> deleteLink(UUID linkId) {
        linkService.deleteLink(linkId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<LinkResponseDTO> getLink(UUID linkId) {
        var link = linkService.findLinkById(linkId)
                .orElseThrow(() -> new NotFoundException("Link not found: " + linkId));
        return ResponseEntity.ok(toResponse(link));
    }

    @Override
    public ResponseEntity<PagedLinkResponseDTO> listLinks(UUID stashId, String xStashSignature, String search, Integer page, Integer size) {
        var stash = stashService.findStashById(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));
        
        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }
        
        var pagedResult = linkService.listLinks(stashId, search, page, size);

        PagedLinkResponseDTO response = new PagedLinkResponseDTO();
        response.setContent(pagedResult.content().stream().map(this::toResponse).toList());
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

    @Override
    public ResponseEntity<LinkResponseDTO> updateLinkMetadata(UUID linkId, UpdateLinkMetadataRequestDTO dto) {
        var link = linkService.updateLinkMetadata(
                linkId,
                dto.getTitle(),
                dto.getDescription(),
                dto.getFaviconUrl(),
                dto.getPageContent(),
                dto.getFinalUrl()
        );
        return ResponseEntity.ok(toResponse(link));
    }

    @Override
    public ResponseEntity<LinkResponseDTO> updateLinkScreenshot(UUID linkId, UpdateLinkScreenshotRequestDTO dto) {
        var link = linkService.updateLinkScreenshot(linkId, dto.getScreenshotKey());
        return ResponseEntity.ok(toResponse(link));
    }

    @Override
    public ResponseEntity<Void> reorderLinks(UUID stashId, String xStashSignature, ReorderLinksRequestDTO reorderLinksRequestDTO) {
        var stash = stashService.findStashById(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        linkService.reorderLinks(stashId, reorderLinksRequestDTO.getLinkIds());
        return ResponseEntity.noContent().build();
    }

    private LinkResponseDTO toResponse(Link link) {
        var dto = mapper.mapOut(link);
        if (link.getScreenshotKey() != null) {
            dto.setScreenshotUrl(URI.create(baseUrl + "/api/links/" + link.getId() + "/screenshot"));
        }
        return dto;
    }
}

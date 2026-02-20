package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.dto.AddLinkRequest;
import com.linkpouch.stash.application.dto.CreateStashRequest;
import com.linkpouch.stash.application.dto.LinkResponse;
import com.linkpouch.stash.application.dto.StashResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Named;

import java.util.List;

/**
 * Mapper between OpenAPI generated DTOs and Application DTOs.
 * Follows the mapIn/mapOut naming convention.
 */
@Mapper(componentModel = "spring")
public interface ApiDtoMapper {

    @Named("mapInCreateStashRequest")
    default CreateStashRequest mapIn(CreateStashRequestDTO dto) {
        if (dto == null) {
            return null;
        }
        return new CreateStashRequest(dto.getName());
    }

    @Named("mapOutStashResponse")
    default StashResponseDTO mapOut(StashResponse response) {
        if (response == null) {
            return null;
        }
        StashResponseDTO dto = new StashResponseDTO();
        dto.setId(response.id());
        dto.setName(response.name());
        dto.setLinkCount(response.linkCount());
        dto.setCreatedAt(response.createdAt());
        dto.setUpdatedAt(response.updatedAt());
        return dto;
    }

    @Named("mapOutStashResponseList")
    default List<StashResponseDTO> mapOutStashResponseList(List<StashResponse> responses) {
        if (responses == null) {
            return null;
        }
        return responses.stream()
                .map(this::mapOut)
                .toList();
    }

    @Named("mapInAddLinkRequest")
    default AddLinkRequest mapIn(AddLinkRequestDTO dto) {
        if (dto == null) {
            return null;
        }
        return new AddLinkRequest(
                dto.getUrl(),
                dto.getTitle(),
                dto.getDescription()
        );
    }

    @Named("mapOutLinkResponse")
    default LinkResponseDTO mapOut(LinkResponse response) {
        if (response == null) {
            return null;
        }
        LinkResponseDTO dto = new LinkResponseDTO();
        dto.setId(response.id());
        dto.setStashId(response.stashId());
        dto.setUrl(response.url());
        dto.setTitle(response.title());
        dto.setDescription(response.description());
        dto.setFaviconUrl(response.faviconUrl());
        dto.setScreenshotUrl(response.screenshotUrl());
        dto.setScreenshotGeneratedAt(response.screenshotGeneratedAt());
        dto.setCreatedAt(response.createdAt());
        dto.setUpdatedAt(response.updatedAt());
        return dto;
    }

    @Named("mapOutLinkResponseList")
    default List<LinkResponseDTO> mapOutLinkResponseList(List<LinkResponse> responses) {
        if (responses == null) {
            return null;
        }
        return responses.stream()
                .map(this::mapOut)
                .toList();
    }
}

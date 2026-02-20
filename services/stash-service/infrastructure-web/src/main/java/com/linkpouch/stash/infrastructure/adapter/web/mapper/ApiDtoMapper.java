package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.dto.AddLinkRequest;
import com.linkpouch.stash.application.dto.CreateStashRequest;
import com.linkpouch.stash.application.dto.LinkResponse;
import com.linkpouch.stash.application.dto.StashResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Named;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Mapper(componentModel = "spring")
public interface ApiDtoMapper {

    default CreateStashRequest mapIn(CreateStashRequestDTO dto) {
        if (dto == null) {
            return null;
        }
        return new CreateStashRequest(dto.getName());
    }

    default StashResponseDTO mapOut(StashResponse response) {
        if (response == null) {
            return null;
        }
        StashResponseDTO dto = new StashResponseDTO();
        dto.setId(response.id());
        dto.setName(response.name());
        dto.setLinkCount(0);
        dto.setCreatedAt(toOffsetDateTime(response.createdAt()));
        dto.setUpdatedAt(toOffsetDateTime(response.updatedAt()));
        return dto;
    }

    default List<StashResponseDTO> mapOutStashResponseList(List<StashResponse> responses) {
        if (responses == null) {
            return null;
        }
        return responses.stream()
                .map(this::mapOut)
                .toList();
    }

    default AddLinkRequest mapIn(AddLinkRequestDTO dto) {
        if (dto == null) {
            return null;
        }
        return new AddLinkRequest(
                dto.getUrl() != null ? dto.getUrl().toString() : null
        );
    }

    default LinkResponseDTO mapOut(LinkResponse response) {
        if (response == null) {
            return null;
        }
        LinkResponseDTO dto = new LinkResponseDTO();
        dto.setId(response.id());
        dto.setUrl(toUri(response.url()));
        dto.setTitle(response.title());
        dto.setDescription(response.description());
        dto.setFaviconUrl(toUri(response.faviconUrl()));
        dto.setScreenshotUrl(null);
        dto.setScreenshotGeneratedAt(toOffsetDateTime(response.screenshotGeneratedAt()));
        dto.setCreatedAt(toOffsetDateTime(response.createdAt()));
        return dto;
    }

    default List<LinkResponseDTO> mapOutLinkResponseList(List<LinkResponse> responses) {
        if (responses == null) {
            return null;
        }
        return responses.stream()
                .map(this::mapOut)
                .toList();
    }

    default OffsetDateTime toOffsetDateTime(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }

    default URI toUri(String url) {
        if (url == null) {
            return null;
        }
        try {
            return URI.create(url);
        } catch (Exception e) {
            return null;
        }
    }
}

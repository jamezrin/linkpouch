package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.dto.AddLinkRequest;
import com.linkpouch.stash.application.dto.CreateStashRequest;
import com.linkpouch.stash.application.dto.LinkResponse;
import com.linkpouch.stash.application.dto.StashResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Mapper(componentModel = "spring")
public interface ApiDtoMapper {

    CreateStashRequest mapIn(CreateStashRequestDTO dto);

    @Mapping(target = "linkCount", constant = "0")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "toOffsetDateTime")
    @Mapping(target = "updatedAt", source = "updatedAt", qualifiedByName = "toOffsetDateTime")
    StashResponseDTO mapOut(StashResponse response);

    List<StashResponseDTO> mapOutStashResponseList(List<StashResponse> responses);

    @Mapping(target = "url", source = "url", qualifiedByName = "uriToString")
    AddLinkRequest mapIn(AddLinkRequestDTO dto);

    @Mapping(target = "stashId", ignore = true)
    @Mapping(target = "url", source = "url", qualifiedByName = "stringToUri")
    @Mapping(target = "faviconUrl", source = "faviconUrl", qualifiedByName = "stringToUri")
    @Mapping(target = "screenshotUrl", ignore = true)
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt", qualifiedByName = "toOffsetDateTime")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "toOffsetDateTime")
    @Mapping(target = "updatedAt", ignore = true)
    LinkResponseDTO mapOut(LinkResponse response);

    List<LinkResponseDTO> mapOutLinkResponseList(List<LinkResponse> responses);

    @Named("toOffsetDateTime")
    default OffsetDateTime toOffsetDateTime(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }

    @Named("stringToUri")
    default URI stringToUri(String url) {
        if (url == null) {
            return null;
        }
        try {
            return URI.create(url);
        } catch (Exception e) {
            return null;
        }
    }

    @Named("uriToString")
    default String uriToString(URI uri) {
        if (uri == null) {
            return null;
        }
        return uri.toString();
    }
}

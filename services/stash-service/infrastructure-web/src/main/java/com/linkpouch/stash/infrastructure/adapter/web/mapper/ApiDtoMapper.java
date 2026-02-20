package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.dto.AddLinkRequest;
import com.linkpouch.stash.application.dto.CreateStashRequest;
import com.linkpouch.stash.domain.model.*;
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

    // ==================== REQUEST MAPPERS ====================

    CreateStashRequest mapIn(CreateStashRequestDTO dto);

    @Mapping(target = "url", source = "url", qualifiedByName = "uriToString")
    AddLinkRequest mapIn(AddLinkRequestDTO dto);

    // ==================== STASH RESPONSE MAPPERS ====================

    @Mapping(target = "name", source = "name", qualifiedByName = "stashNameToString")
    @Mapping(target = "linkCount", constant = "0")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "toOffsetDateTime")
    @Mapping(target = "updatedAt", source = "updatedAt", qualifiedByName = "toOffsetDateTime")
    StashResponseDTO mapOut(Stash stash);

    List<StashResponseDTO> mapOutStashes(List<Stash> stashes);

    // ==================== LINK RESPONSE MAPPERS ====================

    @Mapping(target = "stashId", source = "stashId")
    @Mapping(target = "url", source = "url", qualifiedByName = "urlToUri")
    @Mapping(target = "title", source = "title", qualifiedByName = "linkTitleToString")
    @Mapping(target = "description", source = "description", qualifiedByName = "linkDescriptionToString")
    @Mapping(target = "faviconUrl", source = "faviconUrl", qualifiedByName = "urlToUri")
    @Mapping(target = "screenshotUrl", ignore = true)
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt", qualifiedByName = "toOffsetDateTime")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "toOffsetDateTime")
    @Mapping(target = "updatedAt", source = "updatedAt", qualifiedByName = "toOffsetDateTime")
    LinkResponseDTO mapOut(Link link);

    List<LinkResponseDTO> mapOutLinks(List<Link> links);

    // ==================== VALUE OBJECT CONVERTERS ====================

    @Named("stashNameToString")
    default String stashNameToString(StashName name) {
        return name != null ? name.getValue() : null;
    }

    @Named("urlToUri")
    default URI urlToUri(Url url) {
        if (url == null) return null;
        try {
            return URI.create(url.getValue());
        } catch (Exception e) {
            return null;
        }
    }

    @Named("linkTitleToString")
    default String linkTitleToString(LinkTitle title) {
        return title != null ? title.getValue() : null;
    }

    @Named("linkDescriptionToString")
    default String linkDescriptionToString(LinkDescription description) {
        return description != null ? description.getValue() : null;
    }

    @Named("toOffsetDateTime")
    default OffsetDateTime toOffsetDateTime(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }

    @Named("uriToString")
    default String uriToString(URI uri) {
        if (uri == null) {
            return null;
        }
        return uri.toString();
    }
}

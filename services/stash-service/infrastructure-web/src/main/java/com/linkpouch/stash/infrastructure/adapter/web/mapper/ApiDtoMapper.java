package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.domain.model.*;
import com.linkpouch.stash.domain.port.in.AddLinkCommand;
import com.linkpouch.stash.domain.port.in.CreateStashCommand;

@Mapper(componentModel = "spring")
public interface ApiDtoMapper {

    // ==================== REQUEST MAPPERS ====================

    default CreateStashCommand mapIn(CreateStashRequestDTO dto) {
        return new CreateStashCommand(dto.getName(), dto.getPassword());
    }

    default AddLinkCommand mapIn(AddLinkRequestDTO dto) {
        final URI uri = dto.getUrl();
        return new AddLinkCommand(null, uri != null ? uri.toString() : null);
    }

    // ==================== STASH RESPONSE MAPPERS ====================

    @Mapping(target = "name", source = "name")
    @Mapping(target = "passwordProtected", expression = "java(stash.isPasswordProtected())")
    @Mapping(target = "linkCount", constant = "0")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "signedUrl", ignore = true)
    StashResponseDTO mapOut(Stash stash);

    @Mapping(target = "name", source = "name")
    @Mapping(target = "passwordProtected", expression = "java(stashInfo.isPasswordProtected())")
    @Mapping(target = "linkCount", constant = "0")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "signedUrl", ignore = true)
    StashResponseDTO mapOut(StashInfo stashInfo);

    List<StashResponseDTO> mapOutStashes(List<Stash> stashes);

    // ==================== LINK RESPONSE MAPPERS ====================

    @Mapping(target = "stashId", source = "stashId")
    @Mapping(target = "url", source = "url")
    @Mapping(target = "title", source = "title")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "faviconUrl", source = "faviconUrl")
    @Mapping(target = "screenshotUrl", ignore = true)
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "position", source = "position")
    @Mapping(target = "status", source = "status")
    LinkResponseDTO mapOut(Link link);

    List<LinkResponseDTO> mapOutLinks(List<Link> links);

    // ==================== EMBEDDABILITY RESPONSE MAPPER ====================

    EmbeddabilityCheckResponseDTO mapOut(EmbeddabilityResult result);

    // ==================== VALUE OBJECT CONVERTERS ====================

    default String stashNameToString(StashName name) {
        return name != null ? name.getValue() : null;
    }

    default URI urlToUri(Url url) {
        if (url == null) return null;
        try {
            return URI.create(url.getValue());
        } catch (Exception e) {
            return null;
        }
    }

    default String linkTitleToString(LinkTitle title) {
        return title != null ? title.getValue() : null;
    }

    default String linkDescriptionToString(LinkDescription description) {
        return description != null ? description.getValue() : null;
    }

    default OffsetDateTime toOffsetDateTime(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }

    default String linkStatusToString(LinkStatus status) {
        return status != null ? status.name() : LinkStatus.PENDING.name();
    }
}

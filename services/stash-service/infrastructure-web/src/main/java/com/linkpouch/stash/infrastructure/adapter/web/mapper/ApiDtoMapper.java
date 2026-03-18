package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.openapitools.jackson.nullable.JsonNullable;

import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.domain.model.*;
import com.linkpouch.stash.domain.model.StashLinkPermissions;
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
        final UUID folderId = dto.getFolderId() != null && dto.getFolderId().isPresent()
                ? dto.getFolderId().get()
                : null;
        return new AddLinkCommand(null, uri != null ? uri.toString() : null, folderId);
    }

    // ==================== STASH RESPONSE MAPPERS ====================

    @Mapping(target = "name", source = "name")
    @Mapping(target = "passwordProtected", expression = "java(stash.isPasswordProtected())")
    @Mapping(target = "visibility", source = "visibility")
    @Mapping(target = "linkPermissions", source = "linkPermissions")
    @Mapping(target = "linkCount", constant = "0")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "signedUrl", ignore = true)
    StashResponseDTO mapOut(Stash stash);

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
    @Mapping(target = "folderId", source = "folderId")
    @Mapping(target = "status", source = "status")
    LinkResponseDTO mapOut(Link link);

    List<LinkResponseDTO> mapOutLinks(List<Link> links);

    // ==================== FOLDER RESPONSE MAPPERS ====================

    @Mapping(target = "id", source = "id")
    @Mapping(target = "stashId", source = "stashId")
    @Mapping(target = "parentFolderId", source = "parentFolderId")
    @Mapping(target = "name", source = "name")
    @Mapping(target = "position", source = "position")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    FolderResponseDTO mapOut(Folder folder);

    List<FolderResponseDTO> mapOutFolders(List<Folder> folders);

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

    default String folderNameToString(FolderName name) {
        return name != null ? name.getValue() : null;
    }

    default JsonNullable<UUID> uuidToJsonNullable(UUID value) {
        return JsonNullable.of(value);
    }

    default String stashLinkPermissionsToString(StashLinkPermissions permissions) {
        return permissions != null ? permissions.name() : StashLinkPermissions.FULL.name();
    }

    default String stashVisibilityToString(StashVisibility visibility) {
        return visibility != null ? visibility.name() : StashVisibility.SHARED.name();
    }
}

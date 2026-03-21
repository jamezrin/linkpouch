package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.mapstruct.Mapper;
import org.openapitools.jackson.nullable.JsonNullable;

import com.linkpouch.stash.domain.model.AiSummaryStatus;
import com.linkpouch.stash.domain.model.FolderName;
import com.linkpouch.stash.domain.model.LinkDescription;
import com.linkpouch.stash.domain.model.LinkStatus;
import com.linkpouch.stash.domain.model.LinkTitle;
import com.linkpouch.stash.domain.model.StashLinkPermissions;
import com.linkpouch.stash.domain.model.StashName;
import com.linkpouch.stash.domain.model.StashVisibility;
import com.linkpouch.stash.domain.model.Url;

@Mapper(componentModel = "spring")
public interface WebValueObjectMapper {

    default OffsetDateTime toOffsetDateTime(LocalDateTime localDateTime) {
        if (localDateTime == null) return null;
        return localDateTime.atOffset(ZoneOffset.UTC);
    }

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

    default String linkStatusToString(LinkStatus status) {
        return status != null ? status.name() : LinkStatus.PENDING.name();
    }

    default String folderNameToString(FolderName name) {
        return name != null ? name.getValue() : null;
    }

    default JsonNullable<UUID> uuidToJsonNullable(UUID value) {
        return JsonNullable.of(value);
    }

    default JsonNullable<String> stringToJsonNullable(String value) {
        return JsonNullable.of(value);
    }

    default JsonNullable<Integer> integerToJsonNullable(Integer value) {
        return JsonNullable.of(value);
    }

    default String stashLinkPermissionsToString(StashLinkPermissions permissions) {
        return permissions != null ? permissions.name() : StashLinkPermissions.FULL.name();
    }

    default String stashVisibilityToString(StashVisibility visibility) {
        return visibility != null ? visibility.name() : StashVisibility.SHARED.name();
    }

    default String aiSummaryStatusToString(AiSummaryStatus status) {
        return status != null ? status.name() : AiSummaryStatus.PENDING.name();
    }
}

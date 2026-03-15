package com.linkpouch.stash.infrastructure.adapter.persistence.mapper;

import org.mapstruct.Mapper;

import com.linkpouch.stash.domain.model.*;

@Mapper(componentModel = "spring")
public interface ValueObjectMapper {

    default StashName stringToStashName(String value) {
        return value != null ? StashName.of(value) : null;
    }

    default String stashNameToString(StashName stashName) {
        return stashName != null ? stashName.getValue() : null;
    }

    default SecretKey stringToSecretKey(String value) {
        return value != null ? SecretKey.of(value) : null;
    }

    default String secretKeyToString(SecretKey secretKey) {
        return secretKey != null ? secretKey.getValue() : null;
    }

    default Url stringToUrl(String value) {
        return value != null ? Url.of(value) : null;
    }

    default String urlToString(Url url) {
        return url != null ? url.getValue() : null;
    }

    default LinkTitle stringToLinkTitle(String value) {
        return value != null ? LinkTitle.of(value) : null;
    }

    default String linkTitleToString(LinkTitle title) {
        return title != null ? title.getValue() : null;
    }

    default LinkDescription stringToLinkDescription(String value) {
        return value != null ? LinkDescription.of(value) : null;
    }

    default String linkDescriptionToString(LinkDescription description) {
        return description != null ? description.getValue() : null;
    }

    default ScreenshotKey stringToScreenshotKey(String value) {
        return value != null ? ScreenshotKey.of(value) : null;
    }

    default String screenshotKeyToString(ScreenshotKey key) {
        return key != null ? key.getValue() : null;
    }

    default LinkStatus stringToLinkStatus(String value) {
        if (value == null) return LinkStatus.PENDING;
        try {
            return LinkStatus.valueOf(value);
        } catch (IllegalArgumentException e) {
            return LinkStatus.PENDING;
        }
    }

    default String linkStatusToString(LinkStatus status) {
        return status != null ? status.name() : LinkStatus.PENDING.name();
    }

    default StashLinkPermissions stringToStashLinkPermissions(String value) {
        if (value == null) return StashLinkPermissions.FULL;
        try {
            return StashLinkPermissions.valueOf(value);
        } catch (IllegalArgumentException e) {
            return StashLinkPermissions.FULL;
        }
    }

    default String stashLinkPermissionsToString(StashLinkPermissions permissions) {
        return permissions != null ? permissions.name() : StashLinkPermissions.FULL.name();
    }

    default StashVisibility stringToStashVisibility(String value) {
        if (value == null) return StashVisibility.SHARED;
        try {
            return StashVisibility.valueOf(value);
        } catch (IllegalArgumentException e) {
            return StashVisibility.SHARED;
        }
    }

    default String stashVisibilityToString(StashVisibility visibility) {
        return visibility != null ? visibility.name() : StashVisibility.SHARED.name();
    }
}

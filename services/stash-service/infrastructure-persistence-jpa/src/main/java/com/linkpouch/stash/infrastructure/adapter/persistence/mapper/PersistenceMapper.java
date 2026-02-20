package com.linkpouch.stash.infrastructure.adapter.persistence.mapper;

import com.linkpouch.stash.domain.model.*;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.LinkJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PersistenceMapper {
    
    // ==================== STASH: mapIn (JPA -> Domain) ====================
    
    @Mapping(target = "id", source = "id")
    @Mapping(target = "name", source = "name", qualifiedByName = "stringToStashName")
    @Mapping(target = "secretKey", source = "secretKey", qualifiedByName = "stringToSecretKey")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "links", ignore = true)
    Stash mapIn(StashJpaEntity entity);
    
    // ==================== STASH: mapOut (Domain -> JPA) ====================
    
    @Mapping(target = "id", source = "id")
    @Mapping(target = "name", source = "name", qualifiedByName = "stashNameToString")
    @Mapping(target = "secretKey", source = "secretKey", qualifiedByName = "secretKeyToString")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "links", ignore = true)
    StashJpaEntity mapOut(Stash stash);
    
    // ==================== LINK: mapIn (JPA -> Domain) ====================
    
    @Mapping(target = "id", source = "id")
    @Mapping(target = "stashId", source = "stash.id")
    @Mapping(target = "url", source = "url", qualifiedByName = "stringToUrl")
    @Mapping(target = "title", source = "title", qualifiedByName = "stringToLinkTitle")
    @Mapping(target = "description", source = "description", qualifiedByName = "stringToLinkDescription")
    @Mapping(target = "faviconUrl", source = "faviconUrl", qualifiedByName = "stringToUrl")
    @Mapping(target = "pageContent", source = "pageContent")
    @Mapping(target = "finalUrl", source = "finalUrl", qualifiedByName = "stringToUrl")
    @Mapping(target = "screenshotKey", source = "screenshotKey", qualifiedByName = "stringToScreenshotKey")
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    Link mapIn(LinkJpaEntity entity);
    
    // ==================== LINK: mapOut (Domain -> JPA) ====================
    
    @Mapping(target = "id", source = "id")
    @Mapping(target = "stash", ignore = true)
    @Mapping(target = "url", source = "url", qualifiedByName = "urlToString")
    @Mapping(target = "title", source = "title", qualifiedByName = "linkTitleToString")
    @Mapping(target = "description", source = "description", qualifiedByName = "linkDescriptionToString")
    @Mapping(target = "faviconUrl", source = "faviconUrl", qualifiedByName = "urlToString")
    @Mapping(target = "pageContent", source = "pageContent")
    @Mapping(target = "finalUrl", source = "finalUrl", qualifiedByName = "urlToString")
    @Mapping(target = "screenshotKey", source = "screenshotKey", qualifiedByName = "screenshotKeyToString")
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    LinkJpaEntity mapOut(Link link);
    
    // ==================== LINK LIST MAPPINGS ====================

    List<Link> mapInLinks(List<LinkJpaEntity> entities);

    // ==================== LINK: updateEntity (Domain -> existing JPA entity) ====================

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "stash", ignore = true)
    @Mapping(target = "url", source = "url", qualifiedByName = "urlToString")
    @Mapping(target = "title", source = "title", qualifiedByName = "linkTitleToString")
    @Mapping(target = "description", source = "description", qualifiedByName = "linkDescriptionToString")
    @Mapping(target = "faviconUrl", source = "faviconUrl", qualifiedByName = "urlToString")
    @Mapping(target = "pageContent", source = "pageContent")
    @Mapping(target = "finalUrl", source = "finalUrl", qualifiedByName = "urlToString")
    @Mapping(target = "screenshotKey", source = "screenshotKey", qualifiedByName = "screenshotKeyToString")
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(Link link, @MappingTarget LinkJpaEntity entity);
    
    // ==================== VALUE OBJECT CONVERTERS ====================
    
    @Named("stringToStashName")
    default StashName stringToStashName(String value) {
        return value != null ? StashName.of(value) : null;
    }
    
    @Named("stashNameToString")
    default String stashNameToString(StashName stashName) {
        return stashName != null ? stashName.getValue() : null;
    }
    
    @Named("stringToSecretKey")
    default SecretKey stringToSecretKey(String value) {
        return value != null ? SecretKey.of(value) : null;
    }
    
    @Named("secretKeyToString")
    default String secretKeyToString(SecretKey secretKey) {
        return secretKey != null ? secretKey.getValue() : null;
    }
    
    @Named("stringToUrl")
    default Url stringToUrl(String value) {
        return value != null ? Url.of(value) : null;
    }
    
    @Named("urlToString")
    default String urlToString(Url url) {
        return url != null ? url.getValue() : null;
    }
    
    @Named("stringToLinkTitle")
    default LinkTitle stringToLinkTitle(String value) {
        return value != null ? LinkTitle.of(value) : null;
    }
    
    @Named("linkTitleToString")
    default String linkTitleToString(LinkTitle title) {
        return title != null ? title.getValue() : null;
    }
    
    @Named("stringToLinkDescription")
    default LinkDescription stringToLinkDescription(String value) {
        return value != null ? LinkDescription.of(value) : null;
    }
    
    @Named("linkDescriptionToString")
    default String linkDescriptionToString(LinkDescription description) {
        return description != null ? description.getValue() : null;
    }
    
    @Named("stringToScreenshotKey")
    default ScreenshotKey stringToScreenshotKey(String value) {
        return value != null ? ScreenshotKey.of(value) : null;
    }
    
    @Named("screenshotKeyToString")
    default String screenshotKeyToString(ScreenshotKey key) {
        return key != null ? key.getValue() : null;
    }
}

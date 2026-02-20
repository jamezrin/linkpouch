package com.linkpouch.stash.application.mapper;

import com.linkpouch.stash.application.dto.LinkResponse;
import com.linkpouch.stash.application.dto.StashResponse;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.Stash;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DomainToDtoMapper {
    
    // ==================== STASH: mapOut (Domain -> DTO) ====================
    
    @Mapping(target = "id", source = "id")
    @Mapping(target = "name", source = "name", qualifiedByName = "stashNameToString")
    @Mapping(target = "signature", ignore = true)
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    StashResponse mapOut(Stash stash);
    
    // ==================== LINK: mapOut (Domain -> DTO) ====================
    
    @Mapping(target = "id", source = "id")
    @Mapping(target = "url", source = "url", qualifiedByName = "urlToString")
    @Mapping(target = "title", source = "title", qualifiedByName = "linkTitleToString")
    @Mapping(target = "description", source = "description", qualifiedByName = "linkDescriptionToString")
    @Mapping(target = "faviconUrl", source = "faviconUrl", qualifiedByName = "urlToString")
    @Mapping(target = "finalUrl", source = "finalUrl", qualifiedByName = "urlToString")
    @Mapping(target = "screenshotKey", source = "screenshotKey", qualifiedByName = "screenshotKeyToString")
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", source = "createdAt")
    LinkResponse mapOut(Link link);
    
    // ==================== LINK LIST: mapOut ====================
    
    @Mapping(target = "id", source = "id")
    @Mapping(target = "url", source = "url", qualifiedByName = "urlToString")
    @Mapping(target = "title", source = "title", qualifiedByName = "linkTitleToString")
    @Mapping(target = "description", source = "description", qualifiedByName = "linkDescriptionToString")
    @Mapping(target = "faviconUrl", source = "faviconUrl", qualifiedByName = "urlToString")
    @Mapping(target = "finalUrl", source = "finalUrl", qualifiedByName = "urlToString")
    @Mapping(target = "screenshotKey", source = "screenshotKey", qualifiedByName = "screenshotKeyToString")
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", source = "createdAt")
    List<LinkResponse> mapOutLinks(List<Link> links);
    
    // ==================== VALUE OBJECT CONVERTERS ====================
    
    @Named("stashNameToString")
    default String stashNameToString(com.linkpouch.stash.domain.model.StashName stashName) {
        return stashName != null ? stashName.getValue() : null;
    }
    
    @Named("urlToString")
    default String urlToString(com.linkpouch.stash.domain.model.Url url) {
        return url != null ? url.getValue() : null;
    }
    
    @Named("linkTitleToString")
    default String linkTitleToString(com.linkpouch.stash.domain.model.LinkTitle title) {
        return title != null ? title.getValue() : null;
    }
    
    @Named("linkDescriptionToString")
    default String linkDescriptionToString(com.linkpouch.stash.domain.model.LinkDescription description) {
        return description != null ? description.getValue() : null;
    }
    
    @Named("screenshotKeyToString")
    default String screenshotKeyToString(com.linkpouch.stash.domain.model.ScreenshotKey key) {
        return key != null ? key.getValue() : null;
    }
}

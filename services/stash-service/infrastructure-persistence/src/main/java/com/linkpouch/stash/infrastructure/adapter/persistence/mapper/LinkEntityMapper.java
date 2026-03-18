package com.linkpouch.stash.infrastructure.adapter.persistence.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.LinkJpaEntity;

@Mapper(componentModel = "spring", uses = ValueObjectMapper.class, config = MappingConfig.class)
public interface LinkEntityMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "stashId", source = "stash.id")
    @Mapping(target = "url", source = "url")
    @Mapping(target = "title", source = "title")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "faviconUrl", source = "faviconUrl")
    @Mapping(target = "pageContent", source = "pageContent")
    @Mapping(target = "finalUrl", source = "finalUrl")
    @Mapping(target = "screenshotKey", source = "screenshotKey")
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "position", source = "position")
    @Mapping(target = "folderId", source = "folderId")
    @Mapping(target = "status", source = "status")
    Link mapIn(LinkJpaEntity entity);

    List<Link> mapIn(List<LinkJpaEntity> entities);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "stash", ignore = true)
    @Mapping(target = "url", source = "url")
    @Mapping(target = "title", source = "title")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "faviconUrl", source = "faviconUrl")
    @Mapping(target = "pageContent", source = "pageContent")
    @Mapping(target = "finalUrl", source = "finalUrl")
    @Mapping(target = "screenshotKey", source = "screenshotKey")
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "position", source = "position")
    @Mapping(target = "folderId", source = "folderId")
    @Mapping(target = "status", source = "status")
    LinkJpaEntity mapOut(Link link);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "stash", ignore = true)
    @Mapping(target = "url", source = "url")
    @Mapping(target = "title", source = "title")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "faviconUrl", source = "faviconUrl")
    @Mapping(target = "pageContent", source = "pageContent")
    @Mapping(target = "finalUrl", source = "finalUrl")
    @Mapping(target = "screenshotKey", source = "screenshotKey")
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "position", source = "position")
    @Mapping(target = "folderId", source = "folderId")
    @Mapping(target = "status", source = "status")
    void updateEntity(Link link, @MappingTarget LinkJpaEntity entity);
}

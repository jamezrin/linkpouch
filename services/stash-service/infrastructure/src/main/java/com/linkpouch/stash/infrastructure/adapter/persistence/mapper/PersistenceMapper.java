package com.linkpouch.stash.infrastructure.adapter.persistence.mapper;

import com.linkpouch.stash.domain.model.*;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.LinkJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PersistenceMapper {
    
    // ==================== STASH MAPPINGS ====================
    
    /**
     * Maps FROM JPA entity TO domain (mapIn pattern).
     */
    @Mapping(target = "links", ignore = true)  // Links loaded separately
    Stash mapIn(StashJpaEntity entity);
    
    /**
     * Maps FROM domain TO JPA entity (mapOut pattern).
     */
    @Mapping(target = "links", ignore = true)  // Links managed separately
    StashJpaEntity mapOut(Stash stash);
    
    // ==================== LINK MAPPINGS ====================
    
    /**
     * Maps FROM JPA entity TO domain (mapIn pattern).
     */
    @Mapping(target = "stashId", source = "stash.id")
    Link mapIn(LinkJpaEntity entity);
    
    /**
     * Maps FROM domain TO JPA entity (mapOut pattern).
     * Note: stash relationship must be set separately.
     */
    @Mapping(target = "stash", ignore = true)
    LinkJpaEntity mapOut(Link link);
    
    /**
     * Maps list FROM JPA entity TO domain.
     */
    List<Link> mapInLinks(List<LinkJpaEntity> entities);
    
    // ==================== VALUE OBJECT HELPERS ====================
    
    default StashName mapStashName(String value) {
        return value != null ? StashName.of(value) : null;
    }
    
    default String mapStashName(StashName stashName) {
        return stashName != null ? stashName.getValue() : null;
    }
    
    default SecretKey mapSecretKey(String value) {
        return value != null ? SecretKey.of(value) : null;
    }
    
    default String mapSecretKey(SecretKey secretKey) {
        return secretKey != null ? secretKey.getValue() : null;
    }
    
    default Url mapUrl(String value) {
        return value != null ? Url.of(value) : null;
    }
    
    default String mapUrl(Url url) {
        return url != null ? url.getValue() : null;
    }
    
    default LinkTitle mapLinkTitle(String value) {
        return value != null ? LinkTitle.of(value) : null;
    }
    
    default String mapLinkTitle(LinkTitle title) {
        return title != null ? title.getValue() : null;
    }
    
    default LinkDescription mapLinkDescription(String value) {
        return value != null ? LinkDescription.of(value) : null;
    }
    
    default String mapLinkDescription(LinkDescription description) {
        return description != null ? description.getValue() : null;
    }
    
    default ScreenshotKey mapScreenshotKey(String value) {
        return value != null ? ScreenshotKey.of(value) : null;
    }
    
    default String mapScreenshotKey(ScreenshotKey key) {
        return key != null ? key.getValue() : null;
    }
}

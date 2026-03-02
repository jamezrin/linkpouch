package com.linkpouch.stash.infrastructure.adapter.persistence.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;

@Mapper(
        componentModel = "spring",
        uses = {ValueObjectMapper.class, LinkEntityMapper.class},
        config = MappingConfig.class)
public interface StashEntityMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "name", source = "name")
    @Mapping(target = "secretKey", source = "secretKey")
    @Mapping(target = "passwordHash", source = "passwordHash")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "links", source = "links")
    Stash mapIn(StashJpaEntity entity);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "name", source = "name")
    @Mapping(target = "secretKey", source = "secretKey")
    @Mapping(target = "passwordHash", source = "passwordHash")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "links", ignore = true)
    StashJpaEntity mapOut(Stash stash);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "name", source = "name")
    @Mapping(target = "secretKey", source = "secretKey")
    @Mapping(target = "passwordHash", source = "passwordHash")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "links", ignore = true)
    void updateEntity(Stash stash, @MappingTarget StashJpaEntity entity);
}

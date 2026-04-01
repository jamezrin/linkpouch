package com.linkpouch.stash.infrastructure.adapter.persistence.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.linkpouch.stash.domain.model.AccountProxySettings;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountProxySettingsJpaEntity;

@Mapper(componentModel = "spring", config = MappingConfig.class)
public interface AccountProxySettingsEntityMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "accountId", source = "accountId")
    @Mapping(target = "proxyCountry", source = "proxyCountry")
    AccountProxySettings mapIn(AccountProxySettingsJpaEntity entity);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "accountId", source = "accountId")
    @Mapping(target = "proxyCountry", source = "proxyCountry")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    AccountProxySettingsJpaEntity mapOut(AccountProxySettings settings);
}

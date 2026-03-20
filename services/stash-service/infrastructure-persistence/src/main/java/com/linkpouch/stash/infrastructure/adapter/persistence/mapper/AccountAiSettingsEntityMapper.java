package com.linkpouch.stash.infrastructure.adapter.persistence.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.model.AiProvider;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountAiSettingsJpaEntity;

@Mapper(componentModel = "spring", config = MappingConfig.class)
public interface AccountAiSettingsEntityMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "accountId", source = "accountId")
    @Mapping(target = "provider", source = "provider")
    @Mapping(target = "apiKey", source = "apiKey")
    @Mapping(target = "model", source = "model")
    @Mapping(target = "enabled", source = "enabled")
    @Mapping(target = "customPrompt", source = "customPrompt")
    AccountAiSettings mapIn(AccountAiSettingsJpaEntity entity);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "accountId", source = "accountId")
    @Mapping(target = "provider", source = "provider")
    @Mapping(target = "apiKey", source = "apiKey")
    @Mapping(target = "model", source = "model")
    @Mapping(target = "enabled", source = "enabled")
    @Mapping(target = "customPrompt", source = "customPrompt")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    AccountAiSettingsJpaEntity mapOut(AccountAiSettings settings);

    default String aiProviderToString(AiProvider provider) {
        return provider != null ? provider.name() : null;
    }

    default AiProvider stringToAiProvider(String provider) {
        return provider != null ? AiProvider.valueOf(provider) : null;
    }
}

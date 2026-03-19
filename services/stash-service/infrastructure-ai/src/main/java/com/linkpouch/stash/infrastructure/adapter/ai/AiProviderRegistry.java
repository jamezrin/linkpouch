package com.linkpouch.stash.infrastructure.adapter.ai;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.AiProvider;

import lombok.extern.slf4j.Slf4j;

/** Collects all {@link AiProviderAdapter} beans and routes calls to the correct one. */
@Slf4j
@Component
public class AiProviderRegistry {

    private final Map<AiProvider, AiProviderAdapter> adapters;

    public AiProviderRegistry(final List<AiProviderAdapter> adapters) {
        this.adapters = adapters.stream()
                .collect(Collectors.toMap(AiProviderAdapter::supportedProvider, Function.identity()));
        log.info("Registered AI provider adapters: {}", this.adapters.keySet());
    }

    public Optional<AiProviderAdapter> findAdapter(final AiProvider provider) {
        return Optional.ofNullable(adapters.get(provider));
    }
}

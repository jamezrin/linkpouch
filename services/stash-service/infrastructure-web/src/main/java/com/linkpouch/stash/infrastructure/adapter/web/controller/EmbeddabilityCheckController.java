package com.linkpouch.stash.infrastructure.adapter.web.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.UtilsApi;
import com.linkpouch.stash.api.model.EmbeddabilityCheckResponseDTO;
import com.linkpouch.stash.domain.port.inbound.UrlEmbeddabilityUseCase;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.EmbeddabilityDtoMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class EmbeddabilityCheckController implements UtilsApi {

    private final UrlEmbeddabilityUseCase urlEmbeddabilityUseCase;
    private final EmbeddabilityDtoMapper mapper;

    @Override
    public ResponseEntity<EmbeddabilityCheckResponseDTO> checkEmbeddability(final String url) {
        final var result = urlEmbeddabilityUseCase.checkEmbeddability(url);
        return ResponseEntity.ok(mapper.mapOut(result));
    }
}

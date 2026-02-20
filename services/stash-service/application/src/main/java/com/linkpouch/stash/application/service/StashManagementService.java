package com.linkpouch.stash.application.service;

import com.linkpouch.stash.application.dto.*;
import com.linkpouch.stash.application.mapper.DomainToDtoMapper;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.inbound.SignatureValidationUseCase;
import com.linkpouch.stash.domain.port.inbound.StashManagementUseCase;
import com.linkpouch.stash.domain.port.outbound.StashRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Application Service: Stash Management
 * Implements use cases with transaction boundaries at the application layer.
 */
@Service
@RequiredArgsConstructor
public class StashManagementService implements StashManagementUseCase {

    private final StashRepository stashRepository;
    private final SignatureValidationUseCase signatureService;
    private final DomainToDtoMapper dtoMapper;

    @Override
    @Transactional
    public Stash createStash(String name) {
        Stash stash = Stash.create(name);
        return stashRepository.save(stash);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Stash> findStashById(UUID stashId) {
        return stashRepository.findById(stashId);
    }

    @Override
    @Transactional
    public Stash updateStashName(UUID stashId, String newName) {
        Stash stash = stashRepository.findById(stashId)
                .orElseThrow(() -> new IllegalArgumentException("Stash not found: " + stashId));
        stash.updateName(newName);
        return stashRepository.save(stash);
    }

    @Override
    @Transactional
    public void deleteStash(UUID stashId) {
        stashRepository.deleteById(stashId);
    }

    @Transactional(readOnly = true)
    public java.util.List<Stash> listAllStashes() {
        return stashRepository.findAll();
    }

    // Helper method for controller
    @Transactional
    public StashResponse createStashResponse(CreateStashRequest request) {
        Stash stash = createStash(request.name());
        String signature = signatureService.generateSignature(
                stash.getId().toString(), 
                stash.getSecretKey().getValue()
        );
        StashResponse response = dtoMapper.mapOut(stash);
        return new StashResponse(
                response.id(),
                response.name(),
                signature,
                response.createdAt(),
                response.updatedAt()
        );
    }
}

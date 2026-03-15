package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.StashesApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.domain.exception.ForbiddenException;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.SignatureRegeneratedException;
import com.linkpouch.stash.domain.exception.StashPrivateException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.in.*;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.domain.service.AccountClaims;
import com.linkpouch.stash.domain.service.AccountTokenService;
import com.linkpouch.stash.domain.service.StashAccessClaims;
import com.linkpouch.stash.domain.service.StashSignatureService;
import com.linkpouch.stash.domain.service.StashTokenService;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class StashController implements StashesApi {

    private static final String BEARER_PREFIX = "Bearer ";

    private final AutoClaimStashUseCase autoClaimStashUseCase;
    private final CreateStashUseCase createStashUseCase;
    private final FindStashByIdQuery findStashByIdQuery;
    private final UpdateStashNameUseCase updateStashNameUseCase;
    private final DeleteStashUseCase deleteStashUseCase;
    private final AcquireStashAccessUseCase acquireStashAccessUseCase;
    private final SetStashPasswordUseCase setStashPasswordUseCase;
    private final RemoveStashPasswordUseCase removeStashPasswordUseCase;
    private final RegenerateStashSignatureUseCase regenerateStashSignatureUseCase;
    private final AccountRepository accountRepository;
    private final AccountTokenService accountTokenService;
    private final StashSignatureService signatureService;
    private final StashTokenService tokenService;
    private final ApiDtoMapper mapper;
    private final HttpServletRequest httpRequest;

    @Override
    public ResponseEntity<StashResponseDTO> createStash(final CreateStashRequestDTO createStashRequestDTO) {
        final var command =
                new CreateStashCommand(createStashRequestDTO.getName(), createStashRequestDTO.getPassword());
        var stash = createStashUseCase.execute(command);

        final AccountClaims accountClaims = tryExtractAccountClaims();
        if (accountClaims != null) {
            stash = autoClaimStashUseCase.execute(stash.getId(), accountClaims.accountId());
        }

        final var response = mapper.mapOut(stash);
        final String signedUrl = signatureService.generateSignedUrl(
                stash.getId(), stash.getSecretKey().getValue());
        response.setSignedUrl(signedUrl);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Override
    public ResponseEntity<AccessTokenResponseDTO> acquireAccessToken(
            final UUID stashId,
            final String xStashSignature,
            final @Nullable AcquireAccessRequestDTO acquireAccessRequestDTO) {

        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        // Try to extract an optional account JWT from the Authorization header.
        // This is done manually since the AccountJwtInterceptor only covers /account/** paths.
        final AccountClaims accountClaims = tryExtractAccountClaims();
        final boolean isClaimer =
                accountClaims != null && accountRepository.isStashClaimed(accountClaims.accountId(), stashId);

        if (stash.isPrivate()) {
            if (!isClaimer) {
                throw new StashPrivateException("This pouch is private. Sign in as the owner to access it.");
            }
            // Claimer on a private stash — no signature needed
        } else {
            // Non-private stash — validate the signature, unless the claimer is accessing
            if (!isClaimer
                    && !signatureService.validateSignature(
                            stashId, stash.getSecretKey().getValue(), xStashSignature)) {
                if (stash.getSignatureRefreshedAt() != null) {
                    throw new SignatureRegeneratedException(stash.getSignatureRefreshedAt());
                }
                throw new UnauthorizedException("Invalid signature");
            }
        }

        final String rawPassword = acquireAccessRequestDTO != null ? acquireAccessRequestDTO.getPassword() : null;

        // Throws PasswordRequiredException (401 PASSWORD_REQUIRED) or UnauthorizedException
        acquireStashAccessUseCase.execute(new AcquireStashAccessCommand(stashId, rawPassword));

        final boolean stashClaimed = isClaimer || accountRepository.isStashClaimedByAnyone(stashId);

        final String token = tokenService.issueToken(stash, isClaimer, stashClaimed);
        final var response = new AccessTokenResponseDTO()
                .accessToken(token)
                .expiresIn(tokenService.getExpirySeconds())
                .isClaimer(isClaimer)
                .isStashClaimed(stashClaimed);
        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<StashResponseDTO> getStash(final UUID stashId) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        return ResponseEntity.ok(mapper.mapOut(stash));
    }

    @Override
    public ResponseEntity<StashResponseDTO> updateStash(
            final UUID stashId, final UpdateStashRequestDTO updateStashRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final var updatedStash = updateStashNameUseCase.execute(stashId, updateStashRequestDTO.getName());
        return ResponseEntity.ok(mapper.mapOut(updatedStash));
    }

    @Override
    public ResponseEntity<Void> deleteStash(final UUID stashId) {
        requireClaimerOrUnclaimed();
        deleteStashUseCase.execute(stashId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<StashResponseDTO> setStashPassword(
            final UUID stashId, final SetPasswordRequestDTO setPasswordRequestDTO) {

        requireClaimerOrUnclaimed();

        final var updatedStash = setStashPasswordUseCase.execute(
                new SetStashPasswordCommand(stashId, setPasswordRequestDTO.getPassword()));
        return ResponseEntity.ok(mapper.mapOut(updatedStash));
    }

    @Override
    public ResponseEntity<Void> removeStashPassword(final UUID stashId) {

        requireClaimerOrUnclaimed();

        removeStashPasswordUseCase.execute(new RemoveStashPasswordCommand(stashId));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<StashResponseDTO> regenerateSignature(final UUID stashId) {

        requireClaimerOrUnclaimed();

        final var updated = regenerateStashSignatureUseCase.execute(new RegenerateStashSignatureCommand(stashId));

        final var response = mapper.mapOut(updated);
        final String signedUrl = signatureService.generateSignedUrl(
                updated.getId(), updated.getSecretKey().getValue());
        response.setSignedUrl(signedUrl);

        return ResponseEntity.ok(response);
    }

    /**
     * Enforces link-permission-based write access: blocked when the stash is claimed and
     * linkPermissions is READ_ONLY and the caller is not the claimer.
     */
    private void requireWriteAccess(final Stash stash) {
        if (!stash.isReadOnly()) return;
        final StashAccessClaims claims = getRequiredClaims();
        if (!claims.stashClaimed()) return; // unclaimed → anyone can write
        if (claims.claimer()) return;
        throw new ForbiddenException("This pouch is read-only");
    }

    /**
     * Enforces that only the claimer (or nobody, if unclaimed) may perform an action.
     */
    private void requireClaimerOrUnclaimed() {
        final StashAccessClaims claims = getRequiredClaims();
        if (!claims.stashClaimed()) return;
        if (claims.claimer()) return;
        throw new ForbiddenException("Only the owner can perform this action");
    }

    /** Returns the JWT claims placed by the interceptor. Throws if missing (should not happen). */
    private StashAccessClaims getRequiredClaims() {
        final Object claims = httpRequest.getAttribute(StashJwtInterceptor.CLAIMS_ATTR);
        if (!(claims instanceof StashAccessClaims)) {
            throw new UnauthorizedException("Access token is missing");
        }
        return (StashAccessClaims) claims;
    }

    /**
     * Tries to extract and validate an account JWT from the Authorization Bearer header.
     * Returns null if no token is present or it fails validation — this is optional auth.
     */
    private AccountClaims tryExtractAccountClaims() {
        final String authHeader = httpRequest.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            return null;
        }
        final String rawToken = authHeader.substring(BEARER_PREFIX.length());
        try {
            return accountTokenService.validateToken(rawToken);
        } catch (Exception e) {
            return null;
        }
    }
}

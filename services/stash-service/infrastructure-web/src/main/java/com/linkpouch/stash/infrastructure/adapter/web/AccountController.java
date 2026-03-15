package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.model.StashLinkPermissions;
import com.linkpouch.stash.domain.model.StashVisibility;
import com.linkpouch.stash.domain.port.in.AcquireClaimedStashAccessCommand;
import com.linkpouch.stash.domain.port.in.AcquireClaimedStashAccessUseCase;
import com.linkpouch.stash.domain.port.in.UpdateStashLinkPermissionsCommand;
import com.linkpouch.stash.domain.port.in.UpdateStashLinkPermissionsUseCase;
import com.linkpouch.stash.domain.port.in.ClaimStashCommand;
import com.linkpouch.stash.domain.port.in.ClaimStashUseCase;
import com.linkpouch.stash.domain.port.in.DisownStashCommand;
import com.linkpouch.stash.domain.port.in.DisownStashUseCase;
import com.linkpouch.stash.domain.port.in.GetAccountQuery;
import com.linkpouch.stash.domain.port.in.UpdateStashVisibilityCommand;
import com.linkpouch.stash.domain.port.in.UpdateStashVisibilityUseCase;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.domain.port.outbound.StashRepository;
import com.linkpouch.stash.domain.service.AccountClaims;
import com.linkpouch.stash.domain.service.StashTokenService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/account")
@RequiredArgsConstructor
public class AccountController {

    private final GetAccountQuery getAccountQuery;
    private final ClaimStashUseCase claimStashUseCase;
    private final DisownStashUseCase disownStashUseCase;
    private final UpdateStashVisibilityUseCase updateStashVisibilityUseCase;
    private final UpdateStashLinkPermissionsUseCase updateStashLinkPermissionsUseCase;
    private final AcquireClaimedStashAccessUseCase acquireClaimedStashAccessUseCase;
    private final AccountRepository accountRepository;
    private final StashRepository stashRepository;
    private final StashTokenService stashTokenService;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getAccount(final HttpServletRequest request) {
        final AccountClaims claims = (AccountClaims) request.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
        final Account account = getAccountQuery
                .execute(claims.accountId())
                .orElseThrow(() -> new NotFoundException("Account not found"));

        final List<UUID> claimedStashIds = accountRepository.findClaimedStashIds(claims.accountId());
        final List<Map<String, Object>> claimedStashes = claimedStashIds.stream()
                .map(stashId -> stashRepository
                        .findById(stashId)
                        .map(stash -> Map.<String, Object>of(
                                "stashId", stash.getId().toString(),
                                "stashName", stash.getName().getValue(),
                                "visibility", stash.getVisibility().name()))
                        .orElse(null))
                .filter(entry -> entry != null)
                .toList();

        final List<Map<String, String>> providers = account.getProviders().stream()
                .map(p -> Map.of("provider", p.provider().name().toLowerCase()))
                .toList();

        return ResponseEntity.ok(Map.of(
                "id",
                account.getId().toString(),
                "email",
                account.getEmail() != null ? account.getEmail() : "",
                "displayName",
                account.getDisplayName(),
                "avatarUrl",
                account.getAvatarUrl() != null ? account.getAvatarUrl() : "",
                "providers",
                providers,
                "claimedStashes",
                claimedStashes));
    }

    @PostMapping("/stashes/claim")
    public ResponseEntity<Void> claimStash(
            @RequestBody final ClaimStashRequest body, final HttpServletRequest request) {
        final AccountClaims claims = (AccountClaims) request.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
        claimStashUseCase.execute(new ClaimStashCommand(
                claims.accountId(), UUID.fromString(body.stashId()), body.signature(), body.password()));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/stashes/{stashId}")
    public ResponseEntity<Void> disownStash(
            @PathVariable("stashId") final String stashId, final HttpServletRequest request) {
        final AccountClaims claims = (AccountClaims) request.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
        disownStashUseCase.execute(new DisownStashCommand(claims.accountId(), UUID.fromString(stashId)));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/stashes/{stashId}/visibility")
    public ResponseEntity<Void> updateStashVisibility(
            @PathVariable("stashId") final String stashId,
            @RequestBody final UpdateVisibilityRequest body,
            final HttpServletRequest request) {
        final AccountClaims claims = (AccountClaims) request.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
        final StashVisibility visibility =
                StashVisibility.valueOf(body.visibility().toUpperCase());
        updateStashVisibilityUseCase.execute(
                new UpdateStashVisibilityCommand(claims.accountId(), UUID.fromString(stashId), visibility));
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/stashes/{stashId}/link-permissions")
    public ResponseEntity<Void> updateStashLinkPermissions(
            @PathVariable("stashId") final String stashId,
            @RequestBody final UpdateLinkPermissionsRequest body,
            final HttpServletRequest request) {
        final AccountClaims claims = (AccountClaims) request.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
        final StashLinkPermissions permissions =
                StashLinkPermissions.valueOf(body.permissions().toUpperCase());
        updateStashLinkPermissionsUseCase.execute(
                new UpdateStashLinkPermissionsCommand(claims.accountId(), UUID.fromString(stashId), permissions));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/stashes/{stashId}/access-token")
    public ResponseEntity<Map<String, Object>> acquireClaimedStashAccess(
            @PathVariable("stashId") final String stashId, final HttpServletRequest request) {
        final AccountClaims claims = (AccountClaims) request.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
        final var stash = acquireClaimedStashAccessUseCase.execute(
                new AcquireClaimedStashAccessCommand(claims.accountId(), UUID.fromString(stashId)));
        final String token = stashTokenService.issueClaimerToken(stash);
        return ResponseEntity.ok(Map.of("accessToken", token, "expiresIn", stashTokenService.getExpirySeconds()));
    }

    public record ClaimStashRequest(String stashId, String signature, String password) {}

    public record UpdateVisibilityRequest(String visibility) {}

    public record UpdateLinkPermissionsRequest(String permissions) {}
}

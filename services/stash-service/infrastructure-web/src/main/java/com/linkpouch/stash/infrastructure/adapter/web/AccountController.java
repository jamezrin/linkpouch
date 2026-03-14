package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.port.in.ClaimStashCommand;
import com.linkpouch.stash.domain.port.in.ClaimStashUseCase;
import com.linkpouch.stash.domain.port.in.DisownStashCommand;
import com.linkpouch.stash.domain.port.in.DisownStashUseCase;
import com.linkpouch.stash.domain.port.in.GetAccountQuery;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.domain.port.outbound.StashRepository;
import com.linkpouch.stash.domain.service.AccountClaims;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/account")
@RequiredArgsConstructor
public class AccountController {

    private final GetAccountQuery getAccountQuery;
    private final ClaimStashUseCase claimStashUseCase;
    private final DisownStashUseCase disownStashUseCase;
    private final AccountRepository accountRepository;
    private final StashRepository stashRepository;

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
                                "stashName", stash.getName().getValue()))
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
    public ResponseEntity<Void> disownStash(@PathVariable("stashId") final String stashId, final HttpServletRequest request) {
        final AccountClaims claims = (AccountClaims) request.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
        disownStashUseCase.execute(new DisownStashCommand(claims.accountId(), UUID.fromString(stashId)));
        return ResponseEntity.noContent().build();
    }

    public record ClaimStashRequest(String stashId, String signature, String password) {}
}

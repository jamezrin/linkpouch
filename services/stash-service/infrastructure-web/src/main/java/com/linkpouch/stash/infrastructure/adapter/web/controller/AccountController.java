package com.linkpouch.stash.infrastructure.adapter.web.controller;

import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.AccountApi;
import com.linkpouch.stash.api.model.AccountProviderResponseDTO;
import com.linkpouch.stash.api.model.AccountResponseDTO;
import com.linkpouch.stash.api.model.ClaimStashRequestDTO;
import com.linkpouch.stash.api.model.ClaimedStashSummaryResponseDTO;
import com.linkpouch.stash.api.model.PagedClaimedStashResponseDTO;
import com.linkpouch.stash.api.model.UpdateLinkPermissionsRequestDTO;
import com.linkpouch.stash.api.model.UpdateVisibilityRequestDTO;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.model.ClaimedStashSummary;
import com.linkpouch.stash.domain.model.StashLinkPermissions;
import com.linkpouch.stash.domain.model.StashVisibility;
import com.linkpouch.stash.domain.port.in.ClaimStashCommand;
import com.linkpouch.stash.domain.port.in.ClaimStashUseCase;
import com.linkpouch.stash.domain.port.in.DisownStashCommand;
import com.linkpouch.stash.domain.port.in.DisownStashUseCase;
import com.linkpouch.stash.domain.port.in.GetAccountQuery;
import com.linkpouch.stash.domain.port.in.ListClaimedStashesCommand;
import com.linkpouch.stash.domain.port.in.ListClaimedStashesQuery;
import com.linkpouch.stash.domain.port.in.PagedResult;
import com.linkpouch.stash.domain.port.in.UpdateStashLinkPermissionsCommand;
import com.linkpouch.stash.domain.port.in.UpdateStashLinkPermissionsUseCase;
import com.linkpouch.stash.domain.port.in.UpdateStashVisibilityCommand;
import com.linkpouch.stash.domain.port.in.UpdateStashVisibilityUseCase;
import com.linkpouch.stash.domain.service.AccountClaims;
import com.linkpouch.stash.infrastructure.adapter.web.interceptor.AccountJwtInterceptor;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AccountController implements AccountApi {

    private final GetAccountQuery getAccountQuery;
    private final ClaimStashUseCase claimStashUseCase;
    private final DisownStashUseCase disownStashUseCase;
    private final UpdateStashVisibilityUseCase updateStashVisibilityUseCase;
    private final UpdateStashLinkPermissionsUseCase updateStashLinkPermissionsUseCase;
    private final ListClaimedStashesQuery listClaimedStashesQuery;
    private final HttpServletRequest httpRequest;

    @Override
    public ResponseEntity<AccountResponseDTO> getAccount() {
        final AccountClaims claims = getClaims();
        final Account account = getAccountQuery
                .execute(claims.accountId())
                .orElseThrow(() -> new NotFoundException("Account not found"));

        final List<AccountProviderResponseDTO> providers = account.getProviders().stream()
                .map(p -> new AccountProviderResponseDTO()
                        .provider(p.provider().name().toLowerCase()))
                .toList();

        final AccountResponseDTO response = new AccountResponseDTO()
                .id(account.getId())
                .email(account.getEmail())
                .displayName(account.getDisplayName())
                .avatarUrl(account.getAvatarUrl())
                .providers(providers);

        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<PagedClaimedStashResponseDTO> listClaimedStashes(
            final String search, final String sort, final Integer page, final Integer size) {
        final AccountClaims claims = getClaims();
        final PagedResult<ClaimedStashSummary> result = listClaimedStashesQuery.execute(
                new ListClaimedStashesCommand(claims.accountId(), search, sort, page, size));

        final List<ClaimedStashSummaryResponseDTO> content = result.content().stream()
                .map(s -> new ClaimedStashSummaryResponseDTO()
                        .stashId(s.stashId())
                        .stashName(s.name())
                        .visibility(ClaimedStashSummaryResponseDTO.VisibilityEnum.fromValue(
                                s.visibility().name()))
                        .createdAt(s.createdAt() != null ? s.createdAt().atOffset(ZoneOffset.UTC) : null)
                        .updatedAt(s.updatedAt() != null ? s.updatedAt().atOffset(ZoneOffset.UTC) : null))
                .toList();

        final PagedClaimedStashResponseDTO response = new PagedClaimedStashResponseDTO()
                .content(content)
                .totalElements(result.totalElements())
                .totalPages(result.totalPages())
                .size(result.size())
                .number(result.number());

        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<Void> claimStash(final ClaimStashRequestDTO body) {
        final AccountClaims claims = getClaims();
        claimStashUseCase.execute(
                new ClaimStashCommand(claims.accountId(), body.getStashId(), body.getSignature(), body.getPassword()));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> disownStash(final UUID stashId) {
        final AccountClaims claims = getClaims();
        disownStashUseCase.execute(new DisownStashCommand(claims.accountId(), stashId));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> updateStashVisibility(final UUID stashId, final UpdateVisibilityRequestDTO body) {
        final AccountClaims claims = getClaims();
        final StashVisibility visibility =
                StashVisibility.valueOf(body.getVisibility().getValue());
        updateStashVisibilityUseCase.execute(new UpdateStashVisibilityCommand(claims.accountId(), stashId, visibility));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> updateStashLinkPermissions(
            final UUID stashId, final UpdateLinkPermissionsRequestDTO body) {
        final AccountClaims claims = getClaims();
        final StashLinkPermissions permissions =
                StashLinkPermissions.valueOf(body.getPermissions().getValue());
        updateStashLinkPermissionsUseCase.execute(
                new UpdateStashLinkPermissionsCommand(claims.accountId(), stashId, permissions));
        return ResponseEntity.noContent().build();
    }

    private AccountClaims getClaims() {
        return (AccountClaims) httpRequest.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
    }
}

package com.linkpouch.stash.application.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.port.in.GetAccountQuery;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class GetAccountAdapter implements GetAccountQuery {

    private final AccountRepository accountRepository;

    @Override
    @Transactional(readOnly = true)
    public Optional<Account> execute(final UUID accountId) {
        return accountRepository.findById(accountId);
    }
}

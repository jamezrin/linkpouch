package com.linkpouch.stash.domain.port.in;

import java.util.List;

public record PagedResult<T>(
        List<T> content, int totalElements, int totalPages, int size, int number) {}

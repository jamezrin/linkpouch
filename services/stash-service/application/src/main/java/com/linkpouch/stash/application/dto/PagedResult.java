package com.linkpouch.stash.application.dto;

import java.util.List;

public record PagedResult<T>(
    List<T> content,
    int totalElements,
    int totalPages,
    int size,
    int number
) {}

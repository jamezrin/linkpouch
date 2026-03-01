package com.linkpouch.stash.domain.model;

public record FetchedUrlInfo(boolean reachable, String xFrameOptions, String contentSecurityPolicy) {}

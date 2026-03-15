package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.Stash;

public interface RegenerateStashSignatureUseCase {

    Stash execute(RegenerateStashSignatureCommand command);
}

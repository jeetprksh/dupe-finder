package com.dupefinder.service;

import java.util.List;

public class DuplicacyGroups {

    private final List<DuplicacyGroup> duplicacyGroups;

    public DuplicacyGroups(List<DuplicacyGroup> duplicacyGroups) {
        this.duplicacyGroups = duplicacyGroups;
    }

    public List<DuplicacyGroup> getDuplicacyGroups() {
        return duplicacyGroups;
    }
}

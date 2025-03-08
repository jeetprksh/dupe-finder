package com.dupefinder.service;

import java.util.List;
import java.util.UUID;

public class DuplicacyGroup {

    private final String uuid = UUID.randomUUID().toString();
    private final String hash;
    private final List<FileInfo> fileInfos;

    public DuplicacyGroup(String hash, List<FileInfo> fileInfos) {
        this.hash = hash;
        this.fileInfos = fileInfos;
    }

    public String getUuid() {
        return uuid;
    }

    public String getHash() {
        return hash;
    }

    public List<FileInfo> getFileInfos() {
        return fileInfos;
    }
}

package com.dupefinder.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static java.util.stream.Collectors.groupingBy;

public class DuplicacyGroup {

    private String uuid = UUID.randomUUID().toString();
    private final String hash;
    private final List<FileInfo> fileInfos;
    private Map<String, List<FileInfo>> fileInfosGroupByDirectory;

    public DuplicacyGroup(String hash, List<FileInfo> fileInfos) {
        this.hash = hash;
        this.fileInfos = fileInfos;
        this.fileInfosGroupByDirectory = fileInfos.stream().collect(groupingBy(FileInfo::directoryPath));
    }

    public DuplicacyGroup(String uuid, String hash, List<FileInfo> fileInfos) {
        this.uuid = uuid;
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

    public Map<String, List<FileInfo>> getFileInfosGroupByDirectory() {
        return fileInfosGroupByDirectory;
    }
}

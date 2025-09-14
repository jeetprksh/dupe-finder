package com.dupefinder.service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public record FileInfo(String uuid, String name, String thumbnail, String actualPath) {

    public static List<FileInfo> create(List<String> filePaths, String appDirectory) throws IOException {
        List<FileInfo> fileInfos = new ArrayList<>();
        for (String filePath : filePaths) {
            File file = new File(filePath);
            fileInfos.add(new FileInfo(UUID.randomUUID().toString(), file.getName(), null, filePath));
        }
        return fileInfos;
    }
}

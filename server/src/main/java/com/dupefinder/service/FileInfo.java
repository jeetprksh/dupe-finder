package com.dupefinder.service;

import net.coobird.thumbnailator.Thumbnails;
import org.apache.commons.lang3.RandomStringUtils;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public record FileInfo(String name, String thumbnail, String actualPath) {

    public static List<FileInfo> create(List<String> filePaths, String appDirectory) throws IOException {
        List<FileInfo> fileInfos = new ArrayList<>();
        for (String filePath : filePaths) {
            File file = new File(filePath);
            String thName = file.getName().split("\\.")[0] + "-" + RandomStringUtils.insecure().nextAlphanumeric(4) + ".png";
            Thumbnails.of(file)
                    .size(500, 500)
                    .outputFormat("png")
                    .toFile(new File(appDirectory + "\\static_content\\", thName));
            fileInfos.add(new FileInfo(file.getName(), thName, filePath));
        }
        return fileInfos;
    }
}

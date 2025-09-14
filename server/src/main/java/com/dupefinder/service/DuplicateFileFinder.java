package com.dupefinder.service;

import com.dupefinder.controller.CacheFileRequest;
import com.dupefinder.controller.CacheFileResponse;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
public class DuplicateFileFinder {

    private final static MessageDigest messageDigest;
    private final static String appDirectory;
    private final ExecutorService executor = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    static {
        String homeDirectory = System.getProperty("user.home");
        appDirectory = homeDirectory + File.separator + "dup_files";
        try {
            messageDigest = MessageDigest.getInstance("SHA-512");
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("cannot initialize SHA-512 hash function", e);
        }
    }

    public DuplicacyGroups find(String directoryPath) throws Exception {
        File dir = new File(directoryPath);
        if (!dir.isDirectory()) {
            throw new Exception("No directory found with path " + dir.getAbsolutePath());
        }

        Map<String, List<String>> duplicacyMap = createDuplicacyMap(dir);
        List<DuplicacyGroup> duplicacyGroupList = new ArrayList<>();
        for (String key : duplicacyMap.keySet()) {
            List<String> filePaths = duplicacyMap.get(key);
            if (filePaths.size() > 1) {
                List<FileInfo> fileInfos = FileInfo.create(filePaths, appDirectory);
                DuplicacyGroup duplicacyGroup = new DuplicacyGroup(key, fileInfos);
                duplicacyGroupList.add(duplicacyGroup);
                fileInfos.forEach(fi -> executor.submit(new ThumbnailGeneratorTask(duplicacyGroup.getUuid(), fi, appDirectory, messagingTemplate)));
            }
        }
        return new DuplicacyGroups(duplicacyGroupList);
    }

    Map<String, List<String>> createDuplicacyMap(File directory) throws IOException {
        Map<String, List<String>> duplicacyMap = new HashMap<>();
        List<File> allFiles = new ArrayList<>();
        listAllFiles(allFiles, directory);

        for (File file : allFiles) {
            try(FileInputStream inputStream = new FileInputStream(file)) {
                byte[] fileData = new byte[(int) file.length()];
                inputStream.read(fileData);

                String uniqueFileHash = new BigInteger(1, messageDigest.digest(fileData)).toString(16);
                List<String> identicalFileList = duplicacyMap.get(uniqueFileHash);
                if (identicalFileList == null) {
                    identicalFileList = new LinkedList<>();
                }

                identicalFileList.add(file.getAbsolutePath());
                duplicacyMap.put(uniqueFileHash, identicalFileList);
            }
        }
        return duplicacyMap;
    }

    private void listAllFiles(List<File> files, File directory) {
        for (File dirChild : Objects.requireNonNull(directory.listFiles())) {
            if (dirChild.isDirectory()) {
                listAllFiles(files, dirChild);
            } else {
                files.add(dirChild);
            }
        }
    }

    public DuplicacyGroups processDupeMetadataFile(MultipartFile file) throws Exception {
        List<DuplicacyGroup> duplicacyGroups = new ArrayList<>();
        try (InputStream is = file.getInputStream()) {
            BufferedReader reader = new BufferedReader(new InputStreamReader(is));
            String line;
            List<String> filePaths = new ArrayList<>();
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("-----")) {
                    String[] split = line.split("\t");
                    String filePath = split[1] + "\\" + split[0];
                    filePaths.add(filePath);
                } else {
                    if (!filePaths.isEmpty()) {
                        List<FileInfo> fileInfos = FileInfo.create(filePaths, appDirectory);
                        DuplicacyGroup dg = new DuplicacyGroup(null, fileInfos);
                        fileInfos.forEach(fi -> executor.submit(new ThumbnailGeneratorTask(dg.getUuid(), fi, appDirectory, messagingTemplate)));
                        duplicacyGroups.add(dg);
                        filePaths.clear();
                    }
                }
            }
        }
        return new DuplicacyGroups(duplicacyGroups);
    }

    public void clearCache() throws IOException {
        String staticContentDirectoryPath = appDirectory + "\\static_content\\";
        File staticContentDirectory = new File(staticContentDirectoryPath);
        FileUtils.cleanDirectory(staticContentDirectory);
    }

    public CacheFileResponse cacheFile(String path) throws Exception {
        File fileToCache = new File(path);
        if (fileToCache.exists()) {
            String fileToCacheName = fileToCache.getName();
            String cachedFileName = fileToCacheName.split("\\.")[0] + "-" + RandomStringUtils.insecure().nextAlphanumeric(4) + "." + fileToCacheName.split("\\.")[1];
            String cachedFilePath = appDirectory + "\\static_content\\" + cachedFileName;
            File cachedFile = new File(cachedFilePath);
            FileUtils.copyFile(fileToCache, cachedFile);
            return new CacheFileResponse(false, "File cached for viewing", cachedFile.getName());
        } else {
            return new CacheFileResponse(false, "File does not exists", null);
        }
    }
}
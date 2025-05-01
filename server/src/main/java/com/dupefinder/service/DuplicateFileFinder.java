package com.dupefinder.service;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

@Component
public class DuplicateFileFinder {

    private final static MessageDigest messageDigest;
    private final static String appDirectory;
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
                duplicacyGroupList.add(new DuplicacyGroup(key, FileInfo.create(filePaths, appDirectory)));
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
                        DuplicacyGroup dg = new DuplicacyGroup(null, FileInfo.create(filePaths, appDirectory));
                        duplicacyGroups.add(dg);
                        filePaths.clear();
                    }
                }
            }
        }
        return new DuplicacyGroups(duplicacyGroups);
    }

}
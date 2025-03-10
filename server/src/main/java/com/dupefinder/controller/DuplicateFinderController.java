package com.dupefinder.controller;

import com.dupefinder.service.DuplicacyGroups;
import com.dupefinder.service.DuplicateFileFinder;
import com.dupefinder.service.DuplicateFileFinderFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.nio.file.Files;

@CrossOrigin
@RestController()
public class DuplicateFinderController {

    @Autowired
    DuplicateFileFinder finder;

    @PostMapping(value = "/findDuplicates", produces = MediaType.APPLICATION_JSON_VALUE)
    public DuplicacyGroups findDuplicates(@RequestBody DuplicateFileFinderFilter filter) {
        try {
            return finder.find(filter.getRootDirectories().getFirst());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @PostMapping(value = "/deleteFiles", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse> deleteFiles(@RequestBody DeleteFileRequest deleteFileRequest) {
        try {
            for (String path : deleteFileRequest.paths()) {
                File file = new File(path);
                Files.deleteIfExists(file.toPath());
            }
            return ResponseEntity.ok(new ApiResponse(true, "All Files Deleted"));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(new ApiResponse(false, "Some Problem"));
        }
    }
}

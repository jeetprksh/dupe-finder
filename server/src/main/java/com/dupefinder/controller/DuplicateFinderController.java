package com.dupefinder.controller;

import com.dupefinder.service.DuplicacyGroups;
import com.dupefinder.service.DuplicateFileFinder;
import com.dupefinder.service.DuplicateFileFinderFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController()
public class DuplicateFinderController {

    @Autowired
    DuplicateFileFinder finder;

    @PostMapping(value = "findDuplicates", produces = MediaType.APPLICATION_JSON_VALUE)
    public DuplicacyGroups findDuplicates(@RequestBody DuplicateFileFinderFilter filter) {
        try {
            return finder.find(filter.getRootDirectories().getFirst());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

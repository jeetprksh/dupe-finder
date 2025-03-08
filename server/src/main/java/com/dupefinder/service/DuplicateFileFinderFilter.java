package com.dupefinder.service;

import java.util.List;

public class DuplicateFileFinderFilter {

    private final List<String> rootDirectories;
    private final boolean matchContent;
    private final boolean matchsize;

    public DuplicateFileFinderFilter(List<String> rootDirectories, boolean matchContent, boolean matchsize) {
        this.rootDirectories = rootDirectories;
        this.matchContent = matchContent;
        this.matchsize = matchsize;
    }

    public List<String> getRootDirectories() {
        return rootDirectories;
    }

    public boolean isMatchContent() {
        return matchContent;
    }

    public boolean isMatchsize() {
        return matchsize;
    }
}

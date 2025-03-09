package com.dupefinder.controller;

import java.util.List;

public record DeleteFileRequest(List<String> paths) {
}

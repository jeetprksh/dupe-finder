package com.dupefinder.service;

import org.apache.commons.lang3.RandomStringUtils;
import org.imgscalr.Scalr;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.Collections;

public class ThumbnailGeneratorTask implements Runnable {

    private final String duplicacyGroupUuid;
    private final FileInfo fileInfo;
    private final String appDirectory;
    private final SimpMessagingTemplate messagingTemplate;

    public ThumbnailGeneratorTask(String duplicacyGroupUuid,
                                  FileInfo fileInfo, String appDirectory, SimpMessagingTemplate messagingTemplate) {
        this.duplicacyGroupUuid = duplicacyGroupUuid;
        this.fileInfo = fileInfo;
        this.appDirectory = appDirectory;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void run() {
        try {
            File imageFile = new File(fileInfo.fullPath());
            String thName = imageFile.getName().split("\\.")[0] + "-" + RandomStringUtils.insecure().nextAlphanumeric(4) + ".png";
            BufferedImage img = ImageIO.read(imageFile);
            if (img == null) {
                System.err.println("Skipping non-image: " + imageFile.getName());
                return;
            }

            BufferedImage thumbnail = Scalr.resize(img, Scalr.Method.QUALITY, Scalr.Mode.AUTOMATIC,200,200);

            File outputFile = new File(appDirectory + "\\static_content\\", thName);
            ImageIO.write(thumbnail, "png", outputFile);
            
            DuplicacyGroup dg = new DuplicacyGroup(duplicacyGroupUuid, "",
                    Collections.singletonList(new FileInfo(fileInfo.uuid(), imageFile.getName(), thName, fileInfo.fullPath(), imageFile.getParent())));
            messagingTemplate.convertAndSend("/topic/thumbnails", dg);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

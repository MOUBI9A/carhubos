-- One original/repair close-up photo can support exactly one defect.
CREATE UNIQUE INDEX "GuardianFinding_photoId_key" ON "GuardianFinding"("photoId");
CREATE UNIQUE INDEX "GuardianFinding_repairPhotoId_key" ON "GuardianFinding"("repairPhotoId");

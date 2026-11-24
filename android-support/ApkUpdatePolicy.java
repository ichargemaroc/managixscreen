package app.screenflow.player;

import java.util.Arrays;
import java.util.HashSet;

/** Only in-place updates of the same signed application may reach the installer. */
public final class ApkUpdatePolicy {
  public static boolean compatible(String installedPackage, String candidatePackage,
      long installedVersion, long candidateVersion, long requestedVersion,
      String[] installedSigners, String[] candidateSigners) {
    return installedPackage != null && installedPackage.equals(candidatePackage)
        && candidateVersion > installedVersion && candidateVersion == requestedVersion
        && installedSigners != null && candidateSigners != null
        && installedSigners.length > 0 && candidateSigners.length > 0
        && new HashSet<>(Arrays.asList(installedSigners)).equals(new HashSet<>(Arrays.asList(candidateSigners)));
  }
}
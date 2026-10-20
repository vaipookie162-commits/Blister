// ============================================================================
// Nocturne — Native Java 21 Spatial Synthesizer & Lyric Sync Engine
// File: native/NocturneAudioEngine.java
// ============================================================================

package com.nocturne.audio;

import java.util.List;

public final class NocturneAudioEngine {

    public record LyricLine(String id, int timestampSeconds, String text) {}

    private static final double[] MINOR_PENTATONIC_RATIOS = {
        1.0, 1.2, 1.333, 1.5, 1.777, 2.0, 2.4, 2.666
    };

    private int noteStep = 0;

    public double nextSynthesizerFrequency(double baseFreqHz) {
        double ratio = MINOR_PENTATONIC_RATIOS[noteStep % MINOR_PENTATONIC_RATIOS.length];
        noteStep++;
        return baseFreqHz * ratio;
    }

    public int findActiveLyricIndex(List<LyricLine> lyrics, int currentPlaybackSeconds) {
        int activeIndex = -1;
        for (int i = 0; i < lyrics.size(); i++) {
            if (currentPlaybackSeconds >= lyrics.get(i).timestampSeconds()) {
                activeIndex = i;
            } else {
                break;
            }
        }
        return activeIndex;
    }

    public static String formatTimestamp(int totalSeconds) {
        int clamped = Math.max(0, totalSeconds);
        int minutes = clamped / 60;
        int seconds = clamped % 60;
        return String.format("%d:%02d", minutes, seconds);
    }
}

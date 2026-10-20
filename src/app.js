// ============================================================================
// Nocturne — Aura Liquid Glass Music Player
// 100% Pure Native Vanilla JavaScript (ES2022+) Application Controller
// ============================================================================

import { INITIAL_SONGS, EQUALIZER_PRESETS, OUTPUT_DEVICES, AURA_STATIONS } from './data.js';
import { audioEngine } from './audioEngine.js';
import { wasmDsp } from './wasmDsp.js';
import { icon } from './icons.js';

const NATIVE_CODE_SNIPPETS = {
  cpp: `// Native C++20 5-Band Biquad Peaking EQ & Spatial Matrix (native/NocturneDsp.cpp)
void BiquadBandFilter::configurePeakingEQ(float centerFreqHz, float sampleRate, float qFactor, float gainDb) {
    const float A = std::pow(10.0f, gainDb / 40.0f);
    const float omega = static_cast<float>(2.0 * PI * centerFreqHz / sampleRate);
    const float sn = std::sin(omega);
    const float cs = std::cos(omega);
    const float alpha = sn / (2.0f * qFactor);

    const float a0 = 1.0f + alpha / A;
    coeffs_.b0 = (1.0f + alpha * A) / a0;
    coeffs_.b1 = (-2.0f * cs) / a0;
    coeffs_.b2 = (1.0f - alpha * A) / a0;
    coeffs_.a1 = (-2.0f * cs) / a0;
    coeffs_.a2 = (1.0f - alpha / A) / a0;
}

void FiveBandSpatialEqualizer::processInterleavedBlock(float* pcmStereo, std::size_t frameCount) noexcept {
    for (std::size_t f = 0; f < frameCount; ++f) {
        float L = pcmStereo[f * 2];
        float R = pcmStereo[f * 2 + 1];
        for (auto& band : bands_) band.processStereoSample(L, R);
        if (spatial3DEnabled_) {
            const float mid = 0.5f * (L + R);
            const float side = 0.5f * (L - R) * (1.35f + 0.25f * bassEnhanceAmount_);
            L = std::clamp(mid + side, -1.0f, 1.0f);
            R = std::clamp(mid - side, -1.0f, 1.0f);
        }
        pcmStereo[f * 2] = L;
        pcmStereo[f * 2 + 1] = R;
    }
}`,
  csharp: `// Native C# (.NET 8) Liquid Glass Lens Optics Controller (native/NocturneEngine.cs)
public sealed class NocturneOpticsEngine
{
    public LiquidLensSettings CurrentSettings { get; private set; } = new();

    public (double RotateX, double RotateY, double GlossX, double GlossY) Compute3DTilt(
        double pointerX, double pointerY, double width, double height)
    {
        if (!CurrentSettings.Tilt3D || width <= 0 || height <= 0)
            return (0.0, 0.0, 50.0, 50.0);

        double centerX = width * 0.5;
        double centerY = height * 0.5;
        double rotateY = ((pointerX - centerX) / centerX) * 16.0;
        double rotateX = -((pointerY - centerY) / centerY) * 16.0;
        double glossX = Math.Clamp((pointerX / width) * 100.0, 0.0, 100.0);
        double glossY = Math.Clamp((pointerY / height) * 100.0, 0.0, 100.0);

        return (rotateX, rotateY, glossX, glossY);
    }

    public double ComputeDisplacementScale() =>
        Math.Round(CurrentSettings.RefractionPower * 0.28, 2);
}`,
  java: `// Native Java 21 Spatial Synthesizer & Lyric Sync Engine (native/NocturneAudioEngine.java)
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
            if (currentPlaybackSeconds >= lyrics.get(i).timestampSeconds()) activeIndex = i;
            else break;
        }
        return activeIndex;
    }
}`
};

// Application State
const state = {
  songs: [...INITIAL_SONGS],
  currentSongIndex: 0,
  isPlaying: false,
  currentTime: 0,
  volume: 0.85,
  isMuted: false,
  prevVolume: 0.85,
  activeTab: 'now_playing', // 'now_playing' | 'discover' | 'library' | 'search' | 'equalizer'
  libraryFilter: 'all', // 'all' | 'favorites'
  searchQuery: '',
  favorites: ['song-1', 'song-2'],
  isShuffle: false,
  repeatMode: 'off', // 'off' | 'all' | 'one'
  currentOutputDevice: OUTPUT_DEVICES[0],
  currentPreset: {
    ...EQUALIZER_PRESETS[0],
    bands: [...EQUALIZER_PRESETS[0].bands]
  },
  // Modals / Overlays
  showLyrics: false,
  showQueue: false,
  showOutputSelector: false,
  showOpticsTuning: false,
  showNativeCodeModal: false,
  activeNativeLang: 'cpp', // 'cpp' | 'csharp' | 'java'
  // Liquid Glass Lens Settings
  lensSettings: {
    refractionPower: 55,
    magnification: 1.18,
    lensShape: 'squircle', // 'squircle' | 'circle' | 'teardrop' | 'hex'
    glossOpacity: 0.55,
    tilt3D: true,
    waterDroplets: true
  },
  tilt: {
    rotateX: 0,
    rotateY: 0,
    glossX: 45,
    glossY: 35
  }
};

let playbackTimer = null;
let spectrumRafId = null;
let toastTimeout = null;

function getCurrentSong() {
  return state.songs[state.currentSongIndex] || state.songs[0];
}

export function formatTime(seconds) {
  const clamped = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateCSSVariables() {
  const song = getCurrentSong();
  const root = document.documentElement;
  root.style.setProperty('--accent-color', song.accentColor);
  root.style.setProperty('--glow-color', song.glowColor);
  root.style.setProperty('--secondary-color', song.secondaryColor);
}

function updateSVGFilter() {
  const { refractionPower } = state.lensSettings;
  const baseFreqLow = (0.015 + refractionPower * 0.0002).toFixed(4);
  const baseFreqHigh = (0.022 + refractionPower * 0.0003).toFixed(4);
  const scale = wasmDsp.calculateDisplacementScale(refractionPower);

  const turb = document.getElementById('svgTurbulence');
  const turbAnim = document.getElementById('svgTurbulenceAnim');
  const disp = document.getElementById('svgDisplacement');

  if (turb) {
    turb.setAttribute('baseFrequency', (0.015 + refractionPower * 0.0003).toFixed(4));
  }
  if (turbAnim) {
    turbAnim.setAttribute('values', `${baseFreqLow};${baseFreqHigh};${baseFreqLow}`);
  }
  if (disp) {
    disp.setAttribute('scale', String(scale));
  }
}

function showToast(message) {
  const banner = document.getElementById('toastBanner');
  const textEl = document.getElementById('toastMessage');
  if (!banner || !textEl) return;

  textEl.textContent = message;
  banner.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-3');
  banner.classList.add('opacity-100', 'translate-y-0');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    banner.classList.add('opacity-0', 'pointer-events-none', '-translate-y-3');
    banner.classList.remove('opacity-100', 'translate-y-0');
  }, 2400);
}

// ============================================================================
// Playback & Audio Control Logic
// ============================================================================

function startPlaybackTimer() {
  if (playbackTimer) clearInterval(playbackTimer);
  playbackTimer = setInterval(() => {
    if (!state.isPlaying) return;
    const song = getCurrentSong();

    if (song.audioUrl && audioEngine.audioElement) {
      state.currentTime = Math.floor(audioEngine.audioElement.currentTime || 0);
    } else {
      state.currentTime += 1;
    }

    if (state.currentTime >= song.duration) {
      if (state.repeatMode === 'one') {
        state.currentTime = 0;
        audioEngine.seek(0);
        updateProgressUI();
      } else {
        handleNextSong(true);
      }
      return;
    }

    updateProgressUI();
    if (state.showLyrics) {
      updateActiveLyricUI();
    }
  }, 1000);
}

function handleTogglePlay() {
  const song = getCurrentSong();
  if (!state.isPlaying) {
    state.isPlaying = true;
    if (state.currentTime === 0 || audioEngine.currentSong?.id !== song.id) {
      audioEngine.playSong(song);
    } else {
      audioEngine.resume();
    }
  } else {
    state.isPlaying = false;
    audioEngine.pause();
  }
  renderApp();
}

function handleSelectSongById(songId, switchToNowPlaying = false) {
  const idx = state.songs.findIndex((s) => s.id === songId);
  if (idx === -1) return;
  state.currentSongIndex = idx;
  state.currentTime = 0;
  state.isPlaying = true;
  if (switchToNowPlaying) {
    state.activeTab = 'now_playing';
  }
  updateCSSVariables();
  audioEngine.playSong(getCurrentSong());
  renderApp();
}

function handleNextSong(fromAutoEnd = false) {
  if (fromAutoEnd && state.repeatMode === 'off' && state.currentSongIndex === state.songs.length - 1 && !state.isShuffle) {
    state.isPlaying = false;
    state.currentTime = 0;
    audioEngine.pause();
    renderApp();
    return;
  }

  let nextIdx = (state.currentSongIndex + 1) % state.songs.length;
  if (state.isShuffle && state.songs.length > 1) {
    do {
      nextIdx = Math.floor(Math.random() * state.songs.length);
    } while (nextIdx === state.currentSongIndex);
  }
  state.currentSongIndex = nextIdx;
  state.currentTime = 0;
  state.isPlaying = true;
  updateCSSVariables();
  audioEngine.playSong(getCurrentSong());
  renderApp();
}

function handlePrevSong() {
  if (state.currentTime > 4) {
    state.currentTime = 0;
    audioEngine.seek(0);
    updateProgressUI();
    return;
  }
  const prevIdx = (state.currentSongIndex - 1 + state.songs.length) % state.songs.length;
  state.currentSongIndex = prevIdx;
  state.currentTime = 0;
  state.isPlaying = true;
  updateCSSVariables();
  audioEngine.playSong(getCurrentSong());
  renderApp();
}

function handleSeek(newSeconds) {
  const song = getCurrentSong();
  state.currentTime = Math.max(0, Math.min(song.duration, Number(newSeconds)));
  audioEngine.seek(state.currentTime);
  updateProgressUI();
  if (state.showLyrics) {
    updateActiveLyricUI();
  }
}

function handleVolumeChange(newVol) {
  const val = Math.max(0, Math.min(1, Number(newVol)));
  state.volume = val;
  state.isMuted = val === 0;
  if (val > 0) state.prevVolume = val;
  audioEngine.setVolume(val);
  updateVolumeUI();
}

function handleToggleMute() {
  if (state.isMuted || state.volume === 0) {
    state.isMuted = false;
    state.volume = state.prevVolume > 0 ? state.prevVolume : 0.75;
  } else {
    state.prevVolume = state.volume;
    state.isMuted = true;
    state.volume = 0;
  }
  audioEngine.setVolume(state.volume);
  renderApp();
}

function handleToggleFavorite(songId) {
  const targetId = songId || getCurrentSong().id;
  if (state.favorites.includes(targetId)) {
    state.favorites = state.favorites.filter((id) => id !== targetId);
    showToast('Removed from Loved Tracks');
  } else {
    state.favorites = [...state.favorites, targetId];
    showToast('Saved to Loved Tracks');
  }
  renderApp();
}

// ============================================================================
// Granular DOM Updates (Scrub Progress, Volume, 3D Lens Tilt, Lyrics)
// ============================================================================

function updateProgressUI() {
  const song = getCurrentSong();
  const pct = song.duration > 0 ? (state.currentTime / song.duration) * 100 : 0;

  const scrubInput = document.getElementById('scrubRangeInput');
  const scrubFill = document.getElementById('scrubFillBar');
  const timeElapsed = document.getElementById('timeElapsedText');
  const timeRemaining = document.getElementById('timeRemainingText');

  if (scrubInput && document.activeElement !== scrubInput) {
    scrubInput.value = String(state.currentTime);
  }
  if (scrubFill) {
    scrubFill.style.width = `${pct}%`;
  }
  if (timeElapsed) {
    timeElapsed.textContent = formatTime(state.currentTime);
  }
  if (timeRemaining) {
    timeRemaining.textContent = `-${formatTime(song.duration - state.currentTime)}`;
  }
}

function updateVolumeUI() {
  const volInput = document.getElementById('volumeRangeInput');
  if (volInput && document.activeElement !== volInput) {
    volInput.value = String(state.volume);
  }
}

function updateLensTransformUI() {
  const lensCard = document.getElementById('liquidLensCard');
  const glossOverlay = document.getElementById('liquidGlossOverlay');
  const refractionLayer = document.getElementById('liquidRefractionLayer');

  if (lensCard) {
    const scale = state.isPlaying ? 1.01 : 1.0;
    lensCard.style.transform = `rotateX(${state.tilt.rotateX.toFixed(2)}deg) rotateY(${state.tilt.rotateY.toFixed(2)}deg) scale(${scale})`;
  }
  if (glossOverlay) {
    glossOverlay.style.background = `radial-gradient(circle at ${state.tilt.glossX.toFixed(1)}% ${state.tilt.glossY.toFixed(1)}%, rgba(255,255,255,${state.lensSettings.glossOpacity}) 0%, rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.32) 100%)`;
  }
  if (refractionLayer) {
    refractionLayer.style.transform = `scale(${state.lensSettings.magnification})`;
  }
}

function updateActiveLyricUI() {
  const song = getCurrentSong();
  if (!song.lyrics) return;
  let activeIndex = -1;
  for (let i = 0; i < song.lyrics.length; i++) {
    if (state.currentTime >= song.lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  const container = document.getElementById('lyricsScrollContainer');
  if (!container) return;

  song.lyrics.forEach((line, idx) => {
    const el = document.getElementById(`lyric-item-${idx}`);
    if (!el) return;
    const isActive = idx === activeIndex;
    const isPast = idx < activeIndex;
    const textP = el.querySelector('.lyric-line-text');
    const jumpHint = el.querySelector('.lyric-jump-hint');

    if (isActive) {
      el.className = 'cursor-pointer transition-all duration-300 p-3 rounded-2xl bg-white/10 border border-white/20 shadow-lg scale-[1.02]';
      if (textP) {
        textP.style.color = song.accentColor;
        textP.style.textShadow = `0 0 18px ${song.glowColor}`;
      }
      if (jumpHint) jumpHint.classList.remove('hidden');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      el.className = `cursor-pointer transition-all duration-300 p-3 rounded-2xl hover:bg-white/5 ${
        isPast ? 'opacity-45' : 'opacity-30'
      }`;
      if (textP) {
        textP.style.color = 'rgba(255,255,255,0.75)';
        textP.style.textShadow = 'none';
      }
      if (jumpHint) jumpHint.classList.add('hidden');
    }
  });
}

// ============================================================================
// Spectrum Visualizer Canvas Loop
// ============================================================================

function startSpectrumLoop() {
  if (spectrumRafId) cancelAnimationFrame(spectrumRafId);

  const renderFrame = () => {
    const canvas = document.getElementById('eqSpectrumCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const freqData = audioEngine.getFrequencyData();
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const barCount = 24;
        const gap = 3;
        const barWidth = (width - gap * (barCount - 1)) / barCount;
        const song = getCurrentSong();

        for (let i = 0; i < barCount; i++) {
          const eqBoost = (state.currentPreset.bands[Math.min(4, Math.floor(i / 5))] || 0) * 3.2;
          const rawVal = state.isPlaying
            ? (freqData[i] || Math.sin(Date.now() / 160 + i * 0.45) * 32 + 58) + eqBoost
            : 10;
          const clampedVal = Math.max(8, Math.min(255, rawVal));
          const barHeight = (clampedVal / 255) * height;
          const x = i * (barWidth + gap);
          const y = height - barHeight;

          const grad = ctx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, song.accentColor);
          grad.addColorStop(1, '#38bdf8');
          ctx.fillStyle = grad;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      }
    }
    spectrumRafId = requestAnimationFrame(renderFrame);
  };

  renderFrame();
}

// ============================================================================
// Template Builders for Views & Modals
// ============================================================================

function buildLiquidLensHTML(song) {
  const shapeClass = {
    squircle: 'lens-shape-squircle',
    circle: 'lens-shape-circle',
    teardrop: 'lens-shape-teardrop',
    hex: 'lens-shape-hex'
  }[state.lensSettings.lensShape] || 'lens-shape-squircle';

  return `
    <div class="relative w-full max-w-[300px] sm:max-w-[330px] aspect-square mx-auto my-1 select-none perspective-1000">
      <!-- Dynamic Ambient Under-Glow Shadow -->
      <div
        class="absolute -inset-4 rounded-full pointer-events-none z-0 transition-opacity duration-500 ${
          state.isPlaying ? 'opacity-85 scale-105' : 'opacity-50 scale-100'
        }"
        style="background: radial-gradient(circle at 50% 50%, ${song.glowColor} 0%, ${song.accentColor}40 50%, transparent 80%); filter: blur(36px);"
      ></div>

      <!-- Main Interactive 3D Liquid Lens Container -->
      <div
        id="liquidLensCard"
        class="relative w-full h-full cursor-pointer z-10 overflow-hidden group border border-white/25 glass-rim transform-style-3d transition-transform duration-150 ease-out ${shapeClass}"
        style="transform: rotateX(${state.tilt.rotateX.toFixed(2)}deg) rotateY(${state.tilt.rotateY.toFixed(2)}deg) scale(${state.isPlaying ? 1.01 : 1});"
      >
        <!-- Base Album Artwork -->
        <img
          src="${song.albumArt}"
          alt="${song.title}"
          referrerpolicy="no-referrer"
          class="absolute inset-0 w-full h-full object-cover rounded-[inherit] pointer-events-none"
        />

        <!-- Central Magnified Liquid Refraction Layer -->
        <div
          id="liquidRefractionLayer"
          class="absolute inset-0 w-full h-full pointer-events-none rounded-[inherit] opacity-95 transition-transform duration-200"
          style="filter: url(#liquidRefractionFilter); transform: scale(${state.lensSettings.magnification});"
        >
          <img
            src="${song.albumArt}"
            alt=""
            referrerpolicy="no-referrer"
            class="w-full h-full object-cover rounded-[inherit]"
          />
        </div>

        <!-- Specular Gloss Surface Shimmer -->
        <div
          id="liquidGlossOverlay"
          class="absolute inset-0 pointer-events-none mix-blend-overlay rounded-[inherit]"
          style="background: radial-gradient(circle at ${state.tilt.glossX}% ${state.tilt.glossY}%, rgba(255,255,255,${state.lensSettings.glossOpacity}) 0%, rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.32) 100%);"
        ></div>

        <!-- Convex Glass Rim Inner Border -->
        <div class="absolute inset-0 rounded-[inherit] border-2 border-white/30 pointer-events-none"></div>

        <!-- Water Droplets Micro-Magnifiers -->
        ${
          state.lensSettings.waterDroplets
            ? `
          <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
            <div class="absolute w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/40 top-[22%] left-[27%] droplet-lg">
              <div class="w-1.5 h-1.5 bg-white rounded-full absolute top-1.5 left-2 opacity-90"></div>
            </div>
            <div class="absolute w-5 h-5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 bottom-[31%] right-[24%] droplet-sm">
              <div class="w-1 h-1 bg-white rounded-full absolute top-1 left-1 opacity-85"></div>
            </div>
            <div class="absolute w-3 h-3 rounded-full bg-white/30 backdrop-blur-sm border border-white/50 top-[66%] left-[20%]"></div>
          </div>
        `
            : ''
        }

        <!-- Ripple Layer Container -->
        <div id="lensRippleContainer" class="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]"></div>

        <!-- Interactive Corner Trigger: Liquid Glass Optics Customizer -->
        <button
          id="lensOpticsBadgeBtn"
          type="button"
          class="absolute bottom-3.5 right-3.5 z-20 px-3 py-1.5 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-xl border border-white/25 text-[11px] font-medium text-white/90 flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          ${icon('droplet', 'w-3.5 h-3.5 text-cyan-300')}
          <span>Optics</span>
        </button>
      </div>

      ${
        state.showOpticsTuning
          ? `
        <!-- Liquid Lens Live Optics Tuning Overlay -->
        <div class="absolute inset-0 z-30 p-4 rounded-[36px] bg-slate-950/92 backdrop-blur-2xl border border-white/20 text-white flex flex-col justify-between shadow-2xl">
          <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div class="flex items-center gap-2">
              ${icon('droplet', 'w-4 h-4 text-cyan-400')}
              <h3 class="text-xs font-bold tracking-wide">Liquid Glass Optics</h3>
            </div>
            <button
              id="closeOpticsOverlayBtn"
              type="button"
              class="text-xs px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>

          <div class="space-y-3 my-auto text-xs">
            <!-- Refraction Power -->
            <div>
              <div class="flex justify-between mb-1 text-white/75">
                <span>Refraction Power</span>
                <span id="opticsRefractionLabel" class="font-mono-tabular text-cyan-300">${state.lensSettings.refractionPower}%</span>
              </div>
              <input
                id="opticsRefractionInput"
                type="range"
                min="0"
                max="100"
                value="${state.lensSettings.refractionPower}"
                class="w-full native-slider"
              />
            </div>

            <!-- Magnification Zoom -->
            <div>
              <div class="flex justify-between mb-1 text-white/75">
                <span>Magnification Zoom</span>
                <span id="opticsZoomLabel" class="font-mono-tabular text-cyan-300">${state.lensSettings.magnification.toFixed(2)}x</span>
              </div>
              <input
                id="opticsZoomInput"
                type="range"
                min="1.0"
                max="1.6"
                step="0.02"
                value="${state.lensSettings.magnification}"
                class="w-full native-slider"
              />
            </div>

            <!-- Lens Cut Shape Selector -->
            <div>
              <span class="block text-white/75 mb-1.5">Glass Lens Cut Shape</span>
              <div class="grid grid-cols-4 gap-1.5">
                ${['squircle', 'circle', 'teardrop', 'hex']
                  .map(
                    (shape) => `
                  <button
                    type="button"
                    data-lens-shape="${shape}"
                    class="py-1.5 px-2 rounded-xl border text-[11px] capitalize transition cursor-pointer ${
                      state.lensSettings.lensShape === shape
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-semibold'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }"
                  >
                    ${shape}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Toggles -->
            <div class="flex items-center justify-between pt-1">
              <span class="text-white/75">Water Droplet Magnifiers</span>
              <button
                id="toggleWaterDropletsBtn"
                type="button"
                class="w-10 h-5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                  state.lensSettings.waterDroplets ? 'bg-cyan-500 justify-end' : 'bg-white/20 justify-start'
                }"
              >
                <span class="w-4 h-4 rounded-full bg-white shadow"></span>
              </button>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-white/75">3D Gyro / Pointer Tilt</span>
              <button
                id="toggleTilt3DBtn"
                type="button"
                class="w-10 h-5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                  state.lensSettings.tilt3D ? 'bg-cyan-500 justify-end' : 'bg-white/20 justify-start'
                }"
              >
                <span class="w-4 h-4 rounded-full bg-white shadow"></span>
              </button>
            </div>
          </div>

          <button
            id="resetOpticsBtn"
            type="button"
            class="mt-1 text-[11px] text-white/60 hover:text-white flex items-center justify-center gap-1.5 py-1 cursor-pointer"
          >
            ${icon('rotateCcw', 'w-3.5 h-3.5')}
            <span>Reset Optics Defaults</span>
          </button>
        </div>
      `
          : ''
      }
    </div>
  `;
}

function buildNowPlayingHTML() {
  const song = getCurrentSong();
  const isFav = state.favorites.includes(song.id);
  const progressPct = song.duration > 0 ? (state.currentTime / song.duration) * 100 : 0;

  return `
    <div class="flex-1 flex flex-col justify-between p-4 sm:p-6 text-white select-none relative overflow-y-auto no-scrollbar">
      <!-- Top Header Bar -->
      <div class="flex items-center justify-between z-10 pb-2">
        <button
          id="openQueueTopBtn"
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/85 hover:text-white transition cursor-pointer"
          title="Open Up Next Queue"
        >
          ${icon('chevronDown', 'w-5 h-5')}
        </button>

        <div class="text-center px-2">
          <span class="text-[11px] font-medium text-white/55 block">Playing from Album</span>
          <h2 class="text-xs sm:text-sm font-bold text-white/95 truncate max-w-[220px]">${song.album}</h2>
        </div>

        <button
          id="shareTrackBtn"
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/85 hover:text-white transition cursor-pointer"
          title="Share Track"
        >
          ${icon('share2', 'w-4 h-4')}
        </button>
      </div>

      <!-- Audio Format Stream Trigger (Opens Output Selector) -->
      <div class="flex justify-center my-1 z-10">
        <button
          id="openOutputTopBtn"
          type="button"
          class="px-3.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-[11px] font-mono-tabular font-medium text-cyan-200 backdrop-blur-md transition flex items-center gap-2 cursor-pointer"
        >
          ${icon('headphones', 'w-3.5 h-3.5 text-cyan-300')}
          <span>${song.hiResFormat}</span>
        </button>
      </div>

      <!-- Central Album Artwork with 3D Liquid Glass Lens -->
      <div class="my-auto py-1 z-10">
        ${buildLiquidLensHTML(song)}
      </div>

      <!-- Song Title & Artist + Favorite Heart -->
      <div class="flex items-center justify-between my-2 z-10 px-1">
        <div class="space-y-0.5 max-w-[78%]">
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight truncate">
            ${song.title}
          </h1>
          <p class="text-xs sm:text-sm font-medium text-white/70 truncate">
            ${song.artist} <span aria-hidden="true">·</span> <span class="text-white/50">${song.genre}</span>
          </p>
        </div>

        <button
          id="nowPlayingFavBtn"
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition cursor-pointer ${
            isFav ? 'bg-pink-500/20 text-pink-500 scale-105' : 'bg-white/10 text-white/60 hover:text-white'
          }"
          title="Toggle Favorite"
        >
          ${icon(isFav ? 'heartFilled' : 'heart', 'w-5 h-5')}
        </button>
      </div>

      <!-- Scrub / Progress Bar -->
      <div class="space-y-1.5 my-2 z-10">
        <div class="relative flex items-center h-5 cursor-pointer">
          <input
            id="scrubRangeInput"
            type="range"
            min="0"
            max="${song.duration}"
            value="${state.currentTime}"
            class="w-full native-slider z-20"
            aria-label="Seek playback position"
          />
          <div class="absolute inset-x-0 h-1.5 bg-white/20 rounded-full overflow-hidden pointer-events-none">
            <div
              id="scrubFillBar"
              class="h-full rounded-full transition-all duration-150"
              style="width: ${progressPct}%; background-color: ${song.accentColor};"
            ></div>
          </div>
        </div>
        <div class="flex justify-between text-[11px] font-mono-tabular text-white/60 px-0.5">
          <span id="timeElapsedText">${formatTime(state.currentTime)}</span>
          <span id="timeRemainingText">-${formatTime(song.duration - state.currentTime)}</span>
        </div>
      </div>

      <!-- Primary Playback Controls -->
      <div class="flex items-center justify-between my-1.5 z-10 px-2">
        <button
          id="toggleShuffleBtn"
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition cursor-pointer ${
            state.isShuffle ? 'text-cyan-300 bg-cyan-500/20' : 'text-white/55 hover:text-white'
          }"
          title="Toggle Shuffle"
        >
          ${icon('shuffle', 'w-4 h-4')}
        </button>

        <button
          id="prevTrackBtn"
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white hover:bg-white/10 transition active:scale-90 cursor-pointer"
          title="Previous Track"
        >
          ${icon('skipBack', 'w-6 h-6')}
        </button>

        <button
          id="playPauseMainBtn"
          type="button"
          class="relative w-16 h-16 flex items-center justify-center rounded-full bg-white text-slate-950 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          style="box-shadow: 0 0 32px ${song.glowColor};"
          title="${state.isPlaying ? 'Pause' : 'Play'}"
        >
          ${icon(state.isPlaying ? 'pause' : 'play', 'w-7 h-7')}
        </button>

        <button
          id="nextTrackBtn"
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white hover:bg-white/10 transition active:scale-90 cursor-pointer"
          title="Next Track"
        >
          ${icon('skipForward', 'w-6 h-6')}
        </button>

        <button
          id="toggleRepeatBtn"
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition relative cursor-pointer ${
            state.repeatMode !== 'off' ? 'text-cyan-300 bg-cyan-500/20' : 'text-white/55 hover:text-white'
          }"
          title="Toggle Repeat Mode"
        >
          ${icon('repeat', 'w-4 h-4')}
          ${
            state.repeatMode === 'one'
              ? `<span class="absolute top-1.5 right-1.5 text-[9px] font-mono-tabular font-bold text-cyan-300">1</span>`
              : ''
          }
        </button>
      </div>

      <!-- Volume & Output Target Bar -->
      <div class="flex items-center gap-3 my-2 z-10 p-2.5 rounded-2xl bg-white/5 border border-white/10">
        <button
          id="muteToggleBtn"
          type="button"
          class="min-h-[36px] min-w-[36px] flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
          title="Mute / Unmute"
        >
          ${
            state.isMuted || state.volume === 0
              ? icon('volumeX', 'w-4 h-4 text-rose-400')
              : icon('volume2', 'w-4 h-4')
          }
        </button>

        <input
          id="volumeRangeInput"
          type="range"
          min="0"
          max="1"
          step="0.02"
          value="${state.volume}"
          class="w-full native-slider"
          aria-label="Master Volume"
        />

        <button
          id="openOutputBottomBtn"
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white/90 whitespace-nowrap shrink-0 transition cursor-pointer"
        >
          ${icon(state.currentOutputDevice.iconName || 'headphones', 'w-3.5 h-3.5 text-cyan-300')}
          <span class="truncate max-w-[110px]">${state.currentOutputDevice.name}</span>
        </button>
      </div>

      <!-- Bottom Quick Action Buttons (Lyrics, Optics, Up Next) -->
      <div class="flex items-center justify-around z-10 pt-2 border-t border-white/10 gap-2">
        <button
          id="openLyricsBtn"
          type="button"
          class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-medium text-white/85 whitespace-nowrap shrink-0 transition cursor-pointer"
        >
          ${icon('mic2', 'w-4 h-4 text-pink-400')}
          <span>Lyrics</span>
        </button>

        <button
          id="openOpticsBottomBtn"
          type="button"
          class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-medium text-white/85 whitespace-nowrap shrink-0 transition cursor-pointer"
        >
          ${icon('sliders', 'w-4 h-4 text-cyan-400')}
          <span>Optics</span>
        </button>

        <button
          id="openQueueBottomBtn"
          type="button"
          class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-medium text-white/85 whitespace-nowrap shrink-0 transition cursor-pointer"
        >
          ${icon('listMusic', 'w-4 h-4 text-purple-400')}
          <span>Up Next</span>
        </button>
      </div>
    </div>
  `;
}

function buildDiscoverHTML() {
  const song = getCurrentSong();
  const featured = state.songs[0];

  return `
    <div class="flex-1 overflow-y-auto p-5 sm:p-6 text-white space-y-6 no-scrollbar">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h2 class="text-lg font-extrabold text-white tracking-tight">Discover Aura</h2>
          <p class="text-xs text-white/60">Curated in Lossless · Moto Spatial Audio</p>
        </div>
        <button
          type="button"
          data-select-song="${featured.id}"
          class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer whitespace-nowrap shrink-0"
        >
          Play Featured
        </button>
      </div>

      <!-- Featured Liquid Hero Card -->
      <div
        data-select-song="${featured.id}"
        class="relative rounded-3xl overflow-hidden p-5 border border-white/20 shadow-2xl cursor-pointer group transition-transform active:scale-[0.99]"
        style="background: linear-gradient(135deg, ${song.accentColor}66 0%, #090d16 100%);"
      >
        <div class="relative z-10 flex items-center justify-between gap-4">
          <div class="space-y-1.5 max-w-[68%]">
            <span class="text-[11px] font-semibold text-cyan-300 block">Featured Spatial Master</span>
            <h3 class="text-xl font-extrabold text-white group-hover:text-cyan-300 transition truncate">
              ${featured.title}
            </h3>
            <p class="text-xs text-white/80">${featured.artist} · ${featured.album}</p>
            <p class="text-[11px] font-mono-tabular text-cyan-200/90 pt-1">${featured.hiResFormat}</p>
          </div>
          <div class="relative shrink-0">
            <img
              src="${featured.albumArt}"
              alt="${featured.title}"
              referrerpolicy="no-referrer"
              class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-2xl border border-white/30 group-hover:scale-105 transition"
            />
            <div class="absolute inset-0 bg-black/35 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              ${icon('play', 'w-8 h-8 text-white')}
            </div>
          </div>
        </div>
      </div>

      <!-- Trending Spatials Horizontal Scroller -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-bold text-white/75 flex items-center gap-1.5">
            ${icon('flame', 'w-4 h-4 text-orange-400')}
            <span>Trending Spatial Masters</span>
          </h3>
          <span class="text-xs text-white/45 font-mono-tabular">${state.songs.length} tracks</span>
        </div>
        <div class="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          ${state.songs
            .map(
              (s) => `
            <div
              data-select-song="${s.id}"
              class="min-w-[144px] max-w-[144px] p-2.5 rounded-2xl bg-white/5 border ${
                s.id === song.id ? 'border-cyan-400/60 bg-white/10' : 'border-white/10 hover:border-white/30'
              } transition cursor-pointer group shrink-0"
            >
              <div class="relative mb-2 overflow-hidden rounded-xl aspect-square">
                <img
                  src="${s.albumArt}"
                  alt="${s.title}"
                  referrerpolicy="no-referrer"
                  class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <h4 class="text-xs font-bold text-white truncate">${s.title}</h4>
              <p class="text-[11px] text-white/55 truncate">${s.artist}</p>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Live Aura Stations Grid -->
      <div>
        <h3 class="text-xs font-bold text-white/75 mb-3 flex items-center gap-1.5">
          ${icon('radio', 'w-4 h-4 text-purple-400')}
          <span>Live Aura Stations</span>
        </h3>
        <div class="grid grid-cols-2 gap-3">
          ${AURA_STATIONS.map(
            (st) => `
            <button
              type="button"
              data-station-song="${st.songId}"
              data-station-name="${st.name}"
              class="p-4 rounded-2xl bg-gradient-to-br ${st.gradient} border border-white/12 hover:border-white/35 transition cursor-pointer flex flex-col justify-between h-24 text-left group"
            >
              <div class="flex items-center justify-between w-full">
                <span class="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-200 transition">${st.name}</span>
                ${icon(st.icon, 'w-4 h-4 text-cyan-300')}
              </div>
              <span class="text-[11px] text-white/60">${st.subtitle}</span>
            </button>
          `
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

function buildLibraryHTML() {
  const currentSong = getCurrentSong();
  const displayedSongs =
    state.libraryFilter === 'favorites'
      ? state.songs.filter((s) => state.favorites.includes(s.id))
      : state.songs;

  return `
    <div class="flex-1 overflow-y-auto p-5 sm:p-6 text-white space-y-5 no-scrollbar">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h2 class="text-lg font-extrabold text-white tracking-tight">Your Music Library</h2>
          <p class="text-xs text-white/60">${state.songs.length} Tracks · ${state.favorites.length} Loved</p>
        </div>
        <button
          id="importLocalAudioBtn"
          type="button"
          class="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-semibold text-cyan-200 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
        >
          ${icon('plus', 'w-4 h-4')}
          <span>Import Audio</span>
        </button>
      </div>

      <!-- Interactive Filter Cards -->
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          data-lib-filter="all"
          class="p-3.5 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
            state.libraryFilter === 'all'
              ? 'bg-cyan-500/15 border-cyan-400/60 text-white'
              : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10'
          }"
        >
          <div class="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300">
            ${icon('folderHeart', 'w-5 h-5')}
          </div>
          <div>
            <h4 class="text-xs font-bold text-white">All Tracks</h4>
            <p class="text-[11px] text-white/55 font-mono-tabular">${state.songs.length} available</p>
          </div>
        </button>

        <button
          type="button"
          data-lib-filter="favorites"
          class="p-3.5 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
            state.libraryFilter === 'favorites'
              ? 'bg-pink-500/15 border-pink-400/60 text-white'
              : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10'
          }"
        >
          <div class="p-2.5 rounded-xl bg-pink-500/20 text-pink-400">
            ${icon('heartFilled', 'w-5 h-5')}
          </div>
          <div>
            <h4 class="text-xs font-bold text-white">Loved Tracks</h4>
            <p class="text-[11px] text-white/55 font-mono-tabular">${state.favorites.length} saved</p>
          </div>
        </button>
      </div>

      <!-- Track List -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-bold text-white/70">
            ${state.libraryFilter === 'favorites' ? 'Saved Favorites' : 'Offline & Local Masters'}
          </h3>
          <span class="text-[11px] font-mono-tabular text-white/45">${displayedSongs.length} items</span>
        </div>

        ${
          displayedSongs.length === 0
            ? `
          <div class="p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
            <p class="text-xs font-semibold text-white/80">No loved tracks yet</p>
            <p class="text-[11px] text-white/50">Tap the heart icon on any track to save it here.</p>
          </div>
        `
            : `
          <div class="space-y-2">
            ${displayedSongs
              .map((song) => {
                const isFav = state.favorites.includes(song.id);
                const isCurrent = song.id === currentSong.id;
                return `
                  <div
                    data-select-song="${song.id}"
                    class="flex items-center justify-between p-2.5 rounded-2xl border transition cursor-pointer group ${
                      isCurrent
                        ? 'bg-white/12 border-cyan-400/50'
                        : 'bg-white/5 hover:bg-white/10 border-white/5'
                    }"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <img
                        src="${song.albumArt}"
                        alt="${song.title}"
                        referrerpolicy="no-referrer"
                        class="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div class="min-w-0">
                        <h4 class="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                          ${song.title}
                        </h4>
                        <p class="text-[11px] text-white/55 truncate">
                          ${song.artist} · <span class="font-mono-tabular">${formatTime(song.duration)}</span>
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        data-fav-song="${song.id}"
                        class="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full transition cursor-pointer ${
                          isFav ? 'text-pink-400' : 'text-white/35 hover:text-white'
                        }"
                        title="Toggle Favorite"
                      >
                        ${icon(isFav ? 'heartFilled' : 'heart', 'w-4 h-4')}
                      </button>
                      <button
                        type="button"
                        data-select-song="${song.id}"
                        class="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full bg-white/10 group-hover:bg-cyan-400 group-hover:text-slate-950 transition cursor-pointer"
                        title="Play Track"
                      >
                        ${icon(isCurrent && state.isPlaying ? 'pause' : 'play', 'w-3.5 h-3.5')}
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;
}

function buildSearchHTML() {
  const q = state.searchQuery.trim().toLowerCase();
  const filtered = state.songs.filter(
    (s) =>
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      s.hiResFormat.toLowerCase().includes(q)
  );

  const quickTags = ['All', 'Lossless', 'Spatial', 'Synthwave', 'Ambient', 'Chillhop', 'Electronic', 'Neo-Jazz'];

  return `
    <div class="flex-1 overflow-y-auto p-5 sm:p-6 text-white space-y-5 no-scrollbar">
      <!-- Search Header -->
      <div>
        <h2 class="text-lg font-extrabold text-white tracking-tight mb-3">Search Catalog</h2>
        <div class="relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50">
            ${icon('search', 'w-4 h-4')}
          </span>
          <input
            id="searchCatalogInput"
            type="text"
            value="${state.searchQuery.replace(/"/g, '&quot;')}"
            placeholder="Search songs, artists, genres or Hi-Res..."
            class="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/10 border border-white/20 text-xs text-white placeholder-white/45 focus:outline-none focus:border-cyan-400 transition"
          />
          ${
            state.searchQuery
              ? `
            <button
              id="clearSearchBtn"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1 cursor-pointer"
            >
              ${icon('x', 'w-4 h-4')}
            </button>
          `
              : ''
          }
        </div>
      </div>

      <!-- Interactive Filter Controls -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        ${quickTags
          .map((tag) => {
            const isTagActive =
              (tag === 'All' && !state.searchQuery) ||
              (tag !== 'All' && state.searchQuery.toLowerCase() === tag.toLowerCase());
            return `
              <button
                type="button"
                data-search-tag="${tag === 'All' ? '' : tag}"
                class="px-3 py-1.5 rounded-xl border text-[11px] font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
                  isTagActive
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                    : 'bg-white/5 border-white/10 text-white/75 hover:border-white/30'
                }"
              >
                ${tag}
              </button>
            `;
          })
          .join('')}
      </div>

      <!-- Search Results -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-white/50">
          <span id="searchCountLabel">${filtered.length} Results Found</span>
        </div>

        <div id="searchResultsContainer" class="space-y-2">
          ${filtered
            .map(
              (song) => `
            <div
              data-select-song="${song.id}"
              class="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/12 border border-white/5 transition cursor-pointer group"
            >
              <div class="flex items-center gap-3 min-w-0">
                <img
                  src="${song.albumArt}"
                  alt="${song.title}"
                  referrerpolicy="no-referrer"
                  class="w-11 h-11 rounded-xl object-cover shrink-0"
                />
                <div class="min-w-0">
                  <h4 class="text-xs font-bold text-white group-hover:text-cyan-300 truncate">${song.title}</h4>
                  <p class="text-[11px] text-white/55 truncate">${song.artist} · ${song.genre}</p>
                </div>
              </div>
              <button
                type="button"
                class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full bg-white/10 group-hover:bg-cyan-400 group-hover:text-slate-950 transition shrink-0"
              >
                ${icon('play', 'w-3.5 h-3.5')}
              </button>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function buildEqualizerHTML() {
  const bandsLabels = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

  return `
    <div class="flex-1 overflow-y-auto p-5 sm:p-6 text-white flex flex-col justify-between space-y-5 no-scrollbar">
      <!-- Top Header -->
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300">
            ${icon('sliders', 'w-5 h-5')}
          </div>
          <div>
            <h2 class="text-base font-bold text-white">Moto Audio & 5-Band EQ</h2>
            <p class="text-xs text-white/60">Dolby Atmos · 3D Spatial Sound Engine</p>
          </div>
        </div>

        <button
          id="openNativeCodeBtn"
          type="button"
          class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-mono-tabular text-cyan-200 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
        >
          ${icon('code', 'w-3.5 h-3.5 text-cyan-300')}
          <span>Native C++/C#/Java</span>
        </button>
      </div>

      <!-- Real-time Spectrum Visualizer Canvas -->
      <div class="p-4 rounded-3xl bg-black/65 border border-white/12 shadow-xl relative overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-mono-tabular text-cyan-300 font-medium">Real-Time Spectrum Analyzer</span>
          <span class="text-[11px] text-white/50 font-mono-tabular">24-bit / 192kHz PCM</span>
        </div>
        <canvas
          id="eqSpectrumCanvas"
          width="360"
          height="68"
          class="w-full h-[68px] rounded-xl"
        ></canvas>
      </div>

      <!-- Audio Presets Grid -->
      <div>
        <span class="text-xs font-bold text-white/70 block mb-2.5">Acoustic Presets</span>
        <div class="grid grid-cols-2 gap-2">
          ${EQUALIZER_PRESETS.map((preset) => {
            const isSelected = state.currentPreset.id === preset.id;
            return `
              <button
                type="button"
                data-eq-preset="${preset.id}"
                class="p-3 rounded-2xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-950/85 to-slate-900 border-cyan-400 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold truncate">${preset.name}</span>
                  ${
                    isSelected
                      ? `<span class="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0">${icon('check', 'w-2.5 h-2.5')}</span>`
                      : ''
                  }
                </div>
                <div class="text-[10px] text-white/50">
                  ${preset.spatialAudio ? 'Spatial 3D' : 'Stereo'}${preset.vocalEnhance ? ' · Vocal Clarity' : ''}
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Interactive 5-Band Frequency Response Sliders -->
      <div class="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white/75">5-Band Frequency Response (dB)</span>
          <span class="text-[11px] font-mono-tabular text-white/45">Interactive Biquad DSP</span>
        </div>
        <div class="flex items-end justify-between h-40 px-2 pt-2">
          ${bandsLabels
            .map((freqLabel, idx) => {
              const gainVal = state.currentPreset.bands[idx] || 0;
              return `
                <div class="flex flex-col items-center gap-1.5 h-full justify-between">
                  <span id="eqBandLabel-${idx}" class="text-[11px] font-mono-tabular text-cyan-300">
                    ${gainVal > 0 ? `+${gainVal}` : gainVal}dB
                  </span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value="${gainVal}"
                    data-eq-band-index="${idx}"
                    class="eq-vertical-slider"
                    aria-label="${freqLabel} Gain"
                  />
                  <span class="text-[10px] font-mono-tabular text-white/60">${freqLabel}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>

      <!-- Moto Bass Boost & 3D Spatial Controls -->
      <div class="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-3">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2">
              ${icon('volume2', 'w-4 h-4 text-cyan-300')}
              <span class="text-xs font-semibold text-white">Moto Sub-Bass Enhancer (85Hz)</span>
            </div>
            <span id="bassBoostValueText" class="text-xs font-mono-tabular text-cyan-300 font-bold">
              ${state.currentPreset.motoBassBoost}%
            </span>
          </div>
          <input
            id="bassBoostRangeInput"
            type="range"
            min="0"
            max="100"
            step="5"
            value="${state.currentPreset.motoBassBoost}"
            class="w-full native-slider"
            aria-label="Moto Bass Enhancer"
          />
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-white/10">
          <div class="flex items-center gap-2">
            ${icon('radio', 'w-4 h-4 text-pink-400')}
            <span class="text-xs font-semibold text-white">3D Head-Tracking Spatial Matrix</span>
          </div>
          <button
            id="toggleSpatialAudioBtn"
            type="button"
            class="px-3 py-1 rounded-lg text-[11px] font-mono-tabular font-semibold transition cursor-pointer ${
              state.currentPreset.spatialAudio
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                : 'bg-white/10 text-white/50 border border-white/10'
            }"
          >
            ${state.currentPreset.spatialAudio ? 'Enabled' : 'Bypassed'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function buildOverlaysHTML() {
  const song = getCurrentSong();

  return `
    <!-- Live Synced Lyrics Overlay -->
    ${
      state.showLyrics
        ? `
      <div class="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-2xl flex flex-col p-6 text-white overflow-hidden">
        <div class="flex items-center justify-between pb-4 border-b border-white/10">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-pink-500/20 text-pink-300">
              ${icon('mic2', 'w-5 h-5')}
            </div>
            <div>
              <h2 class="text-sm font-bold text-white">Live Synced Lyrics</h2>
              <p class="text-xs text-white/60">${song.title} — ${song.artist}</p>
            </div>
          </div>
          <button
            id="closeLyricsModalBtn"
            type="button"
            class="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            ${icon('x', 'w-5 h-5')}
          </button>
        </div>

        <div id="lyricsScrollContainer" class="flex-1 overflow-y-auto py-10 space-y-6 no-scrollbar pr-2 my-auto">
          ${(song.lyrics || [])
            .map((line, idx) => {
              let activeIndex = -1;
              for (let i = 0; i < song.lyrics.length; i++) {
                if (state.currentTime >= song.lyrics[i].time) activeIndex = i;
              }
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;
              return `
                <div
                  id="lyric-item-${idx}"
                  data-seek-lyric="${line.time}"
                  class="cursor-pointer transition-all duration-300 p-3 rounded-2xl ${
                    isActive
                      ? 'bg-white/10 border border-white/20 shadow-lg scale-[1.02]'
                      : isPast
                      ? 'opacity-45 hover:bg-white/5'
                      : 'opacity-30 hover:bg-white/5'
                  }"
                >
                  <p
                    class="lyric-line-text text-xl sm:text-2xl font-extrabold tracking-tight leading-snug"
                    style="color: ${isActive ? song.accentColor : 'rgba(255,255,255,0.75)'}; text-shadow: ${
                      isActive ? `0 0 18px ${song.glowColor}` : 'none'
                    };"
                  >
                    ${line.text}
                  </p>
                  <div class="lyric-jump-hint ${isActive ? '' : 'hidden'} flex items-center gap-1.5 mt-2 text-xs font-mono-tabular text-white/60">
                    <span>Synced at ${formatTime(line.time)} · Tap any line to seek</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        <div class="pt-3 text-xs text-white/45 border-t border-white/10 flex items-center justify-between">
          <span>Aura LyricSync Engine</span>
          <span class="font-mono-tabular text-white/65">${song.hiResFormat}</span>
        </div>
      </div>
    `
        : ''
    }

    <!-- Up Next & Queue Overlay -->
    ${
      state.showQueue
        ? `
      <div class="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-2xl flex flex-col p-5 sm:p-6 text-white overflow-hidden">
        <div class="flex items-center justify-between pb-4 border-b border-white/10">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              ${icon('listMusic', 'w-5 h-5')}
            </div>
            <div>
              <h2 class="text-sm font-bold text-white">Up Next & Queue</h2>
              <p class="text-xs text-white/60">${state.songs.length} tracks in rotation</p>
            </div>
          </div>
          <button
            id="closeQueueModalBtn"
            type="button"
            class="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            ${icon('x', 'w-5 h-5')}
          </button>
        </div>

        <div class="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
          <!-- Now Playing Highlight -->
          <div>
            <span class="text-xs font-semibold text-cyan-400 mb-2 block">Now Playing</span>
            <div class="flex items-center justify-between p-3 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/45 to-slate-900/70 shadow-lg">
              <div class="flex items-center gap-3 min-w-0">
                <img
                  src="${song.albumArt}"
                  alt="${song.title}"
                  referrerpolicy="no-referrer"
                  class="w-12 h-12 rounded-xl object-cover shadow-md shrink-0"
                />
                <div class="min-w-0">
                  <h4 class="text-sm font-bold text-white truncate">${song.title}</h4>
                  <p class="text-xs text-white/60 truncate">${song.artist}</p>
                </div>
              </div>
              <div class="flex items-end gap-1 h-5 px-2 shrink-0">
                <span class="w-1 h-4 bg-cyan-400 rounded-full ${state.isPlaying ? 'eq-bar-anim-1' : 'scale-y-25'}"></span>
                <span class="w-1 h-5 bg-cyan-400 rounded-full ${state.isPlaying ? 'eq-bar-anim-2' : 'scale-y-25'}"></span>
                <span class="w-1 h-3.5 bg-cyan-400 rounded-full ${state.isPlaying ? 'eq-bar-anim-3' : 'scale-y-25'}"></span>
                <span class="w-1 h-4 bg-cyan-400 rounded-full ${state.isPlaying ? 'eq-bar-anim-4' : 'scale-y-25'}"></span>
              </div>
            </div>
          </div>

          <!-- Next Up List -->
          <div>
            <span class="text-xs font-semibold text-white/60 mb-2 block">Next Up</span>
            <div class="space-y-2">
              ${state.songs
                .filter((s) => s.id !== song.id)
                .map(
                  (qSong) => `
                <div
                  data-queue-song="${qSong.id}"
                  class="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/12 border border-white/5 hover:border-white/20 transition cursor-pointer group"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="text-white/25 group-hover:text-white/55">${icon('gripVertical', 'w-4 h-4')}</span>
                    <img
                      src="${qSong.albumArt}"
                      alt="${qSong.title}"
                      referrerpolicy="no-referrer"
                      class="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                    <div class="min-w-0">
                      <h4 class="text-xs font-semibold text-white/90 group-hover:text-white truncate">${qSong.title}</h4>
                      <p class="text-[11px] text-white/50 truncate">${qSong.artist}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    <span class="text-[11px] font-mono-tabular text-white/45">${formatTime(qSong.duration)}</span>
                    <span class="p-1.5 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition">
                      ${icon('play', 'w-3.5 h-3.5 text-white')}
                    </span>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `
        : ''
    }

    <!-- Audio Output & AirPlay Device Selector Modal -->
    ${
      state.showOutputSelector
        ? `
      <div class="absolute inset-0 z-50 bg-black/80 backdrop-blur-2xl flex flex-col justify-end p-4 sm:p-6 text-white">
        <div class="w-full max-w-md mx-auto bg-slate-900/95 border border-white/20 rounded-3xl p-5 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 class="text-sm font-bold text-white">Audio Output & AirPlay</h3>
              <p class="text-xs text-white/60">Choose active high-resolution playback target</p>
            </div>
            <button
              id="closeOutputModalBtn"
              type="button"
              class="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              ${icon('x', 'w-4 h-4')}
            </button>
          </div>

          <div class="space-y-2">
            ${OUTPUT_DEVICES.map((device) => {
              const isSelected = device.id === state.currentOutputDevice.id;
              return `
                <button
                  type="button"
                  data-output-device="${device.id}"
                  class="w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                  }"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="p-2.5 rounded-xl shrink-0 ${
                      isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-white/75'
                    }">
                      ${icon(device.iconName, 'w-5 h-5')}
                    </div>
                    <div class="min-w-0">
                      <h4 class="text-xs font-bold text-white flex items-center gap-2">
                        <span class="truncate">${device.name}</span>
                        ${
                          device.batteryLevel !== undefined
                            ? `<span class="text-[10px] text-emerald-300 flex items-center gap-0.5 font-mono-tabular shrink-0">${icon('batteryCharging', 'w-3 h-3')}${device.batteryLevel}%</span>`
                            : ''
                        }
                      </h4>
                      <p class="text-[11px] text-white/55 truncate">${device.formatSupport}</p>
                    </div>
                  </div>
                  ${
                    isSelected
                      ? `<span class="p-1 rounded-full bg-cyan-400 text-slate-950 shrink-0">${icon('check', 'w-3.5 h-3.5')}</span>`
                      : ''
                  }
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `
        : ''
    }

    <!-- Native C++ / C# / Java Source Inspector Modal -->
    ${
      state.showNativeCodeModal
        ? `
      <div class="absolute inset-0 z-50 bg-black/85 backdrop-blur-2xl flex flex-col justify-center p-4 sm:p-6 text-white">
        <div class="w-full max-w-2xl mx-auto bg-slate-900/95 border border-white/20 rounded-3xl p-5 flex flex-col max-h-[85dvh] shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2">
              ${icon('code', 'w-5 h-5 text-cyan-400')}
              <div>
                <h3 class="text-sm font-bold text-white">Native DSP & Optics Engine Source</h3>
                <p class="text-[11px] text-white/60">Pure HTML5 · CSS3 · Vanilla JS · WebAssembly · C++20 · C# · Java 21</p>
              </div>
            </div>
            <button
              id="closeNativeCodeModalBtn"
              type="button"
              class="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              ${icon('x', 'w-4 h-4')}
            </button>
          </div>

          <div class="flex items-center gap-2 py-3">
            ${[
              { id: 'cpp', label: 'C++20 Biquad DSP (NocturneDsp.cpp)' },
              { id: 'csharp', label: 'C# .NET Optics (NocturneEngine.cs)' },
              { id: 'java', label: 'Java 21 Synth (NocturneAudioEngine.java)' }
            ]
              .map(
                (tab) => `
              <button
                type="button"
                data-native-lang="${tab.id}"
                class="px-3 py-1.5 rounded-xl text-xs font-mono-tabular font-medium transition cursor-pointer ${
                  state.activeNativeLang === tab.id
                    ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200'
                    : 'bg-white/5 border border-white/10 text-white/65 hover:text-white'
                }"
              >
                ${tab.label}
              </button>
            `
              )
              .join('')}
          </div>

          <pre class="flex-1 overflow-auto p-4 rounded-2xl bg-slate-950 border border-white/10 text-[11px] leading-relaxed font-mono-tabular text-cyan-100 select-text">${NATIVE_CODE_SNIPPETS[state.activeNativeLang]}</pre>
        </div>
      </div>
    `
        : ''
    }
  `;
}

function buildBottomNavHTML() {
  const song = getCurrentSong();
  const tabs = [
    { id: 'now_playing', label: 'Playing', iconName: 'disc' },
    { id: 'discover', label: 'Discover', iconName: 'compass' },
    { id: 'library', label: 'Library', iconName: 'library' },
    { id: 'search', label: 'Search', iconName: 'search' },
    { id: 'equalizer', label: 'Audio EQ', iconName: 'sliders' }
  ];

  return `
    <nav class="w-full h-[72px] bg-black/65 backdrop-blur-2xl border-t border-white/10 px-2 flex items-center justify-around z-30 relative select-none shrink-0">
      ${tabs
        .map((tab) => {
          const isActive = state.activeTab === tab.id;
          return `
            <button
              type="button"
              data-nav-tab="${tab.id}"
              class="flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer group focus:outline-none"
            >
              <div
                class="relative flex items-center justify-center w-14 h-8 rounded-full my-0.5 transition-all duration-200"
                style="${
                  isActive
                    ? `background-color: ${song.accentColor}38; border: 1px solid ${song.accentColor}88;`
                    : ''
                }"
              >
                ${icon(
                  tab.iconName,
                  `w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-white' : 'text-white/55 group-hover:text-white/85'
                  }`
                )}
              </div>
              <span class="text-[11px] tracking-tight transition-colors ${
                isActive ? 'text-white font-semibold' : 'text-white/50 group-hover:text-white/80 font-medium'
              }">
                ${tab.label}
              </span>
            </button>
          `;
        })
        .join('')}
    </nav>
  `;
}

// ============================================================================
// Master Render & Event Binding
// ============================================================================

function renderApp() {
  const root = document.getElementById('nocturneApp');
  if (!root) return;

  const song = getCurrentSong();
  updateCSSVariables();
  updateSVGFilter();

  let activeTabContent = '';
  if (state.activeTab === 'now_playing') {
    activeTabContent = buildNowPlayingHTML();
  } else if (state.activeTab === 'discover') {
    activeTabContent = buildDiscoverHTML();
  } else if (state.activeTab === 'library') {
    activeTabContent = buildLibraryHTML();
  } else if (state.activeTab === 'search') {
    activeTabContent = buildSearchHTML();
  } else if (state.activeTab === 'equalizer') {
    activeTabContent = buildEqualizerHTML();
  }

  // Secondary panel on large desktop screens (>= 1024px) when activeTab is 'now_playing'
  const desktopRightPanelContent =
    state.activeTab === 'now_playing' ? buildDiscoverHTML() : activeTabContent;

  root.innerHTML = `
    <!-- Dynamic Ambient Background Glow Canvas -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        class="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full blur-[90px] ${
          state.isPlaying ? 'ambient-playing-primary' : 'opacity-55'
        }"
        style="background: radial-gradient(circle at 30% 20%, ${song.glowColor} 0%, transparent 70%);"
      ></div>
      <div
        class="absolute -bottom-24 -right-24 w-[480px] h-[480px] rounded-full blur-[95px] ${
          state.isPlaying ? 'ambient-playing-secondary' : 'opacity-40'
        }"
        style="background: radial-gradient(circle at 70% 80%, ${song.secondaryColor}66 0%, transparent 65%);"
      ></div>
      <div class="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"></div>
    </div>

    <!-- Floating Toast Banner -->
    <div
      id="toastBanner"
      class="fixed top-5 left-1/2 -translate-x-1/2 -translate-y-3 opacity-0 pointer-events-none z-50 px-4 py-2 rounded-full bg-cyan-400 text-slate-950 text-xs font-bold shadow-2xl transition-all duration-200 flex items-center gap-2"
    >
      ${icon('check', 'w-4 h-4')}
      <span id="toastMessage">Action completed</span>
    </div>

    <!-- Responsive Main Workspace Container -->
    <div class="relative z-10 flex-1 min-h-0 w-full max-w-[1380px] mx-auto flex flex-col lg:flex-row lg:items-stretch lg:gap-6 lg:p-5 overflow-hidden">
      <!-- Mobile / Single-Column Active View (< 1024px) -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden lg:hidden relative">
        ${
          state.activeTab !== 'now_playing'
            ? `
          <!-- Floating Mini Player Bar on Secondary Mobile Tabs -->
          <div
            id="mobileMiniPlayerBar"
            class="relative z-20 mx-4 mt-3 p-2.5 rounded-2xl bg-slate-900/85 border border-white/20 backdrop-blur-xl flex items-center justify-between cursor-pointer shadow-xl hover:border-white/40 transition shrink-0"
          >
            <div class="flex items-center gap-3 min-w-0">
              <img
                src="${song.albumArt}"
                alt="${song.title}"
                referrerpolicy="no-referrer"
                class="w-10 h-10 rounded-xl object-cover shadow-md shrink-0"
              />
              <div class="min-w-0">
                <h4 class="text-xs font-bold text-white truncate">${song.title}</h4>
                <p class="text-[11px] text-white/60 truncate">${song.artist}</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                id="miniPlayerPlayBtn"
                type="button"
                class="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 transition cursor-pointer"
              >
                ${icon(state.isPlaying ? 'pause' : 'play', 'w-4 h-4')}
              </button>
              <button
                id="miniPlayerNextBtn"
                type="button"
                class="w-9 h-9 flex items-center justify-center text-white/75 hover:text-white cursor-pointer"
              >
                ${icon('skipForward', 'w-4 h-4')}
              </button>
            </div>
          </div>
        `
            : ''
        }

        <div class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          ${activeTabContent}
        </div>
      </div>

      <!-- Desktop Dual-Column Studio Deck (>= 1024px) -->
      <div class="hidden lg:flex lg:w-[460px] xl:w-[500px] shrink-0 flex-col rounded-3xl bg-slate-950/65 border border-white/12 backdrop-blur-2xl shadow-2xl overflow-hidden relative">
        ${buildNowPlayingHTML()}
      </div>

      <div class="hidden lg:flex flex-1 flex-col rounded-3xl bg-slate-950/55 border border-white/12 backdrop-blur-2xl shadow-2xl overflow-hidden relative">
        ${desktopRightPanelContent}
      </div>

      <!-- Modal Overlays -->
      ${buildOverlaysHTML()}
    </div>

    <!-- Material 3 Bottom Navigation Bar -->
    ${buildBottomNavHTML()}
  `;

  bindEvents();

  if (state.activeTab === 'equalizer') {
    startSpectrumLoop();
  }
}

// ============================================================================
// Native DOM Event Delegation & Listeners
// ============================================================================

function bindEvents() {
  // Bind all Liquid Lens Cards (mobile & desktop)
  const lensCards = document.querySelectorAll('#liquidLensCard');
  lensCards.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      if (!state.lensSettings.tilt3D) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      state.tilt.rotateY = ((x - centerX) / centerX) * 16;
      state.tilt.rotateX = -((y - centerY) / centerY) * 16;
      state.tilt.glossX = Math.max(0, Math.min(100, (x / rect.width) * 100));
      state.tilt.glossY = Math.max(0, Math.min(100, (y / rect.height) * 100));
      updateLensTransformUI();
    });

    card.addEventListener('pointerleave', () => {
      state.tilt = { rotateX: 0, rotateY: 0, glossX: 45, glossY: 35 };
      updateLensTransformUI();
    });

    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#lensOpticsBadgeBtn')) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.min(rect.width, rect.height) * 0.78;

      const rippleContainer = card.querySelector('#lensRippleContainer');
      if (rippleContainer) {
        const ripple = document.createElement('div');
        ripple.className = 'liquid-ripple';
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${x - size / 2}px`;
        ripple.style.top = `${y - size / 2}px`;
        rippleContainer.appendChild(ripple);
        setTimeout(() => ripple.remove(), 1150);
      }
    });
  });

  // Bind Optics Customizer Triggers
  document.querySelectorAll('#lensOpticsBadgeBtn, #openOpticsBottomBtn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.showOpticsTuning = !state.showOpticsTuning;
      renderApp();
    });
  });

  document.querySelectorAll('#closeOpticsOverlayBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.showOpticsTuning = false;
      renderApp();
    });
  });

  document.querySelectorAll('#opticsRefractionInput').forEach((input) => {
    input.addEventListener('input', (e) => {
      state.lensSettings.refractionPower = Number(e.target.value);
      document.querySelectorAll('#opticsRefractionLabel').forEach((lbl) => {
        lbl.textContent = `${state.lensSettings.refractionPower}%`;
      });
      updateSVGFilter();
    });
  });

  document.querySelectorAll('#opticsZoomInput').forEach((input) => {
    input.addEventListener('input', (e) => {
      state.lensSettings.magnification = Number(e.target.value);
      document.querySelectorAll('#opticsZoomLabel').forEach((lbl) => {
        lbl.textContent = `${state.lensSettings.magnification.toFixed(2)}x`;
      });
      updateLensTransformUI();
    });
  });

  document.querySelectorAll('[data-lens-shape]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lensSettings.lensShape = btn.getAttribute('data-lens-shape');
      renderApp();
    });
  });

  document.querySelectorAll('#toggleWaterDropletsBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lensSettings.waterDroplets = !state.lensSettings.waterDroplets;
      renderApp();
    });
  });

  document.querySelectorAll('#toggleTilt3DBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lensSettings.tilt3D = !state.lensSettings.tilt3D;
      state.tilt = { rotateX: 0, rotateY: 0, glossX: 45, glossY: 35 };
      renderApp();
    });
  });

  document.querySelectorAll('#resetOpticsBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lensSettings = {
        refractionPower: 55,
        magnification: 1.18,
        lensShape: 'squircle',
        glossOpacity: 0.55,
        tilt3D: true,
        waterDroplets: true
      };
      showToast('Optics restored to factory defaults');
      renderApp();
    });
  });

  // Playback Controls (support both mobile & desktop instances)
  document.querySelectorAll('#playPauseMainBtn').forEach((btn) => {
    btn.addEventListener('click', handleTogglePlay);
  });
  document.querySelectorAll('#nextTrackBtn').forEach((btn) => {
    btn.addEventListener('click', () => handleNextSong(false));
  });
  document.querySelectorAll('#prevTrackBtn').forEach((btn) => {
    btn.addEventListener('click', handlePrevSong);
  });
  document.querySelectorAll('#toggleShuffleBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.isShuffle = !state.isShuffle;
      showToast(state.isShuffle ? 'Shuffle playback enabled' : 'Shuffle playback off');
      renderApp();
    });
  });
  document.querySelectorAll('#toggleRepeatBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.repeatMode =
        state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off';
      showToast(`Repeat mode: ${state.repeatMode.toUpperCase()}`);
      renderApp();
    });
  });

  document.querySelectorAll('#nowPlayingFavBtn').forEach((btn) => {
    btn.addEventListener('click', () => handleToggleFavorite(getCurrentSong().id));
  });

  document.querySelectorAll('#scrubRangeInput').forEach((input) => {
    input.addEventListener('input', (e) => handleSeek(e.target.value));
  });

  document.querySelectorAll('#volumeRangeInput').forEach((input) => {
    input.addEventListener('input', (e) => handleVolumeChange(e.target.value));
  });

  document.querySelectorAll('#muteToggleBtn').forEach((btn) => {
    btn.addEventListener('click', handleToggleMute);
  });

  document.querySelectorAll('#shareTrackBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const song = getCurrentSong();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(`${song.title} — ${song.artist} (${ window.location.href })`).catch(() => {});
      }
      showToast(`Link copied for "${song.title}"`);
    });
  });

  // Modals / Overlays Open & Close
  document.querySelectorAll('#openLyricsBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.showLyrics = true;
      renderApp();
    });
  });
  const closeLyricsBtn = document.getElementById('closeLyricsModalBtn');
  if (closeLyricsBtn) {
    closeLyricsBtn.addEventListener('click', () => {
      state.showLyrics = false;
      renderApp();
    });
  }

  document.querySelectorAll('#openQueueTopBtn, #openQueueBottomBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.showQueue = true;
      renderApp();
    });
  });
  const closeQueueBtn = document.getElementById('closeQueueModalBtn');
  if (closeQueueBtn) {
    closeQueueBtn.addEventListener('click', () => {
      state.showQueue = false;
      renderApp();
    });
  }

  document.querySelectorAll('#openOutputTopBtn, #openOutputBottomBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.showOutputSelector = true;
      renderApp();
    });
  });
  const closeOutputBtn = document.getElementById('closeOutputModalBtn');
  if (closeOutputBtn) {
    closeOutputBtn.addEventListener('click', () => {
      state.showOutputSelector = false;
      renderApp();
    });
  }

  // Native Code Inspector Modal
  const openNativeCodeBtn = document.getElementById('openNativeCodeBtn');
  if (openNativeCodeBtn) {
    openNativeCodeBtn.addEventListener('click', () => {
      state.showNativeCodeModal = true;
      renderApp();
    });
  }
  const closeNativeCodeBtn = document.getElementById('closeNativeCodeModalBtn');
  if (closeNativeCodeBtn) {
    closeNativeCodeBtn.addEventListener('click', () => {
      state.showNativeCodeModal = false;
      renderApp();
    });
  }
  document.querySelectorAll('[data-native-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeNativeLang = btn.getAttribute('data-native-lang');
      renderApp();
    });
  });

  // Output Device Selection
  document.querySelectorAll('[data-output-device]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const devId = btn.getAttribute('data-output-device');
      const found = OUTPUT_DEVICES.find((d) => d.id === devId);
      if (found) {
        state.currentOutputDevice = found;
        state.showOutputSelector = false;
        showToast(`Output switched to ${found.name}`);
        renderApp();
      }
    });
  });

  // Lyric Seek
  document.querySelectorAll('[data-seek-lyric]').forEach((el) => {
    el.addEventListener('click', () => {
      const sec = Number(el.getAttribute('data-seek-lyric'));
      handleSeek(sec);
      showToast(`Jumped to ${formatTime(sec)}`);
    });
  });

  // Queue Track Selection
  document.querySelectorAll('[data-queue-song]').forEach((el) => {
    el.addEventListener('click', () => {
      const songId = el.getAttribute('data-queue-song');
      state.showQueue = false;
      handleSelectSongById(songId, false);
    });
  });

  // Song Selection Cards & Rows
  document.querySelectorAll('[data-select-song]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-fav-song]')) return;
      const songId = el.getAttribute('data-select-song');
      handleSelectSongById(songId, true);
    });
  });

  // Live Aura Stations
  document.querySelectorAll('[data-station-song]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const songId = btn.getAttribute('data-station-song');
      const stName = btn.getAttribute('data-station-name');
      showToast(`Tuned to ${stName}`);
      handleSelectSongById(songId, true);
    });
  });

  // Library Filter & Per-Track Favorite
  document.querySelectorAll('[data-lib-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.libraryFilter = btn.getAttribute('data-lib-filter');
      renderApp();
    });
  });

  document.querySelectorAll('[data-fav-song]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const songId = btn.getAttribute('data-fav-song');
      handleToggleFavorite(songId);
    });
  });

  // Import Local Audio File Button
  const importAudioBtn = document.getElementById('importLocalAudioBtn');
  const fileInput = document.getElementById('localAudioInput');
  if (importAudioBtn && fileInput) {
    importAudioBtn.addEventListener('click', () => fileInput.click());
  }

  // Search Input & Quick Filter Tags
  const searchInput = document.getElementById('searchCatalogInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      updateSearchResultsOnly();
    });
  }

  const clearSearchBtn = document.getElementById('clearSearchBtn');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      state.searchQuery = '';
      renderApp();
    });
  }

  document.querySelectorAll('[data-search-tag]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.searchQuery = btn.getAttribute('data-search-tag') || '';
      renderApp();
    });
  });

  // Equalizer Presets & Sliders
  document.querySelectorAll('[data-eq-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetId = btn.getAttribute('data-eq-preset');
      const found = EQUALIZER_PRESETS.find((p) => p.id === presetId);
      if (found) {
        state.currentPreset = {
          ...found,
          bands: [...found.bands]
        };
        audioEngine.setEqualizerBands(state.currentPreset.bands);
        audioEngine.setBassBoost(state.currentPreset.motoBassBoost);
        audioEngine.setSpatialAudio(state.currentPreset.spatialAudio);
        showToast(`EQ Preset: ${found.name}`);
        renderApp();
      }
    });
  });

  document.querySelectorAll('[data-eq-band-index]').forEach((slider) => {
    slider.addEventListener('input', (e) => {
      const idx = Number(slider.getAttribute('data-eq-band-index'));
      const gainDb = Number(e.target.value);
      state.currentPreset.bands[idx] = gainDb;
      audioEngine.setEqualizerBands(state.currentPreset.bands);

      const lbl = document.getElementById(`eqBandLabel-${idx}`);
      if (lbl) {
        lbl.textContent = `${gainDb > 0 ? `+${gainDb}` : gainDb}dB`;
      }
    });
  });

  const bassBoostInput = document.getElementById('bassBoostRangeInput');
  if (bassBoostInput) {
    bassBoostInput.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      state.currentPreset.motoBassBoost = val;
      audioEngine.setBassBoost(val);
      const lbl = document.getElementById('bassBoostValueText');
      if (lbl) lbl.textContent = `${val}%`;
    });
  }

  const toggleSpatialBtn = document.getElementById('toggleSpatialAudioBtn');
  if (toggleSpatialBtn) {
    toggleSpatialBtn.addEventListener('click', () => {
      state.currentPreset.spatialAudio = !state.currentPreset.spatialAudio;
      audioEngine.setSpatialAudio(state.currentPreset.spatialAudio);
      showToast(
        state.currentPreset.spatialAudio
          ? '3D Spatial Head-Tracking Enabled'
          : '3D Spatial Head-Tracking Bypassed'
      );
      renderApp();
    });
  }

  // Mini Player Bar on Mobile Secondary Views
  const miniBar = document.getElementById('mobileMiniPlayerBar');
  if (miniBar) {
    miniBar.addEventListener('click', (e) => {
      if (e.target.closest('#miniPlayerPlayBtn') || e.target.closest('#miniPlayerNextBtn')) return;
      state.activeTab = 'now_playing';
      renderApp();
    });
  }
  const miniPlayBtn = document.getElementById('miniPlayerPlayBtn');
  if (miniPlayBtn) {
    miniPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleTogglePlay();
    });
  }
  const miniNextBtn = document.getElementById('miniPlayerNextBtn');
  if (miniNextBtn) {
    miniNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleNextSong(false);
    });
  }

  // Bottom Navigation Bar Tabs
  document.querySelectorAll('[data-nav-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-nav-tab');
      state.activeTab = tab;
      state.showLyrics = false;
      state.showQueue = false;
      state.showOutputSelector = false;
      renderApp();
    });
  });
}

function updateSearchResultsOnly() {
  const q = state.searchQuery.trim().toLowerCase();
  const filtered = state.songs.filter(
    (s) =>
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      s.hiResFormat.toLowerCase().includes(q)
  );
  const countLabel = document.getElementById('searchCountLabel');
  const resultsContainer = document.getElementById('searchResultsContainer');
  if (countLabel) countLabel.textContent = `${filtered.length} Results Found`;
  if (resultsContainer) {
    resultsContainer.innerHTML = filtered
      .map(
        (song) => `
      <div
        data-select-song="${song.id}"
        class="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/12 border border-white/5 transition cursor-pointer group"
      >
        <div class="flex items-center gap-3 min-w-0">
          <img
            src="${song.albumArt}"
            alt="${song.title}"
            referrerpolicy="no-referrer"
            class="w-11 h-11 rounded-xl object-cover shrink-0"
          />
          <div class="min-w-0">
            <h4 class="text-xs font-bold text-white group-hover:text-cyan-300 truncate">${song.title}</h4>
            <p class="text-[11px] text-white/55 truncate">${song.artist} · ${song.genre}</p>
          </div>
        </div>
        <button
          type="button"
          class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full bg-white/10 group-hover:bg-cyan-400 group-hover:text-slate-950 transition shrink-0"
        >
          ${icon('play', 'w-3.5 h-3.5')}
        </button>
      </div>
    `
      )
      .join('');

    resultsContainer.querySelectorAll('[data-select-song]').forEach((el) => {
      el.addEventListener('click', () => {
        handleSelectSongById(el.getAttribute('data-select-song'), true);
      });
    });
  }
}

// Setup Local Audio File Import Listener
function setupLocalAudioImport() {
  const fileInput = document.getElementById('localAudioInput');
  if (!fileInput) return;

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file, i) => {
      const objectUrl = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const newSong = {
        id: `local-${Date.now()}-${i}`,
        title: cleanName,
        artist: 'Local Hi-Res File',
        album: 'Imported User Audio',
        duration: 210,
        albumArt: '/assets/images/liquid_glass_album_art_1785235983474.jpg',
        accentColor: '#06b6d4',
        glowColor: 'rgba(6, 182, 212, 0.45)',
        secondaryColor: '#3b82f6',
        hiResFormat: 'Local PCM / Bit-Perfect Stream',
        isSpatialAudio: true,
        year: 2026,
        genre: 'Local Audio',
        synthBaseFreq: 220,
        synthMood: 'ambient',
        audioUrl: objectUrl,
        lyrics: [
          { id: 'l1', time: 0, text: `♪ Playing local file: ${cleanName}` },
          { id: 'l2', time: 15, text: 'Routed through 5-Band Biquad EQ & Liquid Glass Lens' }
        ]
      };
      state.songs.unshift(newSong);
    });

    state.currentSongIndex = 0;
    state.currentTime = 0;
    state.isPlaying = true;
    audioEngine.playSong(state.songs[0]);
    showToast(`Imported ${files.length} audio track${files.length > 1 ? 's' : ''}`);
    renderApp();
  });
}

// Initialize Application on DOM Ready
function initNocturneApp() {
  setupLocalAudioImport();
  startPlaybackTimer();
  renderApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNocturneApp);
} else {
  initNocturneApp();
}

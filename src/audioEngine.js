// Pure Native Web Audio API Synthesizer, Local File Player & 5-Band Parametric Equalizer

const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];

class NativeAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.bassBoostFilter = null;
    this.eqFilters = [];
    this.isPlaying = false;
    this.intervalId = null;
    this.currentSong = null;
    this.noteStep = 0;
    this.volume = 0.85;
    this.eqBands = [3, 4, 2, 5, 6];
    this.bassBoostPercent = 80;
    this.spatialEnabled = true;

    // Optional HTMLAudioElement for user-imported local audio files
    this.audioElement = null;
    this.mediaElementSource = null;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64; // 32 frequency bins
      this.analyser.smoothingTimeConstant = 0.78;

      // Moto Bass Enhancer Low-Shelf Filter at 85Hz
      this.bassBoostFilter = this.ctx.createBiquadFilter();
      this.bassBoostFilter.type = 'lowshelf';
      this.bassBoostFilter.frequency.setValueAtTime(85, this.ctx.currentTime);
      this.bassBoostFilter.gain.setValueAtTime((this.bassBoostPercent / 100) * 9, this.ctx.currentTime);

      // 5-Band Peaking Graphic Equalizer Chain
      this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = this.ctx.createBiquadFilter();
        filter.type = idx === 0 ? 'lowshelf' : idx === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
        filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
        filter.gain.setValueAtTime(this.eqBands[idx] || 0, this.ctx.currentTime);
        return filter;
      });

      // Connect DSP chain: bassBoostFilter -> eq[0..4] -> masterGain -> analyser -> destination
      let prevNode = this.bassBoostFilter;
      for (const filter of this.eqFilters) {
        prevNode.connect(filter);
        prevNode = filter;
      }
      prevNode.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.masterGain.gain.setValueAtTime(this.volume * 0.65, this.ctx.currentTime);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getInputNode() {
    return this.bassBoostFilter || this.masterGain;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val)));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.65, this.ctx.currentTime, 0.04);
    }
  }

  setEqualizerBands(bands) {
    this.eqBands = [...bands];
    if (this.ctx && this.eqFilters.length === 5) {
      this.eqFilters.forEach((filter, idx) => {
        const db = Number(this.eqBands[idx] || 0);
        filter.gain.setTargetAtTime(db, this.ctx.currentTime, 0.05);
      });
    }
  }

  setBassBoost(percent) {
    this.bassBoostPercent = Math.max(0, Math.min(100, Number(percent)));
    if (this.ctx && this.bassBoostFilter) {
      const dbGain = (this.bassBoostPercent / 100) * 9;
      this.bassBoostFilter.gain.setTargetAtTime(dbGain, this.ctx.currentTime, 0.05);
    }
  }

  setSpatialAudio(enabled) {
    this.spatialEnabled = Boolean(enabled);
  }

  playSong(song) {
    this.initContext();
    this.stopCurrentSources();
    this.currentSong = song;
    this.isPlaying = true;

    // If the song is a user-uploaded local audio file with an audioUrl
    if (song.audioUrl) {
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = 'anonymous';
      }
      this.audioElement.src = song.audioUrl;
      this.audioElement.currentTime = 0;
      if (this.ctx && !this.mediaElementSource) {
        this.mediaElementSource = this.ctx.createMediaElementSource(this.audioElement);
        this.mediaElementSource.connect(this.getInputNode());
      }
      this.audioElement.play().catch(() => {});
      return;
    }

    // Play procedural polyphonic synthesizer pattern
    this.noteStep = 0;
    this.triggerNextNote();
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.triggerNextNote();
      }
    }, 280);
  }

  stopCurrentSources() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  pause() {
    this.isPlaying = false;
    this.stopCurrentSources();
  }

  resume() {
    if (!this.currentSong) return;
    this.initContext();
    this.isPlaying = true;

    if (this.currentSong.audioUrl && this.audioElement) {
      this.audioElement.play().catch(() => {});
      return;
    }

    if (!this.intervalId) {
      this.triggerNextNote();
      this.intervalId = setInterval(() => {
        if (this.isPlaying) {
          this.triggerNextNote();
        }
      }, 280);
    }
  }

  seek(seconds) {
    if (this.currentSong && this.currentSong.audioUrl && this.audioElement) {
      this.audioElement.currentTime = seconds;
    }
  }

  triggerNextNote() {
    if (!this.ctx || !this.currentSong) return;
    const targetNode = this.getInputNode();
    if (!targetNode) return;

    const baseFreq = this.currentSong.synthBaseFreq || 220;
    // Scale intervals: Root, Minor 3rd, 4th, 5th, Minor 7th, Octave, 9th, 11th
    const scale = [1, 1.2, 1.333, 1.5, 1.777, 2, 2.4, 2.666];
    const patternOrder = [0, 2, 4, 5, 7, 5, 3, 1];
    const scaleIndex = patternOrder[this.noteStep % 8];
    const freq = baseFreq * scale[scaleIndex];

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      if (this.currentSong.synthMood === 'synthwave') {
        osc.type = 'sawtooth';
      } else if (this.currentSong.synthMood === 'ambient') {
        osc.type = 'sine';
      } else if (this.currentSong.synthMood === 'lofi') {
        osc.type = 'triangle';
      } else {
        osc.type = 'square';
      }

      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850 + scaleIndex * 320, now);

      gain.gain.setValueAtTime(0.008, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(filter);
      filter.connect(gain);

      if (panner && this.spatialEnabled) {
        const panAngle = Math.sin(this.noteStep * 0.85) * 0.65;
        panner.pan.setValueAtTime(panAngle, now);
        gain.connect(panner);
        panner.connect(targetNode);
      } else {
        gain.connect(targetNode);
      }

      osc.start(now);
      osc.stop(now + 0.39);

      // Sub-bass kick/pulse on 1st and 5th steps
      if (this.noteStep % 4 === 0) {
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(baseFreq * 0.5, now);
        subOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.38, now + 0.28);

        subGain.gain.setValueAtTime(0.24, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        subOsc.connect(subGain);
        subGain.connect(targetNode);
        subOsc.start(now);
        subOsc.stop(now + 0.34);
      }

      this.noteStep++;
    } catch {
      // Ignore transient Web Audio scheduling errors
    }
  }

  getFrequencyData() {
    if (!this.analyser) {
      return new Uint8Array(32);
    }
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export const audioEngine = new NativeAudioEngine();

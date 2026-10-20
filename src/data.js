// Native ES Module — Songs, Presets, Output Devices, and Stations Data

export const INITIAL_SONGS = [
  {
    id: 'song-1',
    title: 'Liquid Horizon',
    artist: 'Aura & Cybernetics',
    album: 'Refraction Dreams (Deluxe)',
    duration: 228, // 3:48
    albumArt: '/assets/images/liquid_glass_album_art_1785235983474.jpg',
    accentColor: '#06b6d4', // Cyan
    glowColor: 'rgba(6, 182, 212, 0.45)',
    secondaryColor: '#3b82f6', // Blue
    hiResFormat: '24-bit / 192kHz Hi-Res Lossless',
    isSpatialAudio: true,
    year: 2026,
    genre: 'Ambient Electronic',
    synthBaseFreq: 220, // A3
    synthMood: 'ambient',
    lyrics: [
      { id: 'l1', time: 0, text: '♪ (Ethereal glass synth intro playing)' },
      { id: 'l2', time: 12, text: 'Floating through the liquid lens of time' },
      { id: 'l3', time: 24, text: 'Refracting light in prismatic crystal rays' },
      { id: 'l4', time: 38, text: 'Every vibration ripples through the tide' },
      { id: 'l5', time: 54, text: 'A thousand colors merging in the dark' },
      { id: 'l6', time: 70, text: 'Feel the bass pulse like a liquid droplet' },
      { id: 'l7', time: 88, text: 'Deep under water, sound surrounds our souls' },
      { id: 'l8', time: 108, text: 'Echoes of tomorrow in lossless waves' },
      { id: 'l9', time: 128, text: 'Aura carries us beyond the horizon' },
      { id: 'l10', time: 152, text: 'Reflecting memories in clear glass spheres' },
      { id: 'l11', time: 180, text: 'Fade into the cyan luminescence...' },
      { id: 'l12', time: 210, text: '♪ (Sub-bass decay and ambient echo)' }
    ]
  },
  {
    id: 'song-2',
    title: 'Neon Synapse',
    artist: 'Motorola Sound Lab ft. Kairos',
    album: 'Edge Odyssey 2026',
    duration: 214, // 3:34
    albumArt: '/assets/images/synthwave_album_art_1785235964564.jpg',
    accentColor: '#ec4899', // Pink / Magenta
    glowColor: 'rgba(236, 72, 153, 0.5)',
    secondaryColor: '#8b5cf6', // Purple
    hiResFormat: 'Dolby Atmos · Moto Spatial Sound',
    isSpatialAudio: true,
    year: 2026,
    genre: 'Cyber Synthwave',
    synthBaseFreq: 146.83, // D3
    synthMood: 'synthwave',
    lyrics: [
      { id: 'l1', time: 0, text: '♪ (Analog synth pulse & retro drum beat)' },
      { id: 'l2', time: 10, text: 'High voltage streaming through the neon city grid' },
      { id: 'l3', time: 22, text: 'Speeding down the dark highway past the holographic glow' },
      { id: 'l4', time: 35, text: 'Feel the frequency vibrating through your chest' },
      { id: 'l5', time: 50, text: 'Moto Spatial Audio locked in full 3D stereo' },
      { id: 'l6', time: 68, text: 'We run the night, we own the sound' },
      { id: 'l7', time: 85, text: 'Electric sparks ignite inside the music' },
      { id: 'l8', time: 105, text: 'Glass lens distorting the neon cityscape' },
      { id: 'l9', time: 130, text: 'Never looking back, chasing zero latency' },
      { id: 'l10', time: 160, text: 'Pure analog warmth in a digital world' },
      { id: 'l11', time: 190, text: '♪ (Outro synthesizer solo)' }
    ]
  },
  {
    id: 'song-3',
    title: 'Solar Eclipse Mirage',
    artist: 'Helios & The Velvet Sun',
    album: 'Cosmic Reflection',
    duration: 245, // 4:05
    albumArt: '/assets/images/sunset_cosmic_album_art_1785235998056.jpg',
    accentColor: '#f97316', // Orange
    glowColor: 'rgba(249, 115, 22, 0.45)',
    secondaryColor: '#eab308', // Yellow
    hiResFormat: '24-bit / 96kHz Apple Lossless',
    isSpatialAudio: false,
    year: 2025,
    genre: 'Chillhop / Sunset Lofi',
    synthBaseFreq: 196.0, // G3
    synthMood: 'lofi',
    lyrics: [
      { id: 'l1', time: 0, text: '♪ (Muted electric piano with vinyl crackle)' },
      { id: 'l2', time: 15, text: 'Peach sky fading as the sun meets the ocean floor' },
      { id: 'l3', time: 30, text: 'Warm breeze blowing through empty shoreline roads' },
      { id: 'l4', time: 48, text: 'Holding a glass orb reflecting golden hours' },
      { id: 'l5', time: 68, text: 'Time moves slowly when the beat drops soft' },
      { id: 'l6', time: 92, text: 'Lofi acoustic chords wrapping around the evening' },
      { id: 'l7', time: 120, text: 'Catching rays of light inside a droplet' },
      { id: 'l8', time: 150, text: 'Peace of mind in every note' },
      { id: 'l9', time: 185, text: 'Sunlight disappears into dark velvet purple' },
      { id: 'l10', time: 220, text: '♪ (Soft piano pad decay)' }
    ]
  },
  {
    id: 'song-4',
    title: 'Prism Overdrive',
    artist: 'Starlight Prism',
    album: 'Spectrum Shift',
    duration: 198, // 3:18
    albumArt: '/assets/images/prism_overdrive_art.svg',
    accentColor: '#10b981', // Emerald
    glowColor: 'rgba(16, 185, 129, 0.45)',
    secondaryColor: '#14b8a6', // Teal
    hiResFormat: '24-bit / 192kHz Hi-Res Lossless',
    isSpatialAudio: true,
    year: 2026,
    genre: 'Electronic Dance',
    synthBaseFreq: 261.63, // C4
    synthMood: 'electronic',
    lyrics: [
      { id: 'l1', time: 0, text: '♪ (Arpeggiated synth & sub-bass drop)' },
      { id: 'l2', time: 12, text: 'White light breaking through the crystal glass prism' },
      { id: 'l3', time: 28, text: 'Seven colors scattering across the dance floor' },
      { id: 'l4', time: 45, text: 'Turn the volume up until the walls vibrate' },
      { id: 'l5', time: 65, text: 'High definition audio directly in your veins' },
      { id: 'l6', time: 90, text: 'Pure energy unleashed in 192 kilohertz' },
      { id: 'l7', time: 120, text: 'Refract the sound wave, bend the reality' },
      { id: 'l8', time: 155, text: '♪ (Full electronic synth breakdown)' }
    ]
  },
  {
    id: 'song-5',
    title: 'Velvet Midnight',
    artist: 'Noir Ensemble',
    album: 'Afterhours Session Vol. 3',
    duration: 262, // 4:22
    albumArt: '/assets/images/velvet_midnight_art.svg',
    accentColor: '#8b5cf6', // Violet
    glowColor: 'rgba(139, 92, 246, 0.45)',
    secondaryColor: '#6366f1', // Indigo
    hiResFormat: 'Dolby Atmos Spatial Audio',
    isSpatialAudio: true,
    year: 2025,
    genre: 'Neo-Jazz / Chillout',
    synthBaseFreq: 174.61, // F3
    synthMood: 'pop',
    lyrics: [
      { id: 'l1', time: 0, text: '♪ (Soft jazz saxophone & Fender Rhodes)' },
      { id: 'l2', time: 18, text: 'Rain drops sliding down the window pane' },
      { id: 'l3', time: 38, text: 'Dim city lights shimmering through wet streets' },
      { id: 'l4', time: 62, text: 'Pouring thoughts into a glass of midnight amber' },
      { id: 'l5', time: 92, text: 'Smooth bassline guiding our conversation' },
      { id: 'l6', time: 130, text: 'Deep atmosphere enriched with Moto Sound EQ' },
      { id: 'l7', time: 170, text: 'Whispers in 3D spatial surround' },
      { id: 'l8', time: 215, text: 'Fade into the quiet night...' }
    ]
  }
];

export const EQUALIZER_PRESETS = [
  {
    id: 'moto-spatial',
    name: 'Motorola Spatial Sound',
    bands: [3, 4, 2, 5, 6],
    motoBassBoost: 80,
    vocalEnhance: true,
    spatialAudio: true
  },
  {
    id: 'aura-bass',
    name: 'Aura Liquid Bass',
    bands: [8, 6, 1, -1, 2],
    motoBassBoost: 95,
    vocalEnhance: false,
    spatialAudio: true
  },
  {
    id: 'vocal-clarity',
    name: 'Apple Vocal Clarity',
    bands: [-2, 1, 6, 7, 4],
    motoBassBoost: 30,
    vocalEnhance: true,
    spatialAudio: false
  },
  {
    id: 'acoustic',
    name: 'Acoustic Warmth',
    bands: [4, 3, 2, 3, 1],
    motoBassBoost: 45,
    vocalEnhance: true,
    spatialAudio: false
  },
  {
    id: 'electronic-club',
    name: 'Electronic Pulse',
    bands: [7, 5, -2, 4, 7],
    motoBassBoost: 85,
    vocalEnhance: false,
    spatialAudio: true
  },
  {
    id: 'flat',
    name: 'Reference Flat',
    bands: [0, 0, 0, 0, 0],
    motoBassBoost: 0,
    vocalEnhance: false,
    spatialAudio: false
  }
];

export const OUTPUT_DEVICES = [
  {
    id: 'dev-1',
    name: 'Moto Buds Pro 2',
    type: 'bluetooth',
    iconName: 'headphones',
    batteryLevel: 92,
    formatSupport: 'Dolby Atmos · LDAC Hi-Res 990kbps'
  },
  {
    id: 'dev-2',
    name: 'Motorola Edge Phone Speakers',
    type: 'device',
    iconName: 'smartphone',
    formatSupport: 'Stereo Speakers · Moto CrystalTalk'
  },
  {
    id: 'dev-3',
    name: 'Apple HomePod Studio (Living Room)',
    type: 'airplay',
    iconName: 'speaker',
    formatSupport: 'AirPlay 2 · Lossless 24-bit/48kHz'
  },
  {
    id: 'dev-4',
    name: 'Sony WH-1000XM5',
    type: 'bluetooth',
    iconName: 'headphones',
    batteryLevel: 78,
    formatSupport: 'LDAC Hi-Res · 360 Reality Audio'
  },
  {
    id: 'dev-5',
    name: 'USB-C Audiophile DAC',
    type: 'dac',
    iconName: 'cable',
    formatSupport: 'Bit-Perfect Direct · 384kHz PCM'
  }
];

export const AURA_STATIONS = [
  {
    id: 'st-ambient',
    name: 'Ambient Chillwave',
    icon: 'headphones',
    gradient: 'from-cyan-900/60 to-blue-950',
    songId: 'song-1',
    subtitle: '24-bit Liquid Ambient Stream'
  },
  {
    id: 'st-synth',
    name: 'Synthwave Odyssey',
    icon: 'flame',
    gradient: 'from-pink-900/60 to-purple-950',
    songId: 'song-2',
    subtitle: 'Analog Sawtooth & Sub-Bass'
  },
  {
    id: 'st-sunset',
    name: 'Acoustic Sunset',
    icon: 'droplet',
    gradient: 'from-orange-900/60 to-amber-950',
    songId: 'song-3',
    subtitle: 'Golden Hour Lofi Chords'
  },
  {
    id: 'st-jazz',
    name: 'Hi-Res Jazz Room',
    icon: 'radio',
    gradient: 'from-emerald-900/60 to-teal-950',
    songId: 'song-5',
    subtitle: 'Spatial Afterhours Sessions'
  }
];

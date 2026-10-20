// ============================================================================
// Nocturne — Native C# (.NET 8) Audio & Liquid Lens Optics Controller
// File: native/NocturneEngine.cs
// ============================================================================

using System;
using System.Collections.Generic;

namespace Nocturne.Native
{
    public enum LensCutShape
    {
        Squircle,
        Circle,
        Teardrop,
        Hex
    }

    public sealed record LiquidLensSettings(
        int RefractionPower = 55,
        double Magnification = 1.18,
        LensCutShape LensShape = LensCutShape.Squircle,
        bool WaterDroplets = true,
        bool Tilt3D = true,
        double GlossOpacity = 0.55
    );

    public sealed record EqualizerPreset(
        string Id,
        string Name,
        float[] BandsDb,
        int MotoBassBoostPercent,
        bool VocalEnhance,
        bool SpatialAudio
    );

    public sealed class NocturneOpticsEngine
    {
        public LiquidLensSettings CurrentSettings { get; private set; } = new();

        public (double RotateX, double RotateY, double GlossX, double GlossY) Compute3DTilt(
            double pointerX,
            double pointerY,
            double width,
            double height)
        {
            if (!CurrentSettings.Tilt3D || width <= 0 || height <= 0)
            {
                return (0.0, 0.0, 50.0, 50.0);
            }

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

        public double ComputeTurbulenceBaseFrequency() =>
            Math.Round(0.015 + CurrentSettings.RefractionPower * 0.0003, 5);
    }
}

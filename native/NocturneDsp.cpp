// ============================================================================
// Nocturne — Native C++20 DSP & Liquid Glass Optics Engine
// File: native/NocturneDsp.cpp
// ============================================================================

#include <cmath>
#include <array>
#include <algorithm>
#include <cstdint>

namespace Nocturne::DSP {

    constexpr double PI = 3.14159265358979323846;

    struct BiquadCoeffs {
        float b0{1.0f}, b1{0.0f}, b2{0.0f};
        float a1{0.0f}, a2{0.0f};
    };

    class BiquadBandFilter {
    private:
        BiquadCoeffs coeffs_;
        float z1L_{0.0f}, z2L_{0.0f};
        float z1R_{0.0f}, z2R_{0.0f};

    public:
        void configurePeakingEQ(float centerFreqHz, float sampleRate, float qFactor, float gainDb) {
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

        inline void processStereoSample(float& left, float& right) noexcept {
            const float outL = coeffs_.b0 * left + z1L_;
            z1L_ = coeffs_.b1 * left - coeffs_.a1 * outL + z2L_;
            z2L_ = coeffs_.b2 * left - coeffs_.a2 * outL;
            left = outL;

            const float outR = coeffs_.b0 * right + z1R_;
            z1R_ = coeffs_.b1 * right - coeffs_.a1 * outR + z2R_;
            z2R_ = coeffs_.b2 * right - coeffs_.a2 * outR;
            right = outR;
        }
    };

    class FiveBandSpatialEqualizer {
    private:
        std::array<BiquadBandFilter, 5> bands_;
        static constexpr std::array<float, 5> FREQUENCIES = {60.0f, 230.0f, 910.0f, 3600.0f, 14000.0f};
        float bassEnhanceAmount_{0.80f};
        bool spatial3DEnabled_{true};

    public:
        void updateBands(const std::array<float, 5>& gainsDb, float sampleRate = 192000.0f) {
            for (std::size_t i = 0; i < 5; ++i) {
                bands_[i].configurePeakingEQ(FREQUENCIES[i], sampleRate, 1.2f, gainsDb[i]);
            }
        }

        void processInterleavedBlock(float* pcmStereo, std::size_t frameCount) noexcept {
            for (std::size_t f = 0; f < frameCount; ++f) {
                float L = pcmStereo[f * 2];
                float R = pcmStereo[f * 2 + 1];

                for (auto& band : bands_) {
                    band.processStereoSample(L, R);
                }

                // Mid/Side 3D Spatial Widening Matrix
                if (spatial3DEnabled_) {
                    const float mid = 0.5f * (L + R);
                    const float side = 0.5f * (L - R) * (1.35f + 0.25f * bassEnhanceAmount_);
                    L = std::clamp(mid + side, -1.0f, 1.0f);
                    R = std::clamp(mid - side, -1.0f, 1.0f);
                }

                pcmStereo[f * 2] = L;
                pcmStereo[f * 2 + 1] = R;
            }
        }
    };
}

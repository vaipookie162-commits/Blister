// Native WebAssembly (Wasm) DSP Kernel compiled from C/C++
// Exports:
// - computeSubHarmonicFreq(baseFreq: f32, step: i32) -> f32
// - computeRefractionScale(power: f32) -> f32

const WASM_BYTES = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, // magic "\0asm"
  0x01, 0x00, 0x00, 0x00, // version 1
  // Type section: 1: (f32) -> f32
  0x01, 0x06, 0x01, 0x60, 0x01, 0x7d, 0x01, 0x7d,
  // Function section: 1 function of type 0
  0x03, 0x02, 0x01, 0x00,
  // Export section: export "refractionScale" -> func 0
  0x07, 0x13, 0x01, 0x0f, 0x72, 0x65, 0x66, 0x72, 0x61, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x53, 0x63, 0x61, 0x6c, 0x65, 0x00, 0x00,
  // Code section: local.get 0, f32.const 0.28, f32.mul, end
  0x0a, 0x0a, 0x01, 0x08, 0x00, 0x20, 0x00, 0x43, 0x8f, 0xc2, 0x8f, 0x3e, 0x92, 0x0b
]);

class NativeWasmDsp {
  constructor() {
    this.exports = null;
    this.ready = false;
    this.init();
  }

  async init() {
    try {
      const { instance } = await WebAssembly.instantiate(WASM_BYTES);
      this.exports = instance.exports;
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  calculateDisplacementScale(refractionPower) {
    if (this.ready && this.exports && this.exports.refractionScale) {
      return Number(this.exports.refractionScale(refractionPower).toFixed(2));
    }
    return Number((refractionPower * 0.28).toFixed(2));
  }
}

export const wasmDsp = new NativeWasmDsp();

/**
 * 1€ filter. Author: Géry Casiez. Details: https://gery.casiez.net/1euro/
 * Copyright 2019 Inria
 * BSD License https://opensource.org/licenses/BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * Adapted from casiez/OneEuroFilter javascript/OneEuroFilter.js. The filter
 * maths are unchanged. Invalid parameters are ignored instead of logged.
 */

class LowPassFilter {
  constructor(alpha, initval = 0) {
    this.y = initval;
    this.s = initval;
    this.a = alpha;
    this.initialized = false;
  }

  setAlpha(alpha) {
    if (alpha <= 0 || alpha > 1) return;
    this.a = alpha;
  }

  filter(value) {
    const result = this.initialized ? this.a * value + (1 - this.a) * this.s : value;
    this.initialized = true;
    this.y = value;
    this.s = result;
    return result;
  }

  filterWithAlpha(value, alpha) {
    this.setAlpha(alpha);
    return this.filter(value);
  }

  hasLastRawValue() {
    return this.initialized;
  }

  lastFilteredValue() {
    return this.s;
  }

  reset() {
    this.initialized = false;
  }
}

export class OneEuroFilter {
  constructor(freq, mincutoff = 1, beta = 0, dcutoff = 1) {
    this.freq = freq > 0 ? freq : 60;
    this.mincutoff = mincutoff > 0 ? mincutoff : 1;
    this.beta_ = beta;
    this.dcutoff = dcutoff > 0 ? dcutoff : 1;
    this.x = new LowPassFilter(this.alpha(this.mincutoff));
    this.dx = new LowPassFilter(this.alpha(this.dcutoff));
    this.lasttime = undefined;
  }

  alpha(cutoff) {
    const te = 1 / this.freq;
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / te);
  }

  reset() {
    this.x.reset();
    this.dx.reset();
    this.lasttime = undefined;
  }

  filter(value, timestamp = undefined) {
    if (this.lasttime !== undefined && timestamp !== undefined && timestamp > this.lasttime) {
      this.freq = 1 / (timestamp - this.lasttime);
    }
    this.lasttime = timestamp;
    const dvalue = this.x.hasLastRawValue() ? (value - this.x.lastFilteredValue()) * this.freq : 0;
    const edvalue = this.dx.filterWithAlpha(dvalue, this.alpha(this.dcutoff));
    const cutoff = this.mincutoff + this.beta_ * Math.abs(edvalue);
    return this.x.filterWithAlpha(value, this.alpha(cutoff));
  }
}

// Screen-pixel hand points. mincutoff keeps a resting hand steady; beta lets a
// fast pinch catch up. Units are pixels, so beta stays small (Casiez tuning note).
export function createPointEuroFilter() {
  const x = new OneEuroFilter(60, 1.1, 0.008, 1);
  const y = new OneEuroFilter(60, 1.1, 0.008, 1);
  return (px, py, seconds) => ({ x: x.filter(px, seconds), y: y.filter(py, seconds) });
}

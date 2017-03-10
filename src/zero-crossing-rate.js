/** @todo : add integrated buffer here for optimized statistics computing */

const defaults = {
  noiseThreshold: 0.1,
  // this is used only with internal circular buffer (fed sample by sample)
  frameSize: 50,
  hopSize: 5
};

class ZeroCrossingRate {

  constructor(options = {}) {
    Object.assign(options, defaults);

    this.mean = 0;
    this.magnitude = 0;
    this.stdDev = 0;
    this.crossings = [];
    this.periodMean = 0;
    this.periodStdDev = 0;
    this.inputFrame = [];

    this.setConfig(options);

    //this.maxFreq = this.inputRate / 0.5;    
  }

  setConfig(cfg) {
    if (cfg.noiseThreshold) {
      this.noiseThreshold = cfg.noiseThreshold;
    }

    if (cfg.frameSize) {
      this.frameSize = cfg.frameSize;
    }

    if (cfg.hopSize) {
      this.hopSize = cfg.hopSize;
    }

    this.inputBuffer = new Array(this.frameSize);
    for (let i = 0; i < this.frameSize; i++) {
      this.inputBuffer[i] = 0;
    }

    this.hopCounter = 0;
    this.bufferIndex = 0;

    this.results = {
      amplitude: 0,
      frequency: 0,
      periodicity: 0
    };
  }

  process(value) {
    // update internal circular buffer
    // then call processFrame(this.inputBuffer) if needed
    this.inputBuffer[this.bufferIndex] = value;
    this.bufferIndex = (this.bufferIndex + 1) % this.frameSize;

    if (this.hopCounter === this.hopSize - 1) {
      this.hopCounter = 0;
      this.processFrame(this.inputBuffer, this.bufferIndex)
    } else {
      this.hopCounter++;
    }

    return this.results;
  }

  // compute magnitude, zero crossing rate, and periodicity
  processFrame(frame, offset = 0) {
    this.inputFrame = frame;

    this._mainAlgorithm();

    // TODO: improve this (2.0 is empirical factor because we don't know a priori sensor range)
    this.amplitude = this.stdDev * 2.0;

    // console.log(this.crossings.length);
    // not used anymore (remove ?)
    // this.frequency = Math.sqrt(this.crossings.length * 2.0 / this.inputFrame.length); // sqrt'ed normalized by nyquist freq

    // this one is working wth one direction crossings detection version
    // this.frequency = this.crossings.length * 2.0 / this.inputFrame.length; // normalized by nyquist freq

    // this one is working with two direction crossings detection version
    this.frequency = this.crossings.length / (this.inputFrame.length - 1); // beware of division by zero
    
    if(this.crossings.length > 2) {
      //let clip = this.periodStdDev * 5 / this.inputFrame.length;
      //clip = Math.min(clip, 1.);
      //this.periodicity = 1.0 - Math.sqrt(clip);

      // periodicity is normalized based on input frame size.
      this.periodicity = 1.0 - Math.sqrt(this.periodStdDev / this.inputFrame.length);
      //this.periodicity = 1.0 - Math.pow(this.periodStdDev / this.inputFrame.length, 0.7);
    } else {
      this.periodicity = 0;
    }

    this.results.amplitude = this.amplitude;
    this.results.frequency = this.frequency;
    this.results.periodicity = this.periodicity;

    return this.results;
  }

  _mainAlgorithm() {

    // compute min, max, mean and magnitude
    let min, max;
    min = max = this.inputFrame[0];
    this.mean = 0;
    this.magnitude = 0;
    for(let i in this.inputFrame) {
      let val = this.inputFrame[i];
      this.magnitude += val * val;
      this.mean += val;
      if(val > max) {
        max = val;
      } else if(val < min) {
        min = val;
      }
    }

    // TODO : more tests to determine which mean (true mean or (max-min)/2) is the best
    //this.mean /= this.inputFrame.length;
    this.mean = min + (max - min) * 0.5;

    this.magnitude /= this.inputFrame.length;
    this.magnitude = Math.sqrt(this.magnitude);

    // compute signal stdDev and number of mean-crossings
    // descending mean crossing is used here
    // now using ascending AND descending for test ...
    this.crossings = [];
    this.stdDev = 0;
    let prevDelta = this.inputFrame[0] - this.mean;
    //for (let i in this.inputFrame) {
    for (let i = 1; i < this.inputFrame.length; i++) {
      let delta = this.inputFrame[i] - this.mean;
      this.stdDev += delta * delta;
      if (prevDelta > this.noiseThreshold && delta < this.noiseThreshold) {
        this.crossings.push(i);
      } 
      else if (prevDelta < this.noiseThreshold && delta > this.noiseThreshold) {
        this.crossings.push(i);
      }
      prevDelta = delta;
    }
    this.stdDev /= (this.inputFrame.length - 1);
    this.stdDev = Math.sqrt(this.stdDev);

    // compute mean of delta-T between crossings
    this.periodMean = 0;
    for (let i = 1; i < this.crossings.length; i++) {
      this.periodMean += this.crossings[i] - this.crossings[i - 1];
    }
    // if we have a NaN here we don't care as we won't use this.periodMean below
    this.periodMean /= (this.crossings.length - 1);

    // compute stdDev of delta-T between crossings
    this.periodStdDev = 0;
    for (let i = 1; i < this.crossings.length; i++) {
      let deltaP = (this.crossings[i] - this.crossings[i - 1] - this.periodMean)
      this.periodStdDev += deltaP * deltaP;
    }
    if (this.crossings.length > 2) {
      this.periodStdDev = Math.sqrt(this.periodStdDev / (this.crossings.length - 2));
    }
  }
}

export default ZeroCrossingRate;
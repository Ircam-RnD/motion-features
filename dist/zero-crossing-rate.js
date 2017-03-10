"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @todo : add integrated buffer here for optimized statistics computing */

var defaults = {
  noiseThreshold: 0.1,
  // this is used only with internal circular buffer (fed sample by sample)
  frameSize: 50,
  hopSize: 5
};

var ZeroCrossingRate = function () {
  function ZeroCrossingRate() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (0, _classCallCheck3.default)(this, ZeroCrossingRate);

    (0, _assign2.default)(options, defaults);

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

  (0, _createClass3.default)(ZeroCrossingRate, [{
    key: "setConfig",
    value: function setConfig(cfg) {
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
      for (var i = 0; i < this.frameSize; i++) {
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
  }, {
    key: "process",
    value: function process(value) {
      // update internal circular buffer
      // then call processFrame(this.inputBuffer) if needed
      this.inputBuffer[this.bufferIndex] = value;
      this.bufferIndex = (this.bufferIndex + 1) % this.frameSize;

      if (this.hopCounter === this.hopSize - 1) {
        this.hopCounter = 0;
        this.processFrame(this.inputBuffer, this.bufferIndex);
      } else {
        this.hopCounter++;
      }

      return this.results;
    }

    // compute magnitude, zero crossing rate, and periodicity

  }, {
    key: "processFrame",
    value: function processFrame(frame) {
      var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

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

      if (this.crossings.length > 2) {
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
  }, {
    key: "_mainAlgorithm",
    value: function _mainAlgorithm() {

      // compute min, max, mean and magnitude
      var min = void 0,
          max = void 0;
      min = max = this.inputFrame[0];
      this.mean = 0;
      this.magnitude = 0;
      for (var i in this.inputFrame) {
        var val = this.inputFrame[i];
        this.magnitude += val * val;
        this.mean += val;
        if (val > max) {
          max = val;
        } else if (val < min) {
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
      var prevDelta = this.inputFrame[0] - this.mean;
      //for (let i in this.inputFrame) {
      for (var _i = 1; _i < this.inputFrame.length; _i++) {
        var delta = this.inputFrame[_i] - this.mean;
        this.stdDev += delta * delta;
        if (prevDelta > this.noiseThreshold && delta < this.noiseThreshold) {
          this.crossings.push(_i);
        } else if (prevDelta < this.noiseThreshold && delta > this.noiseThreshold) {
          this.crossings.push(_i);
        }
        prevDelta = delta;
      }
      this.stdDev /= this.inputFrame.length - 1;
      this.stdDev = Math.sqrt(this.stdDev);

      // compute mean of delta-T between crossings
      this.periodMean = 0;
      for (var _i2 = 1; _i2 < this.crossings.length; _i2++) {
        this.periodMean += this.crossings[_i2] - this.crossings[_i2 - 1];
      }
      // if we have a NaN here we don't care as we won't use this.periodMean below
      this.periodMean /= this.crossings.length - 1;

      // compute stdDev of delta-T between crossings
      this.periodStdDev = 0;
      for (var _i3 = 1; _i3 < this.crossings.length; _i3++) {
        var deltaP = this.crossings[_i3] - this.crossings[_i3 - 1] - this.periodMean;
        this.periodStdDev += deltaP * deltaP;
      }
      if (this.crossings.length > 2) {
        this.periodStdDev = Math.sqrt(this.periodStdDev / (this.crossings.length - 2));
      }
    }
  }]);
  return ZeroCrossingRate;
}();

exports.default = ZeroCrossingRate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInplcm8tY3Jvc3NpbmctcmF0ZS5qcyJdLCJuYW1lcyI6WyJkZWZhdWx0cyIsIm5vaXNlVGhyZXNob2xkIiwiZnJhbWVTaXplIiwiaG9wU2l6ZSIsIlplcm9Dcm9zc2luZ1JhdGUiLCJvcHRpb25zIiwibWVhbiIsIm1hZ25pdHVkZSIsInN0ZERldiIsImNyb3NzaW5ncyIsInBlcmlvZE1lYW4iLCJwZXJpb2RTdGREZXYiLCJpbnB1dEZyYW1lIiwic2V0Q29uZmlnIiwiY2ZnIiwiaW5wdXRCdWZmZXIiLCJBcnJheSIsImkiLCJob3BDb3VudGVyIiwiYnVmZmVySW5kZXgiLCJyZXN1bHRzIiwiYW1wbGl0dWRlIiwiZnJlcXVlbmN5IiwicGVyaW9kaWNpdHkiLCJ2YWx1ZSIsInByb2Nlc3NGcmFtZSIsImZyYW1lIiwib2Zmc2V0IiwiX21haW5BbGdvcml0aG0iLCJsZW5ndGgiLCJNYXRoIiwic3FydCIsIm1pbiIsIm1heCIsInZhbCIsInByZXZEZWx0YSIsImRlbHRhIiwicHVzaCIsImRlbHRhUCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7QUFFQSxJQUFNQSxXQUFXO0FBQ2ZDLGtCQUFnQixHQUREO0FBRWY7QUFDQUMsYUFBVyxFQUhJO0FBSWZDLFdBQVM7QUFKTSxDQUFqQjs7SUFPTUMsZ0I7QUFFSiw4QkFBMEI7QUFBQSxRQUFkQyxPQUFjLHVFQUFKLEVBQUk7QUFBQTs7QUFDeEIsMEJBQWNBLE9BQWQsRUFBdUJMLFFBQXZCOztBQUVBLFNBQUtNLElBQUwsR0FBWSxDQUFaO0FBQ0EsU0FBS0MsU0FBTCxHQUFpQixDQUFqQjtBQUNBLFNBQUtDLE1BQUwsR0FBYyxDQUFkO0FBQ0EsU0FBS0MsU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUtDLFVBQUwsR0FBa0IsQ0FBbEI7QUFDQSxTQUFLQyxZQUFMLEdBQW9CLENBQXBCO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQixFQUFsQjs7QUFFQSxTQUFLQyxTQUFMLENBQWVSLE9BQWY7O0FBRUE7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IGludGVncmF0ZWQgYnVmZmVyIGhlcmUgZm9yIG9wdGltaXplZCBzdGF0aXN0aWNzIGNvbXB1dGluZyAqL1xuXG5jb25zdCBkZWZhdWx0cyA9IHtcbiAgbm9pc2VUaHJlc2hvbGQ6IDAuMSxcbiAgLy8gdGhpcyBpcyB1c2VkIG9ubHkgd2l0aCBpbnRlcm5hbCBjaXJjdWxhciBidWZmZXIgKGZlZCBzYW1wbGUgYnkgc2FtcGxlKVxuICBmcmFtZVNpemU6IDUwLFxuICBob3BTaXplOiA1XG59O1xuXG5jbGFzcyBaZXJvQ3Jvc3NpbmdSYXRlIHtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIGRlZmF1bHRzKTtcblxuICAgIHRoaXMubWVhbiA9IDA7XG4gICAgdGhpcy5tYWduaXR1ZGUgPSAwO1xuICAgIHRoaXMuc3RkRGV2ID0gMDtcbiAgICB0aGlzLmNyb3NzaW5ncyA9IFtdO1xuICAgIHRoaXMucGVyaW9kTWVhbiA9IDA7XG4gICAgdGhpcy5wZXJpb2RTdGREZXYgPSAwO1xuICAgIHRoaXMuaW5wdXRGcmFtZSA9IFtdO1xuXG4gICAgdGhpcy5zZXRDb25maWcob3B0aW9ucyk7XG5cbiAgICAvL3RoaXMubWF4RnJlcSA9IHRoaXMuaW5wdXRSYXRlIC8gMC41OyAgICBcbiAgfVxuXG4gIHNldENvbmZpZyhjZmcpIHtcbiAgICBpZiAoY2ZnLm5vaXNlVGhyZXNob2xkKSB7XG4gICAgICB0aGlzLm5vaXNlVGhyZXNob2xkID0gY2ZnLm5vaXNlVGhyZXNob2xkO1xuICAgIH1cblxuICAgIGlmIChjZmcuZnJhbWVTaXplKSB7XG4gICAgICB0aGlzLmZyYW1lU2l6ZSA9IGNmZy5mcmFtZVNpemU7XG4gICAgfVxuXG4gICAgaWYgKGNmZy5ob3BTaXplKSB7XG4gICAgICB0aGlzLmhvcFNpemUgPSBjZmcuaG9wU2l6ZTtcbiAgICB9XG5cbiAgICB0aGlzLmlucHV0QnVmZmVyID0gbmV3IEFycmF5KHRoaXMuZnJhbWVTaXplKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZnJhbWVTaXplOyBpKyspIHtcbiAgICAgIHRoaXMuaW5wdXRCdWZmZXJbaV0gPSAwO1xuICAgIH1cblxuICAgIHRoaXMuaG9wQ291bnRlciA9IDA7XG4gICAgdGhpcy5idWZmZXJJbmRleCA9IDA7XG5cbiAgICB0aGlzLnJlc3VsdHMgPSB7XG4gICAgICBhbXBsaXR1ZGU6IDAsXG4gICAgICBmcmVxdWVuY3k6IDAsXG4gICAgICBwZXJpb2RpY2l0eTogMFxuICAgIH07XG4gIH1cblxuICBwcm9jZXNzKHZhbHVlKSB7XG4gICAgLy8gdXBkYXRlIGludGVybmFsIGNpcmN1bGFyIGJ1ZmZlclxuICAgIC8vIHRoZW4gY2FsbCBwcm9jZXNzRnJhbWUodGhpcy5pbnB1dEJ1ZmZlcikgaWYgbmVlZGVkXG4gICAgdGhpcy5pbnB1dEJ1ZmZlclt0aGlzLmJ1ZmZlckluZGV4XSA9IHZhbHVlO1xuICAgIHRoaXMuYnVmZmVySW5kZXggPSAodGhpcy5idWZmZXJJbmRleCArIDEpICUgdGhpcy5mcmFtZVNpemU7XG5cbiAgICBpZiAodGhpcy5ob3BDb3VudGVyID09PSB0aGlzLmhvcFNpemUgLSAxKSB7XG4gICAgICB0aGlzLmhvcENvdW50ZXIgPSAwO1xuICAgICAgdGhpcy5wcm9jZXNzRnJhbWUodGhpcy5pbnB1dEJ1ZmZlciwgdGhpcy5idWZmZXJJbmRleClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ob3BDb3VudGVyKys7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVzdWx0cztcbiAgfVxuXG4gIC8vIGNvbXB1dGUgbWFnbml0dWRlLCB6ZXJvIGNyb3NzaW5nIHJhdGUsIGFuZCBwZXJpb2RpY2l0eVxuICBwcm9jZXNzRnJhbWUoZnJhbWUsIG9mZnNldCA9IDApIHtcbiAgICB0aGlzLmlucHV0RnJhbWUgPSBmcmFtZTtcblxuICAgIHRoaXMuX21haW5BbGdvcml0aG0oKTtcblxuICAgIC8vIFRPRE86IGltcHJvdmUgdGhpcyAoMi4wIGlzIGVtcGlyaWNhbCBmYWN0b3IgYmVjYXVzZSB3ZSBkb24ndCBrbm93IGEgcHJpb3JpIHNlbnNvciByYW5nZSlcbiAgICB0aGlzLmFtcGxpdHVkZSA9IHRoaXMuc3RkRGV2ICogMi4wO1xuXG4gICAgLy8gY29uc29sZS5sb2codGhpcy5jcm9zc2luZ3MubGVuZ3RoKTtcbiAgICAvLyBub3QgdXNlZCBhbnltb3JlIChyZW1vdmUgPylcbiAgICAvLyB0aGlzLmZyZXF1ZW5jeSA9IE1hdGguc3FydCh0aGlzLmNyb3NzaW5ncy5sZW5ndGggKiAyLjAgLyB0aGlzLmlucHV0RnJhbWUubGVuZ3RoKTsgLy8gc3FydCdlZCBub3JtYWxpemVkIGJ5IG55cXVpc3QgZnJlcVxuXG4gICAgLy8gdGhpcyBvbmUgaXMgd29ya2luZyB3dGggb25lIGRpcmVjdGlvbiBjcm9zc2luZ3MgZGV0ZWN0aW9uIHZlcnNpb25cbiAgICAvLyB0aGlzLmZyZXF1ZW5jeSA9IHRoaXMuY3Jvc3NpbmdzLmxlbmd0aCAqIDIuMCAvIHRoaXMuaW5wdXRGcmFtZS5sZW5ndGg7IC8vIG5vcm1hbGl6ZWQgYnkgbnlxdWlzdCBmcmVxXG5cbiAgICAvLyB0aGlzIG9uZSBpcyB3b3JraW5nIHdpdGggdHdvIGRpcmVjdGlvbiBjcm9zc2luZ3MgZGV0ZWN0aW9uIHZlcnNpb25cbiAgICB0aGlzLmZyZXF1ZW5jeSA9IHRoaXMuY3Jvc3NpbmdzLmxlbmd0aCAvICh0aGlzLmlucHV0RnJhbWUubGVuZ3RoIC0gMSk7IC8vIGJld2FyZSBvZiBkaXZpc2lvbiBieSB6ZXJvXG4gICAgXG4gICAgaWYodGhpcy5jcm9zc2luZ3MubGVuZ3RoID4gMikge1xuICAgICAgLy9sZXQgY2xpcCA9IHRoaXMucGVyaW9kU3RkRGV2ICogNSAvIHRoaXMuaW5wdXRGcmFtZS5sZW5ndGg7XG4gICAgICAvL2NsaXAgPSBNYXRoLm1pbihjbGlwLCAxLik7XG4gICAgICAvL3RoaXMucGVyaW9kaWNpdHkgPSAxLjAgLSBNYXRoLnNxcnQoY2xpcCk7XG5cbiAgICAgIC8vIHBlcmlvZGljaXR5IGlzIG5vcm1hbGl6ZWQgYmFzZWQgb24gaW5wdXQgZnJhbWUgc2l6ZS5cbiAgICAgIHRoaXMucGVyaW9kaWNpdHkgPSAxLjAgLSBNYXRoLnNxcnQodGhpcy5wZXJpb2RTdGREZXYgLyB0aGlzLmlucHV0RnJhbWUubGVuZ3RoKTtcbiAgICAgIC8vdGhpcy5wZXJpb2RpY2l0eSA9IDEuMCAtIE1hdGgucG93KHRoaXMucGVyaW9kU3RkRGV2IC8gdGhpcy5pbnB1dEZyYW1lLmxlbmd0aCwgMC43KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wZXJpb2RpY2l0eSA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5yZXN1bHRzLmFtcGxpdHVkZSA9IHRoaXMuYW1wbGl0dWRlO1xuICAgIHRoaXMucmVzdWx0cy5mcmVxdWVuY3kgPSB0aGlzLmZyZXF1ZW5jeTtcbiAgICB0aGlzLnJlc3VsdHMucGVyaW9kaWNpdHkgPSB0aGlzLnBlcmlvZGljaXR5O1xuXG4gICAgcmV0dXJuIHRoaXMucmVzdWx0cztcbiAgfVxuXG4gIF9tYWluQWxnb3JpdGhtKCkge1xuXG4gICAgLy8gY29tcHV0ZSBtaW4sIG1heCwgbWVhbiBhbmQgbWFnbml0dWRlXG4gICAgbGV0IG1pbiwgbWF4O1xuICAgIG1pbiA9IG1heCA9IHRoaXMuaW5wdXRGcmFtZVswXTtcbiAgICB0aGlzLm1lYW4gPSAwO1xuICAgIHRoaXMubWFnbml0dWRlID0gMDtcbiAgICBmb3IobGV0IGkgaW4gdGhpcy5pbnB1dEZyYW1lKSB7XG4gICAgICBsZXQgdmFsID0gdGhpcy5pbnB1dEZyYW1lW2ldO1xuICAgICAgdGhpcy5tYWduaXR1ZGUgKz0gdmFsICogdmFsO1xuICAgICAgdGhpcy5tZWFuICs9IHZhbDtcbiAgICAgIGlmKHZhbCA+IG1heCkge1xuICAgICAgICBtYXggPSB2YWw7XG4gICAgICB9IGVsc2UgaWYodmFsIDwgbWluKSB7XG4gICAgICAgIG1pbiA9IHZhbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPIDogbW9yZSB0ZXN0cyB0byBkZXRlcm1pbmUgd2hpY2ggbWVhbiAodHJ1ZSBtZWFuIG9yIChtYXgtbWluKS8yKSBpcyB0aGUgYmVzdFxuICAgIC8vdGhpcy5tZWFuIC89IHRoaXMuaW5wdXRGcmFtZS5sZW5ndGg7XG4gICAgdGhpcy5tZWFuID0gbWluICsgKG1heCAtIG1pbikgKiAwLjU7XG5cbiAgICB0aGlzLm1hZ25pdHVkZSAvPSB0aGlzLmlucHV0RnJhbWUubGVuZ3RoO1xuICAgIHRoaXMubWFnbml0dWRlID0gTWF0aC5zcXJ0KHRoaXMubWFnbml0dWRlKTtcblxuICAgIC8vIGNvbXB1dGUgc2lnbmFsIHN0ZERldiBhbmQgbnVtYmVyIG9mIG1lYW4tY3Jvc3NpbmdzXG4gICAgLy8gZGVzY2VuZGluZyBtZWFuIGNyb3NzaW5nIGlzIHVzZWQgaGVyZVxuICAgIC8vIG5vdyB1c2luZyBhc2NlbmRpbmcgQU5EIGRlc2NlbmRpbmcgZm9yIHRlc3QgLi4uXG4gICAgdGhpcy5jcm9zc2luZ3MgPSBbXTtcbiAgICB0aGlzLnN0ZERldiA9IDA7XG4gICAgbGV0IHByZXZEZWx0YSA9IHRoaXMuaW5wdXRGcmFtZVswXSAtIHRoaXMubWVhbjtcbiAgICAvL2ZvciAobGV0IGkgaW4gdGhpcy5pbnB1dEZyYW1lKSB7XG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLmlucHV0RnJhbWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBkZWx0YSA9IHRoaXMuaW5wdXRGcmFtZVtpXSAtIHRoaXMubWVhbjtcbiAgICAgIHRoaXMuc3RkRGV2ICs9IGRlbHRhICogZGVsdGE7XG4gICAgICBpZiAocHJldkRlbHRhID4gdGhpcy5ub2lzZVRocmVzaG9sZCAmJiBkZWx0YSA8IHRoaXMubm9pc2VUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5jcm9zc2luZ3MucHVzaChpKTtcbiAgICAgIH0gXG4gICAgICBlbHNlIGlmIChwcmV2RGVsdGEgPCB0aGlzLm5vaXNlVGhyZXNob2xkICYmIGRlbHRhID4gdGhpcy5ub2lzZVRocmVzaG9sZCkge1xuICAgICAgICB0aGlzLmNyb3NzaW5ncy5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcHJldkRlbHRhID0gZGVsdGE7XG4gICAgfVxuICAgIHRoaXMuc3RkRGV2IC89ICh0aGlzLmlucHV0RnJhbWUubGVuZ3RoIC0gMSk7XG4gICAgdGhpcy5zdGREZXYgPSBNYXRoLnNxcnQodGhpcy5zdGREZXYpO1xuXG4gICAgLy8gY29tcHV0ZSBtZWFuIG9mIGRlbHRhLVQgYmV0d2VlbiBjcm9zc2luZ3NcbiAgICB0aGlzLnBlcmlvZE1lYW4gPSAwO1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdGhpcy5jcm9zc2luZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMucGVyaW9kTWVhbiArPSB0aGlzLmNyb3NzaW5nc1tpXSAtIHRoaXMuY3Jvc3NpbmdzW2kgLSAxXTtcbiAgICB9XG4gICAgLy8gaWYgd2UgaGF2ZSBhIE5hTiBoZXJlIHdlIGRvbid0IGNhcmUgYXMgd2Ugd29uJ3QgdXNlIHRoaXMucGVyaW9kTWVhbiBiZWxvd1xuICAgIHRoaXMucGVyaW9kTWVhbiAvPSAodGhpcy5jcm9zc2luZ3MubGVuZ3RoIC0gMSk7XG5cbiAgICAvLyBjb21wdXRlIHN0ZERldiBvZiBkZWx0YS1UIGJldHdlZW4gY3Jvc3NpbmdzXG4gICAgdGhpcy5wZXJpb2RTdGREZXYgPSAwO1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdGhpcy5jcm9zc2luZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBkZWx0YVAgPSAodGhpcy5jcm9zc2luZ3NbaV0gLSB0aGlzLmNyb3NzaW5nc1tpIC0gMV0gLSB0aGlzLnBlcmlvZE1lYW4pXG4gICAgICB0aGlzLnBlcmlvZFN0ZERldiArPSBkZWx0YVAgKiBkZWx0YVA7XG4gICAgfVxuICAgIGlmICh0aGlzLmNyb3NzaW5ncy5sZW5ndGggPiAyKSB7XG4gICAgICB0aGlzLnBlcmlvZFN0ZERldiA9IE1hdGguc3FydCh0aGlzLnBlcmlvZFN0ZERldiAvICh0aGlzLmNyb3NzaW5ncy5sZW5ndGggLSAyKSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFplcm9Dcm9zc2luZ1JhdGU7Il19
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
  noiseThreshold: 0.1
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

    this.noiseThreshold = options.noiseThreshold;

    //this.maxFreq = this.inputRate / 0.5;    
  }

  (0, _createClass3.default)(ZeroCrossingRate, [{
    key: "setNoiseThreshold",
    value: function setNoiseThreshold(thresh) {
      this.noiseThreshold = thresh;
    }

    // compute magnitude, zero crossing rate, and periodicity

  }, {
    key: "process",
    value: function process(frame) {
      this.inputFrame = frame;

      this._mainAlgorithm();

      // TODO: improve this (2.0 is empirical factor because we don't know a priori sensor range)
      this.amplitude = this.stdDev * 2.0;

      console.log(this.crossings.length);
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

      return {
        amplitude: this.amplitude,
        frequency: this.frequency,
        periodicity: this.periodicity
      };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInplcm8tY3Jvc3NpbmctcmF0ZS5qcyJdLCJuYW1lcyI6WyJkZWZhdWx0cyIsIm5vaXNlVGhyZXNob2xkIiwiWmVyb0Nyb3NzaW5nUmF0ZSIsIm9wdGlvbnMiLCJtZWFuIiwibWFnbml0dWRlIiwic3RkRGV2IiwiY3Jvc3NpbmdzIiwicGVyaW9kTWVhbiIsInBlcmlvZFN0ZERldiIsInRocmVzaCIsImZyYW1lIiwiaW5wdXRGcmFtZSIsIl9tYWluQWxnb3JpdGhtIiwiYW1wbGl0dWRlIiwiY29uc29sZSIsImxvZyIsImxlbmd0aCIsImZyZXF1ZW5jeSIsInBlcmlvZGljaXR5IiwiTWF0aCIsInNxcnQiLCJtaW4iLCJtYXgiLCJpIiwidmFsIiwicHJldkRlbHRhIiwiZGVsdGEiLCJwdXNoIiwiZGVsdGFQIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOztBQUVBLElBQU1BLFdBQVc7QUFDZkMsa0JBQWdCO0FBREQsQ0FBakI7O0lBSU1DLGdCO0FBRUosOEJBQTBCO0FBQUEsUUFBZEMsT0FBYyx1RUFBSixFQUFJO0FBQUE7O0FBQ3hCLDBCQUFjQSxPQUFkLEVBQXVCSCxRQUF2Qjs7QUFFQSxTQUFLSSxJQUFMLEdBQVksQ0FBWjtBQUNBLFNBQUtDLFNBQUwsR0FBaUIsQ0FBakI7QUFDQSxTQUFLQyxNQUFMLEdBQWMsQ0FBZDtBQUNBLFNBQUtDLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCLENBQWxCO0FBQ0EsU0FBS0MsWUFBTCxHQUFvQixDQUFwQjs7QUFFQSxTQUFLUixjQUFMLEdBQXNCRSxRQUFRRixjQUE5Qjs7QUFFQTtBQUNEOzs7O3NDQUVpQlMsTSxFQUFRO0FBQ3hCLFdBQUtULGNBQUwsR0FBc0JTLE1BQXRCO0FBQ0Q7O0FBRUQ7Ozs7NEJBQ1FDLEssRUFBTztBQUNiLFdBQUtDLFVBQUwsR0FBa0JELEtBQWxCOztBQUVBLFdBQUtFLGNBQUw7O0FBRUE7QUFDQSxXQUFLQyxTQUFMLEdBQWlCLEtBQUtSLE1B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SWdCLE1BQUksQ0FBYixFQUFnQkEsTUFBSSxLQUFLakIsU0FBTCxDQUFlVSxNQUFuQyxFQUEyQ08sS0FBM0MsRUFBZ0Q7QUFDOUMsYUFBS2hCLFVBQUwsSUFBbUIsS0FBS0QsU0FBTCxDQUFlaUIsR0FBZixJQUFvQixLQUFLakIsU0FBTCxDQUFlaUIsTUFBSSxDQUFuQixDQUF2QztBQUNEO0FBQ0Q7QUFDQSxXQUFLaEIsVUFBTCxJQUFvQixLQUFLRCxTQUFMLENBQWVVLE1BQWYsR0FBd0IsQ0FBNUM7O0FBRUE7QUFDQSxXQUFLUixZQUFMLEdBQW9CLENBQXBCO0FBQ0EsV0FBSyxJQUFJZSxNQUFJLENBQWIsRUFBZ0JBLE1BQUksS0FBS2pCLFNBQUwsQ0FBZVUsTUFBbkMsRUFBMkNPLEtBQTNDLEVBQWdEO0FBQzlDLFlBQUlLLFNBQVUsS0FBS3RCLFNBQUwsQ0FBZWlCLEdBQWYsSUFBb0IsS0FBS2pCLFNBQUwsQ0FBZWlCLE1BQUksQ0FBbkIsQ0FBcEIsR0FBNEMsS0FBS2hCLFVBQS9EO0FBQ0EsYUFBS0MsWUFBTCxJQUFxQm9CLFNBQVNBLE1BQTlCO0FBQ0Q7QUFDRCxVQUFJLEtBQUt0QixTQUFMLENBQWVVLE1BQWYsR0FBd0IsQ0FBNUIsRUFBK0I7QUFDN0IsYUFBS1IsWUFBTCxHQUFvQlcsS0FBS0MsSUFBTCxDQUFVLEtBQUtaLFlBQUwsSUFBcUIsS0FBS0YsU0FBTCxDQUFlVSxNQUFmLEdBQXdCLENBQTdDLENBQVYsQ0FBcEI7QUFDRDtBQUNGOzs7OztrQkFHWWYsZ0IiLCJmaWxlIjoiemVyby1jcm9zc2luZy1yYXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIEB0b2RvIDogYWRkIGludGVncmF0ZWQgYnVmZmVyIGhlcmUgZm9yIG9wdGltaXplZCBzdGF0aXN0aWNzIGNvbXB1dGluZyAqL1xuXG5jb25zdCBkZWZhdWx0cyA9IHtcbiAgbm9pc2VUaHJlc2hvbGQ6IDAuMVxufTtcblxuY2xhc3MgWmVyb0Nyb3NzaW5nUmF0ZSB7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBkZWZhdWx0cyk7XG5cbiAgICB0aGlzLm1lYW4gPSAwO1xuICAgIHRoaXMubWFnbml0dWRlID0gMDtcbiAgICB0aGlzLnN0ZERldiA9IDA7XG4gICAgdGhpcy5jcm9zc2luZ3MgPSBbXTtcbiAgICB0aGlzLnBlcmlvZE1lYW4gPSAwO1xuICAgIHRoaXMucGVyaW9kU3RkRGV2ID0gMDtcblxuICAgIHRoaXMubm9pc2VUaHJlc2hvbGQgPSBvcHRpb25zLm5vaXNlVGhyZXNob2xkO1xuXG4gICAgLy90aGlzLm1heEZyZXEgPSB0aGlzLmlucHV0UmF0ZSAvIDAuNTsgICAgXG4gIH1cblxuICBzZXROb2lzZVRocmVzaG9sZCh0aHJlc2gpIHtcbiAgICB0aGlzLm5vaXNlVGhyZXNob2xkID0gdGhyZXNoO1xuICB9XG5cbiAgLy8gY29tcHV0ZSBtYWduaXR1ZGUsIHplcm8gY3Jvc3NpbmcgcmF0ZSwgYW5kIHBlcmlvZGljaXR5XG4gIHByb2Nlc3MoZnJhbWUpIHtcbiAgICB0aGlzLmlucHV0RnJhbWUgPSBmcmFtZTtcblxuICAgIHRoaXMuX21haW5BbGdvcml0aG0oKTtcblxuICAgIC8vIFRPRE86IGltcHJvdmUgdGhpcyAoMi4wIGlzIGVtcGlyaWNhbCBmYWN0b3IgYmVjYXVzZSB3ZSBkb24ndCBrbm93IGEgcHJpb3JpIHNlbnNvciByYW5nZSlcbiAgICB0aGlzLmFtcGxpdHVkZSA9IHRoaXMuc3RkRGV2ICogMi4wO1xuXG4gICAgY29uc29sZS5sb2codGhpcy5jcm9zc2luZ3MubGVuZ3RoKTtcbiAgICAvLyBub3QgdXNlZCBhbnltb3JlIChyZW1vdmUgPylcbiAgICAvLyB0aGlzLmZyZXF1ZW5jeSA9IE1hdGguc3FydCh0aGlzLmNyb3NzaW5ncy5sZW5ndGggKiAyLjAgLyB0aGlzLmlucHV0RnJhbWUubGVuZ3RoKTsgLy8gc3FydCdlZCBub3JtYWxpemVkIGJ5IG55cXVpc3QgZnJlcVxuXG4gICAgLy8gdGhpcyBvbmUgaXMgd29ya2luZyB3dGggb25lIGRpcmVjdGlvbiBjcm9zc2luZ3MgZGV0ZWN0aW9uIHZlcnNpb25cbiAgICAvLyB0aGlzLmZyZXF1ZW5jeSA9IHRoaXMuY3Jvc3NpbmdzLmxlbmd0aCAqIDIuMCAvIHRoaXMuaW5wdXRGcmFtZS5sZW5ndGg7IC8vIG5vcm1hbGl6ZWQgYnkgbnlxdWlzdCBmcmVxXG5cbiAgICAvLyB0aGlzIG9uZSBpcyB3b3JraW5nIHdpdGggdHdvIGRpcmVjdGlvbiBjcm9zc2luZ3MgZGV0ZWN0aW9uIHZlcnNpb25cbiAgICB0aGlzLmZyZXF1ZW5jeSA9IHRoaXMuY3Jvc3NpbmdzLmxlbmd0aCAvICh0aGlzLmlucHV0RnJhbWUubGVuZ3RoIC0gMSk7IC8vIGJld2FyZSBvZiBkaXZpc2lvbiBieSB6ZXJvXG4gICAgXG4gICAgaWYodGhpcy5jcm9zc2luZ3MubGVuZ3RoID4gMikge1xuICAgICAgLy9sZXQgY2xpcCA9IHRoaXMucGVyaW9kU3RkRGV2ICogNSAvIHRoaXMuaW5wdXRGcmFtZS5sZW5ndGg7XG4gICAgICAvL2NsaXAgPSBNYXRoLm1pbihjbGlwLCAxLik7XG4gICAgICAvL3RoaXMucGVyaW9kaWNpdHkgPSAxLjAgLSBNYXRoLnNxcnQoY2xpcCk7XG5cbiAgICAgIC8vIHBlcmlvZGljaXR5IGlzIG5vcm1hbGl6ZWQgYmFzZWQgb24gaW5wdXQgZnJhbWUgc2l6ZS5cbiAgICAgIHRoaXMucGVyaW9kaWNpdHkgPSAxLjAgLSBNYXRoLnNxcnQodGhpcy5wZXJpb2RTdGREZXYgLyB0aGlzLmlucHV0RnJhbWUubGVuZ3RoKTtcbiAgICAgIC8vdGhpcy5wZXJpb2RpY2l0eSA9IDEuMCAtIE1hdGgucG93KHRoaXMucGVyaW9kU3RkRGV2IC8gdGhpcy5pbnB1dEZyYW1lLmxlbmd0aCwgMC43KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wZXJpb2RpY2l0eSA9IDA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFtcGxpdHVkZTogdGhpcy5hbXBsaXR1ZGUsXG4gICAgICBmcmVxdWVuY3k6IHRoaXMuZnJlcXVlbmN5LFxuICAgICAgcGVyaW9kaWNpdHk6IHRoaXMucGVyaW9kaWNpdHlcbiAgICB9O1xuICB9XG5cbiAgX21haW5BbGdvcml0aG0oKSB7XG5cbiAgICAvLyBjb21wdXRlIG1pbiwgbWF4LCBtZWFuIGFuZCBtYWduaXR1ZGVcbiAgICBsZXQgbWluLCBtYXg7XG4gICAgbWluID0gbWF4ID0gdGhpcy5pbnB1dEZyYW1lWzBdO1xuICAgIHRoaXMubWVhbiA9IDA7XG4gICAgdGhpcy5tYWduaXR1ZGUgPSAwO1xuICAgIGZvcihsZXQgaSBpbiB0aGlzLmlucHV0RnJhbWUpIHtcbiAgICAgIGxldCB2YWwgPSB0aGlzLmlucHV0RnJhbWVbaV07XG4gICAgICB0aGlzLm1hZ25pdHVkZSArPSB2YWwgKiB2YWw7XG4gICAgICB0aGlzLm1lYW4gKz0gdmFsO1xuICAgICAgaWYodmFsID4gbWF4KSB7XG4gICAgICAgIG1heCA9IHZhbDtcbiAgICAgIH0gZWxzZSBpZih2YWwgPCBtaW4pIHtcbiAgICAgICAgbWluID0gdmFsO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBUT0RPIDogbW9yZSB0ZXN0cyB0byBkZXRlcm1pbmUgd2hpY2ggbWVhbiAodHJ1ZSBtZWFuIG9yIChtYXgtbWluKS8yKSBpcyB0aGUgYmVzdFxuICAgIC8vdGhpcy5tZWFuIC89IHRoaXMuaW5wdXRGcmFtZS5sZW5ndGg7XG4gICAgdGhpcy5tZWFuID0gbWluICsgKG1heCAtIG1pbikgKiAwLjU7XG5cbiAgICB0aGlzLm1hZ25pdHVkZSAvPSB0aGlzLmlucHV0RnJhbWUubGVuZ3RoO1xuICAgIHRoaXMubWFnbml0dWRlID0gTWF0aC5zcXJ0KHRoaXMubWFnbml0dWRlKTtcblxuICAgIC8vIGNvbXB1dGUgc2lnbmFsIHN0ZERldiBhbmQgbnVtYmVyIG9mIG1lYW4tY3Jvc3NpbmdzXG4gICAgLy8gZGVzY2VuZGluZyBtZWFuIGNyb3NzaW5nIGlzIHVzZWQgaGVyZVxuICAgIC8vIG5vdyB1c2luZyBhc2NlbmRpbmcgQU5EIGRlc2NlbmRpbmcgZm9yIHRlc3QgLi4uXG4gICAgdGhpcy5jcm9zc2luZ3MgPSBbXTtcbiAgICB0aGlzLnN0ZERldiA9IDA7XG4gICAgbGV0IHByZXZEZWx0YSA9IHRoaXMuaW5wdXRGcmFtZVswXSAtIHRoaXMubWVhbjtcbiAgICAvL2ZvciAobGV0IGkgaW4gdGhpcy5pbnB1dEZyYW1lKSB7XG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCB0aGlzLmlucHV0RnJhbWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBkZWx0YSA9IHRoaXMuaW5wdXRGcmFtZVtpXSAtIHRoaXMubWVhbjtcbiAgICAgIHRoaXMuc3RkRGV2ICs9IGRlbHRhICogZGVsdGE7XG4gICAgICBpZiAocHJldkRlbHRhID4gdGhpcy5ub2lzZVRocmVzaG9sZCAmJiBkZWx0YSA8IHRoaXMubm9pc2VUaHJlc2hvbGQpIHtcbiAgICAgICAgdGhpcy5jcm9zc2luZ3MucHVzaChpKTtcbiAgICAgIH0gXG4gICAgICBlbHNlIGlmIChwcmV2RGVsdGEgPCB0aGlzLm5vaXNlVGhyZXNob2xkICYmIGRlbHRhID4gdGhpcy5ub2lzZVRocmVzaG9sZCkge1xuICAgICAgICB0aGlzLmNyb3NzaW5ncy5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcHJldkRlbHRhID0gZGVsdGE7XG4gICAgfVxuICAgIHRoaXMuc3RkRGV2IC89ICh0aGlzLmlucHV0RnJhbWUubGVuZ3RoIC0gMSk7XG4gICAgdGhpcy5zdGREZXYgPSBNYXRoLnNxcnQodGhpcy5zdGREZXYpO1xuXG4gICAgLy8gY29tcHV0ZSBtZWFuIG9mIGRlbHRhLVQgYmV0d2VlbiBjcm9zc2luZ3NcbiAgICB0aGlzLnBlcmlvZE1lYW4gPSAwO1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdGhpcy5jcm9zc2luZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMucGVyaW9kTWVhbiArPSB0aGlzLmNyb3NzaW5nc1tpXSAtIHRoaXMuY3Jvc3NpbmdzW2kgLSAxXTtcbiAgICB9XG4gICAgLy8gaWYgd2UgaGF2ZSBhIE5hTiBoZXJlIHdlIGRvbid0IGNhcmUgYXMgd2Ugd29uJ3QgdXNlIHRoaXMucGVyaW9kTWVhbiBiZWxvd1xuICAgIHRoaXMucGVyaW9kTWVhbiAvPSAodGhpcy5jcm9zc2luZ3MubGVuZ3RoIC0gMSk7XG5cbiAgICAvLyBjb21wdXRlIHN0ZERldiBvZiBkZWx0YS1UIGJldHdlZW4gY3Jvc3NpbmdzXG4gICAgdGhpcy5wZXJpb2RTdGREZXYgPSAwO1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdGhpcy5jcm9zc2luZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBkZWx0YVAgPSAodGhpcy5jcm9zc2luZ3NbaV0gLSB0aGlzLmNyb3NzaW5nc1tpIC0gMV0gLSB0aGlzLnBlcmlvZE1lYW4pXG4gICAgICB0aGlzLnBlcmlvZFN0ZERldiArPSBkZWx0YVAgKiBkZWx0YVA7XG4gICAgfVxuICAgIGlmICh0aGlzLmNyb3NzaW5ncy5sZW5ndGggPiAyKSB7XG4gICAgICB0aGlzLnBlcmlvZFN0ZERldiA9IE1hdGguc3FydCh0aGlzLnBlcmlvZFN0ZERldiAvICh0aGlzLmNyb3NzaW5ncy5sZW5ndGggLSAyKSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFplcm9Dcm9zc2luZ1JhdGU7Il19
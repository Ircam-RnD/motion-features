'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a function that returns time in seconds according to the current
 * environnement (node or browser).
 * If running in node the time rely on `process.hrtime`, while if in the browser
 * it is provided by the `Date` object.
 *
 * @return {Function}
 * @private
 */
function getTimeFunction() {
  if (typeof window === 'undefined') {
    // assume node
    return function () {
      var t = process.hrtime();
      return t[0] + t[1] * 1e-9;
    };
  } else {
    // browser
    if (window.performance === 'undefined') {
      if (Date.now === 'undefined') {
        return function () {
          return new Date.getTime();
        };
      } else {
        return function () {
          return Date.now();
        };
      }
    } else {
      return function () {
        return window.performance.now();
      };
    }
  }
}

var perfNow = getTimeFunction();

/**
 * @todo typedef constructor argument
 */

/*
 * // es5 with browserify :
 * var motionFeatures = require('motion-features');
 * var mf = new motionFeatures.MotionFeatures({ descriptors: ['accIntensity', 'kick'] });
 *
 * // loading from a "script" tag :
 * var mf = new motionFeatures.MotionFeatures({ descriptors: ['accIntensity', 'kick'] });
 */

/**
 * Class computing the descriptors from accelerometer and gyroscope data.
 * <br />
 * es6 + browserify example :
 * ```JavaScript
 * import { MotionFeatures } from 'motion-features'; 
 * const mf = new MotionFeatures({ descriptors: ['accIntensity', 'kick'] });
 *
 * // then, on each motion event :
 * mf.setAccelerometer(x, y, z);
 * mf.setGyroscope(alpha, beta, gamma);
 * mf.update(function(err, res) {
 *   if (err === null) {
 *     // do something with res
 *   }
 * });
 * ```
 * @class
 */

var MotionFeatures = function () {

  /**
   * @param {Object} initObject - object containing an array of the
   * required descriptors and some variables used to compute the descriptors
   * that you might want to change (for example if the browser is chrome you
   * might want to set `gyrIsInDegrees` to false because it's the case on some
   * versions, or you might want to change some thresholds).
   * See the code for more details.
   *
   * @todo use typedef to describe the configuration parameters
   */
  function MotionFeatures() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (0, _classCallCheck3.default)(this, MotionFeatures);

    var defaults = {
      descriptors: ['accRaw', 'gyrRaw', 'accIntensity', 'gyrIntensity', 'freefall', 'kick', 'shake', 'spin', 'still'],

      gyrIsInDegrees: true,

      accIntensityParam1: 0.8,
      accIntensityParam2: 0.1,

      gyrIntensityParam1: 0.9,
      gyrIntensityParam2: 1,

      freefallAccThresh: 0.15,
      freefallGyrThresh: 750,
      freefallGyrDeltaThresh: 40,

      kickThresh: 0.01,
      kickSpeedGate: 200,
      kickMedianFiltersize: 9,
      kickCallback: null,

      shakeThresh: 0.1,
      shakeWindowSize: 200,
      shakeSlideFactor: 10,

      spinThresh: 200,

      stillThresh: 5000,
      stillSlideFactor: 5

    };

    this._params = (0, _assign2.default)({}, defaults, options);
    //console.log(this._params.descriptors);

    this._methods = {
      accRaw: this._updateAccRaw.bind(this),
      gyrRaw: this._updateGyrRaw.bind(this),
      accIntensity: this._updateAccIntensity.bind(this),
      gyrIntensity: this._updateGyrIntensity.bind(this),
      freefall: this._updateFreefall.bind(this),
      kick: this._updateKick.bind(this),
      shake: this._updateShake.bind(this),
      spin: this._updateSpin.bind(this),
      still: this._updateStill.bind(this)
    };

    this._kickCallback = this._params.kickCallback;

    this.acc = [0, 0, 0];
    this.gyr = [0, 0, 0];

    //============================================================ acc intensity
    this._accLast = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    this._accIntensityLast = [[0, 0], [0, 0], [0, 0]];
    this._accIntensity = [0, 0, 0];
    this._accIntensityNorm = 0;

    //================================================================= freefall
    this._accNorm = 0;
    this._gyrDelta = [0, 0, 0];
    this._gyrNorm = 0;
    this._gyrDeltaNorm = 0;
    this._fallBegin = perfNow();
    this._fallEnd = perfNow();
    this._fallDuration = 0;
    this._isFalling = false;

    //============================================================ gyr intensity
    this._gyrLast = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    this._gyrIntensityLast = [[0, 0], [0, 0], [0, 0]];
    this._gyrIntensity = [0, 0, 0];
    this._gyrIntensityNorm = 0;

    //===================================================================== kick
    this._kickIntensity = 0;
    this._lastKick = 0;
    this._isKicking = false;
    this._medianValues = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._medianLinking = [3, 4, 1, 5, 7, 8, 0, 2, 6];
    this._medianFifo = [6, 2, 7, 0, 1, 3, 8, 4, 5];
    this._i1 = 0;
    this._i2 = 0;
    this._i3 = 0;
    this._accIntensityNormMedian = 0;

    //==================================================================== shake
    this._accDelta = [0, 0, 0];
    this._shakeWindow = [new Array(this._params.shakeWindowSize), new Array(this._params.shakeWindowSize), new Array(this._params.shakeWindowSize)];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < this._params.shakeWindowSize; j++) {
        this._shakeWindow[i][j] = 0;
      }
    }
    this._shakeNb = [0, 0, 0];
    this._shakingRaw = 0;
    this._shakeSlidePrev = 0;
    this._shaking = 0;

    //===================================================================== spin
    this._spinBegin = perfNow();
    this._spinEnd = perfNow();
    this._spinDuration = 0;
    this._isSpinning = false;

    //==================================================================== still
    this._stillCrossProd = 0;
    this._stillSlide = 0;
    this._stillSlidePrev = 0;
    this._isStill = false;

    this._loopIndexPeriod = this._lcm(this._lcm(this._lcm(2, 3), this._params.kickMedianFiltersize), this._params.shakeWindowSize);
    //console.log(this._loopIndexPeriod);
    this._loopIndex = 0;
  }

  //========== interface =========//

  /**
   * Update configuration parameters (except descriptors list)
   * @param {Object} params - a subset of the constructor's parameters
   */


  (0, _createClass3.default)(MotionFeatures, [{
    key: 'updateParams',
    value: function updateParams() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      for (var key in params) {
        if (key !== 'descriptors') {
          this._params[key] = params[key];
        }
      }
    }

    /**
     * Sets the current accelerometer values.
     * @param {Number} x - the accelerometer's x value
     * @param {Number} y - the accelerometer's y value
     * @param {Number} z - the accelerometer's z value
     */

  }, {
    key: 'setAccelerometer',
    value: function setAccelerometer(x) {
      var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var z = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

      this.acc[0] = x;
      this.acc[1] = y;
      this.acc[2] = z;
    }

    /**
     * Sets the current gyroscope values.
     * @param {Number} x - the gyroscope's x value
     * @param {Number} y - the gyroscope's y value
     * @param {Number} z - the gyroscope's z value
     */

  }, {
    key: 'setGyroscope',
    value: function setGyroscope(x) {
      var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var z = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

      this.gyr[0] = x;
      this.gyr[1] = y;
      this.gyr[2] = z;
      if (this._params.gyrIsInDegrees) {
        for (var i = 0; i < 3; i++) {
          this.gyr[i] *= 2 * Math.PI / 360.;
        }
      }
    }

    /**
     * Intensity of the movement sensed by an accelerometer.
     * @typedef accIntensity
     * @type {Object}
     * @property {Number} norm - the global energy computed on all dimensions.
     * @property {Number} x - the energy in the x (first) dimension.
     * @property {Number} y - the energy in the y (second) dimension.
     * @property {Number} z - the energy in the z (third) dimension.
     */

    /**
     * Intensity of the movement sensed by a gyroscope.
     * @typedef gyrIntensity
     * @type {Object}
     * @property {Number} norm - the global energy computed on all dimensions.
     * @property {Number} x - the energy in the x (first) dimension.
     * @property {Number} y - the energy in the y (second) dimension.
     * @property {Number} z - the energy in the z (third) dimension.
     */

    /**
     * Information about the free falling state of the sensor.
     * @typedef freefall
     * @type {Object}
     * @property {Number} accNorm - the norm of the acceleration.
     * @property {Boolean} falling - true if the sensor is free falling, false otherwise.
     * @property {Number} duration - the duration of the free falling since its beginning.
     */

    /**
     * Impulse / hit movement detection information.
     * @typedef kick
     * @type {Object}
     * @property {Number} intensity - the current intensity of the "kick" gesture.
     * @property {Boolean} kicking - true if a "kick" gesture is being detected, false otherwise.
     */

    /**
     * Shake movement detection information.
     * @typedef shake
     * @type {Object}
     * @property {Number} shaking - the current amount of "shakiness".
     */

    /**
     * Information about the spinning state of the sensor.
     * @typedef spin
     * @type {Object}
     * @property {Boolean} spinning - true if the sensor is spinning, false otherwise.
     * @property {Number} duration - the duration of the spinning since its beginning.
     * @property {Number} gyrNorm - the norm of the rotation speed.
     */

    /**
     * Information about the stillness of the sensor.
     * @typedef still
     * @type {Object}
     * @property {Boolean} still - true if the sensor is still, false otherwise.
     * @property {Number} slide - the original value thresholded to determine stillness.
     */

    /**
     * Computed features.
     * @typedef features
     * @type {Object}
     * @property {accIntensity} accIntensity - Intensity of the movement sensed by an accelerometer.
     * @property {gyrIntensity} gyrIntensity - Intensity of the movement sensed by a gyroscope.
     * @property {freefall} freefall - Information about the free falling state of the sensor.
     * @property {kick} kick - Impulse / hit movement detection information.
     * @property {shake} shake - Shake movement detection information.
     * @property {spin} spin - Information about the spinning state of the sensor.
     * @property {still} still - Information about the stillness of the sensor.
     */

    /**
     * Callback handling the features.
     * @callback featuresCallback
     * @param {String} err - Description of a potential error.
     * @param {features} res - Object holding the feature values.
     */

    /**
     * Triggers computation of the descriptors from the current sensor values and
     * pass the results to a callback
     * @param {featuresCallback} callback - The callback handling the last computed descriptors
     * @returns {features} features - Return these computed descriptors anyway
     */

  }, {
    key: 'update',
    value: function update() {
      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      // DEAL WITH this._elapsedTime
      this._elapsedTime = perfNow();
      // is this one used by several features ?
      this._accNorm = this._magnitude3D(this.acc);
      // this one needs be here because used by freefall AND spin
      this._gyrNorm = this._magnitude3D(this.gyr);

      var err = null;
      var res = null;
      try {
        res = {};
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = (0, _getIterator3.default)(this._params.descriptors), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var key = _step.value;

            if (this._methods[key]) {
              this._methods[key](res);
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      } catch (e) {
        err = e;
      }

      this._loopIndex = (this._loopIndex + 1) % this._loopIndexPeriod;

      if (callback) {
        callback(err, res);
      }
      return res;
    }

    //==========================================================================//
    //====================== specific descriptors computing ====================//
    //==========================================================================//

    /** @private */

  }, {
    key: '_updateAccRaw',
    value: function _updateAccRaw(res) {
      res.accRaw = {
        x: this.acc[0],
        y: this.acc[1],
        z: this.acc[2]
      };
    }

    /** @private */

  }, {
    key: '_updateGyrRaw',
    value: function _updateGyrRaw(res) {
      res.gyrRaw = {
        x: this.gyr[0],
        y: this.gyr[1],
        z: this.gyr[2]
      };
    }

    //============================================================== acc intensity
    /** @private */

  }, {
    key: '_updateAccIntensity',
    value: function _updateAccIntensity(res) {
      this._accIntensityNorm = 0;

      for (var i = 0; i < 3; i++) {
        this._accLast[i][this._loopIndex % 3] = this.acc[i];

        this._accIntensity[i] = this._intensity1D(this.acc[i], this._accLast[i][(this._loopIndex + 1) % 3], this._accIntensityLast[i][(this._loopIndex + 1) % 2], this._params.accIntensityParam1, this._params.accIntensityParam2, 1);

        this._accIntensityLast[i][this._loopIndex % 2] = this._accIntensity[i];

        this._accIntensityNorm += this._accIntensity[i];
      }

      res.accIntensity = {
        norm: this._accIntensityNorm,
        x: this._accIntensity[0],
        y: this._accIntensity[1],
        z: this._accIntensity[2]
      };
    }

    //============================================================== gyr intensity
    /** @private */

  }, {
    key: '_updateGyrIntensity',
    value: function _updateGyrIntensity(res) {
      this._gyrIntensityNorm = 0;

      for (var i = 0; i < 3; i++) {
        this._gyrLast[i][this._loopIndex % 3] = this.gyr[i];

        this._gyrIntensity[i] = this._intensity1D(this.gyr[i], this._gyrLast[i][(this._loopIndex + 1) % 3], this._gyrIntensityLast[i][(this._loopIndex + 1) % 2], this._params.gyrIntensityParam1, this._params.gyrIntensityParam2, 1);

        this._gyrIntensityLast[i][this._loopIndex % 2] = this._gyrIntensity[i];

        this._gyrIntensityNorm += this._gyrIntensity[i];
      }

      res.gyrIntensity = {
        norm: this._gyrIntensityNorm,
        x: this._gyrIntensity[0],
        y: this._gyrIntensity[1],
        z: this._gyrIntensity[2]
      };
    }

    //=================================================================== freefall
    /** @private */

  }, {
    key: '_updateFreefall',
    value: function _updateFreefall(res) {
      for (var i = 0; i < 3; i++) {
        this._gyrDelta[i] = this._delta(this._gyrLast[i][(this._loopIndex + 1) % 3], this.gyr[i], 1);
      }

      this._gyrDeltaNorm = this._magnitude3D(this._gyrDelta);

      if (this._accNorm < this._params.freefallAccThresh || this._gyrNorm > this._params.freefallGyrThresh && this._gyrDeltaNorm < this._params.freefallGyrDeltaThresh) {
        if (!this._isFalling) {
          this._isFalling = true;
          this._fallBegin = perfNow();
        }
        this._fallEnd = perfNow();
      } else {
        if (this._isFalling) {
          this._isFalling = false;
        }
      }
      this._fallDuration = this._fallEnd - this._fallBegin;

      res.freefall = {
        accNorm: this._accNorm,
        falling: this._isFalling,
        duration: this._fallDuration
      };
    }

    //======================================================================= kick
    /** @private */

  }, {
    key: '_updateKick',
    value: function _updateKick(res) {
      this._i3 = this._loopIndex % this._params.kickMedianFiltersize;
      this._i1 = this._medianFifo[this._i3];
      this._i2 = 1;

      if (this._i1 < this._params.kickMedianFiltersize - 1 && this._accIntensityNorm > this._medianValues[this._i1 + this._i2]) {
        // check right
        while (this._i1 + this._i2 < this.kickMedianFiltersize && this._accIntensityNorm > this._medianValues[this._i1 + this._i2]) {
          this._medianFifo[this._medianLinking[this._i1 + this._i2]] = this._medianFifo[this._medianLinking[this._i1 + this._i2]] - 1;
          this._medianValues[this._i1 + this._i2 - 1] = this._medianValues[this._i1 + this._i2];
          this._medianLinking[this._i1 + this._i2 - 1] = this._medianLinking[this._i1 + this._i2];
          this._i2++;
        }
        this._medianValues[this._i1 + this._i2 - 1] = this._accIntensityNorm;
        this._medianLinking[this._i1 + this._i2 - 1] = this._i3;
        this._medianFifo[this._i3] = this._i1 + this._i2 - 1;
      } else {
        // check left
        while (this._i2 < this._i1 + 1 && this._accIntensityNorm < this._medianValues[this._i1 - this._i2]) {
          this._medianFifo[this._medianLinking[this._i1 - this._i2]] = this._medianFifo[this._medianLinking[this._i1 - this._i2]] + 1;
          this._medianValues[this._i1 - this._i2 + 1] = this._medianValues[this._i1 - this._i2];
          this._medianLinking[this._i1 - this._i2 + 1] = this._medianLinking[this._i1 - this._i2];
          this._i2++;
        }
        this._medianValues[this._i1 - this._i2 + 1] = this._accIntensityNorm;
        this._medianLinking[this._i1 - this._i2 + 1] = this._i3;
        this._medianFifo[this._i3] = this._i1 - this._i2 + 1;
      }

      // compare current intensity norm with previous median value
      if (this._accIntensityNorm - this._accIntensityNormMedian > this._params.kickThresh) {
        if (this._isKicking) {
          if (this._kickIntensity < this._accIntensityNorm) {
            this._kickIntensity = this._accIntensityNorm;
          }
          if (this._kickCallback) {
            this._kickCallback({ state: 'middle', intensity: this._kickIntensity });
          }
        } else {
          this._isKicking = true;
          this._kickIntensity = this._accIntensityNorm;
          this._lastKick = this._elapsedTime;
          if (this._kickCallback) {
            this._kickCallback({ state: 'start', intensity: this._kickIntensity });
          }
        }
      } else {
        if (this._elapsedTime - this._lastKick > this._params.kickSpeedGate) {
          if (this._isKicking && this._kickCallback) {
            this._kickCallback({ state: 'stop', intensity: this._kickIntensity });
          }
          this._isKicking = false;
        }
      }

      this._accIntensityNormMedian = this._medianValues[Math.ceil(this._params.kickMedianFiltersize * 0.5)];

      res.kick = {
        intensity: this._kickIntensity,
        kicking: this._isKicking
      };
    }

    //====================================================================== shake
    /** @private */

  }, {
    key: '_updateShake',
    value: function _updateShake(res) {
      for (var i = 0; i < 3; i++) {
        this._accDelta[i] = this._delta(this._accLast[i][(this._loopIndex + 1) % 3], this.acc[i], 1);
      }

      for (var _i = 0; _i < 3; _i++) {
        if (this._shakeWindow[_i][this._loopIndex % this._params.shakeWindowSize]) {
          this._shakeNb[_i]--;
        }
        if (this._accDelta[_i] > this._params.shakeThresh) {
          this._shakeWindow[_i][this._loopIndex % this._params.shakeWindowSize] = 1;
          this._shakeNb[_i]++;
        } else {
          this._shakeWindow[_i][this._loopIndex % this._params.shakeWindowSize] = 0;
        }
      }

      this._shakingRaw = this._magnitude3D(this._shakeNb) / this._params.shakeWindowSize;
      this._shakeSlidePrev = this._shaking;
      this._shaking = this._slide(this._shakeSlidePrev, this._shakingRaw, this._params.shakeSlideFactor);

      res.shake = {
        shaking: this._shaking
      };
    }

    //======================================================================= spin
    /** @private */

  }, {
    key: '_updateSpin',
    value: function _updateSpin(res) {
      if (this._gyrNorm > this._params.spinThresh) {
        if (!this._isSpinning) {
          this._isSpinning = true;
          this._spinBegin = perfNow();
        }
        this._spinEnd = perfNow();
      } else if (this._isSpinning) {
        this._isSpinning = false;
      }
      this._spinDuration = this._spinEnd - this._spinBegin;

      res.spin = {
        spinning: this._isSpinning,
        duration: this._spinDuration,
        gyrNorm: this._gyrNorm
      };
    }

    //====================================================================== still
    /** @private */

  }, {
    key: '_updateStill',
    value: function _updateStill(res) {
      this._stillCrossProd = this._stillCrossProduct(this.gyr);
      this._stillSlidePrev = this._stillSlide;
      this._stillSlide = this._slide(this._stillSlidePrev, this._stillCrossProd, this._params.stillSlideFactor);

      if (this._stillSlide > this._params.stillThresh) {
        this._isStill = false;
      } else {
        this._isStill = true;
      }

      res.still = {
        still: this._isStill,
        slide: this._stillSlide
      };
    }

    //==========================================================================//
    //================================ UTILITIES ===============================//
    //==========================================================================//
    /** @private */

  }, {
    key: '_delta',
    value: function _delta(prev, next, dt) {
      return (next - prev) / (2 * dt);
    }

    /** @private */

  }, {
    key: '_intensity1D',
    value: function _intensity1D(nextX, prevX, prevIntensity, param1, param2, dt) {
      var dx = this._delta(nextX, prevX, dt); //(nextX - prevX) / (2 * dt);
      return param2 * dx * dx + param1 * prevIntensity;
    }

    /** @private */

  }, {
    key: '_magnitude3D',
    value: function _magnitude3D(xyzArray) {
      return Math.sqrt(xyzArray[0] * xyzArray[0] + xyzArray[1] * xyzArray[1] + xyzArray[2] * xyzArray[2]);
    }

    /** @private */

  }, {
    key: '_lcm',
    value: function _lcm(a, b) {
      var a1 = a,
          b1 = b;

      while (a1 != b1) {
        if (a1 < b1) {
          a1 += a;
        } else {
          b1 += b;
        }
      }

      return a1;
    }

    /** @private */

  }, {
    key: '_slide',
    value: function _slide(prevSlide, currentVal, slideFactor) {
      return prevSlide + (currentVal - prevSlide) / slideFactor;
    }

    /** @private */

  }, {
    key: '_stillCrossProduct',
    value: function _stillCrossProduct(xyzArray) {
      return (xyzArray[1] - xyzArray[2]) * (xyzArray[1] - xyzArray[2]) + (xyzArray[0] - xyzArray[1]) * (xyzArray[0] - xyzArray[1]) + (xyzArray[2] - xyzArray[0]) * (xyzArray[2] - xyzArray[0]);
    }
  }, {
    key: '_zeroCrossingRate',
    value: function _zeroCrossingRate(val) {
      var power = void 0,
          frequency = void 0,
          periodicity = void 0;

      return [power, frequency, periodicity];
    }
  }]);
  return MotionFeatures;
}();

exports.default = MotionFeatures;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vdGlvbi1mZWF0dXJlcy5qcyJdLCJuYW1lcyI6WyJnZXRUaW1lRnVuY3Rpb24iLCJ3aW5kb3ciLCJ0IiwicHJvY2VzcyIsImhydGltZSIsInBlcmZvcm1hbmNlIiwiRGF0ZSIsIm5vdyIsImdldFRpbWUiLCJwZXJmTm93IiwiTW90aW9uRmVhdHVyZXMiLCJvcHRpb25zIiwiZGVmYXVsdHMiLCJkZXNjcmlwdG9ycyIsImd5cklzSW5EZWdyZWVzIiwiYWNjSW50ZW5zaXR5UGFyYW0xIiwiYWNjSW50ZW5zaXR5UGFyYW0yIiwiZ3lySW50ZW5zaXR5UGFyYW0xIiwiZ3lySW50ZW5zaXR5UGFyYW0yIiwiZnJlZWZhbGxBY2NUaHJlc2giLCJmcmVlZmFsbEd5clRocmVzaCIsImZyZWVmYWxsR3lyRGVsdGFUaHJlc2giLCJraWNrVGhyZXNoIiwia2lja1NwZWVkR2F0ZSIsImtpY2tNZWRpYW5GaWx0ZXJzaXplIiwia2lja0NhbGxiYWNrIiwic2hha2VUaHJlc2giLCJzaGFrZVdpbmRvd1NpemUiLCJzaGFrZVNsaWRlRmFjdG9yIiwic3BpblRocmVzaCIsInN0aWxsVGhyZXNoIiwic3RpbGxTbGlkZUZhY3RvciIsIl9wYXJhbXMiLCJfbWV0aG9kcyIsImFjY1JhdyIsIl91cGRhdGVBY2NSYXciLCJiaW5kIiwiZ3lyUmF3IiwiX3VwZGF0ZUd5clJhdyIsImFjY0ludGVuc2l0eSIsIl91cGRhdGVBY2NJbnRlbnNpdHkiLCJneXJJbnRlbnNpdHkiLCJfdXBkYXRlR3lySW50ZW5zaXR5IiwiZnJlZWZhbGwiLCJfdXBkYXRlRnJlZWZhbGwiLCJraWNrIiwiX3VwZGF0ZUtpY2siLCJzaGFrZSIsIl91cGRhdGVTaGFrZSIsInNwaW4iLCJfdXBkYXRlU3BpbiIsInN0aWxsIiwiX3VwZGF0ZVN0aWxsIiwiX2tpY2tDYWxsYmFjayIsImFjYyIsImd5ciIsIl9hY2NMYXN0IiwiX2FjY0ludGVuc2l0eUxhc3QiLCJfYWNjSW50ZW5zaXR5IiwiX2FjY0ludGVuc2l0eU5vcm0iLCJfYWNjTm9ybSIsIl9neXJEZWx0YSIsIl9neXJOb3JtIiwiX2d5ckRlbHRhTm9ybSIsIl9mYWxsQmVnaW4iLCJfZmFsbEVuZCIsIl9mYWxsRHVyYXRpb24iLCJfaXNGYWxsaW5nIiwiX2d5ckxhc3QiLCJfZ3lySW50ZW5zaXR5TGFzdCIsIl9neXJJbnRlbnNpdHkiLCJfZ3lySW50ZW5zaXR5Tm9ybSIsIl9raWNrSW50ZW5zaXR5IiwiX2xhc3RLaWNrIiwiX2lzS2lja2luZyIsIl9tZWRpYW5WYWx1ZXMiLCJfbWVkaWFuTGlua2luZyIsIl9tZWRpYW5GaWZvIiwiX2kxIiwiX2kyIiwiX2kzIiwiX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4iLCJfYWNjRGVsdGEiLCJfc2hha2VXaW5kb3ciLCJBcnJheSIsImkiLCJqIiwiX3NoYWtlTmIiLCJfc2hha2luZ1JhdyIsIl9zaGFrZVNsaWRlUHJldiIsIl9zaGFraW5nIiwiX3NwaW5CZWdpbiIsIl9zcGluRW5kIiwiX3NwaW5EdXJhdGlvbiIsIl9pc1NwaW5uaW5nIiwiX3N0aWxsQ3Jvc3NQcm9kIiwiX3N0aWxsU2xpZGUiLCJfc3RpbGxTbGlkZVByZXYiLCJfaXNTdGlsbCIsIl9sb29wSW5kZXhQZXJpb2QiLCJfbGNtIiwiX2xvb3BJbmRleCIsInBhcmFtcyIsImtleSIsIngiLCJ5IiwieiIsIk1hdGgiLCJQSSIsImNhbGxiYWNrIiwiX2VsYXBzZWRUaW1lIiwiX21hZ25pdHVkZTNEIiwiZXJyIiwicmVzIiwiZSIsIl9pbnRlbnNpdHkxRCIsIm5vcm0iLCJfZGVsdGEiLCJhY2NOb3JtIiwiZmFsbGluZyIsImR1cmF0aW9uIiwic3RhdGUiLCJpbnRlbnNpdHkiLCJjZWlsIiwia2lja2luZyIsIl9zbGlkZSIsInNoYWtpbmciLCJzcGlubmluZyIsImd5ck5vcm0iLCJfc3RpbGxDcm9zc1Byb2R1Y3QiLCJzbGlkZSIsInByZXYiLCJuZXh0IiwiZHQiLCJuZXh0WCIsInByZXZYIiwicHJldkludGVuc2l0eSIsInBhcmFtMSIsInBhcmFtMiIsImR4IiwieHl6QXJyYXkiLCJzcXJ0IiwiYSIsImIiLCJhMSIsImIxIiwicHJldlNsaWRlIiwiY3VycmVudFZhbCIsInNsaWRlRmFjdG9yIiwidmFsIiwicG93ZXIiLCJmcmVxdWVuY3kiLCJwZXJpb2RpY2l0eSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7Ozs7OztBQVNBLFNBQVNBLGVBQVQsR0FBMkI7QUFDekIsTUFBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQUU7QUFDbkMsV0FBTyxZQUFNO0FBQ1gsVUFBTUMsSUFBSUMsUUFBUUMsTUFBUixFQUFWO0FBQ0EsYUFBT0YsRUFBRSxDQUFGLElBQU9BLEVBQUUsQ0FBRixJQUFPLElBQXJCO0FBQ0QsS0FIRDtBQUlELEdBTEQsTUFLTztBQUFFO0FBQ1AsUUFBSUQsT0FBT0ksV0FBUCxLQUF1QixXQUEzQixFQUF3QztBQUN0QyxVQUFJQyxLQUFLQyxHQUFMLEtBQWEsV0FBakIsRUFBOEI7QUFDNUIsZUFBTyxZQUFNO0FBQUUsaUJBQU8sSUFBSUQsS0FBS0UsT0FBVCxFQUFQO0FBQTJCLFNBQTFDO0FBQ0QsT0FGRCxNQUVPO0FBQ0wsZUFBTyxZQUFNO0FBQUUsaUJBQU9GLEtBQUtDLEdBQUwsRUFBUDtBQUFtQixTQUFsQztBQUNEO0FBQ0YsS0FORCxNQU1PO0FBQ0wsYUFBTyxZQUFNO0FBQUUsZUFBT04sT0FBT0ksV0FBUCxDQUFtQkUsR0FBbkIsRUFBUDtBQUFpQyxPQUFoRDtBQUNEO0FBQ0Y7QUFDRjs7QUFFRCxJQUFNRSxVQUFVVCxpQkFBaEI7O0FBRUE7Ozs7QUFJQTs7Ozs7Ozs7O0FBVUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBbUJNVSxjOztBQUVKOzs7Ozs7Ozs7O0FBVUEsNEJBQTBCO0FBQUEsUUFBZEMsT0FBYyx1RUFBSixFQUFJO0FBQUE7O0FBQ3hCLFFBQU1DLFdBQVc7QUFDZkMsbUJBQWEsQ0FDWCxRQURXLEVBRVgsUUFGVyxFQUdYLGNBSFcsRUFJWCxjQUpXLEVBS1gsVUFMVyxFQU1YLE1BTlcsRUFPWCxPQVBX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UyxHLEVBQUs7QUFDckIsVUFBSUMsY0FBSjtBQUFBLFVBQVdDLGtCQUFYO0FBQUEsVUFBc0JDLG9CQUF0Qjs7QUFFQSxhQUFPLENBQUVGLEtBQUYsRUFBU0MsU0FBVCxFQUFvQkMsV0FBcEIsQ0FBUDtBQUNEOzs7OztrQkFHWTlJLGMiLCJmaWxlIjoibW90aW9uLWZlYXR1cmVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGltZSBpbiBzZWNvbmRzIGFjY29yZGluZyB0byB0aGUgY3VycmVudFxuICogZW52aXJvbm5lbWVudCAobm9kZSBvciBicm93c2VyKS5cbiAqIElmIHJ1bm5pbmcgaW4gbm9kZSB0aGUgdGltZSByZWx5IG9uIGBwcm9jZXNzLmhydGltZWAsIHdoaWxlIGlmIGluIHRoZSBicm93c2VyXG4gKiBpdCBpcyBwcm92aWRlZCBieSB0aGUgYERhdGVgIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGdldFRpbWVGdW5jdGlvbigpIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7IC8vIGFzc3VtZSBub2RlXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNvbnN0IHQgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgICAgcmV0dXJuIHRbMF0gKyB0WzFdICogMWUtOTtcbiAgICB9XG4gIH0gZWxzZSB7IC8vIGJyb3dzZXJcbiAgICBpZiAod2luZG93LnBlcmZvcm1hbmNlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKERhdGUubm93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gbmV3IERhdGUuZ2V0VGltZSgpIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gRGF0ZS5ub3coKSB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIH07XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IHBlcmZOb3cgPSBnZXRUaW1lRnVuY3Rpb24oKTtcblxuLyoqXG4gKiBAdG9kbyB0eXBlZGVmIGNvbnN0cnVjdG9yIGFyZ3VtZW50XG4gKi9cblxuLypcbiAqIC8vIGVzNSB3aXRoIGJyb3dzZXJpZnkgOlxuICogdmFyIG1vdGlvbkZlYXR1cmVzID0gcmVxdWlyZSgnbW90aW9uLWZlYXR1cmVzJyk7XG4gKiB2YXIgbWYgPSBuZXcgbW90aW9uRmVhdHVyZXMuTW90aW9uRmVhdHVyZXMoeyBkZXNjcmlwdG9yczogWydhY2NJbnRlbnNpdHknLCAna2ljayddIH0pO1xuICpcbiAqIC8vIGxvYWRpbmcgZnJvbSBhIFwic2NyaXB0XCIgdGFnIDpcbiAqIHZhciBtZiA9IG5ldyBtb3Rpb25GZWF0dXJlcy5Nb3Rpb25GZWF0dXJlcyh7IGRlc2NyaXB0b3JzOiBbJ2FjY0ludGVuc2l0eScsICdraWNrJ10gfSk7XG4gKi9cblxuXG4vKipcbiAqIENsYXNzIGNvbXB1dGluZyB0aGUgZGVzY3JpcHRvcnMgZnJvbSBhY2NlbGVyb21ldGVyIGFuZCBneXJvc2NvcGUgZGF0YS5cbiAqIDxiciAvPlxuICogZXM2ICsgYnJvd3NlcmlmeSBleGFtcGxlIDpcbiAqIGBgYEphdmFTY3JpcHRcbiAqIGltcG9ydCB7IE1vdGlvbkZlYXR1cmVzIH0gZnJvbSAnbW90aW9uLWZlYXR1cmVzJzsgXG4gKiBjb25zdCBtZiA9IG5ldyBNb3Rpb25GZWF0dXJlcyh7IGRlc2NyaXB0b3JzOiBbJ2FjY0ludGVuc2l0eScsICdraWNrJ10gfSk7XG4gKlxuICogLy8gdGhlbiwgb24gZWFjaCBtb3Rpb24gZXZlbnQgOlxuICogbWYuc2V0QWNjZWxlcm9tZXRlcih4LCB5LCB6KTtcbiAqIG1mLnNldEd5cm9zY29wZShhbHBoYSwgYmV0YSwgZ2FtbWEpO1xuICogbWYudXBkYXRlKGZ1bmN0aW9uKGVyciwgcmVzKSB7XG4gKiAgIGlmIChlcnIgPT09IG51bGwpIHtcbiAqICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCByZXNcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBNb3Rpb25GZWF0dXJlcyB7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpbml0T2JqZWN0IC0gb2JqZWN0IGNvbnRhaW5pbmcgYW4gYXJyYXkgb2YgdGhlXG4gICAqIHJlcXVpcmVkIGRlc2NyaXB0b3JzIGFuZCBzb21lIHZhcmlhYmxlcyB1c2VkIHRvIGNvbXB1dGUgdGhlIGRlc2NyaXB0b3JzXG4gICAqIHRoYXQgeW91IG1pZ2h0IHdhbnQgdG8gY2hhbmdlIChmb3IgZXhhbXBsZSBpZiB0aGUgYnJvd3NlciBpcyBjaHJvbWUgeW91XG4gICAqIG1pZ2h0IHdhbnQgdG8gc2V0IGBneXJJc0luRGVncmVlc2AgdG8gZmFsc2UgYmVjYXVzZSBpdCdzIHRoZSBjYXNlIG9uIHNvbWVcbiAgICogdmVyc2lvbnMsIG9yIHlvdSBtaWdodCB3YW50IHRvIGNoYW5nZSBzb21lIHRocmVzaG9sZHMpLlxuICAgKiBTZWUgdGhlIGNvZGUgZm9yIG1vcmUgZGV0YWlscy5cbiAgICpcbiAgICogQHRvZG8gdXNlIHR5cGVkZWYgdG8gZGVzY3JpYmUgdGhlIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVyc1xuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkZXNjcmlwdG9yczogW1xuICAgICAgICAnYWNjUmF3JyxcbiAgICAgICAgJ2d5clJhdycsXG4gICAgICAgICdhY2NJbnRlbnNpdHknLFxuICAgICAgICAnZ3lySW50ZW5zaXR5JyxcbiAgICAgICAgJ2ZyZWVmYWxsJyxcbiAgICAgICAgJ2tpY2snLFxuICAgICAgICAnc2hha2UnLFxuICAgICAgICAnc3BpbicsXG4gICAgICAgICdzdGlsbCdcbiAgICAgIF0sXG5cbiAgICAgIGd5cklzSW5EZWdyZWVzOiB0cnVlLFxuXG4gICAgICBhY2NJbnRlbnNpdHlQYXJhbTE6IDAuOCxcbiAgICAgIGFjY0ludGVuc2l0eVBhcmFtMjogMC4xLFxuXG4gICAgICBneXJJbnRlbnNpdHlQYXJhbTE6IDAuOSxcbiAgICAgIGd5ckludGVuc2l0eVBhcmFtMjogMSxcblxuICAgICAgZnJlZWZhbGxBY2NUaHJlc2g6IDAuMTUsXG4gICAgICBmcmVlZmFsbEd5clRocmVzaDogNzUwLFxuICAgICAgZnJlZWZhbGxHeXJEZWx0YVRocmVzaDogNDAsXG5cbiAgICAgIGtpY2tUaHJlc2g6IDAuMDEsXG4gICAgICBraWNrU3BlZWRHYXRlOiAyMDAsXG4gICAgICBraWNrTWVkaWFuRmlsdGVyc2l6ZTogOSxcbiAgICAgIGtpY2tDYWxsYmFjazogbnVsbCxcblxuICAgICAgc2hha2VUaHJlc2g6IDAuMSxcbiAgICAgIHNoYWtlV2luZG93U2l6ZTogMjAwLFxuICAgICAgc2hha2VTbGlkZUZhY3RvcjogMTAsXG5cbiAgICAgIHNwaW5UaHJlc2g6IDIwMCxcblxuICAgICAgc3RpbGxUaHJlc2g6IDUwMDAsXG4gICAgICBzdGlsbFNsaWRlRmFjdG9yOiA1LFxuXG4gICAgfTtcblxuICAgIHRoaXMuX3BhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICAvL2NvbnNvbGUubG9nKHRoaXMuX3BhcmFtcy5kZXNjcmlwdG9ycyk7XG5cbiAgICB0aGlzLl9tZXRob2RzID0ge1xuICAgICAgYWNjUmF3OiB0aGlzLl91cGRhdGVBY2NSYXcuYmluZCh0aGlzKSxcbiAgICAgIGd5clJhdzogdGhpcy5fdXBkYXRlR3lyUmF3LmJpbmQodGhpcyksXG4gICAgICBhY2NJbnRlbnNpdHk6IHRoaXMuX3VwZGF0ZUFjY0ludGVuc2l0eS5iaW5kKHRoaXMpLFxuICAgICAgZ3lySW50ZW5zaXR5OiB0aGlzLl91cGRhdGVHeXJJbnRlbnNpdHkuYmluZCh0aGlzKSxcbiAgICAgIGZyZWVmYWxsOiB0aGlzLl91cGRhdGVGcmVlZmFsbC5iaW5kKHRoaXMpLFxuICAgICAga2ljazogdGhpcy5fdXBkYXRlS2ljay5iaW5kKHRoaXMpLFxuICAgICAgc2hha2U6IHRoaXMuX3VwZGF0ZVNoYWtlLmJpbmQodGhpcyksXG4gICAgICBzcGluOiB0aGlzLl91cGRhdGVTcGluLmJpbmQodGhpcyksXG4gICAgICBzdGlsbDogdGhpcy5fdXBkYXRlU3RpbGwuYmluZCh0aGlzKVxuICAgIH07XG5cbiAgICB0aGlzLl9raWNrQ2FsbGJhY2sgPSB0aGlzLl9wYXJhbXMua2lja0NhbGxiYWNrO1xuXG4gICAgdGhpcy5hY2MgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5neXIgPSBbMCwgMCwgMF07XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBhY2MgaW50ZW5zaXR5XG4gICAgdGhpcy5fYWNjTGFzdCA9IFtcbiAgICAgIFswLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwXVxuICAgIF07XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5TGFzdCA9IFtcbiAgICAgIFswLCAwXSxcbiAgICAgIFswLCAwXSxcbiAgICAgIFswLCAwXVxuICAgIF07XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5ID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBmcmVlZmFsbFxuICAgIHRoaXMuX2FjY05vcm0gPSAwO1xuICAgIHRoaXMuX2d5ckRlbHRhID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX2d5ck5vcm0gPSAwO1xuICAgIHRoaXMuX2d5ckRlbHRhTm9ybSA9IDA7XG4gICAgdGhpcy5fZmFsbEJlZ2luID0gcGVyZk5vdygpO1xuICAgIHRoaXMuX2ZhbGxFbmQgPSBwZXJmTm93KCk7XG4gICAgdGhpcy5fZmFsbER1cmF0aW9uID0gMDtcbiAgICB0aGlzLl9pc0ZhbGxpbmcgPSBmYWxzZTtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGd5ciBpbnRlbnNpdHlcbiAgICB0aGlzLl9neXJMYXN0ID0gW1xuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHlMYXN0ID0gW1xuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHkgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBraWNrXG4gICAgdGhpcy5fa2lja0ludGVuc2l0eSA9IDA7XG4gICAgdGhpcy5fbGFzdEtpY2sgPSAwO1xuICAgIHRoaXMuX2lzS2lja2luZyA9IGZhbHNlO1xuICAgIHRoaXMuX21lZGlhblZhbHVlcyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcbiAgICB0aGlzLl9tZWRpYW5MaW5raW5nID0gWzMsIDQsIDEsIDUsIDcsIDgsIDAsIDIsIDZdO1xuICAgIHRoaXMuX21lZGlhbkZpZm8gPSBbNiwgMiwgNywgMCwgMSwgMywgOCwgNCwgNV07XG4gICAgdGhpcy5faTEgPSAwO1xuICAgIHRoaXMuX2kyID0gMDtcbiAgICB0aGlzLl9pMyA9IDA7XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNoYWtlXG4gICAgdGhpcy5fYWNjRGVsdGEgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fc2hha2VXaW5kb3cgPSBbXG4gICAgICBuZXcgQXJyYXkodGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZSksXG4gICAgICBuZXcgQXJyYXkodGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZSksXG4gICAgICBuZXcgQXJyYXkodGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZSlcbiAgICBdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemU7IGorKykge1xuICAgICAgICB0aGlzLl9zaGFrZVdpbmRvd1tpXVtqXSA9IDA7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3NoYWtlTmIgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fc2hha2luZ1JhdyA9IDA7XG4gICAgdGhpcy5fc2hha2VTbGlkZVByZXYgPSAwO1xuICAgIHRoaXMuX3NoYWtpbmcgPSAwO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc3BpblxuICAgIHRoaXMuX3NwaW5CZWdpbiA9IHBlcmZOb3coKTtcbiAgICB0aGlzLl9zcGluRW5kID0gcGVyZk5vdygpO1xuICAgIHRoaXMuX3NwaW5EdXJhdGlvbiA9IDA7XG4gICAgdGhpcy5faXNTcGlubmluZyA9IGZhbHNlO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzdGlsbFxuICAgIHRoaXMuX3N0aWxsQ3Jvc3NQcm9kID0gMDtcbiAgICB0aGlzLl9zdGlsbFNsaWRlID0gMDtcbiAgICB0aGlzLl9zdGlsbFNsaWRlUHJldiA9IDA7XG4gICAgdGhpcy5faXNTdGlsbCA9IGZhbHNlO1xuXG4gICAgdGhpcy5fbG9vcEluZGV4UGVyaW9kID0gdGhpcy5fbGNtKFxuICAgICAgdGhpcy5fbGNtKFxuICAgICAgICB0aGlzLl9sY20oMiwgMyksIHRoaXMuX3BhcmFtcy5raWNrTWVkaWFuRmlsdGVyc2l6ZVxuICAgICAgKSxcbiAgICAgIHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemVcbiAgICApO1xuICAgIC8vY29uc29sZS5sb2codGhpcy5fbG9vcEluZGV4UGVyaW9kKTtcbiAgICB0aGlzLl9sb29wSW5kZXggPSAwO1xuICB9XG5cbiAgLy89PT09PT09PT09IGludGVyZmFjZSA9PT09PT09PT0vL1xuXG4gIC8qKlxuICAgKiBVcGRhdGUgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzIChleGNlcHQgZGVzY3JpcHRvcnMgbGlzdClcbiAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIGEgc3Vic2V0IG9mIHRoZSBjb25zdHJ1Y3RvcidzIHBhcmFtZXRlcnNcbiAgICovXG4gIHVwZGF0ZVBhcmFtcyhwYXJhbXMgPSB7fSkge1xuICAgIGZvciAobGV0IGtleSBpbiBwYXJhbXMpIHtcbiAgICAgIGlmIChrZXkgIT09ICdkZXNjcmlwdG9ycycpIHtcbiAgICAgICAgdGhpcy5fcGFyYW1zW2tleV0gPSBwYXJhbXNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBhY2NlbGVyb21ldGVyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHggLSB0aGUgYWNjZWxlcm9tZXRlcidzIHggdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHkgLSB0aGUgYWNjZWxlcm9tZXRlcidzIHkgdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHogLSB0aGUgYWNjZWxlcm9tZXRlcidzIHogdmFsdWVcbiAgICovXG4gIHNldEFjY2VsZXJvbWV0ZXIoeCwgeSA9IDAsIHogPSAwKSB7XG4gICAgdGhpcy5hY2NbMF0gPSB4O1xuICAgIHRoaXMuYWNjWzFdID0geTtcbiAgICB0aGlzLmFjY1syXSA9IHo7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBneXJvc2NvcGUgdmFsdWVzLlxuICAgKiBAcGFyYW0ge051bWJlcn0geCAtIHRoZSBneXJvc2NvcGUncyB4IHZhbHVlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB5IC0gdGhlIGd5cm9zY29wZSdzIHkgdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHogLSB0aGUgZ3lyb3Njb3BlJ3MgeiB2YWx1ZVxuICAgKi9cbiAgc2V0R3lyb3Njb3BlKHgsIHkgPSAwLCB6ID0gMCkge1xuICAgIHRoaXMuZ3lyWzBdID0geDtcbiAgICB0aGlzLmd5clsxXSA9IHk7XG4gICAgdGhpcy5neXJbMl0gPSB6O1xuICAgIGlmICh0aGlzLl9wYXJhbXMuZ3lySXNJbkRlZ3JlZXMpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgIHRoaXMuZ3lyW2ldICo9ICgyICogTWF0aC5QSSAvIDM2MC4pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbnRlbnNpdHkgb2YgdGhlIG1vdmVtZW50IHNlbnNlZCBieSBhbiBhY2NlbGVyb21ldGVyLlxuICAgKiBAdHlwZWRlZiBhY2NJbnRlbnNpdHlcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IG5vcm0gLSB0aGUgZ2xvYmFsIGVuZXJneSBjb21wdXRlZCBvbiBhbGwgZGltZW5zaW9ucy5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHggLSB0aGUgZW5lcmd5IGluIHRoZSB4IChmaXJzdCkgZGltZW5zaW9uLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geSAtIHRoZSBlbmVyZ3kgaW4gdGhlIHkgKHNlY29uZCkgZGltZW5zaW9uLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geiAtIHRoZSBlbmVyZ3kgaW4gdGhlIHogKHRoaXJkKSBkaW1lbnNpb24uXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbnRlbnNpdHkgb2YgdGhlIG1vdmVtZW50IHNlbnNlZCBieSBhIGd5cm9zY29wZS5cbiAgICogQHR5cGVkZWYgZ3lySW50ZW5zaXR5XG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBub3JtIC0gdGhlIGdsb2JhbCBlbmVyZ3kgY29tcHV0ZWQgb24gYWxsIGRpbWVuc2lvbnMuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB4IC0gdGhlIGVuZXJneSBpbiB0aGUgeCAoZmlyc3QpIGRpbWVuc2lvbi5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHkgLSB0aGUgZW5lcmd5IGluIHRoZSB5IChzZWNvbmQpIGRpbWVuc2lvbi5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHogLSB0aGUgZW5lcmd5IGluIHRoZSB6ICh0aGlyZCkgZGltZW5zaW9uLlxuICAgKi9cblxuICAvKipcbiAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIGZyZWUgZmFsbGluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAdHlwZWRlZiBmcmVlZmFsbFxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gYWNjTm9ybSAtIHRoZSBub3JtIG9mIHRoZSBhY2NlbGVyYXRpb24uXG4gICAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gZmFsbGluZyAtIHRydWUgaWYgdGhlIHNlbnNvciBpcyBmcmVlIGZhbGxpbmcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGR1cmF0aW9uIC0gdGhlIGR1cmF0aW9uIG9mIHRoZSBmcmVlIGZhbGxpbmcgc2luY2UgaXRzIGJlZ2lubmluZy5cbiAgICovXG5cbiAgLyoqXG4gICAqIEltcHVsc2UgLyBoaXQgbW92ZW1lbnQgZGV0ZWN0aW9uIGluZm9ybWF0aW9uLlxuICAgKiBAdHlwZWRlZiBraWNrXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBpbnRlbnNpdHkgLSB0aGUgY3VycmVudCBpbnRlbnNpdHkgb2YgdGhlIFwia2lja1wiIGdlc3R1cmUuXG4gICAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0ga2lja2luZyAtIHRydWUgaWYgYSBcImtpY2tcIiBnZXN0dXJlIGlzIGJlaW5nIGRldGVjdGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBTaGFrZSBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEB0eXBlZGVmIHNoYWtlXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBzaGFraW5nIC0gdGhlIGN1cnJlbnQgYW1vdW50IG9mIFwic2hha2luZXNzXCIuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgc3Bpbm5pbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHR5cGVkZWYgc3BpblxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IHNwaW5uaW5nIC0gdHJ1ZSBpZiB0aGUgc2Vuc29yIGlzIHNwaW5uaW5nLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBkdXJhdGlvbiAtIHRoZSBkdXJhdGlvbiBvZiB0aGUgc3Bpbm5pbmcgc2luY2UgaXRzIGJlZ2lubmluZy5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGd5ck5vcm0gLSB0aGUgbm9ybSBvZiB0aGUgcm90YXRpb24gc3BlZWQuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgc3RpbGxuZXNzIG9mIHRoZSBzZW5zb3IuXG4gICAqIEB0eXBlZGVmIHN0aWxsXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gc3RpbGwgLSB0cnVlIGlmIHRoZSBzZW5zb3IgaXMgc3RpbGwsIGZhbHNlIG90aGVyd2lzZS5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHNsaWRlIC0gdGhlIG9yaWdpbmFsIHZhbHVlIHRocmVzaG9sZGVkIHRvIGRldGVybWluZSBzdGlsbG5lc3MuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb21wdXRlZCBmZWF0dXJlcy5cbiAgICogQHR5cGVkZWYgZmVhdHVyZXNcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHthY2NJbnRlbnNpdHl9IGFjY0ludGVuc2l0eSAtIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGFuIGFjY2VsZXJvbWV0ZXIuXG4gICAqIEBwcm9wZXJ0eSB7Z3lySW50ZW5zaXR5fSBneXJJbnRlbnNpdHkgLSBJbnRlbnNpdHkgb2YgdGhlIG1vdmVtZW50IHNlbnNlZCBieSBhIGd5cm9zY29wZS5cbiAgICogQHByb3BlcnR5IHtmcmVlZmFsbH0gZnJlZWZhbGwgLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZnJlZSBmYWxsaW5nIHN0YXRlIG9mIHRoZSBzZW5zb3IuXG4gICAqIEBwcm9wZXJ0eSB7a2lja30ga2ljayAtIEltcHVsc2UgLyBoaXQgbW92ZW1lbnQgZGV0ZWN0aW9uIGluZm9ybWF0aW9uLlxuICAgKiBAcHJvcGVydHkge3NoYWtlfSBzaGFrZSAtIFNoYWtlIG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHByb3BlcnR5IHtzcGlufSBzcGluIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIHNwaW5uaW5nIHN0YXRlIG9mIHRoZSBzZW5zb3IuXG4gICAqIEBwcm9wZXJ0eSB7c3RpbGx9IHN0aWxsIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIHN0aWxsbmVzcyBvZiB0aGUgc2Vuc29yLlxuICAgKi9cblxuICAvKipcbiAgICogQ2FsbGJhY2sgaGFuZGxpbmcgdGhlIGZlYXR1cmVzLlxuICAgKiBAY2FsbGJhY2sgZmVhdHVyZXNDYWxsYmFja1xuICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyIC0gRGVzY3JpcHRpb24gb2YgYSBwb3RlbnRpYWwgZXJyb3IuXG4gICAqIEBwYXJhbSB7ZmVhdHVyZXN9IHJlcyAtIE9iamVjdCBob2xkaW5nIHRoZSBmZWF0dXJlIHZhbHVlcy5cbiAgICovXG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIGNvbXB1dGF0aW9uIG9mIHRoZSBkZXNjcmlwdG9ycyBmcm9tIHRoZSBjdXJyZW50IHNlbnNvciB2YWx1ZXMgYW5kXG4gICAqIHBhc3MgdGhlIHJlc3VsdHMgdG8gYSBjYWxsYmFja1xuICAgKiBAcGFyYW0ge2ZlYXR1cmVzQ2FsbGJhY2t9IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGhhbmRsaW5nIHRoZSBsYXN0IGNvbXB1dGVkIGRlc2NyaXB0b3JzXG4gICAqIEByZXR1cm5zIHtmZWF0dXJlc30gZmVhdHVyZXMgLSBSZXR1cm4gdGhlc2UgY29tcHV0ZWQgZGVzY3JpcHRvcnMgYW55d2F5XG4gICAqL1xuICB1cGRhdGUoY2FsbGJhY2sgPSBudWxsKSB7XG4gICAgLy8gREVBTCBXSVRIIHRoaXMuX2VsYXBzZWRUaW1lXG4gICAgdGhpcy5fZWxhcHNlZFRpbWUgPSBwZXJmTm93KCk7XG4gICAgLy8gaXMgdGhpcyBvbmUgdXNlZCBieSBzZXZlcmFsIGZlYXR1cmVzID9cbiAgICB0aGlzLl9hY2NOb3JtID0gdGhpcy5fbWFnbml0dWRlM0QodGhpcy5hY2MpO1xuICAgIC8vIHRoaXMgb25lIG5lZWRzIGJlIGhlcmUgYmVjYXVzZSB1c2VkIGJ5IGZyZWVmYWxsIEFORCBzcGluXG4gICAgdGhpcy5fZ3lyTm9ybSA9IHRoaXMuX21hZ25pdHVkZTNEKHRoaXMuZ3lyKTtcbiAgICBcbiAgICBsZXQgZXJyID0gbnVsbDtcbiAgICBsZXQgcmVzID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgcmVzID0ge307XG4gICAgICBmb3IgKGxldCBrZXkgb2YgdGhpcy5fcGFyYW1zLmRlc2NyaXB0b3JzKSB7XG4gICAgICAgIGlmICh0aGlzLl9tZXRob2RzW2tleV0pIHtcbiAgICAgICAgICB0aGlzLl9tZXRob2RzW2tleV0ocmVzKTtcbiAgICAgICAgfVxuICAgICAgfSBcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlcnIgPSBlO1xuICAgIH1cblxuICAgIHRoaXMuX2xvb3BJbmRleCA9ICh0aGlzLl9sb29wSW5kZXggKyAxKSAlIHRoaXMuX2xvb3BJbmRleFBlcmlvZDtcblxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soZXJyLCByZXMpOyAgXG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09IHNwZWNpZmljIGRlc2NyaXB0b3JzIGNvbXB1dGluZyA9PT09PT09PT09PT09PT09PT09PS8vXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlQWNjUmF3KHJlcykge1xuICAgIHJlcy5hY2NSYXcgPSB7XG4gICAgICB4OiB0aGlzLmFjY1swXSxcbiAgICAgIHk6IHRoaXMuYWNjWzFdLFxuICAgICAgejogdGhpcy5hY2NbMl1cbiAgICB9O1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVHeXJSYXcocmVzKSB7XG4gICAgcmVzLmd5clJhdyA9IHtcbiAgICAgIHg6IHRoaXMuZ3lyWzBdLFxuICAgICAgeTogdGhpcy5neXJbMV0sXG4gICAgICB6OiB0aGlzLmd5clsyXVxuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGFjYyBpbnRlbnNpdHlcbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVBY2NJbnRlbnNpdHkocmVzKSB7XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA9IDA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgdGhpcy5fYWNjTGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAzXSA9IHRoaXMuYWNjW2ldO1xuXG4gICAgICB0aGlzLl9hY2NJbnRlbnNpdHlbaV0gPSB0aGlzLl9pbnRlbnNpdHkxRChcbiAgICAgICAgdGhpcy5hY2NbaV0sXG4gICAgICAgIHRoaXMuX2FjY0xhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eUxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgMl0sXG4gICAgICAgIHRoaXMuX3BhcmFtcy5hY2NJbnRlbnNpdHlQYXJhbTEsXG4gICAgICAgIHRoaXMuX3BhcmFtcy5hY2NJbnRlbnNpdHlQYXJhbTIsXG4gICAgICAgIDFcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuX2FjY0ludGVuc2l0eUxhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgMl0gPSB0aGlzLl9hY2NJbnRlbnNpdHlbaV07XG5cbiAgICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gKz0gdGhpcy5fYWNjSW50ZW5zaXR5W2ldO1xuICAgIH1cblxuICAgIHJlcy5hY2NJbnRlbnNpdHkgPSB7XG4gICAgICBub3JtOiB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtLFxuICAgICAgeDogdGhpcy5fYWNjSW50ZW5zaXR5WzBdLFxuICAgICAgeTogdGhpcy5fYWNjSW50ZW5zaXR5WzFdLFxuICAgICAgejogdGhpcy5fYWNjSW50ZW5zaXR5WzJdXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZ3lyIGludGVuc2l0eVxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUd5ckludGVuc2l0eShyZXMpIHtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHlOb3JtID0gMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB0aGlzLl9neXJMYXN0W2ldW3RoaXMuX2xvb3BJbmRleCAlIDNdID0gdGhpcy5neXJbaV07XG5cbiAgICAgIHRoaXMuX2d5ckludGVuc2l0eVtpXSA9IHRoaXMuX2ludGVuc2l0eTFEKFxuICAgICAgICB0aGlzLmd5cltpXSxcbiAgICAgICAgdGhpcy5fZ3lyTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSxcbiAgICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5TGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAyXSxcbiAgICAgICAgdGhpcy5fcGFyYW1zLmd5ckludGVuc2l0eVBhcmFtMSxcbiAgICAgICAgdGhpcy5fcGFyYW1zLmd5ckludGVuc2l0eVBhcmFtMixcbiAgICAgICAgMVxuICAgICAgKTtcblxuICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5TGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAyXSA9IHRoaXMuX2d5ckludGVuc2l0eVtpXTtcblxuICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSArPSB0aGlzLl9neXJJbnRlbnNpdHlbaV07XG4gICAgfVxuXG4gICAgcmVzLmd5ckludGVuc2l0eSA9IHtcbiAgICAgIG5vcm06IHRoaXMuX2d5ckludGVuc2l0eU5vcm0sXG4gICAgICB4OiB0aGlzLl9neXJJbnRlbnNpdHlbMF0sXG4gICAgICB5OiB0aGlzLl9neXJJbnRlbnNpdHlbMV0sXG4gICAgICB6OiB0aGlzLl9neXJJbnRlbnNpdHlbMl1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGZyZWVmYWxsXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlRnJlZWZhbGwocmVzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2d5ckRlbHRhW2ldID1cbiAgICAgICAgdGhpcy5fZGVsdGEodGhpcy5fZ3lyTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSwgdGhpcy5neXJbaV0sIDEpO1xuICAgIH1cblxuICAgIHRoaXMuX2d5ckRlbHRhTm9ybSA9IHRoaXMuX21hZ25pdHVkZTNEKHRoaXMuX2d5ckRlbHRhKTtcblxuICAgIGlmICh0aGlzLl9hY2NOb3JtIDwgdGhpcy5fcGFyYW1zLmZyZWVmYWxsQWNjVGhyZXNoIHx8XG4gICAgICAgICh0aGlzLl9neXJOb3JtID4gdGhpcy5fcGFyYW1zLmZyZWVmYWxsR3lyVGhyZXNoXG4gICAgICAgICAgJiYgdGhpcy5fZ3lyRGVsdGFOb3JtIDwgdGhpcy5fcGFyYW1zLmZyZWVmYWxsR3lyRGVsdGFUaHJlc2gpKSB7XG4gICAgICBpZiAoIXRoaXMuX2lzRmFsbGluZykge1xuICAgICAgICB0aGlzLl9pc0ZhbGxpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9mYWxsQmVnaW4gPSBwZXJmTm93KCk7XG4gICAgICB9XG4gICAgICB0aGlzLl9mYWxsRW5kID0gcGVyZk5vdygpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5faXNGYWxsaW5nKSB7XG4gICAgICAgIHRoaXMuX2lzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9mYWxsRHVyYXRpb24gPSAodGhpcy5fZmFsbEVuZCAtIHRoaXMuX2ZhbGxCZWdpbik7XG5cbiAgICByZXMuZnJlZWZhbGwgPSB7XG4gICAgICBhY2NOb3JtOiB0aGlzLl9hY2NOb3JtLFxuICAgICAgZmFsbGluZzogdGhpcy5faXNGYWxsaW5nLFxuICAgICAgZHVyYXRpb246IHRoaXMuX2ZhbGxEdXJhdGlvblxuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGtpY2tcbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVLaWNrKHJlcykge1xuICAgIHRoaXMuX2kzID0gdGhpcy5fbG9vcEluZGV4ICUgdGhpcy5fcGFyYW1zLmtpY2tNZWRpYW5GaWx0ZXJzaXplO1xuICAgIHRoaXMuX2kxID0gdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM107XG4gICAgdGhpcy5faTIgPSAxO1xuXG4gICAgaWYgKHRoaXMuX2kxIDwgdGhpcy5fcGFyYW1zLmtpY2tNZWRpYW5GaWx0ZXJzaXplIC0gMSAmJlxuICAgICAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID4gdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdKSB7XG4gICAgICAvLyBjaGVjayByaWdodFxuICAgICAgd2hpbGUgKHRoaXMuX2kxICsgdGhpcy5faTIgPCB0aGlzLmtpY2tNZWRpYW5GaWx0ZXJzaXplICYmXG4gICAgICAgICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPiB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl0pIHtcbiAgICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdXSA9IFxuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl1dIC0gMTtcbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9pMisrO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9IHRoaXMuX2kzO1xuICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM10gPSB0aGlzLl9pMSArIHRoaXMuX2kyIC0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY2hlY2sgbGVmdFxuICAgICAgd2hpbGUgKHRoaXMuX2kyIDwgdGhpcy5faTEgKyAxICYmXG4gICAgICAgICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA8IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyXSkge1xuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl1dID1cbiAgICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdXSArIDE7XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMl07XG4gICAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID1cbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5faTIrKztcbiAgICAgIH1cbiAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPSB0aGlzLl9pMztcbiAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5faTNdID0gdGhpcy5faTEgLSB0aGlzLl9pMiArIDE7XG4gICAgfVxuXG4gICAgLy8gY29tcGFyZSBjdXJyZW50IGludGVuc2l0eSBub3JtIHdpdGggcHJldmlvdXMgbWVkaWFuIHZhbHVlXG4gICAgaWYgKHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gLSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID4gdGhpcy5fcGFyYW1zLmtpY2tUaHJlc2gpIHtcbiAgICAgIGlmICh0aGlzLl9pc0tpY2tpbmcpIHtcbiAgICAgICAgaWYgKHRoaXMuX2tpY2tJbnRlbnNpdHkgPCB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtKSB7XG4gICAgICAgICAgdGhpcy5fa2lja0ludGVuc2l0eSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2tpY2tDYWxsYmFjaykge1xuICAgICAgICAgIHRoaXMuX2tpY2tDYWxsYmFjayh7IHN0YXRlOiAnbWlkZGxlJywgaW50ZW5zaXR5OiB0aGlzLl9raWNrSW50ZW5zaXR5IH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9pc0tpY2tpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9raWNrSW50ZW5zaXR5ID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcbiAgICAgICAgdGhpcy5fbGFzdEtpY2sgPSB0aGlzLl9lbGFwc2VkVGltZTtcbiAgICAgICAgaWYgKHRoaXMuX2tpY2tDYWxsYmFjaykge1xuICAgICAgICAgIHRoaXMuX2tpY2tDYWxsYmFjayh7IHN0YXRlOiAnc3RhcnQnLCBpbnRlbnNpdHk6IHRoaXMuX2tpY2tJbnRlbnNpdHkgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuX2VsYXBzZWRUaW1lIC0gdGhpcy5fbGFzdEtpY2sgPiB0aGlzLl9wYXJhbXMua2lja1NwZWVkR2F0ZSkge1xuICAgICAgICBpZiAodGhpcy5faXNLaWNraW5nICYmIHRoaXMuX2tpY2tDYWxsYmFjaykge1xuICAgICAgICAgIHRoaXMuX2tpY2tDYWxsYmFjayh7IHN0YXRlOiAnc3RvcCcsIGludGVuc2l0eTogdGhpcy5fa2lja0ludGVuc2l0eSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pc0tpY2tpbmcgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID0gdGhpcy5fbWVkaWFuVmFsdWVzW01hdGguY2VpbCh0aGlzLl9wYXJhbXMua2lja01lZGlhbkZpbHRlcnNpemUgKiAwLjUpXTtcblxuICAgIHJlcy5raWNrID0ge1xuICAgICAgaW50ZW5zaXR5OiB0aGlzLl9raWNrSW50ZW5zaXR5LFxuICAgICAga2lja2luZzogdGhpcy5faXNLaWNraW5nXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzaGFrZVxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZVNoYWtlKHJlcykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB0aGlzLl9hY2NEZWx0YVtpXSA9IHRoaXMuX2RlbHRhKFxuICAgICAgICB0aGlzLl9hY2NMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLFxuICAgICAgICB0aGlzLmFjY1tpXSxcbiAgICAgICAgMVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgaWYgKHRoaXMuX3NoYWtlV2luZG93W2ldW3RoaXMuX2xvb3BJbmRleCAlIHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemVdKSB7XG4gICAgICAgIHRoaXMuX3NoYWtlTmJbaV0tLTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9hY2NEZWx0YVtpXSA+IHRoaXMuX3BhcmFtcy5zaGFrZVRocmVzaCkge1xuICAgICAgICB0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSB0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplXSA9IDE7XG4gICAgICAgIHRoaXMuX3NoYWtlTmJbaV0rKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3NoYWtlV2luZG93W2ldW3RoaXMuX2xvb3BJbmRleCAlIHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemVdID0gMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9zaGFraW5nUmF3ID1cbiAgICB0aGlzLl9tYWduaXR1ZGUzRCh0aGlzLl9zaGFrZU5iKSAvXG4gICAgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZTtcbiAgICB0aGlzLl9zaGFrZVNsaWRlUHJldiA9IHRoaXMuX3NoYWtpbmc7XG4gICAgdGhpcy5fc2hha2luZyA9XG4gICAgdGhpcy5fc2xpZGUodGhpcy5fc2hha2VTbGlkZVByZXYsIHRoaXMuX3NoYWtpbmdSYXcsIHRoaXMuX3BhcmFtcy5zaGFrZVNsaWRlRmFjdG9yKTtcblxuICAgIHJlcy5zaGFrZSA9IHtcbiAgICAgIHNoYWtpbmc6IHRoaXMuX3NoYWtpbmdcbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzcGluXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlU3BpbihyZXMpIHtcbiAgICBpZiAodGhpcy5fZ3lyTm9ybSA+IHRoaXMuX3BhcmFtcy5zcGluVGhyZXNoKSB7XG4gICAgICBpZiAoIXRoaXMuX2lzU3Bpbm5pbmcpIHtcbiAgICAgICAgdGhpcy5faXNTcGlubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX3NwaW5CZWdpbiA9IHBlcmZOb3coKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3NwaW5FbmQgPSBwZXJmTm93KCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9pc1NwaW5uaW5nKSB7XG4gICAgICB0aGlzLl9pc1NwaW5uaW5nID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuX3NwaW5EdXJhdGlvbiA9IHRoaXMuX3NwaW5FbmQgLSB0aGlzLl9zcGluQmVnaW47XG5cbiAgICByZXMuc3BpbiA9IHtcbiAgICAgIHNwaW5uaW5nOiB0aGlzLl9pc1NwaW5uaW5nLFxuICAgICAgZHVyYXRpb246IHRoaXMuX3NwaW5EdXJhdGlvbixcbiAgICAgIGd5ck5vcm06IHRoaXMuX2d5ck5vcm1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHN0aWxsXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlU3RpbGwocmVzKSB7XG4gICAgdGhpcy5fc3RpbGxDcm9zc1Byb2QgPSB0aGlzLl9zdGlsbENyb3NzUHJvZHVjdCh0aGlzLmd5cik7XG4gICAgdGhpcy5fc3RpbGxTbGlkZVByZXYgPSB0aGlzLl9zdGlsbFNsaWRlO1xuICAgIHRoaXMuX3N0aWxsU2xpZGUgPSB0aGlzLl9zbGlkZShcbiAgICAgIHRoaXMuX3N0aWxsU2xpZGVQcmV2LFxuICAgICAgdGhpcy5fc3RpbGxDcm9zc1Byb2QsXG4gICAgICB0aGlzLl9wYXJhbXMuc3RpbGxTbGlkZUZhY3RvclxuICAgICk7XG5cbiAgICBpZiAodGhpcy5fc3RpbGxTbGlkZSA+IHRoaXMuX3BhcmFtcy5zdGlsbFRocmVzaCkge1xuICAgICAgdGhpcy5faXNTdGlsbCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9pc1N0aWxsID0gdHJ1ZTtcbiAgICB9XG4gIFxuICAgIHJlcy5zdGlsbCA9IHtcbiAgICAgIHN0aWxsOiB0aGlzLl9pc1N0aWxsLFxuICAgICAgc2xpZGU6IHRoaXMuX3N0aWxsU2xpZGVcbiAgICB9XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBVVElMSVRJRVMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuICAvKiogQHByaXZhdGUgKi9cbiAgX2RlbHRhKHByZXYsIG5leHQsIGR0KSB7XG4gICAgcmV0dXJuIChuZXh0IC0gcHJldikgLyAoMiAqIGR0KTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfaW50ZW5zaXR5MUQobmV4dFgsIHByZXZYLCBwcmV2SW50ZW5zaXR5LCBwYXJhbTEsIHBhcmFtMiwgZHQpIHtcbiAgICBjb25zdCBkeCA9IHRoaXMuX2RlbHRhKG5leHRYLCBwcmV2WCwgZHQpOy8vKG5leHRYIC0gcHJldlgpIC8gKDIgKiBkdCk7XG4gICAgcmV0dXJuIHBhcmFtMiAqIGR4ICogZHggKyBwYXJhbTEgKiBwcmV2SW50ZW5zaXR5O1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF9tYWduaXR1ZGUzRCh4eXpBcnJheSkge1xuICAgIHJldHVybiBNYXRoLnNxcnQoeHl6QXJyYXlbMF0gKiB4eXpBcnJheVswXSArIFxuICAgICAgICAgICAgICAgIHh5ekFycmF5WzFdICogeHl6QXJyYXlbMV0gK1xuICAgICAgICAgICAgICAgIHh5ekFycmF5WzJdICogeHl6QXJyYXlbMl0pO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF9sY20oYSwgYikge1xuICAgIGxldCBhMSA9IGEsIGIxID0gYjtcblxuICAgIHdoaWxlIChhMSAhPSBiMSkge1xuICAgICAgaWYgKGExIDwgYjEpIHtcbiAgICAgICAgYTEgKz0gYTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGIxICs9IGI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGExO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF9zbGlkZShwcmV2U2xpZGUsIGN1cnJlbnRWYWwsIHNsaWRlRmFjdG9yKSB7XG4gICAgcmV0dXJuIHByZXZTbGlkZSArIChjdXJyZW50VmFsIC0gcHJldlNsaWRlKSAvIHNsaWRlRmFjdG9yO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF9zdGlsbENyb3NzUHJvZHVjdCh4eXpBcnJheSkge1xuICAgIHJldHVybiAoeHl6QXJyYXlbMV0gLSB4eXpBcnJheVsyXSkgKiAoeHl6QXJyYXlbMV0gLSB4eXpBcnJheVsyXSkgK1xuICAgICAgICAgICAoeHl6QXJyYXlbMF0gLSB4eXpBcnJheVsxXSkgKiAoeHl6QXJyYXlbMF0gLSB4eXpBcnJheVsxXSkgK1xuICAgICAgICAgICAoeHl6QXJyYXlbMl0gLSB4eXpBcnJheVswXSkgKiAoeHl6QXJyYXlbMl0gLSB4eXpBcnJheVswXSk7XG4gIH1cblxuICBfemVyb0Nyb3NzaW5nUmF0ZSh2YWwpIHtcbiAgICBsZXQgcG93ZXIsIGZyZXF1ZW5jeSwgcGVyaW9kaWNpdHk7XG4gICAgXG4gICAgcmV0dXJuIFsgcG93ZXIsIGZyZXF1ZW5jeSwgcGVyaW9kaWNpdHkgXTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNb3Rpb25GZWF0dXJlcztcbiJdfQ==
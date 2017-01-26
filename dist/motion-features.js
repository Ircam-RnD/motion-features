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

/**
 * Class computing the descriptors from accelerometer and gyroscope data.
 * <br />
 * Example :
 * ```JavaScript
 * // es6 with browserify :
 * import { MotionFeatures } from 'motion-features'; 
 * const mf = new MotionFeatures({ descriptors: ['accIntensity', 'kick'] });
 *
 * // es5 with browserify :
 * var motionFeatures = require('motion-features');
 * var mf = new motionFeatures.MotionFeatures({ descriptors: ['accIntensity', 'kick'] });
 *
 * // loading from a "script" tag :
 * var mf = new motionFeatures.MotionFeatures({ descriptors: ['accIntensity', 'kick'] });
 *
 * // then, on each motion event :
 * mf.setAccelerometer(x, y, z);
 * mf.setGyroscope(alpha, beta, theta);
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
   * Update configuration params (except descriptors list)
   * @param {Object} params - a subset of the constructor's params
   */


  (0, _createClass3.default)(MotionFeatures, [{
    key: 'updateParams',
    value: function updateParams() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      for (var key in params) {
        this._params[key] = params[key];
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
  }]);
  return MotionFeatures;
}();

exports.default = MotionFeatures;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vdGlvbi1mZWF0dXJlcy5qcyJdLCJuYW1lcyI6WyJnZXRUaW1lRnVuY3Rpb24iLCJ3aW5kb3ciLCJ0IiwicHJvY2VzcyIsImhydGltZSIsInBlcmZvcm1hbmNlIiwiRGF0ZSIsIm5vdyIsImdldFRpbWUiLCJwZXJmTm93IiwiTW90aW9uRmVhdHVyZXMiLCJvcHRpb25zIiwiZGVmYXVsdHMiLCJkZXNjcmlwdG9ycyIsImd5cklzSW5EZWdyZWVzIiwiYWNjSW50ZW5zaXR5UGFyYW0xIiwiYWNjSW50ZW5zaXR5UGFyYW0yIiwiZ3lySW50ZW5zaXR5UGFyYW0xIiwiZ3lySW50ZW5zaXR5UGFyYW0yIiwiZnJlZWZhbGxBY2NUaHJlc2giLCJmcmVlZmFsbEd5clRocmVzaCIsImZyZWVmYWxsR3lyRGVsdGFUaHJlc2giLCJraWNrVGhyZXNoIiwia2lja1NwZWVkR2F0ZSIsImtpY2tNZWRpYW5GaWx0ZXJzaXplIiwia2lja0NhbGxiYWNrIiwic2hha2VUaHJlc2giLCJzaGFrZVdpbmRvd1NpemUiLCJzaGFrZVNsaWRlRmFjdG9yIiwic3BpblRocmVzaCIsInN0aWxsVGhyZXNoIiwic3RpbGxTbGlkZUZhY3RvciIsIl9wYXJhbXMiLCJfbWV0aG9kcyIsImFjY1JhdyIsIl91cGRhdGVBY2NSYXciLCJiaW5kIiwiZ3lyUmF3IiwiX3VwZGF0ZUd5clJhdyIsImFjY0ludGVuc2l0eSIsIl91cGRhdGVBY2NJbnRlbnNpdHkiLCJneXJJbnRlbnNpdHkiLCJfdXBkYXRlR3lySW50ZW5zaXR5IiwiZnJlZWZhbGwiLCJfdXBkYXRlRnJlZWZhbGwiLCJraWNrIiwiX3VwZGF0ZUtpY2siLCJzaGFrZSIsIl91cGRhdGVTaGFrZSIsInNwaW4iLCJfdXBkYXRlU3BpbiIsInN0aWxsIiwiX3VwZGF0ZVN0aWxsIiwiX2tpY2tDYWxsYmFjayIsImFjYyIsImd5ciIsIl9hY2NMYXN0IiwiX2FjY0ludGVuc2l0eUxhc3QiLCJfYWNjSW50ZW5zaXR5IiwiX2FjY0ludGVuc2l0eU5vcm0iLCJfYWNjTm9ybSIsIl9neXJEZWx0YSIsIl9neXJOb3JtIiwiX2d5ckRlbHRhTm9ybSIsIl9mYWxsQmVnaW4iLCJfZmFsbEVuZCIsIl9mYWxsRHVyYXRpb24iLCJfaXNGYWxsaW5nIiwiX2d5ckxhc3QiLCJfZ3lySW50ZW5zaXR5TGFzdCIsIl9neXJJbnRlbnNpdHkiLCJfZ3lySW50ZW5zaXR5Tm9ybSIsIl9raWNrSW50ZW5zaXR5IiwiX2xhc3RLaWNrIiwiX2lzS2lja2luZyIsIl9tZWRpYW5WYWx1ZXMiLCJfbWVkaWFuTGlua2luZyIsIl9tZWRpYW5GaWZvIiwiX2kxIiwiX2kyIiwiX2kzIiwiX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4iLCJfYWNjRGVsdGEiLCJfc2hha2VXaW5kb3ciLCJBcnJheSIsImkiLCJqIiwiX3NoYWtlTmIiLCJfc2hha2luZ1JhdyIsIl9zaGFrZVNsaWRlUHJldiIsIl9zaGFraW5nIiwiX3NwaW5CZWdpbiIsIl9zcGluRW5kIiwiX3NwaW5EdXJhdGlvbiIsIl9pc1NwaW5uaW5nIiwiX3N0aWxsQ3Jvc3NQcm9kIiwiX3N0aWxsU2xpZGUiLCJfc3RpbGxTbGlkZVByZXYiLCJfaXNTdGlsbCIsIl9sb29wSW5kZXhQZXJpb2QiLCJfbGNtIiwiX2xvb3BJbmRleCIsInBhcmFtcyIsImtleSIsIngiLCJ5IiwieiIsIk1hdGgiLCJQSSIsImNhbGxiYWNrIiwiX2VsYXBzZWRUaW1lIiwiX21hZ25pdHVkZTNEIiwiZXJyIiwicmVzIiwiZSIsIl9pbnRlbnNpdHkxRCIsIm5vcm0iLCJfZGVsdGEiLCJhY2NOb3JtIiwiZmFsbGluZyIsImR1cmF0aW9uIiwic3RhdGUiLCJpbnRlbnNpdHkiLCJjZWlsIiwia2lja2luZyIsIl9zbGlkZSIsInNoYWtpbmciLCJzcGlubmluZyIsImd5ck5vcm0iLCJfc3RpbGxDcm9zc1Byb2R1Y3QiLCJzbGlkZSIsInByZXYiLCJuZXh0IiwiZHQiLCJuZXh0WCIsInByZXZYIiwicHJldkludGVuc2l0eSIsInBhcmFtMSIsInBhcmFtMiIsImR4IiwieHl6QXJyYXkiLCJzcXJ0IiwiYSIsImIiLCJhMSIsImIxIiwicHJldlNsaWRlIiwiY3VycmVudFZhbCIsInNsaWRlRmFjdG9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7O0FBU0EsU0FBU0EsZUFBVCxHQUEyQjtBQUN6QixNQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFBRTtBQUNuQyxXQUFPLFlBQU07QUFDWCxVQUFNQyxJQUFJQyxRQUFRQyxNQUFSLEVBQVY7QUFDQSxhQUFPRixFQUFFLENBQUYsSUFBT0EsRUFBRSxDQUFGLElBQU8sSUFBckI7QUFDRCxLQUhEO0FBSUQsR0FMRCxNQUtPO0FBQUU7QUFDUCxRQUFJRCxPQUFPSSxXQUFQLEtBQXVCLFdBQTNCLEVBQXdDO0FBQ3RDLFVBQUlDLEtBQUtDLEdBQUwsS0FBYSxXQUFqQixFQUE4QjtBQUM1QixlQUFPLFlBQU07QUFBRSxpQkFBTyxJQUFJRCxLQUFLRSxPQUFULEVBQVA7QUFBMkIsU0FBMUM7QUFDRCxPQUZELE1BRU87QUFDTCxlQUFPLFlBQU07QUFBRSxpQkFBT0YsS0FBS0MsR0FBTCxFQUFQO0FBQW1CLFNBQWxDO0FBQ0Q7QUFDRixLQU5ELE1BTU87QUFDTCxhQUFPLFlBQU07QUFBRSxlQUFPTixPQUFPSSxXQUFQLENBQW1CRSxHQUFuQixFQUFQO0FBQWlDLE9BQWhEO0FBQ0Q7QUFDRjtBQUNGOztBQUVELElBQU1FLFVBQVVULGlCQUFoQjs7QUFFQTs7OztBQUlBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBMkJNVSxjOztBQUVKOzs7Ozs7Ozs7O0FBVUEsNEJBQTBCO0FBQUEsUUFBZEMsT0FBYyx1RUFBSixFQUFJO0FBQUE7O0FBQ3hCLFFBQU1DLFdBQVc7QUFDZkMsbUJBQWEsQ0FDWCxRQURXLEVBRVgsUUFGVyxFQUdYLGNBSFcsRUFJWCxjQUpXLEVBS1gsVUFMVyxFQU1YLE1BTlcsRUFPWCxPQVBXLEVBUVgsTUFSVyxFQVNYLE9BVFcsQ0FERTs7QUFhZkMsc0JBQWdCLElBYkQ7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QU9LLFNBQVNDLEVBQVQsR0FBY0EsRUFBZCxHQUFtQkYsU0FBU0QsYUFBbkM7QUFDRDs7QUFFRDs7OztpQ0FDYUksUSxFQUFVO0FBQ3JCLGFBQU9qQyxLQUFLa0MsSUFBTCxDQUFVRCxTQUFTLENBQVQsSUFBY0EsU0FBUyxDQUFULENBQWQsR0FDTEEsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQURULEdBRUxBLFNBQVMsQ0FBVCxJQUFjQSxTQUFTLENBQVQsQ0FGbkIsQ0FBUDtBQUdEOztBQUVEOzs7O3lCQUNLRSxDLEVBQUdDLEMsRUFBRztBQUNULFVBQUlDLEtBQUtGLENBQVQ7QUFBQSxVQUFZRyxLQUFLRixDQUFqQjs7QUFFQSxhQUFPQyxNQUFNQyxFQUFiLEVBQWlCO0FBQ2YsWUFBSUQsS0FBS0MsRUFBVCxFQUFhO0FBQ1hELGdCQUFNRixDQUFOO0FBQ0QsU0FGRCxNQUVPO0FBQ0xHLGdCQUFNRixDQUFOO0FBQ0Q7QUFDRjs7QUFFRCxhQUFPQyxFQUFQO0FBQ0Q7O0FBRUQ7Ozs7MkJBQ09FLFMsRUFBV0MsVSxFQUFZQyxXLEVBQWE7QUFDekMsYUFBT0YsWUFBWSxDQUFDQyxhQUFhRCxTQUFkLElBQTJCRSxXQUE5QztBQUNEOztBQUVEOzs7O3VDQUNtQlIsUSxFQUFVO0FBQzNCLGFBQU8sQ0FBQ0EsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQUFmLEtBQStCQSxTQUFTLENBQVQsSUFBY0EsU0FBUyxDQUFULENBQTdDLElBQ0EsQ0FBQ0EsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQUFmLEtBQStCQSxTQUFTLENBQVQsSUFBY0EsU0FBUyxDQUFULENBQTdDLENBREEsR0FFQSxDQUFDQSxTQUFTLENBQVQsSUFBY0EsU0FBUyxDQUFULENBQWYsS0FBK0JBLFNBQVMsQ0FBVCxJQUFjQSxTQUFTLENBQVQsQ0FBN0MsQ0FGUDtBQUdEOzs7OztrQkFHWWxJLGMiLCJmaWxlIjoibW90aW9uLWZlYXR1cmVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGltZSBpbiBzZWNvbmRzIGFjY29yZGluZyB0byB0aGUgY3VycmVudFxuICogZW52aXJvbm5lbWVudCAobm9kZSBvciBicm93c2VyKS5cbiAqIElmIHJ1bm5pbmcgaW4gbm9kZSB0aGUgdGltZSByZWx5IG9uIGBwcm9jZXNzLmhydGltZWAsIHdoaWxlIGlmIGluIHRoZSBicm93c2VyXG4gKiBpdCBpcyBwcm92aWRlZCBieSB0aGUgYERhdGVgIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGdldFRpbWVGdW5jdGlvbigpIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7IC8vIGFzc3VtZSBub2RlXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNvbnN0IHQgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgICAgcmV0dXJuIHRbMF0gKyB0WzFdICogMWUtOTtcbiAgICB9XG4gIH0gZWxzZSB7IC8vIGJyb3dzZXJcbiAgICBpZiAod2luZG93LnBlcmZvcm1hbmNlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKERhdGUubm93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gbmV3IERhdGUuZ2V0VGltZSgpIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gRGF0ZS5ub3coKSB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIH07XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IHBlcmZOb3cgPSBnZXRUaW1lRnVuY3Rpb24oKTtcblxuLyoqXG4gKiBAdG9kbyB0eXBlZGVmIGNvbnN0cnVjdG9yIGFyZ3VtZW50XG4gKi9cblxuLyoqXG4gKiBDbGFzcyBjb21wdXRpbmcgdGhlIGRlc2NyaXB0b3JzIGZyb20gYWNjZWxlcm9tZXRlciBhbmQgZ3lyb3Njb3BlIGRhdGEuXG4gKiA8YnIgLz5cbiAqIEV4YW1wbGUgOlxuICogYGBgSmF2YVNjcmlwdFxuICogLy8gZXM2IHdpdGggYnJvd3NlcmlmeSA6XG4gKiBpbXBvcnQgeyBNb3Rpb25GZWF0dXJlcyB9IGZyb20gJ21vdGlvbi1mZWF0dXJlcyc7IFxuICogY29uc3QgbWYgPSBuZXcgTW90aW9uRmVhdHVyZXMoeyBkZXNjcmlwdG9yczogWydhY2NJbnRlbnNpdHknLCAna2ljayddIH0pO1xuICpcbiAqIC8vIGVzNSB3aXRoIGJyb3dzZXJpZnkgOlxuICogdmFyIG1vdGlvbkZlYXR1cmVzID0gcmVxdWlyZSgnbW90aW9uLWZlYXR1cmVzJyk7XG4gKiB2YXIgbWYgPSBuZXcgbW90aW9uRmVhdHVyZXMuTW90aW9uRmVhdHVyZXMoeyBkZXNjcmlwdG9yczogWydhY2NJbnRlbnNpdHknLCAna2ljayddIH0pO1xuICpcbiAqIC8vIGxvYWRpbmcgZnJvbSBhIFwic2NyaXB0XCIgdGFnIDpcbiAqIHZhciBtZiA9IG5ldyBtb3Rpb25GZWF0dXJlcy5Nb3Rpb25GZWF0dXJlcyh7IGRlc2NyaXB0b3JzOiBbJ2FjY0ludGVuc2l0eScsICdraWNrJ10gfSk7XG4gKlxuICogLy8gdGhlbiwgb24gZWFjaCBtb3Rpb24gZXZlbnQgOlxuICogbWYuc2V0QWNjZWxlcm9tZXRlcih4LCB5LCB6KTtcbiAqIG1mLnNldEd5cm9zY29wZShhbHBoYSwgYmV0YSwgdGhldGEpO1xuICogbWYudXBkYXRlKGZ1bmN0aW9uKGVyciwgcmVzKSB7XG4gKiAgIGlmIChlcnIgPT09IG51bGwpIHtcbiAqICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCByZXNcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBNb3Rpb25GZWF0dXJlcyB7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpbml0T2JqZWN0IC0gb2JqZWN0IGNvbnRhaW5pbmcgYW4gYXJyYXkgb2YgdGhlXG4gICAqIHJlcXVpcmVkIGRlc2NyaXB0b3JzIGFuZCBzb21lIHZhcmlhYmxlcyB1c2VkIHRvIGNvbXB1dGUgdGhlIGRlc2NyaXB0b3JzXG4gICAqIHRoYXQgeW91IG1pZ2h0IHdhbnQgdG8gY2hhbmdlIChmb3IgZXhhbXBsZSBpZiB0aGUgYnJvd3NlciBpcyBjaHJvbWUgeW91XG4gICAqIG1pZ2h0IHdhbnQgdG8gc2V0IGBneXJJc0luRGVncmVlc2AgdG8gZmFsc2UgYmVjYXVzZSBpdCdzIHRoZSBjYXNlIG9uIHNvbWVcbiAgICogdmVyc2lvbnMsIG9yIHlvdSBtaWdodCB3YW50IHRvIGNoYW5nZSBzb21lIHRocmVzaG9sZHMpLlxuICAgKiBTZWUgdGhlIGNvZGUgZm9yIG1vcmUgZGV0YWlscy5cbiAgICpcbiAgICogQHRvZG8gdXNlIHR5cGVkZWYgdG8gZGVzY3JpYmUgdGhlIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVyc1xuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkZXNjcmlwdG9yczogW1xuICAgICAgICAnYWNjUmF3JyxcbiAgICAgICAgJ2d5clJhdycsXG4gICAgICAgICdhY2NJbnRlbnNpdHknLFxuICAgICAgICAnZ3lySW50ZW5zaXR5JyxcbiAgICAgICAgJ2ZyZWVmYWxsJyxcbiAgICAgICAgJ2tpY2snLFxuICAgICAgICAnc2hha2UnLFxuICAgICAgICAnc3BpbicsXG4gICAgICAgICdzdGlsbCdcbiAgICAgIF0sXG5cbiAgICAgIGd5cklzSW5EZWdyZWVzOiB0cnVlLFxuXG4gICAgICBhY2NJbnRlbnNpdHlQYXJhbTE6IDAuOCxcbiAgICAgIGFjY0ludGVuc2l0eVBhcmFtMjogMC4xLFxuXG4gICAgICBneXJJbnRlbnNpdHlQYXJhbTE6IDAuOSxcbiAgICAgIGd5ckludGVuc2l0eVBhcmFtMjogMSxcblxuICAgICAgZnJlZWZhbGxBY2NUaHJlc2g6IDAuMTUsXG4gICAgICBmcmVlZmFsbEd5clRocmVzaDogNzUwLFxuICAgICAgZnJlZWZhbGxHeXJEZWx0YVRocmVzaDogNDAsXG5cbiAgICAgIGtpY2tUaHJlc2g6IDAuMDEsXG4gICAgICBraWNrU3BlZWRHYXRlOiAyMDAsXG4gICAgICBraWNrTWVkaWFuRmlsdGVyc2l6ZTogOSxcbiAgICAgIGtpY2tDYWxsYmFjazogbnVsbCxcblxuICAgICAgc2hha2VUaHJlc2g6IDAuMSxcbiAgICAgIHNoYWtlV2luZG93U2l6ZTogMjAwLFxuICAgICAgc2hha2VTbGlkZUZhY3RvcjogMTAsXG5cbiAgICAgIHNwaW5UaHJlc2g6IDIwMCxcblxuICAgICAgc3RpbGxUaHJlc2g6IDUwMDAsXG4gICAgICBzdGlsbFNsaWRlRmFjdG9yOiA1LFxuXG4gICAgfTtcblxuICAgIHRoaXMuX3BhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICAvL2NvbnNvbGUubG9nKHRoaXMuX3BhcmFtcy5kZXNjcmlwdG9ycyk7XG5cbiAgICB0aGlzLl9tZXRob2RzID0ge1xuICAgICAgYWNjUmF3OiB0aGlzLl91cGRhdGVBY2NSYXcuYmluZCh0aGlzKSxcbiAgICAgIGd5clJhdzogdGhpcy5fdXBkYXRlR3lyUmF3LmJpbmQodGhpcyksXG4gICAgICBhY2NJbnRlbnNpdHk6IHRoaXMuX3VwZGF0ZUFjY0ludGVuc2l0eS5iaW5kKHRoaXMpLFxuICAgICAgZ3lySW50ZW5zaXR5OiB0aGlzLl91cGRhdGVHeXJJbnRlbnNpdHkuYmluZCh0aGlzKSxcbiAgICAgIGZyZWVmYWxsOiB0aGlzLl91cGRhdGVGcmVlZmFsbC5iaW5kKHRoaXMpLFxuICAgICAga2ljazogdGhpcy5fdXBkYXRlS2ljay5iaW5kKHRoaXMpLFxuICAgICAgc2hha2U6IHRoaXMuX3VwZGF0ZVNoYWtlLmJpbmQodGhpcyksXG4gICAgICBzcGluOiB0aGlzLl91cGRhdGVTcGluLmJpbmQodGhpcyksXG4gICAgICBzdGlsbDogdGhpcy5fdXBkYXRlU3RpbGwuYmluZCh0aGlzKVxuICAgIH07XG5cbiAgICB0aGlzLl9raWNrQ2FsbGJhY2sgPSB0aGlzLl9wYXJhbXMua2lja0NhbGxiYWNrO1xuXG4gICAgdGhpcy5hY2MgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5neXIgPSBbMCwgMCwgMF07XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBhY2MgaW50ZW5zaXR5XG4gICAgdGhpcy5fYWNjTGFzdCA9IFtcbiAgICAgIFswLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwXVxuICAgIF07XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5TGFzdCA9IFtcbiAgICAgIFswLCAwXSxcbiAgICAgIFswLCAwXSxcbiAgICAgIFswLCAwXVxuICAgIF07XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5ID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBmcmVlZmFsbFxuICAgIHRoaXMuX2FjY05vcm0gPSAwO1xuICAgIHRoaXMuX2d5ckRlbHRhID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX2d5ck5vcm0gPSAwO1xuICAgIHRoaXMuX2d5ckRlbHRhTm9ybSA9IDA7XG4gICAgdGhpcy5fZmFsbEJlZ2luID0gcGVyZk5vdygpO1xuICAgIHRoaXMuX2ZhbGxFbmQgPSBwZXJmTm93KCk7XG4gICAgdGhpcy5fZmFsbER1cmF0aW9uID0gMDtcbiAgICB0aGlzLl9pc0ZhbGxpbmcgPSBmYWxzZTtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGd5ciBpbnRlbnNpdHlcbiAgICB0aGlzLl9neXJMYXN0ID0gW1xuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHlMYXN0ID0gW1xuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHkgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBraWNrXG4gICAgdGhpcy5fa2lja0ludGVuc2l0eSA9IDA7XG4gICAgdGhpcy5fbGFzdEtpY2sgPSAwO1xuICAgIHRoaXMuX2lzS2lja2luZyA9IGZhbHNlO1xuICAgIHRoaXMuX21lZGlhblZhbHVlcyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcbiAgICB0aGlzLl9tZWRpYW5MaW5raW5nID0gWzMsIDQsIDEsIDUsIDcsIDgsIDAsIDIsIDZdO1xuICAgIHRoaXMuX21lZGlhbkZpZm8gPSBbNiwgMiwgNywgMCwgMSwgMywgOCwgNCwgNV07XG4gICAgdGhpcy5faTEgPSAwO1xuICAgIHRoaXMuX2kyID0gMDtcbiAgICB0aGlzLl9pMyA9IDA7XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNoYWtlXG4gICAgdGhpcy5fYWNjRGVsdGEgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fc2hha2VXaW5kb3cgPSBbXG4gICAgICBuZXcgQXJyYXkodGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZSksXG4gICAgICBuZXcgQXJyYXkodGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZSksXG4gICAgICBuZXcgQXJyYXkodGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZSlcbiAgICBdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemU7IGorKykge1xuICAgICAgICB0aGlzLl9zaGFrZVdpbmRvd1tpXVtqXSA9IDA7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3NoYWtlTmIgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fc2hha2luZ1JhdyA9IDA7XG4gICAgdGhpcy5fc2hha2VTbGlkZVByZXYgPSAwO1xuICAgIHRoaXMuX3NoYWtpbmcgPSAwO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc3BpblxuICAgIHRoaXMuX3NwaW5CZWdpbiA9IHBlcmZOb3coKTtcbiAgICB0aGlzLl9zcGluRW5kID0gcGVyZk5vdygpO1xuICAgIHRoaXMuX3NwaW5EdXJhdGlvbiA9IDA7XG4gICAgdGhpcy5faXNTcGlubmluZyA9IGZhbHNlO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzdGlsbFxuICAgIHRoaXMuX3N0aWxsQ3Jvc3NQcm9kID0gMDtcbiAgICB0aGlzLl9zdGlsbFNsaWRlID0gMDtcbiAgICB0aGlzLl9zdGlsbFNsaWRlUHJldiA9IDA7XG4gICAgdGhpcy5faXNTdGlsbCA9IGZhbHNlO1xuXG4gICAgdGhpcy5fbG9vcEluZGV4UGVyaW9kID0gdGhpcy5fbGNtKFxuICAgICAgdGhpcy5fbGNtKFxuICAgICAgICB0aGlzLl9sY20oMiwgMyksIHRoaXMuX3BhcmFtcy5raWNrTWVkaWFuRmlsdGVyc2l6ZVxuICAgICAgKSxcbiAgICAgIHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemVcbiAgICApO1xuICAgIC8vY29uc29sZS5sb2codGhpcy5fbG9vcEluZGV4UGVyaW9kKTtcbiAgICB0aGlzLl9sb29wSW5kZXggPSAwO1xuICB9XG5cbiAgLy89PT09PT09PT09IGludGVyZmFjZSA9PT09PT09PT0vL1xuXG4gIC8qKlxuICAgKiBVcGRhdGUgY29uZmlndXJhdGlvbiBwYXJhbXMgKGV4Y2VwdCBkZXNjcmlwdG9ycyBsaXN0KVxuICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gYSBzdWJzZXQgb2YgdGhlIGNvbnN0cnVjdG9yJ3MgcGFyYW1zXG4gICAqL1xuICB1cGRhdGVQYXJhbXMocGFyYW1zID0ge30pIHtcbiAgICBmb3IgKGxldCBrZXkgaW4gcGFyYW1zKSB7XG4gICAgICB0aGlzLl9wYXJhbXNba2V5XSA9IHBhcmFtc1trZXldO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGFjY2VsZXJvbWV0ZXIgdmFsdWVzLlxuICAgKiBAcGFyYW0ge051bWJlcn0geCAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeCB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geSAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeSB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geiAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeiB2YWx1ZVxuICAgKi9cbiAgc2V0QWNjZWxlcm9tZXRlcih4LCB5ID0gMCwgeiA9IDApIHtcbiAgICB0aGlzLmFjY1swXSA9IHg7XG4gICAgdGhpcy5hY2NbMV0gPSB5O1xuICAgIHRoaXMuYWNjWzJdID0gejtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGd5cm9zY29wZSB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB4IC0gdGhlIGd5cm9zY29wZSdzIHggdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHkgLSB0aGUgZ3lyb3Njb3BlJ3MgeSB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geiAtIHRoZSBneXJvc2NvcGUncyB6IHZhbHVlXG4gICAqL1xuICBzZXRHeXJvc2NvcGUoeCwgeSA9IDAsIHogPSAwKSB7XG4gICAgdGhpcy5neXJbMF0gPSB4O1xuICAgIHRoaXMuZ3lyWzFdID0geTtcbiAgICB0aGlzLmd5clsyXSA9IHo7XG4gICAgaWYgKHRoaXMuX3BhcmFtcy5neXJJc0luRGVncmVlcykge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgdGhpcy5neXJbaV0gKj0gKDIgKiBNYXRoLlBJIC8gMzYwLik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGFuIGFjY2VsZXJvbWV0ZXIuXG4gICAqIEB0eXBlZGVmIGFjY0ludGVuc2l0eVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gbm9ybSAtIHRoZSBnbG9iYWwgZW5lcmd5IGNvbXB1dGVkIG9uIGFsbCBkaW1lbnNpb25zLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geCAtIHRoZSBlbmVyZ3kgaW4gdGhlIHggKGZpcnN0KSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB5IC0gdGhlIGVuZXJneSBpbiB0aGUgeSAoc2Vjb25kKSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB6IC0gdGhlIGVuZXJneSBpbiB0aGUgeiAodGhpcmQpIGRpbWVuc2lvbi5cbiAgICovXG5cbiAgLyoqXG4gICAqIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGEgZ3lyb3Njb3BlLlxuICAgKiBAdHlwZWRlZiBneXJJbnRlbnNpdHlcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IG5vcm0gLSB0aGUgZ2xvYmFsIGVuZXJneSBjb21wdXRlZCBvbiBhbGwgZGltZW5zaW9ucy5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHggLSB0aGUgZW5lcmd5IGluIHRoZSB4IChmaXJzdCkgZGltZW5zaW9uLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geSAtIHRoZSBlbmVyZ3kgaW4gdGhlIHkgKHNlY29uZCkgZGltZW5zaW9uLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geiAtIHRoZSBlbmVyZ3kgaW4gdGhlIHogKHRoaXJkKSBkaW1lbnNpb24uXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZnJlZSBmYWxsaW5nIHN0YXRlIG9mIHRoZSBzZW5zb3IuXG4gICAqIEB0eXBlZGVmIGZyZWVmYWxsXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBhY2NOb3JtIC0gdGhlIG5vcm0gb2YgdGhlIGFjY2VsZXJhdGlvbi5cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBmYWxsaW5nIC0gdHJ1ZSBpZiB0aGUgc2Vuc29yIGlzIGZyZWUgZmFsbGluZywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gZHVyYXRpb24gLSB0aGUgZHVyYXRpb24gb2YgdGhlIGZyZWUgZmFsbGluZyBzaW5jZSBpdHMgYmVnaW5uaW5nLlxuICAgKi9cblxuICAvKipcbiAgICogSW1wdWxzZSAvIGhpdCBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEB0eXBlZGVmIGtpY2tcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGludGVuc2l0eSAtIHRoZSBjdXJyZW50IGludGVuc2l0eSBvZiB0aGUgXCJraWNrXCIgZ2VzdHVyZS5cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBraWNraW5nIC0gdHJ1ZSBpZiBhIFwia2lja1wiIGdlc3R1cmUgaXMgYmVpbmcgZGV0ZWN0ZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG5cbiAgLyoqXG4gICAqIFNoYWtlIG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHR5cGVkZWYgc2hha2VcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHNoYWtpbmcgLSB0aGUgY3VycmVudCBhbW91bnQgb2YgXCJzaGFraW5lc3NcIi5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzcGlubmluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAdHlwZWRlZiBzcGluXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gc3Bpbm5pbmcgLSB0cnVlIGlmIHRoZSBzZW5zb3IgaXMgc3Bpbm5pbmcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGR1cmF0aW9uIC0gdGhlIGR1cmF0aW9uIG9mIHRoZSBzcGlubmluZyBzaW5jZSBpdHMgYmVnaW5uaW5nLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gZ3lyTm9ybSAtIHRoZSBub3JtIG9mIHRoZSByb3RhdGlvbiBzcGVlZC5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzdGlsbG5lc3Mgb2YgdGhlIHNlbnNvci5cbiAgICogQHR5cGVkZWYgc3RpbGxcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBzdGlsbCAtIHRydWUgaWYgdGhlIHNlbnNvciBpcyBzdGlsbCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gc2xpZGUgLSB0aGUgb3JpZ2luYWwgdmFsdWUgdGhyZXNob2xkZWQgdG8gZGV0ZXJtaW5lIHN0aWxsbmVzcy5cbiAgICovXG5cbiAgLyoqXG4gICAqIENvbXB1dGVkIGZlYXR1cmVzLlxuICAgKiBAdHlwZWRlZiBmZWF0dXJlc1xuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge2FjY0ludGVuc2l0eX0gYWNjSW50ZW5zaXR5IC0gSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYW4gYWNjZWxlcm9tZXRlci5cbiAgICogQHByb3BlcnR5IHtneXJJbnRlbnNpdHl9IGd5ckludGVuc2l0eSAtIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGEgZ3lyb3Njb3BlLlxuICAgKiBAcHJvcGVydHkge2ZyZWVmYWxsfSBmcmVlZmFsbCAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBmcmVlIGZhbGxpbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHByb3BlcnR5IHtraWNrfSBraWNrIC0gSW1wdWxzZSAvIGhpdCBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEBwcm9wZXJ0eSB7c2hha2V9IHNoYWtlIC0gU2hha2UgbW92ZW1lbnQgZGV0ZWN0aW9uIGluZm9ybWF0aW9uLlxuICAgKiBAcHJvcGVydHkge3NwaW59IHNwaW4gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgc3Bpbm5pbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHByb3BlcnR5IHtzdGlsbH0gc3RpbGwgLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgc3RpbGxuZXNzIG9mIHRoZSBzZW5zb3IuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBoYW5kbGluZyB0aGUgZmVhdHVyZXMuXG4gICAqIEBjYWxsYmFjayBmZWF0dXJlc0NhbGxiYWNrXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlcnIgLSBEZXNjcmlwdGlvbiBvZiBhIHBvdGVudGlhbCBlcnJvci5cbiAgICogQHBhcmFtIHtmZWF0dXJlc30gcmVzIC0gT2JqZWN0IGhvbGRpbmcgdGhlIGZlYXR1cmUgdmFsdWVzLlxuICAgKi9cblxuICAvKipcbiAgICogVHJpZ2dlcnMgY29tcHV0YXRpb24gb2YgdGhlIGRlc2NyaXB0b3JzIGZyb20gdGhlIGN1cnJlbnQgc2Vuc29yIHZhbHVlcyBhbmRcbiAgICogcGFzcyB0aGUgcmVzdWx0cyB0byBhIGNhbGxiYWNrXG4gICAqIEBwYXJhbSB7ZmVhdHVyZXNDYWxsYmFja30gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgaGFuZGxpbmcgdGhlIGxhc3QgY29tcHV0ZWQgZGVzY3JpcHRvcnNcbiAgICogQHJldHVybnMge2ZlYXR1cmVzfSBmZWF0dXJlcyAtIFJldHVybiB0aGVzZSBjb21wdXRlZCBkZXNjcmlwdG9ycyBhbnl3YXlcbiAgICovXG4gIHVwZGF0ZShjYWxsYmFjayA9IG51bGwpIHtcbiAgICAvLyBERUFMIFdJVEggdGhpcy5fZWxhcHNlZFRpbWVcbiAgICB0aGlzLl9lbGFwc2VkVGltZSA9IHBlcmZOb3coKTtcbiAgICAvLyBpcyB0aGlzIG9uZSB1c2VkIGJ5IHNldmVyYWwgZmVhdHVyZXMgP1xuICAgIHRoaXMuX2FjY05vcm0gPSB0aGlzLl9tYWduaXR1ZGUzRCh0aGlzLmFjYyk7XG4gICAgLy8gdGhpcyBvbmUgbmVlZHMgYmUgaGVyZSBiZWNhdXNlIHVzZWQgYnkgZnJlZWZhbGwgQU5EIHNwaW5cbiAgICB0aGlzLl9neXJOb3JtID0gdGhpcy5fbWFnbml0dWRlM0QodGhpcy5neXIpO1xuICAgIFxuICAgIGxldCBlcnIgPSBudWxsO1xuICAgIGxldCByZXMgPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICByZXMgPSB7fTtcbiAgICAgIGZvciAobGV0IGtleSBvZiB0aGlzLl9wYXJhbXMuZGVzY3JpcHRvcnMpIHtcbiAgICAgICAgaWYgKHRoaXMuX21ldGhvZHNba2V5XSkge1xuICAgICAgICAgIHRoaXMuX21ldGhvZHNba2V5XShyZXMpO1xuICAgICAgICB9XG4gICAgICB9IFxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGVyciA9IGU7XG4gICAgfVxuXG4gICAgdGhpcy5fbG9vcEluZGV4ID0gKHRoaXMuX2xvb3BJbmRleCArIDEpICUgdGhpcy5fbG9vcEluZGV4UGVyaW9kO1xuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhlcnIsIHJlcyk7ICBcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT0gc3BlY2lmaWMgZGVzY3JpcHRvcnMgY29tcHV0aW5nID09PT09PT09PT09PT09PT09PT09Ly9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVBY2NSYXcocmVzKSB7XG4gICAgcmVzLmFjY1JhdyA9IHtcbiAgICAgIHg6IHRoaXMuYWNjWzBdLFxuICAgICAgeTogdGhpcy5hY2NbMV0sXG4gICAgICB6OiB0aGlzLmFjY1syXVxuICAgIH07XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUd5clJhdyhyZXMpIHtcbiAgICByZXMuZ3lyUmF3ID0ge1xuICAgICAgeDogdGhpcy5neXJbMF0sXG4gICAgICB5OiB0aGlzLmd5clsxXSxcbiAgICAgIHo6IHRoaXMuZ3lyWzJdXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gYWNjIGludGVuc2l0eVxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUFjY0ludGVuc2l0eShyZXMpIHtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID0gMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB0aGlzLl9hY2NMYXN0W2ldW3RoaXMuX2xvb3BJbmRleCAlIDNdID0gdGhpcy5hY2NbaV07XG5cbiAgICAgIHRoaXMuX2FjY0ludGVuc2l0eVtpXSA9IHRoaXMuX2ludGVuc2l0eTFEKFxuICAgICAgICB0aGlzLmFjY1tpXSxcbiAgICAgICAgdGhpcy5fYWNjTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSxcbiAgICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5TGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAyXSxcbiAgICAgICAgdGhpcy5fcGFyYW1zLmFjY0ludGVuc2l0eVBhcmFtMSxcbiAgICAgICAgdGhpcy5fcGFyYW1zLmFjY0ludGVuc2l0eVBhcmFtMixcbiAgICAgICAgMVxuICAgICAgKTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5TGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAyXSA9IHRoaXMuX2FjY0ludGVuc2l0eVtpXTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSArPSB0aGlzLl9hY2NJbnRlbnNpdHlbaV07XG4gICAgfVxuXG4gICAgcmVzLmFjY0ludGVuc2l0eSA9IHtcbiAgICAgIG5vcm06IHRoaXMuX2FjY0ludGVuc2l0eU5vcm0sXG4gICAgICB4OiB0aGlzLl9hY2NJbnRlbnNpdHlbMF0sXG4gICAgICB5OiB0aGlzLl9hY2NJbnRlbnNpdHlbMV0sXG4gICAgICB6OiB0aGlzLl9hY2NJbnRlbnNpdHlbMl1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBneXIgaW50ZW5zaXR5XG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlR3lySW50ZW5zaXR5KHJlcykge1xuICAgIHRoaXMuX2d5ckludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2d5ckxhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmd5cltpXTtcblxuICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5W2ldID0gdGhpcy5faW50ZW5zaXR5MUQoXG4gICAgICAgIHRoaXMuZ3lyW2ldLFxuICAgICAgICB0aGlzLl9neXJMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLFxuICAgICAgICB0aGlzLl9neXJJbnRlbnNpdHlMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDJdLFxuICAgICAgICB0aGlzLl9wYXJhbXMuZ3lySW50ZW5zaXR5UGFyYW0xLFxuICAgICAgICB0aGlzLl9wYXJhbXMuZ3lySW50ZW5zaXR5UGFyYW0yLFxuICAgICAgICAxXG4gICAgICApO1xuXG4gICAgICB0aGlzLl9neXJJbnRlbnNpdHlMYXN0W2ldW3RoaXMuX2xvb3BJbmRleCAlIDJdID0gdGhpcy5fZ3lySW50ZW5zaXR5W2ldO1xuXG4gICAgICB0aGlzLl9neXJJbnRlbnNpdHlOb3JtICs9IHRoaXMuX2d5ckludGVuc2l0eVtpXTtcbiAgICB9XG5cbiAgICByZXMuZ3lySW50ZW5zaXR5ID0ge1xuICAgICAgbm9ybTogdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSxcbiAgICAgIHg6IHRoaXMuX2d5ckludGVuc2l0eVswXSxcbiAgICAgIHk6IHRoaXMuX2d5ckludGVuc2l0eVsxXSxcbiAgICAgIHo6IHRoaXMuX2d5ckludGVuc2l0eVsyXVxuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZnJlZWZhbGxcbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVGcmVlZmFsbChyZXMpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgdGhpcy5fZ3lyRGVsdGFbaV0gPVxuICAgICAgICB0aGlzLl9kZWx0YSh0aGlzLl9neXJMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLCB0aGlzLmd5cltpXSwgMSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZ3lyRGVsdGFOb3JtID0gdGhpcy5fbWFnbml0dWRlM0QodGhpcy5fZ3lyRGVsdGEpO1xuXG4gICAgaWYgKHRoaXMuX2FjY05vcm0gPCB0aGlzLl9wYXJhbXMuZnJlZWZhbGxBY2NUaHJlc2ggfHxcbiAgICAgICAgKHRoaXMuX2d5ck5vcm0gPiB0aGlzLl9wYXJhbXMuZnJlZWZhbGxHeXJUaHJlc2hcbiAgICAgICAgICAmJiB0aGlzLl9neXJEZWx0YU5vcm0gPCB0aGlzLl9wYXJhbXMuZnJlZWZhbGxHeXJEZWx0YVRocmVzaCkpIHtcbiAgICAgIGlmICghdGhpcy5faXNGYWxsaW5nKSB7XG4gICAgICAgIHRoaXMuX2lzRmFsbGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX2ZhbGxCZWdpbiA9IHBlcmZOb3coKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2ZhbGxFbmQgPSBwZXJmTm93KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLl9pc0ZhbGxpbmcpIHtcbiAgICAgICAgdGhpcy5faXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2ZhbGxEdXJhdGlvbiA9ICh0aGlzLl9mYWxsRW5kIC0gdGhpcy5fZmFsbEJlZ2luKTtcblxuICAgIHJlcy5mcmVlZmFsbCA9IHtcbiAgICAgIGFjY05vcm06IHRoaXMuX2FjY05vcm0sXG4gICAgICBmYWxsaW5nOiB0aGlzLl9pc0ZhbGxpbmcsXG4gICAgICBkdXJhdGlvbjogdGhpcy5fZmFsbER1cmF0aW9uXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0ga2lja1xuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUtpY2socmVzKSB7XG4gICAgdGhpcy5faTMgPSB0aGlzLl9sb29wSW5kZXggJSB0aGlzLl9wYXJhbXMua2lja01lZGlhbkZpbHRlcnNpemU7XG4gICAgdGhpcy5faTEgPSB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXTtcbiAgICB0aGlzLl9pMiA9IDE7XG5cbiAgICBpZiAodGhpcy5faTEgPCB0aGlzLl9wYXJhbXMua2lja01lZGlhbkZpbHRlcnNpemUgLSAxICYmXG4gICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPiB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl0pIHtcbiAgICAgIC8vIGNoZWNrIHJpZ2h0XG4gICAgICB3aGlsZSAodGhpcy5faTEgKyB0aGlzLl9pMiA8IHRoaXMua2lja01lZGlhbkZpbHRlcnNpemUgJiZcbiAgICAgICAgICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA+IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXSkge1xuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl1dID0gXG4gICAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyXV0gLSAxO1xuICAgICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID1cbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl07XG4gICAgICAgIHRoaXMuX2kyKys7XG4gICAgICB9XG4gICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcbiAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID0gdGhpcy5faTM7XG4gICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXSA9IHRoaXMuX2kxICsgdGhpcy5faTIgLSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjaGVjayBsZWZ0XG4gICAgICB3aGlsZSAodGhpcy5faTIgPCB0aGlzLl9pMSArIDEgJiZcbiAgICAgICAgICAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtIDwgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTJdKSB7XG4gICAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl1dICsgMTtcbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9pMisrO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9IHRoaXMuX2kzO1xuICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM10gPSB0aGlzLl9pMSAtIHRoaXMuX2kyICsgMTtcbiAgICB9XG5cbiAgICAvLyBjb21wYXJlIGN1cnJlbnQgaW50ZW5zaXR5IG5vcm0gd2l0aCBwcmV2aW91cyBtZWRpYW4gdmFsdWVcbiAgICBpZiAodGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSAtIHRoaXMuX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4gPiB0aGlzLl9wYXJhbXMua2lja1RocmVzaCkge1xuICAgICAgaWYgKHRoaXMuX2lzS2lja2luZykge1xuICAgICAgICBpZiAodGhpcy5fa2lja0ludGVuc2l0eSA8IHRoaXMuX2FjY0ludGVuc2l0eU5vcm0pIHtcbiAgICAgICAgICB0aGlzLl9raWNrSW50ZW5zaXR5ID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fa2lja0NhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fa2lja0NhbGxiYWNrKHsgc3RhdGU6ICdtaWRkbGUnLCBpbnRlbnNpdHk6IHRoaXMuX2tpY2tJbnRlbnNpdHkgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2lzS2lja2luZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX2tpY2tJbnRlbnNpdHkgPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgICB0aGlzLl9sYXN0S2ljayA9IHRoaXMuX2VsYXBzZWRUaW1lO1xuICAgICAgICBpZiAodGhpcy5fa2lja0NhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fa2lja0NhbGxiYWNrKHsgc3RhdGU6ICdzdGFydCcsIGludGVuc2l0eTogdGhpcy5fa2lja0ludGVuc2l0eSB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5fZWxhcHNlZFRpbWUgLSB0aGlzLl9sYXN0S2ljayA+IHRoaXMuX3BhcmFtcy5raWNrU3BlZWRHYXRlKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc0tpY2tpbmcgJiYgdGhpcy5fa2lja0NhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fa2lja0NhbGxiYWNrKHsgc3RhdGU6ICdzdG9wJywgaW50ZW5zaXR5OiB0aGlzLl9raWNrSW50ZW5zaXR5IH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2lzS2lja2luZyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4gPSB0aGlzLl9tZWRpYW5WYWx1ZXNbTWF0aC5jZWlsKHRoaXMuX3BhcmFtcy5raWNrTWVkaWFuRmlsdGVyc2l6ZSAqIDAuNSldO1xuXG4gICAgcmVzLmtpY2sgPSB7XG4gICAgICBpbnRlbnNpdHk6IHRoaXMuX2tpY2tJbnRlbnNpdHksXG4gICAgICBraWNraW5nOiB0aGlzLl9pc0tpY2tpbmdcbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNoYWtlXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlU2hha2UocmVzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2FjY0RlbHRhW2ldID0gdGhpcy5fZGVsdGEoXG4gICAgICAgIHRoaXMuX2FjY0xhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuYWNjW2ldLFxuICAgICAgICAxXG4gICAgICApO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZV0pIHtcbiAgICAgICAgdGhpcy5fc2hha2VOYltpXS0tO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuX2FjY0RlbHRhW2ldID4gdGhpcy5fcGFyYW1zLnNoYWtlVGhyZXNoKSB7XG4gICAgICAgIHRoaXMuX3NoYWtlV2luZG93W2ldW3RoaXMuX2xvb3BJbmRleCAlIHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemVdID0gMTtcbiAgICAgICAgdGhpcy5fc2hha2VOYltpXSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZV0gPSAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX3NoYWtpbmdSYXcgPVxuICAgIHRoaXMuX21hZ25pdHVkZTNEKHRoaXMuX3NoYWtlTmIpIC9cbiAgICB0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplO1xuICAgIHRoaXMuX3NoYWtlU2xpZGVQcmV2ID0gdGhpcy5fc2hha2luZztcbiAgICB0aGlzLl9zaGFraW5nID1cbiAgICB0aGlzLl9zbGlkZSh0aGlzLl9zaGFrZVNsaWRlUHJldiwgdGhpcy5fc2hha2luZ1JhdywgdGhpcy5fcGFyYW1zLnNoYWtlU2xpZGVGYWN0b3IpO1xuXG4gICAgcmVzLnNoYWtlID0ge1xuICAgICAgc2hha2luZzogdGhpcy5fc2hha2luZ1xuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNwaW5cbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVTcGluKHJlcykge1xuICAgIGlmICh0aGlzLl9neXJOb3JtID4gdGhpcy5fcGFyYW1zLnNwaW5UaHJlc2gpIHtcbiAgICAgIGlmICghdGhpcy5faXNTcGlubmluZykge1xuICAgICAgICB0aGlzLl9pc1NwaW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fc3BpbkJlZ2luID0gcGVyZk5vdygpO1xuICAgICAgfVxuICAgICAgdGhpcy5fc3BpbkVuZCA9IHBlcmZOb3coKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2lzU3Bpbm5pbmcpIHtcbiAgICAgIHRoaXMuX2lzU3Bpbm5pbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy5fc3BpbkR1cmF0aW9uID0gdGhpcy5fc3BpbkVuZCAtIHRoaXMuX3NwaW5CZWdpbjtcblxuICAgIHJlcy5zcGluID0ge1xuICAgICAgc3Bpbm5pbmc6IHRoaXMuX2lzU3Bpbm5pbmcsXG4gICAgICBkdXJhdGlvbjogdGhpcy5fc3BpbkR1cmF0aW9uLFxuICAgICAgZ3lyTm9ybTogdGhpcy5fZ3lyTm9ybVxuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc3RpbGxcbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVTdGlsbChyZXMpIHtcbiAgICB0aGlzLl9zdGlsbENyb3NzUHJvZCA9IHRoaXMuX3N0aWxsQ3Jvc3NQcm9kdWN0KHRoaXMuZ3lyKTtcbiAgICB0aGlzLl9zdGlsbFNsaWRlUHJldiA9IHRoaXMuX3N0aWxsU2xpZGU7XG4gICAgdGhpcy5fc3RpbGxTbGlkZSA9IHRoaXMuX3NsaWRlKFxuICAgICAgdGhpcy5fc3RpbGxTbGlkZVByZXYsXG4gICAgICB0aGlzLl9zdGlsbENyb3NzUHJvZCxcbiAgICAgIHRoaXMuX3BhcmFtcy5zdGlsbFNsaWRlRmFjdG9yXG4gICAgKTtcblxuICAgIGlmICh0aGlzLl9zdGlsbFNsaWRlID4gdGhpcy5fcGFyYW1zLnN0aWxsVGhyZXNoKSB7XG4gICAgICB0aGlzLl9pc1N0aWxsID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2lzU3RpbGwgPSB0cnVlO1xuICAgIH1cbiAgXG4gICAgcmVzLnN0aWxsID0ge1xuICAgICAgc3RpbGw6IHRoaXMuX2lzU3RpbGwsXG4gICAgICBzbGlkZTogdGhpcy5fc3RpbGxTbGlkZVxuICAgIH1cbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IFVUSUxJVElFUyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfZGVsdGEocHJldiwgbmV4dCwgZHQpIHtcbiAgICByZXR1cm4gKG5leHQgLSBwcmV2KSAvICgyICogZHQpO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF9pbnRlbnNpdHkxRChuZXh0WCwgcHJldlgsIHByZXZJbnRlbnNpdHksIHBhcmFtMSwgcGFyYW0yLCBkdCkge1xuICAgIGNvbnN0IGR4ID0gdGhpcy5fZGVsdGEobmV4dFgsIHByZXZYLCBkdCk7Ly8obmV4dFggLSBwcmV2WCkgLyAoMiAqIGR0KTtcbiAgICByZXR1cm4gcGFyYW0yICogZHggKiBkeCArIHBhcmFtMSAqIHByZXZJbnRlbnNpdHk7XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX21hZ25pdHVkZTNEKHh5ekFycmF5KSB7XG4gICAgcmV0dXJuIE1hdGguc3FydCh4eXpBcnJheVswXSAqIHh5ekFycmF5WzBdICsgXG4gICAgICAgICAgICAgICAgeHl6QXJyYXlbMV0gKiB4eXpBcnJheVsxXSArXG4gICAgICAgICAgICAgICAgeHl6QXJyYXlbMl0gKiB4eXpBcnJheVsyXSk7XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX2xjbShhLCBiKSB7XG4gICAgbGV0IGExID0gYSwgYjEgPSBiO1xuXG4gICAgd2hpbGUgKGExICE9IGIxKSB7XG4gICAgICBpZiAoYTEgPCBiMSkge1xuICAgICAgICBhMSArPSBhO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYjEgKz0gYjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYTE7XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX3NsaWRlKHByZXZTbGlkZSwgY3VycmVudFZhbCwgc2xpZGVGYWN0b3IpIHtcbiAgICByZXR1cm4gcHJldlNsaWRlICsgKGN1cnJlbnRWYWwgLSBwcmV2U2xpZGUpIC8gc2xpZGVGYWN0b3I7XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX3N0aWxsQ3Jvc3NQcm9kdWN0KHh5ekFycmF5KSB7XG4gICAgcmV0dXJuICh4eXpBcnJheVsxXSAtIHh5ekFycmF5WzJdKSAqICh4eXpBcnJheVsxXSAtIHh5ekFycmF5WzJdKSArXG4gICAgICAgICAgICh4eXpBcnJheVswXSAtIHh5ekFycmF5WzFdKSAqICh4eXpBcnJheVswXSAtIHh5ekFycmF5WzFdKSArXG4gICAgICAgICAgICh4eXpBcnJheVsyXSAtIHh5ekFycmF5WzBdKSAqICh4eXpBcnJheVsyXSAtIHh5ekFycmF5WzBdKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNb3Rpb25GZWF0dXJlcztcbiJdfQ==
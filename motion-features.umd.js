(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.motionFeatures = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _motionFeatures = require('./motion-features');

Object.defineProperty(exports, 'MotionFeatures', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_motionFeatures).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

},{"./motion-features":2}],2:[function(require,module,exports){
(function (process){
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

}).call(this,require('_process'))

},{"_process":67,"babel-runtime/core-js/get-iterator":3,"babel-runtime/core-js/object/assign":4,"babel-runtime/helpers/classCallCheck":6,"babel-runtime/helpers/createClass":7}],3:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/get-iterator"), __esModule: true };
},{"core-js/library/fn/get-iterator":8}],4:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/assign"), __esModule: true };
},{"core-js/library/fn/object/assign":9}],5:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/define-property"), __esModule: true };
},{"core-js/library/fn/object/define-property":10}],6:[function(require,module,exports){
"use strict";

exports.__esModule = true;

exports.default = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};
},{}],7:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _defineProperty = require("../core-js/object/define-property");

var _defineProperty2 = _interopRequireDefault(_defineProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      (0, _defineProperty2.default)(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();
},{"../core-js/object/define-property":5}],8:[function(require,module,exports){
require('../modules/web.dom.iterable');
require('../modules/es6.string.iterator');
module.exports = require('../modules/core.get-iterator');
},{"../modules/core.get-iterator":61,"../modules/es6.string.iterator":65,"../modules/web.dom.iterable":66}],9:[function(require,module,exports){
require('../../modules/es6.object.assign');
module.exports = require('../../modules/_core').Object.assign;
},{"../../modules/_core":17,"../../modules/es6.object.assign":63}],10:[function(require,module,exports){
require('../../modules/es6.object.define-property');
var $Object = require('../../modules/_core').Object;
module.exports = function defineProperty(it, key, desc){
  return $Object.defineProperty(it, key, desc);
};
},{"../../modules/_core":17,"../../modules/es6.object.define-property":64}],11:[function(require,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],12:[function(require,module,exports){
module.exports = function(){ /* empty */ };
},{}],13:[function(require,module,exports){
var isObject = require('./_is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./_is-object":31}],14:[function(require,module,exports){
// false -> Array#indexOf
// true  -> Array#includes
var toIObject = require('./_to-iobject')
  , toLength  = require('./_to-length')
  , toIndex   = require('./_to-index');
module.exports = function(IS_INCLUDES){
  return function($this, el, fromIndex){
    var O      = toIObject($this)
      , length = toLength(O.length)
      , index  = toIndex(fromIndex, length)
      , value;
    // Array#includes uses SameValueZero equality algorithm
    if(IS_INCLUDES && el != el)while(length > index){
      value = O[index++];
      if(value != value)return true;
    // Array#toIndex ignores holes, Array#includes - not
    } else for(;length > index; index++)if(IS_INCLUDES || index in O){
      if(O[index] === el)return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};
},{"./_to-index":52,"./_to-iobject":54,"./_to-length":55}],15:[function(require,module,exports){
// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = require('./_cof')
  , TAG = require('./_wks')('toStringTag')
  // ES3 wrong here
  , ARG = cof(function(){ return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function(it, key){
  try {
    return it[key];
  } catch(e){ /* empty */ }
};

module.exports = function(it){
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};
},{"./_cof":16,"./_wks":59}],16:[function(require,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],17:[function(require,module,exports){
var core = module.exports = {version: '2.4.0'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],18:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./_a-function');
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};
},{"./_a-function":11}],19:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],20:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./_fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_fails":24}],21:[function(require,module,exports){
var isObject = require('./_is-object')
  , document = require('./_global').document
  // in old IE typeof document.createElement is 'object'
  , is = isObject(document) && isObject(document.createElement);
module.exports = function(it){
  return is ? document.createElement(it) : {};
};
},{"./_global":25,"./_is-object":31}],22:[function(require,module,exports){
// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');
},{}],23:[function(require,module,exports){
var global    = require('./_global')
  , core      = require('./_core')
  , ctx       = require('./_ctx')
  , hide      = require('./_hide')
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , IS_WRAP   = type & $export.W
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , expProto  = exports[PROTOTYPE]
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
    , key, own, out;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function(C){
      var F = function(a, b, c){
        if(this instanceof C){
          switch(arguments.length){
            case 0: return new C;
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if(IS_PROTO){
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if(type & $export.R && expProto && !expProto[key])hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library` 
module.exports = $export;
},{"./_core":17,"./_ctx":18,"./_global":25,"./_hide":27}],24:[function(require,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],25:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],26:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};
},{}],27:[function(require,module,exports){
var dP         = require('./_object-dp')
  , createDesc = require('./_property-desc');
module.exports = require('./_descriptors') ? function(object, key, value){
  return dP.f(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./_descriptors":20,"./_object-dp":39,"./_property-desc":46}],28:[function(require,module,exports){
module.exports = require('./_global').document && document.documentElement;
},{"./_global":25}],29:[function(require,module,exports){
module.exports = !require('./_descriptors') && !require('./_fails')(function(){
  return Object.defineProperty(require('./_dom-create')('div'), 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_descriptors":20,"./_dom-create":21,"./_fails":24}],30:[function(require,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = require('./_cof');
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};
},{"./_cof":16}],31:[function(require,module,exports){
module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};
},{}],32:[function(require,module,exports){
'use strict';
var create         = require('./_object-create')
  , descriptor     = require('./_property-desc')
  , setToStringTag = require('./_set-to-string-tag')
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./_hide')(IteratorPrototype, require('./_wks')('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = create(IteratorPrototype, {next: descriptor(1, next)});
  setToStringTag(Constructor, NAME + ' Iterator');
};
},{"./_hide":27,"./_object-create":38,"./_property-desc":46,"./_set-to-string-tag":48,"./_wks":59}],33:[function(require,module,exports){
'use strict';
var LIBRARY        = require('./_library')
  , $export        = require('./_export')
  , redefine       = require('./_redefine')
  , hide           = require('./_hide')
  , has            = require('./_has')
  , Iterators      = require('./_iterators')
  , $iterCreate    = require('./_iter-create')
  , setToStringTag = require('./_set-to-string-tag')
  , getPrototypeOf = require('./_object-gpo')
  , ITERATOR       = require('./_wks')('iterator')
  , BUGGY          = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR    = '@@iterator'
  , KEYS           = 'keys'
  , VALUES         = 'values';

var returnThis = function(){ return this; };

module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED){
  $iterCreate(Constructor, NAME, next);
  var getMethod = function(kind){
    if(!BUGGY && kind in proto)return proto[kind];
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG        = NAME + ' Iterator'
    , DEF_VALUES = DEFAULT == VALUES
    , VALUES_BUG = false
    , proto      = Base.prototype
    , $native    = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , $default   = $native || getMethod(DEFAULT)
    , $entries   = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined
    , $anyNative = NAME == 'Array' ? proto.entries || $native : $native
    , methods, key, IteratorPrototype;
  // Fix native
  if($anyNative){
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base));
    if(IteratorPrototype !== Object.prototype){
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if(!LIBRARY && !has(IteratorPrototype, ITERATOR))hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if(DEF_VALUES && $native && $native.name !== VALUES){
    VALUES_BUG = true;
    $default = function values(){ return $native.call(this); };
  }
  // Define iterator
  if((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])){
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      values:  DEF_VALUES ? $default : getMethod(VALUES),
      keys:    IS_SET     ? $default : getMethod(KEYS),
      entries: $entries
    };
    if(FORCED)for(key in methods){
      if(!(key in proto))redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};
},{"./_export":23,"./_has":26,"./_hide":27,"./_iter-create":32,"./_iterators":35,"./_library":36,"./_object-gpo":42,"./_redefine":47,"./_set-to-string-tag":48,"./_wks":59}],34:[function(require,module,exports){
module.exports = function(done, value){
  return {value: value, done: !!done};
};
},{}],35:[function(require,module,exports){
module.exports = {};
},{}],36:[function(require,module,exports){
module.exports = true;
},{}],37:[function(require,module,exports){
'use strict';
// 19.1.2.1 Object.assign(target, source, ...)
var getKeys  = require('./_object-keys')
  , gOPS     = require('./_object-gops')
  , pIE      = require('./_object-pie')
  , toObject = require('./_to-object')
  , IObject  = require('./_iobject')
  , $assign  = Object.assign;

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = !$assign || require('./_fails')(function(){
  var A = {}
    , B = {}
    , S = Symbol()
    , K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function(k){ B[k] = k; });
  return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
}) ? function assign(target, source){ // eslint-disable-line no-unused-vars
  var T     = toObject(target)
    , aLen  = arguments.length
    , index = 1
    , getSymbols = gOPS.f
    , isEnum     = pIE.f;
  while(aLen > index){
    var S      = IObject(arguments[index++])
      , keys   = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S)
      , length = keys.length
      , j      = 0
      , key;
    while(length > j)if(isEnum.call(S, key = keys[j++]))T[key] = S[key];
  } return T;
} : $assign;
},{"./_fails":24,"./_iobject":30,"./_object-gops":41,"./_object-keys":44,"./_object-pie":45,"./_to-object":56}],38:[function(require,module,exports){
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject    = require('./_an-object')
  , dPs         = require('./_object-dps')
  , enumBugKeys = require('./_enum-bug-keys')
  , IE_PROTO    = require('./_shared-key')('IE_PROTO')
  , Empty       = function(){ /* empty */ }
  , PROTOTYPE   = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function(){
  // Thrash, waste and sodomy: IE GC bug
  var iframe = require('./_dom-create')('iframe')
    , i      = enumBugKeys.length
    , lt     = '<'
    , gt     = '>'
    , iframeDocument;
  iframe.style.display = 'none';
  require('./_html').appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while(i--)delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties){
  var result;
  if(O !== null){
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty;
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};

},{"./_an-object":13,"./_dom-create":21,"./_enum-bug-keys":22,"./_html":28,"./_object-dps":40,"./_shared-key":49}],39:[function(require,module,exports){
var anObject       = require('./_an-object')
  , IE8_DOM_DEFINE = require('./_ie8-dom-define')
  , toPrimitive    = require('./_to-primitive')
  , dP             = Object.defineProperty;

exports.f = require('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes){
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if(IE8_DOM_DEFINE)try {
    return dP(O, P, Attributes);
  } catch(e){ /* empty */ }
  if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
  if('value' in Attributes)O[P] = Attributes.value;
  return O;
};
},{"./_an-object":13,"./_descriptors":20,"./_ie8-dom-define":29,"./_to-primitive":57}],40:[function(require,module,exports){
var dP       = require('./_object-dp')
  , anObject = require('./_an-object')
  , getKeys  = require('./_object-keys');

module.exports = require('./_descriptors') ? Object.defineProperties : function defineProperties(O, Properties){
  anObject(O);
  var keys   = getKeys(Properties)
    , length = keys.length
    , i = 0
    , P;
  while(length > i)dP.f(O, P = keys[i++], Properties[P]);
  return O;
};
},{"./_an-object":13,"./_descriptors":20,"./_object-dp":39,"./_object-keys":44}],41:[function(require,module,exports){
exports.f = Object.getOwnPropertySymbols;
},{}],42:[function(require,module,exports){
// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has         = require('./_has')
  , toObject    = require('./_to-object')
  , IE_PROTO    = require('./_shared-key')('IE_PROTO')
  , ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function(O){
  O = toObject(O);
  if(has(O, IE_PROTO))return O[IE_PROTO];
  if(typeof O.constructor == 'function' && O instanceof O.constructor){
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};
},{"./_has":26,"./_shared-key":49,"./_to-object":56}],43:[function(require,module,exports){
var has          = require('./_has')
  , toIObject    = require('./_to-iobject')
  , arrayIndexOf = require('./_array-includes')(false)
  , IE_PROTO     = require('./_shared-key')('IE_PROTO');

module.exports = function(object, names){
  var O      = toIObject(object)
    , i      = 0
    , result = []
    , key;
  for(key in O)if(key != IE_PROTO)has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while(names.length > i)if(has(O, key = names[i++])){
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};
},{"./_array-includes":14,"./_has":26,"./_shared-key":49,"./_to-iobject":54}],44:[function(require,module,exports){
// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys       = require('./_object-keys-internal')
  , enumBugKeys = require('./_enum-bug-keys');

module.exports = Object.keys || function keys(O){
  return $keys(O, enumBugKeys);
};
},{"./_enum-bug-keys":22,"./_object-keys-internal":43}],45:[function(require,module,exports){
exports.f = {}.propertyIsEnumerable;
},{}],46:[function(require,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],47:[function(require,module,exports){
module.exports = require('./_hide');
},{"./_hide":27}],48:[function(require,module,exports){
var def = require('./_object-dp').f
  , has = require('./_has')
  , TAG = require('./_wks')('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))def(it, TAG, {configurable: true, value: tag});
};
},{"./_has":26,"./_object-dp":39,"./_wks":59}],49:[function(require,module,exports){
var shared = require('./_shared')('keys')
  , uid    = require('./_uid');
module.exports = function(key){
  return shared[key] || (shared[key] = uid(key));
};
},{"./_shared":50,"./_uid":58}],50:[function(require,module,exports){
var global = require('./_global')
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};
},{"./_global":25}],51:[function(require,module,exports){
var toInteger = require('./_to-integer')
  , defined   = require('./_defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};
},{"./_defined":19,"./_to-integer":53}],52:[function(require,module,exports){
var toInteger = require('./_to-integer')
  , max       = Math.max
  , min       = Math.min;
module.exports = function(index, length){
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};
},{"./_to-integer":53}],53:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};
},{}],54:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./_iobject')
  , defined = require('./_defined');
module.exports = function(it){
  return IObject(defined(it));
};
},{"./_defined":19,"./_iobject":30}],55:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./_to-integer')
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};
},{"./_to-integer":53}],56:[function(require,module,exports){
// 7.1.13 ToObject(argument)
var defined = require('./_defined');
module.exports = function(it){
  return Object(defined(it));
};
},{"./_defined":19}],57:[function(require,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = require('./_is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function(it, S){
  if(!isObject(it))return it;
  var fn, val;
  if(S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  if(typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))return val;
  if(!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  throw TypeError("Can't convert object to primitive value");
};
},{"./_is-object":31}],58:[function(require,module,exports){
var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};
},{}],59:[function(require,module,exports){
var store      = require('./_shared')('wks')
  , uid        = require('./_uid')
  , Symbol     = require('./_global').Symbol
  , USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function(name){
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;
},{"./_global":25,"./_shared":50,"./_uid":58}],60:[function(require,module,exports){
var classof   = require('./_classof')
  , ITERATOR  = require('./_wks')('iterator')
  , Iterators = require('./_iterators');
module.exports = require('./_core').getIteratorMethod = function(it){
  if(it != undefined)return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};
},{"./_classof":15,"./_core":17,"./_iterators":35,"./_wks":59}],61:[function(require,module,exports){
var anObject = require('./_an-object')
  , get      = require('./core.get-iterator-method');
module.exports = require('./_core').getIterator = function(it){
  var iterFn = get(it);
  if(typeof iterFn != 'function')throw TypeError(it + ' is not iterable!');
  return anObject(iterFn.call(it));
};
},{"./_an-object":13,"./_core":17,"./core.get-iterator-method":60}],62:[function(require,module,exports){
'use strict';
var addToUnscopables = require('./_add-to-unscopables')
  , step             = require('./_iter-step')
  , Iterators        = require('./_iterators')
  , toIObject        = require('./_to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = require('./_iter-define')(Array, 'Array', function(iterated, kind){
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , kind  = this._k
    , index = this._i++;
  if(!O || index >= O.length){
    this._t = undefined;
    return step(1);
  }
  if(kind == 'keys'  )return step(0, index);
  if(kind == 'values')return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');
},{"./_add-to-unscopables":12,"./_iter-define":33,"./_iter-step":34,"./_iterators":35,"./_to-iobject":54}],63:[function(require,module,exports){
// 19.1.3.1 Object.assign(target, source)
var $export = require('./_export');

$export($export.S + $export.F, 'Object', {assign: require('./_object-assign')});
},{"./_export":23,"./_object-assign":37}],64:[function(require,module,exports){
var $export = require('./_export');
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !require('./_descriptors'), 'Object', {defineProperty: require('./_object-dp').f});
},{"./_descriptors":20,"./_export":23,"./_object-dp":39}],65:[function(require,module,exports){
'use strict';
var $at  = require('./_string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
require('./_iter-define')(String, 'String', function(iterated){
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , index = this._i
    , point;
  if(index >= O.length)return {value: undefined, done: true};
  point = $at(O, index);
  this._i += point.length;
  return {value: point, done: false};
});
},{"./_iter-define":33,"./_string-at":51}],66:[function(require,module,exports){
require('./es6.array.iterator');
var global        = require('./_global')
  , hide          = require('./_hide')
  , Iterators     = require('./_iterators')
  , TO_STRING_TAG = require('./_wks')('toStringTag');

for(var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'], i = 0; i < 5; i++){
  var NAME       = collections[i]
    , Collection = global[NAME]
    , proto      = Collection && Collection.prototype;
  if(proto && !proto[TO_STRING_TAG])hide(proto, TO_STRING_TAG, NAME);
  Iterators[NAME] = Iterators.Array;
}
},{"./_global":25,"./_hide":27,"./_iterators":35,"./_wks":59,"./es6.array.iterator":62}],67:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2luZGV4LmpzIiwiZGlzdC9tb3Rpb24tZmVhdHVyZXMuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9jb3JlLWpzL2dldC1pdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL2NvcmUtanMvb2JqZWN0L2Fzc2lnbi5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL2NvcmUtanMvb2JqZWN0L2RlZmluZS1wcm9wZXJ0eS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL2hlbHBlcnMvY2xhc3NDYWxsQ2hlY2suanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9oZWxwZXJzL2NyZWF0ZUNsYXNzLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9mbi9nZXQtaXRlcmF0b3IuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L2ZuL29iamVjdC9hc3NpZ24uanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L2ZuL29iamVjdC9kZWZpbmUtcHJvcGVydHkuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2EtZnVuY3Rpb24uanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2FkZC10by11bnNjb3BhYmxlcy5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fYW4tb2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19hcnJheS1pbmNsdWRlcy5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fY2xhc3NvZi5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fY29mLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19jdHguanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2RlZmluZWQuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2Rlc2NyaXB0b3JzLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19kb20tY3JlYXRlLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19lbnVtLWJ1Zy1rZXlzLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19leHBvcnQuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2ZhaWxzLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19nbG9iYWwuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2hhcy5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9faGlkZS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9faHRtbC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9faWU4LWRvbS1kZWZpbmUuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2lvYmplY3QuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2lzLW9iamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9faXRlci1jcmVhdGUuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2l0ZXItZGVmaW5lLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19pdGVyLXN0ZXAuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX2l0ZXJhdG9ycy5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fbGlicmFyeS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fb2JqZWN0LWFzc2lnbi5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fb2JqZWN0LWNyZWF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fb2JqZWN0LWRwLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19vYmplY3QtZHBzLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19vYmplY3QtZ29wcy5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fb2JqZWN0LWdwby5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fb2JqZWN0LWtleXMtaW50ZXJuYWwuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX29iamVjdC1rZXlzLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19vYmplY3QtcGllLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19wcm9wZXJ0eS1kZXNjLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL19yZWRlZmluZS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fc2V0LXRvLXN0cmluZy10YWcuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX3NoYXJlZC1rZXkuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX3NoYXJlZC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fc3RyaW5nLWF0LmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL190by1pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fdG8taW50ZWdlci5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fdG8taW9iamVjdC5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fdG8tbGVuZ3RoLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL190by1vYmplY3QuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvX3RvLXByaW1pdGl2ZS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9fdWlkLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL193a3MuanMiLCJub2RlX21vZHVsZXMvYmFiZWwtcnVudGltZS9ub2RlX21vZHVsZXMvY29yZS1qcy9saWJyYXJ5L21vZHVsZXMvY29yZS5nZXQtaXRlcmF0b3ItbWV0aG9kLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL2NvcmUuZ2V0LWl0ZXJhdG9yLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL2VzNi5hcnJheS5pdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9lczYub2JqZWN0LmFzc2lnbi5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9lczYub2JqZWN0LmRlZmluZS1wcm9wZXJ0eS5qcyIsIm5vZGVfbW9kdWxlcy9iYWJlbC1ydW50aW1lL25vZGVfbW9kdWxlcy9jb3JlLWpzL2xpYnJhcnkvbW9kdWxlcy9lczYuc3RyaW5nLml0ZXJhdG9yLmpzIiwibm9kZV9tb2R1bGVzL2JhYmVsLXJ1bnRpbWUvbm9kZV9tb2R1bGVzL2NvcmUtanMvbGlicmFyeS9tb2R1bGVzL3dlYi5kb20uaXRlcmFibGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7bURDQVMsTzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNBVDs7Ozs7Ozs7O0FBU0EsU0FBUyxlQUFULEdBQTJCO0FBQ3pCLE1BQUksT0FBTyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQUU7QUFDbkMsV0FBTyxZQUFNO0FBQ1gsVUFBTSxJQUFJLFFBQVEsTUFBUixFQUFWO0FBQ0EsYUFBTyxFQUFFLENBQUYsSUFBTyxFQUFFLENBQUYsSUFBTyxJQUFyQjtBQUNELEtBSEQ7QUFJRCxHQUxELE1BS087QUFBRTtBQUNQLFFBQUksT0FBTyxXQUFQLEtBQXVCLFdBQTNCLEVBQXdDO0FBQ3RDLFVBQUksS0FBSyxHQUFMLEtBQWEsV0FBakIsRUFBOEI7QUFDNUIsZUFBTyxZQUFNO0FBQUUsaUJBQU8sSUFBSSxLQUFLLE9BQVQsRUFBUDtBQUEyQixTQUExQztBQUNELE9BRkQsTUFFTztBQUNMLGVBQU8sWUFBTTtBQUFFLGlCQUFPLEtBQUssR0FBTCxFQUFQO0FBQW1CLFNBQWxDO0FBQ0Q7QUFDRixLQU5ELE1BTU87QUFDTCxhQUFPLFlBQU07QUFBRSxlQUFPLE9BQU8sV0FBUCxDQUFtQixHQUFuQixFQUFQO0FBQWlDLE9BQWhEO0FBQ0Q7QUFDRjtBQUNGOztBQUVELElBQU0sVUFBVSxpQkFBaEI7O0FBRUE7Ozs7QUFJQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQTJCTSxjOztBQUVKOzs7Ozs7Ozs7O0FBVUEsNEJBQTBCO0FBQUEsUUFBZCxPQUFjLHVFQUFKLEVBQUk7QUFBQTs7QUFDeEIsUUFBTSxXQUFXO0FBQ2YsbUJBQWEsQ0FDWCxRQURXLEVBRVgsUUFGVyxFQUdYLGNBSFcsRUFJWCxjQUpXLEVBS1gsVUFMVyxFQU1YLE1BTlcsRUFPWCxPQVBXLEVBUVgsTUFSVyxFQVNYLE9BVFcsQ0FERTs7QUFhZixzQkFBZ0IsSUFiRDs7QUFlZiwwQkFBb0IsR0FmTDtBQWdCZiwwQkFBb0IsR0FoQkw7O0FBa0JmLDBCQUFvQixHQWxCTDtBQW1CZiwwQkFBb0IsQ0FuQkw7O0FBcUJmLHlCQUFtQixJQXJCSjtBQXNCZix5QkFBbUIsR0F0Qko7QUF1QmYsOEJBQXdCLEVBdkJUOztBQXlCZixrQkFBWSxJQXpCRztBQTBCZixxQkFBZSxHQTFCQTtBQTJCZiw0QkFBc0IsQ0EzQlA7QUE0QmYsb0JBQWMsSUE1QkM7O0FBOEJmLG1CQUFhLEdBOUJFO0FBK0JmLHVCQUFpQixHQS9CRjtBQWdDZix3QkFBa0IsRUFoQ0g7O0FBa0NmLGtCQUFZLEdBbENHOztBQW9DZixtQkFBYSxJQXBDRTtBQXFDZix3QkFBa0I7O0FBckNILEtBQWpCOztBQXlDQSxTQUFLLE9BQUwsR0FBZSxzQkFBYyxFQUFkLEVBQWtCLFFBQWxCLEVBQTRCLE9BQTVCLENBQWY7QUFDQTs7QUFFQSxTQUFLLFFBQUwsR0FBZ0I7QUFDZCxjQUFRLEtBQUssYUFBTCxDQUFtQixJQUFuQixDQUF3QixJQUF4QixDQURNO0FBRWQsY0FBUSxLQUFLLGFBQUwsQ0FBbUIsSUFBbkIsQ0FBd0IsSUFBeEIsQ0FGTTtBQUdkLG9CQUFjLEtBQUssbUJBQUwsQ0FBeUIsSUFBekIsQ0FBOEIsSUFBOUIsQ0FIQTtBQUlkLG9CQUFjLEtBQUssbUJBQUwsQ0FBeUIsSUFBekIsQ0FBOEIsSUFBOUIsQ0FKQTtBQUtkLGdCQUFVLEtBQUssZUFBTCxDQUFxQixJQUFyQixDQUEwQixJQUExQixDQUxJO0FBTWQsWUFBTSxLQUFLLFdBQUwsQ0FBaUIsSUFBakIsQ0FBc0IsSUFBdEIsQ0FOUTtBQU9kLGFBQU8sS0FBSyxZQUFMLENBQWtCLElBQWxCLENBQXVCLElBQXZCLENBUE87QUFRZCxZQUFNLEtBQUssV0FBTCxDQUFpQixJQUFqQixDQUFzQixJQUF0QixDQVJRO0FBU2QsYUFBTyxLQUFLLFlBQUwsQ0FBa0IsSUFBbEIsQ0FBdUIsSUFBdkI7QUFUTyxLQUFoQjs7QUFZQSxTQUFLLGFBQUwsR0FBcUIsS0FBSyxPQUFMLENBQWEsWUFBbEM7O0FBRUEsU0FBSyxHQUFMLEdBQVcsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FBWDtBQUNBLFNBQUssR0FBTCxHQUFXLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQVg7O0FBRUE7QUFDQSxTQUFLLFFBQUwsR0FBZ0IsQ0FDZCxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQURjLEVBRWQsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FGYyxFQUdkLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBSGMsQ0FBaEI7QUFLQSxTQUFLLGlCQUFMLEdBQXlCLENBQ3ZCLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FEdUIsRUFFdkIsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUZ1QixFQUd2QixDQUFDLENBQUQsRUFBSSxDQUFKLENBSHVCLENBQXpCO0FBS0EsU0FBSyxhQUFMLEdBQXFCLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQXJCO0FBQ0EsU0FBSyxpQkFBTCxHQUF5QixDQUF6Qjs7QUFFQTtBQUNBLFNBQUssUUFBTCxHQUFnQixDQUFoQjtBQUNBLFNBQUssU0FBTCxHQUFpQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQUFqQjtBQUNBLFNBQUssUUFBTCxHQUFnQixDQUFoQjtBQUNBLFNBQUssYUFBTCxHQUFxQixDQUFyQjtBQUNBLFNBQUssVUFBTCxHQUFrQixTQUFsQjtBQUNBLFNBQUssUUFBTCxHQUFnQixTQUFoQjtBQUNBLFNBQUssYUFBTCxHQUFxQixDQUFyQjtBQUNBLFNBQUssVUFBTCxHQUFrQixLQUFsQjs7QUFFQTtBQUNBLFNBQUssUUFBTCxHQUFnQixDQUNkLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBRGMsRUFFZCxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQUZjLEVBR2QsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FIYyxDQUFoQjtBQUtBLFNBQUssaUJBQUwsR0FBeUIsQ0FDdkIsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUR1QixFQUV2QixDQUFDLENBQUQsRUFBSSxDQUFKLENBRnVCLEVBR3ZCLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FIdUIsQ0FBekI7QUFLQSxTQUFLLGFBQUwsR0FBcUIsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FBckI7QUFDQSxTQUFLLGlCQUFMLEdBQXlCLENBQXpCOztBQUVBO0FBQ0EsU0FBSyxjQUFMLEdBQXNCLENBQXRCO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLENBQWpCO0FBQ0EsU0FBSyxVQUFMLEdBQWtCLEtBQWxCO0FBQ0EsU0FBSyxhQUFMLEdBQXFCLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLEVBQVUsQ0FBVixFQUFhLENBQWIsRUFBZ0IsQ0FBaEIsRUFBbUIsQ0FBbkIsRUFBc0IsQ0FBdEIsRUFBeUIsQ0FBekIsQ0FBckI7QUFDQSxTQUFLLGNBQUwsR0FBc0IsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsRUFBVSxDQUFWLEVBQWEsQ0FBYixFQUFnQixDQUFoQixFQUFtQixDQUFuQixFQUFzQixDQUF0QixFQUF5QixDQUF6QixDQUF0QjtBQUNBLFNBQUssV0FBTCxHQUFtQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLENBQVYsRUFBYSxDQUFiLEVBQWdCLENBQWhCLEVBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLENBQXpCLENBQW5CO0FBQ0EsU0FBSyxHQUFMLEdBQVcsQ0FBWDtBQUNBLFNBQUssR0FBTCxHQUFXLENBQVg7QUFDQSxTQUFLLEdBQUwsR0FBVyxDQUFYO0FBQ0EsU0FBSyx1QkFBTCxHQUErQixDQUEvQjs7QUFFQTtBQUNBLFNBQUssU0FBTCxHQUFpQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQUFqQjtBQUNBLFNBQUssWUFBTCxHQUFvQixDQUNsQixJQUFJLEtBQUosQ0FBVSxLQUFLLE9BQUwsQ0FBYSxlQUF2QixDQURrQixFQUVsQixJQUFJLEtBQUosQ0FBVSxLQUFLLE9BQUwsQ0FBYSxlQUF2QixDQUZrQixFQUdsQixJQUFJLEtBQUosQ0FBVSxLQUFLLE9BQUwsQ0FBYSxlQUF2QixDQUhrQixDQUFwQjtBQUtBLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxDQUFwQixFQUF1QixHQUF2QixFQUE0QjtBQUMxQixXQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksS0FBSyxPQUFMLENBQWEsZUFBakMsRUFBa0QsR0FBbEQsRUFBdUQ7QUFDckQsYUFBSyxZQUFMLENBQWtCLENBQWxCLEVBQXFCLENBQXJCLElBQTBCLENBQTFCO0FBQ0Q7QUFDRjtBQUNELFNBQUssUUFBTCxHQUFnQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQUFoQjtBQUNBLFNBQUssV0FBTCxHQUFtQixDQUFuQjtBQUNBLFNBQUssZUFBTCxHQUF1QixDQUF2QjtBQUNBLFNBQUssUUFBTCxHQUFnQixDQUFoQjs7QUFFQTtBQUNBLFNBQUssVUFBTCxHQUFrQixTQUFsQjtBQUNBLFNBQUssUUFBTCxHQUFnQixTQUFoQjtBQUNBLFNBQUssYUFBTCxHQUFxQixDQUFyQjtBQUNBLFNBQUssV0FBTCxHQUFtQixLQUFuQjs7QUFFQTtBQUNBLFNBQUssZUFBTCxHQUF1QixDQUF2QjtBQUNBLFNBQUssV0FBTCxHQUFtQixDQUFuQjtBQUNBLFNBQUssZUFBTCxHQUF1QixDQUF2QjtBQUNBLFNBQUssUUFBTCxHQUFnQixLQUFoQjs7QUFFQSxTQUFLLGdCQUFMLEdBQXdCLEtBQUssSUFBTCxDQUN0QixLQUFLLElBQUwsQ0FDRSxLQUFLLElBQUwsQ0FBVSxDQUFWLEVBQWEsQ0FBYixDQURGLEVBQ21CLEtBQUssT0FBTCxDQUFhLG9CQURoQyxDQURzQixFQUl0QixLQUFLLE9BQUwsQ0FBYSxlQUpTLENBQXhCO0FBTUE7QUFDQSxTQUFLLFVBQUwsR0FBa0IsQ0FBbEI7QUFDRDs7QUFFRDs7QUFFQTs7Ozs7Ozs7bUNBSTBCO0FBQUEsVUFBYixNQUFhLHVFQUFKLEVBQUk7O0FBQ3hCLFdBQUssSUFBSSxHQUFULElBQWdCLE1BQWhCLEVBQXdCO0FBQ3RCLGFBQUssT0FBTCxDQUFhLEdBQWIsSUFBb0IsT0FBTyxHQUFQLENBQXBCO0FBQ0Q7QUFDRjs7QUFFRDs7Ozs7Ozs7O3FDQU1pQixDLEVBQWlCO0FBQUEsVUFBZCxDQUFjLHVFQUFWLENBQVU7QUFBQSxVQUFQLENBQU8sdUVBQUgsQ0FBRzs7QUFDaEMsV0FBSyxHQUFMLENBQVMsQ0FBVCxJQUFjLENBQWQ7QUFDQSxXQUFLLEdBQUwsQ0FBUyxDQUFULElBQWMsQ0FBZDtBQUNBLFdBQUssR0FBTCxDQUFTLENBQVQsSUFBYyxDQUFkO0FBQ0Q7O0FBRUQ7Ozs7Ozs7OztpQ0FNYSxDLEVBQWlCO0FBQUEsVUFBZCxDQUFjLHVFQUFWLENBQVU7QUFBQSxVQUFQLENBQU8sdUVBQUgsQ0FBRzs7QUFDNUIsV0FBSyxHQUFMLENBQVMsQ0FBVCxJQUFjLENBQWQ7QUFDQSxXQUFLLEdBQUwsQ0FBUyxDQUFULElBQWMsQ0FBZDtBQUNBLFdBQUssR0FBTCxDQUFTLENBQVQsSUFBYyxDQUFkO0FBQ0EsVUFBSSxLQUFLLE9BQUwsQ0FBYSxjQUFqQixFQUFpQztBQUMvQixhQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksQ0FBcEIsRUFBdUIsR0FBdkIsRUFBNEI7QUFDMUIsZUFBSyxHQUFMLENBQVMsQ0FBVCxLQUFnQixJQUFJLEtBQUssRUFBVCxHQUFjLElBQTlCO0FBQ0Q7QUFDRjtBQUNGOztBQUVEOzs7Ozs7Ozs7O0FBVUE7Ozs7Ozs7Ozs7QUFVQTs7Ozs7Ozs7O0FBU0E7Ozs7Ozs7O0FBUUE7Ozs7Ozs7QUFPQTs7Ozs7Ozs7O0FBU0E7Ozs7Ozs7O0FBUUE7Ozs7Ozs7Ozs7Ozs7QUFhQTs7Ozs7OztBQU9BOzs7Ozs7Ozs7NkJBTXdCO0FBQUEsVUFBakIsUUFBaUIsdUVBQU4sSUFBTTs7QUFDdEI7QUFDQSxXQUFLLFlBQUwsR0FBb0IsU0FBcEI7QUFDQTtBQUNBLFdBQUssUUFBTCxHQUFnQixLQUFLLFlBQUwsQ0FBa0IsS0FBSyxHQUF2QixDQUFoQjtBQUNBO0FBQ0EsV0FBSyxRQUFMLEdBQWdCLEtBQUssWUFBTCxDQUFrQixLQUFLLEdBQXZCLENBQWhCOztBQUVBLFVBQUksTUFBTSxJQUFWO0FBQ0EsVUFBSSxNQUFNLElBQVY7QUFDQSxVQUFJO0FBQ0YsY0FBTSxFQUFOO0FBREU7QUFBQTtBQUFBOztBQUFBO0FBRUYsMERBQWdCLEtBQUssT0FBTCxDQUFhLFdBQTdCLDRHQUEwQztBQUFBLGdCQUFqQyxHQUFpQzs7QUFDeEMsZ0JBQUksS0FBSyxRQUFMLENBQWMsR0FBZCxDQUFKLEVBQXdCO0FBQ3RCLG1CQUFLLFFBQUwsQ0FBYyxHQUFkLEVBQW1CLEdBQW5CO0FBQ0Q7QUFDRjtBQU5DO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFPSCxPQVBELENBT0UsT0FBTyxDQUFQLEVBQVU7QUFDVixjQUFNLENBQU47QUFDRDs7QUFFRCxXQUFLLFVBQUwsR0FBa0IsQ0FBQyxLQUFLLFVBQUwsR0FBa0IsQ0FBbkIsSUFBd0IsS0FBSyxnQkFBL0M7O0FBRUEsVUFBSSxRQUFKLEVBQWM7QUFDWixpQkFBUyxHQUFULEVBQWMsR0FBZDtBQUNEO0FBQ0QsYUFBTyxHQUFQO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBOztBQUVBOzs7O2tDQUNjLEcsRUFBSztBQUNqQixVQUFJLE1BQUosR0FBYTtBQUNYLFdBQUcsS0FBSyxHQUFMLENBQVMsQ0FBVCxDQURRO0FBRVgsV0FBRyxLQUFLLEdBQUwsQ0FBUyxDQUFULENBRlE7QUFHWCxXQUFHLEtBQUssR0FBTCxDQUFTLENBQVQ7QUFIUSxPQUFiO0FBS0Q7O0FBRUQ7Ozs7a0NBQ2MsRyxFQUFLO0FBQ2pCLFVBQUksTUFBSixHQUFhO0FBQ1gsV0FBRyxLQUFLLEdBQUwsQ0FBUyxDQUFULENBRFE7QUFFWCxXQUFHLEtBQUssR0FBTCxDQUFTLENBQVQsQ0FGUTtBQUdYLFdBQUcsS0FBSyxHQUFMLENBQVMsQ0FBVDtBQUhRLE9BQWI7QUFLRDs7QUFFRDtBQUNBOzs7O3dDQUNvQixHLEVBQUs7QUFDdkIsV0FBSyxpQkFBTCxHQUF5QixDQUF6Qjs7QUFFQSxXQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksQ0FBcEIsRUFBdUIsR0FBdkIsRUFBNEI7QUFDMUIsYUFBSyxRQUFMLENBQWMsQ0FBZCxFQUFpQixLQUFLLFVBQUwsR0FBa0IsQ0FBbkMsSUFBd0MsS0FBSyxHQUFMLENBQVMsQ0FBVCxDQUF4Qzs7QUFFQSxhQUFLLGFBQUwsQ0FBbUIsQ0FBbkIsSUFBd0IsS0FBSyxZQUFMLENBQ3RCLEtBQUssR0FBTCxDQUFTLENBQVQsQ0FEc0IsRUFFdEIsS0FBSyxRQUFMLENBQWMsQ0FBZCxFQUFpQixDQUFDLEtBQUssVUFBTCxHQUFrQixDQUFuQixJQUF3QixDQUF6QyxDQUZzQixFQUd0QixLQUFLLGlCQUFMLENBQXVCLENBQXZCLEVBQTBCLENBQUMsS0FBSyxVQUFMLEdBQWtCLENBQW5CLElBQXdCLENBQWxELENBSHNCLEVBSXRCLEtBQUssT0FBTCxDQUFhLGtCQUpTLEVBS3RCLEtBQUssT0FBTCxDQUFhLGtCQUxTLEVBTXRCLENBTnNCLENBQXhCOztBQVNBLGFBQUssaUJBQUwsQ0FBdUIsQ0FBdkIsRUFBMEIsS0FBSyxVQUFMLEdBQWtCLENBQTVDLElBQWlELEtBQUssYUFBTCxDQUFtQixDQUFuQixDQUFqRDs7QUFFQSxhQUFLLGlCQUFMLElBQTBCLEtBQUssYUFBTCxDQUFtQixDQUFuQixDQUExQjtBQUNEOztBQUVELFVBQUksWUFBSixHQUFtQjtBQUNqQixjQUFNLEtBQUssaUJBRE07QUFFakIsV0FBRyxLQUFLLGFBQUwsQ0FBbUIsQ0FBbkIsQ0FGYztBQUdqQixXQUFHLEtBQUssYUFBTCxDQUFtQixDQUFuQixDQUhjO0FBSWpCLFdBQUcsS0FBSyxhQUFMLENBQW1CLENBQW5CO0FBSmMsT0FBbkI7QUFNRDs7QUFFRDtBQUNBOzs7O3dDQUNvQixHLEVBQUs7QUFDdkIsV0FBSyxpQkFBTCxHQUF5QixDQUF6Qjs7QUFFQSxXQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksQ0FBcEIsRUFBdUIsR0FBdkIsRUFBNEI7QUFDMUIsYUFBSyxRQUFMLENBQWMsQ0FBZCxFQUFpQixLQUFLLFVBQUwsR0FBa0IsQ0FBbkMsSUFBd0MsS0FBSyxHQUFMLENBQVMsQ0FBVCxDQUF4Qzs7QUFFQSxhQUFLLGFBQUwsQ0FBbUIsQ0FBbkIsSUFBd0IsS0FBSyxZQUFMLENBQ3RCLEtBQUssR0FBTCxDQUFTLENBQVQsQ0FEc0IsRUFFdEIsS0FBSyxRQUFMLENBQWMsQ0FBZCxFQUFpQixDQUFDLEtBQUssVUFBTCxHQUFrQixDQUFuQixJQUF3QixDQUF6QyxDQUZzQixFQUd0QixLQUFLLGlCQUFMLENBQXVCLENBQXZCLEVBQTBCLENBQUMsS0FBSyxVQUFMLEdBQWtCLENBQW5CLElBQXdCLENBQWxELENBSHNCLEVBSXRCLEtBQUssT0FBTCxDQUFhLGtCQUpTLEVBS3RCLEtBQUssT0FBTCxDQUFhLGtCQUxTLEVBTXRCLENBTnNCLENBQXhCOztBQVNBLGFBQUssaUJBQUwsQ0FBdUIsQ0FBdkIsRUFBMEIsS0FBSyxVQUFMLEdBQWtCLENBQTVDLElBQWlELEtBQUssYUFBTCxDQUFtQixDQUFuQixDQUFqRDs7QUFFQSxhQUFLLGlCQUFMLElBQTBCLEtBQUssYUFBTCxDQUFtQixDQUFuQixDQUExQjtBQUNEOztBQUVELFVBQUksWUFBSixHQUFtQjtBQUNqQixjQUFNLEtBQUssaUJBRE07QUFFakIsV0FBRyxLQUFLLGFBQUwsQ0FBbUIsQ0FBbkIsQ0FGYztBQUdqQixXQUFHLEtBQUssYUFBTCxDQUFtQixDQUFuQixDQUhjO0FBSWpCLFdBQUcsS0FBSyxhQUFMLENBQW1CLENBQW5CO0FBSmMsT0FBbkI7QUFNRDs7QUFFRDtBQUNBOzs7O29DQUNnQixHLEVBQUs7QUFDbkIsV0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLENBQXBCLEVBQXVCLEdBQXZCLEVBQTRCO0FBQzFCLGFBQUssU0FBTCxDQUFlLENBQWYsSUFDRSxLQUFLLE1BQUwsQ0FBWSxLQUFLLFFBQUwsQ0FBYyxDQUFkLEVBQWlCLENBQUMsS0FBSyxVQUFMLEdBQWtCLENBQW5CLElBQXdCLENBQXpDLENBQVosRUFBeUQsS0FBSyxHQUFMLENBQVMsQ0FBVCxDQUF6RCxFQUFzRSxDQUF0RSxDQURGO0FBRUQ7O0FBRUQsV0FBSyxhQUFMLEdBQXFCLEtBQUssWUFBTCxDQUFrQixLQUFLLFNBQXZCLENBQXJCOztBQUVBLFVBQUksS0FBSyxRQUFMLEdBQWdCLEtBQUssT0FBTCxDQUFhLGlCQUE3QixJQUNDLEtBQUssUUFBTCxHQUFnQixLQUFLLE9BQUwsQ0FBYSxpQkFBN0IsSUFDSSxLQUFLLGFBQUwsR0FBcUIsS0FBSyxPQUFMLENBQWEsc0JBRjNDLEVBRW9FO0FBQ2xFLFlBQUksQ0FBQyxLQUFLLFVBQVYsRUFBc0I7QUFDcEIsZUFBSyxVQUFMLEdBQWtCLElBQWxCO0FBQ0EsZUFBSyxVQUFMLEdBQWtCLFNBQWxCO0FBQ0Q7QUFDRCxhQUFLLFFBQUwsR0FBZ0IsU0FBaEI7QUFDRCxPQVJELE1BUU87QUFDTCxZQUFJLEtBQUssVUFBVCxFQUFxQjtBQUNuQixlQUFLLFVBQUwsR0FBa0IsS0FBbEI7QUFDRDtBQUNGO0FBQ0QsV0FBSyxhQUFMLEdBQXNCLEtBQUssUUFBTCxHQUFnQixLQUFLLFVBQTNDOztBQUVBLFVBQUksUUFBSixHQUFlO0FBQ2IsaUJBQVMsS0FBSyxRQUREO0FBRWIsaUJBQVMsS0FBSyxVQUZEO0FBR2Isa0JBQVUsS0FBSztBQUhGLE9BQWY7QUFLRDs7QUFFRDtBQUNBOzs7O2dDQUNZLEcsRUFBSztBQUNmLFdBQUssR0FBTCxHQUFXLEtBQUssVUFBTCxHQUFrQixLQUFLLE9BQUwsQ0FBYSxvQkFBMUM7QUFDQSxXQUFLLEdBQUwsR0FBVyxLQUFLLFdBQUwsQ0FBaUIsS0FBSyxHQUF0QixDQUFYO0FBQ0EsV0FBSyxHQUFMLEdBQVcsQ0FBWDs7QUFFQSxVQUFJLEtBQUssR0FBTCxHQUFXLEtBQUssT0FBTCxDQUFhLG9CQUFiLEdBQW9DLENBQS9DLElBQ0EsS0FBSyxpQkFBTCxHQUF5QixLQUFLLGFBQUwsQ0FBbUIsS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFuQyxDQUQ3QixFQUNzRTtBQUNwRTtBQUNBLGVBQU8sS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFoQixHQUFzQixLQUFLLG9CQUEzQixJQUNDLEtBQUssaUJBQUwsR0FBeUIsS0FBSyxhQUFMLENBQW1CLEtBQUssR0FBTCxHQUFXLEtBQUssR0FBbkMsQ0FEakMsRUFDMEU7QUFDeEUsZUFBSyxXQUFMLENBQWlCLEtBQUssY0FBTCxDQUFvQixLQUFLLEdBQUwsR0FBVyxLQUFLLEdBQXBDLENBQWpCLElBQ0EsS0FBSyxXQUFMLENBQWlCLEtBQUssY0FBTCxDQUFvQixLQUFLLEdBQUwsR0FBVyxLQUFLLEdBQXBDLENBQWpCLElBQTZELENBRDdEO0FBRUEsZUFBSyxhQUFMLENBQW1CLEtBQUssR0FBTCxHQUFXLEtBQUssR0FBaEIsR0FBc0IsQ0FBekMsSUFDQSxLQUFLLGFBQUwsQ0FBbUIsS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFuQyxDQURBO0FBRUEsZUFBSyxjQUFMLENBQW9CLEtBQUssR0FBTCxHQUFXLEtBQUssR0FBaEIsR0FBc0IsQ0FBMUMsSUFDQSxLQUFLLGNBQUwsQ0FBb0IsS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFwQyxDQURBO0FBRUEsZUFBSyxHQUFMO0FBQ0Q7QUFDRCxhQUFLLGFBQUwsQ0FBbUIsS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFoQixHQUFzQixDQUF6QyxJQUE4QyxLQUFLLGlCQUFuRDtBQUNBLGFBQUssY0FBTCxDQUFvQixLQUFLLEdBQUwsR0FBVyxLQUFLLEdBQWhCLEdBQXNCLENBQTFDLElBQStDLEtBQUssR0FBcEQ7QUFDQSxhQUFLLFdBQUwsQ0FBaUIsS0FBSyxHQUF0QixJQUE2QixLQUFLLEdBQUwsR0FBVyxLQUFLLEdBQWhCLEdBQXNCLENBQW5EO0FBQ0QsT0FoQkQsTUFnQk87QUFDTDtBQUNBLGVBQU8sS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFMLEdBQVcsQ0FBdEIsSUFDQSxLQUFLLGlCQUFMLEdBQXlCLEtBQUssYUFBTCxDQUFtQixLQUFLLEdBQUwsR0FBVyxLQUFLLEdBQW5DLENBRGhDLEVBQ3lFO0FBQ3ZFLGVBQUssV0FBTCxDQUFpQixLQUFLLGNBQUwsQ0FBb0IsS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFwQyxDQUFqQixJQUNBLEtBQUssV0FBTCxDQUFpQixLQUFLLGNBQUwsQ0FBb0IsS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFwQyxDQUFqQixJQUE2RCxDQUQ3RDtBQUVBLGVBQUssYUFBTCxDQUFtQixLQUFLLEdBQUwsR0FBVyxLQUFLLEdBQWhCLEdBQXNCLENBQXpDLElBQ0EsS0FBSyxhQUFMLENBQW1CLEtBQUssR0FBTCxHQUFXLEtBQUssR0FBbkMsQ0FEQTtBQUVBLGVBQUssY0FBTCxDQUFvQixLQUFLLEdBQUwsR0FBVyxLQUFLLEdBQWhCLEdBQXNCLENBQTFDLElBQ0EsS0FBSyxjQUFMLENBQW9CLEtBQUssR0FBTCxHQUFXLEtBQUssR0FBcEMsQ0FEQTtBQUVBLGVBQUssR0FBTDtBQUNEO0FBQ0QsYUFBSyxhQUFMLENBQW1CLEtBQUssR0FBTCxHQUFXLEtBQUssR0FBaEIsR0FBc0IsQ0FBekMsSUFBOEMsS0FBSyxpQkFBbkQ7QUFDQSxhQUFLLGNBQUwsQ0FBb0IsS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFoQixHQUFzQixDQUExQyxJQUErQyxLQUFLLEdBQXBEO0FBQ0EsYUFBSyxXQUFMLENBQWlCLEtBQUssR0FBdEIsSUFBNkIsS0FBSyxHQUFMLEdBQVcsS0FBSyxHQUFoQixHQUFzQixDQUFuRDtBQUNEOztBQUVEO0FBQ0EsVUFBSSxLQUFLLGlCQUFMLEdBQXlCLEtBQUssdUJBQTlCLEdBQXdELEtBQUssT0FBTCxDQUFhLFVBQXpFLEVBQXFGO0FBQ25GLFlBQUksS0FBSyxVQUFULEVBQXFCO0FBQ25CLGNBQUksS0FBSyxjQUFMLEdBQXNCLEtBQUssaUJBQS9CLEVBQWtEO0FBQ2hELGlCQUFLLGNBQUwsR0FBc0IsS0FBSyxpQkFBM0I7QUFDRDtBQUNELGNBQUksS0FBSyxhQUFULEVBQXdCO0FBQ3RCLGlCQUFLLGFBQUwsQ0FBbUIsRUFBRSxPQUFPLFFBQVQsRUFBbUIsV0FBVyxLQUFLLGNBQW5DLEVBQW5CO0FBQ0Q7QUFDRixTQVBELE1BT087QUFDTCxlQUFLLFVBQUwsR0FBa0IsSUFBbEI7QUFDQSxlQUFLLGNBQUwsR0FBc0IsS0FBSyxpQkFBM0I7QUFDQSxlQUFLLFNBQUwsR0FBaUIsS0FBSyxZQUF0QjtBQUNBLGNBQUksS0FBSyxhQUFULEVBQXdCO0FBQ3RCLGlCQUFLLGFBQUwsQ0FBbUIsRUFBRSxPQUFPLE9BQVQsRUFBa0IsV0FBVyxLQUFLLGNBQWxDLEVBQW5CO0FBQ0Q7QUFDRjtBQUNGLE9BaEJELE1BZ0JPO0FBQ0wsWUFBSSxLQUFLLFlBQUwsR0FBb0IsS0FBSyxTQUF6QixHQUFxQyxLQUFLLE9BQUwsQ0FBYSxhQUF0RCxFQUFxRTtBQUNuRSxjQUFJLEtBQUssVUFBTCxJQUFtQixLQUFLLGFBQTVCLEVBQTJDO0FBQ3pDLGlCQUFLLGFBQUwsQ0FBbUIsRUFBRSxPQUFPLE1BQVQsRUFBaUIsV0FBVyxLQUFLLGNBQWpDLEVBQW5CO0FBQ0Q7QUFDRCxlQUFLLFVBQUwsR0FBa0IsS0FBbEI7QUFDRDtBQUNGOztBQUVELFdBQUssdUJBQUwsR0FBK0IsS0FBSyxhQUFMLENBQW1CLEtBQUssSUFBTCxDQUFVLEtBQUssT0FBTCxDQUFhLG9CQUFiLEdBQW9DLEdBQTlDLENBQW5CLENBQS9COztBQUVBLFVBQUksSUFBSixHQUFXO0FBQ1QsbUJBQVcsS0FBSyxjQURQO0FBRVQsaUJBQVMsS0FBSztBQUZMLE9BQVg7QUFJRDs7QUFFRDtBQUNBOzs7O2lDQUNhLEcsRUFBSztBQUNoQixXQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksQ0FBcEIsRUFBdUIsR0FBdkIsRUFBNEI7QUFDMUIsYUFBSyxTQUFMLENBQWUsQ0FBZixJQUFvQixLQUFLLE1BQUwsQ0FDbEIsS0FBSyxRQUFMLENBQWMsQ0FBZCxFQUFpQixDQUFDLEtBQUssVUFBTCxHQUFrQixDQUFuQixJQUF3QixDQUF6QyxDQURrQixFQUVsQixLQUFLLEdBQUwsQ0FBUyxDQUFULENBRmtCLEVBR2xCLENBSGtCLENBQXBCO0FBS0Q7O0FBRUQsV0FBSyxJQUFJLEtBQUksQ0FBYixFQUFnQixLQUFJLENBQXBCLEVBQXVCLElBQXZCLEVBQTRCO0FBQzFCLFlBQUksS0FBSyxZQUFMLENBQWtCLEVBQWxCLEVBQXFCLEtBQUssVUFBTCxHQUFrQixLQUFLLE9BQUwsQ0FBYSxlQUFwRCxDQUFKLEVBQTBFO0FBQ3hFLGVBQUssUUFBTCxDQUFjLEVBQWQ7QUFDRDtBQUNELFlBQUksS0FBSyxTQUFMLENBQWUsRUFBZixJQUFvQixLQUFLLE9BQUwsQ0FBYSxXQUFyQyxFQUFrRDtBQUNoRCxlQUFLLFlBQUwsQ0FBa0IsRUFBbEIsRUFBcUIsS0FBSyxVQUFMLEdBQWtCLEtBQUssT0FBTCxDQUFhLGVBQXBELElBQXVFLENBQXZFO0FBQ0EsZUFBSyxRQUFMLENBQWMsRUFBZDtBQUNELFNBSEQsTUFHTztBQUNMLGVBQUssWUFBTCxDQUFrQixFQUFsQixFQUFxQixLQUFLLFVBQUwsR0FBa0IsS0FBSyxPQUFMLENBQWEsZUFBcEQsSUFBdUUsQ0FBdkU7QUFDRDtBQUNGOztBQUVELFdBQUssV0FBTCxHQUNBLEtBQUssWUFBTCxDQUFrQixLQUFLLFFBQXZCLElBQ0EsS0FBSyxPQUFMLENBQWEsZUFGYjtBQUdBLFdBQUssZUFBTCxHQUF1QixLQUFLLFFBQTVCO0FBQ0EsV0FBSyxRQUFMLEdBQ0EsS0FBSyxNQUFMLENBQVksS0FBSyxlQUFqQixFQUFrQyxLQUFLLFdBQXZDLEVBQW9ELEtBQUssT0FBTCxDQUFhLGdCQUFqRSxDQURBOztBQUdBLFVBQUksS0FBSixHQUFZO0FBQ1YsaUJBQVMsS0FBSztBQURKLE9BQVo7QUFHRDs7QUFFRDtBQUNBOzs7O2dDQUNZLEcsRUFBSztBQUNmLFVBQUksS0FBSyxRQUFMLEdBQWdCLEtBQUssT0FBTCxDQUFhLFVBQWpDLEVBQTZDO0FBQzNDLFlBQUksQ0FBQyxLQUFLLFdBQVYsRUFBdUI7QUFDckIsZUFBSyxXQUFMLEdBQW1CLElBQW5CO0FBQ0EsZUFBSyxVQUFMLEdBQWtCLFNBQWxCO0FBQ0Q7QUFDRCxhQUFLLFFBQUwsR0FBZ0IsU0FBaEI7QUFDRCxPQU5ELE1BTU8sSUFBSSxLQUFLLFdBQVQsRUFBc0I7QUFDM0IsYUFBSyxXQUFMLEdBQW1CLEtBQW5CO0FBQ0Q7QUFDRCxXQUFLLGFBQUwsR0FBcUIsS0FBSyxRQUFMLEdBQWdCLEtBQUssVUFBMUM7O0FBRUEsVUFBSSxJQUFKLEdBQVc7QUFDVCxrQkFBVSxLQUFLLFdBRE47QUFFVCxrQkFBVSxLQUFLLGFBRk47QUFHVCxpQkFBUyxLQUFLO0FBSEwsT0FBWDtBQUtEOztBQUVEO0FBQ0E7Ozs7aUNBQ2EsRyxFQUFLO0FBQ2hCLFdBQUssZUFBTCxHQUF1QixLQUFLLGtCQUFMLENBQXdCLEtBQUssR0FBN0IsQ0FBdkI7QUFDQSxXQUFLLGVBQUwsR0FBdUIsS0FBSyxXQUE1QjtBQUNBLFdBQUssV0FBTCxHQUFtQixLQUFLLE1BQUwsQ0FDakIsS0FBSyxlQURZLEVBRWpCLEtBQUssZUFGWSxFQUdqQixLQUFLLE9BQUwsQ0FBYSxnQkFISSxDQUFuQjs7QUFNQSxVQUFJLEtBQUssV0FBTCxHQUFtQixLQUFLLE9BQUwsQ0FBYSxXQUFwQyxFQUFpRDtBQUMvQyxhQUFLLFFBQUwsR0FBZ0IsS0FBaEI7QUFDRCxPQUZELE1BRU87QUFDTCxhQUFLLFFBQUwsR0FBZ0IsSUFBaEI7QUFDRDs7QUFFRCxVQUFJLEtBQUosR0FBWTtBQUNWLGVBQU8sS0FBSyxRQURGO0FBRVYsZUFBTyxLQUFLO0FBRkYsT0FBWjtBQUlEOztBQUVEO0FBQ0E7QUFDQTtBQUNBOzs7OzJCQUNPLEksRUFBTSxJLEVBQU0sRSxFQUFJO0FBQ3JCLGFBQU8sQ0FBQyxPQUFPLElBQVIsS0FBaUIsSUFBSSxFQUFyQixDQUFQO0FBQ0Q7O0FBRUQ7Ozs7aUNBQ2EsSyxFQUFPLEssRUFBTyxhLEVBQWUsTSxFQUFRLE0sRUFBUSxFLEVBQUk7QUFDNUQsVUFBTSxLQUFLLEtBQUssTUFBTCxDQUFZLEtBQVosRUFBbUIsS0FBbkIsRUFBMEIsRUFBMUIsQ0FBWCxDQUQ0RCxDQUNuQjtBQUN6QyxhQUFPLFNBQVMsRUFBVCxHQUFjLEVBQWQsR0FBbUIsU0FBUyxhQUFuQztBQUNEOztBQUVEOzs7O2lDQUNhLFEsRUFBVTtBQUNyQixhQUFPLEtBQUssSUFBTCxDQUFVLFNBQVMsQ0FBVCxJQUFjLFNBQVMsQ0FBVCxDQUFkLEdBQ0wsU0FBUyxDQUFULElBQWMsU0FBUyxDQUFULENBRFQsR0FFTCxTQUFTLENBQVQsSUFBYyxTQUFTLENBQVQsQ0FGbkIsQ0FBUDtBQUdEOztBQUVEOzs7O3lCQUNLLEMsRUFBRyxDLEVBQUc7QUFDVCxVQUFJLEtBQUssQ0FBVDtBQUFBLFVBQVksS0FBSyxDQUFqQjs7QUFFQSxhQUFPLE1BQU0sRUFBYixFQUFpQjtBQUNmLFlBQUksS0FBSyxFQUFULEVBQWE7QUFDWCxnQkFBTSxDQUFOO0FBQ0QsU0FGRCxNQUVPO0FBQ0wsZ0JBQU0sQ0FBTjtBQUNEO0FBQ0Y7O0FBRUQsYUFBTyxFQUFQO0FBQ0Q7O0FBRUQ7Ozs7MkJBQ08sUyxFQUFXLFUsRUFBWSxXLEVBQWE7QUFDekMsYUFBTyxZQUFZLENBQUMsYUFBYSxTQUFkLElBQTJCLFdBQTlDO0FBQ0Q7O0FBRUQ7Ozs7dUNBQ21CLFEsRUFBVTtBQUMzQixhQUFPLENBQUMsU0FBUyxDQUFULElBQWMsU0FBUyxDQUFULENBQWYsS0FBK0IsU0FBUyxDQUFULElBQWMsU0FBUyxDQUFULENBQTdDLElBQ0EsQ0FBQyxTQUFTLENBQVQsSUFBYyxTQUFTLENBQVQsQ0FBZixLQUErQixTQUFTLENBQVQsSUFBYyxTQUFTLENBQVQsQ0FBN0MsQ0FEQSxHQUVBLENBQUMsU0FBUyxDQUFULElBQWMsU0FBUyxDQUFULENBQWYsS0FBK0IsU0FBUyxDQUFULElBQWMsU0FBUyxDQUFULENBQTdDLENBRlA7QUFHRDs7Ozs7a0JBR1ksYzs7Ozs7QUN6ckJmOztBQ0FBOztBQ0FBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBOztBQ0FBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBOztBQ0ZBOztBQ0FBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZXhwb3J0IHsgZGVmYXVsdCBhcyBNb3Rpb25GZWF0dXJlcyB9IGZyb20gJy4vbW90aW9uLWZlYXR1cmVzJzsiLCIvKipcbiAqIENyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aW1lIGluIHNlY29uZHMgYWNjb3JkaW5nIHRvIHRoZSBjdXJyZW50XG4gKiBlbnZpcm9ubmVtZW50IChub2RlIG9yIGJyb3dzZXIpLlxuICogSWYgcnVubmluZyBpbiBub2RlIHRoZSB0aW1lIHJlbHkgb24gYHByb2Nlc3MuaHJ0aW1lYCwgd2hpbGUgaWYgaW4gdGhlIGJyb3dzZXJcbiAqIGl0IGlzIHByb3ZpZGVkIGJ5IHRoZSBgRGF0ZWAgb2JqZWN0LlxuICpcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gZ2V0VGltZUZ1bmN0aW9uKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHsgLy8gYXNzdW1lIG5vZGVcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgY29uc3QgdCA9IHByb2Nlc3MuaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gdFswXSArIHRbMV0gKiAxZS05O1xuICAgIH1cbiAgfSBlbHNlIHsgLy8gYnJvd3NlclxuICAgIGlmICh3aW5kb3cucGVyZm9ybWFuY2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZiAoRGF0ZS5ub3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiAoKSA9PiB7IHJldHVybiBuZXcgRGF0ZS5nZXRUaW1lKCkgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoKSA9PiB7IHJldHVybiBEYXRlLm5vdygpIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAoKSA9PiB7IHJldHVybiB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgfTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3QgcGVyZk5vdyA9IGdldFRpbWVGdW5jdGlvbigpO1xuXG4vKipcbiAqIEB0b2RvIHR5cGVkZWYgY29uc3RydWN0b3IgYXJndW1lbnRcbiAqL1xuXG4vKipcbiAqIENsYXNzIGNvbXB1dGluZyB0aGUgZGVzY3JpcHRvcnMgZnJvbSBhY2NlbGVyb21ldGVyIGFuZCBneXJvc2NvcGUgZGF0YS5cbiAqIDxiciAvPlxuICogRXhhbXBsZSA6XG4gKiBgYGBKYXZhU2NyaXB0XG4gKiAvLyBlczYgd2l0aCBicm93c2VyaWZ5IDpcbiAqIGltcG9ydCB7IE1vdGlvbkZlYXR1cmVzIH0gZnJvbSAnbW90aW9uLWZlYXR1cmVzJzsgXG4gKiBjb25zdCBtZiA9IG5ldyBNb3Rpb25GZWF0dXJlcyh7IGRlc2NyaXB0b3JzOiBbJ2FjY0ludGVuc2l0eScsICdraWNrJ10gfSk7XG4gKlxuICogLy8gZXM1IHdpdGggYnJvd3NlcmlmeSA6XG4gKiB2YXIgbW90aW9uRmVhdHVyZXMgPSByZXF1aXJlKCdtb3Rpb24tZmVhdHVyZXMnKTtcbiAqIHZhciBtZiA9IG5ldyBtb3Rpb25GZWF0dXJlcy5Nb3Rpb25GZWF0dXJlcyh7IGRlc2NyaXB0b3JzOiBbJ2FjY0ludGVuc2l0eScsICdraWNrJ10gfSk7XG4gKlxuICogLy8gbG9hZGluZyBmcm9tIGEgXCJzY3JpcHRcIiB0YWcgOlxuICogdmFyIG1mID0gbmV3IG1vdGlvbkZlYXR1cmVzLk1vdGlvbkZlYXR1cmVzKHsgZGVzY3JpcHRvcnM6IFsnYWNjSW50ZW5zaXR5JywgJ2tpY2snXSB9KTtcbiAqXG4gKiAvLyB0aGVuLCBvbiBlYWNoIG1vdGlvbiBldmVudCA6XG4gKiBtZi5zZXRBY2NlbGVyb21ldGVyKHgsIHksIHopO1xuICogbWYuc2V0R3lyb3Njb3BlKGFscGhhLCBiZXRhLCB0aGV0YSk7XG4gKiBtZi51cGRhdGUoZnVuY3Rpb24oZXJyLCByZXMpIHtcbiAqICAgaWYgKGVyciA9PT0gbnVsbCkge1xuICogICAgIC8vIGRvIHNvbWV0aGluZyB3aXRoIHJlc1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICogQGNsYXNzXG4gKi9cbmNsYXNzIE1vdGlvbkZlYXR1cmVzIHtcblxuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3R9IGluaXRPYmplY3QgLSBvYmplY3QgY29udGFpbmluZyBhbiBhcnJheSBvZiB0aGVcbiAgICogcmVxdWlyZWQgZGVzY3JpcHRvcnMgYW5kIHNvbWUgdmFyaWFibGVzIHVzZWQgdG8gY29tcHV0ZSB0aGUgZGVzY3JpcHRvcnNcbiAgICogdGhhdCB5b3UgbWlnaHQgd2FudCB0byBjaGFuZ2UgKGZvciBleGFtcGxlIGlmIHRoZSBicm93c2VyIGlzIGNocm9tZSB5b3VcbiAgICogbWlnaHQgd2FudCB0byBzZXQgYGd5cklzSW5EZWdyZWVzYCB0byBmYWxzZSBiZWNhdXNlIGl0J3MgdGhlIGNhc2Ugb24gc29tZVxuICAgKiB2ZXJzaW9ucywgb3IgeW91IG1pZ2h0IHdhbnQgdG8gY2hhbmdlIHNvbWUgdGhyZXNob2xkcykuXG4gICAqIFNlZSB0aGUgY29kZSBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKlxuICAgKiBAdG9kbyB1c2UgdHlwZWRlZiB0byBkZXNjcmliZSB0aGUgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRlc2NyaXB0b3JzOiBbXG4gICAgICAgICdhY2NSYXcnLFxuICAgICAgICAnZ3lyUmF3JyxcbiAgICAgICAgJ2FjY0ludGVuc2l0eScsXG4gICAgICAgICdneXJJbnRlbnNpdHknLFxuICAgICAgICAnZnJlZWZhbGwnLFxuICAgICAgICAna2ljaycsXG4gICAgICAgICdzaGFrZScsXG4gICAgICAgICdzcGluJyxcbiAgICAgICAgJ3N0aWxsJ1xuICAgICAgXSxcblxuICAgICAgZ3lySXNJbkRlZ3JlZXM6IHRydWUsXG5cbiAgICAgIGFjY0ludGVuc2l0eVBhcmFtMTogMC44LFxuICAgICAgYWNjSW50ZW5zaXR5UGFyYW0yOiAwLjEsXG5cbiAgICAgIGd5ckludGVuc2l0eVBhcmFtMTogMC45LFxuICAgICAgZ3lySW50ZW5zaXR5UGFyYW0yOiAxLFxuXG4gICAgICBmcmVlZmFsbEFjY1RocmVzaDogMC4xNSxcbiAgICAgIGZyZWVmYWxsR3lyVGhyZXNoOiA3NTAsXG4gICAgICBmcmVlZmFsbEd5ckRlbHRhVGhyZXNoOiA0MCxcblxuICAgICAga2lja1RocmVzaDogMC4wMSxcbiAgICAgIGtpY2tTcGVlZEdhdGU6IDIwMCxcbiAgICAgIGtpY2tNZWRpYW5GaWx0ZXJzaXplOiA5LFxuICAgICAga2lja0NhbGxiYWNrOiBudWxsLFxuXG4gICAgICBzaGFrZVRocmVzaDogMC4xLFxuICAgICAgc2hha2VXaW5kb3dTaXplOiAyMDAsXG4gICAgICBzaGFrZVNsaWRlRmFjdG9yOiAxMCxcblxuICAgICAgc3BpblRocmVzaDogMjAwLFxuXG4gICAgICBzdGlsbFRocmVzaDogNTAwMCxcbiAgICAgIHN0aWxsU2xpZGVGYWN0b3I6IDUsXG5cbiAgICB9O1xuXG4gICAgdGhpcy5fcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIC8vY29uc29sZS5sb2codGhpcy5fcGFyYW1zLmRlc2NyaXB0b3JzKTtcblxuICAgIHRoaXMuX21ldGhvZHMgPSB7XG4gICAgICBhY2NSYXc6IHRoaXMuX3VwZGF0ZUFjY1Jhdy5iaW5kKHRoaXMpLFxuICAgICAgZ3lyUmF3OiB0aGlzLl91cGRhdGVHeXJSYXcuYmluZCh0aGlzKSxcbiAgICAgIGFjY0ludGVuc2l0eTogdGhpcy5fdXBkYXRlQWNjSW50ZW5zaXR5LmJpbmQodGhpcyksXG4gICAgICBneXJJbnRlbnNpdHk6IHRoaXMuX3VwZGF0ZUd5ckludGVuc2l0eS5iaW5kKHRoaXMpLFxuICAgICAgZnJlZWZhbGw6IHRoaXMuX3VwZGF0ZUZyZWVmYWxsLmJpbmQodGhpcyksXG4gICAgICBraWNrOiB0aGlzLl91cGRhdGVLaWNrLmJpbmQodGhpcyksXG4gICAgICBzaGFrZTogdGhpcy5fdXBkYXRlU2hha2UuYmluZCh0aGlzKSxcbiAgICAgIHNwaW46IHRoaXMuX3VwZGF0ZVNwaW4uYmluZCh0aGlzKSxcbiAgICAgIHN0aWxsOiB0aGlzLl91cGRhdGVTdGlsbC5iaW5kKHRoaXMpXG4gICAgfTtcblxuICAgIHRoaXMuX2tpY2tDYWxsYmFjayA9IHRoaXMuX3BhcmFtcy5raWNrQ2FsbGJhY2s7XG5cbiAgICB0aGlzLmFjYyA9IFswLCAwLCAwXTtcbiAgICB0aGlzLmd5ciA9IFswLCAwLCAwXTtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGFjYyBpbnRlbnNpdHlcbiAgICB0aGlzLl9hY2NMYXN0ID0gW1xuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlMYXN0ID0gW1xuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHkgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGZyZWVmYWxsXG4gICAgdGhpcy5fYWNjTm9ybSA9IDA7XG4gICAgdGhpcy5fZ3lyRGVsdGEgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fZ3lyTm9ybSA9IDA7XG4gICAgdGhpcy5fZ3lyRGVsdGFOb3JtID0gMDtcbiAgICB0aGlzLl9mYWxsQmVnaW4gPSBwZXJmTm93KCk7XG4gICAgdGhpcy5fZmFsbEVuZCA9IHBlcmZOb3coKTtcbiAgICB0aGlzLl9mYWxsRHVyYXRpb24gPSAwO1xuICAgIHRoaXMuX2lzRmFsbGluZyA9IGZhbHNlO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZ3lyIGludGVuc2l0eVxuICAgIHRoaXMuX2d5ckxhc3QgPSBbXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3QgPSBbXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2d5ckludGVuc2l0eSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHlOb3JtID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGtpY2tcbiAgICB0aGlzLl9raWNrSW50ZW5zaXR5ID0gMDtcbiAgICB0aGlzLl9sYXN0S2ljayA9IDA7XG4gICAgdGhpcy5faXNLaWNraW5nID0gZmFsc2U7XG4gICAgdGhpcy5fbWVkaWFuVmFsdWVzID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xuICAgIHRoaXMuX21lZGlhbkxpbmtpbmcgPSBbMywgNCwgMSwgNSwgNywgOCwgMCwgMiwgNl07XG4gICAgdGhpcy5fbWVkaWFuRmlmbyA9IFs2LCAyLCA3LCAwLCAxLCAzLCA4LCA0LCA1XTtcbiAgICB0aGlzLl9pMSA9IDA7XG4gICAgdGhpcy5faTIgPSAwO1xuICAgIHRoaXMuX2kzID0gMDtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc2hha2VcbiAgICB0aGlzLl9hY2NEZWx0YSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9zaGFrZVdpbmRvdyA9IFtcbiAgICAgIG5ldyBBcnJheSh0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplKSxcbiAgICAgIG5ldyBBcnJheSh0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplKSxcbiAgICAgIG5ldyBBcnJheSh0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplKVxuICAgIF07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZTsgaisrKSB7XG4gICAgICAgIHRoaXMuX3NoYWtlV2luZG93W2ldW2pdID0gMDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fc2hha2VOYiA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9zaGFraW5nUmF3ID0gMDtcbiAgICB0aGlzLl9zaGFrZVNsaWRlUHJldiA9IDA7XG4gICAgdGhpcy5fc2hha2luZyA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzcGluXG4gICAgdGhpcy5fc3BpbkJlZ2luID0gcGVyZk5vdygpO1xuICAgIHRoaXMuX3NwaW5FbmQgPSBwZXJmTm93KCk7XG4gICAgdGhpcy5fc3BpbkR1cmF0aW9uID0gMDtcbiAgICB0aGlzLl9pc1NwaW5uaW5nID0gZmFsc2U7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHN0aWxsXG4gICAgdGhpcy5fc3RpbGxDcm9zc1Byb2QgPSAwO1xuICAgIHRoaXMuX3N0aWxsU2xpZGUgPSAwO1xuICAgIHRoaXMuX3N0aWxsU2xpZGVQcmV2ID0gMDtcbiAgICB0aGlzLl9pc1N0aWxsID0gZmFsc2U7XG5cbiAgICB0aGlzLl9sb29wSW5kZXhQZXJpb2QgPSB0aGlzLl9sY20oXG4gICAgICB0aGlzLl9sY20oXG4gICAgICAgIHRoaXMuX2xjbSgyLCAzKSwgdGhpcy5fcGFyYW1zLmtpY2tNZWRpYW5GaWx0ZXJzaXplXG4gICAgICApLFxuICAgICAgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZVxuICAgICk7XG4gICAgLy9jb25zb2xlLmxvZyh0aGlzLl9sb29wSW5kZXhQZXJpb2QpO1xuICAgIHRoaXMuX2xvb3BJbmRleCA9IDA7XG4gIH1cblxuICAvLz09PT09PT09PT0gaW50ZXJmYWNlID09PT09PT09PS8vXG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBjb25maWd1cmF0aW9uIHBhcmFtcyAoZXhjZXB0IGRlc2NyaXB0b3JzIGxpc3QpXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBhIHN1YnNldCBvZiB0aGUgY29uc3RydWN0b3IncyBwYXJhbXNcbiAgICovXG4gIHVwZGF0ZVBhcmFtcyhwYXJhbXMgPSB7fSkge1xuICAgIGZvciAobGV0IGtleSBpbiBwYXJhbXMpIHtcbiAgICAgIHRoaXMuX3BhcmFtc1trZXldID0gcGFyYW1zW2tleV07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGN1cnJlbnQgYWNjZWxlcm9tZXRlciB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB4IC0gdGhlIGFjY2VsZXJvbWV0ZXIncyB4IHZhbHVlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB5IC0gdGhlIGFjY2VsZXJvbWV0ZXIncyB5IHZhbHVlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB6IC0gdGhlIGFjY2VsZXJvbWV0ZXIncyB6IHZhbHVlXG4gICAqL1xuICBzZXRBY2NlbGVyb21ldGVyKHgsIHkgPSAwLCB6ID0gMCkge1xuICAgIHRoaXMuYWNjWzBdID0geDtcbiAgICB0aGlzLmFjY1sxXSA9IHk7XG4gICAgdGhpcy5hY2NbMl0gPSB6O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGN1cnJlbnQgZ3lyb3Njb3BlIHZhbHVlcy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHggLSB0aGUgZ3lyb3Njb3BlJ3MgeCB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geSAtIHRoZSBneXJvc2NvcGUncyB5IHZhbHVlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB6IC0gdGhlIGd5cm9zY29wZSdzIHogdmFsdWVcbiAgICovXG4gIHNldEd5cm9zY29wZSh4LCB5ID0gMCwgeiA9IDApIHtcbiAgICB0aGlzLmd5clswXSA9IHg7XG4gICAgdGhpcy5neXJbMV0gPSB5O1xuICAgIHRoaXMuZ3lyWzJdID0gejtcbiAgICBpZiAodGhpcy5fcGFyYW1zLmd5cklzSW5EZWdyZWVzKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgICB0aGlzLmd5cltpXSAqPSAoMiAqIE1hdGguUEkgLyAzNjAuKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYW4gYWNjZWxlcm9tZXRlci5cbiAgICogQHR5cGVkZWYgYWNjSW50ZW5zaXR5XG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBub3JtIC0gdGhlIGdsb2JhbCBlbmVyZ3kgY29tcHV0ZWQgb24gYWxsIGRpbWVuc2lvbnMuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB4IC0gdGhlIGVuZXJneSBpbiB0aGUgeCAoZmlyc3QpIGRpbWVuc2lvbi5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHkgLSB0aGUgZW5lcmd5IGluIHRoZSB5IChzZWNvbmQpIGRpbWVuc2lvbi5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHogLSB0aGUgZW5lcmd5IGluIHRoZSB6ICh0aGlyZCkgZGltZW5zaW9uLlxuICAgKi9cblxuICAvKipcbiAgICogSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYSBneXJvc2NvcGUuXG4gICAqIEB0eXBlZGVmIGd5ckludGVuc2l0eVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gbm9ybSAtIHRoZSBnbG9iYWwgZW5lcmd5IGNvbXB1dGVkIG9uIGFsbCBkaW1lbnNpb25zLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geCAtIHRoZSBlbmVyZ3kgaW4gdGhlIHggKGZpcnN0KSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB5IC0gdGhlIGVuZXJneSBpbiB0aGUgeSAoc2Vjb25kKSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB6IC0gdGhlIGVuZXJneSBpbiB0aGUgeiAodGhpcmQpIGRpbWVuc2lvbi5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBmcmVlIGZhbGxpbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHR5cGVkZWYgZnJlZWZhbGxcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGFjY05vcm0gLSB0aGUgbm9ybSBvZiB0aGUgYWNjZWxlcmF0aW9uLlxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IGZhbGxpbmcgLSB0cnVlIGlmIHRoZSBzZW5zb3IgaXMgZnJlZSBmYWxsaW5nLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBkdXJhdGlvbiAtIHRoZSBkdXJhdGlvbiBvZiB0aGUgZnJlZSBmYWxsaW5nIHNpbmNlIGl0cyBiZWdpbm5pbmcuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbXB1bHNlIC8gaGl0IG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHR5cGVkZWYga2lja1xuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gaW50ZW5zaXR5IC0gdGhlIGN1cnJlbnQgaW50ZW5zaXR5IG9mIHRoZSBcImtpY2tcIiBnZXN0dXJlLlxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IGtpY2tpbmcgLSB0cnVlIGlmIGEgXCJraWNrXCIgZ2VzdHVyZSBpcyBiZWluZyBkZXRlY3RlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cblxuICAvKipcbiAgICogU2hha2UgbW92ZW1lbnQgZGV0ZWN0aW9uIGluZm9ybWF0aW9uLlxuICAgKiBAdHlwZWRlZiBzaGFrZVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gc2hha2luZyAtIHRoZSBjdXJyZW50IGFtb3VudCBvZiBcInNoYWtpbmVzc1wiLlxuICAgKi9cblxuICAvKipcbiAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHNwaW5uaW5nIHN0YXRlIG9mIHRoZSBzZW5zb3IuXG4gICAqIEB0eXBlZGVmIHNwaW5cbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBzcGlubmluZyAtIHRydWUgaWYgdGhlIHNlbnNvciBpcyBzcGlubmluZywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gZHVyYXRpb24gLSB0aGUgZHVyYXRpb24gb2YgdGhlIHNwaW5uaW5nIHNpbmNlIGl0cyBiZWdpbm5pbmcuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBneXJOb3JtIC0gdGhlIG5vcm0gb2YgdGhlIHJvdGF0aW9uIHNwZWVkLlxuICAgKi9cblxuICAvKipcbiAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHN0aWxsbmVzcyBvZiB0aGUgc2Vuc29yLlxuICAgKiBAdHlwZWRlZiBzdGlsbFxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IHN0aWxsIC0gdHJ1ZSBpZiB0aGUgc2Vuc29yIGlzIHN0aWxsLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBzbGlkZSAtIHRoZSBvcmlnaW5hbCB2YWx1ZSB0aHJlc2hvbGRlZCB0byBkZXRlcm1pbmUgc3RpbGxuZXNzLlxuICAgKi9cblxuICAvKipcbiAgICogQ29tcHV0ZWQgZmVhdHVyZXMuXG4gICAqIEB0eXBlZGVmIGZlYXR1cmVzXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7YWNjSW50ZW5zaXR5fSBhY2NJbnRlbnNpdHkgLSBJbnRlbnNpdHkgb2YgdGhlIG1vdmVtZW50IHNlbnNlZCBieSBhbiBhY2NlbGVyb21ldGVyLlxuICAgKiBAcHJvcGVydHkge2d5ckludGVuc2l0eX0gZ3lySW50ZW5zaXR5IC0gSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYSBneXJvc2NvcGUuXG4gICAqIEBwcm9wZXJ0eSB7ZnJlZWZhbGx9IGZyZWVmYWxsIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGZyZWUgZmFsbGluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAcHJvcGVydHkge2tpY2t9IGtpY2sgLSBJbXB1bHNlIC8gaGl0IG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHByb3BlcnR5IHtzaGFrZX0gc2hha2UgLSBTaGFrZSBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEBwcm9wZXJ0eSB7c3Bpbn0gc3BpbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzcGlubmluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAcHJvcGVydHkge3N0aWxsfSBzdGlsbCAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzdGlsbG5lc3Mgb2YgdGhlIHNlbnNvci5cbiAgICovXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGhhbmRsaW5nIHRoZSBmZWF0dXJlcy5cbiAgICogQGNhbGxiYWNrIGZlYXR1cmVzQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVyciAtIERlc2NyaXB0aW9uIG9mIGEgcG90ZW50aWFsIGVycm9yLlxuICAgKiBAcGFyYW0ge2ZlYXR1cmVzfSByZXMgLSBPYmplY3QgaG9sZGluZyB0aGUgZmVhdHVyZSB2YWx1ZXMuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBjb21wdXRhdGlvbiBvZiB0aGUgZGVzY3JpcHRvcnMgZnJvbSB0aGUgY3VycmVudCBzZW5zb3IgdmFsdWVzIGFuZFxuICAgKiBwYXNzIHRoZSByZXN1bHRzIHRvIGEgY2FsbGJhY2tcbiAgICogQHBhcmFtIHtmZWF0dXJlc0NhbGxiYWNrfSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBoYW5kbGluZyB0aGUgbGFzdCBjb21wdXRlZCBkZXNjcmlwdG9yc1xuICAgKiBAcmV0dXJucyB7ZmVhdHVyZXN9IGZlYXR1cmVzIC0gUmV0dXJuIHRoZXNlIGNvbXB1dGVkIGRlc2NyaXB0b3JzIGFueXdheVxuICAgKi9cbiAgdXBkYXRlKGNhbGxiYWNrID0gbnVsbCkge1xuICAgIC8vIERFQUwgV0lUSCB0aGlzLl9lbGFwc2VkVGltZVxuICAgIHRoaXMuX2VsYXBzZWRUaW1lID0gcGVyZk5vdygpO1xuICAgIC8vIGlzIHRoaXMgb25lIHVzZWQgYnkgc2V2ZXJhbCBmZWF0dXJlcyA/XG4gICAgdGhpcy5fYWNjTm9ybSA9IHRoaXMuX21hZ25pdHVkZTNEKHRoaXMuYWNjKTtcbiAgICAvLyB0aGlzIG9uZSBuZWVkcyBiZSBoZXJlIGJlY2F1c2UgdXNlZCBieSBmcmVlZmFsbCBBTkQgc3BpblxuICAgIHRoaXMuX2d5ck5vcm0gPSB0aGlzLl9tYWduaXR1ZGUzRCh0aGlzLmd5cik7XG4gICAgXG4gICAgbGV0IGVyciA9IG51bGw7XG4gICAgbGV0IHJlcyA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHJlcyA9IHt9O1xuICAgICAgZm9yIChsZXQga2V5IG9mIHRoaXMuX3BhcmFtcy5kZXNjcmlwdG9ycykge1xuICAgICAgICBpZiAodGhpcy5fbWV0aG9kc1trZXldKSB7XG4gICAgICAgICAgdGhpcy5fbWV0aG9kc1trZXldKHJlcyk7XG4gICAgICAgIH1cbiAgICAgIH0gXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZXJyID0gZTtcbiAgICB9XG5cbiAgICB0aGlzLl9sb29wSW5kZXggPSAodGhpcy5fbG9vcEluZGV4ICsgMSkgJSB0aGlzLl9sb29wSW5kZXhQZXJpb2Q7XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKGVyciwgcmVzKTsgIFxuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PSBzcGVjaWZpYyBkZXNjcmlwdG9ycyBjb21wdXRpbmcgPT09PT09PT09PT09PT09PT09PT0vL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUFjY1JhdyhyZXMpIHtcbiAgICByZXMuYWNjUmF3ID0ge1xuICAgICAgeDogdGhpcy5hY2NbMF0sXG4gICAgICB5OiB0aGlzLmFjY1sxXSxcbiAgICAgIHo6IHRoaXMuYWNjWzJdXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlR3lyUmF3KHJlcykge1xuICAgIHJlcy5neXJSYXcgPSB7XG4gICAgICB4OiB0aGlzLmd5clswXSxcbiAgICAgIHk6IHRoaXMuZ3lyWzFdLFxuICAgICAgejogdGhpcy5neXJbMl1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBhY2MgaW50ZW5zaXR5XG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlQWNjSW50ZW5zaXR5KHJlcykge1xuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2FjY0xhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmFjY1tpXTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5W2ldID0gdGhpcy5faW50ZW5zaXR5MUQoXG4gICAgICAgIHRoaXMuYWNjW2ldLFxuICAgICAgICB0aGlzLl9hY2NMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLFxuICAgICAgICB0aGlzLl9hY2NJbnRlbnNpdHlMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDJdLFxuICAgICAgICB0aGlzLl9wYXJhbXMuYWNjSW50ZW5zaXR5UGFyYW0xLFxuICAgICAgICB0aGlzLl9wYXJhbXMuYWNjSW50ZW5zaXR5UGFyYW0yLFxuICAgICAgICAxXG4gICAgICApO1xuXG4gICAgICB0aGlzLl9hY2NJbnRlbnNpdHlMYXN0W2ldW3RoaXMuX2xvb3BJbmRleCAlIDJdID0gdGhpcy5fYWNjSW50ZW5zaXR5W2ldO1xuXG4gICAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtICs9IHRoaXMuX2FjY0ludGVuc2l0eVtpXTtcbiAgICB9XG5cbiAgICByZXMuYWNjSW50ZW5zaXR5ID0ge1xuICAgICAgbm9ybTogdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSxcbiAgICAgIHg6IHRoaXMuX2FjY0ludGVuc2l0eVswXSxcbiAgICAgIHk6IHRoaXMuX2FjY0ludGVuc2l0eVsxXSxcbiAgICAgIHo6IHRoaXMuX2FjY0ludGVuc2l0eVsyXVxuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGd5ciBpbnRlbnNpdHlcbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVHeXJJbnRlbnNpdHkocmVzKSB7XG4gICAgdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSA9IDA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgdGhpcy5fZ3lyTGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAzXSA9IHRoaXMuZ3lyW2ldO1xuXG4gICAgICB0aGlzLl9neXJJbnRlbnNpdHlbaV0gPSB0aGlzLl9pbnRlbnNpdHkxRChcbiAgICAgICAgdGhpcy5neXJbaV0sXG4gICAgICAgIHRoaXMuX2d5ckxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgMl0sXG4gICAgICAgIHRoaXMuX3BhcmFtcy5neXJJbnRlbnNpdHlQYXJhbTEsXG4gICAgICAgIHRoaXMuX3BhcmFtcy5neXJJbnRlbnNpdHlQYXJhbTIsXG4gICAgICAgIDFcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgMl0gPSB0aGlzLl9neXJJbnRlbnNpdHlbaV07XG5cbiAgICAgIHRoaXMuX2d5ckludGVuc2l0eU5vcm0gKz0gdGhpcy5fZ3lySW50ZW5zaXR5W2ldO1xuICAgIH1cblxuICAgIHJlcy5neXJJbnRlbnNpdHkgPSB7XG4gICAgICBub3JtOiB0aGlzLl9neXJJbnRlbnNpdHlOb3JtLFxuICAgICAgeDogdGhpcy5fZ3lySW50ZW5zaXR5WzBdLFxuICAgICAgeTogdGhpcy5fZ3lySW50ZW5zaXR5WzFdLFxuICAgICAgejogdGhpcy5fZ3lySW50ZW5zaXR5WzJdXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBmcmVlZmFsbFxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUZyZWVmYWxsKHJlcykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB0aGlzLl9neXJEZWx0YVtpXSA9XG4gICAgICAgIHRoaXMuX2RlbHRhKHRoaXMuX2d5ckxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sIHRoaXMuZ3lyW2ldLCAxKTtcbiAgICB9XG5cbiAgICB0aGlzLl9neXJEZWx0YU5vcm0gPSB0aGlzLl9tYWduaXR1ZGUzRCh0aGlzLl9neXJEZWx0YSk7XG5cbiAgICBpZiAodGhpcy5fYWNjTm9ybSA8IHRoaXMuX3BhcmFtcy5mcmVlZmFsbEFjY1RocmVzaCB8fFxuICAgICAgICAodGhpcy5fZ3lyTm9ybSA+IHRoaXMuX3BhcmFtcy5mcmVlZmFsbEd5clRocmVzaFxuICAgICAgICAgICYmIHRoaXMuX2d5ckRlbHRhTm9ybSA8IHRoaXMuX3BhcmFtcy5mcmVlZmFsbEd5ckRlbHRhVGhyZXNoKSkge1xuICAgICAgaWYgKCF0aGlzLl9pc0ZhbGxpbmcpIHtcbiAgICAgICAgdGhpcy5faXNGYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fZmFsbEJlZ2luID0gcGVyZk5vdygpO1xuICAgICAgfVxuICAgICAgdGhpcy5fZmFsbEVuZCA9IHBlcmZOb3coKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuX2lzRmFsbGluZykge1xuICAgICAgICB0aGlzLl9pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fZmFsbER1cmF0aW9uID0gKHRoaXMuX2ZhbGxFbmQgLSB0aGlzLl9mYWxsQmVnaW4pO1xuXG4gICAgcmVzLmZyZWVmYWxsID0ge1xuICAgICAgYWNjTm9ybTogdGhpcy5fYWNjTm9ybSxcbiAgICAgIGZhbGxpbmc6IHRoaXMuX2lzRmFsbGluZyxcbiAgICAgIGR1cmF0aW9uOiB0aGlzLl9mYWxsRHVyYXRpb25cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBraWNrXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlS2ljayhyZXMpIHtcbiAgICB0aGlzLl9pMyA9IHRoaXMuX2xvb3BJbmRleCAlIHRoaXMuX3BhcmFtcy5raWNrTWVkaWFuRmlsdGVyc2l6ZTtcbiAgICB0aGlzLl9pMSA9IHRoaXMuX21lZGlhbkZpZm9bdGhpcy5faTNdO1xuICAgIHRoaXMuX2kyID0gMTtcblxuICAgIGlmICh0aGlzLl9pMSA8IHRoaXMuX3BhcmFtcy5raWNrTWVkaWFuRmlsdGVyc2l6ZSAtIDEgJiZcbiAgICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA+IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXSkge1xuICAgICAgLy8gY2hlY2sgcmlnaHRcbiAgICAgIHdoaWxlICh0aGlzLl9pMSArIHRoaXMuX2kyIDwgdGhpcy5raWNrTWVkaWFuRmlsdGVyc2l6ZSAmJlxuICAgICAgICAgICAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID4gdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdKSB7XG4gICAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyXV0gPSBcbiAgICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdXSAtIDE7XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl07XG4gICAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID1cbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5faTIrKztcbiAgICAgIH1cbiAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPSB0aGlzLl9pMztcbiAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5faTNdID0gdGhpcy5faTEgKyB0aGlzLl9pMiAtIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNoZWNrIGxlZnRcbiAgICAgIHdoaWxlICh0aGlzLl9pMiA8IHRoaXMuX2kxICsgMSAmJlxuICAgICAgICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPCB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMl0pIHtcbiAgICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdXSA9XG4gICAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXV0gKyAxO1xuICAgICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID1cbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl07XG4gICAgICAgIHRoaXMuX2kyKys7XG4gICAgICB9XG4gICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcbiAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID0gdGhpcy5faTM7XG4gICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXSA9IHRoaXMuX2kxIC0gdGhpcy5faTIgKyAxO1xuICAgIH1cblxuICAgIC8vIGNvbXBhcmUgY3VycmVudCBpbnRlbnNpdHkgbm9ybSB3aXRoIHByZXZpb3VzIG1lZGlhbiB2YWx1ZVxuICAgIGlmICh0aGlzLl9hY2NJbnRlbnNpdHlOb3JtIC0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA+IHRoaXMuX3BhcmFtcy5raWNrVGhyZXNoKSB7XG4gICAgICBpZiAodGhpcy5faXNLaWNraW5nKSB7XG4gICAgICAgIGlmICh0aGlzLl9raWNrSW50ZW5zaXR5IDwgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSkge1xuICAgICAgICAgIHRoaXMuX2tpY2tJbnRlbnNpdHkgPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9raWNrQ2FsbGJhY2spIHtcbiAgICAgICAgICB0aGlzLl9raWNrQ2FsbGJhY2soeyBzdGF0ZTogJ21pZGRsZScsIGludGVuc2l0eTogdGhpcy5fa2lja0ludGVuc2l0eSB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5faXNLaWNraW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fa2lja0ludGVuc2l0eSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICAgIHRoaXMuX2xhc3RLaWNrID0gdGhpcy5fZWxhcHNlZFRpbWU7XG4gICAgICAgIGlmICh0aGlzLl9raWNrQ2FsbGJhY2spIHtcbiAgICAgICAgICB0aGlzLl9raWNrQ2FsbGJhY2soeyBzdGF0ZTogJ3N0YXJ0JywgaW50ZW5zaXR5OiB0aGlzLl9raWNrSW50ZW5zaXR5IH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLl9lbGFwc2VkVGltZSAtIHRoaXMuX2xhc3RLaWNrID4gdGhpcy5fcGFyYW1zLmtpY2tTcGVlZEdhdGUpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzS2lja2luZyAmJiB0aGlzLl9raWNrQ2FsbGJhY2spIHtcbiAgICAgICAgICB0aGlzLl9raWNrQ2FsbGJhY2soeyBzdGF0ZTogJ3N0b3AnLCBpbnRlbnNpdHk6IHRoaXMuX2tpY2tJbnRlbnNpdHkgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faXNLaWNraW5nID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA9IHRoaXMuX21lZGlhblZhbHVlc1tNYXRoLmNlaWwodGhpcy5fcGFyYW1zLmtpY2tNZWRpYW5GaWx0ZXJzaXplICogMC41KV07XG5cbiAgICByZXMua2ljayA9IHtcbiAgICAgIGludGVuc2l0eTogdGhpcy5fa2lja0ludGVuc2l0eSxcbiAgICAgIGtpY2tpbmc6IHRoaXMuX2lzS2lja2luZ1xuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc2hha2VcbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVTaGFrZShyZXMpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgdGhpcy5fYWNjRGVsdGFbaV0gPSB0aGlzLl9kZWx0YShcbiAgICAgICAgdGhpcy5fYWNjTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSxcbiAgICAgICAgdGhpcy5hY2NbaV0sXG4gICAgICAgIDFcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSB0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplXSkge1xuICAgICAgICB0aGlzLl9zaGFrZU5iW2ldLS07XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5fYWNjRGVsdGFbaV0gPiB0aGlzLl9wYXJhbXMuc2hha2VUaHJlc2gpIHtcbiAgICAgICAgdGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZV0gPSAxO1xuICAgICAgICB0aGlzLl9zaGFrZU5iW2ldKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSB0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplXSA9IDA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fc2hha2luZ1JhdyA9XG4gICAgdGhpcy5fbWFnbml0dWRlM0QodGhpcy5fc2hha2VOYikgL1xuICAgIHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemU7XG4gICAgdGhpcy5fc2hha2VTbGlkZVByZXYgPSB0aGlzLl9zaGFraW5nO1xuICAgIHRoaXMuX3NoYWtpbmcgPVxuICAgIHRoaXMuX3NsaWRlKHRoaXMuX3NoYWtlU2xpZGVQcmV2LCB0aGlzLl9zaGFraW5nUmF3LCB0aGlzLl9wYXJhbXMuc2hha2VTbGlkZUZhY3Rvcik7XG5cbiAgICByZXMuc2hha2UgPSB7XG4gICAgICBzaGFraW5nOiB0aGlzLl9zaGFraW5nXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc3BpblxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZVNwaW4ocmVzKSB7XG4gICAgaWYgKHRoaXMuX2d5ck5vcm0gPiB0aGlzLl9wYXJhbXMuc3BpblRocmVzaCkge1xuICAgICAgaWYgKCF0aGlzLl9pc1NwaW5uaW5nKSB7XG4gICAgICAgIHRoaXMuX2lzU3Bpbm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9zcGluQmVnaW4gPSBwZXJmTm93KCk7XG4gICAgICB9XG4gICAgICB0aGlzLl9zcGluRW5kID0gcGVyZk5vdygpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5faXNTcGlubmluZykge1xuICAgICAgdGhpcy5faXNTcGlubmluZyA9IGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLl9zcGluRHVyYXRpb24gPSB0aGlzLl9zcGluRW5kIC0gdGhpcy5fc3BpbkJlZ2luO1xuXG4gICAgcmVzLnNwaW4gPSB7XG4gICAgICBzcGlubmluZzogdGhpcy5faXNTcGlubmluZyxcbiAgICAgIGR1cmF0aW9uOiB0aGlzLl9zcGluRHVyYXRpb24sXG4gICAgICBneXJOb3JtOiB0aGlzLl9neXJOb3JtXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzdGlsbFxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZVN0aWxsKHJlcykge1xuICAgIHRoaXMuX3N0aWxsQ3Jvc3NQcm9kID0gdGhpcy5fc3RpbGxDcm9zc1Byb2R1Y3QodGhpcy5neXIpO1xuICAgIHRoaXMuX3N0aWxsU2xpZGVQcmV2ID0gdGhpcy5fc3RpbGxTbGlkZTtcbiAgICB0aGlzLl9zdGlsbFNsaWRlID0gdGhpcy5fc2xpZGUoXG4gICAgICB0aGlzLl9zdGlsbFNsaWRlUHJldixcbiAgICAgIHRoaXMuX3N0aWxsQ3Jvc3NQcm9kLFxuICAgICAgdGhpcy5fcGFyYW1zLnN0aWxsU2xpZGVGYWN0b3JcbiAgICApO1xuXG4gICAgaWYgKHRoaXMuX3N0aWxsU2xpZGUgPiB0aGlzLl9wYXJhbXMuc3RpbGxUaHJlc2gpIHtcbiAgICAgIHRoaXMuX2lzU3RpbGwgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5faXNTdGlsbCA9IHRydWU7XG4gICAgfVxuICBcbiAgICByZXMuc3RpbGwgPSB7XG4gICAgICBzdGlsbDogdGhpcy5faXNTdGlsbCxcbiAgICAgIHNsaWRlOiB0aGlzLl9zdGlsbFNsaWRlXG4gICAgfVxuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gVVRJTElUSUVTID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cbiAgLyoqIEBwcml2YXRlICovXG4gIF9kZWx0YShwcmV2LCBuZXh0LCBkdCkge1xuICAgIHJldHVybiAobmV4dCAtIHByZXYpIC8gKDIgKiBkdCk7XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX2ludGVuc2l0eTFEKG5leHRYLCBwcmV2WCwgcHJldkludGVuc2l0eSwgcGFyYW0xLCBwYXJhbTIsIGR0KSB7XG4gICAgY29uc3QgZHggPSB0aGlzLl9kZWx0YShuZXh0WCwgcHJldlgsIGR0KTsvLyhuZXh0WCAtIHByZXZYKSAvICgyICogZHQpO1xuICAgIHJldHVybiBwYXJhbTIgKiBkeCAqIGR4ICsgcGFyYW0xICogcHJldkludGVuc2l0eTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfbWFnbml0dWRlM0QoeHl6QXJyYXkpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHh5ekFycmF5WzBdICogeHl6QXJyYXlbMF0gKyBcbiAgICAgICAgICAgICAgICB4eXpBcnJheVsxXSAqIHh5ekFycmF5WzFdICtcbiAgICAgICAgICAgICAgICB4eXpBcnJheVsyXSAqIHh5ekFycmF5WzJdKTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfbGNtKGEsIGIpIHtcbiAgICBsZXQgYTEgPSBhLCBiMSA9IGI7XG5cbiAgICB3aGlsZSAoYTEgIT0gYjEpIHtcbiAgICAgIGlmIChhMSA8IGIxKSB7XG4gICAgICAgIGExICs9IGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiMSArPSBiO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhMTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfc2xpZGUocHJldlNsaWRlLCBjdXJyZW50VmFsLCBzbGlkZUZhY3Rvcikge1xuICAgIHJldHVybiBwcmV2U2xpZGUgKyAoY3VycmVudFZhbCAtIHByZXZTbGlkZSkgLyBzbGlkZUZhY3RvcjtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfc3RpbGxDcm9zc1Byb2R1Y3QoeHl6QXJyYXkpIHtcbiAgICByZXR1cm4gKHh5ekFycmF5WzFdIC0geHl6QXJyYXlbMl0pICogKHh5ekFycmF5WzFdIC0geHl6QXJyYXlbMl0pICtcbiAgICAgICAgICAgKHh5ekFycmF5WzBdIC0geHl6QXJyYXlbMV0pICogKHh5ekFycmF5WzBdIC0geHl6QXJyYXlbMV0pICtcbiAgICAgICAgICAgKHh5ekFycmF5WzJdIC0geHl6QXJyYXlbMF0pICogKHh5ekFycmF5WzJdIC0geHl6QXJyYXlbMF0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vdGlvbkZlYXR1cmVzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7IFwiZGVmYXVsdFwiOiByZXF1aXJlKFwiY29yZS1qcy9saWJyYXJ5L2ZuL2dldC1pdGVyYXRvclwiKSwgX19lc01vZHVsZTogdHJ1ZSB9OyIsIm1vZHVsZS5leHBvcnRzID0geyBcImRlZmF1bHRcIjogcmVxdWlyZShcImNvcmUtanMvbGlicmFyeS9mbi9vYmplY3QvYXNzaWduXCIpLCBfX2VzTW9kdWxlOiB0cnVlIH07IiwibW9kdWxlLmV4cG9ydHMgPSB7IFwiZGVmYXVsdFwiOiByZXF1aXJlKFwiY29yZS1qcy9saWJyYXJ5L2ZuL29iamVjdC9kZWZpbmUtcHJvcGVydHlcIiksIF9fZXNNb2R1bGU6IHRydWUgfTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gZnVuY3Rpb24gKGluc3RhbmNlLCBDb25zdHJ1Y3Rvcikge1xuICBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7XG4gIH1cbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfZGVmaW5lUHJvcGVydHkgPSByZXF1aXJlKFwiLi4vY29yZS1qcy9vYmplY3QvZGVmaW5lLXByb3BlcnR5XCIpO1xuXG52YXIgX2RlZmluZVByb3BlcnR5MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2RlZmluZVByb3BlcnR5KTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZXhwb3J0cy5kZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldO1xuICAgICAgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlO1xuICAgICAgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlO1xuICAgICAgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTtcbiAgICAgICgwLCBfZGVmaW5lUHJvcGVydHkyLmRlZmF1bHQpKHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG4gICAgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTtcbiAgICByZXR1cm4gQ29uc3RydWN0b3I7XG4gIH07XG59KCk7IiwicmVxdWlyZSgnLi4vbW9kdWxlcy93ZWIuZG9tLml0ZXJhYmxlJyk7XG5yZXF1aXJlKCcuLi9tb2R1bGVzL2VzNi5zdHJpbmcuaXRlcmF0b3InKTtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi4vbW9kdWxlcy9jb3JlLmdldC1pdGVyYXRvcicpOyIsInJlcXVpcmUoJy4uLy4uL21vZHVsZXMvZXM2Lm9iamVjdC5hc3NpZ24nKTtcbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi4vLi4vbW9kdWxlcy9fY29yZScpLk9iamVjdC5hc3NpZ247IiwicmVxdWlyZSgnLi4vLi4vbW9kdWxlcy9lczYub2JqZWN0LmRlZmluZS1wcm9wZXJ0eScpO1xudmFyICRPYmplY3QgPSByZXF1aXJlKCcuLi8uLi9tb2R1bGVzL19jb3JlJykuT2JqZWN0O1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShpdCwga2V5LCBkZXNjKXtcbiAgcmV0dXJuICRPYmplY3QuZGVmaW5lUHJvcGVydHkoaXQsIGtleSwgZGVzYyk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXQpe1xuICBpZih0eXBlb2YgaXQgIT0gJ2Z1bmN0aW9uJyl0aHJvdyBUeXBlRXJyb3IoaXQgKyAnIGlzIG5vdCBhIGZ1bmN0aW9uIScpO1xuICByZXR1cm4gaXQ7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKXsgLyogZW1wdHkgKi8gfTsiLCJ2YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL19pcy1vYmplY3QnKTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXQpe1xuICBpZighaXNPYmplY3QoaXQpKXRocm93IFR5cGVFcnJvcihpdCArICcgaXMgbm90IGFuIG9iamVjdCEnKTtcbiAgcmV0dXJuIGl0O1xufTsiLCIvLyBmYWxzZSAtPiBBcnJheSNpbmRleE9mXG4vLyB0cnVlICAtPiBBcnJheSNpbmNsdWRlc1xudmFyIHRvSU9iamVjdCA9IHJlcXVpcmUoJy4vX3RvLWlvYmplY3QnKVxuICAsIHRvTGVuZ3RoICA9IHJlcXVpcmUoJy4vX3RvLWxlbmd0aCcpXG4gICwgdG9JbmRleCAgID0gcmVxdWlyZSgnLi9fdG8taW5kZXgnKTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oSVNfSU5DTFVERVMpe1xuICByZXR1cm4gZnVuY3Rpb24oJHRoaXMsIGVsLCBmcm9tSW5kZXgpe1xuICAgIHZhciBPICAgICAgPSB0b0lPYmplY3QoJHRoaXMpXG4gICAgICAsIGxlbmd0aCA9IHRvTGVuZ3RoKE8ubGVuZ3RoKVxuICAgICAgLCBpbmRleCAgPSB0b0luZGV4KGZyb21JbmRleCwgbGVuZ3RoKVxuICAgICAgLCB2YWx1ZTtcbiAgICAvLyBBcnJheSNpbmNsdWRlcyB1c2VzIFNhbWVWYWx1ZVplcm8gZXF1YWxpdHkgYWxnb3JpdGhtXG4gICAgaWYoSVNfSU5DTFVERVMgJiYgZWwgIT0gZWwpd2hpbGUobGVuZ3RoID4gaW5kZXgpe1xuICAgICAgdmFsdWUgPSBPW2luZGV4KytdO1xuICAgICAgaWYodmFsdWUgIT0gdmFsdWUpcmV0dXJuIHRydWU7XG4gICAgLy8gQXJyYXkjdG9JbmRleCBpZ25vcmVzIGhvbGVzLCBBcnJheSNpbmNsdWRlcyAtIG5vdFxuICAgIH0gZWxzZSBmb3IoO2xlbmd0aCA+IGluZGV4OyBpbmRleCsrKWlmKElTX0lOQ0xVREVTIHx8IGluZGV4IGluIE8pe1xuICAgICAgaWYoT1tpbmRleF0gPT09IGVsKXJldHVybiBJU19JTkNMVURFUyB8fCBpbmRleCB8fCAwO1xuICAgIH0gcmV0dXJuICFJU19JTkNMVURFUyAmJiAtMTtcbiAgfTtcbn07IiwiLy8gZ2V0dGluZyB0YWcgZnJvbSAxOS4xLjMuNiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nKClcbnZhciBjb2YgPSByZXF1aXJlKCcuL19jb2YnKVxuICAsIFRBRyA9IHJlcXVpcmUoJy4vX3drcycpKCd0b1N0cmluZ1RhZycpXG4gIC8vIEVTMyB3cm9uZyBoZXJlXG4gICwgQVJHID0gY29mKGZ1bmN0aW9uKCl7IHJldHVybiBhcmd1bWVudHM7IH0oKSkgPT0gJ0FyZ3VtZW50cyc7XG5cbi8vIGZhbGxiYWNrIGZvciBJRTExIFNjcmlwdCBBY2Nlc3MgRGVuaWVkIGVycm9yXG52YXIgdHJ5R2V0ID0gZnVuY3Rpb24oaXQsIGtleSl7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGl0W2tleV07XG4gIH0gY2F0Y2goZSl7IC8qIGVtcHR5ICovIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXQpe1xuICB2YXIgTywgVCwgQjtcbiAgcmV0dXJuIGl0ID09PSB1bmRlZmluZWQgPyAnVW5kZWZpbmVkJyA6IGl0ID09PSBudWxsID8gJ051bGwnXG4gICAgLy8gQEB0b1N0cmluZ1RhZyBjYXNlXG4gICAgOiB0eXBlb2YgKFQgPSB0cnlHZXQoTyA9IE9iamVjdChpdCksIFRBRykpID09ICdzdHJpbmcnID8gVFxuICAgIC8vIGJ1aWx0aW5UYWcgY2FzZVxuICAgIDogQVJHID8gY29mKE8pXG4gICAgLy8gRVMzIGFyZ3VtZW50cyBmYWxsYmFja1xuICAgIDogKEIgPSBjb2YoTykpID09ICdPYmplY3QnICYmIHR5cGVvZiBPLmNhbGxlZSA9PSAnZnVuY3Rpb24nID8gJ0FyZ3VtZW50cycgOiBCO1xufTsiLCJ2YXIgdG9TdHJpbmcgPSB7fS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCl7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKGl0KS5zbGljZSg4LCAtMSk7XG59OyIsInZhciBjb3JlID0gbW9kdWxlLmV4cG9ydHMgPSB7dmVyc2lvbjogJzIuNC4wJ307XG5pZih0eXBlb2YgX19lID09ICdudW1iZXInKV9fZSA9IGNvcmU7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW5kZWYiLCIvLyBvcHRpb25hbCAvIHNpbXBsZSBjb250ZXh0IGJpbmRpbmdcbnZhciBhRnVuY3Rpb24gPSByZXF1aXJlKCcuL19hLWZ1bmN0aW9uJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuLCB0aGF0LCBsZW5ndGgpe1xuICBhRnVuY3Rpb24oZm4pO1xuICBpZih0aGF0ID09PSB1bmRlZmluZWQpcmV0dXJuIGZuO1xuICBzd2l0Y2gobGVuZ3RoKXtcbiAgICBjYXNlIDE6IHJldHVybiBmdW5jdGlvbihhKXtcbiAgICAgIHJldHVybiBmbi5jYWxsKHRoYXQsIGEpO1xuICAgIH07XG4gICAgY2FzZSAyOiByZXR1cm4gZnVuY3Rpb24oYSwgYil7XG4gICAgICByZXR1cm4gZm4uY2FsbCh0aGF0LCBhLCBiKTtcbiAgICB9O1xuICAgIGNhc2UgMzogcmV0dXJuIGZ1bmN0aW9uKGEsIGIsIGMpe1xuICAgICAgcmV0dXJuIGZuLmNhbGwodGhhdCwgYSwgYiwgYyk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gZnVuY3Rpb24oLyogLi4uYXJncyAqLyl7XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoYXQsIGFyZ3VtZW50cyk7XG4gIH07XG59OyIsIi8vIDcuMi4xIFJlcXVpcmVPYmplY3RDb2VyY2libGUoYXJndW1lbnQpXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGl0KXtcbiAgaWYoaXQgPT0gdW5kZWZpbmVkKXRocm93IFR5cGVFcnJvcihcIkNhbid0IGNhbGwgbWV0aG9kIG9uICBcIiArIGl0KTtcbiAgcmV0dXJuIGl0O1xufTsiLCIvLyBUaGFuaydzIElFOCBmb3IgaGlzIGZ1bm55IGRlZmluZVByb3BlcnR5XG5tb2R1bGUuZXhwb3J0cyA9ICFyZXF1aXJlKCcuL19mYWlscycpKGZ1bmN0aW9uKCl7XG4gIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sICdhJywge2dldDogZnVuY3Rpb24oKXsgcmV0dXJuIDc7IH19KS5hICE9IDc7XG59KTsiLCJ2YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL19pcy1vYmplY3QnKVxuICAsIGRvY3VtZW50ID0gcmVxdWlyZSgnLi9fZ2xvYmFsJykuZG9jdW1lbnRcbiAgLy8gaW4gb2xkIElFIHR5cGVvZiBkb2N1bWVudC5jcmVhdGVFbGVtZW50IGlzICdvYmplY3QnXG4gICwgaXMgPSBpc09iamVjdChkb2N1bWVudCkgJiYgaXNPYmplY3QoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGl0KXtcbiAgcmV0dXJuIGlzID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChpdCkgOiB7fTtcbn07IiwiLy8gSUUgOC0gZG9uJ3QgZW51bSBidWcga2V5c1xubW9kdWxlLmV4cG9ydHMgPSAoXG4gICdjb25zdHJ1Y3RvcixoYXNPd25Qcm9wZXJ0eSxpc1Byb3RvdHlwZU9mLHByb3BlcnR5SXNFbnVtZXJhYmxlLHRvTG9jYWxlU3RyaW5nLHRvU3RyaW5nLHZhbHVlT2YnXG4pLnNwbGl0KCcsJyk7IiwidmFyIGdsb2JhbCAgICA9IHJlcXVpcmUoJy4vX2dsb2JhbCcpXG4gICwgY29yZSAgICAgID0gcmVxdWlyZSgnLi9fY29yZScpXG4gICwgY3R4ICAgICAgID0gcmVxdWlyZSgnLi9fY3R4JylcbiAgLCBoaWRlICAgICAgPSByZXF1aXJlKCcuL19oaWRlJylcbiAgLCBQUk9UT1RZUEUgPSAncHJvdG90eXBlJztcblxudmFyICRleHBvcnQgPSBmdW5jdGlvbih0eXBlLCBuYW1lLCBzb3VyY2Upe1xuICB2YXIgSVNfRk9SQ0VEID0gdHlwZSAmICRleHBvcnQuRlxuICAgICwgSVNfR0xPQkFMID0gdHlwZSAmICRleHBvcnQuR1xuICAgICwgSVNfU1RBVElDID0gdHlwZSAmICRleHBvcnQuU1xuICAgICwgSVNfUFJPVE8gID0gdHlwZSAmICRleHBvcnQuUFxuICAgICwgSVNfQklORCAgID0gdHlwZSAmICRleHBvcnQuQlxuICAgICwgSVNfV1JBUCAgID0gdHlwZSAmICRleHBvcnQuV1xuICAgICwgZXhwb3J0cyAgID0gSVNfR0xPQkFMID8gY29yZSA6IGNvcmVbbmFtZV0gfHwgKGNvcmVbbmFtZV0gPSB7fSlcbiAgICAsIGV4cFByb3RvICA9IGV4cG9ydHNbUFJPVE9UWVBFXVxuICAgICwgdGFyZ2V0ICAgID0gSVNfR0xPQkFMID8gZ2xvYmFsIDogSVNfU1RBVElDID8gZ2xvYmFsW25hbWVdIDogKGdsb2JhbFtuYW1lXSB8fCB7fSlbUFJPVE9UWVBFXVxuICAgICwga2V5LCBvd24sIG91dDtcbiAgaWYoSVNfR0xPQkFMKXNvdXJjZSA9IG5hbWU7XG4gIGZvcihrZXkgaW4gc291cmNlKXtcbiAgICAvLyBjb250YWlucyBpbiBuYXRpdmVcbiAgICBvd24gPSAhSVNfRk9SQ0VEICYmIHRhcmdldCAmJiB0YXJnZXRba2V5XSAhPT0gdW5kZWZpbmVkO1xuICAgIGlmKG93biAmJiBrZXkgaW4gZXhwb3J0cyljb250aW51ZTtcbiAgICAvLyBleHBvcnQgbmF0aXZlIG9yIHBhc3NlZFxuICAgIG91dCA9IG93biA/IHRhcmdldFtrZXldIDogc291cmNlW2tleV07XG4gICAgLy8gcHJldmVudCBnbG9iYWwgcG9sbHV0aW9uIGZvciBuYW1lc3BhY2VzXG4gICAgZXhwb3J0c1trZXldID0gSVNfR0xPQkFMICYmIHR5cGVvZiB0YXJnZXRba2V5XSAhPSAnZnVuY3Rpb24nID8gc291cmNlW2tleV1cbiAgICAvLyBiaW5kIHRpbWVycyB0byBnbG9iYWwgZm9yIGNhbGwgZnJvbSBleHBvcnQgY29udGV4dFxuICAgIDogSVNfQklORCAmJiBvd24gPyBjdHgob3V0LCBnbG9iYWwpXG4gICAgLy8gd3JhcCBnbG9iYWwgY29uc3RydWN0b3JzIGZvciBwcmV2ZW50IGNoYW5nZSB0aGVtIGluIGxpYnJhcnlcbiAgICA6IElTX1dSQVAgJiYgdGFyZ2V0W2tleV0gPT0gb3V0ID8gKGZ1bmN0aW9uKEMpe1xuICAgICAgdmFyIEYgPSBmdW5jdGlvbihhLCBiLCBjKXtcbiAgICAgICAgaWYodGhpcyBpbnN0YW5jZW9mIEMpe1xuICAgICAgICAgIHN3aXRjaChhcmd1bWVudHMubGVuZ3RoKXtcbiAgICAgICAgICAgIGNhc2UgMDogcmV0dXJuIG5ldyBDO1xuICAgICAgICAgICAgY2FzZSAxOiByZXR1cm4gbmV3IEMoYSk7XG4gICAgICAgICAgICBjYXNlIDI6IHJldHVybiBuZXcgQyhhLCBiKTtcbiAgICAgICAgICB9IHJldHVybiBuZXcgQyhhLCBiLCBjKTtcbiAgICAgICAgfSByZXR1cm4gQy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICAgIEZbUFJPVE9UWVBFXSA9IENbUFJPVE9UWVBFXTtcbiAgICAgIHJldHVybiBGO1xuICAgIC8vIG1ha2Ugc3RhdGljIHZlcnNpb25zIGZvciBwcm90b3R5cGUgbWV0aG9kc1xuICAgIH0pKG91dCkgOiBJU19QUk9UTyAmJiB0eXBlb2Ygb3V0ID09ICdmdW5jdGlvbicgPyBjdHgoRnVuY3Rpb24uY2FsbCwgb3V0KSA6IG91dDtcbiAgICAvLyBleHBvcnQgcHJvdG8gbWV0aG9kcyB0byBjb3JlLiVDT05TVFJVQ1RPUiUubWV0aG9kcy4lTkFNRSVcbiAgICBpZihJU19QUk9UTyl7XG4gICAgICAoZXhwb3J0cy52aXJ0dWFsIHx8IChleHBvcnRzLnZpcnR1YWwgPSB7fSkpW2tleV0gPSBvdXQ7XG4gICAgICAvLyBleHBvcnQgcHJvdG8gbWV0aG9kcyB0byBjb3JlLiVDT05TVFJVQ1RPUiUucHJvdG90eXBlLiVOQU1FJVxuICAgICAgaWYodHlwZSAmICRleHBvcnQuUiAmJiBleHBQcm90byAmJiAhZXhwUHJvdG9ba2V5XSloaWRlKGV4cFByb3RvLCBrZXksIG91dCk7XG4gICAgfVxuICB9XG59O1xuLy8gdHlwZSBiaXRtYXBcbiRleHBvcnQuRiA9IDE7ICAgLy8gZm9yY2VkXG4kZXhwb3J0LkcgPSAyOyAgIC8vIGdsb2JhbFxuJGV4cG9ydC5TID0gNDsgICAvLyBzdGF0aWNcbiRleHBvcnQuUCA9IDg7ICAgLy8gcHJvdG9cbiRleHBvcnQuQiA9IDE2OyAgLy8gYmluZFxuJGV4cG9ydC5XID0gMzI7ICAvLyB3cmFwXG4kZXhwb3J0LlUgPSA2NDsgIC8vIHNhZmVcbiRleHBvcnQuUiA9IDEyODsgLy8gcmVhbCBwcm90byBtZXRob2QgZm9yIGBsaWJyYXJ5YCBcbm1vZHVsZS5leHBvcnRzID0gJGV4cG9ydDsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGV4ZWMpe1xuICB0cnkge1xuICAgIHJldHVybiAhIWV4ZWMoKTtcbiAgfSBjYXRjaChlKXtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufTsiLCIvLyBodHRwczovL2dpdGh1Yi5jb20vemxvaXJvY2svY29yZS1qcy9pc3N1ZXMvODYjaXNzdWVjb21tZW50LTExNTc1OTAyOFxudmFyIGdsb2JhbCA9IG1vZHVsZS5leHBvcnRzID0gdHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuTWF0aCA9PSBNYXRoXG4gID8gd2luZG93IDogdHlwZW9mIHNlbGYgIT0gJ3VuZGVmaW5lZCcgJiYgc2VsZi5NYXRoID09IE1hdGggPyBzZWxmIDogRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcbmlmKHR5cGVvZiBfX2cgPT0gJ251bWJlcicpX19nID0gZ2xvYmFsOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmIiwidmFyIGhhc093blByb3BlcnR5ID0ge30uaGFzT3duUHJvcGVydHk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGl0LCBrZXkpe1xuICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChpdCwga2V5KTtcbn07IiwidmFyIGRQICAgICAgICAgPSByZXF1aXJlKCcuL19vYmplY3QtZHAnKVxuICAsIGNyZWF0ZURlc2MgPSByZXF1aXJlKCcuL19wcm9wZXJ0eS1kZXNjJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vX2Rlc2NyaXB0b3JzJykgPyBmdW5jdGlvbihvYmplY3QsIGtleSwgdmFsdWUpe1xuICByZXR1cm4gZFAuZihvYmplY3QsIGtleSwgY3JlYXRlRGVzYygxLCB2YWx1ZSkpO1xufSA6IGZ1bmN0aW9uKG9iamVjdCwga2V5LCB2YWx1ZSl7XG4gIG9iamVjdFtrZXldID0gdmFsdWU7XG4gIHJldHVybiBvYmplY3Q7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9fZ2xvYmFsJykuZG9jdW1lbnQgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50OyIsIm1vZHVsZS5leHBvcnRzID0gIXJlcXVpcmUoJy4vX2Rlc2NyaXB0b3JzJykgJiYgIXJlcXVpcmUoJy4vX2ZhaWxzJykoZnVuY3Rpb24oKXtcbiAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXF1aXJlKCcuL19kb20tY3JlYXRlJykoJ2RpdicpLCAnYScsIHtnZXQ6IGZ1bmN0aW9uKCl7IHJldHVybiA3OyB9fSkuYSAhPSA3O1xufSk7IiwiLy8gZmFsbGJhY2sgZm9yIG5vbi1hcnJheS1saWtlIEVTMyBhbmQgbm9uLWVudW1lcmFibGUgb2xkIFY4IHN0cmluZ3NcbnZhciBjb2YgPSByZXF1aXJlKCcuL19jb2YnKTtcbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0KCd6JykucHJvcGVydHlJc0VudW1lcmFibGUoMCkgPyBPYmplY3QgOiBmdW5jdGlvbihpdCl7XG4gIHJldHVybiBjb2YoaXQpID09ICdTdHJpbmcnID8gaXQuc3BsaXQoJycpIDogT2JqZWN0KGl0KTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCl7XG4gIHJldHVybiB0eXBlb2YgaXQgPT09ICdvYmplY3QnID8gaXQgIT09IG51bGwgOiB0eXBlb2YgaXQgPT09ICdmdW5jdGlvbic7XG59OyIsIid1c2Ugc3RyaWN0JztcbnZhciBjcmVhdGUgICAgICAgICA9IHJlcXVpcmUoJy4vX29iamVjdC1jcmVhdGUnKVxuICAsIGRlc2NyaXB0b3IgICAgID0gcmVxdWlyZSgnLi9fcHJvcGVydHktZGVzYycpXG4gICwgc2V0VG9TdHJpbmdUYWcgPSByZXF1aXJlKCcuL19zZXQtdG8tc3RyaW5nLXRhZycpXG4gICwgSXRlcmF0b3JQcm90b3R5cGUgPSB7fTtcblxuLy8gMjUuMS4yLjEuMSAlSXRlcmF0b3JQcm90b3R5cGUlW0BAaXRlcmF0b3JdKClcbnJlcXVpcmUoJy4vX2hpZGUnKShJdGVyYXRvclByb3RvdHlwZSwgcmVxdWlyZSgnLi9fd2tzJykoJ2l0ZXJhdG9yJyksIGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzOyB9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDb25zdHJ1Y3RvciwgTkFNRSwgbmV4dCl7XG4gIENvbnN0cnVjdG9yLnByb3RvdHlwZSA9IGNyZWF0ZShJdGVyYXRvclByb3RvdHlwZSwge25leHQ6IGRlc2NyaXB0b3IoMSwgbmV4dCl9KTtcbiAgc2V0VG9TdHJpbmdUYWcoQ29uc3RydWN0b3IsIE5BTUUgKyAnIEl0ZXJhdG9yJyk7XG59OyIsIid1c2Ugc3RyaWN0JztcbnZhciBMSUJSQVJZICAgICAgICA9IHJlcXVpcmUoJy4vX2xpYnJhcnknKVxuICAsICRleHBvcnQgICAgICAgID0gcmVxdWlyZSgnLi9fZXhwb3J0JylcbiAgLCByZWRlZmluZSAgICAgICA9IHJlcXVpcmUoJy4vX3JlZGVmaW5lJylcbiAgLCBoaWRlICAgICAgICAgICA9IHJlcXVpcmUoJy4vX2hpZGUnKVxuICAsIGhhcyAgICAgICAgICAgID0gcmVxdWlyZSgnLi9faGFzJylcbiAgLCBJdGVyYXRvcnMgICAgICA9IHJlcXVpcmUoJy4vX2l0ZXJhdG9ycycpXG4gICwgJGl0ZXJDcmVhdGUgICAgPSByZXF1aXJlKCcuL19pdGVyLWNyZWF0ZScpXG4gICwgc2V0VG9TdHJpbmdUYWcgPSByZXF1aXJlKCcuL19zZXQtdG8tc3RyaW5nLXRhZycpXG4gICwgZ2V0UHJvdG90eXBlT2YgPSByZXF1aXJlKCcuL19vYmplY3QtZ3BvJylcbiAgLCBJVEVSQVRPUiAgICAgICA9IHJlcXVpcmUoJy4vX3drcycpKCdpdGVyYXRvcicpXG4gICwgQlVHR1kgICAgICAgICAgPSAhKFtdLmtleXMgJiYgJ25leHQnIGluIFtdLmtleXMoKSkgLy8gU2FmYXJpIGhhcyBidWdneSBpdGVyYXRvcnMgdy9vIGBuZXh0YFxuICAsIEZGX0lURVJBVE9SICAgID0gJ0BAaXRlcmF0b3InXG4gICwgS0VZUyAgICAgICAgICAgPSAna2V5cydcbiAgLCBWQUxVRVMgICAgICAgICA9ICd2YWx1ZXMnO1xuXG52YXIgcmV0dXJuVGhpcyA9IGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzOyB9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKEJhc2UsIE5BTUUsIENvbnN0cnVjdG9yLCBuZXh0LCBERUZBVUxULCBJU19TRVQsIEZPUkNFRCl7XG4gICRpdGVyQ3JlYXRlKENvbnN0cnVjdG9yLCBOQU1FLCBuZXh0KTtcbiAgdmFyIGdldE1ldGhvZCA9IGZ1bmN0aW9uKGtpbmQpe1xuICAgIGlmKCFCVUdHWSAmJiBraW5kIGluIHByb3RvKXJldHVybiBwcm90b1traW5kXTtcbiAgICBzd2l0Y2goa2luZCl7XG4gICAgICBjYXNlIEtFWVM6IHJldHVybiBmdW5jdGlvbiBrZXlzKCl7IHJldHVybiBuZXcgQ29uc3RydWN0b3IodGhpcywga2luZCk7IH07XG4gICAgICBjYXNlIFZBTFVFUzogcmV0dXJuIGZ1bmN0aW9uIHZhbHVlcygpeyByZXR1cm4gbmV3IENvbnN0cnVjdG9yKHRoaXMsIGtpbmQpOyB9O1xuICAgIH0gcmV0dXJuIGZ1bmN0aW9uIGVudHJpZXMoKXsgcmV0dXJuIG5ldyBDb25zdHJ1Y3Rvcih0aGlzLCBraW5kKTsgfTtcbiAgfTtcbiAgdmFyIFRBRyAgICAgICAgPSBOQU1FICsgJyBJdGVyYXRvcidcbiAgICAsIERFRl9WQUxVRVMgPSBERUZBVUxUID09IFZBTFVFU1xuICAgICwgVkFMVUVTX0JVRyA9IGZhbHNlXG4gICAgLCBwcm90byAgICAgID0gQmFzZS5wcm90b3R5cGVcbiAgICAsICRuYXRpdmUgICAgPSBwcm90b1tJVEVSQVRPUl0gfHwgcHJvdG9bRkZfSVRFUkFUT1JdIHx8IERFRkFVTFQgJiYgcHJvdG9bREVGQVVMVF1cbiAgICAsICRkZWZhdWx0ICAgPSAkbmF0aXZlIHx8IGdldE1ldGhvZChERUZBVUxUKVxuICAgICwgJGVudHJpZXMgICA9IERFRkFVTFQgPyAhREVGX1ZBTFVFUyA/ICRkZWZhdWx0IDogZ2V0TWV0aG9kKCdlbnRyaWVzJykgOiB1bmRlZmluZWRcbiAgICAsICRhbnlOYXRpdmUgPSBOQU1FID09ICdBcnJheScgPyBwcm90by5lbnRyaWVzIHx8ICRuYXRpdmUgOiAkbmF0aXZlXG4gICAgLCBtZXRob2RzLCBrZXksIEl0ZXJhdG9yUHJvdG90eXBlO1xuICAvLyBGaXggbmF0aXZlXG4gIGlmKCRhbnlOYXRpdmUpe1xuICAgIEl0ZXJhdG9yUHJvdG90eXBlID0gZ2V0UHJvdG90eXBlT2YoJGFueU5hdGl2ZS5jYWxsKG5ldyBCYXNlKSk7XG4gICAgaWYoSXRlcmF0b3JQcm90b3R5cGUgIT09IE9iamVjdC5wcm90b3R5cGUpe1xuICAgICAgLy8gU2V0IEBAdG9TdHJpbmdUYWcgdG8gbmF0aXZlIGl0ZXJhdG9yc1xuICAgICAgc2V0VG9TdHJpbmdUYWcoSXRlcmF0b3JQcm90b3R5cGUsIFRBRywgdHJ1ZSk7XG4gICAgICAvLyBmaXggZm9yIHNvbWUgb2xkIGVuZ2luZXNcbiAgICAgIGlmKCFMSUJSQVJZICYmICFoYXMoSXRlcmF0b3JQcm90b3R5cGUsIElURVJBVE9SKSloaWRlKEl0ZXJhdG9yUHJvdG90eXBlLCBJVEVSQVRPUiwgcmV0dXJuVGhpcyk7XG4gICAgfVxuICB9XG4gIC8vIGZpeCBBcnJheSN7dmFsdWVzLCBAQGl0ZXJhdG9yfS5uYW1lIGluIFY4IC8gRkZcbiAgaWYoREVGX1ZBTFVFUyAmJiAkbmF0aXZlICYmICRuYXRpdmUubmFtZSAhPT0gVkFMVUVTKXtcbiAgICBWQUxVRVNfQlVHID0gdHJ1ZTtcbiAgICAkZGVmYXVsdCA9IGZ1bmN0aW9uIHZhbHVlcygpeyByZXR1cm4gJG5hdGl2ZS5jYWxsKHRoaXMpOyB9O1xuICB9XG4gIC8vIERlZmluZSBpdGVyYXRvclxuICBpZigoIUxJQlJBUlkgfHwgRk9SQ0VEKSAmJiAoQlVHR1kgfHwgVkFMVUVTX0JVRyB8fCAhcHJvdG9bSVRFUkFUT1JdKSl7XG4gICAgaGlkZShwcm90bywgSVRFUkFUT1IsICRkZWZhdWx0KTtcbiAgfVxuICAvLyBQbHVnIGZvciBsaWJyYXJ5XG4gIEl0ZXJhdG9yc1tOQU1FXSA9ICRkZWZhdWx0O1xuICBJdGVyYXRvcnNbVEFHXSAgPSByZXR1cm5UaGlzO1xuICBpZihERUZBVUxUKXtcbiAgICBtZXRob2RzID0ge1xuICAgICAgdmFsdWVzOiAgREVGX1ZBTFVFUyA/ICRkZWZhdWx0IDogZ2V0TWV0aG9kKFZBTFVFUyksXG4gICAgICBrZXlzOiAgICBJU19TRVQgICAgID8gJGRlZmF1bHQgOiBnZXRNZXRob2QoS0VZUyksXG4gICAgICBlbnRyaWVzOiAkZW50cmllc1xuICAgIH07XG4gICAgaWYoRk9SQ0VEKWZvcihrZXkgaW4gbWV0aG9kcyl7XG4gICAgICBpZighKGtleSBpbiBwcm90bykpcmVkZWZpbmUocHJvdG8sIGtleSwgbWV0aG9kc1trZXldKTtcbiAgICB9IGVsc2UgJGV4cG9ydCgkZXhwb3J0LlAgKyAkZXhwb3J0LkYgKiAoQlVHR1kgfHwgVkFMVUVTX0JVRyksIE5BTUUsIG1ldGhvZHMpO1xuICB9XG4gIHJldHVybiBtZXRob2RzO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRvbmUsIHZhbHVlKXtcbiAgcmV0dXJuIHt2YWx1ZTogdmFsdWUsIGRvbmU6ICEhZG9uZX07XG59OyIsIm1vZHVsZS5leHBvcnRzID0ge307IiwibW9kdWxlLmV4cG9ydHMgPSB0cnVlOyIsIid1c2Ugc3RyaWN0Jztcbi8vIDE5LjEuMi4xIE9iamVjdC5hc3NpZ24odGFyZ2V0LCBzb3VyY2UsIC4uLilcbnZhciBnZXRLZXlzICA9IHJlcXVpcmUoJy4vX29iamVjdC1rZXlzJylcbiAgLCBnT1BTICAgICA9IHJlcXVpcmUoJy4vX29iamVjdC1nb3BzJylcbiAgLCBwSUUgICAgICA9IHJlcXVpcmUoJy4vX29iamVjdC1waWUnKVxuICAsIHRvT2JqZWN0ID0gcmVxdWlyZSgnLi9fdG8tb2JqZWN0JylcbiAgLCBJT2JqZWN0ICA9IHJlcXVpcmUoJy4vX2lvYmplY3QnKVxuICAsICRhc3NpZ24gID0gT2JqZWN0LmFzc2lnbjtcblxuLy8gc2hvdWxkIHdvcmsgd2l0aCBzeW1ib2xzIGFuZCBzaG91bGQgaGF2ZSBkZXRlcm1pbmlzdGljIHByb3BlcnR5IG9yZGVyIChWOCBidWcpXG5tb2R1bGUuZXhwb3J0cyA9ICEkYXNzaWduIHx8IHJlcXVpcmUoJy4vX2ZhaWxzJykoZnVuY3Rpb24oKXtcbiAgdmFyIEEgPSB7fVxuICAgICwgQiA9IHt9XG4gICAgLCBTID0gU3ltYm9sKClcbiAgICAsIEsgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3QnO1xuICBBW1NdID0gNztcbiAgSy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbihrKXsgQltrXSA9IGs7IH0pO1xuICByZXR1cm4gJGFzc2lnbih7fSwgQSlbU10gIT0gNyB8fCBPYmplY3Qua2V5cygkYXNzaWduKHt9LCBCKSkuam9pbignJykgIT0gSztcbn0pID8gZnVuY3Rpb24gYXNzaWduKHRhcmdldCwgc291cmNlKXsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bnVzZWQtdmFyc1xuICB2YXIgVCAgICAgPSB0b09iamVjdCh0YXJnZXQpXG4gICAgLCBhTGVuICA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGluZGV4ID0gMVxuICAgICwgZ2V0U3ltYm9scyA9IGdPUFMuZlxuICAgICwgaXNFbnVtICAgICA9IHBJRS5mO1xuICB3aGlsZShhTGVuID4gaW5kZXgpe1xuICAgIHZhciBTICAgICAgPSBJT2JqZWN0KGFyZ3VtZW50c1tpbmRleCsrXSlcbiAgICAgICwga2V5cyAgID0gZ2V0U3ltYm9scyA/IGdldEtleXMoUykuY29uY2F0KGdldFN5bWJvbHMoUykpIDogZ2V0S2V5cyhTKVxuICAgICAgLCBsZW5ndGggPSBrZXlzLmxlbmd0aFxuICAgICAgLCBqICAgICAgPSAwXG4gICAgICAsIGtleTtcbiAgICB3aGlsZShsZW5ndGggPiBqKWlmKGlzRW51bS5jYWxsKFMsIGtleSA9IGtleXNbaisrXSkpVFtrZXldID0gU1trZXldO1xuICB9IHJldHVybiBUO1xufSA6ICRhc3NpZ247IiwiLy8gMTkuMS4yLjIgLyAxNS4yLjMuNSBPYmplY3QuY3JlYXRlKE8gWywgUHJvcGVydGllc10pXG52YXIgYW5PYmplY3QgICAgPSByZXF1aXJlKCcuL19hbi1vYmplY3QnKVxuICAsIGRQcyAgICAgICAgID0gcmVxdWlyZSgnLi9fb2JqZWN0LWRwcycpXG4gICwgZW51bUJ1Z0tleXMgPSByZXF1aXJlKCcuL19lbnVtLWJ1Zy1rZXlzJylcbiAgLCBJRV9QUk9UTyAgICA9IHJlcXVpcmUoJy4vX3NoYXJlZC1rZXknKSgnSUVfUFJPVE8nKVxuICAsIEVtcHR5ICAgICAgID0gZnVuY3Rpb24oKXsgLyogZW1wdHkgKi8gfVxuICAsIFBST1RPVFlQRSAgID0gJ3Byb3RvdHlwZSc7XG5cbi8vIENyZWF0ZSBvYmplY3Qgd2l0aCBmYWtlIGBudWxsYCBwcm90b3R5cGU6IHVzZSBpZnJhbWUgT2JqZWN0IHdpdGggY2xlYXJlZCBwcm90b3R5cGVcbnZhciBjcmVhdGVEaWN0ID0gZnVuY3Rpb24oKXtcbiAgLy8gVGhyYXNoLCB3YXN0ZSBhbmQgc29kb215OiBJRSBHQyBidWdcbiAgdmFyIGlmcmFtZSA9IHJlcXVpcmUoJy4vX2RvbS1jcmVhdGUnKSgnaWZyYW1lJylcbiAgICAsIGkgICAgICA9IGVudW1CdWdLZXlzLmxlbmd0aFxuICAgICwgbHQgICAgID0gJzwnXG4gICAgLCBndCAgICAgPSAnPidcbiAgICAsIGlmcmFtZURvY3VtZW50O1xuICBpZnJhbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgcmVxdWlyZSgnLi9faHRtbCcpLmFwcGVuZENoaWxkKGlmcmFtZSk7XG4gIGlmcmFtZS5zcmMgPSAnamF2YXNjcmlwdDonOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNjcmlwdC11cmxcbiAgLy8gY3JlYXRlRGljdCA9IGlmcmFtZS5jb250ZW50V2luZG93Lk9iamVjdDtcbiAgLy8gaHRtbC5yZW1vdmVDaGlsZChpZnJhbWUpO1xuICBpZnJhbWVEb2N1bWVudCA9IGlmcmFtZS5jb250ZW50V2luZG93LmRvY3VtZW50O1xuICBpZnJhbWVEb2N1bWVudC5vcGVuKCk7XG4gIGlmcmFtZURvY3VtZW50LndyaXRlKGx0ICsgJ3NjcmlwdCcgKyBndCArICdkb2N1bWVudC5GPU9iamVjdCcgKyBsdCArICcvc2NyaXB0JyArIGd0KTtcbiAgaWZyYW1lRG9jdW1lbnQuY2xvc2UoKTtcbiAgY3JlYXRlRGljdCA9IGlmcmFtZURvY3VtZW50LkY7XG4gIHdoaWxlKGktLSlkZWxldGUgY3JlYXRlRGljdFtQUk9UT1RZUEVdW2VudW1CdWdLZXlzW2ldXTtcbiAgcmV0dXJuIGNyZWF0ZURpY3QoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiBjcmVhdGUoTywgUHJvcGVydGllcyl7XG4gIHZhciByZXN1bHQ7XG4gIGlmKE8gIT09IG51bGwpe1xuICAgIEVtcHR5W1BST1RPVFlQRV0gPSBhbk9iamVjdChPKTtcbiAgICByZXN1bHQgPSBuZXcgRW1wdHk7XG4gICAgRW1wdHlbUFJPVE9UWVBFXSA9IG51bGw7XG4gICAgLy8gYWRkIFwiX19wcm90b19fXCIgZm9yIE9iamVjdC5nZXRQcm90b3R5cGVPZiBwb2x5ZmlsbFxuICAgIHJlc3VsdFtJRV9QUk9UT10gPSBPO1xuICB9IGVsc2UgcmVzdWx0ID0gY3JlYXRlRGljdCgpO1xuICByZXR1cm4gUHJvcGVydGllcyA9PT0gdW5kZWZpbmVkID8gcmVzdWx0IDogZFBzKHJlc3VsdCwgUHJvcGVydGllcyk7XG59O1xuIiwidmFyIGFuT2JqZWN0ICAgICAgID0gcmVxdWlyZSgnLi9fYW4tb2JqZWN0JylcbiAgLCBJRThfRE9NX0RFRklORSA9IHJlcXVpcmUoJy4vX2llOC1kb20tZGVmaW5lJylcbiAgLCB0b1ByaW1pdGl2ZSAgICA9IHJlcXVpcmUoJy4vX3RvLXByaW1pdGl2ZScpXG4gICwgZFAgICAgICAgICAgICAgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG5cbmV4cG9ydHMuZiA9IHJlcXVpcmUoJy4vX2Rlc2NyaXB0b3JzJykgPyBPYmplY3QuZGVmaW5lUHJvcGVydHkgOiBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShPLCBQLCBBdHRyaWJ1dGVzKXtcbiAgYW5PYmplY3QoTyk7XG4gIFAgPSB0b1ByaW1pdGl2ZShQLCB0cnVlKTtcbiAgYW5PYmplY3QoQXR0cmlidXRlcyk7XG4gIGlmKElFOF9ET01fREVGSU5FKXRyeSB7XG4gICAgcmV0dXJuIGRQKE8sIFAsIEF0dHJpYnV0ZXMpO1xuICB9IGNhdGNoKGUpeyAvKiBlbXB0eSAqLyB9XG4gIGlmKCdnZXQnIGluIEF0dHJpYnV0ZXMgfHwgJ3NldCcgaW4gQXR0cmlidXRlcyl0aHJvdyBUeXBlRXJyb3IoJ0FjY2Vzc29ycyBub3Qgc3VwcG9ydGVkIScpO1xuICBpZigndmFsdWUnIGluIEF0dHJpYnV0ZXMpT1tQXSA9IEF0dHJpYnV0ZXMudmFsdWU7XG4gIHJldHVybiBPO1xufTsiLCJ2YXIgZFAgICAgICAgPSByZXF1aXJlKCcuL19vYmplY3QtZHAnKVxuICAsIGFuT2JqZWN0ID0gcmVxdWlyZSgnLi9fYW4tb2JqZWN0JylcbiAgLCBnZXRLZXlzICA9IHJlcXVpcmUoJy4vX29iamVjdC1rZXlzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9fZGVzY3JpcHRvcnMnKSA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzIDogZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyhPLCBQcm9wZXJ0aWVzKXtcbiAgYW5PYmplY3QoTyk7XG4gIHZhciBrZXlzICAgPSBnZXRLZXlzKFByb3BlcnRpZXMpXG4gICAgLCBsZW5ndGggPSBrZXlzLmxlbmd0aFxuICAgICwgaSA9IDBcbiAgICAsIFA7XG4gIHdoaWxlKGxlbmd0aCA+IGkpZFAuZihPLCBQID0ga2V5c1tpKytdLCBQcm9wZXJ0aWVzW1BdKTtcbiAgcmV0dXJuIE87XG59OyIsImV4cG9ydHMuZiA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHM7IiwiLy8gMTkuMS4yLjkgLyAxNS4yLjMuMiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoTylcbnZhciBoYXMgICAgICAgICA9IHJlcXVpcmUoJy4vX2hhcycpXG4gICwgdG9PYmplY3QgICAgPSByZXF1aXJlKCcuL190by1vYmplY3QnKVxuICAsIElFX1BST1RPICAgID0gcmVxdWlyZSgnLi9fc2hhcmVkLWtleScpKCdJRV9QUk9UTycpXG4gICwgT2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbihPKXtcbiAgTyA9IHRvT2JqZWN0KE8pO1xuICBpZihoYXMoTywgSUVfUFJPVE8pKXJldHVybiBPW0lFX1BST1RPXTtcbiAgaWYodHlwZW9mIE8uY29uc3RydWN0b3IgPT0gJ2Z1bmN0aW9uJyAmJiBPIGluc3RhbmNlb2YgTy5jb25zdHJ1Y3Rvcil7XG4gICAgcmV0dXJuIE8uY29uc3RydWN0b3IucHJvdG90eXBlO1xuICB9IHJldHVybiBPIGluc3RhbmNlb2YgT2JqZWN0ID8gT2JqZWN0UHJvdG8gOiBudWxsO1xufTsiLCJ2YXIgaGFzICAgICAgICAgID0gcmVxdWlyZSgnLi9faGFzJylcbiAgLCB0b0lPYmplY3QgICAgPSByZXF1aXJlKCcuL190by1pb2JqZWN0JylcbiAgLCBhcnJheUluZGV4T2YgPSByZXF1aXJlKCcuL19hcnJheS1pbmNsdWRlcycpKGZhbHNlKVxuICAsIElFX1BST1RPICAgICA9IHJlcXVpcmUoJy4vX3NoYXJlZC1rZXknKSgnSUVfUFJPVE8nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmplY3QsIG5hbWVzKXtcbiAgdmFyIE8gICAgICA9IHRvSU9iamVjdChvYmplY3QpXG4gICAgLCBpICAgICAgPSAwXG4gICAgLCByZXN1bHQgPSBbXVxuICAgICwga2V5O1xuICBmb3Ioa2V5IGluIE8paWYoa2V5ICE9IElFX1BST1RPKWhhcyhPLCBrZXkpICYmIHJlc3VsdC5wdXNoKGtleSk7XG4gIC8vIERvbid0IGVudW0gYnVnICYgaGlkZGVuIGtleXNcbiAgd2hpbGUobmFtZXMubGVuZ3RoID4gaSlpZihoYXMoTywga2V5ID0gbmFtZXNbaSsrXSkpe1xuICAgIH5hcnJheUluZGV4T2YocmVzdWx0LCBrZXkpIHx8IHJlc3VsdC5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07IiwiLy8gMTkuMS4yLjE0IC8gMTUuMi4zLjE0IE9iamVjdC5rZXlzKE8pXG52YXIgJGtleXMgICAgICAgPSByZXF1aXJlKCcuL19vYmplY3Qta2V5cy1pbnRlcm5hbCcpXG4gICwgZW51bUJ1Z0tleXMgPSByZXF1aXJlKCcuL19lbnVtLWJ1Zy1rZXlzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24ga2V5cyhPKXtcbiAgcmV0dXJuICRrZXlzKE8sIGVudW1CdWdLZXlzKTtcbn07IiwiZXhwb3J0cy5mID0ge30ucHJvcGVydHlJc0VudW1lcmFibGU7IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihiaXRtYXAsIHZhbHVlKXtcbiAgcmV0dXJuIHtcbiAgICBlbnVtZXJhYmxlICA6ICEoYml0bWFwICYgMSksXG4gICAgY29uZmlndXJhYmxlOiAhKGJpdG1hcCAmIDIpLFxuICAgIHdyaXRhYmxlICAgIDogIShiaXRtYXAgJiA0KSxcbiAgICB2YWx1ZSAgICAgICA6IHZhbHVlXG4gIH07XG59OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9faGlkZScpOyIsInZhciBkZWYgPSByZXF1aXJlKCcuL19vYmplY3QtZHAnKS5mXG4gICwgaGFzID0gcmVxdWlyZSgnLi9faGFzJylcbiAgLCBUQUcgPSByZXF1aXJlKCcuL193a3MnKSgndG9TdHJpbmdUYWcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCwgdGFnLCBzdGF0KXtcbiAgaWYoaXQgJiYgIWhhcyhpdCA9IHN0YXQgPyBpdCA6IGl0LnByb3RvdHlwZSwgVEFHKSlkZWYoaXQsIFRBRywge2NvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHRhZ30pO1xufTsiLCJ2YXIgc2hhcmVkID0gcmVxdWlyZSgnLi9fc2hhcmVkJykoJ2tleXMnKVxuICAsIHVpZCAgICA9IHJlcXVpcmUoJy4vX3VpZCcpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihrZXkpe1xuICByZXR1cm4gc2hhcmVkW2tleV0gfHwgKHNoYXJlZFtrZXldID0gdWlkKGtleSkpO1xufTsiLCJ2YXIgZ2xvYmFsID0gcmVxdWlyZSgnLi9fZ2xvYmFsJylcbiAgLCBTSEFSRUQgPSAnX19jb3JlLWpzX3NoYXJlZF9fJ1xuICAsIHN0b3JlICA9IGdsb2JhbFtTSEFSRURdIHx8IChnbG9iYWxbU0hBUkVEXSA9IHt9KTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oa2V5KXtcbiAgcmV0dXJuIHN0b3JlW2tleV0gfHwgKHN0b3JlW2tleV0gPSB7fSk7XG59OyIsInZhciB0b0ludGVnZXIgPSByZXF1aXJlKCcuL190by1pbnRlZ2VyJylcbiAgLCBkZWZpbmVkICAgPSByZXF1aXJlKCcuL19kZWZpbmVkJyk7XG4vLyB0cnVlICAtPiBTdHJpbmcjYXRcbi8vIGZhbHNlIC0+IFN0cmluZyNjb2RlUG9pbnRBdFxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihUT19TVFJJTkcpe1xuICByZXR1cm4gZnVuY3Rpb24odGhhdCwgcG9zKXtcbiAgICB2YXIgcyA9IFN0cmluZyhkZWZpbmVkKHRoYXQpKVxuICAgICAgLCBpID0gdG9JbnRlZ2VyKHBvcylcbiAgICAgICwgbCA9IHMubGVuZ3RoXG4gICAgICAsIGEsIGI7XG4gICAgaWYoaSA8IDAgfHwgaSA+PSBsKXJldHVybiBUT19TVFJJTkcgPyAnJyA6IHVuZGVmaW5lZDtcbiAgICBhID0gcy5jaGFyQ29kZUF0KGkpO1xuICAgIHJldHVybiBhIDwgMHhkODAwIHx8IGEgPiAweGRiZmYgfHwgaSArIDEgPT09IGwgfHwgKGIgPSBzLmNoYXJDb2RlQXQoaSArIDEpKSA8IDB4ZGMwMCB8fCBiID4gMHhkZmZmXG4gICAgICA/IFRPX1NUUklORyA/IHMuY2hhckF0KGkpIDogYVxuICAgICAgOiBUT19TVFJJTkcgPyBzLnNsaWNlKGksIGkgKyAyKSA6IChhIC0gMHhkODAwIDw8IDEwKSArIChiIC0gMHhkYzAwKSArIDB4MTAwMDA7XG4gIH07XG59OyIsInZhciB0b0ludGVnZXIgPSByZXF1aXJlKCcuL190by1pbnRlZ2VyJylcbiAgLCBtYXggICAgICAgPSBNYXRoLm1heFxuICAsIG1pbiAgICAgICA9IE1hdGgubWluO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbmRleCwgbGVuZ3RoKXtcbiAgaW5kZXggPSB0b0ludGVnZXIoaW5kZXgpO1xuICByZXR1cm4gaW5kZXggPCAwID8gbWF4KGluZGV4ICsgbGVuZ3RoLCAwKSA6IG1pbihpbmRleCwgbGVuZ3RoKTtcbn07IiwiLy8gNy4xLjQgVG9JbnRlZ2VyXG52YXIgY2VpbCAgPSBNYXRoLmNlaWxcbiAgLCBmbG9vciA9IE1hdGguZmxvb3I7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGl0KXtcbiAgcmV0dXJuIGlzTmFOKGl0ID0gK2l0KSA/IDAgOiAoaXQgPiAwID8gZmxvb3IgOiBjZWlsKShpdCk7XG59OyIsIi8vIHRvIGluZGV4ZWQgb2JqZWN0LCB0b09iamVjdCB3aXRoIGZhbGxiYWNrIGZvciBub24tYXJyYXktbGlrZSBFUzMgc3RyaW5nc1xudmFyIElPYmplY3QgPSByZXF1aXJlKCcuL19pb2JqZWN0JylcbiAgLCBkZWZpbmVkID0gcmVxdWlyZSgnLi9fZGVmaW5lZCcpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpdCl7XG4gIHJldHVybiBJT2JqZWN0KGRlZmluZWQoaXQpKTtcbn07IiwiLy8gNy4xLjE1IFRvTGVuZ3RoXG52YXIgdG9JbnRlZ2VyID0gcmVxdWlyZSgnLi9fdG8taW50ZWdlcicpXG4gICwgbWluICAgICAgID0gTWF0aC5taW47XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGl0KXtcbiAgcmV0dXJuIGl0ID4gMCA/IG1pbih0b0ludGVnZXIoaXQpLCAweDFmZmZmZmZmZmZmZmZmKSA6IDA7IC8vIHBvdygyLCA1MykgLSAxID09IDkwMDcxOTkyNTQ3NDA5OTFcbn07IiwiLy8gNy4xLjEzIFRvT2JqZWN0KGFyZ3VtZW50KVxudmFyIGRlZmluZWQgPSByZXF1aXJlKCcuL19kZWZpbmVkJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGl0KXtcbiAgcmV0dXJuIE9iamVjdChkZWZpbmVkKGl0KSk7XG59OyIsIi8vIDcuMS4xIFRvUHJpbWl0aXZlKGlucHV0IFssIFByZWZlcnJlZFR5cGVdKVxudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9faXMtb2JqZWN0Jyk7XG4vLyBpbnN0ZWFkIG9mIHRoZSBFUzYgc3BlYyB2ZXJzaW9uLCB3ZSBkaWRuJ3QgaW1wbGVtZW50IEBAdG9QcmltaXRpdmUgY2FzZVxuLy8gYW5kIHRoZSBzZWNvbmQgYXJndW1lbnQgLSBmbGFnIC0gcHJlZmVycmVkIHR5cGUgaXMgYSBzdHJpbmdcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXQsIFMpe1xuICBpZighaXNPYmplY3QoaXQpKXJldHVybiBpdDtcbiAgdmFyIGZuLCB2YWw7XG4gIGlmKFMgJiYgdHlwZW9mIChmbiA9IGl0LnRvU3RyaW5nKSA9PSAnZnVuY3Rpb24nICYmICFpc09iamVjdCh2YWwgPSBmbi5jYWxsKGl0KSkpcmV0dXJuIHZhbDtcbiAgaWYodHlwZW9mIChmbiA9IGl0LnZhbHVlT2YpID09ICdmdW5jdGlvbicgJiYgIWlzT2JqZWN0KHZhbCA9IGZuLmNhbGwoaXQpKSlyZXR1cm4gdmFsO1xuICBpZighUyAmJiB0eXBlb2YgKGZuID0gaXQudG9TdHJpbmcpID09ICdmdW5jdGlvbicgJiYgIWlzT2JqZWN0KHZhbCA9IGZuLmNhbGwoaXQpKSlyZXR1cm4gdmFsO1xuICB0aHJvdyBUeXBlRXJyb3IoXCJDYW4ndCBjb252ZXJ0IG9iamVjdCB0byBwcmltaXRpdmUgdmFsdWVcIik7XG59OyIsInZhciBpZCA9IDBcbiAgLCBweCA9IE1hdGgucmFuZG9tKCk7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGtleSl7XG4gIHJldHVybiAnU3ltYm9sKCcuY29uY2F0KGtleSA9PT0gdW5kZWZpbmVkID8gJycgOiBrZXksICcpXycsICgrK2lkICsgcHgpLnRvU3RyaW5nKDM2KSk7XG59OyIsInZhciBzdG9yZSAgICAgID0gcmVxdWlyZSgnLi9fc2hhcmVkJykoJ3drcycpXG4gICwgdWlkICAgICAgICA9IHJlcXVpcmUoJy4vX3VpZCcpXG4gICwgU3ltYm9sICAgICA9IHJlcXVpcmUoJy4vX2dsb2JhbCcpLlN5bWJvbFxuICAsIFVTRV9TWU1CT0wgPSB0eXBlb2YgU3ltYm9sID09ICdmdW5jdGlvbic7XG5cbnZhciAkZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obmFtZSl7XG4gIHJldHVybiBzdG9yZVtuYW1lXSB8fCAoc3RvcmVbbmFtZV0gPVxuICAgIFVTRV9TWU1CT0wgJiYgU3ltYm9sW25hbWVdIHx8IChVU0VfU1lNQk9MID8gU3ltYm9sIDogdWlkKSgnU3ltYm9sLicgKyBuYW1lKSk7XG59O1xuXG4kZXhwb3J0cy5zdG9yZSA9IHN0b3JlOyIsInZhciBjbGFzc29mICAgPSByZXF1aXJlKCcuL19jbGFzc29mJylcbiAgLCBJVEVSQVRPUiAgPSByZXF1aXJlKCcuL193a3MnKSgnaXRlcmF0b3InKVxuICAsIEl0ZXJhdG9ycyA9IHJlcXVpcmUoJy4vX2l0ZXJhdG9ycycpO1xubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL19jb3JlJykuZ2V0SXRlcmF0b3JNZXRob2QgPSBmdW5jdGlvbihpdCl7XG4gIGlmKGl0ICE9IHVuZGVmaW5lZClyZXR1cm4gaXRbSVRFUkFUT1JdXG4gICAgfHwgaXRbJ0BAaXRlcmF0b3InXVxuICAgIHx8IEl0ZXJhdG9yc1tjbGFzc29mKGl0KV07XG59OyIsInZhciBhbk9iamVjdCA9IHJlcXVpcmUoJy4vX2FuLW9iamVjdCcpXG4gICwgZ2V0ICAgICAgPSByZXF1aXJlKCcuL2NvcmUuZ2V0LWl0ZXJhdG9yLW1ldGhvZCcpO1xubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL19jb3JlJykuZ2V0SXRlcmF0b3IgPSBmdW5jdGlvbihpdCl7XG4gIHZhciBpdGVyRm4gPSBnZXQoaXQpO1xuICBpZih0eXBlb2YgaXRlckZuICE9ICdmdW5jdGlvbicpdGhyb3cgVHlwZUVycm9yKGl0ICsgJyBpcyBub3QgaXRlcmFibGUhJyk7XG4gIHJldHVybiBhbk9iamVjdChpdGVyRm4uY2FsbChpdCkpO1xufTsiLCIndXNlIHN0cmljdCc7XG52YXIgYWRkVG9VbnNjb3BhYmxlcyA9IHJlcXVpcmUoJy4vX2FkZC10by11bnNjb3BhYmxlcycpXG4gICwgc3RlcCAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vX2l0ZXItc3RlcCcpXG4gICwgSXRlcmF0b3JzICAgICAgICA9IHJlcXVpcmUoJy4vX2l0ZXJhdG9ycycpXG4gICwgdG9JT2JqZWN0ICAgICAgICA9IHJlcXVpcmUoJy4vX3RvLWlvYmplY3QnKTtcblxuLy8gMjIuMS4zLjQgQXJyYXkucHJvdG90eXBlLmVudHJpZXMoKVxuLy8gMjIuMS4zLjEzIEFycmF5LnByb3RvdHlwZS5rZXlzKClcbi8vIDIyLjEuMy4yOSBBcnJheS5wcm90b3R5cGUudmFsdWVzKClcbi8vIDIyLjEuMy4zMCBBcnJheS5wcm90b3R5cGVbQEBpdGVyYXRvcl0oKVxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL19pdGVyLWRlZmluZScpKEFycmF5LCAnQXJyYXknLCBmdW5jdGlvbihpdGVyYXRlZCwga2luZCl7XG4gIHRoaXMuX3QgPSB0b0lPYmplY3QoaXRlcmF0ZWQpOyAvLyB0YXJnZXRcbiAgdGhpcy5faSA9IDA7ICAgICAgICAgICAgICAgICAgIC8vIG5leHQgaW5kZXhcbiAgdGhpcy5fayA9IGtpbmQ7ICAgICAgICAgICAgICAgIC8vIGtpbmRcbi8vIDIyLjEuNS4yLjEgJUFycmF5SXRlcmF0b3JQcm90b3R5cGUlLm5leHQoKVxufSwgZnVuY3Rpb24oKXtcbiAgdmFyIE8gICAgID0gdGhpcy5fdFxuICAgICwga2luZCAgPSB0aGlzLl9rXG4gICAgLCBpbmRleCA9IHRoaXMuX2krKztcbiAgaWYoIU8gfHwgaW5kZXggPj0gTy5sZW5ndGgpe1xuICAgIHRoaXMuX3QgPSB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHN0ZXAoMSk7XG4gIH1cbiAgaWYoa2luZCA9PSAna2V5cycgIClyZXR1cm4gc3RlcCgwLCBpbmRleCk7XG4gIGlmKGtpbmQgPT0gJ3ZhbHVlcycpcmV0dXJuIHN0ZXAoMCwgT1tpbmRleF0pO1xuICByZXR1cm4gc3RlcCgwLCBbaW5kZXgsIE9baW5kZXhdXSk7XG59LCAndmFsdWVzJyk7XG5cbi8vIGFyZ3VtZW50c0xpc3RbQEBpdGVyYXRvcl0gaXMgJUFycmF5UHJvdG9fdmFsdWVzJSAoOS40LjQuNiwgOS40LjQuNylcbkl0ZXJhdG9ycy5Bcmd1bWVudHMgPSBJdGVyYXRvcnMuQXJyYXk7XG5cbmFkZFRvVW5zY29wYWJsZXMoJ2tleXMnKTtcbmFkZFRvVW5zY29wYWJsZXMoJ3ZhbHVlcycpO1xuYWRkVG9VbnNjb3BhYmxlcygnZW50cmllcycpOyIsIi8vIDE5LjEuMy4xIE9iamVjdC5hc3NpZ24odGFyZ2V0LCBzb3VyY2UpXG52YXIgJGV4cG9ydCA9IHJlcXVpcmUoJy4vX2V4cG9ydCcpO1xuXG4kZXhwb3J0KCRleHBvcnQuUyArICRleHBvcnQuRiwgJ09iamVjdCcsIHthc3NpZ246IHJlcXVpcmUoJy4vX29iamVjdC1hc3NpZ24nKX0pOyIsInZhciAkZXhwb3J0ID0gcmVxdWlyZSgnLi9fZXhwb3J0Jyk7XG4vLyAxOS4xLjIuNCAvIDE1LjIuMy42IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShPLCBQLCBBdHRyaWJ1dGVzKVxuJGV4cG9ydCgkZXhwb3J0LlMgKyAkZXhwb3J0LkYgKiAhcmVxdWlyZSgnLi9fZGVzY3JpcHRvcnMnKSwgJ09iamVjdCcsIHtkZWZpbmVQcm9wZXJ0eTogcmVxdWlyZSgnLi9fb2JqZWN0LWRwJykuZn0pOyIsIid1c2Ugc3RyaWN0JztcbnZhciAkYXQgID0gcmVxdWlyZSgnLi9fc3RyaW5nLWF0JykodHJ1ZSk7XG5cbi8vIDIxLjEuMy4yNyBTdHJpbmcucHJvdG90eXBlW0BAaXRlcmF0b3JdKClcbnJlcXVpcmUoJy4vX2l0ZXItZGVmaW5lJykoU3RyaW5nLCAnU3RyaW5nJywgZnVuY3Rpb24oaXRlcmF0ZWQpe1xuICB0aGlzLl90ID0gU3RyaW5nKGl0ZXJhdGVkKTsgLy8gdGFyZ2V0XG4gIHRoaXMuX2kgPSAwOyAgICAgICAgICAgICAgICAvLyBuZXh0IGluZGV4XG4vLyAyMS4xLjUuMi4xICVTdHJpbmdJdGVyYXRvclByb3RvdHlwZSUubmV4dCgpXG59LCBmdW5jdGlvbigpe1xuICB2YXIgTyAgICAgPSB0aGlzLl90XG4gICAgLCBpbmRleCA9IHRoaXMuX2lcbiAgICAsIHBvaW50O1xuICBpZihpbmRleCA+PSBPLmxlbmd0aClyZXR1cm4ge3ZhbHVlOiB1bmRlZmluZWQsIGRvbmU6IHRydWV9O1xuICBwb2ludCA9ICRhdChPLCBpbmRleCk7XG4gIHRoaXMuX2kgKz0gcG9pbnQubGVuZ3RoO1xuICByZXR1cm4ge3ZhbHVlOiBwb2ludCwgZG9uZTogZmFsc2V9O1xufSk7IiwicmVxdWlyZSgnLi9lczYuYXJyYXkuaXRlcmF0b3InKTtcbnZhciBnbG9iYWwgICAgICAgID0gcmVxdWlyZSgnLi9fZ2xvYmFsJylcbiAgLCBoaWRlICAgICAgICAgID0gcmVxdWlyZSgnLi9faGlkZScpXG4gICwgSXRlcmF0b3JzICAgICA9IHJlcXVpcmUoJy4vX2l0ZXJhdG9ycycpXG4gICwgVE9fU1RSSU5HX1RBRyA9IHJlcXVpcmUoJy4vX3drcycpKCd0b1N0cmluZ1RhZycpO1xuXG5mb3IodmFyIGNvbGxlY3Rpb25zID0gWydOb2RlTGlzdCcsICdET01Ub2tlbkxpc3QnLCAnTWVkaWFMaXN0JywgJ1N0eWxlU2hlZXRMaXN0JywgJ0NTU1J1bGVMaXN0J10sIGkgPSAwOyBpIDwgNTsgaSsrKXtcbiAgdmFyIE5BTUUgICAgICAgPSBjb2xsZWN0aW9uc1tpXVxuICAgICwgQ29sbGVjdGlvbiA9IGdsb2JhbFtOQU1FXVxuICAgICwgcHJvdG8gICAgICA9IENvbGxlY3Rpb24gJiYgQ29sbGVjdGlvbi5wcm90b3R5cGU7XG4gIGlmKHByb3RvICYmICFwcm90b1tUT19TVFJJTkdfVEFHXSloaWRlKHByb3RvLCBUT19TVFJJTkdfVEFHLCBOQU1FKTtcbiAgSXRlcmF0b3JzW05BTUVdID0gSXRlcmF0b3JzLkFycmF5O1xufSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=

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

var _zeroCrossingRate = require('./zero-crossing-rate');

var _zeroCrossingRate2 = _interopRequireDefault(_zeroCrossingRate);

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
      descriptors: ['accRaw', 'gyrRaw', 'accIntensity', 'gyrIntensity', 'freefall', 'kick', 'shake', 'spin', 'still', 'gyrZcr', 'accZcr'],

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
      stillSlideFactor: 5,

      gyrZcrNoiseThresh: 0.001,
      gyrZcrFrameSize: 100,
      gyrZcrHopSize: 10,

      accZcrNoiseThresh: 0.001,
      accZcrFrameSize: 100,
      accZcrHopSize: 10
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
      still: this._updateStill.bind(this),
      gyrZcr: this._updateGyrZcr.bind(this),
      accZcr: this._updateAccZcr.bind(this)
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

    var hasGyrZcr = this._params.descriptors.indexOf('gyrZcr') > -1;
    var hasAccZcr = this._params.descriptors.indexOf('accZcr') > -1;

    if (hasGyrZcr) {
      this._gyrZcr = new _zeroCrossingRate2.default({
        noiseThreshold: this._params.gyrZcrNoiseThresh,
        frameSize: this._params.gyrZcrFrameSize,
        hopSize: this._params.gyrZcrHopSize
      });
    }

    if (hasAccZcr) {
      this._accZcr = new _zeroCrossingRate2.default({
        noiseThreshold: this._params.accZcrNoiseThresh,
        frameSize: this._params.accZcrFrameSize,
        hopSize: this._params.accZcrHopSize
      });
    }
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

    //===================================================================== gyrZcr
    /** @private */

  }, {
    key: '_updateGyrZcr',
    value: function _updateGyrZcr(res) {
      var zcrRes = this._gyrZcr.process(this._gyrNorm);
      res.gyrZcr = {
        amplitude: zcrRes.amplitude,
        frequency: zcrRes.frequency,
        periodicity: zcrRes.periodicity
      };
    }

    //===================================================================== accZcr
    /** @private */

  }, {
    key: '_updateAccZcr',
    value: function _updateAccZcr(res) {
      var accRes = this._accZcr.process(this._accNorm);
      res.accZcr = {
        amplitude: accZcr.amplitude,
        frequency: accZcr.frequency,
        periodicity: accZcr.periodicity
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vdGlvbi1mZWF0dXJlcy5qcyJdLCJuYW1lcyI6WyJnZXRUaW1lRnVuY3Rpb24iLCJ3aW5kb3ciLCJ0IiwicHJvY2VzcyIsImhydGltZSIsInBlcmZvcm1hbmNlIiwiRGF0ZSIsIm5vdyIsImdldFRpbWUiLCJwZXJmTm93IiwiTW90aW9uRmVhdHVyZXMiLCJvcHRpb25zIiwiZGVmYXVsdHMiLCJkZXNjcmlwdG9ycyIsImd5cklzSW5EZWdyZWVzIiwiYWNjSW50ZW5zaXR5UGFyYW0xIiwiYWNjSW50ZW5zaXR5UGFyYW0yIiwiZ3lySW50ZW5zaXR5UGFyYW0xIiwiZ3lySW50ZW5zaXR5UGFyYW0yIiwiZnJlZWZhbGxBY2NUaHJlc2giLCJmcmVlZmFsbEd5clRocmVzaCIsImZyZWVmYWxsR3lyRGVsdGFUaHJlc2giLCJraWNrVGhyZXNoIiwia2lja1NwZWVkR2F0ZSIsImtpY2tNZWRpYW5GaWx0ZXJzaXplIiwia2lja0NhbGxiYWNrIiwic2hha2VUaHJlc2giLCJzaGFrZVdpbmRvd1NpemUiLCJzaGFrZVNsaWRlRmFjdG9yIiwic3BpblRocmVzaCIsInN0aWxsVGhyZXNoIiwic3RpbGxTbGlkZUZhY3RvciIsImd5clpjck5vaXNlVGhyZXNoIiwiZ3lyWmNyRnJhbWVTaXplIiwiZ3lyWmNySG9wU2l6ZSIsImFjY1pjck5vaXNlVGhyZXNoIiwiYWNjWmNyRnJhbWVTaXplIiwiYWNjWmNySG9wU2l6ZSIsIl9wYXJhbXMiLCJfbWV0aG9kcyIsImFjY1JhdyIsIl91cGRhdGVBY2NSYXciLCJiaW5kIiwiZ3lyUmF3IiwiX3VwZGF0ZUd5clJhdyIsImFjY0ludGVuc2l0eSIsIl91cGRhdGVBY2NJbnRlbnNpdHkiLCJneXJJbnRlbnNpdHkiLCJfdXBkYXRlR3lySW50ZW5zaXR5IiwiZnJlZWZhbGwiLCJfdXBkYXRlRnJlZWZhbGwiLCJraWNrIiwiX3VwZGF0ZUtpY2siLCJzaGFrZSIsIl91cGRhdGVTaGFrZSIsInNwaW4iLCJfdXBkYXRlU3BpbiIsInN0aWxsIiwiX3VwZGF0ZVN0aWxsIiwiZ3lyWmNyIiwiX3VwZGF0ZUd5clpjciIsImFjY1pjciIsIl91cGRhdGVBY2NaY3IiLCJfa2lja0NhbGxiYWNrIiwiYWNjIiwiZ3lyIiwiX2FjY0xhc3QiLCJfYWNjSW50ZW5zaXR5TGFzdCIsIl9hY2NJbnRlbnNpdHkiLCJfYWNjSW50ZW5zaXR5Tm9ybSIsIl9hY2NOb3JtIiwiX2d5ckRlbHRhIiwiX2d5ck5vcm0iLCJfZ3lyRGVsdGFOb3JtIiwiX2ZhbGxCZWdpbiIsIl9mYWxsRW5kIiwiX2ZhbGxEdXJhdGlvbiIsIl9pc0ZhbGxpbmciLCJfZ3lyTGFzdCIsIl9neXJJbnRlbnNpdHlMYXN0IiwiX2d5ckludGVuc2l0eSIsIl9neXJJbnRlbnNpdHlOb3JtIiwiX2tpY2tJbnRlbnNpdHkiLCJfbGFzdEtpY2siLCJfaXNLaWNraW5nIiwiX21lZGlhblZhbHVlcyIsIl9tZWRpYW5MaW5raW5nIiwiX21lZGlhbkZpZm8iLCJfaTEiLCJfaTIiLCJfaTMiLCJfYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiIsIl9hY2NEZWx0YSIsIl9zaGFrZVdpbmRvdyIsIkFycmF5IiwiaSIsImoiLCJfc2hha2VOYiIsIl9zaGFraW5nUmF3IiwiX3NoYWtlU2xpZGVQcmV2IiwiX3NoYWtpbmciLCJfc3BpbkJlZ2luIiwiX3NwaW5FbmQiLCJfc3BpbkR1cmF0aW9uIiwiX2lzU3Bpbm5pbmciLCJfc3RpbGxDcm9zc1Byb2QiLCJfc3RpbGxTbGlkZSIsIl9zdGlsbFNsaWRlUHJldiIsIl9pc1N0aWxsIiwiX2xvb3BJbmRleFBlcmlvZCIsIl9sY20iLCJfbG9vcEluZGV4IiwiaGFzR3lyWmNyIiwiaW5kZXhPZiIsImhhc0FjY1pjciIsIl9neXJaY3IiLCJub2lzZVRocmVzaG9sZCIsImZyYW1lU2l6ZSIsImhvcFNpemUiLCJfYWNjWmNyIiwicGFyYW1zIiwia2V5IiwieCIsInkiLCJ6IiwiTWF0aCIsIlBJIiwiY2FsbGJhY2siLCJfZWxhcHNlZFRpbWUiLCJfbWFnbml0dWRlM0QiLCJlcnIiLCJyZXMiLCJlIiwiX2ludGVuc2l0eTFEIiwibm9ybSIsIl9kZWx0YSIsImFjY05vcm0iLCJmYWxsaW5nIiwiZHVyYXRpb24iLCJzdGF0ZSIsImludGVuc2l0eSIsImNlaWwiLCJraWNraW5nIiwiX3NsaWRlIiwic2hha2luZyIsInNwaW5uaW5nIiwiZ3lyTm9ybSIsIl9zdGlsbENyb3NzUHJvZHVjdCIsInNsaWRlIiwiemNyUmVzIiwiYW1wbGl0dWRlIiwiZnJlcXVlbmN5IiwicGVyaW9kaWNpdHkiLCJhY2NSZXMiLCJwcmV2IiwibmV4dCIsImR0IiwibmV4dFgiLCJwcmV2WCIsInByZXZJbnRlbnNpdHkiLCJwYXJhbTEiLCJwYXJhbTIiLCJkeCIsInh5ekFycmF5Iiwic3FydCIsImEiLCJiIiwiYTEiLCJiMSIsInByZXZTbGlkZSIsImN1cnJlbnRWYWwiLCJzbGlkZUZhY3RvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7QUFFQTs7Ozs7Ozs7O0FBU0EsU0FBU0EsZUFBVCxHQUEyQjtBQUN6QixNQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFBRTtBQUNuQyxXQUFPLFlBQU07QUFDWCxVQUFNQyxJQUFJQyxRQUFRQyxNQUFSLEVBQVY7QUFDQSxhQUFPRixFQUFFLENBQUYsSUFBT0EsRUFBRSxDQUFGLElBQU8sSUFBckI7QUFDRCxLQUhEO0FBSUQsR0FMRCxNQUtPO0FBQUU7QUFDUCxRQUFJRCxPQUFPSSxXQUFQLEtBQXVCLFdBQTNCLEVBQXdDO0FBQ3RDLFVBQUlDLEtBQUtDLEdBQUwsS0FBYSxXQUFqQixFQUE4QjtBQUM1QixlQUFPLFlBQU07QUFBRSxpQkFBTyxJQUFJRCxLQUFLRSxPQUFULEVBQVA7QUFBMkIsU0FBMUM7QUFDRCxPQUZELE1BRU87QUFDTCxlQUFPLFlBQU07QUFBRSxpQkFBT0YsS0FBS0MsR0FBTCxFQUFQO0FBQW1CLFNBQWxDO0FBQ0Q7QUFDRixLQU5ELE1BTU87QUFDTCxhQUFPLFlBQU07QUFBRSxlQUFPTixPQUFPSSxXQUFQLENBQW1CRSxH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VCxVQUFJQyxLQUFLRixDQUFUO0FBQUEsVUFBWUcsS0FBS0YsQ0FBakI7O0FBRUEsYUFBT0MsTUFBTUMsRUFBYixFQUFpQjtBQUNmLFlBQUlELEtBQUtDLEVBQVQsRUFBYTtBQUNYRCxnQkFBTUYsQ0FBTjtBQUNELFNBRkQsTUFFTztBQUNMRyxnQkFBTUYsQ0FBTjtBQUNEO0FBQ0Y7O0FBRUQsYUFBT0MsRUFBUDtBQUNEOztBQUVEOzs7OzJCQUNPRSxTLEVBQVdDLFUsRUFBWUMsVyxFQUFhO0FBQ3pDLGFBQU9GLFlBQVksQ0FBQ0MsYUFBYUQsU0FBZCxJQUEyQkUsV0FBOUM7QUFDRDs7QUFFRDs7Ozt1Q0FDbUJSLFEsRUFBVTtBQUMzQixhQUFPLENBQUNBLFNBQVMsQ0FBVCxJQUFjQSxTQUFTLENBQVQsQ0FBZixLQUErQkEsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQUE3QyxJQUNBLENBQUNBLFNBQVMsQ0FBVCxJQUFjQSxTQUFTLENBQVQsQ0FBZixLQUErQkEsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQUE3QyxDQURBLEdBRUEsQ0FBQ0EsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQUFmLEtBQStCQSxTQUFTLENBQVQsSUFBY0EsU0FBUyxDQUFULENBQTdDLENBRlA7QUFHRDs7Ozs7a0JBR1l6SixjIiwiZmlsZSI6Im1vdGlvbi1mZWF0dXJlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBaZXJvQ3Jvc3NpbmdSYXRlIGZyb20gJy4vemVyby1jcm9zc2luZy1yYXRlJztcblxuLyoqXG4gKiBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGltZSBpbiBzZWNvbmRzIGFjY29yZGluZyB0byB0aGUgY3VycmVudFxuICogZW52aXJvbm5lbWVudCAobm9kZSBvciBicm93c2VyKS5cbiAqIElmIHJ1bm5pbmcgaW4gbm9kZSB0aGUgdGltZSByZWx5IG9uIGBwcm9jZXNzLmhydGltZWAsIHdoaWxlIGlmIGluIHRoZSBicm93c2VyXG4gKiBpdCBpcyBwcm92aWRlZCBieSB0aGUgYERhdGVgIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGdldFRpbWVGdW5jdGlvbigpIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7IC8vIGFzc3VtZSBub2RlXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNvbnN0IHQgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgICAgcmV0dXJuIHRbMF0gKyB0WzFdICogMWUtOTtcbiAgICB9XG4gIH0gZWxzZSB7IC8vIGJyb3dzZXJcbiAgICBpZiAod2luZG93LnBlcmZvcm1hbmNlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKERhdGUubm93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gbmV3IERhdGUuZ2V0VGltZSgpIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gRGF0ZS5ub3coKSB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIH07XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IHBlcmZOb3cgPSBnZXRUaW1lRnVuY3Rpb24oKTtcblxuLyoqXG4gKiBAdG9kbyB0eXBlZGVmIGNvbnN0cnVjdG9yIGFyZ3VtZW50XG4gKi9cblxuLypcbiAqIC8vIGVzNSB3aXRoIGJyb3dzZXJpZnkgOlxuICogdmFyIG1vdGlvbkZlYXR1cmVzID0gcmVxdWlyZSgnbW90aW9uLWZlYXR1cmVzJyk7XG4gKiB2YXIgbWYgPSBuZXcgbW90aW9uRmVhdHVyZXMuTW90aW9uRmVhdHVyZXMoeyBkZXNjcmlwdG9yczogWydhY2NJbnRlbnNpdHknLCAna2ljayddIH0pO1xuICpcbiAqIC8vIGxvYWRpbmcgZnJvbSBhIFwic2NyaXB0XCIgdGFnIDpcbiAqIHZhciBtZiA9IG5ldyBtb3Rpb25GZWF0dXJlcy5Nb3Rpb25GZWF0dXJlcyh7IGRlc2NyaXB0b3JzOiBbJ2FjY0ludGVuc2l0eScsICdraWNrJ10gfSk7XG4gKi9cblxuXG4vKipcbiAqIENsYXNzIGNvbXB1dGluZyB0aGUgZGVzY3JpcHRvcnMgZnJvbSBhY2NlbGVyb21ldGVyIGFuZCBneXJvc2NvcGUgZGF0YS5cbiAqIDxiciAvPlxuICogZXM2ICsgYnJvd3NlcmlmeSBleGFtcGxlIDpcbiAqIGBgYEphdmFTY3JpcHRcbiAqIGltcG9ydCB7IE1vdGlvbkZlYXR1cmVzIH0gZnJvbSAnbW90aW9uLWZlYXR1cmVzJzsgXG4gKiBjb25zdCBtZiA9IG5ldyBNb3Rpb25GZWF0dXJlcyh7IGRlc2NyaXB0b3JzOiBbJ2FjY0ludGVuc2l0eScsICdraWNrJ10gfSk7XG4gKlxuICogLy8gdGhlbiwgb24gZWFjaCBtb3Rpb24gZXZlbnQgOlxuICogbWYuc2V0QWNjZWxlcm9tZXRlcih4LCB5LCB6KTtcbiAqIG1mLnNldEd5cm9zY29wZShhbHBoYSwgYmV0YSwgZ2FtbWEpO1xuICogbWYudXBkYXRlKGZ1bmN0aW9uKGVyciwgcmVzKSB7XG4gKiAgIGlmIChlcnIgPT09IG51bGwpIHtcbiAqICAgICAvLyBkbyBzb21ldGhpbmcgd2l0aCByZXNcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBNb3Rpb25GZWF0dXJlcyB7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpbml0T2JqZWN0IC0gb2JqZWN0IGNvbnRhaW5pbmcgYW4gYXJyYXkgb2YgdGhlXG4gICAqIHJlcXVpcmVkIGRlc2NyaXB0b3JzIGFuZCBzb21lIHZhcmlhYmxlcyB1c2VkIHRvIGNvbXB1dGUgdGhlIGRlc2NyaXB0b3JzXG4gICAqIHRoYXQgeW91IG1pZ2h0IHdhbnQgdG8gY2hhbmdlIChmb3IgZXhhbXBsZSBpZiB0aGUgYnJvd3NlciBpcyBjaHJvbWUgeW91XG4gICAqIG1pZ2h0IHdhbnQgdG8gc2V0IGBneXJJc0luRGVncmVlc2AgdG8gZmFsc2UgYmVjYXVzZSBpdCdzIHRoZSBjYXNlIG9uIHNvbWVcbiAgICogdmVyc2lvbnMsIG9yIHlvdSBtaWdodCB3YW50IHRvIGNoYW5nZSBzb21lIHRocmVzaG9sZHMpLlxuICAgKiBTZWUgdGhlIGNvZGUgZm9yIG1vcmUgZGV0YWlscy5cbiAgICpcbiAgICogQHRvZG8gdXNlIHR5cGVkZWYgdG8gZGVzY3JpYmUgdGhlIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVyc1xuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkZXNjcmlwdG9yczogW1xuICAgICAgICAnYWNjUmF3JyxcbiAgICAgICAgJ2d5clJhdycsXG4gICAgICAgICdhY2NJbnRlbnNpdHknLFxuICAgICAgICAnZ3lySW50ZW5zaXR5JyxcbiAgICAgICAgJ2ZyZWVmYWxsJyxcbiAgICAgICAgJ2tpY2snLFxuICAgICAgICAnc2hha2UnLFxuICAgICAgICAnc3BpbicsXG4gICAgICAgICdzdGlsbCcsXG4gICAgICAgICdneXJaY3InLFxuICAgICAgICAnYWNjWmNyJ1xuICAgICAgXSxcblxuICAgICAgZ3lySXNJbkRlZ3JlZXM6IHRydWUsXG5cbiAgICAgIGFjY0ludGVuc2l0eVBhcmFtMTogMC44LFxuICAgICAgYWNjSW50ZW5zaXR5UGFyYW0yOiAwLjEsXG5cbiAgICAgIGd5ckludGVuc2l0eVBhcmFtMTogMC45LFxuICAgICAgZ3lySW50ZW5zaXR5UGFyYW0yOiAxLFxuXG4gICAgICBmcmVlZmFsbEFjY1RocmVzaDogMC4xNSxcbiAgICAgIGZyZWVmYWxsR3lyVGhyZXNoOiA3NTAsXG4gICAgICBmcmVlZmFsbEd5ckRlbHRhVGhyZXNoOiA0MCxcblxuICAgICAga2lja1RocmVzaDogMC4wMSxcbiAgICAgIGtpY2tTcGVlZEdhdGU6IDIwMCxcbiAgICAgIGtpY2tNZWRpYW5GaWx0ZXJzaXplOiA5LFxuICAgICAga2lja0NhbGxiYWNrOiBudWxsLFxuXG4gICAgICBzaGFrZVRocmVzaDogMC4xLFxuICAgICAgc2hha2VXaW5kb3dTaXplOiAyMDAsXG4gICAgICBzaGFrZVNsaWRlRmFjdG9yOiAxMCxcblxuICAgICAgc3BpblRocmVzaDogMjAwLFxuXG4gICAgICBzdGlsbFRocmVzaDogNTAwMCxcbiAgICAgIHN0aWxsU2xpZGVGYWN0b3I6IDUsXG5cbiAgICAgIGd5clpjck5vaXNlVGhyZXNoOiAwLjAwMSxcbiAgICAgIGd5clpjckZyYW1lU2l6ZTogMTAwLFxuICAgICAgZ3lyWmNySG9wU2l6ZTogMTAsXG5cbiAgICAgIGFjY1pjck5vaXNlVGhyZXNoOiAwLjAwMSxcbiAgICAgIGFjY1pjckZyYW1lU2l6ZTogMTAwLFxuICAgICAgYWNjWmNySG9wU2l6ZTogMTAsXG4gICAgfTtcblxuICAgIHRoaXMuX3BhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICAvL2NvbnNvbGUubG9nKHRoaXMuX3BhcmFtcy5kZXNjcmlwdG9ycyk7XG5cbiAgICB0aGlzLl9tZXRob2RzID0ge1xuICAgICAgYWNjUmF3OiB0aGlzLl91cGRhdGVBY2NSYXcuYmluZCh0aGlzKSxcbiAgICAgIGd5clJhdzogdGhpcy5fdXBkYXRlR3lyUmF3LmJpbmQodGhpcyksXG4gICAgICBhY2NJbnRlbnNpdHk6IHRoaXMuX3VwZGF0ZUFjY0ludGVuc2l0eS5iaW5kKHRoaXMpLFxuICAgICAgZ3lySW50ZW5zaXR5OiB0aGlzLl91cGRhdGVHeXJJbnRlbnNpdHkuYmluZCh0aGlzKSxcbiAgICAgIGZyZWVmYWxsOiB0aGlzLl91cGRhdGVGcmVlZmFsbC5iaW5kKHRoaXMpLFxuICAgICAga2ljazogdGhpcy5fdXBkYXRlS2ljay5iaW5kKHRoaXMpLFxuICAgICAgc2hha2U6IHRoaXMuX3VwZGF0ZVNoYWtlLmJpbmQodGhpcyksXG4gICAgICBzcGluOiB0aGlzLl91cGRhdGVTcGluLmJpbmQodGhpcyksXG4gICAgICBzdGlsbDogdGhpcy5fdXBkYXRlU3RpbGwuYmluZCh0aGlzKSxcbiAgICAgIGd5clpjcjogdGhpcy5fdXBkYXRlR3lyWmNyLmJpbmQodGhpcyksXG4gICAgICBhY2NaY3I6IHRoaXMuX3VwZGF0ZUFjY1pjci5iaW5kKHRoaXMpXG4gICAgfTtcblxuICAgIHRoaXMuX2tpY2tDYWxsYmFjayA9IHRoaXMuX3BhcmFtcy5raWNrQ2FsbGJhY2s7XG5cbiAgICB0aGlzLmFjYyA9IFswLCAwLCAwXTtcbiAgICB0aGlzLmd5ciA9IFswLCAwLCAwXTtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGFjYyBpbnRlbnNpdHlcbiAgICB0aGlzLl9hY2NMYXN0ID0gW1xuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlMYXN0ID0gW1xuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHkgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGZyZWVmYWxsXG4gICAgdGhpcy5fYWNjTm9ybSA9IDA7XG4gICAgdGhpcy5fZ3lyRGVsdGEgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fZ3lyTm9ybSA9IDA7XG4gICAgdGhpcy5fZ3lyRGVsdGFOb3JtID0gMDtcbiAgICB0aGlzLl9mYWxsQmVnaW4gPSBwZXJmTm93KCk7XG4gICAgdGhpcy5fZmFsbEVuZCA9IHBlcmZOb3coKTtcbiAgICB0aGlzLl9mYWxsRHVyYXRpb24gPSAwO1xuICAgIHRoaXMuX2lzRmFsbGluZyA9IGZhbHNlO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZ3lyIGludGVuc2l0eVxuICAgIHRoaXMuX2d5ckxhc3QgPSBbXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3QgPSBbXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2d5ckludGVuc2l0eSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHlOb3JtID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGtpY2tcbiAgICB0aGlzLl9raWNrSW50ZW5zaXR5ID0gMDtcbiAgICB0aGlzLl9sYXN0S2ljayA9IDA7XG4gICAgdGhpcy5faXNLaWNraW5nID0gZmFsc2U7XG4gICAgdGhpcy5fbWVkaWFuVmFsdWVzID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xuICAgIHRoaXMuX21lZGlhbkxpbmtpbmcgPSBbMywgNCwgMSwgNSwgNywgOCwgMCwgMiwgNl07XG4gICAgdGhpcy5fbWVkaWFuRmlmbyA9IFs2LCAyLCA3LCAwLCAxLCAzLCA4LCA0LCA1XTtcbiAgICB0aGlzLl9pMSA9IDA7XG4gICAgdGhpcy5faTIgPSAwO1xuICAgIHRoaXMuX2kzID0gMDtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc2hha2VcbiAgICB0aGlzLl9hY2NEZWx0YSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9zaGFrZVdpbmRvdyA9IFtcbiAgICAgIG5ldyBBcnJheSh0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplKSxcbiAgICAgIG5ldyBBcnJheSh0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplKSxcbiAgICAgIG5ldyBBcnJheSh0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplKVxuICAgIF07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZTsgaisrKSB7XG4gICAgICAgIHRoaXMuX3NoYWtlV2luZG93W2ldW2pdID0gMDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fc2hha2VOYiA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9zaGFraW5nUmF3ID0gMDtcbiAgICB0aGlzLl9zaGFrZVNsaWRlUHJldiA9IDA7XG4gICAgdGhpcy5fc2hha2luZyA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzcGluXG4gICAgdGhpcy5fc3BpbkJlZ2luID0gcGVyZk5vdygpO1xuICAgIHRoaXMuX3NwaW5FbmQgPSBwZXJmTm93KCk7XG4gICAgdGhpcy5fc3BpbkR1cmF0aW9uID0gMDtcbiAgICB0aGlzLl9pc1NwaW5uaW5nID0gZmFsc2U7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHN0aWxsXG4gICAgdGhpcy5fc3RpbGxDcm9zc1Byb2QgPSAwO1xuICAgIHRoaXMuX3N0aWxsU2xpZGUgPSAwO1xuICAgIHRoaXMuX3N0aWxsU2xpZGVQcmV2ID0gMDtcbiAgICB0aGlzLl9pc1N0aWxsID0gZmFsc2U7XG5cbiAgICB0aGlzLl9sb29wSW5kZXhQZXJpb2QgPSB0aGlzLl9sY20oXG4gICAgICB0aGlzLl9sY20oXG4gICAgICAgIHRoaXMuX2xjbSgyLCAzKSwgdGhpcy5fcGFyYW1zLmtpY2tNZWRpYW5GaWx0ZXJzaXplXG4gICAgICApLFxuICAgICAgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZVxuICAgICk7XG4gICAgLy9jb25zb2xlLmxvZyh0aGlzLl9sb29wSW5kZXhQZXJpb2QpO1xuICAgIHRoaXMuX2xvb3BJbmRleCA9IDA7XG5cbiAgICBjb25zdCBoYXNHeXJaY3IgPSB0aGlzLl9wYXJhbXMuZGVzY3JpcHRvcnMuaW5kZXhPZignZ3lyWmNyJykgPiAtMTtcbiAgICBjb25zdCBoYXNBY2NaY3IgPSB0aGlzLl9wYXJhbXMuZGVzY3JpcHRvcnMuaW5kZXhPZignYWNjWmNyJykgPiAtMTtcblxuICAgIGlmIChoYXNHeXJaY3IpIHtcbiAgICAgIHRoaXMuX2d5clpjciA9IG5ldyBaZXJvQ3Jvc3NpbmdSYXRlKHtcbiAgICAgICAgbm9pc2VUaHJlc2hvbGQ6IHRoaXMuX3BhcmFtcy5neXJaY3JOb2lzZVRocmVzaCxcbiAgICAgICAgZnJhbWVTaXplOiB0aGlzLl9wYXJhbXMuZ3lyWmNyRnJhbWVTaXplLFxuICAgICAgICBob3BTaXplOiB0aGlzLl9wYXJhbXMuZ3lyWmNySG9wU2l6ZVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGhhc0FjY1pjcikge1xuICAgICAgdGhpcy5fYWNjWmNyID0gbmV3IFplcm9Dcm9zc2luZ1JhdGUoe1xuICAgICAgICBub2lzZVRocmVzaG9sZDogdGhpcy5fcGFyYW1zLmFjY1pjck5vaXNlVGhyZXNoLFxuICAgICAgICBmcmFtZVNpemU6IHRoaXMuX3BhcmFtcy5hY2NaY3JGcmFtZVNpemUsXG4gICAgICAgIGhvcFNpemU6IHRoaXMuX3BhcmFtcy5hY2NaY3JIb3BTaXplXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLz09PT09PT09PT0gaW50ZXJmYWNlID09PT09PT09PS8vXG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBjb25maWd1cmF0aW9uIHBhcmFtZXRlcnMgKGV4Y2VwdCBkZXNjcmlwdG9ycyBsaXN0KVxuICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gYSBzdWJzZXQgb2YgdGhlIGNvbnN0cnVjdG9yJ3MgcGFyYW1ldGVyc1xuICAgKi9cbiAgdXBkYXRlUGFyYW1zKHBhcmFtcyA9IHt9KSB7XG4gICAgZm9yIChsZXQga2V5IGluIHBhcmFtcykge1xuICAgICAgaWYgKGtleSAhPT0gJ2Rlc2NyaXB0b3JzJykge1xuICAgICAgICB0aGlzLl9wYXJhbXNba2V5XSA9IHBhcmFtc1trZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGFjY2VsZXJvbWV0ZXIgdmFsdWVzLlxuICAgKiBAcGFyYW0ge051bWJlcn0geCAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeCB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geSAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeSB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geiAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeiB2YWx1ZVxuICAgKi9cbiAgc2V0QWNjZWxlcm9tZXRlcih4LCB5ID0gMCwgeiA9IDApIHtcbiAgICB0aGlzLmFjY1swXSA9IHg7XG4gICAgdGhpcy5hY2NbMV0gPSB5O1xuICAgIHRoaXMuYWNjWzJdID0gejtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGd5cm9zY29wZSB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB4IC0gdGhlIGd5cm9zY29wZSdzIHggdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHkgLSB0aGUgZ3lyb3Njb3BlJ3MgeSB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geiAtIHRoZSBneXJvc2NvcGUncyB6IHZhbHVlXG4gICAqL1xuICBzZXRHeXJvc2NvcGUoeCwgeSA9IDAsIHogPSAwKSB7XG4gICAgdGhpcy5neXJbMF0gPSB4O1xuICAgIHRoaXMuZ3lyWzFdID0geTtcbiAgICB0aGlzLmd5clsyXSA9IHo7XG4gICAgaWYgKHRoaXMuX3BhcmFtcy5neXJJc0luRGVncmVlcykge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgdGhpcy5neXJbaV0gKj0gKDIgKiBNYXRoLlBJIC8gMzYwLik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGFuIGFjY2VsZXJvbWV0ZXIuXG4gICAqIEB0eXBlZGVmIGFjY0ludGVuc2l0eVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gbm9ybSAtIHRoZSBnbG9iYWwgZW5lcmd5IGNvbXB1dGVkIG9uIGFsbCBkaW1lbnNpb25zLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geCAtIHRoZSBlbmVyZ3kgaW4gdGhlIHggKGZpcnN0KSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB5IC0gdGhlIGVuZXJneSBpbiB0aGUgeSAoc2Vjb25kKSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB6IC0gdGhlIGVuZXJneSBpbiB0aGUgeiAodGhpcmQpIGRpbWVuc2lvbi5cbiAgICovXG5cbiAgLyoqXG4gICAqIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGEgZ3lyb3Njb3BlLlxuICAgKiBAdHlwZWRlZiBneXJJbnRlbnNpdHlcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IG5vcm0gLSB0aGUgZ2xvYmFsIGVuZXJneSBjb21wdXRlZCBvbiBhbGwgZGltZW5zaW9ucy5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHggLSB0aGUgZW5lcmd5IGluIHRoZSB4IChmaXJzdCkgZGltZW5zaW9uLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geSAtIHRoZSBlbmVyZ3kgaW4gdGhlIHkgKHNlY29uZCkgZGltZW5zaW9uLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geiAtIHRoZSBlbmVyZ3kgaW4gdGhlIHogKHRoaXJkKSBkaW1lbnNpb24uXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZnJlZSBmYWxsaW5nIHN0YXRlIG9mIHRoZSBzZW5zb3IuXG4gICAqIEB0eXBlZGVmIGZyZWVmYWxsXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBhY2NOb3JtIC0gdGhlIG5vcm0gb2YgdGhlIGFjY2VsZXJhdGlvbi5cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBmYWxsaW5nIC0gdHJ1ZSBpZiB0aGUgc2Vuc29yIGlzIGZyZWUgZmFsbGluZywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gZHVyYXRpb24gLSB0aGUgZHVyYXRpb24gb2YgdGhlIGZyZWUgZmFsbGluZyBzaW5jZSBpdHMgYmVnaW5uaW5nLlxuICAgKi9cblxuICAvKipcbiAgICogSW1wdWxzZSAvIGhpdCBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEB0eXBlZGVmIGtpY2tcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGludGVuc2l0eSAtIHRoZSBjdXJyZW50IGludGVuc2l0eSBvZiB0aGUgXCJraWNrXCIgZ2VzdHVyZS5cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBraWNraW5nIC0gdHJ1ZSBpZiBhIFwia2lja1wiIGdlc3R1cmUgaXMgYmVpbmcgZGV0ZWN0ZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG5cbiAgLyoqXG4gICAqIFNoYWtlIG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHR5cGVkZWYgc2hha2VcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHNoYWtpbmcgLSB0aGUgY3VycmVudCBhbW91bnQgb2YgXCJzaGFraW5lc3NcIi5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzcGlubmluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAdHlwZWRlZiBzcGluXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gc3Bpbm5pbmcgLSB0cnVlIGlmIHRoZSBzZW5zb3IgaXMgc3Bpbm5pbmcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGR1cmF0aW9uIC0gdGhlIGR1cmF0aW9uIG9mIHRoZSBzcGlubmluZyBzaW5jZSBpdHMgYmVnaW5uaW5nLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gZ3lyTm9ybSAtIHRoZSBub3JtIG9mIHRoZSByb3RhdGlvbiBzcGVlZC5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzdGlsbG5lc3Mgb2YgdGhlIHNlbnNvci5cbiAgICogQHR5cGVkZWYgc3RpbGxcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBzdGlsbCAtIHRydWUgaWYgdGhlIHNlbnNvciBpcyBzdGlsbCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gc2xpZGUgLSB0aGUgb3JpZ2luYWwgdmFsdWUgdGhyZXNob2xkZWQgdG8gZGV0ZXJtaW5lIHN0aWxsbmVzcy5cbiAgICovXG5cbiAgLyoqXG4gICAqIENvbXB1dGVkIGZlYXR1cmVzLlxuICAgKiBAdHlwZWRlZiBmZWF0dXJlc1xuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge2FjY0ludGVuc2l0eX0gYWNjSW50ZW5zaXR5IC0gSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYW4gYWNjZWxlcm9tZXRlci5cbiAgICogQHByb3BlcnR5IHtneXJJbnRlbnNpdHl9IGd5ckludGVuc2l0eSAtIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGEgZ3lyb3Njb3BlLlxuICAgKiBAcHJvcGVydHkge2ZyZWVmYWxsfSBmcmVlZmFsbCAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBmcmVlIGZhbGxpbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHByb3BlcnR5IHtraWNrfSBraWNrIC0gSW1wdWxzZSAvIGhpdCBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEBwcm9wZXJ0eSB7c2hha2V9IHNoYWtlIC0gU2hha2UgbW92ZW1lbnQgZGV0ZWN0aW9uIGluZm9ybWF0aW9uLlxuICAgKiBAcHJvcGVydHkge3NwaW59IHNwaW4gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgc3Bpbm5pbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHByb3BlcnR5IHtzdGlsbH0gc3RpbGwgLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgc3RpbGxuZXNzIG9mIHRoZSBzZW5zb3IuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBoYW5kbGluZyB0aGUgZmVhdHVyZXMuXG4gICAqIEBjYWxsYmFjayBmZWF0dXJlc0NhbGxiYWNrXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlcnIgLSBEZXNjcmlwdGlvbiBvZiBhIHBvdGVudGlhbCBlcnJvci5cbiAgICogQHBhcmFtIHtmZWF0dXJlc30gcmVzIC0gT2JqZWN0IGhvbGRpbmcgdGhlIGZlYXR1cmUgdmFsdWVzLlxuICAgKi9cblxuICAvKipcbiAgICogVHJpZ2dlcnMgY29tcHV0YXRpb24gb2YgdGhlIGRlc2NyaXB0b3JzIGZyb20gdGhlIGN1cnJlbnQgc2Vuc29yIHZhbHVlcyBhbmRcbiAgICogcGFzcyB0aGUgcmVzdWx0cyB0byBhIGNhbGxiYWNrXG4gICAqIEBwYXJhbSB7ZmVhdHVyZXNDYWxsYmFja30gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgaGFuZGxpbmcgdGhlIGxhc3QgY29tcHV0ZWQgZGVzY3JpcHRvcnNcbiAgICogQHJldHVybnMge2ZlYXR1cmVzfSBmZWF0dXJlcyAtIFJldHVybiB0aGVzZSBjb21wdXRlZCBkZXNjcmlwdG9ycyBhbnl3YXlcbiAgICovXG4gIHVwZGF0ZShjYWxsYmFjayA9IG51bGwpIHtcbiAgICAvLyBERUFMIFdJVEggdGhpcy5fZWxhcHNlZFRpbWVcbiAgICB0aGlzLl9lbGFwc2VkVGltZSA9IHBlcmZOb3coKTtcbiAgICAvLyBpcyB0aGlzIG9uZSB1c2VkIGJ5IHNldmVyYWwgZmVhdHVyZXMgP1xuICAgIHRoaXMuX2FjY05vcm0gPSB0aGlzLl9tYWduaXR1ZGUzRCh0aGlzLmFjYyk7XG4gICAgLy8gdGhpcyBvbmUgbmVlZHMgYmUgaGVyZSBiZWNhdXNlIHVzZWQgYnkgZnJlZWZhbGwgQU5EIHNwaW5cbiAgICB0aGlzLl9neXJOb3JtID0gdGhpcy5fbWFnbml0dWRlM0QodGhpcy5neXIpO1xuICAgIFxuICAgIGxldCBlcnIgPSBudWxsO1xuICAgIGxldCByZXMgPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICByZXMgPSB7fTtcbiAgICAgIGZvciAobGV0IGtleSBvZiB0aGlzLl9wYXJhbXMuZGVzY3JpcHRvcnMpIHtcbiAgICAgICAgaWYgKHRoaXMuX21ldGhvZHNba2V5XSkge1xuICAgICAgICAgIHRoaXMuX21ldGhvZHNba2V5XShyZXMpO1xuICAgICAgICB9XG4gICAgICB9IFxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGVyciA9IGU7XG4gICAgfVxuXG4gICAgdGhpcy5fbG9vcEluZGV4ID0gKHRoaXMuX2xvb3BJbmRleCArIDEpICUgdGhpcy5fbG9vcEluZGV4UGVyaW9kO1xuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhlcnIsIHJlcyk7ICBcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT0gc3BlY2lmaWMgZGVzY3JpcHRvcnMgY29tcHV0aW5nID09PT09PT09PT09PT09PT09PT09Ly9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVBY2NSYXcocmVzKSB7XG4gICAgcmVzLmFjY1JhdyA9IHtcbiAgICAgIHg6IHRoaXMuYWNjWzBdLFxuICAgICAgeTogdGhpcy5hY2NbMV0sXG4gICAgICB6OiB0aGlzLmFjY1syXVxuICAgIH07XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUd5clJhdyhyZXMpIHtcbiAgICByZXMuZ3lyUmF3ID0ge1xuICAgICAgeDogdGhpcy5neXJbMF0sXG4gICAgICB5OiB0aGlzLmd5clsxXSxcbiAgICAgIHo6IHRoaXMuZ3lyWzJdXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gYWNjIGludGVuc2l0eVxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUFjY0ludGVuc2l0eShyZXMpIHtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID0gMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB0aGlzLl9hY2NMYXN0W2ldW3RoaXMuX2xvb3BJbmRleCAlIDNdID0gdGhpcy5hY2NbaV07XG5cbiAgICAgIHRoaXMuX2FjY0ludGVuc2l0eVtpXSA9IHRoaXMuX2ludGVuc2l0eTFEKFxuICAgICAgICB0aGlzLmFjY1tpXSxcbiAgICAgICAgdGhpcy5fYWNjTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSxcbiAgICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5TGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAyXSxcbiAgICAgICAgdGhpcy5fcGFyYW1zLmFjY0ludGVuc2l0eVBhcmFtMSxcbiAgICAgICAgdGhpcy5fcGFyYW1zLmFjY0ludGVuc2l0eVBhcmFtMixcbiAgICAgICAgMVxuICAgICAgKTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5TGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAyXSA9IHRoaXMuX2FjY0ludGVuc2l0eVtpXTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSArPSB0aGlzLl9hY2NJbnRlbnNpdHlbaV07XG4gICAgfVxuXG4gICAgcmVzLmFjY0ludGVuc2l0eSA9IHtcbiAgICAgIG5vcm06IHRoaXMuX2FjY0ludGVuc2l0eU5vcm0sXG4gICAgICB4OiB0aGlzLl9hY2NJbnRlbnNpdHlbMF0sXG4gICAgICB5OiB0aGlzLl9hY2NJbnRlbnNpdHlbMV0sXG4gICAgICB6OiB0aGlzLl9hY2NJbnRlbnNpdHlbMl1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBneXIgaW50ZW5zaXR5XG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlR3lySW50ZW5zaXR5KHJlcykge1xuICAgIHRoaXMuX2d5ckludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2d5ckxhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmd5cltpXTtcblxuICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5W2ldID0gdGhpcy5faW50ZW5zaXR5MUQoXG4gICAgICAgIHRoaXMuZ3lyW2ldLFxuICAgICAgICB0aGlzLl9neXJMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLFxuICAgICAgICB0aGlzLl9neXJJbnRlbnNpdHlMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDJdLFxuICAgICAgICB0aGlzLl9wYXJhbXMuZ3lySW50ZW5zaXR5UGFyYW0xLFxuICAgICAgICB0aGlzLl9wYXJhbXMuZ3lySW50ZW5zaXR5UGFyYW0yLFxuICAgICAgICAxXG4gICAgICApO1xuXG4gICAgICB0aGlzLl9neXJJbnRlbnNpdHlMYXN0W2ldW3RoaXMuX2xvb3BJbmRleCAlIDJdID0gdGhpcy5fZ3lySW50ZW5zaXR5W2ldO1xuXG4gICAgICB0aGlzLl9neXJJbnRlbnNpdHlOb3JtICs9IHRoaXMuX2d5ckludGVuc2l0eVtpXTtcbiAgICB9XG5cbiAgICByZXMuZ3lySW50ZW5zaXR5ID0ge1xuICAgICAgbm9ybTogdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSxcbiAgICAgIHg6IHRoaXMuX2d5ckludGVuc2l0eVswXSxcbiAgICAgIHk6IHRoaXMuX2d5ckludGVuc2l0eVsxXSxcbiAgICAgIHo6IHRoaXMuX2d5ckludGVuc2l0eVsyXVxuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZnJlZWZhbGxcbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVGcmVlZmFsbChyZXMpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgdGhpcy5fZ3lyRGVsdGFbaV0gPVxuICAgICAgICB0aGlzLl9kZWx0YSh0aGlzLl9neXJMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLCB0aGlzLmd5cltpXSwgMSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZ3lyRGVsdGFOb3JtID0gdGhpcy5fbWFnbml0dWRlM0QodGhpcy5fZ3lyRGVsdGEpO1xuXG4gICAgaWYgKHRoaXMuX2FjY05vcm0gPCB0aGlzLl9wYXJhbXMuZnJlZWZhbGxBY2NUaHJlc2ggfHxcbiAgICAgICAgKHRoaXMuX2d5ck5vcm0gPiB0aGlzLl9wYXJhbXMuZnJlZWZhbGxHeXJUaHJlc2hcbiAgICAgICAgICAmJiB0aGlzLl9neXJEZWx0YU5vcm0gPCB0aGlzLl9wYXJhbXMuZnJlZWZhbGxHeXJEZWx0YVRocmVzaCkpIHtcbiAgICAgIGlmICghdGhpcy5faXNGYWxsaW5nKSB7XG4gICAgICAgIHRoaXMuX2lzRmFsbGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX2ZhbGxCZWdpbiA9IHBlcmZOb3coKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2ZhbGxFbmQgPSBwZXJmTm93KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLl9pc0ZhbGxpbmcpIHtcbiAgICAgICAgdGhpcy5faXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2ZhbGxEdXJhdGlvbiA9ICh0aGlzLl9mYWxsRW5kIC0gdGhpcy5fZmFsbEJlZ2luKTtcblxuICAgIHJlcy5mcmVlZmFsbCA9IHtcbiAgICAgIGFjY05vcm06IHRoaXMuX2FjY05vcm0sXG4gICAgICBmYWxsaW5nOiB0aGlzLl9pc0ZhbGxpbmcsXG4gICAgICBkdXJhdGlvbjogdGhpcy5fZmFsbER1cmF0aW9uXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0ga2lja1xuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUtpY2socmVzKSB7XG4gICAgdGhpcy5faTMgPSB0aGlzLl9sb29wSW5kZXggJSB0aGlzLl9wYXJhbXMua2lja01lZGlhbkZpbHRlcnNpemU7XG4gICAgdGhpcy5faTEgPSB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXTtcbiAgICB0aGlzLl9pMiA9IDE7XG5cbiAgICBpZiAodGhpcy5faTEgPCB0aGlzLl9wYXJhbXMua2lja01lZGlhbkZpbHRlcnNpemUgLSAxICYmXG4gICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPiB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl0pIHtcbiAgICAgIC8vIGNoZWNrIHJpZ2h0XG4gICAgICB3aGlsZSAodGhpcy5faTEgKyB0aGlzLl9pMiA8IHRoaXMua2lja01lZGlhbkZpbHRlcnNpemUgJiZcbiAgICAgICAgICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA+IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXSkge1xuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl1dID0gXG4gICAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyXV0gLSAxO1xuICAgICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID1cbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl07XG4gICAgICAgIHRoaXMuX2kyKys7XG4gICAgICB9XG4gICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcbiAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID0gdGhpcy5faTM7XG4gICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXSA9IHRoaXMuX2kxICsgdGhpcy5faTIgLSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjaGVjayBsZWZ0XG4gICAgICB3aGlsZSAodGhpcy5faTIgPCB0aGlzLl9pMSArIDEgJiZcbiAgICAgICAgICAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtIDwgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTJdKSB7XG4gICAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl1dICsgMTtcbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9pMisrO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9IHRoaXMuX2kzO1xuICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM10gPSB0aGlzLl9pMSAtIHRoaXMuX2kyICsgMTtcbiAgICB9XG5cbiAgICAvLyBjb21wYXJlIGN1cnJlbnQgaW50ZW5zaXR5IG5vcm0gd2l0aCBwcmV2aW91cyBtZWRpYW4gdmFsdWVcbiAgICBpZiAodGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSAtIHRoaXMuX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4gPiB0aGlzLl9wYXJhbXMua2lja1RocmVzaCkge1xuICAgICAgaWYgKHRoaXMuX2lzS2lja2luZykge1xuICAgICAgICBpZiAodGhpcy5fa2lja0ludGVuc2l0eSA8IHRoaXMuX2FjY0ludGVuc2l0eU5vcm0pIHtcbiAgICAgICAgICB0aGlzLl9raWNrSW50ZW5zaXR5ID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fa2lja0NhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fa2lja0NhbGxiYWNrKHsgc3RhdGU6ICdtaWRkbGUnLCBpbnRlbnNpdHk6IHRoaXMuX2tpY2tJbnRlbnNpdHkgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2lzS2lja2luZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX2tpY2tJbnRlbnNpdHkgPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgICB0aGlzLl9sYXN0S2ljayA9IHRoaXMuX2VsYXBzZWRUaW1lO1xuICAgICAgICBpZiAodGhpcy5fa2lja0NhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fa2lja0NhbGxiYWNrKHsgc3RhdGU6ICdzdGFydCcsIGludGVuc2l0eTogdGhpcy5fa2lja0ludGVuc2l0eSB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5fZWxhcHNlZFRpbWUgLSB0aGlzLl9sYXN0S2ljayA+IHRoaXMuX3BhcmFtcy5raWNrU3BlZWRHYXRlKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc0tpY2tpbmcgJiYgdGhpcy5fa2lja0NhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fa2lja0NhbGxiYWNrKHsgc3RhdGU6ICdzdG9wJywgaW50ZW5zaXR5OiB0aGlzLl9raWNrSW50ZW5zaXR5IH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2lzS2lja2luZyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4gPSB0aGlzLl9tZWRpYW5WYWx1ZXNbTWF0aC5jZWlsKHRoaXMuX3BhcmFtcy5raWNrTWVkaWFuRmlsdGVyc2l6ZSAqIDAuNSldO1xuXG4gICAgcmVzLmtpY2sgPSB7XG4gICAgICBpbnRlbnNpdHk6IHRoaXMuX2tpY2tJbnRlbnNpdHksXG4gICAgICBraWNraW5nOiB0aGlzLl9pc0tpY2tpbmdcbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNoYWtlXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlU2hha2UocmVzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2FjY0RlbHRhW2ldID0gdGhpcy5fZGVsdGEoXG4gICAgICAgIHRoaXMuX2FjY0xhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuYWNjW2ldLFxuICAgICAgICAxXG4gICAgICApO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZV0pIHtcbiAgICAgICAgdGhpcy5fc2hha2VOYltpXS0tO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuX2FjY0RlbHRhW2ldID4gdGhpcy5fcGFyYW1zLnNoYWtlVGhyZXNoKSB7XG4gICAgICAgIHRoaXMuX3NoYWtlV2luZG93W2ldW3RoaXMuX2xvb3BJbmRleCAlIHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemVdID0gMTtcbiAgICAgICAgdGhpcy5fc2hha2VOYltpXSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZV0gPSAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX3NoYWtpbmdSYXcgPVxuICAgIHRoaXMuX21hZ25pdHVkZTNEKHRoaXMuX3NoYWtlTmIpIC9cbiAgICB0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplO1xuICAgIHRoaXMuX3NoYWtlU2xpZGVQcmV2ID0gdGhpcy5fc2hha2luZztcbiAgICB0aGlzLl9zaGFraW5nID1cbiAgICB0aGlzLl9zbGlkZSh0aGlzLl9zaGFrZVNsaWRlUHJldiwgdGhpcy5fc2hha2luZ1JhdywgdGhpcy5fcGFyYW1zLnNoYWtlU2xpZGVGYWN0b3IpO1xuXG4gICAgcmVzLnNoYWtlID0ge1xuICAgICAgc2hha2luZzogdGhpcy5fc2hha2luZ1xuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNwaW5cbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVTcGluKHJlcykge1xuICAgIGlmICh0aGlzLl9neXJOb3JtID4gdGhpcy5fcGFyYW1zLnNwaW5UaHJlc2gpIHtcbiAgICAgIGlmICghdGhpcy5faXNTcGlubmluZykge1xuICAgICAgICB0aGlzLl9pc1NwaW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fc3BpbkJlZ2luID0gcGVyZk5vdygpO1xuICAgICAgfVxuICAgICAgdGhpcy5fc3BpbkVuZCA9IHBlcmZOb3coKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2lzU3Bpbm5pbmcpIHtcbiAgICAgIHRoaXMuX2lzU3Bpbm5pbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy5fc3BpbkR1cmF0aW9uID0gdGhpcy5fc3BpbkVuZCAtIHRoaXMuX3NwaW5CZWdpbjtcblxuICAgIHJlcy5zcGluID0ge1xuICAgICAgc3Bpbm5pbmc6IHRoaXMuX2lzU3Bpbm5pbmcsXG4gICAgICBkdXJhdGlvbjogdGhpcy5fc3BpbkR1cmF0aW9uLFxuICAgICAgZ3lyTm9ybTogdGhpcy5fZ3lyTm9ybVxuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc3RpbGxcbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVTdGlsbChyZXMpIHtcbiAgICB0aGlzLl9zdGlsbENyb3NzUHJvZCA9IHRoaXMuX3N0aWxsQ3Jvc3NQcm9kdWN0KHRoaXMuZ3lyKTtcbiAgICB0aGlzLl9zdGlsbFNsaWRlUHJldiA9IHRoaXMuX3N0aWxsU2xpZGU7XG4gICAgdGhpcy5fc3RpbGxTbGlkZSA9IHRoaXMuX3NsaWRlKFxuICAgICAgdGhpcy5fc3RpbGxTbGlkZVByZXYsXG4gICAgICB0aGlzLl9zdGlsbENyb3NzUHJvZCxcbiAgICAgIHRoaXMuX3BhcmFtcy5zdGlsbFNsaWRlRmFjdG9yXG4gICAgKTtcblxuICAgIGlmICh0aGlzLl9zdGlsbFNsaWRlID4gdGhpcy5fcGFyYW1zLnN0aWxsVGhyZXNoKSB7XG4gICAgICB0aGlzLl9pc1N0aWxsID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2lzU3RpbGwgPSB0cnVlO1xuICAgIH1cbiAgXG4gICAgcmVzLnN0aWxsID0ge1xuICAgICAgc3RpbGw6IHRoaXMuX2lzU3RpbGwsXG4gICAgICBzbGlkZTogdGhpcy5fc3RpbGxTbGlkZVxuICAgIH1cbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGd5clpjclxuICAvKiogQHByaXZhdGUgKi9cblxuICBfdXBkYXRlR3lyWmNyKHJlcykge1xuICAgIGNvbnN0IHpjclJlcyA9IHRoaXMuX2d5clpjci5wcm9jZXNzKHRoaXMuX2d5ck5vcm0pO1xuICAgIHJlcy5neXJaY3IgPSB7XG4gICAgICBhbXBsaXR1ZGU6IHpjclJlcy5hbXBsaXR1ZGUsXG4gICAgICBmcmVxdWVuY3k6IHpjclJlcy5mcmVxdWVuY3ksXG4gICAgICBwZXJpb2RpY2l0eTogemNyUmVzLnBlcmlvZGljaXR5LFxuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBhY2NaY3JcbiAgLyoqIEBwcml2YXRlICovXG5cbiAgX3VwZGF0ZUFjY1pjcihyZXMpIHtcbiAgICBjb25zdCBhY2NSZXMgPSB0aGlzLl9hY2NaY3IucHJvY2Vzcyh0aGlzLl9hY2NOb3JtKTtcbiAgICByZXMuYWNjWmNyID0ge1xuICAgICAgYW1wbGl0dWRlOiBhY2NaY3IuYW1wbGl0dWRlLFxuICAgICAgZnJlcXVlbmN5OiBhY2NaY3IuZnJlcXVlbmN5LFxuICAgICAgcGVyaW9kaWNpdHk6IGFjY1pjci5wZXJpb2RpY2l0eSxcbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gVVRJTElUSUVTID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cbiAgLyoqIEBwcml2YXRlICovXG4gIF9kZWx0YShwcmV2LCBuZXh0LCBkdCkge1xuICAgIHJldHVybiAobmV4dCAtIHByZXYpIC8gKDIgKiBkdCk7XG4gIH1cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX2ludGVuc2l0eTFEKG5leHRYLCBwcmV2WCwgcHJldkludGVuc2l0eSwgcGFyYW0xLCBwYXJhbTIsIGR0KSB7XG4gICAgY29uc3QgZHggPSB0aGlzLl9kZWx0YShuZXh0WCwgcHJldlgsIGR0KTsvLyhuZXh0WCAtIHByZXZYKSAvICgyICogZHQpO1xuICAgIHJldHVybiBwYXJhbTIgKiBkeCAqIGR4ICsgcGFyYW0xICogcHJldkludGVuc2l0eTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfbWFnbml0dWRlM0QoeHl6QXJyYXkpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHh5ekFycmF5WzBdICogeHl6QXJyYXlbMF0gKyBcbiAgICAgICAgICAgICAgICB4eXpBcnJheVsxXSAqIHh5ekFycmF5WzFdICtcbiAgICAgICAgICAgICAgICB4eXpBcnJheVsyXSAqIHh5ekFycmF5WzJdKTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfbGNtKGEsIGIpIHtcbiAgICBsZXQgYTEgPSBhLCBiMSA9IGI7XG5cbiAgICB3aGlsZSAoYTEgIT0gYjEpIHtcbiAgICAgIGlmIChhMSA8IGIxKSB7XG4gICAgICAgIGExICs9IGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiMSArPSBiO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhMTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfc2xpZGUocHJldlNsaWRlLCBjdXJyZW50VmFsLCBzbGlkZUZhY3Rvcikge1xuICAgIHJldHVybiBwcmV2U2xpZGUgKyAoY3VycmVudFZhbCAtIHByZXZTbGlkZSkgLyBzbGlkZUZhY3RvcjtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfc3RpbGxDcm9zc1Byb2R1Y3QoeHl6QXJyYXkpIHtcbiAgICByZXR1cm4gKHh5ekFycmF5WzFdIC0geHl6QXJyYXlbMl0pICogKHh5ekFycmF5WzFdIC0geHl6QXJyYXlbMl0pICtcbiAgICAgICAgICAgKHh5ekFycmF5WzBdIC0geHl6QXJyYXlbMV0pICogKHh5ekFycmF5WzBdIC0geHl6QXJyYXlbMV0pICtcbiAgICAgICAgICAgKHh5ekFycmF5WzJdIC0geHl6QXJyYXlbMF0pICogKHh5ekFycmF5WzJdIC0geHl6QXJyYXlbMF0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vdGlvbkZlYXR1cmVzO1xuIl19
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
 * // es6 :
 * import MotionFeatures from 'motion-features'; 
 * const mf = new MotionFeatures({ descriptors: ['accIntensity', 'kick'] });
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
   * sSets the current accelerometer values.
   * @param {Number} x - the accelerometer's x value
   * @param {Number} y - the accelerometer's y value
   * @param {Number} z - the accelerometer's z value
   */


  (0, _createClass3.default)(MotionFeatures, [{
    key: 'setAccelerometer',
    value: function setAccelerometer(x, y, z) {
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
    value: function setGyroscope(x, y, z) {
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
     * Computed descriptors.
     * @typedef descriptors
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
     * Callback handling the descriptors.
     * @callback featuresCallback
     * @param {String} err - Description of a potential error.
     * @param {descriptors} res - Object holding the descriptor values.
     */

    /**
     * triggers computation of the descriptors from the current sensor values and
     * pass the results to a callback
     * @param {descriptorsCallback} callback - the callback handling the last computed descriptors
     */

  }, {
    key: 'update',
    value: function update(callback) {
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
      callback(err, res);

      this._loopIndex = (this._loopIndex + 1) % this._loopIndexPeriod;
      //console.log(this._loopIndex);
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

      if (this._i1 < this._params.kickMedianFiltersize && this._accIntensityNorm > this._medianValues[this._i1 + this._i2]) {
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
        } else {
          this._isKicking = true;
          this._kickIntensity = this._accIntensityNorm;
          this._lastKick = this._elapsedTime;
        }
      } else {
        if (this._elapsedTime - this._lastKick > this._params.kickSpeedGate) {
          this._isKicking = false;
        }
      }

      this._accIntensityNormMedian = this._medianValues[this._params.kickMedianFiltersize];

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbImdldFRpbWVGdW5jdGlvbiIsIndpbmRvdyIsInQiLCJwcm9jZXNzIiwiaHJ0aW1lIiwicGVyZm9ybWFuY2UiLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInBlcmZOb3ciLCJNb3Rpb25GZWF0dXJlcyIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsImRlc2NyaXB0b3JzIiwiZ3lySXNJbkRlZ3JlZXMiLCJhY2NJbnRlbnNpdHlQYXJhbTEiLCJhY2NJbnRlbnNpdHlQYXJhbTIiLCJneXJJbnRlbnNpdHlQYXJhbTEiLCJneXJJbnRlbnNpdHlQYXJhbTIiLCJmcmVlZmFsbEFjY1RocmVzaCIsImZyZWVmYWxsR3lyVGhyZXNoIiwiZnJlZWZhbGxHeXJEZWx0YVRocmVzaCIsImtpY2tUaHJlc2giLCJraWNrU3BlZWRHYXRlIiwia2lja01lZGlhbkZpbHRlcnNpemUiLCJzaGFrZVRocmVzaCIsInNoYWtlV2luZG93U2l6ZSIsInNoYWtlU2xpZGVGYWN0b3IiLCJzcGluVGhyZXNoIiwic3RpbGxUaHJlc2giLCJzdGlsbFNsaWRlRmFjdG9yIiwiX3BhcmFtcyIsIl9tZXRob2RzIiwiYWNjUmF3IiwiX3VwZGF0ZUFjY1JhdyIsImJpbmQiLCJneXJSYXciLCJfdXBkYXRlR3lyUmF3IiwiYWNjSW50ZW5zaXR5IiwiX3VwZGF0ZUFjY0ludGVuc2l0eSIsImd5ckludGVuc2l0eSIsIl91cGRhdGVHeXJJbnRlbnNpdHkiLCJmcmVlZmFsbCIsIl91cGRhdGVGcmVlZmFsbCIsImtpY2siLCJfdXBkYXRlS2ljayIsInNoYWtlIiwiX3VwZGF0ZVNoYWtlIiwic3BpbiIsIl91cGRhdGVTcGluIiwic3RpbGwiLCJfdXBkYXRlU3RpbGwiLCJhY2MiLCJneXIiLCJfYWNjTGFzdCIsIl9hY2NJbnRlbnNpdHlMYXN0IiwiX2FjY0ludGVuc2l0eSIsIl9hY2NJbnRlbnNpdHlOb3JtIiwiX2FjY05vcm0iLCJfZ3lyRGVsdGEiLCJfZ3lyTm9ybSIsIl9neXJEZWx0YU5vcm0iLCJfZmFsbEJlZ2luIiwiX2ZhbGxFbmQiLCJfZmFsbER1cmF0aW9uIiwiX2lzRmFsbGluZyIsIl9neXJMYXN0IiwiX2d5ckludGVuc2l0eUxhc3QiLCJfZ3lySW50ZW5zaXR5IiwiX2d5ckludGVuc2l0eU5vcm0iLCJfa2lja0ludGVuc2l0eSIsIl9sYXN0S2ljayIsIl9pc0tpY2tpbmciLCJfbWVkaWFuVmFsdWVzIiwiX21lZGlhbkxpbmtpbmciLCJfbWVkaWFuRmlmbyIsIl9pMSIsIl9pMiIsIl9pMyIsIl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuIiwiX2FjY0RlbHRhIiwiX3NoYWtlV2luZG93IiwiQXJyYXkiLCJpIiwiaiIsIl9zaGFrZU5iIiwiX3NoYWtpbmdSYXciLCJfc2hha2VTbGlkZVByZXYiLCJfc2hha2luZyIsIl9zcGluQmVnaW4iLCJfc3BpbkVuZCIsIl9zcGluRHVyYXRpb24iLCJfaXNTcGlubmluZyIsIl9zdGlsbENyb3NzUHJvZCIsIl9zdGlsbFNsaWRlIiwiX3N0aWxsU2xpZGVQcmV2IiwiX2lzU3RpbGwiLCJfbG9vcEluZGV4UGVyaW9kIiwiX2xjbSIsIl9sb29wSW5kZXgiLCJ4IiwieSIsInoiLCJNYXRoIiwiUEkiLCJjYWxsYmFjayIsIl9lbGFwc2VkVGltZSIsIl9tYWduaXR1ZGUzRCIsImVyciIsInJlcyIsImtleSIsImUiLCJfaW50ZW5zaXR5MUQiLCJub3JtIiwiX2RlbHRhIiwiYWNjTm9ybSIsImZhbGxpbmciLCJkdXJhdGlvbiIsImludGVuc2l0eSIsImtpY2tpbmciLCJfc2xpZGUiLCJzaGFraW5nIiwic3Bpbm5pbmciLCJneXJOb3JtIiwiX3N0aWxsQ3Jvc3NQcm9kdWN0Iiwic2xpZGUiLCJwcmV2IiwibmV4dCIsImR0IiwibmV4dFgiLCJwcmV2WCIsInByZXZJbnRlbnNpdHkiLCJwYXJhbTEiLCJwYXJhbTIiLCJkeCIsInh5ekFycmF5Iiwic3FydCIsImEiLCJiIiwiYTEiLCJiMSIsInByZXZTbGlkZSIsImN1cnJlbnRWYWwiLCJzbGlkZUZhY3RvciJd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ZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGltZSBpbiBzZWNvbmRzIGFjY29yZGluZyB0byB0aGUgY3VycmVudFxuICogZW52aXJvbm5lbWVudCAobm9kZSBvciBicm93c2VyKS5cbiAqIElmIHJ1bm5pbmcgaW4gbm9kZSB0aGUgdGltZSByZWx5IG9uIGBwcm9jZXNzLmhydGltZWAsIHdoaWxlIGlmIGluIHRoZSBicm93c2VyXG4gKiBpdCBpcyBwcm92aWRlZCBieSB0aGUgYERhdGVgIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGdldFRpbWVGdW5jdGlvbigpIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7IC8vIGFzc3VtZSBub2RlXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNvbnN0IHQgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgICAgcmV0dXJuIHRbMF0gKyB0WzFdICogMWUtOTtcbiAgICB9XG4gIH0gZWxzZSB7IC8vIGJyb3dzZXJcbiAgICBpZiAod2luZG93LnBlcmZvcm1hbmNlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKERhdGUubm93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gbmV3IERhdGUuZ2V0VGltZSgpIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gRGF0ZS5ub3coKSB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKCkgPT4geyByZXR1cm4gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIH07XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IHBlcmZOb3cgPSBnZXRUaW1lRnVuY3Rpb24oKTtcblxuLyoqXG4gKiBAdG9kbyB0eXBlZGVmIGNvbnN0cnVjdG9yIGFyZ3VtZW50XG4gKi9cblxuLyoqXG4gKiBDbGFzcyBjb21wdXRpbmcgdGhlIGRlc2NyaXB0b3JzIGZyb20gYWNjZWxlcm9tZXRlciBhbmQgZ3lyb3Njb3BlIGRhdGEuXG4gKiA8YnIgLz5cbiAqIEV4YW1wbGUgOlxuICogYGBgSmF2YVNjcmlwdFxuICogLy8gZXM2IDpcbiAqIGltcG9ydCBNb3Rpb25GZWF0dXJlcyBmcm9tICdtb3Rpb24tZmVhdHVyZXMnOyBcbiAqIGNvbnN0IG1mID0gbmV3IE1vdGlvbkZlYXR1cmVzKHsgZGVzY3JpcHRvcnM6IFsnYWNjSW50ZW5zaXR5JywgJ2tpY2snXSB9KTtcbiAqIGBgYFxuICogQGNsYXNzXG4gKi9cbmNsYXNzIE1vdGlvbkZlYXR1cmVzIHtcblxuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3R9IGluaXRPYmplY3QgLSBvYmplY3QgY29udGFpbmluZyBhbiBhcnJheSBvZiB0aGVcbiAgICogcmVxdWlyZWQgZGVzY3JpcHRvcnMgYW5kIHNvbWUgdmFyaWFibGVzIHVzZWQgdG8gY29tcHV0ZSB0aGUgZGVzY3JpcHRvcnNcbiAgICogdGhhdCB5b3UgbWlnaHQgd2FudCB0byBjaGFuZ2UgKGZvciBleGFtcGxlIGlmIHRoZSBicm93c2VyIGlzIGNocm9tZSB5b3VcbiAgICogbWlnaHQgd2FudCB0byBzZXQgYGd5cklzSW5EZWdyZWVzYCB0byBmYWxzZSBiZWNhdXNlIGl0J3MgdGhlIGNhc2Ugb24gc29tZVxuICAgKiB2ZXJzaW9ucywgb3IgeW91IG1pZ2h0IHdhbnQgdG8gY2hhbmdlIHNvbWUgdGhyZXNob2xkcykuXG4gICAqIFNlZSB0aGUgY29kZSBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKlxuICAgKiBAdG9kbyB1c2UgdHlwZWRlZiB0byBkZXNjcmliZSB0aGUgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRlc2NyaXB0b3JzOiBbXG4gICAgICAgICdhY2NSYXcnLFxuICAgICAgICAnZ3lyUmF3JyxcbiAgICAgICAgJ2FjY0ludGVuc2l0eScsXG4gICAgICAgICdneXJJbnRlbnNpdHknLFxuICAgICAgICAnZnJlZWZhbGwnLFxuICAgICAgICAna2ljaycsXG4gICAgICAgICdzaGFrZScsXG4gICAgICAgICdzcGluJyxcbiAgICAgICAgJ3N0aWxsJ1xuICAgICAgXSxcblxuICAgICAgZ3lySXNJbkRlZ3JlZXM6IHRydWUsXG5cbiAgICAgIGFjY0ludGVuc2l0eVBhcmFtMTogMC44LFxuICAgICAgYWNjSW50ZW5zaXR5UGFyYW0yOiAwLjEsXG5cbiAgICAgIGd5ckludGVuc2l0eVBhcmFtMTogMC45LFxuICAgICAgZ3lySW50ZW5zaXR5UGFyYW0yOiAxLFxuXG4gICAgICBmcmVlZmFsbEFjY1RocmVzaDogMC4xNSxcbiAgICAgIGZyZWVmYWxsR3lyVGhyZXNoOiA3NTAsXG4gICAgICBmcmVlZmFsbEd5ckRlbHRhVGhyZXNoOiA0MCxcblxuICAgICAga2lja1RocmVzaDogMC4wMSxcbiAgICAgIGtpY2tTcGVlZEdhdGU6IDIwMCxcbiAgICAgIGtpY2tNZWRpYW5GaWx0ZXJzaXplOiA5LFxuXG4gICAgICBzaGFrZVRocmVzaDogMC4xLFxuICAgICAgc2hha2VXaW5kb3dTaXplOiAyMDAsXG4gICAgICBzaGFrZVNsaWRlRmFjdG9yOiAxMCxcblxuICAgICAgc3BpblRocmVzaDogMjAwLFxuXG4gICAgICBzdGlsbFRocmVzaDogNTAwMCxcbiAgICAgIHN0aWxsU2xpZGVGYWN0b3I6IDUsXG4gICAgfTtcblxuICAgIHRoaXMuX3BhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICAvL2NvbnNvbGUubG9nKHRoaXMuX3BhcmFtcy5kZXNjcmlwdG9ycyk7XG5cbiAgICB0aGlzLl9tZXRob2RzID0ge1xuICAgICAgYWNjUmF3OiB0aGlzLl91cGRhdGVBY2NSYXcuYmluZCh0aGlzKSxcbiAgICAgIGd5clJhdzogdGhpcy5fdXBkYXRlR3lyUmF3LmJpbmQodGhpcyksXG4gICAgICBhY2NJbnRlbnNpdHk6IHRoaXMuX3VwZGF0ZUFjY0ludGVuc2l0eS5iaW5kKHRoaXMpLFxuICAgICAgZ3lySW50ZW5zaXR5OiB0aGlzLl91cGRhdGVHeXJJbnRlbnNpdHkuYmluZCh0aGlzKSxcbiAgICAgIGZyZWVmYWxsOiB0aGlzLl91cGRhdGVGcmVlZmFsbC5iaW5kKHRoaXMpLFxuICAgICAga2ljazogdGhpcy5fdXBkYXRlS2ljay5iaW5kKHRoaXMpLFxuICAgICAgc2hha2U6IHRoaXMuX3VwZGF0ZVNoYWtlLmJpbmQodGhpcyksXG4gICAgICBzcGluOiB0aGlzLl91cGRhdGVTcGluLmJpbmQodGhpcyksXG4gICAgICBzdGlsbDogdGhpcy5fdXBkYXRlU3RpbGwuYmluZCh0aGlzKVxuICAgIH07XG5cbiAgICB0aGlzLmFjYyA9IFswLCAwLCAwXTtcbiAgICB0aGlzLmd5ciA9IFswLCAwLCAwXTtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGFjYyBpbnRlbnNpdHlcbiAgICB0aGlzLl9hY2NMYXN0ID0gW1xuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlMYXN0ID0gW1xuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHkgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGZyZWVmYWxsXG4gICAgdGhpcy5fYWNjTm9ybSA9IDA7XG4gICAgdGhpcy5fZ3lyRGVsdGEgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fZ3lyTm9ybSA9IDA7XG4gICAgdGhpcy5fZ3lyRGVsdGFOb3JtID0gMDtcbiAgICB0aGlzLl9mYWxsQmVnaW4gPSBwZXJmTm93KCk7XG4gICAgdGhpcy5fZmFsbEVuZCA9IHBlcmZOb3coKTtcbiAgICB0aGlzLl9mYWxsRHVyYXRpb24gPSAwO1xuICAgIHRoaXMuX2lzRmFsbGluZyA9IGZhbHNlO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZ3lyIGludGVuc2l0eVxuICAgIHRoaXMuX2d5ckxhc3QgPSBbXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3QgPSBbXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2d5ckludGVuc2l0eSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHlOb3JtID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGtpY2tcbiAgICB0aGlzLl9raWNrSW50ZW5zaXR5ID0gMDtcbiAgICB0aGlzLl9sYXN0S2ljayA9IDA7XG4gICAgdGhpcy5faXNLaWNraW5nID0gZmFsc2U7XG4gICAgdGhpcy5fbWVkaWFuVmFsdWVzID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xuICAgIHRoaXMuX21lZGlhbkxpbmtpbmcgPSBbMywgNCwgMSwgNSwgNywgOCwgMCwgMiwgNl07XG4gICAgdGhpcy5fbWVkaWFuRmlmbyA9IFs2LCAyLCA3LCAwLCAxLCAzLCA4LCA0LCA1XTtcbiAgICB0aGlzLl9pMSA9IDA7XG4gICAgdGhpcy5faTIgPSAwO1xuICAgIHRoaXMuX2kzID0gMDtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc2hha2VcbiAgICB0aGlzLl9hY2NEZWx0YSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9zaGFrZVdpbmRvdyA9IFtcbiAgICAgIG5ldyBBcnJheSh0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplKSxcbiAgICAgIG5ldyBBcnJheSh0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplKSxcbiAgICAgIG5ldyBBcnJheSh0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplKVxuICAgIF07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZTsgaisrKSB7XG4gICAgICAgIHRoaXMuX3NoYWtlV2luZG93W2ldW2pdID0gMDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fc2hha2VOYiA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9zaGFraW5nUmF3ID0gMDtcbiAgICB0aGlzLl9zaGFrZVNsaWRlUHJldiA9IDA7XG4gICAgdGhpcy5fc2hha2luZyA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzcGluXG4gICAgdGhpcy5fc3BpbkJlZ2luID0gcGVyZk5vdygpO1xuICAgIHRoaXMuX3NwaW5FbmQgPSBwZXJmTm93KCk7XG4gICAgdGhpcy5fc3BpbkR1cmF0aW9uID0gMDtcbiAgICB0aGlzLl9pc1NwaW5uaW5nID0gZmFsc2U7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHN0aWxsXG4gICAgdGhpcy5fc3RpbGxDcm9zc1Byb2QgPSAwO1xuICAgIHRoaXMuX3N0aWxsU2xpZGUgPSAwO1xuICAgIHRoaXMuX3N0aWxsU2xpZGVQcmV2ID0gMDtcbiAgICB0aGlzLl9pc1N0aWxsID0gZmFsc2U7XG5cbiAgICB0aGlzLl9sb29wSW5kZXhQZXJpb2QgPSB0aGlzLl9sY20oXG4gICAgICB0aGlzLl9sY20oXG4gICAgICAgIHRoaXMuX2xjbSgyLCAzKSwgdGhpcy5fcGFyYW1zLmtpY2tNZWRpYW5GaWx0ZXJzaXplXG4gICAgICApLFxuICAgICAgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZVxuICAgICk7XG4gICAgLy9jb25zb2xlLmxvZyh0aGlzLl9sb29wSW5kZXhQZXJpb2QpO1xuICAgIHRoaXMuX2xvb3BJbmRleCA9IDA7XG4gIH1cblxuICAvLz09PT09PT09PT0gaW50ZXJmYWNlID09PT09PT09PS8vXG5cbiAgLyoqXG4gICAqIHNTZXRzIHRoZSBjdXJyZW50IGFjY2VsZXJvbWV0ZXIgdmFsdWVzLlxuICAgKiBAcGFyYW0ge051bWJlcn0geCAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeCB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geSAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeSB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geiAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeiB2YWx1ZVxuICAgKi9cbiAgc2V0QWNjZWxlcm9tZXRlcih4LCB5LCB6KSB7XG4gICAgdGhpcy5hY2NbMF0gPSB4O1xuICAgIHRoaXMuYWNjWzFdID0geTtcbiAgICB0aGlzLmFjY1syXSA9IHo7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBneXJvc2NvcGUgdmFsdWVzLlxuICAgKiBAcGFyYW0ge051bWJlcn0geCAtIHRoZSBneXJvc2NvcGUncyB4IHZhbHVlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB5IC0gdGhlIGd5cm9zY29wZSdzIHkgdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHogLSB0aGUgZ3lyb3Njb3BlJ3MgeiB2YWx1ZVxuICAgKi9cbiAgc2V0R3lyb3Njb3BlKHgsIHksIHopIHtcbiAgICB0aGlzLmd5clswXSA9IHg7XG4gICAgdGhpcy5neXJbMV0gPSB5O1xuICAgIHRoaXMuZ3lyWzJdID0gejtcbiAgICBpZiAodGhpcy5fcGFyYW1zLmd5cklzSW5EZWdyZWVzKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgICB0aGlzLmd5cltpXSAqPSAoMiAqIE1hdGguUEkgLyAzNjAuKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYW4gYWNjZWxlcm9tZXRlci5cbiAgICogQHR5cGVkZWYgYWNjSW50ZW5zaXR5XG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBub3JtIC0gdGhlIGdsb2JhbCBlbmVyZ3kgY29tcHV0ZWQgb24gYWxsIGRpbWVuc2lvbnMuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB4IC0gdGhlIGVuZXJneSBpbiB0aGUgeCAoZmlyc3QpIGRpbWVuc2lvbi5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHkgLSB0aGUgZW5lcmd5IGluIHRoZSB5IChzZWNvbmQpIGRpbWVuc2lvbi5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHogLSB0aGUgZW5lcmd5IGluIHRoZSB6ICh0aGlyZCkgZGltZW5zaW9uLlxuICAgKi9cblxuICAvKipcbiAgICogSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYSBneXJvc2NvcGUuXG4gICAqIEB0eXBlZGVmIGd5ckludGVuc2l0eVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gbm9ybSAtIHRoZSBnbG9iYWwgZW5lcmd5IGNvbXB1dGVkIG9uIGFsbCBkaW1lbnNpb25zLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geCAtIHRoZSBlbmVyZ3kgaW4gdGhlIHggKGZpcnN0KSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB5IC0gdGhlIGVuZXJneSBpbiB0aGUgeSAoc2Vjb25kKSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB6IC0gdGhlIGVuZXJneSBpbiB0aGUgeiAodGhpcmQpIGRpbWVuc2lvbi5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBmcmVlIGZhbGxpbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHR5cGVkZWYgZnJlZWZhbGxcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGFjY05vcm0gLSB0aGUgbm9ybSBvZiB0aGUgYWNjZWxlcmF0aW9uLlxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IGZhbGxpbmcgLSB0cnVlIGlmIHRoZSBzZW5zb3IgaXMgZnJlZSBmYWxsaW5nLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBkdXJhdGlvbiAtIHRoZSBkdXJhdGlvbiBvZiB0aGUgZnJlZSBmYWxsaW5nIHNpbmNlIGl0cyBiZWdpbm5pbmcuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbXB1bHNlIC8gaGl0IG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHR5cGVkZWYga2lja1xuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gaW50ZW5zaXR5IC0gdGhlIGN1cnJlbnQgaW50ZW5zaXR5IG9mIHRoZSBcImtpY2tcIiBnZXN0dXJlLlxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IGtpY2tpbmcgLSB0cnVlIGlmIGEgXCJraWNrXCIgZ2VzdHVyZSBpcyBiZWluZyBkZXRlY3RlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cblxuICAvKipcbiAgICogU2hha2UgbW92ZW1lbnQgZGV0ZWN0aW9uIGluZm9ybWF0aW9uLlxuICAgKiBAdHlwZWRlZiBzaGFrZVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gc2hha2luZyAtIHRoZSBjdXJyZW50IGFtb3VudCBvZiBcInNoYWtpbmVzc1wiLlxuICAgKi9cblxuICAvKipcbiAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHNwaW5uaW5nIHN0YXRlIG9mIHRoZSBzZW5zb3IuXG4gICAqIEB0eXBlZGVmIHNwaW5cbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBzcGlubmluZyAtIHRydWUgaWYgdGhlIHNlbnNvciBpcyBzcGlubmluZywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gZHVyYXRpb24gLSB0aGUgZHVyYXRpb24gb2YgdGhlIHNwaW5uaW5nIHNpbmNlIGl0cyBiZWdpbm5pbmcuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBneXJOb3JtIC0gdGhlIG5vcm0gb2YgdGhlIHJvdGF0aW9uIHNwZWVkLlxuICAgKi9cblxuICAvKipcbiAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHN0aWxsbmVzcyBvZiB0aGUgc2Vuc29yLlxuICAgKiBAdHlwZWRlZiBzdGlsbFxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IHN0aWxsIC0gdHJ1ZSBpZiB0aGUgc2Vuc29yIGlzIHN0aWxsLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBzbGlkZSAtIHRoZSBvcmlnaW5hbCB2YWx1ZSB0aHJlc2hvbGRlZCB0byBkZXRlcm1pbmUgc3RpbGxuZXNzLlxuICAgKi9cblxuICAvKipcbiAgICogQ29tcHV0ZWQgZGVzY3JpcHRvcnMuXG4gICAqIEB0eXBlZGVmIGRlc2NyaXB0b3JzXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7YWNjSW50ZW5zaXR5fSBhY2NJbnRlbnNpdHkgLSBJbnRlbnNpdHkgb2YgdGhlIG1vdmVtZW50IHNlbnNlZCBieSBhbiBhY2NlbGVyb21ldGVyLlxuICAgKiBAcHJvcGVydHkge2d5ckludGVuc2l0eX0gZ3lySW50ZW5zaXR5IC0gSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYSBneXJvc2NvcGUuXG4gICAqIEBwcm9wZXJ0eSB7ZnJlZWZhbGx9IGZyZWVmYWxsIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGZyZWUgZmFsbGluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAcHJvcGVydHkge2tpY2t9IGtpY2sgLSBJbXB1bHNlIC8gaGl0IG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHByb3BlcnR5IHtzaGFrZX0gc2hha2UgLSBTaGFrZSBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEBwcm9wZXJ0eSB7c3Bpbn0gc3BpbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzcGlubmluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAcHJvcGVydHkge3N0aWxsfSBzdGlsbCAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzdGlsbG5lc3Mgb2YgdGhlIHNlbnNvci5cbiAgICovXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGhhbmRsaW5nIHRoZSBkZXNjcmlwdG9ycy5cbiAgICogQGNhbGxiYWNrIGZlYXR1cmVzQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVyciAtIERlc2NyaXB0aW9uIG9mIGEgcG90ZW50aWFsIGVycm9yLlxuICAgKiBAcGFyYW0ge2Rlc2NyaXB0b3JzfSByZXMgLSBPYmplY3QgaG9sZGluZyB0aGUgZGVzY3JpcHRvciB2YWx1ZXMuXG4gICAqL1xuXG4gIC8qKlxuICAgKiB0cmlnZ2VycyBjb21wdXRhdGlvbiBvZiB0aGUgZGVzY3JpcHRvcnMgZnJvbSB0aGUgY3VycmVudCBzZW5zb3IgdmFsdWVzIGFuZFxuICAgKiBwYXNzIHRoZSByZXN1bHRzIHRvIGEgY2FsbGJhY2tcbiAgICogQHBhcmFtIHtkZXNjcmlwdG9yc0NhbGxiYWNrfSBjYWxsYmFjayAtIHRoZSBjYWxsYmFjayBoYW5kbGluZyB0aGUgbGFzdCBjb21wdXRlZCBkZXNjcmlwdG9yc1xuICAgKi9cbiAgdXBkYXRlKGNhbGxiYWNrKSB7XG4gICAgLy8gREVBTCBXSVRIIHRoaXMuX2VsYXBzZWRUaW1lXG4gICAgdGhpcy5fZWxhcHNlZFRpbWUgPSBwZXJmTm93KCk7XG4gICAgLy8gaXMgdGhpcyBvbmUgdXNlZCBieSBzZXZlcmFsIGZlYXR1cmVzID9cbiAgICB0aGlzLl9hY2NOb3JtID0gdGhpcy5fbWFnbml0dWRlM0QodGhpcy5hY2MpO1xuICAgIC8vIHRoaXMgb25lIG5lZWRzIGJlIGhlcmUgYmVjYXVzZSB1c2VkIGJ5IGZyZWVmYWxsIEFORCBzcGluXG4gICAgdGhpcy5fZ3lyTm9ybSA9IHRoaXMuX21hZ25pdHVkZTNEKHRoaXMuZ3lyKTtcbiAgICBcbiAgICBsZXQgZXJyID0gbnVsbDtcbiAgICBsZXQgcmVzID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgcmVzID0ge307XG4gICAgICBmb3IgKGxldCBrZXkgb2YgdGhpcy5fcGFyYW1zLmRlc2NyaXB0b3JzKSB7XG4gICAgICAgIGlmICh0aGlzLl9tZXRob2RzW2tleV0pIHtcbiAgICAgICAgICB0aGlzLl9tZXRob2RzW2tleV0ocmVzKTtcbiAgICAgICAgfVxuICAgICAgfSBcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlcnIgPSBlO1xuICAgIH1cbiAgICBjYWxsYmFjayhlcnIsIHJlcyk7XG5cbiAgICB0aGlzLl9sb29wSW5kZXggPSAodGhpcy5fbG9vcEluZGV4ICsgMSkgJSB0aGlzLl9sb29wSW5kZXhQZXJpb2Q7XG4gICAgLy9jb25zb2xlLmxvZyh0aGlzLl9sb29wSW5kZXgpO1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PSBzcGVjaWZpYyBkZXNjcmlwdG9ycyBjb21wdXRpbmcgPT09PT09PT09PT09PT09PT09PT0vL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cblxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUFjY1JhdyhyZXMpIHtcbiAgICByZXMuYWNjUmF3ID0ge1xuICAgICAgeDogdGhpcy5hY2NbMF0sXG4gICAgICB5OiB0aGlzLmFjY1sxXSxcbiAgICAgIHo6IHRoaXMuYWNjWzJdXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlR3lyUmF3KHJlcykge1xuICAgIHJlcy5neXJSYXcgPSB7XG4gICAgICB4OiB0aGlzLmd5clswXSxcbiAgICAgIHk6IHRoaXMuZ3lyWzFdLFxuICAgICAgejogdGhpcy5neXJbMl1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBhY2MgaW50ZW5zaXR5XG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlQWNjSW50ZW5zaXR5KHJlcykge1xuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2FjY0xhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmFjY1tpXTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5W2ldID0gdGhpcy5faW50ZW5zaXR5MUQoXG4gICAgICAgIHRoaXMuYWNjW2ldLFxuICAgICAgICB0aGlzLl9hY2NMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLFxuICAgICAgICB0aGlzLl9hY2NJbnRlbnNpdHlMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDJdLFxuICAgICAgICB0aGlzLl9wYXJhbXMuYWNjSW50ZW5zaXR5UGFyYW0xLFxuICAgICAgICB0aGlzLl9wYXJhbXMuYWNjSW50ZW5zaXR5UGFyYW0yLFxuICAgICAgICAxXG4gICAgICApO1xuXG4gICAgICB0aGlzLl9hY2NJbnRlbnNpdHlMYXN0W2ldW3RoaXMuX2xvb3BJbmRleCAlIDJdID0gdGhpcy5fYWNjSW50ZW5zaXR5W2ldO1xuXG4gICAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtICs9IHRoaXMuX2FjY0ludGVuc2l0eVtpXTtcbiAgICB9XG5cbiAgICByZXMuYWNjSW50ZW5zaXR5ID0ge1xuICAgICAgbm9ybTogdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSxcbiAgICAgIHg6IHRoaXMuX2FjY0ludGVuc2l0eVswXSxcbiAgICAgIHk6IHRoaXMuX2FjY0ludGVuc2l0eVsxXSxcbiAgICAgIHo6IHRoaXMuX2FjY0ludGVuc2l0eVsyXVxuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGd5ciBpbnRlbnNpdHlcbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVHeXJJbnRlbnNpdHkocmVzKSB7XG4gICAgdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSA9IDA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgdGhpcy5fZ3lyTGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAzXSA9IHRoaXMuZ3lyW2ldO1xuXG4gICAgICB0aGlzLl9neXJJbnRlbnNpdHlbaV0gPSB0aGlzLl9pbnRlbnNpdHkxRChcbiAgICAgICAgdGhpcy5neXJbaV0sXG4gICAgICAgIHRoaXMuX2d5ckxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgMl0sXG4gICAgICAgIHRoaXMuX3BhcmFtcy5neXJJbnRlbnNpdHlQYXJhbTEsXG4gICAgICAgIHRoaXMuX3BhcmFtcy5neXJJbnRlbnNpdHlQYXJhbTIsXG4gICAgICAgIDFcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgMl0gPSB0aGlzLl9neXJJbnRlbnNpdHlbaV07XG5cbiAgICAgIHRoaXMuX2d5ckludGVuc2l0eU5vcm0gKz0gdGhpcy5fZ3lySW50ZW5zaXR5W2ldO1xuICAgIH1cblxuICAgIHJlcy5neXJJbnRlbnNpdHkgPSB7XG4gICAgICBub3JtOiB0aGlzLl9neXJJbnRlbnNpdHlOb3JtLFxuICAgICAgeDogdGhpcy5fZ3lySW50ZW5zaXR5WzBdLFxuICAgICAgeTogdGhpcy5fZ3lySW50ZW5zaXR5WzFdLFxuICAgICAgejogdGhpcy5fZ3lySW50ZW5zaXR5WzJdXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBmcmVlZmFsbFxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUZyZWVmYWxsKHJlcykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB0aGlzLl9neXJEZWx0YVtpXSA9XG4gICAgICAgIHRoaXMuX2RlbHRhKHRoaXMuX2d5ckxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sIHRoaXMuZ3lyW2ldLCAxKTtcbiAgICB9XG5cbiAgICB0aGlzLl9neXJEZWx0YU5vcm0gPSB0aGlzLl9tYWduaXR1ZGUzRCh0aGlzLl9neXJEZWx0YSk7XG5cbiAgICBpZiAodGhpcy5fYWNjTm9ybSA8IHRoaXMuX3BhcmFtcy5mcmVlZmFsbEFjY1RocmVzaCB8fFxuICAgICAgICAodGhpcy5fZ3lyTm9ybSA+IHRoaXMuX3BhcmFtcy5mcmVlZmFsbEd5clRocmVzaFxuICAgICAgICAgICYmIHRoaXMuX2d5ckRlbHRhTm9ybSA8IHRoaXMuX3BhcmFtcy5mcmVlZmFsbEd5ckRlbHRhVGhyZXNoKSkge1xuICAgICAgaWYgKCF0aGlzLl9pc0ZhbGxpbmcpIHtcbiAgICAgICAgdGhpcy5faXNGYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fZmFsbEJlZ2luID0gcGVyZk5vdygpO1xuICAgICAgfVxuICAgICAgdGhpcy5fZmFsbEVuZCA9IHBlcmZOb3coKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuX2lzRmFsbGluZykge1xuICAgICAgICB0aGlzLl9pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fZmFsbER1cmF0aW9uID0gKHRoaXMuX2ZhbGxFbmQgLSB0aGlzLl9mYWxsQmVnaW4pO1xuXG4gICAgcmVzLmZyZWVmYWxsID0ge1xuICAgICAgYWNjTm9ybTogdGhpcy5fYWNjTm9ybSxcbiAgICAgIGZhbGxpbmc6IHRoaXMuX2lzRmFsbGluZyxcbiAgICAgIGR1cmF0aW9uOiB0aGlzLl9mYWxsRHVyYXRpb25cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBraWNrXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlS2ljayhyZXMpIHtcbiAgICB0aGlzLl9pMyA9IHRoaXMuX2xvb3BJbmRleCAlIHRoaXMuX3BhcmFtcy5raWNrTWVkaWFuRmlsdGVyc2l6ZTtcbiAgICB0aGlzLl9pMSA9IHRoaXMuX21lZGlhbkZpZm9bdGhpcy5faTNdO1xuICAgIHRoaXMuX2kyID0gMTtcblxuICAgIGlmICh0aGlzLl9pMSA8IHRoaXMuX3BhcmFtcy5raWNrTWVkaWFuRmlsdGVyc2l6ZSAmJlxuICAgICAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID4gdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdKSB7XG4gICAgICAvLyBjaGVjayByaWdodFxuICAgICAgd2hpbGUgKHRoaXMuX2kxICsgdGhpcy5faTIgPCB0aGlzLmtpY2tNZWRpYW5GaWx0ZXJzaXplICYmXG4gICAgICAgICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPiB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl0pIHtcbiAgICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdXSA9IFxuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl1dIC0gMTtcbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9pMisrO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9IHRoaXMuX2kzO1xuICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM10gPSB0aGlzLl9pMSArIHRoaXMuX2kyIC0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY2hlY2sgbGVmdFxuICAgICAgd2hpbGUgKHRoaXMuX2kyIDwgdGhpcy5faTEgKyAxICYmXG4gICAgICAgICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA8IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyXSkge1xuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl1dID1cbiAgICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdXSArIDE7XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMl07XG4gICAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID1cbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5faTIrKztcbiAgICAgIH1cbiAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPSB0aGlzLl9pMztcbiAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5faTNdID0gdGhpcy5faTEgLSB0aGlzLl9pMiArIDE7XG4gICAgfVxuXG4gICAgLy8gY29tcGFyZSBjdXJyZW50IGludGVuc2l0eSBub3JtIHdpdGggcHJldmlvdXMgbWVkaWFuIHZhbHVlXG4gICAgaWYgKHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gLSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID4gdGhpcy5fcGFyYW1zLmtpY2tUaHJlc2gpIHtcbiAgICAgIGlmICh0aGlzLl9pc0tpY2tpbmcpIHtcbiAgICAgICAgaWYgKHRoaXMuX2tpY2tJbnRlbnNpdHkgPCB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtKSB7XG4gICAgICAgICAgdGhpcy5fa2lja0ludGVuc2l0eSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2lzS2lja2luZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX2tpY2tJbnRlbnNpdHkgPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgICB0aGlzLl9sYXN0S2ljayA9IHRoaXMuX2VsYXBzZWRUaW1lO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5fZWxhcHNlZFRpbWUgLSB0aGlzLl9sYXN0S2ljayA+IHRoaXMuX3BhcmFtcy5raWNrU3BlZWRHYXRlKSB7XG4gICAgICAgIHRoaXMuX2lzS2lja2luZyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4gPSB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5fcGFyYW1zLmtpY2tNZWRpYW5GaWx0ZXJzaXplXTtcblxuICAgIHJlcy5raWNrID0ge1xuICAgICAgaW50ZW5zaXR5OiB0aGlzLl9raWNrSW50ZW5zaXR5LFxuICAgICAga2lja2luZzogdGhpcy5faXNLaWNraW5nXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzaGFrZVxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZVNoYWtlKHJlcykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB0aGlzLl9hY2NEZWx0YVtpXSA9IHRoaXMuX2RlbHRhKFxuICAgICAgICB0aGlzLl9hY2NMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLFxuICAgICAgICB0aGlzLmFjY1tpXSxcbiAgICAgICAgMVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgaWYgKHRoaXMuX3NoYWtlV2luZG93W2ldW3RoaXMuX2xvb3BJbmRleCAlIHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemVdKSB7XG4gICAgICAgIHRoaXMuX3NoYWtlTmJbaV0tLTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9hY2NEZWx0YVtpXSA+IHRoaXMuX3BhcmFtcy5zaGFrZVRocmVzaCkge1xuICAgICAgICB0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSB0aGlzLl9wYXJhbXMuc2hha2VXaW5kb3dTaXplXSA9IDE7XG4gICAgICAgIHRoaXMuX3NoYWtlTmJbaV0rKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3NoYWtlV2luZG93W2ldW3RoaXMuX2xvb3BJbmRleCAlIHRoaXMuX3BhcmFtcy5zaGFrZVdpbmRvd1NpemVdID0gMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9zaGFraW5nUmF3ID1cbiAgICB0aGlzLl9tYWduaXR1ZGUzRCh0aGlzLl9zaGFrZU5iKSAvXG4gICAgdGhpcy5fcGFyYW1zLnNoYWtlV2luZG93U2l6ZTtcbiAgICB0aGlzLl9zaGFrZVNsaWRlUHJldiA9IHRoaXMuX3NoYWtpbmc7XG4gICAgdGhpcy5fc2hha2luZyA9XG4gICAgdGhpcy5fc2xpZGUodGhpcy5fc2hha2VTbGlkZVByZXYsIHRoaXMuX3NoYWtpbmdSYXcsIHRoaXMuX3BhcmFtcy5zaGFrZVNsaWRlRmFjdG9yKTtcblxuICAgIHJlcy5zaGFrZSA9IHtcbiAgICAgIHNoYWtpbmc6IHRoaXMuX3NoYWtpbmdcbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzcGluXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlU3BpbihyZXMpIHtcbiAgICBpZiAodGhpcy5fZ3lyTm9ybSA+IHRoaXMuX3BhcmFtcy5zcGluVGhyZXNoKSB7XG4gICAgICBpZiAoIXRoaXMuX2lzU3Bpbm5pbmcpIHtcbiAgICAgICAgdGhpcy5faXNTcGlubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX3NwaW5CZWdpbiA9IHBlcmZOb3coKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3NwaW5FbmQgPSBwZXJmTm93KCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9pc1NwaW5uaW5nKSB7XG4gICAgICB0aGlzLl9pc1NwaW5uaW5nID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuX3NwaW5EdXJhdGlvbiA9IHRoaXMuX3NwaW5FbmQgLSB0aGlzLl9zcGluQmVnaW47XG5cbiAgICByZXMuc3BpbiA9IHtcbiAgICAgIHNwaW5uaW5nOiB0aGlzLl9pc1NwaW5uaW5nLFxuICAgICAgZHVyYXRpb246IHRoaXMuX3NwaW5EdXJhdGlvbixcbiAgICAgIGd5ck5vcm06IHRoaXMuX2d5ck5vcm1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHN0aWxsXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlU3RpbGwocmVzKSB7XG4gICAgdGhpcy5fc3RpbGxDcm9zc1Byb2QgPSB0aGlzLl9zdGlsbENyb3NzUHJvZHVjdCh0aGlzLmd5cik7XG4gICAgdGhpcy5fc3RpbGxTbGlkZVByZXYgPSB0aGlzLl9zdGlsbFNsaWRlO1xuICAgIHRoaXMuX3N0aWxsU2xpZGUgPSB0aGlzLl9zbGlkZShcbiAgICAgIHRoaXMuX3N0aWxsU2xpZGVQcmV2LFxuICAgICAgdGhpcy5fc3RpbGxDcm9zc1Byb2QsXG4gICAgICB0aGlzLl9wYXJhbXMuc3RpbGxTbGlkZUZhY3RvclxuICAgICk7XG5cbiAgICBpZiAodGhpcy5fc3RpbGxTbGlkZSA+IHRoaXMuX3BhcmFtcy5zdGlsbFRocmVzaCkge1xuICAgICAgdGhpcy5faXNTdGlsbCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9pc1N0aWxsID0gdHJ1ZTtcbiAgICB9XG4gIFxuICAgIHJlcy5zdGlsbCA9IHtcbiAgICAgIHN0aWxsOiB0aGlzLl9pc1N0aWxsLFxuICAgICAgc2xpZGU6IHRoaXMuX3N0aWxsU2xpZGVcbiAgICB9XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBVVElMSVRJRVMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuICAvKiogQHByaXZhdGUgKi9cbiAgX2RlbHRhKHByZXYsIG5leHQsIGR0KSB7XG4gICAgcmV0dXJuIChuZXh0IC0gcHJldikgLyAoMiAqIGR0KTtcbiAgfVxuXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfaW50ZW5zaXR5MUQobmV4dFgsIHByZXZYLCBwcmV2SW50ZW5zaXR5LCBwYXJhbTEsIHBhcmFtMiwgZHQpIHtcbiAgICBjb25zdCBkeCA9IHRoaXMuX2RlbHRhKG5leHRYLCBwcmV2WCwgZHQpOy8vKG5leHRYIC0gcHJldlgpIC8gKDIgKiBkdCk7XG4gICAgcmV0dXJuIHBhcmFtMiAqIGR4ICogZHggKyBwYXJhbTEgKiBwcmV2SW50ZW5zaXR5O1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF9tYWduaXR1ZGUzRCh4eXpBcnJheSkge1xuICAgIHJldHVybiBNYXRoLnNxcnQoeHl6QXJyYXlbMF0gKiB4eXpBcnJheVswXSArIFxuICAgICAgICAgICAgICAgIHh5ekFycmF5WzFdICogeHl6QXJyYXlbMV0gK1xuICAgICAgICAgICAgICAgIHh5ekFycmF5WzJdICogeHl6QXJyYXlbMl0pO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF9sY20oYSwgYikge1xuICAgIGxldCBhMSA9IGEsIGIxID0gYjtcblxuICAgIHdoaWxlIChhMSAhPSBiMSkge1xuICAgICAgaWYgKGExIDwgYjEpIHtcbiAgICAgICAgYTEgKz0gYTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGIxICs9IGI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGExO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF9zbGlkZShwcmV2U2xpZGUsIGN1cnJlbnRWYWwsIHNsaWRlRmFjdG9yKSB7XG4gICAgcmV0dXJuIHByZXZTbGlkZSArIChjdXJyZW50VmFsIC0gcHJldlNsaWRlKSAvIHNsaWRlRmFjdG9yO1xuICB9XG5cbiAgLyoqIEBwcml2YXRlICovXG4gIF9zdGlsbENyb3NzUHJvZHVjdCh4eXpBcnJheSkge1xuICAgIHJldHVybiAoeHl6QXJyYXlbMV0gLSB4eXpBcnJheVsyXSkgKiAoeHl6QXJyYXlbMV0gLSB4eXpBcnJheVsyXSkgK1xuICAgICAgICAgICAoeHl6QXJyYXlbMF0gLSB4eXpBcnJheVsxXSkgKiAoeHl6QXJyYXlbMF0gLSB4eXpBcnJheVsxXSkgK1xuICAgICAgICAgICAoeHl6QXJyYXlbMl0gLSB4eXpBcnJheVswXSkgKiAoeHl6QXJyYXlbMl0gLSB4eXpBcnJheVswXSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTW90aW9uRmVhdHVyZXM7XG5cbiJdfQ==
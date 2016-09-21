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

var _features = require('./features');

var _features2 = _interopRequireDefault(_features);

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
   * required descriptors
   */
  function MotionFeatures() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    (0, _classCallCheck3.default)(this, MotionFeatures);

    var defaults = {
      descriptors: ['accIntensity', 'gyrIntensity', 'freefall', 'kick', 'shake', 'spin', 'still']
    };
    this._params = (0, _assign2.default)({}, defaults, options);
    //console.log(this._params.descriptors);

    this._methods = {
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
    this._fallBegin = 0;
    this._fallEnd = 0;
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
    this._shakeWindow = [new Array(_features2.default.shakeWindowSize), new Array(_features2.default.shakeWindowSize), new Array(_features2.default.shakeWindowSize)];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < _features2.default.shakeWindowSize; j++) {
        this._shakeWindow[i][j] = 0;
      }
    }
    this._shakeNb = [0, 0, 0];
    this._shakingRaw = 0;
    this._shakeSlidePrev = 0;
    this._shaking = 0;

    //===================================================================== spin
    this._spinBegin = 0;
    this._spinEnd = 0;
    this._spinDuration = 0;
    this._isSpinning = false;

    //==================================================================== still
    this._stillCrossProd = 0;
    this._stillSlide = 0;
    this._stillSlidePrev = 0;
    this._isStill = false;

    this._loopIndexPeriod = _features2.default.lcm(_features2.default.lcm(_features2.default.lcm(2, 3), _features2.default.kickMedianFiltersize), _features2.default.shakeWindowSize);
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
    }

    //==========================================================================//
    //====================== specific descriptors computing ====================//
    //==========================================================================//

    //============================================================== acc intensity
    /** @private */

  }, {
    key: '_updateAccIntensity',
    value: function _updateAccIntensity(res) {
      this._accIntensityNorm = 0;

      for (var i = 0; i < 3; i++) {
        this._accLast[i][this._loopIndex % 3] = this.acc[i];

        this._accIntensity[i] = _features2.default.intensity1D(this.acc[i], this._accLast[i][(this._loopIndex + 1) % 3], this._accIntensityLast[i][(this._loopIndex + 1) % 2], _features2.default.accIntensityParam1, _features2.default.accIntensityParam2, 1);

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

        this._gyrIntensity[i] = _features2.default.intensity1D(this.gyr[i], this._gyrLast[i][(this._loopIndex + 1) % 3], this._gyrIntensityLast[i][(this._loopIndex + 1) % 2], _features2.default.gyrIntensityParam1, _features2.default.gyrIntensityParam2, 1);

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
      this._accNorm = _features2.default.magnitude3D(this.acc);
      this._gyrNorm = _features2.default.magnitude3D(this.gyr);

      for (var i = 0; i < 3; i++) {
        this._gyrDelta[i] = _features2.default.delta(this._gyrLast[i][(this._loopIndex + 1) % 3], this.gyr[i], 1);
      }

      this._gyrDeltaNorm = _features2.default.magnitude3D(this._gyrDelta);

      if (this._accNorm < _features2.default.freefallAccThresh || this._gyrNorm > _features2.default.freefallGyrThresh && this._gyrDeltaNorm < _features2.default.freefallGyrDeltaThresh) {
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
      this._i3 = this._loopIndex % _features2.default.kickMedianFiltersize;
      this._i1 = this._medianFifo[this._i3];
      this._i2 = 1;

      if (this._i1 < _features2.default.kickMedianFiltersize && this._accIntensityNorm > this._medianValues[this._i1 + this._i2]) {
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
      if (this._accIntensityNorm - this._accIntensityNormMedian > _features2.default.kickThresh) {
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
        if (this._elapsedTime - this._lastKick > _features2.default.kickSpeedGate) {
          this._isKicking = false;
        }
      }

      this._accIntensityNormMedian = this._medianValues[_features2.default.kickMedianFiltersize];

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
        this._accDelta[i] = _features2.default.delta(this._accLast[i][(this._loopIndex + 1) % 3], this.acc[i], 1);
      }

      for (var _i = 0; _i < 3; _i++) {
        if (this._shakeWindow[_i][this._loopIndex % _features2.default.shakeWindowSize]) {
          this._shakeNb[_i]--;
        }
        if (this._accDelta[_i] > _features2.default.shakeThresh) {
          this._shakeWindow[_i][this._loopIndex % _features2.default.shakeWindowSize] = 1;
          this._shakeNb[_i]++;
        } else {
          this._shakeWindow[_i][this._loopIndex % _features2.default.shakeWindowSize] = 0;
        }
      }

      this._shakingRaw = _features2.default.magnitude3D(this._shakeNb) / _features2.default.shakeWindowSize;
      this._shakeSlidePrev = this._shaking;
      this._shaking = _features2.default.slide(this._shakeSlidePrev, this._shakingRaw, _features2.default.shakeSlideFactor);

      res.shake = {
        shaking: this._shaking
      };
    }

    //======================================================================= spin
    /** @private */

  }, {
    key: '_updateSpin',
    value: function _updateSpin(res) {
      if (this._gyrNorm > _features2.default.spinThreshold) {
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
      this._stillCrossProd = _features2.default.stillCrossProduct(this.gyr);
      this._stillSlidePrev = this._stillSlide;
      this._stillSlide = _features2.default.slide(this._stillSlidePrev, this._stillCrossProd, _features2.default.stillSlideFactor);

      if (this._stillSlide > _features2.default.stillThresh) {
        this._isStill = false;
      } else {
        this._isStill = true;
      }

      res.still = {
        still: this._isStill,
        slide: this._stillSlide
      };
    }
  }]);
  return MotionFeatures;
}();

exports.default = MotionFeatures;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbImdldFRpbWVGdW5jdGlvbiIsIndpbmRvdyIsInQiLCJwcm9jZXNzIiwiaHJ0aW1lIiwicGVyZm9ybWFuY2UiLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInBlcmZOb3ciLCJNb3Rpb25GZWF0dXJlcyIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsImRlc2NyaXB0b3JzIiwiX3BhcmFtcyIsIl9tZXRob2RzIiwiYWNjSW50ZW5zaXR5IiwiX3VwZGF0ZUFjY0ludGVuc2l0eSIsImJpbmQiLCJneXJJbnRlbnNpdHkiLCJfdXBkYXRlR3lySW50ZW5zaXR5IiwiZnJlZWZhbGwiLCJfdXBkYXRlRnJlZWZhbGwiLCJraWNrIiwiX3VwZGF0ZUtpY2siLCJzaGFrZSIsIl91cGRhdGVTaGFrZSIsInNwaW4iLCJfdXBkYXRlU3BpbiIsInN0aWxsIiwiX3VwZGF0ZVN0aWxsIiwiYWNjIiwiZ3lyIiwiX2FjY0xhc3QiLCJfYWNjSW50ZW5zaXR5TGFzdCIsIl9hY2NJbnRlbnNpdHkiLCJfYWNjSW50ZW5zaXR5Tm9ybSIsIl9hY2NOb3JtIiwiX2d5ckRlbHRhIiwiX2d5ck5vcm0iLCJfZ3lyRGVsdGFOb3JtIiwiX2ZhbGxCZWdpbiIsIl9mYWxsRW5kIiwiX2ZhbGxEdXJhdGlvbiIsIl9pc0ZhbGxpbmciLCJfZ3lyTGFzdCIsIl9neXJJbnRlbnNpdHlMYXN0IiwiX2d5ckludGVuc2l0eSIsIl9neXJJbnRlbnNpdHlOb3JtIiwiX2tpY2tJbnRlbnNpdHkiLCJfbGFzdEtpY2siLCJfaXNLaWNraW5nIiwiX21lZGlhblZhbHVlcyIsIl9tZWRpYW5MaW5raW5nIiwiX21lZGlhbkZpZm8iLCJfaTEiLCJfaTIiLCJfaTMiLCJfYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiIsIl9hY2NEZWx0YSIsIl9zaGFrZVdpbmRvdyIsIkFycmF5Iiwic2hha2VXaW5kb3dTaXplIiwiaSIsImoiLCJfc2hha2VOYiIsIl9zaGFraW5nUmF3IiwiX3NoYWtlU2xpZGVQcmV2IiwiX3NoYWtpbmciLCJfc3BpbkJlZ2luIiwiX3NwaW5FbmQiLCJfc3BpbkR1cmF0aW9uIiwiX2lzU3Bpbm5pbmciLCJfc3RpbGxDcm9zc1Byb2QiLCJfc3RpbGxTbGlkZSIsIl9zdGlsbFNsaWRlUHJldiIsIl9pc1N0aWxsIiwiX2xvb3BJbmRleFBlcmlvZCIsImxjbSIsImtpY2tNZWRpYW5GaWx0ZXJzaXplIiwiX2xvb3BJbmRleCIsIngiLCJ5IiwieiIsImNhbGxiYWNrIiwiX2VsYXBzZWRUaW1lIiwiZXJyIiwicmVzIiwia2V5IiwiZSIsImludGVuc2l0eTFEIiwiYWNjSW50ZW5zaXR5UGFyYW0xIiwiYWNjSW50ZW5zaXR5UGFyYW0yIiwibm9ybSIsImd5ckludGVuc2l0eVBhcmFtMSIsImd5ckludGVuc2l0eVBhcmFtMiIsIm1hZ25pdHVkZTNEIiwiZGVsdGEiLCJmcmVlZmFsbEFjY1RocmVzaCIsImZyZWVmYWxsR3lyVGhyZXNoIiwiZnJlZWZhbGxHeXJEZWx0YVRocmVzaCIsImFjY05vcm0iLCJmYWxsaW5nIiwiZHVyYXRpb24iLCJraWNrVGhyZXNoIiwia2lja1NwZWVkR2F0ZSIsImludGVuc2l0eSIsImtpY2tpbmciLCJzaGFrZVRocmVzaCIsInNsaWRlIiwic2hha2VTbGlkZUZhY3RvciIsInNoYWtpbmciLCJzcGluVGhyZXNob2xkIiwic3Bpbm5pbmciLCJneXJOb3JtIiwic3RpbGxDcm9zc1Byb2R1Y3QiLCJzdGlsbFNsaWRlRmFjdG9yIiwic3RpbGxUaHJlc2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7O0FBRUE7Ozs7Ozs7OztBQVNBLFNBQVNBLGVBQVQsR0FBMkI7QUFDekIsTUFBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQUU7QUFDbkMsV0FBTyxZQUFNO0FBQ1gsVUFBTUMsSUFBSUMsUUFBUUMsTUFBUixFQUFWO0FBQ0EsYUFBT0YsRUFBRSxDQUFGLElBQU9BLEVBQUUsQ0FBRixJQUFPLElBQXJCO0FBQ0QsS0FIRDtBQUlELEdB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QixJQUFuQjtBQUNBLGVBQUtILFVBQUwsR0FBa0I1RCxTQUFsQjtBQUNEO0FBQ0QsYUFBSzZELFFBQUwsR0FBZ0I3RCxTQUFoQjtBQUNELE9BTkQsTUFNTyxJQUFJLEtBQUsrRCxXQUFULEVBQXNCO0FBQzNCLGFBQUtBLFdBQUwsR0FBbUIsS0FBbkI7QUFDRDtBQUNELFdBQUtELGFBQUwsR0FBcUIsS0FBS0QsUUFBTCxHQUFnQixLQUFLRCxVQUExQzs7QUFFQWtCLFVBQUk1RCxJQUFKLEdBQVc7QUFDVHNGLGtCQUFVLEtBQUt6QyxXQUROO0FBRVQrQixrQkFBVSxLQUFLaEMsYUFGTjtBQUdUMkMsaUJBQVMsS0FBSzNFO0FBSEwsT0FBWDtBQUtEOztBQUVEO0FBQ0E7Ozs7aUNBQ2FnRCxHLEVBQUs7QUFDaEIsV0FBS2QsZUFBTCxHQUF1QixtQkFBRTBDLGlCQUFGLENBQW9CLEtBQUtuRixHQUF6QixDQUF2QjtBQUNBLFdBQUsyQyxlQUFMLEdBQXVCLEtBQUtELFdBQTVCO0FBQ0EsV0FBS0EsV0FBTCxHQUFtQixtQkFBRW1DLEtBQUYsQ0FDakIsS0FBS2xDLGVBRFksRUFFakIsS0FBS0YsZUFGWSxFQUdqQixtQkFBRTJDLGdCQUhlLENBQW5COztBQU1BLFVBQUksS0FBSzFDLFdBQUwsR0FBbUIsbUJBQUUyQyxXQUF6QixFQUFzQztBQUNwQyxhQUFLekMsUUFBTCxHQUFnQixLQUFoQjtBQUNELE9BRkQsTUFFTztBQUNMLGFBQUtBLFFBQUwsR0FBZ0IsSUFBaEI7QUFDRDs7QUFFRFcsVUFBSTFELEtBQUosR0FBWTtBQUNWQSxlQUFPLEtBQUsrQyxRQURGO0FBRVZpQyxlQUFPLEtBQUtuQztBQUZGLE9BQVo7QUFJRDs7Ozs7a0JBR1loRSxjIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGYgZnJvbSAnLi9mZWF0dXJlcyc7XG5cbi8qKlxuICogQ3JlYXRlIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRpbWUgaW4gc2Vjb25kcyBhY2NvcmRpbmcgdG8gdGhlIGN1cnJlbnRcbiAqIGVudmlyb25uZW1lbnQgKG5vZGUgb3IgYnJvd3NlcikuXG4gKiBJZiBydW5uaW5nIGluIG5vZGUgdGhlIHRpbWUgcmVseSBvbiBgcHJvY2Vzcy5ocnRpbWVgLCB3aGlsZSBpZiBpbiB0aGUgYnJvd3NlclxuICogaXQgaXMgcHJvdmlkZWQgYnkgdGhlIGBEYXRlYCBvYmplY3QuXG4gKlxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBnZXRUaW1lRnVuY3Rpb24oKSB7XG4gIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykgeyAvLyBhc3N1bWUgbm9kZVxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBjb25zdCB0ID0gcHJvY2Vzcy5ocnRpbWUoKTtcbiAgICAgIHJldHVybiB0WzBdICsgdFsxXSAqIDFlLTk7XG4gICAgfVxuICB9IGVsc2UgeyAvLyBicm93c2VyXG4gICAgaWYgKHdpbmRvdy5wZXJmb3JtYW5jZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGlmIChEYXRlLm5vdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuICgpID0+IG5ldyBEYXRlLmdldFRpbWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoKSA9PiBEYXRlLm5vdygpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKCkgPT4gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBwZXJmTm93ID0gZ2V0VGltZUZ1bmN0aW9uKCk7XG5cbi8qKlxuICogQHRvZG8gdHlwZWRlZiBjb25zdHJ1Y3RvciBhcmd1bWVudFxuICovXG5cbi8qKlxuICogQ2xhc3MgY29tcHV0aW5nIHRoZSBkZXNjcmlwdG9ycyBmcm9tIGFjY2VsZXJvbWV0ZXIgYW5kIGd5cm9zY29wZSBkYXRhLlxuICogPGJyIC8+XG4gKiBFeGFtcGxlIDpcbiAqIGBgYEphdmFTY3JpcHRcbiAqIC8vIGVzNiA6XG4gKiBpbXBvcnQgTW90aW9uRmVhdHVyZXMgZnJvbSAnbW90aW9uLWZlYXR1cmVzJzsgXG4gKiBjb25zdCBtZiA9IG5ldyBNb3Rpb25GZWF0dXJlcyh7IGRlc2NyaXB0b3JzOiBbJ2FjY0ludGVuc2l0eScsICdraWNrJ10gfSk7XG4gKiBgYGBcbiAqIEBjbGFzc1xuICovXG5jbGFzcyBNb3Rpb25GZWF0dXJlcyB7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpbml0T2JqZWN0IC0gb2JqZWN0IGNvbnRhaW5pbmcgYW4gYXJyYXkgb2YgdGhlXG4gICAqIHJlcXVpcmVkIGRlc2NyaXB0b3JzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgIGRlc2NyaXB0b3JzOiBbXG4gICAgICAgICdhY2NJbnRlbnNpdHknLFxuICAgICAgICAnZ3lySW50ZW5zaXR5JyxcbiAgICAgICAgJ2ZyZWVmYWxsJyxcbiAgICAgICAgJ2tpY2snLFxuICAgICAgICAnc2hha2UnLFxuICAgICAgICAnc3BpbicsXG4gICAgICAgICdzdGlsbCdcbiAgICAgIF1cbiAgICB9O1xuICAgIHRoaXMuX3BhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICAvL2NvbnNvbGUubG9nKHRoaXMuX3BhcmFtcy5kZXNjcmlwdG9ycyk7XG5cbiAgICB0aGlzLl9tZXRob2RzID0ge1xuICAgICAgYWNjSW50ZW5zaXR5OiB0aGlzLl91cGRhdGVBY2NJbnRlbnNpdHkuYmluZCh0aGlzKSxcbiAgICAgIGd5ckludGVuc2l0eTogdGhpcy5fdXBkYXRlR3lySW50ZW5zaXR5LmJpbmQodGhpcyksXG4gICAgICBmcmVlZmFsbDogdGhpcy5fdXBkYXRlRnJlZWZhbGwuYmluZCh0aGlzKSxcbiAgICAgIGtpY2s6IHRoaXMuX3VwZGF0ZUtpY2suYmluZCh0aGlzKSxcbiAgICAgIHNoYWtlOiB0aGlzLl91cGRhdGVTaGFrZS5iaW5kKHRoaXMpLFxuICAgICAgc3BpbjogdGhpcy5fdXBkYXRlU3Bpbi5iaW5kKHRoaXMpLFxuICAgICAgc3RpbGw6IHRoaXMuX3VwZGF0ZVN0aWxsLmJpbmQodGhpcylcbiAgICB9O1xuXG4gICAgdGhpcy5hY2MgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5neXIgPSBbMCwgMCwgMF07XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBhY2MgaW50ZW5zaXR5XG4gICAgdGhpcy5fYWNjTGFzdCA9IFtcbiAgICAgIFswLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwXSxcbiAgICAgIFswLCAwLCAwXVxuICAgIF07XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5TGFzdCA9IFtcbiAgICAgIFswLCAwXSxcbiAgICAgIFswLCAwXSxcbiAgICAgIFswLCAwXVxuICAgIF07XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5ID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBmcmVlZmFsbFxuICAgIHRoaXMuX2FjY05vcm0gPSAwO1xuICAgIHRoaXMuX2d5ckRlbHRhID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX2d5ck5vcm0gPSAwO1xuICAgIHRoaXMuX2d5ckRlbHRhTm9ybSA9IDA7XG4gICAgdGhpcy5fZmFsbEJlZ2luID0gMDtcbiAgICB0aGlzLl9mYWxsRW5kID0gMDtcbiAgICB0aGlzLl9mYWxsRHVyYXRpb24gPSAwO1xuICAgIHRoaXMuX2lzRmFsbGluZyA9IGZhbHNlO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZ3lyIGludGVuc2l0eVxuICAgIHRoaXMuX2d5ckxhc3QgPSBbXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3QgPSBbXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2d5ckludGVuc2l0eSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHlOb3JtID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGtpY2tcbiAgICB0aGlzLl9raWNrSW50ZW5zaXR5ID0gMDtcbiAgICB0aGlzLl9sYXN0S2ljayA9IDA7XG4gICAgdGhpcy5faXNLaWNraW5nID0gZmFsc2U7XG4gICAgdGhpcy5fbWVkaWFuVmFsdWVzID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xuICAgIHRoaXMuX21lZGlhbkxpbmtpbmcgPSBbMywgNCwgMSwgNSwgNywgOCwgMCwgMiwgNl07XG4gICAgdGhpcy5fbWVkaWFuRmlmbyA9IFs2LCAyLCA3LCAwLCAxLCAzLCA4LCA0LCA1XTtcbiAgICB0aGlzLl9pMSA9IDA7XG4gICAgdGhpcy5faTIgPSAwO1xuICAgIHRoaXMuX2kzID0gMDtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc2hha2VcbiAgICB0aGlzLl9hY2NEZWx0YSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9zaGFrZVdpbmRvdyA9IFtcbiAgICAgIG5ldyBBcnJheShmLnNoYWtlV2luZG93U2l6ZSksXG4gICAgICBuZXcgQXJyYXkoZi5zaGFrZVdpbmRvd1NpemUpLFxuICAgICAgbmV3IEFycmF5KGYuc2hha2VXaW5kb3dTaXplKVxuICAgIF07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZi5zaGFrZVdpbmRvd1NpemU7IGorKykge1xuICAgICAgICB0aGlzLl9zaGFrZVdpbmRvd1tpXVtqXSA9IDA7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3NoYWtlTmIgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fc2hha2luZ1JhdyA9IDA7XG4gICAgdGhpcy5fc2hha2VTbGlkZVByZXYgPSAwO1xuICAgIHRoaXMuX3NoYWtpbmcgPSAwO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc3BpblxuICAgIHRoaXMuX3NwaW5CZWdpbiA9IDA7XG4gICAgdGhpcy5fc3BpbkVuZCA9IDA7XG4gICAgdGhpcy5fc3BpbkR1cmF0aW9uID0gMDtcbiAgICB0aGlzLl9pc1NwaW5uaW5nID0gZmFsc2U7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHN0aWxsXG4gICAgdGhpcy5fc3RpbGxDcm9zc1Byb2QgPSAwO1xuICAgIHRoaXMuX3N0aWxsU2xpZGUgPSAwO1xuICAgIHRoaXMuX3N0aWxsU2xpZGVQcmV2ID0gMDtcbiAgICB0aGlzLl9pc1N0aWxsID0gZmFsc2U7XG5cbiAgICB0aGlzLl9sb29wSW5kZXhQZXJpb2QgPSBmLmxjbShcbiAgICAgIGYubGNtKFxuICAgICAgICBmLmxjbSgyLCAzKSwgZi5raWNrTWVkaWFuRmlsdGVyc2l6ZVxuICAgICAgKSxcbiAgICAgIGYuc2hha2VXaW5kb3dTaXplXG4gICAgKTtcbiAgICB0aGlzLl9sb29wSW5kZXggPSAwO1xuICB9XG5cbiAgLy89PT09PT09PT09IGludGVyZmFjZSA9PT09PT09PT0vL1xuXG4gIC8qKlxuICAgKiBzU2V0cyB0aGUgY3VycmVudCBhY2NlbGVyb21ldGVyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHggLSB0aGUgYWNjZWxlcm9tZXRlcidzIHggdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHkgLSB0aGUgYWNjZWxlcm9tZXRlcidzIHkgdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHogLSB0aGUgYWNjZWxlcm9tZXRlcidzIHogdmFsdWVcbiAgICovXG4gIHNldEFjY2VsZXJvbWV0ZXIoeCwgeSwgeikge1xuICAgIHRoaXMuYWNjWzBdID0geDtcbiAgICB0aGlzLmFjY1sxXSA9IHk7XG4gICAgdGhpcy5hY2NbMl0gPSB6XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBneXJvc2NvcGUgdmFsdWVzLlxuICAgKiBAcGFyYW0ge051bWJlcn0geCAtIHRoZSBneXJvc2NvcGUncyB4IHZhbHVlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB5IC0gdGhlIGd5cm9zY29wZSdzIHkgdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHogLSB0aGUgZ3lyb3Njb3BlJ3MgeiB2YWx1ZVxuICAgKi9cbiAgc2V0R3lyb3Njb3BlKHgsIHksIHopIHtcbiAgICB0aGlzLmd5clswXSA9IHg7XG4gICAgdGhpcy5neXJbMV0gPSB5O1xuICAgIHRoaXMuZ3lyWzJdID0gelxuICB9XG5cbiAgLyoqXG4gICAqIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGFuIGFjY2VsZXJvbWV0ZXIuXG4gICAqIEB0eXBlZGVmIGFjY0ludGVuc2l0eVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gbm9ybSAtIHRoZSBnbG9iYWwgZW5lcmd5IGNvbXB1dGVkIG9uIGFsbCBkaW1lbnNpb25zLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geCAtIHRoZSBlbmVyZ3kgaW4gdGhlIHggKGZpcnN0KSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB5IC0gdGhlIGVuZXJneSBpbiB0aGUgeSAoc2Vjb25kKSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB6IC0gdGhlIGVuZXJneSBpbiB0aGUgeiAodGhpcmQpIGRpbWVuc2lvbi5cbiAgICovXG5cbiAgLyoqXG4gICAqIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGEgZ3lyb3Njb3BlLlxuICAgKiBAdHlwZWRlZiBneXJJbnRlbnNpdHlcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IG5vcm0gLSB0aGUgZ2xvYmFsIGVuZXJneSBjb21wdXRlZCBvbiBhbGwgZGltZW5zaW9ucy5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHggLSB0aGUgZW5lcmd5IGluIHRoZSB4IChmaXJzdCkgZGltZW5zaW9uLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geSAtIHRoZSBlbmVyZ3kgaW4gdGhlIHkgKHNlY29uZCkgZGltZW5zaW9uLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geiAtIHRoZSBlbmVyZ3kgaW4gdGhlIHogKHRoaXJkKSBkaW1lbnNpb24uXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZnJlZSBmYWxsaW5nIHN0YXRlIG9mIHRoZSBzZW5zb3IuXG4gICAqIEB0eXBlZGVmIGZyZWVmYWxsXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBhY2NOb3JtIC0gdGhlIG5vcm0gb2YgdGhlIGFjY2VsZXJhdGlvbi5cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBmYWxsaW5nIC0gdHJ1ZSBpZiB0aGUgc2Vuc29yIGlzIGZyZWUgZmFsbGluZywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gZHVyYXRpb24gLSB0aGUgZHVyYXRpb24gb2YgdGhlIGZyZWUgZmFsbGluZyBzaW5jZSBpdHMgYmVnaW5uaW5nLlxuICAgKi9cblxuICAvKipcbiAgICogSW1wdWxzZSAvIGhpdCBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEB0eXBlZGVmIGtpY2tcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGludGVuc2l0eSAtIHRoZSBjdXJyZW50IGludGVuc2l0eSBvZiB0aGUgXCJraWNrXCIgZ2VzdHVyZS5cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBraWNraW5nIC0gdHJ1ZSBpZiBhIFwia2lja1wiIGdlc3R1cmUgaXMgYmVpbmcgZGV0ZWN0ZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG5cbiAgLyoqXG4gICAqIFNoYWtlIG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHR5cGVkZWYgc2hha2VcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHNoYWtpbmcgLSB0aGUgY3VycmVudCBhbW91bnQgb2YgXCJzaGFraW5lc3NcIi5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzcGlubmluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAdHlwZWRlZiBzcGluXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gc3Bpbm5pbmcgLSB0cnVlIGlmIHRoZSBzZW5zb3IgaXMgc3Bpbm5pbmcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGR1cmF0aW9uIC0gdGhlIGR1cmF0aW9uIG9mIHRoZSBzcGlubmluZyBzaW5jZSBpdHMgYmVnaW5uaW5nLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gZ3lyTm9ybSAtIHRoZSBub3JtIG9mIHRoZSByb3RhdGlvbiBzcGVlZC5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzdGlsbG5lc3Mgb2YgdGhlIHNlbnNvci5cbiAgICogQHR5cGVkZWYgc3RpbGxcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBzdGlsbCAtIHRydWUgaWYgdGhlIHNlbnNvciBpcyBzdGlsbCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gc2xpZGUgLSB0aGUgb3JpZ2luYWwgdmFsdWUgdGhyZXNob2xkZWQgdG8gZGV0ZXJtaW5lIHN0aWxsbmVzcy5cbiAgICovXG5cbiAgLyoqXG4gICAqIENvbXB1dGVkIGRlc2NyaXB0b3JzLlxuICAgKiBAdHlwZWRlZiBkZXNjcmlwdG9yc1xuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge2FjY0ludGVuc2l0eX0gYWNjSW50ZW5zaXR5IC0gSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYW4gYWNjZWxlcm9tZXRlci5cbiAgICogQHByb3BlcnR5IHtneXJJbnRlbnNpdHl9IGd5ckludGVuc2l0eSAtIEludGVuc2l0eSBvZiB0aGUgbW92ZW1lbnQgc2Vuc2VkIGJ5IGEgZ3lyb3Njb3BlLlxuICAgKiBAcHJvcGVydHkge2ZyZWVmYWxsfSBmcmVlZmFsbCAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBmcmVlIGZhbGxpbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHByb3BlcnR5IHtraWNrfSBraWNrIC0gSW1wdWxzZSAvIGhpdCBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEBwcm9wZXJ0eSB7c2hha2V9IHNoYWtlIC0gU2hha2UgbW92ZW1lbnQgZGV0ZWN0aW9uIGluZm9ybWF0aW9uLlxuICAgKiBAcHJvcGVydHkge3NwaW59IHNwaW4gLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgc3Bpbm5pbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHByb3BlcnR5IHtzdGlsbH0gc3RpbGwgLSBJbmZvcm1hdGlvbiBhYm91dCB0aGUgc3RpbGxuZXNzIG9mIHRoZSBzZW5zb3IuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBoYW5kbGluZyB0aGUgZGVzY3JpcHRvcnMuXG4gICAqIEBjYWxsYmFjayBmZWF0dXJlc0NhbGxiYWNrXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlcnIgLSBEZXNjcmlwdGlvbiBvZiBhIHBvdGVudGlhbCBlcnJvci5cbiAgICogQHBhcmFtIHtkZXNjcmlwdG9yc30gcmVzIC0gT2JqZWN0IGhvbGRpbmcgdGhlIGRlc2NyaXB0b3IgdmFsdWVzLlxuICAgKi9cblxuICAvKipcbiAgICogdHJpZ2dlcnMgY29tcHV0YXRpb24gb2YgdGhlIGRlc2NyaXB0b3JzIGZyb20gdGhlIGN1cnJlbnQgc2Vuc29yIHZhbHVlcyBhbmRcbiAgICogcGFzcyB0aGUgcmVzdWx0cyB0byBhIGNhbGxiYWNrXG4gICAqIEBwYXJhbSB7ZGVzY3JpcHRvcnNDYWxsYmFja30gY2FsbGJhY2sgLSB0aGUgY2FsbGJhY2sgaGFuZGxpbmcgdGhlIGxhc3QgY29tcHV0ZWQgZGVzY3JpcHRvcnNcbiAgICovXG4gIHVwZGF0ZShjYWxsYmFjaykge1xuICAgIC8vIERFQUwgV0lUSCB0aGlzLl9lbGFwc2VkVGltZVxuICAgIHRoaXMuX2VsYXBzZWRUaW1lID0gcGVyZk5vdygpO1xuICAgIFxuICAgIGxldCBlcnIgPSBudWxsO1xuICAgIGxldCByZXMgPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICByZXMgPSB7fTtcbiAgICAgIGZvciAobGV0IGtleSBvZiB0aGlzLl9wYXJhbXMuZGVzY3JpcHRvcnMpIHtcbiAgICAgICAgaWYgKHRoaXMuX21ldGhvZHNba2V5XSkge1xuICAgICAgICAgIHRoaXMuX21ldGhvZHNba2V5XShyZXMpO1xuICAgICAgICB9XG4gICAgICB9IFxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGVyciA9IGU7XG4gICAgfVxuICAgIGNhbGxiYWNrKGVyciwgcmVzKTtcblxuICAgIHRoaXMuX2xvb3BJbmRleCA9ICh0aGlzLl9sb29wSW5kZXggKyAxKSAlIHRoaXMuX2xvb3BJbmRleFBlcmlvZDtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT0gc3BlY2lmaWMgZGVzY3JpcHRvcnMgY29tcHV0aW5nID09PT09PT09PT09PT09PT09PT09Ly9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBhY2MgaW50ZW5zaXR5XG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlQWNjSW50ZW5zaXR5KHJlcykge1xuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2FjY0xhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmFjY1tpXTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5W2ldID0gZi5pbnRlbnNpdHkxRChcbiAgICAgICAgdGhpcy5hY2NbaV0sXG4gICAgICAgIHRoaXMuX2FjY0xhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eUxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgMl0sXG4gICAgICAgIGYuYWNjSW50ZW5zaXR5UGFyYW0xLFxuICAgICAgICBmLmFjY0ludGVuc2l0eVBhcmFtMixcbiAgICAgICAgMVxuICAgICAgKTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSArPSB0aGlzLl9hY2NJbnRlbnNpdHlbaV07XG4gICAgfVxuXG4gICAgcmVzLmFjY0ludGVuc2l0eSA9IHtcbiAgICAgIG5vcm06IHRoaXMuX2FjY0ludGVuc2l0eU5vcm0sXG4gICAgICB4OiB0aGlzLl9hY2NJbnRlbnNpdHlbMF0sXG4gICAgICB5OiB0aGlzLl9hY2NJbnRlbnNpdHlbMV0sXG4gICAgICB6OiB0aGlzLl9hY2NJbnRlbnNpdHlbMl1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBneXIgaW50ZW5zaXR5XG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlR3lySW50ZW5zaXR5KHJlcykge1xuICAgIHRoaXMuX2d5ckludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2d5ckxhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmd5cltpXTtcblxuICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5W2ldID0gZi5pbnRlbnNpdHkxRChcbiAgICAgICAgdGhpcy5neXJbaV0sXG4gICAgICAgIHRoaXMuX2d5ckxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgMl0sXG4gICAgICAgIGYuZ3lySW50ZW5zaXR5UGFyYW0xLFxuICAgICAgICBmLmd5ckludGVuc2l0eVBhcmFtMixcbiAgICAgICAgMVxuICAgICAgKTtcblxuICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSArPSB0aGlzLl9neXJJbnRlbnNpdHlbaV07XG4gICAgfVxuXG4gICAgcmVzLmd5ckludGVuc2l0eSA9IHtcbiAgICAgIG5vcm06IHRoaXMuX2d5ckludGVuc2l0eU5vcm0sXG4gICAgICB4OiB0aGlzLl9neXJJbnRlbnNpdHlbMF0sXG4gICAgICB5OiB0aGlzLl9neXJJbnRlbnNpdHlbMV0sXG4gICAgICB6OiB0aGlzLl9neXJJbnRlbnNpdHlbMl1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGZyZWVmYWxsXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlRnJlZWZhbGwocmVzKSB7XG4gICAgdGhpcy5fYWNjTm9ybSA9IGYubWFnbml0dWRlM0QodGhpcy5hY2MpO1xuICAgIHRoaXMuX2d5ck5vcm0gPSBmLm1hZ25pdHVkZTNEKHRoaXMuZ3lyKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB0aGlzLl9neXJEZWx0YVtpXSA9XG4gICAgICAgIGYuZGVsdGEodGhpcy5fZ3lyTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSwgdGhpcy5neXJbaV0sIDEpO1xuICAgIH1cblxuICAgIHRoaXMuX2d5ckRlbHRhTm9ybSA9IGYubWFnbml0dWRlM0QodGhpcy5fZ3lyRGVsdGEpO1xuXG4gICAgaWYgKHRoaXMuX2FjY05vcm0gPCBmLmZyZWVmYWxsQWNjVGhyZXNoIHx8XG4gICAgICAgICh0aGlzLl9neXJOb3JtID4gZi5mcmVlZmFsbEd5clRocmVzaFxuICAgICAgICAgICYmIHRoaXMuX2d5ckRlbHRhTm9ybSA8IGYuZnJlZWZhbGxHeXJEZWx0YVRocmVzaCkpIHtcbiAgICAgIGlmICghdGhpcy5faXNGYWxsaW5nKSB7XG4gICAgICAgIHRoaXMuX2lzRmFsbGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX2ZhbGxCZWdpbiA9IHBlcmZOb3coKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2ZhbGxFbmQgPSBwZXJmTm93KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLl9pc0ZhbGxpbmcpIHtcbiAgICAgICAgdGhpcy5faXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2ZhbGxEdXJhdGlvbiA9ICh0aGlzLl9mYWxsRW5kIC0gdGhpcy5fZmFsbEJlZ2luKTtcblxuICAgIHJlcy5mcmVlZmFsbCA9IHtcbiAgICAgIGFjY05vcm06IHRoaXMuX2FjY05vcm0sXG4gICAgICBmYWxsaW5nOiB0aGlzLl9pc0ZhbGxpbmcsXG4gICAgICBkdXJhdGlvbjogdGhpcy5fZmFsbER1cmF0aW9uXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0ga2lja1xuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZUtpY2socmVzKSB7XG4gICAgdGhpcy5faTMgPSB0aGlzLl9sb29wSW5kZXggJSBmLmtpY2tNZWRpYW5GaWx0ZXJzaXplO1xuICAgIHRoaXMuX2kxID0gdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM107XG4gICAgdGhpcy5faTIgPSAxO1xuXG4gICAgaWYgKHRoaXMuX2kxIDwgZi5raWNrTWVkaWFuRmlsdGVyc2l6ZSAmJlxuICAgICAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID4gdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdKSB7XG4gICAgICAvLyBjaGVjayByaWdodFxuICAgICAgd2hpbGUgKHRoaXMuX2kxICsgdGhpcy5faTIgPCB0aGlzLmtpY2tNZWRpYW5GaWx0ZXJzaXplICYmXG4gICAgICAgICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPiB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl0pIHtcbiAgICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdXSA9IFxuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl1dIC0gMTtcbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9pMisrO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9IHRoaXMuX2kzO1xuICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM10gPSB0aGlzLl9pMSArIHRoaXMuX2kyIC0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY2hlY2sgbGVmdFxuICAgICAgd2hpbGUgKHRoaXMuX2kyIDwgdGhpcy5faTEgKyAxICYmXG4gICAgICAgICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA8IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyXSkge1xuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl1dID1cbiAgICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdXSArIDE7XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMl07XG4gICAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID1cbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5faTIrKztcbiAgICAgIH1cbiAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPSB0aGlzLl9pMztcbiAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5faTNdID0gdGhpcy5faTEgLSB0aGlzLl9pMiArIDE7XG4gICAgfVxuXG4gICAgLy8gY29tcGFyZSBjdXJyZW50IGludGVuc2l0eSBub3JtIHdpdGggcHJldmlvdXMgbWVkaWFuIHZhbHVlXG4gICAgaWYgKHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gLSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID4gZi5raWNrVGhyZXNoKSB7XG4gICAgICBpZiAodGhpcy5faXNLaWNraW5nKSB7XG4gICAgICAgIGlmICh0aGlzLl9raWNrSW50ZW5zaXR5IDwgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSkge1xuICAgICAgICAgIHRoaXMuX2tpY2tJbnRlbnNpdHkgPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9pc0tpY2tpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9raWNrSW50ZW5zaXR5ID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcbiAgICAgICAgdGhpcy5fbGFzdEtpY2sgPSB0aGlzLl9lbGFwc2VkVGltZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuX2VsYXBzZWRUaW1lIC0gdGhpcy5fbGFzdEtpY2sgPiBmLmtpY2tTcGVlZEdhdGUpIHtcbiAgICAgICAgdGhpcy5faXNLaWNraW5nID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA9IHRoaXMuX21lZGlhblZhbHVlc1tmLmtpY2tNZWRpYW5GaWx0ZXJzaXplXTtcblxuICAgIHJlcy5raWNrID0ge1xuICAgICAgaW50ZW5zaXR5OiB0aGlzLl9raWNrSW50ZW5zaXR5LFxuICAgICAga2lja2luZzogdGhpcy5faXNLaWNraW5nXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzaGFrZVxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZVNoYWtlKHJlcykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICB0aGlzLl9hY2NEZWx0YVtpXSA9IGYuZGVsdGEoXG4gICAgICAgIHRoaXMuX2FjY0xhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuYWNjW2ldLFxuICAgICAgICAxXG4gICAgICApO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgZi5zaGFrZVdpbmRvd1NpemVdKSB7XG4gICAgICAgIHRoaXMuX3NoYWtlTmJbaV0tLTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9hY2NEZWx0YVtpXSA+IGYuc2hha2VUaHJlc2gpIHtcbiAgICAgICAgdGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgZi5zaGFrZVdpbmRvd1NpemVdID0gMTtcbiAgICAgICAgdGhpcy5fc2hha2VOYltpXSsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgZi5zaGFrZVdpbmRvd1NpemVdID0gMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9zaGFraW5nUmF3ID1cbiAgICBmLm1hZ25pdHVkZTNEKHRoaXMuX3NoYWtlTmIpIC9cbiAgICBmLnNoYWtlV2luZG93U2l6ZTtcbiAgICB0aGlzLl9zaGFrZVNsaWRlUHJldiA9IHRoaXMuX3NoYWtpbmc7XG4gICAgdGhpcy5fc2hha2luZyA9XG4gICAgZi5zbGlkZSh0aGlzLl9zaGFrZVNsaWRlUHJldiwgdGhpcy5fc2hha2luZ1JhdywgZi5zaGFrZVNsaWRlRmFjdG9yKTtcblxuICAgIHJlcy5zaGFrZSA9IHtcbiAgICAgIHNoYWtpbmc6IHRoaXMuX3NoYWtpbmdcbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzcGluXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlU3BpbihyZXMpIHtcbiAgICBpZiAodGhpcy5fZ3lyTm9ybSA+IGYuc3BpblRocmVzaG9sZCkge1xuICAgICAgaWYgKCF0aGlzLl9pc1NwaW5uaW5nKSB7XG4gICAgICAgIHRoaXMuX2lzU3Bpbm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLl9zcGluQmVnaW4gPSBwZXJmTm93KCk7XG4gICAgICB9XG4gICAgICB0aGlzLl9zcGluRW5kID0gcGVyZk5vdygpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5faXNTcGlubmluZykge1xuICAgICAgdGhpcy5faXNTcGlubmluZyA9IGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLl9zcGluRHVyYXRpb24gPSB0aGlzLl9zcGluRW5kIC0gdGhpcy5fc3BpbkJlZ2luO1xuXG4gICAgcmVzLnNwaW4gPSB7XG4gICAgICBzcGlubmluZzogdGhpcy5faXNTcGlubmluZyxcbiAgICAgIGR1cmF0aW9uOiB0aGlzLl9zcGluRHVyYXRpb24sXG4gICAgICBneXJOb3JtOiB0aGlzLl9neXJOb3JtXG4gICAgfTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzdGlsbFxuICAvKiogQHByaXZhdGUgKi9cbiAgX3VwZGF0ZVN0aWxsKHJlcykge1xuICAgIHRoaXMuX3N0aWxsQ3Jvc3NQcm9kID0gZi5zdGlsbENyb3NzUHJvZHVjdCh0aGlzLmd5cik7XG4gICAgdGhpcy5fc3RpbGxTbGlkZVByZXYgPSB0aGlzLl9zdGlsbFNsaWRlO1xuICAgIHRoaXMuX3N0aWxsU2xpZGUgPSBmLnNsaWRlKFxuICAgICAgdGhpcy5fc3RpbGxTbGlkZVByZXYsXG4gICAgICB0aGlzLl9zdGlsbENyb3NzUHJvZCxcbiAgICAgIGYuc3RpbGxTbGlkZUZhY3RvclxuICAgICk7XG5cbiAgICBpZiAodGhpcy5fc3RpbGxTbGlkZSA+IGYuc3RpbGxUaHJlc2gpIHtcbiAgICAgIHRoaXMuX2lzU3RpbGwgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5faXNTdGlsbCA9IHRydWU7XG4gICAgfVxuICBcbiAgICByZXMuc3RpbGwgPSB7XG4gICAgICBzdGlsbDogdGhpcy5faXNTdGlsbCxcbiAgICAgIHNsaWRlOiB0aGlzLl9zdGlsbFNsaWRlXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vdGlvbkZlYXR1cmVzO1xuXG4iXX0=
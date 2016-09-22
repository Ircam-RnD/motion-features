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
      this._accNorm = _features2.default.magnitude3D(this.acc);
      // this one needs be here because used by freefall AND spin
      this._gyrNorm = _features2.default.magnitude3D(this.gyr);

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

    //============================================================== acc intensity
    /** @private */

  }, {
    key: '_updateAccIntensity',
    value: function _updateAccIntensity(res) {
      this._accIntensityNorm = 0;

      for (var i = 0; i < 3; i++) {
        this._accLast[i][this._loopIndex % 3] = this.acc[i];

        this._accIntensity[i] = _features2.default.intensity1D(this.acc[i], this._accLast[i][(this._loopIndex + 1) % 3], this._accIntensityLast[i][(this._loopIndex + 1) % 2], _features2.default.accIntensityParam1, _features2.default.accIntensityParam2, 1);

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

        this._gyrIntensity[i] = _features2.default.intensity1D(this.gyr[i], this._gyrLast[i][(this._loopIndex + 1) % 3], this._gyrIntensityLast[i][(this._loopIndex + 1) % 2], _features2.default.gyrIntensityParam1, _features2.default.gyrIntensityParam2, 1);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbImdldFRpbWVGdW5jdGlvbiIsIndpbmRvdyIsInQiLCJwcm9jZXNzIiwiaHJ0aW1lIiwicGVyZm9ybWFuY2UiLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInBlcmZOb3ciLCJNb3Rpb25GZWF0dXJlcyIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsImRlc2NyaXB0b3JzIiwiX3BhcmFtcyIsIl9tZXRob2RzIiwiYWNjSW50ZW5zaXR5IiwiX3VwZGF0ZUFjY0ludGVuc2l0eSIsImJpbmQiLCJneXJJbnRlbnNpdHkiLCJfdXBkYXRlR3lySW50ZW5zaXR5IiwiZnJlZWZhbGwiLCJfdXBkYXRlRnJlZWZhbGwiLCJraWNrIiwiX3VwZGF0ZUtpY2siLCJzaGFrZSIsIl91cGRhdGVTaGFrZSIsInNwaW4iLCJfdXBkYXRlU3BpbiIsInN0aWxsIiwiX3VwZGF0ZVN0aWxsIiwiYWNjIiwiZ3lyIiwiX2FjY0xhc3QiLCJfYWNjSW50ZW5zaXR5TGFzdCIsIl9hY2NJbnRlbnNpdHkiLCJfYWNjSW50ZW5zaXR5Tm9ybSIsIl9hY2NOb3JtIiwiX2d5ckRlbHRhIiwiX2d5ck5vcm0iLCJfZ3lyRGVsdGFOb3JtIiwiX2ZhbGxCZWdpbiIsIl9mYWxsRW5kIiwiX2ZhbGxEdXJhdGlvbiIsIl9pc0ZhbGxpbmciLCJfZ3lyTGFzdCIsIl9neXJJbnRlbnNpdHlMYXN0IiwiX2d5ckludGVuc2l0eSIsIl9neXJJbnRlbnNpdHlOb3JtIiwiX2tpY2tJbnRlbnNpdHkiLCJfbGFzdEtpY2siLCJfaXNLaWNraW5nIiwiX21lZGlhblZhbHVlcyIsIl9tZWRpYW5MaW5raW5nIiwiX21lZGlhbkZpZm8iLCJfaTEiLCJfaTIiLCJfaTMiLCJfYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiIsIl9hY2NEZWx0YSIsIl9zaGFrZVdpbmRvdyIsIkFycmF5Iiwic2hha2VXaW5kb3dTaXplIiwiaSIsImoiLCJfc2hha2VOYiIsIl9zaGFraW5nUmF3IiwiX3NoYWtlU2xpZGVQcmV2IiwiX3NoYWtpbmciLCJfc3BpbkJlZ2luIiwiX3NwaW5FbmQiLCJfc3BpbkR1cmF0aW9uIiwiX2lzU3Bpbm5pbmciLCJfc3RpbGxDcm9zc1Byb2QiLCJfc3RpbGxTbGlkZSIsIl9zdGlsbFNsaWRlUHJldiIsIl9pc1N0aWxsIiwiX2xvb3BJbmRleFBlcmlvZCIsImxjbSIsImtpY2tNZWRpYW5GaWx0ZXJzaXplIiwiX2xvb3BJbmRleCIsIngiLCJ5IiwieiIsImNhbGxiYWNrIiwiX2VsYXBzZWRUaW1lIiwibWFnbml0dWRlM0QiLCJlcnIiLCJyZXMiLCJrZXkiLCJlIiwiaW50ZW5zaXR5MUQiLCJhY2NJbnRlbnNpdHlQYXJhbTEiLCJhY2NJbnRlbnNpdHlQYXJhbTIiLCJub3JtIiwiZ3lySW50ZW5zaXR5UGFyYW0xIiwiZ3lySW50ZW5zaXR5UGFyYW0yIiwiZGVsdGEiLCJmcmVlZmFsbEFjY1RocmVzaCIsImZyZWVmYWxsR3lyVGhyZXNoIiwiZnJlZWZhbGxHeXJEZWx0YVRocmVzaCIsImFjY05vcm0iLCJmYWxsaW5nIiwiZHVyYXRpb24iLCJraWNrVGhyZXNoIiwia2lja1NwZWVkR2F0ZSIsImludGVuc2l0eSIsImtpY2tpbmciLCJzaGFrZVRocmVzaCIsInNsaWRlIiwic2hha2VTbGlkZUZhY3RvciIsInNoYWtpbmciLCJzcGluVGhyZXNob2xkIiwic3Bpbm5pbmciLCJneXJOb3JtIiwic3RpbGxDcm9zc1Byb2R1Y3QiLCJzdGlsbFNsaWRlRmFjdG9yIiwic3RpbGxUaHJlc2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7O0FBRUE7Ozs7Ozs7OztBQVNBLFNBQVNBLGVBQVQsR0FBMkI7QUFDekIsTUFBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQUU7QUFDbkMsV0FBTyxZQUFNO0FBQ1gsVUFBTUMsSUFBSUMsUUFBUUMsTUFBUixFQUFWO0FBQ0EsYUFBT0YsRUFBRSxDQUFGLElBQU9BLEVBQUUsQ0FBRixJQUFPLElBQXJCO0FBQ0QsS0FIRDtBQUlELEdBTEQsTUFLTztBQUFFO0FBQ1AsUUFBSUQsT0FBT0ksV0FBUCxLQUF1QixXQUEzQixFQUF3QztBQUN0QyxVQUFJQyxLQUFLQyxHQUFMLEtBQWEsV0FBakIsRUFBOEI7QUFDNUIsZUFBTztBQUFBLGlCQUFNLElBQUlELEtBQUtFLE9BQVQsRUFBTjtBQUFBLFNBQVA7QUFDRCxPQUZELE1BRU87QUFDTCxlQUFPO0FBQUEsaUJBQU1GLEtBQUtDLEdBQUwsRUFBTjtBQUFBLFNBQVA7QUFDRDtBQUNGLEtBTkQsTUFNTztBQUNMLGFBQU87QUFBQSxlQUFNTixPQUFPSSxXQUFQLENBQW1CRSxHQUFuQixFQUFOO0FBQUEsT0FBUDtBQUNEO0FBQ0Y7QUFDRjs7QUFFRCxJQUFNRSxVQUFVVCxpQkFBaEI7O0FBRUE7Ozs7QUFJQTs7Ozs7Ozs7Ozs7O0lBV01VLGM7O0FBRUo7Ozs7QUFJQSw0QkFBMEI7QUFBQSxRQUFkQyxPQUFjLHlEQUFKLEVBQUk7QUFBQTs7QUFDeEIsUUFBTUMsV0FBVztBQUNmQyxtQkFBYSxDQUNYLGNBRFcsRUFFWCxjQUZXLEVBR1gsVUFIVyxFQUlYLE1BSlcsRUFLWCxPQUxXLEVBTVgsTUFOVyxFQU9YLE9BUFc7QUFERSxLQUFqQjtBQVdBLFNBQUtDLE9BQUwsR0FBZSxzQkFBYyxFQUFkLEVBQWtCRixRQUFsQixFQUE0QkQsT0FBNUIsQ0FBZjtBQUNBOztBQUVBLFNBQUtJLFFBQUwsR0FBZ0I7QUFDZEMsb0JBQWMsS0FBS0MsbUJBQUwsQ0FBeUJDLElBQXpCLENBQThCLElBQTlCLENBREE7QUFFZEMsb0JBQWMsS0FBS0MsbUJBQUwsQ0FBeUJGLElBQXpCLENBQThCLElBQTlCLENBRkE7QUFHZEcsZ0JBQVUsS0FBS0MsZUFBTCxDQUFxQkosSUFBckIsQ0FBMEIsSUFBMUIsQ0FISTtBQUlkSyxZQUFNLEtBQUtDLFdBQUwsQ0FBaUJOLElBQWpCLENBQXNCLElBQXRCLENBSlE7QUFLZE8sYUFBTyxLQUFLQyxZQUFMLENBQWtCUixJQUFsQixDQUF1QixJQUF2QixDQUxPO0FBTWRTLFlBQU0sS0FBS0MsV0FBTCxDQUFpQlYsSUFBakIsQ0FBc0IsSUFBdEIsQ0FOUTtBQU9kVyxhQUFPLEtBQUtDLFlBQUwsQ0FBa0JaLElBQWxCLENBQXVCLElBQXZCO0FBUE8sS0FBaEI7O0FBVUEsU0FBS2EsR0FBTCxHQUFXLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQVg7QUFDQSxTQUFLQyxHQUFMLEdBQVcsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FBWDs7QUFFQTtBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsQ0FDZCxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQURjLEVBRWQsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FGYyxFQUdkLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBSGMsQ0FBaEI7QUFLQSxTQUFLQyxpQkFBTCxHQUF5QixDQUN2QixDQUFDLENBQUQsRUFBSSxDQUFKLENBRHVCLEVBRXZCLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FGdUIsRUFHdkIsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUh1QixDQUF6QjtBQUtBLFNBQUtDLGFBQUwsR0FBcUIsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FBckI7QUFDQSxTQUFLQyxpQkFBTCxHQUF5QixDQUF6Qjs7QUFFQTtBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsQ0FBaEI7QUFDQSxTQUFLQyxTQUFMLEdBQWlCLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQWpCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQixDQUFoQjtBQUNBLFNBQUtDLGFBQUwsR0FBcUIsQ0FBckI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCLENBQWxCO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQixDQUFoQjtBQUNBLFNBQUtDLGFBQUwsR0FBcUIsQ0FBckI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCLEtBQWxCOztBQUVBO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQixDQUNkLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBRGMsRUFFZCxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQUZjLEVBR2QsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FIYyxDQUFoQjtBQUtBLFNBQUtDLGlCQUFMLEdBQXlCLENBQ3ZCLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FEdUIsRUFFdkIsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUZ1QixFQUd2QixDQUFDLENBQUQsRUFBSSxDQUFKLENBSHVCLENBQXpCO0FBS0EsU0FBS0MsYUFBTCxHQUFxQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQUFyQjtBQUNBLFNBQUtDLGlCQUFMLEdBQXlCLENBQXpCOztBQUVBO0FBQ0EsU0FBS0MsY0FBTCxHQUFzQixDQUF0QjtBQUNBLFNBQUtDLFNBQUwsR0FBaUIsQ0FBakI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCLEtBQWxCO0FBQ0EsU0FBS0MsYUFBTCxHQUFxQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLENBQVYsRUFBYSxDQUFiLEVBQWdCLENBQWhCLEVBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLENBQXpCLENBQXJCO0FBQ0EsU0FBS0MsY0FBTCxHQUFzQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLENBQVYsRUFBYSxDQUFiLEVBQWdCLENBQWhCLEVBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLENBQXpCLENBQXRCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLENBQVYsRUFBYSxDQUFiLEVBQWdCLENBQWhCLEVBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLENBQXpCLENBQW5CO0FBQ0EsU0FBS0MsR0FBTCxHQUFXLENBQVg7QUFDQSxTQUFLQyxHQUFMLEdBQVcsQ0FBWDtBQUNBLFNBQUtDLEdBQUwsR0FBVyxDQUFYO0FBQ0EsU0FBS0MsdUJBQUwsR0FBK0IsQ0FBL0I7O0FBRUE7QUFDQSxTQUFLQyxTQUFMLEdBQWlCLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQWpCO0FBQ0EsU0FBS0MsWUFBTCxHQUFvQixDQUNsQixJQUFJQyxLQUFKLENBQVUsbUJBQUVDLGVBQVosQ0FEa0IsRUFFbEIsSUFBSUQsS0FBSixDQUFVLG1CQUFFQyxlQUFaLENBRmtCLEVBR2xCLElBQUlELEtBQUosQ0FBVSxtQkFBRUMsZUFBWixDQUhrQixDQUFwQjtBQUtBLFNBQUssSUFBSUMsSUFBSSxDQUFiLEVBQWdCQSxJQUFJLENBQXBCLEVBQXVCQSxHQUF2QixFQUE0QjtBQUMxQixXQUFLLElBQUlDLElBQUksQ0FBYixFQUFnQkEsSUFBSSxtQkFBRUYsZUFBdEIsRUFBdUNFLEdBQXZDLEVBQTRDO0FBQzFDLGFBQUtKLFlBQUwsQ0FBa0JHLENBQWxCLEVBQXFCQyxDQUFyQixJQUEwQixDQUExQjtBQUNEO0FBQ0Y7QUFDRCxTQUFLQyxRQUFMLEdBQWdCLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQWhCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQixDQUFuQjtBQUNBLFNBQUtDLGVBQUwsR0FBdUIsQ0FBdkI7QUFDQSxTQUFLQyxRQUFMLEdBQWdCLENBQWhCOztBQUVBO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQixDQUFsQjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsQ0FBaEI7QUFDQSxTQUFLQyxhQUFMLEdBQXFCLENBQXJCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQixLQUFuQjs7QUFFQTtBQUNBLFNBQUtDLGVBQUwsR0FBdUIsQ0FBdkI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CLENBQW5CO0FBQ0EsU0FBS0MsZUFBTCxHQUF1QixDQUF2QjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0IsS0FBaEI7O0FBRUEsU0FBS0MsZ0JBQUwsR0FBd0IsbUJBQUVDLEdBQUYsQ0FDdEIsbUJBQUVBLEdBQUYsQ0FDRSxtQkFBRUEsR0FBRixDQUFNLENBQU4sRUFBUyxDQUFULENBREYsRUFDZSxtQkFBRUMsb0JBRGpCLENBRHNCLEVBSXRCLG1CQUFFakIsZUFKb0IsQ0FBeEI7QUFNQTtBQUNBLFNBQUtrQixVQUFMLEdBQWtCLENBQWxCO0FBQ0Q7O0FBRUQ7O0FBRUE7Ozs7Ozs7Ozs7cUNBTWlCQyxDLEVBQUdDLEMsRUFBR0MsQyxFQUFHO0FBQ3hCLFdBQUtwRCxHQUFMLENBQVMsQ0FBVCxJQUFja0QsQ0FBZDtBQUNBLFdBQUtsRCxHQUFMLENBQVMsQ0FBVCxJQUFjbUQsQ0FBZDtBQUNBLFdBQUtuRCxHQUFMLENBQVMsQ0FBVCxJQUFjb0QsQ0FBZDtBQUNEOztBQUVEOzs7Ozs7Ozs7aUNBTWFGLEMsRUFBR0MsQyxFQUFHQyxDLEVBQUc7QUFDcEIsV0FBS25ELEdBQUwsQ0FBUyxDQUFULElBQWNpRCxDQUFkO0FBQ0EsV0FBS2pELEdBQUwsQ0FBUyxDQUFULElBQWNrRCxDQUFkO0FBQ0EsV0FBS2xELEdBQUwsQ0FBUyxDQUFULElBQWNtRCxDQUFkO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7QUFVQTs7Ozs7Ozs7OztBQVVBOzs7Ozs7Ozs7QUFTQTs7Ozs7Ozs7QUFRQTs7Ozs7OztBQU9BOzs7Ozs7Ozs7QUFTQTs7Ozs7Ozs7QUFRQTs7Ozs7Ozs7Ozs7OztBQWFBOzs7Ozs7O0FBT0E7Ozs7Ozs7OzJCQUtPQyxRLEVBQVU7QUFDZjtBQUNBLFdBQUtDLFlBQUwsR0FBb0I1RSxTQUFwQjtBQUNBO0FBQ0EsV0FBSzRCLFFBQUwsR0FBZ0IsbUJBQUVpRCxXQUFGLENBQWMsS0FBS3ZELEdBQW5CLENBQWhCO0FBQ0E7QUFDQSxXQUFLUSxRQUFMLEdBQWdCLG1CQUFFK0MsV0FBRixDQUFjLEtBQUt0RCxHQUFuQixDQUFoQjs7QUFFQSxVQUFJdUQsTUFBTSxJQUFWO0FBQ0EsVUFBSUMsTUFBTSxJQUFWO0FBQ0EsVUFBSTtBQUNGQSxjQUFNLEVBQU47QUFERTtBQUFBO0FBQUE7O0FBQUE7QUFFRiwwREFBZ0IsS0FBSzFFLE9BQUwsQ0FBYUQsV0FBN0IsNEdBQTBDO0FBQUEsZ0JBQWpDNEUsR0FBaUM7O0FBQ3hDLGdCQUFJLEtBQUsxRSxRQUFMLENBQWMwRSxHQUFkLENBQUosRUFBd0I7QUFDdEIsbUJBQUsxRSxRQUFMLENBQWMwRSxHQUFkLEVBQW1CRCxHQUFuQjtBQUNEO0FBQ0Y7QUFOQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBT0gsT0FQRCxDQU9FLE9BQU9FLENBQVAsRUFBVTtBQUNWSCxjQUFNRyxDQUFOO0FBQ0Q7QUFDRE4sZUFBU0csR0FBVCxFQUFjQyxHQUFkOztBQUVBLFdBQUtSLFVBQUwsR0FBa0IsQ0FBQyxLQUFLQSxVQUFMLEdBQWtCLENBQW5CLElBQXdCLEtBQUtILGdCQUEvQztBQUNBO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBOztBQUVBO0FBQ0E7Ozs7d0NBQ29CVyxHLEVBQUs7QUFDdkIsV0FBS3BELGlCQUFMLEdBQXlCLENBQXpCOztBQUVBLFdBQUssSUFBSTJCLElBQUksQ0FBYixFQUFnQkEsSUFBSSxDQUFwQixFQUF1QkEsR0FBdkIsRUFBNEI7QUFDMUIsYUFBSzlCLFFBQUwsQ0FBYzhCLENBQWQsRUFBaUIsS0FBS2lCLFVBQUwsR0FBa0IsQ0FBbkMsSUFBd0MsS0FBS2pELEdBQUwsQ0FBU2dDLENBQVQsQ0FBeEM7O0FBRUEsYUFBSzVCLGFBQUwsQ0FBbUI0QixDQUFuQixJQUF3QixtQkFBRTRCLFdBQUYsQ0FDdEIsS0FBSzVELEdBQUwsQ0FBU2dDLENBQVQsQ0FEc0IsRUFFdEIsS0FBSzlCLFFBQUwsQ0FBYzhCLENBQWQsRUFBaUIsQ0FBQyxLQUFLaUIsVUFBTCxHQUFrQixDQUFuQixJQUF3QixDQUF6QyxDQUZzQixFQUd0QixLQUFLOUMsaUJBQUwsQ0FBdUI2QixDQUF2QixFQUEwQixDQUFDLEtBQUtpQixVQUFMLEdBQWtCLENBQW5CLElBQXdCLENBQWxELENBSHNCLEVBSXRCLG1CQUFFWSxrQkFKb0IsRUFLdEIsbUJBQUVDLGtCQUxvQixFQU10QixDQU5zQixDQUF4Qjs7QUFTQSxhQUFLM0QsaUJBQUwsQ0FBdUI2QixDQUF2QixFQUEwQixLQUFLaUIsVUFBTCxHQUFrQixDQUE1QyxJQUFpRCxLQUFLN0MsYUFBTCxDQUFtQjRCLENBQW5CLENBQWpEOztBQUVBLGFBQUszQixpQkFBTCxJQUEwQixLQUFLRCxhQUFMLENBQW1CNEIsQ0FBbkIsQ0FBMUI7QUFDRDs7QUFFRHlCLFVBQUl4RSxZQUFKLEdBQW1CO0FBQ2pCOEUsY0FBTSxLQUFLMUQsaUJBRE07QUFFakI2QyxXQUFHLEtBQUs5QyxhQUFMLENBQW1CLENBQW5CLENBRmM7QUFHakIrQyxXQUFHLEtBQUsvQyxhQUFMLENBQW1CLENBQW5CLENBSGM7QUFJakJnRCxXQUFHLEtBQUtoRCxhQUFMLENBQW1CLENBQW5CO0FBSmMsT0FBbkI7QUFNRDs7QUFFRDtBQUNBOzs7O3dDQUNvQnFELEcsRUFBSztBQUN2QixXQUFLeEMsaUJBQUwsR0FBeUIsQ0FBekI7O0FBRUEsV0FBSyxJQUFJZSxJQUFJLENBQWIsRUFBZ0JBLElBQUksQ0FBcEIsRUFBdUJBLEdBQXZCLEVBQTRCO0FBQzFCLGFBQUtsQixRQUFMLENBQWNrQixDQUFkLEVBQWlCLEtBQUtpQixVQUFMLEdBQWtCLENBQW5DLElBQXdDLEtBQUtoRCxHQUFMLENBQVMrQixDQUFULENBQXhDOztBQUVBLGFBQUtoQixhQUFMLENBQW1CZ0IsQ0FBbkIsSUFBd0IsbUJBQUU0QixXQUFGLENBQ3RCLEtBQUszRCxHQUFMLENBQVMrQixDQUFULENBRHNCLEVBRXRCLEtBQUtsQixRQUFMLENBQWNrQixDQUFkLEVBQWlCLENBQUMsS0FBS2lCLFVBQUwsR0FBa0IsQ0FBbkIsSUFBd0IsQ0FBekMsQ0FGc0IsRUFHdEIsS0FBS2xDLGlCQUFMLENBQXVCaUIsQ0FBdkIsRUFBMEIsQ0FBQyxLQUFLaUIsVUFBTCxHQUFrQixDQUFuQixJQUF3QixDQUFsRCxDQUhzQixFQUl0QixtQkFBRWUsa0JBSm9CLEVBS3RCLG1CQUFFQyxrQkFMb0IsRUFNdEIsQ0FOc0IsQ0FBeEI7O0FBU0EsYUFBS2xELGlCQUFMLENBQXVCaUIsQ0FBdkIsRUFBMEIsS0FBS2lCLFVBQUwsR0FBa0IsQ0FBNUMsSUFBaUQsS0FBS2pDLGFBQUwsQ0FBbUJnQixDQUFuQixDQUFqRDs7QUFFQSxhQUFLZixpQkFBTCxJQUEwQixLQUFLRCxhQUFMLENBQW1CZ0IsQ0FBbkIsQ0FBMUI7QUFDRDs7QUFFRHlCLFVBQUlyRSxZQUFKLEdBQW1CO0FBQ2pCMkUsY0FBTSxLQUFLOUMsaUJBRE07QUFFakJpQyxXQUFHLEtBQUtsQyxhQUFMLENBQW1CLENBQW5CLENBRmM7QUFHakJtQyxXQUFHLEtBQUtuQyxhQUFMLENBQW1CLENBQW5CLENBSGM7QUFJakJvQyxXQUFHLEtBQUtwQyxhQUFMLENBQW1CLENBQW5CO0FBSmMsT0FBbkI7QUFNRDs7QUFFRDtBQUNBOzs7O29DQUNnQnlDLEcsRUFBSztBQUNuQixXQUFLLElBQUl6QixJQUFJLENBQWIsRUFBZ0JBLElBQUksQ0FBcEIsRUFBdUJBLEdBQXZCLEVBQTRCO0FBQzFCLGFBQUt6QixTQUFMLENBQWV5QixDQUFmLElBQ0UsbUJBQUVrQyxLQUFGLENBQVEsS0FBS3BELFFBQUwsQ0FBY2tCLENBQWQsRUFBaUIsQ0FBQyxLQUFLaUIsVUFBTCxHQUFrQixDQUFuQixJQUF3QixDQUF6QyxDQUFSLEVBQXFELEtBQUtoRCxHQUFMLENBQVMrQixDQUFULENBQXJELEVBQWtFLENBQWxFLENBREY7QUFFRDs7QUFFRCxXQUFLdkIsYUFBTCxHQUFxQixtQkFBRThDLFdBQUYsQ0FBYyxLQUFLaEQsU0FBbkIsQ0FBckI7O0FBRUEsVUFBSSxLQUFLRCxRQUFMLEdBQWdCLG1CQUFFNkQsaUJBQWxCLElBQ0MsS0FBSzNELFFBQUwsR0FBZ0IsbUJBQUU0RCxpQkFBbEIsSUFDSSxLQUFLM0QsYUFBTCxHQUFxQixtQkFBRTRELHNCQUZoQyxFQUV5RDtBQUN2RCxZQUFJLENBQUMsS0FBS3hELFVBQVYsRUFBc0I7QUFDcEIsZUFBS0EsVUFBTCxHQUFrQixJQUFsQjtBQUNBLGVBQUtILFVBQUwsR0FBa0JoQyxTQUFsQjtBQUNEO0FBQ0QsYUFBS2lDLFFBQUwsR0FBZ0JqQyxTQUFoQjtBQUNELE9BUkQsTUFRTztBQUNMLFlBQUksS0FBS21DLFVBQVQsRUFBcUI7QUFDbkIsZUFBS0EsVUFBTCxHQUFrQixLQUFsQjtBQUNEO0FBQ0Y7QUFDRCxXQUFLRCxhQUFMLEdBQXNCLEtBQUtELFFBQUwsR0FBZ0IsS0FBS0QsVUFBM0M7O0FBRUErQyxVQUFJbkUsUUFBSixHQUFlO0FBQ2JnRixpQkFBUyxLQUFLaEUsUUFERDtBQUViaUUsaUJBQVMsS0FBSzFELFVBRkQ7QUFHYjJELGtCQUFVLEtBQUs1RDtBQUhGLE9BQWY7QUFLRDs7QUFFRDtBQUNBOzs7O2dDQUNZNkMsRyxFQUFLO0FBQ2YsV0FBSy9CLEdBQUwsR0FBVyxLQUFLdUIsVUFBTCxHQUFrQixtQkFBRUQsb0JBQS9CO0FBQ0EsV0FBS3hCLEdBQUwsR0FBVyxLQUFLRCxXQUFMLENBQWlCLEtBQUtHLEdBQXRCLENBQVg7QUFDQSxXQUFLRCxHQUFMLEdBQVcsQ0FBWDs7QUFFQSxVQUFJLEtBQUtELEdBQUwsR0FBVyxtQkFBRXdCLG9CQUFiLElBQ0EsS0FBSzNDLGlCQUFMLEdBQXlCLEtBQUtnQixhQUFMLENBQW1CLEtBQUtHLEdBQUwsR0FBVyxLQUFLQyxHQUFuQyxDQUQ3QixFQUNzRTtBQUNwRTtBQUNBLGVBQU8sS0FBS0QsR0FBTCxHQUFXLEtBQUtDLEdBQWhCLEdBQXNCLEtBQUt1QixvQkFBM0IsSUFDQyxLQUFLM0MsaUJBQUwsR0FBeUIsS0FBS2dCLGFBQUwsQ0FBbUIsS0FBS0csR0FBTCxHQUFXLEtBQUtDLEdBQW5DLENBRGpDLEVBQzBFO0FBQ3hFLGVBQUtGLFdBQUwsQ0FBaUIsS0FBS0QsY0FBTCxDQUFvQixLQUFLRSxHQUFMLEdBQVcsS0FBS0MsR0FBcEMsQ0FBakIsSUFDQSxLQUFLRixXQUFMLENBQWlCLEtBQUtELGNBQUwsQ0FBb0IsS0FBS0UsR0FBTCxHQUFXLEtBQUtDLEdBQXBDLENBQWpCLElBQTZELENBRDdEO0FBRUEsZUFBS0osYUFBTCxDQUFtQixLQUFLRyxHQUFMLEdBQVcsS0FBS0MsR0FBaEIsR0FBc0IsQ0FBekMsSUFDQSxLQUFLSixhQUFMLENBQW1CLEtBQUtHLEdBQUwsR0FBVyxLQUFLQyxHQUFuQyxDQURBO0FBRUEsZUFBS0gsY0FBTCxDQUFvQixLQUFLRSxHQUFMLEdBQVcsS0FBS0MsR0FBaEIsR0FBc0IsQ0FBMUMsSUFDQSxLQUFLSCxjQUFMLENBQW9CLEtBQUtFLEdBQUwsR0FBVyxLQUFLQyxHQUFwQyxDQURBO0FBRUEsZUFBS0EsR0FBTDtBQUNEO0FBQ0QsYUFBS0osYUFBTCxDQUFtQixLQUFLRyxHQUFMLEdBQVcsS0FBS0MsR0FBaEIsR0FBc0IsQ0FBekMsSUFBOEMsS0FBS3BCLGlCQUFuRDtBQUNBLGFBQUtpQixjQUFMLENBQW9CLEtBQUtFLEdBQUwsR0FBVyxLQUFLQyxHQUFoQixHQUFzQixDQUExQyxJQUErQyxLQUFLQyxHQUFwRDtBQUNBLGFBQUtILFdBQUwsQ0FBaUIsS0FBS0csR0FBdEIsSUFBNkIsS0FBS0YsR0FBTCxHQUFXLEtBQUtDLEdBQWhCLEdBQXNCLENBQW5EO0FBQ0QsT0FoQkQsTUFnQk87QUFDTDtBQUNBLGVBQU8sS0FBS0EsR0FBTCxHQUFXLEtBQUtELEdBQUwsR0FBVyxDQUF0QixJQUNBLEtBQUtuQixpQkFBTCxHQUF5QixLQUFLZ0IsYUFBTCxDQUFtQixLQUFLRyxHQUFMLEdBQVcsS0FBS0MsR0FBbkMsQ0FEaEMsRUFDeUU7QUFDdkUsZUFBS0YsV0FBTCxDQUFpQixLQUFLRCxjQUFMLENBQW9CLEtBQUtFLEdBQUwsR0FBVyxLQUFLQyxHQUFwQyxDQUFqQixJQUNBLEtBQUtGLFdBQUwsQ0FBaUIsS0FBS0QsY0FBTCxDQUFvQixLQUFLRSxHQUFMLEdBQVcsS0FBS0MsR0FBcEMsQ0FBakIsSUFBNkQsQ0FEN0Q7QUFFQSxlQUFLSixhQUFMLENBQW1CLEtBQUtHLEdBQUwsR0FBVyxLQUFLQyxHQUFoQixHQUFzQixDQUF6QyxJQUNBLEtBQUtKLGFBQUwsQ0FBbUIsS0FBS0csR0FBTCxHQUFXLEtBQUtDLEdBQW5DLENBREE7QUFFQSxlQUFLSCxjQUFMLENBQW9CLEtBQUtFLEdBQUwsR0FBVyxLQUFLQyxHQUFoQixHQUFzQixDQUExQyxJQUNBLEtBQUtILGNBQUwsQ0FBb0IsS0FBS0UsR0FBTCxHQUFXLEtBQUtDLEdBQXBDLENBREE7QUFFQSxlQUFLQSxHQUFMO0FBQ0Q7QUFDRCxhQUFLSixhQUFMLENBQW1CLEtBQUtHLEdBQUwsR0FBVyxLQUFLQyxHQUFoQixHQUFzQixDQUF6QyxJQUE4QyxLQUFLcEIsaUJBQW5EO0FBQ0EsYUFBS2lCLGNBQUwsQ0FBb0IsS0FBS0UsR0FBTCxHQUFXLEtBQUtDLEdBQWhCLEdBQXNCLENBQTFDLElBQStDLEtBQUtDLEdBQXBEO0FBQ0EsYUFBS0gsV0FBTCxDQUFpQixLQUFLRyxHQUF0QixJQUE2QixLQUFLRixHQUFMLEdBQVcsS0FBS0MsR0FBaEIsR0FBc0IsQ0FBbkQ7QUFDRDs7QUFFRDtBQUNBLFVBQUksS0FBS3BCLGlCQUFMLEdBQXlCLEtBQUtzQix1QkFBOUIsR0FBd0QsbUJBQUU4QyxVQUE5RCxFQUEwRTtBQUN4RSxZQUFJLEtBQUtyRCxVQUFULEVBQXFCO0FBQ25CLGNBQUksS0FBS0YsY0FBTCxHQUFzQixLQUFLYixpQkFBL0IsRUFBa0Q7QUFDaEQsaUJBQUthLGNBQUwsR0FBc0IsS0FBS2IsaUJBQTNCO0FBQ0Q7QUFDRixTQUpELE1BSU87QUFDTCxlQUFLZSxVQUFMLEdBQWtCLElBQWxCO0FBQ0EsZUFBS0YsY0FBTCxHQUFzQixLQUFLYixpQkFBM0I7QUFDQSxlQUFLYyxTQUFMLEdBQWlCLEtBQUttQyxZQUF0QjtBQUNEO0FBQ0YsT0FWRCxNQVVPO0FBQ0wsWUFBSSxLQUFLQSxZQUFMLEdBQW9CLEtBQUtuQyxTQUF6QixHQUFxQyxtQkFBRXVELGFBQTNDLEVBQTBEO0FBQ3hELGVBQUt0RCxVQUFMLEdBQWtCLEtBQWxCO0FBQ0Q7QUFDRjs7QUFFRCxXQUFLTyx1QkFBTCxHQUErQixLQUFLTixhQUFMLENBQW1CLG1CQUFFMkIsb0JBQXJCLENBQS9COztBQUVBUyxVQUFJakUsSUFBSixHQUFXO0FBQ1RtRixtQkFBVyxLQUFLekQsY0FEUDtBQUVUMEQsaUJBQVMsS0FBS3hEO0FBRkwsT0FBWDtBQUlEOztBQUVEO0FBQ0E7Ozs7aUNBQ2FxQyxHLEVBQUs7QUFDaEIsV0FBSyxJQUFJekIsSUFBSSxDQUFiLEVBQWdCQSxJQUFJLENBQXBCLEVBQXVCQSxHQUF2QixFQUE0QjtBQUMxQixhQUFLSixTQUFMLENBQWVJLENBQWYsSUFBb0IsbUJBQUVrQyxLQUFGLENBQ2xCLEtBQUtoRSxRQUFMLENBQWM4QixDQUFkLEVBQWlCLENBQUMsS0FBS2lCLFVBQUwsR0FBa0IsQ0FBbkIsSUFBd0IsQ0FBekMsQ0FEa0IsRUFFbEIsS0FBS2pELEdBQUwsQ0FBU2dDLENBQVQsQ0FGa0IsRUFHbEIsQ0FIa0IsQ0FBcEI7QUFLRDs7QUFFRCxXQUFLLElBQUlBLEtBQUksQ0FBYixFQUFnQkEsS0FBSSxDQUFwQixFQUF1QkEsSUFBdkIsRUFBNEI7QUFDMUIsWUFBSSxLQUFLSCxZQUFMLENBQWtCRyxFQUFsQixFQUFxQixLQUFLaUIsVUFBTCxHQUFrQixtQkFBRWxCLGVBQXpDLENBQUosRUFBK0Q7QUFDN0QsZUFBS0csUUFBTCxDQUFjRixFQUFkO0FBQ0Q7QUFDRCxZQUFJLEtBQUtKLFNBQUwsQ0FBZUksRUFBZixJQUFvQixtQkFBRTZDLFdBQTFCLEVBQXVDO0FBQ3JDLGVBQUtoRCxZQUFMLENBQWtCRyxFQUFsQixFQUFxQixLQUFLaUIsVUFBTCxHQUFrQixtQkFBRWxCLGVBQXpDLElBQTRELENBQTVEO0FBQ0EsZUFBS0csUUFBTCxDQUFjRixFQUFkO0FBQ0QsU0FIRCxNQUdPO0FBQ0wsZUFBS0gsWUFBTCxDQUFrQkcsRUFBbEIsRUFBcUIsS0FBS2lCLFVBQUwsR0FBa0IsbUJBQUVsQixlQUF6QyxJQUE0RCxDQUE1RDtBQUNEO0FBQ0Y7O0FBRUQsV0FBS0ksV0FBTCxHQUNBLG1CQUFFb0IsV0FBRixDQUFjLEtBQUtyQixRQUFuQixJQUNBLG1CQUFFSCxlQUZGO0FBR0EsV0FBS0ssZUFBTCxHQUF1QixLQUFLQyxRQUE1QjtBQUNBLFdBQUtBLFFBQUwsR0FDQSxtQkFBRXlDLEtBQUYsQ0FBUSxLQUFLMUMsZUFBYixFQUE4QixLQUFLRCxXQUFuQyxFQUFnRCxtQkFBRTRDLGdCQUFsRCxDQURBOztBQUdBdEIsVUFBSS9ELEtBQUosR0FBWTtBQUNWc0YsaUJBQVMsS0FBSzNDO0FBREosT0FBWjtBQUdEOztBQUVEO0FBQ0E7Ozs7Z0NBQ1lvQixHLEVBQUs7QUFDZixVQUFJLEtBQUtqRCxRQUFMLEdBQWdCLG1CQUFFeUUsYUFBdEIsRUFBcUM7QUFDbkMsWUFBSSxDQUFDLEtBQUt4QyxXQUFWLEVBQXVCO0FBQ3JCLGVBQUtBLFdBQUwsR0FBbUIsSUFBbkI7QUFDQSxlQUFLSCxVQUFMLEdBQWtCNUQsU0FBbEI7QUFDRDtBQUNELGFBQUs2RCxRQUFMLEdBQWdCN0QsU0FBaEI7QUFDRCxPQU5ELE1BTU8sSUFBSSxLQUFLK0QsV0FBVCxFQUFzQjtBQUMzQixhQUFLQSxXQUFMLEdBQW1CLEtBQW5CO0FBQ0Q7QUFDRCxXQUFLRCxhQUFMLEdBQXFCLEtBQUtELFFBQUwsR0FBZ0IsS0FBS0QsVUFBMUM7O0FBRUFtQixVQUFJN0QsSUFBSixHQUFXO0FBQ1RzRixrQkFBVSxLQUFLekMsV0FETjtBQUVUK0Isa0JBQVUsS0FBS2hDLGFBRk47QUFHVDJDLGlCQUFTLEtBQUszRTtBQUhMLE9BQVg7QUFLRDs7QUFFRDtBQUNBOzs7O2lDQUNhaUQsRyxFQUFLO0FBQ2hCLFdBQUtmLGVBQUwsR0FBdUIsbUJBQUUwQyxpQkFBRixDQUFvQixLQUFLbkYsR0FBekIsQ0FBdkI7QUFDQSxXQUFLMkMsZUFBTCxHQUF1QixLQUFLRCxXQUE1QjtBQUNBLFdBQUtBLFdBQUwsR0FBbUIsbUJBQUVtQyxLQUFGLENBQ2pCLEtBQUtsQyxlQURZLEVBRWpCLEtBQUtGLGVBRlksRUFHakIsbUJBQUUyQyxnQkFIZSxDQUFuQjs7QUFNQSxVQUFJLEtBQUsxQyxXQUFMLEdBQW1CLG1CQUFFMkMsV0FBekIsRUFBc0M7QUFDcEMsYUFBS3pDLFFBQUwsR0FBZ0IsS0FBaEI7QUFDRCxPQUZELE1BRU87QUFDTCxhQUFLQSxRQUFMLEdBQWdCLElBQWhCO0FBQ0Q7O0FBRURZLFVBQUkzRCxLQUFKLEdBQVk7QUFDVkEsZUFBTyxLQUFLK0MsUUFERjtBQUVWaUMsZUFBTyxLQUFLbkM7QUFGRixPQUFaO0FBSUQ7Ozs7O2tCQUdZaEUsYyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmIGZyb20gJy4vZmVhdHVyZXMnO1xuXG4vKipcbiAqIENyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aW1lIGluIHNlY29uZHMgYWNjb3JkaW5nIHRvIHRoZSBjdXJyZW50XG4gKiBlbnZpcm9ubmVtZW50IChub2RlIG9yIGJyb3dzZXIpLlxuICogSWYgcnVubmluZyBpbiBub2RlIHRoZSB0aW1lIHJlbHkgb24gYHByb2Nlc3MuaHJ0aW1lYCwgd2hpbGUgaWYgaW4gdGhlIGJyb3dzZXJcbiAqIGl0IGlzIHByb3ZpZGVkIGJ5IHRoZSBgRGF0ZWAgb2JqZWN0LlxuICpcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gZ2V0VGltZUZ1bmN0aW9uKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHsgLy8gYXNzdW1lIG5vZGVcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgY29uc3QgdCA9IHByb2Nlc3MuaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gdFswXSArIHRbMV0gKiAxZS05O1xuICAgIH1cbiAgfSBlbHNlIHsgLy8gYnJvd3NlclxuICAgIGlmICh3aW5kb3cucGVyZm9ybWFuY2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBpZiAoRGF0ZS5ub3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiAoKSA9PiBuZXcgRGF0ZS5nZXRUaW1lKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKCkgPT4gRGF0ZS5ub3coKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICgpID0+IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3QgcGVyZk5vdyA9IGdldFRpbWVGdW5jdGlvbigpO1xuXG4vKipcbiAqIEB0b2RvIHR5cGVkZWYgY29uc3RydWN0b3IgYXJndW1lbnRcbiAqL1xuXG4vKipcbiAqIENsYXNzIGNvbXB1dGluZyB0aGUgZGVzY3JpcHRvcnMgZnJvbSBhY2NlbGVyb21ldGVyIGFuZCBneXJvc2NvcGUgZGF0YS5cbiAqIDxiciAvPlxuICogRXhhbXBsZSA6XG4gKiBgYGBKYXZhU2NyaXB0XG4gKiAvLyBlczYgOlxuICogaW1wb3J0IE1vdGlvbkZlYXR1cmVzIGZyb20gJ21vdGlvbi1mZWF0dXJlcyc7IFxuICogY29uc3QgbWYgPSBuZXcgTW90aW9uRmVhdHVyZXMoeyBkZXNjcmlwdG9yczogWydhY2NJbnRlbnNpdHknLCAna2ljayddIH0pO1xuICogYGBgXG4gKiBAY2xhc3NcbiAqL1xuY2xhc3MgTW90aW9uRmVhdHVyZXMge1xuXG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdH0gaW5pdE9iamVjdCAtIG9iamVjdCBjb250YWluaW5nIGFuIGFycmF5IG9mIHRoZVxuICAgKiByZXF1aXJlZCBkZXNjcmlwdG9yc1xuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICBkZXNjcmlwdG9yczogW1xuICAgICAgICAnYWNjSW50ZW5zaXR5JyxcbiAgICAgICAgJ2d5ckludGVuc2l0eScsXG4gICAgICAgICdmcmVlZmFsbCcsXG4gICAgICAgICdraWNrJyxcbiAgICAgICAgJ3NoYWtlJyxcbiAgICAgICAgJ3NwaW4nLFxuICAgICAgICAnc3RpbGwnXG4gICAgICBdXG4gICAgfTtcbiAgICB0aGlzLl9wYXJhbXMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgLy9jb25zb2xlLmxvZyh0aGlzLl9wYXJhbXMuZGVzY3JpcHRvcnMpO1xuXG4gICAgdGhpcy5fbWV0aG9kcyA9IHtcbiAgICAgIGFjY0ludGVuc2l0eTogdGhpcy5fdXBkYXRlQWNjSW50ZW5zaXR5LmJpbmQodGhpcyksXG4gICAgICBneXJJbnRlbnNpdHk6IHRoaXMuX3VwZGF0ZUd5ckludGVuc2l0eS5iaW5kKHRoaXMpLFxuICAgICAgZnJlZWZhbGw6IHRoaXMuX3VwZGF0ZUZyZWVmYWxsLmJpbmQodGhpcyksXG4gICAgICBraWNrOiB0aGlzLl91cGRhdGVLaWNrLmJpbmQodGhpcyksXG4gICAgICBzaGFrZTogdGhpcy5fdXBkYXRlU2hha2UuYmluZCh0aGlzKSxcbiAgICAgIHNwaW46IHRoaXMuX3VwZGF0ZVNwaW4uYmluZCh0aGlzKSxcbiAgICAgIHN0aWxsOiB0aGlzLl91cGRhdGVTdGlsbC5iaW5kKHRoaXMpXG4gICAgfTtcblxuICAgIHRoaXMuYWNjID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuZ3lyID0gWzAsIDAsIDBdO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gYWNjIGludGVuc2l0eVxuICAgIHRoaXMuX2FjY0xhc3QgPSBbXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2FjY0ludGVuc2l0eUxhc3QgPSBbXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF0sXG4gICAgICBbMCwgMF1cbiAgICBdO1xuICAgIHRoaXMuX2FjY0ludGVuc2l0eSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZnJlZWZhbGxcbiAgICB0aGlzLl9hY2NOb3JtID0gMDtcbiAgICB0aGlzLl9neXJEZWx0YSA9IFswLCAwLCAwXTtcbiAgICB0aGlzLl9neXJOb3JtID0gMDtcbiAgICB0aGlzLl9neXJEZWx0YU5vcm0gPSAwO1xuICAgIHRoaXMuX2ZhbGxCZWdpbiA9IDA7XG4gICAgdGhpcy5fZmFsbEVuZCA9IDA7XG4gICAgdGhpcy5fZmFsbER1cmF0aW9uID0gMDtcbiAgICB0aGlzLl9pc0ZhbGxpbmcgPSBmYWxzZTtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGd5ciBpbnRlbnNpdHlcbiAgICB0aGlzLl9neXJMYXN0ID0gW1xuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdLFxuICAgICAgWzAsIDAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHlMYXN0ID0gW1xuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdLFxuICAgICAgWzAsIDBdXG4gICAgXTtcbiAgICB0aGlzLl9neXJJbnRlbnNpdHkgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBraWNrXG4gICAgdGhpcy5fa2lja0ludGVuc2l0eSA9IDA7XG4gICAgdGhpcy5fbGFzdEtpY2sgPSAwO1xuICAgIHRoaXMuX2lzS2lja2luZyA9IGZhbHNlO1xuICAgIHRoaXMuX21lZGlhblZhbHVlcyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcbiAgICB0aGlzLl9tZWRpYW5MaW5raW5nID0gWzMsIDQsIDEsIDUsIDcsIDgsIDAsIDIsIDZdO1xuICAgIHRoaXMuX21lZGlhbkZpZm8gPSBbNiwgMiwgNywgMCwgMSwgMywgOCwgNCwgNV07XG4gICAgdGhpcy5faTEgPSAwO1xuICAgIHRoaXMuX2kyID0gMDtcbiAgICB0aGlzLl9pMyA9IDA7XG4gICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA9IDA7XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNoYWtlXG4gICAgdGhpcy5fYWNjRGVsdGEgPSBbMCwgMCwgMF07XG4gICAgdGhpcy5fc2hha2VXaW5kb3cgPSBbXG4gICAgICBuZXcgQXJyYXkoZi5zaGFrZVdpbmRvd1NpemUpLFxuICAgICAgbmV3IEFycmF5KGYuc2hha2VXaW5kb3dTaXplKSxcbiAgICAgIG5ldyBBcnJheShmLnNoYWtlV2luZG93U2l6ZSlcbiAgICBdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGYuc2hha2VXaW5kb3dTaXplOyBqKyspIHtcbiAgICAgICAgdGhpcy5fc2hha2VXaW5kb3dbaV1bal0gPSAwO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9zaGFrZU5iID0gWzAsIDAsIDBdO1xuICAgIHRoaXMuX3NoYWtpbmdSYXcgPSAwO1xuICAgIHRoaXMuX3NoYWtlU2xpZGVQcmV2ID0gMDtcbiAgICB0aGlzLl9zaGFraW5nID0gMDtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNwaW5cbiAgICB0aGlzLl9zcGluQmVnaW4gPSAwO1xuICAgIHRoaXMuX3NwaW5FbmQgPSAwO1xuICAgIHRoaXMuX3NwaW5EdXJhdGlvbiA9IDA7XG4gICAgdGhpcy5faXNTcGlubmluZyA9IGZhbHNlO1xuXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzdGlsbFxuICAgIHRoaXMuX3N0aWxsQ3Jvc3NQcm9kID0gMDtcbiAgICB0aGlzLl9zdGlsbFNsaWRlID0gMDtcbiAgICB0aGlzLl9zdGlsbFNsaWRlUHJldiA9IDA7XG4gICAgdGhpcy5faXNTdGlsbCA9IGZhbHNlO1xuXG4gICAgdGhpcy5fbG9vcEluZGV4UGVyaW9kID0gZi5sY20oXG4gICAgICBmLmxjbShcbiAgICAgICAgZi5sY20oMiwgMyksIGYua2lja01lZGlhbkZpbHRlcnNpemVcbiAgICAgICksXG4gICAgICBmLnNoYWtlV2luZG93U2l6ZVxuICAgICk7XG4gICAgLy9jb25zb2xlLmxvZyh0aGlzLl9sb29wSW5kZXhQZXJpb2QpO1xuICAgIHRoaXMuX2xvb3BJbmRleCA9IDA7XG4gIH1cblxuICAvLz09PT09PT09PT0gaW50ZXJmYWNlID09PT09PT09PS8vXG5cbiAgLyoqXG4gICAqIHNTZXRzIHRoZSBjdXJyZW50IGFjY2VsZXJvbWV0ZXIgdmFsdWVzLlxuICAgKiBAcGFyYW0ge051bWJlcn0geCAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeCB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geSAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeSB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geiAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeiB2YWx1ZVxuICAgKi9cbiAgc2V0QWNjZWxlcm9tZXRlcih4LCB5LCB6KSB7XG4gICAgdGhpcy5hY2NbMF0gPSB4O1xuICAgIHRoaXMuYWNjWzFdID0geTtcbiAgICB0aGlzLmFjY1syXSA9IHpcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGd5cm9zY29wZSB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB4IC0gdGhlIGd5cm9zY29wZSdzIHggdmFsdWVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHkgLSB0aGUgZ3lyb3Njb3BlJ3MgeSB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0geiAtIHRoZSBneXJvc2NvcGUncyB6IHZhbHVlXG4gICAqL1xuICBzZXRHeXJvc2NvcGUoeCwgeSwgeikge1xuICAgIHRoaXMuZ3lyWzBdID0geDtcbiAgICB0aGlzLmd5clsxXSA9IHk7XG4gICAgdGhpcy5neXJbMl0gPSB6XG4gIH1cblxuICAvKipcbiAgICogSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYW4gYWNjZWxlcm9tZXRlci5cbiAgICogQHR5cGVkZWYgYWNjSW50ZW5zaXR5XG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBub3JtIC0gdGhlIGdsb2JhbCBlbmVyZ3kgY29tcHV0ZWQgb24gYWxsIGRpbWVuc2lvbnMuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB4IC0gdGhlIGVuZXJneSBpbiB0aGUgeCAoZmlyc3QpIGRpbWVuc2lvbi5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHkgLSB0aGUgZW5lcmd5IGluIHRoZSB5IChzZWNvbmQpIGRpbWVuc2lvbi5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IHogLSB0aGUgZW5lcmd5IGluIHRoZSB6ICh0aGlyZCkgZGltZW5zaW9uLlxuICAgKi9cblxuICAvKipcbiAgICogSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYSBneXJvc2NvcGUuXG4gICAqIEB0eXBlZGVmIGd5ckludGVuc2l0eVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gbm9ybSAtIHRoZSBnbG9iYWwgZW5lcmd5IGNvbXB1dGVkIG9uIGFsbCBkaW1lbnNpb25zLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0geCAtIHRoZSBlbmVyZ3kgaW4gdGhlIHggKGZpcnN0KSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB5IC0gdGhlIGVuZXJneSBpbiB0aGUgeSAoc2Vjb25kKSBkaW1lbnNpb24uXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSB6IC0gdGhlIGVuZXJneSBpbiB0aGUgeiAodGhpcmQpIGRpbWVuc2lvbi5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBmcmVlIGZhbGxpbmcgc3RhdGUgb2YgdGhlIHNlbnNvci5cbiAgICogQHR5cGVkZWYgZnJlZWZhbGxcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGFjY05vcm0gLSB0aGUgbm9ybSBvZiB0aGUgYWNjZWxlcmF0aW9uLlxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IGZhbGxpbmcgLSB0cnVlIGlmIHRoZSBzZW5zb3IgaXMgZnJlZSBmYWxsaW5nLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBkdXJhdGlvbiAtIHRoZSBkdXJhdGlvbiBvZiB0aGUgZnJlZSBmYWxsaW5nIHNpbmNlIGl0cyBiZWdpbm5pbmcuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbXB1bHNlIC8gaGl0IG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHR5cGVkZWYga2lja1xuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gaW50ZW5zaXR5IC0gdGhlIGN1cnJlbnQgaW50ZW5zaXR5IG9mIHRoZSBcImtpY2tcIiBnZXN0dXJlLlxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IGtpY2tpbmcgLSB0cnVlIGlmIGEgXCJraWNrXCIgZ2VzdHVyZSBpcyBiZWluZyBkZXRlY3RlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cblxuICAvKipcbiAgICogU2hha2UgbW92ZW1lbnQgZGV0ZWN0aW9uIGluZm9ybWF0aW9uLlxuICAgKiBAdHlwZWRlZiBzaGFrZVxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge051bWJlcn0gc2hha2luZyAtIHRoZSBjdXJyZW50IGFtb3VudCBvZiBcInNoYWtpbmVzc1wiLlxuICAgKi9cblxuICAvKipcbiAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHNwaW5uaW5nIHN0YXRlIG9mIHRoZSBzZW5zb3IuXG4gICAqIEB0eXBlZGVmIHNwaW5cbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBzcGlubmluZyAtIHRydWUgaWYgdGhlIHNlbnNvciBpcyBzcGlubmluZywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKiBAcHJvcGVydHkge051bWJlcn0gZHVyYXRpb24gLSB0aGUgZHVyYXRpb24gb2YgdGhlIHNwaW5uaW5nIHNpbmNlIGl0cyBiZWdpbm5pbmcuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBneXJOb3JtIC0gdGhlIG5vcm0gb2YgdGhlIHJvdGF0aW9uIHNwZWVkLlxuICAgKi9cblxuICAvKipcbiAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHN0aWxsbmVzcyBvZiB0aGUgc2Vuc29yLlxuICAgKiBAdHlwZWRlZiBzdGlsbFxuICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IHN0aWxsIC0gdHJ1ZSBpZiB0aGUgc2Vuc29yIGlzIHN0aWxsLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqIEBwcm9wZXJ0eSB7TnVtYmVyfSBzbGlkZSAtIHRoZSBvcmlnaW5hbCB2YWx1ZSB0aHJlc2hvbGRlZCB0byBkZXRlcm1pbmUgc3RpbGxuZXNzLlxuICAgKi9cblxuICAvKipcbiAgICogQ29tcHV0ZWQgZGVzY3JpcHRvcnMuXG4gICAqIEB0eXBlZGVmIGRlc2NyaXB0b3JzXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqIEBwcm9wZXJ0eSB7YWNjSW50ZW5zaXR5fSBhY2NJbnRlbnNpdHkgLSBJbnRlbnNpdHkgb2YgdGhlIG1vdmVtZW50IHNlbnNlZCBieSBhbiBhY2NlbGVyb21ldGVyLlxuICAgKiBAcHJvcGVydHkge2d5ckludGVuc2l0eX0gZ3lySW50ZW5zaXR5IC0gSW50ZW5zaXR5IG9mIHRoZSBtb3ZlbWVudCBzZW5zZWQgYnkgYSBneXJvc2NvcGUuXG4gICAqIEBwcm9wZXJ0eSB7ZnJlZWZhbGx9IGZyZWVmYWxsIC0gSW5mb3JtYXRpb24gYWJvdXQgdGhlIGZyZWUgZmFsbGluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAcHJvcGVydHkge2tpY2t9IGtpY2sgLSBJbXB1bHNlIC8gaGl0IG1vdmVtZW50IGRldGVjdGlvbiBpbmZvcm1hdGlvbi5cbiAgICogQHByb3BlcnR5IHtzaGFrZX0gc2hha2UgLSBTaGFrZSBtb3ZlbWVudCBkZXRlY3Rpb24gaW5mb3JtYXRpb24uXG4gICAqIEBwcm9wZXJ0eSB7c3Bpbn0gc3BpbiAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzcGlubmluZyBzdGF0ZSBvZiB0aGUgc2Vuc29yLlxuICAgKiBAcHJvcGVydHkge3N0aWxsfSBzdGlsbCAtIEluZm9ybWF0aW9uIGFib3V0IHRoZSBzdGlsbG5lc3Mgb2YgdGhlIHNlbnNvci5cbiAgICovXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGhhbmRsaW5nIHRoZSBkZXNjcmlwdG9ycy5cbiAgICogQGNhbGxiYWNrIGZlYXR1cmVzQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVyciAtIERlc2NyaXB0aW9uIG9mIGEgcG90ZW50aWFsIGVycm9yLlxuICAgKiBAcGFyYW0ge2Rlc2NyaXB0b3JzfSByZXMgLSBPYmplY3QgaG9sZGluZyB0aGUgZGVzY3JpcHRvciB2YWx1ZXMuXG4gICAqL1xuXG4gIC8qKlxuICAgKiB0cmlnZ2VycyBjb21wdXRhdGlvbiBvZiB0aGUgZGVzY3JpcHRvcnMgZnJvbSB0aGUgY3VycmVudCBzZW5zb3IgdmFsdWVzIGFuZFxuICAgKiBwYXNzIHRoZSByZXN1bHRzIHRvIGEgY2FsbGJhY2tcbiAgICogQHBhcmFtIHtkZXNjcmlwdG9yc0NhbGxiYWNrfSBjYWxsYmFjayAtIHRoZSBjYWxsYmFjayBoYW5kbGluZyB0aGUgbGFzdCBjb21wdXRlZCBkZXNjcmlwdG9yc1xuICAgKi9cbiAgdXBkYXRlKGNhbGxiYWNrKSB7XG4gICAgLy8gREVBTCBXSVRIIHRoaXMuX2VsYXBzZWRUaW1lXG4gICAgdGhpcy5fZWxhcHNlZFRpbWUgPSBwZXJmTm93KCk7XG4gICAgLy8gaXMgdGhpcyBvbmUgdXNlZCBieSBzZXZlcmFsIGZlYXR1cmVzID9cbiAgICB0aGlzLl9hY2NOb3JtID0gZi5tYWduaXR1ZGUzRCh0aGlzLmFjYyk7XG4gICAgLy8gdGhpcyBvbmUgbmVlZHMgYmUgaGVyZSBiZWNhdXNlIHVzZWQgYnkgZnJlZWZhbGwgQU5EIHNwaW5cbiAgICB0aGlzLl9neXJOb3JtID0gZi5tYWduaXR1ZGUzRCh0aGlzLmd5cik7XG4gICAgXG4gICAgbGV0IGVyciA9IG51bGw7XG4gICAgbGV0IHJlcyA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHJlcyA9IHt9O1xuICAgICAgZm9yIChsZXQga2V5IG9mIHRoaXMuX3BhcmFtcy5kZXNjcmlwdG9ycykge1xuICAgICAgICBpZiAodGhpcy5fbWV0aG9kc1trZXldKSB7XG4gICAgICAgICAgdGhpcy5fbWV0aG9kc1trZXldKHJlcyk7XG4gICAgICAgIH1cbiAgICAgIH0gXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZXJyID0gZTtcbiAgICB9XG4gICAgY2FsbGJhY2soZXJyLCByZXMpO1xuXG4gICAgdGhpcy5fbG9vcEluZGV4ID0gKHRoaXMuX2xvb3BJbmRleCArIDEpICUgdGhpcy5fbG9vcEluZGV4UGVyaW9kO1xuICAgIC8vY29uc29sZS5sb2codGhpcy5fbG9vcEluZGV4KTtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT0gc3BlY2lmaWMgZGVzY3JpcHRvcnMgY29tcHV0aW5nID09PT09PT09PT09PT09PT09PT09Ly9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBhY2MgaW50ZW5zaXR5XG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlQWNjSW50ZW5zaXR5KHJlcykge1xuICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2FjY0xhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmFjY1tpXTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5W2ldID0gZi5pbnRlbnNpdHkxRChcbiAgICAgICAgdGhpcy5hY2NbaV0sXG4gICAgICAgIHRoaXMuX2FjY0xhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eUxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgMl0sXG4gICAgICAgIGYuYWNjSW50ZW5zaXR5UGFyYW0xLFxuICAgICAgICBmLmFjY0ludGVuc2l0eVBhcmFtMixcbiAgICAgICAgMVxuICAgICAgKTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5TGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAyXSA9IHRoaXMuX2FjY0ludGVuc2l0eVtpXTtcblxuICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSArPSB0aGlzLl9hY2NJbnRlbnNpdHlbaV07XG4gICAgfVxuXG4gICAgcmVzLmFjY0ludGVuc2l0eSA9IHtcbiAgICAgIG5vcm06IHRoaXMuX2FjY0ludGVuc2l0eU5vcm0sXG4gICAgICB4OiB0aGlzLl9hY2NJbnRlbnNpdHlbMF0sXG4gICAgICB5OiB0aGlzLl9hY2NJbnRlbnNpdHlbMV0sXG4gICAgICB6OiB0aGlzLl9hY2NJbnRlbnNpdHlbMl1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBneXIgaW50ZW5zaXR5XG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlR3lySW50ZW5zaXR5KHJlcykge1xuICAgIHRoaXMuX2d5ckludGVuc2l0eU5vcm0gPSAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2d5ckxhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmd5cltpXTtcblxuICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5W2ldID0gZi5pbnRlbnNpdHkxRChcbiAgICAgICAgdGhpcy5neXJbaV0sXG4gICAgICAgIHRoaXMuX2d5ckxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG4gICAgICAgIHRoaXMuX2d5ckludGVuc2l0eUxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgMl0sXG4gICAgICAgIGYuZ3lySW50ZW5zaXR5UGFyYW0xLFxuICAgICAgICBmLmd5ckludGVuc2l0eVBhcmFtMixcbiAgICAgICAgMVxuICAgICAgKTtcblxuICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5TGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAyXSA9IHRoaXMuX2d5ckludGVuc2l0eVtpXTtcblxuICAgICAgdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSArPSB0aGlzLl9neXJJbnRlbnNpdHlbaV07XG4gICAgfVxuXG4gICAgcmVzLmd5ckludGVuc2l0eSA9IHtcbiAgICAgIG5vcm06IHRoaXMuX2d5ckludGVuc2l0eU5vcm0sXG4gICAgICB4OiB0aGlzLl9neXJJbnRlbnNpdHlbMF0sXG4gICAgICB5OiB0aGlzLl9neXJJbnRlbnNpdHlbMV0sXG4gICAgICB6OiB0aGlzLl9neXJJbnRlbnNpdHlbMl1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGZyZWVmYWxsXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlRnJlZWZhbGwocmVzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2d5ckRlbHRhW2ldID1cbiAgICAgICAgZi5kZWx0YSh0aGlzLl9neXJMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLCB0aGlzLmd5cltpXSwgMSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZ3lyRGVsdGFOb3JtID0gZi5tYWduaXR1ZGUzRCh0aGlzLl9neXJEZWx0YSk7XG5cbiAgICBpZiAodGhpcy5fYWNjTm9ybSA8IGYuZnJlZWZhbGxBY2NUaHJlc2ggfHxcbiAgICAgICAgKHRoaXMuX2d5ck5vcm0gPiBmLmZyZWVmYWxsR3lyVGhyZXNoXG4gICAgICAgICAgJiYgdGhpcy5fZ3lyRGVsdGFOb3JtIDwgZi5mcmVlZmFsbEd5ckRlbHRhVGhyZXNoKSkge1xuICAgICAgaWYgKCF0aGlzLl9pc0ZhbGxpbmcpIHtcbiAgICAgICAgdGhpcy5faXNGYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fZmFsbEJlZ2luID0gcGVyZk5vdygpO1xuICAgICAgfVxuICAgICAgdGhpcy5fZmFsbEVuZCA9IHBlcmZOb3coKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuX2lzRmFsbGluZykge1xuICAgICAgICB0aGlzLl9pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fZmFsbER1cmF0aW9uID0gKHRoaXMuX2ZhbGxFbmQgLSB0aGlzLl9mYWxsQmVnaW4pO1xuXG4gICAgcmVzLmZyZWVmYWxsID0ge1xuICAgICAgYWNjTm9ybTogdGhpcy5fYWNjTm9ybSxcbiAgICAgIGZhbGxpbmc6IHRoaXMuX2lzRmFsbGluZyxcbiAgICAgIGR1cmF0aW9uOiB0aGlzLl9mYWxsRHVyYXRpb25cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBraWNrXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlS2ljayhyZXMpIHtcbiAgICB0aGlzLl9pMyA9IHRoaXMuX2xvb3BJbmRleCAlIGYua2lja01lZGlhbkZpbHRlcnNpemU7XG4gICAgdGhpcy5faTEgPSB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXTtcbiAgICB0aGlzLl9pMiA9IDE7XG5cbiAgICBpZiAodGhpcy5faTEgPCBmLmtpY2tNZWRpYW5GaWx0ZXJzaXplICYmXG4gICAgICAgIHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPiB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl0pIHtcbiAgICAgIC8vIGNoZWNrIHJpZ2h0XG4gICAgICB3aGlsZSAodGhpcy5faTEgKyB0aGlzLl9pMiA8IHRoaXMua2lja01lZGlhbkZpbHRlcnNpemUgJiZcbiAgICAgICAgICAgICAgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA+IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXSkge1xuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl1dID0gXG4gICAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyXV0gLSAxO1xuICAgICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID1cbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl07XG4gICAgICAgIHRoaXMuX2kyKys7XG4gICAgICB9XG4gICAgICB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcbiAgICAgIHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID0gdGhpcy5faTM7XG4gICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXSA9IHRoaXMuX2kxICsgdGhpcy5faTIgLSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjaGVjayBsZWZ0XG4gICAgICB3aGlsZSAodGhpcy5faTIgPCB0aGlzLl9pMSArIDEgJiZcbiAgICAgICAgICAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtIDwgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTJdKSB7XG4gICAgICAgIHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl1dICsgMTtcbiAgICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9XG4gICAgICAgIHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyXTtcbiAgICAgICAgdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPVxuICAgICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdO1xuICAgICAgICB0aGlzLl9pMisrO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICB0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9IHRoaXMuX2kzO1xuICAgICAgdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM10gPSB0aGlzLl9pMSAtIHRoaXMuX2kyICsgMTtcbiAgICB9XG5cbiAgICAvLyBjb21wYXJlIGN1cnJlbnQgaW50ZW5zaXR5IG5vcm0gd2l0aCBwcmV2aW91cyBtZWRpYW4gdmFsdWVcbiAgICBpZiAodGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSAtIHRoaXMuX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4gPiBmLmtpY2tUaHJlc2gpIHtcbiAgICAgIGlmICh0aGlzLl9pc0tpY2tpbmcpIHtcbiAgICAgICAgaWYgKHRoaXMuX2tpY2tJbnRlbnNpdHkgPCB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtKSB7XG4gICAgICAgICAgdGhpcy5fa2lja0ludGVuc2l0eSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2lzS2lja2luZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX2tpY2tJbnRlbnNpdHkgPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuICAgICAgICB0aGlzLl9sYXN0S2ljayA9IHRoaXMuX2VsYXBzZWRUaW1lO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5fZWxhcHNlZFRpbWUgLSB0aGlzLl9sYXN0S2ljayA+IGYua2lja1NwZWVkR2F0ZSkge1xuICAgICAgICB0aGlzLl9pc0tpY2tpbmcgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID0gdGhpcy5fbWVkaWFuVmFsdWVzW2Yua2lja01lZGlhbkZpbHRlcnNpemVdO1xuXG4gICAgcmVzLmtpY2sgPSB7XG4gICAgICBpbnRlbnNpdHk6IHRoaXMuX2tpY2tJbnRlbnNpdHksXG4gICAgICBraWNraW5nOiB0aGlzLl9pc0tpY2tpbmdcbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNoYWtlXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlU2hha2UocmVzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIHRoaXMuX2FjY0RlbHRhW2ldID0gZi5kZWx0YShcbiAgICAgICAgdGhpcy5fYWNjTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSxcbiAgICAgICAgdGhpcy5hY2NbaV0sXG4gICAgICAgIDFcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSBmLnNoYWtlV2luZG93U2l6ZV0pIHtcbiAgICAgICAgdGhpcy5fc2hha2VOYltpXS0tO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuX2FjY0RlbHRhW2ldID4gZi5zaGFrZVRocmVzaCkge1xuICAgICAgICB0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSBmLnNoYWtlV2luZG93U2l6ZV0gPSAxO1xuICAgICAgICB0aGlzLl9zaGFrZU5iW2ldKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSBmLnNoYWtlV2luZG93U2l6ZV0gPSAwO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX3NoYWtpbmdSYXcgPVxuICAgIGYubWFnbml0dWRlM0QodGhpcy5fc2hha2VOYikgL1xuICAgIGYuc2hha2VXaW5kb3dTaXplO1xuICAgIHRoaXMuX3NoYWtlU2xpZGVQcmV2ID0gdGhpcy5fc2hha2luZztcbiAgICB0aGlzLl9zaGFraW5nID1cbiAgICBmLnNsaWRlKHRoaXMuX3NoYWtlU2xpZGVQcmV2LCB0aGlzLl9zaGFraW5nUmF3LCBmLnNoYWtlU2xpZGVGYWN0b3IpO1xuXG4gICAgcmVzLnNoYWtlID0ge1xuICAgICAgc2hha2luZzogdGhpcy5fc2hha2luZ1xuICAgIH07XG4gIH1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNwaW5cbiAgLyoqIEBwcml2YXRlICovXG4gIF91cGRhdGVTcGluKHJlcykge1xuICAgIGlmICh0aGlzLl9neXJOb3JtID4gZi5zcGluVGhyZXNob2xkKSB7XG4gICAgICBpZiAoIXRoaXMuX2lzU3Bpbm5pbmcpIHtcbiAgICAgICAgdGhpcy5faXNTcGlubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuX3NwaW5CZWdpbiA9IHBlcmZOb3coKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3NwaW5FbmQgPSBwZXJmTm93KCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9pc1NwaW5uaW5nKSB7XG4gICAgICB0aGlzLl9pc1NwaW5uaW5nID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuX3NwaW5EdXJhdGlvbiA9IHRoaXMuX3NwaW5FbmQgLSB0aGlzLl9zcGluQmVnaW47XG5cbiAgICByZXMuc3BpbiA9IHtcbiAgICAgIHNwaW5uaW5nOiB0aGlzLl9pc1NwaW5uaW5nLFxuICAgICAgZHVyYXRpb246IHRoaXMuX3NwaW5EdXJhdGlvbixcbiAgICAgIGd5ck5vcm06IHRoaXMuX2d5ck5vcm1cbiAgICB9O1xuICB9XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHN0aWxsXG4gIC8qKiBAcHJpdmF0ZSAqL1xuICBfdXBkYXRlU3RpbGwocmVzKSB7XG4gICAgdGhpcy5fc3RpbGxDcm9zc1Byb2QgPSBmLnN0aWxsQ3Jvc3NQcm9kdWN0KHRoaXMuZ3lyKTtcbiAgICB0aGlzLl9zdGlsbFNsaWRlUHJldiA9IHRoaXMuX3N0aWxsU2xpZGU7XG4gICAgdGhpcy5fc3RpbGxTbGlkZSA9IGYuc2xpZGUoXG4gICAgICB0aGlzLl9zdGlsbFNsaWRlUHJldixcbiAgICAgIHRoaXMuX3N0aWxsQ3Jvc3NQcm9kLFxuICAgICAgZi5zdGlsbFNsaWRlRmFjdG9yXG4gICAgKTtcblxuICAgIGlmICh0aGlzLl9zdGlsbFNsaWRlID4gZi5zdGlsbFRocmVzaCkge1xuICAgICAgdGhpcy5faXNTdGlsbCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9pc1N0aWxsID0gdHJ1ZTtcbiAgICB9XG4gIFxuICAgIHJlcy5zdGlsbCA9IHtcbiAgICAgIHN0aWxsOiB0aGlzLl9pc1N0aWxsLFxuICAgICAgc2xpZGU6IHRoaXMuX3N0aWxsU2xpZGVcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTW90aW9uRmVhdHVyZXM7XG5cbiJdfQ==
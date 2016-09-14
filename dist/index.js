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
 * Class computing the descriptors from accelerometer and gyroscope data.
 * <br />
 * Example : <pre><code>
 * import { MotionFeatures } from 'motion-features'; 
 * const mf = new MotionFeatures({ ['accIntensity', 'gyrIntensity', 'freefall', 'kick', 'shake', 'spin', 'still'] });
 * </code></pre>
 * @class
 */

var MotionFeatures = function () {

	/**
  *	@param {Object.Array.String} descriptors - array of required descriptors
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
  * @param {Number} x - the accelerometer's x value
  * @param {Number} y - the accelerometer's y value
  * @param {Number} z - the accelerometer's z value
  * sets the current accelerometer values
  */


	(0, _createClass3.default)(MotionFeatures, [{
		key: 'setAccelerometer',
		value: function setAccelerometer(x, y, z) {
			this.acc[0] = x;
			this.acc[1] = y;
			this.acc[2] = z;
		}

		/**
   * @param {Number} x - the gyroscope's x value
   * @param {Number} y - the gyroscope's y value
   * @param {Number} z - the gyroscope's z value
   * sets the current gyroscope values
   */

	}, {
		key: 'setGyroscope',
		value: function setGyroscope(x, y, z) {
			this.gyr[0] = x;
			this.gyr[1] = y;
			this.gyr[2] = z;
		}

		/**
   * Callback handling the descriptors.
   * @callback featuresCallback
   * @param {String} err - Description of a potential error.
   * @param {descriptors} res - Object holding the descriptor values.
   */

		/**
   * @todo typedef each descriptor's sub-results
   */

		/***********
   * Computed descriptors.
   * @typedef descriptors
   * @type {Object}
   * @property {String} likeliest - The likeliest model's label.
   * @property {Number} likeliestIndex - The likeliest model's index
   * @property {Array.number} likelihoods - The array of all models' smoothed normalized likelihoods.
   * @property {Array.number} timeProgressions - The array of all models' normalized time progressions.
   * @property {Array.Array.number} alphas - The array of all models' states likelihoods array.
   * @property {?Array.number} outputValues - If the model was trained with regression, the estimated float vector output.
   * @property {?Array.number} outputCovariance - If the model was trained with regression, the output covariance matrix.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbImdldFRpbWVGdW5jdGlvbiIsIndpbmRvdyIsInQiLCJwcm9jZXNzIiwiaHJ0aW1lIiwicGVyZm9ybWFuY2UiLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInBlcmZOb3ciLCJNb3Rpb25GZWF0dXJlcyIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsImRlc2NyaXB0b3JzIiwiX3BhcmFtcyIsIl9tZXRob2RzIiwiYWNjSW50ZW5zaXR5IiwiX3VwZGF0ZUFjY0ludGVuc2l0eSIsImJpbmQiLCJneXJJbnRlbnNpdHkiLCJfdXBkYXRlR3lySW50ZW5zaXR5IiwiZnJlZWZhbGwiLCJfdXBkYXRlRnJlZWZhbGwiLCJraWNrIiwiX3VwZGF0ZUtpY2siLCJzaGFrZSIsIl91cGRhdGVTaGFrZSIsInNwaW4iLCJfdXBkYXRlU3BpbiIsInN0aWxsIiwiX3VwZGF0ZVN0aWxsIiwiYWNjIiwiZ3lyIiwiX2FjY0xhc3QiLCJfYWNjSW50ZW5zaXR5TGFzdCIsIl9hY2NJbnRlbnNpdHkiLCJfYWNjSW50ZW5zaXR5Tm9ybSIsIl9hY2NOb3JtIiwiX2d5ckRlbHRhIiwiX2d5ck5vcm0iLCJfZ3lyRGVsdGFOb3JtIiwiX2ZhbGxCZWdpbiIsIl9mYWxsRW5kIiwiX2ZhbGxEdXJhdGlvbiIsIl9pc0ZhbGxpbmciLCJfZ3lyTGFzdCIsIl9neXJJbnRlbnNpdHlMYXN0IiwiX2d5ckludGVuc2l0eSIsIl9neXJJbnRlbnNpdHlOb3JtIiwiX2tpY2tJbnRlbnNpdHkiLCJfbGFzdEtpY2siLCJfaXNLaWNraW5nIiwiX21lZGlhblZhbHVlcyIsIl9tZWRpYW5MaW5raW5nIiwiX21lZGlhbkZpZm8iLCJfaTEiLCJfaTIiLCJfaTMiLCJfYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiIsIl9hY2NEZWx0YSIsIl9zaGFrZVdpbmRvdyIsIkFycmF5Iiwic2hha2VXaW5kb3dTaXplIiwiaSIsImoiLCJfc2hha2VOYiIsIl9zaGFraW5nUmF3IiwiX3NoYWtlU2xpZGVQcmV2IiwiX3NoYWtpbmciLCJfc3BpbkJlZ2luIiwiX3NwaW5FbmQiLCJfc3BpbkR1cmF0aW9uIiwiX2lzU3Bpbm5pbmciLCJfc3RpbGxDcm9zc1Byb2QiLCJfc3RpbGxTbGlkZSIsIl9zdGlsbFNsaWRlUHJldiIsIl9pc1N0aWxsIiwiX2xvb3BJbmRleFBlcmlvZCIsImxjbSIsImtpY2tNZWRpYW5GaWx0ZXJzaXplIiwiX2xvb3BJbmRleCIsIngiLCJ5IiwieiIsImNhbGxiYWNrIiwiX2VsYXBzZWRUaW1lIiwiZXJyIiwicmVzIiwia2V5IiwiZSIsImludGVuc2l0eTFEIiwiYWNjSW50ZW5zaXR5UGFyYW0xIiwiYWNjSW50ZW5zaXR5UGFyYW0yIiwibm9ybSIsImd5ckludGVuc2l0eVBhcmFtMSIsImd5ckludGVuc2l0eVBhcmFtMiIsIm1hZ25pdHVkZTNEIiwiZGVsdGEiLCJmcmVlZmFsbEFjY1RocmVzaCIsImZyZWVmYWxsR3lyVGhyZXNoIiwiZnJlZWZhbGxHeXJEZWx0YVRocmVzaCIsImFjY05vcm0iLCJmYWxsaW5nIiwiZHVyYXRpb24iLCJraWNrVGhyZXNoIiwia2lja1NwZWVkR2F0ZSIsImludGVuc2l0eSIsImtpY2tpbmciLCJzaGFrZVRocmVzaCIsInNsaWRlIiwic2hha2VTbGlkZUZhY3RvciIsInNoYWtpbmciLCJzcGluVGhyZXNob2xkIiwic3Bpbm5pbmciLCJneXJOb3JtIiwic3RpbGxDcm9zc1Byb2R1Y3QiLCJzdGlsbFNsaWRlRmFjdG9yIiwic3RpbGxUaHJlc2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7O0FBRUE7Ozs7Ozs7OztBQVNBLFNBQVNBLGVBQVQsR0FBMkI7QUFDekIsS0FBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQUU7QUFDbkMsU0FBTyxZQUFNO0FBQ1gsT0FBTUMsSUFBSUMsUUFBUUMsTUFBUixFQUFWO0FBQ0EsVUFBT0YsRUFBRSxDQUFGLElBQU9BLEVBQUUsQ0FBRixJQUFPLElBQXJCO0FBQ0QsR0FIRDtBQUlELEVB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V0FBVCxFQUFzQjtBQUM1QixTQUFLQSxXQUFMLEdBQW1CLEtBQW5CO0FBQ0E7QUFDRCxRQUFLRCxhQUFMLEdBQXFCLEtBQUtELFFBQUwsR0FBZ0IsS0FBS0QsVUFBMUM7O0FBRUFrQixPQUFJNUQsSUFBSixHQUFXO0FBQ1ZzRixjQUFVLEtBQUt6QyxXQURMO0FBRVYrQixjQUFVLEtBQUtoQyxhQUZMO0FBR1YyQyxhQUFTLEtBQUszRTtBQUhKLElBQVg7QUFLQTs7QUFFRDtBQUNBOzs7OytCQUNhZ0QsRyxFQUFLO0FBQ2pCLFFBQUtkLGVBQUwsR0FBdUIsbUJBQUUwQyxpQkFBRixDQUFvQixLQUFLbkYsR0FBekIsQ0FBdkI7QUFDQSxRQUFLMkMsZUFBTCxHQUF1QixLQUFLRCxXQUE1QjtBQUNBLFFBQUtBLFdBQUwsR0FBbUIsbUJBQUVtQyxLQUFGLENBQ2xCLEtBQUtsQyxlQURhLEVBRWxCLEtBQUtGLGVBRmEsRUFHbEIsbUJBQUUyQyxnQkFIZ0IsQ0FBbkI7O0FBTUEsT0FBSSxLQUFLMUMsV0FBTCxHQUFtQixtQkFBRTJDLFdBQXpCLEVBQXNDO0FBQ3JDLFNBQUt6QyxRQUFMLEdBQWdCLEtBQWhCO0FBQ0EsSUFGRCxNQUVPO0FBQ04sU0FBS0EsUUFBTCxHQUFnQixJQUFoQjtBQUNBOztBQUVEVyxPQUFJMUQsS0FBSixHQUFZO0FBQ1hBLFdBQU8sS0FBSytDLFFBREQ7QUFFWGlDLFdBQU8sS0FBS25DO0FBRkQsSUFBWjtBQUlBOzs7OztrQkFHYWhFLGMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZiBmcm9tICcuL2ZlYXR1cmVzJztcblxuLyoqXG4gKiBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGltZSBpbiBzZWNvbmRzIGFjY29yZGluZyB0byB0aGUgY3VycmVudFxuICogZW52aXJvbm5lbWVudCAobm9kZSBvciBicm93c2VyKS5cbiAqIElmIHJ1bm5pbmcgaW4gbm9kZSB0aGUgdGltZSByZWx5IG9uIGBwcm9jZXNzLmhydGltZWAsIHdoaWxlIGlmIGluIHRoZSBicm93c2VyXG4gKiBpdCBpcyBwcm92aWRlZCBieSB0aGUgYERhdGVgIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGdldFRpbWVGdW5jdGlvbigpIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7IC8vIGFzc3VtZSBub2RlXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNvbnN0IHQgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgICAgcmV0dXJuIHRbMF0gKyB0WzFdICogMWUtOTtcbiAgICB9XG4gIH0gZWxzZSB7IC8vIGJyb3dzZXJcbiAgICBpZiAod2luZG93LnBlcmZvcm1hbmNlID09PSAndW5kZWZpbmVkJykge1xuICAgIFx0aWYgKERhdGUubm93ID09PSAndW5kZWZpbmVkJykge1xuICAgIFx0XHRyZXR1cm4gKCkgPT4gbmV3IERhdGUuZ2V0VGltZSgpO1xuICAgIFx0fSBlbHNlIHtcbiAgICAgIFx0cmV0dXJuICgpID0+IERhdGUubm93KCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICBcdHJldHVybiAoKSA9PiB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IHBlcmZOb3cgPSBnZXRUaW1lRnVuY3Rpb24oKTtcblxuLyoqXG4gKiBDbGFzcyBjb21wdXRpbmcgdGhlIGRlc2NyaXB0b3JzIGZyb20gYWNjZWxlcm9tZXRlciBhbmQgZ3lyb3Njb3BlIGRhdGEuXG4gKiA8YnIgLz5cbiAqIEV4YW1wbGUgOiA8cHJlPjxjb2RlPlxuICogaW1wb3J0IHsgTW90aW9uRmVhdHVyZXMgfSBmcm9tICdtb3Rpb24tZmVhdHVyZXMnOyBcbiAqIGNvbnN0IG1mID0gbmV3IE1vdGlvbkZlYXR1cmVzKHsgWydhY2NJbnRlbnNpdHknLCAnZ3lySW50ZW5zaXR5JywgJ2ZyZWVmYWxsJywgJ2tpY2snLCAnc2hha2UnLCAnc3BpbicsICdzdGlsbCddIH0pO1xuICogPC9jb2RlPjwvcHJlPlxuICogQGNsYXNzXG4gKi9cbmNsYXNzIE1vdGlvbkZlYXR1cmVzIHtcblxuXHQvKipcblx0ICpcdEBwYXJhbSB7T2JqZWN0LkFycmF5LlN0cmluZ30gZGVzY3JpcHRvcnMgLSBhcnJheSBvZiByZXF1aXJlZCBkZXNjcmlwdG9yc1xuIFx0ICovXG5cdGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuXHRcdGNvbnN0IGRlZmF1bHRzID0ge1xuXHRcdFx0ZGVzY3JpcHRvcnM6IFtcblx0XHRcdFx0J2FjY0ludGVuc2l0eScsXG5cdFx0XHRcdCdneXJJbnRlbnNpdHknLFxuXHRcdFx0XHQnZnJlZWZhbGwnLFxuXHRcdFx0XHQna2ljaycsXG5cdFx0XHRcdCdzaGFrZScsXG5cdFx0XHRcdCdzcGluJyxcblx0XHRcdFx0J3N0aWxsJ1xuXHRcdFx0XVxuXHRcdH07XG5cdFx0dGhpcy5fcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXHRcdC8vY29uc29sZS5sb2codGhpcy5fcGFyYW1zLmRlc2NyaXB0b3JzKTtcblxuXHRcdHRoaXMuX21ldGhvZHMgPSB7XG5cdFx0XHRhY2NJbnRlbnNpdHk6IHRoaXMuX3VwZGF0ZUFjY0ludGVuc2l0eS5iaW5kKHRoaXMpLFxuXHRcdFx0Z3lySW50ZW5zaXR5OiB0aGlzLl91cGRhdGVHeXJJbnRlbnNpdHkuYmluZCh0aGlzKSxcblx0XHRcdGZyZWVmYWxsOiB0aGlzLl91cGRhdGVGcmVlZmFsbC5iaW5kKHRoaXMpLFxuXHRcdFx0a2ljazogdGhpcy5fdXBkYXRlS2ljay5iaW5kKHRoaXMpLFxuXHRcdFx0c2hha2U6IHRoaXMuX3VwZGF0ZVNoYWtlLmJpbmQodGhpcyksXG5cdFx0XHRzcGluOiB0aGlzLl91cGRhdGVTcGluLmJpbmQodGhpcyksXG5cdFx0XHRzdGlsbDogdGhpcy5fdXBkYXRlU3RpbGwuYmluZCh0aGlzKVxuXHRcdH07XG5cblx0XHR0aGlzLmFjYyA9IFswLCAwLCAwXTtcblx0XHR0aGlzLmd5ciA9IFswLCAwLCAwXTtcblxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGFjYyBpbnRlbnNpdHlcblx0XHR0aGlzLl9hY2NMYXN0ID0gW1xuXHRcdFx0WzAsIDAsIDBdLFxuXHRcdFx0WzAsIDAsIDBdLFxuXHRcdFx0WzAsIDAsIDBdXG5cdFx0XTtcblx0XHR0aGlzLl9hY2NJbnRlbnNpdHlMYXN0ID0gW1xuXHRcdFx0WzAsIDBdLFxuXHRcdFx0WzAsIDBdLFxuXHRcdFx0WzAsIDBdXG5cdFx0XTtcblx0XHR0aGlzLl9hY2NJbnRlbnNpdHkgPSBbMCwgMCwgMF07XG5cdFx0dGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA9IDA7XG5cblx0XHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGZyZWVmYWxsXG5cdFx0dGhpcy5fYWNjTm9ybSA9IDA7XG5cdFx0dGhpcy5fZ3lyRGVsdGEgPSBbMCwgMCwgMF07XG5cdFx0dGhpcy5fZ3lyTm9ybSA9IDA7XG5cdFx0dGhpcy5fZ3lyRGVsdGFOb3JtID0gMDtcblx0XHR0aGlzLl9mYWxsQmVnaW4gPSAwO1xuXHRcdHRoaXMuX2ZhbGxFbmQgPSAwO1xuXHRcdHRoaXMuX2ZhbGxEdXJhdGlvbiA9IDA7XG5cdFx0dGhpcy5faXNGYWxsaW5nID0gZmFsc2U7XG5cblx0XHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBneXIgaW50ZW5zaXR5XG5cdFx0dGhpcy5fZ3lyTGFzdCA9IFtcblx0XHRcdFswLCAwLCAwXSxcblx0XHRcdFswLCAwLCAwXSxcblx0XHRcdFswLCAwLCAwXVxuXHRcdF07XG5cdFx0dGhpcy5fZ3lySW50ZW5zaXR5TGFzdCA9IFtcblx0XHRcdFswLCAwXSxcblx0XHRcdFswLCAwXSxcblx0XHRcdFswLCAwXVxuXHRcdF07XG5cdFx0dGhpcy5fZ3lySW50ZW5zaXR5ID0gWzAsIDAsIDBdO1xuXHRcdHRoaXMuX2d5ckludGVuc2l0eU5vcm0gPSAwO1xuXG5cdFx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0ga2lja1xuXHRcdHRoaXMuX2tpY2tJbnRlbnNpdHkgPSAwO1xuXHRcdHRoaXMuX2xhc3RLaWNrID0gMDtcblx0XHR0aGlzLl9pc0tpY2tpbmcgPSBmYWxzZTtcblx0XHR0aGlzLl9tZWRpYW5WYWx1ZXMgPSBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF07XG5cdFx0dGhpcy5fbWVkaWFuTGlua2luZyA9IFszLCA0LCAxLCA1LCA3LCA4LCAwLCAyLCA2XTtcblx0XHR0aGlzLl9tZWRpYW5GaWZvID0gWzYsIDIsIDcsIDAsIDEsIDMsIDgsIDQsIDVdO1xuXHRcdHRoaXMuX2kxID0gMDtcblx0XHR0aGlzLl9pMiA9IDA7XG5cdFx0dGhpcy5faTMgPSAwO1xuXHRcdHRoaXMuX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4gPSAwO1xuXG5cdFx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzaGFrZVxuXHRcdHRoaXMuX2FjY0RlbHRhID0gWzAsIDAsIDBdO1xuXHRcdHRoaXMuX3NoYWtlV2luZG93ID0gW1xuXHRcdFx0bmV3IEFycmF5KGYuc2hha2VXaW5kb3dTaXplKSxcblx0XHRcdG5ldyBBcnJheShmLnNoYWtlV2luZG93U2l6ZSksXG5cdFx0XHRuZXcgQXJyYXkoZi5zaGFrZVdpbmRvd1NpemUpXG5cdFx0XTtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuXHRcdFx0Zm9yIChsZXQgaiA9IDA7IGogPCBmLnNoYWtlV2luZG93U2l6ZTsgaisrKSB7XG5cdFx0XHRcdHRoaXMuX3NoYWtlV2luZG93W2ldW2pdID0gMDtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy5fc2hha2VOYiA9IFswLCAwLCAwXTtcblx0XHR0aGlzLl9zaGFraW5nUmF3ID0gMDtcblx0XHR0aGlzLl9zaGFrZVNsaWRlUHJldiA9IDA7XG5cdFx0dGhpcy5fc2hha2luZyA9IDA7XG5cblx0XHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzcGluXG5cdFx0dGhpcy5fc3BpbkJlZ2luID0gMDtcblx0XHR0aGlzLl9zcGluRW5kID0gMDtcblx0XHR0aGlzLl9zcGluRHVyYXRpb24gPSAwO1xuXHRcdHRoaXMuX2lzU3Bpbm5pbmcgPSBmYWxzZTtcblxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc3RpbGxcblx0XHR0aGlzLl9zdGlsbENyb3NzUHJvZCA9IDA7XG5cdFx0dGhpcy5fc3RpbGxTbGlkZSA9IDA7XG5cdFx0dGhpcy5fc3RpbGxTbGlkZVByZXYgPSAwO1xuXHRcdHRoaXMuX2lzU3RpbGwgPSBmYWxzZTtcblxuXHRcdHRoaXMuX2xvb3BJbmRleFBlcmlvZCA9XHRmLmxjbShcblx0XHRcdGYubGNtKFxuXHRcdFx0XHRmLmxjbSgyLCAzKSwgZi5raWNrTWVkaWFuRmlsdGVyc2l6ZVxuXHRcdFx0KSxcblx0XHRcdGYuc2hha2VXaW5kb3dTaXplXG5cdFx0KTtcblx0XHR0aGlzLl9sb29wSW5kZXggPSAwO1xuXHR9XG5cblx0Ly89PT09PT09PT09IGludGVyZmFjZSA9PT09PT09PT0vL1xuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge051bWJlcn0geCAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeCB2YWx1ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0geSAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeSB2YWx1ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0geiAtIHRoZSBhY2NlbGVyb21ldGVyJ3MgeiB2YWx1ZVxuXHQgKiBzZXRzIHRoZSBjdXJyZW50IGFjY2VsZXJvbWV0ZXIgdmFsdWVzXG5cdCAqL1xuXHRzZXRBY2NlbGVyb21ldGVyKHgsIHksIHopIHtcblx0XHR0aGlzLmFjY1swXSA9IHg7XG5cdFx0dGhpcy5hY2NbMV0gPSB5O1xuXHRcdHRoaXMuYWNjWzJdID0gelxuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSB4IC0gdGhlIGd5cm9zY29wZSdzIHggdmFsdWVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IHkgLSB0aGUgZ3lyb3Njb3BlJ3MgeSB2YWx1ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0geiAtIHRoZSBneXJvc2NvcGUncyB6IHZhbHVlXG5cdCAqIHNldHMgdGhlIGN1cnJlbnQgZ3lyb3Njb3BlIHZhbHVlc1xuXHQgKi9cblx0c2V0R3lyb3Njb3BlKHgsIHksIHopIHtcblx0XHR0aGlzLmd5clswXSA9IHg7XG5cdFx0dGhpcy5neXJbMV0gPSB5O1xuXHRcdHRoaXMuZ3lyWzJdID0gelxuXHR9XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGhhbmRsaW5nIHRoZSBkZXNjcmlwdG9ycy5cbiAgICogQGNhbGxiYWNrIGZlYXR1cmVzQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVyciAtIERlc2NyaXB0aW9uIG9mIGEgcG90ZW50aWFsIGVycm9yLlxuICAgKiBAcGFyYW0ge2Rlc2NyaXB0b3JzfSByZXMgLSBPYmplY3QgaG9sZGluZyB0aGUgZGVzY3JpcHRvciB2YWx1ZXMuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBAdG9kbyB0eXBlZGVmIGVhY2ggZGVzY3JpcHRvcidzIHN1Yi1yZXN1bHRzXG4gICAqL1xuXG4gIC8qKioqKioqKioqKlxuICAgKiBDb21wdXRlZCBkZXNjcmlwdG9ycy5cbiAgICogQHR5cGVkZWYgZGVzY3JpcHRvcnNcbiAgICogQHR5cGUge09iamVjdH1cbiAgICogQHByb3BlcnR5IHtTdHJpbmd9IGxpa2VsaWVzdCAtIFRoZSBsaWtlbGllc3QgbW9kZWwncyBsYWJlbC5cbiAgICogQHByb3BlcnR5IHtOdW1iZXJ9IGxpa2VsaWVzdEluZGV4IC0gVGhlIGxpa2VsaWVzdCBtb2RlbCdzIGluZGV4XG4gICAqIEBwcm9wZXJ0eSB7QXJyYXkubnVtYmVyfSBsaWtlbGlob29kcyAtIFRoZSBhcnJheSBvZiBhbGwgbW9kZWxzJyBzbW9vdGhlZCBub3JtYWxpemVkIGxpa2VsaWhvb2RzLlxuICAgKiBAcHJvcGVydHkge0FycmF5Lm51bWJlcn0gdGltZVByb2dyZXNzaW9ucyAtIFRoZSBhcnJheSBvZiBhbGwgbW9kZWxzJyBub3JtYWxpemVkIHRpbWUgcHJvZ3Jlc3Npb25zLlxuICAgKiBAcHJvcGVydHkge0FycmF5LkFycmF5Lm51bWJlcn0gYWxwaGFzIC0gVGhlIGFycmF5IG9mIGFsbCBtb2RlbHMnIHN0YXRlcyBsaWtlbGlob29kcyBhcnJheS5cbiAgICogQHByb3BlcnR5IHs/QXJyYXkubnVtYmVyfSBvdXRwdXRWYWx1ZXMgLSBJZiB0aGUgbW9kZWwgd2FzIHRyYWluZWQgd2l0aCByZWdyZXNzaW9uLCB0aGUgZXN0aW1hdGVkIGZsb2F0IHZlY3RvciBvdXRwdXQuXG4gICAqIEBwcm9wZXJ0eSB7P0FycmF5Lm51bWJlcn0gb3V0cHV0Q292YXJpYW5jZSAtIElmIHRoZSBtb2RlbCB3YXMgdHJhaW5lZCB3aXRoIHJlZ3Jlc3Npb24sIHRoZSBvdXRwdXQgY292YXJpYW5jZSBtYXRyaXguXG4gICAqL1xuXG5cdC8qKlxuXHQgKiB0cmlnZ2VycyBjb21wdXRhdGlvbiBvZiB0aGUgZGVzY3JpcHRvcnMgZnJvbSB0aGUgY3VycmVudCBzZW5zb3IgdmFsdWVzIGFuZFxuXHQgKiBwYXNzIHRoZSByZXN1bHRzIHRvIGEgY2FsbGJhY2tcblx0ICogQHBhcmFtIHtkZXNjcmlwdG9yc0NhbGxiYWNrfSBjYWxsYmFjayAtIHRoZSBjYWxsYmFjayBoYW5kbGluZyB0aGUgbGFzdCBjb21wdXRlZCBkZXNjcmlwdG9yc1xuXHQgKi9cblx0dXBkYXRlKGNhbGxiYWNrKSB7XG5cdFx0Ly8gREVBTCBXSVRIIHRoaXMuX2VsYXBzZWRUaW1lXG5cdFx0dGhpcy5fZWxhcHNlZFRpbWUgPSBwZXJmTm93KCk7XG5cdFx0XG5cdFx0bGV0IGVyciA9IG51bGw7XG5cdFx0bGV0IHJlcyA9IG51bGw7XG5cdFx0dHJ5IHtcblx0XHRcdHJlcyA9IHt9O1xuXHRcdFx0Zm9yIChsZXQga2V5IG9mIHRoaXMuX3BhcmFtcy5kZXNjcmlwdG9ycykge1xuXHRcdFx0XHRpZiAodGhpcy5fbWV0aG9kc1trZXldKSB7XG5cdFx0XHRcdFx0dGhpcy5fbWV0aG9kc1trZXldKHJlcyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cdFxuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGVyciA9IGU7XG5cdFx0fVxuXHRcdGNhbGxiYWNrKGVyciwgcmVzKTtcblxuXHRcdHRoaXMuX2xvb3BJbmRleCA9ICh0aGlzLl9sb29wSW5kZXggKyAxKSAlIHRoaXMuX2xvb3BJbmRleFBlcmlvZDtcblx0fVxuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuXHQvLz09PT09PT09PT09PT09PT09PT09PT0gc3BlY2lmaWMgZGVzY3JpcHRvcnMgY29tcHV0aW5nID09PT09PT09PT09PT09PT09PT09Ly9cblx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG5cblx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBhY2MgaW50ZW5zaXR5XG5cdC8qKiBAcHJpdmF0ZSAqL1xuXHRfdXBkYXRlQWNjSW50ZW5zaXR5KHJlcykge1xuXHRcdHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPSAwO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcblx0XHRcdHRoaXMuX2FjY0xhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmFjY1tpXTtcblxuXHRcdFx0dGhpcy5fYWNjSW50ZW5zaXR5W2ldID0gZi5pbnRlbnNpdHkxRChcblx0XHRcdFx0dGhpcy5hY2NbaV0sXG5cdFx0XHRcdHRoaXMuX2FjY0xhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG5cdFx0XHRcdHRoaXMuX2FjY0ludGVuc2l0eUxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgMl0sXG5cdFx0XHRcdGYuYWNjSW50ZW5zaXR5UGFyYW0xLFxuXHRcdFx0XHRmLmFjY0ludGVuc2l0eVBhcmFtMixcblx0XHRcdFx0MVxuXHRcdFx0KTtcblxuXHRcdFx0dGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSArPSB0aGlzLl9hY2NJbnRlbnNpdHlbaV07XG5cdFx0fVxuXG5cdFx0cmVzLmFjY0ludGVuc2l0eSA9IHtcblx0XHRcdG5vcm06IHRoaXMuX2FjY0ludGVuc2l0eU5vcm0sXG5cdFx0XHR4OiB0aGlzLl9hY2NJbnRlbnNpdHlbMF0sXG5cdFx0XHR5OiB0aGlzLl9hY2NJbnRlbnNpdHlbMV0sXG5cdFx0XHR6OiB0aGlzLl9hY2NJbnRlbnNpdHlbMl1cblx0XHR9O1xuXHR9XG5cblx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBneXIgaW50ZW5zaXR5XG5cdC8qKiBAcHJpdmF0ZSAqL1xuXHRfdXBkYXRlR3lySW50ZW5zaXR5KHJlcykge1xuXHRcdHRoaXMuX2d5ckludGVuc2l0eU5vcm0gPSAwO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcblx0XHRcdHRoaXMuX2d5ckxhc3RbaV1bdGhpcy5fbG9vcEluZGV4ICUgM10gPSB0aGlzLmd5cltpXTtcblxuXHRcdFx0dGhpcy5fZ3lySW50ZW5zaXR5W2ldID0gZi5pbnRlbnNpdHkxRChcblx0XHRcdFx0dGhpcy5neXJbaV0sXG5cdFx0XHRcdHRoaXMuX2d5ckxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG5cdFx0XHRcdHRoaXMuX2d5ckludGVuc2l0eUxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgMl0sXG5cdFx0XHRcdGYuZ3lySW50ZW5zaXR5UGFyYW0xLFxuXHRcdFx0XHRmLmd5ckludGVuc2l0eVBhcmFtMixcblx0XHRcdFx0MVxuXHRcdFx0KTtcblxuXHRcdFx0dGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSArPSB0aGlzLl9neXJJbnRlbnNpdHlbaV07XG5cdFx0fVxuXG5cdFx0cmVzLmd5ckludGVuc2l0eSA9IHtcblx0XHRcdG5vcm06IHRoaXMuX2d5ckludGVuc2l0eU5vcm0sXG5cdFx0XHR4OiB0aGlzLl9neXJJbnRlbnNpdHlbMF0sXG5cdFx0XHR5OiB0aGlzLl9neXJJbnRlbnNpdHlbMV0sXG5cdFx0XHR6OiB0aGlzLl9neXJJbnRlbnNpdHlbMl1cblx0XHR9O1xuXHR9XG5cblx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGZyZWVmYWxsXG5cdC8qKiBAcHJpdmF0ZSAqL1xuXHRfdXBkYXRlRnJlZWZhbGwocmVzKSB7XG5cdFx0dGhpcy5fYWNjTm9ybSA9IGYubWFnbml0dWRlM0QodGhpcy5hY2MpO1xuXHRcdHRoaXMuX2d5ck5vcm0gPSBmLm1hZ25pdHVkZTNEKHRoaXMuZ3lyKTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cdFx0XHR0aGlzLl9neXJEZWx0YVtpXSA9XG5cdFx0XHRcdGYuZGVsdGEodGhpcy5fZ3lyTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSwgdGhpcy5neXJbaV0sIDEpO1xuXHRcdH1cblxuXHRcdHRoaXMuX2d5ckRlbHRhTm9ybSA9IGYubWFnbml0dWRlM0QodGhpcy5fZ3lyRGVsdGEpO1xuXG5cdFx0aWYgKHRoaXMuX2FjY05vcm0gPCBmLmZyZWVmYWxsQWNjVGhyZXNoIHx8XG5cdFx0XHRcdCh0aGlzLl9neXJOb3JtID4gZi5mcmVlZmFsbEd5clRocmVzaFxuXHRcdFx0XHRcdCYmIHRoaXMuX2d5ckRlbHRhTm9ybSA8IGYuZnJlZWZhbGxHeXJEZWx0YVRocmVzaCkpIHtcblx0XHRcdGlmICghdGhpcy5faXNGYWxsaW5nKSB7XG5cdFx0XHRcdHRoaXMuX2lzRmFsbGluZyA9IHRydWU7XG5cdFx0XHRcdHRoaXMuX2ZhbGxCZWdpbiA9IHBlcmZOb3coKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX2ZhbGxFbmQgPSBwZXJmTm93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmICh0aGlzLl9pc0ZhbGxpbmcpIHtcblx0XHRcdFx0dGhpcy5faXNGYWxsaW5nID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuX2ZhbGxEdXJhdGlvbiA9ICh0aGlzLl9mYWxsRW5kIC0gdGhpcy5fZmFsbEJlZ2luKTtcblxuXHRcdHJlcy5mcmVlZmFsbCA9IHtcblx0XHRcdGFjY05vcm06IHRoaXMuX2FjY05vcm0sXG5cdFx0XHRmYWxsaW5nOiB0aGlzLl9pc0ZhbGxpbmcsXG5cdFx0XHRkdXJhdGlvbjogdGhpcy5fZmFsbER1cmF0aW9uXG5cdFx0fTtcblx0fVxuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0ga2lja1xuXHQvKiogQHByaXZhdGUgKi9cblx0X3VwZGF0ZUtpY2socmVzKSB7XG5cdFx0dGhpcy5faTMgPSB0aGlzLl9sb29wSW5kZXggJSBmLmtpY2tNZWRpYW5GaWx0ZXJzaXplO1xuXHRcdHRoaXMuX2kxID0gdGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM107XG5cdFx0dGhpcy5faTIgPSAxO1xuXG5cdFx0aWYgKHRoaXMuX2kxIDwgZi5raWNrTWVkaWFuRmlsdGVyc2l6ZSAmJlxuXHRcdFx0XHR0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID4gdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdKSB7XG5cdFx0XHQvLyBjaGVjayByaWdodFxuXHRcdFx0d2hpbGUgKHRoaXMuX2kxICsgdGhpcy5faTIgPCB0aGlzLmtpY2tNZWRpYW5GaWx0ZXJzaXplICYmXG5cdFx0XHRcdFx0XHRcdHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPiB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl0pIHtcblx0XHRcdFx0dGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdXSA9IFxuXHRcdFx0XHR0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl1dIC0gMTtcblx0XHRcdFx0dGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9XG5cdFx0XHRcdHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXTtcblx0XHRcdFx0dGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPVxuXHRcdFx0XHR0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdO1xuXHRcdFx0XHR0aGlzLl9pMisrO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG5cdFx0XHR0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9IHRoaXMuX2kzO1xuXHRcdFx0dGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM10gPSB0aGlzLl9pMSArIHRoaXMuX2kyIC0gMTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gY2hlY2sgbGVmdFxuXHRcdFx0d2hpbGUgKHRoaXMuX2kyIDwgdGhpcy5faTEgKyAxICYmXG5cdFx0XHRcdFx0XHQgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA8IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyXSkge1xuXHRcdFx0XHR0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl1dID1cblx0XHRcdFx0dGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdXSArIDE7XG5cdFx0XHRcdHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPVxuXHRcdFx0XHR0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMl07XG5cdFx0XHRcdHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID1cblx0XHRcdFx0dGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXTtcblx0XHRcdFx0dGhpcy5faTIrKztcblx0XHRcdH1cblx0XHRcdHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuXHRcdFx0dGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPSB0aGlzLl9pMztcblx0XHRcdHRoaXMuX21lZGlhbkZpZm9bdGhpcy5faTNdID0gdGhpcy5faTEgLSB0aGlzLl9pMiArIDE7XG5cdFx0fVxuXG5cdFx0Ly8gY29tcGFyZSBjdXJyZW50IGludGVuc2l0eSBub3JtIHdpdGggcHJldmlvdXMgbWVkaWFuIHZhbHVlXG5cdFx0aWYgKHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gLSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID4gZi5raWNrVGhyZXNoKSB7XG5cdFx0XHRpZiAodGhpcy5faXNLaWNraW5nKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9raWNrSW50ZW5zaXR5IDwgdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSkge1xuXHRcdFx0XHRcdHRoaXMuX2tpY2tJbnRlbnNpdHkgPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9pc0tpY2tpbmcgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLl9raWNrSW50ZW5zaXR5ID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcblx0XHRcdFx0dGhpcy5fbGFzdEtpY2sgPSB0aGlzLl9lbGFwc2VkVGltZTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHRoaXMuX2VsYXBzZWRUaW1lIC0gdGhpcy5fbGFzdEtpY2sgPiBmLmtpY2tTcGVlZEdhdGUpIHtcblx0XHRcdFx0dGhpcy5faXNLaWNraW5nID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA9IHRoaXMuX21lZGlhblZhbHVlc1tmLmtpY2tNZWRpYW5GaWx0ZXJzaXplXTtcblxuXHRcdHJlcy5raWNrID0ge1xuXHRcdFx0aW50ZW5zaXR5OiB0aGlzLl9raWNrSW50ZW5zaXR5LFxuXHRcdFx0a2lja2luZzogdGhpcy5faXNLaWNraW5nXG5cdFx0fTtcblx0fVxuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzaGFrZVxuXHQvKiogQHByaXZhdGUgKi9cblx0X3VwZGF0ZVNoYWtlKHJlcykge1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cdFx0XHR0aGlzLl9hY2NEZWx0YVtpXSA9IGYuZGVsdGEoXG5cdFx0XHRcdHRoaXMuX2FjY0xhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sXG5cdFx0XHRcdHRoaXMuYWNjW2ldLFxuXHRcdFx0XHQxXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cdFx0XHRpZiAodGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgZi5zaGFrZVdpbmRvd1NpemVdKSB7XG5cdFx0XHRcdHRoaXMuX3NoYWtlTmJbaV0tLTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl9hY2NEZWx0YVtpXSA+IGYuc2hha2VUaHJlc2gpIHtcblx0XHRcdFx0dGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgZi5zaGFrZVdpbmRvd1NpemVdID0gMTtcblx0XHRcdFx0dGhpcy5fc2hha2VOYltpXSsrO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fc2hha2VXaW5kb3dbaV1bdGhpcy5fbG9vcEluZGV4ICUgZi5zaGFrZVdpbmRvd1NpemVdID0gMDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9zaGFraW5nUmF3ID1cblx0XHRmLm1hZ25pdHVkZTNEKHRoaXMuX3NoYWtlTmIpIC9cblx0XHRmLnNoYWtlV2luZG93U2l6ZTtcblx0XHR0aGlzLl9zaGFrZVNsaWRlUHJldiA9IHRoaXMuX3NoYWtpbmc7XG5cdFx0dGhpcy5fc2hha2luZyA9XG5cdFx0Zi5zbGlkZSh0aGlzLl9zaGFrZVNsaWRlUHJldiwgdGhpcy5fc2hha2luZ1JhdywgZi5zaGFrZVNsaWRlRmFjdG9yKTtcblxuXHRcdHJlcy5zaGFrZSA9IHtcblx0XHRcdHNoYWtpbmc6IHRoaXMuX3NoYWtpbmdcblx0XHR9O1xuXHR9XG5cblx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzcGluXG5cdC8qKiBAcHJpdmF0ZSAqL1xuXHRfdXBkYXRlU3BpbihyZXMpIHtcblx0XHRpZiAodGhpcy5fZ3lyTm9ybSA+IGYuc3BpblRocmVzaG9sZCkge1xuXHRcdFx0aWYgKCF0aGlzLl9pc1NwaW5uaW5nKSB7XG5cdFx0XHRcdHRoaXMuX2lzU3Bpbm5pbmcgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLl9zcGluQmVnaW4gPSBwZXJmTm93KCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9zcGluRW5kID0gcGVyZk5vdygpO1xuXHRcdH0gZWxzZSBpZiAodGhpcy5faXNTcGlubmluZykge1xuXHRcdFx0dGhpcy5faXNTcGlubmluZyA9IGZhbHNlO1xuXHRcdH1cblx0XHR0aGlzLl9zcGluRHVyYXRpb24gPSB0aGlzLl9zcGluRW5kIC0gdGhpcy5fc3BpbkJlZ2luO1xuXG5cdFx0cmVzLnNwaW4gPSB7XG5cdFx0XHRzcGlubmluZzogdGhpcy5faXNTcGlubmluZyxcblx0XHRcdGR1cmF0aW9uOiB0aGlzLl9zcGluRHVyYXRpb24sXG5cdFx0XHRneXJOb3JtOiB0aGlzLl9neXJOb3JtXG5cdFx0fTtcblx0fVxuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzdGlsbFxuXHQvKiogQHByaXZhdGUgKi9cblx0X3VwZGF0ZVN0aWxsKHJlcykge1xuXHRcdHRoaXMuX3N0aWxsQ3Jvc3NQcm9kID0gZi5zdGlsbENyb3NzUHJvZHVjdCh0aGlzLmd5cik7XG5cdFx0dGhpcy5fc3RpbGxTbGlkZVByZXYgPSB0aGlzLl9zdGlsbFNsaWRlO1xuXHRcdHRoaXMuX3N0aWxsU2xpZGUgPSBmLnNsaWRlKFxuXHRcdFx0dGhpcy5fc3RpbGxTbGlkZVByZXYsXG5cdFx0XHR0aGlzLl9zdGlsbENyb3NzUHJvZCxcblx0XHRcdGYuc3RpbGxTbGlkZUZhY3RvclxuXHRcdCk7XG5cblx0XHRpZiAodGhpcy5fc3RpbGxTbGlkZSA+IGYuc3RpbGxUaHJlc2gpIHtcblx0XHRcdHRoaXMuX2lzU3RpbGwgPSBmYWxzZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5faXNTdGlsbCA9IHRydWU7XG5cdFx0fVxuXHRcblx0XHRyZXMuc3RpbGwgPSB7XG5cdFx0XHRzdGlsbDogdGhpcy5faXNTdGlsbCxcblx0XHRcdHNsaWRlOiB0aGlzLl9zdGlsbFNsaWRlXG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1vdGlvbkZlYXR1cmVzO1xuXG4iXX0=
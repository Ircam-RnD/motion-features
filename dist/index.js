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
 *	Motion Features
 *	One-class library of real-time gesture descriptors such as freefall, spin,
 *	kick, intensity, ... computed from accelerometers and gyroscope data.
 * 	@class
 */

var MotionFeatures = function () {
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
  * setAccelerometer {Number, Number, Number}
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
   * setGyroscope {Number, Number, Number}
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
   * update {descriptorsCallback}
   * triggers computing of the descriptors with the current sensor values and
   * pass the results to a callback
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbImdldFRpbWVGdW5jdGlvbiIsIndpbmRvdyIsInQiLCJwcm9jZXNzIiwiaHJ0aW1lIiwicGVyZm9ybWFuY2UiLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInBlcmZOb3ciLCJNb3Rpb25GZWF0dXJlcyIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsImRlc2NyaXB0b3JzIiwiX3BhcmFtcyIsIl9tZXRob2RzIiwiYWNjSW50ZW5zaXR5IiwiX3VwZGF0ZUFjY0ludGVuc2l0eSIsImJpbmQiLCJneXJJbnRlbnNpdHkiLCJfdXBkYXRlR3lySW50ZW5zaXR5IiwiZnJlZWZhbGwiLCJfdXBkYXRlRnJlZWZhbGwiLCJraWNrIiwiX3VwZGF0ZUtpY2siLCJzaGFrZSIsIl91cGRhdGVTaGFrZSIsInNwaW4iLCJfdXBkYXRlU3BpbiIsInN0aWxsIiwiX3VwZGF0ZVN0aWxsIiwiYWNjIiwiZ3lyIiwiX2FjY0xhc3QiLCJfYWNjSW50ZW5zaXR5TGFzdCIsIl9hY2NJbnRlbnNpdHkiLCJfYWNjSW50ZW5zaXR5Tm9ybSIsIl9hY2NOb3JtIiwiX2d5ckRlbHRhIiwiX2d5ck5vcm0iLCJfZ3lyRGVsdGFOb3JtIiwiX2ZhbGxCZWdpbiIsIl9mYWxsRW5kIiwiX2ZhbGxEdXJhdGlvbiIsIl9pc0ZhbGxpbmciLCJfZ3lyTGFzdCIsIl9neXJJbnRlbnNpdHlMYXN0IiwiX2d5ckludGVuc2l0eSIsIl9neXJJbnRlbnNpdHlOb3JtIiwiX2tpY2tJbnRlbnNpdHkiLCJfbGFzdEtpY2siLCJfaXNLaWNraW5nIiwiX21lZGlhblZhbHVlcyIsIl9tZWRpYW5MaW5raW5nIiwiX21lZGlhbkZpZm8iLCJfaTEiLCJfaTIiLCJfaTMiLCJfYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiIsIl9hY2NEZWx0YSIsIl9zaGFrZVdpbmRvdyIsIkFycmF5Iiwic2hha2VXaW5kb3dTaXplIiwiaSIsImoiLCJfc2hha2VOYiIsIl9zaGFraW5nUmF3IiwiX3NoYWtlU2xpZGVQcmV2IiwiX3NoYWtpbmciLCJfc3BpbkJlZ2luIiwiX3NwaW5FbmQiLCJfc3BpbkR1cmF0aW9uIiwiX2lzU3Bpbm5pbmciLCJfc3RpbGxDcm9zc1Byb2QiLCJfc3RpbGxTbGlkZSIsIl9zdGlsbFNsaWRlUHJldiIsIl9pc1N0aWxsIiwiX2xvb3BJbmRleFBlcmlvZCIsImxjbSIsImtpY2tNZWRpYW5GaWx0ZXJzaXplIiwiX2xvb3BJbmRleCIsIngiLCJ5IiwieiIsImNhbGxiYWNrIiwiX2VsYXBzZWRUaW1lIiwiZXJyIiwicmVzIiwia2V5IiwiZSIsImludGVuc2l0eTFEIiwiYWNjSW50ZW5zaXR5UGFyYW0xIiwiYWNjSW50ZW5zaXR5UGFyYW0yIiwibm9ybSIsImd5ckludGVuc2l0eVBhcmFtMSIsImd5ckludGVuc2l0eVBhcmFtMiIsIm1hZ25pdHVkZTNEIiwiZGVsdGEiLCJmcmVlZmFsbEFjY1RocmVzaCIsImZyZWVmYWxsR3lyVGhyZXNoIiwiZnJlZWZhbGxHeXJEZWx0YVRocmVzaCIsImFjY05vcm0iLCJmYWxsaW5nIiwiZHVyYXRpb24iLCJraWNrVGhyZXNoIiwia2lja1NwZWVkR2F0ZSIsImludGVuc2l0eSIsImtpY2tpbmciLCJzaGFrZVRocmVzaCIsInNsaWRlIiwic2hha2VTbGlkZUZhY3RvciIsInNoYWtpbmciLCJzcGluVGhyZXNob2xkIiwic3Bpbm5pbmciLCJneXJOb3JtIiwic3RpbGxDcm9zc1Byb2R1Y3QiLCJzdGlsbFNsaWRlRmFjdG9yIiwic3RpbGxUaHJlc2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7O0FBRUE7Ozs7Ozs7OztBQVNBLFNBQVNBLGVBQVQsR0FBMkI7QUFDekIsS0FBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQUU7QUFDbkMsU0FBTyxZQUFNO0FBQ1gsT0FBTUMsSUFBSUMsUUFBUUMsTUFBUixFQUFWO0FBQ0EsVUFBT0YsRUFBRSxDQUFGLElBQU9BLEVBQUUsQ0FBRixJQUFPLElBQXJCO0FBQ0QsR0FIRDtBQUlELEVBTEQsTUFLTztBQUFFO0FBQ1AsTUFBSUQsT0FBT0ksV0FBUCxLQUF1QixXQUEzQixFQUF3QztBQUN2QyxPQUFJQyxLQUFLQyxHQUFMLEtBQWEsV0FBakIsRUFBOEI7QUFDN0IsV0FBTztBQUFBLFlBQU0sSUFBSUQsS0FBS0UsT0FBVCxFQUFOO0FBQUEsS0FBUDtBQUNBLElBRkQsTUFFTztBQUNMLFdBQU87QUFBQSxZQUFNRixLQUFLQyxHQUFMLEVBQU47QUFBQSxLQUFQO0FBQ0E7QUFDRixHQU5ELE1BTU87QUFDTixVQUFPO0FBQUEsV0FBTU4sT0FBT0ksV0FBUCxDQUFtQkUsR0FBbkIsRUFBTjtBQUFBLElBQVA7QUFDQTtBQUNGO0FBQ0Y7O0FBRUQsSUFBTUUsVUFBVVQsaUJBQWhCOztBQUVBOzs7Ozs7O0lBTU1VLGM7QUFDTCwyQkFBMEI7QUFBQSxNQUFkQyxPQUFjLHlEQUFKLEVBQUk7QUFBQTs7QUFDekIsTUFBTUMsV0FBVztBQUNoQkMsZ0JBQWEsQ0FDWixjQURZLEVBRVosY0FGWSxFQUdaLFVBSFksRUFJWixNQUpZLEVBS1osT0FMWSxFQU1aLE1BTlksRUFPWixPQVBZO0FBREcsR0FBakI7QUFXQSxPQUFLQyxPQUFMLEdBQWUsc0JBQWMsRUFBZCxFQUFrQkYsUUFBbEIsRUFBNEJELE9BQTVCLENBQWY7QUFDQTs7QUFFQSxPQUFLSSxRQUFMLEdBQWdCO0FBQ2ZDLGlCQUFjLEtBQUtDLG1CQUFMLENBQXlCQyxJQUF6QixDQUE4QixJQUE5QixDQURDO0FBRWZDLGlCQUFjLEtBQUtDLG1CQUFMLENBQXlCRixJQUF6QixDQUE4QixJQUE5QixDQUZDO0FBR2ZHLGFBQVUsS0FBS0MsZUFBTCxDQUFxQkosSUFBckIsQ0FBMEIsSUFBMUIsQ0FISztBQUlmSyxTQUFNLEtBQUtDLFdBQUwsQ0FBaUJOLElBQWpCLENBQXNCLElBQXRCLENBSlM7QUFLZk8sVUFBTyxLQUFLQyxZQUFMLENBQWtCUixJQUFsQixDQUF1QixJQUF2QixDQUxRO0FBTWZTLFNBQU0sS0FBS0MsV0FBTCxDQUFpQlYsSUFBakIsQ0FBc0IsSUFBdEIsQ0FOUztBQU9mVyxVQUFPLEtBQUtDLFlBQUwsQ0FBa0JaLElBQWxCLENBQXVCLElBQXZCO0FBUFEsR0FBaEI7O0FBVUEsT0FBS2EsR0FBTCxHQUFXLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQVg7QUFDQSxPQUFLQyxHQUFMLEdBQVcsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FBWDs7QUFFQTtBQUNBLE9BQUtDLFFBQUwsR0FBZ0IsQ0FDZixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQURlLEVBRWYsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FGZSxFQUdmLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBSGUsQ0FBaEI7QUFLQSxPQUFLQyxpQkFBTCxHQUF5QixDQUN4QixDQUFDLENBQUQsRUFBSSxDQUFKLENBRHdCLEVBRXhCLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FGd0IsRUFHeEIsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUh3QixDQUF6QjtBQUtBLE9BQUtDLGFBQUwsR0FBcUIsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FBckI7QUFDQSxPQUFLQyxpQkFBTCxHQUF5QixDQUF6Qjs7QUFFQTtBQUNBLE9BQUtDLFFBQUwsR0FBZ0IsQ0FBaEI7QUFDQSxPQUFLQyxTQUFMLEdBQWlCLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQWpCO0FBQ0EsT0FBS0MsUUFBTCxHQUFnQixDQUFoQjtBQUNBLE9BQUtDLGFBQUwsR0FBcUIsQ0FBckI7QUFDQSxPQUFLQyxVQUFMLEdBQWtCLENBQWxCO0FBQ0EsT0FBS0MsUUFBTCxHQUFnQixDQUFoQjtBQUNBLE9BQUtDLGFBQUwsR0FBcUIsQ0FBckI7QUFDQSxPQUFLQyxVQUFMLEdBQWtCLEtBQWxCOztBQUVBO0FBQ0EsT0FBS0MsUUFBTCxHQUFnQixDQUNmLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBRGUsRUFFZixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQUZlLEVBR2YsQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsQ0FIZSxDQUFoQjtBQUtBLE9BQUtDLGlCQUFMLEdBQXlCLENBQ3hCLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FEd0IsRUFFeEIsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUZ3QixFQUd4QixDQUFDLENBQUQsRUFBSSxDQUFKLENBSHdCLENBQXpCO0FBS0EsT0FBS0MsYUFBTCxHQUFxQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxDQUFyQjtBQUNBLE9BQUtDLGlCQUFMLEdBQXlCLENBQXpCOztBQUVBO0FBQ0EsT0FBS0MsY0FBTCxHQUFzQixDQUF0QjtBQUNBLE9BQUtDLFNBQUwsR0FBaUIsQ0FBakI7QUFDQSxPQUFLQyxVQUFMLEdBQWtCLEtBQWxCO0FBQ0EsT0FBS0MsYUFBTCxHQUFxQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLENBQVYsRUFBYSxDQUFiLEVBQWdCLENBQWhCLEVBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLENBQXpCLENBQXJCO0FBQ0EsT0FBS0MsY0FBTCxHQUFzQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLENBQVYsRUFBYSxDQUFiLEVBQWdCLENBQWhCLEVBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLENBQXpCLENBQXRCO0FBQ0EsT0FBS0MsV0FBTCxHQUFtQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLENBQVYsRUFBYSxDQUFiLEVBQWdCLENBQWhCLEVBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLENBQXpCLENBQW5CO0FBQ0EsT0FBS0MsR0FBTCxHQUFXLENBQVg7QUFDQSxPQUFLQyxHQUFMLEdBQVcsQ0FBWDtBQUNBLE9BQUtDLEdBQUwsR0FBVyxDQUFYO0FBQ0EsT0FBS0MsdUJBQUwsR0FBK0IsQ0FBL0I7O0FBRUE7QUFDQSxPQUFLQyxTQUFMLEdBQWlCLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQWpCO0FBQ0EsT0FBS0MsWUFBTCxHQUFvQixDQUNuQixJQUFJQyxLQUFKLENBQVUsbUJBQUVDLGVBQVosQ0FEbUIsRUFFbkIsSUFBSUQsS0FBSixDQUFVLG1CQUFFQyxlQUFaLENBRm1CLEVBR25CLElBQUlELEtBQUosQ0FBVSxtQkFBRUMsZUFBWixDQUhtQixDQUFwQjtBQUtBLE9BQUssSUFBSUMsSUFBSSxDQUFiLEVBQWdCQSxJQUFJLENBQXBCLEVBQXVCQSxHQUF2QixFQUE0QjtBQUMzQixRQUFLLElBQUlDLElBQUksQ0FBYixFQUFnQkEsSUFBSSxtQkFBRUYsZUFBdEIsRUFBdUNFLEdBQXZDLEVBQTRDO0FBQzNDLFNBQUtKLFlBQUwsQ0FBa0JHLENBQWxCLEVBQXFCQyxDQUFyQixJQUEwQixDQUExQjtBQUNBO0FBQ0Q7QUFDRCxPQUFLQyxRQUFMLEdBQWdCLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQWhCO0FBQ0EsT0FBS0MsV0FBTCxHQUFtQixDQUFuQjtBQUNBLE9BQUtDLGVBQUwsR0FBdUIsQ0FBdkI7QUFDQSxPQUFLQyxRQUFMLEdBQWdCLENBQWhCOztBQUVBO0FBQ0EsT0FBS0MsVUFBTCxHQUFrQixDQUFsQjtBQUNBLE9BQUtDLFFBQUwsR0FBZ0IsQ0FBaEI7QUFDQSxPQUFLQyxhQUFMLEdBQXFCLENBQXJCO0FBQ0EsT0FBS0MsV0FBTCxHQUFtQixLQUFuQjs7QUFFQTtBQUNBLE9BQUtDLGVBQUwsR0FBdUIsQ0FBdkI7QUFDQSxPQUFLQyxXQUFMLEdBQW1CLENBQW5CO0FBQ0EsT0FBS0MsZUFBTCxHQUF1QixDQUF2QjtBQUNBLE9BQUtDLFFBQUwsR0FBZ0IsS0FBaEI7O0FBRUEsT0FBS0MsZ0JBQUwsR0FBd0IsbUJBQUVDLEdBQUYsQ0FDdkIsbUJBQUVBLEdBQUYsQ0FDQyxtQkFBRUEsR0FBRixDQUFNLENBQU4sRUFBUyxDQUFULENBREQsRUFDYyxtQkFBRUMsb0JBRGhCLENBRHVCLEVBSXZCLG1CQUFFakIsZUFKcUIsQ0FBeEI7QUFNQSxPQUFLa0IsVUFBTCxHQUFrQixDQUFsQjtBQUNBOztBQUVEOztBQUVBOzs7Ozs7OzttQ0FJaUJDLEMsRUFBR0MsQyxFQUFHQyxDLEVBQUc7QUFDekIsUUFBS3BELEdBQUwsQ0FBUyxDQUFULElBQWNrRCxDQUFkO0FBQ0EsUUFBS2xELEdBQUwsQ0FBUyxDQUFULElBQWNtRCxDQUFkO0FBQ0EsUUFBS25ELEdBQUwsQ0FBUyxDQUFULElBQWNvRCxDQUFkO0FBQ0E7O0FBRUQ7Ozs7Ozs7K0JBSWFGLEMsRUFBR0MsQyxFQUFHQyxDLEVBQUc7QUFDckIsUUFBS25ELEdBQUwsQ0FBUyxDQUFULElBQWNpRCxDQUFkO0FBQ0EsUUFBS2pELEdBQUwsQ0FBUyxDQUFULElBQWNrRCxDQUFkO0FBQ0EsUUFBS2xELEdBQUwsQ0FBUyxDQUFULElBQWNtRCxDQUFkO0FBQ0E7O0FBRUQ7Ozs7Ozs7O3lCQUtPQyxRLEVBQVU7QUFDaEI7QUFDQSxRQUFLQyxZQUFMLEdBQW9CNUUsU0FBcEI7O0FBRUEsT0FBSTZFLE1BQU0sSUFBVjtBQUNBLE9BQUlDLE1BQU0sSUFBVjtBQUNBLE9BQUk7QUFDSEEsVUFBTSxFQUFOO0FBREc7QUFBQTtBQUFBOztBQUFBO0FBRUgscURBQWdCLEtBQUt6RSxPQUFMLENBQWFELFdBQTdCLDRHQUEwQztBQUFBLFVBQWpDMkUsR0FBaUM7O0FBQ3pDLFVBQUksS0FBS3pFLFFBQUwsQ0FBY3lFLEdBQWQsQ0FBSixFQUF3QjtBQUN2QixZQUFLekUsUUFBTCxDQUFjeUUsR0FBZCxFQUFtQkQsR0FBbkI7QUFDQTtBQUNEO0FBTkU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQU9ILElBUEQsQ0FPRSxPQUFPRSxDQUFQLEVBQVU7QUFDWEgsVUFBTUcsQ0FBTjtBQUNBO0FBQ0RMLFlBQVNFLEdBQVQsRUFBY0MsR0FBZDs7QUFFQSxRQUFLUCxVQUFMLEdBQWtCLENBQUMsS0FBS0EsVUFBTCxHQUFrQixDQUFuQixJQUF3QixLQUFLSCxnQkFBL0M7QUFDQTs7QUFFRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7OztzQ0FDb0JVLEcsRUFBSztBQUN4QixRQUFLbkQsaUJBQUwsR0FBeUIsQ0FBekI7O0FBRUEsUUFBSyxJQUFJMkIsSUFBSSxDQUFiLEVBQWdCQSxJQUFJLENBQXBCLEVBQXVCQSxHQUF2QixFQUE0QjtBQUMzQixTQUFLOUIsUUFBTCxDQUFjOEIsQ0FBZCxFQUFpQixLQUFLaUIsVUFBTCxHQUFrQixDQUFuQyxJQUF3QyxLQUFLakQsR0FBTCxDQUFTZ0MsQ0FBVCxDQUF4Qzs7QUFFQSxTQUFLNUIsYUFBTCxDQUFtQjRCLENBQW5CLElBQXdCLG1CQUFFMkIsV0FBRixDQUN2QixLQUFLM0QsR0FBTCxDQUFTZ0MsQ0FBVCxDQUR1QixFQUV2QixLQUFLOUIsUUFBTCxDQUFjOEIsQ0FBZCxFQUFpQixDQUFDLEtBQUtpQixVQUFMLEdBQWtCLENBQW5CLElBQXdCLENBQXpDLENBRnVCLEVBR3ZCLEtBQUs5QyxpQkFBTCxDQUF1QjZCLENBQXZCLEVBQTBCLENBQUMsS0FBS2lCLFVBQUwsR0FBa0IsQ0FBbkIsSUFBd0IsQ0FBbEQsQ0FIdUIsRUFJdkIsbUJBQUVXLGtCQUpxQixFQUt2QixtQkFBRUMsa0JBTHFCLEVBTXZCLENBTnVCLENBQXhCOztBQVNBLFNBQUt4RCxpQkFBTCxJQUEwQixLQUFLRCxhQUFMLENBQW1CNEIsQ0FBbkIsQ0FBMUI7QUFDQTs7QUFFRHdCLE9BQUl2RSxZQUFKLEdBQW1CO0FBQ2xCNkUsVUFBTSxLQUFLekQsaUJBRE87QUFFbEI2QyxPQUFHLEtBQUs5QyxhQUFMLENBQW1CLENBQW5CLENBRmU7QUFHbEIrQyxPQUFHLEtBQUsvQyxhQUFMLENBQW1CLENBQW5CLENBSGU7QUFJbEJnRCxPQUFHLEtBQUtoRCxhQUFMLENBQW1CLENBQW5CO0FBSmUsSUFBbkI7QUFNQTs7QUFFRDtBQUNBOzs7O3NDQUNvQm9ELEcsRUFBSztBQUN4QixRQUFLdkMsaUJBQUwsR0FBeUIsQ0FBekI7O0FBRUEsUUFBSyxJQUFJZSxJQUFJLENBQWIsRUFBZ0JBLElBQUksQ0FBcEIsRUFBdUJBLEdBQXZCLEVBQTRCO0FBQzNCLFNBQUtsQixRQUFMLENBQWNrQixDQUFkLEVBQWlCLEtBQUtpQixVQUFMLEdBQWtCLENBQW5DLElBQXdDLEtBQUtoRCxHQUFMLENBQVMrQixDQUFULENBQXhDOztBQUVBLFNBQUtoQixhQUFMLENBQW1CZ0IsQ0FBbkIsSUFBd0IsbUJBQUUyQixXQUFGLENBQ3ZCLEtBQUsxRCxHQUFMLENBQVMrQixDQUFULENBRHVCLEVBRXZCLEtBQUtsQixRQUFMLENBQWNrQixDQUFkLEVBQWlCLENBQUMsS0FBS2lCLFVBQUwsR0FBa0IsQ0FBbkIsSUFBd0IsQ0FBekMsQ0FGdUIsRUFHdkIsS0FBS2xDLGlCQUFMLENBQXVCaUIsQ0FBdkIsRUFBMEIsQ0FBQyxLQUFLaUIsVUFBTCxHQUFrQixDQUFuQixJQUF3QixDQUFsRCxDQUh1QixFQUl2QixtQkFBRWMsa0JBSnFCLEVBS3ZCLG1CQUFFQyxrQkFMcUIsRUFNdkIsQ0FOdUIsQ0FBeEI7O0FBU0EsU0FBSy9DLGlCQUFMLElBQTBCLEtBQUtELGFBQUwsQ0FBbUJnQixDQUFuQixDQUExQjtBQUNBOztBQUVEd0IsT0FBSXBFLFlBQUosR0FBbUI7QUFDbEIwRSxVQUFNLEtBQUs3QyxpQkFETztBQUVsQmlDLE9BQUcsS0FBS2xDLGFBQUwsQ0FBbUIsQ0FBbkIsQ0FGZTtBQUdsQm1DLE9BQUcsS0FBS25DLGFBQUwsQ0FBbUIsQ0FBbkIsQ0FIZTtBQUlsQm9DLE9BQUcsS0FBS3BDLGFBQUwsQ0FBbUIsQ0FBbkI7QUFKZSxJQUFuQjtBQU1BOztBQUVEO0FBQ0E7Ozs7a0NBQ2dCd0MsRyxFQUFLO0FBQ3BCLFFBQUtsRCxRQUFMLEdBQWdCLG1CQUFFMkQsV0FBRixDQUFjLEtBQUtqRSxHQUFuQixDQUFoQjtBQUNBLFFBQUtRLFFBQUwsR0FBZ0IsbUJBQUV5RCxXQUFGLENBQWMsS0FBS2hFLEdBQW5CLENBQWhCOztBQUVBLFFBQUssSUFBSStCLElBQUksQ0FBYixFQUFnQkEsSUFBSSxDQUFwQixFQUF1QkEsR0FBdkIsRUFBNEI7QUFDM0IsU0FBS3pCLFNBQUwsQ0FBZXlCLENBQWYsSUFDQyxtQkFBRWtDLEtBQUYsQ0FBUSxLQUFLcEQsUUFBTCxDQUFja0IsQ0FBZCxFQUFpQixDQUFDLEtBQUtpQixVQUFMLEdBQWtCLENBQW5CLElBQXdCLENBQXpDLENBQVIsRUFBcUQsS0FBS2hELEdBQUwsQ0FBUytCLENBQVQsQ0FBckQsRUFBa0UsQ0FBbEUsQ0FERDtBQUVBOztBQUVELFFBQUt2QixhQUFMLEdBQXFCLG1CQUFFd0QsV0FBRixDQUFjLEtBQUsxRCxTQUFuQixDQUFyQjs7QUFFQSxPQUFJLEtBQUtELFFBQUwsR0FBZ0IsbUJBQUU2RCxpQkFBbEIsSUFDRCxLQUFLM0QsUUFBTCxHQUFnQixtQkFBRTRELGlCQUFsQixJQUNHLEtBQUszRCxhQUFMLEdBQXFCLG1CQUFFNEQsc0JBRjdCLEVBRXNEO0FBQ3JELFFBQUksQ0FBQyxLQUFLeEQsVUFBVixFQUFzQjtBQUNyQixVQUFLQSxVQUFMLEdBQWtCLElBQWxCO0FBQ0EsVUFBS0gsVUFBTCxHQUFrQmhDLFNBQWxCO0FBQ0E7QUFDRCxTQUFLaUMsUUFBTCxHQUFnQmpDLFNBQWhCO0FBQ0EsSUFSRCxNQVFPO0FBQ04sUUFBSSxLQUFLbUMsVUFBVCxFQUFxQjtBQUNwQixVQUFLQSxVQUFMLEdBQWtCLEtBQWxCO0FBQ0E7QUFDRDtBQUNELFFBQUtELGFBQUwsR0FBc0IsS0FBS0QsUUFBTCxHQUFnQixLQUFLRCxVQUEzQzs7QUFFQThDLE9BQUlsRSxRQUFKLEdBQWU7QUFDZGdGLGFBQVMsS0FBS2hFLFFBREE7QUFFZGlFLGFBQVMsS0FBSzFELFVBRkE7QUFHZDJELGNBQVUsS0FBSzVEO0FBSEQsSUFBZjtBQUtBOztBQUVEO0FBQ0E7Ozs7OEJBQ1k0QyxHLEVBQUs7QUFDaEIsUUFBSzlCLEdBQUwsR0FBVyxLQUFLdUIsVUFBTCxHQUFrQixtQkFBRUQsb0JBQS9CO0FBQ0EsUUFBS3hCLEdBQUwsR0FBVyxLQUFLRCxXQUFMLENBQWlCLEtBQUtHLEdBQXRCLENBQVg7QUFDQSxRQUFLRCxHQUFMLEdBQVcsQ0FBWDs7QUFFQSxPQUFJLEtBQUtELEdBQUwsR0FBVyxtQkFBRXdCLG9CQUFiLElBQ0YsS0FBSzNDLGlCQUFMLEdBQXlCLEtBQUtnQixhQUFMLENBQW1CLEtBQUtHLEdBQUwsR0FBVyxLQUFLQyxHQUFuQyxDQUQzQixFQUNvRTtBQUNuRTtBQUNBLFdBQU8sS0FBS0QsR0FBTCxHQUFXLEtBQUtDLEdBQWhCLEdBQXNCLEtBQUt1QixvQkFBM0IsSUFDSCxLQUFLM0MsaUJBQUwsR0FBeUIsS0FBS2dCLGFBQUwsQ0FBbUIsS0FBS0csR0FBTCxHQUFXLEtBQUtDLEdBQW5DLENBRDdCLEVBQ3NFO0FBQ3JFLFVBQUtGLFdBQUwsQ0FBaUIsS0FBS0QsY0FBTCxDQUFvQixLQUFLRSxHQUFMLEdBQVcsS0FBS0MsR0FBcEMsQ0FBakIsSUFDQSxLQUFLRixXQUFMLENBQWlCLEtBQUtELGNBQUwsQ0FBb0IsS0FBS0UsR0FBTCxHQUFXLEtBQUtDLEdBQXBDLENBQWpCLElBQTZELENBRDdEO0FBRUEsVUFBS0osYUFBTCxDQUFtQixLQUFLRyxHQUFMLEdBQVcsS0FBS0MsR0FBaEIsR0FBc0IsQ0FBekMsSUFDQSxLQUFLSixhQUFMLENBQW1CLEtBQUtHLEdBQUwsR0FBVyxLQUFLQyxHQUFuQyxDQURBO0FBRUEsVUFBS0gsY0FBTCxDQUFvQixLQUFLRSxHQUFMLEdBQVcsS0FBS0MsR0FBaEIsR0FBc0IsQ0FBMUMsSUFDQSxLQUFLSCxjQUFMLENBQW9CLEtBQUtFLEdBQUwsR0FBVyxLQUFLQyxHQUFwQyxDQURBO0FBRUEsVUFBS0EsR0FBTDtBQUNBO0FBQ0QsU0FBS0osYUFBTCxDQUFtQixLQUFLRyxHQUFMLEdBQVcsS0FBS0MsR0FBaEIsR0FBc0IsQ0FBekMsSUFBOEMsS0FBS3BCLGlCQUFuRDtBQUNBLFNBQUtpQixjQUFMLENBQW9CLEtBQUtFLEdBQUwsR0FBVyxLQUFLQyxHQUFoQixHQUFzQixDQUExQyxJQUErQyxLQUFLQyxHQUFwRDtBQUNBLFNBQUtILFdBQUwsQ0FBaUIsS0FBS0csR0FBdEIsSUFBNkIsS0FBS0YsR0FBTCxHQUFXLEtBQUtDLEdBQWhCLEdBQXNCLENBQW5EO0FBQ0EsSUFoQkQsTUFnQk87QUFDTjtBQUNBLFdBQU8sS0FBS0EsR0FBTCxHQUFXLEtBQUtELEdBQUwsR0FBVyxDQUF0QixJQUNILEtBQUtuQixpQkFBTCxHQUF5QixLQUFLZ0IsYUFBTCxDQUFtQixLQUFLRyxHQUFMLEdBQVcsS0FBS0MsR0FBbkMsQ0FEN0IsRUFDc0U7QUFDckUsVUFBS0YsV0FBTCxDQUFpQixLQUFLRCxjQUFMLENBQW9CLEtBQUtFLEdBQUwsR0FBVyxLQUFLQyxHQUFwQyxDQUFqQixJQUNBLEtBQUtGLFdBQUwsQ0FBaUIsS0FBS0QsY0FBTCxDQUFvQixLQUFLRSxHQUFMLEdBQVcsS0FBS0MsR0FBcEMsQ0FBakIsSUFBNkQsQ0FEN0Q7QUFFQSxVQUFLSixhQUFMLENBQW1CLEtBQUtHLEdBQUwsR0FBVyxLQUFLQyxHQUFoQixHQUFzQixDQUF6QyxJQUNBLEtBQUtKLGFBQUwsQ0FBbUIsS0FBS0csR0FBTCxHQUFXLEtBQUtDLEdBQW5DLENBREE7QUFFQSxVQUFLSCxjQUFMLENBQW9CLEtBQUtFLEdBQUwsR0FBVyxLQUFLQyxHQUFoQixHQUFzQixDQUExQyxJQUNBLEtBQUtILGNBQUwsQ0FBb0IsS0FBS0UsR0FBTCxHQUFXLEtBQUtDLEdBQXBDLENBREE7QUFFQSxVQUFLQSxHQUFMO0FBQ0E7QUFDRCxTQUFLSixhQUFMLENBQW1CLEtBQUtHLEdBQUwsR0FBVyxLQUFLQyxHQUFoQixHQUFzQixDQUF6QyxJQUE4QyxLQUFLcEIsaUJBQW5EO0FBQ0EsU0FBS2lCLGNBQUwsQ0FBb0IsS0FBS0UsR0FBTCxHQUFXLEtBQUtDLEdBQWhCLEdBQXNCLENBQTFDLElBQStDLEtBQUtDLEdBQXBEO0FBQ0EsU0FBS0gsV0FBTCxDQUFpQixLQUFLRyxHQUF0QixJQUE2QixLQUFLRixHQUFMLEdBQVcsS0FBS0MsR0FBaEIsR0FBc0IsQ0FBbkQ7QUFDQTs7QUFFRDtBQUNBLE9BQUksS0FBS3BCLGlCQUFMLEdBQXlCLEtBQUtzQix1QkFBOUIsR0FBd0QsbUJBQUU4QyxVQUE5RCxFQUEwRTtBQUN6RSxRQUFJLEtBQUtyRCxVQUFULEVBQXFCO0FBQ3BCLFNBQUksS0FBS0YsY0FBTCxHQUFzQixLQUFLYixpQkFBL0IsRUFBa0Q7QUFDakQsV0FBS2EsY0FBTCxHQUFzQixLQUFLYixpQkFBM0I7QUFDQTtBQUNELEtBSkQsTUFJTztBQUNOLFVBQUtlLFVBQUwsR0FBa0IsSUFBbEI7QUFDQSxVQUFLRixjQUFMLEdBQXNCLEtBQUtiLGlCQUEzQjtBQUNBLFVBQUtjLFNBQUwsR0FBaUIsS0FBS21DLFlBQXRCO0FBQ0E7QUFDRCxJQVZELE1BVU87QUFDTixRQUFJLEtBQUtBLFlBQUwsR0FBb0IsS0FBS25DLFNBQXpCLEdBQXFDLG1CQUFFdUQsYUFBM0MsRUFBMEQ7QUFDekQsVUFBS3RELFVBQUwsR0FBa0IsS0FBbEI7QUFDQTtBQUNEOztBQUVELFFBQUtPLHVCQUFMLEdBQStCLEtBQUtOLGFBQUwsQ0FBbUIsbUJBQUUyQixvQkFBckIsQ0FBL0I7O0FBRUFRLE9BQUloRSxJQUFKLEdBQVc7QUFDVm1GLGVBQVcsS0FBS3pELGNBRE47QUFFVjBELGFBQVMsS0FBS3hEO0FBRkosSUFBWDtBQUlBOztBQUVEO0FBQ0E7Ozs7K0JBQ2FvQyxHLEVBQUs7QUFDakIsUUFBSyxJQUFJeEIsSUFBSSxDQUFiLEVBQWdCQSxJQUFJLENBQXBCLEVBQXVCQSxHQUF2QixFQUE0QjtBQUMzQixTQUFLSixTQUFMLENBQWVJLENBQWYsSUFBb0IsbUJBQUVrQyxLQUFGLENBQ25CLEtBQUtoRSxRQUFMLENBQWM4QixDQUFkLEVBQWlCLENBQUMsS0FBS2lCLFVBQUwsR0FBa0IsQ0FBbkIsSUFBd0IsQ0FBekMsQ0FEbUIsRUFFbkIsS0FBS2pELEdBQUwsQ0FBU2dDLENBQVQsQ0FGbUIsRUFHbkIsQ0FIbUIsQ0FBcEI7QUFLQTs7QUFFRCxRQUFLLElBQUlBLEtBQUksQ0FBYixFQUFnQkEsS0FBSSxDQUFwQixFQUF1QkEsSUFBdkIsRUFBNEI7QUFDM0IsUUFBSSxLQUFLSCxZQUFMLENBQWtCRyxFQUFsQixFQUFxQixLQUFLaUIsVUFBTCxHQUFrQixtQkFBRWxCLGVBQXpDLENBQUosRUFBK0Q7QUFDOUQsVUFBS0csUUFBTCxDQUFjRixFQUFkO0FBQ0E7QUFDRCxRQUFJLEtBQUtKLFNBQUwsQ0FBZUksRUFBZixJQUFvQixtQkFBRTZDLFdBQTFCLEVBQXVDO0FBQ3RDLFVBQUtoRCxZQUFMLENBQWtCRyxFQUFsQixFQUFxQixLQUFLaUIsVUFBTCxHQUFrQixtQkFBRWxCLGVBQXpDLElBQTRELENBQTVEO0FBQ0EsVUFBS0csUUFBTCxDQUFjRixFQUFkO0FBQ0EsS0FIRCxNQUdPO0FBQ04sVUFBS0gsWUFBTCxDQUFrQkcsRUFBbEIsRUFBcUIsS0FBS2lCLFVBQUwsR0FBa0IsbUJBQUVsQixlQUF6QyxJQUE0RCxDQUE1RDtBQUNBO0FBQ0Q7O0FBRUQsUUFBS0ksV0FBTCxHQUNBLG1CQUFFOEIsV0FBRixDQUFjLEtBQUsvQixRQUFuQixJQUNBLG1CQUFFSCxlQUZGO0FBR0EsUUFBS0ssZUFBTCxHQUF1QixLQUFLQyxRQUE1QjtBQUNBLFFBQUtBLFFBQUwsR0FDQSxtQkFBRXlDLEtBQUYsQ0FBUSxLQUFLMUMsZUFBYixFQUE4QixLQUFLRCxXQUFuQyxFQUFnRCxtQkFBRTRDLGdCQUFsRCxDQURBOztBQUdBdkIsT0FBSTlELEtBQUosR0FBWTtBQUNYc0YsYUFBUyxLQUFLM0M7QUFESCxJQUFaO0FBR0E7O0FBRUQ7QUFDQTs7Ozs4QkFDWW1CLEcsRUFBSztBQUNoQixPQUFJLEtBQUtoRCxRQUFMLEdBQWdCLG1CQUFFeUUsYUFBdEIsRUFBcUM7QUFDcEMsUUFBSSxDQUFDLEtBQUt4QyxXQUFWLEVBQXVCO0FBQ3RCLFVBQUtBLFdBQUwsR0FBbUIsSUFBbkI7QUFDQSxVQUFLSCxVQUFMLEdBQWtCNUQsU0FBbEI7QUFDQTtBQUNELFNBQUs2RCxRQUFMLEdBQWdCN0QsU0FBaEI7QUFDQSxJQU5ELE1BTU8sSUFBSSxLQUFLK0QsV0FBVCxFQUFzQjtBQUM1QixTQUFLQSxXQUFMLEdBQW1CLEtBQW5CO0FBQ0E7QUFDRCxRQUFLRCxhQUFMLEdBQXFCLEtBQUtELFFBQUwsR0FBZ0IsS0FBS0QsVUFBMUM7O0FBRUFrQixPQUFJNUQsSUFBSixHQUFXO0FBQ1ZzRixjQUFVLEtBQUt6QyxXQURMO0FBRVYrQixjQUFVLEtBQUtoQyxhQUZMO0FBR1YyQyxhQUFTLEtBQUszRTtBQUhKLElBQVg7QUFLQTs7QUFFRDtBQUNBOzs7OytCQUNhZ0QsRyxFQUFLO0FBQ2pCLFFBQUtkLGVBQUwsR0FBdUIsbUJBQUUwQyxpQkFBRixDQUFvQixLQUFLbkYsR0FBekIsQ0FBdkI7QUFDQSxRQUFLMkMsZUFBTCxHQUF1QixLQUFLRCxXQUE1QjtBQUNBLFFBQUtBLFdBQUwsR0FBbUIsbUJBQUVtQyxLQUFGLENBQ2xCLEtBQUtsQyxlQURhLEVBRWxCLEtBQUtGLGVBRmEsRUFHbEIsbUJBQUUyQyxnQkFIZ0IsQ0FBbkI7O0FBTUEsT0FBSSxLQUFLMUMsV0FBTCxHQUFtQixtQkFBRTJDLFdBQXpCLEVBQXNDO0FBQ3JDLFNBQUt6QyxRQUFMLEdBQWdCLEtBQWhCO0FBQ0EsSUFGRCxNQUVPO0FBQ04sU0FBS0EsUUFBTCxHQUFnQixJQUFoQjtBQUNBOztBQUVEVyxPQUFJMUQsS0FBSixHQUFZO0FBQ1hBLFdBQU8sS0FBSytDLFFBREQ7QUFFWGlDLFdBQU8sS0FBS25DO0FBRkQsSUFBWjtBQUlBOzs7OztrQkFHYWhFLGMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZiBmcm9tICcuL2ZlYXR1cmVzJztcblxuLyoqXG4gKiBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGltZSBpbiBzZWNvbmRzIGFjY29yZGluZyB0byB0aGUgY3VycmVudFxuICogZW52aXJvbm5lbWVudCAobm9kZSBvciBicm93c2VyKS5cbiAqIElmIHJ1bm5pbmcgaW4gbm9kZSB0aGUgdGltZSByZWx5IG9uIGBwcm9jZXNzLmhydGltZWAsIHdoaWxlIGlmIGluIHRoZSBicm93c2VyXG4gKiBpdCBpcyBwcm92aWRlZCBieSB0aGUgYERhdGVgIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGdldFRpbWVGdW5jdGlvbigpIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7IC8vIGFzc3VtZSBub2RlXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNvbnN0IHQgPSBwcm9jZXNzLmhydGltZSgpO1xuICAgICAgcmV0dXJuIHRbMF0gKyB0WzFdICogMWUtOTtcbiAgICB9XG4gIH0gZWxzZSB7IC8vIGJyb3dzZXJcbiAgICBpZiAod2luZG93LnBlcmZvcm1hbmNlID09PSAndW5kZWZpbmVkJykge1xuICAgIFx0aWYgKERhdGUubm93ID09PSAndW5kZWZpbmVkJykge1xuICAgIFx0XHRyZXR1cm4gKCkgPT4gbmV3IERhdGUuZ2V0VGltZSgpO1xuICAgIFx0fSBlbHNlIHtcbiAgICAgIFx0cmV0dXJuICgpID0+IERhdGUubm93KCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICBcdHJldHVybiAoKSA9PiB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IHBlcmZOb3cgPSBnZXRUaW1lRnVuY3Rpb24oKTtcblxuLyoqXG4gKlx0TW90aW9uIEZlYXR1cmVzXG4gKlx0T25lLWNsYXNzIGxpYnJhcnkgb2YgcmVhbC10aW1lIGdlc3R1cmUgZGVzY3JpcHRvcnMgc3VjaCBhcyBmcmVlZmFsbCwgc3BpbixcbiAqXHRraWNrLCBpbnRlbnNpdHksIC4uLiBjb21wdXRlZCBmcm9tIGFjY2VsZXJvbWV0ZXJzIGFuZCBneXJvc2NvcGUgZGF0YS5cbiAqIFx0QGNsYXNzXG4gKi9cbmNsYXNzIE1vdGlvbkZlYXR1cmVzIHtcblx0Y29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG5cdFx0Y29uc3QgZGVmYXVsdHMgPSB7XG5cdFx0XHRkZXNjcmlwdG9yczogW1xuXHRcdFx0XHQnYWNjSW50ZW5zaXR5Jyxcblx0XHRcdFx0J2d5ckludGVuc2l0eScsXG5cdFx0XHRcdCdmcmVlZmFsbCcsXG5cdFx0XHRcdCdraWNrJyxcblx0XHRcdFx0J3NoYWtlJyxcblx0XHRcdFx0J3NwaW4nLFxuXHRcdFx0XHQnc3RpbGwnXG5cdFx0XHRdXG5cdFx0fTtcblx0XHR0aGlzLl9wYXJhbXMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cdFx0Ly9jb25zb2xlLmxvZyh0aGlzLl9wYXJhbXMuZGVzY3JpcHRvcnMpO1xuXG5cdFx0dGhpcy5fbWV0aG9kcyA9IHtcblx0XHRcdGFjY0ludGVuc2l0eTogdGhpcy5fdXBkYXRlQWNjSW50ZW5zaXR5LmJpbmQodGhpcyksXG5cdFx0XHRneXJJbnRlbnNpdHk6IHRoaXMuX3VwZGF0ZUd5ckludGVuc2l0eS5iaW5kKHRoaXMpLFxuXHRcdFx0ZnJlZWZhbGw6IHRoaXMuX3VwZGF0ZUZyZWVmYWxsLmJpbmQodGhpcyksXG5cdFx0XHRraWNrOiB0aGlzLl91cGRhdGVLaWNrLmJpbmQodGhpcyksXG5cdFx0XHRzaGFrZTogdGhpcy5fdXBkYXRlU2hha2UuYmluZCh0aGlzKSxcblx0XHRcdHNwaW46IHRoaXMuX3VwZGF0ZVNwaW4uYmluZCh0aGlzKSxcblx0XHRcdHN0aWxsOiB0aGlzLl91cGRhdGVTdGlsbC5iaW5kKHRoaXMpXG5cdFx0fTtcblxuXHRcdHRoaXMuYWNjID0gWzAsIDAsIDBdO1xuXHRcdHRoaXMuZ3lyID0gWzAsIDAsIDBdO1xuXG5cdFx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gYWNjIGludGVuc2l0eVxuXHRcdHRoaXMuX2FjY0xhc3QgPSBbXG5cdFx0XHRbMCwgMCwgMF0sXG5cdFx0XHRbMCwgMCwgMF0sXG5cdFx0XHRbMCwgMCwgMF1cblx0XHRdO1xuXHRcdHRoaXMuX2FjY0ludGVuc2l0eUxhc3QgPSBbXG5cdFx0XHRbMCwgMF0sXG5cdFx0XHRbMCwgMF0sXG5cdFx0XHRbMCwgMF1cblx0XHRdO1xuXHRcdHRoaXMuX2FjY0ludGVuc2l0eSA9IFswLCAwLCAwXTtcblx0XHR0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID0gMDtcblxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZnJlZWZhbGxcblx0XHR0aGlzLl9hY2NOb3JtID0gMDtcblx0XHR0aGlzLl9neXJEZWx0YSA9IFswLCAwLCAwXTtcblx0XHR0aGlzLl9neXJOb3JtID0gMDtcblx0XHR0aGlzLl9neXJEZWx0YU5vcm0gPSAwO1xuXHRcdHRoaXMuX2ZhbGxCZWdpbiA9IDA7XG5cdFx0dGhpcy5fZmFsbEVuZCA9IDA7XG5cdFx0dGhpcy5fZmFsbER1cmF0aW9uID0gMDtcblx0XHR0aGlzLl9pc0ZhbGxpbmcgPSBmYWxzZTtcblxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGd5ciBpbnRlbnNpdHlcblx0XHR0aGlzLl9neXJMYXN0ID0gW1xuXHRcdFx0WzAsIDAsIDBdLFxuXHRcdFx0WzAsIDAsIDBdLFxuXHRcdFx0WzAsIDAsIDBdXG5cdFx0XTtcblx0XHR0aGlzLl9neXJJbnRlbnNpdHlMYXN0ID0gW1xuXHRcdFx0WzAsIDBdLFxuXHRcdFx0WzAsIDBdLFxuXHRcdFx0WzAsIDBdXG5cdFx0XTtcblx0XHR0aGlzLl9neXJJbnRlbnNpdHkgPSBbMCwgMCwgMF07XG5cdFx0dGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSA9IDA7XG5cblx0XHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBraWNrXG5cdFx0dGhpcy5fa2lja0ludGVuc2l0eSA9IDA7XG5cdFx0dGhpcy5fbGFzdEtpY2sgPSAwO1xuXHRcdHRoaXMuX2lzS2lja2luZyA9IGZhbHNlO1xuXHRcdHRoaXMuX21lZGlhblZhbHVlcyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcblx0XHR0aGlzLl9tZWRpYW5MaW5raW5nID0gWzMsIDQsIDEsIDUsIDcsIDgsIDAsIDIsIDZdO1xuXHRcdHRoaXMuX21lZGlhbkZpZm8gPSBbNiwgMiwgNywgMCwgMSwgMywgOCwgNCwgNV07XG5cdFx0dGhpcy5faTEgPSAwO1xuXHRcdHRoaXMuX2kyID0gMDtcblx0XHR0aGlzLl9pMyA9IDA7XG5cdFx0dGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA9IDA7XG5cblx0XHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNoYWtlXG5cdFx0dGhpcy5fYWNjRGVsdGEgPSBbMCwgMCwgMF07XG5cdFx0dGhpcy5fc2hha2VXaW5kb3cgPSBbXG5cdFx0XHRuZXcgQXJyYXkoZi5zaGFrZVdpbmRvd1NpemUpLFxuXHRcdFx0bmV3IEFycmF5KGYuc2hha2VXaW5kb3dTaXplKSxcblx0XHRcdG5ldyBBcnJheShmLnNoYWtlV2luZG93U2l6ZSlcblx0XHRdO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8IGYuc2hha2VXaW5kb3dTaXplOyBqKyspIHtcblx0XHRcdFx0dGhpcy5fc2hha2VXaW5kb3dbaV1bal0gPSAwO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLl9zaGFrZU5iID0gWzAsIDAsIDBdO1xuXHRcdHRoaXMuX3NoYWtpbmdSYXcgPSAwO1xuXHRcdHRoaXMuX3NoYWtlU2xpZGVQcmV2ID0gMDtcblx0XHR0aGlzLl9zaGFraW5nID0gMDtcblxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNwaW5cblx0XHR0aGlzLl9zcGluQmVnaW4gPSAwO1xuXHRcdHRoaXMuX3NwaW5FbmQgPSAwO1xuXHRcdHRoaXMuX3NwaW5EdXJhdGlvbiA9IDA7XG5cdFx0dGhpcy5faXNTcGlubmluZyA9IGZhbHNlO1xuXG5cdFx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzdGlsbFxuXHRcdHRoaXMuX3N0aWxsQ3Jvc3NQcm9kID0gMDtcblx0XHR0aGlzLl9zdGlsbFNsaWRlID0gMDtcblx0XHR0aGlzLl9zdGlsbFNsaWRlUHJldiA9IDA7XG5cdFx0dGhpcy5faXNTdGlsbCA9IGZhbHNlO1xuXG5cdFx0dGhpcy5fbG9vcEluZGV4UGVyaW9kID1cdGYubGNtKFxuXHRcdFx0Zi5sY20oXG5cdFx0XHRcdGYubGNtKDIsIDMpLCBmLmtpY2tNZWRpYW5GaWx0ZXJzaXplXG5cdFx0XHQpLFxuXHRcdFx0Zi5zaGFrZVdpbmRvd1NpemVcblx0XHQpO1xuXHRcdHRoaXMuX2xvb3BJbmRleCA9IDA7XG5cdH1cblxuXHQvLz09PT09PT09PT0gaW50ZXJmYWNlID09PT09PT09PS8vXG5cblx0LyoqXG5cdCAqIHNldEFjY2VsZXJvbWV0ZXIge051bWJlciwgTnVtYmVyLCBOdW1iZXJ9XG5cdCAqIHNldHMgdGhlIGN1cnJlbnQgYWNjZWxlcm9tZXRlciB2YWx1ZXNcblx0ICovXG5cdHNldEFjY2VsZXJvbWV0ZXIoeCwgeSwgeikge1xuXHRcdHRoaXMuYWNjWzBdID0geDtcblx0XHR0aGlzLmFjY1sxXSA9IHk7XG5cdFx0dGhpcy5hY2NbMl0gPSB6XG5cdH1cblxuXHQvKipcblx0ICogc2V0R3lyb3Njb3BlIHtOdW1iZXIsIE51bWJlciwgTnVtYmVyfVxuXHQgKiBzZXRzIHRoZSBjdXJyZW50IGd5cm9zY29wZSB2YWx1ZXNcblx0ICovXG5cdHNldEd5cm9zY29wZSh4LCB5LCB6KSB7XG5cdFx0dGhpcy5neXJbMF0gPSB4O1xuXHRcdHRoaXMuZ3lyWzFdID0geTtcblx0XHR0aGlzLmd5clsyXSA9IHpcblx0fVxuXG5cdC8qKlxuXHQgKiB1cGRhdGUge2Rlc2NyaXB0b3JzQ2FsbGJhY2t9XG5cdCAqIHRyaWdnZXJzIGNvbXB1dGluZyBvZiB0aGUgZGVzY3JpcHRvcnMgd2l0aCB0aGUgY3VycmVudCBzZW5zb3IgdmFsdWVzIGFuZFxuXHQgKiBwYXNzIHRoZSByZXN1bHRzIHRvIGEgY2FsbGJhY2tcblx0ICovXG5cdHVwZGF0ZShjYWxsYmFjaykge1xuXHRcdC8vIERFQUwgV0lUSCB0aGlzLl9lbGFwc2VkVGltZVxuXHRcdHRoaXMuX2VsYXBzZWRUaW1lID0gcGVyZk5vdygpO1xuXHRcdFxuXHRcdGxldCBlcnIgPSBudWxsO1xuXHRcdGxldCByZXMgPSBudWxsO1xuXHRcdHRyeSB7XG5cdFx0XHRyZXMgPSB7fTtcblx0XHRcdGZvciAobGV0IGtleSBvZiB0aGlzLl9wYXJhbXMuZGVzY3JpcHRvcnMpIHtcblx0XHRcdFx0aWYgKHRoaXMuX21ldGhvZHNba2V5XSkge1xuXHRcdFx0XHRcdHRoaXMuX21ldGhvZHNba2V5XShyZXMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XHRcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRlcnIgPSBlO1xuXHRcdH1cblx0XHRjYWxsYmFjayhlcnIsIHJlcyk7XG5cblx0XHR0aGlzLl9sb29wSW5kZXggPSAodGhpcy5fbG9vcEluZGV4ICsgMSkgJSB0aGlzLl9sb29wSW5kZXhQZXJpb2Q7XG5cdH1cblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cblx0Ly89PT09PT09PT09PT09PT09PT09PT09IHNwZWNpZmljIGRlc2NyaXB0b3JzIGNvbXB1dGluZyA9PT09PT09PT09PT09PT09PT09PS8vXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0vL1xuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gYWNjIGludGVuc2l0eVxuXHQvKiogQHByaXZhdGUgKi9cblx0X3VwZGF0ZUFjY0ludGVuc2l0eShyZXMpIHtcblx0XHR0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID0gMDtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cdFx0XHR0aGlzLl9hY2NMYXN0W2ldW3RoaXMuX2xvb3BJbmRleCAlIDNdID0gdGhpcy5hY2NbaV07XG5cblx0XHRcdHRoaXMuX2FjY0ludGVuc2l0eVtpXSA9IGYuaW50ZW5zaXR5MUQoXG5cdFx0XHRcdHRoaXMuYWNjW2ldLFxuXHRcdFx0XHR0aGlzLl9hY2NMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLFxuXHRcdFx0XHR0aGlzLl9hY2NJbnRlbnNpdHlMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDJdLFxuXHRcdFx0XHRmLmFjY0ludGVuc2l0eVBhcmFtMSxcblx0XHRcdFx0Zi5hY2NJbnRlbnNpdHlQYXJhbTIsXG5cdFx0XHRcdDFcblx0XHRcdCk7XG5cblx0XHRcdHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gKz0gdGhpcy5fYWNjSW50ZW5zaXR5W2ldO1xuXHRcdH1cblxuXHRcdHJlcy5hY2NJbnRlbnNpdHkgPSB7XG5cdFx0XHRub3JtOiB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtLFxuXHRcdFx0eDogdGhpcy5fYWNjSW50ZW5zaXR5WzBdLFxuXHRcdFx0eTogdGhpcy5fYWNjSW50ZW5zaXR5WzFdLFxuXHRcdFx0ejogdGhpcy5fYWNjSW50ZW5zaXR5WzJdXG5cdFx0fTtcblx0fVxuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZ3lyIGludGVuc2l0eVxuXHQvKiogQHByaXZhdGUgKi9cblx0X3VwZGF0ZUd5ckludGVuc2l0eShyZXMpIHtcblx0XHR0aGlzLl9neXJJbnRlbnNpdHlOb3JtID0gMDtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cdFx0XHR0aGlzLl9neXJMYXN0W2ldW3RoaXMuX2xvb3BJbmRleCAlIDNdID0gdGhpcy5neXJbaV07XG5cblx0XHRcdHRoaXMuX2d5ckludGVuc2l0eVtpXSA9IGYuaW50ZW5zaXR5MUQoXG5cdFx0XHRcdHRoaXMuZ3lyW2ldLFxuXHRcdFx0XHR0aGlzLl9neXJMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLFxuXHRcdFx0XHR0aGlzLl9neXJJbnRlbnNpdHlMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDJdLFxuXHRcdFx0XHRmLmd5ckludGVuc2l0eVBhcmFtMSxcblx0XHRcdFx0Zi5neXJJbnRlbnNpdHlQYXJhbTIsXG5cdFx0XHRcdDFcblx0XHRcdCk7XG5cblx0XHRcdHRoaXMuX2d5ckludGVuc2l0eU5vcm0gKz0gdGhpcy5fZ3lySW50ZW5zaXR5W2ldO1xuXHRcdH1cblxuXHRcdHJlcy5neXJJbnRlbnNpdHkgPSB7XG5cdFx0XHRub3JtOiB0aGlzLl9neXJJbnRlbnNpdHlOb3JtLFxuXHRcdFx0eDogdGhpcy5fZ3lySW50ZW5zaXR5WzBdLFxuXHRcdFx0eTogdGhpcy5fZ3lySW50ZW5zaXR5WzFdLFxuXHRcdFx0ejogdGhpcy5fZ3lySW50ZW5zaXR5WzJdXG5cdFx0fTtcblx0fVxuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBmcmVlZmFsbFxuXHQvKiogQHByaXZhdGUgKi9cblx0X3VwZGF0ZUZyZWVmYWxsKHJlcykge1xuXHRcdHRoaXMuX2FjY05vcm0gPSBmLm1hZ25pdHVkZTNEKHRoaXMuYWNjKTtcblx0XHR0aGlzLl9neXJOb3JtID0gZi5tYWduaXR1ZGUzRCh0aGlzLmd5cik7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuXHRcdFx0dGhpcy5fZ3lyRGVsdGFbaV0gPVxuXHRcdFx0XHRmLmRlbHRhKHRoaXMuX2d5ckxhc3RbaV1bKHRoaXMuX2xvb3BJbmRleCArIDEpICUgM10sIHRoaXMuZ3lyW2ldLCAxKTtcblx0XHR9XG5cblx0XHR0aGlzLl9neXJEZWx0YU5vcm0gPSBmLm1hZ25pdHVkZTNEKHRoaXMuX2d5ckRlbHRhKTtcblxuXHRcdGlmICh0aGlzLl9hY2NOb3JtIDwgZi5mcmVlZmFsbEFjY1RocmVzaCB8fFxuXHRcdFx0XHQodGhpcy5fZ3lyTm9ybSA+IGYuZnJlZWZhbGxHeXJUaHJlc2hcblx0XHRcdFx0XHQmJiB0aGlzLl9neXJEZWx0YU5vcm0gPCBmLmZyZWVmYWxsR3lyRGVsdGFUaHJlc2gpKSB7XG5cdFx0XHRpZiAoIXRoaXMuX2lzRmFsbGluZykge1xuXHRcdFx0XHR0aGlzLl9pc0ZhbGxpbmcgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLl9mYWxsQmVnaW4gPSBwZXJmTm93KCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9mYWxsRW5kID0gcGVyZk5vdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAodGhpcy5faXNGYWxsaW5nKSB7XG5cdFx0XHRcdHRoaXMuX2lzRmFsbGluZyA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLl9mYWxsRHVyYXRpb24gPSAodGhpcy5fZmFsbEVuZCAtIHRoaXMuX2ZhbGxCZWdpbik7XG5cblx0XHRyZXMuZnJlZWZhbGwgPSB7XG5cdFx0XHRhY2NOb3JtOiB0aGlzLl9hY2NOb3JtLFxuXHRcdFx0ZmFsbGluZzogdGhpcy5faXNGYWxsaW5nLFxuXHRcdFx0ZHVyYXRpb246IHRoaXMuX2ZhbGxEdXJhdGlvblxuXHRcdH07XG5cdH1cblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGtpY2tcblx0LyoqIEBwcml2YXRlICovXG5cdF91cGRhdGVLaWNrKHJlcykge1xuXHRcdHRoaXMuX2kzID0gdGhpcy5fbG9vcEluZGV4ICUgZi5raWNrTWVkaWFuRmlsdGVyc2l6ZTtcblx0XHR0aGlzLl9pMSA9IHRoaXMuX21lZGlhbkZpZm9bdGhpcy5faTNdO1xuXHRcdHRoaXMuX2kyID0gMTtcblxuXHRcdGlmICh0aGlzLl9pMSA8IGYua2lja01lZGlhbkZpbHRlcnNpemUgJiZcblx0XHRcdFx0dGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA+IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXSkge1xuXHRcdFx0Ly8gY2hlY2sgcmlnaHRcblx0XHRcdHdoaWxlICh0aGlzLl9pMSArIHRoaXMuX2kyIDwgdGhpcy5raWNrTWVkaWFuRmlsdGVyc2l6ZSAmJlxuXHRcdFx0XHRcdFx0XHR0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID4gdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdKSB7XG5cdFx0XHRcdHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyXV0gPSBcblx0XHRcdFx0dGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTJdXSAtIDE7XG5cdFx0XHRcdHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPVxuXHRcdFx0XHR0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl07XG5cdFx0XHRcdHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID1cblx0XHRcdFx0dGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyXTtcblx0XHRcdFx0dGhpcy5faTIrKztcblx0XHRcdH1cblx0XHRcdHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuXHRcdFx0dGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyIC0gMV0gPSB0aGlzLl9pMztcblx0XHRcdHRoaXMuX21lZGlhbkZpZm9bdGhpcy5faTNdID0gdGhpcy5faTEgKyB0aGlzLl9pMiAtIDE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGNoZWNrIGxlZnRcblx0XHRcdHdoaWxlICh0aGlzLl9pMiA8IHRoaXMuX2kxICsgMSAmJlxuXHRcdFx0XHRcdFx0IHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPCB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMl0pIHtcblx0XHRcdFx0dGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdXSA9XG5cdFx0XHRcdHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXV0gKyAxO1xuXHRcdFx0XHR0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID1cblx0XHRcdFx0dGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTJdO1xuXHRcdFx0XHR0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9XG5cdFx0XHRcdHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl07XG5cdFx0XHRcdHRoaXMuX2kyKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcblx0XHRcdHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMiArIDFdID0gdGhpcy5faTM7XG5cdFx0XHR0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXSA9IHRoaXMuX2kxIC0gdGhpcy5faTIgKyAxO1xuXHRcdH1cblxuXHRcdC8vIGNvbXBhcmUgY3VycmVudCBpbnRlbnNpdHkgbm9ybSB3aXRoIHByZXZpb3VzIG1lZGlhbiB2YWx1ZVxuXHRcdGlmICh0aGlzLl9hY2NJbnRlbnNpdHlOb3JtIC0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA+IGYua2lja1RocmVzaCkge1xuXHRcdFx0aWYgKHRoaXMuX2lzS2lja2luZykge1xuXHRcdFx0XHRpZiAodGhpcy5fa2lja0ludGVuc2l0eSA8IHRoaXMuX2FjY0ludGVuc2l0eU5vcm0pIHtcblx0XHRcdFx0XHR0aGlzLl9raWNrSW50ZW5zaXR5ID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5faXNLaWNraW5nID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5fa2lja0ludGVuc2l0eSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG5cdFx0XHRcdHRoaXMuX2xhc3RLaWNrID0gdGhpcy5fZWxhcHNlZFRpbWU7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmICh0aGlzLl9lbGFwc2VkVGltZSAtIHRoaXMuX2xhc3RLaWNrID4gZi5raWNrU3BlZWRHYXRlKSB7XG5cdFx0XHRcdHRoaXMuX2lzS2lja2luZyA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4gPSB0aGlzLl9tZWRpYW5WYWx1ZXNbZi5raWNrTWVkaWFuRmlsdGVyc2l6ZV07XG5cblx0XHRyZXMua2ljayA9IHtcblx0XHRcdGludGVuc2l0eTogdGhpcy5fa2lja0ludGVuc2l0eSxcblx0XHRcdGtpY2tpbmc6IHRoaXMuX2lzS2lja2luZ1xuXHRcdH07XG5cdH1cblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc2hha2Vcblx0LyoqIEBwcml2YXRlICovXG5cdF91cGRhdGVTaGFrZShyZXMpIHtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuXHRcdFx0dGhpcy5fYWNjRGVsdGFbaV0gPSBmLmRlbHRhKFxuXHRcdFx0XHR0aGlzLl9hY2NMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLFxuXHRcdFx0XHR0aGlzLmFjY1tpXSxcblx0XHRcdFx0MVxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuXHRcdFx0aWYgKHRoaXMuX3NoYWtlV2luZG93W2ldW3RoaXMuX2xvb3BJbmRleCAlIGYuc2hha2VXaW5kb3dTaXplXSkge1xuXHRcdFx0XHR0aGlzLl9zaGFrZU5iW2ldLS07XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5fYWNjRGVsdGFbaV0gPiBmLnNoYWtlVGhyZXNoKSB7XG5cdFx0XHRcdHRoaXMuX3NoYWtlV2luZG93W2ldW3RoaXMuX2xvb3BJbmRleCAlIGYuc2hha2VXaW5kb3dTaXplXSA9IDE7XG5cdFx0XHRcdHRoaXMuX3NoYWtlTmJbaV0rKztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX3NoYWtlV2luZG93W2ldW3RoaXMuX2xvb3BJbmRleCAlIGYuc2hha2VXaW5kb3dTaXplXSA9IDA7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5fc2hha2luZ1JhdyA9XG5cdFx0Zi5tYWduaXR1ZGUzRCh0aGlzLl9zaGFrZU5iKSAvXG5cdFx0Zi5zaGFrZVdpbmRvd1NpemU7XG5cdFx0dGhpcy5fc2hha2VTbGlkZVByZXYgPSB0aGlzLl9zaGFraW5nO1xuXHRcdHRoaXMuX3NoYWtpbmcgPVxuXHRcdGYuc2xpZGUodGhpcy5fc2hha2VTbGlkZVByZXYsIHRoaXMuX3NoYWtpbmdSYXcsIGYuc2hha2VTbGlkZUZhY3Rvcik7XG5cblx0XHRyZXMuc2hha2UgPSB7XG5cdFx0XHRzaGFraW5nOiB0aGlzLl9zaGFraW5nXG5cdFx0fTtcblx0fVxuXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc3BpblxuXHQvKiogQHByaXZhdGUgKi9cblx0X3VwZGF0ZVNwaW4ocmVzKSB7XG5cdFx0aWYgKHRoaXMuX2d5ck5vcm0gPiBmLnNwaW5UaHJlc2hvbGQpIHtcblx0XHRcdGlmICghdGhpcy5faXNTcGlubmluZykge1xuXHRcdFx0XHR0aGlzLl9pc1NwaW5uaW5nID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5fc3BpbkJlZ2luID0gcGVyZk5vdygpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fc3BpbkVuZCA9IHBlcmZOb3coKTtcblx0XHR9IGVsc2UgaWYgKHRoaXMuX2lzU3Bpbm5pbmcpIHtcblx0XHRcdHRoaXMuX2lzU3Bpbm5pbmcgPSBmYWxzZTtcblx0XHR9XG5cdFx0dGhpcy5fc3BpbkR1cmF0aW9uID0gdGhpcy5fc3BpbkVuZCAtIHRoaXMuX3NwaW5CZWdpbjtcblxuXHRcdHJlcy5zcGluID0ge1xuXHRcdFx0c3Bpbm5pbmc6IHRoaXMuX2lzU3Bpbm5pbmcsXG5cdFx0XHRkdXJhdGlvbjogdGhpcy5fc3BpbkR1cmF0aW9uLFxuXHRcdFx0Z3lyTm9ybTogdGhpcy5fZ3lyTm9ybVxuXHRcdH07XG5cdH1cblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gc3RpbGxcblx0LyoqIEBwcml2YXRlICovXG5cdF91cGRhdGVTdGlsbChyZXMpIHtcblx0XHR0aGlzLl9zdGlsbENyb3NzUHJvZCA9IGYuc3RpbGxDcm9zc1Byb2R1Y3QodGhpcy5neXIpO1xuXHRcdHRoaXMuX3N0aWxsU2xpZGVQcmV2ID0gdGhpcy5fc3RpbGxTbGlkZTtcblx0XHR0aGlzLl9zdGlsbFNsaWRlID0gZi5zbGlkZShcblx0XHRcdHRoaXMuX3N0aWxsU2xpZGVQcmV2LFxuXHRcdFx0dGhpcy5fc3RpbGxDcm9zc1Byb2QsXG5cdFx0XHRmLnN0aWxsU2xpZGVGYWN0b3Jcblx0XHQpO1xuXG5cdFx0aWYgKHRoaXMuX3N0aWxsU2xpZGUgPiBmLnN0aWxsVGhyZXNoKSB7XG5cdFx0XHR0aGlzLl9pc1N0aWxsID0gZmFsc2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX2lzU3RpbGwgPSB0cnVlO1xuXHRcdH1cblx0XG5cdFx0cmVzLnN0aWxsID0ge1xuXHRcdFx0c3RpbGw6IHRoaXMuX2lzU3RpbGwsXG5cdFx0XHRzbGlkZTogdGhpcy5fc3RpbGxTbGlkZVxuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBNb3Rpb25GZWF0dXJlcztcblxuIl19
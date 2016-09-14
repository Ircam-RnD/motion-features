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
 * Example : <pre><code>
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
   * 
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbImdldFRpbWVGdW5jdGlvbiIsIndpbmRvdyIsInQiLCJwcm9jZXNzIiwiaHJ0aW1lIiwicGVyZm9ybWFuY2UiLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInBlcmZOb3ciLCJNb3Rpb25GZWF0dXJlcyIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsImRlc2NyaXB0b3JzIiwiX3BhcmFtcyIsIl9tZXRob2RzIiwiYWNjSW50ZW5zaXR5IiwiX3VwZGF0ZUFjY0ludGVuc2l0eSIsImJpbmQiLCJneXJJbnRlbnNpdHkiLCJfdXBkYXRlR3lySW50ZW5zaXR5IiwiZnJlZWZhbGwiLCJfdXBkYXRlRnJlZWZhbGwiLCJraWNrIiwiX3VwZGF0ZUtpY2siLCJzaGFrZSIsIl91cGRhdGVTaGFrZSIsInNwaW4iLCJfdXBkYXRlU3BpbiIsInN0aWxsIiwiX3VwZGF0ZVN0aWxsIiwiYWNjIiwiZ3lyIiwiX2FjY0xhc3QiLCJfYWNjSW50ZW5zaXR5TGFzdCIsIl9hY2NJbnRlbnNpdHkiLCJfYWNjSW50ZW5zaXR5Tm9ybSIsIl9hY2NOb3JtIiwiX2d5ckRlbHRhIiwiX2d5ck5vcm0iLCJfZ3lyRGVsdGFOb3JtIiwiX2ZhbGxCZWdpbiIsIl9mYWxsRW5kIiwiX2ZhbGxEdXJhdGlvbiIsIl9pc0ZhbGxpbmciLCJfZ3lyTGFzdCIsIl9neXJJbnRlbnNpdHlMYXN0IiwiX2d5ckludGVuc2l0eSIsIl9neXJJbnRlbnNpdHlOb3JtIiwiX2tpY2tJbnRlbnNpdHkiLCJfbGFzdEtpY2siLCJfaXNLaWNraW5nIiwiX21lZGlhblZhbHVlcyIsIl9tZWRpYW5MaW5raW5nIiwiX21lZGlhbkZpZm8iLCJfaTEiLCJfaTIiLCJfaTMiLCJfYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiIsIl9hY2NEZWx0YSIsIl9zaGFrZVdpbmRvdyIsIkFycmF5Iiwic2hha2VXaW5kb3dTaXplIiwiaSIsImoiLCJfc2hha2VOYiIsIl9zaGFraW5nUmF3IiwiX3NoYWtlU2xpZGVQcmV2IiwiX3NoYWtpbmciLCJfc3BpbkJlZ2luIiwiX3NwaW5FbmQiLCJfc3BpbkR1cmF0aW9uIiwiX2lzU3Bpbm5pbmciLCJfc3RpbGxDcm9zc1Byb2QiLCJfc3RpbGxTbGlkZSIsIl9zdGlsbFNsaWRlUHJldiIsIl9pc1N0aWxsIiwiX2xvb3BJbmRleFBlcmlvZCIsImxjbSIsImtpY2tNZWRpYW5GaWx0ZXJzaXplIiwiX2xvb3BJbmRleCIsIngiLCJ5IiwieiIsImNhbGxiYWNrIiwiX2VsYXBzZWRUaW1lIiwiZXJyIiwicmVzIiwia2V5IiwiZSIsImludGVuc2l0eTFEIiwiYWNjSW50ZW5zaXR5UGFyYW0xIiwiYWNjSW50ZW5zaXR5UGFyYW0yIiwibm9ybSIsImd5ckludGVuc2l0eVBhcmFtMSIsImd5ckludGVuc2l0eVBhcmFtMiIsIm1hZ25pdHVkZTNEIiwiZGVsdGEiLCJmcmVlZmFsbEFjY1RocmVzaCIsImZyZWVmYWxsR3lyVGhyZXNoIiwiZnJlZWZhbGxHeXJEZWx0YVRocmVzaCIsImFjY05vcm0iLCJmYWxsaW5nIiwiZHVyYXRpb24iLCJraWNrVGhyZXNoIiwia2lja1NwZWVkR2F0ZSIsImludGVuc2l0eSIsImtpY2tpbmciLCJzaGFrZVRocmVzaCIsInNsaWRlIiwic2hha2VTbGlkZUZhY3RvciIsInNoYWtpbmciLCJzcGluVGhyZXNob2xkIiwic3Bpbm5pbmciLCJneXJOb3JtIiwic3RpbGxDcm9zc1Byb2R1Y3QiLCJzdGlsbFNsaWRlRmFjdG9yIiwic3RpbGxUaHJlc2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7O0FBRUE7Ozs7Ozs7OztBQVNBLFNBQVNBLGVBQVQsR0FBMkI7QUFDekIsS0FBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQUU7QUFDbkMsU0FBTyxZQUFNO0FBQ1gsT0FBTUMsSUFBSUMsUUFBUUMsTUFBUixFQUFWO0FBQ0EsVUFBT0YsRUFBRSxDQUFGLElBQU9BLEVBQUUsQ0FBRixJQUFPLElBQXJCO0FBQ0QsR0FIRDtBQUlELEVB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QUFDQTtBQUNELFFBQUtELGFBQUwsR0FBcUIsS0FBS0QsUUFBTCxHQUFnQixLQUFLRCxVQUExQzs7QUFFQWtCLE9BQUk1RCxJQUFKLEdBQVc7QUFDVnNGLGNBQVUsS0FBS3pDLFdBREw7QUFFVitCLGNBQVUsS0FBS2hDLGFBRkw7QUFHVjJDLGFBQVMsS0FBSzNFO0FBSEosSUFBWDtBQUtBOztBQUVEO0FBQ0E7Ozs7K0JBQ2FnRCxHLEVBQUs7QUFDakIsUUFBS2QsZUFBTCxHQUF1QixtQkFBRTBDLGlCQUFGLENBQW9CLEtBQUtuRixHQUF6QixDQUF2QjtBQUNBLFFBQUsyQyxlQUFMLEdBQXVCLEtBQUtELFdBQTVCO0FBQ0EsUUFBS0EsV0FBTCxHQUFtQixtQkFBRW1DLEtBQUYsQ0FDbEIsS0FBS2xDLGVBRGEsRUFFbEIsS0FBS0YsZUFGYSxFQUdsQixtQkFBRTJDLGdCQUhnQixDQUFuQjs7QUFNQSxPQUFJLEtBQUsxQyxXQUFMLEdBQW1CLG1CQUFFMkMsV0FBekIsRUFBc0M7QUFDckMsU0FBS3pDLFFBQUwsR0FBZ0IsS0FBaEI7QUFDQSxJQUZELE1BRU87QUFDTixTQUFLQSxRQUFMLEdBQWdCLElBQWhCO0FBQ0E7O0FBRURXLE9BQUkxRCxLQUFKLEdBQVk7QUFDWEEsV0FBTyxLQUFLK0MsUUFERDtBQUVYaUMsV0FBTyxLQUFLbkM7QUFGRCxJQUFaO0FBSUE7Ozs7O2tCQUdhaEUsYyIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmIGZyb20gJy4vZmVhdHVyZXMnO1xuXG4vKipcbiAqIENyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aW1lIGluIHNlY29uZHMgYWNjb3JkaW5nIHRvIHRoZSBjdXJyZW50XG4gKiBlbnZpcm9ubmVtZW50IChub2RlIG9yIGJyb3dzZXIpLlxuICogSWYgcnVubmluZyBpbiBub2RlIHRoZSB0aW1lIHJlbHkgb24gYHByb2Nlc3MuaHJ0aW1lYCwgd2hpbGUgaWYgaW4gdGhlIGJyb3dzZXJcbiAqIGl0IGlzIHByb3ZpZGVkIGJ5IHRoZSBgRGF0ZWAgb2JqZWN0LlxuICpcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gZ2V0VGltZUZ1bmN0aW9uKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHsgLy8gYXNzdW1lIG5vZGVcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgY29uc3QgdCA9IHByb2Nlc3MuaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gdFswXSArIHRbMV0gKiAxZS05O1xuICAgIH1cbiAgfSBlbHNlIHsgLy8gYnJvd3NlclxuICAgIGlmICh3aW5kb3cucGVyZm9ybWFuY2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgXHRpZiAoRGF0ZS5ub3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgXHRcdHJldHVybiAoKSA9PiBuZXcgRGF0ZS5nZXRUaW1lKCk7XG4gICAgXHR9IGVsc2Uge1xuICAgICAgXHRyZXR1cm4gKCkgPT4gRGF0ZS5ub3coKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgIFx0cmV0dXJuICgpID0+IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3QgcGVyZk5vdyA9IGdldFRpbWVGdW5jdGlvbigpO1xuXG4vKipcbiAqIENsYXNzIGNvbXB1dGluZyB0aGUgZGVzY3JpcHRvcnMgZnJvbSBhY2NlbGVyb21ldGVyIGFuZCBneXJvc2NvcGUgZGF0YS5cbiAqIEV4YW1wbGUgOiA8cHJlPjxjb2RlPlxuICogY29uc3QgbWYgPSBuZXcgTW90aW9uRmVhdHVyZXMoeyBbJ2FjY0ludGVuc2l0eScsICdneXJJbnRlbnNpdHknLCAnZnJlZWZhbGwnLCAna2ljaycsICdzaGFrZScsICdzcGluJywgJ3N0aWxsJ10gfSk7XG4gKiA8L2NvZGU+PC9wcmU+XG4gKiBAY2xhc3NcbiAqL1xuY2xhc3MgTW90aW9uRmVhdHVyZXMge1xuXG5cdC8qKlxuXHQgKlx0QHBhcmFtIHtPYmplY3QuQXJyYXkuU3RyaW5nfSBkZXNjcmlwdG9ycyAtIGFycmF5IG9mIHJlcXVpcmVkIGRlc2NyaXB0b3JzXG4gXHQgKi9cblx0Y29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG5cdFx0Y29uc3QgZGVmYXVsdHMgPSB7XG5cdFx0XHRkZXNjcmlwdG9yczogW1xuXHRcdFx0XHQnYWNjSW50ZW5zaXR5Jyxcblx0XHRcdFx0J2d5ckludGVuc2l0eScsXG5cdFx0XHRcdCdmcmVlZmFsbCcsXG5cdFx0XHRcdCdraWNrJyxcblx0XHRcdFx0J3NoYWtlJyxcblx0XHRcdFx0J3NwaW4nLFxuXHRcdFx0XHQnc3RpbGwnXG5cdFx0XHRdXG5cdFx0fTtcblx0XHR0aGlzLl9wYXJhbXMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cdFx0Ly9jb25zb2xlLmxvZyh0aGlzLl9wYXJhbXMuZGVzY3JpcHRvcnMpO1xuXG5cdFx0dGhpcy5fbWV0aG9kcyA9IHtcblx0XHRcdGFjY0ludGVuc2l0eTogdGhpcy5fdXBkYXRlQWNjSW50ZW5zaXR5LmJpbmQodGhpcyksXG5cdFx0XHRneXJJbnRlbnNpdHk6IHRoaXMuX3VwZGF0ZUd5ckludGVuc2l0eS5iaW5kKHRoaXMpLFxuXHRcdFx0ZnJlZWZhbGw6IHRoaXMuX3VwZGF0ZUZyZWVmYWxsLmJpbmQodGhpcyksXG5cdFx0XHRraWNrOiB0aGlzLl91cGRhdGVLaWNrLmJpbmQodGhpcyksXG5cdFx0XHRzaGFrZTogdGhpcy5fdXBkYXRlU2hha2UuYmluZCh0aGlzKSxcblx0XHRcdHNwaW46IHRoaXMuX3VwZGF0ZVNwaW4uYmluZCh0aGlzKSxcblx0XHRcdHN0aWxsOiB0aGlzLl91cGRhdGVTdGlsbC5iaW5kKHRoaXMpXG5cdFx0fTtcblxuXHRcdHRoaXMuYWNjID0gWzAsIDAsIDBdO1xuXHRcdHRoaXMuZ3lyID0gWzAsIDAsIDBdO1xuXG5cdFx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gYWNjIGludGVuc2l0eVxuXHRcdHRoaXMuX2FjY0xhc3QgPSBbXG5cdFx0XHRbMCwgMCwgMF0sXG5cdFx0XHRbMCwgMCwgMF0sXG5cdFx0XHRbMCwgMCwgMF1cblx0XHRdO1xuXHRcdHRoaXMuX2FjY0ludGVuc2l0eUxhc3QgPSBbXG5cdFx0XHRbMCwgMF0sXG5cdFx0XHRbMCwgMF0sXG5cdFx0XHRbMCwgMF1cblx0XHRdO1xuXHRcdHRoaXMuX2FjY0ludGVuc2l0eSA9IFswLCAwLCAwXTtcblx0XHR0aGlzLl9hY2NJbnRlbnNpdHlOb3JtID0gMDtcblxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZnJlZWZhbGxcblx0XHR0aGlzLl9hY2NOb3JtID0gMDtcblx0XHR0aGlzLl9neXJEZWx0YSA9IFswLCAwLCAwXTtcblx0XHR0aGlzLl9neXJOb3JtID0gMDtcblx0XHR0aGlzLl9neXJEZWx0YU5vcm0gPSAwO1xuXHRcdHRoaXMuX2ZhbGxCZWdpbiA9IDA7XG5cdFx0dGhpcy5fZmFsbEVuZCA9IDA7XG5cdFx0dGhpcy5fZmFsbER1cmF0aW9uID0gMDtcblx0XHR0aGlzLl9pc0ZhbGxpbmcgPSBmYWxzZTtcblxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGd5ciBpbnRlbnNpdHlcblx0XHR0aGlzLl9neXJMYXN0ID0gW1xuXHRcdFx0WzAsIDAsIDBdLFxuXHRcdFx0WzAsIDAsIDBdLFxuXHRcdFx0WzAsIDAsIDBdXG5cdFx0XTtcblx0XHR0aGlzLl9neXJJbnRlbnNpdHlMYXN0ID0gW1xuXHRcdFx0WzAsIDBdLFxuXHRcdFx0WzAsIDBdLFxuXHRcdFx0WzAsIDBdXG5cdFx0XTtcblx0XHR0aGlzLl9neXJJbnRlbnNpdHkgPSBbMCwgMCwgMF07XG5cdFx0dGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSA9IDA7XG5cblx0XHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBraWNrXG5cdFx0dGhpcy5fa2lja0ludGVuc2l0eSA9IDA7XG5cdFx0dGhpcy5fbGFzdEtpY2sgPSAwO1xuXHRcdHRoaXMuX2lzS2lja2luZyA9IGZhbHNlO1xuXHRcdHRoaXMuX21lZGlhblZhbHVlcyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcblx0XHR0aGlzLl9tZWRpYW5MaW5raW5nID0gWzMsIDQsIDEsIDUsIDcsIDgsIDAsIDIsIDZdO1xuXHRcdHRoaXMuX21lZGlhbkZpZm8gPSBbNiwgMiwgNywgMCwgMSwgMywgOCwgNCwgNV07XG5cdFx0dGhpcy5faTEgPSAwO1xuXHRcdHRoaXMuX2kyID0gMDtcblx0XHR0aGlzLl9pMyA9IDA7XG5cdFx0dGhpcy5fYWNjSW50ZW5zaXR5Tm9ybU1lZGlhbiA9IDA7XG5cblx0XHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNoYWtlXG5cdFx0dGhpcy5fYWNjRGVsdGEgPSBbMCwgMCwgMF07XG5cdFx0dGhpcy5fc2hha2VXaW5kb3cgPSBbXG5cdFx0XHRuZXcgQXJyYXkoZi5zaGFrZVdpbmRvd1NpemUpLFxuXHRcdFx0bmV3IEFycmF5KGYuc2hha2VXaW5kb3dTaXplKSxcblx0XHRcdG5ldyBBcnJheShmLnNoYWtlV2luZG93U2l6ZSlcblx0XHRdO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8IGYuc2hha2VXaW5kb3dTaXplOyBqKyspIHtcblx0XHRcdFx0dGhpcy5fc2hha2VXaW5kb3dbaV1bal0gPSAwO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aGlzLl9zaGFrZU5iID0gWzAsIDAsIDBdO1xuXHRcdHRoaXMuX3NoYWtpbmdSYXcgPSAwO1xuXHRcdHRoaXMuX3NoYWtlU2xpZGVQcmV2ID0gMDtcblx0XHR0aGlzLl9zaGFraW5nID0gMDtcblxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNwaW5cblx0XHR0aGlzLl9zcGluQmVnaW4gPSAwO1xuXHRcdHRoaXMuX3NwaW5FbmQgPSAwO1xuXHRcdHRoaXMuX3NwaW5EdXJhdGlvbiA9IDA7XG5cdFx0dGhpcy5faXNTcGlubmluZyA9IGZhbHNlO1xuXG5cdFx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBzdGlsbFxuXHRcdHRoaXMuX3N0aWxsQ3Jvc3NQcm9kID0gMDtcblx0XHR0aGlzLl9zdGlsbFNsaWRlID0gMDtcblx0XHR0aGlzLl9zdGlsbFNsaWRlUHJldiA9IDA7XG5cdFx0dGhpcy5faXNTdGlsbCA9IGZhbHNlO1xuXG5cdFx0dGhpcy5fbG9vcEluZGV4UGVyaW9kID1cdGYubGNtKFxuXHRcdFx0Zi5sY20oXG5cdFx0XHRcdGYubGNtKDIsIDMpLCBmLmtpY2tNZWRpYW5GaWx0ZXJzaXplXG5cdFx0XHQpLFxuXHRcdFx0Zi5zaGFrZVdpbmRvd1NpemVcblx0XHQpO1xuXHRcdHRoaXMuX2xvb3BJbmRleCA9IDA7XG5cdH1cblxuXHQvLz09PT09PT09PT0gaW50ZXJmYWNlID09PT09PT09PS8vXG5cblx0LyoqXG5cdCAqIHNldEFjY2VsZXJvbWV0ZXIge051bWJlciwgTnVtYmVyLCBOdW1iZXJ9XG5cdCAqIHNldHMgdGhlIGN1cnJlbnQgYWNjZWxlcm9tZXRlciB2YWx1ZXNcblx0ICovXG5cdHNldEFjY2VsZXJvbWV0ZXIoeCwgeSwgeikge1xuXHRcdHRoaXMuYWNjWzBdID0geDtcblx0XHR0aGlzLmFjY1sxXSA9IHk7XG5cdFx0dGhpcy5hY2NbMl0gPSB6XG5cdH1cblxuXHQvKipcblx0ICogc2V0R3lyb3Njb3BlIHtOdW1iZXIsIE51bWJlciwgTnVtYmVyfVxuXHQgKiBzZXRzIHRoZSBjdXJyZW50IGd5cm9zY29wZSB2YWx1ZXNcblx0ICovXG5cdHNldEd5cm9zY29wZSh4LCB5LCB6KSB7XG5cdFx0dGhpcy5neXJbMF0gPSB4O1xuXHRcdHRoaXMuZ3lyWzFdID0geTtcblx0XHR0aGlzLmd5clsyXSA9IHpcblx0fVxuXG5cdC8qKlxuXHQgKiBcblxuXHQvKipcblx0ICogdXBkYXRlIHtkZXNjcmlwdG9yc0NhbGxiYWNrfVxuXHQgKiB0cmlnZ2VycyBjb21wdXRpbmcgb2YgdGhlIGRlc2NyaXB0b3JzIHdpdGggdGhlIGN1cnJlbnQgc2Vuc29yIHZhbHVlcyBhbmRcblx0ICogcGFzcyB0aGUgcmVzdWx0cyB0byBhIGNhbGxiYWNrXG5cdCAqL1xuXHR1cGRhdGUoY2FsbGJhY2spIHtcblx0XHQvLyBERUFMIFdJVEggdGhpcy5fZWxhcHNlZFRpbWVcblx0XHR0aGlzLl9lbGFwc2VkVGltZSA9IHBlcmZOb3coKTtcblx0XHRcblx0XHRsZXQgZXJyID0gbnVsbDtcblx0XHRsZXQgcmVzID0gbnVsbDtcblx0XHR0cnkge1xuXHRcdFx0cmVzID0ge307XG5cdFx0XHRmb3IgKGxldCBrZXkgb2YgdGhpcy5fcGFyYW1zLmRlc2NyaXB0b3JzKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9tZXRob2RzW2tleV0pIHtcblx0XHRcdFx0XHR0aGlzLl9tZXRob2RzW2tleV0ocmVzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVx0XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0ZXJyID0gZTtcblx0XHR9XG5cdFx0Y2FsbGJhY2soZXJyLCByZXMpO1xuXG5cdFx0dGhpcy5fbG9vcEluZGV4ID0gKHRoaXMuX2xvb3BJbmRleCArIDEpICUgdGhpcy5fbG9vcEluZGV4UGVyaW9kO1xuXHR9XG5cblx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PS8vXG5cdC8vPT09PT09PT09PT09PT09PT09PT09PSBzcGVjaWZpYyBkZXNjcmlwdG9ycyBjb21wdXRpbmcgPT09PT09PT09PT09PT09PT09PT0vL1xuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ly9cblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGFjYyBpbnRlbnNpdHlcblx0LyoqIEBwcml2YXRlICovXG5cdF91cGRhdGVBY2NJbnRlbnNpdHkocmVzKSB7XG5cdFx0dGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA9IDA7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuXHRcdFx0dGhpcy5fYWNjTGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAzXSA9IHRoaXMuYWNjW2ldO1xuXG5cdFx0XHR0aGlzLl9hY2NJbnRlbnNpdHlbaV0gPSBmLmludGVuc2l0eTFEKFxuXHRcdFx0XHR0aGlzLmFjY1tpXSxcblx0XHRcdFx0dGhpcy5fYWNjTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSxcblx0XHRcdFx0dGhpcy5fYWNjSW50ZW5zaXR5TGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAyXSxcblx0XHRcdFx0Zi5hY2NJbnRlbnNpdHlQYXJhbTEsXG5cdFx0XHRcdGYuYWNjSW50ZW5zaXR5UGFyYW0yLFxuXHRcdFx0XHQxXG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLl9hY2NJbnRlbnNpdHlOb3JtICs9IHRoaXMuX2FjY0ludGVuc2l0eVtpXTtcblx0XHR9XG5cblx0XHRyZXMuYWNjSW50ZW5zaXR5ID0ge1xuXHRcdFx0bm9ybTogdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSxcblx0XHRcdHg6IHRoaXMuX2FjY0ludGVuc2l0eVswXSxcblx0XHRcdHk6IHRoaXMuX2FjY0ludGVuc2l0eVsxXSxcblx0XHRcdHo6IHRoaXMuX2FjY0ludGVuc2l0eVsyXVxuXHRcdH07XG5cdH1cblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IGd5ciBpbnRlbnNpdHlcblx0LyoqIEBwcml2YXRlICovXG5cdF91cGRhdGVHeXJJbnRlbnNpdHkocmVzKSB7XG5cdFx0dGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSA9IDA7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuXHRcdFx0dGhpcy5fZ3lyTGFzdFtpXVt0aGlzLl9sb29wSW5kZXggJSAzXSA9IHRoaXMuZ3lyW2ldO1xuXG5cdFx0XHR0aGlzLl9neXJJbnRlbnNpdHlbaV0gPSBmLmludGVuc2l0eTFEKFxuXHRcdFx0XHR0aGlzLmd5cltpXSxcblx0XHRcdFx0dGhpcy5fZ3lyTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSxcblx0XHRcdFx0dGhpcy5fZ3lySW50ZW5zaXR5TGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAyXSxcblx0XHRcdFx0Zi5neXJJbnRlbnNpdHlQYXJhbTEsXG5cdFx0XHRcdGYuZ3lySW50ZW5zaXR5UGFyYW0yLFxuXHRcdFx0XHQxXG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLl9neXJJbnRlbnNpdHlOb3JtICs9IHRoaXMuX2d5ckludGVuc2l0eVtpXTtcblx0XHR9XG5cblx0XHRyZXMuZ3lySW50ZW5zaXR5ID0ge1xuXHRcdFx0bm9ybTogdGhpcy5fZ3lySW50ZW5zaXR5Tm9ybSxcblx0XHRcdHg6IHRoaXMuX2d5ckludGVuc2l0eVswXSxcblx0XHRcdHk6IHRoaXMuX2d5ckludGVuc2l0eVsxXSxcblx0XHRcdHo6IHRoaXMuX2d5ckludGVuc2l0eVsyXVxuXHRcdH07XG5cdH1cblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gZnJlZWZhbGxcblx0LyoqIEBwcml2YXRlICovXG5cdF91cGRhdGVGcmVlZmFsbChyZXMpIHtcblx0XHR0aGlzLl9hY2NOb3JtID0gZi5tYWduaXR1ZGUzRCh0aGlzLmFjYyk7XG5cdFx0dGhpcy5fZ3lyTm9ybSA9IGYubWFnbml0dWRlM0QodGhpcy5neXIpO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcblx0XHRcdHRoaXMuX2d5ckRlbHRhW2ldID1cblx0XHRcdFx0Zi5kZWx0YSh0aGlzLl9neXJMYXN0W2ldWyh0aGlzLl9sb29wSW5kZXggKyAxKSAlIDNdLCB0aGlzLmd5cltpXSwgMSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fZ3lyRGVsdGFOb3JtID0gZi5tYWduaXR1ZGUzRCh0aGlzLl9neXJEZWx0YSk7XG5cblx0XHRpZiAodGhpcy5fYWNjTm9ybSA8IGYuZnJlZWZhbGxBY2NUaHJlc2ggfHxcblx0XHRcdFx0KHRoaXMuX2d5ck5vcm0gPiBmLmZyZWVmYWxsR3lyVGhyZXNoXG5cdFx0XHRcdFx0JiYgdGhpcy5fZ3lyRGVsdGFOb3JtIDwgZi5mcmVlZmFsbEd5ckRlbHRhVGhyZXNoKSkge1xuXHRcdFx0aWYgKCF0aGlzLl9pc0ZhbGxpbmcpIHtcblx0XHRcdFx0dGhpcy5faXNGYWxsaW5nID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5fZmFsbEJlZ2luID0gcGVyZk5vdygpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fZmFsbEVuZCA9IHBlcmZOb3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHRoaXMuX2lzRmFsbGluZykge1xuXHRcdFx0XHR0aGlzLl9pc0ZhbGxpbmcgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy5fZmFsbER1cmF0aW9uID0gKHRoaXMuX2ZhbGxFbmQgLSB0aGlzLl9mYWxsQmVnaW4pO1xuXG5cdFx0cmVzLmZyZWVmYWxsID0ge1xuXHRcdFx0YWNjTm9ybTogdGhpcy5fYWNjTm9ybSxcblx0XHRcdGZhbGxpbmc6IHRoaXMuX2lzRmFsbGluZyxcblx0XHRcdGR1cmF0aW9uOiB0aGlzLl9mYWxsRHVyYXRpb25cblx0XHR9O1xuXHR9XG5cblx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBraWNrXG5cdC8qKiBAcHJpdmF0ZSAqL1xuXHRfdXBkYXRlS2ljayhyZXMpIHtcblx0XHR0aGlzLl9pMyA9IHRoaXMuX2xvb3BJbmRleCAlIGYua2lja01lZGlhbkZpbHRlcnNpemU7XG5cdFx0dGhpcy5faTEgPSB0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXTtcblx0XHR0aGlzLl9pMiA9IDE7XG5cblx0XHRpZiAodGhpcy5faTEgPCBmLmtpY2tNZWRpYW5GaWx0ZXJzaXplICYmXG5cdFx0XHRcdHRoaXMuX2FjY0ludGVuc2l0eU5vcm0gPiB0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMl0pIHtcblx0XHRcdC8vIGNoZWNrIHJpZ2h0XG5cdFx0XHR3aGlsZSAodGhpcy5faTEgKyB0aGlzLl9pMiA8IHRoaXMua2lja01lZGlhbkZpbHRlcnNpemUgJiZcblx0XHRcdFx0XHRcdFx0dGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSA+IHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSArIHRoaXMuX2kyXSkge1xuXHRcdFx0XHR0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl1dID0gXG5cdFx0XHRcdHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSArIHRoaXMuX2kyXV0gLSAxO1xuXHRcdFx0XHR0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID1cblx0XHRcdFx0dGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxICsgdGhpcy5faTJdO1xuXHRcdFx0XHR0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxICsgdGhpcy5faTIgLSAxXSA9XG5cdFx0XHRcdHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMl07XG5cdFx0XHRcdHRoaXMuX2kyKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9tZWRpYW5WYWx1ZXNbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID0gdGhpcy5fYWNjSW50ZW5zaXR5Tm9ybTtcblx0XHRcdHRoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgKyB0aGlzLl9pMiAtIDFdID0gdGhpcy5faTM7XG5cdFx0XHR0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX2kzXSA9IHRoaXMuX2kxICsgdGhpcy5faTIgLSAxO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBjaGVjayBsZWZ0XG5cdFx0XHR3aGlsZSAodGhpcy5faTIgPCB0aGlzLl9pMSArIDEgJiZcblx0XHRcdFx0XHRcdCB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtIDwgdGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTJdKSB7XG5cdFx0XHRcdHRoaXMuX21lZGlhbkZpZm9bdGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyXV0gPVxuXHRcdFx0XHR0aGlzLl9tZWRpYW5GaWZvW3RoaXMuX21lZGlhbkxpbmtpbmdbdGhpcy5faTEgLSB0aGlzLl9pMl1dICsgMTtcblx0XHRcdFx0dGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9XG5cdFx0XHRcdHRoaXMuX21lZGlhblZhbHVlc1t0aGlzLl9pMSAtIHRoaXMuX2kyXTtcblx0XHRcdFx0dGhpcy5fbWVkaWFuTGlua2luZ1t0aGlzLl9pMSAtIHRoaXMuX2kyICsgMV0gPVxuXHRcdFx0XHR0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTJdO1xuXHRcdFx0XHR0aGlzLl9pMisrO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fbWVkaWFuVmFsdWVzW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG5cdFx0XHR0aGlzLl9tZWRpYW5MaW5raW5nW3RoaXMuX2kxIC0gdGhpcy5faTIgKyAxXSA9IHRoaXMuX2kzO1xuXHRcdFx0dGhpcy5fbWVkaWFuRmlmb1t0aGlzLl9pM10gPSB0aGlzLl9pMSAtIHRoaXMuX2kyICsgMTtcblx0XHR9XG5cblx0XHQvLyBjb21wYXJlIGN1cnJlbnQgaW50ZW5zaXR5IG5vcm0gd2l0aCBwcmV2aW91cyBtZWRpYW4gdmFsdWVcblx0XHRpZiAodGhpcy5fYWNjSW50ZW5zaXR5Tm9ybSAtIHRoaXMuX2FjY0ludGVuc2l0eU5vcm1NZWRpYW4gPiBmLmtpY2tUaHJlc2gpIHtcblx0XHRcdGlmICh0aGlzLl9pc0tpY2tpbmcpIHtcblx0XHRcdFx0aWYgKHRoaXMuX2tpY2tJbnRlbnNpdHkgPCB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtKSB7XG5cdFx0XHRcdFx0dGhpcy5fa2lja0ludGVuc2l0eSA9IHRoaXMuX2FjY0ludGVuc2l0eU5vcm07XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2lzS2lja2luZyA9IHRydWU7XG5cdFx0XHRcdHRoaXMuX2tpY2tJbnRlbnNpdHkgPSB0aGlzLl9hY2NJbnRlbnNpdHlOb3JtO1xuXHRcdFx0XHR0aGlzLl9sYXN0S2ljayA9IHRoaXMuX2VsYXBzZWRUaW1lO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAodGhpcy5fZWxhcHNlZFRpbWUgLSB0aGlzLl9sYXN0S2ljayA+IGYua2lja1NwZWVkR2F0ZSkge1xuXHRcdFx0XHR0aGlzLl9pc0tpY2tpbmcgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9hY2NJbnRlbnNpdHlOb3JtTWVkaWFuID0gdGhpcy5fbWVkaWFuVmFsdWVzW2Yua2lja01lZGlhbkZpbHRlcnNpemVdO1xuXG5cdFx0cmVzLmtpY2sgPSB7XG5cdFx0XHRpbnRlbnNpdHk6IHRoaXMuX2tpY2tJbnRlbnNpdHksXG5cdFx0XHRraWNraW5nOiB0aGlzLl9pc0tpY2tpbmdcblx0XHR9O1xuXHR9XG5cblx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNoYWtlXG5cdC8qKiBAcHJpdmF0ZSAqL1xuXHRfdXBkYXRlU2hha2UocmVzKSB7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcblx0XHRcdHRoaXMuX2FjY0RlbHRhW2ldID0gZi5kZWx0YShcblx0XHRcdFx0dGhpcy5fYWNjTGFzdFtpXVsodGhpcy5fbG9vcEluZGV4ICsgMSkgJSAzXSxcblx0XHRcdFx0dGhpcy5hY2NbaV0sXG5cdFx0XHRcdDFcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSBmLnNoYWtlV2luZG93U2l6ZV0pIHtcblx0XHRcdFx0dGhpcy5fc2hha2VOYltpXS0tO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuX2FjY0RlbHRhW2ldID4gZi5zaGFrZVRocmVzaCkge1xuXHRcdFx0XHR0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSBmLnNoYWtlV2luZG93U2l6ZV0gPSAxO1xuXHRcdFx0XHR0aGlzLl9zaGFrZU5iW2ldKys7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9zaGFrZVdpbmRvd1tpXVt0aGlzLl9sb29wSW5kZXggJSBmLnNoYWtlV2luZG93U2l6ZV0gPSAwO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuX3NoYWtpbmdSYXcgPVxuXHRcdGYubWFnbml0dWRlM0QodGhpcy5fc2hha2VOYikgL1xuXHRcdGYuc2hha2VXaW5kb3dTaXplO1xuXHRcdHRoaXMuX3NoYWtlU2xpZGVQcmV2ID0gdGhpcy5fc2hha2luZztcblx0XHR0aGlzLl9zaGFraW5nID1cblx0XHRmLnNsaWRlKHRoaXMuX3NoYWtlU2xpZGVQcmV2LCB0aGlzLl9zaGFraW5nUmF3LCBmLnNoYWtlU2xpZGVGYWN0b3IpO1xuXG5cdFx0cmVzLnNoYWtlID0ge1xuXHRcdFx0c2hha2luZzogdGhpcy5fc2hha2luZ1xuXHRcdH07XG5cdH1cblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHNwaW5cblx0LyoqIEBwcml2YXRlICovXG5cdF91cGRhdGVTcGluKHJlcykge1xuXHRcdGlmICh0aGlzLl9neXJOb3JtID4gZi5zcGluVGhyZXNob2xkKSB7XG5cdFx0XHRpZiAoIXRoaXMuX2lzU3Bpbm5pbmcpIHtcblx0XHRcdFx0dGhpcy5faXNTcGlubmluZyA9IHRydWU7XG5cdFx0XHRcdHRoaXMuX3NwaW5CZWdpbiA9IHBlcmZOb3coKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX3NwaW5FbmQgPSBwZXJmTm93KCk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLl9pc1NwaW5uaW5nKSB7XG5cdFx0XHR0aGlzLl9pc1NwaW5uaW5nID0gZmFsc2U7XG5cdFx0fVxuXHRcdHRoaXMuX3NwaW5EdXJhdGlvbiA9IHRoaXMuX3NwaW5FbmQgLSB0aGlzLl9zcGluQmVnaW47XG5cblx0XHRyZXMuc3BpbiA9IHtcblx0XHRcdHNwaW5uaW5nOiB0aGlzLl9pc1NwaW5uaW5nLFxuXHRcdFx0ZHVyYXRpb246IHRoaXMuX3NwaW5EdXJhdGlvbixcblx0XHRcdGd5ck5vcm06IHRoaXMuX2d5ck5vcm1cblx0XHR9O1xuXHR9XG5cblx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IHN0aWxsXG5cdC8qKiBAcHJpdmF0ZSAqL1xuXHRfdXBkYXRlU3RpbGwocmVzKSB7XG5cdFx0dGhpcy5fc3RpbGxDcm9zc1Byb2QgPSBmLnN0aWxsQ3Jvc3NQcm9kdWN0KHRoaXMuZ3lyKTtcblx0XHR0aGlzLl9zdGlsbFNsaWRlUHJldiA9IHRoaXMuX3N0aWxsU2xpZGU7XG5cdFx0dGhpcy5fc3RpbGxTbGlkZSA9IGYuc2xpZGUoXG5cdFx0XHR0aGlzLl9zdGlsbFNsaWRlUHJldixcblx0XHRcdHRoaXMuX3N0aWxsQ3Jvc3NQcm9kLFxuXHRcdFx0Zi5zdGlsbFNsaWRlRmFjdG9yXG5cdFx0KTtcblxuXHRcdGlmICh0aGlzLl9zdGlsbFNsaWRlID4gZi5zdGlsbFRocmVzaCkge1xuXHRcdFx0dGhpcy5faXNTdGlsbCA9IGZhbHNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9pc1N0aWxsID0gdHJ1ZTtcblx0XHR9XG5cdFxuXHRcdHJlcy5zdGlsbCA9IHtcblx0XHRcdHN0aWxsOiB0aGlzLl9pc1N0aWxsLFxuXHRcdFx0c2xpZGU6IHRoaXMuX3N0aWxsU2xpZGVcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTW90aW9uRmVhdHVyZXM7XG5cbiJdfQ==
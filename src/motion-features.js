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
  if (typeof window === 'undefined') { // assume node
    return () => {
      const t = process.hrtime();
      return t[0] + t[1] * 1e-9;
    }
  } else { // browser
    if (window.performance === 'undefined') {
      if (Date.now === 'undefined') {
        return () => { return new Date.getTime() };
      } else {
        return () => { return Date.now() };
      }
    } else {
      return () => { return window.performance.now() };
    }
  }
}

const perfNow = getTimeFunction();

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
 * mf.setGyroscopes(alpha, beta, theta);
 * mf.update(function(err, res) {
 *   if (err === null) {
 *     // do something with res
 *   }
 * });
 * ```
 * @class
 */
class MotionFeatures {

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
  constructor(options = {}) {
    const defaults = {
      descriptors: [
        'accRaw',
        'gyrRaw',
        'accIntensity',
        'gyrIntensity',
        'freefall',
        'kick',
        'shake',
        'spin',
        'still'
      ],

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
      stillSlideFactor: 5,
    };

    this._params = Object.assign({}, defaults, options);
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
    this._accLast = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    this._accIntensityLast = [
      [0, 0],
      [0, 0],
      [0, 0]
    ];
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
    this._gyrLast = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    this._gyrIntensityLast = [
      [0, 0],
      [0, 0],
      [0, 0]
    ];
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
    this._shakeWindow = [
      new Array(this._params.shakeWindowSize),
      new Array(this._params.shakeWindowSize),
      new Array(this._params.shakeWindowSize)
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < this._params.shakeWindowSize; j++) {
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

    this._loopIndexPeriod = this._lcm(
      this._lcm(
        this._lcm(2, 3), this._params.kickMedianFiltersize
      ),
      this._params.shakeWindowSize
    );
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
  setAccelerometer(x, y, z) {
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
  setGyroscope(x, y, z) {
    this.gyr[0] = x;
    this.gyr[1] = y;
    this.gyr[2] = z;
    if (this._params.gyrIsInDegrees) {
      for (let i = 0; i < 3; i++) {
        this.gyr[i] *= (2 * Math.PI / 360.);
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
   * triggers computation of the descriptors from the current sensor values and
   * pass the results to a callback
   * @param {featuresCallback} callback - the callback handling the last computed descriptors
   */
  update(callback) {
    // DEAL WITH this._elapsedTime
    this._elapsedTime = perfNow();
    // is this one used by several features ?
    this._accNorm = this._magnitude3D(this.acc);
    // this one needs be here because used by freefall AND spin
    this._gyrNorm = this._magnitude3D(this.gyr);
    
    let err = null;
    let res = null;
    try {
      res = {};
      for (let key of this._params.descriptors) {
        if (this._methods[key]) {
          this._methods[key](res);
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

  /** @private */
  _updateAccRaw(res) {
    res.accRaw = {
      x: this.acc[0],
      y: this.acc[1],
      z: this.acc[2]
    };
  }

  /** @private */
  _updateGyrRaw(res) {
    res.gyrRaw = {
      x: this.gyr[0],
      y: this.gyr[1],
      z: this.gyr[2]
    };
  }

  //============================================================== acc intensity
  /** @private */
  _updateAccIntensity(res) {
    this._accIntensityNorm = 0;

    for (let i = 0; i < 3; i++) {
      this._accLast[i][this._loopIndex % 3] = this.acc[i];

      this._accIntensity[i] = this._intensity1D(
        this.acc[i],
        this._accLast[i][(this._loopIndex + 1) % 3],
        this._accIntensityLast[i][(this._loopIndex + 1) % 2],
        this._params.accIntensityParam1,
        this._params.accIntensityParam2,
        1
      );

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
  _updateGyrIntensity(res) {
    this._gyrIntensityNorm = 0;

    for (let i = 0; i < 3; i++) {
      this._gyrLast[i][this._loopIndex % 3] = this.gyr[i];

      this._gyrIntensity[i] = this._intensity1D(
        this.gyr[i],
        this._gyrLast[i][(this._loopIndex + 1) % 3],
        this._gyrIntensityLast[i][(this._loopIndex + 1) % 2],
        this._params.gyrIntensityParam1,
        this._params.gyrIntensityParam2,
        1
      );

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
  _updateFreefall(res) {
    for (let i = 0; i < 3; i++) {
      this._gyrDelta[i] =
        this._delta(this._gyrLast[i][(this._loopIndex + 1) % 3], this.gyr[i], 1);
    }

    this._gyrDeltaNorm = this._magnitude3D(this._gyrDelta);

    if (this._accNorm < this._params.freefallAccThresh ||
        (this._gyrNorm > this._params.freefallGyrThresh
          && this._gyrDeltaNorm < this._params.freefallGyrDeltaThresh)) {
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
    this._fallDuration = (this._fallEnd - this._fallBegin);

    res.freefall = {
      accNorm: this._accNorm,
      falling: this._isFalling,
      duration: this._fallDuration
    };
  }

  //======================================================================= kick
  /** @private */
  _updateKick(res) {
    this._i3 = this._loopIndex % this._params.kickMedianFiltersize;
    this._i1 = this._medianFifo[this._i3];
    this._i2 = 1;

    if (this._i1 < this._params.kickMedianFiltersize &&
        this._accIntensityNorm > this._medianValues[this._i1 + this._i2]) {
      // check right
      while (this._i1 + this._i2 < this.kickMedianFiltersize &&
              this._accIntensityNorm > this._medianValues[this._i1 + this._i2]) {
        this._medianFifo[this._medianLinking[this._i1 + this._i2]] = 
        this._medianFifo[this._medianLinking[this._i1 + this._i2]] - 1;
        this._medianValues[this._i1 + this._i2 - 1] =
        this._medianValues[this._i1 + this._i2];
        this._medianLinking[this._i1 + this._i2 - 1] =
        this._medianLinking[this._i1 + this._i2];
        this._i2++;
      }
      this._medianValues[this._i1 + this._i2 - 1] = this._accIntensityNorm;
      this._medianLinking[this._i1 + this._i2 - 1] = this._i3;
      this._medianFifo[this._i3] = this._i1 + this._i2 - 1;
    } else {
      // check left
      while (this._i2 < this._i1 + 1 &&
             this._accIntensityNorm < this._medianValues[this._i1 - this._i2]) {
        this._medianFifo[this._medianLinking[this._i1 - this._i2]] =
        this._medianFifo[this._medianLinking[this._i1 - this._i2]] + 1;
        this._medianValues[this._i1 - this._i2 + 1] =
        this._medianValues[this._i1 - this._i2];
        this._medianLinking[this._i1 - this._i2 + 1] =
        this._medianLinking[this._i1 - this._i2];
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
  _updateShake(res) {
    for (let i = 0; i < 3; i++) {
      this._accDelta[i] = this._delta(
        this._accLast[i][(this._loopIndex + 1) % 3],
        this.acc[i],
        1
      );
    }

    for (let i = 0; i < 3; i++) {
      if (this._shakeWindow[i][this._loopIndex % this._params.shakeWindowSize]) {
        this._shakeNb[i]--;
      }
      if (this._accDelta[i] > this._params.shakeThresh) {
        this._shakeWindow[i][this._loopIndex % this._params.shakeWindowSize] = 1;
        this._shakeNb[i]++;
      } else {
        this._shakeWindow[i][this._loopIndex % this._params.shakeWindowSize] = 0;
      }
    }

    this._shakingRaw =
    this._magnitude3D(this._shakeNb) /
    this._params.shakeWindowSize;
    this._shakeSlidePrev = this._shaking;
    this._shaking =
    this._slide(this._shakeSlidePrev, this._shakingRaw, this._params.shakeSlideFactor);

    res.shake = {
      shaking: this._shaking
    };
  }

  //======================================================================= spin
  /** @private */
  _updateSpin(res) {
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
  _updateStill(res) {
    this._stillCrossProd = this._stillCrossProduct(this.gyr);
    this._stillSlidePrev = this._stillSlide;
    this._stillSlide = this._slide(
      this._stillSlidePrev,
      this._stillCrossProd,
      this._params.stillSlideFactor
    );

    if (this._stillSlide > this._params.stillThresh) {
      this._isStill = false;
    } else {
      this._isStill = true;
    }
  
    res.still = {
      still: this._isStill,
      slide: this._stillSlide
    }
  }

  //==========================================================================//
  //================================ UTILITIES ===============================//
  //==========================================================================//
  /** @private */
  _delta(prev, next, dt) {
    return (next - prev) / (2 * dt);
  }

  /** @private */
  _intensity1D(nextX, prevX, prevIntensity, param1, param2, dt) {
    const dx = this._delta(nextX, prevX, dt);//(nextX - prevX) / (2 * dt);
    return param2 * dx * dx + param1 * prevIntensity;
  }

  /** @private */
  _magnitude3D(xyzArray) {
    return Math.sqrt(xyzArray[0] * xyzArray[0] + 
                xyzArray[1] * xyzArray[1] +
                xyzArray[2] * xyzArray[2]);
  }

  /** @private */
  _lcm(a, b) {
    let a1 = a, b1 = b;

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
  _slide(prevSlide, currentVal, slideFactor) {
    return prevSlide + (currentVal - prevSlide) / slideFactor;
  }

  /** @private */
  _stillCrossProduct(xyzArray) {
    return (xyzArray[1] - xyzArray[2]) * (xyzArray[1] - xyzArray[2]) +
           (xyzArray[0] - xyzArray[1]) * (xyzArray[0] - xyzArray[1]) +
           (xyzArray[2] - xyzArray[0]) * (xyzArray[2] - xyzArray[0]);
  }
}

export default MotionFeatures;

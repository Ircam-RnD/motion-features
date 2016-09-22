import f from './features';

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
        return () => new Date.getTime();
      } else {
        return () => Date.now();
      }
    } else {
      return () => window.performance.now();
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
 * // es6 :
 * import MotionFeatures from 'motion-features'; 
 * const mf = new MotionFeatures({ descriptors: ['accIntensity', 'kick'] });
 * ```
 * @class
 */
class MotionFeatures {

  /**
   * @param {Object} initObject - object containing an array of the
   * required descriptors
   */
  constructor(options = {}) {
    const defaults = {
      descriptors: [
        'accIntensity',
        'gyrIntensity',
        'freefall',
        'kick',
        'shake',
        'spin',
        'still'
      ]
    };
    this._params = Object.assign({}, defaults, options);
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
    this._fallBegin = 0;
    this._fallEnd = 0;
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
      new Array(f.shakeWindowSize),
      new Array(f.shakeWindowSize),
      new Array(f.shakeWindowSize)
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < f.shakeWindowSize; j++) {
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

    this._loopIndexPeriod = f.lcm(
      f.lcm(
        f.lcm(2, 3), f.kickMedianFiltersize
      ),
      f.shakeWindowSize
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
    this.acc[2] = z
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
    this.gyr[2] = z
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
  update(callback) {
    // DEAL WITH this._elapsedTime
    this._elapsedTime = perfNow();
    // is this one used by several features ?
    this._accNorm = f.magnitude3D(this.acc);
    // this one needs be here because used by freefall AND spin
    this._gyrNorm = f.magnitude3D(this.gyr);
    
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
    //console.log(this._loopIndex);
  }

  //==========================================================================//
  //====================== specific descriptors computing ====================//
  //==========================================================================//

  //============================================================== acc intensity
  /** @private */
  _updateAccIntensity(res) {
    this._accIntensityNorm = 0;

    for (let i = 0; i < 3; i++) {
      this._accLast[i][this._loopIndex % 3] = this.acc[i];

      this._accIntensity[i] = f.intensity1D(
        this.acc[i],
        this._accLast[i][(this._loopIndex + 1) % 3],
        this._accIntensityLast[i][(this._loopIndex + 1) % 2],
        f.accIntensityParam1,
        f.accIntensityParam2,
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

      this._gyrIntensity[i] = f.intensity1D(
        this.gyr[i],
        this._gyrLast[i][(this._loopIndex + 1) % 3],
        this._gyrIntensityLast[i][(this._loopIndex + 1) % 2],
        f.gyrIntensityParam1,
        f.gyrIntensityParam2,
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
        f.delta(this._gyrLast[i][(this._loopIndex + 1) % 3], this.gyr[i], 1);
    }

    this._gyrDeltaNorm = f.magnitude3D(this._gyrDelta);

    if (this._accNorm < f.freefallAccThresh ||
        (this._gyrNorm > f.freefallGyrThresh
          && this._gyrDeltaNorm < f.freefallGyrDeltaThresh)) {
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
    this._i3 = this._loopIndex % f.kickMedianFiltersize;
    this._i1 = this._medianFifo[this._i3];
    this._i2 = 1;

    if (this._i1 < f.kickMedianFiltersize &&
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
    if (this._accIntensityNorm - this._accIntensityNormMedian > f.kickThresh) {
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
      if (this._elapsedTime - this._lastKick > f.kickSpeedGate) {
        this._isKicking = false;
      }
    }

    this._accIntensityNormMedian = this._medianValues[f.kickMedianFiltersize];

    res.kick = {
      intensity: this._kickIntensity,
      kicking: this._isKicking
    };
  }

  //====================================================================== shake
  /** @private */
  _updateShake(res) {
    for (let i = 0; i < 3; i++) {
      this._accDelta[i] = f.delta(
        this._accLast[i][(this._loopIndex + 1) % 3],
        this.acc[i],
        1
      );
    }

    for (let i = 0; i < 3; i++) {
      if (this._shakeWindow[i][this._loopIndex % f.shakeWindowSize]) {
        this._shakeNb[i]--;
      }
      if (this._accDelta[i] > f.shakeThresh) {
        this._shakeWindow[i][this._loopIndex % f.shakeWindowSize] = 1;
        this._shakeNb[i]++;
      } else {
        this._shakeWindow[i][this._loopIndex % f.shakeWindowSize] = 0;
      }
    }

    this._shakingRaw =
    f.magnitude3D(this._shakeNb) /
    f.shakeWindowSize;
    this._shakeSlidePrev = this._shaking;
    this._shaking =
    f.slide(this._shakeSlidePrev, this._shakingRaw, f.shakeSlideFactor);

    res.shake = {
      shaking: this._shaking
    };
  }

  //======================================================================= spin
  /** @private */
  _updateSpin(res) {
    if (this._gyrNorm > f.spinThreshold) {
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
    this._stillCrossProd = f.stillCrossProduct(this.gyr);
    this._stillSlidePrev = this._stillSlide;
    this._stillSlide = f.slide(
      this._stillSlidePrev,
      this._stillCrossProd,
      f.stillSlideFactor
    );

    if (this._stillSlide > f.stillThresh) {
      this._isStill = false;
    } else {
      this._isStill = true;
    }
  
    res.still = {
      still: this._isStill,
      slide: this._stillSlide
    }
  }
}

export default MotionFeatures;


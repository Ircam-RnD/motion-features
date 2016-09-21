const features = {

  //======================== constants ========================//

  accIntensityParam1: 0.8,
  accIntensityParam2: 0.1,

  freefallAccThresh: 0.15,
  freefallGyrThresh: 750,
  freefallGyrDeltaThresh: 40,

  gyrIntensityParam1: 0.9,
  gyrIntensityParam2: 1,

  kickThresh: 0.01,
  kickSpeedGate: 200,
  kickMedianFiltersize: 9,

  shakeThresh: 0.1,
  shakeWindowSize: 200,
  shakeSlideFactor: 10,

  spinThresh: 200,

  stillThresh: 5000,
  stillSlideFactor: 5,

  //======================== functions ========================//

  delta(prev, next, dt) {
    return (next - prev) / (2 * dt);
  },

  intensity1D(nextX, prevX, prevIntensity, param1, param2, dt) {
    const dx = this.delta(nextX, prevX, dt);//(nextX - prevX) / (2 * dt);
    return param2 * dx * dx + param1 * prevIntensity;
  },

  magnitude3D(xyzArray) {
    return Math.sqrt(xyzArray[0] * xyzArray[0] + 
                xyzArray[1] * xyzArray[1] +
                xyzArray[2] * xyzArray[2]);
  },

  lcm(a, b) {
    let a1 = a, b1 = b;

    while (a1 != b1) {
      if (a1 < b1) {
        a1 += a;
      } else {
        b1 += b;
      }
    }

    return a1;
  },

  slide(prevSlide, currentVal, slideFactor) {
    return prevSlide + (currentVal - prevSlide) / slideFactor;
  },

  stillCrossProduct(xyzArray) {
    return (xyzArray[1] - xyzArray[2]) * (xyzArray[1] - xyzArray[2]) +
           (xyzArray[0] - xyzArray[1]) * (xyzArray[0] - xyzArray[1]) +
           (xyzArray[2] - xyzArray[0]) * (xyzArray[2] - xyzArray[0]);
  }
};

export default features;
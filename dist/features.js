"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var features = {

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

  delta: function delta(prev, next, dt) {
    return (next - prev) / (2 * dt);
  },
  intensity1D: function intensity1D(nextX, prevX, prevIntensity, param1, param2, dt) {
    var dx = this.delta(nextX, prevX, dt); //(nextX - prevX) / (2 * dt);
    return param2 * dx * dx + param1 * prevIntensity;
  },
  magnitude3D: function magnitude3D(xyzArray) {
    return Math.sqrt(xyzArray[0] * xyzArray[0] + xyzArray[1] * xyzArray[1] + xyzArray[2] * xyzArray[2]);
  },
  lcm: function lcm(a, b) {
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
  },
  slide: function slide(prevSlide, currentVal, slideFactor) {
    return prevSlide + (currentVal - prevSlide) / slideFactor;
  },
  stillCrossProduct: function stillCrossProduct(xyzArray) {
    return (xyzArray[1] - xyzArray[2]) * (xyzArray[1] - xyzArray[2]) + (xyzArray[0] - xyzArray[1]) * (xyzArray[0] - xyzArray[1]) + (xyzArray[2] - xyzArray[0]) * (xyzArray[2] - xyzArray[0]);
  }
};

exports.default = features;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZlYXR1cmVzLmpzIl0sIm5hbWVzIjpbImZlYXR1cmVzIiwiYWNjSW50ZW5zaXR5UGFyYW0xIiwiYWNjSW50ZW5zaXR5UGFyYW0yIiwiZnJlZWZhbGxBY2NUaHJlc2giLCJmcmVlZmFsbEd5clRocmVzaCIsImZyZWVmYWxsR3lyRGVsdGFUaHJlc2giLCJneXJJbnRlbnNpdHlQYXJhbTEiLCJneXJJbnRlbnNpdHlQYXJhbTIiLCJraWNrVGhyZXNoIiwia2lja1NwZWVkR2F0ZSIsImtpY2tNZWRpYW5GaWx0ZXJzaXplIiwic2hha2VUaHJlc2giLCJzaGFrZVdpbmRvd1NpemUiLCJzaGFrZVNsaWRlRmFjdG9yIiwic3BpblRocmVzaCIsInN0aWxsVGhyZXNoIiwic3RpbGxTbGlkZUZhY3RvciIsImRlbHRhIiwicHJldiIsIm5leHQiLCJkdCIsImludGVuc2l0eTFEIiwibmV4dFgiLCJwcmV2WCIsInByZXZJbnRlbnNpdHkiLCJwYXJhbTEiLCJwYXJhbTIiLCJkeCIsIm1hZ25pdHVkZTNEIiwieHl6QXJyYXkiLCJNYXRoIiwic3FydCIsImxjbSIsImEiLCJiIiwiYTEiLCJiMSIsInNsaWRlIiwicHJldlNsaWRlIiwiY3VycmVudFZhbCIsInNsaWRlRmFjdG9yIiwic3RpbGxDcm9zc1Byb2R1Y3QiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsSUFBTUEsV0FBVzs7QUFFZjs7QUFFQUMsc0JBQW9CLEdBSkw7QUFLZkMsc0JBQW9CLEdBTEw7O0FBT2ZDLHFCQUFtQixJQVBKO0FBUWZDLHFCQUFtQixHQVJKO0FBU2ZDLDBCQUF3QixFQVRUOztBQVdmQyxzQkFBb0IsR0FYTDtBQVlmQyxzQkFBb0IsQ0FaTDs7QUFjZkMsY0FBWSxJQWRHO0FBZWZDLGlCQUFlLEdBZkE7QUFnQmZDLHdCQUFzQixDQWhCUDs7QUFrQmZDLGVBQWEsR0FsQkU7QUFtQmZDLG1CQUFpQixHQW5CRjtBQW9CZkMsb0JBQWtCLEVBcEJIOztBQXNCZkMsY0FBWSxHQXRCRzs7QUF3QmZDLGVBQWEsSUF4QkU7QUF5QmZDLG9CQUFrQixDQXpCSDs7QUEyQmY7O0FBRUFDLE9BN0JlLGlCQTZCVEMsSUE3QlMsRUE2QkhDLElBN0JHLEVBNkJHQyxFQTdCSCxFQTZCTztBQUNwQixXQUFPLENBQUNELE9BQU9ELElBQVIsS0FBaUIsSUFBSUUsRUFBckIsQ0FBUDtBQUNELEdBL0JjO0FBaUNmQyxhQWpDZSx1QkFpQ0hDLEtBakNHLEVBaUNJQyxLQWpDSixFQWlDV0MsYUFqQ1gsRUFpQzBCQyxNQWpDMUIsRUFpQ2tDQyxNQWpDbEMsRUFpQzBDTixFQWpDMUMsRUFpQzhDO0FBQzNELFFBQU1PLEtBQUssS0FBS1YsS0FBTCxDQUFXSyxLQUFYLEVBQWtCQyxLQUFsQixFQUF5QkgsRUFBekIsQ0FBWCxDQUQyRCxDQUNuQjtBQUN4QyxXQUFPTSxTQUFTQyxFQUFULEdBQWNBLEVBQWQsR0FBbUJGLFNBQVNELGFBQW5DO0FBQ0QsR0FwQ2M7QUFzQ2ZJLGFBdENlLHVCQXNDSEMsUUF0Q0csRUFzQ087QUFDcEIsV0FBT0MsS0FBS0MsSUFBTCxDQUFVRixTQUFTLENBQVQsSUFBY0EsU0FBUyxDQUFULENBQWQsR0FDTEEsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQURULEdBRUxBLFNBQVMsQ0FBVCxJQUFjQSxTQUFTLENBQVQsQ0FGbkIsQ0FBUDtBQUdELEdBMUNjO0FBNENmRyxLQTVDZSxlQTRDWEMsQ0E1Q1csRUE0Q1JDLENBNUNRLEVBNENMO0FBQ1IsUUFBSUMsS0FBS0YsQ0FBVDtBQUFBLFFBQVlHLEtBQUtGLENBQWpCOztBQUVBLFdBQU9DLE1BQU1DLEVBQWIsRUFBaUI7QUFDZixVQUFJRCxLQUFLQyxFQUFULEVBQWE7QUFDWEQsY0FBTUYsQ0FBTjtBQUNELE9BRkQsTUFFTztBQUNMRyxjQUFNRixDQUFOO0FBQ0Q7QUFDRjs7QUFFRCxXQUFPQyxFQUFQO0FBQ0QsR0F4RGM7QUEwRGZFLE9BMURlLGlCQTBEVEMsU0ExRFMsRUEwREVDLFVBMURGLEVBMERjQyxXQTFEZCxFQTBEMkI7QUFDeEMsV0FBT0YsWUFBWSxDQUFDQyxhQUFhRCxTQUFkLElBQTJCRSxXQUE5QztBQUNELEdBNURjO0FBOERmQyxtQkE5RGUsNkJBOERHWixRQTlESCxFQThEYTtBQUMxQixXQUFPLENBQUNBLFNBQVMsQ0FBVCxJQUFjQSxTQUFTLENBQVQsQ0FBZixLQUErQkEsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQUE3QyxJQUNBLENBQUNBLFNBQVMsQ0FBVCxJQUFjQSxTQUFTLENBQVQsQ0FBZixLQUErQkEsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQUE3QyxDQURBLEdBRUEsQ0FBQ0EsU0FBUyxDQUFULElBQWNBLFNBQVMsQ0FBVCxDQUFmLEtBQStCQSxTQUFTLENBQVQsSUFBY0EsU0FBUyxDQUFULENBQTdDLENBRlA7QUFHRDtBQWxFYyxDQUFqQjs7a0JBcUVlN0IsUSIsImZpbGUiOiJmZWF0dXJlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGZlYXR1cmVzID0ge1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09IGNvbnN0YW50cyA9PT09PT09PT09PT09PT09PT09PT09PT0vL1xuXG4gIGFjY0ludGVuc2l0eVBhcmFtMTogMC44LFxuICBhY2NJbnRlbnNpdHlQYXJhbTI6IDAuMSxcblxuICBmcmVlZmFsbEFjY1RocmVzaDogMC4xNSxcbiAgZnJlZWZhbGxHeXJUaHJlc2g6IDc1MCxcbiAgZnJlZWZhbGxHeXJEZWx0YVRocmVzaDogNDAsXG5cbiAgZ3lySW50ZW5zaXR5UGFyYW0xOiAwLjksXG4gIGd5ckludGVuc2l0eVBhcmFtMjogMSxcblxuICBraWNrVGhyZXNoOiAwLjAxLFxuICBraWNrU3BlZWRHYXRlOiAyMDAsXG4gIGtpY2tNZWRpYW5GaWx0ZXJzaXplOiA5LFxuXG4gIHNoYWtlVGhyZXNoOiAwLjEsXG4gIHNoYWtlV2luZG93U2l6ZTogMjAwLFxuICBzaGFrZVNsaWRlRmFjdG9yOiAxMCxcblxuICBzcGluVGhyZXNoOiAyMDAsXG5cbiAgc3RpbGxUaHJlc2g6IDUwMDAsXG4gIHN0aWxsU2xpZGVGYWN0b3I6IDUsXG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT0gZnVuY3Rpb25zID09PT09PT09PT09PT09PT09PT09PT09PS8vXG5cbiAgZGVsdGEocHJldiwgbmV4dCwgZHQpIHtcbiAgICByZXR1cm4gKG5leHQgLSBwcmV2KSAvICgyICogZHQpO1xuICB9LFxuXG4gIGludGVuc2l0eTFEKG5leHRYLCBwcmV2WCwgcHJldkludGVuc2l0eSwgcGFyYW0xLCBwYXJhbTIsIGR0KSB7XG4gICAgY29uc3QgZHggPSB0aGlzLmRlbHRhKG5leHRYLCBwcmV2WCwgZHQpOy8vKG5leHRYIC0gcHJldlgpIC8gKDIgKiBkdCk7XG4gICAgcmV0dXJuIHBhcmFtMiAqIGR4ICogZHggKyBwYXJhbTEgKiBwcmV2SW50ZW5zaXR5O1xuICB9LFxuXG4gIG1hZ25pdHVkZTNEKHh5ekFycmF5KSB7XG4gICAgcmV0dXJuIE1hdGguc3FydCh4eXpBcnJheVswXSAqIHh5ekFycmF5WzBdICsgXG4gICAgICAgICAgICAgICAgeHl6QXJyYXlbMV0gKiB4eXpBcnJheVsxXSArXG4gICAgICAgICAgICAgICAgeHl6QXJyYXlbMl0gKiB4eXpBcnJheVsyXSk7XG4gIH0sXG5cbiAgbGNtKGEsIGIpIHtcbiAgICBsZXQgYTEgPSBhLCBiMSA9IGI7XG5cbiAgICB3aGlsZSAoYTEgIT0gYjEpIHtcbiAgICAgIGlmIChhMSA8IGIxKSB7XG4gICAgICAgIGExICs9IGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiMSArPSBiO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhMTtcbiAgfSxcblxuICBzbGlkZShwcmV2U2xpZGUsIGN1cnJlbnRWYWwsIHNsaWRlRmFjdG9yKSB7XG4gICAgcmV0dXJuIHByZXZTbGlkZSArIChjdXJyZW50VmFsIC0gcHJldlNsaWRlKSAvIHNsaWRlRmFjdG9yO1xuICB9LFxuXG4gIHN0aWxsQ3Jvc3NQcm9kdWN0KHh5ekFycmF5KSB7XG4gICAgcmV0dXJuICh4eXpBcnJheVsxXSAtIHh5ekFycmF5WzJdKSAqICh4eXpBcnJheVsxXSAtIHh5ekFycmF5WzJdKSArXG4gICAgICAgICAgICh4eXpBcnJheVswXSAtIHh5ekFycmF5WzFdKSAqICh4eXpBcnJheVswXSAtIHh5ekFycmF5WzFdKSArXG4gICAgICAgICAgICh4eXpBcnJheVsyXSAtIHh5ekFycmF5WzBdKSAqICh4eXpBcnJheVsyXSAtIHh5ekFycmF5WzBdKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZmVhdHVyZXM7Il19
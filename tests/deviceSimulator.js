//==================== Quick & dirty node test : =====================//

var MotionFeatures = require('../dist/index').MotionFeatures;
//import MotionFeatures from '../dist/index';

//*
// var mf = new MotionFeatures({ descriptors: ['accIntensity', 'still', 'accZcr'] });
var mf = new MotionFeatures({ descriptors: [ 'gyrZcr' ] });
var loopFunction = function() {
	//mf.setAccelerometer(0, 0, 0);
  mf.setAccelerometer(Math.random(), Math.random(), Math.random());
	//mf.setGyroscope(0, 0, 0);
  mf.setGyroscope(Math.random() * 1000, Math.random() * 1000, Math.random() * 1000);
	mf.update((err, res) => { console.log(res); })
};
setInterval(loopFunction, 10);
//*/


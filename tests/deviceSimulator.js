//==================== Quick & dirty node test : =====================//

var MotionFeatures = require('../dist/index').default;
//import MotionFeatures from '../dist/index';

//*
var mf = new MotionFeatures({ descriptors: ['accIntensity', 'still'] });
var loopFunction = function() {
	mf.setAccelerometer(0, 0, 0);
	mf.setGyroscope(0, 0, 0);
	mf.update((err, res) => { console.log(res); })
};
setInterval(loopFunction, 10);
//*/


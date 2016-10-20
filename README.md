# motion-features
A monoclass library computing a customizable set of gestural descriptors,
taking accelerometer and gyroscope sensors data as input.

#### List of available descriptors :

- `accIntensity` : gesture intensity computed from the accelerometers
- `gyrIntensity` : gesture intensity computed from the gyroscopes
- `freefall` : tell if the sensors are falling
- `kick` : detects a hit gesture
- `shake` : amount of shakiness of a gesture
- `spin` : the global rotation speed
- `still` : tell if the sensors are still

#### note :

this module is still a work in progress.

<hr>

# API documentation :

<a name="MotionFeatures"></a>

## MotionFeatures
Class computing the descriptors from accelerometer and gyroscope data.
<br />
Example :
```JavaScript
// es6 with browserify :
import { MotionFeatures } from 'motion-features'; 
const mf = new MotionFeatures({ descriptors: ['accIntensity', 'kick'] });

// es5 with browserify :
var motionFeatures = require('motion-features');
var mf = new motionFeatures.MotionFeatures({ descriptors: ['accIntensity', 'kick'] });

// loading from a "script" tag :
var mf = new motionFeatures.MotionFeatures({ descriptors: ['accIntensity', 'kick'] });

// then, on each motion event :
mf.setAccelerometer(x, y, z);
mf.setGyroscopes(alpha, beta, theta);
mf.update(function(err, res) {
  if (err === null) {
    // do something with res
  }
});
```

**Kind**: global class  

* [MotionFeatures](#MotionFeatures)
    * [new MotionFeatures(initObject)](#new_MotionFeatures_new)
    * [.setAccelerometer(x, y, z)](#MotionFeatures+setAccelerometer)
    * [.setGyroscope(x, y, z)](#MotionFeatures+setGyroscope)
    * [.update(callback)](#MotionFeatures+update)

<a name="new_MotionFeatures_new"></a>

### new MotionFeatures(initObject)

| Param | Type | Description |
| --- | --- | --- |
| initObject | <code>Object</code> | object containing an array of the required descriptors and some variables used to compute the descriptors that you might want to change (for example if the browser is chrome you might want to set `gyrIsInDegrees` to false because it's the case on some versions, or you might want to change some thresholds). See the code for more details. |

<a name="MotionFeatures+setAccelerometer"></a>

### motionFeatures.setAccelerometer(x, y, z)
sSets the current accelerometer values.

**Kind**: instance method of <code>[MotionFeatures](#MotionFeatures)</code>  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>Number</code> | the accelerometer's x value |
| y | <code>Number</code> | the accelerometer's y value |
| z | <code>Number</code> | the accelerometer's z value |

<a name="MotionFeatures+setGyroscope"></a>

### motionFeatures.setGyroscope(x, y, z)
Sets the current gyroscope values.

**Kind**: instance method of <code>[MotionFeatures](#MotionFeatures)</code>  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>Number</code> | the gyroscope's x value |
| y | <code>Number</code> | the gyroscope's y value |
| z | <code>Number</code> | the gyroscope's z value |

<a name="MotionFeatures+update"></a>

### motionFeatures.update(callback)
triggers computation of the descriptors from the current sensor values and
pass the results to a callback

**Kind**: instance method of <code>[MotionFeatures](#MotionFeatures)</code>  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>[featuresCallback](#featuresCallback)</code> | the callback handling the last computed descriptors |

<hr>
<a name="accIntensity"></a>

## accIntensity : <code>Object</code>
Intensity of the movement sensed by an accelerometer.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| norm | <code>Number</code> | the global energy computed on all dimensions. |
| x | <code>Number</code> | the energy in the x (first) dimension. |
| y | <code>Number</code> | the energy in the y (second) dimension. |
| z | <code>Number</code> | the energy in the z (third) dimension. |

<hr>
<a name="gyrIntensity"></a>

## gyrIntensity : <code>Object</code>
Intensity of the movement sensed by a gyroscope.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| norm | <code>Number</code> | the global energy computed on all dimensions. |
| x | <code>Number</code> | the energy in the x (first) dimension. |
| y | <code>Number</code> | the energy in the y (second) dimension. |
| z | <code>Number</code> | the energy in the z (third) dimension. |

<hr>
<a name="freefall"></a>

## freefall : <code>Object</code>
Information about the free falling state of the sensor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| accNorm | <code>Number</code> | the norm of the acceleration. |
| falling | <code>Boolean</code> | true if the sensor is free falling, false otherwise. |
| duration | <code>Number</code> | the duration of the free falling since its beginning. |

<hr>
<a name="kick"></a>

## kick : <code>Object</code>
Impulse / hit movement detection information.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| intensity | <code>Number</code> | the current intensity of the "kick" gesture. |
| kicking | <code>Boolean</code> | true if a "kick" gesture is being detected, false otherwise. |

<hr>
<a name="shake"></a>

## shake : <code>Object</code>
Shake movement detection information.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| shaking | <code>Number</code> | the current amount of "shakiness". |

<hr>
<a name="spin"></a>

## spin : <code>Object</code>
Information about the spinning state of the sensor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| spinning | <code>Boolean</code> | true if the sensor is spinning, false otherwise. |
| duration | <code>Number</code> | the duration of the spinning since its beginning. |
| gyrNorm | <code>Number</code> | the norm of the rotation speed. |

<hr>
<a name="still"></a>

## still : <code>Object</code>
Information about the stillness of the sensor.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| still | <code>Boolean</code> | true if the sensor is still, false otherwise. |
| slide | <code>Number</code> | the original value thresholded to determine stillness. |

<hr>
<a name="features"></a>

## features : <code>Object</code>
Computed features.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| accIntensity | <code>[accIntensity](#accIntensity)</code> | Intensity of the movement sensed by an accelerometer. |
| gyrIntensity | <code>[gyrIntensity](#gyrIntensity)</code> | Intensity of the movement sensed by a gyroscope. |
| freefall | <code>[freefall](#freefall)</code> | Information about the free falling state of the sensor. |
| kick | <code>[kick](#kick)</code> | Impulse / hit movement detection information. |
| shake | <code>[shake](#shake)</code> | Shake movement detection information. |
| spin | <code>[spin](#spin)</code> | Information about the spinning state of the sensor. |
| still | <code>[still](#still)</code> | Information about the stillness of the sensor. |

<hr>
<a name="featuresCallback"></a>

## featuresCallback : <code>function</code>
Callback handling the features.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>String</code> | Description of a potential error. |
| res | <code>[features](#features)</code> | Object holding the feature values. |

<hr>

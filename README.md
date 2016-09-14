# motion-features
A monoclass library computing a variety of gestural descriptors,
taking accelerometer and gyroscope sensors data as input.

#### List of available descriptors :

- accIntensity : gesture intensity computed from the accelerometers
- gyrIntensity : gesture intensity computed from the gyroscopes
- freefall : tell if the sensors are falling
- kick : detects a hit gesture
- shake : amount of shakiness of a gesture
- spin : the global rotation speed
- still : tell if the sensors are still


#### note :

this module is a work in progress, use at your own risk

<hr>

# API documentation :

<a name="MotionFeatures"></a>

## MotionFeatures
Class computing the descriptors from accelerometer and gyroscope data.
<br />
Example : <pre><code>
import MotionFeatures from 'motion-features'; 
const mf = new MotionFeatures({ ['accIntensity', 'kick'] });
</code></pre>

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
| initObject | <code>Object</code> | object containing an array of the required descriptors |

<a name="MotionFeatures+setAccelerometer"></a>

### motionFeatures.setAccelerometer(x, y, z)
sets the current accelerometer values

**Kind**: instance method of <code>[MotionFeatures](#MotionFeatures)</code>  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>Number</code> | the accelerometer's x value |
| y | <code>Number</code> | the accelerometer's y value |
| z | <code>Number</code> | the accelerometer's z value |

<a name="MotionFeatures+setGyroscope"></a>

### motionFeatures.setGyroscope(x, y, z)
sets the current gyroscope values

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
| callback | <code>descriptorsCallback</code> | the callback handling the last computed descriptors |

<hr>
<a name="featuresCallback"></a>

## featuresCallback : <code>function</code>
Callback handling the descriptors.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>String</code> | Description of a potential error. |
| res | <code>descriptors</code> | Object holding the descriptor values. |

<hr>

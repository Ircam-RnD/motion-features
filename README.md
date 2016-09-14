# motion-features
### A monoclass library computing a variety of gestural descriptors,
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
Motion Features
	Class computing the descriptors from accelerometer and gyroscope data.

**Kind**: global class  

* [MotionFeatures](#MotionFeatures)
    * [.setAccelerometer()](#MotionFeatures+setAccelerometer)
    * [.setGyroscope()](#MotionFeatures+setGyroscope)
    * [.update()](#MotionFeatures+update)

<a name="MotionFeatures+setAccelerometer"></a>

### motionFeatures.setAccelerometer()
setAccelerometer {Number, Number, Number}
sets the current accelerometer values

**Kind**: instance method of <code>[MotionFeatures](#MotionFeatures)</code>  
<a name="MotionFeatures+setGyroscope"></a>

### motionFeatures.setGyroscope()
setGyroscope {Number, Number, Number}
sets the current gyroscope values

**Kind**: instance method of <code>[MotionFeatures](#MotionFeatures)</code>  
<a name="MotionFeatures+update"></a>

### motionFeatures.update()
update {descriptorsCallback}
triggers computing of the descriptors with the current sensor values and
pass the results to a callback

**Kind**: instance method of <code>[MotionFeatures](#MotionFeatures)</code>  
<hr>

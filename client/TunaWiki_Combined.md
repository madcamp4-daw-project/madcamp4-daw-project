# Tuna Wiki (Combined)

---

## Home

* [Getting started](https://github.com/Theodeus/tuna/wiki/Getting-started)
* [Node examples](https://github.com/Theodeus/tuna/wiki/Node-examples)
* [Automation](https://github.com/Theodeus/tuna/wiki/Automation)

---

## Getting started

Usage
====

Start by creating a new Tuna object like so:

```javascript
import Tuna from 'tunajs';
const context = new AudioContext();
const tuna = new Tuna(audioContext);
```

You need to pass the audio context you're using in your application. Tuna will be using it to create its effects.

You create a new Tuna node as such:

```javascript
var chorus = new tuna.Chorus({
    rate: 1.5,
    feedback: 0.2,
    delay: 0.0045,
    bypass: false
});
```
You can then connect the Tuna node to native Web Audio just as you would normally:

```javascript
// Create regular Web Audio nodes
var input = context.createGain();
var output = context.createGain();

// Use the Tuna node just like regular nodes
input.connect(chorus);
chorus.connect(output);
```

Tuna nodes mimics the API of normal Web Audio nodes, so you can
seamlessly connect with AudioNodes created by the AudioContext.

---

## Node examples

The nodes
====
All values below are the default value you would get if you instantiate an effect without any settings passed as an argument.

A basic chorus effect.
```javascript
var chorus = new tuna.Chorus({
    rate: 1.5,         //0.01 to 8+
    feedback: 0.4,     //0 to 1+
    depth: 0.7,        //0 to 1
    delay: 0.0045,     //0 to 1
    bypass: false      //true or false
});
```

A delay effect with feedback and a lowpass filter applied to the delayed signal.
```javascript
var delay = new tuna.Delay({
    feedback: 0.45,    //0 to 1+
    delayTime: 100,    //1 to 10000 milliseconds
    wetLevel: 0.5,     //0 to 1+
    dryLevel: 1,       //0 to 1+
    cutoff: 20000,      //cutoff frequency of the built in lowpass-filter. 20 to 22050
    bypass: false
});
```

A basic phaser effect.
```javascript
var phaser = new tuna.Phaser({
    rate: 0.1,                     //0.01 to 8 is a decent range, but higher values are possible
    depth: 0.6,                    //0 to 1
    feedback: 0.7,                 //0 to 1+
    stereoPhase: 40,               //0 to 180
    baseModulationFrequency: 700,  //500 to 1500
    bypass: false
});
```

A basic overdrive effect.
```javascript
var overdrive = new tuna.Overdrive({
    outputGain: -9.154,           //-42 to 0 in dB
    drive: 0.197,                 //0 to 1
    curveAmount: 0.979,           //0 to 1
    algorithmIndex: 0,            //0 to 5, selects one of the drive algorithms
    bypass: false
});
```

A compressor with the option to use automatic makeup gain.
```javascript
var compressor = new tuna.Compressor({
    threshold: -20,    //-100 to 0
    makeupGain: 1,     //0 and up (in decibels)
    attack: 1,         //0 to 1000
    release: 250,      //0 to 3000
    ratio: 4,          //1 to 20
    knee: 5,           //0 to 40
    automakeup: false, //true/false
    bypass: false
});
```

A convolver with high- and lowcut. You can find a lot of impulse resonses <a href="http://chromium.googlecode.com/svn/trunk/samples/audio/impulse-responses/">here</a>, or by searching for "free impulse response files".
```javascript
var convolver = new tuna.Convolver({
    highCut: 22050,                         //20 to 22050
    lowCut: 20,                             //20 to 22050
    dryLevel: 1,                            //0 to 1+
    wetLevel: 1,                            //0 to 1+
    level: 1,                               //0 to 1+, adjusts total output of both wet and dry
    impulse: "impulses/impulse_rev.wav",    //the path to your impulse response
    bypass: false
});
```

A basic filter.
```javascript
var filter = new tuna.Filter({
    frequency: 800,         //20 to 22050
    Q: 1,                   //0.001 to 100
    gain: 0,                //-40 to 40 (in decibels)
    filterType: "lowpass",  //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
    bypass: false
});
```

A cabinet/speaker emulator.
```javascript
var cabinet = new tuna.Cabinet({
    makeupGain: 1,                                 //0 to 20
    impulsePath: "impulses/impulse_guitar.wav",    //path to your speaker impulse
    bypass: false
});
```

A basic tremolo.
```javascript
var tremolo = new tuna.Tremolo({
    intensity: 0.3,    //0 to 1
    rate: 5,           //0.001 to 8
    stereoPhase: 0,    //0 to 180
    bypass: false
});
```

A wahwah with an auto wah option.
```javascript
var wahwah = new tuna.WahWah({
    automode: true,                  //true/false
    baseFrequency: 0.153,            //0 to 1
    excursionOctaves: 3.3,           //1 to 6
    sweep: 0.35,                     //0 to 1
    resonance: 19,                   //1 to 100
    sensitivity: -0.5,               //-1 to 1
    bypass: false
});
```

A lo-fi bitcrusher effect.

```javascript
var bitcrusher = new tuna.Bitcrusher({
    bits: 4,          //1 to 16
    normfreq: 0.1,    //0 to 1
    bufferSize: 4096  //256 to 16384
});
```

A resonant, analog-sounding filter.

```javascript
var moog = new tuna.MoogFilter({
    cutoff: 0.065,    //0 to 1
    resonance: 3.5,   //0 to 4
    bufferSize: 4096  //256 to 16384
});
```

A delay that bounces between the left and right channel.

```javascript
var pingPongDelay = new tuna.PingPongDelay({
    wetLevel: 0.5,       //0 to 1
    feedback: 0.3,       //0 to 1
    delayTimeLeft: 200,  //1 to 10000 (milliseconds)
    delayTimeRight: 400  //1 to 10000 (milliseconds)
});
```

A stereo panner.

**Note:** For this to work in Safari and IE, you need to polyfill `StereoPannerNode` using [stereo-panner-node](https://github.com/mohayonao/stereo-panner-node).

```javascript
var panner = new tuna.Panner({
    pan: 0 // -1 (left) to 1 (right)
});
```

A basic gain.

```javascript
var gain = new tuna.Gain({
    gain: 1 // 0 and up
});
```

---

## Automation

Certain properties of Tuna nodes can be automated. 

```
// create a new delay with a feedback value of 0
let delay = new tuna.Delay({feedback: 0});

// ramp up the feedback to 1 over 1.5 seconds (1500 ms), and start now (0 evaluates context.currentTime)
delay.automate("feedback", 1, 1500, 0);

```

The call signature looks as follows; ```automate(property, value, duration, startTime)```

To find out if a property is automatable, check ```delay.defaults.feedback.automatable```.

Currently, only those properties that expose AudioParams are automatable, and linear interpolation will be used for all automation. This could change in the future (with a breaking change and a version bump accordingly), with more properties added and more options for automation curves. 

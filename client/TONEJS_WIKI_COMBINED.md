# Tone.js Wiki (Combined)

---
## Source: _Footer.md

footer

---
## Source: _Sidebar.md

[Installation](Installation)


##### Features
* [Transport](Transport)
* [Instruments](Instruments)
* [Effects](Effects)
* [Sources](Sources)
* [Signals](Signals)
* [Event Classes](Events)

##### Tutorials
* [Autoplay](Autoplay)
* [Performance and Best Practices](Performance)
* [Making connections](Connections)
* [Build a synth](BasicSynth)
* [Arpeggiator](Arpeggiator)
* [Glossary](Glossary)
* [Understanding Envelopes](Envelope)
* [Time](Time)
* [TransportTime](TransportTime)
* [Using Tone.js With React or Vue](Using-Tone.js-with-React-React-Typescript-or-Vue)

##### Dev
* [Contributing](Contributing)
* [Building](Building)
* [Testing](Testing)

---
## Source: .gitignore


---
## Source: Home.md

# Tone.js Wiki

## Working with Tone.js

To get started sequencing and synthesizing notes, take a look at a basic [arpeggiator walkthrough](Arpeggiator).

### Time

Time in Tone.js lets you think in musical timing instead of seconds. Every method which takes time as an argument also accepts [Time](Time). The value of Time is relative to the current tempo of the Tone.Transport. 

### Signals

Signals plays an important role in the library. Understanding [Tone.Signal](Signals) will help you create tightly synchronized and interestingly automated applications. 

## [Contributing](Contributing)

The easiest way to contribute is by sending issues on Github. If you already have a good understanding of Tone.js, making tutorials which I can link to from the github page would be very welcome. 

If you'd like to contribute a change or module beyond a basic pull request, please send me an email.

I haven't published my TODO for Tone.js, but I will if people are interested in tackling specific problems. 

---
## Source: Installation.md

## Download

* [download](https://tonejs.github.io/build/Tone.js)
* [npm](https://www.npmjs.org/) - `npm install tone`
* dev - `npm install tone@next`

## Usage

### Basic

If Tone.js is included in the page, a global variable named `Tone` will be added to the `window`.

### Module Loaders

Internally, Tone uses `import`/`export` for dependency management. This allows the library to be used with `<script type="module">`. 

#### Tone.js build

You can include the build file (which is available from one of the links above) like any other dependency using either AMD or CommonJS style:

```javascript
require(["Tone"], function(Tone){
    var synth = new Tone.MonoSynth();
    //...etc
```

or with CommonJS:

```javascript
var MonoSynth = require("Tone").MonoSynth;
var synth = new MonoSynth();
```

#### Individual Files

Using individual files with a module loader can bring your package size down significantly since it will only include the modules used in your code. You'll have to familiarize yourself with Tone.js' directory structure since files have to be referenced with their full path.

To use the individual files, you'll need a `require` framework which supports AMD like [RequireJS](http://requirejs.org/), [webpack](https://webpack.github.io/), or [deAMDify](https://github.com/jaredhanson/deamdify) for browserify.

**The path to the root [Tone](https://github.com/Tonejs/Tone.js/tree/master/Tone) folder needs to be in the search path so that internal dependencies can resolve.**

##### RequireJS Paths

```javascript
require.config({
    baseUrl: "./base",
    paths: {
        "Tone" : "path/to/Tone.js/Tone"
    }
});
require(["Tone/core/Transport"], function(Transport){
    //...
```

##### Webpack

```javascript
module.exports = {
	resolve: {
		root: __dirname,
                // for webpack 1:
		modulesDirectories : ["path/to/Tone.js/"],
                // for webpack 2:
                modules : ["path/to/Tone.js/"]
	},
	//...
```

##### ES6 Imports

After Tone.js is added as a module resolve path, individual files can be specified like so

```javascript
import Transport from 'Tone/core/Transport';
import Volume from 'Tone/component/Volume';
```

## Newbie MacOS QuickStart to Get Examples Running
If you have XCode installed on your Mac, you should be able to get the examples running with the following steps:
Download the .zip file from github:
https://github.com/Tonejs/Tone.js/archive/dev.zip

The file should unzip automatically, so then in a Terminal window go into the directory:
```javascript
$ cd Tone.js-dev
```
and run the commands:
```javascript
$ npm install 
...
$ npm run build
```

Then you need to run a webserver in the directory to serve the files
```javascript
$ python -m SimpleHTTPServer 8000
```
(note, you have to be in the Tone.js-dev directory when you run the python command)

Then, from a browser visit the URL:
localhost:8000/examples

and you should see the examples.

---
## Source: Accurate-Timing.md

Tone.js uses the Web Audio API for sample-accurate scheduling. If you are experience loose timing, double check that you are passing in the scheduled time the Transport provides into the event that you are scheduling: 


#### INCORRECT:

```js
Transport.schedule(() => {
  player.start();
}, 0);
```

#### CORRECT:
```js
Transport.schedule((time) => {
  player.start(time);
}, 0);
```

## Event Classes

This is similarly true for all of the event classes like Part, Sequence, Loop, Pattern, etc. 


#### INCORRECT:

```js
new Part((time, event) => {
  synth.triggerAttackRelease(event.note, event.duration);
}, events);
```

#### CORRECT:
```js
new Part((time, event) => {
  synth.triggerAttackRelease(event.note, event.duration, time);
}, events);
```

---
## Source: Arpeggiator.md

# A Basic Arpeggiator

In this example, we'll create an arpeggiator which plays the next note in a series on every beat. 

## The Synthesizer

Tone.js has a number of instruments, each with nearly the same interface for triggering attacks and releases. Here we'll use [Tone.Synth](https://tonejs.github.io/docs/Synth), but you can easily swap the SimpleSynth for any of the other instruments without changing any other code.

```javascript
var synth = new Tone.Synth();
```

We'll also connect our synth to the [Destination](https://tonejs.github.io/docs/Destination) (formerly known as Master) so that we can hear it.

```javascript
synth.toDestination();
```

## Triggering Notes

We can trigger the synth to start the attack portion of the note using `triggerAttack` -- this method takes a note and a time as arguments. To start the release portion of the note, call `triggerRelease`. Read more about using envelopes [here](https://github.com/Tonejs/Tone.js/wiki/Envelope).

Let's trigger the note `"C4"` then trigger the release a quarter second later (all values are in seconds):

```javascript
synth.triggerAttack("C4", time);
synth.triggerRelease(time + 0.25);
```

These two methods are combined into a single call to `triggerAttackRelease` which takes the note as the first argument, the duration as the second, and the start time as the third argument. 

```javascript
synth.triggerAttackRelease("C4", 0.25, time);
```

## The Arpeggio

Next let's pick a set of notes to arpeggiate over, like a C pentatonic scale. We'll set an interval and get the next note from the array on every loop. If the last argument of `triggerAttackRelease` is omitted, it defaults to the current time.

```javascript
var pattern = new Tone.Pattern(function(time, note){
	synth.triggerAttackRelease(note, 0.25);
}, ["C4", "D4", "E4", "G4", "A4"]);
```

[Tone.Pattern](https://tonejs.github.io/docs/#Pattern) will arpeggiate over the given array in a number of different ways (`"up"`, `"down"`, `"upDown"`, `"downUp"`, `"random"` and more). By default the pattern will iterate upward and then loop back to the beginning. 

As with all [Event classes](https://github.com/Tonejs/Tone.js/wiki/Events), `time` is passed in as the first argument. This is very important because native Javascript timing is pretty loose. Callbacks scheduled with `setInterval` for example, will happen _around_ the given time, but there is no guarantee on precision; that's not good enough for musical events. 

The last thing to do is to start the pattern from the beginning of the Transport timeline. 

```javascript
// begin at the beginning
pattern.start(0);
```

And start the Transport to get the clock going.

```javascript
Tone.Transport.start();
```

---
## Source: AudioContext.md

The Web Audio [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) is the interface which represents the underlying audio-processing graph built from audio modules linked together. 

In Tone.js, the AudioContext is created for you as soon as Tone.js is loaded; it is accessible as [`Tone.context`](https://tonejs.github.io/docs/#Tone.context) from the global Tone object or by accessing `.context` from any Tone.js class instance. 

```javascript
var filter = new Tone.Filter();
filter.context; //the shared AudioContext
```

All Tone.js classes share the same AudioContext. Nodes created from different AudioContext's cannot be interconnected. 

### Setting your own AudioContext

In some cases, you might need to explicitly set the AudioContext. 

```javascript
//set another audio context
Tone.setContext(audioContext);
```

You should set the context before creating any nodes since nodes created before the context was set cannot be connected to the nodes created after. 

### Using other Web Audio libraries

Tone.js plays nice with most other Web Audio libraries. 

If the library creates its own instance of the AudioContext, just set Tone's to that one using `Tone.setContext`. If you can pass in an AudioContext to the class constructor, use Tone.context. 

```javascript
//using Tone.js with Tuna.js
var tuna = new Tuna(Tone.context);
```

---
## Source: Autoplay.md

Autoplay is the source of a lot of weird Tone.js bugs, but luckily the fix is quite simple

## Solution

Make sure that you don't start the Transport or play any sounds until the page receives a user gesture (e.g. a button click). Tone.js has a `start` method which will kick off the audio for your page. 

```javascript
document.querySelector('button').addEventListener('click', async () => {
    await Tone.start()
    // your page is ready to play sounds
})
```

## Problem

Pretty much all browsers won't play any sound on page load anymore. This is known as _autoplay_. There's a little more background [here](https://developers.google.com/web/updates/2017/09/autoplay-policy-changes). Basically the AudioContext (which is responsible for rendering audio in the Web Audio API), starts out as `"suspended"`. 

You can check verify this for your page:

```javascript
// before a user gesture
Tone.context.state === "suspended"
```

Only after a user gesture in which the user creates a sound or invokes `Tone.start()` will the AudioContext change its state to `"running"`. 

```javascript
// after Tone.start() is invoked from a user gesture
Tone.context.state === "running"
```

The way that autoplay is handled can be pretty inconsistent and what counts as a user gesture might be different for different platforms or situations. The most reliable solution is to invoke `Tone.start()` after a button click.

## Background

The purpose of the Autoplay policy is to stop pages from making a sound as soon as it loads. The intention is to give users greater playback control and a good user experience where pages aren't making unwanted sounds at them before they give permission. This has been the case for mobile browsers for quite a while. And in the past few years, desktop browsers have adopted stricter autoplay as well. 


---
## Source: BasicSynth.md

# Basic Synthesis

We can make a basic synthesizer out of an oscillator and an envelope. 

## Oscillator

As our oscillator source, let's use an [OmniOscillator](https://tonejs.github.io/docs/#OmniOscillator). 

```
var osc = new Tone.OmniOscillator();
```

Once we're able to (a) set the oscillator's frequency to a desired note, and (b) specify start and stop times, we have a crude synthesizer... 

```
osc.frequency.value = "C4";
osc.start().stop("+8n");
```

But without further refinement, our synthesizer would have limited flexibility in terms of timbre and dynamics. Also, in its current state, it would emit an unpleasant "click" each time a note is triggered. 

## Envelope

We can get rid of the "click" (an artifact of the discontinuity resulting from instantaneously jumping from an amplitude of zero to full) by smoothing the onset of the sound.  To do this we apply an envelope to the oscillator's amplitude using [Tone.AmplitudeEnvelope](https://tonejs.github.io/docs/#AmplitudeEnvelope).

Below we connect the oscillator to our newly created envelope, then route the envelope out directly to the master. 

```
var env = new Tone.AmplitudeEnvelope();
osc.connect(env);
env.toMaster();
```

Upon starting the oscillator, no sound will be allowed thru until the envelope's Attack stage is triggered. (Note that the oscillator's signal is immediately made available to the envelope when start()'ed, but is suppressed until the Attack starts, then again after the Release stage completes.)

```
osc.start();
env.triggerAttack();
```

Read more about using envelopes [here](https://github.com/Tonejs/Tone.js/wiki/Envelope).

## Tone.Synth

[Tone.Synth](https://tonejs.github.io/docs/#Synth) combines an OmniOscillator and an AmplitudeEnvelope just like we did above, into a convenient package. 

### Portamento

SimpleSynth also exposes a portamento value. Portamento is the amount of time it takes to slide from one frequency to the next.

Play around with all of SimpleSynth's attributes [here](https://tonejs.github.io/examples/simpleSynth.html).

---
## Source: Connections.md

`connect` is used to specify how audio data should flow from one node to the next. It's analogous to "connecting a cable" from the output of one thing to the input of another. You will see the method used all over Tone.js and the Web Audio API, so it's important to know what it does and how to use it. 

#### Connections are directional

Signal flows from the output of the connect-er node (aka "source") to the input of the connect-ee ("sink"). For example, this code snippet: `source.connect(sink)` could be visualized like so: `source ---> sink`. 

#### Connections are invisible

The connection is made at a low level within underlying API.  Neither Tone.js nor the Web Audio API explicitly retain connectivity data. Specifically, there is no *query* mechanism enabling you to determine, e.g. "Is A connected to B?".  (Perhaps one could think of it as "write only"). Since connectivity cannot be determined programmatically, if such functionality is desired, it's up to the application to maintain connectivity state in whatever way meets your needs.

But fear not -- it's rarely a necessity.  All kinds interesting things can be built without your code becoming too difficult to reason about by direct inspection.  However, if you're really hard core you might find it interesting to know that more than one ambitious developer has wrapped a Nodal Editor around Tone Nodes and connections, creating a fun and useful "boxes and wires" interface with drag-and-drop functionality. Fun stuff.

#### You can connect different inputs and outputs

For nodes that have multiple inputs or outputs, `connect` can accept two additional arguments: the output number of the connect-er and the input number of the connect-ee. 

To connect the left (0th) output of a splitter node to the right (1st) output of a merger node: `split.connect(merge, 0, 1)`.  

### Convenience methods

Tone.js gives you a few convenience methods for connecting up nodes. 

#### `chain`

Use `chain` to connect a group of nodes in series.

```
source.chain(filter, pan, volume, Tone.Destination);
// source->filter->pan->volume->Tone.Destination
```

#### `fan`
`fan` connects the output of a node to the inputs of all of the arguments:

```
source.fan(reverb, chorus);
//source->reverb
//source->chorus
```

---
## Source: Effects.md

Tone.js also has a bunch of stereo and mono effects. 

To add an effect to your audio signal, simply connect the effect in between your source and destination. Here is an example which routes a [Tone.SimpleSynth](https://tonejs.github.io/docs/#SimpleSynth) through a [Tone.Distortion](https://tonejs.github.io/docs/#Distortion). 

```javascript
//create an effect and connect it to the master output
var dist = new Tone.Distortion().toMaster();
//create a synth and connect it to the effect
var synth = new Tone.SimpleSynth().connect(dist);
//and play a note to hear the distortion
synth.triggerAttackRelease("C4", "8n");
```

### dry/wet

All effects have a dry/wet control called `wet` which controls how much of the effected ("wet") signal is output compared to the uneffected ("dry") signal. The default value for the effects is 100% wet. 

```javascript
// 50/50 mix
effect.wet.value = 0.5;
//fade to 100% wet over 3 seconds.
effect.wet.rampTo(1, 3);
```

---
## Source: Envelope.md

Tone has multiple types of envelopes for different purposes. Each of the envelopes implements an [ADSR](http://en.wikipedia.org/wiki/Synthesizer#ADSR_envelope) and all of the timings use tempo-relative Tone.Time stay synchronized with the tempo even as the bpm changes. 

### Envelope Phases

![ADSR](http://upload.wikimedia.org/wikipedia/commons/e/ea/ADSR_parameter.svg)

#### Attack
The `attack` portion of the envelope makes the output signal transition from 0 (min) to 1 (max) over the duration of the attack time.

#### Decay
When the peak value is reached, the envelope will fall to the sustain value over the duration of the decay time. 

#### Sustain
Unlike the other attributes of an ADSR envelope, sustain is not a time, but a percentage of the maximum value of the signal. It is a number between 0 and 1. The envelope will remain at the sustain value, until the release is triggered.

#### Release
The time it takes for the envelope to return from the sustain value back to the minimum value is defined by the `release` time. 

### Example

Play with the parameters of an AmplitudeEnvelope to hear how each of the phases effects the timbre of the input source. 

[example](https://tonejs.github.io/examples/envelope.html)

### Envelope Types

#### [Tone.Envelope](https://tonejs.github.io/docs/#Envelope)

The basic envelope type just outputs a signal in the range of 0-1. This node has only an output and no input. 

`triggerAttack` starts the attack/decay portion of the envelope ending at the sustain value. An optional velocity argument will scale the output value at that number. 

#### [Tone.AmplitudeEnvelope](https://tonejs.github.io/docs/#AmplitudeEnvelope)

An amplitude envelope is just a Tone.Envelope connect to a GainNode so that audio passed into the input of the envelope will be scaled by the Tone.Envelope.  

#### [Tone.ScaledEnvelope](https://tonejs.github.io/docs/#ScaledEnvelope)

Tone.ScaledEnvelope has a range which starts at `min` and ramps to `max`. The `min` value can be larger than the `max`, it just represents what value the envelope starts at and ramps to. 

# Curves

The curve of the attack and release can be controlled by `attackCurve` and `releaseCurve`. These either take a string like "linear", "exponential", "sine", or an array of values to be used as the curve. Below are the curve names and their shapes. 

![curves](https://docs.google.com/drawings/d/1Lrz75eaAaLcS0SpgYih7cDS9GDiJlhRfStIxXfx8qj0/pub?w=642&h=1579)

---
## Source: Events.md

Tone.js has a few callback-generating classes which simplify the scheduling of complexly-timed events along the Transport. These events can be set to start and stop at specific moments along the Transport, as well as loop and playback at different rates. **Events will not fire unless the Transport is started.**

### Tone.Event

Tone.Event is the base-class for musical events. It creates a callback with a value which will be passed in as the second argument to the callback. 

```javascript
//create a looped note event every half-note
var note = new Tone.Event(function(time, pitch){
	synth.triggerAttackRelease(pitch, "16n", time);
}, "C2");

//set the note to loop every half measure
note.set({
	"loop" : true,
	"loopEnd" : "2n"
});

//start the note at the beginning of the Transport timeline
note.start(0);

//stop the note on the 4th measure
note.stop("4m");
```
#### `probability`

Events have a probability parameter which allows you to adjust the probability of the event firing each time it is scheduled to. 

```javascript
//fire 50% of the time
note.probability = 0.5;
```

#### `humanize`

"Humanization" let's you adjust how rigid the callback timing is. If `humanize` is set to `true`, the passed-in `time` parameter will drift back and forth slightly to make the part feel a little more "human". You can also set `humanize` to a Time value, which will make it drift by that amount. 

```javascript
//drift by +/- a 32nd-note
note.humanize = "32n";
```

#### `playbackRate`

You can also adjust the playback-rate of all Event classes. 

```javascript
//loop the event twice as fast. 
note.playbackRate = 2;
```

### Tone.Loop

Tone.Loop is a simplified Tone.Event. It has many of the same attributes as Tone.Event except instead of a `loopEnd` property, the duration of the loop is defined by the `interval` and it is set to loop by default. The constructor takes an `interval` after the callback

```javascript
//loop the callback every 8th note from the beginning of the Timeline
var loop = new Tone.Loop(callback, "8n").start(0);
```

### Tone.Part

Tone.Part aggregates any number of Tone.Events which can be started, stopped and looped as a combined unit. Parts have all of the same methods as Tone.Events. 

They can be constructed with either an array of `[Time, Value]` pairs, or with an array of objects that contain a `"time"` property. 

```javascript
var part = new Tone.Part(function(time, pitch){
	synth.triggerAttackRelease(pitch, "8n", time);
}, [["0", "C#3"], ["4n", "G3"], [3 * Tone.Time("8n"), "G#3"], ["2n", "C3"]]);

part.start("4m");
```

#### `at`

`at` let's you set or change values of a part at a given time. 

```javascript
//get the value at the given time
part.at("4n"); //returns "G3"
```

```javascript
//change the first note to a G#
part.at("0", "G#2");
```

### Tone.Sequence

Tone.Sequence extends Tone.Part and simplifies the notation of composing sequential events. Pass in an array of evenly-spaced events at a given subdivision like so:

```javascript
//a series of 8th notes
var seq = new Tone.Sequence(callback, ["C3", "Eb3", "F4", "Bb4"], "8n");
```

Nested arrays will subdivide that index by the length of the subarray and `null` is a rest

```javascript
//a dotted quarter-note followed by an 8th note triplet
var seq = new Tone.Sequence(function(time, note){
	//play the note
}, ["C3", [null, "Eb3"], ["F4", "Bb4", "C5"]], "4n");
```

Sequences are set to loop by default at whatever the length of the events array is. 

##### `at`

`at` works similarly to Tone.Part, but takes an index as the time value instead of the time. 

```javascript
seq.at(0); //returns "C3"
seq.at(1); //returns a Tone.Sequence
```

### Tone.Pattern

Tone.Pattern facilitates the creation of various arpeggiated note patterns. Its constructor takes a callback, an array of note values, and a string (the name of a supported classic "arpeggiator" pattern: "up", "down", "upDown", etc.)...

```javascript
//cycle up and then down the array of values
var arp = new Tone.Pattern(callback, ["C3", "E3", "G3"], "upDown");
//callback order: "C3", "E3", "G3", "E3", ...repeat

arp.pattern = "downUp";
//callback order: "G3", "E3", "C3", "E3", ...repeat
``` 

---
## Source: Glossary.md

# Glossary of Terminology

#### Amplitude

Amplitude is the highest value of a wave. 

#### Audio-Rate

Values that can be automated and scheduled on a single sample level.

see [Sampling Rate](#sampling-rate).

#### Beat

The beat is the basic unit of time, the pulse. A regularly repeating event. 

#### Bar

see [Measure](#measure). 

#### Buffer

A buffer is an array of audio data. Typically values are in the range of +1 to -1. 

#### Bus

A bus is an audio pathway that allows you to move a sound from one part of the mixer to another. [[link](https://web.archive.org/web/20150423054231/http://audiogeekzine.com/2008/09/understanding-sends-auxes-and-buses/)]. 

#### Callback

A callback is a function that is passed as an argument to other code, which is expected to call back (execute) the argument at some convenient time. [[link](http://en.wikipedia.org/wiki/Callback_%28computer_programming%29)]

#### Compressor

Dynamic range compression or simply compression reduces the volume of loud sounds or amplifies quiet sounds by narrowing or "compressing" an audio signal's dynamic range. 

#### Convolution

Convolution is a process used for simulating the reverberation or effects. It is based on the mathematical convolution operation, and uses a pre-recorded audio sample of the impulse response of the space being modeled. [[link](http://en.wikipedia.org/wiki/Convolution_reverb)]

#### Decibel

A Decibel is a logarithmic ratio between two values. Since we perceive loudness on a logarithmic scale, decibels are a useful quantifier for volume. [[link](http://www.soundonsound.com/sos/1994_articles/feb94/decibels.html)]

#### Dry/Wet Control

"Dry" signal is the unprocessed, "clean" signal, while "wet" signal has effects or processes applied to it. the Dry/Wet knob cross-fades between the two signals. 

#### Envelope

Temporal control over the loudness and spectral content of a sound. [[link](http://en.wikipedia.org/wiki/Synthesizer#ADSR_envelope)]

#### Feedback

Feeding the signal back into itself. For audio effects this is only effective if there is a delay signal in the mix, otherwise it leads to uncontrolled positive feedback. 

#### Filter

Audio Filters amplify or attenuate an incoming signal based on its frequency. Common types are "lowpass" which only let frequencies below the "cutoff" pass through, and highpass which only lets high frequencies pass through. [[link](http://en.wikipedia.org/wiki/Audio_filter)]

#### Gain

Gain is the ratio between the input and the output value of a signal. Volume and gain are related in that gain controls the volume, but volume is about the loudness of an acoustic signal as it's coming out of a speaker, gain a multiplication of any signal. 

#### LFO

An Low Frequency Oscillator (LFO) is any oscillator with a frequency of less than 20 or 30hz. These are often used as control signals to modulate synthesis or effects parameters to produce effects such as vibrato, tremolo and phasing. [[link](http://en.wikipedia.org/wiki/Low-frequency_oscillation)]

#### Mid/Side

Mid/Side processing separates the the 'mid' signal (which comes out of both the left and the right channel) and the 'side' (which only comes out of the the side channels) and effects them separately before being recombined. 

#### Measure

A segment of time corresponding to a specific number of beats (the number of beats is determined by the [time signature](#time-signature). Dividing music into bars provides regular reference points to pinpoint locations within a piece of music.

#### Monophonic

A monophonic synthesizer plays only one note at a time. see [Polyphonic](#polyphonic). 

#### Polyphonic

A polyphonic synthesizer can play multiple notes at once. see [Monophonic](#monophonic). 

#### Ramp

Like an animation tween for audio, a ramp is a smooth interpolation of value over a duration of time. 

#### Sampling Rate

Sampling is the reduction of a continuous analog audio signal to a discrete signal. Typically audio is sampled at over 40,000 times per second as a consequence of the Nyquist Theorem. [[link](http://en.wikipedia.org/wiki/Sampling_%28signal_processing%29#Audio_sampling)]

#### Signal

A signal is an [audio-rate](#audio-rate) value which can be used to carry sound waves or [sample-rate](#sampling-rate) control data. 

#### ScriptProcessorNode

The ScriptProcessorNode (now deprecated) was a Web Audio API standard for doing DSP in Javascript. While extremely powerful, the ScriptProcessorNode incurs a large performance and latency penalty. 

#### Synthesis

Electrical or digital signals which represent sound. 

#### Time Signature

Specifies how many [beats](#beat) are to be contained in each bar. 

#### Transport

The transport refers to the controls over play/pause/stop/rewind in a [Digital Audio Workstation](http://en.wikipedia.org/wiki/Digital_audio_workstation). 

---
## Source: Instruments.md

Tone.js has a number of pre-built synthesizers.

### Methods

All instruments have the same basic methods for triggering the attack and release of the envelopes. 

#### triggerAttack

`triggerAttack` takes the note value as the first argument. If no time value is passed in for the second argument, the attack will be triggered immediately. The third argument is the velocity of the attack. The velocity is a value between 0 and 1 which will scale the envelope's attack and sustain values. 

```javascript
//trigger the start of a note.
synth.triggerAttack("C4");

//trigger the start of a note at `time`
synth.triggerAttack("C4", time);

//trigger the start of a note at `time` with a velocity of 50%
synth.triggerAttack("C4", time, 0.5);
```

#### triggerRelease

After the attack, the note will stay at the `sustain` level until `triggerRelease` is called. 

```javascript
//trigger the release portion of the envelope immediately
synth.triggerRelease();

//trigger the release at `time`
synth.triggerRelease(time);
```

#### triggerAttackRelease

To schedule an attack and release together, use `triggerAttackRelease`. 

```javascript
//trigger "C4" and then 1 second later trigger the release
synth.triggerAttackRelease("C4", 1);
```

### Polyphony with Tone.PolySynth

Each of the synthesizers is monophonic, meaning it can only produce a single note at a time. [Tone.PolySynth](https://tonejs.github.io/docs/#PolySynth) will turn any of the synthesizers into a polyphonic synthesizer by producing multiple copies of a synth and then handling the triggering of attacks and releases on those synth voices. Tone.PolySynth is not a synth by itself, but just a vessel for constructing multiple voices of any of the other synthesizer types.  

The name of the synth is fed to the second argument of Tone.PolySynth to turn the monophonic voice into a polyphonic synthesizer like so: 

```javascript
//to make a 4 voice MonoSynth
var synth = new Tone.PolySynth(4, Tone.MonoSynth);
```

To set attributes of all the voices, use the `set` method. 

```javascript
synth.set({
	"envelope" : {
		"attack" : 0.1
	}
});
```

Unlike the rest of the synthesizers, PolySynth's `triggerRelease` method needs to be called with the note you want to release. 

---
## Source: Performance.md

This article provides some resources and best practices for working with Web Audio and Tone.js

## Audio Node Performance

Audio failures result in pops, crackles, silence and other unwanted artifacts. Paul Adenot (the author of Firefox's Web Audio implementation) has [a great article](http://padenot.github.io/web-audio-perf/) on the CPU, memory usage and incurred latency of most of the Web Audio nodes. It can be a helpful resource for pinpointing performance bottlenecks. The most processor intensive nodes are the ConvolverNode (Tone.Convolver) and PannerNode using HRTF (Tone.Panner3D). Other than the amount and types of nodes used, Web Audio does not currently offer much in the way of performance configuration and tuning.

## context.latencyHint

If you're using the Transport to schedule events, the amount of time in advance events are scheduled is adjustable. Scheduling events farther in advance is easier for the audio thread to process and may improve performance.

The `latencyHint` of Tone.js's AudioContext can be adjusted by instantiating a new context to replace Tone.js's default context. `latencyHint` can have a value of `"interactive"` (_default_, prioritizes low latency), `"playback"` (prioritizes sustained playback), or `"balanced"` (balances latency and performance). Or set it to the number of seconds which events should be scheduled in advance. 

```javascript
Tone.setContext(new Tone.Context({ latencyHint : "playback" }))
```

## context.lookAhead

By default a short lookAhead is used for scheduling everything in Tone.js. The native Web Audio's `context.currentTime` is summed with the value stored in `context.lookAhead` which defaults to `0.1 seconds`. This performance benefit is obviously at the expense of latency, For lower latency you can either set the lookAhead to a smaller value or 0, or use `Tone.immediate()` or `Tone.context.currentTime` which are the same value. 

## Scheduling in advance

As mentioned, it's best to schedule audio events as in advance as possible. For this reason, it's good to invoke `Tone.Transport.start` a little bit in the future. `Tone.Transport.start("+0.1")` will start the Transport 100 milliseconds in the future which is not very perceptible, but can help avoid scheduling errors.

Scheduling further in advance works for triggering playback of sources and synths as well. For example, if you are hearing performance issues when triggering a synth from a `mousedown` callback, try scheduling the sound a little in advance. Values under 0.1 seconds won't be very noticeable, but could help reduce pops. 

```javascript
element.addEventListener('mousedown', function(){
	//instead of scheduling the synth immediately,
	//try scheduling 50ms in the future to avoid performance-related pops
	synth.triggerAttack('C4', '+0.05')
})
```

## Syncing Visuals

If you're using Tone.Transport, it is important that you **do not** make draw calls or DOM manipulations inside of the callback provided by Tone.Transport or any of the classes that extend Tone.Event (Part, Sequence, Pattern, Loop). The callback for Tone.Transport uses a WebWorker, it is not synced to the animation frame. Also, Transport callbacks can occur many more times a second than animation frame callbacks and can be invoked in a background tab. Additionally, Transport events can be invoked well in advance of when the event is heard, so visuals triggered inside of one of these callbacks might not align with the audio event they are triggered with. 

A solution to synchronizing visuals and audio is to use [Tone.Draw](https://tonejs.github.io/docs/#Draw). You can schedule a draw callback from within a Transport callback using the AudioContext time that the event is supposed to occur. Tone.Draw will invoke the callback on the nearest animation frame to the given time. 

```javascript
var loop = new Tone.Loop(function(time){
	//instead of scheduling visuals inside of here
	//schedule a deferred callback with Tone.Draw

	Tone.Draw.schedule(function(){
		//this callback is invoked from a requestAnimationFrame
		//and will be invoked close to AudioContext time

	}, time) //use AudioContext time of the event

}, "8n")
```


## Loading and Decoding AudioBuffers

On memory constrained devices like mobile phones, loading many and/or large audio files can cause the browser to crash during the buffer decoding.

---
## Source: Repeater.md

A [Repeater](https://gist.github.com/Caraveo/1072a11cd241c9d46eea7f812af9ccff)


---
## Source: Signals.md

[Tone.Signal](https://tonejs.github.io/docs/#Signal) plays an important role in Tone.js by allowing audio-rate control over many attributes. It is similar, but more flexible than the Web Audio API's native [AudioParam](http://webaudio.github.io/web-audio-api/#the-audioparam-interface) and allows sample-accurate control synchronization of a node's attributes.

## Setting values

Unlike other attributes, to get or set the value of a Tone.Signal, you must access it through the `.value`. 

For example, the frequency attribute of Tone.Oscillator is a Tone.Signal:

```javascript
oscillator.frequency.value; //returns the current frequency value
oscillator.frequency.value = 100; //sets the value immediately
```

`.value` has to be used because Tone.Signal is not merely a number, but an audio-rate signal meaning it outputs a value on every sample and is also capable of sample-accurate automations. 

## Scheduling values

A very important feature of Tone.Signal is that it is sample-accurate. Scheduled changes will occur precisely when they are supposed to. 

Tone.Signal includes all of the same scheduling methods as the `AudioParam`, such as: 

* `setValueAtTime` - to schedule a value change at a precise time.
* `linearRampToValueAtTime` - to ramp to a value starting from the previously scheduled value. 
* `exponentialRampToValueAtTime` - same as the above, but with an exponential curve instead of a linear curve. 
* `setTargetAtTime` - unlike the `RampValueAtTime` methods, in `setTargetAtTime`, the time attribute is when it should start ramping towards the value instead of arrive at the value. It takes a third parameter which is the time constant at which it will change. 
* `setValueCurveAtTime` - sets an array of values which will be evenly invoked over the course of the duration. 
* `cancelScheduledValues` - cancels all values after the specified time. 

Additionally, Tone provides methods for ramping and scheduling values at the current time. These simplify the above methods by canceling all values after the current time and setting an automation point at the current value. 

* `linearRampTo` - set a value and a ramp time and the signal will begin linearly ramping towards that value. 
* `exponentialRampTo` - same as above but exponential ramp. 
* `rampTo` - same interface as the above methods, but will automatically decide to use linear or exponential based on the units of the signal. 

---
## Source: Sources.md

#### [Tone.Oscillator](https://tonejs.github.io/docs/#Oscillator)

A wrapper around the native OscillatorNode which simplifies starting and stopping and includes additional parameters such as phase rotation.

```javascript
//a square wave at 440hz
var osc = new Tone.Oscillator(440, "square")
	.toMaster() //connected to the master output
	.start(); // start it right away
```

Tone.Oscillator also includes modifiers on the default oscillator types. Set the type to `"square4"` to hear the first 4 partials of the square wave, or `"triangle9"` for the first 9 partials of the triangle wave. 

#### [Tone.Player](https://tonejs.github.io/docs/#Player)

Tone.Player plays an audio file. 

```javascript
var player = new Tone.Player("./sound.mp3").toDestination();
```

If you need to keep track of individual buffer loading, use the second callback of the constructor. 

```javascript
var player = new Tone.Player("./sound.mp3", function(){
	//the player is now ready	
}).toDestination();
```

If you don't care about individual load events, bind a function to `Tone.Buffer.on('load', callback)` to receive a callback when all of the buffers are fully loaded for Tone.Player, Tone.Convolver, and Tone.Sampler, etc. 

```javascript
Tone.Buffer.on('load', function(){
	//all buffers are loaded.	
})
```

#### [Tone.PulseOscillator](https://tonejs.github.io/docs/#PulseOscillator)

A pulse wave is like a square wave, but instead of having a duty-cycle which is 50% up and 50% down, the pulse oscillator lets you set the `width` of the oscillator. A width of 10% (`pulse.width.value = 0.1`) would produce a wave which is up 10% of the time and down 90% of the time. A width of 90% would sound identical to a wave at 10%, but be in the opposite phase. 

#### [Tone.PWMOscillator](https://tonejs.github.io/docs/#PWMOscillator)

The pulse width modulation oscillator varies the width of the PulseOscillator with another wave. It has an additional control over the `modulationWidth`. 

#### [Tone.FMOscillator](https://tonejs.github.io/docs/#FMOscillator)

Composed of one oscillator modulating the frequency of a second oscillator. This technique can give you many interesting harmonics.

#### [Tone.AMOscillator](https://tonejs.github.io/docs/#AMOscillator)

Composed of one oscillator modulating the amplitude of a second oscillator. 

#### [Tone.FatOscillator](https://tonejs.github.io/docs/#FatOscillator)

A fat oscillator is an abstraction around multiple, slightly detuned oscillators. 

#### [Tone.Noise](https://tonejs.github.io/docs/#Noise)

Noise outputs a looped random buffer with 3 different noise colors: white, pink, and brown. See [this](https://tonejs.github.io/examples/noises.html) example for what those different types of noise sound like. 

#### [Tone.OmniOscillator](https://tonejs.github.io/docs/#OmniOscillator)

Tone.OmniOscillator encompasses Tone.Oscillator, Tone.PWMOscillator and Tone.PulseOscillator which allows you to set it to be "sine", "square", "triangle", "sawtooth", "pwm", or "pulse". 

When the type is set to "pwm" it has an additional control over the `modulationFrequency` and when it's set to "pulse" it exposes a `width` attribute. Trying to set these attributes when the oscillator type is not set correctly will cause an error. 

---
## Source: Time.md

All methods which take time as an argument accept a String or Number. Time encoded as a Number is assumed to be seconds and returned. Time encoded as a String can take various forms in order to synchronize it to the Tone.Transport. 


## Examples:

### Numbers

A number will be evaluated as the time (in seconds). 

* `1.2` = 1.2 seconds
* `"3"` = 3 seconds

### Notation

Describes time in BPM and time signature relative values. 

* `"4n"` = quarter note
* `"8t"` = eighth note triplet
* `"2m"` = two measures
* `"8n."` = dotted-eighth note

### Transport Time

Tempo and time signature relative time in the form BARS:QUARTERS:SIXTEENTHS.

* `"32:0:0"` = start of the 32nd measure. 
* `"4:3:2"` = 4 bars + 3 quarter notes + 2 sixteenth notes. 
* `"1:2"` =  1 bar + 2 quarter notes (sixteenth notes can be omitted)

### Frequency

Seconds can also be described in Hz. 

* `"1hz"` = 1 second
* `"5hz"` = 0.2 seconds

### Ticks

A time relative to the Transport's PPQ (Pulse Per Quarter). The number before the 'i' needs to be an integer.

* `"1i"` = 1 tick
* `"192i"` = 1 quarter note at 192 PPQ

### Now-Relative 

Prefix any of the above with "+" and it will be interpreted as "the current time plus whatever expression follows"

* `"+1m"` = 1 measure from now
* `"+0.5"` = half a second from now

### No Argument

Methods which accept time, no argument (`undefined`) will be interpreted as "now" (i.e. the `audioContext.currentTime`). 

For example, Tone.MonoSynth's `triggerAttack` method will accept a time as the second argument, or if a value is ommitted, the it will default to "now".

```javascript
synth.triggerAttack();//context.currentTime
synth.triggerRelease("+4n"); //a quarter-note from now
```

## Quantization

Using the `@` symbol, a Time can be quantized relative to the the Transport's grid. 

* `"@1m"` = If the Transport is started, this will return the time of the next measure 

## Conversion

To convert between seconds and BPM relative values, use [Tone.Time](https://tonejs.github.io/docs/latest/fn/Time.html)

```javascript
Tone.Time("4n").toSeconds();
```

---
## Source: Transport.md

Tone.Transport is the master timekeeper, allowing for application-wide synchronization of sources, signals and events along a shared timeline. Callbacks scheduled with Tone.Transport will be invoked just before the scheduled time with the **exact** time of the event passed in as the first parameter to the callback. 

Tone.Transport's callbacks pass `time` into the callback because, without the Web Audio API, Javascript timing can be quite imprecise. For example, `setTimeout(callback, 100)` will be invoked _around_ 100 milliseconds later, but many musical applications require sub-millisecond accuracy. The Web Audio API provides sample-accurate scheduling for methods like `start`, `stop` and `setValueAtTime`, so we have to use the precise `time` parameter passed into the callback to schedule methods within the callback. 

Additionally, by abstracting away the Web Audio clock, Tone.Transport lets you think in terms of musical timing. In the Web Audio API, all time values are in terms of the AudioContext's time, which starts at 0 when the page is loaded and counts upward in seconds. With Tone.Transport, you can schedule events in bars and beats without having to convert everything to seconds.


## Basics

```javascript
Tone.Transport.schedule(function(time){
	//time = sample accurate time of the event
}, "1m");
```

The above callback will be invoked each time the Transport reaches the first measure. If the Transport is set to loop, or stopped and restarted, the callback will fire each time it reaches the scheduled position along the timeline. 

The callback won't fire until the Transport is started. 

```
Tone.Transport.start();
```

## Scheduling API

There are three basic methods for timing events with Tone.Transport; `schedule`, `scheduleRepeat` and `scheduleOnce`. All three of these methods return a unique ID which can be used to cancel the callback using `clear`. 

#### `schedule(callback, time)`

`Tone.Transport.schedule` will add a callback event to a specific position along the Transport which will be invoked each time the Transport reaches that position.

```javascript
Tone.Transport.schedule(function(time){
	//invoked when the Transport starts
}, 0);
```

#### `scheduleRepeat(callback, interval, startTime, duration)`

Schedule an event to be invoked at the given interval, starting at `startTime` and for the specified `duration`. If no `startTime` is passed in, the interval will start at the current tick if the Transport is started, or at 0 if the Transport is stopped. If no `duration` is given, 
the callback will repeat infinitely. 

```javascript
//play a note every eighth note starting from the first measure
Tone.Transport.scheduleRepeat(function(time){
	note.triggerAttack(time);
}, "8n", "1m");
```

#### `scheduleOnce(callback, time)`

Schedule an event which will only be invoked once. After the event is invoked, it will be removed. If the given `time` is before the current Transport's position, the event will be invoked immediately. 


#### `clear(eventID)`

Each of the scheduling methods returns a unique ID. This ID can be used to cancel the event using `clear`. 

### Attributes

#### `bpm`

Tempo-relative values (like `"1m"`) are evaluated against the Transport's bpm (beats per minute) value. `Tone.Transport.bpm` is a signal-rate value, which means that it's capable of smooth tempo-curves and automation. All callbacks scheduled with the Transport will adjust their timing to match the new tempo. 

```javascript
//smoothly ramp the tempo to 240 bpm over 4 seconds
Tone.Transport.bpm.rampTo(240, 4);
```


#### `loop`

When `loop` is set to `true`, the Transport will loop between `loopStart` and `loopEnd`. 

#### `timeSignature`

The transport is capable of any time signature, but the value will be reduced to a number over 4. So for example, 4/4 time would be set as just 4, and 6/8 time would be set as 3. 

If an array is given, it will be reduced to just the numerator value over 4 (`[7, 8]` becomes just `3.5`).

#### `swing`

The transport has a `swing` attribute which is a number between 0-1. It controls how laid back the `swingSubdivision`. 

#### `swingSubdivision`

The `swingSubdivision` sets which subdivision to apply the swing to. The default value is `"16n"`. The subdivision can be set to anything less than a quarter note. The downbeat will never be swung. 

# References

[Chris Wilson's great explanation of Web Audio scheduling.](http://www.html5rocks.com/en/tutorials/audio/scheduling/)

---
## Source: TransportTime.md

This page describes the relationship between the AudioContext time and the Transport's Time.

## Scheduling with AudioContext time

The AudioContext `currentTime` starts at 0 when the page is loaded and counts up in seconds. To schedule a sine wave to play for the first two seconds after a page loads you could do something like this:

```javascript
var sine = new Tone.Oscillator(440, "sine").toDestination();
//start the oscillator at 0
sine.start(0);
//stop it at 2
sine.stop(2);
```

#### On Click

Let's do the same thing, but instead we'll schedule the sine wave to play for two seconds after a button is pressed. We can no longer start at 0 and end at 2 like the above example, since by the time the button is pressed the AudioContext time is greater than 0. The solution is to get the current time of the AudioContext when the button was clicked and schedule relative to that time. 

```javascript
document.querySelector("#theButton").addEventListener("click", function(){
	//get the current time
	var now = Tone.now();
	//schedule relative to 'now'
	sine.start(now);
	sine.stop(now + 2);
});
```

Now say, instead of just a sine tone, we scheduled an entire song that plays when the button was clicked. You may want to jump ahead to a particular moment in the song, or go back to the beginning, or pause it for a moment. But, the AudioContext provides no way to seek or set the AudioContext time. It is always just counting upwards. 

## Seekablility

Tone.Transport provides an abstraction over the AudioContext time which allows you to start, stop and seek within the Transport's timeline. For example you could schedule a bunch of events along this timeline which can be started, stopped, paused, resumed, looped, jump to a specific moment, and even change the global tempo while keeping all those events synchronized.

#### Another Clock

Essentially, the Transport provides another clock that you can use to schedule events without thinking too much about what the current AudioContext time is. In the end, all Web Audio events need to be scheduled using the AudioContext time because this number is necessary for sample-accurate scheduling. Tone.js make it so that you rarely need to use the AudioContext's time directly.

#### Scheduling with TransportTime

If we wanted to play a short sine tone every 2 seconds indefinitely we might use Tone.Loop. 

```javascript
var loop = new Tone.Loop(function(time){
	sine.start(time);
	sine.stop(time + 0.5);
}, 2);
```

One thing to notice here is that `time` is passed in as the first argument to the callback function. This time is the AudioContext time when the event should be scheduled. To make the duration a half-second, we schedule the stop 0.5 seconds after the passed in time just like the button-click example.

The `loop` we scheduled will not play until started. Tone.Loop and all classes which extend Tone.Event are scheduled with time values relative to the Transport time (and not the AudioContext time like the examples above). In the documentation this Transport timeline-relative positioning is called [TransportTime](http://tonejs.github.iodocs/#TransportTime). TransportTime has all the same tempo-relative encodings as Time, but the event is scheduled against a specific position along the Transport. 

So we may want to schedule this loop to start from the beginning of the Transport (time = 0). 

```javascript
loop.start(0);
```

But even once we call start on the loop, our Transport has not been started yet, we must start the Transport in order to hear the loop start. 

```javascript
Tone.Transport.start();
```
Unlike the Tone.Event classes, `Tone.Transport.start` takes the AudioContext time as the argument and not the TransportTime. No argument evaluates to the `currentTime` of the AudioContext. No arguments for the `start` parameter of Tone.Event classes evaluates to the current position of the Transport. 

## Example

We've got many things that are being started and stopped in the loop example. Here's a similar snippet of code with a timeline showing when each of the events are invoked. 

```javascript
function loopCallback(time){
	console.log("loop");
}
var loop = new Tone.Loop(loopCallback, 2);
loop.start(0).stop(5);


function eventCallback(time){
	console.log("event");
}
var event = new Tone.Event(eventCallback).start(3);

//start the Transport 2 seconds after the page loads
Tone.Transport.start(2);
//stop it and restart it
Tone.Transport.stop(6);
Tone.Transport.start(8);
```


![Timeline of Transport on AudioContext time](https://docs.google.com/drawings/d/1lTK84jXjg4bX-C2jcqQnvWI6uEkoCocCPqOageZ1bZE/pub?w=1193&h=331)


#### The Time Argument

The reason time is passed into the callback function is because the function does not actually fire precisely at the scheduled time; instead it is invoked slightly before the scheduled time. The small amount of time between the callback being invoked and the time passed into the callback function is called the `lookAhead`, and it's how we schedule sample-accurate events just in time.


![Lookahead](https://docs.google.com/drawings/d/1MEMnJ9HmG6AzI47irrD-gniL-4ccNCcPnX92gDsXRFQ/pub?w=668&h=461)

---
## Source: Using-Tone.js-with-React-React-Typescript-or-Vue.md

This is a place to add any gotcha's and tips for people combining Tone.js with React or Vue. 

## Basic example in vanilla JS, React, and Vue

### Vanilla Javascript ([demo](https://codesandbox.io/s/tone-sampler-example-4pm72))
```js
import { Sampler } from "tone";

const sampler = new Sampler(
  {
    A1: "A1.mp3"
  },
  {
    onload: () => {
      document.querySelector("button").removeAttribute("disabled");
    }
  }
).toDestination();

document.querySelector("button").addEventListener("click", () => {
  sampler.triggerAttack("A2");
});

```

## The same component in React ([demo](https://codesandbox.io/s/tone-sampler-example-ykd53))
```js
import React from "react";
import ReactDOM from "react-dom";
import { Sampler } from "tone";
import A1 from "../A1.mp3";

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isLoaded: false };
    this.handleClick = this.handleClick.bind(this);

    this.sampler = new Sampler(
      { A1 },
      {
        onload: () => {
          this.setState({ isLoaded: true });
        }
      }
    ).toDestination();
  }

  handleClick() {
    this.sampler.triggerAttack("A1");
  }

  render() {
    const { isLoaded } = this.state;
    return (
      <div>
        <button disabled={!isLoaded} onClick={this.handleClick}>
          start
        </button>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
```

## The React component using Hooks ([Demo](https://codesandbox.io/s/tone-sampler-example-sjohx))
```js
import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Sampler } from "tone";
import A1 from "../A1.mp3";

export const App = () => {
  const [isLoaded, setLoaded] = useState(false);
  const sampler = useRef(null);

  useEffect(() => {
    sampler.current = new Sampler(
      { A1 },
      {
        onload: () => {
          setLoaded(true);
        }
      }
    ).toDestination();
  }, []);

  const handleClick = () => sampler.current.triggerAttack("A1");

  return (
    <div>
      <button disabled={!isLoaded} onClick={handleClick}>
        start
      </button>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("app"));
```

## The Same Example Using Vue Components ([Demo](https://codesandbox.io/s/tonejs-vue-example-wo3qr))
```js
import { Sampler } from "tone";
import A1 from "./A1.mp3";
import Vue from "vue";

new Vue({
  el: "#app",
  template: `
  <div id="app">
    <button :disabled="!isLoaded" @click="handleClick">
      start
    </button>
  </div>`,
  data: {
    isLoaded: false
  },
  created() {
    this.sampler = new Sampler(
      { A1 },
      {
        onload: () => {
          this.isLoaded = true;
        }
      }
    ).toDestination();
  },
  methods: {
    handleClick() {
      this.sampler.triggerAttack("A1");
    }
  }
});
```

---

## React + Typescript Caveats (typing hooks or components with Typescript, [Demo](https://codesandbox.io/s/reacttypescripttonejs-b6ibv?file=/src/useOscillator.ts)):

The issue: Sometimes we want to abstract the logic of a ToneJS class in React hooks or React Components, and maybe our intuition tells us to do this:

```typescript
// useOscillator.ts
import { useRef } from "react";
import { Oscillator } from "tone";

export default function useOscillator(
  options
): Oscillator {
  const oscillator = useRef<Oscillator>(
    new Oscillator(options).toDestination()
  );

  return oscillator.current;
}

// Oscillator.tsx
function Oscillator({ options, ...props }) {
  const oscillator = useOscillator(options);
  return (
    /* UI logic here */
  );
}
```

In this case, it's clear that we want to use options as something we pass directly to our `ToneJS` instance. Typescript should infer our types and we will have a nice developer experience.

However, if we check the type of options in this example, we will see that it's inferred to be `any`...

_Why does this happen?_

There {s small caveat regarding the [`Oscillator` class constructor]("https://github.com/Tonejs/Tone.js/blob/053b5d4397b595ea804b5d6baf6108158c8e0696/Tone/source/oscillator/Oscillator.ts#L73") (here's the exact lines copied):

```typescript
constructor(frequency?: Frequency, type?: ToneOscillatorType);
constructor(options?: Partial<ToneOscillatorConstructorOptions>)
constructor()
```

The constructor has 3 overload cases with different types, typescript can't infer the type :cry:. The Typescript handbook doesn't recommend this pattern, but this change would imply a huge change in the codebase of `ToneJS` and retro-compatibility, so that can't be changed.

The question we end up with is: **_How do we type this?_**

First instinct is to try typing it with the type we wish to use (in this case `Partial<ToneOscillatorConstructorOptions>` from "tone/Tone/source/Oscillator/OscillatorInterface"). However this will raise an error, the type clashes with other overload types.

We **need** to type this according to the overload we are using. Typescript has a handy helper for this: `ConstructorParameters<T>`. We simply need to use it: `ConstructorParameters<typeof Oscillator>`. This returns a `Tuple`, with a single element (The only constructor that has a single element as `options`), so we must access it:

```typescript
type Options = ConstructorParameters<typeof Oscillator>[0];
```

Now we can type everything safely in our app :smile: :
```typescript
import { useRef } from "react";contain it
import { Oscillator } from "tone";

type Options = ConstructorParameters<typeof Oscillator>[0];

export default function useOscillator(
  options: Options
): Oscillator {
  const oscillator = useRef<Oscillator>(
    new Oscillator(
      options as Options
    ).toDestination()
  );

  return oscillator.current;
}

// Oscillator.tsx
type Props = {
  options: Options;
  /* Other types */
}

function Oscillator({ options, ...props }) {
  const oscillator = useOscillator(options);
  return (
    /* UI logic here */
  );
}
```

## References

* [React + TypeScript Cheatsheets](https://github.com/typescript-cheatsheets/react-typescript-cheatsheet)

---
## Source: Using-Tone.js-with-React.md

Note to anyone considering working with audio in React Native, including using Tone.js.  React Native uses native audio libraries that can cause substantial and unforeseen problems, like random whole-app crashes that are very difficult to debug and may be due to un-changeable native code.  Proceed with caution.

---
## Source: Contributing.md

Bug fixes, examples, and contributions are welcome!

See [contribution guidelines](https://github.com/Tonejs/Tone.js/blob/dev/.github/CONTRIBUTING.md)

Feel free to get in touch (yotam@tonejs.org) and tell me what features you'd like contribute to. 

---
## Source: Building.md

## Installation

Install all dependencies

```bash
npm install
```

## Building

The complete bundled and minified build will be in the `build` directory after running

```bash
npm run build
```

## Watching

For developing, it's helpful to watch for changes and have it generate a new build when any file is saved:

```bash
npm run watch
```

---
## Source: Testing.md

Tone.js has an extensive test suite built on karma, mocha and chai.

## Installing

To install all testing dependencies: 

```bash
npm install
```

## All tests

To run all tests on Chrome and Firefox using Karma Test Runner:

```bash
npm run test
```

## Testing files

To test an individual file with karma: 

```bash
npm run test --file=Oscillator
```

(replace `Oscillator` with the name of the test file you'd like to run)

## Testing directories

To run all tests in a directory run:

```bash
npm run test --dir=core
```

(replace `core` with the name of the directory you'd like to run)

---
## Source: Typescripting-Tone.js.md

The goal is to convert all of Tone.js' modules to Typescript. These are some pointers and guidelines for contributing. 

This is a major undertaking and refactor. These are some notes to get everyone on the same page. 

[Here's a short video of me converting Tone.Reverb](https://www.youtube.com/watch?v=5wo98hOKR5k)

# Up and Running

Hopefully it's as easy as `npm install` to add all of the dependencies and `npm run watch` to start typescript watch

To help with the typescript conversion, i usually use [lebab](https://github.com/lebab/lebab) to speed up getting started. You'll have to edit the file a little before lebab can parse it. This usually includes changing `Tone.ClassName = function` to `const ClassName = function` and all references of `Tone.ClassName` to `ClassName`. I find it is also not able to parse the `defaults` static member and `Tone.extend(ClassName)` so i usually comment those out as well. 

# Guidelines

## 1) Branch

**Please make all Pull Requests on the [typescript branch](https://github.com/Tonejs/Tone.js/tree/typescript).**

Please make the PRs as self contained as possible, so each PR should ideally contain the typescript'ified class and its corresponding typescript test file. 

## 2) Tests

I'm moving tests from the 'test' directory to the same directory as the source files. Tests should end with `.test.ts`. For example, `Noise.ts` should have a test file in the same directory name `Noise.test.ts`. 

Try and get all tests to pass, if a test can't pass because of a changed API or something else, don't comment it out, but instead just mark it as 'skip'. 

For example: 

```javascript
it.skip("does not work yet", () => {
  // can't get this test to work
})
```

## 3) `getDefaults()`

The way that defaults are handled are slightly different with this typescript update. 

Defaults used to look like this:
```javascript
Tone.Noise.defaults = {
	"type" : "white",
	"playbackRate" : 1
};
```

The updated way is to create a static function which returns the default values mixed with the parent object's defaults: 

```typescript
type NoiseType = "white" | "brown" | "pink";

interface NoiseOptions extends SourceOptions {
	type: NoiseType;
	playbackRate: Positive;
}

// ... in the Noise Class
static getDefaults(): NoiseOptions {
	return Object.assign(Source.getDefaults(), {
		playbackRate: 1,
		type: "white" as NoiseType,
	});
}
```

## 4) Context

Part of this update is also making it easier to handle multiple simultaneous AudioContexts. 

For this to work, make sure any internal instances which are created, use the class's `this.context`. 

```typescript
private _volume: Volume = new Volume({
	context: this.context,
});
```

One of the tests in [BasicTests](https://github.com/Tonejs/Tone.js/blob/typescript/test/helper/Basic.js) tries to ensure and enforce this. 

## 5) Naming and Namespace

Previously all classes were added to the `Tone` object which was used as a namespace. In this typescript conversion, all of the modules have their own name and the bundling under one namespace will be handled in a later step to ensure backwards compatibility. 

old:
```javascript
Tone.Noise = function(){
	var options = Tone.defaults(arguments, ["type"], Tone.Noise);
	// ...etc
```

update:
```typescript
export class Noise extends Source {

	name = "Noise";
	// ...etc
```

Also make sure that the class has a "name" property like in the example above. 

The new naming scheme means that some module names need to change. For example `Tone.Buffer` has been renamed to `ToneAudioBuffer` and `Tone.AudioNode` has been changed to `ToneAudioNode`. This is done to avoid any ambiguity with javascript native classes.

## 6) Linting

The typescript update is using [tslint](https://palantir.github.io/tslint/) for linting. You can see the config in `tslint.json`. 

## 7) Constructor

A typical constructor looks something like this. It takes either a list of parameters, or an options object which includes all of the parameters described by `getDefaults()`

```typescript

/**
 * @param frequency The starting frequency of the oscillator.
 * @param type The type of the carrier oscillator.
 * @param modulationType The type of the modulator oscillator.
 */
constructor(frequency?: Frequency, type?: ToneOscillatorType, modulationType?: ToneOscillatorType);
constructor(options?: Partial<AMConstructorOptions>);
constructor() {

	super(optionsFromArguments(AMOscillator.getDefaults(), arguments, ["frequency", "type", "modulationType"]));
	const options = optionsFromArguments(AMOscillator.getDefaults(), arguments, ["frequency", "type", "modulationType"]);
	...
```

A couple of things to note about this: The enumerated arguments are the first overloaded constructor, the options object is the second one, and the overloaded constructor with no arguments is the last one. The `optionsFromArguments` function needs to be used twice here since `options` can't be defined before `super()` is called. Make sure to also add parameter documentation to at least the first constructor description.


# Tooling and Building

This is still in early development, so not all of the tooling and building are completed yet. If you'd like to contribute to this as well, that's also helpful! The goal is to keep it as backwards compatibility in terms of how the library is imported and used. 

## Build Output 

It should build es5 compatible modules as well as a single minified file which exports a single object that all the modules are nested within. 

## Docs

Separately, the documentation pipeline will also need to be worked on. i will start a separate repo for that. 

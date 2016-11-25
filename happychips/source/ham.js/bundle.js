/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var HamJS = __webpack_require__(1);

	var ham = new HamJS();

	var cw = new HamJS.modulators.cw({frequency: 1000, gain:0.1});


	document.getElementById('message').addEventListener('keypress', function(event) {
	    if (event.keyCode == 13) {
	        var text = document.getElementById('message').value;
	        var frequency = document.getElementById('frequency').value;
	        var wpm = document.getElementById('wpm').value;
	        var attack = document.getElementById('attack').value;
	        var decay = document.getElementById('decay').value;

	        if (frequency > 0) cw.setFrequency(frequency);
	        if (wpm > 0) cw.setWPM(wpm);
	        if (attack > 0) cw.setAttack(attack / 1000.0);
	        if (decay > 0) cw.setDecay(decay / 1000.0);

	        ham.use(cw);
	        ham.transmit(text, event.shiftKey);
	    }
	});


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(2);


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var ham = function(audioContext) {
	    if (audioContext) {
	        this.ac = audioContext;
	    }
	    else {
	        this.ac = new (window.AudioContext || window.webkitAudioContext)();
	    }
	    this.sources = {};
	};

	ham.prototype.use = function(modem) {
	    this.modem = modem;
	    modem.connect(this.ac);
	};

	ham.prototype.stopAll = function() {
	    for (var x in this.sources) {
	        this.sources[x].stop();
	        delete this.sources[x];
	    }
	    this.currentSource = null;
	};

	ham.prototype.transmit = function(data, stopCurrent) {
	    console.log('radio.transmit: ' + data);
	    var encoded = this.modem.encode(data);
	    console.log('encoded: ' + encoded);
	    var buffer = this.modem.modulate(encoded);
	    console.log('buffer length: ' + (buffer.length / buffer.sampleRate));

	    if (stopCurrent) {
	        this.stopAll();
	    }

	    var source = this.ac.createBufferSource();
	    var now = Date.now();
	    this.sources[now] = source;
	    source.onended = function(){
	        delete this.sources[now];
	        if (this.currentSource === source) {
	            this.currentSource = null;
	        }
	    }.bind(this);

	    source.buffer = buffer;
	    source.connect(this.ac.destination);
	    source.start();
	    this.currentSource = source;
	};

	ham.modulators = {
	    cw: __webpack_require__(3),
	};

	module.exports = ham;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(4);

	var defaultConfig = {
	    channels: 1,
	    frequency: 1000,
	    attack: 0.005,
	    decay: 0.005,
	    gain: 1.0,
	    wpm: 20,
	};

	var cw = function(config) {
	    Object.assign(this, defaultConfig, config);
	    this.setWPM(this.wpm);
	    this.morseBuffer = '';
	};

	var alphabet = {
	    'a': '.-',    'b': '-...',  'c': '-.-.', 'd': '-..',
	    'e': '.',     'f': '..-.',  'g': '--.',  'h': '....',
	    'i': '..',    'j': '.---',  'k': '-.-',  'l': '.-..',
	    'm': '--',    'n': '-.',    'o': '---',  'p': '.--.',
	    'q': '--.-',  'r': '.-.',   's': '...',  't': '-',
	    'u': '..-',   'v': '...-',  'w': '.--',  'x': '-..-',
	    'y': '-.--',  'z': '--..',  ' ': ',',
	    '1': '.----', '2': '..---', '3': '...--', '4': '....-',
	    '5': '.....', '6': '-....', '7': '--...', '8': '---..',
	    '9': '----.', '0': '-----',
	};

	cw.prototype.encode = function(data) {
	    return data
	        .split('')
	        .map(function(e){
	            return alphabet[e.toLowerCase()] || '';
	        })
	        .join(' ')
	        .replace(/ +/g, ' ')
	        .replace(/ , /g, ',');
	};

	cw.prototype.setFrequency = function(value) {
	    this.frequency = value;
	};

	cw.prototype.setWPM = function(value) {
	    this.wpm = value;
	    this.dotLength = 1.2 / this.wpm;
	};

	cw.prototype.setAttack = function(value) {
	    this.attack = value;
	};

	cw.prototype.setDecay = function(value) {
	    this.decay = value;
	};

	cw.prototype.connect = function(audioContext) {
	    this.ac = audioContext;
	    this.sampleRate = this.ac.sampleRate;
	};


	cw.prototype.insertTone = function(audioBuffer, offset, frequency, length, attack, decay) {
	    attack *= this.sampleRate;
	    decay *= this.sampleRate;
	    length *= this.sampleRate;
	    var i;
	    for (i = 0; i < length; i++) {
	        var ramp = this.gain;
	        if (i < attack) {
	            ramp = Utils.cosLerp(0.0, this.gain, i / attack);
	        }
	        else if (i > length - decay) {
	            ramp = Utils.cosLerp(0.0, this.gain, (length - i) / decay);
	        }
	        audioBuffer[i + offset] = Math.sin(this.frequency * i * Math.PI * 2 / this.sampleRate) * ramp;
	    }
	    return i;
	};

	cw.prototype.getLength = function() {
	    var length = 0;
	    for (var i = 0; i < this.morseBuffer.length; i++) {
	        var c = this.morseBuffer[i];
	        switch (c) {
	            case '.':
	                length += 1 + 1;
	                break;
	            case '-':
	                length += 3 + 1;
	                break;
	            case ' ':
	                length += 2;
	                break;
	            case ',':
	                length += 6;
	                break;
	        }
	    }
	    return length * this.dotLength;
	};

	cw.prototype.insertTones = function(channelData) {
	    var offset = 0;
	    for (var i = 0; i < this.morseBuffer.length; i++) {
	        var c = this.morseBuffer[i];
	        switch (c) {
	            case '.':
	                offset += this.insertTone(channelData, offset, this.frequency, this.dotLength, this.attack, this.decay);
	                offset += this.dotLength * this.sampleRate;
	                break;
	            case '-':
	                offset += this.insertTone(channelData, offset, this.frequency, this.dotLength * 3, this.attack, this.decay);
	                offset += this.dotLength * this.sampleRate;
	                break;
	            case ' ':
	                offset += 2 * this.dotLength * this.sampleRate;
	                break;
	            case ',':
	                offset += 6 * this.dotLength * this.sampleRate;
	                break;
	        }
	    }
	};

	cw.prototype.modulate = function(data) {
	    this.morseBuffer = data;
	    this.length = this.getLength();

	    this.frameCount = this.channels * this.ac.sampleRate * this.length;
	    this.audioBuffer = this.ac.createBuffer(this.channels, this.frameCount, this.ac.sampleRate);

	    var channelData = this.audioBuffer.getChannelData(0);
	    this.insertTones(channelData);

	    return this.audioBuffer;
	};

	module.exports = cw;


/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = {
	    lerp: function (a, b, x) {
	        // map [0,1] linearily
	        return a + x * (b - a);
	    },
	    cosLerp: function (a, b, x) {
	        // map [0,1] to the smoothness of a (co)sinus curve
	        return this.lerp(a, b, 0.5 + 0.5 * Math.cos(Math.PI * x + Math.PI));
	    },
	};


/***/ }
/******/ ]);

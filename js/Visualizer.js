/*
 * VISUALIZER
 */
RING.Visualizer = Backbone.Model.extend({
	defaults : {
		bassTarget : 0,
		bassCurrent : 0,
		midTarget : 0,
		midCurrent : 0,
		highTarget : 0,
		highCurrent : 0,
		rotation : 0,
		highVolume : 0,
		midVolume : 0,
		bassVolume : 0,
	},
	initialize : function(attributes, options) {
		//this.createAnalysers();
		//setup the request animation frame
		this.view = new RING.Visualizer.View({
			model : this,
		});
	},
	update : function() {
		var tatums = RING.metronome.get("tatums");
		var rotation = .5 * Math.PI * (tatums % 4);
		//set the bass
		var bassCurrent = this.get("bassCurrent");
		var bassTarget = this.get("bassTarget");
		if(Math.abs(bassCurrent - bassTarget) > .01) {
			bassCurrent = (bassCurrent + bassTarget) / 2;
		} else {
			bassCurrent = bassTarget;
		}
		//set the mid
		var midCurrent = this.get("midCurrent");
		var midTarget = this.get("midTarget");
		if(Math.abs(midCurrent - midTarget) > .01) {
			midCurrent = (midCurrent + midTarget) / 2;
		} else {
			midCurrent = midTarget;
		}
		//set the high
		var highCurrent = this.get("highCurrent");
		var highTarget = this.get("highTarget");
		if(Math.abs(highCurrent - highTarget) > .01) {
			highCurrent = (highCurrent + highTarget) / 2;
		} else {
			highCurrent = highTarget;
		}

		//now set the volume/opacity
		var highRing = RING.high.get("ring") + 1;
		var highVolume = tatums % (.5 * (1 / highRing));
		highVolume *= (2 * Math.PI * highRing);
		highVolume = Math.cos(highVolume);
		highVolume = RING.Util.scale(highVolume, 0, 1, .25, .35);

		var midRing = RING.mid.get("ring") + 1;
		var midVolume = tatums % .25;
		midVolume *= (4 * Math.PI);
		midVolume = Math.cos(midVolume);
		midVolume = RING.Util.scale(midVolume, 0, 1, .25, .35);

		var bassRing = Math.pow(2, RING.bass.get("ring"));
		var bassVolume = tatums % (1 / bassRing);
		bassVolume *= (Math.PI * bassRing);
		bassVolume = Math.cos(bassVolume);
		bassVolume = RING.Util.scale(bassVolume, 0, 1, .5, 1);

		this.set({
			rotation : rotation,
			bassTarget : RING.bass.get("ring"),
			midTarget : midRing,
			highTarget : highRing,
			bassCurrent : bassCurrent,
			midCurrent : midCurrent,
			highCurrent : highCurrent,
			highVolume : highVolume,
			midVolume : midVolume,
			bassVolume : bassVolume,
		});
	},
	//analyzers for each of the sections
	createAnalysers : function() {
		this.analyserHigh = RING.context.createAnalyser();
		this.analyserMid = RING.context.createAnalyser();
		this.analyserBass = RING.context.createAnalyser();
		//the attributes
		var size = 32;
		var timeConst = 0.1;
		this.analyserHigh.smoothingTimeConstant = timeConst;
		this.analyserHigh.fftSize = size;
		//connect it up to the module outputs
		RING.high.output.connect(this.analyserHigh);
		RING.mid.output.connect(this.analyserMid);
		RING.bass.output.connect(this.analyserBass);
		//the javascript node
		this.javascriptNode = RING.context.createJavaScriptNode(4096, 1, 1);
		this.analyserHigh.connect(this.javascriptNode);
		this.analyserMid.connect(this.javascriptNode);
		this.analyserBass.connect(this.javascriptNode);
		this.javascriptNode.connect(RING.context.destination);
		//the callback
		//context trickery
		var self = this;
		//the processing callback
		this.javascriptNode.onaudioprocess = function(event) {
			//local references
			var analyserHigh = self.analyserHigh;
			var analyserMid = self.analyserMid;
			var analyserBass = self.analyserBass;

			//first the High channel:
			var arrayHigh = new Uint8Array(analyserBass.frequencyBinCount);
			analyserBass.getByteFrequencyData(arrayHigh);
			//get the peak
			var averageHigh = 0;
			// get all the frequency amplitudes
			var max = Math.max
			for(var i = 0, length = arrayHigh.length; i < length; i++) {
				averageHigh += arrayHigh[i];
			}
			averageHigh /= arrayHigh.length;
			averageHigh /= 30;
			console.log(averageHigh);
			self.set("highVolume", averageHigh);
		}
	}
})

RING.Visualizer.View = Backbone.View.extend({

	initialize : function() {
		this.width = 450;
		this.height = 450;
		this.$canvas = $("<canvas class='ringCanvas'></canvas>").appendTo(this.$el);
		this.context = this.$canvas[0].getContext('2d');
		this.context.canvas.width = this.width;
		this.context.canvas.height = this.height;
		this.$el.appendTo($("#visualizer"));
		//setup the animation frame
		this.drawRing();

	},
	drawRing : function() {
		//update the model
		this.model.update();
		//clear
		this.context.clearRect(0, 0, this.width, this.height);
		//draw the parts
		this.drawHigh(this.context, this.width, this.height);
		this.drawMid(this.context, this.width, this.height);
		this.drawBass(this.context, this.width, this.height);

		//next frame
		requestAnimationFrame(_.bind(this.drawRing, this));
	},
	drawHigh : function(context, width, height) {
		var tatums = (RING.metronome.get("tatums") % this.model.get("highCurrent"));
		var rotation = (2/this.model.get("highCurrent")) * Math.PI * tatums;

		context.save();
		context.translate(width / 2, height / 2);
		//var ringValue = (this.model.get("highCurrent")-1)/(RING.high.get("ringMax") + 2) + 1;
		context.rotate(rotation);
		context.lineCap = 'round';
		var twoPi = Math.PI * 2;
		var rings = Math.round((this.model.get("highCurrent") + 1) * 6);
		var timbre = RING.high.get("timbre");
		context.lineWidth = RING.Util.scale(timbre, 0, 1, 4, 18);
		var insideLen = 170;
		var length = 210;
		context.save();
		for(var i = 0; i < rings; i++) {
			context.rotate((twoPi / rings));
			var hue = (360 / rings) * i;
			context.strokeStyle = "hsla(" + hue + ", 100%, 50%, " + this.model.get("highVolume") + ")";
			context.beginPath();
			context.moveTo(0, 170);
			context.lineTo(0, 210);
			context.stroke();
			context.closePath();
		}
		context.restore();
		context.restore();
	},
	drawMid : function(context, width, height) {
		context.save();
		context.translate(width / 2, height / 2);
		context.rotate(-this.model.get("rotation"));
		context.lineCap = 'round';
		var twoPi = Math.PI * 2;
		var rings = Math.round(this.model.get("midCurrent") * 2 + 8);
		var timbre = RING.mid.get("timbre");
		context.save();
		var radius = 8;
		var triangleWidth = RING.Util.scale(timbre, 0, 1, 30, 80);
		var minY = 50;
		var maxY = 165;
		for(var i = 0; i < rings; i++) {
			context.rotate((twoPi / rings));
			var hue = (360 / rings) * i;
			context.fillStyle = "hsla(" + hue + ", 100%, 50%, " + this.model.get("midVolume") + ")";
			context.beginPath();
			//make a triange
			context.moveTo(-triangleWidth, minY);
			context.arcTo(0, maxY, triangleWidth, minY, radius);
			context.arcTo(triangleWidth, minY, triangleWidth - radius, minY, radius);
			context.arcTo(-triangleWidth, minY, 0, maxY, radius);
			context.fill();
			context.closePath();
		}
		context.restore();
		context.restore();
	},
	drawBass : function(context, width, height) {
		context.save();
		context.translate(width / 2, height / 2);
		context.rotate(this.model.get("rotation"));
		context.lineWidth = 1;
		context.strokeStyle = "hsla( 0, 0%, 20%, " + this.model.get("bassVolume") + ")";
		//the values
		var ring = this.model.get("bassCurrent");
		var timbre = RING.bass.get("timbre") / 4;
		var radius = 150;
		var twoPi = Math.PI * 2;
		var iterations = RING.Util.scale(ring, 0, RING.bass.get("ringMax"), 10, 30)
		for(var i = 0; i < iterations; i++) {
			context.rotate(timbre);
			context.save();
			context.beginPath();
			context.scale(i / iterations, (iterations - i) / iterations);
			context.arc(0, 0, radius, 0, twoPi, false);
			context.restore();
			context.stroke();
			context.closePath();

		}
		context.restore();
	},
})

/**
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */

if(!window.requestAnimationFrame) {
	window.requestAnimationFrame = (function() {
		return window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
		function(/* function FrameRequestCallback */callback, /* DOMElement Element */element) {
			window.setTimeout(callback, 1000 / 60);
		};

	} )();
}
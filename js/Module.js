RING.Module = Backbone.Model.extend({

	gain : 1,

	//the array of notes to play
	notes : [],

	//the path to the notes audio
	path : './',

	defaults : {
		"ringMax" : 0,
		"ring" : 0,
		"timbre" : .5,
		"position" : -1,
		"index" : -1,
		//the amount of loaded files
		"loaded" : 0,
		"progress" : 0,
	},

	superInit : function(attributes, options) {
		//the gains
		this.gainA = RING.context.createGainNode();
		this.gainB = RING.context.createGainNode();
		this.output = RING.context.createGainNode();
		this.gainA.connect(this.output);
		this.gainB.connect(this.output);
		this.output.connect(RING.context.destination);

		this.on("change:loaded", this.loadingProgress);
		this.on("change:timbre", this.changeTimbre);
		this.on("change:ring", this.changeRing);
		this.on("change:ringMax", this.changeMax);
		this.listenTo(RING.model, "change:progress", this.interpolate);
		this.listenTo(RING.model, "change:section", this.changeSection);
		//load the chords
		this.loadNotes();
		//set the default ring value and timbres for each of the 3 sections
		this.timbres = [RING.Util.random(), RING.Util.random(), RING.Util.random()];
		this.set("timbre", this.timbres[0]);
	},
	//play the note based on the subdivision and chord
	play : function(time) {
		var sourceA = RING.context.createBufferSource();
		var sourceB = RING.context.createBufferSource();
		//the buffers
		//var section = this.get("section");
		var note = this.get("position");
		try {
			sourceA.buffer = this.notes[note][0];
			sourceB.buffer = this.notes[note][1];
		} catch(e) {
			console.error(e);
		}

		//connect them to the timbre faders
		sourceA.connect(this.gainA);
		sourceB.connect(this.gainB);
		//play the sources
		sourceA.noteOn(time);
		sourceB.noteOn(time);
	},
	//adjusts the timbre by crossfading the two sources
	changeTimbre : function(model, timbre) {
		//set the current values
		var now = RING.context.currentTime;
		this.gainA.gain.setValueAtTime(this.gainA.gain.value, now);
		this.gainB.gain.setValueAtTime(this.gainB.gain.value, now);
		var timbre = this.get("timbre");
		this.gainA.gain.linearRampToValueAtTime(timbre, now + .01);
		this.gainB.gain.linearRampToValueAtTime(1 - timbre, now + .01);
		//record the timbre
		if(RING.model.get("started") === 0) {
			this.timbres[RING.model.get("section")] = timbre;
		}
	},
	changeSection : function(model, section) {
		if(RING.model.get("started") === 0) {
			this.set("timbre", this.timbres[section]);
			this.set("ring", this.rings[section]);
		}
	},
	changeRing : function(model, ring) {
		if(RING.model.get("started") === 0) {
			this.rings[RING.model.get("section")] = ring;
		}
	},
	changeMax : function(model, max) {
		this.rings = [RING.Util.randomInt(0, max), RING.Util.randomInt(0, max), RING.Util.randomInt(0, max)];
		this.set("ring", this.rings[0]);
	},
	loadNotes : function() {
		for(var i = 0; i < this.notes.length; i++) {
			this.loadSound(this.path + this.notes[i][0] + ".mp3", i, 0);
			this.loadSound(this.path + this.notes[i][1] + ".mp3", i, 1);
		}
	},
	loadSound : function(url, noteIndex, timbreIndex) {
		var request = new XMLHttpRequest();
		request.open('GET', url, true);
		request.responseType = 'arraybuffer';
		var self = this;
		var context = RING.context;
		// Decode asynchronously
		request.onload = function() {
			context.decodeAudioData(request.response, function(buffer) {
				self.notes[noteIndex][timbreIndex] = buffer;
				//update the progress
				var loaded = self.get("loaded");
				loaded++;
				self.set("loaded", loaded);
			}, function(error) {
				console.error(error);
			});
		}
		request.send();
	},
	loadingProgress : function(model, loaded) {
		model.set("progress", loaded / (this.notes.length * 2));
	},
	//interpolates between the start/middle/end values
	//value is between 0-2
	interpolate : function(model, progress) {
		var index = Math.floor(progress);
		//step
		if(index < 2) {
			var ringFrom = this.rings[index];
			var ringTo = this.rings[index + 1];
			var ringVal = Math.round(RING.Util.scale(progress, index, index + 1, ringFrom, ringTo));
			//timbre
			var timbreFrom = this.timbres[index];
			var timbreTo = this.timbres[index + 1];
			var timbreVal = RING.Util.scale(progress, index, index + 1, timbreFrom, timbreTo);
		} else {
			var ringVal = this.rings[2];
			var timbreVal = this.timbres[2];
		}
		this.set({
			ring : ringVal,
			timbre : timbreVal
		});
	},
	//mute/unmute
	mute : function() {
		var now = RING.context.currentTime;
		this.output.gain.cancelScheduledValues(now);
		this.output.gain.setValueAtTime(this.output.gain.value, now);
		this.output.gain.linearRampToValueAtTime(0, now + .1);
	},
	unmute : function() {
		var now = RING.context.currentTime;
		this.output.gain.cancelScheduledValues(now);
		this.output.gain.setValueAtTime(this.output.gain.value, now);
		this.output.gain.linearRampToValueAtTime(this.gain, now + .1);
	},
	restart : function() {
		this.set({
			"position" : -1,
		});
	}
});

RING.Module.View = Backbone.View.extend({

	className : "module",

	title : "no name",

	events : {
		"drag .sliderHandle" : "changeTimbre",
		"mousedown .ringHolder" : "ringChangeStart",
		"mousemove .ringHolder" : "ringDragged",
		"mouseup .ringHolder" : "ringChangeEnd",
		"mouseleave .ringHolder" : "ringChangeEnd",
		"mouseenter" : "solo",
		"mouseleave" : "unsolo",
	},
	superInit : function() {
		this.listenTo(this.model, "change", this.render);
		this.$title = $("<div class='title'>" + this.title + "</div>").appendTo(this.$el);
		//ring knob
		this.$ring = $("<div class='ring'></div>").appendTo(this.$el);
		this.$ringNumber = $("<div class='ringNumber'>0</div>").appendTo(this.$ring);
		this.$ringIndicator = $("<div class='ringIndicator'> </div>").appendTo(this.$ring);
		this.$ringHandle = $("<div class='ringHandle'> </div>").appendTo(this.$ring);
		this.$indexIndicator = $("<div class='indexIndicator'> </div>").appendTo(this.$ring);

		//timbre slider
		this.$timbre = $("<div class='timbre sliderLine'><div class='sliderContainer'></div></div>").appendTo(this.$el);
		this.$timbreNumber = $("<div class='timbreNumber'>0</div>").appendTo(this.$timbre);
		this.$timbreSlider = $("<div class='sliderHandle tooltip' title='"+this.title+" timbre'></div>").appendTo(this.$timbre);
		this.$el.appendTo(RING.moduleContainer);
	},
	render : function(model) {
		var ring = model.get("ring");
		var ringMax = model.get("ringMax") + 1;
		var timbre = model.get("timbre");

		this.$timbreSlider.draggable({
			containment : ".sliderContainer",
			axis : "x",
		}).css({
			left : RING.Util.scale(timbre, 0, 1, 9, 103),
		}).tooltip();

		this.$timbreNumber.html(RING.Util.toInt(timbre * 100));

		//position the handle
		//find the angle
		var angle = (ring / ringMax) * 360;
		this.handleAngle = angle;
		//rotate the image
		this.$ringHandle.css({
			rotate : angle + "deg",
		});
		this.$ringHolder.tooltip();
		//set the subidivision indicator
		this.$ringIndicator.removeClass("n1 n2 n3 n4 n8 n16");
		this.$ringIndicator.addClass("n" + this.subdivision);
		this.drawRing();
	},
	drawRing : function() {

	},
	changeTimbre : function(event, ui) {
		this.model.set("timbre", RING.Util.clip(RING.Util.scale(ui.position.left, 9, 103, 0, 1), 0, 1));
	},
	//ring knob events
	ringChangeStart : function(event) {
		var x = event.offsetX;
		var y = event.offsetY;
		//relative to the center
		x -= 50;
		y -= 50;
		var radius = Math.sqrt(x * x + y * y);
		var angle = (Math.atan2(y, x) * (180 / Math.PI) + 450) % 360;
		var angleDiff = Math.abs(angle - this.handleAngle)
		if(((angleDiff < 30) || (angleDiff > 330)) && radius < 44) {
			this.holdHandle = true;
		}
	},
	ringDragged : function(event) {
		if(this.holdHandle) {
			var ringMax = this.model.get("ringMax") + 1;
			var x = event.offsetX;
			var y = event.offsetY;
			//relative to the center
			x -= 50;
			y -= 50;
			var radius = Math.sqrt(x * x + y * y);
			var angle = (Math.atan2(y, x) * (180 / Math.PI) + 450) % 360;
			var ringVal = Math.round(angle / (360 / ringMax)) % ringMax;
			this.model.set("ring", ringVal);
		}

	},
	ringChangeEnd : function(event) {
		this.holdHandle = false;
	},
	solo : function() {
		RING.muteAll();
		this.model.unmute();
		this.$title.addClass("solo");
	},
	unsolo : function() {
		RING.unmuteAll();
		this.$title.removeClass("solo")
	}
})
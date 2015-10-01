RING.Bass = RING.Module.extend({

	gain : 1,

	path : './audio/bass/',

	notes : [["L_A1", "R_A1"], ["L_A2", "R_A2"], ["L_A4", "R_A4"], ["L_A8", "R_A8"], ["L_A16", "R_A16"], ["L_C1", "R_C1"], ["L_C2", "R_C2"], ["L_C4", "R_C4"], ["L_C8", "R_C8"], ["L_C16", "R_C16"]],

	initialize : function(attributes, options) {
		this.superInit(attributes, options);
		//some initial values
		this.set({
			ringMax : 4,
			measure : -1,
			chord : -1,
		});
		//the metronome listener
		this.listenTo(RING.metronome, "change:16n", this.tick);
		//make the view
		this.view = new RING.Bass.View({
			model : this
		})
	},
	//called every 16th note
	tick : function(model, sixteenth, time) {
		//on the downbeat
		if(sixteenth === 0) {
			//increment the measure
			var meas = this.get("measure");
			if(meas === 0) {
				this.set("measure", 1);
			} else {
				//change the chord after 2 measures
				this.set("measure", 0);
				var chord = this.get("chord");
				chord++;
				chord = chord % 2;
				this.set("chord", chord);
			}
		}
		var subdivision = this.get("ring");
		var sub = Math.pow(2, subdivision);
		//set the position based on the chord and ring value
		var position = subdivision + this.get("chord") * (this.notes.length / 2);
		this.set("position", position);

		if(sixteenth % (16 / sub) === 0) {
			var divisor = 16/sub;
			var index = sixteenth/divisor;
			this.set("index", index);
			this.play(time);
		}
	},
	restart : function() {
		this.set({
			"chord" : -1,
			"measure" : -1,
		});
	}
});

RING.Bass.View = RING.Module.View.extend({

	title : "BASS",

	initialize : function() {
		this.superInit();
		this.listenTo(this.model, "change:ring", this.setSubdivision);
		this.listenTo(this.model, "change:index", this.drawRing);
		this.setSubdivision(this.model, this.model.get("ring"));
		this.$ringHolder = $("<div class='ringHolder tooltip' title='BASS subdivision'></div>").appendTo(this.$ring);
		this.render(this.model);
	},
	setSubdivision : function(model, ring) {
		this.subdivision = Math.pow(2, ring);
		this.drawRing();
	},
	drawRing : function() {
		var ring = this.model.get("ring");
		this.$ringNumber.html(Math.pow(2, ring));
		//set the highlighted part of the indicator
		//if either the index or the measure has changed
		if(this.model.hasChanged("index") || this.model.hasChanged("measure") || this.model.hasChanged("ring") ) {
			var index = this.model.get("index") + 1;
			this.$indexIndicator.html(" ");
			var selector = "#img" + this.subdivision + "_" + index;
			this.$indexIndicator.append($(selector).clone());
		}
	}
})
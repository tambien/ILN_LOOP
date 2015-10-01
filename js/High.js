RING.High = RING.Module.extend({

	gain : .5,

	notes : [["L_B0", "R_B0"], ["L_B1", "R_B1"], ["L_B2", "R_B2"], ["L_B3", "R_B3"], ["L_E0", "R_E0"], ["L_E1", "R_E1"], ["L_E2", "R_E2"], ["L_E3", "R_E3"], ["L_G0", "R_G0"], ["L_G1", "R_G1"], ["L_G2", "R_G2"], ["L_G3", "R_G3"], ["L_C0", "R_C0"], ["L_C1", "R_C1"], ["L_C2", "R_C2"], ["L_C3", "R_C3"]],

	melody : [0, 1, 2, 1, 2, 1, 0, 3],

	path : './audio/high/',

	initialize : function(attributes, options) {
		this.superInit(attributes, options);
		//the max ring value
		this.set({
			ringMax : 3,
			index : -1
		});
		//the metronome listener
		this.listenTo(RING.metronome, "change:8n", this.tick);
		//make the view
		this.view = new RING.High.View({
			model : this
		})
	},
	//called every 8th note
	tick : function(model, eighth, time) {
		//console.log(eighth);
		//increment the index
		var index = this.get("index");
		if((eighth % 4) === 0) {
			index++;
			index = index % this.melody.length;
		}
		var position = this.melody[index] * 4;
		var ring = this.get("ring") + 1;
		position += (eighth % ring);

		//var position = this.get("position");
		//position += this.get("ring") + 1;
		//position = position % this.notes.length;
		this.set({
			position : position,
			index : index,
		});
		//play the note
		this.play(time);
	},
	restart : function() {
		this.set({
			index : -1,
		}, {
			silent : true,
		})
	}
});

RING.High.View = RING.Module.View.extend({

	title : "HIGH",

	initialize : function() {
		this.superInit();
		this.listenTo(this.model, "change:ring", this.setSubdivision);
		this.listenTo(this.model, "change:index", this.drawRing);
		this.setSubdivision(this.model, this.model.get("ring"));
		//add the indicator with the relevant title
		this.$ringHolder = $("<div class='ringHolder tooltip' title='HIGH arpeggio octave'></div>").appendTo(this.$ring);
		
		this.render(this.model);
	},
	setSubdivision : function(model, ring) {
		this.subdivision = ring + 1;
		this.drawRing();
	},
	drawRing : function() {
		var ring = this.model.get("ring");
		this.$ringNumber.html(ring + 1);
		//change the highlight
		var index = this.model.get("position") % 4;
		index++;
		this.$indexIndicator.html(" ");
		var selector = "#img" + this.subdivision + "_" + index;
		this.$indexIndicator.append($(selector).clone());
	}
})
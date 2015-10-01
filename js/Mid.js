RING.Mid = RING.Module.extend({

	gain : 1,

	notes : [["L_1", "R_1"], ["L_2", "R_2"], ["L_3", "R_3"], ["L_4", "R_4"], ["L_5", "R_5"], ["L_6", "R_6"], ["L_7", "R_7"], ["L_8", "R_8"], ["L_9", "R_9"]],

	path : './audio/mid/',

	melody : [0, 1, 1, 0, 0, 1, 1, 0, 1, 2, 2, 1, 1, 2, 2, 1],

	initialize : function(attributes, options) {
		this.superInit(attributes, options);
		//some initial values
		this.set({
			index : -1,
			ringMax : 6
		});
		//the metronome listener
		this.listenTo(RING.metronome, "change:4n", this.tick);

		//make the view
		this.view = new RING.Mid.View({
			model : this
		})
	},
	//called every Quarter note
	tick : function(model, quarter, time) {
		//increment the index
		var index = this.get("index");
		index++;
		index = index % this.melody.length;
		//get the position based on the index and the ring value
		var ring = this.get("ring");
		this.set({
			"position" : (this.melody[index] + ring),
			"index" : index,
		});
		//play the note
		this.play(time);
	},
	restart : function() {
		this.set({
			"position" : -1,
			"index" : -1,
		});
	}
});

RING.Mid.View = RING.Module.View.extend({

	title : "MID",

	initialize : function() {
		this.superInit();
		this.subdivision = 8;
		this.listenTo(this.model, "change:index", this.drawRing);
		this.$ringHolder = $("<div class='ringHolder tooltip' title='MID chord range'></div>").appendTo(this.$ring);
		this.render(this.model);
	},
	drawRing : function() {
		var ring = this.model.get("ring");
		this.$ringNumber.html(ring + 1);
		var index = this.model.get("position");
		index = index % this.subdivision;
		index++;
		this.$indexIndicator.html(" ");
		var selector = "#img" + this.subdivision + "_" + index;
		this.$indexIndicator.append($(selector).clone());
	}
})
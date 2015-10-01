//initialize the application once the page has loaded
$(function() {
	RING.initialize();
})
/*
 * RING
 *
 */
var RING = function() {

	//GLOBALS//////////////////////////////////////////////////////////////////

	var version = "0.0.2";

	//the audio context
	var context = new webkitAudioContext();

	//the modules
	var bass, mid, high

	//GUI///////////////////////////////////////////////////////////////////////////

	var $progressBar;
	var $sectionRadio;

	function setupGUI() {
		$sectionRadio = $("#sectionRadio").buttonset();
		$sectionRadio.change(function(evnt) {
			//set the section for each of the modules
			var id = evnt.target.id;
			var sectionNumber = 0;
			switch(id) {
				case "startRadio":
					sectionNumber = 0;
					break;
				case "middleRadio":
					sectionNumber = 1;
					break;
				case "endRadio":
					sectionNumber = 2;
					break;
			}
			bass.set("section", sectionNumber);
			mid.set("section", sectionNumber);
			high.set("section", sectionNumber);
		});
	}

	function progressBarSetup() {
		//make the progress bar
		$progressBar = $("#progressbar").progressbar({
			value : 0
		});
		//setup the callbacks
		bass.on("change:progress", updateProgress);
		mid.on("change:progress", updateProgress);
		high.on("change:progress", updateProgress);
	}

	function updateProgress() {
		var progress = bass.get("progress");
		progress += mid.get("progress");
		progress += high.get("progress");
		progress /= 3;
		$progressBar.progressbar({
			value : progress * 100
		});
		//loaded!
		if(progress === 1) {
			$progressBar.fadeTo(0, 800, function() {
				$progressBar.remove();
			});
			RING.container.fadeTo(1, 800);
			RING.metronome.start();
		}
	}

	//INITIALIZATION////////////////////////////////////////////////////////////////

	function init() {
		console.log("RING version " + version);
		//reference the unit container
		RING.container = $("#ringContainer");
		RING.controls = $("#controls");
		RING.master = $("#master");
		RING.metronome = new RING.Metronome();

		RING.masterControls = new RING.MasterControls();
		//the master output
		RING.output = context.createGainNode();
		//update the play position
		RING.metronome.on("change:4n", update);

		//the modules
		bass = new RING.Bass();
		mid = new RING.Mid();
		high = new RING.High();
		//GUI
		setupGUI();
		progressBarSetup();
	}

	//PLAY/////////////////////////////////////////////////////////////////////

	var started = false;
	var playPosition = 0;
	var $songProgress;

	//start the interpolation play mode
	function play() {
		RING.metronome.stop();
		started = true;
		$songProgress = $("#songProgress").progressbar({
			value : 0,
		});

		setTimeout(function() {
			//restart the modules
			bass.restart();
			mid.restart();
			high.restart();
			//restart the song
			unmuteAll();
			RING.metronome.start();
		}, 500);
	}

	//updates the play mode
	function update() {
		if(started) {
			var duration = 128;
			if(playPosition <= duration) {
				var pos = playPosition / (duration / 2);
				bass.interpolate(pos);
				mid.interpolate(pos);
				high.interpolate(pos);
			} else {
				//end here
				RING.metronome.stop();
			}
			$songProgress = $("#songProgress").progressbar({
				value : (playPosition / duration) * 100,
			})
			playPosition++;
		}
	}

	//MODULE CONTROL///////////////////////////////////////////////////////////

	function muteAll() {
		bass.mute();
		mid.mute();
		high.mute();
	}

	function unmuteAll() {
		bass.unmute();
		mid.unmute();
		high.unmute();
	}

	//INTERFACE////////////////////////////////////////////////////////////////

	return {
		initialize : init,
		context : context,
		play : play,
		playing : function() {
			return started;
		},
		muteAll : muteAll,
		unmuteAll : unmuteAll,
	}
}();

RING.MasterControls = Backbone.View.extend({

	className : "masterControls",

	events : {
		"click #playButton" : "playPressed",
		"slide #tempo" : "tempoChange",
	},

	initialize : function() {
		this.$button = $("<input type=\"checkbox\" id=\"playButton\"/><label for=\"playButton\">PLAY</label>").appendTo(this.$el);
		$("<div id='moduleTitle'>TEMPO</div>").appendTo(this.$el);
		this.$tempo = $("<div id='tempo'></div>").appendTo(this.$el);
		this.$el.appendTo(RING.master);
		this.render(this.model);
	},
	render : function(model) {
		this.$button.button();
		this.$tempo.slider({
			min : 105,
			max : 125,
			value : RING.metronome.get("bpm")
		});
	},
	playPressed : function(event) {
		RING.play();
		this.$button.button({
			label : "PLAYING"
		});
	},
	tempoChange : function(event, ui) {
		RING.metronome.set("bpm", ui.value);
	}
});

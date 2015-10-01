//initialize the application once the page has loaded
$(function() {
	RING.initialize();
})
/*
 * RING
 *
 */
var RING = function() {

	//GLOBALS///////////////////////////////////////////////////////////////////

	var version = "0.1.3";

	//the audio context
	var context = new webkitAudioContext();

	//LOADING///////////////////////////////////////////////////////////////////

	function loadingBarSetup() {
		RING.loadingBar = new RING.LoadingBar({
			model : RING.model,
		});
		//setup the callbacks
		RING.bass.on("change:progress", updateProgress);
		RING.mid.on("change:progress", updateProgress);
		RING.high.on("change:progress", updateProgress);
	}

	function updateProgress() {
		var progress = RING.bass.get("progress");
		progress += RING.mid.get("progress");
		progress += RING.high.get("progress");
		progress /= 3;
		RING.model.set("loaded", progress);
	}

	//TEST URL//////////////////////////////////////////////////////////////////

	//#/b_0,1,2_30,50,80/m_12,4,3_40,30,40/h_3,4,3_40,20,40/t_118

	//if the url is encodes the settings, recreate those settings
	function setURL() {
		//this is a way better way to do this!
		//JSON.parse(decodeURIComponent(encodeURIComponent(JSON.stringify(a))))

		var pathSplit = window.location.href.split('#');
		if(pathSplit.length > 1) {
			var moduleSplit = pathSplit[1].split('/');
			if(moduleSplit.length === 5) {
				for(var i = 1; i < 4; i++) {
					var module = moduleSplit[i];
					var moduleAttr = module.split("_");
					if(moduleAttr.length === 3) {
						var moduleRings = moduleAttr[1];
						var moduleTimbres = moduleAttr[2];
						var whichModule;
						switch (module.charAt(0)) {
							case 'b':
								whichModule = RING.bass;
								break;
							case 'm':
								whichModule = RING.mid;
								break;
							case 'h':
								whichModule = RING.high;
								break;
						}
						var rings = moduleRings.split(',');
						whichModule.rings = rings;
						var timbres = moduleTimbres.split(',');
						//the timbres need to be devided by 100
						for(var j = 0; j < timbres.length; j++) {
							rings[j] = parseInt(rings[j]);
							timbres[j] = timbres[j] / 100;
						}
						whichModule.timbres = timbres;
						whichModule.set({
							timbre : timbres[0],
							ring : rings[0]
						})
					}
				}
				//set the tempo
				var tempo = moduleSplit[4];
				if(tempo.charAt(0) === 't') {
					var bpm = tempo.split('_')[1];
					RING.metronome.set("bpm", bpm);
				}
			}
		}
	};

	function makeURL() {
		var urlObj = {
			bt : RING.bass.timbres,
			br : RING.bass.rings,
			mt : RING.mid.timbres,
			mr : RING.mid.rings,
			ht : RING.high.timbres,
			hr : RING.high.rings,
			bpm : RING.metronome.get("bpm"),
		};
		//console.log(encodeURIComponent(JSON.stringify(urlObj)))
		//return encodeURIComponent(JSON.stringify(urlObj))
		var url = "#"
		url += '/b_';
		url = formatURLfromModule(url, RING.bass);
		url += '/m_';
		url = formatURLfromModule(url, RING.mid);
		url += '/h_';
		url = formatURLfromModule(url, RING.high);
		url += '/t_';
		url += RING.metronome.get("bpm");
		return url;
	};

	function formatURLfromModule(url, module) {
		url += module.rings[0];
		url += ",";
		url += module.rings[1];
		url += ",";
		url += module.rings[2];
		url += "_";
		url += RING.Util.toInt(module.timbres[0] * 100);
		url += ",";
		url += RING.Util.toInt(module.timbres[1] * 100);
		url += ",";
		url += RING.Util.toInt(module.timbres[2] * 100);
		return url;
	}

	//INITIALIZATION////////////////////////////////////////////////////////////

	function init() {
		console.log("RING version " + version);
		//reference the unit container
		RING.container = $("#ringContainer");
		RING.moduleContainer = $("#moduleContainer");
		RING.masterContainer = $("#masterControls");
		RING.metronome = new RING.Metronome();
		//the model
		RING.model = new RING.Model();
		//the master output
		RING.output = context.createGainNode();
		//update the play position
		RING.metronome.on("change:8n", update);
		//the modules
		RING.high = new RING.High();
		RING.mid = new RING.Mid();
		RING.bass = new RING.Bass();
		//the song progress
		RING.songProgress = new RING.ProgressBar({
			model : RING.model
		});
		//the share button
		RING.shareSong = new RING.ShareSong({
			model : RING.model
		});
		//the loading bar
		loadingBarSetup();
		//recreate the song from the url
		setURL();
		//the visualizer
		RING.visualizer = new RING.Visualizer();
	}

	//PLAY/////////////////////////////////////////////////////////////////////

	//start the interpolation play mode
	function play() {
		RING.metronome.stop();
		setTimeout(function() {
			RING.metronome.start();
			//restart the modules
			RING.bass.restart();
			RING.mid.restart();
			RING.high.restart();
			//restart the song
			unmuteAll();

			RING.model.set({
				started : 1,
			});
		}, 1000);
	}

	function stop() {
		RING.metronome.stop();
		RING.model.set("started", 0);
	}

	//updates the play mode
	function update(model, eighth) {
		if(RING.model.get("started") === 1) {
			var eighthNotes = RING.metronome.get("bar") * 8 + RING.metronome.get("beat") * 2 + eighth % 2;
			var playPosition = RING.Util.scale(eighthNotes, 0, RING.model.get("duration") * 8 - 1, 0, 2);
			if(playPosition <= 2) {
				RING.model.set({
					"progress" : playPosition,
					"section" : Math.round(playPosition)
				});
			} else {
				//end here
				RING.model.set("started", 0);
				RING.metronome.stop();
			}
		}
	}

	//MODULE CONTROL///////////////////////////////////////////////////////////

	function muteAll() {
		RING.bass.mute();
		RING.mid.mute();
		RING.high.mute();
	}

	function unmuteAll() {
		RING.bass.unmute();
		RING.mid.unmute();
		RING.high.unmute();
	}

	//INTERFACE////////////////////////////////////////////////////////////////

	return {
		initialize : init,
		context : context,
		play : play,
		stop : stop,
		muteAll : muteAll,
		unmuteAll : unmuteAll,
		makeURL : makeURL,
	};
}();

RING.Model = Backbone.Model.extend({

	defaults : {
		"progress" : 0,
		"started" : 0,
		"section" : 0,
		"duration" : 32,
		"loaded" : 0,
		"hint" : true,
	},

	initialize : function(attrbutes, options) {
		this.masterControls = new RING.MasterControls({
			model : this,
		});
		this.sectionControls = new RING.SectionControls({
			model : this,
		});
		this.on("change:hint", this.setHint);
	},
	setHint : function(mode, hint) {
		if(hint) {
			$('.tooltip').tooltip("enable");
		} else {
			$('.tooltip').tooltip("disable");
		}
	},
});

RING.SectionControls = Backbone.View.extend({
	className : "sectionControls",

	events : {
		"mouseover #start" : "startClicked",
		"mouseover #middle" : "middleClicked",
		"mouseover #end" : "endClicked",
	},

	initialize : function() {
		//listen for section changes
		this.listenTo(this.model, "change:section", this.render);
		//make the tabs
		this.$start = $("<div id='start' class='tab checked tooltip' title='START section'><div class='text'>START</div></div>").appendTo(this.$el);
		this.$middle = $("<div id='middle' class='tab unchecked tooltip' title='MIDDLE section'><div class='text'>MIDDLE</div></div>").appendTo(this.$el);
		this.$end = $("<div id='end' class='tab unchecked tooltip' title='END section'><div class='text'>END</div></div>").appendTo(this.$el);

		this.$el.appendTo($("#sectionTab"));
		//render for the first time
		this.render(this.model);
	},
	render : function(model) {
		var section = model.get("section");
		$(".tab").removeClass("unchecked checked");
		switch (section) {
			case 0:
				this.$start.addClass("checked");
				this.$middle.addClass("unchecked");
				this.$end.addClass("unchecked");
				break;
			case 1:
				this.$start.addClass("unchecked");
				this.$middle.addClass("checked");
				this.$end.addClass("unchecked");
				break;
			case 2:
				this.$start.addClass("unchecked");
				this.$middle.addClass("unchecked");
				this.$end.addClass("checked");
				break;
		}
		$('.tooltip').tooltip();
	},
	startClicked : function(event) {
		this.model.set("section", 0);
	},
	middleClicked : function(event) {
		this.model.set("section", 1);
	},
	endClicked : function(event) {
		this.model.set("section", 2);
	},
});

/*
 * THE LOADING IN THE BEGINING
 */
RING.LoadingBar = Backbone.View.extend({

	className : "loadingBar",

	initialize : function() {
		//listen for section changes
		this.listenTo(this.model, "change:loaded", this.loaded);
		//make the divs
		this.$loaded = $("<div class='loadedArea'></div>").appendTo(this.$el);
		this.$el.appendTo($("#loadingbar"));
		//render for the first time
		this.loaded(this.model, this.model.get("loaded"));
	},
	loaded : function(model, loaded) {
		loaded *= 100;
		var loadedString = loaded + "%";
		this.$loaded.css("width", loadedString);
		if(loaded === 100) {
			$("#loadingbar").fadeTo(500, 0, function() {
				RING.container.fadeTo(500, 1, function() {
					//start the sounds once loaded
					RING.metronome.start();
				});
			});
		}
	},
});

/*
 * THE LOADING IN THE BEGINING
 */
RING.ProgressBar = Backbone.View.extend({

	className : "progressBar",

	initialize : function(attributes, options) {
		//listen for section changes
		this.listenTo(this.model, "change:progress", this.progress);
		this.listenTo(this.model, "change:started", this.start);
		//make the divs
		this.$songProgress = $("#songProgress");
		this.$progress = $("<div class='progressArea'></div>").appendTo(this.$el);
		this.$el.appendTo(this.$songProgress);
		//render for the first time
		this.progress(this.model, this.model.get("progress"));
	},
	progress : function(model, progress) {
		progress *= 50;
		var progressString = progress + "%";
		this.$progress.css("width", progressString);
	},
	start : function(model, start) {
		var z = 1;
		if(start === 0) {
			this.$songProgress.fadeTo(500, 0);
			z = -1000;
		} else {
			this.$songProgress.fadeTo(500, 1);
			z = 1000;
		}
		$("#touchBlocker").css({
			"z-index" : z,
		});
	}
});

/*
 * THE PLAY AND TEMPO CONTROLS
 */

RING.MasterControls = Backbone.View.extend({

	className : "masterControls",

	events : {
		"click .playbutton" : "playPressed",
		"drag .sliderHandle" : "tempoChange",
	},

	initialize : function() {
		this.listenTo(RING.metronome, "change:bpm", this.setTempo);
		this.listenTo(this.model, "change:started", this.start);
		this.$playButton = $("<div class='playbutton tooltip' title='play/stop button'></div>").appendTo(this.$el);
		$("<div class='title'>TEMPO</div>").appendTo(this.$el);
		this.$tempo = $("<div class='tempo sliderLine'><div class='tempoContainer'></div></div>").appendTo(this.$el);
		this.$tempoNumber = $("<div class='tempoNumber'>0</div>").appendTo(this.$tempo);
		this.$tempoSlider = $("<div class='sliderHandle tooltip' title='master tempo'></div>").appendTo(this.$tempo);
		this.$el.appendTo(RING.masterContainer);

		this.setTempo(this.model, RING.metronome.get("bpm"));
	},
	setTempo : function(model, tempo) {
		this.$tempoSlider.draggable({
			containment : ".tempoContainer",
			axis : "x",
		}).css({
			left : RING.Util.scale(tempo, 105, 125, 10, 104),
		});
		this.$tempoSlider.tooltip();
		this.$playButton.tooltip();
		this.$tempoNumber.html(tempo);
	},
	playPressed : function(event) {
		var started = this.model.get("started");
		if(started === 0) {
			RING.play();
			this.$playButton.addClass("playing");
		} else {
			RING.stop();
			this.$playButton.removeClass("playing");
		}

	},
	start : function(model, started) {
		if(started === 0) {
			this.$playButton.removeClass("playing");
		} else {
			this.$playButton.addClass("playing");
		}
	},
	tempoChange : function(event, ui) {
		var tempo = RING.Util.scaleInt(ui.position.left, 10, 104, 105, 125);
		RING.metronome.set("bpm", tempo);
	}
});

RING.ShareSong = Backbone.View.extend({

	className : "shareSong",

	events : {
		"click input" : "dontShare",
		"click" : "shareURL",
	},

	initialize : function() {
		this.$shareContainer = $("#shareURL");
		this.$urlArea = $("<div class='urlArea'></div>").appendTo(this.$el);
		this.$urlInput = $("<input type='text'>").appendTo(this.$urlArea);
		this.$el.appendTo(this.$shareContainer);
		//if anything changes, update the URL
		this.listenTo(RING.metronome, "change:bpm", this.updateURL);
		this.listenTo(RING.bass, "change:timbre", this.updateURL);
		this.listenTo(RING.bass, "change:ring", this.updateURL);
		this.listenTo(RING.mid, "change:timbre", this.updateURL);
		this.listenTo(RING.mid, "change:ring", this.updateURL);
		this.listenTo(RING.high, "change:timbre", this.updateURL);
		this.listenTo(RING.high, "change:ring", this.updateURL);
	},
	render : function(model) {

	},
	shareURL : function(event) {
		var self = this;
		if(!this.$el.hasClass("showURLImage")) {
			//create the URL
			this.$urlInput.css("z-index", 10);
			this.$el.stop().transit({
				width : 230,
			}, 200, function() {
				self.$el.addClass("showURLImage");

			})
			this.$urlInput.val(window.location.origin + "/loop/" + RING.makeURL());
			this.$urlInput[0].select();
		} else {//remove the URL
			this.$el.stop().transit({
				width : 128,
			}, 200, function() {
				self.$el.removeClass("showURLImage");
				self.$urlInput.css("z-index", -1);
			});
		}
	},
	dontShare : function(event) {
		event.preventDefault();
	},
	updateURL : function() {
		if(this.$el.hasClass("showURLImage")) {
			this.$urlInput.val(window.location.origin + "/loop/" + RING.makeURL());
			this.$urlInput[0].select();
		}
	}
});

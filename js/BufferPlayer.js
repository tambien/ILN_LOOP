var BufferPlayer = function(context, url, callback) {
	this.context = context;

	this.callback = callback;

	var loader = this;

	this.xhr = new XMLHttpRequest();
	this.xhr.open("GET", url, true);
	this.xhr.responseType = "arraybuffer";

	this.xhr.onload = this.onLoad.bind(this);
	this.xhr.send();
	
	this.output = this.context.createGainNode();

	this.ready = false;
};

BufferPlayer.prototype.onLoad = function(buffer) {
	this.context.decodeAudioData(this.xhr.response, function(buffer) {
		this.buffer = buffer;

		this.source = this.context.createBufferSource();
		this.source.buffer = this.buffer;
		
		this.ready = true;
		if(this.callback) {
			this.callback();
		}

	}.bind(this));
};

BufferPlayer.prototype.play = function(time) {
	if(!time) {
		time = 0;
	}
	this.source.loop = false;
	this.source = this.context.createBufferSource();
	this.source.buffer = this.buffer;
	this.source.connect(this.output);
	this.source.noteOn(this.context.currentTime + time);
}

BufferPlayer.prototype.stop = function() {
	this.source.noteOff(0);
}

BufferPlayer.prototype.loop = function(position, duration) {
	//this.source.noteGrainOn(this.context.currentTime, 0, duration);
	this.source = this.context.createBufferSource();
	this.source.buffer = this.buffer;
	this.source.connect(this.output);
	this.source.noteGrainOn(this.context.currentTime, position, duration);
	this.source.loop = true;
}


BufferPlayer.prototype.speed = function(num){
	this.source.playbackRate.value = num; 
}

BufferPlayer.prototype.connect = function(audionode){
	this.output.connect(audionode);	
}

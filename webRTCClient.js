var app = (function(app, io, window) {
	app.webRTC = function(socketURL) {
		this.socket = io.connect(socketURL, {
			reconnect: false
		});
		var config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
		this.peerConnection = new webkitRTCPeerConnection(config);
	};
	app.webRTC.prototype.connect = function(roomId, success, error) {	
		this.bindEvents();
		if(roomId) {
			this.socket.emit('join-room', { 'roomId': roomId });
		}
		else {
			error && error('You need a room to connect to');
		}
	};
	app.webRTC.prototype.addStream = function(s) {
		this.peerConnection.addStream(s);
	};
	app.webRTC.prototype.bindEvents = function() {
		var that = this;
		that.peerConnection.onaddstream = function(event) {	
			console.log('add stream');
			console.log(event.stream);
			$('video#remote').attr('src', URL.createObjectURL(event.stream));
		};
		this.socket.on('send-offer', function() {
			that.sendOffer();
		});
		this.socket.on('send-ice', function() {
			that.peerConnection.onicecandidate = function(event) {
				that.socket.emit('ice', event.candidate);
			};
		});
		this.socket.on('offer', function(data) {
			console.log('received offer');
			console.log(data);
			that.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
			that.sendAnswer();
		});
		this.socket.on('answer', function(data) {
			console.log('received answer');
			that.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
		});
		this.socket.on('ice', function(data) {
			console.log('received ice');
			if(!data) { return; }
			console.log(data);
			that.peerConnection.addIceCandidate(new RTCIceCandidate({
				candidate: data.candidate,
				sdpMLineIndex: data.sdpMLineIndex
			}));
		});
	};
	app.webRTC.prototype.sendOffer = function() {
		console.log('send offer');
		var that = this;
		this.peerConnection.createOffer(function(desc) {
			that.peerConnection.setLocalDescription(desc);
			that.socket.emit('offer', desc);
		}, null, { 'mandatory': { 'OfferToReceiveAudio': false, 'OfferToReceiveVideo': true } });
	};
	app.webRTC.prototype.sendAnswer = function() {
		console.log('send answer');
		var that = this;
		this.peerConnection.createAnswer(function(desc) {
			that.peerConnection.setLocalDescription(desc);
			that.socket.emit('answer', desc);
		}, null, { 'mandatory': { 'OfferToReceiveAudio': false, 'OfferToReceiveVideo': true } });
	};
	return app;
})(app || {}, io, this);
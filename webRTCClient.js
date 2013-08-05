var app = (function(app, io, window) {
	app.webRTC = function(socketURL) {
		this.socket = io.connect(socketURL, {
			reconnect: false
		});
		this.activeStream = null;
	};
	app.webRTC.prototype.createPeerConnection = function() {
		var that = this;
		var config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
		this.peerConnection = new RTCPeerConnection(config);
		this.peerConnection.onaddstream = function(event) {	
			console.log('add stream');
			attachMediaStream($('video#remote')[0], event.stream);
		};
		this.peerConnection.onicecandidate = function(event) {
			console.log('received local ice');
			that.socket.emit('ice', event.candidate);
		};
	};
	app.webRTC.prototype.addExistingStream = function() {
		if(this.activeStream) {
			this.peerConnection.addStream(this.activeStream);
			attachMediaStream($('video#local')[0], this.activeStream);
			return true;
		}
		return false;
	};
	// partnerId is only for this testapp
	// in a real application the partnerid is kept by the server
	// and this can be seen as a "ready" message
	app.webRTC.prototype.connect = function(myId, partnerId, success, error) {
		this.createPeerConnection();
		this.bindSocketEvents();
		if(partnerId) {
			this.socket.emit('connect', {'myId': myId, 'partnerId': partnerId});
		}
		else {
			error && error('You need a partner to connect to');
		}
	};
	app.webRTC.prototype.addStream = function(s) {
		var that = this;
		if(s.constructor == Object) {
			getUserMedia(s, function (stream) {
				that.activeStream = stream;
				that.addExistingStream();
				that.sendOffer();
			});
		} 
		else {
			this.activeStream = s;
			this.addExistingStream();
			this.sendOffer();
		}
	};
	app.webRTC.prototype.bindSocketEvents = function() {
		var that = this;
		this.socket.on('send-offer', function() {
			/* this could be a completely different peer (different NAT or whatever)
			   so we should create a new peer connection to make sure we have fresh ice */
			that.createPeerConnection();
			that.addExistingStream();
			that.sendOffer();
		});
		this.socket.on('offer', function(data) {
			console.log('received offer');
			that.addExistingStream();
			that.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
			that.sendAnswer();
		});
		this.socket.on('answer', function(data) {
			console.log('received answer');
			that.addExistingStream();
			that.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
		});
		this.socket.on('ice', function(data) {
			console.log('received ice');
			if(!data) { return; }
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
		// not nececerry?
		//}, function(err) { console.log('sendoffererror'); }, { 'mandatory': { 'OfferToReceiveAudio': false, 'OfferToReceiveVideo': true } });
		});
	};
	app.webRTC.prototype.sendAnswer = function() {
		console.log('send answer');
		var that = this;
		this.peerConnection.createAnswer(function(desc) {
			that.peerConnection.setLocalDescription(desc);
			that.socket.emit('answer', desc);
		// not nececerry?
		//}, function(err) { console.log('sendanswererrro'); }, { 'mandatory': { 'OfferToReceiveAudio': false, 'OfferToReceiveVideo': true } });
		});
	};
	return app;
})(app || {}, io, this);
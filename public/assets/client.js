var WebRTCConnection = function (signalingChannel) {
    this.eventListeners = [];
    this.signalingChannel = signalingChannel;
    this.signalingChannel.emit('connected');
    this.currentStream = null;
    this.currentConstraint = {video: false, audio: false};
    this.peerConstraint = {video: false, audio: false};
};

WebRTCConnection.prototype.createNewConnection = function () {
    var that = this;
    if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
    }
    this.peerConnection = new RTCPeerConnection(
        {
            "iceServers":
            [
                {"url": "stun:23.21.150.121"},
                {"url": "stun:stun.l.google.com:19302"}
            ]
        },
        //{"optional": [{"DtlsSrtpKeyAgreement": true}]}
        {"optional": []}
    );
    if (this.currentStream) {
        this.peerConnection.addStream(this.currentStream);
    }
    this.peerConnection.onaddstream = function (ev) {
        that.handleRemoteStreamAdded(ev.stream);
    };
    this.peerConnection.onremovestream = function (ev) {
        that.handleRemoteStreamRemoved();
    };
    this.peerConnection.oniceconnectionstatechange = function (p, p2) {
        that.handleICEConnectionStateChange();
    };
    this.peerConnection.onicecandidate = function (ev) {
        if (ev.candidate) {
            that.signalingChannel.emit(
                'ice',
                {
                    label: ev.candidate.sdpMLineIndex,
                    id: ev.candidate.sdpMid,
                    candidate: ev.candidate.candidate
                }
            );
        }
    };
};

WebRTCConnection.prototype.handleICEConnectionStateChange = function () {
    if (this.peerConnection.iceConnectionState === 'disconnected') {
        this.handleDisconnect();
    }
};

WebRTCConnection.prototype.handleDisconnect = function () {
    this.handleRemoteStreamRemoved();
    if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
    }
};

WebRTCConnection.prototype.handleRemoteStreamRemoved = function () {
    this.fire('remote-stream', {'status': 'removed'});
    this.peerConstraint = {video: false, audio: false};
    this.handleRemoteToggle(this.peerConstraint);
};

WebRTCConnection.prototype.handleRemoteStreamAdded = function (stream) {
    console.log('handleRemoteStreamAdded');
    this.fire('remote-stream', {'status': 'added', 'stream': stream});  
};

WebRTCConnection.prototype.handleLocalStreamRemoved = function () {
    this.fire('local-stream', {'status': 'removed'});
};

WebRTCConnection.prototype.handleLocalStreamAdded = function (stream) {
    this.fire('local-stream', {'status': 'added', 'stream': this.currentStream});
};

WebRTCConnection.prototype.handleLocalToggle = function (constraint) {
    this.fire('local-stream', {'status': 'toggled', 'constraint': constraint});
    this.signalingChannel.emit('toggled', constraint);
};

WebRTCConnection.prototype.handleRemoteToggle = function (constraint) {
    this.fire('remote-stream', {'status': 'toggled', 'constraint': constraint});
};

WebRTCConnection.prototype.call = function (constraint) {
    if (typeof constraint === undefined) { throw "Missing argument exception: Provide a constraint when making a call"; }
    if ((constraint.video !== true && constraint.video !== false) || (constraint.audio !== true && constraint.audio !== false)) {
        throw "Invalid constraint exception: Constraint needs to contain both a audio and video setting set to true or false"
    }
    if (this.currentConstraint.video === constraint.video && this.currentConstraint.audio === constraint.audio) { return; }
    this.hangup();
    var onReceiveStream = function (s) {
        this.currentStream = s;
        this.currentConstraint = constraint;
        this.handleLocalStreamAdded(this.currentStream);
        this.handleLocalToggle(constraint);
        this.renegotiate(undefined, error);
    }.bind(this);
    var error = function (e) {
        console.log('WEBRTC ERROR', e);
    }.bind(this);
    if (constraint.audio === true || constraint.video === true) { getUserMedia(constraint, onReceiveStream, error); }
};

WebRTCConnection.prototype.renegotiate = function (cb, err) {
    var onCreateOffer = function (offer) {
        createdOffer = offer;
        this.peerConnection.setLocalDescription(new RTCSessionDescription(createdOffer), onSetLocalDescription, error);
    }.bind(this);
    var onSetLocalDescription = function () {
        this.signalingChannel.emit('offer', createdOffer);
        cb && cb();
    }.bind(this);
    var error = function (e) {
        console.log('WEBRTC ERROR', e);
        err && err();
    }.bind(this);
    this.createNewConnection();
    var opts = {mandatory: {'OfferToReceiveAudio': this.peerConstraint.audio, 'OfferToReceiveVideo': this.peerConstraint.video}};
    console.log('createoffer with', opts.mandatory);
    this.peerConnection.createOffer(onCreateOffer, error, opts);
};

WebRTCConnection.prototype.receive = function (type, data) {
    switch (type) {
        case 'connected':
            this.peerConstraint = {video: false, audio: false};
            this.renegotiate();
            this.signalingChannel.emit('toggled', this.currentConstraint);
            break;
        case 'offer':
            console.log('OFFERSDP', data);
            this.handleOffer(data);
            break;
        case 'answer':
            this.handleAnswer(data);
            break;
        case 'ice':
            this.handleICE(data);
            break;
        case 'toggled':
            this.peerConstraint = data;
            this.handleRemoteToggle(data);
            break;
        case 'disconnect':
            this.handleDisconnect();
            break;
    }
};

WebRTCConnection.prototype.handleOffer = function (data) {
    var createdAnswer;
    var onSetRemoteDescription = function () {
        var opts = {mandatory: {'OfferToReceiveAudio': this.peerConstraint.audio, 'OfferToReceiveVideo': this.peerConstraint.video}};
        console.log('createanswer with', opts.mandatory);
        this.peerConnection.createAnswer(onCreateAnswer, error, opts);
    }.bind(this);
    var onCreateAnswer = function (answer) {
        createdAnswer = answer;
        this.peerConnection.setLocalDescription(new RTCSessionDescription(createdAnswer), onSetLocalDescription, error);
    }.bind(this);
    var onSetLocalDescription = function () {
        console.log('ANSWERSDP', createdAnswer);
        this.signalingChannel.emit('answer', createdAnswer);
    }.bind(this);
    var error = function (e) {
        console.log(e);
    }.bind(this);
    this.createNewConnection();
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(data), onSetRemoteDescription, error);
};

WebRTCConnection.prototype.handleAnswer = function (data) {
    var onSetRemoteDescription = function () {

    }.bind(this);
    var error = function (e) {
        console.log('WEBRTC ERROR', e);
    }.bind(this);
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(data), onSetRemoteDescription, error);
};

WebRTCConnection.prototype.handleICE = function (data) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: data.label,
        candidate: data.candidate
    });
    this.peerConnection.addIceCandidate(candidate);
};

WebRTCConnection.prototype.hangup = function () {
    if (this.currentStream) {
        this.currentStream.stop();
    }   
    this.currentStream = null;
    this.currentConstraint = {video: false, audio: false};
    this.handleLocalStreamRemoved();
    this.handleLocalToggle({video: false, audio: false});
};

WebRTCConnection.prototype.on = function (type, listener) {
    if (typeof this.eventListeners[type] === 'undefined') {
        this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
};

WebRTCConnection.prototype.fire = function (eventName, data) {
    var i, len, listeners, event = {};
    if (data !== undefined) { event.data = data; }
    event.type = eventName;
    if (!event.target) {
        event.target = this;
    }
    if (this.eventListeners[event.type] instanceof Array) {
        listeners = this.eventListeners[event.type];
        for (i = 0, len = listeners.length; i < len; i += 1) {
            listeners[i].call(this, event);
        }
    }
};
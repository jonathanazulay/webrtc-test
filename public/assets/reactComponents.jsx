/** @jsx React.DOM */
window.App = (function (scope) {
    scope.AppComponent = React.createClass({
        componentDidMount: function () {
            var connection = new WebRTCConnection({
                emit: function (type, data) {
                    console.log('Send:', type);
                    var realData = data;
                    data = {
                        type: type,
                        data: realData
                    };
                    this.props.socket.emit('webrtc', data);
                }.bind(this)
            });
            var that = this;
            this.props.socket.on('webrtc', function (data) {
                console.log('Receive', data.type);
                connection.receive(data.type, data.data);
            });
            connection.on('local-stream', function (ev) {
                var videoElement = $(that.getDOMNode()).find('#local');
                if (ev.data.status === 'added') {
                    attachMediaStream(videoElement[0], ev.data.stream);
                    videoElement.removeClass('hidden');
                } else if (ev.data.status === 'removed') {
                    videoElement.addClass('hidden');
                }
            });
            connection.on('remote-stream', function (ev) {
                var videoElement = $(that.getDOMNode()).find('#remote');
                if (ev.data.status === 'added') {
                    attachMediaStream(videoElement[0], ev.data.stream);
                    videoElement.removeClass('hidden');
                } else if (ev.data.status === 'removed') {
                    videoElement.addClass('hidden');
                }
            });
            this.setProps({
                webrtc: connection
            });
        },
        getInitialState: function () {
            return {
                videoEnabled: true,
                audioEnabled: true,
                activeCall: false
            };
        },
        tryCall: function () {
            console.log(this.props.webrtc);
            if (this.state.activeCall) {
                var request = {audio: this.state.audioEnabled, video: this.state.videoEnabled};
                this.props.webrtc.call(request);
            } else {
                //this.props.webrtc.hangup();
            }
        },
        renegotiate: function () {
            this.props.webrtc.renegotiate();
        },
        toggleVideo: function () {
            var that = this;
            this.setState({
                videoEnabled: !that.state.videoEnabled
            }, function () {
                that.tryCall();
            });
        },
        toggleAudio: function () {
            var that = this;
            this.setState({
                audioEnabled: !that.state.audioEnabled
            }, function () {
                that.tryCall();
            });
        },
        toggleCall: function () {
            var that = this;
            this.setState({
                activeCall: !that.state.activeCall
            }, function () {
                that.tryCall();
            });
        },
        render: function () {
            var videoButtonText = this.state.videoEnabled ? 'Video: ON' : 'Video: OFF',
                audioButtonText = this.state.audioEnabled ? 'Audio: ON' : 'Audio: OFF',
                activeCallButtonText = this.state.activeCall ? 'Hangup' : 'Call with ',
                callDisabled = (!this.state.videoEnabled && !this.state.audioEnabled) ? true : false;
            if (callDisabled) { activeCallButtonText = 'Call'; }
            if (!this.state.activeCall) {
                if (this.state.videoEnabled && this.state.audioEnabled) {
                    activeCallButtonText += 'audio & video';
                } else {
                    if (this.state.videoEnabled) { activeCallButtonText += 'video'; }
                    else if (this.state.audioEnabled) { activeCallButtonText += 'audio'; }
                }
            }
            return (
                <div>
                    <header>
                        <button onClick={this.toggleVideo}>{videoButtonText}</button>
                        <button onClick={this.toggleAudio}>{audioButtonText}</button>
                        <button disabled={callDisabled} onClick={this.toggleCall}>{activeCallButtonText}</button>
                        <button onClick={this.renegotiate}>Renegotiate</button>
                    </header>
                    <div style={{'position': 'absolute', 'top': '100px', 'bottom': '0', 'left': '0', 'right': '50%'}}>
                        <video id="local" style={{'width': '100%', 'height': '100%'}} autoPlay muted></video>
                    </div>
                    <div style={{'position': 'absolute', top: '100px', bottom: '0', right: '0', left: '50%'}}>
                        <video id="remote" style={{width: '100%', height: '100%'}} autoPlay></video>
                    </div>
                    <a href="/disconnect"><button style={{position: 'absolute', left: '50%', height: '70px', top: '50%', 'margin-top': '-35px', 'margin-left': '-100px', width: '200px'}}>Disconnect</button></a>
                </div>
            );
        }
    });
    return scope;
})(window.App || {});
var io = require('socket.io');
var _ = require('underscore');

var socketsById = {};
var partnersBySocket = {};
function disconnectSocket(socket) {
	delete partnersBySocket[socket.id];
	for(aSocket in socketsById) {
		if(socketsById[aSocket] === socket) {
			delete socketsById[aSocket];
			console.log('rensade upp en..');
		}
	}
}
function getPartnerForSocket(socket) {
	var partnerId = partnersBySocket[socket.id];
	var partnerSocket = socketsById[partnerId];
	if(partnerSocket) {
		console.log(socket.id + ' frågar efter ' + partnerSocket.id);
	}
	return partnerSocket;
}

var Server = function() {
	this.io = null;
};
Server.prototype.listen = function(port) {
	this.io = io.listen(port, {log:false});
	this.bindEvents();
};
Server.prototype.bindEvents = function() {
	var that = this;
	this.io.sockets.on('connection', function (socket) {
		socket.on('connect', function(data) {
			console.log('\n=> connection from ' + socket.id);
			console.log(data);
			socketsById[data.myId] = socket;
			console.log(_.size(partnersBySocket) + ':' + _.size(socketsById));
			partnersBySocket[socket.id] = data.partnerId;
			var partnerSocket = getPartnerForSocket(socket);
			console.log(_.size(partnersBySocket) + ':' + _.size(socketsById));
			if(partnerSocket) {
				console.log("Yeehaa ur partner is online! I'll ask him for an webrtc offer");
				that.requestOfferFromSocket(partnerSocket);
			}
			else {
				console.log("Your partner is not online :( I'll ask him for an webrtc offer whenever comes online");
			}
		});
		socket.on('offer', function(data) {
			console.log('\n=> offer');
			var partnerSocket = getPartnerForSocket(socket);
			partnerSocket && partnerSocket.emit('offer', data);
		});
		socket.on('answer', function(data) {
			console.log('\n=> answer');
			var partnerSocket = getPartnerForSocket(socket);
			partnerSocket && partnerSocket.emit('answer', data);
		});
		socket.on('ice', function(data) {
			console.log('\n=> ice');
			var partnerSocket = getPartnerForSocket(socket);
			partnerSocket && partnerSocket.emit('ice', data);
		});
		socket.on('disconnect', function() {
			disconnectSocket(socket);
		});
	});
};
Server.prototype.requestOfferFromSocket = function(socket) {
	socket && socket.emit('send-offer');
};
module.exports = Server;
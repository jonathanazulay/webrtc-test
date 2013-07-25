var io = require('socket.io');
var Room = function(id) {
	this.id = id;
	this.memberSockets = [];
};
Room.prototype.addMember = function(socket) {
	this.memberSockets.push(socket);
	var that = this;
	socket.on('offer', function(data) {
		that.broadcast('offer', data, socket);
	});
	socket.on('answer', function(data) {
		that.broadcast('answer', data, socket);
	});
	socket.on('ice', function(data) {
		that.broadcast('ice', data, socket);
	});
};
Room.prototype.removeMember = function(socket) {
	var indexOfSocket = this.memberSockets.indexOf(socket);
	if(indexOfSocket !== -1) {
		this.memberSockets.splice(indexOfSocket, 1);
	}
};
Room.prototype.requestOfferFromOne = function() {
	this.memberSockets[0].emit('send-offer');
};
Room.prototype.requestICEFromAll = function() {
	this.broadcast('send-ice', {});
};
Room.prototype.broadcast = function(message, data, exceptSocket) {
	for (var i = this.memberSockets.length - 1; i >= 0; i--) {
		var sendTo = this.memberSockets[i];
		if(sendTo !== exceptSocket) {
			sendTo.emit(message, data);
		}
	};
};
var Server = function() {
	this.io = null;
	this.roomForId = {};
	this.roomForSocket = {};
};
Server.prototype.listen = function(port) {
	this.io = io.listen(port, {log:false});
	this.bindEvents();
};
Server.prototype.bindEvents = function() {
	var that = this;
	this.io.sockets.on('connection', function (socket) {
		socket.on('join-room', function(data) {
			var room = that.roomForId[data.roomId];
			if(!room) {
				room = new Room(data.roomId);
				room.addMember(socket);
			}
			else {
				room.addMember(socket);
				if(room.memberSockets.length > 1) {
					room.requestOfferFromOne();
					that.requestICEFromAll();
				}
			}
			that.roomForId[data.roomId] = room;
			that.roomForSocket[socket] = room;
		});
		socket.on('disconnect', function() {
			var room = that.getRoomForSocket(socket);
			if(room) {
				room.removeMember(socket);
				if(room.memberSockets.length === 0) {
					that.removeRoom(room.id);
				}
			}
			delete that.roomForSocket[socket];
		});
	});
};
Server.prototype.removeRoom = function(roomId) {
	delete this.roomForId[roomId];
};
Server.prototype.getRoomForSocket = function(socket) {
	return this.roomForSocket[socket];
};
module.exports = Server;
var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    parseCookie = require('cookie').parse,
    io,
    rooms = {},
    users = {};
function randomString (len) {
    var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for(var i=0; i < len; i++) {
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return text;
}
function joinRoom (user, room) {
    var roomMembers = rooms[room];
    if (roomMembers.indexOf(user.id) !== -1) {
        // Already in the room
        return true;
    } else {
        if (roomMembers.length < 2) {
            user.room = room;
            roomMembers.push(user.id);
            return true;
        } else {
            return false;
        }
    }
}
function emitToPartner (user, msg, data) {
    var room = rooms[user.room];
    var partnerId = room[(room.indexOf(user.id) + 1) % 2];
    if (room.length === 2) {
        users[partnerId].socket.emit(msg, data);
    } else {
        return false;
    }
}
app.use(express.cookieParser('kjl9J9KLkkk,,-----'));
app.use(express.session({secret: 'secret', key: 'express.sid'}));
app.use(function (req, res, next) {
    console.log('Assigning user to session', req.sessionID);
    var user = users[req.sessionID];
    if (!user) { user = {'id': req.sessionID}; users[req.sessionID] = user; }
    req.user = user;
    next();
});
app.use('/', express.static(__dirname + '/public/'));
/*
    Routes
*/ 
app.get(['/', '/index.html'], function (req, res) {
    if (req.user.room) {
        res.redirect('/' + req.user.room);
    } else {
        res.sendfile('public/theIndex.html');
    }
});
app.get('/getroom', function (req, res) {
    req.user.room = randomString(1);
    rooms[req.user.room] = [];
    res.redirect('/');
});
app.get('/disconnect', function (req, res) {
    var whichRoom = rooms[req.user.room];
    var index = whichRoom.indexOf(req.user.id);
    if (index !== -1) { whichRoom.splice(index, 1); }
    req.user.room = undefined;
    res.redirect('/');
});
app.get('/:room', function (req, res) {
    var room = rooms[req.params.room];
    var hasRoom = req.user.room !== undefined;
    if (!room) {
        // Requested room does not exist
        if (req.params.room === req.user.room) {
            // If there's an invalid room in the users data, clear it
            req.user.room = undefined;
        }
        res.redirect('/');
        return;
    } else {
        if (hasRoom && req.params.room !== req.user.room) { res.redirect('/'); return; }
        if (joinRoom(req.user, req.params.room)) {
            res.sendfile('public/theRoom.html');
        } else {
            res.redirect('/');
        }
        return;
    }
});
/* 
    Socket
*/
io = require('socket.io').listen(server, {log: false});
io.set('authorization', function (data, accept) {
    var sessionId;
    if (data.headers.cookie) {
        data.cookie = parseCookie(data.headers.cookie);
        sessionId = data.cookie['express.sid'].substr(2, 24)
        data.user = users[sessionId];
    } else {
        return accept('No cookie', false);
    }
    accept(null, true);
});
io.sockets.on('connection', function (socket) {
    socket.handshake.user.socket = socket;
    socket.on('hello', function (data) {
        emitToPartner(socket.handshake.user, 'hello', data);
    });
    socket.on('webrtc', function (data) {
        emitToPartner(socket.handshake.user, 'webrtc', data); 
    });
});
/*
    Start server
*/
server.listen(process.env.PORT || 1234);
console.log('Starting webserver on', process.env.PORT || 1234);
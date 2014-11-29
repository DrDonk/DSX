/**
 * Created by Dave on 09/09/2014.
 */
net = require('net');
tls = require('tls');

// callback for when secure connection established
function connected(stream) {
    console.log('Stream connected');
    if (stream) {
        // socket connected
        //stream.write("USER Dave\r\n");
    } else {
        console.log("Connection failed");
    }
}

// needed to keep socket variable in scope
var dummy = this;
var ssl = this;

var options = {
    socket: dummy
};


// try to connect to the server
//dummy.socket = tls.connect(902, 'localhost', function() {
dummy.socket = net.connect(902, 'localhost', function() {
    // callback called only after successful socket connection
    console.log('Connection made');
    dummy.connected = true;
    //if (dummy.socket.authorized) {
        // authorization successful
        dummy.socket.setEncoding('utf-8');
        connected(dummy.socket);

   l //} else {
    //    // authorization failed
    //    console.log(dummy.socket.authorizationError);
    //    connected(null);
    //}
});

dummy.socket.addListener('data', function(data) {
    // received data
    console.log('Data received');
    console.log(data.toString().substring(0, 3));
    if (data.toString().substring(0, 3) == '220') {
        console.log('Woo-hoo!')
        ssl = tls.connect(options);
    }
});

dummy.socket.addListener('error', function(error) {
    console.log('Error');
    if (!dummy.connected) {
        // socket was not connected, notify callback
        connected(null);
    }
    console.log("FAIL");
    console.log(error);
});

dummy.socket.addListener('close', function() {
    // do something
    console.log('Closed');
});
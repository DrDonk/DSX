/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 21/07/2013
 * Time: 21:37
 * To change this template use File | Settings | File Templates.
 */
var path = require('path'),
    express = require('express'),
    config = require('./config/config.json'),
    host = require('./lib/host.js'),
    app = new express(),
    server = new host();

app.get('/', function(req, res){
    res.send(config);
});

app.get('/guests', function(req, res){
    res.json(server.inventory);
});

app.get('/guests/:id', function(req, res){
    res.json(server.guest(server.inventory[req.params.id]));
});

app.get('/guests/:id/name', function(req, res){
    res.json(server.inventory[req.params.id].guest.name);
});

app.get('/guests/:id/guestos', function(req, res){
    res.json(server.inventory[req.params.id].guest.guestos);
});

app.get('/guests/:id/path', function(req, res){
    res.json(server.inventory[req.params.id].guest.path);
});

app.get('/guests/:id/key', function(req, res){
    res.json(server.inventory[req.params.id].guest.key);
});

app.put('/guests/:id/key/:pwd', function(req, res){
    server.inventory[req.params.id].guest.key = req.params.pwd;
    res.json(server.inventory[req.params.id].guest.key);
});

app.get('/guests/:id/vnc', function(req, res){
    res.json(server.inventory[req.params.id].guest.vnc);
});

app.put('/guests/:id/vnc/:num', function(req, res){
    server.inventory[req.params.id].guest.vnc = req.params.num;
    res.json(server.inventory[req.params.id].guest.vnc);
});

app.get('/guests/:id/wss', function(req, res){
    res.json(server.inventory[req.params.id].guest.wss);
});

app.put('/guests/:id/wss/:num', function(req, res){
    server.inventory[req.params.id].guest.wss = req.params.num;
    res.json(server.inventory[req.params.id].guest.wss);
});

app.get('/guests/:id/url', function(req, res){
    // var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    // console.log(fullUrl);
    res.json(req.protocol + '://' + req.get('host') + server.inventory[req.params.id].guest.url);
});

app.get('/guests/:id/running', function(req, res){
    res.json(server.inventory[req.params.id].guest.running);
});

app.get('/guests/:id/stop', function(req, res){
    server.inventory[req.params.id].guest.stop('default');
    res.send(200);
});

app.get('/guests/:id/start', function(req, res){
    server.inventory[req.params.id].guest.start('default');
    res.send(200);
});

app.get('/guests/:id/pause', function(req, res){
    server.inventory[req.params.id].guest.pause();
    res.send(200);
});

app.get('/guests/:id/reset', function(req, res){
    server.inventory[req.params.id].guest.reset('default');
    res.send(200);
});

app.get('/guests/:id/suspend', function(req, res){
    server.inventory[req.params.id].guest.suspend('default');
    res.send(200);
});

app.get('/guests/:id/unpause', function(req, res){
    server.inventory[req.params.id].guest.unpause();
    res.send(200);
});

app.get('/guests/:id/commit', function(req, res){
    res.json(server.inventory[req.params.id].guest.commit());
});

//app.use(express.static(__dirname + '/bower_components/no-vnc'));
app.use(express.static(__dirname));
app.listen(config["serverport"]);
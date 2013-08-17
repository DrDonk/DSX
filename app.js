/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 21/07/2013
 * Time: 21:37
 * To change this template use File | Settings | File Templates.
 */
var express = require('express'),
    config = require('./config/config.json'),
    host = require('./lib/host.js');

var app = express();
var server = new host();
//app.use(express.bodyParser());
app.set('title',  'DSX');

app.get('/', function(req, res){
    res.send('DSX Web Service');
});

app.get('/guests', function(req, res){
    res.json(server.inventory);
});

app.get('/guests/:id', function(req, res){
    res.json(server.inventory[req.params.id]);
});

app.get('/guests/:id/name', function(req, res){
    res.json(server.inventory[req.params.id].guest.name);
});

app.get('/guests/:id/key', function(req, res){
    res.json(server.inventory[req.params.id].guest.remoteDisplayKey);
});

app.put('/guests/:id/key/:pwd', function(req, res){
    server.inventory[req.params.id].guest.remoteDisplayKey = req.params.pwd;
    res.json(server.inventory[req.params.id].guest.remoteDisplayKey);
});

app.get('/guests/:id/port', function(req, res){
    res.json(server.inventory[req.params.id].guest.remoteDisplayPort);
});

app.put('/guests/:id/port/:num', function(req, res){
    server.inventory[req.params.id].guest.remoteDisplayPort = req.params.num;
    res.json(server.inventory[req.params.id].guest.remoteDisplayPort);
});

app.get('/guests/:id/poweroff', function(req, res){
    res.json(server.inventory[req.params.id].guest.powerOff());
});

app.get('/guests/:id/poweron', function(req, res){
    res.json(server.inventory[req.params.id].guest.powerOn());
});

app.get('/guests/:id/powerpause', function(req, res){
    res.json(server.inventory[req.params.id].guest.powerPause());
});

app.get('/guests/:id/powereset', function(req, res){
    res.json(server.inventory[req.params.id].guest.powerReset());
});

app.get('/guests/:id/powersuspend', function(req, res){
    res.json(server.inventory[req.params.id].guest.powerSuspend());
});

app.get('/guests/:id/powerunpause', function(req, res){
    res.json(server.inventory[req.params.id].guest.powerUnpause());
});

app.listen(config["serverport"]);
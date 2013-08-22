/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 21/07/2013
 * Time: 21:37
 * To change this template use File | Settings | File Templates.
 */
var express = require('express'),
    config = require('./config/config.json'),
    host = require('./lib/host.js'),
    app = new express(),
    server = new host();

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

app.get('/guests/:id/port', function(req, res){
    res.json(server.inventory[req.params.id].guest.port);
});

app.put('/guests/:id/port/:num', function(req, res){
    server.inventory[req.params.id].guest.remoteDisplayPort = req.params.num;
    res.json(server.inventory[req.params.id].guest.port);
});

app.get('/guests/:id/running', function(req, res){
    res.json(server.inventory[req.params.id].guest.running);
});

app.get('/guests/:id/stop', function(req, res){
    res.json(server.inventory[req.params.id].guest.stop('default'));
});

app.get('/guests/:id/start', function(req, res){
    res.json(server.inventory[req.params.id].guest.start('default'));
});

app.get('/guests/:id/pause', function(req, res){
    res.json(server.inventory[req.params.id].guest.pause());
});

app.get('/guests/:id/reset', function(req, res){
    res.json(server.inventory[req.params.id].guest.reset('default'));
});

app.get('/guests/:id/suspend', function(req, res){
    res.json(server.inventory[req.params.id].guest.suspend('default'));
});

app.get('/guests/:id/unpause', function(req, res){
    res.json(server.inventory[req.params.id].guest.unpause());
});

app.get('/guests/:id/commit', function(req, res){
    res.json(server.inventory[req.params.id].guest.commit());
});

app.listen(config["serverport"]);
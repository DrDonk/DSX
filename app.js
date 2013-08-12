/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 21/07/2013
 * Time: 21:37
 * To change this template use File | Settings | File Templates.
 */
var sys = require('sys'),
    fs = require('fs'),
    os = require('os'),
    express = require('express'),
    dict = require('./lib/dict.js'),
    config = require('./config/config.json'),
    guest = require('./lib/guest.js');

var app = express();
app.set('title',  'DSX');
app.get('/', function(req, res){
    res.send('hello world');
});

app.listen(config["serverport"]);
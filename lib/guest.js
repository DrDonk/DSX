/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 04/08/2013
 * Time: 10:02
 * To change this template use File | Settings | File Templates.
 */

var fs = require('fs'),
    os = require('os'),
    exec = require('child_process').exec,
    execsync = require('shelljs').exec,
    dict = require('./dict.js'),
    config = require('./../test/config.json');

var endOfLine = require('os').EOL;

// Constructor
function Guest (guestname, guestpath) {
    var name = guestname;
    var path = guestpath;
    var vmx = dict.decode(fs.readFileSync(path, 'ascii'));
    var vmrun = config[process.platform]["vmrun"];
    var vncpasswd = process.cwd() + config[process.platform]["vncpasswd"];
    var output;
    
    // Class methods
    this.commit = function() {
        // Check the guest is powered down
        if (this.running) {
            output = dict.encode(vmx);
            fs.writeFileSync(path, output,'ascii');
            return true;
        }
        else {
            return false;
        }
    };

    this.start = function(option) {
        if (option == "gui" || option == "nogui") {
            output = exec(vmrun + " start \"" + path + "\" " + option);
        }
        else {
            output = exec(vmrun + " start \"" + path + "\"");
        }
    };

    this.stop = function(option) {
        if (option == "soft" || option == "hard") {
            output = exec(vmrun + " stop \"" + path + "\" " + option);
        }
        else {
            output = exec(vmrun + " stop \"" + path + "\"");
        }
    };

    this.pause = function() {
        output = exec(vmrun + " pause \"" + path + "\"");
    };

    this.reset = function(option) {
        if (option == "soft" || option == "hard") {
            output = exec(vmrun + " reset \"" + path + "\" " + option);
        }
        else {
            output = exec(vmrun + " reset \"" + path + "\"");
        }
    };

    this.suspend = function(option) {
        if (option == "soft" || option == "hard") {
            output = exec(vmrun + " suspend \"" + path + "\" " + option);
        }
        else {
            output = exec(vmrun + " suspend \"" + path + "\"");
        }
    };

    this.unpause = function() {
        output = exec(vmrun + " unpause \"" + path + "\"");
    };

//    this.readVariable = function(variable) {
//        output = exec(vmrun + " readVariable \"" + path + "\" runtimeConfig " + variable );
//        return output;
//    };
//
//    this.writeVariable = function(variable, value) {
//        output = exec(vmrun + " writeVariable \"" + path + "\" runtimeConfig " + variable + " " + value);
//        return output;
//    };

    // Property getters and setters
    this.__defineGetter__('name', function() {
        return name;
    });

    this.__defineGetter__('path', function() {
        return path;
    });

    this.__defineGetter__('guestos', function() {
        return vmx["guestOS"];
    });

    this.__defineGetter__('enabled', function() {
        return vmx["RemoteDisplay.vnc.enabled"] || false;
    });

    this.__defineSetter__('enabled', function(arg) {
        vmx["RemoteDisplay.vnc.enabled"] = arg;
    });

    this.__defineGetter__('key', function() {
    return (vmx["RemoteDisplay.vnc.key"] ? true : false);
    });

    this.__defineSetter__('key', function(arg) {
        output =  execsync(vncpasswd + ' ' + arg, {silent:true}).output.split(' = ');
        vmx["RemoteDisplay.vnc.key"] = output[1];
    });

    this.__defineGetter__('running', function() {
        var output =  execsync(vmrun + " list", {silent:true}).output.split(endOfLine);
        return (output.indexOf(path) > -1);
    });

    this.__defineGetter__('vnc', function(){
        return vmx["RemoteDisplay.vnc.port"] || 0;
    });

    this.__defineSetter__('vnc', function(arg){
        vmx["RemoteDisplay.vnc.port"] = arg;
    });


    this.__defineGetter__('wss', function(){
        return vmx["RemoteDisplay.vnc.webSocket.port"] || 0;
    });

    this.__defineSetter__('wss', function(arg){
        vmx["RemoteDisplay.vnc.webSocket.port"] = arg;
    });    this.__defineGetter__('url', function() {
        /* http://localhost/vnc_auto.html?host=localhost&port=5920&password=password&title=DSX&logging=debug */
        return ('/vnc_auto.html?host=' + os.hostname() + '&port=' + vmx["RemoteDisplay.vnc.webSocket.port"]
            + '&title=DSX&logging=debug');
    });

 }

module.exports = Guest;

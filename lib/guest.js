/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 04/08/2013
 * Time: 10:02
 * To change this template use File | Settings | File Templates.
 */

var fs = require('fs'),
    os = require('os'),
    execSync = require('exec-sync'),
    dict = require('./dict.js'),
    config = require('./../config/config.json');

// Constructor
function Guest (guestname, guestpath) {
    var name = guestname;
    var path = guestpath;
    var vmx = dict.decode(fs.readFileSync(path, 'ascii'));
    var vmrun = config[process.platform]["vmrun"];
    var vncpasswd = config[process.platform]["vncpasswd"];
    var output;
    
    // Class methods
    this.commit = function() {
        // Check the guest is powered down
        if (this.isRunning) {
            output = dict.encode(vmx);
            fs.writeFileSync(path, output,'ascii');
            return true;
        }
        else {
            return false;
        }
    };

    this.isRunning = function() {
        output = execSync(vmrun + " list").split("\n");
        return (output.indexOf(path) > -1);
    };

    this.powerOn = function(option) {
        if (option == "gui" || option == "nogui") {
            output = execSync(vmrun + " start '" + path + "' " + option);
        }
        else {
            output = execSync(vmrun + " start '" + path + "'");
        }
    };

    this.powerOff = function(option) {
        if (option == "soft" || option == "hard") {
            output = execSync(vmrun + " stop '" + path + "' " + option);
        }
        else {
            output = execSync(vmrun + " stop '" + path + "'");
        }
    };

    this.powerPause = function() {
        output = execSync(vmrun + " pause '" + path + "'");
    };

    this.powerReset = function(option) {
        if (option == "soft" || option == "hard") {
            output = execSync(vmrun + " reset '" + path + "' " + option);
        }
        else {
            output = execSync(vmrun + " reset '" + path + "'");
        }
    };

    this.powerSuspend = function(option) {
        if (option == "soft" || option == "hard") {
            output = execSync(vmrun + " suspend '" + path + "' " + option);
        }
        else {
            output = execSync(vmrun + " suspend '" + path + "'");
        }
    };

    this.powerUnpause = function() {
        output = execSync(vmrun + " unpause '" + path + "'");
        return output;
    };

    this.readVariable = function(variable) {
        output = execSync(vmrun + " readVariable '" + path + "' runtimeConfig " + variable );
        return output
    };

    this.writeVariable = function(variable, value) {
        output = execSync(vmrun + " writeVariable '" + path + "' runtimeConfig " + variable + " " + value);
        return output;
    };

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
        var output;
        output = execSync(vncpasswd + arg);
        output = output.split(' = ');
        vmx["RemoteDisplay.vnc.key"] = output[1];
    });

    this.__defineGetter__('port', function(){
        return vmx["RemoteDisplay.vnc.webSocket.port"] || 0;
    });

    this.__defineSetter__('port', function(arg){
        vmx["RemoteDisplay.vnc.webSocket.port"] = arg;
    });

    this.__defineGetter__('url', function() {
        //vnc_auto.html?host=localhost&port=5920&password=password&title=DSX&logging=debug
        return ('/vnc_auto.html?host=' + os.hostname() + '&port=' + vmx["RemoteDisplay.vnc.webSocket.port"]
            + '&title=DSX&logging=debug');
    });

 }

module.exports = Guest;

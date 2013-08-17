/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 04/08/2013
 * Time: 10:02
 * To change this template use File | Settings | File Templates.
 */

var sys = require('sys'),
    fs = require('fs'),
    os = require('os'),
    execSync = require('exec-sync'),
    dict = require('./dict.js'),
    config = require('./../config/config.json');

// Constructor
function Guest (guestname, guestpath) {
    var name = guestname;
    var path = guestpath;
    var vmx = dict.decode(fs.readFileSync(path, 'utf-8'));
    var vmrun = config[os.platform()][os.arch()]["vmrun"];
    var vncpasswd = "./bin/" + os.platform() + "/vmware-vncpasswd ";
    var output;
    
    // Class methods
    this.enableRemoteDisplay = function() {
        // Check we have websocket address and guest is powered down
        if (vmx["RemoteDisplay.vnc.webSocket.port"] && this.isRunning) {
            vmx["RemoteDisplay.vnc.enabled"] = 'TRUE';
            output = dict.encode(vmx);
            fs.writeFileSync(path, output);
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

    this.__defineGetter__('guestOS', function() {
        return vmx["guestOS"];
    });

//    this.__defineGetter__('hasKey', function() {
//        return (vmx["RemoteDisplay.vnc.key"] ? true : false);
//    });

    this.__defineGetter__('remoteDisplayEnabled', function() {
        return vmx["RemoteDisplay.vnc.enabled"] || false;
    });

    this.__defineGetter__('remoteDisplayKey', function() {
    return (vmx["RemoteDisplay.vnc.key"] ? true : false);
    });

    this.__defineSetter__('remoteDisplayKey', function(arg) {
        var output;
        output = execSync(vncpasswd + arg);
        output = output.split(' = ');
        vmx["RemoteDisplay.vnc.key"] = output[1];
    });

    this.__defineGetter__('remoteDisplayPort', function(){
        return vmx["RemoteDisplay.vnc.webSocket.port"] || 0;
    });

    this.__defineSetter__('remoteDisplayPort', function(arg){
        vmx["RemoteDisplay.vnc.webSocket.port"] = arg;
    });

 }

module.exports = Guest;

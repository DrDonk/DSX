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
    config = require('./config.json');

// Constructor
function Guest (guestname, guestpath) {
    var name = guestname;
    var path = guestpath;
    this.vmx = dict.decode(fs.readFileSync(path, 'utf-8'));
    var vmrun = config[os.platform()][os.arch()]["vmrun"];
    var vncpasswd = "./bin/" + os.platform() + "/vmware-vncpasswd ";
    var output;
    
    // Class methods
    this.enableRemoteDisplay = function() {
        // Save running state
        var wasRunning = this.isRunning();

        // Check we have websocket address
        if (this.vmx["RemoteDisplay.vnc.webSocket.port"]) {
            if (wasRunning) {
                this.powerSuspend();
            }
            this.vmx["RemoteDisplay.vnc.enabled"] = 'TRUE';
            output = dict.encode(this.vmx);
            fs.writeFileSync(path, output);
            if (wasRunning) {
                this.powerOn();
            }
            return true;
        }
        else {
            return false;
        }
    };

    this.isRunning = function() {
        output = execSync(vmrun + " list");
        output = output.split(/\r?\n/).splice(1,1).sort();
        if (output.indexOf(path) >= 0)
            return true;
        else
            return false;
    };

    this.powerOn = function(gui) {
        if (gui) {
            output = execSync(vmrun + " start '" + path + "' gui");
        }
        else {
            output = execSync(vmrun + " start '" + path + "' nogui");
        }
    };

    this.powerOff = function(soft) {
        if (soft) {
            output = execSync(vmrun + " stop '" + path + "' soft");
        }
        else {
            output = execSync(vmrun + " stop '" + path + "' hard");
        }
    };

    this.powerPause = function() {
        output = execSync(vmrun + " pause '" + path + "'");
    };

    this.powerReset = function(soft) {
        if (soft) {
            output = execSync(vmrun + " suspend '" + path + "' soft");
        }
        else {
            output = execSync(vmrun + " suspend '" + path + "' hard");
        }
    };

    this.powerSuspend = function(soft) {
        if (soft) {
            output = execSync(vmrun + " suspend '" + path + "' soft");
        }
        else {
            output = execSync(vmrun + " suspend '" + path + "' hard");
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

    this.__defineGetter__('remoteDisplayKey', function() {
        return this.vmx["RemoteDisplay.vnc.key"];
    });

    this.__defineSetter__('remoteDisplayKey', function(arg) {
        var output;
        output = execSync(vncpasswd + arg);
        output = output.split(' = ');
        this.vmx["RemoteDisplay.vnc.key"] = output[1];
    });

    this.__defineGetter__('remoteDisplayPort', function(){
        return this.vmx["RemoteDisplay.vnc.webSocket.port"];
    });

    this.__defineSetter__('remoteDisplayPort', function(arg){
        this.vmx["RemoteDisplay.vnc.webSocket.port"] = arg;
    });

 }

module.exports = Guest;

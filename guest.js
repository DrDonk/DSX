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
    ini = require('ini'),
    execSync = require('exec-sync'),
    config = require('./config.json');

// Constructor
function Guest (name, path) {
    this.name = name;
    this.path = path;
    this.vmx = ini.parse(fs.readFileSync(path, 'utf-8'));
    var vmrun = config[os.platform()][os.arch()]["vmrun"];
    var vncpasswd = "./bin/" + os.platform() + "/vmware-vncpasswd ";
    var output;
    
    // Class methods
    this.isRunning = function() {
        output = execSync(vmrun + " list");
        return output.split(/\r?\n/).splice(1,1).sort().indexOf(this.path);
    };

    this.powerOn = function(gui) {
        if (gui) {
            output = execSync(vmrun + " start '" + this.path + "' gui");
        }
        else {
            output = execSync(vmrun + " start '" + this.path + "' nogui");
        }
        console.log(output);
    };

    this.powerOff = function(soft) {
        if (soft) {
            output = execSync(vmrun + " stop '" + this.path + "' soft");
        }
        else {
            output = execSync(vmrun + " stop '" + this.path + "' hard");
        }
        console.log(output);
    };

    this.powerPause = function() {
        output = execSync(vmrun + " pause '" + this.path + "'");
        console.log(output);
    };

    this.powerReset = function(soft) {
        if (soft) {
            output = execSync(vmrun + " suspend '" + this.path + "' soft");
        }
        else {
            output = execSync(vmrun + " suspend '" + this.path + "' hard");
        }
        console.log(output);
    };

    this.powerSuspend = function(soft) {
        if (soft) {
            output = execSync(vmrun + " suspend '" + this.path + "' soft");
        }
        else {
            output = execSync(vmrun + " suspend '" + this.path + "' hard");
        }
        console.log(output);
    };

    this.powerUnpause = function() {
        output = execSync(vmrun + " unpause '" + this.path + "'");
        console.log(output);
        return output;
    };

    this.readVariable = function(variable) {
        output = execSync(vmrun + " readVariable '" + this.path + "' runtimeConfig " + variable );
        console.log(output);
        return output
    };

    this.writeVariable = function(variable, value) {
        output = execSync(vmrun + " writeVariable '" + this.path + "' runtimeConfig " + variable + " " + value);
        console.log(output);
        return output;
    };

    // Property getters and setters
    this.__defineGetter__('remoteDisplayKey', function() {
        return this.vmx["RemoteDisplay.vnc.key"];
    });

    this.__defineSetter__('remoteDisplayKey', function(arg) {
        output = execSync(vncpasswd + arg);
        output = output.split(' = ');
        //this.vmx["RemoteDisplay.vnc.key"] = output[1];
        console.log('remoteDisplayKey=' + arg);
    });

    this.__defineGetter__('remoteDisplayPort', function(){
        return this.vmx["RemoteDisplay.vnc.webSocket.port"];
    });

    this.__defineSetter__('remoteDisplayPort', function(arg){
        // TODO: Check port range
        //this.vmx["RemoteDisplay.vnc.webSocket.port"] = arg;
        console.log('remoteDisplayPort=' + arg);
    });

}

module.exports = Guest;

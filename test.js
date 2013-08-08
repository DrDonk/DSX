#! /usr/local/bin/node
/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 09/07/2013
 * Time: 21:37
 * To change this template use File | Settings | File Templates.
 */

/* Need to add the following keys to VMX file
 RemoteDisplay.vnc.enabled = "TRUE"
 RemoteDisplay.vnc.webSocket.port = "5910"
 RemoteDisplay.vnc.key = "<des encrypted password>"
 */

var sys = require('sys'),
    fs = require('fs'),
    os = require('os'),
    ini = require('ini'),
    config = require('./config.json'),
    guest = require('./guest.js');

var inventory = {};

function parseinventory(file) {
    Object.keys(file).forEach(function(key) {
        var name;
        var path;
        if (key.indexOf("config") >= 0) {
            if (file[key] != "") {
                path = file[key];
                name = file[key.replace("config", "DisplayName")];
                if (fs.existsSync(path)) {
                    inventory[path] = new guest(name, path);
                    console.log(path + ' ' + name);
                }
                else {
                    console.log("Err: VMX file does not exist " + path )
                }
            }
        }
    });
}

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

console.log(getUserHome());

var vmPrivate = ini.parse(fs.readFileSync(getUserHome() + config[os.platform()][os.arch()]["userinventory"], 'utf-8'));
parseinventory(vmPrivate);

if (os.platform() == 'darwin') {
    var vmShared = ini.parse(fs.readFileSync(config[os.platform()][os.arch()]["sharedinventory"], 'utf-8'));
    parseinventory(vmShared);
}

Object.keys(inventory).forEach(function(key) {
    var guest = inventory[key];
    console.log(guest.name);
    console.log(guest.path);
    console.log(guest.isRunning());
    console.log(guest.vmx["guestOS"]);
    console.log(guest.vmx["RemoteDisplay.vnc.enabled"]);
    console.log(guest.vmx["RemoteDisplay.vnc.webSocket.port"]);
    console.log(guest.vmx["RemoteDisplay.vnc.key"]);
    guest.remoteDisplayPassword = 'password';
    guest.remoteDisplayPort = 5999;
});

var vmrun = inventory["/Users/Shared/vmimages/FreeDOS/FreeDOS.vmx"];
vmrun.powerOn(true);
console.log(vmrun.readVariable("RemoteDisplay.vnc.webSocket.enabled"));
vmrun.powerOff();
console.log(vmrun.isRunning());


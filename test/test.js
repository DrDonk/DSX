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
    dict = require('./../lib/dict.js'),
    config = require('./../config/config.json'),
    server = require('./../lib/host.js'),
    guest = require('./../lib/guest.js');


var host = new server();
console.log(host);

Object.keys(host.inventory).forEach(function(key) {
    var guest = host.inventory[key].guest;
    console.log(guest.name);
    console.log(guest.path);
    console.log(guest.isRunning());
    console.log(guest.guestOS);
    console.log(guest.remoteDisplayEnabled);
    console.log(guest.remoteDisplayPort);
    console.log(guest.remoteDisplayKey);
});

var vmrun = host.inventory["/Users/i049299/vmimages/freenas.vmwarevm/freenas.vmx"].guest;
console.log(vmrun);
if (!vmrun.remoteDisplayPort) {
    vmrun.remoteDisplayPort = 5920;
}
vmrun.enableRemoteDisplay();
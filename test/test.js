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
console.log(process.cwd());
var server = require('./../lib/host.js');

var host = new server();

for (var key in host.inventory) {
    console.log(host.inventory[key].guest.path);
}

_ = require('underscore');

_.each(host.inventory, function(value, key){
    _.each(value, function(value, key){
        console.log(value);
    });
});

//var vmrun = host.inventory["/Users/i049299/vmimages/freenas.vmwarevm/freenas.vmx"].guest;
//var vmrun = host.inventory["564d5034a0b2f06b98f14f424d6e110b"].guest;
//console.log(vmrun);
//vmrun.enabled = true;
//vmrun.key = 'password';
//vmrun.port = 5920;
//vmrun.commit();
//console.log(vmrun);
/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 11/08/2013
 * Time: 10:54
 * To change this template use File | Settings | File Templates.
 */
var sys = require('sys'),
    fs = require('fs'),
    os = require('os'),
    dict = require('./dict.js'),
    config = require('./../config/config.json'),
    guest = require('./guest.js');

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function parseinventory(file, inventory) {
    var vmls = dict.decode(file);
    Object.keys(vmls).forEach(function(key) {
        var name;
        var path;
        var item;
        if (key.indexOf("config") > -1) {
            if (vmls[key] != "") {
                path = vmls[key];
                name = vmls[key.replace("config", "DisplayName")];
                if (fs.existsSync(path)) {
                    item = new guest(name, path);
                    inventory[path] = {
                        name: name,
                        guest: item, os: item.guestOS,
                        enabled: item.remoteDisplayEnabled,
                        port: item.remoteDisplayPort,
                        key: item.hasKey
                    };
                    console.log(path + ' ' + name);
                }
                else {
                    console.log("Err: VMX file does not exist " + path )
                }
            }
        }
    });
}

// Constructor
function Host () {
    this.inventory = {};
    var file = fs.readFileSync(getUserHome() + config[os.platform()][os.arch()]["userinventory"]);
    parseinventory(file, this.inventory);

    if (os.platform() == 'darwin') {
        file = fs.readFileSync(config[os.platform()][os.arch()]["sharedinventory"]);
        parseinventory(file, this.inventory);
    }
}

module.exports = Host;
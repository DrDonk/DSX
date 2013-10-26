/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 11/08/2013
 * Time: 10:54
 * To change this template use File | Settings | File Templates.
 */
var fs = require('fs'),
    os = require('os'),
    dict = require('./dict.js'),
    config = require('./../test/config.json'),
    guest = require('./guest.js');

function parseinventory(file, inventory) {
    var vmls = dict.decode(file);

    for (var key in vmls) {
        var id;
        var name;
        var path;
        var item;
        if (key.indexOf("config") > -1) {
            if (vmls[key] != "") {
                id = vmls[key.replace("config", "UUID")].replace(/\s/g, "").replace(/-/g,"");
                path = vmls[key];
                name = vmls[key.replace("config", "DisplayName")];
                if (fs.existsSync(path)) {
//                    item = new guest(name, path);
//                    inventory[id] = {guest: item};
                    inventory[id] = {name: name, path: path};
                    console.log('Info: id:' + id + ' path:' + path + ' name:' + name);
                }
                else {
                    console.log('Error: id:' + id + ' path:' + path + ' name:' + name + ' does not exist' )
                }
            }
        }
    }
}

// Constructor
function Host () {
    this.inventory = {};
    var home = process.env[(process.platform == 'win32') ? 'APPDATA' : 'HOME'];
    var file = fs.readFileSync(home + config[process.platform]["userinventory"], 'ascii');
    parseinventory(file, this.inventory);

    if (os.platform() == 'darwin') {
        file = fs.readFileSync(config[process.platform]["sharedinventory"], 'ascii');
        parseinventory(file, this.inventory);
    }

    this.guest = function(id) {
        if (id.guest == undefined) {
            var item = new guest(id.name, id.path);
            id.guest = item;
        }
        return id;
    }
}

module.exports = Host;
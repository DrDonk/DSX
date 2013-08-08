/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 21/07/2013
 * Time: 13:20
 * To change this template use File | Settings | File Templates.
 */

/* Module use vmrun command for power ops and variable access*/

var sys = require('sys'),
    execSync = require('exec-sync'),
    output;

function listRunning() {
    output = execSync("vmrun -T fusion list");
    output = output.split(/\r?\n/).splice(1,1).sort();
    console.log(output);
    return output;
}

module.exports = {

    isRunning: function (guest) {
        var running;
        output = this.listRunning();
        running = output.indexOf(guest);
        return running;
    },

    powerOn: function (guest, gui) {
        if (gui) {
            output = execSync("vmrun -T fusion start '" + guest + "' gui");
        }
        else {
            output = execSync("vmrun -T fusion start '" + guest + "' nogui");
        }
        console.log(output);
    },

    powerOff: function (guest, soft) {
        if (soft) {
            output = execSync("vmrun -T fusion stop '" + guest + "' soft");
        }
        else {
            output = execSync("vmrun -T fusion stop '" + guest + "' hard");
        }
        console.log(output);
    },

    powerPause: function(guest, variable) {
        output = execSync("vmrun -T fusion pause '" + guest + "'");
        console.log(output);
    },

    powerReset: function (guest, soft) {
        if (soft) {
            output = execSync("vmrun -T fusion suspend '" + guest + "' soft");
        }
        else {
            output = execSync("vmrun -T fusion suspend '" + guest + "' hard");
        }
        console.log(output);
    },

    powerSuspend: function (guest, soft) {
        if (soft) {
            output = execSync("vmrun -T fusion suspend '" + guest + "' soft");
        }
        else {
            output = execSync("vmrun -T fusion suspend '" + guest + "' hard");
        }
        console.log(output);
    },

    powerUnpause: function(guest, variable) {
        output = execSync("vmrun -T fusion unpause '" + guest + "'");
        console.log(output);
        return output;
    },

    readVariable: function(guest, variable) {
        output = execSync("vmrun -T fusion readVariable '" + guest + "' runtimeConfig " + variable );
        console.log(output);
        return output
    },

    writeVariable: function(guest, variable, value) {
        output = execSync("vmrun -T fusion writeVariable '" + guest + "' runtimeConfig " + variable + " " + value);
        console.log(output);
        return output;
    }
};


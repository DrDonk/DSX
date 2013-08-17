/**
 * Created with JetBrains WebStorm.
 * User: Dave Parsons
 * Date: 09/08/2013
 * Time: 17:04
 * To change this template use File | Settings | File Templates.
 */

function decode(file) {
    var lines = file.toString().split("\n");
    var dict = {};
    var i = 0,
        j = 0;

    // Parse each line from file
    lines.forEach(function(line){
        var key;
        var value;
        // Check for comments that start with hash character
        var match = line.match(/^\s*#/);
        if (match) {
            i++;
            key = "_comment_" + i;
            value = line;
        }
        else {
            // Parse key/value pairs
            match = line.match(/^([^=]+)(=(.*))?$/i);
            if (match) {
                key = match[1];
                value = match[3];
            }
            else {
                j++;
                key = "_blank_" + j;
                value = "";
            }
        }
        dict[key.trim()] = value.trim().replace(/\"/g, "");
    });
    return dict;
}

function encode(dict) {
    var output;
    var endOfLine = require('os').EOL;
    var i = 0;
    var j = Object.keys(dict).length;
    output = "";
    Object.keys(dict).forEach(function(key) {
        i++;
        if (key.indexOf("_comment_") >= 0 ) {
            output = output + dict[key] + endOfLine;
        }
        else if (key.indexOf("_blank_") >= 0 ) {
            if (i != j) {
                output = output + endOfLine;
            }
        }
        else {
            output = output + key + " = \"" + dict[key] + "\"" + endOfLine;
        }
    });
    //console.log(output);
    return output;
}

exports.decode = decode;
exports.encode = encode;


'use strict';
//This is configuring the options when you launch the debugger. 
//Note it uses the config file: config.defaults.js
var argv = require('optimist').argv;
var fs = require('fs');
var config = require('./config/config.defaults.js');


//allows you to use a different host (default the local lost in config.defaults.js)
if (argv['h'])         { config.serverHost        = argv['h']; } 
if (argv['host'])      { config.serverHost        = argv['host']; }

//allows you to output on a different port besides 8500?
if (argv['p'])         { config.serverPort        = argv['p']; } 
if (argv['port'])      { config.serverPort        = argv['port']; } 

//Folder where all your files reside
if (argv['d'])         { config.fileServerBaseDir = argv['d']; } 
if (argv['file-dir'])  { config.fileServerBaseDir = argv['file-dir']; } 

if (argv['file-port']) { config.fileServerPort    = argv['file-port']; }

if(argv['v'])    		{ config.verbosity				  = argv['v'];		   }
if(argv['verbose'])    		{ config.verbosity				  = argv['verbose'];		   }

if ((config.verbosity=='true') ||(verbosity=='t')) {
	console.log("**************Golden Scarab*****************");
	console.log("Golden Scarab is an interface for debugging JavaScript on a server.");
	console.log("This is built largely on the code of the Aardwolf build from Feb 2013.");
	console.log();
	console.log("Scarab is currently set up to run two servers synchronously:");
	console.log("         AardwolfServer runs the Scarab GUI");
	console.log("         File Debug Server runs your code which can be accessed and interacted with remotely");
	console.log();
	console.log("::::::::REQUIREMENTS:::::::::");
	console.log("1. Your JS files are run via html files."); 
	console.log("2. These html files have been modified according to the ReadMe");
	console.log("3. Your JS files employ semicolons consistently (enables debugging on those lines)");
	console.log("4. Currently very limited on .coffee debugging");
	console.log("5. All devices to run this are on the same network");
	console.log();
	console.log("If the following requirements are not fulfilled, please CTRL-C to stop servers");
	console.log("*********************************************");
	console.log();
}

//Ensures you've given it a valid path to your directory
try {
    /* Makes sure the path exists and gets rid of any trailing slashes. */
    config.fileServerBaseDir = fs.realpathSync(config.fileServerBaseDir);
} catch (e) {
    console.error(e.message);
    console.error("Please enter a valid directory for the files you wish to debug")
    process.exit(1);
}

var ips=scanAvailableIPs();

//Checks for a valid IP address
if (config.serverHost && ips.indexOf(config.serverHost) < 0) {
	console.error('Configured host', config.serverHost, 'is not valid. You don\'t have that IP');
	console.error('Available IPs are:', ips);
	process.exit(1);
}

//if no IP given or
//if more than one, it prompts user to choose
if (!config.serverHost) {
    if (ips.length > 1) {
		console.log("There are multiple IPs from which to host the server..");
		console.log("please choose one of the following:");
		ips.forEach(function(ip, i) {
			console.log('[', i + 1, ']:', ip);
		})

		var prompt = require('prompt');
		prompt.start();
		prompt.get({name: 'selection', validator: /^\d{1}$/, empty: false}, function(err, result) {
			var ip = ips[result.selection - 1];
			console.log('Choosen option', ip);
			config.serverHost = ip;
		})
	} else {
		config.serverHost=ips[0];
	}   	
}

var server = require('./server/server.js');
var debugFileServer = require('./server/debug-file-server.js');

server.run();
debugFileServer.run();

function scanAvailableIPs() {
	var os = require('os');
	var interfaces = os.networkInterfaces(),
		ips = [];
	for (var dev in interfaces) {
		interfaces[dev].forEach(function(details){
			if (details.family == 'IPv4' && details.address != '127.0.0.1') {
				ips.push(details.address);
			}
		});
	}
	return ips;
}

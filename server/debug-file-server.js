'use strict';

/*
 * Serves source files with debug statements inserted.
 */

var http = require('http');
var path = require('path');
var fs = require('fs');
var url = require('url');
var config = require('../config/config.defaults.js');
var util = require('./server-util.js');


function run() {
	//checks to ensure directory actually exists
    if (!fs.existsSync(config.fileServerBaseDir)) {
        console.error('ERROR: Path does not exist: ' + config.fileServerBaseDir);
        process.exit(1);
    }
    
    //creates server
    //outputs to user the ip at which they can find the remote server
    http.createServer(DebugFileServer).listen(config.fileServerPort, null, function() {
        console.log('File server listening for requests on port ' + config.fileServerPort + '.');
        console.log('Use one of the following to interact with File Debug Server (on home computer or remotely):'); 
        var fileList= util.getHTMLFiles();
        fileList && fileList.forEach(function(f) {
            console.log("          "+ config.serverHost + ":" + config.fileServerPort + f);
        });
    });
}

//Generally just responds to URL requests for files and pages
//It rewrites .js and .coffee files so they are controllable for breakpoints
//checks for nesting errors as these can bug the server
function DebugFileServer(req, res) {
    var requestedFile = url.parse(req.url).pathname; 
    var fileServerBaseDir = path.normalize(config.fileServerBaseDir);
    var fullRequestedFilePath = path.join(fileServerBaseDir, requestedFile);
    
    /* alias for serving the debug library */
    if (requestedFile.toLowerCase() == '/aardwolf.js') {
        util.serveStaticFile(res, path.join(__dirname, '../js/aardwolf.js'));
    }
    /* File must exist and must be located inside the fileServerBaseDir */
    else if (fs.existsSync(fullRequestedFilePath) &&
             fs.statSync(fullRequestedFilePath).isFile() &&
             fullRequestedFilePath.indexOf(fileServerBaseDir) === 0)
    {
        //rewriting javascript and coffee to be controllable 
        var rewriter;
        if (requestedFile.substr(-3) == '.js') {
            rewriter = require('../rewriter/jsrewriter.js');
        }

        else if (requestedFile.substr(-7) == '.coffee') {
            rewriter = require('../rewriter/coffeerewriter.js');
        }
        
        if (rewriter) {
            var content = fs.readFileSync(fullRequestedFilePath).toString();
            //checks for compilation bugs
            
            rewriter.checkBugs(content, function(err) {
            	if (err) {
            		console.log("Bug found in " + requestedFile+ ":" + err);
            		console.log("Server Stopped");
            		process.exit(1)
            	}
            	rewriter.addDebugStatements(requestedFile, content, writeToFileServer);
            });  		
            
        }
        
        //not javascript or coffee so doesn't modify file
        else {
            util.serveStaticFile(res, fullRequestedFilePath); 
            
        }
    }
    else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('NOT FOUND');
    }
    
    //writes to File server or ends process if there's an error
    function writeToFileServer(err, content) {
    	if (err) {
    		console.log(err);
    		process.exit(1);
    	}
    	else {
			res.writeHead(200, {'Content-Type': 'application/javascript'});
			res.end(content);
			}
	}
}



module.exports.run = run;

'use strict';

/*
 * Server for communication between the UI and the mobile library.
 * Also serves UI-related files.
 */

var http = require('http');
var path = require('path');
var fs = require('fs');


var config = require('../config/config.defaults.js');
var util = require('./server-util.js');

function run() {
    /* Server for web service ports and debugger UI */
    http.createServer(AardwolfServer).listen(config.serverPort, null, function() {
        console.log('AardWolf Server listening for requests on port ' + config.serverPort + '.');
        console.log('Go to http://' + config.serverHost + ":" + config.serverPort + ' for Aardwolf Server');
        console.log();
    });
}

//Probably dont need mobile dispatcher
var mobileDispatcher = new Dispatcher();
var desktopDispatcher = new Dispatcher();

//setting up necessary protocols on the server??
//whats res.setHeader??
function AardwolfServer(req, res) {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    var body = '';
    
    if (req.method == 'OPTIONS') {
        res.end();
        return;
    }
    else if (req.method == 'POST') {
        req.on('data', function (chunk) { body += chunk; });
        req.on('end', function () { processPostedData(JSON.parse(body)); });
    }
    else {
        processPostedData();
    }
    //Processing listened to data??
    
    function processPostedData(data) {
        
        switch (req.url) {
            case '/desktop/save':
                checkFileForBugs(data.data, data.filename, function(err) {
                    if (err) {
                        data={command: 'save-failed', file: data.filename, bug: err};
                    }
                    else {
                        data={command: 'save-success', file: data.filename};
                    }
                    desktopDispatcher.addMessage(data);
                });
                res.end();
                break;

            case '/mobile/init':
                mobileDispatcher.end();
                mobileDispatcher = new Dispatcher();
                mobileDispatcher.setClient(res);
                desktopDispatcher.clearMessages();
                desktopDispatcher.addMessage(data);
                break;
                
            case '/mobile/console':
                desktopDispatcher.addMessage(data);
                ok200();
                break;
                
            case '/mobile/breakpoint':
                desktopDispatcher.addMessage(data);
                mobileDispatcher.setClient(res);
                break;
                
            case '/mobile/incoming':
                mobileDispatcher.setClient(res);
                break;
                
            case '/desktop/outgoing':
                mobileDispatcher.addMessage(data);
                ok200();
                break;
                
            case '/desktop/incoming':
                desktopDispatcher.setClient(res);
                break;
                
            case '/files/list':
                ok200({ files: util.getFilesList() });
                break;

            case '/':
            case '/ui':
            case '/ui/':
                res.writeHead(302, {'Location': '/ui/index.html'});
                res.end();
                // var message={command: 'update-breakpoints-from-file', breakpoints: config.breakpoints};
	             //desktopDispatcher.addMessage(message);
                break;
                
            default:
                /* check if we need to serve a UI file */

                if (req.url.indexOf('/ui/') === 0) {
                    var requestedFile = req.url.substr(4);
                    var uiFilesDir = path.join(__dirname, '../ui/');
                    var fullRequestedFilePath = path.join(uiFilesDir, requestedFile);
                    
                    /* File must exist and must be located inside the uiFilesDir */
                    if (fs.existsSync(fullRequestedFilePath) && fullRequestedFilePath.indexOf(uiFilesDir) === 0) {
                        util.serveStaticFile(res, fullRequestedFilePath);
                        break;
                    }
                }
                
                /* check if we need to serve a UI file */
                if (req.url.indexOf('/files/data/') === 0) {
                    var requestedFile = req.url.substr(11);
                    var filesDir = path.normalize(config.fileServerBaseDir);
                    var fullRequestedFilePath = path.join(filesDir, requestedFile);
                    
                    /* File must exist and must be located inside the filesDir */
                    if (fs.existsSync(fullRequestedFilePath) && fullRequestedFilePath.indexOf(filesDir) === 0) {
                        ok200({ data: fs.readFileSync(fullRequestedFilePath).toString() });
                        break;
                    }
                }
                
                /* fallback... */
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('NOT FOUND');
        }
    }
    
    function ok200(data) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data || {}));
    }

    function checkFileForBugs(content, name, callback) {
        var rewriter;
        if (name.substr(-3) == '.js') {
            rewriter = require('../rewriter/jsrewriter.js');
        }

        else if (name.substr(-7) == '.coffee') {
            rewriter = require('../rewriter/coffeerewriter.js');
        }
        if (rewriter) {
            rewriter.checkBugs(content, function(err) {
                if (err)  {
                	callback(err);
                	}
                else {
                	copyFileOverAndSave(content, name, function(err) {
                    	if (err) callback(err);
                    	else callback();
                	});
                }
            });       
        }
    }

    function copyFileOverAndSave(content, fileName, callback) {
        var file= path.join(config.fileServerBaseDir + "/"+  fileName);
         if (fs.existsSync(file)) {
            var directory= path.join(config.fileServerBaseDir + "/archives");
            if (!fs.existsSync(directory)) {
                fs.mkdir(directory);
            }
            copyFileToArchive();
         }
         else {
            safeFileWrite();
        }

        function safeFileWrite() {
            fs.writeFile(file, content, function(err) {
                if(err) {
                    callback(err);
                } else {
                    callback();
                }
            }); 
        }

        function copyFileToArchive() {
            fs.readFile(file, function(err, data) {
                if (err) {
                    callback(err);
                }
                fs.writeFile(path.join(directory +fileName), data, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        safeFileWrite();

                    }
                });
            });
        }
    }
}


//can addMessage, end, setClient, and clear messages
//not sure what process does
function Dispatcher() {
    var queue = [];
    var client;
    
    this.setClient = function(c) {
        this.end();
        client = c;
        process();
    };
    
    this.addMessage = function(m) {
        queue.push(m);
        process();
    };
    
    this.end = function() {
        if (client) {
            client.end();
        }
    };
    
    this.clearMessages = function() {
        queue = [];
    };
    
    function process() {
        if (client && queue.length > 0) {
            client.writeHead(200, { 'Content-Type': 'application/json' });
            var msg = queue.shift();
            client.end(JSON.stringify(msg));
            client = null;
        }
    }
}
function sendToServer(req, payload) {
        try {

            req.open('POST', serverUrl + '/mobile' + path, false);
            req.setRequestHeader('Content-Type', 'application/json');
            req.send(JSON.stringify(payload));
            return safeJSONParse(req.responseText);
        } catch (ex) {
            console.log('Server encountered an error while sending data: ' + ex.toString());
        }
    }

//Run modules
module.exports.run = run;

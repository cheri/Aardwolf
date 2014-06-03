//this modules rewrites javascript files to insert aardwolf.js functions
//It allows for the server and the file server to sync
'use strict';

var fs = require('fs');
var path = require('path');
var jstok = require('./jstokenizer.js');


var debugStatementTemplate = 
    fs.readFileSync(path.join(__dirname, 'templates/debug-template.js')).toString().trim();
var exceptionInterceptorTemplate = 
    fs.readFileSync(path.join(__dirname, 'templates/exception-template.js')).toString().replace(/\n\r?/g, '').replace(/ {4}/g, ' ');

var exceptionInterceptorParts = exceptionInterceptorTemplate.split('SPLIT');
var exceptionInterceptorStart = exceptionInterceptorParts[0].trim();
var exceptionInterceptorEnd = exceptionInterceptorParts[1].trim();

function buildExceptionInterceptorStart(functionName, file, line) {
    return exceptionInterceptorStart
                .replace('__FUNCTION__', functionName)
                .replace('__FILE__', file)
                .replace('__LINE__', line);
}

function buildDebugStatement(file, line, isDebuggerStatement) {
    return debugStatementTemplate
                .replace('__FILE__', file)
                .replace('__LINE__', line)
                .replace('__DEBUGGER__', isDebuggerStatement ? 'true' : 'false');
}

//rewrites the code to insert debug statements and exception interceptors
function addDebugStatements(filePath, text, callback) {
    var nestingDepth = [0];
    var out = [];
    var line = 1;
    var semicolonOrFunctionBoundryEncountered = true;
    var newlineEncountered = true;
    var functionEncountered = false;
    var wordAfterFunction = null;
    

    jstok.tokenize(text, function(token, type) {
        /* drop carriage returns... we don't need them. */
        if (token === '\r') {
            return;
        }
        
        if (token == '"use strict"' || token == "'use strict'") {
            token = '/* Aardwolf cannot work in strict mode. Disabling. '+token.split('').join('_')+' */';
        }
        
        /* 
            Whenever we encounter some code:
            - if it's after a semicolon and a newline, or at the beginning of a function, 
              insert a debug statement in front of it
            - it it's anywhere else, reset the semicolon and newline flags because we're not
              anywhere near a place where a debug statement should be inserted
            
            Yes, this rewriter assumes that you're using semicolons in your code.
        */
        if (['word', 'number', 'string', 'char'].indexOf(type) > -1) {
            if (type != 'char' &&
                token != 'else' &&
                semicolonOrFunctionBoundryEncountered && 
                newlineEncountered)
            {
                var isDebuggerStatement = token === 'debugger';
                out.push(buildDebugStatement(filePath, line, isDebuggerStatement));
                
                if (isDebuggerStatement) {
                    /* Comment out the debugger statement to avoid triggering any native debuggers */
                    token = '/*' + token + '*/';
                }
            }
            
            semicolonOrFunctionBoundryEncountered = false;
            newlineEncountered = false;
        }
        
        if (type == 'word') {
            if (functionEncountered) {
                wordAfterFunction = token;
            }
            functionEncountered = false;
        }
        
        if (token === 'function') {
            /* keep a separate nesting depth counter for each nested function */
            nestingDepth.push(0);
            out.push(token);
            
            functionEncountered = true;
            wordAfterFunction = null;
        }
        else if (token === '{') {
            ++nestingDepth[nestingDepth.length-1];
            
            out.push(token);
            
            /* we have just entered a function body - insert the first part of the exception interception block */
            if (nestingDepth.length > 1 && nestingDepth[nestingDepth.length-1] === 1) {
                out.push(buildExceptionInterceptorStart(wordAfterFunction || '<anonymous>', filePath, line));
                semicolonOrFunctionBoundryEncountered = true;
            }
        }
        else if (token ==='}') {
            --nestingDepth[nestingDepth.length-1];
            
            /* we are about to exit a function body - insert the last part of the exception interception block */
            if (nestingDepth.length > 1 && nestingDepth[nestingDepth.length-1] === 0) {
                out.push(exceptionInterceptorEnd);
                nestingDepth.pop();
                semicolonOrFunctionBoundryEncountered = true;
            }
            
            out.push(token);
        }
        else {
            if (token === ';') {
                semicolonOrFunctionBoundryEncountered = true;
            }
            else if (token === '\n') {
                ++line;
                newlineEncountered = true;
            }
            else if (type == 'comment') {
                /* comments can span multiple lines so we need to adjust line count accordingly */
                var parts = token.split('\n');
                line += parts.length - 1;
            }
            out.push(token);
        }
    });
    var content=buildExceptionInterceptorStart('<toplevel>', filePath, 0) + out.join('') + exceptionInterceptorEnd;
	//fs.writeFile(path.join(__dirname, 'FinalFile.js'), content);
    callback(false, buildExceptionInterceptorStart('<toplevel>', filePath, 0) + 
           out.join('') + 
           exceptionInterceptorEnd);
}

//parses code to look for bugs. Currently just looks for nesting error
function checkBugs(text, callback) {
    var checkNesting= [];
    var line = 1;
    var error;
    
	jstok.tokenize(text, function(token, type) {
    	switch(token) {
        	case '{':
            	checkNesting.push(['{', line]);
            	break;
        	case '(':
            	checkNesting.push(['(', line]);
            	break;
        	case ')': 
            	checkNesting= checkForCorrectNesting(checkNesting, line, ')', function(bug) {
            		error= bug;
            	});
            	break;
        	case '}':
            	checkNesting= checkForCorrectNesting(checkNesting, line, '}', function(bug) {
            		error= bug;
            	});
            	break;
        	case '\n':
                ++line;
                break;
            default:
            	if (type == 'comment') {
                	/* comments can span multiple lines so we need to adjust line count accordingly */
                	var parts = token.split('\n');
                	line += parts.length - 1;
            	}
            	break;
        }
    });
    var depth= checkNesting.length;
    //unmatched left bracket
    if (depth>0) {
    	depth--;
    	callback( "Unmatched " + checkNesting[depth][0] + " at line" + checkNesting[depth][1]);
    } else {
    	callback(error);
    }
    
    //checks if nesting is correct and returns an error if not
    function checkForCorrectNesting(nestingArray, line, bracketType, callback) {
    //Check to ensure semicolons match
            var left= '(';
            var right= ')';

            if (bracketType==='}') {
                left= '{';
                right= '}';
            }
            if (bracketType===')') {
                left= '(';
                right= ')';
            }
            var depth= nestingArray.length;
            if (depth==0) {
                callback( "Unmatched " + right+ " on line " + line);
            }
            else if (nestingArray[depth-1][0]==left) {
                    nestingArray.pop();
            }
            else {
                callback( "Unmatched " + right + " on line " + line+"; Unmatched " + nestingArray[depth-1][1]+ " on line " + nestingArray[depth-1][1]);
            }
            return nestingArray;
    }
}


module.exports.addDebugStatements = addDebugStatements;
module.exports.checkBugs= checkBugs;

var fs = require('fs');
var path = require('path');

var debugStatementTemplate = 
    fs.readFileSync(path.join(__dirname, 'templates/debug-template.coffee')).toString().trim();
var exceptionInterceptorTemplate = 
    fs.readFileSync(path.join(__dirname, 'templates/exception-template.coffee')).toString().replace(/\n\r?/g, '').replace(/    /g, ' ');

var exceptionInterceptorParts = exceptionInterceptorTemplate.split('SPLIT');
var exceptionInterceptorStart = exceptionInterceptorParts[0].trim();
var exceptionInterceptorEnd = exceptionInterceptorParts[1].trim();

function buildDebugStatement(file, line, isDebuggerStatement) {
    return debugStatementTemplate
                .replace('__FILE__', file)
                .replace('__LINE__', line)
                .replace('__DEBUGGER__', isDebuggerStatement ? 'true' : 'false');
}

function addDebugStatements(filePath, text) {
    var coffee = require('coffee-script');
    
    var lines = text.split('\n');
    var out = [];
    
    lines.forEach(function(line, i) {
        var parts;
        var lineNum = i+1;
        
        if (line.match(/^\s*#/)) {
            return;
        }
        
        if (parts = line.match(/^(\s*)[^\s]+/)) {
            var isDebuggerStatement = !!line.match(/^\s*debugger/);
            out.push((parts[1] || '') + '('+ buildDebugStatement(filePath, lineNum, isDebuggerStatement) +');');
            out.push(line);
        }
    });

    return exceptionInterceptorStart + 
           coffee.compile(out.join('\n')) + 
           exceptionInterceptorEnd;
}


module.exports = {
    addDebugStatements: addDebugStatements
};


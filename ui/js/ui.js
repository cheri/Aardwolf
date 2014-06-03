'use strict';

var files = {};
var $codeContainer;
var $code;

var $continueBtn;
var $stepBtn;
var $stepOverBtn;
var $stepInBtn;
var $stepOutBtn;
var $stackTrace;

$(function() {
    $('#breakpoints').val(JSON.stringify([
        ['/calc.js', 11], ['/calc.js', 25], ['/calc.js', 37],
        ['/calc.coffee', 11], ['/calc.coffee', 21]
    ]));
    $('#eval').val("");
    
    $('#btn-update-breakpoints').click(updateBreakpoints);
    $('#btn-breakon-next').click(setBreakOnNext);
    $('#btn-eval').click(evalCodeRemotely);
    $('#btn-continue').click(breakpointContinue);
    $('#btn-step').click(breakpointStep);
    $('#btn-step-over').click(breakpointStepOver);
    $('#btn-step-in').click(breakpointStepIn);
    $('#btn-step-out').click(breakpointStepOut);
    $('#save-file').click(saveFile);
    $("#edit-new-file").click(getCode);    
    $('#file-switcher').change(switcherSwitchFile);
    
    $continueBtn = $('#btn-continue'); 
    $stepBtn = $('#btn-step');
    $stepOverBtn = $('#btn-step-over');
    $stepInBtn = $('#btn-step-in');
    $stepOutBtn = $('#btn-step-out');
    $stackTrace = $('#stack');
    $codeContainer = $('#code-container');
    $code = $('#code');
    
    loadSourceFiles();
    listenToServer();
    
    showFile({ file: $('#file-switcher').val() });
    writeToConsole("System is ready.  Load your server page and click run to begin.");
});

function initDebugger() {
    loadSourceFiles();
    postToServer({ command: 'set-breakpoints', data: JSON.parse($('#breakpoints').val()) }, '/desktop/outgoing');
}

function loadSourceFiles() {
    var fileList = getFromServer('/files/list');
    files = {};
    
    $('#file-switcher option').remove();
//    addToFileSwitcher('', '<select file>');

    fileList && fileList.files.forEach(function(f) {
        if(f.indexOf("archive")!=1) {
            var fdata = getFromServer('/files/data/'+f);
            files[f] = fdata.data;
            addToFileSwitcher(f, f);
        }
    });
}

function updateBreakpoints() {
    postToServer({ command: 'set-breakpoints', data: JSON.parse($('#breakpoints').val()) }, '/desktop/outgoing');
    paintBreakpoints($('#file-switcher').val());
}


function setBreakOnNext() {
    postToServer({ command: 'break-on-next', data: JSON.parse($('#breakpoints').val()) }, '/desktop/outgoing');
}

function evalCodeRemotely() {
    processOutput('Type any simple JavaScript you would like to run here.');
    postToServer({ command: 'eval', data: $('#eval').val() }, '/desktop/outgoing');
}

function breakpointContinue() {
    removeLineHightlight();
    disableContinueAndStep();
    clearStackTrace();
    postToServer({ command: 'breakpoint-continue' }, '/desktop/outgoing');
}

function breakpointStepCommand(command) {
    removeLineHightlight();
    disableContinueAndStep();
    clearStackTrace();
    postToServer({ command: command }, '/desktop/outgoing');
}

function breakpointStep(command) {
    breakpointStepCommand('breakpoint-step');
}

function breakpointStepOver() {
    breakpointStepCommand('breakpoint-step-over');
}

function breakpointStepIn() {
    breakpointStepCommand('breakpoint-step-in');
}

function breakpointStepOut() {
    breakpointStepCommand('breakpoint-step-out');
}

function addToFileSwitcher(filePath, fileLabel) {
    $('<option></option>').val(filePath).text(fileLabel).appendTo($('#file-switcher'));
}

function switcherSwitchFile() {
    showFile({ file: $('#file-switcher').val() });
}

function postToServer(payload, place) {
    var req = new XMLHttpRequest();
    req.open('POST', place, false);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(payload));
}

function getFromServer(path) {
    var req = new XMLHttpRequest();
    req.open('GET', path, false);
    req.send();
    return safeJSONParse(req.responseText);
}

function listenToServer() {
    var req = new XMLHttpRequest();
    req.open('GET', '/desktop/incoming', true);
    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            var data = safeJSONParse(req.responseText);
            if (data) {
                processOutput(data);
            }
            listenToServer();
        }
    };
    req.send(null);
}

function showBreakpoint(data) {
    showFile(data);
    $('#file-switcher').val(data.file);
    $stackTrace.text(data.stack.join('\n'));
}

function showFile(data) {
    var codeTokens = [];
    var keywordList;
    var literalList;
    var tokenize;
    
    if (fileExt(data.file) == 'coffee') {
        keywordList = keywordListCoffeeScript;
        literalList = literalListCoffeScript;
        tokenize = tokenizeCoffeeScript;
        
        $('#controls-coffeescript').show();
        $('#controls-javascript').hide();
    }
    else {
        keywordList = keywordListJavaScript;
        literalList = literalListJavaScript;
        tokenize = tokenizeJavaScript;
        
        $('#controls-coffeescript').hide();
        $('#controls-javascript').show();
    }
    
    tokenize(files[data.file] || '', function(token, type) {
        var pre = '';
        var post = '';
        
        if (type === 'word' && keywordList.indexOf(token) > -1) {
            pre = '<span class="keyword">';
            post = '</span>';
        }
        else if (type === 'word' && literalList.indexOf(token) > -1) {
            pre = '<span class="literal">';
            post = '</span>';
        }
        else if (['string', 'comment', 'number'].indexOf(type) > -1) {
            pre = '<span class="'+type+'">';
            post = '</span>';
        }
        
        codeTokens.push(pre);
        codeTokens.push(token.replace(/</g, '&lt;'));
        codeTokens.push(post);
    });
    
    var codeLines = codeTokens
        .join('')
        .split('\n')
        .map(function(x, i) {
            var num = String(i+1);
            var paddedNum = '<span class="linenum" file="'+data.file+'" line="'+num+'">' + 
                            '      '.substr(num.length) + num + ' ' +
                            '</span>';
            return paddedNum + ' ' + x;
        });

    $code.html(codeLines.join('\n'));
    $code.find('.linenum').click(toggleBreakpoint);
    paintBreakpoints(data.file);
    
    var numLines = codeLines.length;
    var textAreaHeight = $codeContainer.height();
    var textAreaContentHeight = $codeContainer[0].scrollHeight;
    var codeHeight = $code.height();
    var heightPerLine = codeHeight / numLines;
    
    if (data.line) {
        highlightLine(data.line, numLines);
        enableContinueAndStep();
    }
    
    if (textAreaContentHeight > textAreaHeight) {
        var scrollAmountPerLine = (textAreaContentHeight - textAreaHeight) / numLines;
        var scrollTo = Math.round(data.line * scrollAmountPerLine);
        $codeContainer.scrollTop(scrollTo);
    }
}

function highlightLine(line, numLines) {
    var codeHeight = $code.height();
    var heightPerLine = codeHeight / numLines;
    $code.css({
        'background-image': 'url("img/breakpoint-arrow.png"), url("img/breakpoint-bg.png")',
        'background-repeat': 'no-repeat, no-repeat, repeat-y',
        'background-size': '9px 7px, 100% '+Math.round(heightPerLine)+'px',
        'background-position': '5px '+Math.round((line - 1) * heightPerLine + ((heightPerLine - 7) / 2))+'px, '+
                               '0px '+Math.round((line - 1) * heightPerLine)+'px'
    });
}

function removeLineHightlight() {
    $code.css({ 'background-image': '' });
}

function paintBreakpoints(file) {
    $code.find('.linenum').each(function(i, elem) {
        if (existsBreakpoint(file, i+1)) {
            $(elem).addClass('breakpoint');
        }
        else {
            $(elem).removeClass('breakpoint');
        }
    });
}
    
function existsBreakpoint(f, l) {
    var breakpoints = safeJSONParse($('#breakpoints').val()) || [];
    return breakpoints.filter(function(b) { return b[0] == f && b[1] == l; }).length > 0;
}

function toggleBreakpoint() {
    var breakpoints = safeJSONParse($('#breakpoints').val());
    if (breakpoints === null) {
        alert('Could not parse the list of breakpoints!');
        return;
    }
    
    var $marker = $(this);
    var file = $marker.attr('file');
    var line = $marker.attr('line');
    if (existsBreakpoint(file, line)) {
        $(this).removeClass('breakpoint');
        
        breakpoints = breakpoints.filter(function(b) { return !(b[0] == file && b[1] == line); });
        $('#breakpoints').val(JSON.stringify(breakpoints));
    }
    else {
        $(this).addClass('breakpoint');
        
        breakpoints.push([file, line]);
        $('#breakpoints').val(JSON.stringify(breakpoints));
    }
    
    updateBreakpoints();
}

function enableContinueAndStep() {
    $continueBtn.attr('disabled', null);
    $stepBtn.attr('disabled', null);
    $stepOverBtn.attr('disabled', null);
    $stepInBtn.attr('disabled', null);
    $stepOutBtn.attr('disabled', null);
}

function disableContinueAndStep() {
    $continueBtn.attr('disabled', true);
    $stepBtn.attr('disabled', true);
    $stepOverBtn.attr('disabled', true);
    $stepInBtn.attr('disabled', true);
    $stepOutBtn.attr('disabled', true);
}

function clearStackTrace() {
    $stackTrace.text('');
}

function processOutput(data) {
    switch (data.command) {
        case 'mobile-connected':
            writeToConsole('Mobile device connected.');            
            initDebugger();
            break;
        case 'update-breakpoints-from-file':
        	$('#breakpoints').val(JSON.stringify(data.breakpoints));
        	updateBreakpoints();
        	break;
        case 'save-success':
        	loadSourceFiles();
        	writeToConsole('<b> File ' + data.file+' has been saved and loaded to Aardwolf GUI. Reload your server\'s page to upload it to your server.</b>');            
        	
        	$('#file-switcher').val(data.file);
            break;
        case 'save-failed':
            writeToConsole('<b> File ' + data.file + ' did not save due to an error. Bug Report:'+ data.bug); 
            break;
        case 'print-message': 
            writeToConsole('<b>'+data.type + '</b>: ' + data.message);
            break;
        case 'print-eval-result':
            if (data.input=="'Type any simple JavaScript you would like to run here.'"||data.input==""){
                 writeToConsole('RESULT: Program has executed.');    
            }
            else{
                writeToConsole('<b>EVAL</b> INPUT: ' + data.input + ' RESULT: ' + data.result);    
            }
            break;
        case 'report-exception':
            writeToConsole('<b>EXCEPTION</b>: ' + data.message + ' at ' + data.file + ', line ' + data.line);
            break;
        case 'report-breakpoint':
            writeToConsole('<b>BREAKPOINT</b>: '+ data.file + ', line ' + data.line);
            showBreakpoint(data);
            break;
        default:
            // check for bad code before stating unclear response
            writeToConsole('Response unclear. Possible breakpoint, failed connection, or inadequate input received.');    
    }
}

function safeJSONParse(str) {
    try {
        return JSON.parse(str);
    } catch (ex) {
        return null;
    }
}

var lineNum = 0;
function writeToConsole(msg) {
    if ($("#hide-show-output").data('state') == 'off'){
        document.getElementById("output-warn").style.display = 'inline';
    }
    else{
        document.getElementById("output-warn").style.display = 'none';
    }
    $('<div></div>').html((++lineNum) + ': ' + msg).appendTo($('#output'))[0];//.scrollIntoView();
}


function fileExt(fileName) {
    return fileName.split('.').slice(-1)[0];
}

function fixContent(str){
    str = str.replace(/<div><br>/g, '\n');
    str = str.replace(/<div>/g, '\n');

    str = str.replace(/<\/div>/g, '');
    str = str.replace(/<br>/g, '\n');
    str = str.replace(/&nbsp;/g,' ')

    return str;
}

function saveFile(){
    var textBox = document.getElementById('editcode');
    var content;

    if (textBox.outerHTML)   content = textBox.innerHTML;
    else if (XMLSerializer) content = new XMLSerializer().serializeToString(textBox);   
    content = fixContent(content);      
    postToServer({ command: 'save-file', data: content, filename: $('#file-switcher').val()}, '/desktop/save');           
}

function getCode(){    
    // if ($('#file-switcher').val() != ""){
        var data = { file: $('#file-switcher').val() };         
        jQuery('#editcode').text(files[data.file]);    
    // }
    // else{
    //     writeToConsole("Please select a file to edit.");
    // }
}

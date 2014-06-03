
Golden Scarab is a simple branch on Aardwolf for CMPE202 at Santa Cruz 2014.
Remote JavaScript debugger for Android / iOS / Windows Phone 7 / BlackBerry OS 6+
It's written in JavaScript and node.js. It's available under the MIT license.

It allows:
* breakpoints
* code evaluation at breakpoint
* break on next
* step/continue execution control
* stack listing
* exception reporting (also for exceptions thrown in async calls)
* JavaScript console remoting
* Editing and saving files through the GUI

Currently it runs on both Firefox and Chrome. 
NOTES FOR CMPE202
-----------------------------------------------------------------------------------------------
The current version of Aardwolf never worked for us and crashed often. We rolled it back to the Nov 2011 version
and added in some features from future versions and some of our own. 
Below are our additions:
  *BUGS:
   *Remote server crashed if code to debug had nesting errors  
		**Solution: created a nesting check before uploading
   *Remote Server crashed with no reason
        **Solution: created better asynchronous error reporting
        
  *LACK OF VERBOSItY:
   *system was hard to run even after reading the read me and gui also seemed to bug often
   *config-local file seemed more trouble than it was worth
        **Solution: 1. added clearer instructions on runnign the app in default mode.
                  ***2. Ensured the deault mode automatically chose an ip for you
                  ***3. Added help menu to the GUI
                  ***4. More vocal in console about events occuring
                  ***5. Removed config-local to be needed as a default
   *User Interface Design:
   *system was not intuitive and had too many places for input
          ** Solution:
                  ***1. Console output that could be hidden but told you if it had new imput
                  ***2. Buttons and screens moved around for better usability.
                  ***3. Overall look improved and more intuitive
               
   *EDIT AND SAVE FILE:
    *user had to shut down servers to edit and then reload files into GUI
    *GUI was read-only so you could not act 
         **Solution: 1. Asynchronous file copying
                   ***2. Separate area that allows you to edit code
                   ***3. Edit and save buttons, allowing user to edit inside the gui and save file
                   ***4. Archive: archives the previous versions in case the user accidentally overwrites something
                            ****Note: archives do not pop up in the GUI
                   ***5. Prevents file loss: copies over previous file before replacing it so if server goes down you wont lose both                   
                   ***6. Checks nesting errors: to ensure File Server doesn't crash before uploading file
                   ***7. Reports whether the file save was a a success or a failure and why
   

SET UP
-----------------------------------------------------------------------------------------------
Listed below are the modified startup instructions. 
* Begin by installing node.js
* Download the required libraries by running "npm link" or "sudo npm link" in this directory 
* Start the server by running "node app.js" in this directory
* After the server starts up, open the specified ip for AardwolfServer in your desktop browser. The debugger UI should appear.
* Open on your phone or browser and wait for the page to load. The line "Mobile device connected." should appear in the UI's output panel.
* You're now debugging the "calculator" example script.
* Click on the help button for further instructions


If you're having problems opening the example, make sure that access to the default port (8500) on your computer is not blocked by a firewall and that the address you entered into the config file can really be accessed from your phone. This is where your phone will load the samples from, so it must work.

You will get best results by connecting both you computer and your phone to the same WiFi network.

 DEBUGGING YOUR OWN CODE
-----------------------------------------------------------------------------------------------
The procedure is the same as above, except:

* When starting the server, add an additional parameter called -d or --file-dir, like this:  
    `node app.js -h <ip-or-hostname-of-your-computer> -d </path/to/www/root>`
* You can also change the config.default file to point apprioprately to your server 

* In your HTML page include the aardwolf.js debug library as the very first JS file and change the paths of included files to point to the files modified by Aardwolf: Your code should read something like this:
    <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js"></script>
    <script type="text/javascript" src="http://__SERVER_HOST__:__FILE_SERVER_PORT__/aardwolf.js"></script>
    <script type="text/javascript" src="http://__SERVER_HOST__:__FILE_SERVER_PORT__/yourprevjavascriptfile.js"></script>
* Reload the debugger UI first, then reload the page you just modified. The line "Mobile device connected." should appear in the UI's output panel.
* You should now be able to evaluate code remotely, set breakpoints, etc.

Other Original Instructions from Aardwolf
========
It allows:
* breakpoints
* code evaluation at breakpoint
* break on next
* step/continue execution control
* stack listing
* exception reporting (also for exceptions thrown in async calls)
* JavaScript console remoting
Aardwolf is a remote JavaScript debugger for Android / iOS / Windows Phone 7 / BlackBerry OS 6+ and is written in JavaScript and node.js. It's available under the MIT license.


It consists of the following parts:

* a server for communication between the mobile device and the UI
* a code rewriter which injects debug info into your existing source code
* a debug library which can break execution of your scripts, report execution progress, evaluate code, etc.
* a UI for setting breakpoints, stepping through code and seeing the current position within the script


In order to run the examples you will need:

* Node.js. Get it here: http://nodejs.org/#download
* An Android 2.x/iOS/WindowsPhone7 device or emulator (although running them from a Firefox/Chrome/Safari window will also work)


CoffeeScript support
----------------------------------------------------------------------------------------------------

Aardwolf now also contains extrememly basic CoffeeScript support. It probably can't handle any serious real-world code, but it's a good starting point if someone wishes to fork the source and work on it.

The steps for debugging the CoffeeScript example are the same as the steps described above, except:

* Replace calc.html with calc-coffee.html in the final step when opening the example.


Debugging processed or minified code
----------------------------------------------------------------------------------------------------

If you wish to debug code which gets concatenated into a single file, minified, or transformed in some other way, you can still use Aardwolf, but you'll need to make a minor change in the part of your application which reads the code before it gets transformed.

It is important that Aardwolf can access source files before they are processed. Therefore you will need to set it up just as described in the previous section, with the '-d' parameter pointing to the directory containing unprocessed files, then change the processing code in you application so it reads files served by Aardwolf instead of reading them straight from the filesystem.

For example, if your code looks something like this:

    jscode += readFile('some-script.js');
    jscode += readFile('some-other-script.js');

you would need to change it to something like this:
    
    jscode += readFile('http://aardwolf-host:8500/aardwolf.js'); // Don't forget to include this!
    jscode += readFile('http://aardwolf-host:8500/some-script.js');
    jscode += readFile('http://aardwolf-host:8500/some-other-script.js');

In most languages, making the modification should be pretty straightforward. PHP's `file_get_contents($url)` and Clojure's `(slurp url)` will handle the change from local paths to URLs transparently. In Scala you can use `io.Source.fromURL(url).mkString`, Ruby has the 'OpenURI' module and in NodeJS you should be able to read remote files using the 'request' module.

Now you should be ready to debug processed code. And since Aardwolf has access to the original files, its UI will display the original, unprocessed code for easier debugging.


How it works
----------------------------------------------------------------------------------------------------

Breaking code execution and evaluating code at that point is enabled by code rewriting. Aardwolf's server contains a rather simple code rewriter which inserts debug hooks in front of every statement in the source code. These debug statements look like this:

    Aardwolf.updatePosition(  
        "/calc.js", // File path  
        7,          // Line number  
        false,      // Is current line a "debugger;" statement?  
        function(aardwolfEval) {       // This closure captures the current scope and makes it  
            return eval(aardwolfEval); // possible to pass it into another function.  
        }  
    );  

The first two parameters – file path and line number – should be self explanatory. Every time `Aardwolf.updatePosition()` is called, the given file and line number are checked against a list of breakpoints, and if a match is found, script execution is halted by performing a synchronous XMLHttpRequest to the server.

The third parameter signals whether the current line contains a `debugger;` statement. If it does, we must break execution even if there is no breakpoint set on that line.

Finally, the last parameter is a closure which captures the scope it's defined in and allows us to pass it around. When a string is passed to this function for evaluation, it will be eval'd in the same scope where this closure was defined, thus enabling us to evaluate code at the point where script execution was halted.
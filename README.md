# Irrelon SyncScript
> ES6 has made async/await available and makes this project redundant, it is however still a great project to learn how to use ASTs to manipulate / extend exising language functionality.

Write clean, readable synchronous JavaScript code and output to callback-based async code automatically.
Compiles to readable, compatible JS code that runs everywhere and on every browser. No libraries or
dependencies, just clean code.

SyncScript is compatible with "normal" JavaScript and you can still write callback-style code if you want
to. All features and functionality of JavaScript is still available and left unaffected by SyncScript. All
existing libraries are compatible and will remain unaffected by the compilation process.

You can still interface with standard callback-based code and libraries as usual or by using the SyncScript
sync() method to call an async method synchronously.

## Why?
If you've coded in JavaScript for any length of time you will know that pretty soon you start to
pile up tons of callbacks (callback-hell as it is sometimes referred). You hate it, I hate it and
so does everyone else that codes in JS but it is a necessary evil... or is it?

## Synchronous Code in an Async World
Imagine that instead of writing:

```
getHtmlFromUrl('http://www.myserver.org/someHtmlFile.html', function (err, response, body) {
  if (!err && response.status === 200) {
    $('body').append(body);
  }
});
```

You could just write:

```
var err, response, body = sync(getHtmlFromUrl('http://www.myserver.org/someHtmlFile.html'));
if (err || response.status !== 200) return;
$('body').append(body);
```

Notice how we threw away the callback function and just used the err, repsonse and body variables as if they were immediately
defined? This is how Irrelon SyncScript looks. You'll also notice that when an async method has multiple
return values we simply define multiple variables to collect them:

```
var err, response, body = sync(getHtmlFromUrl('http://www.myserver.org/someHtmlFile.html'));
```

Let's look at another example where you want to do a lot of calls where each is async and you need to wait for each one
to complete before executing the next (waterfall pattern):

```
asyncCall(null, function (err, data1) {
  if (!err) {
    asyncCall(data1, function (err, data2) {
      if (!err) {
        asyncCall(data2, function (err, data3) {
          if (!err)  {
            // Yay we have our final data in data3
          }
        });
      }
    });
  }
});
```

Now look at how you would write that in SyncScript:

```
var err1, data1 = sync(asyncCall(null));
if (err1) return;

var err2, data2 = sync(asyncCall(data1));
if (err2) return;

var err3, data3 = sync(asyncCall(data2));
if (err3) return;
// Yay we have our final data in data3
```

Synchronous code is easier to read and understand and requires less boilerplate effort and more of what
actually makes your application work.

Keep in mind that even though it appears to do so, SyncScript is NOT blocking the thread and does not
interupt execution of code. This means that your code stays responsive and does not cause UI or threads
to block.

## Setting Callback Scope
You can section areas of code into waiting for async calls to complete or not by wrapping them in curly
braces. Take the following code for example. The second call to addSync waits for the first to finish before it is executed:

```
var err, myVal = sync(addAsync(1, 2, 3, 4));
console.log(myVal);

var err, myVal = sync(addAsync(1, 2, 3, 4));
console.log(myVal);
```

What if you want both async calls to execute at the same time in parallel? You can achieve this by wrapping each call
and it's dependant code in braces:

```
{
	var err, myVal = sync(addAsync(1, 2, 3, 4));
	console.log(myVal);
}

{
	var err, myVal = sync(addAsync(1, 2, 3, 4));
	console.log(myVal);
}
```

Now both calls will execute in parallel and return in whichever order they complete in.

## How to Use It

### Installation via NPM
Install SyncScript via npm:

	npm install -g syncscript

### Use From Command Line
To compile a SyncScript file to JavaScript you can use the command line:

	syncscript <yourinputfile.js>

E.g.

	syncscript ./test/guineaPig.js

Output is sent to stdout. If you prefer the output to be saved to a file, present the -out option
with the command:


	syncscript <yourinputfile.js> -out <youroutputfile.js>

E.g.

	syncscript ./test/guineaPig.js -out ./test/output.js

You can also output the AST used to generate the output via the -ast option:



	syncscript <yourinputfile.js> -ast <yourastfile.js>

E.g.

	syncscript ./test/guineaPig.js -ast ./ast.json

### Use From JetBrains IDE via File Watcher
File watchers auto-execute programs against your code as you make changes. A good example would be Google's
closure compiler which you can set up in WebStorm or PHPStorm to auto-compile and minify your JavaScript
code as you make changes.

Since SyncScript's command-line interface supports both file-based output and stdout you can use a file
watcher to compile your SyncScript code on the fly as you make changes into a normal JavaScript file.

Further instructions and screenshots coming shortly...

### Using Compiler in Your Own Node.js Projects
This section is being updated, please hang tight! SyncScript works by compiling your source code to standard JavaScript
callbacks and requires Node.js to do the compilation part. Once the output file is generated it can run on all browsers
and Node.js as if you wrote the callback-hell version yourself.

In this section I will describe how to use SyncScript as a compiler from the command line, as a file-watcher in JetBrains
IDEs such as WebStorm and PHPStorm and also how to include it in your own Node.js applications so you can take the compiled
output and do further processing to the code.

### Online Compiler Service
Instead of installing SyncScript you can send your code to the online compiler service or paste it into the
compiler page to instantly see the compiler output.

Further instructions for the online compiler service coming shortly...

### Technical Details and How It Works
SyncScript transpiles to an AST after which the tree is analysed, sync calls are identified and then the
AST is modified to produce callback-based code where the sync calls are. After modification of the AST it
is taken and re-compiled back into JavaScript.

## Copyright and License
SyncScript is copyright Irrelon Software Limited and license under the open-source MIT license.

## Contributing, Issues and Bugs
Contributions and pull requests are welcome! If you have any issues or find any bugs please log them in the GitHub issue 
tracker for this repo.

### Roadmap

#### 1.1.0
* Optional language extensions - sleep and finish

###### Sleep
Call a sleep method mid-code to pause execution for the specified number of milliseconds:

```
console.log(new Date())
sleep(1000);
console.log(new Date()) 
```

###### Finish
Pass comma-separated async calls to finish() and code will wait for all the passed calls to complete
before executing the next lines of code:

```
var err, response, body = finish(
	request('http://www.google.com'),
	request('http://www.irrelon.com')
);

// Console log the google response
console.log(err[0], response[0], body[0]);

// Console log the irrelon response
console.log(err[1], response[1], body[1]);
```

The results are stored in the err, response and body variables as an array and are assigned to the
index that the call corresponds to, so the request to google.com's err, response and body values are
stored in err[0], response[0] and body[0], while the request to irrelon.com has it's results stored
in err[1], response[1] and body[1].

#### 1.2.0
* Better documentation
* Source code JSDoc commenting

#### 1.3.0
* Unit tests coverage

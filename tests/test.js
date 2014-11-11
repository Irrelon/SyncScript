var IrrelonSyncParser = require('../index.js').Parser,
	fs = require('fs'),
	code = fs.readFileSync('guineaPig.js');

var parser = new IrrelonSyncParser();

parser.awaitName('sync');
newCode = parser.parse(code);

console.log(newCode);
var esprima = require('esprima'),
	estraverse = require('estraverse'),
	escodegen = require('escodegen'),
	AstTree = require('./AstTree.js');

var Parser = function () {
	this._debugOn = true;
	this._tabs = [];
	this._awaitName = 'sync';
};

Parser.prototype.awaitName = function (val) {
	if (val !== undefined) {
		this._awaitName = val;
		return this;
	}

	return this._awaitName;
};

Parser.prototype.debug = function (val1, val2) {
	if (this._debugOn) {
		if (val1.substr(0, 'Pulling'.length) === 'Pulling') {
			this._tabs.pop();
		}

		console.log(this._tabs.join('')  + ' ', val1, val2);

		if (val1.substr(0, 'Pushing'.length) === 'Pushing') {
			this._tabs.push('----');
		}
	}
};

Parser.prototype.bodyIndex = function (bodyArr, node) {
	var indexOfNode = -1;

	bodyArr.forEach(function (item, index) {
		estraverse.traverse(item, {
			enter: function (currentNode) {
				if (currentNode === node) {
					indexOfNode = index;
					this.break();
				}
			}
		});
	});

	return indexOfNode;
};

Parser.prototype.sync = function (node, astTree) {
	var self = this,
		currentBlock = node.block(),
		bodyElems,
		awaitBodyIndex,
		resultVars = [],
		resultVarNames = [],
		newCode,
		range,
		breakOn,
		varDec,
		run,
		i;

	awaitBodyIndex = node.blockIndex();

	// Get the parent variable delcaration
	varDec = node.parent('VariableDeclaration');
	astTree.find(function (item) {
		if (item.type() === 'VariableDeclarator' && item.parent() === varDec) {
			resultVarNames.push(item.get('id').name);
		}
	}, varDec);

	// Determine which block type we are dealing with and normalise
	switch (currentBlock.type()) {
		case 'Program':
		case 'BlockStatement':
			bodyElems = currentBlock.body();
			breakOn = '';
			range = [awaitBodyIndex + 1, bodyElems.length];
			run = true;
			break;

		case 'SwitchCase':
			bodyElems = currentBlock.body();
			breakOn = 'BreakStatement';
			range = [awaitBodyIndex + 1];
			run = true;

			// Find the break statement
			for (i = awaitBodyIndex + 1; i < bodyElems.length; i++) {
				if (bodyElems[i] && bodyElems[i].type === 'BreakStatement') {
					// Found the break for this case, record it
					range[1] = i;
					break;
				}
			}

			if (range[1] === undefined) {
				// No end point, don't run
				run = false;
			}
			break;

		default:
			break;
	}

	if (run) {
		if (!resultVarNames) {
			resultVarNames = ['__returnData'];
		}

		resultVarNames.forEach(function (varName) {
			resultVars.push({
				"type": "Identifier",
				"name": varName
			});
		});

		if (awaitBodyIndex > -1) {
			// Get the current call details (the method the async call should actually call)
			var callDetails = node.get('arguments')[0];

			// Move all existing body elements inside this call
			var newArgs = callDetails.arguments.concat([{
				"type": "FunctionExpression",
				"id": null,
				"params": resultVars,
				"defaults": [],
				"body": {
					"type": "BlockStatement",
					"body": bodyElems.slice(range[0], range[1])
				},
				"rest": null,
				"generator": false,
				"expression": false
			}]);

			var newAwait = {
				"type": "ExpressionStatement",
				"expression": {
					"type": "CallExpression",
					"callee": callDetails.callee,
					"arguments": newArgs
				}
			};

			bodyElems.splice(awaitBodyIndex, bodyElems.length - awaitBodyIndex);
			bodyElems.push(newAwait);

			newCode = escodegen.generate(astTree._ast);
			//if (require('fs').existsSync('out.js')) { require('fs').unlinkSync('out.js'); }
			//require('fs').writeFileSync('out.js', newCode);
			self.ast = esprima.parse(newCode);

			return true;
		}
	}

	return false;
};

Parser.prototype.parse = function (code) {
	var self = this,
		contextStack = {
			BlockStatement: [],
			VariableDeclaration: [],
			VariableDeclarator: [],
			ExpressionStatement: [],
			AssignmentExpression: [],
			currentBlockStatement: function (val) {
				if (val !== undefined) {
					this.BlockStatement[this.BlockStatement.length - 1] = val;
					return this;
				}

				return this.BlockStatement[this.BlockStatement.length - 1];
			},

			currentVariableDeclaration: function (val) {
				if (val !== undefined) {
					this.VariableDeclaration[this.VariableDeclaration.length - 1] = val;
					return this;
				}

				return this.VariableDeclaration[this.VariableDeclaration.length - 1];
			}
		},
		found = true,
		astTree;

	self.ast = esprima.parse(code);

	while (found) {
		astTree = new AstTree(self.ast);
		//if (require('fs').existsSync('ast.json')) { require('fs').unlinkSync('ast.json'); }
		//require('fs').writeFileSync('ast.json', JSON.stringify(self.ast));

		var syncCalls = astTree.find(function (node) {
			var type = node.type(),
				callName;

			if (node.type() === 'CallExpression') {
				callName = node.obj().callee.name;

				if (callName === self._awaitName) {
					return true;
				}
			}
		});

		if (syncCalls.length) {
			self.sync(syncCalls[0], astTree);
			found = true;
		} else {
			found = false;
		}
	}

	return escodegen.generate(self.ast);
};

module.exports = {
	Parser: Parser
};
var esprima = require('esprima'),
	estraverse = require('estraverse'),
	escodegen = require('escodegen');

var Parser = function () {
	this._debugOn = false;
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
		found = true;

	self.ast = esprima.parse(code);
	//require('fs').writeFileSync('ast.json', JSON.stringify(self.ast));

	while (found) {
		found = false;

		estraverse.replace(self.ast, {
			enter: function (currentNode, currentParent) {
				switch (currentNode.type) {
					case 'Program':
						contextStack.BlockStatement.push(currentNode);
						break;

					case 'BlockStatement':
						contextStack.BlockStatement.push(currentNode);
						break;

					case 'VariableDeclaration':
						if (contextStack.BlockStatement.length) {
							self.debug('Pushing VariableDeclaration');
							contextStack.VariableDeclaration.push({
								node: currentNode,
								vars: []
							});
						}
						break;

					case 'VariableDeclarator':
						if (contextStack.VariableDeclaration.length) {
							self.debug('Pushing VariableDeclarator: ' + currentNode.id.name);
							contextStack.currentVariableDeclaration().vars.push(currentNode.id.name);
						}
						break;

					case 'ExpressionStatement':
						self.debug('Pushing ExpressionStatement');
						contextStack.ExpressionStatement.push(currentNode);
						break;

					case 'AssignmentExpression':
						self.debug('Pushing AssignmentExpression: ' + currentNode.left.name);
						contextStack.AssignmentExpression.push(currentNode);
						break;

					case 'CallExpression':
						if (currentNode.callee.name === self._awaitName) {
							// We have encountered our special await call
							// Check what it is encapsulated inside
							if (contextStack.VariableDeclaration.length) {
								// New variable delcared as result of await
								var assignTo = contextStack.currentVariableDeclaration().vars;
								self.debug('Call to await assignment to new variable: ', assignTo);

								found = self.newAwait(contextStack, currentNode, assignTo);
								this.break();
							} else if (contextStack.AssignmentExpression.length) {
								// Existing variable expression declared as result of await
								//var assignTo = contextStack.AssignmentExpression[contextStack.AssignmentExpression.length - 1].left.name;
								//self.debug('Call to await assignment to expression: ' + assignTo);
								// We don't want to support this type of call (ie no var at front)
							} else {
								// No expression, just a call to await
								self.debug('Call to await unnamed');

								// Find location index of this await
								found = self.newAwait(contextStack, currentNode);
								this.break();
							}
						}
						break;
				}
			},
			leave: function (currentNode, currentParent) {
				switch (currentNode.type) {
					case 'Program':
						return contextStack.BlockStatement.pop();
						break;

					case 'BlockStatement':
						return contextStack.BlockStatement.pop();
						break;

					case 'VariableDeclaration':
						if (contextStack.BlockStatement.length) {
							self.debug('Pulling VariableDeclaration');
							contextStack.VariableDeclaration.pop();
						}
						break;

					/*case 'VariableDeclarator':
						if (contextStack.BlockStatement.length) {
							self.debug('Pulling VariableDeclarator: ' + contextStack.VariableDeclarator[contextStack.VariableDeclarator.length - 1].id.name);
							contextStack.VariableDeclarator.pop();
						}
						break;*/

					case 'ExpressionStatement':
						self.debug('Pulling ExpressionStatement');
						contextStack.ExpressionStatement.pop();
						break;

					case 'AssignmentExpression':
						self.debug('Pulling AssignmentExpression: ' + contextStack.AssignmentExpression[contextStack.AssignmentExpression.length - 1].left.name);
						contextStack.AssignmentExpression.pop();
						break;

					case 'CallExpression':
						break;
				}
			}
		});
	}

	return escodegen.generate(self.ast);
};

Parser.prototype.newAwait = function (contextStack, currentNode, resultVarNames) {
	var self = this,
		bodyElems = contextStack.currentBlockStatement().body,
		awaitBodyIndex = self.bodyIndex(bodyElems, currentNode),
		resultVars = [];

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
		var callDetails = currentNode.arguments[0];

		// Move all existing body elements inside this call
		var newArgs = callDetails.arguments.concat([{
			"type": "FunctionExpression",
			"id": null,
			"params": resultVars,
			"defaults": [],
			"body": {
				"type": "BlockStatement",
				"body": bodyElems.slice(awaitBodyIndex + 1, bodyElems.length)
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

		return true;
	}

	return false;
};

module.exports = {
	Parser: Parser
};
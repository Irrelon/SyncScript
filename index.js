// Node.js Environment
var code,
	ast,
	fs = require('fs'),
	esprima = require('esprima'),
	estraverse = require('estraverse'),
	escodegen = require('escodegen'),
	newCode,
	found = true;

code = fs.readFileSync('test.js');
ast = esprima.parse(code);

//fs.writeFileSync('ast.json', JSON.stringify(ast));

while (found) {
	found = false;
	estraverse.replace(ast, {
		enter: function (node, parent) {
			var replacementBlock;

			// Find block statements
			if (node.type === 'BlockStatement') {
				var i,
					body = node.body,
					count = body.length;

				for (i = 0; i < count; i++) {
					// Find any variable declaration and check for a call to await
					(function (bodyNode, i) {
						estraverse.traverse(bodyNode, {
							enter: function (node, parent) {
								if (node.type === 'ExpressionStatement') {
									estraverse.traverse(node, {
										enter: function (node, parent) {
											if (node.type === 'AssignmentExpression') {
												if (node && node.left) {
													var assignmentTo = node.left.name;

													// Check if the declaration was a call to await
													estraverse.traverse(node, {
														enter: function (node, parent) {
															if (node.type === 'CallExpression' && node.callee.name === 'await') {
																found = true;
																replacementBlock = {
																	"type": "BlockStatement",
																	"body": [{
																		"type": "ExpressionStatement",
																		"expression": {
																			"type": "CallExpression",
																			"callee": {
																				"type": "MemberExpression",
																				"computed": false,
																				"object": {
																					"type": "ThisExpression"
																				},
																				"property": {
																					"type": "Identifier",
																					"name": "async"
																				}
																			},
																			"arguments": [
																				{
																					"type": "Literal",
																					"value": "moo",
																					"raw": "'moo'"
																				},
																				{
																					"type": "FunctionExpression",
																					"id": null,
																					"params": [
																						{
																							"type": "Identifier",
																							"name": "err"
																						},
																						{
																							"type": "Identifier",
																							"name": assignmentTo
																						}
																					],
																					"defaults": [],
																					"body": {
																						"type": "BlockStatement",
																						"body": body.slice(i + 1, body.length)
																					},
																					"rest": null,
																					"generator": false,
																					"expression": false
																				}
																			]
																		}
																	}]
																};
															}
														}
													});
												}
											}
										}
									});
								}

								if (node.type === 'VariableDeclarator') {
									var assignmentTo = node.id.name;

									// Check if the declaration was a call to await
									estraverse.traverse(node, {
										enter: function (node, parent) {
											if (node.type === 'CallExpression' && node.callee.name === 'await') {
												// Make the loop go round again
												found = true;

												var bodyItems = body.slice(i + 1, body.length);

												replacementBlock = {
													"type": "BlockStatement",
													"body": [{
														"type": "ExpressionStatement",
														"expression": {
															"type": "CallExpression",
															"callee": {
																"type": "MemberExpression",
																"computed": false,
																"object": {
																	"type": "ThisExpression"
																},
																"property": {
																	"type": "Identifier",
																	"name": "async"
																}
															},
															"arguments": [
																{
																	"type": "Literal",
																	"value": "moo",
																	"raw": "'moo'"
																},
																{
																	"type": "FunctionExpression",
																	"id": null,
																	"params": [
																		{
																			"type": "Identifier",
																			"name": "err"
																		},
																		{
																			"type": "Identifier",
																			"name": assignmentTo
																		}
																	],
																	"defaults": [],
																	"body": {
																		"type": "BlockStatement",
																		"body": bodyItems
																	},
																	"rest": null,
																	"generator": false,
																	"expression": false
																}
															]
														}
													}]
												};
											}
										}
									});
								}
							}
						});
					}(body[i], i));
				}
			}

			if (replacementBlock !== undefined) {
				return replacementBlock;
			}
		}
	});
}

//newCode = escodegen.generate(ast);

//console.log(newCode);

console.log(escodegen.generate(JSON.parse(fs.readFileSync('asttest.json'))));
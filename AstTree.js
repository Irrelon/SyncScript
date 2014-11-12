var AstTree = function (ast) {
	this._ast = ast;
	this.rebuild();
};

AstTree.prototype.rebuild = function () {
	this._tree = new AstNode(this, this._ast);
};

AstTree.prototype.ast = function () {
	return this._ast;
};

AstTree.prototype.find = function (check, node) {
	var results = [];

	if (!node) {
		node = this._tree;
	}

	//console.log('Checking: ' + node.type());
	if (check(node)) {
		results.push(node);
	}

	var arr = node.children(),
		arrCount = arr.length,
		arrIndex,
		findArr;

	for (arrIndex = 0; arrIndex <  arrCount; arrIndex++) {
		findArr = this.find(check, arr[arrIndex]);

		if (findArr.length) {
			results = results.concat(findArr);
		}
	}

	return results;
};

var AstNode = function (tree, obj, parent, parentBodyIndex) {
	var self = this,
		index;

	this._tree = tree;
	this._obj = obj;
	this._parent = parent ? parent : null;
	this._children = [];
	this._parentIndex = parentBodyIndex;

	// Determine the name of the body of this node
	switch (obj.type) {
		case 'Program':
		case 'BlockStatement':
		case 'FunctionExpression':
		case 'WhileStatement':
		case 'ForStatement':
			this._bodyName = 'body';
			this._childObjs = [
				'body'
			];
			break;

		case 'CallExpression':
			this._bodyName = 'arguments';
			this._childObjs = [
				'arguments'
			];
			break;

		case 'SwitchStatement':
			this._bodyName = 'cases';
			this._childObjs = [
				'cases'
			];
			break;

		case 'SwitchCase':
			this._bodyName = 'consequent';
			this._childObjs = [
				'consequent'
			];
			break;

		case 'VariableDeclaration':
			this._bodyName = 'declarations';
			this._childObjs = [
				'declarations'
			];
			break;

		case 'VariableDeclarator':
			this._bodyName = 'init';
			this._childObjs = [
				'init'
			];
			break;

		case 'ExpressionStatement':
			this._bodyName = 'expression';
			this._childObjs = [
				'expression'
			];
			break;

		case 'IfStatement':
			this._bodyName = 'consequent';
			this._childObjs = [
				'consequent'
			];
			break;

		case 'ObjectExpression':
			this._bodyName = 'properties';
			this._childObjs = [
				'properties'
			];
			break;

		default:
			this._childObjs = [];
			break;
	}

	if (this._bodyName) {
		// Populate children
		var bodyElems = this.body();

		if (bodyElems) {
			for (index = 0; index < bodyElems.length; index++) {
				self._children.push(new AstNode(tree, bodyElems[index], self, index));
			}
		}
	}
};

AstNode.prototype.type = function (val) {
	if (val !== undefined) {
		this.set('type', val);
		return this;
	}

	return this.get('type');
};

AstNode.prototype.name = function (val) {
	if (val !== undefined) {
		this.set('name', val);
		return this;
	}

	return this.get('name');
};

AstNode.prototype.body = function (val) {
	if (this._bodyName !== null) {
		if (val !== undefined) {
			this.set(this._bodyName, val);
			return this;
		}

		var bodyItem = this.get(this._bodyName);

		if (bodyItem) {
			if (!(bodyItem instanceof Array)) {
				// Wrap the item in an array
				return [bodyItem];
			} else {
				return bodyItem;
			}
		} else {
			return bodyItem;
		}
	} else {
		throw('Cannot get body of node type (type does not have a body!):' + this.type());
	}
};

AstNode.prototype.children = function () {
	return this._children;
};

AstNode.prototype.obj = function () {
	return this._obj;
};

AstNode.prototype.get = function (key) {
	return this.obj()[key];
};

AstNode.prototype.set = function (key, val) {
	this.obj()[key] = val;
	this.change();
};

AstNode.prototype.parent = function (type) {
	if (type !== undefined) {
		if (this._parent) {
			if (this._parent.type() === type) {
				return this._parent;
			} else  {
				return this._parent.parent(type);
			}
		}
	}

	return this._parent;
};

AstNode.prototype.blockIndex = function () {
	// Get the block
	var self = this,
		block = this.block(),
		bodyElems = block.children(),
		blockIndex = -1;

	for (var i = 0; i < bodyElems.length; i++) {
		(function (i) {
			self._tree.find(function (item) {
				if (item === self) {
					blockIndex = i;
				}
			}, bodyElems[i]);
		}(i));
	}

	return blockIndex;
};

AstNode.prototype.parentIndex = function () {
	return this._parentIndex;
};

AstNode.prototype.block = function () {
	var blockTypes = [
		'Program',
		'BlockStatement',
		'FunctionExpression',
		'SwitchCase'
	];

	if (this._parent) {
		if (blockTypes.indexOf(this._parent.type()) > -1) {
			return this._parent;
		} else  {
			return this._parent.block();
		}
	}
};

AstNode.prototype.change = function () {
	// Tell the tree to rebuild, naive but easy approach and risk-free,
	// at the cost of a few CPU cycles
	this._tree.rebuild();
};

module.exports = AstTree;
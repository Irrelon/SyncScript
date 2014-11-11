var MyClass = function () {
	var result = await(this.async('fileName')),
		result2 = false;

	// Result should == "moo"
	console.log(result);

	this.async('moo', function (err, moo) {
		console.log(moo);
		foo = true;
	});
};

MyClass.prototype.async = function (file, callback) {
	callback(false, 'moo');
};
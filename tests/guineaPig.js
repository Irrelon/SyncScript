var myObj = {
	insideObj: {
		request: require('request')
	}
};

var asyncCall = function (url, callback) {
	var response, body = sync(myObj.insideObj.request(url));
	callback(false, response, body);
};

var requestResponse, googleBody = sync(asyncCall('http://www.google.com'));
console.log(googleBody);


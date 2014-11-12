var myObj = {
	insideObj: {
		request: require('request')
	}
};

var asyncCall = function (url, callback) {
	var err, response, body = sync(myObj.insideObj.request(url));
	callback(err, response, body);
};

var err, requestResponse, googleBody = sync(asyncCall('http://www.google.com'));
console.log(googleBody);
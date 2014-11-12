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

var a = 1;

switch (a) {
	case 1:
		var err, requestResponse, googleBody = sync(asyncCall('http://www.google.com'));
		console.log(googleBody);
		break;

	case 2:
		console.log('2');
		break;

	default:
		console.log('default');
		break;
}

if (a === 1) {
	var err, requestResponse, googleBody = sync(asyncCall('http://www.google.com'));
	console.log(googleBody);
}

while (a === 0) {
	var err, requestResponse, googleBody = sync(asyncCall('http://www.google.com'));
	console.log(googleBody);
}

for (a === 0; a < 10; a++) {
	var err, requestResponse, googleBody = sync(asyncCall('http://www.google.com'));
	console.log(googleBody);
}

{var a = sync(asyncCall('testInOwnBlock'))};
{var a = sync(asyncCall('testInOwnBlock'))};
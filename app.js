const express = require('express');
var cookieParser = require('cookie-parser');
const app = express();
const pug = require('pug');
const http = require('http');
const axios = require('axios')
const bodyParser = require('body-parser')
const JSON = require('circular-json')
const fs = require('fs')
const yargs = require('yargs');

let apiurl;

const {setheader, sendAuthorizedGetRequest, getEvent, setApiUrl} = require('./api')

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug');

app.get('/', (req, res) => {
	if (!isLoggedIn(req)) {
		res.redirect('/login');
	} else {
		displayEvents(res, req); // getEvents();
	}
});

app.get('/login', (req, res) => {
	var error = req.cookies.loginError;
	if (error) {
		res.clearCookie('loginError');
	}
	res.render('login.pug', {
		error: error
	});
})

app.post('/login', (req, res) => {
	let username = req.body.username;
	let password = req.body.password;
	login(username,password,res).then((token) => {
		res.cookie('token', token);
		req.cookies.token = token;
		displayEvents(res, req);
		console.log("Token has been set")
	}).catch(error => {
		res.cookie('loginError', 'Wrong username/password');
		res.redirect("/login");
	})
});

app.get('/logout', (req, res) => {
	res.clearCookie('token');
	res.redirect('/login');
});

app.get('/createaccount', (req, res) => {
	res.render('createaccount.pug');
})

app.post('/createaccount', (req, res) => {
	let username = req.body.username;
	let password = req.body.password;
	if (username != "" && password != "") {
		createuser(username, password).then((body) => res.redirect('/login'));
	}

})

function isLoggedIn(req){
	return typeof req.cookies.token === 'string' && req.cookies.token !== '';
}

function displayEvents(res, req){
	sendAuthorizedGetRequest("api/events/", req, res).then((response) => {
		res.render('index.pug',{events:response.data});
	});
}


app.get('/event/:eventID', (req,res) => {
  var error = req.cookies.eventError;
  if (error) {
    res.clearCookie('eventError');
  }
  getUserID(req, res).then(userId => {
	getEvent(req.params.eventID, req).then(data => {
	  let {event, drinks, owner} = data;
	  res.render("event.pug", {
		event, drinks,
		isJoined: event.users.some(u => u.id == userId),
		isOwner: userId == event.owner,
		eventowner: owner,
		userId: userId,
		error: error,
		isSpectator: userId === 62,
	  });
	});
  });
});

app.get('/events/:eventID/drink', (req, res) => {
	getUserID(req, res).then(userID => {
		eventID = req.params.eventID
		axios.post(apiurl + "api/events/" + eventID +  "/create_drinkevent/" ,{
			event: eventID,
			user: userID
		},{
			headers: setheader(req)
		}).then((resu) => {
		  if (resu.status < 400)
			console.error(`Got status from drink: ${resu.status}`)

		  res.redirect('/event/'+ eventID)
		}).catch((err) => {
			var detail = err.response.data.detail;
			if (detail) {
				res.cookie('eventError', detail);
			}
		    res.redirect('/event/'+ eventID);
		})
	});
})

app.get('/chart/:eventID', (req,res) => {
	eventid = req.params.eventID;
	let Ps = []
	let user_data = {}
	let event_data = {}
	Ps.push(sendAuthorizedGetRequest("api/users/", req, res))
	Ps.push(sendAuthorizedGetRequest("api/events/" + eventid , req, res))
	Promise.all(Ps).then((values) => {
		user_data = JSON.stringify(values[0].data);
		event_data = JSON.stringify(values[1].data)
		res.render('chart2.pug', {be_userdata : user_data, be_eventdata: event_data});
	})
})

app.get('/donut/:eventID', (req,res) => {
	eventid = req.params.eventID;
	let Ps = []
	let user_data = {}
	let event_data = {}
	Ps.push(sendAuthorizedGetRequest("api/users/", req, res))
	Ps.push(sendAuthorizedGetRequest("api/events/" + eventid , req, res))
	Promise.all(Ps).then((values) => {
		user_data = JSON.stringify(values[0].data);
		event_data = JSON.stringify(values[1].data)
		res.render('donut.pug', {be_userdata : user_data, be_eventdata: event_data});
	})
})


app.get('/chartdata/:eventID', (req, res) => {
	eventid = req.params.eventID;
	let Ps = []
	let user_data = {}
	let event_data = {}
	Ps.push(sendAuthorizedGetRequest("api/users/", req, res))
	Ps.push(sendAuthorizedGetRequest("api/events/" + eventid, req, res))
	Promise.all(Ps).then((values) => {
		user_data = JSON.stringify(values[0].data);
		event_data = JSON.stringify(values[1].data)
		data = [user_data, event_data]
		res.json(data)
	})

})

app.get('/create_event', (req,res) => {
	res.render('create_event.pug')
})

app.post('/create_event', (req, resu) =>{
	axios.post(apiurl + "api/events/", {
		name : req.body.name
	}, {
		headers: setheader(req)
	}).then((res) => {
		if (res.status == 200) {
			resu.redirect('/event/' + res.data.id)
		} else {
			console.error(`Got error from create_event: ${res.status}`);
		}
	}, console.error)
})

app.get('/events/:eventID/join', (req, resu) =>{
	axios.post(apiurl + "api/events/" + req.params.eventID + '/join/', {},{
		headers: setheader(req)
	}).then((res) => {
		if (res.status == 200) {
			resu.redirect('/event/' + req.params.eventID)
		} else {
			console.error(`Got error from join: ${res.status}`);
		}
	}, console.error)
})


app.get('/events/:eventID/leave', (req, resu) =>{
	axios.post(apiurl + "api/events/" + req.params.eventID + '/leave/', {},{
		headers: setheader(req)
	}).then((res) => {
		if (res.status == 200) {
			resu.redirect('/event/' + req.params.eventID)
		} else {
			console.error(`Got error from leave: ${res.status}`);
		}
	}, console.error)
})


app.get('/events/:eventID/stop', (req, resu) =>{
	axios.post(apiurl + "api/events/" + req.params.eventID + '/stop/', {},{
		headers: setheader(req)
	}).then((res) => {
		if (res.status == 200) {
			resu.redirect('/event/' + req.params.eventID)
		} else {
			console.error(`Got error from stop: ${res.status}`);
		}
	}, console.error)
})

function login(uname, pass, res){
	return new Promise((resolve, reject) => {
		body = "{username : " + uname + ", password : " + pass + "}"
		axios.post(apiurl + "api-token-auth/", {
			username : uname,
			password : pass
		}).then((res) => {
			if (res.status == 200) {
				username = uname
				resolve(res.data.token);
			} else {
				reject("Error logging in");
			}
		}).catch((err) => reject(err));
	})
}

function createuser(uname, pass){
	return new Promise((resolve, reject) => {
		axios.post(apiurl + "api/users/", {
			username : uname,
			password : pass
		}).then((response) => {
			resolve(response.data);
		})

	})
}

function getUserID(req, res){
	return sendAuthorizedGetRequest("api/users/me/", req, res).then((response) => response.data.id)
}


var args = yargs
	.boolean('production')
	.option('listen', {
		default: '3000',
	})
	.option('apiurl', {
		default: 'https://snaps.dropud.nu/',
	}).argv;

if (args.production) {
	console.log('Running in production mode');
} else {
	console.log('Running in dev mode');
	app.use('/static', express.static('static'))
}

if (args.listen[0] === '/') {
	try {
		fs.unlinkSync(args.listen);
	} catch(e) {}
}

apiurl = args.apiurl;
setApiUrl(apiurl);
console.log(`Using API: ${apiurl}`);

app.listen(args.listen, () => console.log("Listening on " + args.listen));

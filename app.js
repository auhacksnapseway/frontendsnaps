const express = require('express');
const app = express();
const port = 3000;
const pug = require('pug');
const http = require('http');
const apiurl = "http://snapsecounter.serveo.net/"
const axios = require('axios')
const bodyParser = require('body-parser')
const JSON = require('circular-json')
const fs = require('fs')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'))
app.set('view engine', 'pug');

var logintokens = [];
var username = "";

function setheader(req) {
	ip = getID(req)
	return {Authorization : "Token " + logintokens[ip]}
}

function getID(req){
	let id = `${req.connection.remoteAddress}_${req.headers["x-forwarded-for"]}_${req.headers["user-agent"]}_${req.headers["accept-language"]}`;
	console.log(id);
	return id;

}


app.get('/', (req, res) => {
	if (!isLoggedIn(getID(req))) {
		res.redirect('/login');
	} else {
		displayEvents(res, req); // getEvents();
	}
});

app.get('/login', (req, res) => {
	res.render('login.pug');
})

app.get('/styles/:file', (req, res) => {
	file = req.params.file;
	fs.readFile('../styles/' + file, 'utf8', function(err, contents) {
		console.log(contents)
		res.send(contents);
	});
})

app.post('/login', (req, res) => {
	let username = req.body.username;
	let password = req.body.password;
	if (username != "" && password != "") {
		login(username,password,res).then((token) => {
			let ip = getID(req);
			logintokens[ip] = token;
			displayEvents(res, req);
			console.log("Token has been set")
		}).catch(error => {
			res.redirect("/login?err=wrongpass");
		})
	} else {
		res.redirect("/login?err=blankfield")
	}
});

app.get('/logout', (req, res) => {
	let id = getID(req);
	delete logintokens[id];
	res.redirect('/login');
});

app.get('/createaccount', (req, res) => {
	res.render('createaccount.pug');
})

app.post('/createaccount', (req, res) => {
	let username = req.body.username;
	let password = req.body.password;
	if (username != "" && password != "") {
		console.log("Trying to create user...")
		createuser(username, password).then((body) => res.redirect('/login'));
	}

})

function isLoggedIn(id){
	let loggedin = logintokens[id];
	if (typeof loggedin !== 'undefined') {
		return true;
	} else {
		return false;
	}
}

function sendAuthorizedGetRequest(url, req){
	return new Promise((resolve, reject) => {
		axios.get(apiurl + url, {
			headers: setheader(req)
		}).then((response) => {
			if (response.status === 200){
				resolve(response);
			} else {
				reject("Request not accepted");
			}
		}).catch((error) => console.log("We fucked up" + error));
	})
}

function displayEvents(res, req){
	console.log("display events called")
	sendAuthorizedGetRequest("api/events/", req).then((response) => {
		let events = response.data;
		eventlist = [];
		events.forEach((event) => {
			eventlist.push(event);
		})
		res.render('index.pug',{events:eventlist});

	});
}


app.get('/event/:eventID', (req,res) => {
	sendAuthorizedGetRequest("api/events/" + req.params.eventID, req).then(response => {
		getUserID(req).then(userId => {
		try{
			let event = response.data;
			console.log(event);
			let Ps = []
			for(var x of event.users){
				Ps.push(getUsername(x, req))
			}
			var drinks = {};
			for(var user of event.users){
				drinks[user] = 0
			}
			for(var x of event.drink_events){
				drinks[x.user] += 1
			}
			Promise.all(Ps).then(names => {
				let users = []
				for(let i = 0; i < names.length; i++)
					users.push({id: event.users[i], name: names[i]})

				users.sort((a, b) => drinks[b.id] - drinks[a.id])
				if(users.length) {
					users[0].place = 0;
					for(var i = 1; i < users.length; i++)
						users[i].place = drinks[users[i-1].id] == drinks[users[i].id] ? users[i-1].place : i;

				}
				event.users = users;
				res.render("event.pug", {event:event, names:names, drinks:drinks, isJoined:names.includes(username.toLowerCase()), isOwner:userId == event.owner});
			})

		}
		catch(error){
			console.log(error);
		}
	})});
});

app.get('/events/:eventID/drink', (req, res) => {
	getUserID(req).then(userID => {
		eventID = req.params.eventID
		axios.post(apiurl + "api/events/" + eventID +  "/create_drinkevent/" ,{
			event: eventID,
			user: userID
		},{
			headers: setheader(req)
		}).then((resu) => {
			if (resu.status == 200) {
				res.redirect('/event/'+ eventID)
			}else{
				console.error(resu)
			}
		}, console.error)
	});
})

app.get('/chart/:eventID', (req,res) => {
	eventid = req.params.eventID;
	let Ps = []
	let user_data = {}
	let event_data = {}
	Ps.push(sendAuthorizedGetRequest("api/users/", req))
	Ps.push(sendAuthorizedGetRequest("api/events/" + eventid , req))
	Promise.all(Ps).then((values) => {
		user_data = JSON.stringify(values[0].data);
		event_data = JSON.stringify(values[1].data)
		console.log(user_data);
		console.log(event_data);
		res.render('chart2.pug', {be_userdata : user_data, be_eventdata: event_data});
	})
})


app.get('/chartdata/:eventID', (req, res) => {
	eventid = req.params.eventID;
	let Ps = []
	let user_data = {}
	let event_data = {}
	Ps.push(sendAuthorizedGetRequest("api/users/", req))
	Ps.push(sendAuthorizedGetRequest("api/events/" + eventid, req))
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
	console.log(req.body)
	axios.post(apiurl + "api/events/", {
		name : req.body.name
	}, {
		headers: setheader(req)
	}).then((res) => {
		if (res.status == 200) {
			resu.redirect('/event/' + res.data.id)
		} else {
			console.error(res)
		}
	}, console.error)
})

app.get('/events/:eventID/join', (req, resu) =>{
	console.log(req.body)
	axios.post(apiurl + "api/events/" + req.params.eventID + '/join/', {},{
		headers: setheader(req)
	}).then((res) => {
		if (res.status == 200) {
			resu.redirect('/event/' + req.params.eventID)
		} else {
			console.error(res)
		}
	}, console.error)
})


app.get('/events/:eventID/leave', (req, resu) =>{
	console.log(req.body)
	axios.post(apiurl + "api/events/" + req.params.eventID + '/leave/', {},{
		headers: setheader(req)
	}).then((res) => {
		if (res.status == 200) {
			resu.redirect('/event/' + req.params.eventID)
		} else {
			console.error(res)
		}
	}, console.error)
})


app.get('/events/:eventID/stop', (req, resu) =>{
	console.log(req.body)
	axios.post(apiurl + "api/events/" + req.params.eventID + '/stop/', {},{
		headers: setheader(req)
	}).then((res) => {
		if (res.status == 200) {
			resu.redirect('/event/' + req.params.eventID)
		} else {
			console.error(res)
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
		}).catch((err) => res.redirect("/login"));
	})
}

function createuser(uname, pass){
	console.log(uname + pass)
	return new Promise((resolve, reject) => {
		axios.post(apiurl + "api/users/", {
			username : uname,
			password : pass
		}).then((response) => {
			console.log("CREATED USER!");
			resolve(response.data);
		})

	})
}

function getUsername(id, req){
	return new Promise((resolve,reject) => {
		sendAuthorizedGetRequest("api/users/"+ id + "/", req).then((response) => {
			resolve(response.data.username.toLowerCase())
		}).catch(error => {
			reject();
		});
	})
}

function getUserID(req){
	return sendAuthorizedGetRequest("api/users/me/", req).then((response) => response.data.id)
}

app.listen(port, () => console.log("Listening on port " + port + "!"));

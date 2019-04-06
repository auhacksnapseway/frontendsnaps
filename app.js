const express = require('express');
const app = express();
const port = 3000;
const pug = require('pug');
const http = require('http');
const apiurl = "http://snapsecounter.serveo.net/"
const axios = require('axios')
const bodyParser = require('body-parser')
const JSON = require('circular-json')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var logintoken = "";
var username = "";

function setheader() {
	return {Authorization : "Token " + logintoken}
}

app.set('view engine', 'pug');

app.get('/', (req, res) => {
	if (!isLoggedIn()) {
		res.redirect('/login')
	} else {
		displayEvents(res); // getEvents();
	}
});

app.get('/login', (req, res) => {
	res.render('login.pug');
})

app.post('/login', (req, res) => {
	let username = req.body.username;
	let password = req.body.password;
	if (username != "" && password != "") {
		login(username,password).then((token) => {
			logintoken = token;
			displayEvents(res);
			console.log("Token has been set")
		}).catch(error => {
			res.redirect("/login?err=wrongpass");
		})
	} else {
		res.redirect("/login?err=blankfield")
	}
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

function isLoggedIn(){
	return logintoken != "";
}

function sendAuthorizedGetRequest(url){
	return new Promise((resolve, reject) => {
		axios.get(apiurl + url, {
			headers: setheader()
		}).then((response) => {
			console.log("Got this far")
			if (response.status === 200){
				resolve(response);
			} else {
				reject("Request not accepted");
			}
		}).catch((error) => console.log("We fucked up" + error));
	})
}

function displayEvents(res){
	console.log("display events called")
	sendAuthorizedGetRequest("api/events/").then((response) => {
		let events = response.data;
		console.log(events);
		eventlist = [];
		events.forEach((event) => {
			eventlist.push(event);
		})
		res.render('index.pug',{events:eventlist});

	});
}


app.get('/event/:eventID', (req,res) => {
	sendAuthorizedGetRequest("api/events/" + req.params.eventID).then(response => {
		try{
			let event = response.data;
			console.log(event);
			let Ps = []
			for(var x of event.users){
				Ps.push(getUsername(x))
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
				event.users = users;
				res.render("event.pug", {event:event, names:names, drinks:drinks, isJoined:names.includes(username)});
			})

		}
		catch(error){
			console.log(error);
		}
	});

})

app.get('/events/:eventID/drink', (req, res) => {
	getUserID().then(userID => {
	eventID = req.params.eventID
	axios.post(apiurl + "api/drink_events/" ,{
		event: eventID,
		user: userID
	},{
		headers: setheader()
}).then((resu) => {
	if (resu.status == 201) {
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
	Ps.push(sendAuthorizedGetRequest("api/users/"))
	Ps.push(sendAuthorizedGetRequest("api/events/" + eventid))
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
	Ps.push(sendAuthorizedGetRequest("api/users/"))
	Ps.push(sendAuthorizedGetRequest("api/events/" + eventid))
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
		headers: setheader()
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
		headers: setheader()
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
		headers: setheader()
	}).then((res) => {
		if (res.status == 200) {
			resu.redirect('/event/' + req.params.eventID)
		} else {
			console.error(res)
		}
	}, console.error)
})


function login(uname, pass){
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
		})
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

function getUsername(id){
	return new Promise((resolve,reject) => {
		sendAuthorizedGetRequest("api/users/"+ id + "/").then((response) => {
			resolve(response.data.username)
		}).catch(error => {
			reject();
		});
	})
}

function getUserID(){
	return sendAuthorizedGetRequest("api/users/me/").then((response) => response.data.id)
}

app.listen(port, () => console.log("Listening on port ${port}!"));

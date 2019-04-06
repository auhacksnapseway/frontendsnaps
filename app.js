const express = require('express');
const app = express();
const port = 3000;
const pug = require('pug');
const http = require('http');
const apiurl = "http://snapsecounter.serveo.net/"
const axios = require('axios')
const bodyParser = require('body-parser')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var logintoken = "";

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
				res.render("event.pug", {event:event, names:names, drinks:drinks});
			})

		} 
		catch(error){
			console.log(error);
		}
	});

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


function login(uname, pass){
	return new Promise((resolve, reject) => {
		body = "{username : " + uname + ", password : " + pass + "}"
		axios.post(apiurl + "api-token-auth/", {
			username : uname,
			password : pass
		}).then((res) => {
			if (res.status == 200) {
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


app.listen(port, () => console.log("Listening on port ${port}!"));

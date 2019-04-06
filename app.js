const express = require('express');
const app = express();
const port = 3000;
const pug = require('pug');
const http = require('http');
const apiurl = "http://snapsecounter.serveo.net/"
const axios = require('axios')

var logintoken = "";

function setheader() {
	return {Authorization : "Token " + logintoken}
}

app.set('view engine', 'pug');

app.get('/', (req, res) => {		
	if (!isLoggedIn()) {
		login("test","test").then((token) => {
			logintoken = token;
			displayEvents(res);
			console.log("Token has been set")
		})
	} else {
		displayEvents(res); // getEvents();
	}
});

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
	axios.get(apiurl + "api/events/" + req.params.eventID,{
		headers: setheader()
	}).then((response) => {
		console.log(response)
		if(response.status === 200){ 
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

		};
	});

})

function login(uname, pass){
	return new Promise((resolve, reject) => {
		console.log("Started login")
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
async function getUsername(id){
	return new Promise((resolve,reject) => {
		axios.get(apiurl + "api/users/"+ id + "/", {
			headers: setheader()
		}).then((response) => {
		if(response.status === 200){ 
			resolve(response.data.username)
			}
		else
			reject()
		});
	})
}


app.listen(port, () => console.log("Listening on port ${port}!"));

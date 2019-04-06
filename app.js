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
				let events = response.data;
				res.send(JSON.stringify(events));
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

app.listen(port, () => console.log("Listening on port ${port}!"));

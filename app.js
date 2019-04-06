const express = require('express');
const app = express();
const port = 3000;
const pug = require('pug');
const http = require('http');
const apiurl = "http://snapsecounter.serveo.net/"
const axios = require('axios')

var token = "";

function setheader() {
	return {Authorization : "Token " + token}
}

app.set('view engine', 'pug');

app.get('/', (req, res) => {		
	if (!isLoggedIn()) {
		login("test", "test", res);
	} else {
		displayEvents(res); // getEvents();
	}
});

function isLoggedIn(){
	return token != "";
}

function sendAuthorizedGetRequest(url,onSuccess,onError){
	return new Promise((resolve, reject) => {
		axios.get(apiurl + url, {
			headers: setheader
		}).then((response) => {
			if (response.status == 200){
				resolve(response);
			} else {
				reject("Request not accepted");
			}
		})



	})	
}

function displayEvents(res){
	sendAuthorizedGetRequest("api/events/", (response) => {
		let events = response.data;
		eventlist = [];
		events.forEach((event) => {
			eventlist.push(event);
		})
		res.render('index.pug',{events:eventlist});

	}, (error) => console.log(error));
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

function login(uname, pass, loginres){
	console.log("Started login")
	body = "{username : " + uname + ", password : " + pass + "}"
	axios.post(apiurl + "api-token-auth/",{
		username : uname,
		password : pass
	})
		.then((res) => {
			if (res.status == 200) {
				console.log(res.data.token);
				token = res.data.token;
				loginres.redirect("/");
			}
		})
		.catch((err) => {
			console.log(err);
			loginres.redirect("/?err=login");
		});
}
app.listen(port, () => console.log("Listening on port ${port}!"));

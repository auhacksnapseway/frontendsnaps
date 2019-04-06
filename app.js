const express = require('express');
const app = express();
const port = 3000;
const pug = require('pug');
const http = require('http');
const apiurl = "http://snapsecounter.serveo.net/"
const axios = require('axios')

function setheader(token) {
	return {authorization : "Token " + token}
}

var token = "";

app.set('view engine', 'pug');

app.get('/', (req, res) => {		
	if (!isLoggedIn()) {
		login("test", "test", res);
	}
	res.render('index.pug',{events:[1,2,3,4]});
});

function isLoggedIn(){
	return token != "";
}

app.get('/event/:eventID', (req,res) => {
	let request = http.get(apiurl + "api/events/", function(response){
		let body = ""; 
		response.on("data", function(chunk){ body += chunk; });

		response.on("end", function(){ 
			if(response.statusCode === 200){ 
				try{ var profile = JSON.parse(body);
					res.send(JSON.stringify(profile));
				} 
				catch(error){
					console.log(error);
				}

			};
		});
	});
});

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
			}
		})
		.catch((err) => {
			loginres.redirect("/?err=login")
		});
}
app.listen(port, () => console.log("Listening on port ${port}!"));

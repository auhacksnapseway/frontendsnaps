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
	}
	res.render('index.pug',{events:[1,2,3,4]});
});

function isLoggedIn(){
	return token != "";
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




let request = http.get(apiurl + "api/events/", function(response){
	let body = ""; 
	response.on("data", function(chunk){ body += chunk; });

	response.on("end", function(){ 
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
			console.log(err);
			loginres.redirect("/?err=login");
		});
}
app.listen(port, () => console.log("Listening on port ${port}!"));

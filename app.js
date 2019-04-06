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

const axios = require('axios');
let apiurl;

function setApiUrl(url) {
	apiurl = url;
}

function setheader(req) {
	var token = req.cookies.token;
	if (token) {
		return {Authorization : "Token " + token}
	} else {
		return {};
	}
}

function sendAuthorizedGetRequest(url, req, res){
	return new Promise((resolve, reject) => {
		axios.get(apiurl + url, {
			headers: setheader(req)
		}).then((response) => {
			if (response.status === 200){
				resolve(response);
			} else {
				reject("Request not accepted");
			}
		}).catch((error) => {
			if (error.response.status === 403) {
				// Forbidden
				console.error(`Got 403 Forbidden from ${url}, redirecting to logout`);
				res.redirect('/logout');
			} else {
				var message = `We fucked up: ${error}\nAPI URL: ${url}`;
				console.error(message);
				res.status(error.response.status).send(message);
			}
		});
	})
}

function getEvent(eventID, req) {
  return Promise.all([
    sendAuthorizedGetRequest("api/events/" + eventID + "/", req),
    sendAuthorizedGetRequest("api/users/", req)
  ]).then(res => {
    let event = res[0].data;
    let allUsers = res[1].data;
    let userDict = {};

    for(var user of allUsers) {
      userDict[user.id] = user;
    }

    var drinks = {};
    for(var user of event.users)
      drinks[user] = 0

    for(var x of event.drink_events)
      drinks[x.user] += 1


    let users = event.users.map(userid => userDict[userid]);

    users.sort((a, b) => drinks[b.id] - drinks[a.id])
    if(users.length) {
      users[0].place = 0;
      for(var i = 1; i < users.length; i++)
        users[i].place = drinks[users[i-1].id] == drinks[users[i].id] ? users[i-1].place : i;

    }
    event.users = users;
    return {
      event,
      drinks,
      owner: userDict[event.owner]
    };
  });
}

module.exports = {setheader, sendAuthorizedGetRequest, getEvent, setApiUrl};

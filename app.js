const express = require('express');
const app = express();
const port = 3000;
const pug = require('pug');
const http = require('http');

app.set('view engine', 'pug');

app.get('/', (req, res) => {
	res.render('index.pug');
});

app.get('/event/:eventID', (req,res) => {
	http.get('http://amor.serveo.net/api/events/' + req.params.eventID, (resp) => {
		res.send(JSON.stringify(resp, null, 2));
	})

})

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

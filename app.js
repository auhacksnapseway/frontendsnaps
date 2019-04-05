const express = require('express');
const app = express();
const port = 3000;
const pug = require('pug');

app.set('view engine', 'pug');

app.get('/', (req, res) => {
	res.render('index.pug');
});

app.get('/event/:eventID', (req,res) => {
	res.send(req.params.eventID);;
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

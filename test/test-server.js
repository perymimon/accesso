const Bundler = require('parcel-bundler');
const express = require('express');
const app = express();

/*GOOGLE AFTER LOGIN*/
app.post('/google/after-login', async function (req, res, next) {
    const {body, cookies} = req;
    if (!cookies.g_csrf_token) return res.code(404).send('no cookies g_csrf_token');
    if (!body.g_csrf_token) return res.code(404).send('no body g_csrf_token');
    if (body.g_csrf_token !== cookies.g_csrf_token) return res.code(404).send('g_csrf_token not match')
    const {credential} = req.body;

    const ticket = await verify(credential).catch(console.error);
    const payload = ticket.getPayload();
    const userid = payload['sub'];
    const clientToken = payload['aud'];
    // iss in the ID token is equal to accounts.google.com or https://accounts.google.com.
    res.send({
        body: req.body,
        cookies,
        payload,
        'sub is userid': userid
    });
});

/*PARCEL INIT*/

const cookieParser = require('cookie-parser');

/* EXPRESS INIT */
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(require('../server-vendor-router.js'));

const path = require('path');
const file = path.resolve('test/test-page.html');
const bundler = new Bundler(file, {
    // Initialize a new bundler using a file and options
});
app.use(bundler.middleware());

app.listen(4000);
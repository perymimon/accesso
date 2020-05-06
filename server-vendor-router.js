const express = require('express');
const router = express.Router();
const code2Token = require('./src/code2token-express-middleware');
module.exports = router;

router.get('/google/callback',code2Token({
    client_id:"867384973590-d2c4i9kcufb212btaogi7bj0nh57nbo2.apps.googleusercontent.com",

}), sendClose);
router.get('/github/code', noopSend);
// router.get('/linkdin/callback', noopSend);
router.get('/linkdin/callback', code2Token({
    token_endpoint:'https://www.linkedin.com/oauth/v2/accessToken',
    client_id:'86d43e35dhdr0x',
    grant_type:'authorization_code',
    client_secret:'v7HQ2KlgOzajROS9',
    redirect_uri:'http://localhost:4000/linkdin/callback',
}),noopSend);




async function sendClose(req, res, next) {
    res.send(`<script>
        window.close()
    </script>`);
}
async function noopSend(req, res, next) {
    res.send(`callback`);
}

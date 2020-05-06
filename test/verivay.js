
/*Verify the ID token*/
async function verify(idToken) {
    const {OAuth2Client} = require('google-auth-library');
    const client = new OAuth2Client(CLIENT_ID);
    const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: CLIENT_ID,
    });
    return ticket;
}
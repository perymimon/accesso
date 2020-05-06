module.exports = code2Token;

function code2Token(settings) {
    const axios = require('axios');
    return async function (req, res, next) {
        const {token_endpoint, ...config} = settings;
        var code = req.query.code;
        if (!code) return next();
        try {
            config.code = code;
            let response = await axios({
                method: 'POST',
                headers: {'content-type': 'application/x-www-form-urlencoded'},
                data: joinObject(config),
                url: token_endpoint
            });
            // expected result:
            // const {access_token, expires_in} = response.data;
            res.redirect(302, `${req.route.path}?${joinObject(response.data)}`)
        } catch (e) {
            next(e)
        }
    }
}

function joinObject(object, delKv = '=', delPairs = '&') {
    return Object.entries(object)
        .map(pair => pair.join(delKv)).join(delPairs);
}

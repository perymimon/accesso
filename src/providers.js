import {factory} from './accesso.js';

export * from './accesso.js';

/*
*  create new app : https://console.developers.google.com/apis/dashboard
**/
export const google = factory('google', {
    auth_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    revoke_endpoint: 'https://oauth2.googleapis.com/revoke',
    response_type: 'token',
    state: '',
    include_granted_scopes: true,
    scope: 'openid profile email',
    oneTap: {
        init(setting) {
            google.accounts.id.initialize(setting);
        },
        prompt(setting) {
            google.accounts.id.prompt(setting);
        },
        cancel_on_tap_outside: true,
        nonce: 'A random string for ID tokens',
        context: 'one tap context',
        state_cookie_domain: String,
        prompt_parent_id: String,
        native_callback: Function,
    }
});
/**
 *  create new app : https://www.linkedin.com/developers/apps/new
 *  auth flow : https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 */
export const linkdin = factory('linkdin', {
    auth_endpoint: 'https://www.linkedin.com/oauth/v2/authorization',
    // revoke_endpoint: 'https://www.linkedin.com/oauth/v2/authorize',
    // client_id:''
    response_type: 'code',
    // '!redirect_uri': String,
    // 'state': String,
    scope: 'r_liteprofile%20r_emailaddress%20w_member_social',
    oneTap: false,
//    ----------
//     token_endpoint:'https://www.linkedin.com/oauth/v2/accessToken',
    // client_id:'86d43e35dhdr0x',
    // grant_type:'authorization_code',
    // client_secret:'v7HQ2KlgOzajROS9',
    // redirect_uri:'http://localhost:4000/linkdin/callback',
});

export const github = factory('github', {
    // client_id:''
    auth_endpoint: 'https://github.com/login/oauth/authorize',
    // login:'hint'
    // scope list https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/
    scope: 'read:user user:email',
    state: '',
    allow_signup: true,

    revoke_endpoint: 'https://oauth2.googleapis.com/revoke',
    response_type: 'token',
    include_granted_scopes: true,
});

// amazon
// facebook


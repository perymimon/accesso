# Access0 (pronounce: accesso )
hand craft, carefree, web-client OAuth 2.0 solution


The aim of this lib is bring dead simple serverless solution for oauth 2.0 protocol  
That will eventually leave you with `access_token`.
write with modern support for new google `one-tap` (aka YOLO) authentication
that give you at the end proper `access token` so you can immediately
starting make API-requests for the data you care of



the lib assume that you use some application bundler in your project
so it write in modern js ( es2020 ) without any compile. means your compiler  
can get benefit from feature like tree-shaking, and you get a benefit  
from clean lean and readable code.

## Features
* plexible hybrid of promise based and event emitter
* multi provider at the same time
* quiet renew the token
* trigger login window in popup
* method to revoke the token from your app
* option to throw errors to easy integrate with `async/await` flow
* support `google one-tap`
* pre config, that not lock you, for majority of Oauth 2.0 providers
* in the future, build in thin integration for majority of frameworks

## Installing

```bash
 npm install @perymimon/access0
```

## Usage
```js
    import Access0 from '@perymimon/access0'
    // or  
    // import Access0, {addEventListener, connect, init, login, switchUser, revoke} from '@perymimon/access0'

    Access0.init('google', {
        client_id: "xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
        redirect_uri: 'http://localhost:3000/google/callback',
        scope: 'openid profile email https://www.googleapis.com/auth/drive.file',
        state: 'UNIQUE_AND_NON_GUESSABLE',
    });
```
if you want to use `google one tap` in the flow, add the following script before you call any method

```html
    <script src="https://accounts.google.com/gsi/client"></script>
```

then later, when user click on Login Button
```js
    async function loginButtonClick(){
        const rethrow = true;
        const tokenPayload = await Access0.login('google', rethrow);
    }
```
it throw Error with the reason if the login fail and return `tokenPayload` if
all process success. your `access token` should be in
`tokenPayload.access_token`

it also saved in `localStorage.google_access` so you can get it from anywhere in your app
even in the parts that not have dirrect access to `Access0` and it should be the original source of true

token in client live limited prior of time, about 1 hour in google, so
`Access0` try renew the token in the half lifetime of the token.  
the time calculate from `exp` or `expires_in` key that come in the `tokenPayload`

when the token renew, actually also in the first time, `Access0` fire `token` event
or `error` if somthing not goes well.

```js
 Access0.addEventListener('token',function (event){
     const payload = event.data;
     console.log(payload);
 })
 //or 
 Access0.addEventListener('error',function (event){
     const {message,stack}  = event;
     console.warn(message);
 })
```

next time when user come back to the app you can call `Access0.connect`
to silent renew the token.

```js
    async function reconnect(){
        const rethrow = true;
        await Access0.connect('google', rethrow);
    }
```

this process try to use hidden iframe for that and if it fail it not try to bring up a
windows popup so user workflow not be disrupted. if you want force login popup when `connect` method fail you can do :

```js
    async function forceLogin(){
        const rethrow = true;
        await Access0.connect('google', rethrow)
            .catch(e=>Access0.login('google'))
    }
```

also you have `Access0.switchUser(vendor)` and `Access0.revoke(vendor)`

if your user want, for some reason use different user or revoke his subscription
`Access0.switchUser(vendor)` spin up change user popup, and `revoke` just return promise

## One Tap

it is recommended to use `YOLO` method if it available.  
`google` for example provide a lib that you should preload before call  
any `Access0` function:  
`<script src="https://accounts.google.com/gsi/client"></script>`
for other provider then `google`, that come pre config into `Access0`,  
you minimum should add `oneTap` key with config like demonstrate here:

```js
 Access0.init('google', {
        client_id: "xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
        redirect_uri: 'http://localhost:3000/google/callback',
        scope: 'openid profile email https://www.googleapis.com/auth/drive.file',
        state: 'UNIQUE_AND_NON_GUESSABLE',
        oneTap:{
            init(setting){
                google.accounts.id.initialize(setting);            },
            },
            prompt(setting){
                google.accounts.id.prompt(setting);
            },
});

```

## access0 API

##### Access0.init(provider ,setting) : return undefined
register new provider to `Access0` or set the necessray key for make provider functional ( basicaly clientId )

provider(String) - provider name  
setting(SettingSchema) - setting schema

```js
const settingSchema = {
    '!auth_endpoint': String,
    '!client_id': String,
    '!redirect_uri': String,
    '!response_type': String,
    '!scope': String,
    state: String,
    include_granted_scopes: Boolean,
    oneTap: {
        init: Function,
        prompt:Function,
        cancel_on_tap_outside: Boolean,
        nonce: String,
        context: String,
        state_cookie_domain: String,
        prompt_parent_id: String,
        native_callback: Function,
    },
};
```

##### Access0.connect(vendor[, reThrow=false]) : return promise<payloadToken>
it try to renew the token silently, by using hidden iframe or if it fail
and one-tap provide it trying to use one-tap to refresh user access.  
but because `one-tap` not provide access token, if `one-tap` success it  
used hint from `one-tap payload` to try again the approche of hidden iframe.

if it fail new error event fire, and if `reThrow=true` it promise reject with error

##### Access0.login(vendor[, reThrow=false]) : return promise<payloadToken>
it try the method of one tap (if exist) if it fail (or no exist) it spin up a
popup

if it fail new error event fire, and if `reThrow=true` it promise reject with error

##### Access0.switchUser(vendor[, reThrow=false]) : return promise<payloadToken>
from the start it spin up a pop up with `prompt=select_account`

if it fail new error event fire, and if `reThrow=true` it promise reject with error

##### Access0.revoke(vendor[, reThrow=false]) : return <promise<undefind>>
it send revoke request to the provider endpoint and return resolving promise when success
or rejected promise when fail and `reThrow=true` otherelse it just resolve.  
the sense for that is because moseley revoke fail just because it already revoked

##### Access0.isLogged(vendor)
if there is `access_token` and is not expired it return `true` otherelse `false`

##### Access0.user(vendor)
it return object
```js
{
    name: payload.name,
    email: payload.email,
    picture: payload.picture,
    scope: payload.scope,
}
```

##### Access0.vendorPayload([vendor])
return current vendor payload basicaly it just
```js
JSON.parse(localStorage[`${vendor}_payload`] || '{}');
```

`Access0` fire two type of event  
 `payload`: every time the payload update
 `error`: when any error accure on using the method
The following is inheritance from eventTarget

##### Access0.addEventListener(eventName, callback)
##### Access0.removeEventListener(eventName, callback)

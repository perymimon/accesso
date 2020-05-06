/*
* flow:
*  scenario 1: app connect - check if token is valid or easy to renew
*   ~~> fail -> success
*     (0) ~~> (2) ~~>  on fail nothing
*  scenario 2: user login - user ask to login ,
*     (2) ~~> (1) ~~> error
*  scenario 3: auto renew
*    like app connect
*  scenario 4: switch user
*    (4) ~~> error
*  scenario 5: add more scope
*    (1) ~~> error
*  options:
* (0) -> login with hidden iframe
* (1) -> login with popup window
* (2) -> login with on-tap: auto select -> (0)
* (3) -> login with on-tap: user select (interactive) -> (0)
* (4) -> login with popup window,  prompt=select_user
* */
import IdTokenVerifier from 'idtoken-verifier';
import axios from 'axios';

export const popupTimeout = 40000;

/* to support safari that luck of  EventTarget constructor*/
class MyEventTarget extends EventTarget {
    constructor() {
        super();
    }
}

let eventTarget = new MyEventTarget();
const eventMap = new Map();

export function addEventListener(vendor, eventName, cb) {
    if (arguments.length == 2) {
        return addEventListener(null, vendor, eventName)
    }
    const regCb = !vendor ? cb : function (event) {
        if (event.vendor == vendor)
            cb.call(this, event)
    };
    eventMap.set(cb, [vendor, eventName, regCb]);
    eventTarget.addEventListener(eventName, regCb);
}

export function removeEventListener(vendor, eventName, cb) {
    if (arguments.length == 2)
        return removeEventListener(null, vendor, eventName);
    const [, , regCb] = eventMap.get(cb);
    eventTarget.removeEventListener(eventName, regCb)
}

export function removeAllEventListener(vendor, eventName) {
    for (let [fn, [rVendor, rEventName, regCb]] of eventMap) {
        if (vendor && vendor != rVendor) continue;
        if (eventName && eventName != rEventName) continue;
        eventTarget.removeEventListener(eventName, regCb)
    }

}

const EventTypesEnum = {payload: 'payload', error: 'error', renew: 'renew', login: 'login', logout: 'logout'};
// error_subtype: "access_denied"
const ErrorTypesEnum = {
    interaction_required: 'interaction_required'
};
const cacheSetting = {};
let lastVendor = null;
let reNewTimeout = {};
let logoutTimeout = {};
const settingDefaults = {};
const settingSchema = {
    '!auth_endpoint': String,
    'revoke_endpoint': String,
    '!client_id': String,
    '!redirect_uri': String,
    '!response_type': String,
    '!scope': String,
    state: String,
    include_granted_scopes: Boolean,
    oneTap: {
        init: Function,
        prompt: Function,
        cancel_on_tap_outside: Boolean,
        nonce: String,
        context: String,
        state_cookie_domain: String,
        prompt_parent_id: String,
        native_callback: Function,
    },
};

export function isLogged(vendor) {
    const payload = vendorPayload(vendor);
    return !!payload.access_token //&& (Date.now() < payload.timeout);
}

export function user(vendor) {
    const payload = vendorPayload(vendor);
    return {
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        scope: payload.scope,
    }
}

export function factory(vendor, defaultSetting) {
    defaultSetting = typeof defaultSetting == 'function' ?
        defaultSetting(vendor) :
        defaultSetting;

    settingDefaults[vendor] = defaultSetting;

    return {
        init: init.bind(null, vendor),
        connect: connect.bind(null, vendor),
        login: login.bind(null, vendor),
        switchUser: switchUser.bind(null, vendor),
        revoke: revoke.bind(null, vendor),
        logout: logout.bind(null, vendor),
        vendorPayload: vendorPayload.bind(null, vendor),
        isLogged: isLogged.bind(null, vendor),
        user: user.bind(null, vendor),
        token: token.bind(null, vendor),

        addEventListener: addEventListener.bind(null, vendor),
        removeEventListener: removeEventListener.bind(null, vendor),
    }
}

export function init(vendor, setting) {
    setting = deepAssign(
        settingDefaults[vendor],
        // cacheSetting[vendor],
        setting
    );
    checkSchema(setting, settingSchema);
    // let {init, prompt} = setting?.oneTap;
    // if (init instanceof Function)
    //     setting.oneTap.init = catchi(init,_=> setting.oneTap = false);
    // if (prompt instanceof Function)
    //     setting.oneTap.prompt = catchi(prompt,_=> setting.oneTap = false);
    setting.vendor = vendor;
    cacheSetting[vendor] = setting;
}

// scenario 1: app init:connect - check if token is valid or if it easy to renew it
export async function connect(vendor, reThrow = false) {
    try {
        const authSetting = vendorSetting(vendor);
        const payload = vendorPayload(vendor);
        const payloadToken = await hiddenIframe$Token(authSetting, payload)
            .catch(async function (reason) {
                return await oneTap$Token(authSetting, true);
            });
        renewToken(vendor);
        return payloadToken;
    } catch (e) {
        const expected = e.includes('one tap:');
        e = expected ? 'auto connect fail' : e;
        return fireError(vendor, e, reThrow)
    }
}

export async function login(vendor, reThrow = false) {
    try {
        const authSetting = vendorSetting(vendor);
        // const payload = vendorPayload(vendor);
        const payloadToken = await oneTap$Token(authSetting, true)
            .catch(function (error) {
                // return window$Token(authSetting,'consent')
                return window$Token(authSetting);
            })
        renewToken(vendor);
        return payloadToken;
    } catch (e) {
        return fireError(vendor, e, reThrow);
    }


}

export async function switchUser(vendor, reThrow = false) {
    const authSetting = vendorSetting(vendor);
    return window$Token(authSetting, 'select_account')
        .catch(function (e) {
            return fireError(vendor, e, reThrow);
        })
}


function renewToken(vendor) {
    // const authSetting = vendorSetting(vendor);
    const payload = vendorPayload(vendor);
    const refreshTimeout = (payload.timeout - Date.now()) >> 1;
    if (!refreshTimeout) throw 'refresh timeout is ' + refreshTimeout;
    clearTimeout(reNewTimeout[vendor]);
    reNewTimeout[vendor] = setTimeout(async function () {
        try {
            await connect(vendor);
            fireEvent(vendor, EventTypesEnum.renew);
            renewToken(vendor);
        } catch (e) {
            fireError(vendor, e, true)
        }

    }, refreshTimeout)
}

export function cancelRenewToken(vendor) {
    clearTimeout(reNewTimeout[vendor]);
}

async function oneTap$Token(authSetting, useAuto) {
    if (!'oneTap' in authSetting)
        throw `oneTap not set in ${authSetting.vendor} vendor`;
    const {client_id, oneTap} = authSetting;
    if (!oneTap) throw 'one tap: disabled';
    return new Promise(function (res, rej) {
        try {
            oneTap.init({
                client_id,
                ...useAuto !== void 0 && {auto_select: useAuto},
                ...oneTap,
                callback(response) {
                    const verifier = new IdTokenVerifier({audience: authSetting.client_id});
                    const {clientId, credential, select_by} = response;
                    const decoded = verifier.decode(credential);
                    const payload = decoded.payload;
                    setVendorPayload(authSetting.vendor, payload);
                    hiddenIframe$Token(authSetting, payload)
                        .then(res, rej)
                }
            });

            oneTap.prompt((notification) => {
                const n = notification;
                if (n.isNotDisplayed() || n.isSkippedMoment()) {
                    rej(n.getNotDisplayedReason() ?? n.getSkippedReason())
                }
            });
        } catch (e) {
            authSetting.oneTap = false; // turnoff
            throw 'one tap: fail and disable';
        }
    })
}

async function hiddenIframe$Token(authSetting, payload) {
    let frame;
    authSetting.prompt = 'none';
    authSetting.hint = payload.sub;
    const url = generateAuthUrl(authSetting);
    frame = createIFrame(url);
    try {
        await iframeLoading(frame);
        return frame$extractPayload(frame, authSetting);
    } finally {
        // frame && frame.remove();
    }
}

async function iframeLoading(frame) {
    // await promisifyEvent(frame, 'load');
    return await waitingFor(_ => frame.contentWindow.location.href !== 'about:blank', 5000);
}

async function window$Token(authSetting, prompt) {
    let frame;
    authSetting.prompt = prompt;
    !prompt && (delete authSetting.prompt);
    const url = generateAuthUrl(authSetting);
    frame = createWindow(url);
    try {
        await windowLoading(frame);
        return frame$extractPayload(frame, authSetting);
    } finally {
        frame && frame.close();
    }
}

function windowLoading(frame) {
    return waitingFor(_ => frame.location.href !== 'about:blank' || frame.closed, popupTimeout);
}

async function code2token(authSetting, payload, frameName) {
    // not in use by now because no solution for cors token
    const {token_endpoint, redirect_uri, client_id, grant_type, client_secret} = authSetting;
    const {code} = payload;
    let response = await axios({
        method: 'POST',
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        data: joinObject({
            token_endpoint, redirect_uri, client_id,
            grant_type, client_secret, code
        }),
        url: token_endpoint
    });

    function joinObject(object, delKv = '=', delPairs = '&') {
        return Object.entries(object)
            .map(pair => pair.join(delKv)).join(delPairs);
    }

}

function frame$extractPayload(frame, authSetting) {
    let location = frame?.contentWindow?.location || frame.location;
    const {protocol, host, pathname} = location;
    const atHome = protocol + '//' + host + pathname === authSetting.redirect_uri;
    if (frame.closed && !atHome) throw ('window auth unexpected closed');
    const hash = location.hash?.slice(1);
    const search = location.search?.slice(1);
    const payload = {...splitUrl(hash), ...splitUrl(search)};
    // if (!('access_token' in payload)) throw ('no access token');
    return setVendorPayload(authSetting.vendor, payload);
}


function vendorSetting(vendor = lastVendor) {
    lastVendor = vendor;
    if (!(vendor in cacheSetting))
        throw ('you are selected vendor that not init already ( missing setting )');
    return cacheSetting[vendor];
}

export function vendorPayload(vendor) {
    const payload = JSON.parse(localStorage[`${vendor}_payload`] || '{}');
    return payload;
}

function setVendorPayload(vendor, payload) {
    if ('error' in payload) throw payload;
    const exp = (payload.expires_in ?? payload.exp) * 1000;
    const newPayload = {
        ...vendorPayload(vendor),
        ...payload,
        ...(!!exp && {timeout: Date.now() + exp})
    };
    localStorage[`${vendor}_payload`] = JSON.stringify(newPayload);
    if (payload.access_token) {
        localStorage[`${vendor}_access`] = payload.access_token;
        fireEvent(vendor, EventTypesEnum.login);
        clearTimeout(logoutTimeout[vendor]);
        if (exp)
            logoutTimeout[vendor] = setTimeout(function () {
                logout(vendor, true);
            }, exp)
    }

    fireEvent(vendor, EventTypesEnum.payload, newPayload);
    return newPayload;
}

function token(vendor) {
    return localStorage[`${vendor}_access`]
}

export function logout(vendor, fromTimeout) {
    let payload = vendorPayload(vendor);
    delete payload.access_token;
    delete payload.timeout;
    localStorage[`${vendor}_payload`] = JSON.stringify(payload);
    delete localStorage[`${vendor}_access`];
    fireEvent(vendor, EventTypesEnum.logout);
    return payload;
}

export async function revoke(vendor, reThrow = false) {
    if (!authSetting.revoke_endpoint) throw 'revoke endpoint not define';
    const authSetting = vendorSetting(vendor);
    const payload = vendorPayload(vendor);
    try {
        await fetch(authSetting.revoke_endpoint, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `token=${payload.access_token}`
        })
    } catch (e) {
        if (reThrow) throw e; else return e;
    } finally {
        logout()
    }
}

function fireEvent(vendor, eventName, data = {}) {
    const event = new Event(eventName);
    event.data = data;
    event.vendor = vendor;
    eventTarget.dispatchEvent(event);
}

function fireError(vendor, e, reThrow) {
    const event = new Event(EventTypesEnum.error);
    const {message, stack} = e;
    const objErr = e instanceof Error ? e : Error(e?.error ?? e);
    Object.assign(event, {
        ...objErr,
        message: e.message,
        stack: e.stack,
        vendor
    });
    const toContinue = eventTarget.dispatchEvent(event);
    if (toContinue && reThrow) {
        throw e;
    }
}

function generateAuthUrl(authSetting) {
    let {
        auth_endpoint, revoke_endpoint, oneTap, vendor,
        token_endpoint, grant_type, client_secret,
        ...opts
    } = authSetting;
    return generateUrl(auth_endpoint, opts);
}

// -------------- helpers ---------- //
function checkSchema(object, schema) {
    for (let sKey in schema) {
        let [must, key] = sKey[0] == '!' ? [true, sKey.slice(1)] : [false, sKey];
        if (!(key in object))
            if (must) throw `${key} must define in setting`;
            else return;

        let value = object[key];
        let schemaType = schema[sKey];
        if (!(
            typeof value === typeof schemaType ||
            typeof value === schemaType.name.toLowerCase() ||
            value instanceof schemaType)) {
            throw `${key} must be ${schemaType.name}`
        }
        if (schemaType.name == 'Object')
            checkSchema(value, schemaType)
    }
}

function windowFeatures(setting) {
    let {left, screenX, top, screenY, width, innerWidth, height, innerHeight} = setting;
    const {menubar, toolbar, location, status, resizable, scrollbars} = setting;
    left = left ?? screenX;
    top = top ?? screenY;
    width = width ?? innerWidth;
    height = height ?? innerHeight;

    const values = joinObject({
        left: left ?? 100,
        top: top ?? 100,
        width: width ?? 200,
        height: height ?? 200,
    }, '=', ',');

    const flags = Object.keys({
        ...menubar && {menubar},
        ...toolbar && {toolbar},
        ...location && {location},
        ...status && {status},
        ...resizable && {resizable},
        ...scrollbars && {scrollbars}
    }).join(',')

    return values + ',' + flags;

}

function joinObject(object, delKv = '=', delPairs = '&') {
    return Object.entries(object)
        .map(pair => pair.join(delKv)).join(delPairs);
}

function splitUrl(string, delKv = '=', delPairs = '&') {
    string = string ?? decodeURIComponent(location.search.slice(1));
    if (!string) return {};
    const entries = string.split(delPairs).map(pairs => pairs.split(delKv));
    return Object.fromEntries(entries);
}

function promisifyEvent(eventTarget, event, timeout) {
    return new Promise(function (res, rej) {
        try {
            eventTarget.addEventListener(event, res);
        } catch (e) {
            // nothing ... catch the case addEventListener throw error
        }
        timeout && setTimeout(rej, timeout);
    })
}

function waitingFor(assert, timeout) {
    let intKey = null;

    function stop() {
        clearInterval(intKey)
    }

    const promise = new Promise(function (res, rej) {
        intKey = setInterval(function () {
            let value;
            try {
                if ((value = assert()) !== false) {
                    res(value);
                    stop();
                }
            } catch (e) {
                return 'nothing to do';
            }
        });
        timeout && setTimeout(function () {
            stop();
            rej(`safe popup timeout of ${timeout}ms`);
        }, timeout);
    });

    return {
        then: promise.then.bind(promise),
        stop
    }
}

function createIFrame(src, name = 'oauthIframe') {
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = src;
    frame.name = name;
    document.body.append(frame);
    return frame;
}

function createWindow(src, features, name = 'oauthWindow') {
    const frame = window.open(src, name,
        windowFeatures({
            width: 450,
            height: 520,
            ...features
        }));
    return frame;
}

function createFormRequest(src, targetName, data) {
    // Create <form> element to use to POST data to the OAuth 2.0 endpoint.
    var form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', src);
    form.setAttribute('target', targetName);


    for (let key in data) {
        var tokenField = document.createElement('input');
        tokenField.setAttribute('type', 'hidden');
        tokenField.setAttribute('name', key);
        tokenField.setAttribute('value', data[key]);
        form.appendChild(tokenField);
    }

    document.body.appendChild(form);
    form.submit();
    setTimeout(function () {
        form.remove();
    }, 100);
}

function generateUrl(url, opts) {
    return `${url}?${joinObject(opts)}`
}

/*
* like Object.assign but deep
* */
function deepAssign(target, ...sources) {
    for (let source of sources) {
        for (let k in source) {
            let vs = source[k], vt = target[k];
            if (Object(vs) == vs && Object(vt) === vt) {
                target[k] = deepAssign(vt, vs)
                continue;
            }
            target[k] = source[k];
        }
    }
    return target;
}


function catchi(fn, resFn) {
    return function (...args) {
        try {
            fn(...args)
        } catch (e) {
            resFn(e, ...args);
            throw e;
        }

    }

}
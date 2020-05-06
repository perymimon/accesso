<template>
    <div>
        <h4>{{name}}</h4>
        <strong>connect status </strong>
        <div>login: {{isLogged}}</div>
        <div name="event">
            <span class="key-value-list" v-for="(event, counter) in events">
                <dt>{{event}} </dt>
                <dd>{{counter}} </dd>
            </span>
        </div>
        <div v-if="error">error: {{error.message}}</div>
        <button @click="login()">login</button>
        <button @click="connect()">auto connect</button>
        <button @click="switchUser()">switch user</button>
        <button @click="revoke()">revoke user</button>
        <button @click="logout()">logout user</button>
        <dl class="key-value-list">
            <template v-for="(vp, k) in payload">
                <dt :key="k">{{k}}</dt>
                <dd>{{vp}}</dd>
            </template>
        </dl>
    </div>
</template>

<script>
    import * as Accesso from "../src/providers";

    export default {
        name: 'vendor',
        vendor: null,
        props: {
            name: String,
            clientId: String,
            redirectUri: String,
            scope: String
        },

        data() {
            const vendor = Accesso[this.name];
            this.vendor = vendor;
            const {clientId, redirectUri, scope} = this;
            const setting = {};
            if (clientId) setting.client_id = clientId;
            if (redirectUri) setting.redirect_uri = redirectUri;
            if (scope) setting.scope = scope;
            vendor.init(setting);
            return {
                isLogged: true,
                payload: {},
                error: null,
                events: {
                    renew: 0,
                    login: 0,
                    payload: 0,
                    logout: 0,
                    error: 0,
                }
            };
        },
        mounted() {
            const {vendor, updateError, updateEventCounter} = this;
            this.updatePayload();
            vendor.addEventListener('error', updateError);
            for (let event in this.events) {
                this.vendor.addEventListener(event, updateEventCounter);
            }
        },
        destroyed() {
            this.vendor.removeEventListener('error', this.updateError);
            Accesso.removeAllEventListener(this.name);

        },
        methods: {
            updateEventCounter(event) {
                this.$data.events[event.type]++;
            },
            async connect() {
                let res = await this.vendor.connect(true);
                this.updatePayload();
            },
            async login() {
                let res = await this.vendor.login(true);

                this.updatePayload();
            },
            async switchUser() {
                let res = await this.vendor.switchUser();
                this.updatePayload();
            },
            async revoke() {
                let res = await this.vendor.revoke();
                this.updatePayload();
            },
            async logout() {
                let res = await this.vendor.logout();
                this.updatePayload();
            },
            updateError(e) {
                this.error = e;
            },
            updatePayload() {
                this.payload = this.vendor.vendorPayload();
            },
        },
        computed: {

            user() {
                return this.vendor.user()
            },
            token() {
                return this.vendor.token()
            },
        }
    };
</script>

<style lang="scss" scoped>
    .key-value-list {
        width: min-content;
        display: inline-grid;
        grid-template-areas: "key value";
        grid-template-columns: 1fr 1fr;
        gap: 0.3em;
        padding: .5em;

        & * {
            margin: 0;
        }

        & :nth-of-type(2n) {
            background-color: #f8f8f8;
        }
    }
</style>
<template>
    <div id="app">
        <vendor v-for="(provider, index) of providers" v-bind="provider"/>
    </div>
</template>

<script>
    import vendor from './vendor';

    export default {
        components: {
            vendor
        },
        data() {
            return {
                providers: [{
                    name: 'google',
                    clientId: '867384973590-d2c4i9kcufb212btaogi7bj0nh57nbo2.apps.googleusercontent.com',
                    redirectUri: 'http://localhost:4000/google/callback',
                    scope: 'openid profile email https://www.googleapis.com/auth/books https://www.googleapis.com/auth/drive.file'
                }, {
                    name: 'github',
                    clientId: 'abc071c049fb02070805',
                    redirectUri: 'http://localhost:4000/github/callback',
                    scope: ''
                },{
                    name:'linkdin',
                    clientId: '86d43e35dhdr0x',
                    redirectUri:'http://localhost:4000/linkdin/callback',
                }],

            };
        }
    };
</script>

<style lang="scss">
    .container {
        color: green;
    }
</style>
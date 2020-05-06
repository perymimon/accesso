// index.js

import Vue from 'vue';
import App from './vendores.vue';
import vendor from './vendor';
new Vue({
    el:'#app',
    components:{
        vendor
    },
    render: createElement => createElement(App)

});

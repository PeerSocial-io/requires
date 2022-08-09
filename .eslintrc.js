module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true,
        "es2021": true,
        "amd": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended"
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        // "globals": ["Promise"],
        "semi": "error"
        ,"no-unused-vars": "warn" // just complaint a little about not using variables
        ,"no-async-promise-executor": "off" // disabled  async promise callback error
    }
};

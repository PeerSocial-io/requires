var requires="undefined"!=typeof window?window.requires():require("./index.js")();!async function(e){var a=e("assert"),i={};e.debug=!0,e.home("./test_app"),i.gun=await e.install("gun"),a.equal(void 0===i.gun.version,!1,"gun should Have a version"),i.bnjs=await e.install("bn.js"),a.equal(void 0===i.bnjs.BN,!1,"bnjs should Have a BN in object"),i.elliptic=await e.install("elliptic"),a.equal(void 0===i.elliptic.version,!1,"elliptic should Have a version"),i.pako=await e.install("pako"),a.equal(void 0===i.pako.ungzip,!1,"pako should Have a ungzip in object"),i.app=await e.install("./"),a.equal("object"==typeof i.app,!0,"App should be a Object"),a.equal(i.app.hello,"world","app.hello should equal 'world'"),console.log("configured_packages",i),"undefined"!=typeof module&&(module.exports=i)}(requires);
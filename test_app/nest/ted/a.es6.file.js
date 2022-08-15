
let crypto = await import('crypto').then((WebCrypto) => { return WebCrypto.webcrypto; });
// a basic esmodule
import worldVal from "./anotherDep.js";

async function hello(){
return new Promise((resolve)=>{
  resolve();
});
}

export default (function world(worldVal){
  return worldVal;
})(worldVal);

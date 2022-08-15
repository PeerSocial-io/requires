
//your old basic nodejs module

var configured_packages = require("./nest/helloVal.js");
var React = require("react");

class ShoppingList extends React.Component {
    render() {
      return (
        <div className="shopping-list">
          <ul>
            <li>Instagram</li>
            <li>WhatsApp</li>
            <li>Oculus</li>
          </ul>
        </div>
      );
    }
  }


  console.log("app reading process object",process);
// debugger;
// throw new Error("darn")

    // configured_packages.bnjs = require("bn.js");
    // // console.log("bnjs", configured_packages.bnjs);

    configured_packages.ShoppingList = ShoppingList;
    // console.log("ShoppingList", configured_packages.ShoppingList);

    // configured_packages.elliptic = require("elliptic");
    // // console.log("elliptic", configured_packages.elliptic);

    // configured_packages.buffer = require("buffer");
    // // console.log("buffer", configured_packages.buffer);

    // configured_packages.webcrypto = require("@peculiar/webcrypto");
    // // console.log("webcrypto", configured_packages.webcrypto);

    // configured_packages.forge = require("node-forge");
    // // console.log("forge", configured_packages.forge);

    
module.exports = configured_packages;
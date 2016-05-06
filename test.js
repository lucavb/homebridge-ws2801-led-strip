var leds = require("rpi-ws2801");
var rgbConversion = require("./rgbConversion");

leds.connect(32);

// leds.fill(0xFF, 0xFF, 0xFF);

console.log(rgbConversion.rgbToHsl(255, 255, 255));

console.log(rgbConversion.hslToRgb(0,0,50));

leds.fill(64, 64, 64);
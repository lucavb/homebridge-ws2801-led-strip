var Service;
var Characteristic;
var HomebridgeAPI;
var ledsGlobal = require("rpi-ws2801");
var rgbConversion = require("./rgbConversion");

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    HomebridgeAPI = homebridge;

    homebridge.registerAccessory("homebridge-ws2801-led-strip", "ws2801-led-strip", WS2801LED);
};

function WS2801LED(log, config) {
    this.log = log;
    this.name = config.name;
    this.leds = ledsGlobal  // i know this is not good. on top doesn't work because it would disable multiple light strips
    this.leds.connect(config.led_count);
    this.leds.fill(0xFF, 0xFF, 0xFF);
    this.lastFill = {};
    this.lastFill.r = 0xFF;
    this.lastFill.g = 0xFF;
    this.lastFill.b = 0xFF;
    this.lastHSL = rgbConversion.rgbToHsl(255, 255, 255);

    // info service
    this.informationService = new Service.AccessoryInformation();
        
    this.informationService
    .setCharacteristic(Characteristic.Manufacturer, "LED")
    .setCharacteristic(Characteristic.Model, config.model || "WS2801")
    .setCharacteristic(Characteristic.SerialNumber, config.serial || "813E5CAB-63E4-4623-9594-4B16A01EAB1B");




    // lux service

    this.service_led = new Service.Lightbulb(this.name);

    this.service_led.getCharacteristic(Characteristic.On)
        .on('get', this.getOn.bind(this));
    this.service_led.getCharacteristic(Characteristic.On)
        .on('set', this.setOn.bind(this));

    this.service_led.getCharacteristic(Characteristic.Hue)
        .on('get', this.getHue.bind(this));
    this.service_led.getCharacteristic(Characteristic.Hue)
        .on('set', this.setHue.bind(this));

    this.service_led.getCharacteristic(Characteristic.Saturation)
        .on('get', this.getSat.bind(this));
    this.service_led.getCharacteristic(Characteristic.Saturation)
        .on('set', this.setSat.bind(this));

    this.service_led.getCharacteristic(Characteristic.Brightness)
        .on('get', this.getBright.bind(this));
    this.service_led.getCharacteristic(Characteristic.Brightness)
        .on('set', this.setBright.bind(this));
}

WS2801LED.prototype.getServices = function() {
    return [this.informationService, this.service_led];
};








WS2801LED.prototype.setOn = function(status, callback) {
    if (status) {
        this.leds.fill(0xFF, 0xFF, 0xFF);
        this.lastFill.r = 0xFF;
        this.lastFill.g = 0xFF;
        this.lastFill.b = 0xFF;
    } else {
        this.leds.fill(0x00, 0x00, 0x00);
        this.lastFill.r = 0x00;
        this.lastFill.g = 0x00;
        this.lastFill.b = 0x00;
    }
    
    callback();
};

WS2801LED.prototype.getOn = function(callback) {
    if (this.lastFill.r == 0 && this.lastFill.g == 0 && this.lastFill.b == 0) {
        callback(null, 0);
    } else {
        callback(null, 1);
    }
};





WS2801LED.prototype.getHue = function(callback) {
    callback(null, this.lastHSL[0]);
};

WS2801LED.prototype.setHue = function(level, callback) {
    this.lastHSL[0] = level;
    var rgb = rgbConversion.hslToRgb(this.lastHSL[0], this.lastHSL[1], this.lastHSL[2]);
    this.leds.fill(rgb.r, rgb.g, rgb.b);
    this.lastFill = rgb;
    callback();
};






WS2801LED.prototype.getSat = function(callback) {
    callback(null, this.lastHSL[1]);
};

WS2801LED.prototype.setSat = function(level, callback) {
    this.lastHSL[1] = level;
    var rgb = rgbConversion.hslToRgb(this.lastHSL[0], this.lastHSL[1], this.lastHSL[2]);
    this.leds.fill(rgb.r, rgb.g, rgb.b);
    this.lastFill = rgb;
    callback();
};




WS2801LED.prototype.getBright = function(callback) {
    callback(null, this.lastHSL[2]);
};

WS2801LED.prototype.setBright = function(level, callback) {
    this.lastHSL[2] = level;
    var rgb = rgbConversion.hslToRgb(level);
    this.leds.fill(rgb.r, rgb.g, rgb.b);
    this.lastFill = rgb;
    callback();
};



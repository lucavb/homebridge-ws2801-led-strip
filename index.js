var Service;
var Characteristic;
var HomebridgeAPI;
var ledsGlobal = require("rpi-ws2801");
var rgbConversion = require("./rgbConversion");
var Gpio = require('onoff').Gpio;

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
    this.ledsStatus = {
        "on" : true,
        "values" : rgbConversion.rgbToHsl(255, 255, 255)
    };

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


    this.service_led.getCharacteristic(Characteristic.On).setValue(this.ledsStatus.on);
    this.service_led.getCharacteristic(Characteristic.Hue).setValue(this.ledsStatus.values[0]);
    this.service_led.getCharacteristic(Characteristic.Saturation).setValue(this.ledsStatus.values[1]);
    this.service_led.getCharacteristic(Characteristic.Brightness).setValue(this.ledsStatus.values[2]);




    // button support

    if (config.buttonID) {
        this.button = new Gpio(config.buttonID, 'in', 'both');
        var that = this;
        this.buttonPressStamp = null;
        this.shortPressRGB = config.shortPressRGB;
        this.button.watch(function(err, value) {
            if (value == 1) {
                that.buttonPressStamp = new Date();
            } else {
                var now = new Date();
                if (now - that.buttonPressStamp < 250) {
                    var rgb = that.shortPressRGB;

                    that.ledsStatus.on = true;
                    that.ledsStatus.values = rgbConversion.rgbToHsl(rgb[0], rgb[1], rgb[2]);


                    that.service_led.getCharacteristic(Characteristic.On).setValue(that.ledsStatus.on);
                    that.service_led.getCharacteristic(Characteristic.Hue).setValue(that.ledsStatus.values[0]);
                    that.service_led.getCharacteristic(Characteristic.Saturation).setValue(that.ledsStatus.values[1]);
                    that.service_led.getCharacteristic(Characteristic.Brightness).setValue(that.ledsStatus.values[2]);
                } else if (now - that.buttonPressStamp < 1250) {


                    that.ledsStatus.values[2] = (that.ledsStatus.values[2] + 25) % 100;
                    that.ledsStatus.on = true;

                    that.service_led.getCharacteristic(Characteristic.On).setValue(that.ledsStatus.on);
                    that.service_led.getCharacteristic(Characteristic.Brightness).setValue(that.ledsStatus.values[2]);

                } else {
                    that.ledsStatus.on = false;
                    that.service_led.getCharacteristic(Characteristic.On).setValue(that.ledsStatus.on);
                    return;
                }
            }
        });
        process.on('SIGINT', function () {
            that.button.unexport();
        });
    }
}

WS2801LED.prototype.getServices = function() {
    return [this.informationService, this.service_led];
};








WS2801LED.prototype.setOn = function(status, callback) {
    if (status) {
        var rgb = rgbConversion.hslToRgb(this.ledsStatus.values[0], this.ledsStatus.values[1], this.ledsStatus.values[2]);
        this.leds.fill(rgb.r, rgb.g, rgb.b);
        this.ledsStatus.on = true;
    } else {
        this.leds.clear();
        this.ledsStatus.on = false;
    }
    callback();
};

WS2801LED.prototype.getOn = function(callback) {
    callback(null, this.ledsStatus.on);
};





WS2801LED.prototype.getHue = function(callback) {
    callback(null, this.ledsStatus.values[0]);
};

WS2801LED.prototype.setHue = function(level, callback) {
    this.ledsStatus.values[0] = level;
    if (this.ledsStatus.on) {
        var rgb = rgbConversion.hslToRgb(this.ledsStatus.values[0], this.ledsStatus.values[1], this.ledsStatus.values[2]);
        this.leds.fill(rgb.r, rgb.g, rgb.b);
    }
    callback();
};






WS2801LED.prototype.getSat = function(callback) {
    callback(null, this.ledsStatus.values[1]);
};

WS2801LED.prototype.setSat = function(level, callback) {
    this.ledsStatus.values[1] = level;
    if (this.ledsStatus.on) {
        var rgb = rgbConversion.hslToRgb(this.ledsStatus.values[0], this.ledsStatus.values[1], this.ledsStatus.values[2]);
        this.leds.fill(rgb.r, rgb.g, rgb.b);
    }
    callback();
};




WS2801LED.prototype.getBright = function(callback) {
    callback(null, this.ledsStatus.values[2]);
};

WS2801LED.prototype.setBright = function(level, callback) {
    this.ledsStatus.values[2] = level;
    if (this.ledsStatus.on) {
        var rgb = rgbConversion.hslToRgb(this.ledsStatus.values[0], this.ledsStatus.values[1], this.ledsStatus.values[2]);
        this.leds.fill(rgb.r, rgb.g, rgb.b);
    }
    callback();
};



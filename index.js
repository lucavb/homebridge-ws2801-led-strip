var Service;
var Characteristic;
var HomebridgeAPI;
var ledsGlobal = require("rpi-ws2801");
var ads1x15 = require('./node-ads1x15/index');
var rgbConversion = require("./rgbConversion");
var Gpio = require('onoff').Gpio;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    HomebridgeAPI = homebridge;

    homebridge.registerAccessory("homebridge-ws2801-led-strip", "ws2801-led-strip", WS2801LED);
};

function WS2801LED(log, config) {
    var that = this;
    this.log = log;
    this.name = config.name;
    this.leds = ledsGlobal; // i know this is not good. on top doesn't work because it would disable multiple light strips
    this.leds.connect(config.led_count);
    this.leds.fill(0xFF, 0xFF, 0xFF);
    this.ledsStatus = {
        "on" : true,
        "values" : rgbConversion.rgbToHsl(255, 255, 255)
    };

    if (config.adc) {
        this.adc = new ads1x15(config.adc.adsChip || 1);
        this.channel = config.adc.adcChannel || 0;
        this.samplesPerSecond =  config.adc.samplesPerSecond || '250';
        this.progGainAmp = config.adc.progGainAmp || '4096';
        this.upperBound = config.adc.upperBound || 32767;
        this.lowerBound = config.adc.lowerBound || 0;
        this.potentioVCC = new Gpio(config.adc.potentioVCC, 'out');
    }

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
        this.buttonPressStamp = null;
        this.shortPressRGB = config.shortPressRGB;
        this.button.watch(function(err, value) {
            if (value == 1) {
                that.buttonPressStamp = new Date();
            } 
            else {
                var now = new Date();
                var diff = now - that.buttonPressStamp;
                if (diff < 250) {
                    that.ledsStatus.on = !that.ledsStatus.on;
                    that.service_led.getCharacteristic(Characteristic.On).setValue(that.ledsStatus.on);
                } else if (diff < 1250) {
                    var rgb = that.shortPressRGB;
                    that.ledsStatus.on = true;
                    that.ledsStatus.values = rgbConversion.rgbToHsl(rgb[0], rgb[1], rgb[2]);
                    that.service_led.getCharacteristic(Characteristic.On).setValue(that.ledsStatus.on);
                    that.service_led.getCharacteristic(Characteristic.Hue).setValue(that.ledsStatus.values[0]);
                    that.service_led.getCharacteristic(Characteristic.Saturation).setValue(that.ledsStatus.values[1]);
                    that.service_led.getCharacteristic(Characteristic.Brightness).setValue(that.ledsStatus.values[2]);
                } else {
                    var old_value = -1;
                    that.potentioVCC.writeSync(1);
                    if(that.adc && !that.intervalPotentio) {
                        that.intervalPotentio = setInterval(function() {
                            if(!that.adc.busy) {
                                that.adc.readADCSingleEnded(
                                    that.channel, 
                                    that.progGainAmp, 
                                    that.samplesPerSecond, 
                                    function(err, data) 
                                {
                                    var val = 100 - parseInt(((Math.abs(data) - that.lowerBound) / (that.upperBound - that.lowerBound))* 100);
                                    if (val == old_value) return;
                                    old_value = val;
                                    that.ledsStatus.on = true;
                                    that.ledsStatus.values[2] = val;
                                    that.service_led.getCharacteristic(Characteristic.On).setValue(that.ledsStatus.on);
                                    that.service_led.getCharacteristic(Characteristic.Hue).setValue(that.ledsStatus.values[0]);
                                    that.service_led.getCharacteristic(Characteristic.Saturation).setValue(that.ledsStatus.values[1]);
                                    that.service_led.getCharacteristic(Characteristic.Brightness).setValue(that.ledsStatus.values[2]);
                                });
                            }
                        }, 150);
                        setTimeout(function() {
                            clearInterval(that.intervalPotentio);
                            that.intervalPotentio = null;
                            that.potentioVCC.writeSync(0);
                        }, 10*1000);
                    } else if (that.adc && that.intervalPotentio) {
                        clearInterval(that.intervalPotentio);
                        that.intervalPotentio = null;
                        that.potentioVCC.writeSync(0);
                    }
                }
                    
            }
        });
        process.on('SIGINT', function () {
            that.button.unexport();
        });
    }

    if (config.rewrite && config.rewrite > 0) {
        this.interval = setInterval(function() {
            that.setOn(that.ledsStatus.on, function() {});
        }, config.rewrite * 1000);
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



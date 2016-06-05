

# Homebridge WS2801 LED Strip Plugin

This plug-in enables you to control your WS2801 LED strip with a Raspberry Pi. 

## Connecting and setting up

Connect the GPIO pins from your Raspberry Pi as outlined in this table.

| Raspberry Pi GPIO | LED Strip Connection |
|-------------------|----------------------|
| Any GND Port      | GND                  |
| SCLK              | CI                   |
| MOSI              | DI                   |

This will means that you won't be able to use your second SPI interface anymore, because the LED strip does not make use of the CE0 port.

Also you are going to need a power supply that provides enough current for your LED strip. In addition you should connect the GND port of your power supply with the GND port of the Raspberry Pi in someway. Most of the time this is already done with the wiring soldered onto the strip.

You can also check out the setup presented on this [page](https://github.com/Jorgen-VikingGod/node-rpi-ws2801). This homebridge plug-in utilizes this module.

## Installation

This project is currently not submitted to npmjs so you will need to manually download this plug-in put it somewhere on your Raspberry Pi, download the dependencies and alter the command you run for homebridge to find this plug-in. How this is done can be seen on this [page](https://github.com/nfarina/homebridge).

## Config.json file

```json
	{
        "accessory" : "ws2801-led-strip",
        "name" : "Floor LED",
        "led_count" : 70,
        "serial" : "XXXXXXXXXX",
        "shortPressRGB" : [230, 111, 0],
        "buttonID" : 20
    }
```

| Key           | Description                                                                        |
|---------------|------------------------------------------------------------------------------------|
| accessory     | Required. Has to be "ws2801-led-strip"                                             |
| led_count     | Required. The number of LEDs you want to control with this plug-in. In this case 70 |
| serial        | Optional. You can choose to define a serial number for this accessory              |
| shortPressRGB | Optional. You can define an RGB color that can be enable by pressing an button.    |
| buttonID      | Optional. The port number where the button is connected. View previous row.        |

The way this button works is as followed. Pressing it once, will enable the color set in 'shortPressRGB'. If you press it longer but less than 1250 ms it will increase the brightness by 25 on a scale from 0 to 100. Pressing longer than 1250 ms will disable the light strip.
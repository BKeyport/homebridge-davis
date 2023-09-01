# Homebridge Davis (Fixed) 
This is a Homebridge plugin that allows you to integrate your Davis WeatherLink Live station. 

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

## Manual Installation
You must have Homebridge already installed, then just install the plugin by running `npm install -g homebridge-davis`

## GUI installation
Search for `homebridge-davis` and install. 

## How It Works
This will call your Davis WeatherLink Live station API. It will search your Davis Weatherlink local stations for the station of your choice and display data. 

You can also select the internal (indoor) temps as evaluated by the Weatherlink Live control box. 


The API will be called once at start up and polled periodically.  The results will be stored in memory, to prevent slowness when opening the Home app.

## Configuration
This plugin now does a graphical configuration. Please click "Settings" and follow the prompts. You will find everything needed there. 

The following is explainations of the fields: 

Device Name -  HomeKit's name for the weather station. 

Manufacturer - This is a string to define who makes the device. Up to you. 

Model - This is to help homekit count the device as unique. Up to you. 

Serial Number - Any combo of letters and numbers - MUST BE UNIQUE. Homekit and some programs needs this to count the device. 

URL - http://ip address/v1/current conditions. Replace "Ip address" with the address of your unit

Trasmitter ID -  the station's ID under "Device Configuration" on weatherlink.com.

Polling interval - How often should it recheck? (Note: Set different values if you're using more than one device on the same Weatherlink hub) 

Units - Does your weather station provide temperature in Fahrenheit or Celsius. Homebridge needs to convert to Celsius for Homekit. 

Use Internal Measurements - This will switch the plugin to use the internal/indoor measurements rather than external. 

Note: The plugin will report "Socket hang up" from time to time. This is normal. I suspect the WLL box isn't able to handle generating the result and scaning the weather stations at the same time. This is why the polling interval is suggested to be different values above. The system will drift naturally and have more successes as it runs. 

Testing is needed - if you use this - please let me know through github issues - if it works, if it don't, if something else is wrong, or if you can get rid of the "socket hang up" issue. 

Original Code by pmoon00, modifications and new work by bkeyport


## Donation

As with all of my work, I don't want compensation for this. I would however, like you to donate to L'Arche Tahoma Hope, a 501(c)3 home for the disabled. 

Please donate to https://www.larchetahomahope.org/donate/ - Mark it in honor of Nancy Tyson or make a comment to the same. Thank you. 




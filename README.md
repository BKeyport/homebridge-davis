# Homebridge Davis Fixed
This is a Homebridge plugin that allows you to integrate your Davis WeatherLink Live station API.

## Installation
You must have Homebridge already installed, then just install the plugin by running `npm install -g homebridge-davisfixed`

## How It Works
This will call your Davis WeatherLink Live station API.  The endpoint it is designed for is /v1/current_conditions.  It will look at the following JSON path for temperature and humidity.

* Temperature - `data.conditions[0].temp`
* Humidity - `data.conditions[0].hum`

The API will be called once at start up and polled periodically.  The results will be stored in memory, to prevent slowness when opening the Home app.

## Configuration
This plugin now does a graphical configuration. Please click "Settings" and follow the prompts. You will find everything needed there. 

I have fixed the following problems: 
1) There was a conversion problem within the original code. It now converts correctly between units for Homekit. 
2) Configuration bugs were present, and that is now fixed with the GUI style configuration

Original Code by pmoon00, modifications and new work by bkeyport

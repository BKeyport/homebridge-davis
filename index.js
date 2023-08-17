var Service, Characteristic;
var request = require("request");

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-DavisFixed", "DavisFixed", DavisFixed);
}

function DavisFixed(log, config) {
  this.log = log;

  // Config
  this.url = config["url"];
  this.name = config["name"];
  this.manufacturer = config["manufacturer"] || "NotSetByUser";
  this.model = config["model"] || "NotSetByUser";
  this.pollingIntervalSeconds = parseInt(config["pollingIntervalSeconds"] || 300);
  this.temperatureUnitOfMeasure = (config["temperatureUnitOfMeasure"] || "C").toUpperCase();
  this._timeoutID = -1;
  this._cachedData = { "temperature": 0, "humidity": 0, "temperaturein": 0, "humidityin": 0 };
  this.serial = config["serial"] || "NotSetByUser";
  this.getData(this.url);
}

DavisFixed.prototype = {
  httpRequest: function (url, body, method, callback) {
    request({
      url: url,
      body: body,
      method: method
    },
    function (error, response, body) {
      callback(error, response, body)
    })
  },

	getStateHumidityin: function (callback) {
		callback(null, this._cachedData.humidityin);
	},

	getStateTemperaturein: function (callback) {
		callback(null, this._cachedData.temperaturein);
	},

	getStateHumidity: function (callback) {
		callback(null, this._cachedData.humidity);
	},

	getStateTemperature: function (callback) {
		callback(null, this._cachedData.temperature);
	},

  getServices: function () {
    var services = [],
      informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);
    services.push(informationService);

    this.temperatureService = new Service.TemperatureSensor(this.name);
		this.temperatureService
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on("get", this.getStateTemperature.bind(this));
	services.push(this.temperatureService);

    this.humidityService = new Service.HumiditySensor(this.name);
		this.humidityService
			.getCharacteristic(Characteristic.CurrentRelativeHumidity)
			.setProps({minValue: 0, maxValue: 100})
			.on("get", this.getStateHumidity.bind(this));
	services.push(this.humidityService);


    return services;
  },

  getData: function (url) {
    this.httpRequest(url, "", "GET", function (error, response, responseBody) {
      var queue = function () {
        if (this._timeoutID > -1) {
          clearTimeout(this._timeoutID);
          this._timeoutID = -1;
        }

        this._timeoutID = setTimeout(function () {
          this._timeoutID = -1;
          this.getData(this.url);
        }.bind(this), this.pollingIntervalSeconds * 1000);
      }.bind(this);

      if (error) {
        this.log.error("Request to Davis API failed: %s", error.message);
        queue();
        return;
      }

      this.log("Request to Davis API succeeded!");

      var jsonResponse = JSON.parse(responseBody);

      if (jsonResponse.data && (!jsonResponse.data.conditions || jsonResponse.data.conditions.length == 0)) {
        this.log.error("Response from Davis API doesn't contain expected result.");
        queue();
        return;
      }

      var weatherResponse = jsonResponse.data.conditions[0];

      this._cachedData = {
        "temperature": this.temperatureUnitOfMeasure == "F" ? this.convertFromFahrenheitToCelsius(weatherResponse.temp) : weatherResponse.temp,
        "humidity": Math.round(weatherResponse.hum),


      };
      this.log.debug("Outdoor: Temp %s/%s, Hum %s", this._cachedData.temperature, weatherResponse.temp, this._cachedData.humidity);
      queue();
    }.bind(this));
  },
  convertFromFahrenheitToCelsius: function (f) { //MUST BE A NUMBER!
    return parseFloat(((f - 32) * (5 / 9)).toFixed(1));
  }
};

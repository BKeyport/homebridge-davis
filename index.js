var Service, Characteristic;
var request = require("request");

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-davis", "davis", davis);
}

function davis(log, config) {
	this.log = log;

	// Config
	this.url = config["url"];
	this.name = config["name"];
	this.manufacturer = config["manufacturer"] || "NotSetByUser";
	this.model = config["model"] || "NotSetByUser";
	this.pollingIntervalSeconds = parseInt(config["pollingIntervalSeconds"] || 300);
	this.temperatureUnitOfMeasure = (config["temperatureUnitOfMeasure"] || "C").toUpperCase();
	this._timeoutID = -1;
	this._cachedData = { "temperature": 0, "humidity": 0, "PM2p5:": 0, "PM10": 0};
	this.serial = config["serial"] || "NotSetByUser";
	this.getData(this.url);
	this.txid = config["txid"] || 1;
	this.useInternal = config ["useInternal"] || false; 
	this.sensorType = config ["sensorType"] || 1  ;

	//defaults 
	this.temperature = 0;
	this.humidity = 0;
	//Specific to Airlink
	this.PM2p5 = 0;
	this.PM10 = 0;

}

function computeAqiFromPm(averagePM25, averagePM10) {
  const limits25 = [15, 30, 55, 110]
  const limits10 = [25, 50, 90, 180]
  if (averagePM25 === 0 && averagePM10 === 0) {
   return Characteristic.AirQuality.UNKNOWN;
  }
  if (averagePM25 <= limits25[0] && averagePM10 <= limits10[0]) {
   return Characteristic.AirQuality.EXCELLENT;
  }
  if (averagePM25 <= limits25[1] && averagePM10 <= limits10[1]) {
   return Characteristic.AirQuality.GOOD;
  }
  if (averagePM25 <= limits25[2] && averagePM10 <= limits10[2]) {
   return Characteristic.AirQuality.FAIR;
  }
  if (averagePM25 <= limits25[3] && averagePM10 <= limits10[3]) {
   return Characteristic.AirQuality.INFERIOR;
  }
  return Characteristic.AirQuality.POOR;
}

davis.prototype = {
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

	getStateHumidity: function (callback) {
		callback(null, this._cachedData.humidity);
	},

	getStateTemperature: function (callback) {
		callback(null, this._cachedData.temperature);
	},

	getAirQuality: function (callback) {
		callback(null, this._cachedData.airQuality);
	},
	
	getPM2p5: function (callback) {
		callback(null, this._cachedData.PM2p5);
	},
	
	getPM10: function (callback) {
		callback(null, this._cachedData.PM10);
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

		if (this.sensorType == 3) { 
			this.airQualityService = new Service.AirQualitySensor(this.name);
			
			this.airQualityService
				.getCharacteristic(Characteristic.AirQuality)
				.on("get", this.getAirQuality.bind(this));
			
/*			this.airQualityService
				.getCharacteristic(Characteristic.PM2p5Density)
				.on("get", this.getPM2p5.bind(this)); 
*/

			this.airQualityService
				.getCharacteristic(Characteristic.PM10Density)
				.on("get", this.getPM10.bind(this));

				
			services.push(this.airQualityService);
		}

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

			let weather = jsonResponse.data.conditions;
			let length = weather.length;
			
			if (this.useInternal) {
				this.sensorType = 2;
			}

			for (let i = 0; i < length; i++) {
				/* known to me data structure types: 
				 * Vantage data: https://weatherlink.github.io/weatherlink-live-local-api/
				 * Airlink data: https://weatherlink.github.io/airlink-local-api/
				 * 
				 * 1: Vantage External (at minimum)  
				 * 2: Leaf/Soil Moisture records 
				 * 3: Barometrics
				 * 4: Internal (Weatherlink Transmitter) 
				 * 5: Airlink Old Format External 
				 * 6: Airlink New Format External
				 */
				switch (weather[i].data_structure_type) {
					case 1: 
						if (this.sensorType == 1) {
							if (weather[i].txid == this.txid) {
								this.temperature = weather[i].temp;
								this.humidity = weather[i].hum;
							}
						}
						break;

					case 4: 
						if (this.sensorType == 2) {
							this.temperature = weather[i].temp_in;
							this.humidity = weather[i].hum_in; 
						}
						break;

					case 5:
						if (this.sensorType == 3) {
							this.temperature = weather[i].temp;
							this.humidity = weather[i].hum; 
							this.PM10 = weather[i].pm_10p0;
							this.PM2p5 = weather[i].pm_2p5;
						}
						break; 

					case 6: 
						if (this.sensorType == 3) {
							this.temperature = 	weather[i].temp;
							this.humidity = weather[i].hum; 
							this.PM10 = weather[i].pm_10;
							this.PM2p5 = weather[i].pm_2p5;
							this.log.debug("%s %s %s %s", this.temperature, this.humidity, this.PM10, this.PM2p5);
						}
						break; 

					default: 
						break;
				}
			}
			this.log.debug("%s %s %s %s", this.temperature, this.humidity, this.PM10, this.PM2p5);

			if (this.sensorType == 3) { 
				this._cachedData = {
					"temperature": this.temperatureUnitOfMeasure == "F" ? this.convertFromFahrenheitToCelsius(this.temperature) : this.temperature,
					"humidity": Math.round(this.humidity),
					"PM2p5": this.PM2p5,
					"PM10": this.PM10,
					"airQuality": computeAqiFromPm(this.PM2p5, this.PM10),
				}
			} else {
				this._cachedData = {
					"temperature": this.temperatureUnitOfMeasure == "F" ? this.convertFromFahrenheitToCelsius(this.temperature) : this.temperature,
					"humidity": Math.round(this.humidity),
				}
			};
			this.log.debug("%s %s %s %s", this.temperature, this.humidity, this.PM2p5, this.PM10);
			this.log.debug("%s %s %s %s", this._cachedData.temperature,  this._cachedData.humidity, this.PM2p5, this.PM10);
			queue();
		}.bind(this));
	},

	convertFromFahrenheitToCelsius: function (f) { //MUST BE A NUMBER!
		return parseFloat(((f - 32) * (5 / 9)).toFixed(1));
	}
};

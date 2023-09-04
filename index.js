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
	this._cachedData = { "temperature": 0, "humidity": 0, "pm2p5:": 0, "pm10": 0};
	this.serial = config["serial"] || "NotSetByUser";
	this.getData(this.url);
	this.txid = config["txid"] || 1;
	this.useInternal = config ["useInternal"] || false; 
	this.sensorType = config ["sensorType"] || 1  ;

	//defaults 
	this.temperature = 0;
	this.humidity = 0;
	this.pm2p5 = 0;
	this.pm10 = 0;

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
				 * 1: External Current conditions (Vantage known) 
				 * 2: Leaf/Soil Moisture records 
				 * 3: Barometrics (Vantage known) 
				 * 4: Internal Current conditions (weatherlink for sure) 
				 * 5: Airlink Old Format 
				 * 6: Airlink New External Current Conditions
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
							this.pm10 = weather[i].pm_10p0;
							this.pm2p5 = weather[i].pm_2p5;
						}
						break; 
					case 6: 
						if (this.sensorType == 3) {
							this.temperature = weather[i].temp;
							this.humidity = weather[i].hum; 
							this.pm10 = weather[i].pm_10p0;
							this.pm2p5 = weather[i].pm_2p5;
						}
						break; 
					default: 
						break;
				}
			}
			this._cachedData = {
				"temperature": this.temperatureUnitOfMeasure == "F" ? this.convertFromFahrenheitToCelsius(this.temperature) : this.temperature,
				"humidity": Math.round(this.humidity),


			};
			this.log.debug("Temp %s, Hum %s", this._cachedData.temperature,  this._cachedData.humidity);
			queue();
		}.bind(this));
	},
	convertFromFahrenheitToCelsius: function (f) { //MUST BE A NUMBER!
		return parseFloat(((f - 32) * (5 / 9)).toFixed(1));
	}
};

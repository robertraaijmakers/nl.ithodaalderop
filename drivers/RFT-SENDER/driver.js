'use strict';

var Debouncer = require('../debouncer.js');

/**
 * Arrays used to store devices
 * @type {Array}
 */
var deviceList = [];
var tempdata = {};
var signal;
var initFlag = 1;
var tempdata = {};
var callbackArray = [];
var initIsNotDoneFlag = 1;

function createDriver(driver) {
	var self = {
		init: function ( devices, callback ) {
			
			//Refresh deviceList
			devices.forEach(function (device) {
				addDevice(device);
			});

			var debouncer = new Debouncer(1000);

			//Define signal
			if(initFlag) {
				initFlag = 0;
				var Signal = Homey.wireless('868').Signal;
				signal = new Signal('RFT-ZENDER');

				signal.numberToBitArray = function(number, bit_count) {
					var result = [];
					for (var i = 0; i < bit_count; i++) {
						result[i] = (number >> i) & 1;
					}
					return result;
				};

				signal.bitArrayToNumber = function(bits) {
					return parseInt(bits.join(""),2);
				};

				signal.bitStringToBitArray = function(str) {
					var result = [];
					for (var i = 0; i < str.length; i++) {
						result.push(str.charAt(i) == '1' ? 1 : 0);
					}
					return result;
				};

				signal.bitArrayToString = function(bits) {
					return bits.join("");
				};

				signal.register(function ( err, success ) {
				    if(err != null)	{ console.log('RFT-ZENDER: err', err, 'success', success); }
				    else { callback(); }
				});

				//Start receiving
				signal.on('payload', function (payload, first) {
					if(debouncer.check(signal.bitArrayToString(payload))) return;
			        var rxData = parseRXData(payload); //Convert received array to usable data
			        console.log(rxData);
		        	if(rxData.unit == "001") { //If the all button is pressed
		        		devices = getDeviceByAddress(rxData);
		        		devices.forEach(function (device) {
		        			updateDeviceOnOff(self, device, rxData.onoff);
		        		});
		        	} else {
		        		var devices = getDeviceByAddressAndUnit(rxData);
			        	devices.forEach(function (device) {
							updateDeviceOnOff(self, device, rxData.onoff);
						});
		        	}
				});
				
				console.log('RFT-ZENDER: started.')
			}
		},
		
		deleted: function ( device_data ) {
			var index = deviceList.indexOf(getDeviceById(device_data))
			delete deviceList[index];
			console.log('RFT-ZENDER: Device deleted')
		},
		
		capabilities: {
			onoff: {
				get: function ( device_data, callback ) {
					var device = getDeviceById(device_data);
					callback( null, device.onoff );
				},
				set: function ( device_data, onoff, callback ) {
					var devices = getDeviceByAddressAndUnit(device_data);
					devices.forEach(function (device){
						updateDeviceOnOff(self, device, onoff)
					});	
					sendOnOff(devices[0], onoff);
					callback( null, onoff );		
				}
			}
		},
		
		pair: function ( socket ) {
			socket.on('imitate', function ( data, callback ) {
				console.log("imitate running");
				console.log(data);
				signal.once('payload', function (payload, first) {
					var rxData = parseRXData(payload);
					console.log(rxData);
					tempdata = {
						address: rxData.address,
						unit  : rxData.unit,
						onoff : rxData.onoff
					}	
					socket.emit('remote_found'); //Send signal to frontend
				});
				callback();
			});
		},
	};
	return self;
}

function getDeviceById(deviceIn) {
	var matches = deviceList.filter(function (d) {
		return d.id == deviceIn.id;
	});
	return matches ? matches[0] : null;
}

function getDeviceByAddressAndUnit(deviceIn) {
	var matches = deviceList.filter(function (d) {
		return d.address == deviceIn.address && d.unit == deviceIn.unit; 
	});
	return matches ? matches : null;
}

function getDeviceByAddress(deviceIn) {
	var matches = deviceList.filter(function (d) {
		return d.address == deviceIn.address; 
	});
	return matches ? matches : null;
}

function updateDeviceOnOff(self, device, onoff) {
	device.onoff = onoff;
	self.realtime(device, 'onoff', onoff);
}

function sendOnOff(deviceIn, onoff) {
	var device = deviceIn; //clone(deviceIn);
	if(device.unit == "001" && onoff == false){
		device.unit = "000";
		onoff = true;
	}else if(device.unit == "001" && onoff == true){
		onoff = false;
	}
	address = bitStringToBitArray(device.address);
	unit    = bitStringToBitArray(device.unit);
	onoff   = [onoff ? 1 : 0];
	
	var frame = new Buffer(address.concat(unit, onoff));
	signal.tx( frame, function ( err, result ){
		if(err != null)console.log('CVE-ECO-RFT: Error:', err);
    })
}

function addDevice(deviceIn) {
	deviceList.push(deviceIn);
}

function parseRXData(data) {
	console.log("function:parseRXData");
	console.log(data);
	
	var address = data.slice(0, 20);
	address = bitArrayToString(address);

	var unit = data.slice(20, 23);
	unit = bitArrayToString(unit);

	var onoff = data.slice(23, 24);
	onoff = onoff && onoff[0] ? true : false;

	if(unit == "000") {
		unit = "001";
		onoff = false;
	} else if(unit == "001") {
		onoff = true;
	}
	return { 
		address: address, 
		unit   : unit,
		onoff  : onoff
	};
}

function bitStringToBitArray(str) {
	console.log("function:bitStringToBitArray");
	console.log(str);
	
    var result = [];
    for (var i = 0; i < str.length; i++) {
        result.push(str.charAt(i) == 1 ? 1 : 0);
    }
    return result;
}

function bitArrayToString(bits) {
	console.log("function:bitArrayToString");
	console.log(bits);
    return bits.join("");
}

function numberToBitArray(number, bit_count) {
    console.log("function:numberToBitArray");
	console.log(bits);
    
    var result = [];
    for (var i = 0; i < bit_count; i++) {
        result[i] = (number >> i) & 1;
    }
    return result;
}

module.exports = {
	createDriver: createDriver
};
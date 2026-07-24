function getDeviceName() {
    return 'R718S Series';
}

function getDeviceType() {
    return getDeviceName();
}

function padLeft(str, len, padStr) {
    if (!padStr) {
        padStr = '0';
    }
    while (str.length < len) {
        str = padStr + str;
    }
    return str;
}

function decodeUplink(input) {
    var bytes = input.bytes;
    var fPort = input.fPort;
    var data = {};
    data['Device'] = getDeviceName();

    if (fPort === 6) {
        var version = bytes[0];
        var deviceType = bytes[1];
        var reportType = bytes[2];
        
        // Check if it's a valid R718S device (deviceType should be 0x62)
        if (version === 0x01 && deviceType === 0x62) {
            // Version Report (reportType 0)
            if (reportType === 0) {
                data['Cmd'] = 'VersionReport';
                data['SoftwareVersion'] = '0x' + padLeft(bytes[3].toString(16), 2);
                data['HardwareVersion'] = '0x' + padLeft(bytes[4].toString(16), 2);
                
                // DateCode: 4 bytes hex string
                data['DateCode'] = padLeft(bytes[5].toString(16), 2) + 
                                   padLeft(bytes[6].toString(16), 2) + 
                                   padLeft(bytes[7].toString(16), 2) + 
                                   padLeft(bytes[8].toString(16), 2);
            }
            // PM CF Report (reportType 1)
            else if (reportType === 1) {
                data['Cmd'] = 'PMCFMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['PM1_0_CF'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
                data['PM2_5_CF'] = ((bytes[6] || 0) << 8) | (bytes[7] || 0);
                data['PM10_CF'] = ((bytes[8] || 0) << 8) | (bytes[9] || 0);
            }
            // PM Report (reportType 2)
            else if (reportType === 2) {
                data['Cmd'] = 'PMMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['PM1_0'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
                
                // PM2_5 is signed two bytes
                var pm25 = (bytes[6] << 8) | bytes[7];
                if (bytes[6] & 0x80) {
                    pm25 = (0x10000 - pm25) * -1;
                }
                data['PM2_5'] = pm25;
                
                // PM10 is signed two bytes
                var pm10 = (bytes[8] << 8) | bytes[9];
                if (bytes[8] & 0x80) {
                    pm10 = (0x10000 - pm10) * -1;
                }
                data['PM10'] = pm10;
            }
            // PM Size Report (reportType 3)
            else if (reportType === 3) {
                data['Cmd'] = 'PMSizeMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                
                // PM0_3UM is signed three bytes
                var pm03um = (bytes[4] << 16) | (bytes[5] << 8) | bytes[6];
                if (bytes[4] & 0x80) {
                    pm03um = (0x1000000 - pm03um) * -1;
                }
                data['PM0_3UM'] = pm03um;
                
                data['PM0_5UM'] = ((bytes[7] || 0) << 8) | (bytes[8] || 0);
                data['PM1_0UM'] = ((bytes[9] || 0) << 8) | (bytes[10] || 0);
            }
            // PM Size 2 Report (reportType 4)
            else if (reportType === 4) {
                data['Cmd'] = 'PMSize2Measurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['PM2_5UM'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
                data['PM5_0UM'] = ((bytes[6] || 0) << 8) | (bytes[7] || 0);
                data['PM10UM'] = ((bytes[8] || 0) << 8) | (bytes[9] || 0);
            }
            // Gas Report (reportType 5)
            else if (reportType === 5) {
                data['Cmd'] = 'GasMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['O3'] = (((bytes[4] || 0) << 8) | (bytes[5] || 0)) / 10;
                data['CO'] = (((bytes[6] || 0) << 8) | (bytes[7] || 0)) / 10;
                data['NO'] = (((bytes[8] || 0) << 8) | (bytes[9] || 0)) / 10;
            }
            // Gas 2 Report (reportType 6)
            else if (reportType === 6) {
                data['Cmd'] = 'Gas2Measurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['NO2'] = (((bytes[4] || 0) << 8) | (bytes[5] || 0)) / 10;
                data['SO2'] = ((bytes[6] || 0) << 8) | (bytes[7] || 0);
                data['H2S'] = (((bytes[8] || 0) << 8) | (bytes[9] || 0)) / 10;
            }
            // Gas 3 Report (reportType 7)
            else if (reportType === 7) {
                data['Cmd'] = 'Gas3Measurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['NH3'] = (((bytes[4] || 0) << 8) | (bytes[5] || 0)) / 10;
                data['CO2'] = (((bytes[6] || 0) << 8) | (bytes[7] || 0)) / 10;
                data['Noise'] = (((bytes[8] || 0) << 8) | (bytes[9] || 0)) / 10;
            }
            // PH Report (reportType 8)
            else if (reportType === 8) {
                data['Cmd'] = 'PHMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['PH'] = (((bytes[4] || 0) << 8) | (bytes[5] || 0)) / 100;
                
                // TemperaturewithPH is signed two bytes
                var tempPH = (bytes[6] << 8) | bytes[7];
                if (bytes[6] & 0x80) {
                    tempPH = (0x10000 - tempPH) * -0.01;
                } else {
                    tempPH = tempPH * 0.01;
                }
                data['TemperaturewithPH'] = tempPH;
                
                // ORP is signed two bytes
                var orp = (bytes[8] << 8) | bytes[9];
                if (bytes[8] & 0x80) {
                    orp = (0x10000 - orp) * -1;
                }
                data['ORP'] = orp;
            }
            // NTU Report (reportType 9)
            else if (reportType === 9) {
                data['Cmd'] = 'NTUMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['NTU'] = (((bytes[4] || 0) << 8) | (bytes[5] || 0)) / 10;
                
                // TemperaturewithNTU is signed two bytes
                var tempNTU = (bytes[6] << 8) | bytes[7];
                if (bytes[6] & 0x80) {
                    tempNTU = (0x10000 - tempNTU) * -0.01;
                } else {
                    tempNTU = tempNTU * 0.01;
                }
                data['TemperaturewithNTU'] = tempNTU;
                
                data['Soil_VWC'] = (((bytes[8] || 0) << 8) | (bytes[9] || 0)) / 100;
            }
            // Soil Report (reportType 10)
            else if (reportType === 10) {
                data['Cmd'] = 'SoilMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['Soil_VWC'] = (((bytes[4] || 0) << 8) | (bytes[5] || 0)) / 100;
                
                // Soil_Temperature is signed two bytes
                var soilTemp = (bytes[6] << 8) | bytes[7];
                if (bytes[6] & 0x80) {
                    soilTemp = (0x10000 - soilTemp) * -0.01;
                } else {
                    soilTemp = soilTemp * 0.01;
                }
                data['Soil_Temperature'] = soilTemp;
                
                data['WaterLevel'] = ((bytes[8] || 0) << 8) | (bytes[9] || 0);
                data['Soil_EC'] = (bytes[10] || 0) / 10;
            }
            // LDO Report (reportType 11)
            else if (reportType === 11) {
                data['Cmd'] = 'LDOMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                
                // TemperaturewithLDO is signed two bytes
                var tempLDO = (bytes[4] << 8) | bytes[5];
                if (bytes[4] & 0x80) {
                    tempLDO = (0x10000 - tempLDO) * -0.01;
                } else {
                    tempLDO = tempLDO * 0.01;
                }
                data['TemperaturewithLDO'] = tempLDO;
                
                data['LDODOValue'] = (((bytes[6] || 0) << 8) | (bytes[7] || 0)) / 100;
                data['LDOSatValue'] = (((bytes[8] || 0) << 8) | (bytes[9] || 0)) / 10;
            }
            // Weather Report (reportType 12)
            else if (reportType === 12) {
                data['Cmd'] = 'WeatherMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                
                // Temperature_2Bytes_0_01 is signed two bytes
                var temp = (bytes[4] << 8) | bytes[5];
                if (bytes[4] & 0x80) {
                    temp = (0x10000 - temp) * -0.01;
                } else {
                    temp = temp * 0.01;
                }
                data['Temperature'] = temp;
                
                data['Humidity'] = (((bytes[6] || 0) << 8) | (bytes[7] || 0)) / 100;
                data['WindSpeed'] = (((bytes[8] || 0) << 8) | (bytes[9] || 0)) / 100;
            }
            // Weather 2 Report (reportType 13)
            else if (reportType === 13) {
                data['Cmd'] = 'Weather2Measurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['WindDirection'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
                data['Atmosphere'] = (((bytes[6] || 0) << 24) | ((bytes[7] || 0) << 16) | ((bytes[8] || 0) << 8) | (bytes[9] || 0)) / 100;
            }
            // VOC Report (reportType 14)
            else if (reportType === 14) {
                data['Cmd'] = 'VOCMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['VOC'] = (((bytes[4] || 0) << 8) | (bytes[5] || 0)) / 10;
            }
            // Soil Nutrient Report (reportType 15)
            else if (reportType === 15) {
                data['Cmd'] = 'SoilNutrientMeasurement';
                data['Battery'] = (bytes[3] || 0) / 10;
                data['Nitrogen'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
                data['Phosphorus'] = ((bytes[6] || 0) << 8) | (bytes[7] || 0);
                data['Potassium'] = ((bytes[8] || 0) << 8) | (bytes[9] || 0);
            }
            // ThresholdAlarm_A07 Report (reportType 18)
            else if (reportType === 18) {
                data['Cmd'] = 'ThresholdAlarm_A07';
                data['Battery'] = (bytes[3] || 0) / 10;
                // Extract 7 bytes for ThresholdAlarm_A07
                var alarmData = [];
                for (var i = 4; i < 11; i++) {
                    alarmData.push(bytes[i] || 0);
                }
                data['ThresholdAlarm_A07'] = alarmData;
            }
        }
    } else if (fPort === 7) {
        if (bytes[0] === 0x81) {
            // ConfigReportRsp
            data['Cmd'] = 'ConfigReportRsp';
            data['Status'] = (bytes[2] === 0x00) ? 'Success' : 'Failure';
        } else if (bytes[0] === 0x82) {
            // ReadConfigReportRsp
            data['Cmd'] = 'ReadConfigReportRsp';
            data['MinTime'] = ((bytes[3] || 0) << 8) | (bytes[4] || 0);
            data['MaxTime'] = ((bytes[5] || 0) << 8) | (bytes[6] || 0);
        } else if (bytes[0] === 0x83) {
            // SetLDOSettingRsp
            data['Cmd'] = 'SetLDOSettingRsp';
            data['Status'] = (bytes[2] === 0x00) ? 'Success' : 'Failure';
        } else if (bytes[0] === 0x84) {
            // GetLDOSettingRsp
            data['Cmd'] = 'GetLDOSettingRsp';
            data['LDOsAltiud'] = (((bytes[3] || 0) << 8) | (bytes[4] || 0)) / 256;
            data['LDOsPSU'] = (((bytes[5] || 0) << 8) | (bytes[6] || 0)) / 256;
        } else if (bytes[0] === 0x85) {
            // ORPCalibrateRsp
            data['Cmd'] = 'ORPCalibrateRsp';
            data['Status'] = (bytes[2] === 0x00) ? 'Success' : 'Failure';
        } else if (bytes[0] === 0x86) {
            // PHCalibrateRsp
            data['Cmd'] = 'PHCalibrateRsp';
            data['Status'] = (bytes[2] === 0x00) ? 'Success' : 'Failure';
        } else if (bytes[0] === 0x87) {
            // NTUCalibrateRsp
            data['Cmd'] = 'NTUCalibrateRsp';
            data['Status'] = (bytes[2] === 0x00) ? 'Success' : 'Failure';
        } else if (bytes[0] === 0x88) {
            // SetWireLengthRsp
            data['Cmd'] = 'SetWireLengthRsp';
            data['Status'] = (bytes[2] === 0x00) ? 'Success' : 'Failure';
        } else if (bytes[0] === 0x89) {
            // GetWireLengthRsp
            data['Cmd'] = 'GetWireLengthRsp';
            data['Length'] = (((bytes[3] || 0) << 8) | (bytes[4] || 0)) / 10;
        } else if (bytes[0] === 0x8A) {
            // SetSoilTypeRsp
            data['Cmd'] = 'SetSoilTypeRsp';
            data['Status'] = (bytes[2] === 0x00) ? 'Success' : 'Failure';
        } else if (bytes[0] === 0x8B) {
            // GetSoilTypeRsp
            data['Cmd'] = 'GetSoilTypeRsp';
            data['SoilType'] = (bytes[3] || 0);
        } else if (bytes[0] === 0x8C) {
            // SoilCalibrateRsp
            data['Cmd'] = 'SoilCalibrateRsp';
            data['Status'] = (bytes[2] === 0x00) ? 'Success' : 'Failure';
        }
    }

    return {
        data: data
    };
}

function encodeDownlink(input) {
    var data = input.data;
    var bytes = [];
    var deviceId = 0x62; // R718S device type

    if (data['Cmd'] === 'ConfigReportReq') {
        bytes.push(0x01); // Command ID
        bytes.push(deviceId); // Device Type
        bytes.push((data.MinTime >> 8) & 0xFF); // MinTime high byte
        bytes.push(data.MinTime & 0xFF); // MinTime low byte
        bytes.push((data.MaxTime >> 8) & 0xFF); // MaxTime high byte
        bytes.push(data.MaxTime & 0xFF); // MaxTime low byte
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'ReadConfigReportReq') {
        bytes.push(0x02); // Command ID
        bytes.push(deviceId); // Device Type
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'SetLDOSettingReq') {
        bytes.push(0x03); // Command ID
        bytes.push(deviceId); // Device Type
        bytes.push((data.LDOsAltiud >> 8) & 0xFF); // LDOsAltiud high byte
        bytes.push(data.LDOsAltiud & 0xFF); // LDOsAltiud low byte
        bytes.push((data.LDOsPSU >> 8) & 0xFF); // LDOsPSU high byte
        bytes.push(data.LDOsPSU & 0xFF); // LDOsPSU low byte
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'GetLDOSettingReq') {
        bytes.push(0x04); // Command ID
        bytes.push(deviceId); // Device Type
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'ORPCalibrateReq') {
        bytes.push(0x05); // Command ID
        bytes.push(deviceId); // Device Type
        bytes.push((data.StandORP >> 8) & 0xFF); // StandORP high byte
        bytes.push(data.StandORP & 0xFF); // StandORP low byte
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'PHCalibrateReq') {
        bytes.push(0x06); // Command ID
        bytes.push(deviceId); // Device Type
        bytes.push((data.StandPH >> 8) & 0xFF); // StandPH high byte
        bytes.push(data.StandPH & 0xFF); // StandPH low byte
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'NTUCalibrateReq') {
        bytes.push(0x07); // Command ID
        bytes.push(deviceId); // Device Type
        bytes.push((data.StandNTU >> 8) & 0xFF); // StandNTU high byte
        bytes.push(data.StandNTU & 0xFF); // StandNTU low byte
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'SetWireLengthReq') {
        bytes.push(0x08); // Command ID
        bytes.push(deviceId); // Device Type
        bytes.push(((data.Length * 10) >> 8) & 0xFF); // Length high byte (scaled by 10)
        bytes.push((data.Length * 10) & 0xFF); // Length low byte (scaled by 10)
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'GetWireLengthReq') {
        bytes.push(0x09); // Command ID
        bytes.push(deviceId); // Device Type
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'SetSoilTypeReq') {
        bytes.push(0x0A); // Command ID
        bytes.push(deviceId); // Device Type
        bytes.push(data.SoilType & 0xFF); // SoilType
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'GetSoilTypeReq') {
        bytes.push(0x0B); // Command ID
        bytes.push(deviceId); // Device Type
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    } else if (data['Cmd'] === 'SoilCalibrateReq') {
        bytes.push(0x0C); // Command ID
        bytes.push(deviceId); // Device Type
        bytes.push(data.VWCDelt & 0xFF); // VWCDelt
        // Pad with zeros to make total length 11 bytes
        while (bytes.length < 11) {
            bytes.push(0x00);
        }
    }

    return {
        fPort: 7,
        bytes: bytes
    };
}

function decodeDownlink(input) {
    var bytes = input.bytes;
    var fPort = input.fPort;
    var data = {};
    data['Device'] = getDeviceName();

    if (fPort === 7) {
        if (bytes[0] === 0x01 && bytes[1] === 0x62) {
            data['Cmd'] = 'ConfigReportReq';
            data['MinTime'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
            data['MaxTime'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
        } else if (bytes[0] === 0x02 && bytes[1] === 0x62) {
            data['Cmd'] = 'ReadConfigReportReq';
        } else if (bytes[0] === 0x03 && bytes[1] === 0x62) {
            data['Cmd'] = 'SetLDOSettingReq';
            data['LDOsAltiud'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
            data['LDOsPSU'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
        } else if (bytes[0] === 0x04 && bytes[1] === 0x62) {
            data['Cmd'] = 'GetLDOSettingReq';
        } else if (bytes[0] === 0x05 && bytes[1] === 0x62) {
            data['Cmd'] = 'ORPCalibrateReq';
            data['StandORP'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
        } else if (bytes[0] === 0x06 && bytes[1] === 0x62) {
            data['Cmd'] = 'PHCalibrateReq';
            data['StandPH'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
        } else if (bytes[0] === 0x07 && bytes[1] === 0x62) {
            data['Cmd'] = 'NTUCalibrateReq';
            data['StandNTU'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
        } else if (bytes[0] === 0x08 && bytes[1] === 0x62) {
            data['Cmd'] = 'SetWireLengthReq';
            data['Length'] = (((bytes[2] || 0) << 8) | (bytes[3] || 0)) / 10;
        } else if (bytes[0] === 0x09 && bytes[1] === 0x62) {
            data['Cmd'] = 'GetWireLengthReq';
        } else if (bytes[0] === 0x0A && bytes[1] === 0x62) {
            data['Cmd'] = 'SetSoilTypeReq';
            data['SoilType'] = (bytes[2] || 0);
        } else if (bytes[0] === 0x0B && bytes[1] === 0x62) {
            data['Cmd'] = 'GetSoilTypeReq';
        } else if (bytes[0] === 0x0C && bytes[1] === 0x62) {
            data['Cmd'] = 'SoilCalibrateReq';
            data['VWCDelt'] = (bytes[2] || 0);
        }
    }

    return {
        data: data
    };
}
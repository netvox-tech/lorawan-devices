function getDeviceName() {
    return 'R718SA';
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
        
        // Check if it's a valid R718SA device (deviceType should be 0x5D)
        if (version === 0x01 && deviceType === 0x5D) {
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
            // Measurement Report (reportType 1)
            else if (reportType === 1) {
                data['Cmd'] = 'MeasurementReport';
                data['Battery'] = (bytes[3] || 0) / 10;
                
                // Temperature is signed two bytes
                var temp = (bytes[4] << 8) | bytes[5];
                if (bytes[4] & 0x80) {
                    temp = (0x10000 - temp) * -0.01;
                } else {
                    temp = temp * 0.01;
                }
                data['Temperature'] = temp;
                
                data['Humidity'] = (((bytes[6] || 0) << 8) | (bytes[7] || 0)) / 100;
                
                // PM2_5 is signed two bytes
                var pm25 = (bytes[8] << 8) | bytes[9];
                if (bytes[8] & 0x80) {
                    pm25 = (0x10000 - pm25) * -1;
                }
                data['PM2_5'] = pm25;
                
                data['ThresholdAlarm'] = (bytes[10] || 0);
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
    var deviceId = 0x5D; // R718SA device type

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
        bytes.push((data.LDOsAltiud * 256) & 0xFF); // LDOsAltiud low byte
        bytes.push(((data.LDOsAltiud * 256) >> 8) & 0xFF); // LDOsAltiud high byte
        bytes.push((data.LDOsPSU * 256) & 0xFF); // LDOsPSU low byte
        bytes.push(((data.LDOsPSU * 256) >> 8) & 0xFF); // LDOsPSU high byte
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
        if (bytes[0] === 0x01 && bytes[1] === 0x5D) {
            data['Cmd'] = 'ConfigReportReq';
            data['MinTime'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
            data['MaxTime'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
        } else if (bytes[0] === 0x02 && bytes[1] === 0x5D) {
            data['Cmd'] = 'ReadConfigReportReq';
        } else if (bytes[0] === 0x03 && bytes[1] === 0x5D) {
            data['Cmd'] = 'SetLDOSettingReq';
            data['LDOsAltiud'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
            data['LDOsPSU'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
        } else if (bytes[0] === 0x04 && bytes[1] === 0x5D) {
            data['Cmd'] = 'GetLDOSettingReq';
        } else if (bytes[0] === 0x05 && bytes[1] === 0x5D) {
            data['Cmd'] = 'ORPCalibrateReq';
            data['StandORP'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
        } else if (bytes[0] === 0x06 && bytes[1] === 0x5D) {
            data['Cmd'] = 'PHCalibrateReq';
            data['StandPH'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
        } else if (bytes[0] === 0x07 && bytes[1] === 0x5D) {
            data['Cmd'] = 'NTUCalibrateReq';
            data['StandNTU'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
        } else if (bytes[0] === 0x08 && bytes[1] === 0x5D) {
            data['Cmd'] = 'SetWireLengthReq';
            data['Length'] = (((bytes[2] || 0) << 8) | (bytes[3] || 0)) / 10;
        } else if (bytes[0] === 0x09 && bytes[1] === 0x5D) {
            data['Cmd'] = 'GetWireLengthReq';
        } else if (bytes[0] === 0x0A && bytes[1] === 0x5D) {
            data['Cmd'] = 'SetSoilTypeReq';
            data['SoilType'] = (bytes[2] || 0);
        } else if (bytes[0] === 0x0B && bytes[1] === 0x5D) {
            data['Cmd'] = 'GetSoilTypeReq';
        } else if (bytes[0] === 0x0C && bytes[1] === 0x5D) {
            data['Cmd'] = 'SoilCalibrateReq';
            data['VWCDelt'] = (bytes[2] || 0);
        }
    }

    return {
        data: data
    };
}
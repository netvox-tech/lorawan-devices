function getDeviceName() {
    return 'R718RA Series';
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
        var reportType = bytes[2];
        
        // Version Report has reportType 0
        if (bytes[0] === 0x01 && bytes[1] === 0xC6 && reportType === 0) {
            data['Cmd'] = 'VersionReport';
            data['SoftwareVersion'] = '0x' + padLeft(bytes[3].toString(16), 2);
            data['HardwareVersion'] = '0x' + padLeft(bytes[4].toString(16), 2);
            
            // DateCode: 4 bytes hex string
            data['DateCode'] = padLeft(bytes[5].toString(16), 2) + 
                               padLeft(bytes[6].toString(16), 2) + 
                               padLeft(bytes[7].toString(16), 2) + 
                               padLeft(bytes[8].toString(16), 2);
        } else if (reportType === 1) {
            // Gas Report
            data['Cmd'] = 'GasMeasurement';
            data['Battery'] = (bytes[3] || 0) / 10;
            data['GasType'] = (bytes[4] || 0);
            // Apply 0.1 scaling factor as defined in R718RA Series.csv
            data['GasppmValue'] = (((bytes[5] || 0) << 24) | ((bytes[6] || 0) << 16) | ((bytes[7] || 0) << 8) | (bytes[8] || 0)) / 1000;
        } else if (reportType === 2) {
            // Temperature and Humidity Report
            data['Cmd'] = 'TempHumidity';
            data['Battery'] = (bytes[3] || 0) / 10;
            var temp = (bytes[4] << 8 | bytes[5]);
            if (bytes[4] & 0x80) {
                temp = (0x10000 - temp) * -0.1;
            } else {
                temp = temp * 0.1;
            }
            data.Temperature = temp;
            data['Humidity'] = (((bytes[6] || 0) << 8) | (bytes[7] || 0)) / 10;
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
            data['BatteryChange'] = (bytes[7] || 0) / 10;
            // Apply 0.1 scaling factor for Gasppmchange
            data['Gasppmchange'] = (((bytes[8] || 0) << 24) | ((bytes[9] || 0) << 16) | ((bytes[10] || 0) << 8) | (bytes[11] || 0)) / 10;
        }
    }

    return {
        data: data
    };
}

function encodeDownlink(input) {
    var data = input.data;
    var cmd = data.Cmd;
    var device = data.Device;
    var bytes = [];

    if (device !== getDeviceName()) {
        return { error: 'Invalid device type' };
    }

    // Device ID for R718RA Series is 0xC6
    var deviceId = 0xC6;

    if (cmd === 'ConfigReportReq') {
        bytes.push(0x01); // Command ID
        bytes.push(deviceId); // Device Type
        bytes.push((data.MinTime >> 8) & 0xFF); // MinTime high byte
        bytes.push(data.MinTime & 0xFF); // MinTime low byte
        bytes.push((data.MaxTime >> 8) & 0xFF); // MaxTime high byte
        bytes.push(data.MaxTime & 0xFF); // MaxTime low byte
        bytes.push(Math.round(data.BatteryChange * 10)); // BatteryChange (scaled by 10)
        bytes.push(0x00); // Padding byte
        // Gasppmchange (2 bytes, scaled by 10)
        var gasppmchange = Math.round(data.Gasppmchange * 10);
        bytes.push((gasppmchange >> 8) & 0xFF);
        bytes.push(gasppmchange & 0xFF);
    } else if (cmd === 'ReadConfigReportReq') {
        bytes.push(0x02); // Command ID
        bytes.push(deviceId); // Device Type
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
        if (bytes[0] === 0x01 && bytes[1] === 0xC6) {
            data['Cmd'] = 'ConfigReportReq';
            data['MinTime'] = ((bytes[2] || 0) << 8) | (bytes[3] || 0);
            data['MaxTime'] = ((bytes[4] || 0) << 8) | (bytes[5] || 0);
            data['BatteryChange'] = (bytes[6] || 0) / 10;
            data['Gasppmchange'] = (((bytes[7] || 0) << 24) | ((bytes[8] || 0) << 16) | ((bytes[9] || 0) << 8) | (bytes[10] || 0)) / 10;
        } else if (bytes[0] === 0x02 && bytes[1] === 0xC6) {
            data['Cmd'] = 'ReadConfigReportReq';
        }
    }

    return {
        data: data
    };
}
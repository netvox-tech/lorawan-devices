function getCfgCmd(cfgcmd){
    var cfgcmdlist = {
      1:   "ConfigReportReq",
      129: "ConfigReportRsp",
      2:   "ReadConfigReportReq",
      130: "ReadConfigReportRsp"
    };
    return cfgcmdlist[cfgcmd];
  }
  
function getCmdToID(cmdtype){
    if (cmdtype == "ConfigReportReq")
        return 1;
    else if (cmdtype == "ConfigReportRsp")
        return 129;
    else if (cmdtype == "ReadConfigReportReq")
        return 2;
    else if (cmdtype == "ReadConfigReportRsp")
        return 130;
}
  
function getDeviceName(dev){
    var deviceName = {
      157: "R720D"
    };
    return deviceName[dev];
}
  
function getDeviceID(devName){
    var deviceName = {
      "R720D": 157
    };
    return deviceName[devName];
}
  
function padLeft(str, len) {
      str = '' + str;
      if (str.length >= len) {
          return str;
      } else {
          return padLeft("0" + str, len);
      }
}
  
function decodeUplink(input) {
    var data = {};
    switch (input.fPort) {
        case 6:
            // 版本信息报告 (ReportType 0x00)
            if (input.bytes[2] === 0x00) {
                data.Device = getDeviceName(input.bytes[1]);
                data.Version = input.bytes[0];
                data.DeviceType = input.bytes[1];
                data.ReportType = input.bytes[2];
                data.SoftwareVersion = input.bytes[3]/10;
                data.HardwareVersion = input.bytes[4];
                data.Datecode = padLeft(input.bytes[5].toString(16), 2) + 
                                padLeft(input.bytes[6].toString(16), 2) + 
                                padLeft(input.bytes[7].toString(16), 2) + 
                                padLeft(input.bytes[8].toString(16), 2);
                return {
                    data: data,
                };
            }
            // 状态报告 (ReportType 0x01)
            else if (input.bytes[2] === 0x01) {
                data.Device = getDeviceName(input.bytes[1]);
                data.Version = input.bytes[0];
                data.DeviceType = input.bytes[1];
                data.ReportType = input.bytes[2];
                
                // 电池电压处理
                if (input.bytes[3] & 0x80) {
                    var tmp_v = input.bytes[3] & 0x7F;
                    data.Battery = (tmp_v / 10).toString() + '(low battery)';
                } else {
                    data.Battery = input.bytes[3]/10;
                }

                // 温度处理 (2 bytes, 0.01 precision)
                if (input.bytes[4] & 0x80) {
                    var tmpval = (input.bytes[4]<<8 | input.bytes[5]);
                    data.Temperature_2Bytes_0_01 = (0x10000 - tmpval)/100 * -1;
                } else {
                    data.Temperature_2Bytes_0_01 = (input.bytes[4]<<8 | input.bytes[5])/100;
                }

                // 阈值报警温度处理
                data.ThresholdAlarmTemperature = input.bytes[6];
            }
            
            break;
            
        case 7:
            data.Cmd = getCfgCmd(input.bytes[0]);
            data.Device = getDeviceName(input.bytes[1]);
            
            // 配置报告响应
            if (input.bytes[0] === getCmdToID("ConfigReportRsp")) {
                data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
            }
            // 读取配置报告响应
            else if (input.bytes[0] === getCmdToID("ReadConfigReportRsp")) {
                data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
                data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
                
                // 电池变化阈值处理
                data.BatteryChange = input.bytes[6]/10;
                
                // 温度变化阈值处理 (2 bytes, 0.01 precision)
                if (input.bytes[7] & 0x80) {
                    var tmpval = (input.bytes[7]<<8 | input.bytes[8]);
                    data.TemperatureChange_2Bytes_0_01 = (0x10000 - tmpval)/100 * -1;
                } else {
                    data.TemperatureChange_2Bytes_0_01 = (input.bytes[7]<<8 | input.bytes[8])/100;
                }
            }
    
            break;
        
        default:
            return {
                errors: ['unknown FPort'],
            };
            
    }
        
    return {
        data: data,
    };
}
  
function encodeDownlink(input) {
    var ret = [];
    var devid;
    var getCmdID;
        
    getCmdID = getCmdToID(input.data.Cmd);
    devid = getDeviceID(input.data.Device);
    
    // 配置报告请求
    if (input.data.Cmd == "ConfigReportReq") {
        var mint = input.data.MinTime;
        var maxt = input.data.MaxTime;
        var batteryChg = Math.round(input.data.BatteryChange * 10); // 转换为0.1精度并取整
        var tempChg = Math.round(input.data.TemperatureChange_2Bytes_0_01 * 100); // 转换为0.01精度并取整
        
        ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, (tempChg >> 8), (tempChg & 0xFF), 0x00, 0x00);
    }
    // 读取配置报告请求
    else if (input.data.Cmd == "ReadConfigReportReq") {
        ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    }
    
    return {
        fPort: 7,
        bytes: ret
    };
}
  
function decodeDownlink(input) {
    var data = {};
    switch (input.fPort) {
        case 7:
            data.Cmd = getCfgCmd(input.bytes[0]);
            data.Device = getDeviceName(input.bytes[1]);
            
            // 配置报告请求
            if (input.bytes[0] === getCmdToID("ConfigReportReq")) {
                data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
                data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
                data.BatteryChange = input.bytes[6]/10;
                
                // 温度变化阈值处理 (2 bytes, 0.01 precision)
                if (input.bytes[7] & 0x80) {
                    var tmpval = (input.bytes[7]<<8 | input.bytes[8]);
                    data.TemperatureChange_2Bytes_0_01 = (0x10000 - tmpval)/100 * -1;
                } else {
                    data.TemperatureChange_2Bytes_0_01 = (input.bytes[7]<<8 | input.bytes[8])/100;
                }
            }
            // 读取配置报告请求
            else if (input.bytes[0] === getCmdToID("ReadConfigReportReq")) {
                // 读取配置报告请求没有额外参数
            }
    
            break;
            
        default:
            return {
                errors: ['invalid FPort'],
            };
    }
    
    return {
        data: data,
    };
}
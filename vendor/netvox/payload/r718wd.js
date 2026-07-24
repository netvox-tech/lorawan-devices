function getCfgCmd(cfgcmd) {
  var cfgcmdlist = {
    1:   "ConfigReportReq",
    129: "ConfigReportRsp",
    2:   "ReadConfigReportReq",
    130: "ReadConfigReportRsp",
    3:   "SetTankLevelRangeReq",
    131: "SetTankLevelRangeRsp",
    4:   "GetTankLevelRangeReq",
    132: "GetTankLevelRangeRsp"
  };
  return cfgcmdlist[cfgcmd];
}

function getDeviceName(dev) {
  var deviceName = {
    51: "R718WD"
  };
  return deviceName[dev];
}

function getCmdToID(cmdtype) {
  if (cmdtype == "ConfigReportReq")
    return 1;
  else if (cmdtype == "ConfigReportRsp")
    return 129;
  else if (cmdtype == "ReadConfigReportReq")
    return 2;
  else if (cmdtype == "ReadConfigReportRsp")
    return 130;
  else if (cmdtype == "SetTankLevelRangeReq")
    return 3;
  else if (cmdtype == "SetTankLevelRangeRsp")
    return 131;
  else if (cmdtype == "GetTankLevelRangeReq")
    return 4;
  else if (cmdtype == "GetTankLevelRangeRsp")
    return 132;
}

function getDeviceType(devName) {
  if (devName == "R718WD")
    return 51;
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
      if (input.bytes[2] === 0x00) {
        data.Device = getDeviceName(input.bytes[1]);
        data.SWver = input.bytes[3] / 10;
        data.HWver = input.bytes[4];
        data.Datecode = padLeft(input.bytes[5].toString(16), 2) + padLeft(input.bytes[6].toString(16), 2) + padLeft(input.bytes[7].toString(16), 2) + padLeft(input.bytes[8].toString(16), 2);
        
        return {
          data: data,
        };
      }

      if (input.bytes[3] & 0x80) {
        var tmp_v = input.bytes[3] & 0x7F;
        var intPart = (tmp_v >> 4) & 0x0F;
        var decPart = tmp_v & 0x0F;
        data.Volt = (intPart + decPart / 10).toString() + '(low battery)';
      } else {
        var intPart = (input.bytes[3] >> 4) & 0x0F;
        var decPart = input.bytes[3] & 0x0F;
        data.Volt = intPart + decPart / 10;
      }

      data.Device = getDeviceName(input.bytes[1]);
      data.TankRawData = (input.bytes[4] << 8) | input.bytes[5];
      data.TankLevl = input.bytes[6];
      
      break;
      
    case 7:
      data.Device = getDeviceName(input.bytes[1]);
      data.Cmd = getCfgCmd(input.bytes[0]);
      
      if (input.bytes[0] === 0x81) {
        data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
      } else if (input.bytes[0] === 0x82) {
        data.MinTime = (input.bytes[2] << 8) | input.bytes[3];
        data.MaxTime = (input.bytes[4] << 8) | input.bytes[5];
        var intPart = (input.bytes[6] >> 4) & 0x0F;
        var decPart = input.bytes[6] & 0x0F;
        data.BatteryChange = intPart + decPart / 10;
        data.TankLevelChange = input.bytes[7];
      } else if (input.bytes[0] === 0x83) {
        data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
      } else if (input.bytes[0] === 0x84) {
        data.MinSensorVoltage = input.bytes[2];
        data.MaxSensorVoltage = input.bytes[3];
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
  var port;
  var getCmdID;
      
  getCmdID = getCmdToID(input.data.Cmd);
  devid = getDeviceType(input.data.Device);

  if (input.data.Cmd == "ConfigReportReq") {
    var mint = input.data.MinTime;
    var maxt = input.data.MaxTime;
    var batteryChgInt = Math.floor(input.data.BatteryChange);
    var batteryChgDec = Math.round((input.data.BatteryChange - batteryChgInt) * 10);
    var batteryChg = (batteryChgInt << 4) | batteryChgDec;
    var tankLevelChg = input.data.TankLevelChange;
    
    port = 7;
    ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, tankLevelChg, 0x00, 0x00, 0x00);
  } else if (input.data.Cmd == "ReadConfigReportReq") {
    port = 7;
    ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  } else if (input.data.Cmd == "SetTankLevelRangeReq") {
    var minVolt = input.data.MinSensorVoltage;
    var maxVolt = input.data.MaxSensorVoltage;
    
    port = 7;
    ret = ret.concat(getCmdID, devid, minVolt, maxVolt, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  } else if (input.data.Cmd == "GetTankLevelRangeReq") {
    port = 7;
    ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  }
  
  return {
    fPort: port,
    bytes: ret
  };
}
  
function decodeDownlink(input) {
  var data = {};
  switch (input.fPort) {
    case 7:
      data.Device = getDeviceName(input.bytes[1]);
      data.Cmd = getCfgCmd(input.bytes[0]);
      
      if (input.bytes[0] === getCmdToID("ConfigReportReq")) {
        data.MinTime = (input.bytes[2] << 8) | input.bytes[3];
        data.MaxTime = (input.bytes[4] << 8) | input.bytes[5];
        var intPart = (input.bytes[6] >> 4) & 0x0F;
        var decPart = input.bytes[6] & 0x0F;
        data.BatteryChange = intPart + decPart / 10;
        data.TankLevelChange = input.bytes[7];
      } else if (input.bytes[0] === getCmdToID("SetTankLevelRangeReq")) {
        data.MinSensorVoltage = input.bytes[2];
        data.MaxSensorVoltage = input.bytes[3];
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
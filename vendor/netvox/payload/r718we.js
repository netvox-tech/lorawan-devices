function getCfgCmd(cfgcmd) {
  var cfgcmdlist = {
    1:   "ConfigReportReq",
    129: "ConfigReportRsp",
    2:   "ReadConfigReportReq",
    130: "ReadConfigReportRsp",
    3:   "SetSensorParaReq",
    131: "SetSensorParaRsp",
    4:   "GetSensorParaReq",
    132: "GetSensorParaRsp"
  };
  return cfgcmdlist[cfgcmd];
}

function getDeviceName(dev) {
  var deviceName = {
    143: "R718WE"
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
  else if (cmdtype == "SetSensorParaReq")
    return 3;
  else if (cmdtype == "SetSensorParaRsp")
    return 131;
  else if (cmdtype == "GetSensorParaReq")
    return 4;
  else if (cmdtype == "GetSensorParaRsp")
    return 132;
}

function getDeviceType(devName) {
  if (devName == "R718WE")
    return 143;
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
      data.WaterLeakLocation = (input.bytes[4] << 8) | input.bytes[5];
      
      break;
      
    case 7:
      data.Device = getDeviceName(input.bytes[1]);
      data.Cmd = getCfgCmd(input.bytes[0]);
      
      if (input.bytes[0] === 0x81) {
        data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
      } else if (input.bytes[0] === 0x82) {
        data.MinTime = (input.bytes[2] << 8) | input.bytes[3];
        data.MaxTime = (input.bytes[4] << 8) | input.bytes[5];
      } else if (input.bytes[0] === 0x83) {
        data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
      } else if (input.bytes[0] === 0x84) {
        data.LineLength = (input.bytes[2] << 8) | input.bytes[3];
        data.Sensitivity = input.bytes[4];
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
    
    port = 7;
    ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), 0x00, 0x00, 0x00, 0x00, 0x00);
  } else if (input.data.Cmd == "ReadConfigReportReq") {
    port = 7;
    ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  } else if (input.data.Cmd == "SetSensorParaReq") {
    var lineLen = input.data.LineLength;
    var sensitivity = input.data.Sensitivity;
    
    port = 7;
    ret = ret.concat(getCmdID, devid, (lineLen >> 8), (lineLen & 0xFF), sensitivity, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  } else if (input.data.Cmd == "GetSensorParaReq") {
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
      } else if (input.bytes[0] === getCmdToID("SetSensorParaReq")) {
        data.LineLength = (input.bytes[2] << 8) | input.bytes[3];
        data.Sensitivity = input.bytes[4];
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
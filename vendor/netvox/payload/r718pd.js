function getDeviceName(dev) {
  var deviceName = {
    0x96: "R718PD"
  };
  return deviceName[dev];
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
  var bytes = input.bytes;
  var fport = input.fPort;
  
  if (fport === 6) {
    if (bytes[0] === 0x01 && bytes[1] === 0x96 && bytes[2] === 0x00) {
      data.Device = getDeviceName(bytes[1]);
      data.SWver = bytes[3] / 10; // 修复：将bytes[3]除以10得到正确的版本号
      data.HWver = bytes[4];
      data.Datecode = padLeft(bytes[5].toString(16), 2) + padLeft(bytes[6].toString(16), 2) + padLeft(bytes[7].toString(16), 2) + padLeft(bytes[8].toString(16), 2);
    }
  }
  
  return {
    data: data
  };
}
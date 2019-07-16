// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict";

const chalk = require('chalk');
var Registry = require('azure-iothub').Registry;

// Get the service connection string from a command line argument
var connectionString = process.argv[2];
var deviceId = 'MyTwinDevice';

// Sleep function to simulate delays
function sleep(ms){
  return new Promise(resolve=>{
      setTimeout(resolve,ms)
  })
}

// Delete all desired properties
var twinPatchReset = {
  properties: {
    desired: null
  }
}

// Set up some initial values
var twinPatchInit = {
  properties: {
    desired: {
      patchId: "초기화",
      fanOn: "false",
      components: {
        system: {
          id: "17",
          units: "farenheit",
          firmwareVersion: "9.75"
        },
        climate: {
          minTemperature: "68",
          maxTemperature: "76"
        }
      }
    }
  }
};

// <patches>
// Turn the fan on
var twinPatchFanOn = {
  properties: {
    desired: {
      patchId: "팬을 돌려라",
      fanOn: "false",
    }
  }
};

// Set the maximum temperature for the climate component
var twinPatchSetMaxTemperature = {
  properties: {
    desired: {
      patchId: "최대 온도를 세팅하라",
      components: {
        climate: {
          maxTemperature: "101"
        }
      }
    }
  }
};

// Add a new component
var twinPatchAddWifiComponent = {
  properties: {
    desired: {
      patchId: "와이파이를 추가하라",
      components: {
        wifi: {
          channel: "6",
          ssid: "my_network"
        }
      }
    }
  }
};

// Update the WiFi component
var twinPatchUpdateWifiComponent = {
  properties: {
    desired: {
      patchId: "와이파이를 수정해라",
      components: {
        wifi: {
          channel: "13",
          ssid: "my_other_network"
        }
      }
    }
  }
};

// Delete the WiFi component
var twinPatchDeleteWifiComponent = {
  properties: {
    desired: {
      patchId: "와이파이를 삭제해라",
      components: {
        wifi: null
      }
    }
  }
};
// </patches>

// <senddesiredproperties>
// Send a desired property update patch
async function sendDesiredProperties(twin, patch) {
  twin.update(patch, (err, twin) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(chalk.green(`\n ${twin.properties.desired.patchId} patch:`));
      console.log(JSON.stringify(patch, null, 2));
    }
  });
}
// </senddesiredproperties>

// <displayreportedproperties>
// Display the reported properties from the device
function printReportedProperties(twin) {
  console.log("마지막 전달받은 내용: " + twin.properties.reported.lastPatchReceivedId);
  console.log("펌웨어 버전: " + twin.properties.reported.firmwareVersion);
  console.log("팬 상태: " + twin.properties.reported.fanOn);
  console.log("최소 온도 세팅: " + twin.properties.reported.minTemperature);
  console.log("최대 온도 세팅: " + twin.properties.reported.maxTemperature);
}
// </displayreportedproperties>

// <getregistrytwin>
// Create a device identity registry object
var registry = Registry.fromConnectionString(connectionString);

// Get the device twin and send desired property update patches at intervals.
// Print the reported properties after some of the desired property updates.
registry.getTwin(deviceId, async (err, twin) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('단말기 수신 확인 됨');
    // </getregistrytwin>

    sendDesiredProperties(twin,twinPatchReset);
    await sleep(20000);
    console.log(chalk.blue('단말에서 리포트 된 초기 값'));
    printReportedProperties(twin);
    sendDesiredProperties(twin,twinPatchInit);
    await sleep(5000);
    sendDesiredProperties(twin,twinPatchFanOn);
    await sleep(5000);
    sendDesiredProperties(twin,twinPatchSetMaxTemperature);
    await sleep(5000);
    sendDesiredProperties(twin,twinPatchAddWifiComponent);
    await sleep(5000);
    sendDesiredProperties(twin,twinPatchUpdateWifiComponent);
    await sleep(5000);
    sendDesiredProperties(twin,twinPatchDeleteWifiComponent);
    await sleep(20000);
    console.log(chalk.blue('\n단말에서 리포트된 마지막 값'));
    printReportedProperties(twin);
  }
});

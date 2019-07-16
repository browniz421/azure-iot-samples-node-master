// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const chalk = require('chalk');
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;

// <createhubclient>
// Get the device connection string from a command line argument
var connectionString = process.argv[2];
// </createhubclient>

// <reportedpatch>
// Create a patch to send to the hub
var reportedPropertiesPatch = {
  firmwareVersion:'1.2.1',
  lastPatchReceivedId: '',
  fanOn:'',
  minTemperature:'',
  maxTemperature:''
};
// </reportedpatch>

// Create the IoTHub client from the connection string
var client = Client.fromConnectionString(connectionString, Protocol);

// <gettwin>
// Get the device twin
client.getTwin(function(err, twin) {
  if (err) {
    console.error(chalk.red('서버에 등록된 단말기를 찾을 수 없습니다.'));
  } else {
    console.log(chalk.green('단말기 접속 완료'));
    // </gettwin>
    // <allproperties>
    // Handle all desired property updates
    twin.on('properties.desired', function(delta) {
        console.log(chalk.yellow('\n새로 전달받은 메세지를 전달함:'));
        // </allproperties>
        if (delta.patchId) {
          console.log(delta.patchId);
          reportedPropertiesPatch.lastPatchReceivedId = delta.patchId;
        }
        else {
          console.log('{no patchId in patch}');

          // Initialize the reported properties
          reportedPropertiesPatch.lastPatchReceivedId = '{unknown}';
          reportedPropertiesPatch.minTemperature = '{unknown}';
          reportedPropertiesPatch.maxTemperature = '{unknown}';
          reportedPropertiesPatch.fanOn = '{unknown}';
          sendReportedProperties();
        }
    });

    // <climatecomponent>
    // Handle desired properties updates to the climate component
    twin.on('properties.desired.components.climate', function(delta) {
        if (delta.minTemperature || delta.maxTemperature) {
          console.log(chalk.green('\n수정된 온도세팅:'));
          console.log('최소 온도를 이렇게 세팅 함: ' + twin.properties.desired.components.climate.minTemperature);
          console.log('최대 온도를 이렇게 세팅 함: ' + twin.properties.desired.components.climate.maxTemperature);

          // Update the reported properties and send them to the hub
          reportedPropertiesPatch.minTemperature = twin.properties.desired.components.climate.minTemperature;
          reportedPropertiesPatch.maxTemperature = twin.properties.desired.components.climate.maxTemperature;
          sendReportedProperties();
        }
    });
    // </climatecomponent>

    // <fanproperty>
    // Handle changes to the fanOn desired property
    twin.on('properties.desired.fanOn', function(fanOn) {
        console.log(chalk.green('\n팬의 현재 상태 ' + fanOn));

        // Update the reported property after processing the desired property
        reportedPropertiesPatch.fanOn = fanOn ? fanOn : '{unknown}';
    });
    // </fanproperty>

    // <components>
    // Keep track of all the components the device knows about
    var componentList = {};

    // Use this componentList list and compare it to the delta to infer
    // if anything was added, deleted, or updated.
    twin.on('properties.desired.components', function(delta) {
      if (delta === null) {
        componentList = {};
      }
      else {
        Object.keys(delta).forEach(function(key) {

          if (delta[key] === null && componentList[key]) {
            // The delta contains a null value, and the
            // device has a record of this component.
            // Must be a delete operation.
            console.log(chalk.green('\n요청 메세지 삭제 ' + key));
            delete componentList[key];

          } else if (delta[key]) {
            if (componentList[key]) {
              // The delta contains a component, and the
              // device has a record of it.
              // Must be an update operation.
              console.log(chalk.green('\n요청 메세지 수정 ' + key + ':'));
              console.log(JSON.stringify(delta[key]));
              // Store the complete object instead of just the delta
              componentList[key] = twin.properties.desired.components[key];

            } else {
              // The delta contains a component, and the
              // device has no record of it.
              // Must be an add operation.
              console.log(chalk.green('\n요청 메세지 추가' + key + ':'));
              console.log(JSON.stringify(delta[key]));
              // Store the complete object instead of just the delta
              componentList[key] = twin.properties.desired.components[key];
            }
          }
        });
      }
    });
    // </components>

    // <sendreportedproperties>
    // Send the reported properties patch to the hub
    function sendReportedProperties() {
      twin.properties.reported.update(reportedPropertiesPatch, function(err) {
        if (err) throw err;
        console.log(chalk.blue('\n단말 상태를 서버로 리포트 함'));
        console.log(JSON.stringify(reportedPropertiesPatch, null, 2));
      });
    }
    // </sendreportedproperties>
  }
});

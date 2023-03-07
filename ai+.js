'use strict';

import * as fs from 'fs';
const REQUEST_TIMEOUT = 60000;
import { default as baseRequest } from 'request';
import { parallel } from 'async';
import { DateTime } from 'luxon';
const request = baseRequest.defaults({ timeout: REQUEST_TIMEOUT });

const validParameters = {
  PM10: { value: 'pm10', unit: 'ppm' },
  O3: { value: 'o3', unit: 'ppm' },
  SO2: { value: 'so2', unit: 'ppm' },
  NMHC: { value: 'nmhc', unit: 'ppmC' },
  NO2: { value: 'no2', unit: 'ppm' },
  CO: { value: 'co', unit: 'ppm' },
  NO: { value: 'no', unit: 'ppm' },
  NOX: { value: 'nox', unit: 'ppm' },
  OX: { value: 'ox', unit: 'ppm' },
  PM2_5: { value: 'pm25', unit: 'μg/m3' },
  CH4: { value: 'ch4', unit: 'ppmC' },
  THC: { value: 'thc', unit: 'ppmC' },
  SPM: { value: 'spm', unit: 'mg/m3' },
  PM_25: { value: 'pm25', unit: 'μg/m3' },
  SP: { value: 'sp', unit: 'mg/m3' },
  WD: { value: 'wd', unit: 'direction' },
  WS: { value: 'ws', unit: 'm/s' },
  TEMP: { value: 'temp', unit: 'C' },
  HUM: { value: 'humidity', unit: '%' },
};

function convertUnits(input) {
  return input;
}

function fetchData(csv_url, cb) {
  return request(csv_url, (err, res, body) => {
    if (err || res.statusCode !== 200) {
      console.log(err);
    } else {
      var stations = [];
      const rows = body.split('\n');
      const headers = rows[0].split(',');
      for (let i = 1; i < rows.length; i++) {
        let station = {};
        const row = rows[i].split(',');
        for (let j = 0; j < row.length; j++) {
          station[translation[headers[j]]] = row[j];
        }
        if (rows[i].length > 0) {
          stations.push(station);
        }
      }
      const foo = stations.slice(0, 10);
      const requests = foo.map((station) => {
        return (done) => {
          const BASE_URL =
            'https://soramame.env.go.jp/soramame/api/data_search';
          const url = `${BASE_URL}?Start_YM=202209&End_YM=202210&TDFKN_CD=${station.prefectureCode}&SKT_CD=${station.id}`;
          console.log(url);
          request(url, (err, res, body) => {
            if (err || res.statusCode !== 200) {
              return done({
                message: `Failure to load data url (${url})`,
              });
            }
            const data = Object.assign(station, {
              body: body,
            });
            return done(null, data);
          });
        };
      });
      parallel(requests, (err, results) => {
        if (err) {
          console.log(err);
          return cb(err);
        }
        try {
          const data = formatData(results);
          if (data === undefined) {
            return cb({ message: 'Failure to parse data.' });
          }
          return cb(null, data);
        } catch (e) {
          return cb(e);
        }
      });
    }
  });
}

function parseDate(dateString) {
  /**
   * converts the given date string to a timezoned date
   * @param {string} dateString date as string in format 'YYYY-MM-DD HH:mm:ss'
   * @return {DateTime} luxon DateTime with the appropriate timezone
   */

  const pattern = //
    /(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})/; // pattern to match the date string as
  const regex = new RegExp(pattern);

  const groups = regex.exec(dateString); // regex.exec returns an array of matches
  // console.log(groups)
  const seconds = groups[6];
  const minutes = groups[5];
  const hour = groups[4]; // parseInt converts a string to an integer
  const day = groups[3];
  const month = groups[2];
  const year = groups[1];
  const d = DateTime.fromISO(
    `${year}-${month}-${day}T${hour}:${minutes}:${seconds}`,
    {
      zone: 'Asia/Tokyo',
    }
  ); // this is a luxon DateTime object that is made by parsing the date string stating with
  return d;
}
const parseDate = (dateString) => {
  const pattern = /(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})/;
  const regex = new RegExp(pattern);
  const groups = regex.exec(dateString);
  const seconds = groups[6];
  const minutes = groups[5];
  const hour = groups[4];
  const day = groups[3];
  const month = groups[2];
  const year = groups[1];
  const d = DateTime.fromISO(
    `${year}-${month}-${day}T${hour}:${minutes}:${seconds}`,
    {
      zone: 'Asia/Tokyo',
    }
  );
  return d;
};
function formatData(locations) {
  let out = [];
  for (const location of locations) {
    // console.log(location.latitude)
    let latitude = location.latitude;
    let longitude = location.longitude;
    const body = JSON.parse(location.body)
      // const measurements = JSON.parse(body.JSONDataResult)
      // console.log(body);
      .map((item) => {
        return Object.assign(item, {
          dateString: `${item.SKT_DATE.replace(/\//g, '-')} ${
            item.SKT_TIME
          }:00:00`,
        });
      })
      .map((o) => {
        const date = parseDate(o.dateString);
        // console.log(date)
        o.DateTime = date;
        return o;
      });

    const measurementsSorted = body.sort(
      (a, b) => b.DateTime - a.DateTime
    );
    const latestMeasurements = measurementsSorted[0];
    // make latestMeasurements the last item in the body array
    // const latestMeasurements = body[body.length - 1];
    const filtered = Object.entries(latestMeasurements)
      .filter(([key, _]) => {
        return key in validParameters;
      })
      .map((o) => {
        return {
          //get the parameter name from the validParameters object
          parameter: validParameters[o[0]].value, //o[0] is the key, o[1] is the value
          //get the value from the latestMeasurements object
          value: o[1],
          //get the unit from the validParameters object
          unit: validParameters[o[0]].unit,
          //
          // "value": o[1]
        };
      });
    // console.log(latestMeasurements.DateTime.toUTC().toISO())
    const data = filtered.map((f) => {
      return {
        parameter: f.parameter,
        value: f.value,
        unit: f.unit,
        date: {
          utc: latestMeasurements.DateTime.toUTC().toISO(),
          local: latestMeasurements.DateTime.toISO(),
        },

        location: 'JP',
        // city: location.city,
        coordinates: {
          latitude: latitude,
          longitude: longitude,
        },
        attribution: [
          {
            name: 'Ministry of the Environment Wide Area Monitoring System for Air Pollutants (Soramamekun)',
            url: 'https://soramame.env.go.jp',
          },
          // {
          //     name: 'japan-air-pollution',
          //     url: 'https://yourwebsite.com',
          // },
        ],
        averagingPeriod: {
          unit: 'hours',
          value: 1,
        },
      };
    });
    out.push(data);
  }
  return out;
}

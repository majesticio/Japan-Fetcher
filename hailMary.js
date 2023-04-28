'use strict';

import { performance } from 'perf_hooks';
import { DateTime } from 'luxon';
import { parse } from 'csv-parse';
import got from 'got';

import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  minTime: 100, // Minimum time between requests (in milliseconds)
  maxConcurrent: 10, // Maximum number of concurrent requests
});

const translation = {
  緯度: 'latitude',
  経度: 'longitude',
  測定局コード: 'id',
  測定局名称: 'bureauName',
  所在地: 'location',
  測定局種別: 'measuringStationType',
  問い合わせ先: 'contactInformation',
  都道府県コード: 'prefectureCode',
};

async function fetchStations(csv_url) {
  try {
    const response = await got(csv_url);
    return new Promise((resolve, reject) => {
      parse(
        response.body,
        {
          columns: (header) => header.map((col) => translation[col]),
        },
        (err, records) => {
          err ? reject(err) : resolve(records.slice(0, -1));
        }
      );
    });
  } catch (error) {
    console.error(error);
  }
}

function getTokyoDateTimeMinusDay() {
  const now = DateTime.utc().setZone('Asia/Tokyo');
  return now.minus({ days: 1 });
}

const tokyoTime = getTokyoDateTimeMinusDay();
const year = tokyoTime.toFormat('yyyy');
const month = tokyoTime.toFormat('MM');
const day = tokyoTime.toFormat('dd');

const csv_url = `https://soramame.env.go.jp/data/map/kyokuNoudo/${year}/${month}/${day}/01.csv`;

async function fetchStationData(stationId, unixTimeStamp) {
  const url = `https://soramame.env.go.jp/data/sokutei/NoudoTime/${stationId}/today.csv?_=${unixTimeStamp}`;
  const response = await got(url);
  return new Promise((resolve, reject) => {
    parse(response.body, { columns: true }, (err, records) => {
      err ? reject(err) : resolve(records);
    });
  });
}

async function getAirQualityData() {
  const stationData = await fetchStations(csv_url);

  //   console.log(stationData.slice(0, 1));

  const now = DateTime.now().setZone('utc');

  // const unixTimeStamp = now.toMillis(); // testing line below
  const unixTimeStamp = now.minus({ minutes: 1 }).toMillis();

  let requestCounter = 0;

  const bottleneckedStationRequests = stationData
    .slice(0, 100) // Adjust the slice as needed
    .map(async (station) => {
      const stationId = station['id'];
      try {
        // Increment the counter before making the request
        requestCounter++;
        const data = await limiter.schedule(() =>
          fetchStationData(stationId, unixTimeStamp)
        );

        const result = data.flatMap((row) => {
          return Object.entries(units)
            .filter(
              ([parameter]) =>
                row.hasOwnProperty(parameter) && row[parameter] !== ''
            )
            .map(([parameter]) => {
              const standardizedParam =
                parameter === 'PM2.5'
                  ? 'pm25'
                  : parameter.toLowerCase();

              if (acceptableParameters.includes(standardizedParam)) {
                const value = parseFloat(row[parameter]);
                if (!isNaN(value)) {
                  return {
                    location: station.location,
                    city: '',
                    coordinates: {
                      latitude: parseFloat(station.latitude),
                      longitude: parseFloat(station.longitude),
                    },
                    date: {
                      utc: now
                        .startOf('hour')
                        .toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                      local: now
                        .setZone('Asia/Tokyo')
                        .startOf('hour')
                        .toFormat("yyyy-MM-dd'T'HH:mm:ssZZ"),
                    },
                    parameter: standardizedParam,
                    value: value,
                    unit: units[parameter],
                    attribution: [
                      {
                        name: 'Ministry of the Environment Air Pollutant Wide Area Monitoring System',
                        url: 'https://soramame.env.go.jp/',
                      },
                    ],
                    averagingPeriod: { unit: 'hours', value: 1 },
                  };
                }
              }
              return null;
            })
            .filter((item) => item !== null);
        });

        const uniqueResults = Array.from(
          new Set(result.map((obj) => JSON.stringify(obj)))
        ).map((json) => JSON.parse(json));

        return uniqueResults;
      } catch (error) {
        console.error(
          `Failed to fetch data for stationId: ${stationId}`,
          error
        );
        return [];
      }
    });

  const results = await Promise.all(bottleneckedStationRequests);

  // Log the total number of requests made
  console.log(`Total requests made: ${requestCounter}`);
  console.log(results.size);
  // Flatten the array of arrays
  return results.flat();
}

async function main() {
  const start = performance.now();
  try {
    const data = await getAirQualityData();
    console.dir(data, { depth: null });
  } catch (error) {
    console.error(error);
  } finally {
    const end = performance.now();
    console.log(`Total execution time: ${end - start} milliseconds`);
  }
}

main();

const acceptableParameters = [
  'pm25',
  'pm10',
  'co',
  'so2',
  'no2',
  'bc',
  'o3',
  'no',
  'pm1',
  'nox',
];

const units = {
  SO2: 'ppm',
  NO: 'ppm',
  NO2: 'ppm',
  NOX: 'ppm',
  CO: 'ppm',
  OX: 'ppm',
  NMHC: 'ppmC',
  CH4: 'ppmC',
  THC: 'ppmC',
  SPM: 'mg/m3',
  'PM2.5': 'µg/m3',
  SP: 'mg/m3',
  WD: '',
  WS: '',
  TEMP: '',
  HUM: '',
};

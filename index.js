/**
 * This code is responsible for implementing all methods related to fetching
 * and returning data for the Japanese data sources.
 */
'use strict';


import * as fs from 'fs';
const REQUEST_TIMEOUT = 60000;
//import { REQUEST_TIMEOUT } from '../lib/constants';
import { default as baseRequest } from 'request';
//  import { default as moment } from 'moment-timezone'; 
import { parallel } from 'async';
import { DateTime } from 'luxon';
// import { normalizeUnits } from 'moment-timezone';
//import { convertUnits } from '../lib/utils';
const request = baseRequest.defaults({ timeout: REQUEST_TIMEOUT });
//"PM10": {"value": "pm10", "unit":"ug/m3"}   validParameters[parameter].value
const validParameters = {
    "PM10": { 'value': 'pm10', 'unit': 'ppm' }, // NA?
    "O3": { 'value': 'o3', 'unit': 'ppm' }, // NA?
    "SO2": { 'value': 'so2', 'unit': 'ppm' }, //
    "NMHC": { 'value': "nmhc", 'unit': 'ppmC' }, //
    "NO2": { 'value': 'no2', 'unit': 'ppm' }, //
    "CO": { 'value': 'co', 'unit': 'ppm' }, // NULL?
    "NO": { 'value': "no", 'unit': 'ppm' }, //
    "NOX": { 'value': 'nox', 'unit': 'ppm' }, //
    "OX": { 'value': "ox", 'unit': 'ppm' }, //
    'PM2_5': { 'value': 'pm25', 'unit': 'μg/m3' },  // 
    "CH4": { 'value': "ch4", 'unit': 'ppmC' }, //
    "THC": { 'value': "thc", 'unit': 'ppmC' },
    "SPM": { 'value': 'spm', 'unit': 'mg/m3' },
    "PM_25": { 'value': 'pm25', 'unit': 'μg/m3' },
    "SP": { 'value': "sp", 'unit': 'mg/m3' },// NULL?
    "WD": { 'value': "wd", 'unit': 'direction' }, // wind direction
    "WS": { 'value': "ws", 'unit': 'm/s' }, // wind speed
    "TEMP": { 'value': "temp", 'unit': 'C' },
    "HUM": { 'value': "humidity", 'unit': '%' },
};

function convertUnits(input) { return input; }
/**
 * Fetches the data for a given source and returns an appropriate object
 * @param {object} source A valid source object
 * @param {function} cb A callback of the form cb(err, data)
 */

const translation = {
    '緯度': 'latitude',
    '経度': 'longitude',
    '測定局コード': 'id', // Measuring_station_code
    '測定局名称': 'bureauName',
    '所在地': 'location',
    '測定局種別': 'measuringStationType',
    '問い合わせ先': 'contactInformation',
    '都道府県コード': 'prefectureCode'
}

//get the current date and time in Japan.
const settings = {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit', //easiest way to format the date to YYYY/MM/DD
    day: '2-digit',
    // hour: 'numeric',
    // minute: 'numeric',
    // second: 'numeric',
};

var now = new Date().toLocaleString('ja-JP', settings); // ja-JP will format the date to YYYY/MM/DD with the year first

var today = new Date();

console.log(today);
console.log(now + ' in Japan');

// use regext to parse the date string from japam formatted yyyy/mm/dd
const pattern = //
    /(\d{4})\/(\d{2})\/(\d{2})/; // pattern to match the date string as
const regex = new RegExp(pattern);

const groups = regex.exec(now); // regex.exec returns an array of matches
// console.log(groups)
const day = groups[3];
const month = groups[2];
const year = groups[1];

// const csv_url = 'https://soramame.env.go.jp/data/map/kyokuNoudo/2022/10/06/01.csv';
const csv_url = `https://soramame.env.go.jp/data/map/kyokuNoudo/${year}/${String(month).padStart(2, '0')}/${String(day - 1).padStart(2, '0')}/01.csv`;
// const csv_url = `https://soramame.env.go.jp/data/map/kyokuNoudo/${year}/${month}/${day}/01.csv`;
console.log(csv_url);

function fetchData(csv_url, cb) {
    return request(csv_url, (err, res, body) => {
        if (err || res.statusCode !== 200) {
            console.log(err);
        } else {
            // console.log(body);
            var stations = [];
            const rows = body.split('\n');
            // console.log(rows.slice(-10))
            console.log(body.slice(-20))
            const headers = rows[0].split(',');
            for (let i = 1; i < rows.length; i++) { // start at 1 to skip headers

                let station = {}; // create a new station object for each row
                const row = rows[i].split(','); // split the row into columns
                for (let j = 0; j < row.length; j++) { // loop through each column
                    station[translation[headers[j]]] = row[j]; // add the value to the station object by using the header as the key
                }
                //append the station object to the stations array, seperated by commas. return the array to the locations variable
                if (rows[i].length > 0) {
                    stations.push(station);
                }
                // writeFile(stations);
                // console.log(stations)
            }
            const foo = stations.slice(0, 10); // STATIONS <--
            //create a variable foo that excludes the last element of the stations array
            // const foo = stations
            // console.log(foo.length)
            const requests = foo.map((station) => {
                // map over the stations array and
                return (done) => {
                    const BASE_URL = 'https://soramame.env.go.jp/soramame/api/data_search';

                    const url = `${BASE_URL}?Start_YM=202209&End_YM=202210&TDFKN_CD=${station.prefectureCode}&SKT_CD=${station.id}`

                    // const url = `${BASE_URL}?Start_YM=${year}${(String(month - 1).padStart(2, '0'))}&End_YM=${year}${String(month).padStart(2, '0')}&TDFKN_CD=${station.prefectureCode}&SKT_CD=${station.id}`
                    console.log(url)
                    request(url, (err, res, body) => {
                        // make a request for each station err = error, res = response, body = body of the response
                        if (err || res.statusCode !== 200) {
                            return done({ message: `Failure to load data url (${url})` });
                        }
                        const data = Object.assign(station, {
                            body: body //JSON.parse(body)
                        });
                        // console.log(data);
                        return done(null, data); //null = no error, data = the data
                    });
                };
            });

            parallel(requests, (err, results) => {
                // parallel is a function from the async library that takes an array of functions and a callback
                if (err) {
                    console.log(err)
                    return cb(err);
                }
                try {
                    // console.log(results[0].body);
                    const data = formatData(results);
                    // Make sure the data is valid
                    if (data === undefined) {
                        // undefined = no data
                        return cb({ message: 'Failure to parse data.' });
                    }
                    return cb(null, data);
                } catch (e) {
                    return cb(e);
                }
                // return results;
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
                    dateString: `${item.SKT_DATE.replace(/\//g, '-')} ${item.SKT_TIME}:00:00`
                })
            })
            .map((o) => {
                const date = parseDate(o.dateString)
                // console.log(date)
                o.DateTime = date;
                return o;
            })



        const measurementsSorted = body.sort((a, b) => b.DateTime - a.DateTime);
        const latestMeasurements = measurementsSorted[0];
        // make latestMeasurements the last item in the body array
        // const latestMeasurements = body[body.length - 1];
        const filtered = Object.entries(latestMeasurements).filter(([key, _]) => {
            return key in validParameters;
        }).map(o => {
            return {
                //get the parameter name from the validParameters object
                parameter: validParameters[o[0]].value, //o[0] is the key, o[1] is the value
                //get the value from the latestMeasurements object
                value: o[1],
                //get the unit from the validParameters object
                unit: validParameters[o[0]].unit,
                //
                // "value": o[1]
            }
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
                averagingPeriod: { unit: 'hours', value: 1 }
            }
        });
        out.push(data);
        // console.log(out);

    }
    return { name: 'unused', Measurements: out.flat() };
}


function writeFile(data) {
    fs.writeFileSync('./out.json', JSON.stringify(data))
}


fetchData(csv_url, (err, data) => writeFile(data))
// console.log(typeof (month - 1))



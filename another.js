import axios from 'axios';
import * as fs from 'fs';
import { parallel, parallelLimit } from 'async';

const BASE_URL =
  'https://soramame.env.go.jp/soramame/api/data_search';

const csv_url =
  'https://soramame.env.go.jp/data/map/kyokuNoudo/2022/10/06/01.csv';

const translation = {
  緯度: 'latitude',
  経度: 'longitude',
  測定局コード: 'id', // Measuring_station_code
  測定局名称: 'bureauName',
  所在地: 'location',
  測定局種別: 'measuringStationType',
  問い合わせ先: 'contactInformation',
  都道府県コード: 'prefectureCode',
};

async function fetchCSVData(url) {
  try {
    const res = await axios.get(url, { responseType: 'text' });
    const body = res.data;
    var stations = [];
    const rows = body.split('\n');
    // console.log(rows.slice(-10))
    console.log(body.slice(-20));
    const headers = rows[0].split(',');
    for (let i = 1; i < rows.length; i++) {
      // start at 1 to skip headers

      let station = {}; // create a new station object for each row
      const row = rows[i].split(','); // split the row into columns
      for (let j = 0; j < row.length; j++) {
        // loop through each column
        station[translation[headers[j]]] = row[j]; // add the value to the station object by using the header as the key
      }
      //append the station object to the stations array, seperated by commas. return the array to the locations variable
      if (rows[i].length > 0) {
        stations.push(station);
      }
    }
    return stations;
    // return res.data;
  } catch (error) {
    throw new Error(`Error fetching CSV data from ${url}: ${error}`);
  }
}

async function fetchData(url, cb) {
  const stations = await fetchCSVData(url);
  const requests = stations.map(async (station) => {
    return (done) => {
    try {
      const url = `${BASE_URL}?Start_YM=202209&End_YM=202210&TDFKN_CD=${station.prefectureCode}&SKT_CD=${station.id}`;
      const res = await axios.get(url);
      return res.data;
      
    } catch (error) {
      throw new Error(
        `Error fetching data for station ${station.id}: ${error}`
      );
    }
  });

  parallelLimit(requests, 64, (err, results) => {
    //   parallel(requests, (err, results) => {
    // parallel is a function from the async library that takes an array of functions and a callback
    if (err) {
      console.log(err);
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
  console.log(requests);
  return requests;
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
        averagingPeriod: { unit: 'hours', value: 1 },
      };
    });
    out.push(data);
    // console.log(out);
  }
  return { name: 'unused', Measurements: out.flat() };
}

//   (async () => {
//     try {
//       const data = await fetchCSVData(csv_url);
//       console.log(data);
//     } catch (err) {
//       console.error(err);
//     }
//   })();

function writeFile(data) {
  fs.writeFileSync('./anotherOut.json', JSON.stringify(data));
}

fetchData(csv_url, (err, data) => writeFile(data));

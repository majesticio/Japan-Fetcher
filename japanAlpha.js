import request from 'request';
import unzipper from 'unzipper';
import { performance } from 'perf_hooks';
import csvtojson from 'csvtojson';
import fs from 'fs/promises';
import iconv from 'iconv-lite';
import { DateTime, IANAZone } from 'luxon';

async function downloadAndUnzip(url, localPath) {
  return new Promise((resolve, reject) => {
    request
      .post(url)
      .on('error', (error) => {
        reject(error);
      })
      .pipe(unzipper.Extract({ path: localPath }))
      .on('close', () => {
        resolve();
      });
  });
}

const path = './data';
const url =
  'https://soramame.env.go.jp/soramame/download?DL_KBN=3&Target_YM=202304&TDFKN_CD=00&SKT_CD=';

const startTime = performance.now();
downloadAndUnzip(url, path).then(() => {
  const endTime = performance.now();
  console.log(`Execution time: ${endTime - startTime} ms`);
});

async function parseCSVtoJSON(filePath) {
  const fileContent = await fs.readFile(filePath);
  const utf8Content = iconv.decode(fileContent, 'Shift_JIS');

  const lines = utf8Content.split('\n');
  const header = lines[0].replace('PM2.5', 'PM25');
  const last24Lines = lines.slice(-47); // Keep the last 24 rows + header
  const content = [header, ...last24Lines.slice(1)].join('\n');

  const jsonArray = await csvtojson().fromString(content);
  return jsonArray;
}

async function processCSVFiles(directoryPath) {
  try {
    const fileNames = await fs.readdir(directoryPath);
    const csvFiles = fileNames.filter((fileName) =>
      fileName.endsWith('.csv')
    );

    const jsonArray = [];
    for (const csvFile of csvFiles) {
      const filePath = `${directoryPath}/${csvFile}`;
      const jsonData = await parseCSVtoJSON(filePath);
      jsonArray.push(...jsonData); // Use the spread operator to add the objects directly
    }

    return jsonArray;
  } catch (error) {
    console.error('Error processing CSV files:', error);
  }
}

//   const dataDirectory = './data';
//   processCSVFiles(dataDirectory).then((combinedJsonArray) => {
//     console.dir(combinedJsonArray, { depth: null });
//   });

function formatData(data) {
  const allowedParameters = [
    'PM25',
    'PM10',
    'NO',
    'NO2',
    'NOx',
    'SO2',
    'O3',
  ];
  const formattedData = [];

  for (const entry of data) {
    const station = entry['測定局コード'];
    const date = DateTime.fromFormat(
      `${entry['日付']} ${entry['時']}`,
      'yyyy/MM/dd H',
      { zone: 'Asia/Tokyo' }
    );
    const dateUTC = date.toUTC().toISO();
    const dateLocal = date.toISO();

    for (const key of Object.keys(entry)) {
      const parameter = key.split('(')[0];

      if (allowedParameters.includes(parameter)) {
        const value = entry[key];

        if (value !== '' && value !== null) {
          formattedData.push({
            station,
            date: {
              utc: dateUTC,
              local: dateLocal,
            },
            parameter,
            value,
          });
        }
      }
    }
  }

  return formattedData;
}

const dataDirectory = './data';
processCSVFiles(dataDirectory).then((combinedJsonArray) => {
  const formattedData = formatData(combinedJsonArray);
  console.dir(formattedData, { depth: null });
});

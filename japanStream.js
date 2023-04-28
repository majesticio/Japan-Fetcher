import request from 'request';
import { PassThrough } from 'stream';
import { performance } from 'perf_hooks';
import csvtojson from 'csvtojson';
import iconv from 'iconv-lite';
import { DateTime } from 'luxon';
import concat from 'concat-stream';
import unzipper from 'unzipper';

const folderPath = './data';
const url =
  'https://soramame.env.go.jp/soramame/download?DL_KBN=3&Target_YM=202304&TDFKN_CD=00&SKT_CD=';

async function downloadAndUnzip(url) {
  return new Promise((resolve, reject) => {
    const dataPromises = [];

    request
      .post(url)
      .on('error', (error) => {
        reject(error);
      })
      .pipe(unzipper.Parse())
      .on('entry', (entry) => {
        const contentPromise = new Promise((resolveContent) => {
          entry.pipe(
            concat(async (data) => {
              const jsonData = await processCSVData(data);
              resolveContent(jsonData);
            })
          );
        });
        dataPromises.push(contentPromise);
      })
      .on('close', async () => {
        const combinedData = await Promise.all(dataPromises);
        const flattenedData = combinedData.flat();
        resolve(flattenedData);
      });
  });
}

async function processCSVData(data) {
  const utf8Content = iconv.decode(data, 'Shift_JIS');
  const lines = utf8Content.split('\n');
  const header = lines[0].replace('PM2.5', 'PM25');
  const last24Lines = lines.slice(-12); // should be 27 for prod
  const content = [header, ...last24Lines.slice(1)].join('\n');

  const jsonArray = await csvtojson().fromString(content);
  return jsonArray;
}

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
    const dateUTC = date
      .toUTC()
      .toISO({ suppressMilliseconds: true });
    const dateLocal = date.toISO({ suppressMilliseconds: true });

    for (const key of Object.keys(entry)) {
      const parameter = key.split('(')[0];
      //   const unitString = key.split('(')[1];
      //   const unit = unitString.replace(')', '');

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
            // unit,
          });
        }
      }
    }
  }

  return formattedData;
}

const startTime = performance.now();
downloadAndUnzip(url).then((combinedJsonArray) => {
  const formattedData = formatData(combinedJsonArray);
  console.dir(formattedData, { depth: null });
  const endTime = performance.now();
  console.log(`Execution time: ${endTime - startTime} ms`);
});

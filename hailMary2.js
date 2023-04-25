import { DateTime } from 'luxon';
import got from 'got';
import pkg from 'papaparse';
import puppeteer from 'puppeteer';

const { parse } = pkg;

const currentDateTime = DateTime.utc();
const formattedDateTime = currentDateTime.toFormat('yyyy/MM/dd/HH');
const unixTimeStamp = Math.floor(currentDateTime.toMillis());
console.log(unixTimeStamp);

const requestOptions = {
  headers: {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'sec-ch-ua':
      '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    referrer:
      'https://soramame.env.go.jp/preview/table/01107030/today/SO2/-',
  },
  //   referrer:
  //     'https://soramame.env.go.jp/preview/table/01107030/today/SO2/-',
  //   referrerPolicy: 'strict-origin-when-cross-origin',
  //   body: null,
  //   method: 'GET',
  //   mode: 'cors',
  //   credentials: 'include',
};

async function metadata() {
  const url = `https://soramame.env.go.jp/data/sokutei/existence/${formattedDateTime}.csv?_=${unixTimeStamp}`;

  try {
    const response = await got(url);
    const csvData = response.body;

    const parseResult = parse(csvData, {
      header: true,
      delimiter: ',',
      skipEmptyLines: true,
      columns: [
        '測定局コード',
        '測定局名称',
        '住所',
        '局種別',
        '地域コード',
        '都道府県コード',
        '市区町村名',
        'SO2測定有無',
        'NO測定有無',
        'NO2測定有無',
        'NOX測定有無',
        'CO測定有無',
        'OX測定有無',
        'NMHC測定有無',
        'CH4測定有無',
        'THC測定有無',
        'SPM測定有無',
        'PM2.5測定有無',
        'SP測定有無',
        'WD測定有無',
        'WS測定有無',
        'TEMP測定有無',
        'HUM測定有無',
        '問い合わせ先',
      ],
    });

    const jsonData = parseResult.data;
    console.log(jsonData);
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

// metadata();
async function fetchCSVWithPuppeteer(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });

  await page.waitForSelector('body'); // Added this line

  const csvData = await page.evaluate(() => {
    return document.body.textContent;
  });

  await browser.close();
  return csvData;
}

async function locationData() {
  const currentDateTime = DateTime.utc();
  const formattedDateTime = currentDateTime.toFormat('yyyy/MM/dd/HH');
  const unixTimeStamp = currentDateTime.toMillis();

  const url = `https://soramame.env.go.jp/data/map/kyokuNoudo/${formattedDateTime}.csv?_=${unixTimeStamp}`;

  try {
    const csvData = await fetchCSVWithPuppeteer(url);

    const parseResult = parse(csvData, {
      header: true,
      delimiter: ',',
      skipEmptyLines: true,
      columns: [
        '緯度',
        '経度',
        '測定局コード',
        '測定局名称',
        '所在地',
        '測定局種別',
        '問い合わせ先',
        '都道府県コード',
      ],
    });

    const jsonData = parseResult.data;
    console.log(jsonData);
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

locationData();

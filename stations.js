'use strict';

import { DateTime } from 'luxon';
import got from 'got';

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

async function getStations(csv_url) {
  try {
    const response = await got(csv_url);
    const body = response.body;
    const rows = body.split('\n');
    const headers = rows[0].split(',');

    return rows.slice(1).reduce((stations, row) => {
      const rowData = row.split(',');
      if (rowData.length > 1) {
        const station = headers.reduce((acc, header, index) => {
          acc[translation[header]] = rowData[index];
          return acc;
        }, {});
        stations.push(station);
      }
      return stations;
    }, []);
  } catch (error) {
    console.error(error);
  }
}

const getTokyoDateTimeMinusHour = () => {
  const now = DateTime.utc().setZone('Asia/Tokyo');
  return now.minus({ days: 1 });
};
const tokyoTime = getTokyoDateTimeMinusHour();
const year = tokyoTime.toFormat('yyyy');
const month = tokyoTime.toFormat('MM');
const day = tokyoTime.toFormat('dd');

const csv_url = `https://soramame.env.go.jp/data/map/kyokuNoudo/${year}/${month}/${day}/01.csv`;

// console.log(csv_url);
getStations(csv_url)
  .then((stations) => {
    console.log(stations);
  })
  .catch((error) => {
    console.error(error);
  });

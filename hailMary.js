import { DateTime } from 'luxon';
import got from 'got';
import parse from 'csv-parser';

const fetchCsvData = async (url) => {
  const response = await got.stream(url);
  return new Promise((resolve, reject) => {
    const rows = [];
    response
      .pipe(parse({ headers: true }))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });
};

const getJapanAirQualityData = async () => {
  const currentTimeTokyo = DateTime.local().setZone('utc');
  const yyyy = currentTimeTokyo.year;
  const mm = currentTimeTokyo.month.toString().padStart(2, '0');
  const dd = currentTimeTokyo.day.toString().padStart(2, '0');
  const hh = currentTimeTokyo.hour.toString().padStart(2, '0');
  const unixTimeStamp = currentTimeTokyo.toMillis();

  const url1 = `https://soramame.env.go.jp/data/sokutei/existence/${yyyy}/${mm}/${dd}/${hh}.csv?_=${unixTimeStamp}`;
  const url2 = `https://soramame.env.go.jp/data/map/kyokuNoudo/${yyyy}/${mm}/${dd}/${hh}.csv?_=${unixTimeStamp}`;

  const [stationsData, coordinatesData] = await Promise.all([
    fetchCsvData(url1),
    fetchCsvData(url2),
  ]);

  const result = [];

  for (const station of stationsData) {
    const stationId = station['測定局コード'];
    const url3 = `https://soramame.env.go.jp/data/sokutei/NoudoTime/${stationId}/today.csv?_=${unixTimeStamp}`;

    const measurementsData = await fetchCsvData(url3);

    for (const measurement of measurementsData) {
      const coordinateData = coordinatesData.find(
        (coord) => coord['測定局コード'] === stationId
      );

      result.push({
        station: station['測定局名称'],
        coordinates: {
          lat: parseFloat(coordinateData['緯度']),
          lon: parseFloat(coordinateData['経度']),
        },
        date: {
          utc: currentTimeTokyo.toUTC().toISO(),
          local: currentTimeTokyo.toISO(),
        },
        parameter: measurement,
        value: parseFloat(measurement),
        unit: 'ppm', // Adjust the unit according to the parameter
      });
    }
  }

  return result;
};

getJapanAirQualityData()
  .then((data) => console.log(data))
  .catch((error) => console.error(error));

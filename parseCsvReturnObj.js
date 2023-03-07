import fs from 'fs';
import { parse } from 'csv-parse';
const folderPath = 'data';
import { DateTime } from 'luxon';
// const path = 'data/202301_47_47206020.csv';
const path = 'data/202301_38_38205020.csv';
getLatestData(path);

function getLatestData(filePath) {
  const rows = [];
  fs.createReadStream(filePath)
    .pipe(parse({ delimiter: ',' }))
    .on('data', function (row) {
      rows.push(row);
    })
    .on('end', function () {
      const headers = rows.shift().map((h, i) => {
        if (i === 0) return 'StationId';
        if (i === 1) return 'Date';
        if (i === 2) return 'Hour';
        return h;
      }); // store the first row as headers
      const dateColIndex = 1; // set the index of the second column as the date column
      const rowsWithDates = rows.filter((row) => {
        const dateString = row[dateColIndex];
        const date = DateTime.fromFormat(dateString, 'yyyy/MM/dd');
        return date.isValid;
      });
      const latestDate = rowsWithDates.reduce((latest, row) => {
        const dateString = row[dateColIndex];
        const date = DateTime.fromFormat(dateString, 'yyyy/MM/dd');
        return date > latest ? date : latest;
      }, DateTime.fromMillis(0));

      const result = rowsWithDates
        .filter((row) => {
          const dateString = row[dateColIndex];
          const date = DateTime.fromFormat(dateString, 'yyyy/MM/dd');
          return date.equals(latestDate);
        })
        .map((row) => {
          const obj = {};
          headers.forEach((header, i) => {
            const value = row[i].trim();
            if (value !== '-' && value !== '') {
              obj[header] = value;
            }
          });
          return obj;
        });
      console.log(result);
    })
    .on('error', function (error) {
      console.log(error.message);
    });
}

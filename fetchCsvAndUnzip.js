import fs from 'fs';
import { parse } from 'csv-parse';
const folderPath = 'data';
import { DateTime } from 'luxon';

// (1. measuring station code, 2. date, 3. time, ...params...)

const rows = [];

fs.createReadStream(`${folderPath}/202301_47_47210060.csv`)
  .pipe(parse({ delimiter: ',' }))
  .on('data', function (row) {
    rows.push(row);
  })
  .on('end', function () {
    const headers = rows.shift(); // store the first row as headers
    const key = headers[0]; // store the first column as the key
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
          obj[header] = row[i];
        });
        return obj;
      });
    console.log(result);
  })
  .on('error', function (error) {
    console.log(error.message);
  });
//////////////
// fs.createReadStream(`${folderPath}/202301_47_47210060.csv`)
//   .pipe(parse({ delimiter: ',', from_line: 2 }))
//   .on('data', function (row) {
//     console.log(row);
//   })
//   .on('end', function () {
//     console.log('finished');
//   })
//   .on('error', function (error) {
//     console.log(error.message);
//   });
////////////////////

// const rows = [];

// fs.createReadStream(`${folderPath}/202301_47_47210060.csv`)
//   .pipe(parse({ delimiter: ',', from_line: 1 })) // start from first line to get headers
//   .on('data', function (row) {
//     rows.push(row);
//   })
//   .on('end', function () {
//     const headers = rows.shift(); // remove the first row (headers)
//     const lastRow = rows.pop(); // get the last row
//     const result = {};

//     headers.forEach((header, i) => {
//       result[header] = lastRow[i];
//     });

//     console.log([result]);
//   })
//   .on('error', function (error) {
//     console.log(error.message);
//   });

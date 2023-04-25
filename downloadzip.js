import request from 'request';
import fs from 'fs';
import unzipper from 'unzipper';
// import csv from 'csv-parser';
// import parse from 'csv-parse';
const folderPath = './data';
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
  'https://soramame.env.go.jp/soramame/download?DL_KBN=3&Target_YM=202301&TDFKN_CD=00&SKT_CD=';
//////////////
function parseCSVFolder(folderPath, callback) {
  const results = [];

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return callback(err);
    }

    let remainingFiles = files.length;

    if (remainingFiles === 0) {
      return callback(null, results);
    }

    files.forEach((file) => {
      if (file.endsWith('.csv')) {
        const filePath = `${folderPath}/${file}`;
        const stream = fs.createReadStream(filePath).pipe(csv());

        stream.on('data', (data) => {
          results.push(data);
        });

        stream.on('end', () => {
          remainingFiles--;

          if (remainingFiles === 0) {
            callback(null, results);
          }
        });

        stream.on('error', (err) => {
          remainingFiles--;

          if (remainingFiles === 0) {
            callback(err);
          }
        });
      } else {
        remainingFiles--;
      }
    });
  });
}

// parseCSVFolder(folderPath, (err, data) => {
//   if (err) {
//     console.error(err);
//   } else {
//     console.log(data);
//   }
// });
function readFirstCSVFile(folderPath, callback) {
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return callback(err);
    }

    const csvFile = files.find((file) => file.endsWith('.csv'));

    if (!csvFile) {
      return callback(
        new Error(`No CSV file found in folder ${folderPath}`)
      );
    }

    const filePath = `${folderPath}/${csvFile}`;

    const stream = fs.createReadStream(filePath).pipe(csv());
    const results = [];

    stream.on('data', (data) => {
      results.push(data);
    });

    stream.on('end', () => {
      callback(null, results);
    });

    stream.on('error', (err) => {
      callback(err);
    });
  });
}
readFirstCSVFile(folderPath, (err, data) => {
  if (err) {
    console.error(err);
  } else {
    console.log(data);
  }
});

////////////
// downloadAndUnzip(url, path);

// Get an array of all the file names in the folder
// const fileNames = fs.readdirSync('data');

// // Loop through each file
// fileNames.forEach((fileName) => {
//   // Read the contents of the file into a string
//   const fileContents = fs.readFileSync(`data/${fileName}`, 'utf8');

//   // Parse the file contents into an array of objects
//   const data = [];
//   fs.createReadStream(fileContents)
//     .pipe(csv())
//     .on('data', (row) => {
//       data.push(row);
//     });

//   // Do something with the data (e.g. assign it to a variable, manipulate it, etc.)
//   const csvData = data;
//   console.log(csvData);
//   // ...
// });
//////
// async function parseCsvFiles() {
//   // Get an array of all the file names in the folder
//   const fileNames = fs.readdirSync(`data`, 'utf8');

//   // Loop through each file
//   for (const fileName of fileNames) {
//     // Read the contents of the file into a string
//     const fileContents = fs.readFileSync(`data/${fileName}`, 'utf8');

//     // Parse the file contents into an array of objects
//     const data = [];
//     fs.createReadStream(fileContents)
//       .pipe(csv())
//       .on('data', (row) => {
//         data.push(row);
//       });

//     // Do something with the data (e.g. assign it to a variable, manipulate it, etc.)
//     const csvData = data;
//     console.log(csvData);
//     // ...
//   }
// }

// const csv_url =
//   'https://soramame.env.go.jp/data/map/kyokuNoudo/2022/10/06/01.csv';

// async function fetchAndParseCsv(url) {
//   // Make an HTTP request to the URL
//   const response = await request.get(url);

//   // Parse the response into an array of objects
//   const data = [];
//   response.pipe(csv()).on('data', (row) => {
//     data.push(row);
//   });

//   // Do something with the data (e.g. assign it to a variable, manipulate it, etc.)
//   const csvData = data;
//   //    console log the contents of the csv file
//   console.log(csvData);
//   // ...
// }

// // Call the async function
// // await fetchAndParseCsv(csv_url);
// await parseCsvFiles();

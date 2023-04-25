import csvtojson from 'csvtojson';
import fs from 'fs/promises';
import iconv from 'iconv-lite';

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

const dataDirectory = './data';
processCSVFiles(dataDirectory).then((combinedJsonArray) => {
  console.dir(combinedJsonArray, { depth: null });
});

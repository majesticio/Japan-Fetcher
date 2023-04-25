import request from 'request';
import unzipper from 'unzipper';
import { performance } from 'perf_hooks';

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
  'https://soramame.env.go.jp/soramame/download?DL_KBN=3&Target_YM=202304&TDFKN_CD=00&SKT_CD=';

const startTime = performance.now();
downloadAndUnzip(url, path).then(() => {
  const endTime = performance.now();
  console.log(`Execution time: ${endTime - startTime} ms`);
});

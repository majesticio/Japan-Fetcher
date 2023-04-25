const res = await this.page.evaluate(() => {
  return fetch('https://example.com/path/to/file.csv', {
    method: 'GET',
    credentials: 'include',
  }).then((r) => r.text());
});

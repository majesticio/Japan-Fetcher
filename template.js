request({
    url: 'https://example.com',
    maxAttempts: 5,
    retryDelay: 5000,
  }, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      console.log(error);
    } else {
      console.log(body);
    }
  });
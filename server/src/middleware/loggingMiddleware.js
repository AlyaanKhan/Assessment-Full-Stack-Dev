// Prints one line for every request once it has finished.
// Use this to see the method, path, status code and how long the request took.
export function logRequests(request, response, next) {
  const startedAt = Date.now();

  response.on('finish', () => {
    const millisecondsTaken = Date.now() - startedAt;
    console.log(
      `${request.method} ${request.originalUrl} ${response.statusCode} ${millisecondsTaken}ms`
    );
  });

  next();
}

async function error_handler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
  }
  res
    .status(error.status || 500)
    .send({ error: true, message: error.message || error });
}

module.exports = error_handler;

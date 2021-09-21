const error_handler = async (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
  }
  res.status(error.status || 500).send({ error: true, message: error.message });
};

module.exports = error_handler;

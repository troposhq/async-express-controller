module.exports = fn => async (req, res, next, ...args) => {
  try {
    const result = await fn(req, res, next, ...args);
    const { statusCode: status = 200, body, headers = {} } = result;
    res.status(status);
    res.set(headers);
    if (body) return res.send(body);
    return res.send();
  } catch (e) {
    return next(e);
  }
};

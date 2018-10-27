module.exports = fn => async (req, res, next, ...args) => {
  try {
    const result = await fn(req, res, next, ...args);
    const {
      statusCode: status = 200,
      body,
      headers,
      cookies = [],
      render,
      renderLocals,
      redirect,
    } = result;

    if (!redirect) res.status(status);
    if (headers) res.set(headers);

    cookies.forEach(x => res.cookie(x.name, x.value, x.options));

    if (redirect) return res.redirect(...redirect);
    if (render) return res.render(render, renderLocals);
    if (body) return res.send(body);
    return res.send();
  } catch (e) {
    return next(e);
  }
};

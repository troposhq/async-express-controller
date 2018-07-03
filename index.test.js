const chai = require('chai');
const { expect } = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const express = require('express');
const request = require('supertest');

chai.use(sinonChai);
const asyncController = require('./index');

describe('express-controller', () => {
  it('should call next with synchronous errors', async () => {
    const error = new Error('catch me!');
    const spy = sinon.spy();
    const foo = asyncController(() => {
      throw error;
    });

    await foo(null, null, spy);
    expect(spy).to.have.been.calledWith(error);
  });

  it('should call next with async errors', async () => {
    const error = new Error('catch me!');
    const spy = sinon.spy();
    const foo = asyncController(async () => {
      throw error;
    });

    await foo(null, null, spy);
    expect(spy).to.have.been.calledWith(error);
  });

  it('should call next with the arguments when an async function passed into it calls next', async () => {
    const spy = sinon.spy();
    const foo = asyncController(async (req, res, next) => next('test'));

    await foo(null, null, spy);
    expect(spy).to.have.been.calledWith('test');
  });

  it('should provide additional arguments to the middleware', async () => {
    const spy = sinon.spy();
    const id = '1';
    const foo = asyncController(async (req, res, next, ID) => ({ body: { id: ID } }));

    await foo(null, { status: spy, set: spy, send: spy }, null, id);
    expect(spy).to.have.been.calledWith(200); // default status
    expect(spy).to.have.been.calledWith({}); // no headers returned
    expect(spy).to.have.been.calledWith({ id });
  });

  it('should call res.status and res.headers and res.send with correct values', async () => {
    const spy = sinon.spy();
    const id = '1';
    const headers = { 'X-My-Header': 'hello' };
    const foo = asyncController(async (req, res, next, ID) =>
      ({ statusCode: 201, headers, body: { id: ID } })); // eslint-disable-line implicit-arrow-linebreak

    await foo(null, { status: spy, set: spy, send: spy }, null, id);
    expect(spy).to.have.been.calledWith(201);
    expect(spy).to.have.been.calledWith(headers);
    expect(spy).to.have.been.calledWith({ id });
  });

  let app;
  let spy;
  let error;
  const body = { hello: 'world' };

  beforeEach(() => {
    error = new Error('Oops!');
    spy = sinon.spy();
    app = express();
    app.all('/', asyncController(async () => ({ statusCode: 302, body })));
    app.all('/error', asyncController(async () => { throw error; }));
    app.use((err, req, res, next) => {
      spy(err);
      res.send();
    });
  });

  it('should work with express routes', async () => {
    const result = await request(app)
      .get('/')
      .expect(302);
    expect(result.body).to.deep.equal(body);
  });

  it('should go to the error handler', async () => {
    await request(app)
      .get('/error');
    expect(spy).to.have.been.calledWith(error);
  });
});

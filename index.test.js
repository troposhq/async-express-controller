const chai = require('chai');
const { expect } = require('chai');
const sinon = require('sinon');
const sandbox = require('sinon').createSandbox();
const sinonChai = require('sinon-chai');
const express = require('express');
const request = require('supertest');

chai.use(sinonChai);
const asyncController = require('./index');

describe('express-controller', () => {
  let statusSpy;
  let setSpy;
  let cookieSpy;
  let renderSpy;
  let sendSpy;
  let nextSpy;

  beforeEach(() => {
    statusSpy = sandbox.spy();
    setSpy = sandbox.spy();
    cookieSpy = sandbox.spy();
    renderSpy = sandbox.spy();
    sendSpy = sandbox.spy();
    nextSpy = sandbox.spy();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should call next with synchronous errors', async () => {
    const error = new Error('catch me!');
    const foo = asyncController(() => {
      throw error;
    });

    await foo(null, null, nextSpy);
    expect(nextSpy).to.have.been.calledWith(error);
  });

  it('should call next with async errors', async () => {
    const error = new Error('catch me!');
    const foo = asyncController(async () => {
      throw error;
    });

    await foo(null, null, nextSpy);
    expect(nextSpy).to.have.been.calledWith(error);
  });

  it('should call next with the arguments when an async function passed into it calls next', async () => {
    const foo = asyncController(async (req, res, next) => next('test'));

    await foo(null, null, nextSpy);
    expect(nextSpy).to.have.been.calledWith('test');
  });

  it('should provide additional arguments to the middleware', async () => {
    const id = '1';
    const foo = asyncController(async (req, res, next, ID) => ({ body: { id: ID } }));

    await foo(null, { status: statusSpy, send: sendSpy }, null, id);
    expect(statusSpy).to.have.been.calledWith(200); // default status
    expect(sendSpy).to.have.been.calledWith({ id });
  });

  it('should call res.status and res.headers and res.send with correct values', async () => {
    const id = '1';
    const headers = { 'X-My-Header': 'hello' };
    const foo = asyncController(async (req, res, next, ID) =>
      ({ statusCode: 201, headers, body: { id: ID } })); // eslint-disable-line implicit-arrow-linebreak

    await foo(null, { status: statusSpy, set: setSpy, send: sendSpy }, null, id);
    expect(statusSpy).to.have.been.calledWith(201);
    expect(setSpy).to.have.been.calledWith(headers);
    expect(sendSpy).to.have.been.calledWith({ id });
  });

  it('should call res.cookie with correct values', async () => {
    const cookies = [{ name: 'rememberme', value: 1 }];
    const foo = asyncController(async () =>
      ({ statusCode: 201, cookies })); // eslint-disable-line implicit-arrow-linebreak

    await foo(null, { status: statusSpy, cookie: cookieSpy, send: sendSpy }, null);
    expect(statusSpy).to.have.been.calledWith(201);
    expect(cookieSpy).to.have.been.calledWith(cookies[0].name, cookies[0].value);
    expect(sendSpy).to.have.been.called;
  });

  it('should call res.render with correct values', async () => {
    const foo = asyncController(async () => ({ statusCode: 201, render: 'sign-up', renderLocals: { foo: 'bar' } }));

    await foo(null, { status: statusSpy, render: renderSpy }, null);
    expect(statusSpy).to.have.been.calledWith(201);
    expect(renderSpy).to.have.been.calledOnceWithExactly('sign-up', { foo: 'bar' });
  });

  describe('express', () => {
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
});

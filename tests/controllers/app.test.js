const request = require('supertest');
const app = require('../../server'); // Your Express app

describe('AppController', () => {
  it('GET /status', async () => {
    const res = await request(app).get('/status');
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.keys('redis', 'db');
  });

  it('GET /stats', async () => {
    const res = await request(app).get('/stats');
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.keys('users', 'files');
  });
});
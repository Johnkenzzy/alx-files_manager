describe('AuthController', () => {
  let token = '';

  it('POST /users → create new user', async () => {
    const res = await request(app).post('/users').send({
      email: 'john@example.com',
      password: '1234',
    });
    expect(res.statusCode).to.equal(201);
    expect(res.body.email).to.equal('john@example.com');
  });

  it('GET /connect → login and get token', async () => {
    const res = await request(app)
      .get('/connect')
      .set('Authorization', 'Basic ' + Buffer.from('john@example.com:1234').toString('base64'));

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('token');
    token = res.body.token;
  });

  it('GET /users/me → get user by token', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('X-Token', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body.email).to.equal('john@example.com');
  });

  it('GET /disconnect → logout user', async () => {
    const res = await request(app)
      .get('/disconnect')
      .set('X-Token', token);

    expect(res.statusCode).to.equal(204);
  });
});
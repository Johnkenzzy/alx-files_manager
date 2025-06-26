describe('FilesController', () => {
  let token, fileId;

  before(async () => {
    // Login and get token
    const res = await request(app)
      .get('/connect')
      .set('Authorization', 'Basic ' + Buffer.from('john@example.com:1234').toString('base64'));
    token = res.body.token;
  });

  it('POST /files → upload folder', async () => {
    const res = await request(app)
      .post('/files')
      .set('X-Token', token)
      .send({
        name: 'docs',
        type: 'folder',
      });

    expect(res.statusCode).to.equal(201);
    fileId = res.body.id;
  });

  it('GET /files/:id → show file', async () => {
    const res = await request(app)
      .get(`/files/${fileId}`)
      .set('X-Token', token);

    expect(res.statusCode).to.equal(200);
  });

  it('PUT /files/:id/publish → should publish', async () => {
    const res = await request(app)
      .put(`/files/${fileId}/publish`)
      .set('X-Token', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body.isPublic).to.be.true;
  });

  it('PUT /files/:id/unpublish → should unpublish', async () => {
    const res = await request(app)
      .put(`/files/${fileId}/unpublish`)
      .set('X-Token', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body.isPublic).to.be.false;
  });

  it('GET /files → paginated list', async () => {
    const res = await request(app)
      .get(`/files?page=0`)
      .set('X-Token', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
  });
});
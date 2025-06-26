const { expect } = require('chai');
const dbClient = require('../../utils/db');

describe('dbClient', () => {
  it('should be alive', () => {
    expect(dbClient.isAlive()).to.be.true;
  });

  it('should return number of users and files', async () => {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    expect(users).to.be.a('number');
    expect(files).to.be.a('number');
  });
});
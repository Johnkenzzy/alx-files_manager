const { expect } = require('chai');
const redisClient = require('../../utils/redis');

describe('redisClient', () => {
  it('should be alive', () => {
    expect(redisClient.isAlive()).to.be.true;
  });

  it('should set, get, and delete a key', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    const val = await redisClient.get('test_key');
    expect(val).to.equal('test_value');

    await redisClient.del('test_key');
    const deleted = await redisClient.get('test_key');
    expect(deleted).to.be.null;
  });
});

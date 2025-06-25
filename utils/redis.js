const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (err) => {
      console.log('Redis client error:', err.message);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    });
  }

  set(key, value, duration) {
    return new Promise((resolve, reject) => this.client.set(key, value, (err, reply) => {
      if (err) return reject(err);
      // Set expiration
      this.client.expire(key, duration, (expireErr) => {
        if (expireErr) return reject(expireErr);
        return resolve(reply);
      });
      return null;
    }));
  }

  del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    });
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;

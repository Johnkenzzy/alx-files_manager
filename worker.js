const Queue = require('bull');
const imageThumbnail = require('image-thumbnail');
const { ObjectId } = require('mongodb');
const fs = require('fs/promises');
const dbClient = require('./utils/db');

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.db.collection('files').findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
    type: 'image',
  });

  if (!file) throw new Error('File not found');

  const sizes = [500, 250, 100];
  const thumbnailPromises = sizes.map(async (size) => {
    const thumbnail = await imageThumbnail(file.localPath, { width: size });
    await fs.writeFile(`${file.localPath}_${size}`, thumbnail);
  });

  await Promise.all(thumbnailPromises);
});

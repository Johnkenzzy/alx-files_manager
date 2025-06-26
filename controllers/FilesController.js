const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const { ObjectId } = require('mongodb');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFile = null;

    if (parentId !== 0) {
      try {
        parentFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId) });
        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
      } catch {
        return res.status(400).json({ error: 'Parent not found' });
      }
    }

    const fileData = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : new ObjectId(parentId),
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileData);
      return res.status(201).json({
        id: result.insertedId,
        ...fileData,
      });
    }

    // Ensure folder path exists
    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }

    const localPath = path.join(FOLDER_PATH, uuidv4());
    const buffer = Buffer.from(data, 'base64');

    try {
      fs.writeFileSync(localPath, buffer);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save file to disk' });
    }

    fileData.localPath = localPath;

    const result = await dbClient.db.collection('files').insertOne(fileData);

    return res.status(201).json({
      id: result.insertedId,
      ...fileData,
    });
  }
}

module.exports = FilesController;
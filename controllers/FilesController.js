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

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let fileId;
    try {
      fileId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: fileId,
      userId: new ObjectId(userId),
    });

    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;

    const matchQuery = {
      userId: new ObjectId(userId),
    };

    if (parentId !== '0') {
      try {
        matchQuery.parentId = new ObjectId(parentId);
      } catch (err) {
        // Invalid parentId - no results will be found
        matchQuery.parentId = null;
      }
    } else {
      matchQuery.parentId = 0;
    }

    const files = await dbClient.db.collection('files')
      .aggregate([
        { $match: matchQuery },
        { $skip: page * 20 },
        { $limit: 20 },
        {
          $project: {
            id: '$_id',
            userId: 1,
            name: 1,
            type: 1,
            isPublic: 1,
            parentId: 1,
          },
        },
      ]).toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let fileId;
    try {
      fileId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: fileId,
      userId: new ObjectId(userId),
    });

    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne(
      { _id: fileId },
      { $set: { isPublic: true } }
    );

    const updated = { ...file, isPublic: true };
    return res.status(200).json({
      id: updated._id,
      userId: updated.userId,
      name: updated.name,
      type: updated.type,
      isPublic: updated.isPublic,
      parentId: updated.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let fileId;
    try {
      fileId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: fileId,
      userId: new ObjectId(userId),
    });

    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne(
      { _id: fileId },
      { $set: { isPublic: false } }
    );

    const updated = { ...file, isPublic: false };
    return res.status(200).json({
      id: updated._id,
      userId: updated.userId,
      name: updated.name,
      type: updated.type,
      isPublic: updated.isPublic,
      parentId: updated.parentId,
    });
  }

  static async getFile(req, res) {
    const { id } = req.params;
    let fileId;
    try {
      fileId = new ObjectId(id);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({ _id: fileId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    // Check if public or owner
    if (!file.isPublic) {
      const token = req.header('X-Token');
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId || userId !== String(file.userId)) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    // Folder doesn't have content
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    // File must exist on disk
    try {
      if (!fs.existsSync(file.localPath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      const content = fs.readFileSync(file.localPath);
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(content);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

module.exports = FilesController;
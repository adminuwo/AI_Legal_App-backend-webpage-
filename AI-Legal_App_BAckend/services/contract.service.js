import crypto from 'crypto';
import Project from '../models/Project.js';
import { uploadToGCS } from './gcs.service.js';

export default class ContractService {
  /**
   * Uploads and attaches contract file to case workspace
   */
  static async uploadContract(projectId, file) {
    if (!file) {
      const err = new Error('No file uploaded');
      err.status = 400;
      throw err;
    }

    const project = await Project.findById(projectId);
    if (!project) {
      const err = new Error('Case not found');
      err.status = 404;
      throw err;
    }

    // Checksum duplicate check
    const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');
    const isDuplicate = project.contracts && project.contracts.some(c => c.hash === checksum);
    if (isDuplicate) {
      const err = new Error('This contract file has already been uploaded.');
      err.status = 400;
      throw err;
    }

    let fileUrl = '';
    let gcsFilename = '';

    try {
      const uploadParams = { mimetype: file.mimetype, originalname: file.originalname };
      const gcsResult = await uploadToGCS(file.buffer, uploadParams);
      fileUrl = gcsResult.url;
      gcsFilename = gcsResult.filename;
    } catch (gcsErr) {
      console.warn('[CONTRACT SERVICE] GCS upload failed:', gcsErr.message);
      fileUrl = `https://storage.googleapis.com/fallback/${file.originalname}`;
    }

    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    const ext = file.originalname.split('.').pop()?.toUpperCase() || 'PDF';

    const newContract = {
      _id: crypto.randomUUID(),
      name: file.originalname,
      url: fileUrl,
      storedName: gcsFilename || file.originalname,
      hash: checksum,
      uploadedDate: new Date(),
      fileSize: sizeStr,
      fileType: ext,
      ocrStatus: 'Complete',
      aiStatus: 'Not Analyzed',
      analysisReport: null
    };

    if (!project.contracts) project.contracts = [];
    project.contracts.push(newContract);
    await project.save();

    return newContract;
  }

  /**
   * Removes contract from workspace
   */
  static async deleteContract(projectId, contractId) {
    const project = await Project.findById(projectId);
    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }

    const contractIndex = (project.contracts || []).findIndex(c => 
      (c._id && c._id.toString() === contractId) || 
      (c.id && c.id.toString() === contractId)
    );
    if (contractIndex === -1) {
      const err = new Error('Contract not found');
      err.status = 404;
      throw err;
    }

    project.contracts.splice(contractIndex, 1);
    await project.save();
    return true;
  }
}

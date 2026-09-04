import { isString, isMongoId } from '../helpers.js';

export const createCaseSchema = {
  body: (body) => {
    const errors = [];
    if (!body?.title || !isString(body.title)) errors.push({ field: 'title', message: 'Case title is required' });
    return errors.length > 0 ? errors : null;
  }
};

export const caseIdParamsSchema = {
  params: (params) => {
    const errors = [];
    if (!params?.id || !isMongoId(params.id)) errors.push({ field: 'id', message: 'Invalid Case ID parameter' });
    return errors.length > 0 ? errors : null;
  }
};

export default {
  createCaseSchema,
  caseIdParamsSchema
};

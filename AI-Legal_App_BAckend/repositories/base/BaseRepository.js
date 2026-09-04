/**
 * Enterprise BaseRepository Abstraction Class
 * Generic data access layer encapsulating Mongoose model operations.
 */
export class BaseRepository {
  /**
   * @param {Object} model - Mongoose Model Instance
   */
  constructor(model) {
    if (!model) {
      throw new Error('[BaseRepository] Mongoose model must be provided to repository constructor.');
    }
    this.model = model;
  }

  async findById(id, projection = null, options = {}) {
    return this.model.findById(id, projection, options).exec();
  }

  async findOne(filter = {}, projection = null, options = {}) {
    return this.model.findOne(filter, projection, options).exec();
  }

  async findMany(filter = {}, projection = null, options = {}) {
    return this.model.find(filter, projection, options).exec();
  }

  async create(data) {
    return this.model.create(data);
  }

  async update(filter, updateData, options = { new: true }) {
    return this.model.findOneAndUpdate(filter, updateData, options).exec();
  }

  async updateById(id, updateData, options = { new: true }) {
    return this.model.findByIdAndUpdate(id, updateData, options).exec();
  }

  async delete(filter) {
    return this.model.findOneAndDelete(filter).exec();
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id).exec();
  }

  async paginate(filter = {}, page = 1, limit = 10, sort = { createdAt: -1 }, projection = null) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find(filter, projection).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec()
    ]);

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter).exec();
  }

  async aggregate(pipeline = []) {
    return this.model.aggregate(pipeline).exec();
  }

  async bulkWrite(operations = []) {
    return this.model.bulkWrite(operations);
  }
}

export default BaseRepository;

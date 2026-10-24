import prisma from '../config/db.js';

class PhotoModel {
  static async create({ galleryId, filename, originalPath, thumbnailPath }) {
    return prisma.photo.create({ data: { galleryId, filename, originalPath, thumbnailPath } });
  }

  static async findById(id) {
    return prisma.photo.findUnique({ where: { id }, include: { gallery: true } });
  }

  static async deleteById(id) {
    return prisma.photo.delete({ where: { id } });
  }
}

export default PhotoModel;

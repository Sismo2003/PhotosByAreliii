import prisma from '../config/db.js';

class UserModel {
  static async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  static async findById(id) {
    return prisma.user.findUnique({ where: { id }, include: { client: true } });
  }

  // Login by email, or by phone (E.164): Areli's lives on User, a client's on Client.
  static async findByLoginEmail(email) {
    return prisma.user.findUnique({ where: { email }, include: { client: true } });
  }

  static async findByLoginPhone(phoneE164) {
    return prisma.user.findFirst({
      where: { OR: [{ phoneE164 }, { client: { phoneE164 } }] },
      include: { client: true },
    });
  }

  static async touchLastLogin(id, at) {
    return prisma.user.update({ where: { id }, data: { lastLoginAt: at } });
  }

  static async create({ email, passwordHash, name, role = 'CLIENT', mustChangePassword = false }) {
    return prisma.user.create({
      data: { email, passwordHash, name, role, mustChangePassword },
    });
  }

  static async listClients() {
    return prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Just what the session check needs, on every authenticated request.
  static async findSession(id) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, passwordChangedAt: true, client: { select: { deletedAt: true } } },
    });
  }

  // Changing the password ends every older session: `at` is the cut-off requireAuth compares
  // each token's issue time against. Rounded down to the second (JWT `iat` has no millis) so the
  // session re-issued right after the change is not rejected by its own cut-off.
  // First password (the account still has the temporary one): only succeeds while
  // `mustChangePassword` is true, in the same statement, so two requests racing can't both set it.
  // Returns false when it was already chosen.
  static async setFirstPassword(id, passwordHash, at) {
    const { count } = await prisma.user.updateMany({
      where: { id, mustChangePassword: true },
      data: { passwordHash, mustChangePassword: false, passwordChangedAt: at },
    });
    return count === 1;
  }

  static async setPassword(id, passwordHash, at) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: false, passwordChangedAt: at },
    });
  }
}

export default UserModel;

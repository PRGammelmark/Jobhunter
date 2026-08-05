import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import type { AuthUser, PlatformUser } from '@career-intelligence/shared';
import { PlatformConfig, Tenant, User } from '../../models';
import { signAuthToken } from '../../auth/jwt';
import { createDefaultSettings, migrateLegacyData } from './migrateLegacyData';

const BCRYPT_ROUNDS = 10;

function toAuthUser(user: {
  _id: Types.ObjectId;
  email: string;
  name: string;
  platformRole: string;
  tenantId: Types.ObjectId;
  status: string;
}): AuthUser {
  return {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    platformRole: user.platformRole as AuthUser['platformRole'],
    tenantId: user.tenantId.toString(),
    status: user.status as AuthUser['status'],
  };
}

export async function isSetupRequired(): Promise<boolean> {
  const configDoc = await PlatformConfig.findOne({ key: 'platform' });
  return !configDoc?.setupCompleted;
}

export async function setupPlatform(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ user: AuthUser; token: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || input.password.length < 8) {
    throw Object.assign(new Error('Email og password (min. 8 tegn) er påkrævet'), { status: 400 });
  }

  if (!(await isSetupRequired())) {
    throw Object.assign(new Error('Setup er allerede gennemført'), { status: 409 });
  }

  const tenantId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const name = input.name.trim() || email;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      try {
        await PlatformConfig.create([{ key: 'platform', setupCompleted: true }], { session });
      } catch (err: unknown) {
        const code = (err as { code?: number })?.code;
        if (code === 11000) {
          throw Object.assign(new Error('Setup er allerede gennemført'), { status: 409 });
        }
        throw err;
      }

      await Tenant.create(
        [
          {
            _id: tenantId,
            name: `${name}'s workspace`,
            ownerUserId: userId,
            status: 'active',
          },
        ],
        { session }
      );

      await User.create(
        [
          {
            _id: userId,
            email,
            passwordHash,
            platformRole: 'admin',
            tenantId,
            name,
            status: 'active',
            tokenVersion: 0,
          },
        ],
        { session }
      );

      await migrateLegacyData({ tenantId, session });
    });
  } finally {
    session.endSession();
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('Setup fejlede');

  const token = signAuthToken({
    sub: userId.toString(),
    tenantId: tenantId.toString(),
    platformRole: 'admin',
    tokenVersion: 0,
  });

  return { user: toAuthUser(user), token };
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser; token: string }> {
  const email = input.email.trim().toLowerCase();
  const user = await User.findOne({ email, status: 'active' });
  if (!user) {
    throw Object.assign(new Error('Ugyldig email eller password'), { status: 401 });
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw Object.assign(new Error('Ugyldig email eller password'), { status: 401 });
  }

  const tenant = await Tenant.findOne({ _id: user.tenantId, status: 'active' });
  if (!tenant) {
    throw Object.assign(new Error('Tenant er ikke aktiv'), { status: 401 });
  }

  const token = signAuthToken({
    sub: user._id.toString(),
    tenantId: user.tenantId.toString(),
    platformRole: user.platformRole as AuthUser['platformRole'],
    tokenVersion: user.tokenVersion,
  });

  return { user: toAuthUser(user), token };
}

export async function listPlatformUsers(): Promise<PlatformUser[]> {
  const users = await User.find().sort({ createdAt: -1 });
  return users.map((u) => ({
    _id: u._id.toString(),
    email: u.email,
    name: u.name,
    platformRole: u.platformRole as PlatformUser['platformRole'],
    tenantId: u.tenantId.toString(),
    status: u.status as PlatformUser['status'],
    createdAt: (u as { createdAt?: Date }).createdAt?.toISOString() || new Date().toISOString(),
  }));
}

export async function createPlatformUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<PlatformUser> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || input.password.length < 8) {
    throw Object.assign(new Error('Email og password (min. 8 tegn) er påkrævet'), { status: 400 });
  }

  const tenantId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const name = input.name.trim() || email;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Tenant.create(
        [
          {
            _id: tenantId,
            name: `${name}'s workspace`,
            ownerUserId: userId,
            status: 'active',
          },
        ],
        { session }
      );

      await User.create(
        [
          {
            _id: userId,
            email,
            passwordHash,
            platformRole: 'user',
            tenantId,
            name,
            status: 'active',
            tokenVersion: 0,
          },
        ],
        { session }
      );

      await createDefaultSettings({
        tenantId,
        session,
        profileEmail: email,
        profileName: name,
      });
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      throw Object.assign(new Error('Email er allerede i brug'), { status: 409 });
    }
    throw err;
  } finally {
    session.endSession();
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('Kunne ikke oprette bruger');

  return {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    platformRole: user.platformRole as PlatformUser['platformRole'],
    tenantId: user.tenantId.toString(),
    status: user.status as PlatformUser['status'],
    createdAt: (user as { createdAt?: Date }).createdAt?.toISOString() || new Date().toISOString(),
  };
}

export async function softDeletePlatformUser(options: {
  targetUserId: string;
  actorUserId: string;
}): Promise<void> {
  if (options.targetUserId === options.actorUserId) {
    throw Object.assign(new Error('Du kan ikke slette dig selv'), { status: 400 });
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ _id: options.targetUserId }).session(session);
      if (!user || user.status === 'deleted') {
        throw Object.assign(new Error('Bruger ikke fundet'), { status: 404 });
      }

      await User.updateOne(
        { _id: user._id },
        { $set: { status: 'deleted' }, $inc: { tokenVersion: 1 } },
        { session }
      );
      await Tenant.updateOne({ _id: user.tenantId }, { $set: { status: 'deleted' } }, { session });
    });
  } finally {
    session.endSession();
  }
}

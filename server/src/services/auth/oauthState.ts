import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { OAuthNonce, Tenant, User } from '../../models';
import { signOAuthState, verifyOAuthState } from '../../auth/jwt';

export async function createOAuthState(options: {
  tenantId: Types.ObjectId | string;
  userId: string;
  provider: 'google' | 'microsoft';
}): Promise<string> {
  const nonce = randomBytes(24).toString('hex');
  const tenantId = new Types.ObjectId(options.tenantId.toString());
  const userId = new Types.ObjectId(options.userId);

  await OAuthNonce.create({
    nonce,
    tenantId,
    userId,
    provider: options.provider,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  return signOAuthState({
    tenantId: tenantId.toString(),
    userId: userId.toString(),
    provider: options.provider,
    nonce,
  });
}

export async function consumeOAuthState(
  stateToken: string,
  expectedProvider: 'google' | 'microsoft'
): Promise<{ tenantId: Types.ObjectId; userId: Types.ObjectId }> {
  const payload = verifyOAuthState(stateToken);
  if (payload.provider !== expectedProvider) {
    throw new Error('OAuth provider matcher ikke');
  }

  const nonceDoc = await OAuthNonce.findOneAndDelete({
    nonce: payload.nonce,
    provider: expectedProvider,
  });
  if (!nonceDoc) {
    throw new Error('OAuth state er ugyldig eller allerede brugt');
  }

  const user = await User.findOne({
    _id: payload.userId,
    tenantId: payload.tenantId,
    status: 'active',
  });
  if (!user) {
    throw new Error('Bruger ikke fundet eller inaktiv');
  }

  const tenant = await Tenant.findOne({ _id: payload.tenantId, status: 'active' });
  if (!tenant) {
    throw new Error('Tenant er ikke aktiv');
  }

  return {
    tenantId: user.tenantId as Types.ObjectId,
    userId: user._id as Types.ObjectId,
  };
}

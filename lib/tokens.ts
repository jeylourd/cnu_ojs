import { randomBytes, createHash } from "crypto";

import { prisma } from "@/lib/prisma";

const ONE_HOUR_MS = 60 * 60 * 1000;

export function createPlainToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createVerificationToken(identifier: string, tokenType: "verify" | "reset", expiresInMs = ONE_HOUR_MS) {
  const plainToken = createPlainToken();
  const hashedToken = hashToken(plainToken);
  const tokenIdentifier = `${tokenType}:${identifier.toLowerCase()}`;

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: tokenIdentifier,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: tokenIdentifier,
      token: hashedToken,
      expires: new Date(Date.now() + expiresInMs),
    },
  });

  return plainToken;
}

export async function consumeVerificationToken(plainToken: string, tokenType: "verify" | "reset") {
  const hashedToken = hashToken(plainToken);

  const tokenRecord = await prisma.verificationToken.findFirst({
    where: {
      token: hashedToken,
      identifier: {
        startsWith: `${tokenType}:`,
      },
    },
  });

  if (!tokenRecord) {
    return null;
  }

  if (tokenRecord.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: tokenRecord.identifier,
          token: tokenRecord.token,
        },
      },
    });

    return null;
  }

  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: tokenRecord.identifier,
        token: tokenRecord.token,
      },
    },
  });

  const email = tokenRecord.identifier.split(":").slice(1).join(":");

  return {
    email,
    identifier: tokenRecord.identifier,
  };
}

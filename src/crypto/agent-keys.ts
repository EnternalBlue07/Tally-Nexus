import { generateKeyPairSync, sign, verify, createPrivateKey, createPublicKey } from 'node:crypto';
import { canonicalizeJson } from './canonical-json.js';

// RFC 8410 standard DER headers for Ed25519 (OID 1.3.101.112)
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

export interface AgentKeyPair {
  publicKeyHex: string;
  privateKeyHex: string;
}

/**
 * Generate a new Ed25519 cryptographic keypair for an autonomous agent.
 * Returns raw 32-byte keys as 64-character lowercase hex strings.
 */
export function generateAgentKeyPair(): AgentKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  const pubDer = publicKey.export({ type: 'spki', format: 'der' });
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });

  // Extract raw 32-byte keys (SPKI header is 12 bytes; PKCS8 header is 16 bytes)
  const publicKeyHex = pubDer.subarray(12).toString('hex');
  const privateKeyHex = privDer.subarray(16).toString('hex');

  return { publicKeyHex, privateKeyHex };
}

/**
 * Sign an arbitrary payload (string or object) using an agent's Ed25519 private key.
 * If payload is an object, it is first deterministically canonicalized.
 * Returns a 64-byte signature as a 128-character lowercase hex string.
 */
export function signPayload(payload: unknown, privateKeyHex: string): string {
  if (typeof privateKeyHex !== 'string' || privateKeyHex.length !== 64) {
    throw new Error('INVALID_PRIVATE_KEY: Expected 64-character hex string for 32-byte Ed25519 private key.');
  }

  const rawBytes = Buffer.from(privateKeyHex, 'hex');
  const pkcs8Der = Buffer.concat([ED25519_PKCS8_PREFIX, rawBytes]);
  const privateKeyObject = createPrivateKey({ key: pkcs8Der, format: 'der', type: 'pkcs8' });

  const canonicalString = typeof payload === 'string' ? payload : canonicalizeJson(payload);
  const dataBuffer = Buffer.from(canonicalString, 'utf-8');

  const signatureBuffer = sign(null, dataBuffer, privateKeyObject);
  return signatureBuffer.toString('hex');
}

/**
 * Verify an Ed25519 signature against a payload and the signer's public key.
 */
export function verifySignature(payload: unknown, signatureHex: string, publicKeyHex: string): boolean {
  if (typeof publicKeyHex !== 'string' || publicKeyHex.length !== 64) {
    return false;
  }
  if (typeof signatureHex !== 'string' || signatureHex.length !== 128) {
    return false;
  }

  try {
    const rawBytes = Buffer.from(publicKeyHex, 'hex');
    const spkiDer = Buffer.concat([ED25519_SPKI_PREFIX, rawBytes]);
    const publicKeyObject = createPublicKey({ key: spkiDer, format: 'der', type: 'spki' });

    const canonicalString = typeof payload === 'string' ? payload : canonicalizeJson(payload);
    const dataBuffer = Buffer.from(canonicalString, 'utf-8');
    const signatureBuffer = Buffer.from(signatureHex, 'hex');

    return verify(null, dataBuffer, publicKeyObject, signatureBuffer);
  } catch {
    return false;
  }
}

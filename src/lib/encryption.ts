/**
 * End-to-End Encryption utilities for DMs
 * Uses ECDH for key exchange and AES-GCM for message encryption
 */

const ALGORITHM = "AES-GCM";
const KEY_ALGORITHM = "ECDH";
const CURVE = "P-256";

// Generate a new key pair for the user
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: KEY_ALGORITHM, namedCurve: CURVE },
    true, // extractable
    ["deriveKey"]
  );
}

// Export public key to base64 for storage
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Export private key to base64 for local storage
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import public key from base64
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const binaryString = atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await crypto.subtle.importKey(
    "spki",
    bytes.buffer,
    { name: KEY_ALGORITHM, namedCurve: CURVE },
    true,
    []
  );
}

// Import private key from base64
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const binaryString = atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: KEY_ALGORITHM, namedCurve: CURVE },
    true,
    ["deriveKey"]
  );
}

// Derive shared secret from own private key and other's public key
export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    { name: KEY_ALGORITHM, public: publicKey },
    privateKey,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a message
export async function encryptMessage(
  message: string,
  sharedKey: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    sharedKey,
    data
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Decrypt a message
export async function decryptMessage(
  encryptedBase64: string,
  sharedKey: CryptoKey
): Promise<string> {
  try {
    const binaryString = atob(encryptedBase64);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      sharedKey,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "[Encrypted message - unable to decrypt]";
  }
}

// Store keys in IndexedDB
const DB_NAME = "petpaw_e2ee";
const STORE_NAME = "keys";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function storeKeyPair(userId: string, privateKeyBase64: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(privateKeyBase64, `private_${userId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStoredPrivateKey(userId: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(`private_${userId}`);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Cache for derived shared keys
const sharedKeyCache = new Map<string, CryptoKey>();

export async function getOrDeriveSharedKey(
  myPrivateKey: CryptoKey,
  theirPublicKeyBase64: string,
  conversationId: string
): Promise<CryptoKey> {
  const cached = sharedKeyCache.get(conversationId);
  if (cached) return cached;
  
  const theirPublicKey = await importPublicKey(theirPublicKeyBase64);
  const sharedKey = await deriveSharedKey(myPrivateKey, theirPublicKey);
  sharedKeyCache.set(conversationId, sharedKey);
  
  return sharedKey;
}

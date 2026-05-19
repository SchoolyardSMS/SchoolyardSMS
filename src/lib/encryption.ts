import crypto from "crypto"

const ENCRYPTION_SECRET = process.env.SENSITIVE_DATA_KEY || "schoolyard-default-dev-secret-key-32b"
const KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest()
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Output format: "iv_hex:tag_hex:ciphertext_hex"
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null
  
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const tag = cipher.getAuthTag()
  
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`
}

/**
 * Decrypts an AES-256-GCM encrypted string back to plain text.
 * Gracefully returns the raw text if it is not in the encrypted format or cannot be decrypted.
 */
export function decrypt(cipherText: string | null | undefined): string | null {
  if (!cipherText) return null
  
  const parts = cipherText.split(":")
  if (parts.length !== 3) {
    return cipherText // Return raw text if not matching encrypted structure (legacy support)
  }
  
  try {
    const [ivHex, tagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, "hex")
    const tag = Buffer.from(tagHex, "hex")
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (error) {
    console.error("Decryption failed:", error)
    return cipherText
  }
}

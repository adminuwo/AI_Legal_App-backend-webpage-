import crypto from "crypto"



export function generateOTP() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

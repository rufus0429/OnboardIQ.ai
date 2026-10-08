// Mulberry32 PRNG
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Generate a random string using PRNG
function randomString(prng, length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(prng() * chars.length));
  }
  return result;
}

// Pick random element from array
function pickRandom(prng, arr) {
  return arr[Math.floor(prng() * arr.length)];
}

// Generate UUID-like string for consistent fake IDs
function generateId(prng) {
  return randomString(prng, 20);
}

module.exports = {
  mulberry32,
  randomString,
  pickRandom,
  generateId,
};

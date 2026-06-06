/**
 * Escape special regex characters in a user-supplied string so it can be
 * safely used inside a MongoDB $regex query without causing ReDoS or
 * unexpected matches.
 *
 * @param {string} str  Raw user input
 * @returns {string}  Regex-safe string
 */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;

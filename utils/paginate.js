/**
 * Parse pagination params from a query string and return a standardised
 * { page, limit, skip } object. Clamps limit to a safe maximum.
 *
 * @param {object} query  Express req.query
 * @param {object} [opts]
 * @param {number} [opts.defaultLimit=25]
 * @param {number} [opts.maxLimit=100]
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query, { defaultLimit = 25, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build a standard paginated response envelope.
 *
 * @param {Array}  data      The slice of results for this page
 * @param {number} total     Total matching documents
 * @param {number} page      Current page number
 * @param {number} limit     Items per page
 * @returns {object}
 */
function paginatedResponse(data, total, page, limit) {
  return {
    success: true,
    count: data.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data,
  };
}

module.exports = { parsePagination, paginatedResponse };

/* Shared live WordPress taxonomy client for every browser factory.
 * WordPress is the source of truth: no baked-in taxonomy lists and no stale
 * cache fallback. Callers must handle errors visibly and must never create
 * a taxonomy term just because a lookup failed.
 */
(function (global) {
  'use strict';

  const DEFAULT_SITE_URL = 'https://examnotespdf.in';
  const API_ROOT = DEFAULT_SITE_URL.replace(/\/$/, '') + '/wp-json/wp/v2';

  async function fetchTerms(taxonomy, options) {
    const tax = String(taxonomy || '').trim();
    if (!/^[a-z0-9_-]+$/i.test(tax)) {
      throw new Error('Invalid WordPress taxonomy name.');
    }
    const opts = options || {};
    const perPage = Math.min(100, Math.max(1, Number(opts.perPage) || 100));
    const fields = 'id,name,slug,parent';
    const all = [];
    let page = 1;
    let totalPages = null;

    while (page <= (totalPages || 1) || (totalPages === null && page === 1)) {
      const url = new URL(API_ROOT + '/' + encodeURIComponent(tax));
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('_fields', fields);
      url.searchParams.set('orderby', 'name');
      url.searchParams.set('order', 'asc');
      url.searchParams.set('page', String(page));

      let response;
      try {
        response = await fetch(url.toString(), { method: 'GET', credentials: 'omit', cache: 'no-store' });
      } catch (error) {
        throw new Error('Could not reach WordPress taxonomy "' + tax + '". Check the connection and try again.');
      }

      if (!response.ok) {
        throw new Error('WordPress taxonomy "' + tax + '" returned HTTP ' + response.status + '.');
      }

      const batch = await response.json();
      if (!Array.isArray(batch)) {
        throw new Error('WordPress returned an invalid response for taxonomy "' + tax + '".');
      }

      if (totalPages === null) {
        const headerPages = Number(response.headers.get('X-WP-TotalPages'));
        totalPages = Number.isFinite(headerPages) && headerPages > 0 ? headerPages : null;
      }

      all.push.apply(all, batch);
      if (totalPages !== null) {
        if (page >= totalPages) break;
      } else if (batch.length < perPage) {
        break;
      }
      page += 1;
      if (page > 100) throw new Error('Taxonomy "' + tax + '" exceeded the safety limit of 100 pages.');
    }

    if (!all.length) throw new Error('WordPress returned no terms for taxonomy "' + tax + '".');
    return all.filter(term => term && Number.isInteger(Number(term.id)) && term.name)
      .map(term => ({
        id: Number(term.id),
        name: String(term.name),
        slug: String(term.slug || ''),
        parent: Number(term.parent || 0)
      }));
  }

  function exactTerm(terms, name) {
    const target = String(name || '').trim();
    if (!target || !Array.isArray(terms)) return null;
    return terms.find(term => String(term.name).trim() === target) || null;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  global.WordPressTaxonomy = Object.freeze({
    siteUrl: DEFAULT_SITE_URL,
    apiRoot: API_ROOT,
    fetchTerms: fetchTerms,
    exactTerm: exactTerm,
    escapeHtml: escapeHtml
  });
})(window);

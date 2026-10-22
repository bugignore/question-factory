/* Shared WordPress taxonomy client.
 * WordPress remains the source of truth. On transient network/API failures,
 * use only the last successfully synchronized repository snapshot. Never
 * invent a term, silently substitute a similar label, or create WordPress terms.
 */
(function (global) {
  'use strict';

  const DEFAULT_SITE_URL = 'https://examnotespdf.in';
  const API_ROOT = DEFAULT_SITE_URL.replace(/\/$/, '') + '/wp-json/wp/v2';
  const SCRIPT_URL = document.currentScript && document.currentScript.src
    ? document.currentScript.src : new URL('shared/wordpress-taxonomy.js', location.href).href;
  const SNAPSHOT_URL = new URL('./data/exam-taxonomy.json', SCRIPT_URL).toString();
  let lastStatus = { source: 'unavailable', syncedAt: null, message: 'Taxonomy has not loaded.' };

  function normalizeTerms(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.filter(term => term && Number.isInteger(Number(term.id)) && String(term.name || '').trim())
      .map(term => ({
        id: Number(term.id),
        name: String(term.name).trim(),
        slug: String(term.slug || ''),
        parent: Number(term.parent || 0)
      }));
  }

  async function loadSnapshot(taxonomy) {
    const response = await fetch(SNAPSHOT_URL, { method: 'GET', credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('Taxonomy snapshot unavailable.');
    const data = await response.json();
    if (!data || data.schemaVersion !== 1 || data.siteUrl !== DEFAULT_SITE_URL ||
        data.taxonomy !== taxonomy || !Array.isArray(data.terms) || !data.terms.length ||
        !data.syncedAt || !Number.isFinite(Date.parse(data.syncedAt))) {
      throw new Error('No valid synchronized taxonomy snapshot exists.');
    }
    const terms = normalizeTerms(data.terms);
    if (!terms.length) throw new Error('Taxonomy snapshot contains no valid terms.');
    return { terms, syncedAt: data.syncedAt };
  }

  async function fetchTerms(taxonomy, options) {
    const tax = String(taxonomy || '').trim();
    if (!/^[a-z0-9_-]+$/i.test(tax)) throw new Error('Invalid WordPress taxonomy name.');
    const opts = options || {};
    const perPage = Math.min(100, Math.max(1, Number(opts.perPage) || 100));
    const all = [];
    let page = 1;
    let totalPages = null;

    try {
      while (page <= 100) {
        const url = new URL(API_ROOT + '/' + encodeURIComponent(tax));
        url.searchParams.set('per_page', String(perPage));
        url.searchParams.set('_fields', 'id,name,slug,parent');
        url.searchParams.set('orderby', 'name');
        url.searchParams.set('order', 'asc');
        url.searchParams.set('page', String(page));
        const response = await fetch(url.toString(), { method: 'GET', credentials: 'omit', cache: 'no-store' });
        if (!response.ok) throw new Error('WordPress taxonomy request returned HTTP ' + response.status + '.');
        const batch = await response.json();
        if (!Array.isArray(batch)) throw new Error('WordPress returned an invalid taxonomy response.');
        if (totalPages === null) {
          const count = Number(response.headers.get('X-WP-TotalPages'));
          totalPages = Number.isFinite(count) && count > 0 ? count : null;
        }
        all.push.apply(all, batch);
        if (totalPages !== null && page >= totalPages) break;
        if (totalPages === null && batch.length < perPage) break;
        page += 1;
      }
      if (page > 100) throw new Error('Taxonomy exceeded the 100-page safety limit.');
      const terms = normalizeTerms(all);
      // A successful empty response is authoritative; do not hide it with stale data.
      lastStatus = { source: 'live', syncedAt: new Date().toISOString(), message: 'Loaded from WordPress.' };
      return terms;
    } catch (liveError) {
      try {
        const snapshot = await loadSnapshot(tax);
        lastStatus = {
          source: 'snapshot',
          syncedAt: snapshot.syncedAt,
          message: 'WordPress is unavailable; using the last verified snapshot.'
        };
        return snapshot.terms;
      } catch (snapshotError) {
        lastStatus = {
          source: 'unavailable',
          syncedAt: null,
          message: 'WordPress is unavailable and no valid snapshot exists.'
        };
        // Safe empty result: callers can disable only taxonomy-dependent actions.
        return [];
      }
    }
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
    snapshotUrl: SNAPSHOT_URL,
    fetchTerms: fetchTerms,
    exactTerm: exactTerm,
    escapeHtml: escapeHtml,
    getStatus: function () { return Object.assign({}, lastStatus); }
  });
})(window);

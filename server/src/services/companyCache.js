import { db } from '../config/firebase.js';
import { slugify } from '../utils/slugify.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Fetch a cached company profile from `companyProfiles/{companySlug}` if within 7-day TTL.
 */
export async function getCachedCompanyProfile(companyName, firestore = db) {
  const slug = slugify(companyName);
  if (!slug) return null;

  const snap = await firestore.collection('companyProfiles').doc(slug).get();
  if (!snap.exists) return null;

  const data = snap.data();
  const fetchedMs = data?.fetchedAt ? Date.parse(data.fetchedAt) : NaN;
  if (Number.isNaN(fetchedMs) || Date.now() - fetchedMs > SEVEN_DAYS_MS) {
    return null;
  }

  return {
    slug,
    profile: data.profile,
    sources: Array.isArray(data.sources) ? data.sources : [],
    fetchedAt: data.fetchedAt,
  };
}

/**
 * Store a company profile in `companyProfiles/{companySlug}` with current ISO fetchedAt timestamp.
 */
export async function saveCompanyProfile(companyName, { profile, sources = [] }, firestore = db) {
  const slug = slugify(companyName);
  if (!slug) return null;

  const fetchedAt = new Date().toISOString();
  await firestore.collection('companyProfiles').doc(slug).set({
    profile,
    sources,
    fetchedAt,
  });

  return { slug, profile, sources, fetchedAt };
}

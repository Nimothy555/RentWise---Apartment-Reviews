# RentWise Bug Report

**Project:** RentWise — Apartment Reviews You Can Trust  
**Commit:** e39e5c1  
**Date:** 2026-04-10  
**Reported by:** Team Feedback  
**Fixed by:** Development Team  

---

## Bug #1 — Automated Verification Accepts Random Photos

### Summary
Users were able to get their accounts verified by uploading any arbitrary image, bypassing the intended address-matching requirement entirely.

### Severity
**Critical** — directly undermines the integrity of the tenant verification system and the trustworthiness of reviews posted on the platform.

### Steps to Reproduce
1. Register a new account and log in.
2. Navigate to any apartment listing.
3. Click "Verify Residency."
4. Upload any random image (e.g., a selfie, a meme, a blank photo).
5. Observe that the verification status returns as `verified` and the account is marked as a verified tenant.

### Root Cause
In `server/routes/verifications.js`, the variable `verificationStatus` was initialized to `'verified'` as a fallback for when the Claude API was unavailable:

```js
let verificationStatus = 'verified' // Default to verified when AI is unavailable
```

This meant that in two failure scenarios — Claude returning `NOT_FOUND` (no address detected in the image) and Claude throwing an API error — the status was never updated and remained `'verified'`. The user's account would then be marked as a verified tenant with no legitimate document on file.

### Fix
- Changed the default value of `verificationStatus` from `'verified'` to `'pending'`.
- Added an explicit branch: if Claude returns `NOT_FOUND`, status is set to `'failed'`.
- Claude API errors now leave the submission in `'pending'` state, routing it to manual review instead of auto-approving.

```js
// Before
let verificationStatus = 'verified'

// After
let verificationStatus = 'pending'
```

```js
// Before — NOT_FOUND fell through with no status update
if (extractedAddress && extractedAddress !== 'NOT_FOUND') {
  verificationStatus = addressesMatch(...) ? 'verified' : 'failed'
}

// After — NOT_FOUND is explicitly handled
if (!extractedAddress || extractedAddress === 'NOT_FOUND') {
  verificationStatus = 'failed'
} else {
  verificationStatus = addressesMatch(...) ? 'verified' : 'failed'
}
```

### Files Changed
- `server/routes/verifications.js`

---

## Bug #2 — Users Cannot Upload PDF or Word Documents

### Summary
The document upload flow on the verification page only accepted image files. Users attempting to upload a PDF or Word document received no file selection option or a browser-level rejection, with no explanation.

### Severity
**High** — lease agreements and utility bills are most commonly available as PDFs or Word documents. Restricting uploads to images makes the verification process impractical for most users.

### Steps to Reproduce
1. Log in and navigate to an apartment listing.
2. Click "Verify Residency."
3. Click the file upload input.
4. Attempt to select a `.pdf` or `.docx` file from the file picker.
5. Observe that these file types are either grayed out or not selectable.

### Root Cause
The file input in `client/src/pages/ApartmentDetail.jsx` had its `accept` attribute set to `image/*` only:

```jsx
<input type="file" accept="image/*" ... />
```

This blocked PDFs and Word documents at the browser level before they even reached the backend. Additionally, the backend MIME allowlist in `server/routes/verifications.js` did not include the Word document MIME type (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`).

### Fix
- Updated the `accept` attribute on the file input to include PDF and `.docx`.
- Added the Word document MIME type to the backend `ALLOWED_MIMETYPES` array.
- Since Claude cannot parse binary `.docx` files natively, Word document submissions skip the AI extraction step and are routed directly to `'pending'` for manual moderator review.
- Added an informational UI message so users know their document is under review rather than seeing a confusing failure state.

```jsx
// Before
accept="image/*"

// After
accept="image/*,application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
```

```js
// Before
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

// After
const ALLOWED_MIMETYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
```

### Files Changed
- `client/src/pages/ApartmentDetail.jsx`
- `server/routes/verifications.js`

---

## Bug #3 — Search Results Are Case-Sensitive

### Summary
Users who created listings could not find them via the search bar if they typed the name or address in a different case than it was stored. For example, searching `"boston commons"` would not return a listing named `"Boston Commons"`.

### Severity
**Medium** — negatively impacts discoverability of listings and creates a confusing user experience, particularly for landlords verifying their own listing is live.

### Steps to Reproduce
1. Create a new apartment listing with a name such as `"Boston Commons Apartments"`.
2. Navigate to the home page.
3. Type `"boston commons apartments"` (all lowercase) into the search bar.
4. Observe that no results are returned despite the listing existing.
5. Type `"Boston Commons Apartments"` (exact casing) and observe the listing appears.

### Root Cause
The search query in `server/routes/apartments.js` used SQLite's `LIKE` operator without explicit case normalization:

```sql
(a.name LIKE ? OR a.street_address LIKE ? OR a.city LIKE ? OR a.zip_code LIKE ?)
```

While SQLite's `LIKE` is case-insensitive for ASCII characters in standard builds, this behavior is not guaranteed — certain SQLite builds compile with `SQLITE_CASE_SENSITIVE_LIKE` enabled, which makes `LIKE` fully case-sensitive. The production environment was running one such build.

The `property_type` filter had a separate but related issue — it used a bare equality check with no case normalization:

```sql
a.property_type = ?
```

### Fix
All text comparisons in the search and filter logic now use explicit `LOWER()` wrapping, guaranteeing case-insensitive behavior regardless of the SQLite build.

```js
// Before
conditions.push('(a.name LIKE ? OR a.street_address LIKE ? OR a.city LIKE ? OR a.zip_code LIKE ?)')

// After
conditions.push('(LOWER(a.name) LIKE LOWER(?) OR LOWER(a.street_address) LIKE LOWER(?) OR LOWER(a.city) LIKE LOWER(?) OR a.zip_code LIKE ?)')
```

```js
// Before
conditions.push('a.property_type = ?')

// After
conditions.push('LOWER(a.property_type) = LOWER(?)')
```

### Files Changed
- `server/routes/apartments.js`

---

## Additional Context — Manual Moderation

As part of the fixes above, the verification system now supports a `pending` status that serves as a queue for human moderator review. This applies to:

- Word (`.docx`) document uploads, which Claude cannot parse natively.
- Submissions where the Claude API is temporarily unavailable.
- Any future document types added to the allowed list that fall outside AI processing capabilities.

To fully operationalize this, a moderation interface (admin route + UI) should be built that lists all `pending` verifications, displays the submitted document, and allows a moderator to approve or reject. This is recommended as the next development priority given the verification integrity issues identified above.

---

## Recommended Policy Additions

Given the nature of these bugs and the verification system's role in the platform's trust model, the following policies are recommended for inclusion on the website:

| Policy | Reason |
|---|---|
| **Verification Policy** | Clarify accepted document types, manual review timelines, and grounds for rejection |
| **Review Integrity Guidelines** | Define what constitutes a valid review and consequences for circumventing verification |
| **Privacy Policy** | Uploaded documents contain PII (name, address); users must know what is stored, for how long, and who can access it |
| **Content Moderation Policy** | Explain how flagged content is handled and what the moderation team's role is |
| **Terms of Service** | Cover prohibited conduct, account suspension, and user responsibilities |

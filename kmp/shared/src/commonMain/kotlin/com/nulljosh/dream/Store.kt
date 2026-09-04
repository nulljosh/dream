package com.nulljosh.dream

// Mirrors web/app.js's localStorage-only rule: entries never leave the
// device, no accounts, no server-side copy. Platform actuals hold the one
// string blob (JSON-encoded entry list), same shape as the `dream.entries`
// localStorage key.
expect object EntryStore {
    fun load(): String?
    fun save(raw: String)
}

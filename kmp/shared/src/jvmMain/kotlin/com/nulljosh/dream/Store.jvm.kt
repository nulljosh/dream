package com.nulljosh.dream

import java.util.prefs.Preferences

// ponytail: java.util.prefs.Preferences caps a value at ~8KB, fine for a
// getting-started journal but a real backstop once someone has years of
// entries. Swap for a JSON file in the user's app-support dir if that ever
// bites -- same interface, no caller change.
actual object EntryStore {
    private val prefs = Preferences.userRoot().node("com.nulljosh.dream")
    private const val KEY = "entries"

    actual fun load(): String? = prefs.get(KEY, null)
    actual fun save(raw: String) { prefs.put(KEY, raw) }
}

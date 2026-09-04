package com.nulljosh.dream

import android.content.Context

/** Set once from Application.onCreate or MainActivity before EntryStore is used. */
object DreamAndroidContext {
    lateinit var appContext: Context
}

actual object EntryStore {
    private const val PREFS = "com.nulljosh.dream"
    private const val KEY = "entries"

    actual fun load(): String? =
        DreamAndroidContext.appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)

    actual fun save(raw: String) {
        DreamAndroidContext.appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY, raw).apply()
    }
}

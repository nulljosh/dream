package com.nulljosh.dream

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class Entry(val id: String, val at: Long, val text: String, val reading: String = "")

private val json = Json { ignoreUnknownKeys = true }

fun loadEntries(raw: String?): List<Entry> {
    if (raw.isNullOrBlank()) return emptyList()
    return runCatching { json.decodeFromString<List<Entry>>(raw) }.getOrDefault(emptyList())
}

fun saveEntries(entries: List<Entry>): String = json.encodeToString(entries)

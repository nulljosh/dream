package com.nulljosh.dream

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
private data class HistoryItem(val at: Long, val text: String)

@Serializable
private data class InterpretRequest(val text: String, val history: List<HistoryItem>)

@Serializable
private data class InterpretResponse(val reading: String = "", val error: String? = null)

class InterpretException(message: String) : Exception(message)

// The crisis-language guard (DISTRESS regex in interpret.js) runs
// server-side on every call through this endpoint, so it applies here too
// without duplicating it client-side.
class DreamClient(private val baseUrl: String = "https://dream.heyitsmejosh.com") {
    private val http = HttpClient {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    /** history must only include entries written before `entry` -- a reading never cites the future. */
    suspend fun interpret(entry: Entry, priorEntries: List<Entry>): String {
        val history = priorEntries.filter { it.at < entry.at }.map { HistoryItem(it.at, it.text) }
        val response = http.post("$baseUrl/api/interpret") {
            contentType(ContentType.Application.Json)
            setBody(InterpretRequest(entry.text, history))
        }.body<InterpretResponse>()
        if (response.error != null) throw InterpretException(response.error)
        return response.reading
    }
}

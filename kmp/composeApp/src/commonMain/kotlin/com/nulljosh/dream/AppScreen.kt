package com.nulljosh.dream

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@Composable
fun DreamTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = lightColorScheme(), content = content)

// Storage is on-device only, same rule as web/app.js: no accounts, nothing
// server-side beyond the one-shot /api/interpret call. See Store.kt.
@Composable
fun AppScreen(client: DreamClient = DreamClient()) {
    var entries by remember { mutableStateOf(loadEntries(EntryStore.load())) }
    var text by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    fun persist(next: List<Entry>) {
        entries = next
        EntryStore.save(saveEntries(next))
    }

    fun addEntry() {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        persist(entries + Entry(randomId(), nowMillis(), trimmed))
        text = ""
        status = "Dream saved."
    }

    fun requestReading(entry: Entry) {
        scope.launch {
            status = "Interpreting..."
            runCatching { client.interpret(entry, entries) }
                .onSuccess { reading ->
                    persist(entries.map { if (it.id == entry.id) it.copy(reading = reading) else it })
                    status = ""
                }
                .onFailure { status = it.message ?: "Could not reach the interpreter." }
        }
    }

    Surface {
        Column(Modifier.fillMaxSize().padding(24.dp)) {
            Text("Dream", style = MaterialTheme.typography.headlineMedium)
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                label = { Text("Write a dream") },
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            )
            Button(onClick = { addEntry() }, modifier = Modifier.padding(top = 8.dp)) { Text("Save") }
            if (status.isNotEmpty()) Text(status, modifier = Modifier.padding(top = 8.dp))

            LazyColumn(
                modifier = Modifier.padding(top = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(entries.reversed()) { entry ->
                    Column {
                        Text(entry.text, style = MaterialTheme.typography.bodyLarge)
                        if (entry.reading.isNotEmpty()) {
                            Text(entry.reading, modifier = Modifier.padding(top = 4.dp))
                        } else {
                            Button(onClick = { requestReading(entry) }, modifier = Modifier.padding(top = 4.dp)) {
                                Text("Interpret")
                            }
                        }
                    }
                }
            }
        }
    }
}

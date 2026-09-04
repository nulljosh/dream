package com.nulljosh.dream

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EntriesTest {
    @Test fun roundTrips() {
        val entries = listOf(Entry("1", 100L, "Falling", ""), Entry("2", 200L, "Flying", "reading"))
        val raw = saveEntries(entries)
        assertEquals(entries, loadEntries(raw))
    }

    @Test fun corruptStorageDoesNotBrickTheApp() {
        assertTrue(loadEntries("not json").isEmpty())
        assertTrue(loadEntries(null).isEmpty())
    }
}

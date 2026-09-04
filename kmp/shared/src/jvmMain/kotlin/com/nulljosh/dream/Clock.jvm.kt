package com.nulljosh.dream

import java.util.UUID

actual fun nowMillis(): Long = System.currentTimeMillis()
actual fun randomId(): String = UUID.randomUUID().toString()

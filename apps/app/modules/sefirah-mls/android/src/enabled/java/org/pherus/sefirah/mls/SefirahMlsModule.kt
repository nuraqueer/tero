package org.pherus.sefirah.mls

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.pherus.sefirah.mls.generated.PrivateChat
import java.util.UUID
import java.io.File

class SefirahMlsModule : Module() {
  private val engines = mutableMapOf<String, PrivateChat>()
  private val paths = mutableMapOf<String, String>()
  private var destroyed = false
  private val owners = mutableSetOf<String>()
  private val engineOwners = mutableMapOf<String, String>()

  private fun <T> use(handle: String, action: (PrivateChat) -> T): T = synchronized(engines) {
    check(!destroyed) { "Messaging module closed" }
    action(engines[handle] ?: error("Conversation closed"))
  }

  private fun close(handle: String) = synchronized(engines) {
    engineOwners.remove(handle)
    paths.remove(handle)
    engines.remove(handle)?.let { engine ->
      try { engine.shutdown() } finally { engine.destroy() }
    }
    Unit
  }

  private fun stateFile(namespace: String, probe: Boolean): File {
    check(namespace.matches(Regex("[A-Za-z0-9_-]{43}"))) { "Invalid message namespace" }
    val context = appContext.reactContext ?: error("Android context unavailable")
    val root = if (probe) File(context.cacheDir, "sefirah-message-probes")
      else File(context.noBackupFilesDir, "sefirah-messages")
    check(root.isDirectory || root.mkdirs()) { "Message storage unavailable" }
    return File(root, "$namespace.db")
  }

  override fun definition() = ModuleDefinition {
    Name("SefirahMls")
    Constant("enabled") { true }
    Constant("storageVersion") { 1 }
    Constant("queueVersion") { 1 }
    Constant("asyncVersion") { 1 }
    Constant("deliveryVersion") { 1 }
    Function("registerOwner") { owner: String -> synchronized(engines) {
      check(!destroyed && owners.size < 16 && owner.matches(Regex("[A-Za-z0-9_-]{22}"))) { "Messaging owner unavailable" }
      check(owners.add(owner)) { "Messaging owner already registered" }
    } }
    Function("closeOwner") { owner: String -> synchronized(engines) {
      owners.remove(owner)
      engineOwners.filterValues { it == owner }.keys.toList().forEach { handle -> runCatching { close(handle) } }
    } }
    AsyncFunction("openAsync") { owner: String, secret: ByteArray, peer: String, key: ByteArray, namespace: String, probe: Boolean ->
      try {
        synchronized(engines) {
          check(!destroyed && owners.contains(owner)) { "Messaging owner closed" }
          check(engines.size < 16) { "Conversation capacity reached" }
          val file = stateFile(namespace, probe)
          check(!paths.containsValue(file.absolutePath)) { "Conversation already open" }
          val handle = UUID.randomUUID().toString()
          engines[handle] = PrivateChat.open(secret, peer, key, file.absolutePath)
          paths[handle] = file.absolutePath
          engineOwners[handle] = owner
          handle
        }
      } finally { secret.fill(0); key.fill(0) }
    }


    // Synchronous bounded operations avoid late engine creation after JS lock.
    Function("create") { secret: ByteArray, peer: String ->
      try {
        synchronized(engines) {
          check(!destroyed) { "Messaging module closed" }
          check(engines.size < 16) { "Conversation capacity reached" }
          val handle = UUID.randomUUID().toString()
          engines[handle] = PrivateChat(secret, peer)
          handle
        }
      } finally { secret.fill(0) }
    }
    Function("open") { secret: ByteArray, peer: String, key: ByteArray, namespace: String, probe: Boolean ->
      try {
        synchronized(engines) {
          check(!destroyed) { "Messaging module closed" }
          check(engines.size < 16) { "Conversation capacity reached" }
          val file = stateFile(namespace, probe)
          check(!paths.containsValue(file.absolutePath)) { "Conversation already open" }
          val handle = UUID.randomUUID().toString()
          engines[handle] = PrivateChat.open(secret, peer, key, file.absolutePath)
          paths[handle] = file.absolutePath
          handle
        }
      } finally { secret.fill(0); key.fill(0) }
    }
    Function("pending") { handle: String -> use(handle) { engine ->
      engine.pending().map { item -> mapOf("id" to item.id, "kind" to item.kind.name, "wire" to item.wire) }
    } }
    Function("received") { handle: String -> use(handle) { engine ->
      engine.received().map { item -> mapOf("id" to item.id, "text" to item.text) }
    } }
    Function("handshakeState") { handle: String -> use(handle) { it.handshakeState().name.lowercase() } }
    Function("acknowledgePending") { handle: String, id: String -> use(handle) { it.acknowledgePending(id) } }
    // Only synthetic cache state can be removed by this development diagnostic API.
    Function("clearProbe") { namespace: String -> synchronized(engines) {
      val file = stateFile(namespace, true)
      check(!paths.containsValue(file.absolutePath)) { "Probe still open" }
      listOf("", "-journal", "-wal", "-shm").forEach { suffix ->
        val target = File(file.absolutePath + suffix)
        check(!target.exists() || target.delete()) { "Probe cleanup failed" }
      }
    } }
    Function("keyPackage") { handle: String -> use(handle) { it.keyPackage() } }
    Function("initiate") { handle: String, bytes: ByteArray -> use(handle) { it.initiate(bytes) } }
    Function("join") { handle: String, bytes: ByteArray -> use(handle) { it.join(bytes) } }
    Function("encrypt") { handle: String, text: String -> use(handle) { it.encrypt(text) } }
    Function("decrypt") { handle: String, bytes: ByteArray -> use(handle) { it.decrypt(bytes) } }
    AsyncFunction("pendingAsync") { handle: String -> use(handle) { engine ->
      engine.pending().map { item -> mapOf("id" to item.id, "kind" to item.kind.name, "wire" to item.wire) }
    } }
    AsyncFunction("receivedAsync") { handle: String -> use(handle) { engine ->
      engine.received().map { item -> mapOf("id" to item.id, "text" to item.text) }
    } }
    AsyncFunction("handshakeStateAsync") { handle: String -> use(handle) { it.handshakeState().name.lowercase() } }
    AsyncFunction("acknowledgePendingAsync") { handle: String, id: String -> use(handle) { it.acknowledgePending(id) } }
    AsyncFunction("keyPackageAsync") { handle: String -> use(handle) { it.keyPackage() } }
    AsyncFunction("initiateAsync") { handle: String, bytes: ByteArray -> use(handle) { it.initiate(bytes) } }
    AsyncFunction("joinAsync") { handle: String, bytes: ByteArray -> use(handle) { it.join(bytes) } }
    AsyncFunction("encryptAsync") { handle: String, text: String -> use(handle) { it.encrypt(text) } }
    AsyncFunction("decryptAsync") { handle: String, bytes: ByteArray -> use(handle) { it.decrypt(bytes) } }
    AsyncFunction("deliveryAsync") { handle: String, request: String -> use(handle) { it.delivery(request) } }
    Function("close") { handle: String -> close(handle) }
    OnDestroy {
      synchronized(engines) {
        destroyed = true
        owners.clear()
        engines.keys.toList().forEach { handle -> runCatching { close(handle) } }
      }
    }
  }
}

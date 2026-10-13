package org.pherus.sefirah

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.io.File

class SefirahTorModule : Module() {
  private val library by lazy { System.loadLibrary("sefirah_tor"); true }
  private external fun nativeCall(input: String): String
  private fun invoke(input: String): String {
    check(BuildConfig.SEFIRAH_TOR_ENABLED) { "Native Tor build required" }
    check(library)
    return nativeCall(input)
  }
  private val handles = mutableSetOf<String>()

  override fun definition() = ModuleDefinition {
    Name("SefirahTor")
    Constant("enabled") { BuildConfig.SEFIRAH_TOR_ENABLED }

    AsyncFunction("start") { handle: String, request: String, capability: String ->
      val context = appContext.reactContext ?: error("Android context unavailable")
      // Native code chooses the path. JS cannot supply another app's directory.
      val directory = File(context.noBackupFilesDir, "sefirah-tor")
      directory.mkdirs()
      directory.setReadable(false, false)
      directory.setWritable(false, false)
      directory.setExecutable(false, false)
      directory.setReadable(true, true)
      directory.setWritable(true, true)
      directory.setExecutable(true, true)
      synchronized(handles) { handles.add(handle) }
      invoke(JSONObject().put("op", "start").put("handle", handle)
        .put("request", request).put("capability", capability)
        .put("directory", directory.absolutePath).toString())
    }
    AsyncFunction("offer") { handle: String, objectJson: String ->
      invoke(JSONObject().put("op", "offer").put("handle", handle)
        .put("object", JSONObject(objectJson)).toString())
    }
    AsyncFunction("get") { handle: String, request: String, onion: String, capability: String, id: String ->
      invoke(JSONObject().put("op", "get").put("handle", handle).put("request", request)
        .put("onion", onion).put("capability", capability).put("id", id).toString())
    }
    Function("forget") { handle: String, id: String ->
      invoke(JSONObject().put("op", "forget").put("handle", handle).put("id", id).toString())
    }
    // These control operations are short and must bypass a pending async bootstrap.
    Function("cancel") { request: String ->
      invoke(JSONObject().put("op", "cancel").put("request", request).toString())
    }
    Function("stop") { handle: String ->
      synchronized(handles) { handles.remove(handle) }
      invoke(JSONObject().put("op", "stop").put("handle", handle).toString())
    }
    OnDestroy {
      val active = synchronized(handles) { handles.toList().also { handles.clear() } }
      active.forEach { handle -> invoke(JSONObject().put("op", "stop").put("handle", handle).toString()) }
    }
  }
}

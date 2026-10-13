import ExpoModulesCore
import Foundation

public final class SefirahTorModule: Module {
#if SEFIRAH_TOR_ENABLED
  private let lock = NSLock()
  private let workQueue = DispatchQueue(label: "org.pherus.sefirah.tor", qos: .utility, attributes: .concurrent)
  private var handles = Set<String>()
  private var destroyed = false

  private func unavailable() -> NSError {
    NSError(domain: "SefirahTor", code: 1, userInfo: [
      NSLocalizedDescriptionKey: "Native Sefirah transport unavailable"
    ])
  }

  private func invoke(_ command: [String: Any]) throws -> String {
    guard let data = try? JSONSerialization.data(withJSONObject: command),
      data.count <= 70 * 1024, let input = String(data: data, encoding: .utf8) else {
      throw unavailable()
    }
    return sefirahTorCall(input: input)
  }

  private func requireHandle(_ handle: String) throws {
    lock.lock()
    defer { lock.unlock() }
    guard !destroyed, handles.contains(handle) else { throw unavailable() }
  }

  private func directory() throws -> String {
    // Paths never come from JS and file errors never expose paths to JS.
    do {
      let manager = FileManager.default
      let base = try manager.url(for: .applicationSupportDirectory, in: .userDomainMask,
        appropriateFor: nil, create: true)
      var root = base.appendingPathComponent("sefirah-tor", isDirectory: true)
      try manager.createDirectory(at: root, withIntermediateDirectories: true, attributes: [
        .protectionKey: FileProtectionType.complete,
        .posixPermissions: 0o700
      ])
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try root.setResourceValues(values)
      try manager.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: root.path)
      return root.path
    } catch {
      throw unavailable()
    }
  }
#endif

  public func definition() -> ModuleDefinition {
    Name("SefirahTor")
#if SEFIRAH_TOR_ENABLED
    Constant("enabled") { true }

    AsyncFunction("start") { (handle: String, request: String, capability: String) throws -> String in
      self.lock.lock()
      guard !self.destroyed else {
        self.lock.unlock()
        throw self.unavailable()
      }
      self.handles.insert(handle)
      self.lock.unlock()
      return try self.invoke([
        "op": "start", "handle": handle, "request": request,
        "capability": capability, "directory": try self.directory()
      ])
    }.runOnQueue(workQueue)
    AsyncFunction("offer") { (handle: String, objectJson: String) throws -> String in
      try self.requireHandle(handle)
      guard objectJson.utf8.count <= 70 * 1024,
        let data = objectJson.data(using: .utf8),
        let object = try? JSONSerialization.jsonObject(with: data) else {
        throw self.unavailable()
      }
      return try self.invoke(["op": "offer", "handle": handle, "object": object])
    }.runOnQueue(workQueue)
    AsyncFunction("get") { (handle: String, request: String, onion: String, capability: String, id: String) throws -> String in
      try self.requireHandle(handle)
      return try self.invoke([
        "op": "get", "handle": handle, "request": request,
        "onion": onion, "capability": capability, "id": id
      ])
    }.runOnQueue(workQueue)
    Function("forget") { (handle: String, id: String) throws -> String in
      try self.requireHandle(handle)
      return try self.invoke(["op": "forget", "handle": handle, "id": id])
    }
    // Short control operations bypass async bootstrap/retrieval. Rust retains
    // cancellation tombstones, so stop-before-start cannot resurrect a session.
    Function("cancel") { (request: String) throws in
      _ = try self.invoke(["op": "cancel", "request": request])
    }
    Function("stop") { (handle: String) throws in
      self.lock.lock()
      self.handles.remove(handle)
      self.lock.unlock()
      _ = try self.invoke(["op": "stop", "handle": handle])
    }
    OnDestroy {
      self.lock.lock()
      self.destroyed = true
      let active = self.handles
      self.handles.removeAll()
      self.lock.unlock()
      for handle in active { _ = try? self.invoke(["op": "stop", "handle": handle]) }
    }
#else
    Constant("enabled") { false }
#endif
  }
}

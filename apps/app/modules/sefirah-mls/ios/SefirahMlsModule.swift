import ExpoModulesCore
import Foundation

public final class SefirahMlsModule: Module {
#if SEFIRAH_MLS_ENABLED
  private let lock = NSRecursiveLock()
  private var engines: [String: PrivateChat] = [:]
  private var paths: [String: String] = [:]
  private var destroyed = false
  private var owners = Set<String>()
  private var engineOwners: [String: String] = [:]
  private let workQueue = DispatchQueue(label: "org.pherus.sefirah.mls", qos: .utility)

  private func failure(_ message: String) -> NSError {
    NSError(domain: "SefirahMls", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }

  private func serialized<T>(_ body: () throws -> T) rethrows -> T {
    lock.lock()
    defer { lock.unlock() }
    return try body()
  }

  private func use<T>(_ handle: String, _ body: (PrivateChat) throws -> T) throws -> T {
    try serialized {
      guard !destroyed, let engine = engines[handle] else {
        throw failure("Conversation closed")
      }
      return try body(engine)
    }
  }

  private func checkCapacity() throws {
    guard !destroyed else { throw failure("Messaging module closed") }
    guard engines.count < 16 else { throw failure("Conversation capacity reached") }
  }

  private func close(_ handle: String) throws {
    try serialized {
      engineOwners.removeValue(forKey: handle)
      paths.removeValue(forKey: handle)
      // Removing the final Swift reference also releases UniFFI's Rust handle.
      if let engine = engines.removeValue(forKey: handle) { try engine.shutdown() }
    }
  }

  private func stateFile(_ namespace: String, probe: Bool) throws -> URL {
    guard namespace.utf8.count == 43,
      namespace.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil else {
      throw failure("Invalid message namespace")
    }
    let manager = FileManager.default
    let base = try manager.url(
      for: probe ? .cachesDirectory : .applicationSupportDirectory,
      in: .userDomainMask, appropriateFor: nil, create: true
    )
    var root = base.appendingPathComponent(
      probe ? "sefirah-message-probes" : "sefirah-messages", isDirectory: true
    )
    try manager.createDirectory(at: root, withIntermediateDirectories: true, attributes: [
      .protectionKey: FileProtectionType.complete,
      .posixPermissions: 0o700
    ])
    // Mark the directory before Rust creates SQLite or journal files inside it.
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try root.setResourceValues(values)
    try manager.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: root.path)
    return root.appendingPathComponent("\(namespace).db")
  }
#endif

  public func definition() -> ModuleDefinition {
    Name("SefirahMls")
#if SEFIRAH_MLS_ENABLED
    Constant("enabled") { true }
    Constant("storageVersion") { 1 }
    Constant("queueVersion") { 1 }
    Constant("asyncVersion") { 1 }
    Constant("deliveryVersion") { 1 }
    Function("registerOwner") { (owner: String) throws in
      try self.serialized {
        guard !self.destroyed, self.owners.count < 16,
          owner.range(of: "^[A-Za-z0-9_-]{22}$", options: .regularExpression) != nil,
          self.owners.insert(owner).inserted else { throw self.failure("Messaging owner unavailable") }
      }
    }
    Function("closeOwner") { (owner: String) in
      self.serialized {
        self.owners.remove(owner)
        for handle in self.engineOwners.filter({ $0.value == owner }).map({ $0.key }) {
          try? self.close(handle)
        }
      }
    }
    AsyncFunction("openAsync") { (owner: String, secret: Data, peer: String, key: Data, namespace: String, probe: Bool) throws -> String in
      var secret = secret
      var key = key
      defer {
        secret.resetBytes(in: 0..<secret.count)
        key.resetBytes(in: 0..<key.count)
      }
      return try self.serialized {
        guard self.owners.contains(owner) else { throw self.failure("Messaging owner closed") }
        try self.checkCapacity()
        let file = try self.stateFile(namespace, probe: probe)
        guard !self.paths.values.contains(file.path) else { throw self.failure("Conversation already open") }
        let handle = UUID().uuidString
        self.engines[handle] = try PrivateChat.open(secret: secret, expectedPeer: peer, storageKey: key, path: file.path)
        self.paths[handle] = file.path
        self.engineOwners[handle] = owner
        return handle
      }
    }.runOnQueue(workQueue)


    // Match Android's synchronous lifecycle until the shared adapter owns cancellation.
    Function("create") { (secret: Data, peer: String) throws -> String in
      var secret = secret
      defer { secret.resetBytes(in: 0..<secret.count) }
      return try self.serialized {
        try self.checkCapacity()
        let handle = UUID().uuidString
        self.engines[handle] = try PrivateChat(secret: secret, expectedPeer: peer)
        return handle
      }
    }
    Function("open") { (secret: Data, peer: String, key: Data, namespace: String, probe: Bool) throws -> String in
      var secret = secret
      var key = key
      defer {
        secret.resetBytes(in: 0..<secret.count)
        key.resetBytes(in: 0..<key.count)
      }
      return try self.serialized {
        try self.checkCapacity()
        let file = try self.stateFile(namespace, probe: probe)
        guard !self.paths.values.contains(file.path) else {
          throw self.failure("Conversation already open")
        }
        let handle = UUID().uuidString
        self.engines[handle] = try PrivateChat.open(
          secret: secret, expectedPeer: peer, storageKey: key, path: file.path
        )
        self.paths[handle] = file.path
        return handle
      }
    }
    Function("pending") { (handle: String) throws -> [[String: Any]] in
      try self.use(handle) { engine in
        try engine.pending().map { item in
          let kind: String
          switch item.kind {
          case .keyPackage: kind = "KEY_PACKAGE"
          case .welcome: kind = "WELCOME"
          case .application: kind = "APPLICATION"
          case .control: kind = "CONTROL"
          }
          return ["id": item.id, "kind": kind, "wire": item.wire]
        }
      }
    }
    Function("received") { (handle: String) throws -> [[String: Any]] in
      try self.use(handle) { engine in
        try engine.received().map { ["id": $0.id, "text": $0.text] }
      }
    }
    Function("handshakeState") { (handle: String) throws -> String in
      try self.use(handle) { engine in
        switch try engine.handshakeState() {
        case .fresh: return "fresh"
        case .offered: return "offered"
        case .established: return "established"
        }
      }
    }
    Function("acknowledgePending") { (handle: String, id: String) throws -> Bool in
      try self.use(handle) { try $0.acknowledgePending(id: id) }
    }
    Function("clearProbe") { (namespace: String) throws in
      try self.serialized {
        let file = try self.stateFile(namespace, probe: true)
        guard !self.paths.values.contains(file.path) else { throw self.failure("Probe still open") }
        for suffix in ["", "-journal", "-wal", "-shm"] {
          let path = file.path + suffix
          if FileManager.default.fileExists(atPath: path) {
            try FileManager.default.removeItem(atPath: path)
          }
        }
      }
    }
    Function("keyPackage") { (handle: String) throws -> Data in
      try self.use(handle) { try $0.keyPackage() }
    }
    Function("initiate") { (handle: String, bytes: Data) throws -> Data in
      try self.use(handle) { try $0.initiate(package: bytes) }
    }
    Function("join") { (handle: String, bytes: Data) throws in
      try self.use(handle) { try $0.join(welcome: bytes) }
    }
    Function("encrypt") { (handle: String, text: String) throws -> Data in
      try self.use(handle) { try $0.encrypt(text: text) }
    }
    Function("decrypt") { (handle: String, bytes: Data) throws -> String in
      try self.use(handle) { try $0.decrypt(wire: bytes) }
    }
    AsyncFunction("pendingAsync") { (handle: String) throws -> [[String: Any]] in
      try self.use(handle) { engine in
        try engine.pending().map { item in
          let kind: String
          switch item.kind {
          case .keyPackage: kind = "KEY_PACKAGE"
          case .welcome: kind = "WELCOME"
          case .application: kind = "APPLICATION"
          case .control: kind = "CONTROL"
          }
          return ["id": item.id, "kind": kind, "wire": item.wire]
        }
      }
    }.runOnQueue(workQueue)
    AsyncFunction("receivedAsync") { (handle: String) throws -> [[String: Any]] in
      try self.use(handle) { engine in
        try engine.received().map { ["id": $0.id, "text": $0.text] }
      }
    }.runOnQueue(workQueue)
    AsyncFunction("handshakeStateAsync") { (handle: String) throws -> String in
      try self.use(handle) { engine in
        switch try engine.handshakeState() {
        case .fresh: return "fresh"
        case .offered: return "offered"
        case .established: return "established"
        }
      }
    }.runOnQueue(workQueue)
    AsyncFunction("acknowledgePendingAsync") { (handle: String, id: String) throws -> Bool in
      try self.use(handle) { try $0.acknowledgePending(id: id) }
    }.runOnQueue(workQueue)
    AsyncFunction("keyPackageAsync") { (handle: String) throws -> Data in
      try self.use(handle) { try $0.keyPackage() }
    }.runOnQueue(workQueue)
    AsyncFunction("initiateAsync") { (handle: String, bytes: Data) throws -> Data in
      try self.use(handle) { try $0.initiate(package: bytes) }
    }.runOnQueue(workQueue)
    AsyncFunction("joinAsync") { (handle: String, bytes: Data) throws in
      try self.use(handle) { try $0.join(welcome: bytes) }
    }.runOnQueue(workQueue)
    AsyncFunction("encryptAsync") { (handle: String, text: String) throws -> Data in
      try self.use(handle) { try $0.encrypt(text: text) }
    }.runOnQueue(workQueue)
    AsyncFunction("decryptAsync") { (handle: String, bytes: Data) throws -> String in
      try self.use(handle) { try $0.decrypt(wire: bytes) }
    }.runOnQueue(workQueue)
    AsyncFunction("deliveryAsync") { (handle: String, request: String) throws -> String in
      try self.use(handle) { try $0.delivery(request: request) }
    }.runOnQueue(workQueue)
    Function("close") { (handle: String) throws in try self.close(handle) }
    OnDestroy {
      self.serialized {
        self.destroyed = true
        self.owners.removeAll()
        for handle in Array(self.engines.keys) { try? self.close(handle) }
      }
    }
#else
    Constant("enabled") { false }
#endif
  }
}

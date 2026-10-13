package org.pherus.sefirah.mls

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SefirahMlsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SefirahMls")
    Constant("enabled") { false }
  }
}

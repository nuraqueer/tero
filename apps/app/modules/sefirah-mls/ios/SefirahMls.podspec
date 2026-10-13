Pod::Spec.new do |s|
  s.name = 'SefirahMls'
  s.version = '0.1.0'
  s.summary = 'Tero private message engine'
  s.homepage = 'https://tero.pherus.org'
  s.license = 'AGPL-3.0-only'
  s.author = 'Pherus'
  s.source = { :git => 'https://github.com/pherus/tero.git' }
  s.platform = :ios, '16.4'
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = 'SefirahMlsModule.swift'

  if ENV['SEFIRAH_NATIVE_BUILD'] == '1'
    generated = File.expand_path('Generated', __dir__)
    unless %w[SefirahMls.swift SefirahMlsFFI.h module.modulemap libsefirah_mls.a].all? { |file| File.exist?(File.join(generated, file)) }
      raise 'Run modules/sefirah-mls/build-ios.sh before pod install for native MLS.'
    end
    s.source_files = ['SefirahMlsModule.swift', 'Generated/SefirahMls.swift']
    s.vendored_libraries = 'Generated/libsefirah_mls.a'
    s.libraries = 'c++', 'resolv'
    s.pod_target_xcconfig = {
      'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => '$(inherited) SEFIRAH_MLS_ENABLED',
      'SWIFT_INCLUDE_PATHS' => '$(inherited) "${PODS_TARGET_SRCROOT}/Generated"'
    }
  end
end

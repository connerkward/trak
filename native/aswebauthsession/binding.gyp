{
  "targets": [
    {
      "target_name": "aswebauthsession",
      "sources": [ "aswebauthsession.mm" ],
      "conditions": [
        ['OS=="mac"', {
          "xcode_settings": {
            "ARCHS": [
              "arm64",
              "x86_64"
            ],
            "OTHER_CFLAGS": [
              "-ObjC++",
              "-std=c++17"
            ],
            "OTHER_LDFLAGS": [
              "-framework AuthenticationServices",
              "-framework AppKit"
            ]
          }
        }]
      ]
    }
  ]
}

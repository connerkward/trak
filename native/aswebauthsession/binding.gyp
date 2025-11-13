{
  "targets": [
    {
      "target_name": "aswebauthsession",
      "sources": [ "aswebauthsession.mm" ],
      "conditions": [
        ['OS=="mac"', {
          "xcode_settings": {
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

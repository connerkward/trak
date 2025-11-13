#import <AuthenticationServices/AuthenticationServices.h>
#import <AppKit/AppKit.h>
#include <node_api.h>
#include <string>

// Forward declaration
@interface AuthSessionDelegate : NSObject <ASWebAuthenticationPresentationContextProviding>
@end

@implementation AuthSessionDelegate

- (ASPresentationAnchor)presentationAnchorForWebAuthenticationSession:(ASWebAuthenticationSession *)session {
    // Return the main window or create a new one if needed
    NSWindow *window = [[NSApplication sharedApplication] mainWindow];
    if (!window) {
        // Create a temporary window if there's no main window
        window = [[NSWindow alloc] init];
    }
    return window;
}

@end

// Global reference to keep the session alive
static ASWebAuthenticationSession *currentSession = nil;
static AuthSessionDelegate *sessionDelegate = nil;

// Helper function to convert NSString to C string
static std::string NSStringToStdString(NSString *nsString) {
    if (nsString == nil) return "";
    return std::string([nsString UTF8String]);
}

// Start authentication session
static napi_value StartAuthSession(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 2) {
        napi_throw_error(env, nullptr, "Expected 2 arguments: url and callbackUrlScheme");
        return nullptr;
    }

    // Get the URL string
    size_t urlLength;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &urlLength);
    char *urlBuffer = new char[urlLength + 1];
    napi_get_value_string_utf8(env, args[0], urlBuffer, urlLength + 1, &urlLength);
    NSString *urlString = [NSString stringWithUTF8String:urlBuffer];
    delete[] urlBuffer;

    // Get the callback URL scheme
    size_t callbackLength;
    napi_get_value_string_utf8(env, args[1], nullptr, 0, &callbackLength);
    char *callbackBuffer = new char[callbackLength + 1];
    napi_get_value_string_utf8(env, args[1], callbackBuffer, callbackLength + 1, &callbackLength);
    NSString *callbackScheme = [NSString stringWithUTF8String:callbackBuffer];
    delete[] callbackBuffer;

    // Create deferred for promise
    napi_deferred deferred;
    napi_value promise;
    napi_create_promise(env, &deferred, &promise);

    // Retain env and deferred for the callback
    napi_ref deferredRef;
    napi_create_reference(env, promise, 1, &deferredRef);

    dispatch_async(dispatch_get_main_queue(), ^{
        NSURL *url = [NSURL URLWithString:urlString];

        if (currentSession) {
            [currentSession cancel];
            currentSession = nil;
        }

        if (!sessionDelegate) {
            sessionDelegate = [[AuthSessionDelegate alloc] init];
        }

        // Create the authentication session
        currentSession = [[ASWebAuthenticationSession alloc]
            initWithURL:url
            callbackURLScheme:callbackScheme
            completionHandler:^(NSURL * _Nullable callbackURL, NSError * _Nullable error) {
                napi_value result;

                if (error) {
                    // Error occurred
                    NSString *errorMsg = [error localizedDescription];
                    napi_value errorValue;
                    napi_create_string_utf8(env, [errorMsg UTF8String], NAPI_AUTO_LENGTH, &errorValue);
                    napi_reject_deferred(env, deferred, errorValue);
                } else if (callbackURL) {
                    // Success - return the callback URL
                    NSString *callbackURLString = [callbackURL absoluteString];
                    napi_create_string_utf8(env, [callbackURLString UTF8String], NAPI_AUTO_LENGTH, &result);
                    napi_resolve_deferred(env, deferred, result);
                } else {
                    // Cancelled
                    napi_value errorValue;
                    napi_create_string_utf8(env, "Authentication cancelled", NAPI_AUTO_LENGTH, &errorValue);
                    napi_reject_deferred(env, deferred, errorValue);
                }

                napi_delete_reference(env, deferredRef);
                currentSession = nil;
            }];

        // Set presentation context provider
        currentSession.presentationContextProvider = sessionDelegate;

        // Use non-ephemeral session to share cookies with Safari (better UX for already logged-in users)
        if (@available(macOS 10.15, *)) {
            currentSession.prefersEphemeralWebBrowserSession = NO;
        }

        // Start the session
        if (![currentSession start]) {
            napi_value errorValue;
            napi_create_string_utf8(env, "Failed to start authentication session", NAPI_AUTO_LENGTH, &errorValue);
            napi_reject_deferred(env, deferred, errorValue);
            napi_delete_reference(env, deferredRef);
            currentSession = nil;
        }
    });

    return promise;
}

// Cancel current authentication session
static napi_value CancelAuthSession(napi_env env, napi_callback_info info) {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (currentSession) {
            [currentSession cancel];
            currentSession = nil;
        }
    });

    napi_value result;
    napi_get_undefined(env, &result);
    return result;
}

// Initialize the module
static napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor desc[] = {
        { "startAuthSession", 0, StartAuthSession, 0, 0, 0, napi_default, 0 },
        { "cancelAuthSession", 0, CancelAuthSession, 0, 0, 0, napi_default, 0 }
    };

    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)

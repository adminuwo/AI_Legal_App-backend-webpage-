const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidOrientationFix = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    if (!androidManifest.$) {
      androidManifest.$ = {};
    }

    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = Array.isArray(androidManifest.application) ? androidManifest.application[0] : androidManifest.application;
    if (application) {
      if (!application.activity) {
        application.activity = [];
      }

      const mlKitActivityName = 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';
      const existingActivity = application.activity.find(
        (a) => a.$ && a.$['android:name'] === mlKitActivityName
      );

      if (existingActivity) {
        existingActivity.$['tools:replace'] = 'android:screenOrientation';
        existingActivity.$['android:screenOrientation'] = 'unspecified';
        existingActivity.$['android:resizeableActivity'] = 'true';
      } else {
        application.activity.push({
          $: {
            'android:name': mlKitActivityName,
            'tools:replace': 'android:screenOrientation',
            'android:screenOrientation': 'unspecified',
            'android:resizeableActivity': 'true',
          },
        });
      }
    }

    return config;
  });
};

module.exports = withAndroidOrientationFix;
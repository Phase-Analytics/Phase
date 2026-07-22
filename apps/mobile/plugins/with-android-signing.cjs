const {
  createRunOncePlugin,
  withAppBuildGradle,
} = require("expo/config-plugins");

const SIGNING_SNIPPET = `
def phaseKeystorePropertiesFile = rootProject.file("../credentials/android/keystore.properties")
def phaseKeystoreProperties = new Properties()
if (phaseKeystorePropertiesFile.exists()) {
    phaseKeystoreProperties.load(new FileInputStream(phaseKeystorePropertiesFile))
}
`;

const SIGNING_CONFIG = `
        release {
            if (phaseKeystorePropertiesFile.exists()) {
                keyAlias phaseKeystoreProperties['keyAlias']
                keyPassword phaseKeystoreProperties['keyPassword']
                storeFile rootProject.file(phaseKeystoreProperties['storeFile'])
                storePassword phaseKeystoreProperties['storePassword']
            }
        }
`;

function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("phaseKeystorePropertiesFile")) {
      contents = contents.replace(/^(android\s*\{)/m, `${SIGNING_SNIPPET}\n$1`);
    }

    if (!contents.includes("phaseKeystoreProperties['keyAlias']")) {
      if (/signingConfigs\s*\{/.test(contents)) {
        contents = contents.replace(
          /signingConfigs\s*\{/,
          `signingConfigs {\n${SIGNING_CONFIG}`
        );
      } else {
        contents = contents.replace(
          /android\s*\{/,
          `android {\n    signingConfigs {\n${SIGNING_CONFIG}\n    }`
        );
      }
    }

    if (
      /buildTypes\s*\{[\s\S]*?release\s*\{/.test(contents) &&
      !contents.includes("signingConfig signingConfigs.release")
    ) {
      contents = contents.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
        `$1\n            signingConfig signingConfigs.release`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = createRunOncePlugin(
  withAndroidSigning,
  "with-android-signing",
  "1.0.0"
);

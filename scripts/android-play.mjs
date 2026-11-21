// Keep generated files disposable: all Play additions come from versioned templates.
export function configurePlayGradle(source) {
  const directive = "apply from: 'play-release.gradle'";
  return source.includes(directive) ? source : `${source}\n${directive}\n`;
}
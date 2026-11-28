#!/usr/bin/env bash
set -uo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: gradle-with-retry.sh <Gradle tasks and options>" >&2
  exit 2
fi

max_attempts=4
log_file="${RUNNER_TEMP:-/tmp}/screenflow-gradle-build.log"

for ((attempt = 1; attempt <= max_attempts; attempt++)); do
  ./gradlew --no-daemon "$@" 2>&1 | tee "$log_file"
  status=${PIPESTATUS[0]}

  if [ "$status" -eq 0 ]; then
    exit 0
  fi

  if [ "$attempt" -eq "$max_attempts" ]; then
    exit "$status"
  fi

  if ! grep -Eiq \
    'Received status code (429|500|502|503|504)|Read timed out|Connection reset|Connection timed out|Temporary failure in name resolution|SSLHandshakeException|Premature end of Content-Length' \
    "$log_file"; then
    exit "$status"
  fi

  delay=$((attempt * 15))
  echo "Temporary Gradle dependency download failure (attempt $attempt/$max_attempts). Retrying in ${delay}s." >&2
  sleep "$delay"
done

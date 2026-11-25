export const TICKER_API_ENDPOINT = "https://screenflow.live/api/public/ticker";
export const TICKER_API_EXAMPLES = {
  "cURL": "curl --request POST https://screenflow.live/api/public/ticker \\\n  --header \"Authorization: Bearer VOTRE_CLE_API\" \\\n  --header \"Content-Type: application/json\" \\\n  --data '{\"text\":\"Bienvenue • Promotion du jour -20 %\",\"enabled\":true}' ",
  "JavaScript": "// Exécuter côté serveur : ne pas exposer la clé dans une page publique.\nconst response = await fetch(\"https://screenflow.live/api/public/ticker\", {\n  method: \"POST\",\n  headers: {\n    Authorization: `Bearer ${process.env.SCREENFLOW_API_KEY}`,\n    \"Content-Type\": \"application/json\"\n  },\n  body: JSON.stringify({ text: \"Bienvenue • Promotion du jour -20 %\", enabled: true })\n});\nconst result = await response.json();\nif (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);\nconsole.log(result); // { ok: true }",
  "Python": "import os\nimport requests\n\nresponse = requests.post(\n    \"https://screenflow.live/api/public/ticker\",\n    headers={\"Authorization\": f\"Bearer {os.environ['SCREENFLOW_API_KEY']}\"},\n    json={\"text\": \"Bienvenue • Promotion du jour -20 %\", \"enabled\": True},\n    timeout=15,\n)\nresponse.raise_for_status()\nprint(response.json()) # {\"ok\": True}",
  "PHP": "<?php\n$ch = curl_init(\"https://screenflow.live/api/public/ticker\");\ncurl_setopt_array($ch, [\n    CURLOPT_RETURNTRANSFER => true,\n    CURLOPT_POST => true,\n    CURLOPT_TIMEOUT => 15,\n    CURLOPT_HTTPHEADER => [\n        \"Authorization: Bearer \" . getenv(\"SCREENFLOW_API_KEY\"),\n        \"Content-Type: application/json\"\n    ],\n    CURLOPT_POSTFIELDS => json_encode([\n        \"text\" => \"Bienvenue • Promotion du jour -20 %\",\n        \"enabled\" => true\n    ])\n]);\n$result = curl_exec($ch);\nif ($result === false) throw new RuntimeException(curl_error($ch));\n$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);\ncurl_close($ch);\nif ($status !== 200) throw new RuntimeException(\"HTTP \" . $status . \" : \" . $result);\necho $result;"
};
export const TICKER_API_RESPONSES = [
  [
    "200",
    "Succès : {\"ok\": true}. Le texte est enregistré ; cela ne confirme pas son affichage sur une TV."
  ],
  [
    "400",
    "JSON invalide, champ inconnu, texte absent ou supérieur à 500 caractères, enabled non booléen."
  ],
  [
    "401",
    "Clé absente, mal formée, inconnue ou révoquée."
  ],
  [
    "413",
    "Corps trop volumineux : la route refuse plus de 4 096 caractères de corps brut."
  ],
  [
    "429",
    "Limite de 60 demandes par clé sur 60 secondes, ou contrôle de limite indisponible. Attendre une minute."
  ],
  [
    "503",
    "Service indisponible. Réessayer plus tard avec un délai progressif."
  ]
];

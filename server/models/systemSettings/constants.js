// SPDX-License-Identifier: MIT
// Purpose: Static constant definitions for SystemSettings.
// Extracted from systemSettings.js as part of issue #510 God-File split.

/**
 * A default system prompt used when no other system prompt is set or available.
 * OpenSIN Chat — German-language default with mandatory source citation.
 */
const saneDefaultSystemPrompt = [
  'Du bist OpenSIN Chat \u2014 ein sovereiner KI-Arbeitsraum f\u00fcr patriotische Politik.',
  '',
  'Antworte immer auf Deutsch, pr\u00e4zise, sachlich und auf Quellen gest\u00fctzt.',
  '',
  'Pflicht-Regeln f\u00fcr jede Antwort:',
  '1. Wenn dir Kontext aus hochgeladenen Dokumenten vorliegt, zitiere ihn mit konkretem Quellen-Hinweis (Dokumentname, Seite, Absatz).',
  "2. Wenn du aus deinem Trainings-Wissen antwortest, kennzeichne das transparent als 'allgemeine Information' und nicht als 'aus den Dokumenten belegt'.",
  '3. Erfinde keine Zitate, Zahlen, Daten, Personen oder Ereignisse. Wenn du etwas nicht sicher wei\u00dft, sage es offen.',
  '4. Bei politischen oder juristischen Fragen: nenne immer auch die zugrundeliegende Quelle (Gesetz, Bundestags-Drucksache, Pressemitteilung, Gerichtsurteil).',
  '5. Antworte ausgewogen, aber parteilich im Sinne einer freiheitlich-konservativen politischen Analyse \u2014 so wie es dein Nutzer erwartet. Bleibe dabei respektvoll und faktenbasiert.',
  '6. Werkzeug-Zugriff: Du hast KEINE Werkzeuge (kein Webzugriff, kein Dateisystem, keine Suche) im normalen Chat-Modus. Wenn der Nutzer Aufgaben verlangt, die Live-Daten, Webrecherche, Datei-Operationen oder andere Aktionen erfordern, sage ehrlich, dass du das im normalen Chat nicht kannst, und weise den Nutzer darauf hin, dass er die Anfrage mit dem Pr\u00e4fix `@agent` (z. B. `@agent Suche im Web nach Wetter Berlin`) erneut senden muss, um den Agenten-Modus mit vollem Werkzeug-Zugriff zu aktivieren. Auf Fragen nach deinen F\u00e4higkeiten (Webzugriff, Internet, Tools) antworte transparent, dass Werkzeuge \u00fcber `@agent` verf\u00fcgbar sind.',
  '',
  'Struktur & Formatierung (Markdown \u2014 wie ein erstklassiger Analyst):',
  '- Beginne komplexe Antworten mit einem kurzen Fazit-Satz (1\u20132 Zeilen), der die Kernaussage vorwegnimmt; dann folgen die Details.',
  '- Gliedere mit aussagekr\u00e4ftigen \u00dcberschriften (##, ###), sobald eine Antwort mehrere Aspekte hat. Kurze, einfache Antworten bleiben aber kurz \u2014 formatiere nicht k\u00fcnstlich auf.',
  '- Nutze Aufz\u00e4hlungen (-) f\u00fcr Listen und nummerierte Listen (1.) f\u00fcr Reihenfolgen oder Schritte. Halte Listenpunkte parallel und knapp.',
  '- Hebe Schl\u00fcsselbegriffe, Namen, Zahlen und Fristen mit **Fettschrift** hervor.',
  '- Verwende Tabellen, wenn du mehrere Optionen, Positionen oder Daten vergleichst.',
  '- Setze Gesetzes-, Paragraphen- und Aktenzeichen sowie w\u00f6rtliche Zitate in `Code-Spans` oder Blockzitate (>), damit sie klar erkennbar sind.',
  '- Schreibe in klaren, kurzen S\u00e4tzen. Vermeide F\u00fcllw\u00f6rter, Wiederholungen und Beh\u00f6rden-Deutsch. Ein Gedanke pro Satz.',
  '- Schlie\u00dfe l\u00e4ngere Antworten mit einer kurzen Zusammenfassung oder den konkreten n\u00e4chsten Schritten ab.',
  '- Passe L\u00e4nge und Tiefe an die Frage an: einfache Frage \u2192 knappe Antwort; komplexe Analyse \u2192 vollst\u00e4ndige Struktur.',
  '',
  'Antworte auf die Frage des Nutzers unter Ber\u00fccksichtigung dieser Regeln und des bereitgestellten Kontexts.',
].join('\n');

const protectedFields = [
  'multi_user_mode',
  'hub_api_key',
  'onboarding_complete',
];

const publicFields = [
  'footer_data',
  'support_email',
  'text_splitter_chunk_size',
  'text_splitter_chunk_overlap',
  'max_embed_chunk_size',
  'agent_search_provider',
  'agent_sql_connections',
  'default_agent_skills',
  'disabled_agent_skills',
  'disabled_filesystem_skills',
  'disabled_create_files_skills',
  'disabled_gmail_skills',
  'gmail_agent_config',
  'disabled_google_calendar_skills',
  'google_calendar_agent_config',
  'disabled_outlook_skills',
  'outlook_agent_config',
  'imported_agent_skills',
  'agent_clarifying_questions_enabled',
  'agent_clarifying_questions_max_per_turn',
  'custom_app_name',
  'feature_flags',
  'meta_page_title',
  'meta_page_favicon',
  'memory_enabled',
  'memory_auto_extraction',

  // Image generation settings
  'image_generation_base_path',
  'image_generation_model',
];

const supportedFields = [
  'logo_filename',
  'telemetry_id',
  'footer_data',
  'support_email',

  'text_splitter_chunk_size',
  'text_splitter_chunk_overlap',
  'agent_search_provider',
  'default_agent_skills',
  'disabled_agent_skills',
  'disabled_filesystem_skills',
  'disabled_create_files_skills',
  'disabled_gmail_skills',
  'gmail_agent_config',
  'disabled_google_calendar_skills',
  'google_calendar_agent_config',
  'disabled_outlook_skills',
  'outlook_agent_config',
  'agent_sql_connections',
  'agent_clarifying_questions_enabled',
  'agent_clarifying_questions_max_per_turn',
  'custom_app_name',
  'default_system_prompt',

  // Meta page customization
  'meta_page_title',
  'meta_page_favicon',

  // beta feature flags
  'experimental_live_file_sync',

  // Hub settings
  'hub_api_key',

  // Memory/Personalization
  'memory_enabled',
  'memory_auto_extraction',

  // Image generation settings
  'image_generation_base_path',
  'image_generation_api_key',
  'image_generation_model',
];

module.exports = {
  saneDefaultSystemPrompt,
  protectedFields,
  publicFields,
  supportedFields,
};

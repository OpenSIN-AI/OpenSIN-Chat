// SPDX-License-Identifier: MIT
// Anything with "null" requires a translation. Contribute to translation via a PR!
const TRANSLATIONS = {
  page: {
    title: "OpenSIN Chat",
    description:
      "OpenSIN Chat — souveräner KI-Arbeitsraum für politische Forschung. Chatte mit deinen Dokumenten, automatisiere Recherche, selbst gehostet, ohne Telemetrie.",
    titles: {
      home: "Startseite",
      login: "Anmeldung",
      workspace: "Arbeitsbereich",
      workspaceSettings: "Arbeitsbereich-Einstellungen",
      settings: "Einstellungen",
      pdfAnalysis: "PDF-Analyse",
      docs: "Dokumentation",
      onboarding: "Einrichtung",
      notFound: "Seite nicht gefunden",
      sso: "SSO-Anmeldung",
    },
  },
  a11y: {
    skipToContent: "Zum Hauptinhalt springen",
  },
  auth: {
    username: "Benutzername",
    password: "Passwort",
    newPassword: "Neues Passwort",
  },
  onboarding: {
    home: {
      getStarted: "Jetzt starten",
      welcome: "Herzlich willkommen",
      readDocs: "Dokumentation",
      appName: "OpenSIN Chat",
      darkMode: "Zum dunklen Modus wechseln",
      lightMode: "Zum hellen Modus wechseln",
    },
    llm: {
      title: "LLM-Einstellung",
      description:
        "OpenSIN Chat ist mit vielen LLM-Anbietern kompatibel. Der ausgewählte Dienst wird für die Chats verwendet.",
      saveFailed: "Fehler beim Speichern der LLM-Einstellungen: {{error}}",
    },
    userSetup: {
      title: "Benutzer Setup",
      description: "Konfigurieren Sie Ihre Benutzereinstellungen.",
      howManyUsers: "Wie viele Benutzer werden diese Instanz verwenden?",
      justMe: "Nur ich",
      myTeam: "Mein Team",
      instancePassword: "Passwort für diese Instanz",
      setPassword: "Möchten Sie ein Passwort einrichten?",
      passwordReq: "Das Passwort muss mindestens 8 Zeichen enthalten.",
      passwordWarn:
        "Dieses Passwort sollte sicher aufbewahrt werden, da Wiederherstellung nicht möglich ist.",
      adminUsername: "Benutzername des Admin-Accounts",
      adminPassword: "Passwort des Admin-Accounts",
      adminPasswordReq: "Das Passwort muss mindestens 8 Zeichen enthalten.",
      teamHint:
        "Zu Beginn sind Sie der einzige Admin. Nach der Einrichtung können Sie weitere Benutzer oder Admins einladen. Verlieren Sie Ihr Passwort nicht – nur Admins können Passwörter zurücksetzen.",
      placeholder: {
        adminUsername: "Ihr Admin-Benutzername",
        adminPassword: "Ihr Admin-Passwort",
      },
      passwordRestricted:
        "Ihr Passwort enthält nicht erlaubte Zeichen. Erlaubte Sonderzeichen sind _,-,!,@,$,%,^,&,*,(,),;",
      setPasswordFailed: "Fehler beim Festlegen des Passworts: {{error}}",
      error: "Fehler: {{error}}",
    },
    data: {
      title: "Datenverarbeitung & Datenschutz",
      description:
        "Wir setzen uns für Transparenz und Kontrolle im Umgang mit Ihren persönlichen Daten ein.",
      settingsHint:
        "Diese Einstellungen können jederzeit in den Einstellungen angepasst werden.",
    },
    survey: {
      title: "Willkommen bei OpenSIN Chat",
      description:
        "Helfen Sie uns, OpenSIN Chat an Ihre Bedürfnisse anzupassen. (Optional)",
      email: "Wie lautet Ihre E-Mail-Adresse?",
      emailPlaceholder: "sie@gmail.com",
      useCase: "Wofür möchten Sie OpenSIN Chat verwenden?",
      useCaseWork: "Beruflich",
      useCasePersonal: "Privat",
      useCaseOther: "Sonstiges",
      comment: "Wie haben Sie von OpenSIN Chat erfahren?",
      commentPlaceholder:
        "Reddit, Twitter, GitHub, YouTube, etc. – Teilen Sie uns mit, wie Sie uns entdeckt haben!",
      skip: "Umfrage überspringen",
      thankYou: "Vielen Dank für Ihr Feedback!",
      supportEmail: "team@openafd.com",
    },
  },
  modals: {
    manageWorkspace: {
      documents: {
        workspaceDirectory: {
          uploadZone: {
            loadingMessage: "Lädt...",
            name: "Name",
            status: "Status",
            additionalFilesReady:
              "{{count}} zusätzliche Datei(en) bereit zum Einbetten",
            addToQueue: "Zur Warteschlange hinzufügen",
          },
        },
      },
    },
  },
  modelSelector: {
    chatModel: {
      placeholder:
        "Geben Sie den Modellnamen genau so ein, wie er in der API referenziert wird (z. B. gpt-3.5-turbo)",
    },
    multiModelNotSupported:
      "Multi-Modell-Unterstützung wird für diesen Anbieter noch nicht unterstützt.",
    workspaceWillUse: "Dieser Workspace wird verwenden",
    systemModelLink: "das für das System festgelegte Modell.",
  },
  transcriptionSelection: {
    model: "Modellauswahl",
  },
  genericOpenAi: {
    baseUrl: "Basis-URL",
    baseUrlPlaceholder: "z.B.: https://proxy.openai.com",
    apiKey: "API-Schlüssel",
    apiKeyPlaceholder: "Generischer API-Schlüssel",
    modelContextWindow: "Modell-Kontextfenster",
    contextWindowPlaceholder: "Kontextfenster-Limit (z.B.: 4096)",
    maxTokens: "Max. Token",
    maxTokensPlaceholder: "Max. Token pro Anfrage (z.B.: 1024)",
    selectedModel: "Ausgewähltes Modell",
    loadingModels: "-- verfügbare Modelle werden geladen --",
    modelPlaceholder: "Modell-ID für Chat-Anfragen",
    loadedModels: "Ihre geladenen Modelle",
  },
  anthropic: {
    apiKey: "Anthropic API-Schlüssel",
    modelSelection: "Chat-Modellauswahl",
    loadingModels: "-- verfügbare Modelle werden geladen --",
    advancedSettings: "erweiterte Einstellungen",
    promptCaching: "Prompt-Caching",
    noCaching: "Kein Caching",
    fiveMinutes: "5 Minuten",
    oneHour: "1 Stunde",
  },
  litellm: {
    baseUrl: "Basis-URL",
    baseUrlPlaceholder: "http://127.0.0.1:4000",
    modelSelection: "Chat-Modellauswahl",
    loadingModels: "-- verfügbare Modelle werden geladen --",
    waitingForUrl: "-- warte auf URL --",
    modelContextWindow: "Modell-Kontextfenster",
    tokenLimitPlaceholder: "8192",
    apiKey: "API-Schlüssel",
    apiKeyOptional: "optional",
    apiKeyPlaceholder: "sk-meingeheimschlüssel",
    loadedModels: "Ihre geladenen Modelle",
  },
  voyageAi: {
    apiKey: "API-Schlüssel",
    modelPreference: "Modellpräferenz",
    availableModels: "Verfügbare Embedding-Modelle",
    apiKeyPlaceholder: "Voyage AI API-Schlüssel",
  },
  providerSettings: {
    openai: {
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "OpenAI API-Schlüssel",
      whisperModel: "Whisper-Modell",
      whisperLarge: "Whisper Large",
    },
    astraDb: {
      endpoint: "Astra DB-Endpunkt",
      endpointPlaceholder: "Astra DB API-Endpunkt",
      applicationToken: "Astra DB-Anwendungstoken",
      tokenPlaceholder: "AstraCS:...",
    },
    pinecone: {
      apiKey: "Pinecone DB API-Schlüssel",
      apiKeyPlaceholder: "Pinecone API-Schlüssel",
      indexName: "Pinecone Index-Name",
      indexNamePlaceholder: "mein-index",
    },
    qdrant: {
      apiEndpoint: "QDrant API-Endpunkt",
      apiEndpointPlaceholder: "http://localhost:6633",
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "wOeqxsYP4....1244sba",
    },
    weaviate: {
      endpoint: "Weaviate-Endpunkt",
      endpointPlaceholder: "http://localhost:8080",
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "sk-123Abcweaviate",
    },
    zilliz: {
      clusterEndpoint: "Cluster-Endpunkt",
      clusterEndpointPlaceholder:
        "https://sample.api.gcp-us-west1.zillizcloud.com",
      apiToken: "API-Token",
      apiTokenPlaceholder: "Zilliz-Cluster-API-Token",
    },
    voyageAi: {
      apiKey: "API-Schlüssel",
      modelPreference: "Modellpräferenz",
      availableModels: "Verfügbare Embedding-Modelle",
      apiKeyPlaceholder: "Voyage AI API-Schlüssel",
    },
    genericOpenAi: {
      baseUrl: "Basis-URL",
      baseUrlPlaceholder: "z.B.: https://proxy.openai.com",
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "Generischer API-Schlüssel",
      modelContextWindow: "Modell-Kontextfenster",
      contextWindowPlaceholder: "Kontextfenster-Limit (z.B.: 4096)",
      maxTokens: "Max. Token",
      maxTokensPlaceholder: "Max. Token pro Anfrage (z.B.: 1024)",
      selectedModel: "Ausgewähltes Modell",
      loadingModels: "-- verfügbare Modelle werden geladen --",
      modelPlaceholder: "Modell-ID für Chat-Anfragen",
      loadedModels: "Ihre geladenen Modelle",
    },
    anthropic: {
      apiKey: "Anthropic API-Schlüssel",
      modelSelection: "Chat-Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
      advancedSettings: "erweiterte Einstellungen",
      promptCaching: "Prompt-Caching",
      noCaching: "Kein Caching",
      fiveMinutes: "5 Minuten",
      oneHour: "1 Stunde",
    },
    litellm: {
      baseUrl: "Basis-URL",
      baseUrlPlaceholder: "http://127.0.0.1:4000",
      modelSelection: "Chat-Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
      waitingForUrl: "-- warte auf URL --",
      modelContextWindow: "Modell-Kontextfenster",
      tokenLimitPlaceholder: "8192",
      apiKey: "API-Schlüssel",
      apiKeyOptional: "optional",
      apiKeyPlaceholder: "sk-meingeheimschlüssel",
      loadedModels: "Ihre geladenen Modelle",
    },
    opencodeZen: {
      baseUrl: "Basis-URL",
      baseUrlPlaceholder: "https://opencode.ai/zen/v1",
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "OpenCode Zen API-Schlüssel",
      modelId: "Modell-ID",
      modelIdPlaceholder: "z.B. nemotron-3-ultra-free",
      modelContextWindow: "Modell-Kontextfenster",
      tokenLimitPlaceholder: "Kontextfenster-Limit (z.B.: 1000000)",
    },
    geminiEmbedding: {
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "Gemini API-Schlüssel",
      modelPreference: "Modellpräferenz",
      availableModels: "Verfügbare Embedding-Modelle",
      outputDimensions: "Ausgabedimensionen",
      outputDimensionsTooltip:
        "Die Anzahl der Dimensionen, die die resultierenden Ausgabe-Embeddings haben sollten, wenn mehrere Dimensionen unterstützt werden.",
      outputDimensionsTooltip2:
        "Leer lassen, um die Standarddimensionen für das ausgewählte Modell zu verwenden.",
      outputDimensionsPlaceholder: "Standarddimensionen annehmen",
    },
    groqAi: {
      apiKey: "Groq API-Schlüssel",
      apiKeyPlaceholder: "Groq API-Schlüssel",
      modelSelection: "Chat-Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
      enterApiKeyHint:
        "Geben Sie einen gültigen API-Schlüssel ein, um alle verfügbaren Modelle für Ihr Konto anzuzeigen.",
      availableModels: "Verfügbare Modelle",
      selectModelHint:
        "Wählen Sie das GroqAI-Modell, das Sie für Ihre Konversationen verwenden möchten.",
    },
    nvidiaNim: {
      baseUrl: "NVIDIA NIM Basis-URL",
      autoDetect: "Automatisch erkennen",
      baseUrlPlaceholder: "http://localhost:8000/v1",
      baseUrlHelp: "Geben Sie die URL ein, unter der NVIDIA NIM läuft.",
      modelSelection: "Chat-Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
    },
    xAi: {
      apiKey: "xAI API-Schlüssel",
      apiKeyPlaceholder: "xAI API-Schlüssel",
      modelSelection: "Chat-Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
      enterApiKeyHint:
        "Geben Sie einen gültigen API-Schlüssel ein, um alle verfügbaren Modelle für Ihr Konto anzuzeigen.",
      availableModels: "Verfügbare Modelle",
      selectModelHint:
        "Wählen Sie das xAI-Modell, das Sie für Ihre Konversationen verwenden möchten.",
    },
    azureAiEmbedding: {
      serviceEndpoint: "Azure Service-Endpunkt",
      serviceEndpointPlaceholder: "https://my-azure.openai.azure.com",
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "Azure OpenAI API-Schlüssel",
      embeddingDeploymentName: "Embedding-Bereitstellungsname",
      embeddingDeploymentNamePlaceholder:
        "Azure OpenAI Embedding-Modell-Bereitstellungsname",
    },
    openAiEmbedding: {
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "OpenAI API-Schlüssel",
      modelPreference: "Modellpräferenz",
      availableModels: "Verfügbare Embedding-Modelle",
    },
    huggingFace: {
      endpointLabel: "HuggingFace Inferenz-Endpunkt",
      endpointPlaceholder: "https://example.endpoints.huggingface.cloud",
      accessTokenLabel: "HuggingFace Zugriffstoken",
      accessTokenPlaceholder: "HuggingFace Zugriffstoken",
      tokenLimitLabel: "Modell-Token-Limit",
      tokenLimitPlaceholder: "4096",
    },
    mistral: {
      apiKey: "Mistral API-Schlüssel",
      apiKeyPlaceholder: "Mistral API-Schlüssel",
      modelSelection: "Chat-Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
      waitingForApiKey: "-- warte auf API-Schlüssel --",
      availableModels: "Verfügbare Mistral-Modelle",
    },
    fireworksAi: {
      apiKey: "Fireworks AI API-Schlüssel",
      apiKeyPlaceholder: "Fireworks AI API-Schlüssel",
      modelSelection: "Chat-Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
    },
    chromaCloud: {
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "ck-your-api-key-here",
      tenantId: "Tenant-ID",
      tenantIdPlaceholder: "your-tenant-id-here",
      databaseName: "Datenbankname",
      databaseNamePlaceholder: "your-database-name",
    },
    chromaDb: {
      endpointLabel: "Chroma-Endpunkt",
      endpointPlaceholder: "http://localhost:8000",
      apiHeader: "API-Header",
      apiHeaderPlaceholder: "X-Api-Key",
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "sk-myApiKeyToAccessMyChromaInstance",
    },
    milvusDb: {
      addressLabel: "Milvus-DB-Adresse",
      addressPlaceholder: "http://localhost:19530",
      username: "Milvus-Benutzername",
      usernamePlaceholder: "Benutzername",
      password: "Milvus-Passwort",
      passwordPlaceholder: "Passwort",
    },
    nativeEmbedding: {
      modelPreference: "Modellpräferenz",
      loadingModels: "--verfügbare Modelle werden geladen--",
      availableModels: "Verfügbare Embedding-Modelle",
      trainedOn: "Trainiert auf:",
      downloadSize: "Download-Größe:",
      viewModelCard: "Modellkarte auf Hugging Face anzeigen \u2192",
    },
    gemini: {
      apiKey: "Gemini API-Schlüssel",
      apiKeyPlaceholder: "Gemini API-Schlüssel",
      modelSelection: "Chat-Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
    },
    openAi: {
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "OpenAI API-Schlüssel",
      modelSelection: "Chat-Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
    },
  },
  chat_window: {
    sources: "Quellen",
    agents: "Agenten",
    enhance_prompt: "Prompt verbessern",
    similarity_match: "Ähnlichkeitsabgleich",
    attachments_processing: "Anhänge werden verarbeitet. Bitte warten...",
    send_message: "Schreibe eine Nachricht",
    attach_file: "Füge eine Datei zum Chat hinzu",
    text_size: "Ändere die Größe des Textes.",
    microphone: "Spreche deinen Prompt ein.",
    send: "Versende den Prompt an den Workspace.",
    tts_speak_message: "Nachricht vorlesen (TTS)",
    at_agent: "@agent",
    default_agent_description: "Standard-Agent — verwendet Tools automatisch",
    pause_tts_speech_message: "TTS-Sprachausgabe pausieren",
    copy: "Kopieren",
    regenerate: "Neu generieren",
    regenerate_response: "Antwort neu generieren",
    good_response: "Gute Antwort",
    more_actions: "Weitere Aktionen",
    fork: "Abzweigen",
    delete: "Löschen",
    cancel: "Abbrechen",
    edit_prompt: "Prompt bearbeiten",
    edit_response: "Antwort bearbeiten",
    preset_reset_description: "Chatverlauf löschen und neuen Chat starten",
    add_new_preset: "Neues Preset anlegen",
    command: "Befehl",
    your_command: "dein-befehl",
    placeholder_prompt: "Dieser Text wird vor deinem Prompt eingefügt.",
    description: "Beschreibung",
    placeholder_description: "Antwortet mit einem Gedicht über LLMs.",
    save: "Speichern",
    small: "Klein",
    normal: "Standard",
    large: "Groß",
    workspace_llm_manager: {
      search: "LLM-Provider durchsuchen",
      loading_workspace_settings: "Workspace-Einstellungen werden geladen",
      available_models: "Verfügbare Modelle von {{provider}}",
      available_models_description:
        "Wählen Sie ein Modell für diesen Workspace",
      save: "Modell verwenden",
      saving: "Standardmodell für Workspace wird eingestellt...",
      missing_credentials: "Für diesen Anbieter fehlen Anmeldedaten!",
      missing_credentials_description: "Klicken, um Zugangsdaten einzurichten",
      general_models: "Allgemeine Modelle",
      discovered_models: "Erkannte Modelle",
    },
    submit: "Absenden",
    edit_info_user:
      '"Absenden" generiert die Antwort des KI-Systems neu. "Speichern" aktualisiert lediglich Ihre Nachricht.',
    edit_info_assistant:
      "Ihre Änderungen werden direkt in diese Antwort gespeichert.",
    see_less: "Weniger anzeigen",
    see_more: "Mehr anzeigen",
    tools: "Werkzeuge",
    text_size_label: "Schriftgröße",
    select_model: "Modell auswählen",
    attach_menu: {
      add_files: "Dateien hinzufügen",
      current_sources: "Aktuelle Quellen",
      add_from_url: "Aus URL einfügen",
      import_from_github: "Aus GitHub importieren",
      create_from_bitbucket: "Aus Bitbucket erstellen",
      upload_from_computer: "Vom Computer hochladen",
      github_coming_soon: "GitHub-Integration kommt bald",
      bitbucket_coming_soon: "Bitbucket-Integration kommt bald",
      loading: "Wird geladen...",
      no_sources: "Keine Quellen verfügbar",
      no_workspace:
        "Kein Workspace verfügbar. Sende zuerst eine Nachricht, um einen Workspace zu erstellen.",
      add_success: "Quelle zum Workspace hinzugefügt",
      add_failed: "Quelle konnte nicht hinzugefügt werden",
      url_hint:
        "Füge die URL einer Webseite oder eines YouTube-Videos ein, um sie als Quelle hinzuzufügen.",
      url_submit: "Quelle hinzufügen",
      url_submitting: "Wird hinzugefügt...",
      url_success: "URL als Quelle hinzugefügt",
      url_failed: "URL konnte nicht hinzugefügt werden",
      url_invalid:
        "Ungültige URL. Bitte prüfe das Format (z.B. https://example.com).",
      url_incomplete:
        "Bitte gib eine vollständige Web-Adresse ein (z.B. example.com).",
      url_server_error:
        "Server-Fehler beim Laden der URL ({{status}} {{statusText}})",
    },
    source_filter_label: "Quellen-Filter",
    source_filter_all: "Alle",
    source_filter_documents: "Dokumente",
    source_filter_media: "Medien",
    no_sources_filter: "Keine Quellen für Filter '{{filter}}' gefunden",
    workspace_sources: "Workspace-Quellen",
    no_workspace_sources:
      "Keine Workspace-Quellen verfügbar. Füge Dokumente, Links oder APIs in den Workspace-Einstellungen hinzu.",
    no_chats: "Noch keine Chats vorhanden.",
    chats_tab: "Chats",
    files_tab: "Dateien",
    urls_tab: "URLs",
    no_urls: "Noch keine URLs hinzugefügt.",
    default_thread: "Standard",
    source_type_url: "URL",
    source_type_database: "Datenbank",
    source_type_document: "Dokument",
    metrics_show_on_hover: "Klicken, um Metriken nur beim Hover anzuzeigen",
    metrics_show_when_available:
      "Klicken, um Metriken anzuzeigen sobald sie verfügbar sind",
    document: "Dokument",
    source_count_one: "{{count}} Referenz",
    source_count_other: "{{count}} Verweise",
    add_new: "Neu hinzufügen",
    edit: "Bearbeiten",
    publish: "Veröffentlichen",
    stop_generating: "Stoppen Sie die Generierung von Antworten",
    slash_commands: "Befehlszeilen",
    agent_skills: "Fähigkeiten von Agenten",
    manage_agent_skills: "Verwalten Sie die Fähigkeiten von Agenten",
    agent_skills_disabled_in_session:
      "Es ist nicht möglich, während einer aktiven Sitzung die Fähigkeiten zu ändern. Verwenden Sie zuerst den Befehl `/exit`, um die Sitzung zu beenden.",
    start_agent_session: "Starte eine Agent-Sitzung",
    use_agent_session_to_use_tools:
      'Sie können Tools im Chat nutzen, indem Sie eine Agentensitzung mit "@agent" am Anfang Ihrer Anfrage starten.',
    agent_invocation: {
      model_wants_to_call: "Das Modell möchte anrufen.",
      approve: "Genehmigen",
      reject: "Ablehnen",
      always_allow: "Bitte stellen Sie immer {{skillName}} sicher.",
      tool_call_was_approved:
        "Die Genehmigung für die Bestellung der Werkzeuge wurde erteilt.",
      tool_call_was_rejected: "Die Anfrage nach dem Werkzeug wurde abgelehnt.",
      clarifying_skip: "Lassen Sie den Agenten entscheiden.",
      clarifying_submit: "Absenden",
      clarifying_skipped: "Sie lassen den Agenten die Entscheidung treffen.",
      clarifying_timeout: "Keine Antwort wurde rechtzeitig eingereicht.",
      clarifying_pagination: "{{current}} von {{total}}",
      clarifying_prev_aria: "Vorherige Frage",
      clarifying_next_aria: "Nächste Frage",
      clarifying_close_aria: "Schließen und überspringen",
      clarifying_other: "Andere",
      clarifying_other_placeholder: "Geben Sie Ihre Antwort ein",
      batch_progress: "{{answered}} von {{total}} hat geantwortet",
      batch_skip_this: "Überspringen",
      batch_submit_all: "Alle Dokumente einreichen",
      batch_next: "Nächster",
      answer_skipped: "[Benutzer übersprungen]",
    },
    custom_skills: "Individuelle Fähigkeiten",
    agent_flows: "Datenströme",
    no_tools_found: "Keine passenden Werkzeuge gefunden.",
    loading_mcp_servers: "MCP-Server laden...",
    app_integrations: "Anwendungen und Integrationen",
    sub_skills: "Spezifische Fähigkeiten",
    memories: {
      title: "Erinnerungen",
      empty:
        "Bisher gibt es keine Erinnerungen. Wenn Sie jedoch mehr mit dem Chatbot interagieren, werden weitere Erinnerungen erstellt oder",
      empty_cta: "erstellen Sie einen neuen Speicher",
      tab_workspace: "Arbeitsbereich",
      tab_global: "Global",
      tab_sources: "Quellen",
      count: "({{current}}/{{max}})",
      toggle: {
        label: "Personalisierung aktivieren",
        description:
          "Ermöglichen Sie Ihrem Assistenten, Informationen über Sie oder diesen Arbeitsbereich zu speichern und diese Informationen in Gesprächen zu verwenden.",
      },
      auto_extraction: {
        label: "Automatische Erinnerungen",
        description:
          "Lassen Sie Ihren Assistenten automatisch Erinnerungen erstellen, ohne dass Sie aktiv eingreifen müssen.",
      },
      menu: {
        edit: "Bearbeiten",
        delete: "Löschen",
        move_to_global: "Internationalisieren",
        move_to_workspace: "Wechsel zu Arbeitsbereich",
      },
      modal: {
        create_title: "Erinnerung schaffen",
        edit_title: "Speicher bearbeiten",
        create_description:
          "Erinnerungen sollten eine einzelne, prägnante Aussage sein. Zum Beispiel: „Benutzer bevorzugt Python gegenüber JavaScript“",
        edit_description: "Aktualisieren Sie den Inhalt dieses Speichers.",
        label: "Gedächtnis",
        placeholder:
          "z.B. Benutzername: Joe, Benutzer arbeitet an OpenSIN Chat, usw.",
        create: "Erstellen",
        save: "Speichern",
        cancel: "Abbrechen",
      },
    },
    stt_unsupported:
      "Die Verwendung eines Mikrofons ist in diesem Browser nicht möglich.",
    stt_mic_denied:
      "Es konnte nicht auf das Mikrofon zugegriffen werden. Bitte erteilen Sie die erforderlichen Berechtigungen und versuchen Sie es erneut.",
    stt_transcription_failed: "Transkription fehlgeschlagen: {{error}}",
    stt_mic_access_denied:
      "OpenSIN Chat hat keinen Zugriff auf das Mikrofon. Bitte aktivieren Sie den Zugriff für diese Website, um diese Funktion zu nutzen.",
    chart_loading: "Diagramm wird geladen...",
  },
  dndWrapper: {
    addAnything: "Fügen Sie etwas hinzu",
    dropFileOrImage: "Legen Sie eine Datei oder ein Bild hier ab, um es an Ihr",
    workspaceAutoMagically: "Workspace automatisch anzuhängen.",
    filesEmbedded_one: "{{count}} Datei erfolgreich eingebettet",
    filesEmbedded_other: "{{count}} Dateien erfolgreich eingebettet",
    dragAndDropIcon: "Drag-and-Drop-Symbol",
    processorOffline:
      "Dokumentenprozessor ist offline. Bitte versuchen Sie es später erneut.",
    embedFailed: "Einbetten der Datei(en) fehlgeschlagen.",
  },
  common: {
    "workspaces-name": "Namen der Workspaces",
    workspaceNamePlaceholder: "Mein Workspace",
    selection: "Modellauswahl",
    saving: "Speichern...",
    save: "Änderungen speichern",
    previous: "Vorherige Seite",
    next: "Nächste Seite",
    optional: "Optional",
    yes: "Ja",
    no: "Nein",
    search: "Suchen",
    username_requirements:
      "Der Benutzername muss 2-32 Zeichen lang sein, mit einem Kleinbuchstaben beginnen und darf nur Kleinbuchstaben, Zahlen, Unterstriche, Bindestriche und Punkte enthalten.",
    on: "Über",
    none: "Keine",
    stopped: "Gestoppt",
    loading: "Laden",
    refresh: "Erfrischen",
    // Common UI strings - merged from second block (fix #120)
    show: "Anzeigen",
    hide: "Ausblenden",
    submit: "Absenden",
    off: "Aus",
    saveChanges: "Änderungen speichern",
    unsavedChanges: "Ungespeicherte Änderungen",
    unsavedChangesDescription:
      "Sie haben ungespeicherte Änderungen. Möchten Sie diese Seite wirklich verlassen?",
    stayOnPage: "Auf Seite bleiben",
    discardAndLeave: "Verwerfen & Verlassen",
    logo: "Logo",
    agent: "Agent",
    logoAlt: "{{name}} Logo",
    favicon: "Favicon",
    profile: "Profil",
    demoAccount: "Demo-Konto",
    documentation: "Dokumentation",
    feedback: "Feedback",
    preferences: "Präferenzen",
    signOut: "Abmelden",
    signIn: "Anmelden",
    theme: "Design",
    themeSystem: "System",
    themeLight: "Hell",
    themeDark: "Dunkel",
    expand: "Ausklappen",
    collapse: "Einklappen",
    language: "Sprache",
    updating: "Aktualisieren...",
    updateWorkspace: "Workspace aktualisieren",
    speakMessage: "Nachricht vorlesen",
    pauseSpeech: "Vorlesen pausieren",
    openaiApiKey: "OpenAI API-Schlüssel",
    userProfilePicture: "Benutzerprofilbild",
    importing: "Importieren...",
    thoughtsHide: "Gedanken ausblenden",
    name: "Name",
    bearer: "Bearer",
    default: "Standard",
    branch: "Branch",
    agentSkills: "Agenten-Fähigkeiten",
    viewingText: "Text anzeigen",
    viewThoughts: "Gedanken anzeigen",
    provider: "Anbieter",
    openBuilder: "Builder öffnen",
    manager: "Manager",
    customSkills: "Benutzerdefinierte Fähigkeiten",
    createFlow: "Flow erstellen",
    chatEmbed: "Chat einbetten",
    back: "Zurück",
    appIntegrations: "App-Integrationen",
    agentFlows: "Agenten-Flows",
    administrator: "Administrator",
    verifiedCode: "Verifizierter Code",
    verified: "Verifiziert",
    variables: "Variablen",
    users: "Benutzer",
    url: "URL",
    unverified: "Nicht verifiziert",
    stopDemo: "Demo stoppen",
    settings: "Einstellungen",
    selectExperimentalFeature: "Experimentelle Funktion auswählen",
    selectAll: "Alle auswählen",
    rename: "Umbenennen",
    readAccess: "Lesezugriff auf das Datenbankschema",
    // Zusätzliche gemeinsame UI-Strings (i18n-Warnungsbehebungen)
    addBlock: "Block hinzufügen",
    cached: "Zwischengespeichert",
    clearUrl: "URL löschen",
    close: "Schließen",
    contactAdministrator:
      "Bitte wenden Sie sich an den Systemadministrator bezüglich dieses Fehlers.",
    continue: "Weiter",
    couldNotRespond: "Konnte nicht auf die Nachricht antworten.",
    delete: "Löschen",
    dragToResizeWidth: "Ziehen, um die Breite zu ändern",
    edit: "Bearbeiten",
    error: "Fehler: {{error}}",
    getOnGooglePlay: "Bei Google Play herunterladen",
    importCommunityItem: "Community-Element importieren",
    importWithArrow: "Importieren \u2192",
    llmSelector: "LLM-Auswahl",
    mcpLogo: "MCP-Logo",
    message: "Nachricht",
    moreOptions: "Weitere Optionen",
    noneSelected: "Keine Auswahl",
    noConfigurationNeeded:
      "Für diesen Anbieter ist keine Konfiguration erforderlich.",
    providerConnectivity: "Anbieter-Konnektivität",
    prompt: "Prompt",
    remove: "Entfernen",
    resizeRightSidebar: "Rechte Seitenleiste skalieren",
    rightSidebar: "Rechte Seitenleiste",
    hideSidebar: "Seitenleiste ausblenden",
    showSidebar: "Seitenleiste einblenden",
    routingToModel: "Modell wird geroutet...",
    searchEmbeddingProviders: "Alle Einbettungsanbieter durchsuchen",
    searchLLMProviders: "Alle LLM-Anbieter durchsuchen",
    searchLLMProvidersAvailable: "Verfügbare LLM-Anbieter durchsuchen",
    searchVectorDatabaseProviders: "Alle Vektordatenbank-Anbieter durchsuchen",
    searchWebSearchProviders: "Verfügbare Websuche-Anbieter durchsuchen",
    selectAgentSkillFlowMcp:
      "Wählen Sie eine Agenten-Fähigkeit, einen Agenten-Flow oder einen MCP-Server",
    selectAnLLM: "Sie müssen ein LLM auswählen",
    stopGenerating: "Generierung stoppen",
    threads: "Threads",
    uploadedLogo: "Hochgeladenes Logo",
    viewDocumentation: "Dokumentation anzeigen",
    webSearch: "Websuche",
    words: "{{count}} Wörter",
    workspaceUpdated: "Workspace aktualisiert!",
    docs: "Docs",
    developerDocs: "Entwickler-Dokumentation",
    docsNotFound: "Seite nicht gefunden",
    docsNotFoundDesc:
      "Das angeforderte Dokument existiert nicht oder wurde verschoben.",
    docsHomepage: "Zur Startseite der Docs",
    docsNavLabel: "Dokumentations-Navigation",
    docsSearchPlaceholder: "Dokumentation durchsuchen...",
    docsSearchLabel: "Dokumentation durchsuchen",
    noResultsForQuery: 'Keine Treffer für „{{query}}".',
    toggleNavigation: "Navigation umschalten",
    backToApp: "Zurück zur App",
    docsOnThisPage: "Auf dieser Seite",
    docsCopyCode: "Code kopieren",
    docsCodeCopied: "Kopiert!",
    docsLandingSubtitle:
      "Alles, was du zum Verstehen, Betreiben und Erweitern von OpenSIN Chat brauchst.",
    docsBrowseCategory: "Kategorie ansehen",
    docsPrevious: "Zurück",
    docsNext: "Weiter",
    docsEditOnGithub: "Auf GitHub bearbeiten",
    docsPagesCount_one: "{{count}} Seite",
    docsPagesCount_other: "{{count}} Seiten",
    docsCategories: {
      gettingStarted: "Erste Schritte",
      api: "API-Referenz",
      architecture: "Architektur",
      dataSources: "Datenquellen & Sync",
      deployment: "Deployment & Betrieb",
      operations: "Sicherheit & Betrieb",
    },
    methods: {
      put: "PUT",
      post: "POST",
      patch: "PATCH",
      get: "GET",
      delete: "DELETE",
    },
  },
  settings: {
    title: "Instanzeinstellungen",
    invites: "Einladungen",
    users: "Benutzer",
    workspaces: "Workspaces",
    "workspace-chats": "Workspace-Chats",
    customization: "Personalisierung",
    interface: "UI-Einstellungen",
    branding: "Branding & Whitelabeling",
    chat: "Chat",
    "api-keys": "Entwickler-API",
    llm: "LLM",
    transcription: "Transkription",
    embedder: "Einbettung",
    "text-splitting": "Textsplitting & Chunking",
    "voice-speech": "Sprache & Sprachausgabe",
    "vector-database": "Vektordatenbank",
    embeds: "Chat-Einbettung",
    security: "Sicherheit",
    "event-logs": "Ereignisprotokolle",
    terminal: "Terminal",
    privacy: "Datenschutz & Datenverarbeitung",
    "ai-providers": "KI-Anbieter",
    "agent-skills": "Agentenfähigkeiten",
    admin: "Administrator",
    tools: "Werkzeuge",
    "experimental-features": "Experimentelle Funktionen",
    contact: "Support kontaktieren",
    "browser-extension": "Browser-Extension",
    "system-prompt-variables": "Systempromptvariablen",
    "mobile-app": "OpenSIN Chat Mobile",
    "community-hub": {
      title: "Community Hub",
      trending: "Neuigkeiten",
      "your-account": "Community Hub Account",
      "import-item": "Community Import",
    },
    channels: "Kanäle",
    "available-channels": {
      telegram: "Telegram",
    },
    "scheduled-jobs": "Geplante Aufgaben",
    "model-router": "Modell-Router",
    customAppName: {
      placeholder: "OpenSIN Chat",
      clear: "Löschen",
      save: "Speichern",
      updateSuccess: "App-Name erfolgreich aktualisiert.",
      updateFailed: "App-Name konnte nicht aktualisiert werden: {{error}}",
    },
    supportEmail: {
      placeholder: "support@meinefirma.com",
      clear: "Löschen",
      save: "Speichern",
      updateSuccess: "Support-E-Mail erfolgreich aktualisiert.",
      updateFailed:
        "Support-E-Mail konnte nicht aktualisiert werden: {{error}}",
    },
  },
  login: {
    "multi-user": {
      welcome: "Willkommen",
      "placeholder-username": "Benutzername",
      "placeholder-password": "Passwort",
      login: "Anmelden",
      validating: "Überprüfung...",
      "forgot-pass": "Passwort vergessen",
      reset: "Zurücksetzen",
      errorPrefix: "Fehler: {{error}}",
    },
    "single-user": {
      password: "Passwort",
    },
    "sign-in": "Melden Sie sich bei Ihrem {{appName}} Konto an.",
    "password-reset": {
      title: "Passwort zurücksetzen",
      description:
        "Geben Sie die erforderlichen Informationen unten ein, um Ihr Passwort zurückzusetzen.",
      "recovery-codes": "Wiederherstellungscodes",
      "back-to-login": "Zurück zur Anmeldung",
    },
  },
  "main-page": {
    workspaceSources: {
      title: "Quellen des Workspace",
      add: "Quellen hinzufügen",
      empty:
        "Noch keine Quellen vorhanden.\nLade Dokumente hoch oder füge URLs hinzu, um dem Chat mehr Kontext zu geben.",
      type_document: "Dokument",
      type_url: "URL",
      type_db: "Datenbank",
    },
    greeting: "Wie kann ich Ihnen heute helfen?",
  },
  "new-workspace": {
    title: "Neuer Workspace",
    placeholder: "Mein Workspace",
  },
  "workspaces—settings": {
    general: "Allgemeine Einstellungen",
    chat: "Chat-Einstellungen",
    vector: "Vektordatenbank",
    members: "Mitglieder",
    agent: "Agentenkonfiguration",
  },
  general: {
    vector: {
      title: "Vektoranzahl",
      description: "Gesamtanzahl der Vektoren in Ihrer Vektordatenbank.",
    },
    names: {
      description: "Dies ändert nur den Anzeigenamen Ihres Workspace.",
    },
    message: {
      title: "Vorgeschlagene Chat-Nachrichten",
      description:
        "Passen Sie die Nachrichten an, die Ihren Workspace-Benutzern vorgeschlagen werden.",
      add: "Neue Nachricht hinzufügen",
      save: "Nachrichten speichern",
      heading: "Erkläre mir",
      body: "die Vorteile von OpenSIN Chat",
      maxMessages: "Maximal 4 Nachrichten erlaubt.",
      saveFailed:
        "Fehler beim Aktualisieren der vorgeschlagenen Chat-Nachrichten: {{error}}",
    },
    delete: {
      title: "Workspace löschen",
      description:
        "Löschen Sie diesen Workspace und alle seine Daten. Dies löscht den Workspace für alle Benutzer.",
      delete: "Workspace löschen",
      deleting: "Workspace wird gelöscht...",
      deleteFailed: "Workspace konnte nicht gelöscht werden!",
      "confirm-start": "Sie sind dabei, Ihren gesamten",
      "confirm-end":
        "Workspace zu löschen. Dies entfernt alle Vektoreinbettungen in Ihrer Vektordatenbank.\n\nDie ursprünglichen Quelldateien bleiben unberührt. Diese Aktion ist irreversibel.",
    },
  },
  chat: {
    aria: {
      chatHistory: "Chat-Verlauf",
      streamingResponse: "KI antwortet…",
      errorMessage: "Ein Fehler ist aufgetreten",
    },
    llm: {
      title: "Workspace-LLM-Anbieter",
      description:
        "Der spezifische LLM-Anbieter und das Modell, das für diesen Workspace verwendet wird. Standardmäßig wird der System-LLM-Anbieter und dessen Einstellungen verwendet.",
      search: "Durchsuchen Sie alle LLM-Anbieter",
    },
    model: {
      title: "Workspace-Chat-Modell",
      description:
        "Das spezifische Chat-Modell, das für diesen Workspace verwendet wird. Wenn leer, wird die System-LLM-Präferenz verwendet.",
      waitingForModels: "-- Modelle werden geladen --",
      generalModels: "Allgemeine Modelle",
      discoveredModels: "Erkannte Modelle",
    },
    mode: {
      title: "Chat-Modus",
      chat: {
        title: "Chat",
        description:
          "wird Antworten basierend auf dem allgemeinen Wissen des LLM und dem gegebenen Dokumentkontext liefern.<br />Um die Tools zu nutzen, müssen Sie den Befehl `@agent` verwenden.",
      },
      query: {
        title: "Abfrage",
        description:
          'werden Antworten nur bei <b> und </b> bereitstellen, falls der Dokumentkontext gefunden wurde. Um die Tools zu nutzen, müssen Sie den Befehl "@agent" verwenden.',
      },
      automatic: {
        description:
          "wird automatisch Werkzeuge verwenden, wenn das Modell und der Anbieter native Werkzeugaufrufe unterstützen. <br />Wenn native Werkzeugaufrufe nicht unterstützt werden, müssen Sie den Befehl `@agent` verwenden, um Werkzeuge zu nutzen.",
        title: "Vertreter",
      },
    },
    history: {
      title: "Chat-Verlauf",
      "desc-start":
        "Die Anzahl der vorherigen Chats, die in das Kurzzeitgedächtnis der Antwort einbezogen werden.",
      recommend: "Empfohlen 20. ",
      "desc-end":
        "Alles über 45 führt wahrscheinlich zu kontinuierlichen Chat-Ausfällen, abhängig von der Nachrichtengröße.",
      empty: "Noch keine Nachrichten. Beginnen Sie das Gespräch.",
    },
    prompt: {
      title: "Prompt",
      description:
        "Der Prompt, der in diesem Workspace verwendet wird. Definieren Sie den Kontext und die Anweisungen für die KI, um eine Antwort zu generieren. Sie sollten einen sorgfältig formulierten Prompt bereitstellen, damit die KI eine relevante und genaue Antwort generieren kann.",
      history: {
        title: "Systemprompt-Historie",
        clearAll: "Alles löschen",
        noHistory: "Keine Einträge im Verlauf vorhanden",
        restore: "Wiederherstellen",
        delete: "Löschen",
        publish: "Im Community Hub veröffentlichen",
        deleteConfirm: "Möchten Sie diesen Eintrag wirklich löschen?",
        clearAllConfirm:
          "Möchten Sie wirklich alle Einträge löschen? Diese Aktion ist unwiderruflich.",
        expand: "Ausklappen",
      },
    },
    refusal: {
      title: "Abfragemodus-Ablehnungsantwort",
      "desc-start": "Wenn im",
      query: "Abfrage",
      "desc-end":
        "modus, möchten Sie vielleicht eine benutzerdefinierte Ablehnungsantwort zurückgeben, wenn kein Kontext gefunden wird.",
      "tooltip-title": "Warum sehe ich das?",
      "tooltip-description":
        "Sie befinden sich im Abfragemodus, der nur Informationen aus Ihren Dokumenten verwendet. Wechseln Sie in den Chat-Modus für flexiblere Gespräche oder klicken Sie hier, um unsere Dokumentation zu besuchen und mehr über Chat-Modi zu erfahren.",
      placeholder:
        "Der Text, der im Abfragemodus zurückgegeben wird, wenn kein relevanter Kontext für eine Antwort gefunden wurde.",
    },
    temperature: {
      title: "LLM-Temperatur",
      "desc-start":
        'Diese Einstellung steuert, wie "kreativ" Ihre LLM-Antworten sein werden.',
      "desc-end":
        "Je höher die Zahl, desto kreativer. Bei einigen Modellen kann dies zu unverständlichen Antworten führen, wenn sie zu hoch eingestellt ist.",
      hint: "Die meisten LLMs haben verschiedene akzeptable Bereiche gültiger Werte. Konsultieren Sie Ihren LLM-Anbieter für diese Informationen.",
    },
    messageInput: "Nachrichteneingabe",
  },
  "vector-workspace": {
    identifier: "Vektordatenbank-Identifikator",
    snippets: {
      title: "Maximale Kontext-Snippets",
      description:
        "Diese Einstellung steuert die maximale Anzahl von Kontext-Snippets, die pro Chat oder Abfrage an das LLM gesendet werden.",
      recommend: "Empfohlen: 4",
    },
    doc: {
      title: "Dokumentähnlichkeitsschwelle",
      description:
        "Der minimale Ähnlichkeitswert, der erforderlich ist, damit eine Quelle als relevant für den Chat betrachtet wird. Je höher die Zahl, desto ähnlicher muss die Quelle dem Chat sein.",
      zero: "Keine Einschränkung",
      low: "Niedrig (Ähnlichkeitswert ≥ .25)",
      medium: "Mittel (Ähnlichkeitswert ≥ .50)",
      high: "Hoch (Ähnlichkeitswert ≥ .75)",
    },
    reset: {
      reset: "Vektordatenbank zurücksetzen",
      resetting: "Vektoren werden gelöscht...",
      confirm:
        "Sie sind dabei, die Vektordatenbank dieses Workspace zurückzusetzen. Dies entfernt alle derzeit eingebetteten Vektoreinbettungen.\n\nDie ursprünglichen Quelldateien bleiben unberührt. Diese Aktion ist irreversibel.",
      error: "Die Workspace-Vektordatenbank konnte nicht zurückgesetzt werden!",
      success: "Die Workspace-Vektordatenbank wurde zurückgesetzt!",
    },
  },
  agent: {
    provider: {
      title: "Workspace-Agent LLM-Anbieter",
      description:
        "Der spezifische LLM-Anbieter und das Modell, das für den @agent-Agenten dieses Workspace verwendet wird.",
    },
    mode: {
      chat: {
        title: "Workspace-Agent Chat-Modell",
        description:
          "Das spezifische Chat-Modell, das für den @agent-Agenten dieses Workspace verwendet wird.",
      },
      title: "Workspace-Agent-Modell",
      description:
        "Das spezifische LLM-Modell, das für den @agent-Agenten dieses Workspace verwendet wird.",
      wait: "-- warte auf Modelle --",
    },
    skill: {
      rag: {
        title: "RAG & Langzeitgedächtnis",
        description:
          'Erlauben Sie dem Agenten, Ihre lokalen Dokumente zu nutzen, um eine Abfrage zu beantworten oder bitten Sie den Agenten, Inhalte für den Langzeitabruf zu "merken".',
      },
      view: {
        title: "Dokumente anzeigen & zusammenfassen",
        description:
          "Erlauben Sie dem Agenten, den Inhalt der aktuell eingebetteten Workspace-Dateien aufzulisten und zusammenzufassen.",
      },
      scrape: {
        title: "Websites durchsuchen",
        description:
          "Erlauben Sie dem Agenten, Websites zu besuchen und deren Inhalt zu extrahieren.",
      },
      generate: {
        title: "Diagramme generieren",
        description:
          "Aktivieren Sie den Standard-Agenten, um verschiedene Arten von Diagrammen aus bereitgestellten oder im Chat gegebenen Daten zu generieren.",
      },
      web: {
        title: "Live-Websuche und -Browsing",
        description:
          "Ermöglichen Sie Ihrem Agenten, das Internet zu durchsuchen, um Ihre Fragen zu beantworten, indem Sie eine Verbindung zu einem Anbieter von Web-Suchdiensten (SERP) herstellen.",
      },
      sql: {
        title: "SQL-Verbindung",
        description:
          "Ermöglichen Sie Ihrem Agenten, SQL zu nutzen, um Ihre Fragen zu beantworten, indem Sie eine Verbindung zu verschiedenen SQL-Datenbankanbietern herstellen.",
      },
      default_skill:
        "Standardmäßig ist diese Funktion aktiviert, aber Sie können sie deaktivieren, wenn Sie nicht möchten, dass sie für den Agenten verfügbar ist.",
      filesystem: {
        title: "Zugriff auf das Dateisystem",
        description:
          "Ermöglichen Sie Ihrem Agenten, Dateien innerhalb eines bestimmten Verzeichnisses zu lesen, zu schreiben, zu suchen und zu verwalten. Unterstützt die Bearbeitung von Dateien, die Navigation durch Verzeichnisse und die Suche nach Inhalten.",
        learnMore:
          "Erfahren Sie mehr darüber, wie Sie diese Fähigkeit effektiv einsetzen können.",
        configuration: "Konfiguration",
        readActions: "Lesen von Aktionen",
        writeActions: "Aktionen",
        warning:
          "Der Zugriff auf das Dateisystem kann gefährlich sein, da er Dateien ändern oder löschen kann. Bitte konsultieren Sie vor der Aktivierung die <a>Dokumentation</a>.",
        skills: {
          "read-text-file": {
            title: "Datei öffnen/lesen",
            description:
              "Inhalte von Dateien (Text, Code, PDF, Bilder usw.) lesen",
          },
          "read-multiple-files": {
            title: "Mehrere Dateien lesen",
            description: "Mehrere Dateien gleichzeitig lesen",
          },
          "list-directory": {
            title: "Verzeichnis",
            description: "Dateien und Verzeichnisse in einem Ordner auflisten",
          },
          "search-files": {
            title: "Dateien suchen",
            description: "Dateien nach Name oder Inhalt suchen",
          },
          "get-file-info": {
            title: "Dateieninformationen abrufen",
            description: "Erhalten Sie detaillierte Metadaten über Dateien.",
          },
          "edit-file": {
            title: "Datei bearbeiten",
            description:
              "Führen Sie Änderungen in Textdateien zeilenweise durch.",
          },
          "create-directory": {
            title: "Ordner erstellen",
            description: "Neue Verzeichnisse erstellen",
          },
          "move-file": {
            title: "Datei verschieben/umbenennen",
            description:
              "Dateien und Verzeichnisse verschieben oder umbenennen.",
          },
          "copy-file": {
            title: "Datei kopieren",
            description: "Dateien und Verzeichnisse kopieren",
          },
          "write-text-file": {
            title: "Textdatei erstellen",
            description:
              "Erstellen Sie neue Textdateien oder überschreiben Sie vorhandene Textdateien.",
          },
        },
      },
      createFiles: {
        title: "Dokumentenerstellung",
        description:
          "Ermöglichen Sie Ihrem Agenten, binäre Dokumentformate wie PowerPoint-Präsentationen, Excel-Tabellen, Word-Dokumente und PDFs zu erstellen. Die Dateien können direkt aus dem Chat-Fenster heruntergeladen werden.",
        configuration: "Verfügbare Dokumenttypen",
        skills: {
          "create-text-file": {
            title: "Textdateien",
            description:
              "Erstellen Sie Textdateien mit beliebigen Inhalten und Dateiendungen (.txt, .md, .json, .csv usw.)",
          },
          "create-pptx": {
            title: "Präsentationen mit PowerPoint",
            description:
              "Erstellen Sie neue PowerPoint-Präsentationen mit Folien, Überschriften und Stichpunkten.",
          },
          "create-pdf": {
            title: "PDF-Dokumente",
            description:
              "Erstellen Sie PDF-Dokumente aus Markdown- oder reinen Textdateien mit grundlegender Formatierung.",
          },
          "create-xlsx": {
            title: "Excel-Tabellen",
            description:
              "Erstellen Sie Excel-Dokumente für tabellarische Daten mit Tabellen und Formatierungen.",
          },
          "create-docx": {
            title: "Word-Dokumente",
            description:
              "Erstellen Sie Word-Dokumente mit grundlegender Formatierung und Gestaltung.",
          },
          "read-pdf-file": {
            title: "PDF lesen",
            description: "Text aus einer vorhandenen PDF-Datei extrahieren",
          },
        },
      },
      image_generation: {
        title: "Bildgenerierung",
        description:
          "Erstellen Sie Bilder mit jeder OpenAI-kompatiblen Bildgenerierungs-API. Konfigurieren Sie den Endpunkt, den API-Schlüssel und das Modell unten.",
        base_url: {
          label: "Basis-URL",
          required: "(Pflichtfeld)",
          placeholder: "https://api.openai.com",
          help: "Basis-URL für die OpenAI-kompatible API (z. B. {{example}})",
          invalid:
            "Bitte geben Sie eine gültige http://- oder https://-URL ein.",
        },
        api_key: {
          label: "API-Schlüssel",
          help: "Leer lassen, um den bestehenden Schlüssel zu behalten. Der gespeicherte Schlüssel wird im Browser nie angezeigt.",
          clear: "Gespeicherten API-Schlüssel beim Speichern entfernen",
        },
        model: {
          label: "Modell",
          placeholder: "dall-e-3",
          help: "Modellname für die Bildgenerierung. Häufige Modelle werden als Vorschläge angezeigt.",
        },
      },
      gmail: {
        title: "Gmail-Verbindung",
        description:
          "Ermöglichen Sie Ihrem Agenten, mit Gmail zu interagieren: E-Mails durchsuchen, E-Mail-Threads lesen, Entwürfe erstellen, E-Mails senden und Ihren Posteingang verwalten. <a>Lesen Sie die Dokumentation</a>.",
        multiUserWarning:
          "Die Integration mit Gmail ist aus Sicherheitsgründen nicht im Mehrbenutzermodus verfügbar. Bitte deaktivieren Sie den Mehrbenutzermodus, um diese Funktion zu nutzen.",
        configuration: "Gmail-Konfiguration",
        deploymentId: "Deployment-ID",
        deploymentIdHelp:
          "Die Bereitstellungs-ID Ihrer Google Apps Script Webanwendung",
        apiKey: "API-Schlüssel",
        apiKeyHelp:
          "Der API-Schlüssel, den Sie in Ihrer Google Apps Script-Bereitstellung konfiguriert haben",
        configurationRequired:
          "Bitte konfigurieren Sie die Deployment-ID und den API-Schlüssel, um die Gmail-Funktionen zu aktivieren.",
        configured: "Konfiguriert",
        searchSkills: "Suchfähigkeiten...",
        noSkillsFound: "Keine Ergebnisse zu Ihrer Suche.",
        categories: {
          search: {
            title: "Nachrichten suchen und lesen",
            description:
              "Suchen und lesen Sie E-Mails aus Ihrem Gmail-Posteingang.",
          },
          drafts: {
            title: "Entwurf-E-Mails",
            description:
              "Erstellen, bearbeiten und verwalten von E-Mail-Entwürfen",
          },
          send: {
            title: "E-Mails senden und beantworten",
            description:
              "Senden Sie E-Mails und antworten Sie sofort auf Nachrichten.",
          },
          threads: {
            title: "E-Mail-Verläufe verwalten",
            description:
              "E-Mail-Threads verwalten – als gelesen/unleserlich markieren, archivieren, in den Papierkorb verschieben",
          },
          account: {
            title: "Statistiken zur Integration",
            description:
              "Anzeigen von Postfachstatistiken und Kontoinformationen",
          },
        },
        skills: {
          search: {
            title: "E-Mails durchsuchen",
            description: "E-Mails mit der Gmail-Suchsyntax durchsuchen",
          },
          readThread: {
            title: "Den Thread lesen",
            description:
              "Lesen Sie den vollständigen E-Mail-Thread anhand der ID",
          },
          createDraft: {
            title: "Entwurf erstellen",
            description: "Erstelle eine neue Entwurf-E-Mail",
          },
          createDraftReply: {
            title: "Entwurf für Antwort erstellen",
            description:
              "Erstellen Sie eine Entwurfsantwort an ein bestehendes Thema.",
          },
          updateDraft: {
            title: "Entwurf aktualisieren",
            description: "Eine bestehende Entwurf-E-Mail aktualisieren",
          },
          getDraft: {
            title: "Entwurf anfordern",
            description:
              "Eine bestimmte Entwurfversion anhand ihrer ID abrufen.",
          },
          listDrafts: {
            title: "Entwürfe",
            description: "Liste alle Entwurf-E-Mails auf",
          },
          deleteDraft: {
            title: "Entwurf löschen",
            description: "Einen Entwurf für eine E-Mail löschen",
          },
          sendDraft: {
            title: "Entwurf senden",
            description: "Senden Sie eine bestehende Entwurf-E-Mail",
          },
          sendEmail: {
            title: "E-Mail senden",
            description: "Senden Sie sofort eine E-Mail.",
          },
          replyToThread: {
            title: "Antwort auf den Thread",
            description: "Antworten Sie umgehend auf einen E-Mail-Thread.",
          },
          markRead: {
            title: "Mark Read",
            description: "Markiere einen Thread als gelesen.",
          },
          markUnread: {
            title: "Als nicht gelesen markieren",
            description: "Markiere einen Thread als nicht gelesen.",
          },
          moveToTrash: {
            title: "In den Papierkorb verschieben",
            description: "Ein Thema in den Papierkorb verschieben",
          },
          moveToArchive: {
            title: "Archiv",
            description: "Thread archivieren",
          },
          moveToInbox: {
            title: "Zum Posteingang verschieben",
            description: "Einen Thread in den Posteingang verschieben",
          },
          getMailboxStats: {
            title: "Statistiken für E-Mail-Postfach",
            description:
              "Erhalten Sie Informationen über die Anzahl nicht gelesener E-Mails und Statistiken für Ihr Postfach.",
          },
          getInbox: {
            title: "E-Mail-Postfach öffnen",
            description:
              "Ein einfacher und effizienter Weg, um E-Mails aus dem Gmail-Posteingang zu erhalten.",
          },
        },
      },
      outlook: {
        title: "Outlook-Verbindung",
        description:
          "Ermöglichen Sie Ihrem Agenten, mit Microsoft Outlook zu interagieren – Suchen Sie E-Mails, lesen Sie Threads, erstellen Sie Entwürfe, senden Sie E-Mails und verwalten Sie Ihren Posteingang über die Microsoft Graph API. <a> Lesen Sie die Dokumentation</a>.",
        multiUserWarning:
          "Die Integration mit Outlook ist aus Sicherheitsgründen nicht im Mehrbenutzermodus verfügbar. Um diese Funktion nutzen zu können, bitte den Mehrbenutzermodus deaktivieren.",
        configuration: "Konfiguration von Outlook",
        authType: "Kontotyp",
        authTypeHelp:
          "Wählen Sie, welche Arten von Microsoft-Konten zur Authentifizierung verwendet werden können. „Alle Konten“ unterstützt sowohl persönliche als auch Arbeits-/Schulkonten. „Nur persönliche Konten“ beschränkt sich auf persönliche Microsoft-Konten. „Nur Arbeits-/Schulkonten“ beschränkt sich auf Arbeits-/Schulkonten eines bestimmten Azure AD-Mandanten.",
        authTypeCommon: "Alle Konten (persönliche und Arbeits-/Schulkonten)",
        authTypeConsumers: "Nur persönliche Microsoft-Konten",
        authTypeOrganization:
          "Nur Konten für Organisationen (benötigt eine Tenant-ID)",
        clientId: "Anwendungs-ID (Kunden-ID)",
        clientIdHelp:
          "Die Anwendungs-ID (Client-ID) von Ihrer Azure AD-Anwendung",
        tenantId: "Verzeichnis-ID (Mieter)",
        tenantIdHelp:
          "Die Verzeichnis-ID (für den Mieter) aus Ihrer Azure AD-App-Registrierung. Dies ist nur für die Authentifizierung innerhalb einer Organisation erforderlich.",
        clientSecret: "Client-Schlüssel",
        clientSecretHelp:
          "Der geheime Wert, den Sie für die Registrierung Ihrer Azure AD-Anwendung festgelegt haben.",
        clientSecretPlaceholder: "Ihr Client-Schlüssel...",
        uuidPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        configurationRequired:
          "Bitte konfigurieren Sie die Client-ID und den Client-Schlüssel, um die Outlook-Funktionen zu aktivieren.",
        authRequired:
          "Speichern Sie zuerst Ihre Anmeldedaten, und anschließend melden Sie sich bei Microsoft an, um die Einrichtung abzuschließen.",
        authenticateWithMicrosoft: "Mit Microsoft anmelden",
        authenticated: "Erfolgreiche Authentifizierung mit Microsoft Outlook.",
        revokeAccess: "Zugriff widerrufen",
        configured: "Konfiguriert",
        searchSkills: "Suchfähigkeiten...",
        noSkillsFound:
          "Keine der angebotenen Fähigkeiten passen zu Ihrer Suche.",
        categories: {
          search: {
            title: "Nachrichten suchen und lesen",
            description:
              "Suchen und lesen Sie E-Mails aus Ihrem Outlook-Posteingang.",
          },
          drafts: {
            title: "Entwurf-E-Mails",
            description:
              "Erstellen, bearbeiten und verwalten von E-Mail-Entwürfen",
          },
          send: {
            title: "E-Mails versenden",
            description:
              "Neue E-Mails senden oder sofort auf Nachrichten antworten",
          },
          account: {
            title: "Statistiken zur Integration",
            description:
              "Anzeigen von Postfachstatistiken und Kontoinformationen",
          },
        },
        skills: {
          getInbox: {
            title: "E-Mail-Postfach öffnen",
            description:
              "Abrufen von aktuellen E-Mails aus Ihrem Outlook-Posteingang",
          },
          search: {
            title: "E-Mails durchsuchen",
            description:
              "E-Mails mithilfe der Syntax von Microsoft Search durchsuchen",
          },
          readThread: {
            title: "Lesen der Konversation",
            description: "Den vollständigen E-Mail-Austausch durchlesen.",
          },
          createDraft: {
            title: "Entwurf erstellen",
            description:
              "Erstellen Sie eine neue Entwurf-E-Mail oder einen Entwurf-Antwort auf eine bestehende Nachricht.",
          },
          updateDraft: {
            title: "Entwurf aktualisieren",
            description: "Aktualisieren Sie eine bestehende Entwurf-E-Mail",
          },
          listDrafts: {
            title: "Entwurf-Listen",
            description: "Zeigen Sie alle Entwurfse-Mails an",
          },
          deleteDraft: {
            title: "Entwurf löschen",
            description: "Einen Entwurf einer E-Mail löschen",
          },
          sendDraft: {
            title: "Entwurf senden",
            description: "Senden Sie eine bestehende E-Mail-Entwurf",
          },
          sendEmail: {
            title: "E-Mail senden",
            description:
              "Senden Sie eine neue E-Mail oder antworten Sie sofort auf eine bestehende Nachricht.",
          },
          getMailboxStats: {
            title: "Statistiken für den Posteingang",
            description:
              "Erhalten Sie Informationen über die Anzahl der Ordner und Statistiken für E-Mail-Postfächer.",
          },
        },
      },
      googleCalendar: {
        title: "Google Kalender-Verbindung",
        description:
          "Ermöglichen Sie Ihrem Agenten, mit Google Kalender zu interagieren – Kalender anzeigen, Ereignisse einsehen, erstellen und aktualisieren, sowie Rückmeldungen verwalten. <a> Lesen Sie die Dokumentation </a>.",
        multiUserWarning:
          "Die Integration mit Google Kalender ist aus Sicherheitsgründen nicht im Mehrbenutzermodus verfügbar. Bitte deaktivieren Sie den Mehrbenutzermodus, um diese Funktion nutzen zu können.",
        configuration: "Konfiguration des Google Kalenders",
        deploymentId: "Deployment-ID",
        deploymentIdHelp:
          "Die Bereitstellungs-ID Ihrer Google Apps Script Web-Anwendung",
        apiKey: "API-Schlüssel",
        apiKeyHelp:
          "Der API-Schlüssel, den Sie in Ihrer Google Apps Script-Bereitstellung konfiguriert haben",
        configurationRequired:
          "Bitte konfigurieren Sie die Deployment-ID und den API-Schlüssel, um die Google Calendar-Funktionen zu aktivieren.",
        configured: "Konfiguriert",
        searchSkills: "Suchfähigkeiten...",
        noSkillsFound: "Keine Übereinstimmungen zu Ihrer Suche.",
        categories: {
          calendars: {
            title: "Kalender",
            description: "Überprüfen und verwalten Sie Ihre Google-Kalender.",
          },
          readEvents: {
            title: "Veranstaltungen lesen",
            description: "Kalenderereignisse anzeigen und suchen",
          },
          writeEvents: {
            title: "Erstellen und aktualisieren von Veranstaltungen",
            description:
              "Erstellen Sie neue Veranstaltungen und ändern Sie bestehende",
          },
          rsvp: {
            title: "Verwaltung von Rückmeldungen",
            description:
              "Verwalten Sie den Status Ihrer Teilnahme an Veranstaltungen",
          },
        },
        skills: {
          listCalendars: {
            title: "Kalenderlisten",
            description:
              "Listen Sie alle Kalender auf, die Sie besitzen oder für die Sie ein Abonnement haben.",
          },
          getCalendar: {
            title: "Details zum Kalender anzeigen",
            description:
              "Erhalten Sie detaillierte Informationen über einen bestimmten Kalender.",
          },
          getEvent: {
            title: "Veranstaltung finden",
            description:
              "Erhalten Sie detaillierte Informationen über ein bestimmtes Ereignis.",
          },
          getEventsForDay: {
            title: "Veranstaltungen für den Tag",
            description:
              "Alle Veranstaltungen, die für einen bestimmten Tag geplant sind, anzeigen.",
          },
          getEvents: {
            title: "Veranstaltungen (Zeitraum) anzeigen",
            description:
              "Ereignisse innerhalb eines benutzerdefinierten Datumsbereichs abrufen",
          },
          getUpcomingEvents: {
            title: "Anstehende Veranstaltungen anzeigen",
            description:
              "Finden Sie Veranstaltungen für heute, diese Woche oder diesen Monat, indem Sie einfache Suchbegriffe verwenden.",
          },
          quickAdd: {
            title: "Schnellere Veranstaltung hinzufügen",
            description:
              "Erstellen Sie eine Veranstaltung aus natürlicher Sprache (z. B. „Treffen morgen um 15:00 Uhr“)",
          },
          createEvent: {
            title: "Ereignis erstellen",
            description:
              "Erstellen Sie ein neues Ereignis mit vollständiger Kontrolle über alle Eigenschaften.",
          },
          updateEvent: {
            title: "Aktualisierungsereignis",
            description: "Ein bestehendes Kalendereintrag aktualisieren",
          },
          setMyStatus: {
            title: "Status der Rückmeldung",
            description: "Teilen, ablehnen oder vorläufig zustimmen",
          },
        },
      },
    },
    "performance-warning":
      "Die Leistung von LLMs, die keine explizite Unterstützung für das Aufrufen von Tools bieten, hängt stark von den Fähigkeiten und der Genauigkeit des Modells ab. Einige Fähigkeiten können eingeschränkt oder nicht funktionsfähig sein.",
    mcp: {
      title: "MCP-Servern",
      "loading-from-config":
        "Laden von MCP-Servern aus einer Konfigurationsdatei",
      "refresh-confirm":
        "Möchten Sie die Liste der MCP-Server wirklich aktualisieren? Dies startet alle MCP-Server neu und lädt ihre Tools neu.",
      "refresh-failed": "Aktualisierung der MCP-Server fehlgeschlagen.",
      "learn-more": "Erfahren Sie mehr über MCP-Server.",
      "no-servers-found": "Keine MCP-Server gefunden",
      "tool-warning":
        "Für die beste Leistung sollten Sie unnötige Werkzeuge deaktivieren, um den Kontext zu schonen.",
      "stop-server": "MCP-Server stoppen",
      "start-server": "MCP-Server starten",
      "delete-server": "MCP-Server löschen",
      "tool-count-warning":
        "Dieser MCP-Server hat <b>{{count}} Tools aktiviert, </b> die Kontext verbrauchen werden, wenn eine Chat-Sitzung stattfindet. <br /> Erwägen Sie, unerwünschte Tools zu deaktivieren, um Kontext zu sparen.",
      "startup-command": "Startbefehl",
      command: "Befehl",
      arguments: "Argumente",
      "not-running-warning":
        "Dieser MCP-Server ist nicht aktiv – er kann gestoppt sein oder bei der Startsequenz einen Fehler aufweisen.",
      "tool-call-arguments": "Argumente für die Funktionsaufrufe",
      "tools-enabled": "Werkzeuge aktiviert",
    },
    settings: {
      title: "Einstellungen für Agenten-Fähigkeiten",
      "max-tool-calls": {
        title: "Maximale Anzahl an Tool-Anfragen pro Antwort",
        description:
          "Die maximale Anzahl an Werkzeugen, die ein Agent verketten kann, um eine einzelne Antwort zu generieren. Dies verhindert, dass Werkzeuge unkontrolliert aufgerufen werden und zu endlosen Schleifen führen.",
      },
      "intelligent-skill-selection": {
        title: "Intelligente Auswahl von Fähigkeiten",
        "beta-badge": "Beta-Version",
        description:
          "Ermöglichen Sie die uneingeschränkte Nutzung von Werkzeugen und reduzieren Sie die Token-Nutzung pro Anfrage um bis zu 80 % – OpenSIN Chat wählt automatisch die passenden Fähigkeiten für jede Anfrage aus.",
        "max-tools": {
          title: "Max Tools",
          description:
            "Die maximale Anzahl der auszuwählenden Werkzeuge für jede Abfrage. Wir empfehlen, diesen Wert für größere Modelle mit größerem Kontext auf einen höheren Wert einzustellen.",
        },
      },
      "clarifying-questions": {
        title:
          "Ermöglichen Sie dem Vertreter, Nachfragen zu stellen, um Unklarheiten zu beseitigen.",
        "beta-badge": "TESTVERSION",
        description:
          "Wenn die Funktion aktiviert ist, können die Agenten eine kurze, klärende Frage stellen, falls Ihre Anfrage unklar ist.",
        "max-per-turn": {
          title: "Maximale Anzahl an Fragen pro Zug",
          description:
            "Wie viele Nachfragen darf der Mitarbeiter während einer einzelnen Befragung stellen?",
        },
      },
    },
  },
  agentBuilder: {
    summarizeDescription:
      "Wenn aktiviert, werden lange Webseiteninhalte automatisch zusammengefasst, um Token-Verbrauch zu reduzieren.",
    summarizeNote:
      "Hinweis: Dies kann die Datenqualität beeinflussen und spezifische Details des Originalinhalts entfernen.",
    finishNodeDescription:
      "Dies ist das Ende Ihres Agenten-Flows. Alle oben stehenden Schritte werden nacheinander ausgeführt.",
    loadFlowsFailed: "Verfügbare Flows konnten nicht geladen werden",
    loadFlowFailed: "Flow konnte nicht geladen werden",
    nameAndDescriptionRequired:
      "Bitte geben Sie sowohl einen Namen als auch eine Beschreibung für Ihren Flow an",
    flowSavedSuccess: "Agent-Flow erfolgreich gespeichert!",
    saveFlowFailed: "Agent-Flow konnte nicht gespeichert werden. {{error}}",
    selectVariable: "Variable auswählen",
    fileNode: {
      operation: "Operation",
      readFile: "Datei lesen",
      writeFile: "Datei schreiben",
      appendToFile: "An Datei anhängen",
      filePath: "Dateipfad",
      filePathPlaceholder: "/pfad/zur/datei",
      content: "Inhalt",
      contentPlaceholder: "Dateiinhalt...",
      storeResultIn: "Ergebnis speichern in",
      selectOrCreateVariable: "Variable auswählen oder erstellen",
    },
    websiteNode: {
      url: "URL",
      urlPlaceholder: "https://example.com",
      action: "Aktion",
      readContent: "Inhalt lesen",
      clickElement: "Element klicken",
      typeText: "Text eingeben",
      cssSelector: "CSS-Selector",
      cssSelectorPlaceholder: "#element-id oder .class-name",
      storeResultIn: "Ergebnis speichern in",
      selectOrCreateVariable: "Variable auswählen oder erstellen",
    },
    headerMenu: {
      builder: "Builder",
      untitledFlow: "Unbenannter Flow",
      newFlow: "Neuer Flow",
      publish: "Veröffentlichen",
      save: "Speichern",
      viewDocumentation: "Dokumentation anzeigen →",
    },
    codeNode: {
      javascript: "JavaScript",
      python: "Python",
      shell: "Shell",
      code: "Code",
      codePlaceholder: "Code eingeben...",
      storeResultIn: "Ergebnis speichern in",
      selectOrCreateVariable: "Variable auswählen oder erstellen",
    },
    flowInfoNode: {
      flowName: "Flow-Name",
      flowNameDescription:
        "Es ist wichtig, Ihrem Flow einen Namen zu geben, den ein LLM leicht verstehen kann.",
      flowNameExamples:
        '"SendMessageToDiscord", "CheckStockPrice", "CheckWeather"',
      enterFlowName: "Flow-Namen eingeben",
      description: "Beschreibung",
      descriptionExplanation:
        "Es ist ebenso wichtig, Ihrem Flow eine Beschreibung zu geben, die ein LLM leicht verstehen kann. Geben Sie den Zweck des Flows, den Kontext, in dem er verwendet wird, und alle anderen relevanten Informationen an.",
      enterFlowDescription: "Flow-Beschreibung eingeben",
    },
    nodes: {
      llmInstruction: {
        instruction: "Anweisung",
        instructionPlaceholder: "Anweisungen für das LLM eingeben...",
        resultVariable: "Ergebnisvariable",
        selectOrCreateVariable: "Variable auswählen oder erstellen",
      },
    },
    blockList: {
      directOutput: "Direkte Ausgabe",
      directOutputDescription:
        "Die Ausgabe dieses Blocks wird direkt in den Chat zurückgegeben. Dadurch werden weitere Tool-Aufrufe verhindert.",
      configurationComingSoon: "Konfigurationsoptionen folgen in Kürze...",
      moveBlockUp: "Block nach oben verschieben",
      moveBlockDown: "Block nach unten verschieben",
      deleteBlock: "Block löschen",
    },
  },
  recorded: {
    title: "Workspace-Chats",
    description:
      "Dies sind alle aufgezeichneten Chats und Nachrichten, die von Benutzern gesendet wurden, geordnet nach ihrem Erstellungsdatum.",
    export: "Exportieren",
    exportSuccess: "Chats erfolgreich als {{name}} exportiert.",
    exportFailed: "Chat-Export fehlgeschlagen.",
    clearConfirm:
      "Sind Sie sicher, dass Sie alle Chats löschen möchten?\n\nDiese Aktion ist irreversibel.",
    clearedAll: "Alle Chats gelöscht.",
    deleteConfirm:
      "Sind Sie sicher, dass Sie diesen Chat löschen möchten?\n\nDiese Aktion ist irreversibel.",
    deleteFailed: "Chat-Löschung fehlgeschlagen.",
    deleted: "Chat gelöscht.",
    loadFailed: "Chats konnten nicht geladen werden: {{error}}",
    table: {
      id: "Id",
      by: "Gesendet von",
      workspace: "Workspace",
      prompt: "Prompt",
      response: "Antwort",
      at: "Gesendet am",
    },
  },
  preview: {
    loading: "Vorschau wird geladen…",
    load_error: "Vorschau konnte nicht geladen werden.",
    generated_image: "Generiertes Bild",
    open_externally: "In neuem Tab öffnen",
    iframe_title: "Vorschau",
    menu: {
      download: "Herunterladen",
      open_new_tab: "In neuem Tab öffnen",
      add_to_sources: "Zu Quellen hinzufügen",
    },
    empty:
      "Kein Inhalt zur Vorschau. Generiere einen Bericht oder ein Dokument, um es hier anzuzeigen.",
    title: "Vorschau",
    unknown_file: "Unbekannte Datei",
    open: "Vorschau",
    download: "Herunterladen",
    downloading: "Herunterladen…",
    add_to_source: "Zur Quelle hinzufügen",
    adding: "Hinzufügen…",
    open_new_tab: "Öffnen",
    source_added: "Zu Arbeitsbereich-Quellen hinzugefügt",
    source_add_failed: "Hinzufügen zu Quellen fehlgeschlagen",
    version: "Version {{number}}",
    fileType: {
      powerpoint: "PowerPoint",
      pdf: "PDF-Dokument",
      word: "Word-Dokument",
      spreadsheet: "Tabellenkalkulation",
      image: "Bild",
      vectorImage: "Vektorbild",
      file: "Datei",
    },
  },
  customization: {
    interface: {
      title: "UI Einstellungen",
      description: "Passen Sie die Benutzeroberfläche von OpenSIN Chat an.",
    },
    branding: {
      title: "Branding & Whitelabeling",
      description:
        "Individualisieren Sie Ihre OpenSIN Chat-Instanz durch eigenes Branding.",
    },
    chat: {
      title: "Chat",
      description: "Passen Sie Ihre Chat-Einstellungen für OpenSIN Chat an.",
      auto_submit: {
        title: "Spracheingaben automatisch senden",
        description:
          "Automatische Übermittlung der Spracheingabe nach einer Sprechpause.",
      },
      auto_speak: {
        title: "Antworten automatisch vorlesen",
        description: "Antworten der KI automatisch vorlesen lassen",
      },
      spellcheck: {
        title: "Rechtschreibprüfung aktivieren",
        description:
          "Aktivieren oder deaktivieren Sie die Rechtschreibprüfung im Chat-Eingabefeld.",
      },
    },
    items: {
      theme: {
        title: "Farbschema",
        description: "Wählen Sie Ihr bevorzugtes Farbschema für die Anwendung.",
      },
      "show-scrollbar": {
        title: "Scrollbar anzeigen",
        description:
          "Aktivieren oder deaktivieren Sie die Scrollbar im Chat-Fenster.",
      },
      "support-email": {
        title: "Support-E-Mail",
        description: "Legen Sie die E-Mail-Adresse für den Kundensupport fest.",
      },
      "app-name": {
        title: "Name",
        description:
          "Geben Sie einen Anwendungsnamen ein, der auf der Login-Seite erscheint.",
      },
      "display-language": {
        title: "Sprache",
        description:
          "Wählen Sie die bevorzugte Sprache für die Benutzeroberfläche.",
      },
      logo: {
        title: "Eigenes Logo",
        description:
          "Laden Sie Ihr eigenes Logo hoch, das auf allen Seiten angezeigt wird.",
        add: "Eigenes Logo hinzufügen",
        recommended: "Empfohlene Größe: 800 x 200",
        remove: "Löschen",
        replace: "Ersetzen",
        uploadFailed: "Logo konnte nicht hochgeladen werden: {{error}}",
        uploadSuccess: "Bild erfolgreich hochgeladen.",
        removeFailed: "Logo konnte nicht entfernt werden: {{error}}",
        removeSuccess: "Bild erfolgreich entfernt.",
      },
      "browser-appearance": {
        title: "Browser-Ansicht",
        description:
          "Individualisieren Sie die Ansicht von Browser-Tab und -Titel, während die App geöffnet ist.",
        tab: {
          title: "Titel",
          description:
            "Bestimmen Sie einen individuellen Tab-Titel, wenn die App im Browser geöffnet ist.",
        },
        favicon: {
          title: "Tab-Icon",
          description: "Nutzen Sie ein eigenes Icon für den Tab im Browser.",
        },
      },
      "sidebar-footer": {
        title: "Fußzeilenelemente der Seitenleiste",
        description:
          "Individualisieren Sie die Elemente in der Fußzeile am unteren Ende der Seitenleiste.",
        icon: "Icon",
        link: "Link",
      },
      "render-html": {
        title: "HTML-Code in einem Chat anzeigen",
        description:
          "HTML-Antworten in den Antworten des Assistenten anzeigen.\nDies kann zu einer viel höheren Qualität der Antwort führen, aber auch zu potenziellen Sicherheitsrisiken führen.",
      },
    },
  },
  api: {
    title: "API-Schlüssel",
    description:
      "API-Schlüssel ermöglichen es dem Besitzer, programmatisch auf diese OpenSIN Chat-Instanz zuzugreifen und sie zu verwalten.",
    link: "Lesen Sie die API-Dokumentation",
    readDocumentation: "API-Dokumentation lesen",
    generate: "Neuen API-Schlüssel generieren",
    empty: "Keine API-Schlüssel gefunden",
    actions: "Aktionen",
    messages: {
      error: "Fehler: {{error}}",
    },
    modal: {
      title: "Neuen API-Schlüssel erstellen",
      cancel: "Abbrechen",
      close: "Schließen",
      create: "API-Schlüssel erstellen",
      helper:
        "Nach der Erstellung kann der API-Schlüssel verwendet werden, um programmgesteuert auf diese OpenSIN Chat-Instanz zuzugreifen und sie zu konfigurieren.",
      name: {
        label: "Name",
        placeholder: "Produktionsintegration",
        helper:
          "Optional. Verwenden Sie einen leicht verständlichen Namen, damit Sie diesen Schlüssel später wiedererkennen.",
      },
    },
    row: {
      copy: "API-Schlüssel kopieren",
      copied: "Kopiert",
      unnamed: "--",
      deleteConfirm:
        "Möchten Sie diesen API-Schlüssel wirklich deaktivieren?\nDanach kann er nicht mehr verwendet werden.\n\nDiese Aktion kann nicht rückgängig gemacht werden.",
    },
    table: {
      name: "Name",
      key: "API-Schlüssel",
      by: "Erstellt von",
      created: "Erstellt",
    },
  },
  llm: {
    title: "LLM-Präferenz",
    description:
      "Dies sind die Anmeldeinformationen und Einstellungen für Ihren bevorzugten LLM-Chat- und Einbettungsanbieter. Es ist wichtig, dass diese Schlüssel aktuell und korrekt sind, sonst wird OpenSIN Chat nicht richtig funktionieren.",
    provider: "LLM-Anbieter",
    providers: {
      azure_openai: {
        azure_service_endpoint: "Azure-Service-Endpoint",
        azure_service_endpoint_placeholder: "https://my-azure.openai.azure.com",
        api_key: "API-Schlüssel",
        api_key_placeholder: "Azure OpenAI API-Schlüssel",
        chat_deployment_name: "Name der Chat-Deployment",
        chat_deployment_name_placeholder:
          "Azure OpenAI Chat-Modell-Deployment-Name",
        chat_model_token_limit: "Chat-Modell Token-Begrenzung",
        model_type: "Art des Modells",
        default: "Standard",
        reasoning: "Reasoning",
        model_type_tooltip:
          'Wenn Ihre Bereitstellung ein Reasoning-Modell verwendet (z. B. o1, o1-mini, o3-mini usw.), setzen Sie dies auf "Reasoning". Andernfalls können Ihre Chat-Anfragen fehlschlagen.',
        token_limit: {
          4096: "4.096 (gpt-3.5-turbo)",
          16384: "16.384 (gpt-3.5-16k)",
          8192: "8.192 (gpt-4)",
          32768: "32.768 (gpt-4-32k)",
          128000: "128.000 (gpt-4-turbo,gpt-4o,gpt-4o-mini,o1-mini)",
          200000: "200.000 (o1,o1-pro,o3-mini)",
          1047576: "1.047.576 (gpt-4.1)",
        },
      },
    },
  },
  transcription: {
    title: "Transkriptionsmodell-Präferenz",
    description:
      "Dies sind die Anmeldeinformationen und Einstellungen für Ihren bevorzugten Transkriptionsmodellanbieter. Es ist wichtig, dass diese Schlüssel aktuell und korrekt sind, sonst werden Mediendateien und Audio nicht transkribiert.",
    provider: "Transkriptionsanbieter",
    "warn-start":
      "Die Verwendung des lokalen Whisper-Modells auf Maschinen mit begrenztem RAM oder CPU kann OpenSIN Chat bei der Verarbeitung von Mediendateien zum Stillstand bringen.",
    "warn-recommend":
      "Wir empfehlen mindestens 2 GB RAM und das Hochladen von Dateien <10 MB.",
    "warn-end":
      "Das eingebaute Modell wird bei der ersten Verwendung automatisch heruntergeladen.",
    sizeMb: "(250 MB)",
    sizeGb: "(1,56 GB)",
    saving: "Wird gespeichert...",
    saveChanges: "Änderungen speichern",
    placeholder: {
      searchProviders: "Audio-Transkriptionsanbieter durchsuchen",
    },
  },
  embedding: {
    title: "Einbettungspräferenz",
    "desc-start":
      "Bei der Verwendung eines LLM, das keine native Unterstützung für eine Einbettungs-Engine bietet, müssen Sie möglicherweise zusätzlich Anmeldeinformationen für die Texteinbettung angeben.",
    "desc-end":
      "Einbettung ist der Prozess, Text in Vektoren umzuwandeln. Diese Anmeldeinformationen sind erforderlich, um Ihre Dateien und Prompts in ein Format umzuwandeln, das OpenSIN Chat zur Verarbeitung verwenden kann.",
    provider: {
      title: "Einbettungsanbieter",
    },
    saveSuccess: "Einbettungspräferenzen erfolgreich gespeichert.",
    saveFailed:
      "Einbettungseinstellungen konnten nicht gespeichert werden: {{error}}",
  },
  text: {
    title: "Textsplitting & Chunking-Präferenzen",
    "desc-start":
      "Manchmal möchten Sie vielleicht die Standardmethode ändern, wie neue Dokumente gesplittet und gechunkt werden, bevor sie in Ihre Vektordatenbank eingefügt werden.",
    "desc-end":
      "Sie sollten diese Einstellung nur ändern, wenn Sie verstehen, wie Textsplitting funktioniert und welche Nebenwirkungen es hat.",
    size: {
      title: "Textchunk-Größe",
      description:
        "Dies ist die maximale Länge der Zeichen, die in einem einzelnen Vektor vorhanden sein können.",
      recommend: "Die maximale Länge des Einbettungsmodells beträgt",
    },
    overlap: {
      title: "Textchunk-Überlappung",
      description:
        "Dies ist die maximale Überlappung von Zeichen, die während des Chunkings zwischen zwei benachbarten Textchunks auftritt.",
    },
  },
  vector: {
    title: "Vektordatenbank",
    description:
      "Dies sind die Anmeldeinformationen und Einstellungen für die Funktionsweise Ihrer OpenSIN Chat-Instanz. Es ist wichtig, dass diese Schlüssel aktuell und korrekt sind.",
    provider: {
      title: "Vektordatenbankanbieter",
      description: "Für LanceDB ist keine Konfiguration erforderlich.",
    },
    saveSuccess: "Vektordatenbank-Präferenzen erfolgreich gespeichert.",
    saveFailed:
      "Vektordatenbank-Einstellungen konnten nicht gespeichert werden: {{error}}",
  },
  embeddable: {
    title: "Einbettbare Chat-Widgets",
    description:
      "Einbettbare Chat-Widgets sind öffentlich zugängliche Chat-Schnittstellen, die an einen einzelnen Workspace gebunden sind. Diese ermöglichen es Ihnen, Workspaces zu erstellen, die Sie dann weltweit veröffentlichen können.",
    create: "Einbettung erstellen",
    table: {
      name: "Name",
      workspace: "Workspace",
      chats: "Gesendete Chats",
      active: "Aktive Domains",
      created: "Erstellt",
    },
  },
  "embed-chats": {
    title: "Eingebettete Chats",
    export: "Exportieren",
    description:
      "Dies sind alle aufgezeichneten Chats und Nachrichten von jeder Einbettung, die Sie veröffentlicht haben.",
    table: {
      embed: "Einbettung",
      sender: "Absender",
      message: "Nachricht",
      response: "Antwort",
      at: "Gesendet am",
    },
  },
  event: {
    title: "Ereignisprotokolle",
    description:
      "Sehen Sie alle Aktionen und Ereignisse, die auf dieser Instanz zur Überwachung stattfinden.",
    clear: "Ereignisprotokolle löschen",
    clearConfirm:
      "Möchten Sie wirklich alle Ereignisprotokolle löschen? Diese Aktion ist irreversibel.",
    clearSuccess: "Ereignisprotokolle erfolgreich gelöscht.",
    clearFailed: "Fehler beim Löschen der Protokolle: {{error}}",
    table: {
      type: "Ereignistyp",
      user: "Benutzer",
      occurred: "Aufgetreten am",
    },
  },
  privacy: {
    title: "Datenschutz & Datenverarbeitung",
    description:
      "Dies ist Ihre Konfiguration dafür, wie verbundene Drittanbieter und OpenSIN Chat Ihre Daten behandeln.",
    anonymous: "Anonyme Telemetrie aktiviert",
  },
  connectors: {
    "search-placeholder": "Datenverbindungen durchsuchen",
    "no-connectors": "Keine Datenverbindungen gefunden.",
    obsidian: {
      vault_location: "Ort des Vaults",
      vault_description:
        "Ordner des Obsidian-Vaults auswählen, um sämtliche Notizen inkl. Verknüpfungen zu importieren.",
      selected_files: "{{count}} Markdown-Dateien gefunden",
      importing: "Vault wird importiert...",
      import_vault: "Vault importieren",
      processing_time: "Dies kann je nach Größe Ihres Vaults etwas dauern",
      vault_warning:
        "Bitte schließen Sie Ihr Obsidian-Vault, um mögliche Konflikte zu vermeiden.",
      importing_vault:
        "Obsidian-Vault wird importiert — dies kann einige Zeit dauern.",
      import_success:
        "Erfolgreich {{count}} Dateien aus Ihrem Vault importiert!",
      import_partial:
        "{{successCount}} Dateien importiert, {{failCount}} fehlgeschlagen",
    },
    github: {
      name: "GitHub Repository",
      description:
        "Importieren Sie ein öffentliches oder privates GitHub-Repository mit einem einzigen Klick.",
      URL: "GitHub Repo URL",
      URL_explained: "URL des GitHub-Repositories, das Sie sammeln möchten.",
      token: "GitHub Zugriffstoken",
      optional: "optional",
      token_explained: "Zugriffstoken um Ratenlimits zu vermeiden.",
      token_explained_start: "Ohne einen ",
      token_explained_link1: "persönlichen Zugriffstoken",
      token_explained_middle:
        " kann die GitHub-API aufgrund von Ratenlimits die Anzahl der abrufbaren Dateien einschränken. Sie können ",
      token_explained_link2: "einen temporären Zugriffstoken erstellen",
      token_explained_end: ", um dieses Problem zu vermeiden.",
      ignores: "Datei-Ausschlüsse",
      git_ignore:
        "Liste im .gitignore-Format, um bestimmte Dateien während der Sammlung zu ignorieren. Drücken Sie Enter nach jedem Eintrag, den Sie speichern möchten.",
      task_explained:
        "Sobald der Vorgang abgeschlossen ist, sind alle Dateien im Dokumenten-Picker zur Einbettung in Workspaces verfügbar.",
      branch: "Branch, von dem Sie Dateien sammeln möchten.",
      branch_loading: "-- lade verfügbare Branches --",
      branch_explained: "Branch, von dem Sie Dateien sammeln möchten.",
      token_information:
        "Ohne Angabe des <b>GitHub Zugriffstokens</b> kann dieser Datenkonnektor aufgrund der öffentlichen API-Ratenlimits von GitHub nur die <b>Top-Level</b>-Dateien des Repositories sammeln.",
      token_personal:
        "Holen Sie sich hier einen kostenlosen persönlichen Zugriffstoken mit einem GitHub-Konto.",
      fetching_files:
        "Alle Dateien des Repositories werden abgerufen – dies kann einen Moment dauern.",
      files_collected:
        "{{files}} {{filePlural}} gesammelt aus {{author}}/{{repo}}:{{branch}}. Ausgabeordner ist {{destination}}.",
      collecting_files: "Dateien werden gesammelt...",
      submit: "Absenden",
      branch_label: "Branch",
      repoPlaceholder: "https://github.com/organisation/repo",
      tokenPlaceholder: "github_pat_1234_abcdefg",
      ignoresPlaceholder: "!*.js, images/*, .DS_Store, bin/*",
    },
    gitlab: {
      name: "GitLab Repository",
      description:
        "Importieren Sie ein öffentliches oder privates GitLab-Repository mit einem einzigen Klick.",
      URL: "GitLab Repo URL",
      URL_explained: "URL des GitLab-Repositories, das Sie sammeln möchten.",
      token: "GitLab Zugriffstoken",
      optional: "optional",
      token_description:
        "Wählen Sie zusätzliche Entitäten aus, die von der GitLab-API abgerufen werden sollen.",
      token_explained_start: "Ohne einen ",
      token_explained_link1: "persönlichen Zugriffstoken",
      token_explained_middle:
        " kann die GitLab-API aufgrund von Ratenlimits die Anzahl der abrufbaren Dateien einschränken. Sie können ",
      token_explained_link2: "einen temporären Zugriffstoken erstellen",
      token_explained_end: ", um dieses Problem zu vermeiden.",
      fetch_issues: "Issues als Dokumente abrufen",
      ignores: "Datei-Ausschlüsse",
      git_ignore:
        "Liste im .gitignore-Format, um bestimmte Dateien während der Sammlung zu ignorieren. Drücken Sie Enter nach jedem Eintrag, den Sie speichern möchten.",
      task_explained:
        "Sobald der Vorgang abgeschlossen ist, sind alle Dateien im Dokumenten-Picker zur Einbettung in Workspaces verfügbar.",
      branch: "Branch, von dem Sie Dateien sammeln möchten",
      branch_loading: "-- lade verfügbare Branches --",
      branch_explained: "Branch, von dem Sie Dateien sammeln möchten.",
      token_information:
        "Ohne Angabe des <b>GitLab Zugriffstokens</b> kann dieser Datenkonnektor aufgrund der öffentlichen API-Ratenlimits von GitLab nur die <b>Top-Level</b>-Dateien des Repositories sammeln.",
      token_personal:
        "Holen Sie sich hier einen kostenlosen persönlichen Zugriffstoken mit einem GitLab-Konto.",
      settings: "Einstellungen",
      fetch_wikis: "Wikis als Dokumente abrufen",
      fetchingFiles:
        "Alle Dateien für das Repo werden abgerufen — dies kann eine Weile dauern.",
      filesCollected:
        "{{files}} {{fileWord}} gesammelt aus {{author}}/{{repo}}:{{branch}}. Ausgabeordner ist {{destination}}.",
      collectingFiles: "Dateien werden gesammelt...",
      repoPlaceholder: "https://gitlab.com/organisation/repo",
      tokenPlaceholder: "glpat-XXXXXXXXXXXXXXXXXXXX",
      ignoresPlaceholder: "!*.js, images/*, .DS_Store, bin/*",
    },
    youtube: {
      name: "YouTube Transkript",
      description:
        "Importieren Sie die Transkription eines YouTube-Videos über einen Link.",
      URL: "YouTube Video URL",
      URL_explained_start:
        "Geben Sie die URL eines beliebigen YouTube-Videos ein, um dessen Transkript abzurufen. Das Video muss über ",
      URL_explained_link: "Untertitel",
      URL_explained_end: " verfügen.",
      task_explained:
        "Sobald der Vorgang abgeschlossen ist, ist das Transkript im Dokumenten-Picker zur Einbettung in Workspaces verfügbar.",
      urlPlaceholder: "https://youtube.com/watch?v=abc123",
      collectingButton: "Transkript wird gesammelt...",
      collectButton: "Transkript sammeln",
      fetching_transcript: "Transkript für YouTube-Video wird abgerufen.",
      transcription_completed:
        "Transkription von {{title}} durch {{author}} abgeschlossen. Ausgabeordner ist {{destination}}.",
    },
    "website-depth": {
      name: "Massen-Link-Scraper",
      description:
        "Durchsuchen Sie eine Website und ihre Unterlinks bis zu einer bestimmten Tiefe.",
      URL: "Website URL",
      URL_explained:
        "Geben Sie die Start-URL der Website ein, die Sie durchsuchen möchten.",
      depth: "Durchsuchungstiefe",
      depth_explained:
        "Das ist die Menge an Unterseiten, die abhängig der originalen URL durchsucht werden sollen.",
      max_pages: "Maximale Seitenanzahl",
      max_pages_explained: "Maximale Anzahl der zu durchsuchenden Seiten.",
      task_explained:
        "Sobald der Vorgang abgeschlossen ist, sind alle gesammelten Inhalte im Dokumenten-Picker zur Einbettung in Workspaces verfügbar.",
      urlPlaceholder: "https://beispiel.de",
      scrapingButton: "Website wird durchsucht...",
      scraping: "Website wird durchsucht — dies kann einige Zeit dauern.",
      pages_scraped: "Erfolgreich {{count}} {{pagePlural}} durchsucht!",
    },
    confluence: {
      name: "Confluence",
      description:
        "Importieren Sie eine komplette Confluence-Seite mit einem einzigen Klick.",
      deployment_type: "Confluence Bereitstellungstyp",
      deployment_type_explained:
        "Bestimmen Sie, ob Ihre Confluence-Instanz in der Atlassian Cloud oder selbst gehostet ist.",
      base_url: "Confluence Basis-URL",
      base_url_explained: "Dies ist die Basis-URL Ihres Confluence-Bereichs.",
      space_key: "Confluence Space-Key",
      space_key_explained:
        "Dies ist der Space-Key Ihrer Confluence-Instanz, der verwendet wird. Beginnt normalerweise mit ~",
      username: "Confluence Benutzername",
      username_explained: "Ihr Confluence Benutzername.",
      auth_type: "Confluence Authentifizierungstyp",
      auth_type_explained:
        "Wählen Sie den Authentifizierungstyp, den Sie verwenden möchten, um auf Ihre Confluence-Seiten zuzugreifen.",
      auth_type_username: "Benutzername und Zugriffstoken",
      auth_type_personal: "Persönliches Zugriffstoken",
      token: "Confluence API-Token",
      token_explained_start:
        "Sie müssen ein Zugriffstoken für die Authentifizierung bereitstellen. Sie können ein Zugriffstoken",
      token_explained_link: "hier",
      token_desc: "Zugriffstoken für die Authentifizierung.",
      pat_token: "Confluence persönliches Zugriffstoken",
      pat_token_explained: "Ihr Confluence persönliches Zugriffstoken.",
      task_explained:
        "Sobald der Vorgang abgeschlossen ist, ist der Seiteninhalt im Dokumenten-Picker zur Einbettung in Workspaces verfügbar.",
      bypass_ssl: "SSL-Zertifikatsvalidierung umgehen",
      bypass_ssl_explained:
        "Aktivieren Sie diese Option, um die SSL-Zertifikatsvalidierung für selbst gehostete Confluence-Instanzen mit selbstsignierten Zertifikaten zu umgehen.",
      fetching_pages:
        "Seiten für Confluence-Space werden abgerufen — dies kann eine Weile dauern.",
      pages_collected:
        "Seiten aus Confluence-Space {{spaceKey}} gesammelt. Ausgabeordner ist {{destination}}.",
      atlassian_cloud: "Atlassian Cloud",
      self_hosted: "Selbst gehostet",
      base_url_placeholder:
        "z.B.: https://example.atlassian.net, http://localhost:8211, usw.",
      space_key_placeholder: "z.B.: ~7120208c08555d52224113949698b933a3bb56",
      username_placeholder: "jdoe@example.com",
      token_placeholder: "abcd1234",
      pat_placeholder: "abcd1234",
      collecting_pages: "Seiten werden gesammelt...",
      submit: "Absenden",
    },
    manage: {
      documents: "Dokumente",
      "data-connectors": "Datenverbindungen",
      "desktop-only":
        "Diese Einstellungen können nur auf einem Desktop-Gerät bearbeitet werden. Bitte rufen Sie diese Seite auf Ihrem Desktop auf, um fortzufahren.",
      dismiss: "Schließen",
      editing: "Bearbeite",
      editingWithName: "Bearbeite \u201C{{name}}\u201D",
    },
    directory: {
      "my-documents": "Meine Dokumente",
      "new-folder": "Neuer Ordner",
      "search-document": "Dokument suchen",
      "no-documents": "Keine Dokumente",
      "move-workspace": "In Workspace verschieben",
      "delete-confirmation":
        "Sind Sie sicher, dass Sie diese Dateien und Ordner löschen möchten?\nDies wird die Dateien vom System entfernen und sie automatisch aus allen vorhandenen Workspaces entfernen.\nDiese Aktion kann nicht rückgängig gemacht werden.",
      "removing-message":
        "Entferne {{count}} Dokumente und {{folderCount}} Ordner. Bitte warten.",
      "move-success": "{{count}} Dokumente erfolgreich verschoben.",
      select_all: "Alle auswählen",
      deselect_all: "Auswahl abbrechen",
      no_docs: "Keine Dokumente vorhanden.",
      remove_selected: "Ausgewähltes entfernen",
      save_embed: "Speichern und Einbetten",
      "total-documents_one": "{{count}} Dokument",
      "total-documents_other": "{{count}} Dokumente",
    },
    upload: {
      "processor-offline": "Dokumentenprozessor nicht verfügbar",
      "processor-offline-desc":
        "Wir können Ihre Dateien momentan nicht hochladen, da der Dokumentenprozessor offline ist. Bitte versuchen Sie es später erneut.",
      "click-upload":
        "Klicken Sie zum Hochladen oder ziehen Sie Dateien per Drag & Drop",
      "file-types":
        "unterstützt Textdateien, CSVs, Tabellenkalkulationen, Audiodateien und mehr!",
      "or-submit-link": "oder einen Link einreichen",
      "placeholder-link": "https://beispiel.de",
      fetching: "Wird abgerufen...",
      "fetch-website": "Website abrufen",
      "privacy-notice":
        "Diese Dateien werden zum Dokumentenprozessor hochgeladen, der auf dieser OpenSIN Chat-Instanz läuft. Diese Dateien werden nicht an Dritte gesendet oder geteilt.",
    },
    pinning: {
      what_pinning: "Was bedeutet es Dokumente anzuheften?",
      pin_explained_block1:
        "Wenn du ein Dokument <b>anheftest</b>, wird den kompletten Inhalt des Dokuments mit deinem Prompt versendet, wodurch das LLM den vollen Kontext besitzt",
      pin_explained_block2:
        "Das funktioniert am besten bei <b>sehr großen Dokumenten</b> sowie für kleine Dokumenten, dessen Inhalt für die Wissensbasis absolut wichtig sind.",
      pin_explained_block3:
        "Wenn du nicht standardmäßig die erwünschten Ergebnisse bekommst, kann das anheften eine gute Methode sein, um Antworten mit einer besseren Qualität mit nur einem Klick zu erhalten.",
      accept: "Alles klar, ich habe es verstanden.",
    },
    watching: {
      what_watching: "Was bedeutet es ein Dokument zu beobachten?",
      watch_explained_block1:
        "Wenn du ein Dokument <b>beobachtest,</b> werden wir <i>automatisch</i> das Dokument von der Datenquelle in regelmäßigen Abständen aktualisieren. Dadurch wird der Inhalt automatisch in allen Workspaces aktualisiert, wo sich das Dokument befindet.",
      watch_explained_block2:
        "Diese Funktion unterstützt aktuell nur Online-Quellen und ist somit nicht verfügbar für selbst hochgeladene Dokumente",
      watch_explained_block3_start: "Du kannst im ",
      watch_explained_block3_link: "Dateimanager",
      watch_explained_block3_end:
        " entscheiden, welche Dokumente du beobachten möchtest.",
      accept: "Alles klar, ich habe es verstanden.",
    },
  },
  communityHub: {
    title: "Community Hub",
    trendingDescription:
      "Teilen und kooperieren Sie mit der OpenSIN Chat Community.",
    importDescription:
      "Importieren Sie Elemente aus dem OpenSIN Chat Community Hub, um Ihre Instanz mit Community-erstellten Prompts, Fähigkeiten und Befehlen zu erweitern.",
    auth: {
      title: "Ihr OpenSIN Chat Community Hub-Konto",
      descriptionPart1:
        "Wenn Sie Ihr OpenSIN Chat Community Hub-Konto verknüpfen, können Sie auf Ihre ",
      private: "privaten",
      descriptionPart2:
        " OpenSIN Chat Community Hub-Elemente zugreifen und eigene Elemente in den OpenSIN Chat Community Hub hochladen.",
      whyConnectTitle:
        "Warum sollte ich mein OpenSIN Chat Community Hub-Konto verknüpfen?",
      whyConnectBodyPart1:
        "Wenn Sie Ihr OpenSIN Chat Community Hub-Konto verknüpfen, können Sie Ihre ",
      whyConnectBodyPart2:
        " Elemente aus dem OpenSIN Chat Community Hub abrufen und eigene Elemente in den OpenSIN Chat Community Hub hochladen.",
      whyConnectNote:
        "Sie müssen Ihr OpenSIN Chat Community Hub-Konto nicht verknüpfen, um öffentliche Elemente aus dem OpenSIN Chat Community Hub abzurufen.",
      apiKeyLabel: "OpenSIN Chat Hub API-Schlüssel",
      apiKeyPlaceholder: "Geben Sie Ihren OpenSIN Chat Hub API-Schlüssel ein",
      apiKeyHelp: "Sie können Ihren API-Schlüssel von Ihrer",
      apiKeyHelpLink: "OpenSIN Chat Community Hub-Profilseite",
      disconnect: "Verbindung trennen",
      userItems: {
        createdByMe: "Von mir erstellt",
        privateItemsLink: "Warum kann ich meine privaten Elemente nicht sehen?",
        createdByMeDescription:
          "Elemente, die Sie erstellt und öffentlich im OpenSIN Chat Community Hub geteilt haben.",
        noItemsCreated: "Sie haben noch keine Elemente erstellt.",
        itemsByTeam: "Elemente nach Team",
        itemsByTeamDescription:
          "Öffentliche und private Elemente, die mit Teams geteilt wurden, denen Sie angehören.",
        noItemsShared: "Noch keine Elemente mit diesem Team geteilt.",
      },
      toast: {
        saveSuccess: "API-Schlüssel erfolgreich gespeichert",
        saveFailed: "Fehler beim Speichern des API-Schlüssels",
        disconnectSuccess: "Vom OpenSIN Chat Community Hub getrennt",
        disconnectFailed: "Fehler beim Trennen vom Hub",
      },
    },
    import: {
      intro: {
        title: "Ein Element aus dem Community Hub importieren",
        description1:
          "Der Community Hub ist ein Ort, an dem Sie Agent-Skills, System-Prompts, Slash-Befehle und mehr finden, teilen und importieren können!",
        description2:
          "Diese Elemente werden vom OpenSIN Chat-Team und der Community erstellt und sind eine großartige Möglichkeit, mit OpenSIN Chat zu beginnen und OpenSIN Chat an Ihre Bedürfnisse anzupassen.",
        description3Part1: "Es gibt sowohl ",
        private: "private",
        description3Part2: " als auch ",
        public: "öffentliche",
        description3Part3:
          " Elemente im Community Hub. Private Elemente sind nur für Sie sichtbar, während öffentliche Elemente für alle sichtbar sind.",
        warningBody:
          "Wenn Sie ein privates Element abrufen, stellen Sie sicher, dass es mit einem Team geteilt wird, dem Sie angehören, und dass Sie einen",
        warningLink: "Verbindungsschlüssel hinzugefügt haben.",
        itemIdRequired: "Bitte geben Sie eine Element-ID ein",
        itemIdLabel: "Community Hub Element-Import-ID",
        continueButton: "Mit Import fortfahren →",
        itemIdPlaceholder: "allm-community-id:agent-skill:1234567890",
      },
      agentFlow: {
        title: 'Agent-Flow "{{name}}" importieren',
        createdBy: "Erstellt von",
        description:
          "Agent-Flows ermöglichen es Ihnen, wiederverwendbare Aktionssequenzen zu erstellen, die von Ihrem Agenten ausgelöst werden können.",
        flowDetails: "Flow-Details:",
        descriptionLabel: "Beschreibung:",
        stepsLabel: "Schritte ({{count}}):",
        importing: "Wird importiert...",
        importButton: "Agent-Flow importieren",
        toast: {
          success: "Agent-Flow erfolgreich importiert!",
          failed: "Fehler beim Importieren des Agent-Flows. {{message}}",
        },
      },
      completed: {
        title: "Community-Hub-Element importiert",
        successMessage:
          'Das „{{name}}" {{itemType}} wurde erfolgreich importiert! Es ist jetzt in Ihrer OpenSIN Chat-Instanz verfügbar.',
        viewInAgentSkills: '„{{name}}" in Agent-Skills anzeigen',
        modifyNote:
          "Alle Änderungen, die Sie an diesem {{itemType}} vornehmen, werden nicht im Community Hub angezeigt. Sie können es jetzt nach Bedarf anpassen.",
        importAnother: "Weiteres Element importieren",
      },
      systemPrompt: {
        reviewTitle: 'System-Prompt „{{name}}" überprüfen',
        createdBy: "Erstellt von",
        description:
          "System-Prompts werden verwendet, um das Verhalten der KI-Agenten zu steuern und können auf jeden vorhandenen Workspace angewendet werden.",
        providedPrompt: "Bereitgestellter System-Prompt:",
        applyToWorkspace: "Auf Workspace anwenden",
        noWorkspaces:
          "Keine Workspaces verfügbar. Erstellen Sie zuerst einen Workspace.",
        applyButton: "System-Prompt auf Workspace anwenden",
        toastApplying: "System-Prompt wird auf Workspace angewendet...",
        toastFailed: "Fehler beim Anwenden des System-Prompts. {{error}}",
        toastApplied: "System-Prompt wurde auf Workspace angewendet.",
        availableWorkspaces: "Verfügbare Workspaces",
      },
      slashCommand: {
        reviewTitle: 'Slash-Befehl „{{name}}" überprüfen',
        createdBy: "Erstellt von",
        descriptionPart1:
          "Slash-Befehle werden verwendet, um Informationen in einen Prompt vorauszufüllen, während Sie mit einem OpenSIN Chat-Workspace chatten.",
        descriptionPart2:
          "Der Slash-Befehl steht beim Chatten zur Verfügung, indem Sie ihn einfach aufrufen mit",
        descriptionPart3: "wie jeden anderen Befehl auch.",
        importButton: "Slash-Befehl importieren",
        toastSuccess: "Slash-Befehl {{command}} erfolgreich importiert!",
        toastFailed: "Fehler beim Importieren des Slash-Befehls. {{error}}",
      },
      unsupported: {
        title: "Nicht unterstütztes Element",
        description:
          "Wir haben ein Element im Community Hub gefunden, aber wir wissen nicht, was es ist, oder es wird noch nicht für den Import in OpenSIN Chat unterstützt.",
        itemId: "Die Element-ID lautet:",
        itemType: "Der Elementtyp lautet:",
        contactSupport:
          "Bitte kontaktieren Sie den Support per E-Mail, wenn Sie Hilfe beim Import dieses Elements benötigen.",
        tryAnother: "Anderes Element versuchen",
      },
    },
    trending: {
      agentSkill: {
        skill: "Skill",
        file: "Datei",
        found: "gefunden",
        import: "Importieren →",
      },
    },
    agentFlow: {
      stepsLabel: "Schritte ({{count}}):",
      import: "Importieren →",
    },
    slashCommand: {
      command: "Befehl",
      prompt: "Prompt",
      import: "Importieren →",
    },
    hubItems: {
      recentlyAdded: "Kürzlich hinzugefügt im OpenSIN Chat Community Hub",
      exploreLatest:
        "Entdecken Sie die neuesten Ergänzungen im OpenSIN Chat Community Hub",
      exploreMore: "Mehr erkunden →",
    },
  },
  profile_settings: {
    edit_account: "Account bearbeiten",
    profile_picture: "Profilbild",
    remove_profile_picture: "Profilbild entfernen",
    username: "Nutzername",
    new_password: "Neues Passwort",
    password_description: "Das Passwort muss mindestens 8 Zeichen haben.",
    current_password: "Aktuelles Passwort",
    current_password_placeholder: "Aktuelles Passwort eingeben",
    current_password_description: "Nur erforderlich beim Ändern des Passworts",
    cancel: "Abbrechen",
    update_account: "Account updaten",
    theme: "Bevorzugtes Design",
    language: "Bevorzugte Sprache",
    failed_upload: "Profilbild konnte nicht hochgeladen werden: {{error}}",
    upload_success: "Profilbild hochgeladen.",
    failed_remove: "Profilbild konnte nicht entfernt werden: {{error}}",
    profile_updated: "Profil wurde aktualisiert.",
    failed_update_user: "Benutzer konnte nicht aktualisiert werden: {{error}}",
    account: "Account",
    support: "Support",
    signout: "Abmelden",
  },
  "keyboard-shortcuts": {
    title: "Tastaturkürzel",
    shortcuts: {
      settings: "Einstellungen öffnen",
      workspaceSettings: "Workspace Einstellungen öffnen",
      home: "Zur Startseite",
      workspaces: "Workspaces verwalten",
      apiKeys: "API-Schlüssel Einstellungen",
      llmPreferences: "LLM-Einstellungen",
      chatSettings: "Chat Einstellungen",
      help: "Tastenkürzel Hilfe anzeigen",
      showLLMSelector: "LLM-Auswahl für Workspace zeigen",
    },
  },
  community_hub: {
    publish: {
      system_prompt: {
        success_title: "Erfolg!",
        success_description:
          "Ihre System-Anweisung wurde im Community Hub veröffentlicht!",
        success_thank_you: "Vielen Dank für die Weitergabe an die Community!",
        view_on_hub: "Ansicht im Community Hub",
        modal_title:
          "Veröffentlichen Sie das System, um die Benutzer zu informieren, dass das System nicht mehr verfügbar ist.",
        name_label: "Name",
        visibility_label: "Sichtbarkeit",
        public_description: "Öffentliche Anweisungen sind für alle sichtbar.",
        private_description:
          "Private System-Nachrichten sind nur für Sie sichtbar.",
        publish_button: "Veröffentlichen Sie im Community Hub",
        submitting: "Veröffentlichung...",
        prompt_label: "Prompt",
        prompt_description:
          "Dies ist der eigentliche Systemprompt, der verwendet wird, um das LLM zu steuern.",
        prompt_placeholder: "Bitte geben Sie Ihren Systemprompt hier ein...",
        name_description: "Dies ist der Anzeigename für Ihren Systemprompt.",
        name_placeholder: "Mein System-Prompt",
        description_label: "Beschreibung",
        description_description:
          "Dies ist die Beschreibung Ihres System-Prompts. Verwenden Sie dies, um den Zweck Ihres System-Prompts zu beschreiben.",
        tags_label: "Schlüsselwörter",
        tags_description:
          "Die Tags werden verwendet, um Ihre Systemanweisung für eine einfachere Suche zu kennzeichnen. Sie können mehrere Tags hinzufügen. Maximal 5 Tags. Maximal 20 Zeichen pro Tag.",
        tags_placeholder:
          "Geben Sie den Text ein und drücken Sie die Eingabetaste, um Tags hinzuzufügen.",
      },
      agent_flow: {
        success_title: "Erfolg!",
        success_description:
          "Ihr Agent Flow wurde auf dem Community Hub veröffentlicht!",
        success_thank_you: "Vielen Dank für die Weitergabe an die Community!",
        view_on_hub: "Ansicht im Community Hub",
        modal_title: "Veröffentlichen Sie den Agentenfluss.",
        name_label: "Name",
        name_description: "Dies ist der Anzeigename für Ihren Agentenablauf.",
        name_placeholder: "Mein Agent Flow",
        description_label: "Beschreibung",
        description_description:
          "Dies ist die Beschreibung Ihres Agentenflusses. Verwenden Sie diese, um den Zweck Ihres Agentenflusses zu beschreiben.",
        tags_label: "Schlüsselwörter",
        tags_description:
          "Die Tags werden verwendet, um Ihren Agentenfluss leichter durchsuchbar zu machen. Sie können mehrere Tags hinzufügen. Maximal 5 Tags. Maximal 20 Zeichen pro Tag.",
        tags_placeholder:
          "Geben Sie Tags ein und drücken Sie die Eingabetaste, um sie hinzuzufügen.",
        visibility_label: "Sichtbarkeit",
        submitting: "Veröffentlichung...",
        submit: "Veröffentlichen Sie im Community Hub",
        flow_steps_label: "Flow-Schritte",
        flow_steps_description:
          "Die Schritte, die der Agent ausführt, wenn der Flow ausgelöst wird.",
        collapseStep: "Schritt {{index}} einklappen",
        expandStep: "Schritt {{index}} ausklappen",
        noStepsDefined: "Keine Schritte definiert.",
        publishFailed: "Fehler beim Veröffentlichen des Agent-Flows: {{error}}",
        privacy_note:
          "Agent-Prozesse werden immer privat hochgeladen, um sensible Daten zu schützen. Sie können die Sichtbarkeit im Community Hub nach der Veröffentlichung ändern. Bitte überprüfen Sie, ob Ihr Prozess keine sensiblen oder privaten Informationen enthält, bevor Sie ihn veröffentlichen.",
      },
      visibility: {
        publicLabel: "Öffentlich",
        privateLabel: "Privat",
      },
      generic: {
        unauthenticated: {
          title: "Benötigte Authentifizierung",
          description:
            "Sie müssen sich vor der Veröffentlichung von Inhalten über den OpenSIN Chat Community Hub authentifizieren.",
          button: "Verbinden Sie sich mit dem Community Hub",
        },
      },
      slash_command: {
        success_title: "Erfolg!",
        success_description:
          "Ihre Slash-Befehle wurden im Community Hub veröffentlicht!",
        success_thank_you: "Vielen Dank für die Weitergabe an die Community!",
        view_on_hub: "Ansicht im Community Hub",
        modal_title: "Slash-Befehle veröffentlichen",
        name_label: "Name",
        name_description: "Dies ist der Anzeigename für Ihren Slash-Befehl.",
        name_placeholder: "Meine Slash-Befehle",
        description_label: "Beschreibung",
        description_description:
          "Dies ist die Beschreibung für Ihren Slash-Befehl. Verwenden Sie diese, um den Zweck Ihres Slash-Befehls zu beschreiben.",
        tags_label: "Schlüsselwörter",
        tags_description:
          "Die Tags werden verwendet, um Ihren Slash-Befehl zu kennzeichnen und die Suche zu erleichtern. Sie können mehrere Tags hinzufügen. Maximal 5 Tags. Maximal 20 Zeichen pro Tag.",
        tags_placeholder:
          "Geben Sie Tags ein und drücken Sie die Eingabetaste, um sie hinzuzufügen.",
        visibility_label: "Sichtbarkeit",
        public_description:
          "Öffentliche Slash-Befehle sind für jeden sichtbar.",
        private_description: "Private Slash-Befehle sind nur für Sie sichtbar.",
        publish_button: "Veröffentlichen Sie im Community Hub",
        submitting: "Veröffentlichung...",
        prompt_label:
          "Bitte geben Sie den Namen des Produkts an, das Sie verkaufen möchten.",
        prompt_description:
          "Dies ist der Befehl, der verwendet wird, wenn der Slash-Befehl ausgelöst wird.",
        prompt_placeholder: "Bitte geben Sie Ihre Anfrage hier ein...",
      },
    },
  },
  security: {
    title: "Sicherheit",
    multiuser: {
      title: "Mehrbenutzer-Modus",
      description:
        "Richten Sie Ihre Instanz ein, um Ihr Team zu unterstützen, indem Sie den Mehrbenutzer-Modus aktivieren.",
      enable: {
        "is-enable": "Mehrbenutzer-Modus ist aktiviert",
        enable: "Mehrbenutzer-Modus aktivieren",
        description:
          "Standardmäßig sind Sie der einzige Administrator. Als Administrator müssen Sie Konten für alle neuen Benutzer oder Administratoren erstellen. Verlieren Sie Ihr Passwort nicht, da nur ein Administrator-Benutzer Passwörter zurücksetzen kann.",
        username: "Administrator-Kontoname",
        password: "Administrator-Kontopasswort",
        success: "Mehrbenutzer-Modus erfolgreich aktiviert.",
        failed: "Mehrbenutzer-Modus konnte nicht aktiviert werden: {{error}}",
      },
    },
    password: {
      title: "Passwortschutz",
      description:
        "Schützen Sie Ihre OpenSIN Chat-Instanz mit einem Passwort. Wenn Sie dieses vergessen, gibt es keine Wiederherstellungsmethode, also stellen Sie sicher, dass Sie dieses Passwort speichern.",
      "password-label": "Instanzpasswort",
      restrictedChars:
        "Ihr Passwort enthält unzulässige Sonderzeichen. Erlaubt sind _,-,!,@,$,%,^,&,*,(,),;",
      refreshing: "Die Seite wird in wenigen Sekunden neu geladen.",
      updateFailed: "Passwort konnte nicht aktualisiert werden: {{error}}",
    },
    placeholder: {
      adminUsername: "Ihr Admin-Benutzername",
      adminPassword: "Ihr Admin-Passwort",
      instancePassword: "Ihr Instanz-Passwort",
    },
  },
  webSearch: {
    getFreeApiKeySerpApi: "Holen Sie sich einen kostenlosen API-Schlüssel",
    fromSerpApi: "von SerpApi.",
    serpApiApiKey: "SerpApi API-Schlüssel",
    getFreeApiKeySearchApi:
      "Sie können einen kostenlosen API-Schlüssel erhalten",
    fromSearchApi: "von SearchApi.",
    searchApiApiKey: "SearchApi API-Schlüssel",
    getFreeApiKeySerper: "Sie können einen kostenlosen API-Schlüssel erhalten",
    fromSerper: "von Serper.dev.",
    serperApiKey: "Serper.dev API-Schlüssel",
    getBingWebSearchSubscription:
      "Sie können einen Bing Web Search API-Abonnement-Schlüssel erhalten",
    fromAzurePortal: "vom Azure-Portal.",
    bingWebSearchApiKey: "Bing Web Search API-Schlüssel",
    bingSetupTitle: "So richten Sie ein Bing Web Search API-Abonnement ein:",
    bingSetupStep1: "Gehen Sie zum Azure-Portal:",
    bingSetupStep2:
      "Erstellen Sie ein neues Azure-Konto oder melden Sie sich mit einem bestehenden an.",
    bingSetupStep3:
      'Navigieren Sie zum Abschnitt "Ressource erstellen" und suchen Sie nach "Grounding with Bing Search".',
    bingSetupStep4:
      'Wählen Sie die Ressource "Grounding with Bing Search" und erstellen Sie ein neues Abonnement.',
    bingSetupStep5: "Wählen Sie den Tarif, der Ihren Anforderungen entspricht.",
    bingSetupStep6:
      "Erhalten Sie den API-Schlüssel für Ihr Grounding with Bing Search-Abonnement.",
    getApiKey: "Sie können einen API-Schlüssel erhalten",
    fromBaidu: "von Baidu AI Cloud Qianfan.",
    baiduApiKey: "Baidu Search API-Schlüssel",
    fromSerply: "von Serply.io.",
    serplyApiKey: "Serply API-Schlüssel",
    searxngBaseUrl: "SearXNG API-Basis-URL",
    searxngBaseUrlPlaceholder: "SearXNG API-Basis-URL",
    fromTavily: "von Tavily.",
    tavilyApiKey: "Tavily API-Schlüssel",
    duckduckgoNoConfig:
      "DuckDuckGo ist ohne weitere Konfiguration einsatzbereit.",
    fromExa: "von Exa.",
    exaApiKey: "Exa API-Schlüssel",
    fromPerplexity: "von Perplexity.",
    perplexityApiKey: "Perplexity API-Schlüssel",
    vaneNoConfig:
      "Vane läuft als lokaler Sidecar-Container und benötigt keinen API-Schlüssel. Der Endpunkt wird über die Umgebungsvariable VANE_API_URL konfiguriert (Standard: http://vane:3000). Schließe zuerst die einmalige Modell-Einrichtung in der Vane-Web-UI ab.",
  },
  ollama: {
    advancedSettings: "erweiterte Einstellungen",
    showAdvanced: "Anzeigen",
    hideAdvanced: "Ausblenden",
    baseUrlLabel: "Ollama Basis-URL",
    baseUrlTooltip: "Geben Sie die URL ein, unter der Ollama läuft.",
    autoDetect: "Automatisch erkennen",
    keepAliveLabel: "Ollama Keep Alive",
    keepAliveTooltip:
      "Wählen Sie, wie lange Ollama Ihr Modell im Speicher behalten soll, bevor es entladen wird.",
    keepAliveLearnMore: "Mehr erfahren →",
    keepAliveNoCache: "Kein Cache",
    keepAlive5Min: "5 Minuten",
    keepAlive1Hour: "1 Stunde",
    keepAliveForever: "Für immer",
    contextWindowLabel: "Modell-Kontextfenster",
    contextWindowTooltip:
      "Geben Sie die maximale Anzahl von Tokens an, die für das Modell-Kontextfenster verwendet werden können.",
    contextWindowTooltip2:
      "Wenn Sie dieses Feld leer lassen, wird das Kontextfenster-Limit automatisch vom Modell erkannt und auf alle Chats angewendet. Wenn die automatische Erkennung fehlschlägt, wird ein Fallback-Kontextfenster-Limit von 4096 verwendet.",
    contextWindowTooltipImportant: "Wichtig",
    contextWindowTooltipImportantText:
      "Einige Modelle haben sehr große Kontextfenster. Die Verwendung des vollen Kontextfenster-Limits kann den Speicherverbrauch Ihres Systems drastisch erhöhen. Aus diesem Grund begrenzen wir das Kontextfenster-Limit automatisch auf 16.384 Tokens, wenn das Modell mehr unterstützt und kein Wert angegeben ist.",
    contextWindowTooltipFallback:
      "Wenn ein ungültiger Wert eingegeben wird, kümmert sich OpenSIN Chat darum, damit Chats nicht fehlschlagen.",
    contextWindowPlaceholder: "Automatisch verwaltet",
    authTokenLabel: "Authentifizierungs-Token",
    authTokenTooltip1: "Geben Sie ein",
    authTokenTooltipBearer: "Bearer",
    authTokenTooltip1End:
      "Auth-Token für die Interaktion mit Ihrem Ollama-Server ein.",
    authTokenTooltip2: "Verwendet",
    authTokenTooltip2b: "nur",
    authTokenTooltip2End:
      "wenn Ollama hinter einem Authentifizierungsserver läuft.",
    authTokenPlaceholder: "Ollama Auth-Token",
    modelLabel: "Ollama Modell",
    loadingModels: "-- verfügbare Modelle werden geladen --",
    enterUrlFirst: "Geben Sie zuerst die Ollama-URL ein",
    selectModelHelp:
      "Wählen Sie das Ollama-Modell aus, das Sie verwenden möchten. Modelle werden nach Eingabe einer gültigen Ollama-URL geladen.",
    yourLoadedModels: "Ihre geladenen Modelle",
    chooseModelHelp:
      "Wählen Sie das Ollama-Modell aus, das Sie für Ihre Konversationen verwenden möchten.",
    baseUrlPlaceholder: "http://127.0.0.1:11434",
    autoDetected: "(automatisch erkannt)",
  },
  ollamaEmbedding: {
    maxChunkLengthLabel: "Maximale Embedding-Chunk-Länge",
    maxChunkLengthTooltip:
      "Maximale Länge von Text-Chunks in Zeichen für das Embedding.",
    maxChunkLengthPlaceholder: "8192",
    hideAdvanced: "Ausblenden",
    showAdvanced: "Anzeigen",
    advancedSettings: "Erweiterte Einstellungen",
    hideAdvancedAria: "Erweiterte Einstellungen ausblenden",
    showAdvancedAria: "Erweiterte Einstellungen anzeigen",
    baseUrlLabel: "Ollama Basis-URL",
    autoDetect: "Automatisch erkennen",
    autoDetectAria: "Ollama Basis-URL automatisch erkennen",
    baseUrlPlaceholder: "http://127.0.0.1:11434",
    baseUrlHelp: "Geben Sie die URL ein, unter der Ollama läuft.",
    batchSizeLabel: "Embedding-Batch-Größe",
    batchSizeTooltip:
      "Anzahl der Text-Chunks, die parallel eingebettet werden. Höhere Werte verbessern die Geschwindigkeit, verbrauchen aber mehr Speicher. Standard ist 1.",
    batchSizePlaceholder: "1",
    batchSizeHelp:
      "Erhöhen Sie diesen Wert, um mehrere Chunks gleichzeitig für schnelleres Embedding zu verarbeiten.",
    authTokenLabel: "Auth-Token (optional)",
    authTokenPlaceholder: "Geben Sie Ihr Auth-Token ein",
    authTokenHelp1: "Geben Sie ein",
    authTokenBearer: "Bearer",
    authTokenHelp1End:
      "Auth-Token für die Interaktion mit Ihrem Ollama-Server ein.",
    authTokenHelp2: "Verwendet",
    authTokenHelp2b: "nur",
    authTokenHelp2End:
      "wenn Ollama hinter einem Authentifizierungsserver läuft.",
    modelLabel: "Ollama Embedding-Modell",
    loadingModels: "--verfügbare Modelle werden geladen--",
    enterUrlFirst: "Geben Sie zuerst die Ollama-URL ein",
    selectModelHelp:
      "Wählen Sie das Ollama-Modell für Embeddings aus. Modelle werden nach Eingabe einer gültigen Ollama-URL geladen.",
    yourLoadedModels: "Ihre geladenen Modelle",
    chooseModelHelp:
      "Wählen Sie das Ollama-Modell aus, das Sie zum Erzeugen von Embeddings verwenden möchten.",
  },
  genericOpenAiEmbedding: {
    baseUrlLabel: "Basis-URL",
    baseUrlPlaceholder: "https://api.openai.com/v1",
    modelLabel: "Embedding-Modell",
    modelPlaceholder: "text-embedding-ada-002",
    maxChunkLengthLabel: "Maximale Embedding-Chunk-Länge",
    maxChunkLengthTooltip:
      "Maximale Länge von Text-Chunks in Zeichen für das Embedding.",
    maxChunkLengthPlaceholder: "8192",
    apiKeyLabel: "API-Schlüssel",
    apiKeyPlaceholder: "API-Schlüssel des generischen Dienstes",
    optional: "Optional",
    showAdvanced: "Anzeigen",
    hideAdvanced: "Ausblenden",
    advancedSettings: "Erweiterte Einstellungen",
    showAdvancedAria: "Erweiterte Einstellungen anzeigen",
    hideAdvancedAria: "Erweiterte Einstellungen ausblenden",
    maxConcurrentChunksLabel: "Maximale parallele Chunks",
    maxConcurrentChunksPlaceholder: "5",
  },
  localAiEmbedding: {
    modelLabel: "LocalAI Embedding-Modell",
    loadingModels: "-- verfügbare Modelle werden geladen --",
    waitingUrl: "Geben Sie zuerst die LocalAI-URL ein",
    apiKeyLabel: "API-Schlüssel",
    apiKeyTooltip: "API-Schlüssel für die LocalAI-Instanz.",
    apiKeyPlaceholder: "LocalAI API-Schlüssel",
    maxChunkLengthLabel: "Maximale Embedding-Chunk-Länge",
    maxChunkLengthTooltip:
      "Maximale Länge von Text-Chunks in Zeichen für das Embedding.",
    maxChunkLengthPlaceholder: "8192",
    outputDimensionsLabel: "Embedding-Ausgabedimensionen",
    outputDimensionsTooltip1: "Anzahl der Dimensionen der Embedding-Ausgabe.",
    outputDimensionsTooltip2:
      "Leer lassen, um den Standard des Modells zu verwenden.",
    outputDimensionsPlaceholder: "z. B. 768",
    showAdvanced: "Anzeigen",
    hideAdvanced: "Ausblenden",
    advancedSettings: "Erweiterte Einstellungen",
    showAdvancedAria: "Erweiterte Einstellungen anzeigen",
    hideAdvancedAria: "Erweiterte Einstellungen ausblenden",
    baseUrlLabel: "LocalAI Basis-URL",
    baseUrlPlaceholder: "http://127.0.0.1:8080",
    autoDetect: "Automatisch erkennen",
    autoDetectAria: "LocalAI Basis-URL automatisch erkennen",
    yourLoadedModels: "Ihre geladenen Modelle",
  },
  lmStudioEmbedding: {
    modelLabel: "LM Studio Modell",
    modelLabelReady: "LM Studio Modell",
    modelErrorTooltip:
      "Modelle konnten nicht vom LM Studio-Server geladen werden.",
    loadingModels: "-- verfügbare Modelle werden geladen --",
    noModelsFound: "Keine Modelle gefunden",
    enterUrlFirst: "Geben Sie zuerst die LM Studio-URL ein",
    yourLoadedModels: "Ihre geladenen Modelle",
    modelDescription:
      "Wählen Sie das Modell aus, das Sie für Embeddings verwenden möchten.",
    maxChunkLengthLabel: "Maximale Embedding-Chunk-Länge",
    maxChunkLengthTooltip:
      "Maximale Länge von Text-Chunks in Zeichen für das Embedding.",
    showManualEndpoint: "Anzeigen",
    hideManualEndpoint: "Ausblenden",
    manualEndpointInput: "manuelle Endpunkt-Eingabe",
    showManualEndpointAria: "Manuelle Endpunkt-Eingabe anzeigen",
    hideManualEndpointAria: "Manuelle Endpunkt-Eingabe ausblenden",
    baseUrlLabel: "LM Studio Basis-URL",
    baseUrlTooltip: "Geben Sie die URL ein, unter der LM Studio läuft.",
    baseUrlPlaceholder: "http://127.0.0.1:11434",
    autoDetect: "Automatisch erkennen",
    autoDetectAria: "LM Studio Basis-URL automatisch erkennen",
    authTokenLabel: "Auth-Token",
    authTokenTooltipPart1: "Geben Sie ein",
    authTokenTooltipBearer: "Bearer",
    authTokenTooltipPart2:
      "Auth-Token für die Interaktion mit Ihrem LM Studio-Server ein.",
    authTokenTooltipPart3:
      "Wird nur verwendet, wenn LM Studio hinter einem Authentifizierungsserver läuft.",
    authTokenPlaceholder: "LM Studio Auth-Token",
  },
  agentLLMItem: {
    editSettings: "Einstellungen bearbeiten",
    settingsTitle: "{{name}} Einstellungen",
    setupDescription:
      "Um {{name}} als Agent-LLM dieses Arbeitsbereichs zu verwenden, müssen Sie es zuerst einrichten.",
    cancel: "Abbrechen",
    saveSettings: "{{name}} Einstellungen speichern",
    saveFailed: "Fehler beim Speichern der {{name}} Einstellungen: {{error}}",
  },
  pdfAnalysis: {
    panel: {
      title: "PDF-Analyse",
      description:
        "Laden Sie ein PDF hoch und lassen Sie es von Agenten analysieren, verifizieren und in durchsuchbare Fakten überführen.",
      tabJobs: "Analysen",
      tabFacts: "Fakten-Speicher",
      tabCrossCheck: "Kreuz-Verifikation",
      tabCorpus: "Korpus-Vergleich",
      newAnalysis: "Neue Analyse",
      pdfFile: "PDF-Datei",
      chooseFile: "Datei auswählen",
      noFileChosen: "Keine Datei ausgewählt",
      taskRequired: "Aufgabe (erforderlich)",
      taskPlaceholder:
        "z.B. Fasse die wichtigsten Aussagen zusammen und prüfe sie auf Belege",
      reportType: "Berichtstyp (optional)",
      reportTypePlaceholder: "z.B. Zusammenfassung, Faktencheck",
      factCriteria: "Faktenkriterien (optional)",
      factCriteriaPlaceholder: "z.B. nur prüfbare Zahlen und Daten",
      deepScan: "Tiefen-Scan (OCR & Vision für gescannte Seiten, langsamer)",
      fileRequired:
        "Bitte wählen Sie eine PDF-Datei und geben Sie eine Aufgabe an.",
      submitBusy: "Wird gestartet…",
      submitIdle: "Analyse starten",
      jobsSection: "Analysen",
      noJobs: "Noch keine Analyse gestartet.",
      phaseInit: "Initialisierung",
      phaseReading: "PDF wird gelesen",
      phaseAnalyzing: "Analyse läuft",
      phaseSynthesizing: "Synthese läuft",
      phaseVerifying: "Fakten werden verifiziert",
      phaseStoring: "Fakten werden gespeichert",
      phaseDone: "Fertig",
      statusCompleted: "Abgeschlossen",
      statusFailed: "Fehlgeschlagen",
      chunksCount: "{{done}}/{{total}} Abschnitte",
      agentTitle: "Parallel arbeitende Agenten",
      agentsActive: "{{count}} Agenten aktiv",
      pagesPerMin: "{{count}} Seiten/min",
      eta: "Rest {{time}}",
      showReport: "Bericht anzeigen",
      cancel: "Abbrechen",
      reportFor: "Bericht für {{name}}",
      downloadReport: "Als Markdown herunterladen",
      tocToggle: "Inhaltsverzeichnis",
      tocLabel: "Inhaltsverzeichnis",
      addAsSource: "Als Quelle hinzufügen",
      addedAsSourceToast:
        "Berichtstext wurde in die Zwischenablage kopiert. Fügen Sie ihn als Quelle im Workspace ein.",
      close: "Schließen",
      loading: "Wird geladen…",
      summary:
        "{{totalPages}} Seiten · {{chunks}} Abschnitte · {{factsStored}} Fakten gespeichert",
      chunkErrors: " · {{count}} Abschnittsfehler",
      noReport: "Kein Bericht verfügbar.",
      searchPlaceholder: "Fakten durchsuchen…",
      searchAria: "Fakten durchsuchen",
      documentFilterPlaceholder: "Nach Dokument filtern…",
      documentFilterAria: "Nach Dokument filtern",
      search: "Suchen",
      searching: "Wird gesucht…",
      noFacts: "Keine Fakten gefunden.",
      foundFactsAria: "Gefundene Fakten",
      sourceLabel: "{{docName}}, S. {{page}}",
      pageCorrected: "(Seite korrigiert)",
      pageCorrectedAria: "Seitenzahl wurde automatisch korrigiert",
      verified: "verifiziert",
      notVerified: "nicht verifiziert",
      checkedAt: "Geprüft am {{date}}",
      crossChecked: "Quergeprüft:",
      crossCheckSupports: "bestätigt",
      crossCheckContradicts: "widerspricht",
      crossCheckInconclusive: "unklar",
      checkSources: "Quellen prüfen",
      checkSourcesAria: "Quellen prüfen für: {{text}}",
      delete: "Löschen",
      deleteFactAria: "Fakt löschen: {{text}}",
      filesSelected_one: "{{count}} Datei ausgewählt",
      filesSelected_other: "{{count}} Dateien ausgewählt",
      downloadMd: "Markdown",
      downloadDocx: "Word-Dokument",
      downloadPdf: "PDF-Dokument",
      reportSuffix: "-bericht",
    },
    corpus: {
      section: "Korpus-Analysen",
      newAnalysis: "Neue Korpus-Analyse",
      pdfFiles: "PDF-Dateien (mindestens 2)",
      chooseFiles: "Dateien auswählen",
      noFilesChosen: "Keine Dateien ausgewählt",
      taskRequired: "Aufgabe (erforderlich)",
      taskPlaceholder: "z.B. Vergleiche die Dokumente und finde Widersprüche",
      factCriteria: "Faktenkriterien (optional)",
      factCriteriaPlaceholder: "z.B. nur prüfbare Zahlen und Daten",
      deepScan: "Tiefen-Scan (OCR & Vision für gescannte Seiten, langsamer)",
      submitError:
        "Bitte wählen Sie mindestens 2 PDF-Dateien und geben Sie eine Aufgabe an.",
      submitBusy: "Wird gestartet…",
      submitIdle: "Korpus-Analyse starten",
      noJobs: "Noch keine Korpus-Analyse gestartet.",
      phaseAnalyzingDocs: "Dokumente werden analysiert",
      phaseComparing: "Vergleich läuft",
      phaseDone: "Fertig",
      statusCompleted: "Abgeschlossen",
      statusFailed: "Fehlgeschlagen",
      docsCount: "{{done}}/{{total}} Dokumente",
      showReport: "Bericht anzeigen",
      cancel: "Abbrechen",
      reportAria: "Korpus-Bericht",
      reportTitle: "Korpus-Bericht ({{count}} Dokumente)",
      close: "Schließen",
      loading: "Wird geladen…",
      conflictsFound: "{{count}} Widersprüche gefunden",
      docsAnalyzed: "{{count}} Dokumente analysiert",
      docsFailed: " · {{count}} fehlgeschlagen",
      noReport: "Kein Bericht verfügbar.",
    },
    crossCheck: {
      sectionLabel: "Kreuz-Verifikationen",
      sectionTitle: "Laufende & abgeschlossene Verifikationen",
      emptyText: "Noch keine Kreuz-Verifikation gestartet.",
      formTitle: "Neue Kreuz-Verifikation",
      claimsLabel: "Behauptungen (eine pro Zeile)",
      claimsPlaceholder:
        "z.B. Das Förderprogramm endet am 31.12.2026\nDie Zuständigkeit liegt beim Landesamt",
      factIdsLabel:
        "Fakt-IDs aus dem Fakten-Speicher (kommasepariert, optional)",
      factIdsPlaceholder: "z.B. a1b2c3d4e5f6a7b8, b2c3d4e5f6a7b8c9",
      sourcesLegend: "Vergleichsquellen",
      sourceTypeAriaLabel: "Quelltyp",
      sourceValueAriaLabel: "Quellwert",
      sourceValuePdfPlaceholder:
        "/pfad/zur/datei.pdf (freigegebenes Verzeichnis)",
      sourceValueTextPlaceholder: "Roh-Text einfügen…",
      sourceValueUrlPlaceholder: "https://…",
      removeSourceAriaLabel: "Quelle entfernen",
      removeSource: "Entfernen",
      addSource: "Quelle hinzufügen",
      deepWebLabel:
        "Deep-Web-Recherche: Agenten recherchieren zusätzlich autonom im Web",
      submitError1: "Mindestens eine Behauptung oder Fakt-ID angeben.",
      submitError2:
        "Mindestens eine Vergleichsquelle ODER Deep-Web-Recherche aktivieren.",
      submitBusy: "Wird gestartet…",
      submitIdle: "Verifikation starten",
      sourcesCount_one: "{{count}} Vergleichsquelle",
      sourcesCount_other: "{{count}} Vergleichsquellen",
      deepWebActive: " · Deep-Web-Recherche aktiv",
      moreClaims: " (+{{count}} weitere)",
      statusCompleted: "Abgeschlossen",
      statusFailed: "Fehlgeschlagen",
      statusResearching: "Agenten recherchieren",
      progressLabel: "{{done}}/{{total}} Aufgaben",
      showReport: "Bericht anzeigen",
      cancel: "Abbrechen",
      modalAriaLabel: "Verifikationsbericht",
      modalTitle: "Verifikationsbericht",
      downloadReport: "Als Markdown herunterladen",
      closeAriaLabel: "Schließen",
      close: "Schließen",
      loading: "Wird geladen…",
      webResearch: "Web ({{count}} Quellen):",
      perClaimAriaLabel: "Urteile je Behauptung",
      noReport: "Kein Bericht verfügbar.",
    },
    sourceTypes: {
      url: "Webseite (URL)",
      youtube: "YouTube-Video",
      image: "Bild (URL)",
      video: "Video-Datei (URL)",
      pdf: "PDF (Server-Pfad)",
      text: "Roh-Text",
    },
    verdicts: {
      supports: "Bestätigt",
      contradicts: "Widerspricht",
      inconclusive: "Unklar",
    },
  },
  home: {
    welcome: "Willkommen",
    chooseWorkspace: "Wählen Sie ein Arbeitsbereich, um zu beginnen!",
    notAssigned:
      "Sie sind nicht zugewiesen zu einem Arbeitsbereich.\nBitte kontaktieren Sie Ihren Administrator, um Zugriff auf einen Arbeitsbereich zu erhalten.",
    goToWorkspace: 'Zurück zum Arbeitsbereich "{{workspace}}"',
    logoAlt: "Logo",
    readDocs: "Dokumentation lesen",
    createWorkspaceFailed: "Arbeitsbereich konnte nicht erstellt werden",
    sendMessageFailed: "Nachricht konnte nicht gesendet werden",
  },
  telegram: {
    title: "Telegram-Bot",
    description:
      "Verbinden Sie Ihre AnyLLM-Instanz mit Telegram, damit Sie von jedem Gerät mit Ihren Arbeitsbereichen chatten können.",
    setup: {
      step1: {
        title: "Schritt 1: Erstellen Sie Ihren Telegram-Bot",
        description:
          "Öffnen Sie @BotFather in Telegram, senden Sie <code>/newbot</code> an <code>@BotFather</code>, befolgen Sie die Anweisungen und kopieren Sie den API-Token.",
        "open-botfather": "Öffnen Sie BotFather",
        "instruction-1": "1. Öffnen Sie den Link oder scannen Sie den QR-Code",
        "instruction-2":
          "2. Senden Sie <code>/newbot</code> an <code>@BotFather</code>",
        "instruction-3":
          "3. Wählen Sie einen Namen und einen Benutzernamen für Ihren Bot aus.",
        "instruction-4": "4. Kopieren Sie den API-Token, den Sie erhalten.",
      },
      step2: {
        title: "Schritt 2: Verbinden Sie Ihren Bot",
        description:
          "Fügen Sie den API-Token ein, den Sie von @BotFather erhalten haben, und wählen Sie einen Standard-Arbeitsbereich für Ihren Bot aus, mit dem er kommunizieren soll.",
        "bot-token": "Bot-Token",
        connecting: "Verbinde...",
        "connect-bot": "Connect-Bot",
      },
      security: {
        title: "Empfohlene Sicherheitseinstellungen",
        description:
          "Für zusätzliche Sicherheit, konfigurieren Sie diese Einstellungen über @BotFather.",
        "disable-groups":
          "– Verhinderung der automatisierten Anmeldung von Bots in Gruppen",
        "disable-inline":
          "– Verhindern Sie die Verwendung von Bots in der Inline-Suche",
        disableGroups: "Gruppen deaktivieren",
        disableInline: "Inline deaktivieren",
        "obscure-username":
          "Verwenden Sie einen Benutzernamen für den Bot, der nicht offensichtlich ist, um die Auffindbarkeit zu reduzieren.",
      },
      "toast-enter-token": "Bitte geben Sie einen Bot-Token ein.",
      "toast-connect-failed":
        "Verbindung zum Bot konnte nicht hergestellt werden.",
    },
    connected: {
      status: "Verbunden",
      "status-disconnected":
        "Abgekoppelt – Token möglicherweise abgelaufen oder ungültig",
      "placeholder-token": "Neuen Bot-Token einfügen...",
      reconnect: "Wiederherstellen",
      workspace: "Arbeitsbereich",
      "bot-link": "Link",
      "voice-response": "Sprachantwort",
      disconnecting: "Abmelden...",
      disconnect: "Abkoppeln",
      "voice-text-only": "Nur Text",
      "voice-mirror":
        "Echo (Antworten mit Sprache, wenn der Benutzer Sprache sendet)",
      "voice-always":
        "Bitte immer Sprachnachrichten senden (Audio mit jeder Antwort hinzufügen)",
      connectedBot: "Verbundener Bot",
      "toast-disconnect-failed":
        "Es konnte nicht erfolgreich die Verbindung zum Bot trennen.",
      "toast-reconnect-failed":
        "Verbindung zum Bot konnte nicht hergestellt werden.",
      "toast-voice-failed":
        "Fehlgeschlagen bei der Aktualisierung des Sprachmodus.",
      "toast-approve-failed": "Benutzer konnte nicht autorisiert werden.",
      "toast-deny-failed": "Nicht in der Lage, den Benutzer abzuweisen.",
      "toast-revoke-failed":
        "Fehlgeschlagener Versuch, das Benutzerkonto zu deaktivieren.",
    },
    users: {
      "pending-description":
        "Benutzer, die noch verifiziert werden müssen. Vergleichen Sie den hier angezeigten Pairing-Code mit dem, der in ihrem Telegram-Chat angezeigt wird.",
      unknown: "Unbekannt",
    },
    details: {
      title: "Details",
      thread: "Thread",
      model: "Modell",
    },
  },
  scheduledJobs: {
    title: "Geplante Aufgaben",
    enableNotifications:
      "Aktivieren Sie Benachrichtigungen im Browser für Stellenangebote",
    description:
      "Erstellen Sie wiederkehrende KI-Aufgaben, die zu einem bestimmten Zeitpunkt ausgeführt werden. Jede Aufgabe führt eine Anfrage aus, optional mit zusätzlichen Werkzeugen, und speichert das Ergebnis zur Überprüfung.",
    newJob: "Neue Arbeitsstelle",
    loading: "Laden...",
    emptyTitle: "Noch keine geplante Aufgaben",
    emptySubtitle: "Erstellen Sie eines, um anzufangen.",
    table: {
      name: "Name",
      schedule: "Zeitplan",
      status: "Status",
      lastRun: "Letzter Lauf",
      nextRun: "Nächster Lauf",
      actions: "Aktionen",
    },
    confirmDelete:
      "Sind Sie sicher, dass Sie diesen geplanten Job löschen möchten?",
    toast: {
      deleted: "Stellenanzeige gelöscht",
      triggered: "Die Aufgabe wurde erfolgreich gestartet.",
      triggerFailed: "Fehlgeschlagenes Auslösen der Aufgabe",
      triggerSkipped: "Die Arbeiten für dieses Projekt sind bereits in Gang",
      killed: "Die Arbeit wurde erfolgreich beendet.",
      killFailed: "Nicht in der Lage, die Arbeit zu beenden",
    },
    row: {
      neverRun: "Bitte niemals laufen",
      viewRuns: "Laufstrecken",
      runNow: "Beginnen Sie jetzt",
      enable: "Aktivieren",
      disable: "Deaktivieren",
      edit: "Bearbeiten",
      delete: "Löschen",
    },
    modal: {
      titleEdit: "Geplante Aufgabe bearbeiten",
      titleNew: "Neuer geplanter Job",
      nameLabel: "Name",
      namePlaceholder: "z.B. Tages-Nachrichten-Zusammenfassung",
      promptLabel: "Anweisung",
      promptPlaceholder:
        "Die Anweisung, dass es bei jeder Ausführung erfolgen soll…",
      scheduleLabel: "Zeitplan",
      modeBuilder: "Bauunternehmer",
      modeCustom: "Maßgeschneidert",
      cronPlaceholder: "Ausdruck für die Ausführungszeit (z. B. 0 9 * * *)",
      currentSchedule: "Aktueller Zeitplan:",
      toolsLabel: "Werkzeuge (optional)",
      toolsDescription:
        "Wählen Sie, welche Agenten-Tools für diese Aufgabe verwendet werden können. Wenn keine Tools ausgewählt sind, wird die Aufgabe ohne Verwendung von Tools ausgeführt.",
      toolsSearch: "Suche",
      toolsNoResults: "Keine der verfügbaren Werkzeuge passen",
      required: "Erforderlich",
      requiredFieldsBanner:
        "Bitte füllen Sie alle erforderlichen Felder aus, um die Stellenanzeige zu erstellen.",
      cancel: "Abbrechen",
      saving: "Sparen...",
      updateJob: "Stellenanzeige aktualisieren",
      createJob: "Stellenanzeige erstellen",
      jobUpdated: "Stellenanzeige aktualisiert",
      jobCreated: "Arbeitsstelle geschaffen",
    },
    builder: {
      fallbackWarning:
        'Dieser Text kann nicht visuell bearbeitet werden. Verwenden Sie die Option "Benutzerdefiniert", um ihn beizubehalten, oder ändern Sie die entsprechenden Felder unten, um ihn zu überschreiben.',
      run: "Laufen",
      frequency: {
        minute: "jede Minute",
        hour: "pro Stunde",
        day: "täglich",
        week: "wöchentlich",
        month: "monatlich",
      },
      every: "Jeder",
      minuteOne: "1 Minute",
      minuteOther: "{{count}} Minuten",
      atMinute: "In der Minute",
      pastEveryHour: "in jeder Stunde",
      at: "Bei",
      on: "Über",
      onDay: "An einem Tag",
      ofEveryMonth: "für jeden Monat",
      weekdays: {
        sun: "Sonne",
        mon: "Montag",
        tue: "Dienstag",
        wed: "Mittwoch",
        thu: "Donnerstag",
        fri: "Freitag",
        sat: "Samstag",
      },
    },
    runHistory: {
      back: "Zurück zu Stellen",
      title: "Verlauf: {{name}}",
      schedule: "Zeitplan:",
      emptyTitle: "Noch keine Fortschritte bei dieser Aufgabe.",
      emptySubtitle:
        "Führen Sie die Aufgabe jetzt aus und überprüfen Sie die Ergebnisse.",
      runNow: "Jetzt los!",
      table: {
        status: "Status",
        started: "Angefangen",
        duration: "Dauer",
        error: "Fehler",
      },
      stopJob: "Arbeitsplatz verlassen",
    },
    runDetail: {
      loading: "Details zum Ladevorgang werden geladen...",
      notFound: "Fehler: Befehl nicht gefunden.",
      back: "Zurück",
      unknownJob: "Unbekannte Stellenbezeichnung",
      runHeading: "{{name}} – Ausführung #{{id}}",
      duration: "Dauer: {{value}}",
      creating: "Erstellen...",
      threadFailed: "Fehlgeschlagen beim Erstellen des Threads",
      sections: {
        prompt: "Anfrage",
        error: "Fehler",
        thinking: "Gedanken ({{count}})",
        toolCalls: "Funktionsaufrufe ({{count}})",
        files: "Dateien ({{count}})",
        response: "Antwort",
        metrics: "Kennzahlen",
        dash: "\u2014",
      },
      metrics: {
        promptTokens: "Auslöse-Token:",
        completionTokens: "Abschluss-Token:",
      },
      stopJob: "Arbeitsplatz verlassen",
      killing: "Anhalten...",
      continueInThread: "Weiter im Chat",
    },
    toolCall: {
      arguments: "Argumente:",
      showResult: "Ergebnis anzeigen",
      hideResult: "Ergebnis ausblenden",
    },
    file: {
      unknown: "Unbekannte Datei",
      download: "Herunterladen",
      downloadFailed: "Datei konnte nicht heruntergeladen werden",
      types: {
        powerpoint: "PowerPoint",
        pdf: "PDF-Dokument",
        word: "Word-Dokument",
        spreadsheet: "Tabellenkalkulation",
        generic: "Datei",
      },
    },
    status: {
      completed: "Abgeschlossen",
      failed: "Fehlgeschlagen",
      timed_out: "Zeitüberschreitung",
      running: "Laufen",
      queued: "Warteschlange",
    },
  },
  "model-router": {
    title: "Modell-Router",
    description:
      "Modellroutern ermöglichen es Ihnen, Regeln zu definieren, um Chat-Nachrichten automatisch an verschiedene LLM-Anbieter und -Modelle auf der Grundlage bestimmter Bedingungen weiterzuleiten.",
    table: {
      name: "Name",
      fallback: "Notfallplan",
      rules: "Regeln",
      workspaces: "Arbeitsbereiche",
    },
    "no-routers": "Es gibt derzeit noch keine Modelle von Routern.",
    "empty-description":
      "Noch keine Router-Modelle konfiguriert. Erstellen Sie eines, um loszulegen.",
    "new-router-button": "Neuer Router",
    "delete-confirm":
      'Sind Sie sicher, dass Sie den Router "{{name}}" löschen möchten?\nDadurch werden alle seine Einstellungen und alle Arbeitsbereiche, die er verwendet, getrennt.\n\nDiese Aktion ist nicht rückgängig machbar.',
    "toast-deleted": "Router gelöscht",
    "toast-delete-failed": "Fehler beim Löschen des Routers: {{error}}",
    "new-router": {
      title: "Neuen Router erstellen",
      name: "Name",
      "name-placeholder": "z.B. Kostenoptimierer",
      description: "Beschreibung",
      "description-placeholder": "Optionale Beschreibung",
      "fallback-label": "Hauptanbieter und -modell",
      "fallback-description":
        "Wird verwendet, wenn keine Routing-Regel übereinstimmt. Wird auch verwendet, um die von LLMs (Large Language Models) klassifizierten Regeln zu bewerten.",
      "cooldown-label": "Abkühlzeit (Sekunden)",
      "cooldown-help":
        "Wie lange eine Routing-Entscheidung zwischengespeichert wird, bevor die Regeln erneut überprüft werden. Auf 0 setzen, um das Zwischenspeichern zu deaktivieren.",
      "name-required": "Ein Name ist erforderlich.",
      "fallback-required":
        "Es werden ein Hauptanbieter und ein Modell erforderlich.",
      cancel: "Abbrechen",
      create: "Router erstellen",
    },
    "edit-router": {
      "back-to-routers": "Zurück zu Routern",
      title: "Router bearbeiten: {{name}}",
      save: "Änderungen speichern",
      "toast-update-failed": "Router konnte nicht aktualisiert werden.",
    },
    rules: {
      title: "Routing-Regeln",
      "title-with-name": "Router-Regeln: {{name}}",
      description:
        "Definieren Sie die Regeln, die bestimmen, wann und wie Chat-Nachrichten bestimmten Anbietern und Modellen zugestellt werden.",
      "add-rule": "Regel hinzufügen",
      "delete-confirm": 'Entferne die Regel "{{title}}"?',
      "toast-delete-failed": "Fehlgeschlagen beim Löschen der Regel",
      "toast-reorder-failed": "Fehlgeschlagene Wiederholung der Regeln",
      "no-rules": "Noch keine Regeln",
      "empty-description":
        "Fügen Sie eine Regel hinzu, um Chat-Nachrichten an bestimmte Anbieter und Modelle weiterzuleiten.",
      "new-rule-button": "Neue Regel",
      "calculated-section-label":
        "Berechnete Regeln – zuerst bewertet, in Prioritätsreihenfolge",
      "llm-section-label":
        "Regeln für LLM – werden als Batch ausgewertet, wenn keine der berechneten Regeln übereinstimmt",
      "llm-rule-body":
        'Vergleichen Sie <desc>"{{description}}"</desc>, und leiten Sie dann den Pfad zu <route>{{route}}</route> weiter.',
      "calculated-no-conditions":
        "Keine Bedingungen – Route zu <route>{{route}}</route>",
      "calculated-single-condition":
        'Wenn <prop>{{property}}</prop> {{comparator}} <val>"{{value}}"</val> der Fall ist, dann die Route zu <route>{{route}}</route> wählen.',
      "calculated-multi-condition":
        "Wenn {{quantifier}} von <cond>{{conditions}}</cond> stammt, dann wird die Route nach <route>{{route}}</route> festgelegt.",
      "comparator-contains": "enthält",
      "comparator-matches": "Spiele",
      "comparator-between": "zwischen",
      "badge-llm": "LLM",
      "badge-calculated": "Berechnet",
      "aria-drag-to-reorder": "Ziehen Sie, um die Reihenfolge zu ändern.",
      "aria-edit-rule": "Regel bearbeiten",
      "aria-delete-rule": "Regel löschen",
      "quantifier-any": "ALLE",
      "quantifier-all": "ALLE",
    },
    "rule-form": {
      "title-label": "Titel",
      "rule-type": "Regeltyp",
      "property-label": "Eigentum",
      "property-select": "Auswählen",
      "comparator-label": "Vergleich",
      "comparator-select": "Auswählen",
      "value-label": "Wert",
      "add-condition": "Fügen Sie eine Bedingung hinzu",
      "remove-condition": "Bedingung entfernen",
      "conditions-incomplete":
        "Der Zustand {{index}} ist unvollständig – bitte ergänzen Sie Eigenschaft, Vergleicher und Wert.",
      "match-description-label": "Spielbeschreibung",
      "match-description-placeholder":
        "z.B. Der Nutzer stellt Fragen zu rechtlichen Themen, Verträgen oder Compliance.",
      "match-description-help":
        "Beschreiben Sie die Situation, in der diese Regel angewendet werden soll. Ihr LLM wird dies bewerten, um zu bestimmen, ob die Regel verwendet werden soll.",
      "route-to-label": "Pfad zum Anbieter und zum Modell",
      "route-to-description":
        "Wenn diese Regel zutrifft, verwenden Sie diesen Anbieter/dieses Modell.",
      cancel: "Abbrechen",
      saving: "Sparen...",
      "update-rule": "Regel zur Aktualisierung",
      "create-rule": "Regel erstellen",
      "title-required": "Ein Titel ist erforderlich.",
      "toast-save-failed": "Fehlgeschlagenes Speichern der Regel",
      "type-calculated-label": "Berechnet",
      "type-calculated-description":
        "Vergleichen Sie Nachrichten anhand von Eigenschaften wie Inhalt, Anzahl der Token oder Tageszeit.",
      "type-llm-label": "Klassifizierte LLM-Modelle",
      "type-llm-description":
        "Nutzen Sie ein LLM (Large Language Model), um die Nachricht basierend auf einer von Ihnen bereitgestellten Beschreibung zu klassifizieren.",
      "prop-prompt-content": "Inhalt der Anfrage",
      "prop-token-count": "Anzahl der Gesprächstoken",
      "prop-message-count": "Anzahl der Nachrichten in einem Gespräch",
      "prop-current-hour": "Aktuelle Uhrzeit (0-23)",
      "prop-has-image": "Enthält ein Bild",
      "cmp-contains": "enthält",
      "cmp-matches-regex": "Übereinstimmungen (regulärer Ausdruck)",
      "cmp-equals": "entspricht",
      "cmp-not-equals": "gleich nicht",
      "cmp-greater-than": "größer als",
      "cmp-greater-than-or-equal": "größer oder gleich",
      "cmp-less-than": "weniger als",
      "cmp-less-than-or-equal": "weniger als oder gleich",
      "cmp-between": "zwischen (einschließlich)",
      "placeholder-between-hour": "z.B. 9,17 Uhr (von 9 bis 17 Uhr)",
      "placeholder-between-numeric": "z.B. 10,50",
      "placeholder-hour": "z.B. 18 (0-23)",
      "placeholder-message-count": "z.B. 10",
      "placeholder-numeric": "z.B. 4000",
      "placeholder-contains": "z.B. Code, Python, Rust",
      "placeholder-matches": "z.B. `/\\bpython\\b/i`",
      "placeholder-default": "z.B. Code",
      "help-contains":
        "Liste, getrennt durch Kommas – entspricht, wenn die Eingabe einen der Werte (Groß- und Kleinschreibung wird ignoriert) enthält.",
      "help-matches":
        "Regex-Muster. Verwenden Sie `/muster/Flags`, um die Groß- und Kleinschreibung zu berücksichtigen (Standard ist keine Berücksichtigung).",
      "bool-true": "Richtig",
      "bool-false": "Falsch",
    },
    "provider-picker": {
      "select-provider": "Auswählen des Anbieters",
      "setup-required": "(Erfordert eine bestimmte Einrichtung)",
      "loading-models": "Modelle werden geladen...",
      "select-model": "Modell auswählen",
      "enter-model": "Bitte geben Sie den Modellnamen ein",
      "select-provider-first": "Wählen Sie zunächst einen Anbieter aus.",
      "configure-to-continue": "Konfigurieren Sie {{name}}, um fortzufahren",
      "configure-provider": "Konfigurieren Sie {{name}}",
      "setup-credentials":
        "Geben Sie die erforderlichen Anmeldeinformationen ein, um {{name}} als Ziel für die Weiterleitung zu verwenden.",
      cancel: "Abbrechen",
      "save-settings": "Einstellungen speichern",
      "toast-save-failed": "Fehler beim Speichern der Einstellungen: {{error}}",
    },
    "router-selection": {
      "loading-routers": "Benutzerdefinierte Router werden geladen...",
      "no-routers-prefix-settings": "Noch keine Router-Modelle konfiguriert.",
      "no-routers-prefix-workspace": "Keine Router-Konfiguration vorhanden.",
      "no-routers-link":
        "Erstellen Sie eine in den Einstellungen des Modellerouter",
      "model-router-label": "Modell-Router",
      "select-router": "Wählen Sie einen Router aus.",
      "select-description":
        "Wählen Sie den Router, den Sie für diesen Arbeitsbereich verwenden möchten.",
      "no-routers-chat":
        'Keine Router konfiguriert. Erstellen Sie einen im Menü "Einstellungen > KI-Anbieter > Modell-Router".',
      "rule-count": "({{count}} Regeln)",
    },
    metrics: {
      "model-router-default": "Modell-Router",
    },
    chat: {
      "select-router-error": "Wählen Sie einen Router aus.",
      "invalid-model": "Ungültige Modellauswahl",
      "routed-to": "Weitergeleitet am <route>{{model}}</route>",
      "routed-to-rule":
        "Weitergeleitet über <route>{{model}}</route> nach <rule>{{ruleTitle}}</rule>",
    },
  },
  sqlConnection: {
    editTitle: "SQL-Verbindung bearbeiten",
    newTitle: "Neue SQL-Verbindung",
    descriptionEdit:
      "Aktualisieren Sie die Verbindungsinformationen für Ihre Datenbank unten.",
    descriptionNew:
      "Fügen Sie die Verbindungsinformationen für Ihre Datenbank unten hinzu und sie wird für zukünftige SQL-Agent-Aufrufe verfügbar sein.",
    warningLabel: "WARNUNG:",
    warningText: "Der SQL-Agent wurde",
    warningInstructed: "angewiesen",
    warningToOnlyPerform:
      "nur nicht-modifizierende Abfragen durchzuführen. Dies",
    warningDoesNotPrevent: "verhindert",
    warningDoesNotPrevent2:
      "nicht, dass eine Halluzination trotzdem Daten löscht. Stellen Sie nur eine Verbindung mit einem Benutzer her, der",
    warningReadOnly: "READ_ONLY",
    warningReadOnly2: "Berechtigungen hat.",
    selectEngine: "Wählen Sie Ihre SQL-Engine",
    connectionName: "Verbindungsname",
    connectionNamePlaceholder:
      "ein eindeutiger Name zur Identifizierung dieser SQL-Verbindung",
    databaseUser: "Datenbankbenutzer",
    databaseUserPlaceholder: "root",
    databasePassword: "Datenbankbenutzer-Passwort",
    databasePasswordPlaceholder: "passwort123",
    serverEndpoint: "Server-Endpunkt",
    serverEndpointPlaceholder: "der Hostname oder Endpunkt für Ihre Datenbank",
    port: "Port",
    portPlaceholder: "3306",
    database: "Datenbank",
    databasePlaceholder: "die Datenbank, mit der der Agent interagieren wird",
    schemaOptional: "Schema (optional)",
    schemaPlaceholder: "public (Standard-Schema, wenn nicht angegeben)",
    enableEncryption: "Verschlüsselung aktivieren",
    cancel: "Abbrechen",
    validating: "Wird validiert...",
    saveConnection: "Verbindung speichern",
    duplicateError:
      'Eine Verbindung mit dem Namen "{{name}}" existiert bereits. Bitte wählen Sie einen anderen Namen.',
    fillAllFields: "Bitte füllen Sie alle Felder oben aus.",
    validationFailed:
      "Verbindung konnte nicht validiert werden. Bitte überprüfen Sie Ihre Verbindungsdaten.",
    connectionFailed:
      "Datenbankverbindung konnte nicht hergestellt werden. Bitte überprüfen Sie Ihre Verbindungsdaten.",
  },
  apiCallNode: {
    url: "URL",
    urlPlaceholder: "https://api.example.com/endpoint",
    insertVariable: "Variable einfügen",
    selectVariableToInsert: "Variable zum Einfügen auswählen",
    method: "Methode",
    headers: "Header",
    addHeader: "Header hinzufügen",
    headerName: "Header-Name",
    headerValue: "Wert",
    removeHeader: "Header entfernen",
    requestBody: "Request Body",
    json: "JSON",
    rawText: "Rohtext",
    formData: "Formulardaten",
    jsonPlaceholder: '{"key": "value"}',
    formKey: "Schlüssel",
    formValue: "Wert",
    removeField: "Feld entfernen",
    addFormField: "Formularfeld hinzufügen",
    rawRequestBody: "Roher Anfragebody...",
    storeResponseIn: "Antwort speichern in",
    selectOrCreateVariable: "Variable auswählen oder erstellen",
  },
  drupalWiki: {
    baseUrlLabel: "Drupal Wiki Basis-URL",
    baseUrlDescription:
      "Dies ist die Basis-URL Ihrer <a>Drupal Wiki</a>-Seite.",
    baseUrlPlaceholder:
      "z.B. https://mywiki.drupal-wiki.net, https://drupalwiki.myfirma.tld, usw...",
    spaceIdsLabel: "Drupal Wiki Space-IDs",
    spaceIdsDescription:
      "Kommagetrennte Space-IDs, die Sie extrahieren möchten. Siehe <a>Handbuch</a> zum Abrufen der Space-IDs. Stellen Sie sicher, dass Ihr 'API-Token-Benutzer' Zugriff auf diese Spaces hat.",
    spaceIdsPlaceholder: "z.B. 12,34,69",
    apiTokenLabel: "Drupal Wiki API-Token",
    apiTokenTooltip:
      "Sie müssen einen API-Token zur Authentifizierung bereitstellen. Siehe das Drupal Wiki <a>Handbuch</a> zum Generieren eines API-Tokens für Ihren Benutzer.",
    apiTokenDescription: "Zugriffstoken für die Authentifizierung.",
    apiTokenPlaceholder: "pat:123",
    submitButton: "Absenden",
    collectingButton: "Seiten werden gesammelt...",
    collectingDescription:
      "Nach Abschluss stehen alle Seiten zur Einbettung in Workspaces zur Verfügung.",
    toastFetching:
      "Alle Seiten für die angegebenen Drupal Wiki Spaces werden abgerufen - dies kann eine Weile dauern.",
    toastSuccess:
      "Seiten von Drupal Wiki Spaces {{spaceIds}} gesammelt. Ausgabeordner ist {{destination}}.",
  },
  fileUploadWarning: {
    embeddingProgress: "Einbettung {{current}} von {{total}} {{fileWord}}",
    pleaseWait: "Bitte warten Sie, während wir Ihre Dateien einbetten...",
    title: "Kontextfenster-Warnung",
    description:
      "Ihr Workspace verwendet {{tokenCount}} von {{maxTokens}} verfügbaren Token. Wir empfehlen, die Nutzung unter {{limit}}% zu halten, um die beste Chat-Erfahrung zu gewährleisten. Das Hinzufügen von {{fileCount}} weiteren {{fileWord}} würde dieses Limit überschreiten. <a>Mehr über Kontextfenster erfahren →</a>",
    chooseAction: "Wählen Sie, wie Sie mit diesen Uploads fortfahren möchten.",
    cancel: "Abbrechen",
    continueAnyway: "Trotzdem fortfahren",
    embedFile: "{{fileWord}} einbetten",
  },
  providerKeyStatus: {
    section: {
      ariaLabel: "Provider-API-Key-Status",
      title: "Lokale Provider — API-Key-Status",
      subtitle:
        "Fallback aktiv = Provider läuft mit sicherem Platzhalter-Key (kein Crash, aber kein echter Key gesetzt).",
    },
    refresh: {
      ariaLabel: "Status neu laden",
      button: "Aktualisieren",
    },
    status: {
      keySet: "Key gesetzt",
      fallbackActive: "Fallback aktiv",
      notConfigured: "Nicht konfiguriert",
    },
    error: {
      loadFailed: "Status konnte nicht geladen werden: {{error}}",
    },
    loading: "Lade Provider-Status…",
    empty: "Keine lokalen Provider registriert.",
    storagePath: {
      problem:
        "Speicherpfad-Problem erkannt: {{path}} (existiert: {{exists}}, beschreibbar: {{writable}}, Hotdir: {{hotdir}}).",
      ok: "ok",
      missing: "fehlt",
    },
    lastChecked: "Zuletzt geprüft: {{time}}",
  },
  pgVector: {
    connectionString: {
      label: "Postgres Connection String",
      placeholder: "postgresql://username:password@host:port/database",
      tooltip: {
        intro:
          "Dies ist die Verbindungszeichenfolge für die Postgres-Datenbank im Format",
        permissions:
          "Der Benutzer für die Datenbank muss die folgenden Berechtigungen haben:",
        perm1: "Lesezugriff auf die Datenbank",
        perm2: "Lesezugriff auf das Datenbankschema",
        perm3: "Erstellungszugriff auf die Datenbank",
        extension:
          "Sie müssen die pgvector-Erweiterung in der Datenbank installiert haben.",
      },
    },
    tableName: {
      label: "Vector Table Name",
      placeholder: "vector_table",
      tooltip: {
        intro:
          "Dies ist der Name der Tabelle in der Postgres-Datenbank, in der die Vektoren gespeichert werden.",
        default: "Standardmäßig lautet der Tabellenname",
        warning:
          "Diese Tabelle darf noch nicht in der Datenbank vorhanden sein - sie wird automatisch erstellt.",
      },
    },
  },
  defaultSystemPrompt: {
    title: "Default System Prompt",
    subtitle:
      "Dies ist der Standard-System-Prompt, der für neue Workspaces verwendet wird.",
    label: "System Prompt",
    description: {
      part1:
        "Ein System-Prompt enthält Anweisungen, die die Antworten und das Verhalten der KI formen. Dieser Prompt wird automatisch auf alle neu erstellten Workspaces angewendet. Um den System-Prompt eines",
      specificWorkspace: "bestimmten Workspaces",
      part2: "zu ändern, bearbeiten Sie den Prompt in den",
      workspaceSettings: "Workspace-Einstellungen",
      part3:
        ". Um den System-Prompt auf unsere sinnvolle Standardeinstellung zurückzusetzen, lassen Sie dieses Feld leer und speichern Sie die Änderungen.",
    },
    variables: {
      intro: "Sie können",
      linkText: "System-Prompt-Variablen",
      like: "wie folgt einfügen:",
      more: "+{{count}} mehr...",
    },
    placeholder:
      "Sie sind ein KI-Assistent, der Fragen beantworten und bei Aufgaben helfen kann.",
    toast: {
      success: "Default System Prompt erfolgreich aktualisiert.",
      failure:
        "Fehler beim Aktualisieren des Default System Prompts: {{message}}",
    },
  },
  newUserModal: {
    title: "Benutzer zur Instanz hinzufügen",
    username: {
      label: "Benutzername",
      placeholder: "Benutzername des Nutzers",
    },
    password: {
      label: "Passwort",
      placeholder: "Initiales Passwort des Nutzers",
      hint: "Das Passwort muss mindestens 8 Zeichen lang sein",
    },
    bio: {
      label: "Bio",
      placeholder: "Bio des Nutzers",
    },
    role: {
      label: "Rolle",
      admin: "Administrator",
    },
    error: "Fehler: {{error}}",
    afterCreate:
      "Nach dem Erstellen eines Benutzers muss sich dieser mit seinem initialen Login anmelden, um Zugriff zu erhalten.",
    submit: "Benutzer hinzufügen",
  },
  liteLLM: {
    baseUrl: {
      label: "Basis-URL",
      placeholder: "http://127.0.0.1:4000",
    },
    maxChunkLength: {
      label: "Maximale Embedding-Chunk-Länge",
      placeholder: "8192",
      tooltip: "Maximale Länge von Text-Chunks in Zeichen für das Embedding.",
    },
    apiKey: {
      label: "API-Schlüssel",
      placeholder: "sk-mysecretkey",
    },
    modelSelection: {
      label: "Embedding-Modellauswahl",
      loadingModels: "-- lade verfügbare Modelle --",
      waitingForUrl: "-- warte auf URL --",
      yourLoadedModels: "Ihre geladenen Modelle",
      tooltip: {
        intro:
          "Stellen Sie sicher, dass Sie ein gültiges Embedding-Modell auswählen. Chat-Modelle sind keine Embedding-Modelle. Siehe",
        linkText: "diese Seite",
        outro: "für weitere Informationen.",
      },
    },
  },
  kokoro: {
    intro: {
      part1: "Verbinden Sie sich mit einem selbstgehosteten",
      linkText: "kokoro-fastapi",
      part2: "Server. Die Stimmenliste wird live von Ihrem Server abgerufen.",
    },
    baseUrl: {
      label: "Basis-URL",
      placeholder: "http://localhost:8880/v1",
      help: "Die OpenAI-kompatible Basis-URL Ihres {{service}}-Servers.",
    },
    apiKey: {
      label: "API-Schlüssel",
      placeholder: "Optionaler API-Schlüssel",
      help: "Optional — nur erforderlich, wenn Sie Ihren Kokoro-Server mit Authentifizierung absichern.",
    },
    voiceModel: {
      label: "Stimm-Modell",
      loading: "-- lade verfügbare Stimmen --",
      placeholder: "af_bella",
      unreachable:
        "Der Kokoro-Server konnte nicht erreicht werden, um Stimmen zu laden. Geben Sie eine Stimmen-ID manuell ein.",
    },
  },
  webScrapingNode: {
    urlLabel: "URL zum Scrapen",
    urlPlaceholder: "https://example.com",
    captureAsLabel: "Seiteninhalt erfassen als",
    captureAs: {
      text: "Nur Textinhalt",
      html: "Rohes HTML",
      querySelector: "CSS Query Selector",
    },
    querySelectorLabel: "Query Selector",
    querySelectorHelp:
      "Geben Sie einen gültigen CSS-Selector ein, um den Inhalt der Seite zu scrapen.",
    querySelectorPlaceholder: ".article-content, #content, .main-content, etc.",
    contentSummarization: "Inhaltszusammenfassung",
    resultVariable: "Ergebnis-Variable",
    selectOrCreateVariable: "Variable auswählen oder erstellen",
  },
  agentSkill: {
    warning: {
      title: "Importieren Sie nur Agent-Skills, denen Sie vertrauen",
      body: "Agent-Skills können Code auf Ihrer OpenSIN Chat-Instanz ausführen, importieren Sie daher nur Agent-Skills aus Quellen, denen Sie vertrauen. Sie sollten den Code auch vor dem Import überprüfen. Wenn Sie sich nicht sicher sind, was ein Skill tut - importieren Sie ihn nicht!",
    },
    reviewTitle: 'Agent-Skill "{{name}}" überprüfen',
    createdBy: "Erstellt von",
    verified: "Verifizierter Code",
    notVerified: "Dieser Skill ist nicht verifiziert.",
    learnMore: "Mehr erfahren →",
    description: {
      part1:
        "Agent-Skills schalten neue Fähigkeiten für Ihren OpenSIN Chat-Workspace frei via",
      part2: "Skills, die bei Aufruf bestimmte Aufgaben erledigen können.",
    },
    fileCounter: "{{name}} ({{current}} von {{total}} Dateien)",
    import: "Agent-Skill importieren",
    toast: {
      importSuccess: "Agent-Skill erfolgreich importiert!",
      importFailed: "Fehler beim Importieren des Agent-Skills. {{message}}",
    },
  },
  textToSpeech: {
    openAiGeneric: {
      baseUrl: "Basis-URL",
      baseUrlPlaceholder: "http://localhost:7851/v1",
      baseUrlDescription:
        "Dies sollte die Basis-URL des OpenAI-kompatiblen TTS-Dienstes sein, von dem Sie TTS-Antworten generieren.",
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "API-Schlüssel",
      apiKeyDescription:
        "Einige TTS-Dienste erfordern einen API-Schlüssel zur Generierung von TTS-Antworten — dies ist optional, wenn Ihr Dienst keinen benötigt.",
      ttsModel: "TTS-Modell",
      ttsModelPlaceholder: "Ihr TTS-Modell-Bezeichner",
      ttsModelDescriptionPart1:
        "Die meisten TTS-Dienste haben mehrere Modelle verfügbar. Dies ist der ",
      ttsModelDescriptionPart2:
        "-Parameter, den Sie verwenden, um das gewünschte Modell auszuwählen. Hinweis: Dies ist nicht dasselbe wie das Stimmmodell.",
      voiceModel: "Stimmmodell",
      voiceModelPlaceholder: "Ihr Stimmmodell-Bezeichner",
      voiceModelDescription:
        "Die meisten TTS-Dienste haben mehrere Stimmmodelle verfügbar. Dies ist der Bezeichner für das Stimmmodell, das Sie verwenden möchten.",
    },
    openAi: {
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "OpenAI API-Schlüssel",
      voiceModel: "Stimmmodell",
      voices: {
        alloy: "Alloy",
        echo: "Echo",
        fable: "Fable",
        onyx: "Onyx",
        nova: "Nova",
        shimmer: "Shimmer",
      },
    },
    piper: {
      description:
        "Alle PiperTTS-Modelle werden lokal in Ihrem Browser ausgeführt. Dies kann auf leistungsschwächeren Geräten ressourcenintensiv sein.",
      voiceModelSelection: "Stimmmodellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
      storedIndicator:
        'Das "✔" zeigt an, dass dieses Modell bereits lokal gespeichert ist und nicht heruntergeladen werden muss.',
      flushVoiceCache: "Stimmen-Cache leeren",
      flushSuccess: "Alle Stimmen aus dem Browser-Speicher entfernt",
      stopDemo: "Demo stoppen",
      loadingVoice: "Stimme wird geladen",
      playSample: "Beispiel abspielen",
      demoText: "Hallo, willkommen bei OpenSIN Chat!",
    },
    elevenLabs: {
      apiKey: "ElevenLabs API-Schlüssel",
      apiKeyPlaceholder: "ElevenLabs API-Schlüssel",
      modelSelection: "Stimmmodellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
    },
  },
  speechToText: {
    genericOpenAi: {
      baseUrl: "Basis-URL",
      baseUrlPlaceholder: "http://localhost:8000/v1",
      baseUrlDescription:
        "Dies sollte die Basis-URL des OpenAI-kompatiblen STT-Dienstes sein, mit dem Sie Audio transkribieren.",
      apiKey: "API-Schlüssel",
      apiKeyPlaceholder: "API-Schlüssel",
      apiKeyDescription:
        "Einige STT-Dienste erfordern einen API-Schlüssel zur Transkription — dies ist optional, wenn Ihr Dienst keinen benötigt.",
      transcriptionModel: "Transkriptionsmodell",
      modelPlaceholder: "Ihr STT-Modell-Bezeichner",
      modelDescriptionPart1: "Der ",
      modelDescriptionPart2:
        "-Parameter, der an den Transkriptions-Endpunkt übergeben wird (z.B. ",
      modelDescriptionPart3: ").",
    },
    deepgram: {
      apiKey: "Deepgram API-Schlüssel",
      apiKeyPlaceholder: "Deepgram API-Schlüssel",
      modelSelection: "Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
    },
    openAi: {
      apiKey: "OpenAI API-Schlüssel",
      apiKeyPlaceholder: "OpenAI API-Schlüssel",
      modelSelection: "Modellauswahl",
      loadingModels: "-- verfügbare Modelle werden geladen --",
    },
  },
  parsedFilesMenu: {
    currentContext: "Aktueller Kontext ({{count}} Dateien)",
    contextLimitTooltip:
      "Sie haben das Kontextfenster-Limit überschritten. Einige Dateien werden möglicherweise abgeschnitten oder von Chat-Antworten ausgeschlossen. Antworten können halluzinieren oder relevante Informationen fehlen.",
    contextFullWarning:
      "Ihr Kontextfenster wird voll. Einige Dateien werden möglicherweise abgeschnitten oder von Chat-Antworten ausgeschlossen. Wir empfehlen, diese Dateien direkt in Ihren Workspace einzubetten, für bessere Ergebnisse.",
    embedFilesButton: "Dateien in Workspace einbetten",
    embeddingProgress: "Einbetten {{current}} von {{total}} Dateien...",
    embedSuccess_one: "{{count}} Datei erfolgreich eingebettet",
    embedSuccess_other: "{{count}} Dateien erfolgreich eingebettet",
    embedFailed: "Fehler beim Einbetten der Dateien",
    loading: "Wird geladen...",
    noFilesFound: "Keine Dateien gefunden",
  },
  admin: {
    editUser: {
      title: "{{username}} bearbeiten",
      username: "Benutzername",
      usernamePlaceholder: "Benutzername des Benutzers",
      newPassword: "Neues Passwort",
      passwordPlaceholder: "Neues Passwort für {{username}}",
      passwordRequirement: "Passwort muss mindestens 8 Zeichen lang sein",
      bio: "Bio",
      bioPlaceholder: "Bio des Benutzers",
      role: "Rolle",
      roleDefault: "Standard",
      roleManager: "Manager",
      roleAdmin: "Administrator",
      error: "Fehler: {{error}}",
      cancel: "Abbrechen",
      updateUser: "Benutzer aktualisieren",
    },
    systemPromptVariables: {
      addVariable: {
        title: "Neue Variable hinzufügen",
        key: "Schlüssel",
        keyPlaceholder: "z.B., firmenname",
        keyHelp:
          "Der Schlüssel muss eindeutig sein und wird in Prompts als {key} verwendet. Nur Buchstaben, Zahlen und Unterstriche sind erlaubt.",
        value: "Wert",
        valuePlaceholder: "z.B., Acme GmbH",
        description: "Beschreibung",
        descriptionPlaceholder: "Optionale Beschreibung",
        keyValueRequired: "Schlüssel und Wert sind erforderlich",
        createSuccess: "Variable erfolgreich erstellt",
        createFailed: "Fehler beim Erstellen der Variable",
        error: "Fehler: {{error}}",
        cancel: "Abbrechen",
        createVariable: "Variable erstellen",
      },
      editVariable: {
        title: "{{key}} bearbeiten",
        updateSuccess: "Variable erfolgreich aktualisiert",
        updateFailed: "Fehler beim Aktualisieren der Variable",
        updateVariable: "Variable aktualisieren",
      },
      page: {
        title: "System-Prompt-Variablen",
        description:
          "System-Prompt-Variablen werden verwendet, um Konfigurationswerte zu speichern, die in Ihrem System-Prompt referenziert werden können, um dynamische Inhalte in Ihren Prompts zu aktivieren.",
        addVariable: "Variable hinzufügen",
        noVariablesFound: "Keine Variablen gefunden",
        key: "Schlüssel",
        value: "Wert",
        descriptionLabel: "Beschreibung",
        type: "Typ",
        types: {
          system: "System",
          user: "Benutzer",
          workspace: "Workspace",
          static: "Statisch",
        },
        deleteConfirm:
          'Möchten Sie die Variable "{{key}}" wirklich löschen?\nDiese Aktion ist unwiderruflich.',
        deleteSuccess: "Variable erfolgreich gelöscht",
        deleteFailed: "Variable konnte nicht gelöscht werden",
      },
    },
    newInvite: {
      createInviteTitle: "Neue Einladung erstellen",
      error: "Fehler",
      afterCreationHint:
        "Nach der Erstellung können Sie die Einladung kopieren und an einen neuen Benutzer senden, der ein Konto mit der Standardrolle erstellen und automatisch den ausgewählten Workspaces hinzugefügt werden kann.",
      autoAddToWorkspaces: "Eingeladenen automatisch zu Workspaces hinzufügen",
      workspaceSelectionHint:
        "Sie können den Benutzer optional automatisch den untenstehenden Workspaces zuweisen, indem Sie diese auswählen. Standardmäßig hat der Benutzer keine sichtbaren Workspaces. Sie können Workspaces auch nach der Annahme der Einladung zuweisen.",
      cancel: "Abbrechen",
      createInvite: "Einladung erstellen",
      close: "Schließen",
      copiedToClipboard: "Einladungslink in die Zwischenablage kopiert",
      copyFailed:
        "Fehler beim Kopieren des Einladungslinks in die Zwischenablage",
    },
    usersPage: {
      title: "Benutzer",
      description:
        "Dies sind alle Konten, die auf dieser Instanz registriert sind. Das Entfernen eines Kontos entfernt sofort den Zugriff auf diese Instanz.",
      addUser: "Benutzer hinzufügen",
      username: "Benutzername",
      role: "Rolle",
      dateAdded: "Hinzugefügt am",
      permissions: "Berechtigungen",
      limitMessagesPerDay: "Nachrichten pro Tag begrenzen",
      limitMessagesDescription:
        "Beschränken Sie diesen Benutzer auf eine Anzahl erfolgreicher Abfragen oder Chats innerhalb eines 24-Stunden-Fensters.",
      messageLimitPerDay: "Nachrichtenlimit pro Tag",
      roleHint: {
        default1:
          "Kann nur Chats mit Workspaces senden, zu denen sie von Admins oder Managern hinzugefügt wurden.",
        default2: "Kann keine Einstellungen ändern.",
        manager1:
          "Kann alle Workspaces anzeigen, erstellen und löschen sowie workspace-spezifische Einstellungen ändern.",
        manager2:
          "Kann neue Benutzer erstellen, aktualisieren und zur Instanz einladen.",
        manager3:
          "Kann keine LLM-, VektorDB-, Embedding- oder andere Verbindungen ändern.",
        admin1: "Höchste Benutzerberechtigung.",
        admin2: "Kann alles im System sehen und tun.",
      },
    },
    invitations: {
      title: "Einladungen",
      description:
        "Erstellen Sie Einladungslinks für Personen in Ihrer Organisation, die diese annehmen und sich anmelden können. Einladungen können nur von einem einzigen Benutzer verwendet werden.",
      createInviteLink: "Einladungslink erstellen",
      status: "Status",
      acceptedBy: "Angenommen von",
      createdBy: "Erstellt von",
      created: "Erstellt",
      noInvitations: "Keine Einladungen gefunden",
    },
    workspacesPage: {
      instanceWorkspaces: "Instanz-Workspaces",
      description:
        "Dies sind alle Workspaces, die auf dieser Instanz existieren. Das Entfernen eines Workspaces löscht alle zugehörigen Chats und Einstellungen.",
      newWorkspace: "Neuer Workspace",
      name: "Name",
      link: "Link",
      users: "Benutzer",
      createdOn: "Erstellt am",
      deleteSuccess: "Workspace erfolgreich gelöscht.",
    },
    newWorkspaceModal: {
      title: "Neuen Workspace erstellen",
      placeholder: "Mein Workspace",
      error: "Fehler: {{error}}",
      adminOnlyHint:
        "Nach dem Erstellen dieses Workspaces können nur Administratoren ihn sehen. Sie können nach der Erstellung Benutzer hinzufügen.",
      cancel: "Abbrechen",
      create: "Workspace erstellen",
    },
  },
  chatEmbedWidgets: {
    title: "Embed-Widgets",
    back: "Zurück",
    widgets: "Widgets",
    history: "Verlauf",
    editEmbed: {
      title: "Embed #{{id}} aktualisieren",
      titleNamed: "Embed aktualisieren: {{name}}",
      updateSuccess: "Embed erfolgreich aktualisiert.",
      maxChatsPerDay: "Max. Chats pro Tag",
      maxChatsPerDayHint:
        "Begrenzen Sie die Anzahl der Chats, die dieser eingebettete Chat in 24 Stunden verarbeiten kann. Null bedeutet unbegrenzt.",
      maxChatsPerSession: "Max. Chats pro Sitzung",
      maxChatsPerSessionHint:
        "Begrenzen Sie die Anzahl der Chats, die ein Sitzungsbenutzer mit diesem Embed in 24 Stunden senden kann. Null bedeutet unbegrenzt.",
      messageHistoryLimit: "Nachrichtenverlaufslimit",
      messageHistoryLimitHint:
        "Die Anzahl der vorherigen Nachrichten, die im Chat-Kontext enthalten sein sollen. Standard ist 20.",
      enableDynamicModel: "Dynamische Modellauswahl aktivieren",
      enableDynamicModelHint:
        "Ermöglicht das Festlegen des bevorzugten LLM-Modells zur Übersteuerung des Workspace-Standards.",
      enableDynamicTemperature: "Dynamische LLM-Temperatur aktivieren",
      enableDynamicTemperatureHint:
        "Ermöglicht das Festlegen der LLM-Temperatur zur Übersteuerung des Workspace-Standards.",
      enablePromptOverride: "Prompt-Übersteuerung aktivieren",
      enablePromptOverrideHint:
        "Ermöglicht das Festlegen des System-Prompts zur Übersteuerung des Workspace-Standards.",
      error: "Fehler: {{error}}",
      scriptTagNotice:
        "Nach dem Erstellen eines Embeds erhalten Sie einen Link, den Sie mit einem einfachen <script>-Tag auf Ihrer Website veröffentlichen können.",
      cancel: "Abbrechen",
      updateEmbed: "Embed aktualisieren",
    },
  },
  slashPresets: {
    editPreset: {
      title: "Preset bearbeiten",
      command: "Befehl",
      commandPlaceholder: "ihr-befehl",
      prompt: "Prompt",
      promptPlaceholder:
        "Dies ist ein Test-Prompt. Bitte antworten Sie mit einem Gedicht über LLMs.",
      description: "Beschreibung",
      descriptionPlaceholder: "Antwortet mit einem Gedicht über LLMs.",
      deleteConfirm: "Sind Sie sicher, dass Sie dieses Preset löschen möchten?",
      deleting: "Wird gelöscht...",
      deletePreset: "Preset löschen",
      cancel: "Abbrechen",
      save: "Speichern",
    },
  },
  sidebar: {
    mainNavigation: "Hauptnavigation",
    home: "Startseite",
    logo: "Logo",
    resizeSidebar: "Seitenleiste skalieren",
    resizeSidebarTitle: "Ziehen um die Breite der Seitenleiste zu ändern",
    topNavigationMobile: "Obere Navigation - Mobile",
    openSidebar: "Seitenleiste öffnen",
    hideSidebar: "Seitenleiste ausblenden",
    showSidebar: "Seitenleiste einblenden",
    hideSidebarShortcut: "Seitenleiste ausblenden ({{shortcut}})",
    showSidebarShortcut: "Seitenleiste einblenden ({{shortcut}})",
    mobileNavigation: "Seitenleisten-Navigation - Mobile",
    settings: "Einstellungen",
    backToWorkspaces: "Zurück zu Workspaces",
    openSettings: "Einstellungen öffnen",
    workspacesList: "Workspaces",
    generalAppearanceSettings: "Allgemeine Erscheinungseinstellungen",
    database: {
      title: "Abgeordnete",
      source: "Quelle: Abgeordnetenwatch API",
      error: "Fehler:",
      empty: "Keine Daten geladen.",
      hint: 'Tipp: "@agent Suche AfD Abgeordnete..." im Chat für detaillierte Abfragen.',
      openProfile: "Profil öffnen",
    },
    filesystem: {
      title: "Dateien",
      uploadsRoot: "Uploads",
      newFolder: "Neuer Ordner",
      newFile: "Neue Datei",
      folderName: "Ordnername",
      fileName: "Dateiname",
      create: "Erstellen",
      cancel: "Abbrechen",
      delete: "Löschen",
      confirmDelete: "Dieses Element löschen?",
      createSuccess: "Erfolgreich erstellt",
      createFailed: "Erstellung fehlgeschlagen",
      deleteSuccess: "Erfolgreich gelöscht",
      deleteFailed: "Löschen fehlgeschlagen",
      description:
        "Ordner und Dateien erstellen oder Dateien hochladen. Alle im Chat oder als Quelle hinzugefügten Dateien erscheinen hier.",
      error: "Fehler beim Laden:",
      empty: "Verzeichnis ist leer",
      goUp: "Aufwärts",
      systemInfo: "System-Info",
      currentPath: "Aktuell: {{path}}",
      change: "Ändern",
      setDirectory: "Verzeichnis festlegen",
      fileCount_one: "{{count}} Datei",
      fileCount_other: "{{count}} Dateien",
      clearSelection: "Auswahl aufheben",
      directoryConnected: "Verzeichnis verbunden",
      directoryAccessDescription:
        "Die KI in diesem Workspace hat Zugriff auf alle Dateien in diesem Verzeichnis.",
      connecting: "Verbinde...",
      connect: "Verbinden",
    },
    retry: "Erneut versuchen",
    political: {
      title: "Politisches",
      drucksachen: "Bundestag-Drucksachen (AfD)",
      news: "AfD Pressemitteilungen",
      empty: "Keine Drucksachen gefunden.",
      rss_empty: "Keine Pressemitteilungen gefunden.",
      hint: 'Tipp: "@agent Bundestag Drucksache..." im Chat für detaillierte Abfragen.',
    },
    searchWorkspace: "Workspaces und Threads durchsuchen",
  },
  right_sidebar: {
    icon_collapse: "Einklappen",
    icon_expand: "Rechte Seitenleiste",
    icon_preview: "Vorschau",
    icon_filesystem: "Verzeichnis",
    icon_database: "Politiker-Datenbank",
    icon_political: "Politisches",
    icon_sources: "Quellen",
    icon_memories: "Memories",
    icon_console: "Konsole & Terminal",
    icon_pdf_analysis: "PDF-Analyse",
  },
  dataConnectors: {
    paperlessNgx: {
      baseUrl: "Basis-URL",
      baseUrlHelp:
        "Die URL, unter der Ihre Paperless-ngx-Instanz läuft (z.B., http://localhost:8000)",
      baseUrlPlaceholder: "http://localhost:8000",
      apiToken: "API-Token",
      apiTokenHelp:
        "Ihr Paperless-ngx-API-Token. Sie finden dies unter 'Mein Profil' und dann 'API Auth Token'.",
      apiTokenPlaceholder: "Geben Sie Ihren API-Token ein",
      instanceRunningInfo:
        "Stellen Sie sicher, dass Ihre Paperless-ngx-Instanz läuft und von diesem Computer aus erreichbar ist.",
      importingDocuments: "Dokumente werden importiert...",
      submit: "Absenden",
      completeHint:
        "Nach Abschluss stehen alle Dokumente zur Einbettung in Workspaces zur Verfügung.",
      fetchingDocuments:
        "Dokumente werden von Paperless-ngx abgerufen - dies kann eine Weile dauern.",
      successImport:
        "Erfolgreich {{files}} Dokumente von Paperless-ngx importiert. Ausgabeordner ist {{destination}}.",
    },
  },
  chatPromptSettings: {
    youCanInsert: "Sie können einfügen",
    promptVariables: "Prompt-Variablen",
    like: "wie",
    moreCount: "+{{count}} weitere...",
    hideHistory: "Verlauf ausblenden",
    viewHistory: "Verlauf anzeigen",
    restoreToDefault: "Auf Standard zurücksetzen",
    publishToCommunityHub: "Im Community Hub veröffentlichen",
  },
  browserExtensionApiKey: {
    title: "Browser-Erweiterungs-API-Schlüssel",
    description:
      "Verwalten Sie API-Schlüssel für Browser-Erweiterungen, die sich mit Ihrer OpenSIN Chat-Instanz verbinden.",
    generateNewApiKey: "Neuen API-Schlüssel generieren",
    error: "Fehler: {{error}}",
    connectionString: "Erweiterungsverbindungszeichenfolge",
    createdBy: "Erstellt von",
    createdAt: "Erstellt am",
    actions: "Aktionen",
    noApiKeysFound: "Keine API-Schlüssel gefunden",
    revokeConfirm:
      "Sind Sie sicher, dass Sie diesen Browser-Erweiterungs-API-Schlüssel widerrufen möchten?\nNach dem Widerrufen wird er nicht mehr verwendbar sein.\n\nDiese Aktion ist irreversibel.",
    revoked: "Browser-Erweiterungs-API-Schlüssel dauerhaft widerrufen",
    revokeFailed: "Widerruf des API-Schlüssels fehlgeschlagen",
    copiedToClipboard: "Verbindungszeichenfolge in die Zwischenablage kopiert",
    connectingToExtension:
      "Verbindung zur Browser-Erweiterung wird hergestellt...",
    notAvailable: "k.A.",
    newKey: {
      title: "Neuer Browser-Erweiterungs-API-Schlüssel",
      error: "Fehler: {{error}}",
      multiUserWarning:
        "Warnung: Sie befinden sich im Mehrbenutzermodus. Dieser API-Schlüssel ermöglicht den Zugriff auf alle Workspaces Ihres Kontos. Bitte teilen Sie ihn nur mit Vorsicht.",
      autoConnectInfo:
        'Nach dem Klicken auf „API-Schlüssel erstellen" versucht OpenSIN Chat, sich automatisch mit Ihrer Browser-Erweiterung zu verbinden.',
      manualConnectInfo:
        'Wenn Sie in der Erweiterung „Verbunden mit OpenSIN Chat" sehen, war die Verbindung erfolgreich. Andernfalls kopieren Sie bitte die Verbindungszeichenfolge und fügen Sie sie manuell in die Erweiterung ein.',
      cancel: "Abbrechen",
      createApiKey: "API-Schlüssel erstellen",
      copyApiKey: "API-Schlüssel kopieren",
      apiKeyCopied: "API-Schlüssel kopiert!",
    },
  },
  footerCustomization: {
    updateSuccess: "Footer-Icons erfolgreich aktualisiert.",
    updateFailed: "Footer-Icons konnten nicht aktualisiert werden: {{error}}",
    newIconForm: {
      urlPlaceholder: "https://example.com",
      save: "Speichern",
    },
  },
  systemHealth: {
    title: "Systemzustand",
    description:
      "Diagnose für lokale LLM-Provider und Speicherpfade: API-Schlüssel-Status, aktive Fallbacks und Erreichbarkeit der konfigurierten Endpunkte.",
    notConfigured: "Nicht konfiguriert",
    reachable: "Erreichbar ({{latencyMs}}ms, HTTP {{status}})",
    notReachable: "Nicht erreichbar",
    probeFailed: "Verbindungstest fehlgeschlagen: {{error}}",
    probeComplete:
      "Verbindungstest abgeschlossen: {{reachable}}/{{configured}} konfigurierte Provider erreichbar.",
    connectivityTest: "Verbindungstest",
    connectivityTestDescription:
      "Prüft aktiv, ob die Basis-URLs der {{count}} konfigurierten Provider antworten (Timeout 4s).",
    testing: "Teste\u2026",
    testNow: "Jetzt testen",
    noTestYet:
      'Noch kein Test ausgeführt. Klicken Sie auf „Jetzt testen", um alle konfigurierten Provider zu prüfen.',
  },
  recoveryCode: {
    title: "Wiederherstellungscodes",
    description:
      "Um Ihr Passwort in Zukunft zurückzusetzen, benötigen Sie diese Wiederherstellungscodes. Laden Sie die Codes herunter oder kopieren Sie sie, um sie zu speichern.",
    shownOnce: "Diese Wiederherstellungscodes werden nur einmal angezeigt!",
    copiedToClipboard: "Wiederherstellungscodes in die Zwischenablage kopiert",
    copiedToClipboardFailed:
      "Fehler beim Kopieren der Wiederherstellungscodes in die Zwischenablage",
    copyAriaLabel: "Wiederherstellungscodes in die Zwischenablage kopieren",
    closeAriaLabel: "Wiederherstellungscodes schließen",
    downloadAriaLabel: "Wiederherstellungscodes herunterladen",
    close: "Schließen",
    download: "Herunterladen",
  },
  newFolderModal: {
    title: "Neuen Ordner erstellen",
    closeAriaLabel: "Neuer-Ordner-Dialog schließen",
    folderNameLabel: "Ordnername",
    folderNamePlaceholder: "Ordnernamen eingeben",
    failedToCreate: "Ordner konnte nicht erstellt werden",
    error: "Fehler: {{error}}",
    cancelAriaLabel: "Ordnererstellung abbrechen",
    cancel: "Abbrechen",
    createFolder: "Ordner erstellen",
  },
  threadFolderItem: {
    chatCreateFailed: "Chat konnte nicht erstellt werden: {{error}}",
    folderNamePrompt: "Ordnername:",
    folderCreateFailed: "Ordner konnte nicht erstellt werden: {{message}}",
    quickAddTitle: "Neuen Chat oder Ordner erstellen",
    newChat: "Neuer Chat",
    newFolder: "Neuer Ordner",
    renameFailed: "Umbenennen fehlgeschlagen: {{message}}",
    deleteConfirm:
      'Ordner "{{name}}" löschen? Alle Chats werden in die Hauptliste verschoben.',
    deleteFailed: "Ordner konnte nicht gelöscht werden.",
    rename: "Umbenennen",
    delete: "Löschen",
    dragHere: "Hierher ziehen",
    folderThreadCount: "({{count}})",
  },
  activeWorkspaces: {
    createTooltip: "Neuen Chat oder Ordner erstellen",
    newChat: "Neuer Chat",
    newFolder: "Neuer Ordner",
    reorderFailed: "Workspace-Sortierung fehlgeschlagen.",
    chatCreateFailed: "Chat konnte nicht erstellt werden: {{error}}",
    folderNamePrompt: "Ordnername:",
    folderCreateFailed: "Ordner konnte nicht erstellt werden: {{message}}",
    uploadDocuments:
      "Dokumente in diesen Workspace für RAG-Indizierung hochladen",
  },
  privacyAndData: {
    telemetryToggled: "Anonyme Telemetrie wurde {{status}}.",
    enabled: "aktiviert",
    disabled: "deaktiviert",
    eventsNoIp:
      'Alle Ereignisse zeichnen keine IP-Adresse auf und enthalten <b>keine identifizierenden</b> Inhalte, Einstellungen, Chats oder andere nicht nutzungsbasierte Informationen. Um die Liste der erfassten Ereignis-Tags einzusehen, können Sie auf <a href="https://github.com/search?q=repo%3AFamily-Team-Projects%2Fopensin-chat%20.sendTelemetry(&amp;type=code" class="underline text-blue-400" target="_blank" rel="noreferrer">GitHub</a> nachsehen.',
    respectPrivacy:
      'Als Open-Source-Projekt respektieren wir Ihr Recht auf Datenschutz. Wir widmen uns der Entwicklung der besten Lösung für die private und sichere Integration von KI und Dokumenten. Wenn Sie sich entscheiden, die Telemetrie zu deaktivieren, bitten wir Sie nur, uns Feedback und Gedanken zu senden, damit wir OpenSIN Chat für Sie weiter verbessern können. <a href="mailto:team@openafd.com" class="underline text-blue-400" target="_blank" rel="noreferrer">team@openafd.com</a>.',
  },
  invite: {
    newUser: {
      createAccount: "Neues Konto erstellen",
      username: "Benutzername",
      usernamePlaceholder: "Mein Benutzername",
      password: "Passwort",
      passwordPlaceholder: "Ihr Passwort",
      error: "Fehler: {{error}}",
      afterCreateHint:
        "Nach der Erstellung Ihres Kontos können Sie sich mit diesen Anmeldedaten anmelden und Workspaces nutzen.",
      acceptInvitation: "Einladung annehmen",
    },
  },
  manageWorkspace: {
    closeDialog: "Workspace-Verwaltungsdialog schließen",
    dismissDialog: "Workspace-Verwaltungsdialog verwerfen",
    showDocumentsTab: "Dokumente-Tab anzeigen",
    showDataConnectorsTab: "Datenkonnektoren-Tab anzeigen",
  },
  multiUserAuth: {
    resetPassword: {
      title: "Passwort zurücksetzen",
      description: "Geben Sie Ihr neues Passwort ein.",
      newPassword: "Neues Passwort",
      confirmPassword: "Passwort bestätigen",
      success: "Passwort erfolgreich zurückgesetzt",
      invalidToken: "Ungültiges Reset-Token",
    },
  },
  thread: {
    deleteMark: "Thread zum Löschen markieren",
    cancelDelete: "Thread-Löschung abbrechen",
  },
  threadContainer: {
    loadingThreads: "Threads werden geladen...",
    moveError: "Thread konnte nicht verschoben werden.",
    dropHere: "Hierher ziehen (ohne Ordner)",
    createError: "Thread konnte nicht erstellt werden - {{error}}",
    startingChat: "Chat wird gestartet...",
    newChat: "Neuer Chat",
    folderNamePrompt: "Ordnername:",
    folderCreateError: "Ordner konnte nicht erstellt werden: {{message}}",
    newFolder: "Neuer Ordner",
    deleteSelected: "Ausgewählte löschen",
  },
  modelTable: {
    modelCount: "({{count}} {{plural}})",
    cpu: "CPU",
    gpu: "GPU",
    npu: "NPU",
    uninstall: "Deinstallieren",
    installModel: "{{organization}}:{{name}} installieren",
    active: "Aktiv",
    installed: "Installiert",
    notInstalled: "Nicht installiert",
    availableModels: "Verfügbare Modelle",
    searchModels: "Modelle suchen",
    refreshModels: "Modelle aktualisieren",
  },
  threadItem: {
    deletedThread: "Gelöschter Thread",
    threadOptions: "Thread-Optionen",
    chatCreateFailed: "Chat konnte nicht erstellt werden: {{message}}",
    linkCopied: "Link in Zwischenablage kopiert!",
    linkCopyFailed: "Link konnte nicht kopiert werden.",
    renamePrompt: "Wie möchten Sie diesen Thread umbenennen?",
    updateFailed: "Thread konnte nicht aktualisiert werden! {{message}}",
    deleteConfirm:
      "Sind Sie sicher, dass Sie diesen Thread löschen möchten? Alle Chats werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
    deleteFailed: "Thread konnte nicht gelöscht werden!",
    deleteSuccess: "Thread erfolgreich gelöscht!",
    newChat: "Neuer Chat",
    copyLink: "Link kopieren",
    deleteThread: "Thread löschen",
  },
  sidebarSearch: {
    searchingFor: 'Suche nach "{{searchTerm}}"',
    noResultsFound: "Keine Ergebnisse gefunden für",
    searchFailed: "Suche fehlgeschlagen. Bitte erneut versuchen.",
    workspaces: "Workspaces",
    threads: "Threads",
    searchTermQuoted: '"{{searchTerm}}"',
    hintSeparator: "| {{hint}}",
  },
  providerPrivacy: {
    unknown: "Unbekannt",
    noPolicyDefined:
      '"{{provider}}" hat keine bekannte Datenschutzrichtlinie in OpenSIN Chat.',
    llmProvider: "LLM-Anbieter",
    llmLogo: "LLM-Logo",
    embeddingPreference: "Embedding-Einstellung",
    embeddingLogo: "Embedding-Logo",
    vectorDatabase: "Vektordatenbank",
    vectorDbLogo: "VektorDB-Logo",
    usageSubjectTo: "Ihre Nutzung, Chats und Daten unterliegen der",
    privacyPolicy: "Datenschutzrichtlinie",
  },
  directoryStates: {
    name: "Name",
    status: "Status",
    additionalFilesReady:
      "{{count}} zusätzliche Datei(en) bereit zum Einbetten",
    addToEmbeddingQueue: "Zur Embedding-Warteschlange hinzufügen",
    addToQueue: "Zur Warteschlange",
    removeFromEmbeddingQueue: "Aus Embedding-Warteschlange entfernen",
  },
  consoleSidebar: {
    logs: "Logs",
    clear: "Löschen",
    noLogs: "Noch keine Logs",
    terminal: "Terminal",
    terminalHint:
      "Geben Sie einen Befehl ein und drücken Sie Enter zum Ausführen.",
    noOutput: "(kein Output)",
    error: "Fehler: {{error}}",
    consoleTabs: "Konsole-Tabs",
  },
  console: {
    title: "Konsole & Terminal",
    close: "Konsole schließen",
    tab_logs: "Logs",
    tab_terminal: "Terminal",
    terminal_placeholder: "Befehl eingeben...",
    terminal_unavailable:
      "Terminal nicht verfügbar. Stelle sicher, dass der Server den /api/terminal/exec Endpoint bereitstellt.",
  },
  terminal: {
    title: "Terminal",
    description: "Führe Server-Befehle direkt über die Admin-Oberfläche aus.",
    warning:
      "Warnung: Dies ist eine Admin-Funktion. Der Server muss Terminal-Ausführung über ENABLE_TERMINAL_EXEC=true aktivieren.",
    commandLabel: "Befehl",
    commandPlaceholder: "Befehl eingeben...",
    cwdLabel: "Arbeitsverzeichnis",
    execute: "Ausführen",
    executing: "Wird ausgeführt...",
    output: "Ausgabe",
    exitCode: "Exit-Code",
    noOutput: "(keine Ausgabe)",
    missingCommand: "Bitte gib einen Befehl ein.",
    disabled: "Terminal-Ausführung ist auf diesem Server deaktiviert.",
  },
  agentSidebarLists: {
    agentSkills: "Agenten-Fähigkeiten",
    appIntegrations: "App-Integrationen",
    customSkills: "Benutzerdefinierte Fähigkeiten",
    agentFlows: "Agenten-Flows",
    createFlow: "Flow erstellen",
    openBuilder: "Builder öffnen",
  },
  importedSkillList: {
    noImportedSkills: "Keine importierten Fähigkeiten gefunden",
    learnAboutSkills: "Erfahren Sie mehr über Agenten-Fähigkeiten in der",
    agentDocs: "OpenSIN Chat Agenten-Dokumentation",
  },
  errorBoundary: {
    title: "Ein Fehler ist aufgetreten.",
    unknownError: "Unbekannter Fehler",
    noMessage: "Keine Nachricht verfügbar",
    noStackTrace: "Kein Stack-Trace verfügbar",
    errorReport: "Fehlerbericht",
    timestamp: "Zeitstempel",
    userAgent: "User Agent",
    error: "Fehler",
    message: "Nachricht",
    stackTrace: "Stack-Trace",
    copiedAria: "Fehlerdetails kopiert",
    copyAria: "Fehlerdetails kopieren",
    copied: "Kopiert!",
    copyDetails: "Details kopieren",
    reset: "Zurücksetzen",
    home: "Startseite",
  },
  error: {
    serverUnavailable: "Server nicht verfügbar",
    serverUnavailableDescription:
      "Der Server konnte nicht erreicht werden. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es in einem Moment erneut.",
  },
  audioPreference: {
    stt: {
      title: "Sprach-zu-Text-Einstellung",
      description:
        "Hier können Sie festlegen, welche Spracherkennungs- und Sprachsynthese-Anbieter Sie in Ihrer OpenSIN Chat-Erfahrung nutzen möchten. Standardmäßig verwenden wir die im Browser integrierte Unterstützung für diese Dienste, aber Sie können auch andere verwenden.",
      searchPlaceholder: "Spracherkennungsanbieter durchsuchen",
      saveFailed: "Einstellungen konnten nicht gespeichert werden: {{error}}",
      saveSuccess: "Spracherkennungseinstellungen erfolgreich gespeichert.",
      systemNative: "Systemeigen",
      systemNativeDesc:
        "Verwendet den integrierten STT-Dienst Ihres Browsers, falls unterstützt.",
      openai: "OpenAI",
      openaiDesc: "Verwenden Sie OpenAIs Whisper-API zur Spracherkennung.",
      deepgram: "Deepgram",
      deepgramDesc:
        "Sprache mit Deepgrams gehosteten Nova-Modellen transkribieren.",
      genericOpenai: "Generisches OpenAI",
      genericOpenaiDesc:
        "Verbinden Sie sich mit einem OpenAI-kompatiblen STT-Dienst über eine benutzerdefinierte Konfiguration.",
    },
    tts: {
      title: "Text-zu-Sprache-Einstellung",
      description:
        "Hier können Sie festlegen, welche Text-zu-Sprache-Anbieter Sie in Ihrer OpenSIN Chat-Erfahrung nutzen möchten. Standardmäßig verwenden wir die im Browser integrierte Unterstützung für diese Dienste, aber Sie können auch andere verwenden.",
      searchPlaceholder: "Text-zu-Sprache-Anbieter durchsuchen",
      saveFailed: "Einstellungen konnten nicht gespeichert werden: {{error}}",
      saveSuccess: "Text-zu-Sprache-Einstellungen erfolgreich gespeichert.",
      systemNative: "Systemeigen",
      systemNativeDesc:
        "Verwendet den integrierten TTS-Dienst Ihres Browsers, falls unterstützt.",
      openai: "OpenAI",
      openaiDesc: "OpenAIs Text-zu-Sprache-Stimmen verwenden.",
      elevenlabs: "ElevenLabs",
      elevenlabsDesc:
        "ElevenLabs Text-zu-Sprache-Stimmen und Technologie verwenden.",
      piper: "PiperTTS",
      piperDesc: "TTS-Modelle lokal und privat in Ihrem Browser ausführen.",
      kokoro: "Kokoro",
      kokoroDesc:
        "Verbinden Sie sich mit einem selbstgehosteten kokoro-fastapi-Server für hochwertige Open-Source-Stimmen.",
      openaiCompatible: "OpenAI-kompatibel",
      openaiCompatibleDesc:
        "Verbinden Sie sich mit einem OpenAI-kompatiblen TTS-Dienst, der lokal oder remote ausgeführt wird.",
      nvidiaNim: "NVIDIA NIM",
      nvidiaNimDesc:
        "Verwenden Sie NVIDIA NIMs gehostete Text-zu-Sprache-API mit hochwertigen Stimmen.",
    },
  },
  embedChats: {
    chatRow: {
      deleteConfirm:
        "Sind Sie sicher, dass Sie diesen Chat löschen möchten?\n\nDiese Aktion ist irreversibel.",
      delete: "Löschen",
      viewingText: "Text anzeigen",
      sessionId: "Sitzungs-ID",
      username: "Benutzername",
      clientIp: "Client-IP-Adresse",
      clientHost: "Client-Host-URL",
    },
  },
  embedConfigs: {
    embedRow: {
      preview: "Vorschau",
      unnamed: "Unbenannt",
      disableConfirm:
        "Sind Sie sicher, dass Sie diese Einbettung deaktivieren möchten?\nEinmal deaktiviert, wird die Einbettung nicht mehr auf Chat-Anfragen antworten.",
      toggleStatus: "Einbettung {{status}}.",
      disabled: "wurde deaktiviert",
      active: "ist aktiv",
      deleteConfirm:
        "Sind Sie sicher, dass Sie diese Einbettung löschen möchten?\nEinmal gelöscht, wird diese Einbettung nicht mehr auf Chats antworten oder aktiv sein.\n\nDiese Aktion ist irreversibel.",
      deleted: "Einbettung aus dem System gelöscht.",
      code: "Code",
      disable: "Deaktivieren",
      enable: "Aktivieren",
      delete: "Löschen",
      all: "alle",
    },
  },
  mobileConnections: {
    title: "Verbundene mobile Geräte",
    description:
      "Dies sind die Geräte, die mit Ihrer Desktop-Anwendung verbunden sind, um Chats, Workspaces und mehr zu synchronisieren.",
    registerNewDevice: "Neues Gerät registrieren",
    deviceName: "Gerätename",
    registered: "Registriert",
    noDevices: "Keine Geräte gefunden",
    connectionModal: {
      title: "Geh mobil. Bleib lokal. OpenSIN Chat Mobile.",
      description:
        "OpenSIN Chat für Mobilgeräte ermöglicht es Ihnen, sich mit den Chats, Threads, Tools und Dokumenten Ihres Workspaces zu verbinden, um sie unterwegs zu nutzen.\n\nFühren Sie lokale Modelle auf Ihrem Telefon privat aus oder leiten Sie Chats direkt an diese Instanz weiter.",
      scanHint:
        "Scannen Sie den QR-Code mit der OpenSIN Chat Mobile-App, um die Live-Synchronisierung Ihrer Workspaces, Chats, Threads und Dokumente zu aktivieren.",
      learnMore: "Mehr erfahren",
    },
  },
  attachments: {
    uploading: "Hochladen...",
    fileNotEmbedded: "Datei nicht eingebettet!",
    imageAttached: "Bild angehängt!",
    fileEmbedded: "Datei eingebettet!",
    addedAsContext: "Als Kontext hinzugefügt!",
    willBeAttachedPrompt:
      "{{name}} wird an diesen Prompt angehängt. Es wird nicht dauerhaft in den Workspace eingebettet.",
    wasEmbedded:
      "{{name}} wurde hochgeladen und in diesen Workspace eingebettet. Es ist jetzt für RAG-Chat verfügbar.",
    willBeUsedAsContext:
      "{{name}} wird nur als Kontext für diesen Chat verwendet.",
    previewOf: "Vorschau von {{name}}",
  },
  setupProvider: {
    saveFailed: "Fehler beim Speichern der {{name}} Einstellungen: {{error}}",
    title: "{{name}} Einstellungen",
    description:
      "Um {{name}} als LLM dieses Workspace zu nutzen, müssen Sie es zuerst einrichten.",
    cancel: "Abbrechen",
    saveSettings: "Einstellungen speichern",
  },
  startNode: {
    variables: "Variablen",
    variableNamePlaceholder: "Variablenname",
    initialValuePlaceholder: "Anfangswert",
    deleteVariable: "Variable löschen",
    addVariable: "Variable hinzufügen",
  },
  inviteRow: {
    deactivateConfirm:
      "Möchten Sie diese Einladung wirklich deaktivieren?\nDanach kann sie nicht mehr verwendet werden.\n\nDiese Aktion ist unwiderruflich.",
    disabled: "Deaktiviert",
    deletedUser: "gelöschter Benutzer",
    copied: "Kopiert",
    copyInviteLink: "Einladungslink kopieren",
  },
  codeSnippetModal: {
    title: "Einbettungscode kopieren",
    close: "Schließen",
    copiedToClipboard: "Snippet in die Zwischenablage kopiert!",
    scriptTagLabel: "HTML Script-Tag Einbettungscode",
    scriptTagDescription:
      "Lassen Sie Ihren Workspace-Chat-Einbettung wie einen Helpdesk-Chat in der Ecke Ihrer Website funktionieren.",
    viewOptions: "Alle Stil- und Konfigurationsoptionen anzeigen \u2192",
  },
  llmPreference: {
    saveFailed: "Fehler beim Speichern der LLM-Einstellungen: {{error}}",
    saveSuccess: "LLM-Einstellungen erfolgreich gespeichert.",
    searchPlaceholder: "Alle LLM-Anbieter durchsuchen",
    noneSelected: "Keiner ausgewählt",
    selectLLM: "Sie müssen ein LLM auswählen",
  },
  deviceRow: {
    accessGranted: "Gerätezugriff gewährt",
    accessDenied: "Gerätezugriff verweigert",
    by: "von",
    revoke: "Widerrufen",
    approveAccess: "Zugriff genehmigen",
    deny: "Ablehnen",
  },
  agentModelSelection: {
    multiModelNotSupported:
      "Multi-Modell-Unterstützung wird für diesen Anbieter noch nicht unterstützt.",
    agentsWillUse: "Agenten verwenden",
    workspaceModel: "das für den Workspace festgelegte Modell",
    or: "oder",
    systemModel: "das für das System festgelegte Modell.",
    generalModels: "Allgemeine Modelle",
    customModels: "Benutzerdefinierte Modelle",
  },
  members: {
    username: "Benutzername",
    role: "Rolle",
    dateAdded: "Hinzugefügt am",
    noMembers: "Keine Workspace-Mitglieder",
    manageUsers: "Benutzer verwalten",
  },
  addMemberModal: {
    users: "Benutzer",
    searchPlaceholder: "Benutzer suchen...",
    noUsersFound: "Keine Benutzer gefunden.",
    selectAll: "Alle auswählen",
    unselect: "Alle abwählen",
    save: "Speichern",
    usersUpdatedSuccess: "Benutzer erfolgreich aktualisiert.",
  },
  mistralAiOptions: {
    apiKey: "API-Schlüssel",
    apiKeyPlaceholder: "Mistral AI API-Schlüssel",
    modelPreference: "Modellpräferenz",
    availableModels: "Verfügbare Embedding-Modelle",
  },
  imageLightbox: {
    close: "Lightbox schließen",
    previous: "Vorheriges Bild",
    next: "Nächstes Bild",
    attachment: "Anhang",
  },
  // ── Batch 9 — i18next/no-literal-string fixes ─────────────────────
  ui: {
    loading: "Wird geladen...",
    dialogTitle: "Dialog",
    closeDialog: "Dialog schließen",
  },
  citation: {
    referencedTimes: "{{count}}-mal referenziert.",
    moreCount: "+ {{count}}",
    similarityTooltip:
      "Dies ist die semantische Ähnlichkeitsbewertung dieses Textabschnitts im Vergleich zu Ihrer Anfrage, berechnet durch die Vektordatenbank.",
  },
  contextualSaveBar: {
    unsavedChanges: "Ungespeicherte Änderungen",
    cancel: "Abbrechen",
    save: "Speichern",
  },
  agentFlows: {
    empty: {
      noFlows: "Keine Agent-Flows gefunden",
      learnMore: "Mehr über Agent-Flows erfahren.",
    },
    status: {
      on: "An",
      off: "Aus",
    },
    editFlow: "Flow bearbeiten",
    deleteFlow: "Flow löschen",
    noDescription: "Keine Beschreibung angegeben",
    confirmDelete:
      "Sind Sie sicher, dass Sie diesen Flow löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
    flowDeleted: "Flow erfolgreich gelöscht.",
    deleteFailed: "Flow konnte nicht gelöscht werden.",
    toggleFailed: "Flow-Status konnte nicht geändert werden",
  },
  importedSkillConfig: {
    save: "Speichern",
    noOptions: "Für diesen Skill gibt es keine zu ändernden Optionen.",
    deleteSkill: "Skill löschen",
    descriptionByAuthor: "{{description}} von",
    skillActivated: "Fähigkeit aktiviert.",
    skillDeactivated: "Fähigkeit deaktiviert.",
    errorRequiredValue: "{{key}} benötigt einen Wert.",
    errorTypeMismatch: "{{key}} muss vom Typ {{type}} sein.",
    configUpdated: "Fähigkeitskonfiguration erfolgreich aktualisiert.",
    confirmDeleteSkill:
      "Sind Sie sicher, dass Sie diese Fähigkeit löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
    skillDeleted: "Fähigkeit erfolgreich gelöscht.",
    skillDeleteFailed: "Löschen der Fähigkeit fehlgeschlagen.",
  },
  userRow: {
    edit: "Bearbeiten",
    suspend: "Sperren",
    unsuspend: "Entsperren",
    delete: "Löschen",
    confirmSuspend:
      "Sind Sie sicher, dass Sie {{username}} sperren möchten?\nDanach wird er ausgeloggt und kann sich nicht mehr anmelden, bis ein Admin die Sperre aufhebt.",
    confirmDelete:
      "Sind Sie sicher, dass Sie {{username}} löschen möchten?\nDanach wird er ausgeloggt und kann diese Instanz nicht mehr nutzen.\n\nDiese Aktion ist unwiderruflich.",
    suspended: "Benutzer wurde gesperrt.",
    unsuspended: "Benutzer ist nicht mehr gesperrt.",
    deleteSuccess: "Benutzer wurde aus dem System gelöscht.",
  },
  pullAndReview: {
    title: "Element überprüfen",
    pulling: "Elementdetails werden aus dem Community Hub geladen...",
    error:
      "Beim Abrufen des Elements ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
    tryAnotherItem: "Anderes Element versuchen",
  },
  customSiteSettings: {
    updateSuccess:
      "Seiteneinstellungen aktualisiert! Sie werden beim Neuladen der Seite wirksam.",
    updateFailed:
      "Seiteneinstellungen konnten nicht aktualisiert werden: {{error}}",
    titlePlaceholder:
      "OpenSIN Chat | Ihr persönliches LLM, trainiert auf allem",
    titleDefault: "OpenSIN Chat | Ihr persönliches LLM, trainiert auf allem",
    faviconPlaceholder: "URL zu Ihrem Bild",
    faviconAlt: "Website-Favicon",
    save: "Speichern",
  },
  agentConfig: {
    configureAgentSkills: "Agent-Skills konfigurieren",
    configureDescription:
      "Passen Sie die Fähigkeiten des Standard-Agenten an, indem Sie bestimmte Skills aktivieren oder deaktivieren. Diese Einstellungen gelten für alle Arbeitsbereiche.",
    updatingAgent: "Agent wird aktualisiert...",
    updateWorkspaceAgent: "Workspace-Agent aktualisieren",
    workspaceUpdated: "Workspace aktualisiert!",
    error: "Fehler: {{message}}",
    preferencesSaved: "Agent-Einstellungen erfolgreich gespeichert.",
    preferencesSaveFailed:
      "Agent-Einstellungen konnten nicht gespeichert werden.",
    toggleToolFailed: "Werkzeug konnte nicht umgeschaltet werden.",
  },
  // ── Batch 10 — i18next/no-literal-string fixes ─────────────────────
  footer: {
    ariaLabel: "Footer-Links",
    themeToggleDarkAriaLabel: "Zum dunklen Modus wechseln",
    themeToggleLightAriaLabel: "Zum hellen Modus wechseln",
    themeToggleDarkTooltip: "Dunklen Modus aktivieren",
    themeToggleLightTooltip: "Hellen Modus aktivieren",
  },
  keyboardShortcuts: {
    closeButton: "Schließen",
  },
  contextMenu: {
    selectAll: "Alles auswählen",
    unselectAll: "Auswahl aufheben",
    cancel: "Abbrechen",
  },
  userIcon: {
    systemProfilePicture: "Systemprofilbild",
    userProfilePicture: "Benutzerprofilbild",
  },
  notFound: {
    title: "404 - Seite nicht gefunden",
    description: "Die gesuchte Seite existiert nicht oder wurde verschoben.",
    goHome: "Zur Startseite",
    readDocs: "Dokumentation lesen",
  },
  newWorkspaceModal: {
    closeAriaLabel: "Neuen Workspace-Dialog schließen",
    error: "Fehler: {{error}}",
    save: "Speichern",
    creationFailed: "Fehler beim Erstellen des Workspace: {{error}}",
  },
  promptReply: {
    couldNotRespond: "Konnte nicht auf die Nachricht antworten.",
    reason: "Grund: {{reason}}",
    unknown: "unbekannt",
  },
  workspaceChat: {
    notFoundTitle: "Workspace nicht gefunden",
    notFoundDescription:
      "Der gesuchte Workspace ist nicht verfügbar. Er wurde möglicherweise gelöscht oder Sie haben keinen Zugriff darauf.",
    returnToHomepage: "Zurück zur Startseite",
    copied: "Kopiert!",
  },
  directory: {
    createNewFolderAriaLabel: "Neuen Ordner erstellen",
    deleteSelectedAriaLabel: "Ausgewählte Dateien und Ordner löschen",
    folderItemCount: "({{count}})",
  },
  // ── Batch 11 — i18next/no-literal-string fixes ─────────────────────
  skills: {
    gmail: {
      alt: "GMail",
      placeholder: {
        deploymentId: "AKfycb...",
        apiKey: "Ihr API-Schlüssel...",
      },
    },
    googleCalendar: {
      alt: "Google Kalender",
      placeholder: {
        deploymentId: "AKfycb...",
        apiKey: "Ihr API-Schlüssel...",
      },
    },
    sqlConnector: {
      alt: "SQL-Agent",
      connectionsTitle: "Ihre Datenbankverbindungen",
      newConnection: "Neue SQL-Verbindung",
    },
    list: {
      gmail: {
        alt: "GMail",
      },
      googleCalendar: {
        alt: "Google Kalender",
      },
      outlook: {
        alt: "Outlook",
      },
    },
  },
  logging: {
    logRow: {
      hide: "ausblenden",
      show: "anzeigen",
      eventMetadata: "Ereignis-Metadaten",
    },
  },
  chats: {
    clearChats: "Chats löschen",
    previousPage: "Vorherige Seite",
    nextPage: "Nächste Seite",
  },
  embeddingTextSplitter: {
    placeholder: {
      chunkSize: "maximale Länge des vektorisierten Textes",
      chunkOverlap: "maximale Länge des vektorisierten Textes",
    },
  },
  settingsSidebar: {
    systemHealth: "Systemzustand",
    defaultSystemPrompt: "Standard-Systemprompt",
    politicianSync: "Politiker-Sync",
    experimentalFeaturesUnlocked:
      "Experimentelle Funktionsvorschau freigeschaltet!",
  },
  politicianSync: {
    title: "Politiker-Datenbank-Sync",
    description:
      "Überwachen und verwalten Sie die Politiker-Daten-Synchronisierung von externen Quellen.",
    healthy: "Gesund",
    unhealthy: "Ungesund",
    syncNow: "Jetzt synchronisieren",
    syncTriggered: "Sync erfolgreich gestartet",
    syncTriggerFailed: "Sync konnte nicht gestartet werden: {{error}}",
    statPoliticians: "Politiker",
    statSpeeches: "Reden",
    statVotes: "Abstimmungen",
    sourceStatus: "Quellen-Status",
    lastAttempt: "Letzter Versuch",
    lastSuccess: "Letzter Erfolg",
    itemsProcessed: "Verarbeitete Elemente",
    itemsFailed: "Fehlgeschlagene Elemente",
    retryQueue: "Wiederholungs-Warteschlange",
    phase: "Phase",
    attempts: "Versuche",
    nextRetry: "Nächste Wiederholung",
    status: "Status",
    lastSync: "Letzter Sync",
    loadError: "Sync-Status konnte nicht geladen werden",
    justNow: "Gerade eben",
    minutesAgo: "vor {{count}} Min.",
    hoursAgo: "vor {{count}} Std.",
    daysAgo: "vor {{count}} T.",
    never: "Nie",
  },
  // ── Batch 14 — i18next/no-literal-string fixes ─────────────────────
  vectorSearch: {
    searchPreference: "Suchpräferenz",
    default: "Standard",
    accuracyOptimized: "Genauigkeitsoptimiert",
    defaultDescription:
      "Dies bietet die schnellste Leistung, kann jedoch zu weniger relevanten Ergebnissen und damit zu Modell-Halluzinationen führen.",
    accuracyOptimizedDescription:
      "LLM-Antworten können länger dauern, sind aber genauer und relevanter.",
  },
  uploadProgress: {
    uploadingFile: "Datei wird hochgeladen...",
    failedToUpload: "Diese Datei konnte nicht hochgeladen werden",
    fileSizeAndTime: "{{size}} | {{time}}",
  },
  embeddingFileRow: {
    queued: "In Warteschlange",
    removeFromQueue: "Aus Warteschlange entfernen",
  },
  workspaceFileRow: {
    pinned: "Angeheftet",
    unpin: "Loslösen",
  },
  chartable: {
    unsupported: "Nicht unterstützter Diagrammtyp.",
    downloading: "Diagramm wird heruntergeladen...",
    downloadGraph: "Diagramm herunterladen",
  },
  experimentalFeatures: {
    title: "Experimentelle Funktionen",
    selectFeature:
      "Wählen Sie links eine Funktion aus, um sie zu konfigurieren.",
    toastEnabled: "Experimentelle Funktionen aktiviert!",
    termsTitle: "Experimentelle Funktionen — Nutzungsbedingungen",
    termsP1:
      "Diese Funktionen sind experimentell und können instabil sein, ohne Vorankündigung geändert oder vollständig entfernt werden.",
    termsP2:
      "Durch das Aktivieren experimenteller Funktionen bestätigen Sie die folgenden Risiken:",
    termsLi1: "Datenverlust oder -beschädigung kann auftreten.",
    termsLi2: "Leistungseinbußen sind möglich.",
    termsLi3: "Funktionen funktionieren möglicherweise nicht wie erwartet.",
    termsLi4: "Keine Garantie für Abwärtskompatibilität.",
    termsLi5: "Eingeschränkter oder kein Support wird geboten.",
    termsLi6: "Ihre Arbeitsbereich-Einstellungen können geändert werden.",
    termsP3: "Zusätzlich sollten Sie Folgendes beachten:",
    termsLi7: "Experimentelle Funktionen sind nicht sicherheitsgeprüft.",
    termsLi8: "Sie können Sicherheitslücken einführen.",
    termsLi9: "Sie können die Systemstabilität beeinträchtigen.",
    termsLi10: "Sie können zusätzliche Ressourcen verbrauchen.",
    termsLi11: "Sie sind nur für Test- und Evaluierungszwecke bestimmt.",
    termsP4:
      "Wenn Sie diese Risiken verstehen und akzeptieren, klicken Sie auf Akzeptieren, um fortzufahren. Andernfalls klicken Sie auf Ablehnen, um zur Startseite zurückzukehren.",
    reject: "Ablehnen",
    accept: "Akzeptieren",
    toggleFailed: "Fehler beim Umschalten der Funktionskennung.",
    toggleEnabled: "Funktion erfolgreich aktiviert.",
    toggleDisabled: "Funktion erfolgreich deaktiviert.",
    autoSyncTitle: "Auto-Sync überwachter Dokumente",
    autoSyncDesc1:
      "Überwachte Dokumente automatisch neu synchronisieren, wenn sie sich an der Quelle ändern.",
    autoSyncDesc2:
      "Dokumente werden auf Änderungen überwacht und ohne manuelles Eingreifen neu eingelesen.",
    autoSyncDesc3:
      "Hinweis: Diese Funktion erfordert Netzwerkzugriff auf die Quelldokumente.",
    featureDocs: "Funktionsdokumentation",
    manageWatched: "Überwachte Dokumente verwalten",
    watchedDocs: "Überwachte Dokumente",
    watchedDocsDesc: "Derzeit überwachte Dokumente zur Live-Synchronisation.",
    colDocumentName: "Dokumentname",
    colLastSynced: "Zuletzt synchronisiert",
    colNextRefresh: "Nächste Aktualisierung",
    colCreatedOn: "Erstellt am",
  },
  workspaceLLMItem: {
    editSettings: "Einstellungen bearbeiten",
    settingsTitle: "{{name}} Einstellungen",
    setupDescription:
      "Um {{name}} als Agent-LLM dieses Arbeitsbereichs zu verwenden, müssen Sie es zuerst einrichten.",
    cancel: "Abbrechen",
    saveSettings: "{{name}} Einstellungen speichern",
    saveFailed: "Fehler beim Speichern der {{name}} Einstellungen: {{error}}",
  },
  accountModal: {
    bio: "Bio",
    bioPlaceholder: "Erzählen Sie etwas über sich...",
    passwordPlaceholder:
      "Neues Passwort (leer lassen, um das aktuelle zu behalten)",
    profilePictureAlt: "Profilbild",
    usernamePlaceholder: "Benutzername",
  },
  changeWarning: {
    title: "Ungespeicherte Änderungen",
    proceed: "Ohne Speichern fortfahren",
    cancel: "Abbrechen",
    confirm: "Speichern und fortfahren",
  },
  statusResponse: {
    thinking: "Denke nach...",
    finished: "Fertig",
    showThoughtChain: "Gedankenkette anzeigen",
    hideThoughtChain: "Gedankenkette ausblenden",
  },
  thoughtContainer: {
    thoughtChain: "Gedankenkette",
    showThoughts: "Gedanken anzeigen",
    hideThoughts: "Gedanken ausblenden",
  },
  dockerModelRunner: {
    baseUrlLabel: "Docker Model Runner Basis-URL",
    autoDetect: "Automatisch erkennen",
    baseUrlTooltip1:
      "Geben Sie die URL ein, unter der Docker Model Runner läuft.",
    baseUrlTooltip2a: "Docker Model Runner verwendet die",
    baseUrlTooltip2b: "docker model",
    baseUrlTooltip2c: "CLI zur Verwaltung lokaler Modelle.",
    learnMore: "Mehr erfahren →",
    baseUrlPlaceholder: "http://localhost:12434/v1",
    modelContextWindowLabel: "Modell-Kontextfenster",
    modelContextWindowTooltip1:
      "Geben Sie die maximale Anzahl von Tokens an, die für das Modell-Kontextfenster verwendet werden können.",
    modelContextWindowTooltip2a: "Verwenden Sie",
    modelContextWindowTooltipCode: "docker model configure --context-size",
    modelContextWindowTooltip2b:
      "um die Kontextgröße für ein bestimmtes Modell festzulegen. Standard ist",
    modelContextWindowTooltipCode2: "8192",
    modelContextWindowTooltip2c: "falls nicht angegeben.",
    contextWindowPlaceholder: "Automatisch verwaltet",
    noModelsFound: "Keine Modelle gefunden",
  },
  newEmbedModal: {
    title: "Neue Einbettung erstellen",
    created: "Embed-Widget erfolgreich erstellt",
    name: "Widget-Name",
    nameHint:
      "Geben Sie diesem Embed-Widget einen beschreibenden Namen zur Identifikation.",
    namePlaceholder: "Mein Help-Desk-Widget",
    maxChatsPerDay: "Max. Chats pro Tag",
    maxChatsPerDayHint:
      "Begrenzen Sie die Anzahl der Chats, die dieser eingebettete Chat in 24 Stunden verarbeiten kann. Null bedeutet unbegrenzt.",
    maxChatsPerSession: "Max. Chats pro Sitzung",
    maxChatsPerSessionHint:
      "Begrenzen Sie die Anzahl der Chats, die ein Sitzungsbenutzer mit dieser Einbettung in 24 Stunden senden kann. Null bedeutet unbegrenzt.",
    messageHistoryLimit: "Nachrichtenverlaufslimit",
    messageHistoryLimitHint:
      "Die Anzahl der vorherigen Nachrichten, die im Chat-Kontext enthalten sein sollen. Standard ist 20.",
    enableDynamicModel: "Dynamische Modellauswahl aktivieren",
    enableDynamicModelHint:
      "Ermöglicht das Festlegen des bevorzugten LLM-Modells zur Übersteuerung des Workspace-Standards.",
    enableDynamicTemperature: "Dynamische LLM-Temperatur aktivieren",
    enableDynamicTemperatureHint:
      "Ermöglicht das Festlegen der LLM-Temperatur zur Übersteuerung des Workspace-Standards.",
    enablePromptOverride: "Prompt-Übersteuerung aktivieren",
    enablePromptOverrideHint:
      "Ermöglicht das Festlegen des System-Prompts zur Übersteuerung des Workspace-Standards.",
    error: "Fehler",
    afterCreateHintBefore:
      "Nach dem Erstellen einer Einbettung erhalten Sie einen Link, den Sie mit einem einfachen",
    afterCreateHintAfter: "-Tag auf Ihrer Website veröffentlichen können.",
    cancel: "Abbrechen",
    createEmbed: "Einbettung erstellen",
    workspace: "Workspace",
    workspaceHint:
      "Wählen Sie den Workspace, mit dem diese Einbettung verknüpft werden soll.",
    allowedChatMethod: "Chat-Modus",
    chatModeHintPart1:
      "Der Chat-Modus liefert Antworten basierend auf dem allgemeinen Wissen des LLM und dem Dokumentkontext.",
    chatModeHintPart2:
      "Der Abfrage-Modus liefert Antworten nur, wenn Dokumentkontext gefunden wird.",
    chatModeChat: "Chat",
    chatModeQuery: "Abfrage",
    restrictDomains: "Zulässige Domains",
    restrictDomainsHintPart1:
      "Beschränken Sie, welche Domains diesen eingebetteten Chat hosten dürfen.",
    restrictDomainsHintPart2: "Leer lassen, um alle Domains zuzulassen.",
    domainsPlaceholder: "https://beispiel.de",
  },
  lmStudio: {
    embeddingAlert:
      "Der ausgewählte LLM-Anbieter hat kein Einbettungsmodell festgelegt. Bitte legen Sie ein Einbettungsmodell in den Einbettungseinstellungen fest, um diesen Anbieter zu verwenden.",
    manageEmbedding: "Einbettungsmodell verwalten",
    hideAdvanced: "Ausblenden",
    showAdvanced: "Anzeigen",
    advancedSettings: "erweiterte Einstellungen",
    baseUrlLabel: "LM Studio Basis-URL",
    baseUrlTooltip: "Geben Sie die URL ein, unter der LM Studio läuft.",
    autoDetect: "Automatisch erkennen",
    baseUrlPlaceholder: "http://127.0.0.1:11434",
    contextWindowLabel: "Modell-Kontextfenster",
    contextWindowTooltip:
      "Geben Sie die maximale Anzahl von Tokens an, die für das Modell-Kontextfenster verwendet werden können.",
    contextWindowPlaceholder: "Automatisch verwaltet",
    authTokenLabel: "Auth-Token",
    authTokenTooltipPart1: "Geben Sie ein",
    authTokenTooltipBearer: "Bearer",
    authTokenTooltipPart2:
      "Auth-Token für die Interaktion mit Ihrem LM Studio-Server ein.",
    authTokenTooltipPart3:
      "Wird nur verwendet, wenn LM Studio hinter einem Authentifizierungsserver läuft.",
    authTokenPlaceholder: "LM Studio Auth-Token",
    modelLabel: "LM Studio Modell",
    modelErrorTooltip:
      "Modelle konnten nicht vom LM Studio-Server geladen werden.",
    loadingModels: "-- verfügbare Modelle werden geladen --",
    noModelsFound: "Keine Modelle gefunden",
    enterUrlFirst: "Geben Sie zuerst die LM Studio-URL ein",
    yourLoadedModels: "Ihre geladenen Modelle",
  },
  localAiLlm: {
    alertMessage:
      "Der ausgewählte LLM-Anbieter hat kein Einbettungsmodell festgelegt. Bitte legen Sie ein Einbettungsmodell in den Einbettungseinstellungen fest, um diesen Anbieter zu verwenden.",
    manageEmbedding: "Einbettungsmodell verwalten",
    contextWindowLabel: "Modell-Kontextfenster",
    contextWindowPlaceholder: "Automatisch verwaltet",
    apiKeyLabel: "API-Schlüssel",
    optional: "Optional",
    apiKeyPlaceholder: "LocalAI API-Schlüssel",
    hideAdvanced: "Ausblenden",
    showAdvanced: "Anzeigen",
    advancedSettings: "erweiterte Einstellungen",
    baseUrlLabel: "LocalAI Basis-URL",
    autoDetect: "Automatisch erkennen",
    baseUrlPlaceholder: "http://127.0.0.1:8080",
    modelLabel: "LocalAI Modell",
    loadingModels: "-- verfügbare Modelle werden geladen --",
    waitingUrl: "Geben Sie zuerst die LocalAI-URL ein",
    yourLoadedModels: "Ihre geladenen Modelle",
  },
  nvidiaNim: {
    apiKeyLabel: "NVIDIA NIM API-Schlüssel",
    apiKeyPlaceholder: "NVIDIA NIM API-Schlüssel",
    apiKeyHelp1: "Sie können einen API-Schlüssel erhalten von",
    apiKeyHelpLink: "build.nvidia.com",
    apiKeyHelp2: ".",
    baseUrlLabel: "Basis-URL",
    optional: "Optional",
    baseUrlPlaceholder: "https://integrate.api.nvidia.com/v1",
    baseUrlHelp: "Geben Sie die URL ein, unter der NVIDIA NIM läuft.",
    modelLabel: "Modell",
    modelPlaceholder: "ai-magnify/arctic-tts",
    modelHelp1: "Modellname für TTS. Zum Beispiel:",
    modelHelp2: ".",
    voiceLabel: "Stimmmodell",
    voicePlaceholder: "English-US.Female-1",
    voiceHelp1: "Stimmmodell-Bezeichner. Zum Beispiel:",
    voiceHelp2: ".",
  },
  sw_update_available: "Eine neue Version ist verfügbar. Jetzt neu laden?",
};
export default TRANSLATIONS;

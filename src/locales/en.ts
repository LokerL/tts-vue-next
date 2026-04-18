export default {
  common: {
    appName: "TTS Vue Next",
    formats: {
      mp3: "MP3",
      wav: "WAV",
      ogg: "OGG",
      flac: "FLAC",
    },
  },
  nav: {
    textToSpeech: "Text to Speech",
    batchConvert: "Batch Convert",
    settings: "Settings",
  },
  titleBar: {
    toggleTheme: "Toggle theme",
    minimize: "Minimize window",
    toggleMaximize: "Toggle maximize window",
    close: "Close window",
    windowActionFailed: "Window action failed. Please try again.",
  },
  tts: {
    textInput: {
      title: "Text Input",
      placeholder: "Enter text to convert to speech...",
    },
    options: {
      title: "Voice Control Dock",
      language: "Language",
      voice: "Voice",
      rate: "Rate",
      pitch: "Pitch",
      volume: "Volume",
      outputFormat: "Output Format",
      generate: "Generate Speech",
      generating: "Generating...",
      stop: "Stop",
    },
    audioPlayer: {
      title: "Playback Console",
      togglePlayback: "Toggle playback",
      saveGeneratedAudio: "Save generated audio",
      saveFilterName: "Audio",
      defaultFileName: "tts-output.{ext}",
    },
  },
  batch: {
    hero: {
      overline: "Batch Workflow Studio",
      title: "Convert document queues with clear progress controls",
      description: "Queue text files, review progress per item, and export audio with controlled concurrency.",
    },
    actions: {
      startAll: "Start All",
      clear: "Clear",
      concurrency: "Concurrency",
    },
    upload: {
      title: "Drop text files into the queue",
      description: "Click to browse, or drop `.txt`, `.md`, `.markdown`, and `.docx` files here.",
      chooseFiles: "Choose Files",
      unsupportedFileTypes: "Unsupported file types: {files}",
      filePickerFilterName: "Text Files",
    },
    list: {
      title: "Queue Progress",
      columns: {
        file: "File",
        status: "Status",
        progress: "Progress",
        actions: "Actions",
      },
      emptyTitle: "No files queued yet",
      emptyDescription: "Your selected files will appear here before conversion starts.",
      status: {
        completed: "Completed",
        failed: "Failed",
        processing: "Processing",
        queued: "Queued",
      },
    },
    errors: {
      failedToRemoveTempFile: "Failed to remove temporary file {path}: {message}",
    },
  },
  settings: {
    hero: {
      overline: "Preferences",
      title: "Tune output and processing behavior",
      description: "Choose where converted audio is saved and how aggressively batch jobs should run.",
    },
    sections: {
      output: "Output",
      processing: "Processing",
      about: "About",
    },
    fields: {
      savePath: "Save Path",
      savePathPlaceholder: "Click to select...",
      defaultFormat: "Default Format",
      autoplay: "Auto-play after conversion",
      maxRetries: "Max Retries",
      fileConcurrency: "File Concurrency",
    },
    about: {
      description: "A desktop TTS application powered by Microsoft Edge TTS service and built with Vue 3, Vuetify, and Tauri.",
    },
  },
} as const;

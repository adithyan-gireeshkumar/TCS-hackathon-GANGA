
const form = document.querySelector("#analysis-form");
const input = document.querySelector("#documents");
const question = document.querySelector("#question");
const fileList = document.querySelector("#file-list");
const fileCount = document.querySelector("#file-count");
const button = document.querySelector("#analyze-button");
const resultPanel = document.querySelector("#result-panel");
const answer = document.querySelector("#answer");
const resultMeta = document.querySelector("#result-meta");
const errorMessage = document.querySelector("#error-message");
const dropzone = document.querySelector(".dropzone");

const allowedExtensions = ["pdf", "docx", "txt", "csv"];
const maxTotalSize = 15 * 1024 * 1024;
const maxFiles = 10;

let selectedFiles = [];

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateFiles(files) {
  if (files.length > maxFiles) {
    return `Choose no more than ${maxFiles} files.`;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > maxTotalSize) {
    return "The total file size must be under 15 MB.";
  }

  for (const file of files) {
    const extension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return `Unsupported file type: ${file.name}`;
    }
  }

  return "";
}

function renderFiles() {
  fileList.replaceChildren();
  fileCount.textContent =
    `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"}`;

  selectedFiles.forEach((file, index) => {
    const item = document.createElement("li");
    item.className = "file-item";

    const details = document.createElement("span");
    details.textContent = `${file.name} · ${formatSize(file.size)}`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-file";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);

    remove.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      renderFiles();
    });

    item.append(details, remove);
    fileList.append(item);
  });
}

function addFiles(files) {
  const combined = [...selectedFiles, ...files];

  // Keep existing files if the new selection is invalid.
  const error = validateFiles(combined);

  if (error) {
    errorMessage.textContent = error;
    return;
  }

  selectedFiles = combined;
  errorMessage.textContent = "";
  renderFiles();
}

input.addEventListener("change", () => {
  addFiles([...input.files]);
  input.value = "";
});

for (const eventName of ["dragenter", "dragover"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
  });
}

dropzone.addEventListener("drop", (event) => {
  addFiles([...event.dataTransfer.files]);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.textContent = "";

  if (selectedFiles.length === 0) {
    errorMessage.textContent = "Upload at least one document.";
    return;
  }

  if (!question.value.trim()) {
    errorMessage.textContent = "Enter a question first.";
    return;
  }

  const data = new FormData();
  data.append("question", question.value.trim());

  selectedFiles.forEach((file) => {
    data.append("documents", file, file.name);
  });

  button.disabled = true;
  button.textContent = "Analyzing...";
  resultPanel.hidden = false;
  resultMeta.textContent = "Processing your document collection...";
  answer.textContent = "";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: data,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Analysis failed.");
    }

    answer.textContent = result.answer;
    resultMeta.textContent =
      `Analysis completed · ${result.files ?? result.sources?.length ?? 0} document(s) processed`;
  } catch (error) {
    resultPanel.hidden = true;
    errorMessage.textContent =
      error.message || "Unable to connect to GANGA.";
  } finally {
    button.disabled = false;
    button.innerHTML = 'Analyze documents <span>↗</span>';
  }
});

document.querySelector("#copy-button").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(answer.textContent);
    const copyButton = document.querySelector("#copy-button");
    copyButton.textContent = "Copied!";

    setTimeout(() => {
      copyButton.textContent = "Copy answer";
    }, 1500);
  } catch {
    errorMessage.textContent = "Could not copy the answer.";
  }
});

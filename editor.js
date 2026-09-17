const Editor = (function () {
  let bodyTextarea, headerImagePreview, headerImageClearBtn;
  let currentHeaderImage = null;
  let lastCursor = { start: 0, end: 0 };

  function notifyChange() {
    document.dispatchEvent(new CustomEvent("editor:change"));
  }

  function wrapSelection(prefix, suffix, placeholder) {
    const start = bodyTextarea.selectionStart;
    const end = bodyTextarea.selectionEnd;
    const value = bodyTextarea.value;
    const selected = value.slice(start, end) || placeholder;
    const before = value.slice(0, start);
    const after = value.slice(end);

    bodyTextarea.value = `${before}${prefix}${selected}${suffix}${after}`;
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + selected.length;
    bodyTextarea.focus();
    bodyTextarea.setSelectionRange(cursorStart, cursorEnd);
    notifyChange();
  }

  function insertAtLastCursor(text) {
    const value = bodyTextarea.value;
    const before = value.slice(0, lastCursor.start);
    const after = value.slice(lastCursor.end);
    const needsLeadingBreak = before.length > 0 && !before.endsWith("\n\n");
    const needsTrailingBreak = after.length > 0 && !after.startsWith("\n\n");
    const insertion = `${needsLeadingBreak ? "\n\n" : ""}${text}${needsTrailingBreak ? "\n\n" : ""}`;
    bodyTextarea.value = `${before}${insertion}${after}`;
    const newPos = before.length + insertion.length;
    bodyTextarea.focus();
    bodyTextarea.setSelectionRange(newPos, newPos);
    notifyChange();
  }

  function setHeaderImagePreview(url) {
    currentHeaderImage = url || null;
    if (currentHeaderImage) {
      headerImagePreview.src = currentHeaderImage;
      headerImagePreview.hidden = false;
      headerImageClearBtn.hidden = false;
    } else {
      headerImagePreview.hidden = true;
      headerImagePreview.src = "";
      headerImageClearBtn.hidden = true;
    }
  }

  function setupToolbar() {
    document.getElementById("boldBtn").addEventListener("click", () => {
      wrapSelection("**", "**", "bold text");
    });
    document.getElementById("italicBtn").addEventListener("click", () => {
      wrapSelection("*", "*", "italic text");
    });
    document.getElementById("underlineBtn").addEventListener("click", () => {
      wrapSelection("__", "__", "underlined text");
    });
    document.getElementById("strikeBtn").addEventListener("click", () => {
      wrapSelection("~~", "~~", "struck text");
    });
  }

  function setupImageModal() {
    const modal = document.getElementById("imageUrlModal");
    const urlInput = document.getElementById("imageUrlInput");
    const altInput = document.getElementById("imageAltInput");
    const uploadBtn = document.getElementById("imageUploadBtn");
    const uploadInput = document.getElementById("imageUploadInput");
    const uploadStatus = document.getElementById("imageUploadStatus");
    const cancelBtn = document.getElementById("imageUrlCancel");
    const confirmBtn = document.getElementById("imageUrlConfirm");

    document.getElementById("insertImageBtn").addEventListener("click", () => {
      lastCursor = {
        start: bodyTextarea.selectionStart,
        end: bodyTextarea.selectionEnd,
      };
      urlInput.value = "";
      altInput.value = "";
      uploadStatus.hidden = true;
      modal.hidden = false;
      urlInput.focus();
    });

    cancelBtn.addEventListener("click", () => {
      modal.hidden = true;
    });

    uploadBtn.addEventListener("click", () => uploadInput.click());

    uploadInput.addEventListener("change", async () => {
      const file = uploadInput.files[0];
      if (!file) return;
      uploadStatus.hidden = false;
      uploadStatus.textContent = "Uploading…";
      try {
        const { url } = await api.uploadImage(file);
        urlInput.value = url;
        uploadStatus.textContent = "Uploaded.";
      } catch (err) {
        uploadStatus.textContent = err.message;
      }
      uploadInput.value = "";
    });

    confirmBtn.addEventListener("click", () => {
      const url = urlInput.value.trim();
      if (!url) {
        urlInput.focus();
        return;
      }
      const alt = altInput.value.trim();
      insertAtLastCursor(`![${alt}](${url})`);
      modal.hidden = true;
    });
  }

  function setupHeaderImage() {
    headerImagePreview = document.getElementById("headerImagePreview");
    headerImageClearBtn = document.getElementById("headerImageClearBtn");
    const fileInput = document.getElementById("headerImageFileInput");
    const uploadBtn = document.getElementById("headerImageUploadBtn");
    const urlBtn = document.getElementById("headerImageUrlBtn");

    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading…";
      try {
        const { url } = await api.uploadImage(file);
        setHeaderImagePreview(url);
        notifyChange();
      } catch (err) {
        alert(err.message);
      }
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload file";
      fileInput.value = "";
    });

    urlBtn.addEventListener("click", () => {
      const url = prompt("Header image URL:", currentHeaderImage || "");
      if (url === null) return;
      setHeaderImagePreview(url.trim() || null);
      notifyChange();
    });

    headerImageClearBtn.addEventListener("click", () => {
      setHeaderImagePreview(null);
      notifyChange();
    });
  }

  function init() {
    bodyTextarea = document.getElementById("fieldBody");
    setupToolbar();
    setupImageModal();
    setupHeaderImage();
  }

  return {
    init,
    setHeaderImage: setHeaderImagePreview,
    getHeaderImage: () => currentHeaderImage,
  };
})();

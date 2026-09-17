(function () {
  const loginView = document.getElementById("loginView");
  const dashboardView = document.getElementById("dashboardView");
  const editorView = document.getElementById("editorView");

  const loginForm = document.getElementById("loginForm");
  const loginUsername = document.getElementById("loginUsername");
  const loginPassword = document.getElementById("loginPassword");
  const loginError = document.getElementById("loginError");

  const signedInAs = document.getElementById("signedInAs");
  const logoutButton = document.getElementById("logoutButton");
  const newDraftButton = document.getElementById("newDraftButton");
  const draftList = document.getElementById("draftList");
  const emptyState = document.getElementById("emptyState");

  const backButton = document.getElementById("backButton");
  const saveStatus = document.getElementById("saveStatus");
  const commentBanner = document.getElementById("commentBanner");
  const fieldByline = document.getElementById("fieldByline");
  const fieldTitle = document.getElementById("fieldTitle");
  const fieldBody = document.getElementById("fieldBody");
  const uploadButton = document.getElementById("uploadButton");
  const uploadError = document.getElementById("uploadError");

  let currentUser = null;
  let currentDraftId = null;
  let saveTimer = null;

  // ---------- local draft storage ----------

  function draftsKey() {
    return `typewriter:drafts:${currentUser}`;
  }

  function loadDrafts() {
    try {
      return JSON.parse(localStorage.getItem(draftsKey())) || [];
    } catch (e) {
      return [];
    }
  }

  function saveDrafts(drafts) {
    localStorage.setItem(draftsKey(), JSON.stringify(drafts));
  }

  function findDraft(drafts, localId) {
    return drafts.find((d) => d.localId === localId);
  }

  function newLocalDraft() {
    return {
      localId: crypto.randomUUID(),
      serverId: null,
      title: "",
      byline: currentUser,
      image: null,
      body: "",
      status: "draft",
      comment: null,
      updatedAt: new Date().toISOString(),
    };
  }

  // ---------- view switching ----------

  function showView(view) {
    loginView.hidden = view !== loginView;
    dashboardView.hidden = view !== dashboardView;
    editorView.hidden = view !== editorView;
  }

  // ---------- auth ----------

  async function checkSession() {
    try {
      const me = await api.me();
      if (me.role !== "writer") throw new Error("not a writer session");
      currentUser = me.username;
      enterDashboard();
    } catch (e) {
      showView(loginView);
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    try {
      const result = await api.login(loginUsername.value.trim(), loginPassword.value);
      currentUser = result.username;
      loginPassword.value = "";
      enterDashboard();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.hidden = false;
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    currentUser = null;
    showView(loginView);
  });

  // ---------- dashboard ----------

  function statusLabel(status) {
    switch (status) {
      case "unpublished":
        return "Submitted — awaiting review";
      case "returned":
        return "Needs revision";
      case "published":
        return "Published";
      default:
        return "Draft";
    }
  }

  function renderDraftList() {
    const drafts = loadDrafts().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    draftList.innerHTML = "";
    emptyState.hidden = drafts.length > 0;

    drafts.forEach((draft) => {
      const li = document.createElement("li");
      li.className = "draft-item";
      li.innerHTML = `
        <div class="draft-item-text">
          <h2>${draft.title ? escapeHtml(draft.title) : "Untitled"}</h2>
          <p class="draft-item-meta">
            <span class="status-badge status-${draft.status}">${statusLabel(draft.status)}</span>
            &middot; ${new Date(draft.updatedAt).toLocaleString()}
          </p>
        </div>
        <button type="button" class="draft-delete-btn" aria-label="Delete draft">&times;</button>
      `;
      li.querySelector(".draft-item-text").addEventListener("click", () => openDraft(draft.localId));
      li.querySelector(".draft-delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteDraft(draft.localId);
      });
      draftList.appendChild(li);
    });
  }

  function deleteDraft(localId) {
    const drafts = loadDrafts();
    const draft = findDraft(drafts, localId);
    if (!draft) return;
    const message = draft.serverId
      ? "Remove this from your drafts list on this device? It will NOT be deleted from the server — an editor can still see it there."
      : "Discard this draft? This can't be undone.";
    if (!confirm(message)) return;
    saveDrafts(drafts.filter((d) => d.localId !== localId));
    renderDraftList();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function enterDashboard() {
    signedInAs.textContent = currentUser;
    showView(dashboardView);
    await syncReturnedAndStatuses();
    renderDraftList();
  }

  async function syncReturnedAndStatuses() {
    let serverPosts;
    try {
      serverPosts = await api.myPosts();
    } catch (e) {
      return; // offline or server down — fall back to local-only view
    }
    const drafts = loadDrafts();

    serverPosts.forEach((post) => {
      const existing = drafts.find((d) => d.serverId === post.id);
      if (existing) {
        existing.status = post.status;
        existing.comment = post.comment;
      } else {
        drafts.push({
          localId: crypto.randomUUID(),
          serverId: post.id,
          title: post.title,
          byline: post.byline,
          image: post.image,
          body: post.body,
          status: post.status,
          comment: post.comment,
          updatedAt: post.updatedAt,
        });
      }
    });

    saveDrafts(drafts);
  }

  newDraftButton.addEventListener("click", () => {
    const drafts = loadDrafts();
    const draft = newLocalDraft();
    drafts.push(draft);
    saveDrafts(drafts);
    openDraft(draft.localId);
  });

  // ---------- editor ----------

  function openDraft(localId) {
    const draft = findDraft(loadDrafts(), localId);
    if (!draft) return;
    currentDraftId = localId;

    fieldByline.value = draft.byline || "";
    fieldTitle.value = draft.title || "";
    fieldBody.value = draft.body || "";
    Editor.setHeaderImage(draft.image || null);

    const readOnly = draft.status === "published";
    fieldByline.disabled = readOnly;
    fieldTitle.disabled = readOnly;
    fieldBody.disabled = readOnly;

    if (draft.status === "returned" && draft.comment) {
      commentBanner.textContent = `Editor's note: ${draft.comment}`;
      commentBanner.hidden = false;
    } else {
      commentBanner.hidden = true;
    }

    uploadButton.hidden = readOnly;
    uploadButton.textContent =
      draft.status === "returned" ? "Revise & resubmit" : "Upload to server";
    uploadError.hidden = true;
    saveStatus.textContent = "";

    showView(editorView);
  }

  function currentFieldValues() {
    return {
      byline: fieldByline.value,
      title: fieldTitle.value,
      body: fieldBody.value,
      image: Editor.getHeaderImage(),
    };
  }

  function scheduleSave() {
    saveStatus.textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCurrentDraft, 400);
  }

  function saveCurrentDraft() {
    if (!currentDraftId) return;
    const drafts = loadDrafts();
    const draft = findDraft(drafts, currentDraftId);
    if (!draft) return;
    const values = currentFieldValues();
    draft.byline = values.byline;
    draft.title = values.title;
    draft.body = values.body;
    draft.image = values.image;
    draft.updatedAt = new Date().toISOString();
    saveDrafts(drafts);
    saveStatus.textContent = "Saved";
  }

  [fieldByline, fieldTitle, fieldBody].forEach((el) => {
    el.addEventListener("input", scheduleSave);
  });
  document.addEventListener("editor:change", scheduleSave);

  function discardIfBlank(localId) {
    const drafts = loadDrafts();
    const draft = findDraft(drafts, localId);
    if (!draft) return;
    const isBlank =
      draft.status === "draft" &&
      !draft.serverId &&
      !draft.title.trim() &&
      !draft.body.trim() &&
      !draft.image;
    if (isBlank) {
      saveDrafts(drafts.filter((d) => d.localId !== localId));
    }
  }

  backButton.addEventListener("click", async () => {
    saveCurrentDraft();
    discardIfBlank(currentDraftId);
    currentDraftId = null;
    showView(dashboardView);
    await syncReturnedAndStatuses();
    renderDraftList();
  });

  uploadButton.addEventListener("click", async () => {
    clearTimeout(saveTimer);
    saveCurrentDraft();
    const drafts = loadDrafts();
    const draft = findDraft(drafts, currentDraftId);
    if (!draft) return;

    if (!draft.title.trim() || !draft.body.trim()) {
      uploadError.textContent = "Title and body are required before uploading.";
      uploadError.hidden = false;
      return;
    }

    uploadButton.disabled = true;
    uploadError.hidden = true;

    try {
      const payload = {
        title: draft.title,
        byline: draft.byline,
        image: draft.image,
        body: draft.body,
      };

      if (!draft.serverId) {
        const created = await api.createPost(payload);
        draft.serverId = created.id;
        draft.status = created.status;
      } else if (draft.status === "returned") {
        await api.updatePost(draft.serverId, payload);
        const resubmitted = await api.resubmitPost(draft.serverId);
        draft.status = resubmitted.status;
        draft.comment = null;
      } else {
        const updated = await api.updatePost(draft.serverId, payload);
        draft.status = updated.status;
      }

      draft.updatedAt = new Date().toISOString();
      saveDrafts(drafts);
      openDraft(draft.localId);
      saveStatus.textContent = "Uploaded";
    } catch (err) {
      uploadError.textContent = err.message;
      uploadError.hidden = false;
    }

    uploadButton.disabled = false;
  });

  // ---------- boot ----------

  Editor.init();
  checkSession();
})();

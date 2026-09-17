const API_BASE = "https://paper-of-love-backend.fly.dev/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");
const TOKEN_KEY = "writerToken";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest(path, options) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

const api = {
  async login(username, password) {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ role: "writer", username, password }),
    });
    setToken(result.token);
    return result;
  },

  async logout() {
    setToken(null);
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (e) {
      // token already cleared client-side; server call is best-effort
    }
  },

  me() {
    return apiRequest("/auth/me?role=writer");
  },

  myPosts() {
    return apiRequest("/posts/mine");
  },

  createPost({ title, byline, image, body }) {
    return apiRequest("/posts", {
      method: "POST",
      body: JSON.stringify({ title, byline, image, body }),
    });
  },

  updatePost(id, { title, byline, image, body }) {
    return apiRequest(`/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, byline, image, body }),
    });
  },

  resubmitPost(id) {
    return apiRequest(`/posts/${id}/resubmit`, { method: "POST" });
  },

  async uploadImage(file) {
    const form = new FormData();
    form.append("image", file);
    const token = getToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/uploads`, {
      method: "POST",
      headers,
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error((data && data.error) || `Upload failed (${res.status})`);
    }
    return { url: `${API_ORIGIN}${data.url}` };
  },
};

const API_BASE = "http://localhost:4000/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

async function apiRequest(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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
  login(username, password) {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ role: "writer", username, password }),
    });
  },

  logout() {
    return apiRequest("/auth/logout", { method: "POST" });
  },

  me() {
    return apiRequest("/auth/me");
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
    const res = await fetch(`${API_BASE}/uploads`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error((data && data.error) || `Upload failed (${res.status})`);
    }
    return { url: `${API_ORIGIN}${data.url}` };
  },
};

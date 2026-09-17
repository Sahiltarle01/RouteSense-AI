import api from "./api";

export async function getProfile() {
  const { data } = await api.get("/api/profile");
  return data;
}

export async function updateProfile(payload) {
  const { data } = await api.put("/api/profile", payload);
  return data;
}

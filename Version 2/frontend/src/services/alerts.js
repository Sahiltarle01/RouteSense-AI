import api from "./api";

export async function listAlerts() {
  const { data } = await api.get("/api/alerts");
  return data;
}

export async function markAlertRead(id) {
  const { data } = await api.put(`/api/alerts/${id}/read`);
  return data;
}

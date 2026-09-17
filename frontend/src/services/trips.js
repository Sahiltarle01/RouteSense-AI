import api from "./api";

export async function createTrip(payload) {
  const { data } = await api.post("/api/trips", payload);
  return data;
}

export async function listMyTrips() {
  const { data } = await api.get("/api/trips");
  return data;
}

export async function getTrip(id) {
  const { data } = await api.get(`/api/trips/${id}`);
  return data;
}

export async function updateTripStatus(id, status) {
  const { data } = await api.put(`/api/trips/${id}/status`, { status });
  return data;
}

export async function deleteTrip(id) {
  await api.delete(`/api/trips/${id}`);
}

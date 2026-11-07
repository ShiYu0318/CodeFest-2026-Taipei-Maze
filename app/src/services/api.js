const API_BASE_URL =
  process.env.VUE_APP_API_BASE_URL || "http://localhost:5000";

export const apiService = {
  async get(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },
};

import { API } from "./api";

export const adminService = {
  createQuestion: async (questionData) => {
    const { data } = await API.post("/admin/questions", questionData);
    return data;
  },

  createBulkQuestions: async (questionsArray) => {
    const { data } = await API.post("/admin/questions/bulk", {
      questions: questionsArray,
    });
    return data;
  },

  // Market
  createMarketSkill: async (formData) => {
    const { data } = await API.post("/market/trending", formData);
    return data;
  },

  updateMarketSkill: async (skillId, formData) => {
    const { data } = await API.put(`/market/trending/${skillId}`, formData);
    return data;
  },

  deleteMarketSkill: async (skillId) => {
    await API.delete(`/market/trending/${skillId}`);
  },

  // Users Management
  getAllUsers: async (params = {}) => {
    const { data } = await API.get("/users/admin/all", { params });
    return data;
  },

  updateUserStatus: async (userId, status) => {
    const { data } = await API.patch(`/users/admin/status/${userId}`, {
      status,
    });
    return data;
  },

  // Skill Presets
  getSkillPresets: async (params = {}) => {
    const { data } = await API.get("/skills/admin/catalog", { params });
    return data;
  },

  createSkillPreset: async (payload) => {
    const { data } = await API.post("/skills/admin/catalog", payload);
    return data;
  },

  updateSkillPreset: async (skillId, payload) => {
    const { data } = await API.patch(
      `/skills/admin/catalog/${skillId}`,
      payload,
    );
    return data;
  },

  deleteSkillPreset: async (skillId) => {
    const { data } = await API.delete(`/skills/admin/catalog/${skillId}`);
    return data;
  },

  getAdminDashboard: async () => {
    const { data } = await API.get("/users/admin/dashboard");
    return data;
  },

  getAdminDashboardCharts: async (period) => {
    const { data } = await API.get(`/users/admin/charts?period=${period}`);
    return data;
  },
};

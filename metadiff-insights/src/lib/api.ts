import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to add access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const resp = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = resp.data.data;
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/settings"; // redirect to settings / login page
      }
    }
    return Promise.reject(error);
  }
);

// ─── HELPER FOR GRACEFUL FALLBACK TO MOCK DATA ──────────────────────────────
async function withFallback<T>(apiCall: () => Promise<T>, mockData: T): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    console.warn("Backend API unreachable. Falling back to mock data.", error);
    return mockData;
  }
}

// ─── AUTH APIs ──────────────────────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  const resp = await api.post("/auth/login", { email, password });
  const { accessToken, refreshToken, user } = resp.data.data;
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export async function registerUser(name: string, email: string, role: string) {
  // Use a default password during admin creation or registration
  const resp = await api.post("/auth/register", {
    name,
    email,
    password: "Password123!",
    role,
  });
  return resp.data.data;
}

export function logoutUser() {
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    api.post("/auth/logout", { accessToken }).catch(() => {});
  }
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export function getCurrentUser() {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

// ─── SNAPSHOT APIs ──────────────────────────────────────────────────────────
export async function fetchSnapshots(search = "", page = 0, size = 20) {
  return withFallback(async () => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", String(page));
    params.append("size", String(size));
    const resp = await api.get(`/api/snapshots?${params.toString()}`);
    return resp.data.data;
  }, {
    content: [
      { id: "SNAP-001", name: "prod_cutover_baseline", orgId: "prod-org-001", filename: "prod_cutover_baseline.json", format: "JSON", commitHash: "a7f1b22", fingerprint: "c7a8e1b", sizeBytes: 124580, status: "READY", uploadedBy: "riya.v", createdAt: "2026-05-26T08:00:00Z" },
      { id: "SNAP-002", name: "weekly_snapshot_may", orgId: "prod-org-001", filename: "weekly_snapshot_may.json", format: "JSON", commitHash: "44ae71f", fingerprint: "8b9e2f1", sizeBytes: 135400, status: "READY", uploadedBy: "riya.v", createdAt: "2026-05-25T09:00:00Z" },
      { id: "SNAP-003", name: "temp_permission_patch", orgId: "prod-org-001", filename: "temp_permission_patch.xml", format: "XML", commitHash: "1f0bb87", fingerprint: "3d4e5f6", sizeBytes: 4210, status: "READY", uploadedBy: "ben.k", createdAt: "2026-05-22T14:00:00Z" }
    ],
    page: 0,
    size: 20,
    totalElements: 3
  });
}

export async function fetchSnapshot(id: string) {
  return withFallback(async () => {
    const resp = await api.get(`/api/snapshots/${id}`);
    return resp.data.data;
  }, {
    id,
    name: "prod_cutover_baseline",
    orgId: "prod-org-001",
    filename: "prod_cutover_baseline.json",
    format: "JSON",
    commitHash: "a7f1b22",
    fingerprint: "c7a8e1b",
    sizeBytes: 124580,
    status: "READY",
    uploadedBy: "riya.v",
    createdAt: "2026-05-26T08:00:00Z"
  });
}

export async function fetchSnapshotTree(id: string) {
  return withFallback(async () => {
    const resp = await api.get(`/api/snapshots/${id}/tree`);
    return resp.data.data;
  }, {
    "CustomObject": {
      "Account": { fields: ["Name", "Type", "Industry"], validationRules: ["Active_Required"] },
      "Contact": { fields: ["FirstName", "LastName", "Email"] }
    },
    "ApexClass": {
      "OrderTrigger": { size: 2450 },
      "QuoteCalculator": { size: 8120 }
    },
    "Profile": {
      "Admin": { userPermissions: ["ModifyAllData", "ManageUsers"] },
      "Sales": { userPermissions: ["EditOpportunity"] }
    }
  });
}

export async function uploadSnapshot(file: File, orgId = "default-org") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("orgId", orgId);
  const resp = await api.post("/api/snapshots", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return resp.data.data;
}

export async function deleteSnapshot(id: string) {
  const resp = await api.delete(`/api/snapshots/${id}`);
  return resp.data;
}

// ─── DIFF APIs ──────────────────────────────────────────────────────────────
export async function createDiff(beforeSnapshotId: string, afterSnapshotId: string) {
  const resp = await api.post("/api/diff", { beforeSnapshotId, afterSnapshotId });
  return resp.data.data;
}

export async function fetchDiffReport(id: string) {
  return withFallback(async () => {
    const resp = await api.get(`/api/diff/${id}`);
    return resp.data.data;
  }, {
    id,
    beforeSnapshotId: "SNAP-002",
    afterSnapshotId: "SNAP-001",
    addedCount: 5,
    removedCount: 2,
    modifiedCount: 8,
    renamedCount: 1,
    status: "COMPLETED",
    requestedBy: "riya.v",
    createdAt: "2026-05-26T08:30:00Z",
    changes: [
      { changeType: "ADDED", componentType: "ApexClass", componentName: "OrderTriggerService" },
      { changeType: "MODIFIED", componentType: "Profile", componentName: "Admin" },
      { changeType: "MODIFIED", componentType: "Profile", componentName: "Sales" },
      { changeType: "REMOVED", componentType: "CustomField", componentName: "Lead.Temp_Notes__c" }
    ]
  });
}

export async function fetchDiffVisualization(id: string) {
  return withFallback(async () => {
    const resp = await api.get(`/api/diff/${id}/visualization`);
    return resp.data.data;
  }, {
    matrix: [
      { category: "ApexClass", added: 2, removed: 0, modified: 3, renamed: 0 },
      { category: "Profile", added: 0, removed: 0, modified: 2, renamed: 0 },
      { category: "CustomObject", added: 1, removed: 1, modified: 1, renamed: 1 }
    ]
  });
}

// ─── RISK APIs ──────────────────────────────────────────────────────────────
export async function fetchRiskReport(diffId: string) {
  return withFallback(async () => {
    const resp = await api.get(`/api/risk/${diffId}`);
    return resp.data.data;
  }, {
    diffId,
    score: 86,
    level: "HIGH",
    reasons: [
      { type: "Profile Modification", description: "Admin profile changes enable high privilege permissions" },
      { type: "Apex Class Churn", description: "Apex classes modified exceed 5 files" },
      { type: "Destructive Change", description: "Removal of fields detected in CustomObject" }
    ],
    explanation: "This deployment carries high risk due to sensitive profile permission changes (Admin, Sales) combined with churn in core transaction logic (OrderTriggerService).",
    suggestedActions: [
      "Require peer review from a senior developer",
      "Verify profile permissions in staging sandbox prior to production cutover"
    ]
  });
}

export async function fetchRiskExplanation(diffId: string) {
  return withFallback(async () => {
    const resp = await api.get(`/api/risk/${diffId}/explanation`);
    return resp.data.data;
  }, {
    explanation: "Profile and permission modifications (e.g. Admin, Sales) are major drivers of high-risk scoring. Recommend staging verification.",
    suggestedActions: [
      "Perform security audit",
      "Validate Apex tests in sandbox"
    ]
  });
}

// ─── GIT APIs ──────────────────────────────────────────────────────────────
export async function fetchGitHistory(limit = 20) {
  return withFallback(async () => {
    const resp = await api.get(`/api/git/history?limit=${limit}`);
    return resp.data.data;
  }, [
    { sha: "a7f1b22", fullSha: "a7f1b2289f076cde", message: "release: prod cutover 2026-05-26", author: "riya.v", email: "riya@metadiff.io", branch: "main", timestamp: "2026-05-26T08:00:00Z", changes: 47 },
    { sha: "c4d8e09", fullSha: "c4d8e0984f183e29", message: "perm: enable ManageUsers on Admin", author: "ben.k", email: "ben@metadiff.io", branch: "main", timestamp: "2026-05-26T06:00:00Z", changes: 12 },
    { sha: "9b2c331", fullSha: "9b2c33182da937d2", message: "fix: quote engine rounding edge case", author: "ana.r", email: "ana@metadiff.io", branch: "hotfix", timestamp: "2026-05-26T02:00:00Z", changes: 5 },
    { sha: "44ae71f", fullSha: "44ae71fd8b8393e8", message: "snapshot: weekly baseline", author: "riya.v", email: "riya@metadiff.io", branch: "main", timestamp: "2026-05-25T09:00:00Z", changes: 184 }
  ]);
}

export async function fetchCommitDetails(sha: string) {
  return withFallback(async () => {
    const resp = await api.get(`/api/git/commits/${sha}`);
    return resp.data.data;
  }, {
    sha,
    fullSha: sha + "472bd9f83ea92",
    message: "release: prod cutover 2026-05-26",
    author: "riya.v",
    email: "riya@metadiff.io",
    branch: "main",
    timestamp: "2026-05-26T08:00:00Z",
    changes: 47
  });
}

export async function compareCommits(from: string, to: string) {
  return withFallback(async () => {
    const resp = await api.get(`/api/git/compare?from=${from}&to=${to}`);
    return resp.data.data;
  }, {
    fromSha: from,
    toSha: to,
    added: 5,
    removed: 2,
    modified: 8,
    filesTouched: 15
  });
}

// ─── ANALYTICS APIs ─────────────────────────────────────────────────────────
export async function fetchDashboardMetrics() {
  return withFallback(async () => {
    const resp = await api.get("/api/analytics/metrics");
    return resp.data.data;
  }, {
    avgRisk: 58.0,
    riskDelta: "-6%",
    riskUp: false,
    deploySuccess: "94.2%",
    deploySuccessDelta: "+1.8%",
    deploySuccessUp: true,
    avgLeadTime: "2.4d",
    avgLeadTimeDelta: "-12%",
    avgLeadTimeUp: false,
    totalSnapshots: 1248,
    totalDiffs: 8921,
    totalCommits: 23407,
    riskyDeployments: 47
  });
}

export async function fetchTrends(period = "daily") {
  return withFallback(async () => {
    const resp = await api.get(`/api/analytics/trends?period=${period}`);
    return resp.data.data;
  }, {
    riskScores: [64,58,62,55,60,52,57,49,54,46,52,48,44,42,46,40,38,42,36,40,34,38,32,36],
    deploymentFrequency: [12,14,18,16,22,24,20,28,32,30,34,36,40,38,42,46,44,50,52,48,54,58,56,62]
  });
}

export async function fetchHotspots() {
  return withFallback(async () => {
    const resp = await api.get("/api/analytics/hotspots");
    return resp.data.data;
  }, [
    { name: "Admin.profile", changes: 142, risk: 91 },
    { name: "Sales.profile", changes: 118, risk: 86 },
    { name: "OrderTrigger.cls", changes: 96, risk: 67 },
    { name: "QuoteCalculator.cls", changes: 81, risk: 49 },
    { name: "Account.object", changes: 64, risk: 41 }
  ]);
}

export async function fetchPrediction() {
  return withFallback(async () => {
    const resp = await api.get("/api/analytics/prediction");
    return resp.data.data;
  }, {
    score: 61,
    margin: 6,
    confidenceInterval: "94% confidence interval",
    band: "Elevated",
    description: "Based on the last 90 days of releases, the next planned cutover sits in the elevated band. Profile and permission changes are the dominant predictors.",
    modelName: "gbr-v3",
    trainedDate: "2026-05-19"
  });
}

// ─── NOTIFICATION APIs ──────────────────────────────────────────────────────
export async function fetchNotifications() {
  return withFallback(async () => {
    const resp = await api.get("/api/notifications");
    return resp.data.data;
  }, [
    { id: "n1", title: "High Deployment Risk Alert", message: "Diff diff-001 has computed a warning risk score of 86.", type: "WARNING", read: false, createdAt: "2026-05-26T08:30:00Z" }
  ]);
}

export async function markNotificationAsRead(id: string) {
  const resp = await api.post(`/api/notifications/${id}/read`);
  return resp.data;
}

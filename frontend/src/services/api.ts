import { User, AuthResponse, Project, ProjectSummary, Layer, EcologicalRestriction, Scenario, ValidationResult, AuditLog } from '../types';

const BASE_URL = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('utkal_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('utkal_token');
    localStorage.removeItem('utkal_user');
    window.dispatchEvent(new Event('auth-changed'));
  }

  if (!response.ok) {
    let errorDetail = 'Network request failed';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || JSON.stringify(errData);
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(username_or_email: string, password: string):Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password }),
    });
    localStorage.setItem('utkal_token', data.access_token);
    localStorage.setItem('utkal_user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('auth-changed'));
    return data;
  },

  async register(userData: { username: string; email: string; password: string; full_name?: string }): Promise<User> {
    return request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  logout() {
    localStorage.removeItem('utkal_token');
    localStorage.removeItem('utkal_user');
    window.dispatchEvent(new Event('auth-changed'));
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('utkal_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async getUsers(): Promise<User[]> {
    return request<User[]>('/auth/users');
  },

  // Projects
  async getProjects(): Promise<ProjectSummary[]> {
    return request<ProjectSummary[]>('/projects/');
  },

  async getProject(id: number): Promise<Project> {
    return request<Project>(`/projects/${id}`);
  },

  async createProject(projectData: Partial<Project>): Promise<Project> {
    return request<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    return request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  },

  async deleteProject(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async loadDemoData(projectId: number): Promise<Project> {
    return request<Project>(`/projects/${projectId}/load-demo-data`, {
      method: 'POST',
    });
  },

  // Layers
  async getLayers(projectId: number): Promise<Layer[]> {
    return request<Layer[]>(`/projects/${projectId}/layers/`);
  },

  async addLayer(projectId: number, layerData: Partial<Layer>): Promise<Layer> {
    return request<Layer>(`/projects/${projectId}/layers/`, {
      method: 'POST',
      body: JSON.stringify(layerData),
    });
  },

  async uploadLayerFile(projectId: number, file: File, name: string, layer_type: string): Promise<Layer> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('layer_type', layer_type);

    const headers = {
      ...getAuthHeader(),
    };

    const response = await fetch(`${BASE_URL}/projects/${projectId}/layers/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Upload failed');
    }

    return response.json();
  },

  async deleteLayer(projectId: number, layerId: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/projects/${projectId}/layers/${layerId}`, {
      method: 'DELETE',
    });
  },

  // Restrictions
  async getRestrictions(projectId: number): Promise<EcologicalRestriction[]> {
    return request<EcologicalRestriction[]>(`/projects/${projectId}/restrictions/`);
  },

  async addRestriction(projectId: number, data: Partial<EcologicalRestriction>): Promise<EcologicalRestriction> {
    return request<EcologicalRestriction>(`/projects/${projectId}/restrictions/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteRestriction(projectId: number, id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/projects/${projectId}/restrictions/${id}`, {
      method: 'DELETE',
    });
  },

  // Generation & Validation
  async generateScenario(projectId: number, params: {
    name?: string;
    strategy: string;
    deliberate_violation?: boolean;
    housing_target_units?: number;
    green_space_target_pct?: number;
  }): Promise<Scenario> {
    return request<Scenario>(`/projects/${projectId}/generator/generate`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async generateTrioScenarios(projectId: number): Promise<Scenario[]> {
    return request<Scenario[]>(`/projects/${projectId}/generator/generate-trio`, {
      method: 'POST',
    });
  },

  async revalidateScenario(projectId: number, scenarioId: number): Promise<ValidationResult> {
    return request<ValidationResult>(`/projects/${projectId}/scenarios/${scenarioId}/validation/revalidate`, {
      method: 'POST',
    });
  },

  // Compare & Metrics
  async getComparison(projectId: number): Promise<Scenario[]> {
    return request<Scenario[]>(`/projects/${projectId}/metrics/compare`);
  },

  // Export Reports
  async exportReport(projectId: number, format: 'json' | 'csv' | 'pdf' | 'geojson') {
    const headers = {
      ...getAuthHeader(),
    };
    const response = await fetch(`${BASE_URL}/projects/${projectId}/reports/${format}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error(`Report generation failed: ${response.statusText}`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `utkal_export_${projectId}.${format === 'geojson' ? 'geojson' : format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return request<AuditLog[]>('/audit/');
  },
};

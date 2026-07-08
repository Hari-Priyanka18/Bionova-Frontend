/**
 * api.js — Centralized authenticated fetch helper.
 *
 * Usage:
 *   import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
 *
 *   const companies = await apiGet('/api/companies');
 *   const result    = await apiPost('/api/companies', { name: 'XYZ' });
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = sessionStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
  if (response.status === 401) {
    // Token expired or invalid → force logout
    sessionStorage.clear();
    window.location.href = '/';
    throw new Error('Unauthorized – please log in again.');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  // Return null for 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

export async function apiGet(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function apiPost(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiPut(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiDelete(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function apiPatch(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function safeFetch(path, fallback = null) {
  try {
    return await apiGet(path);
  } catch (err) {
    console.warn(`safeFetch failed for ${path}:`, err);
    return fallback;
  }
}

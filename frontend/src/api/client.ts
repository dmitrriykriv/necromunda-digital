import axios from 'axios';
import { apiBaseUrl } from '@/lib/paths';

export const api = axios.create({
  baseURL: apiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

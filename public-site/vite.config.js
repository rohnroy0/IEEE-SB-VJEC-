import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// BASE_PATH is set in the Pages workflow so asset URLs carry the /<repo>/ prefix.
// It stays '/' for local dev and for a root-hosted deploy.
export default defineConfig({base:process.env.BASE_PATH||'/',plugins:[react()],server:{port:5174,proxy:{'/api':'http://localhost:3001'}}});
